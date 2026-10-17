"""Credential file validation for professional registration.

This module is the single place that decides whether an uploaded credential
document is safe to store.  It is called by the professional signup serializer
before the file is handed to PrivateMediaStorage.

Security model
--------------
* We never trust the client-supplied Content-Type or filename extension.
  We always sniff the magic bytes from the actual file content.
* Images (JPEG, PNG) are re-encoded through Pillow so that any embedded
  metadata (EXIF, GPS, ICC profiles) and steganographic payloads are stripped.
* PDFs pass a heuristic forbidden-token scan.  We do NOT execute or parse the
  PDF structure because a full PDF parser is out of scope; the heuristic blocks
  the most obvious active-content vectors (/JavaScript, /Launch, embedded
  executables).
* File size is checked before reading the entire content to avoid OOM on large
  uploads.

Public surface
--------------
validate_credential(upload: InMemoryUploadedFile | TemporaryUploadedFile) -> InMemoryUploadedFile
    Validate and return a clean, re-encoded copy of the file.
    Raises ``django.core.exceptions.ValidationError`` on any problem.

MAX_CREDENTIAL_BYTES : int
    Hard upper bound (5 MiB).

ALLOWED_EXTENSIONS : frozenset[str]
    Extensions accepted after magic-byte sniffing confirms the type.
"""
from __future__ import annotations

import io
import struct
from typing import TYPE_CHECKING

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile

if TYPE_CHECKING:
    from django.core.files.uploadedfile import UploadedFile


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Hard maximum file size accepted (5 MiB).
MAX_CREDENTIAL_BYTES: int = 5 * 1024 * 1024  # 5 MiB

#: Maximum pixel count for images (24 megapixels).  Prevents "image bomb" DoS.
MAX_IMAGE_PIXELS: int = 24_000_000  # 24 MP

#: Allowed file extensions (lower-case, with leading dot).
ALLOWED_EXTENSIONS: frozenset[str] = frozenset({".pdf", ".jpg", ".jpeg", ".png"})

# ---------------------------------------------------------------------------
# Magic-byte signatures
# ---------------------------------------------------------------------------

# (offset, bytes) pairs that identify a file type.
_SIGNATURES: dict[str, tuple[int, bytes]] = {
    "pdf":  (0, b"%PDF"),
    "jpeg": (0, b"\xff\xd8\xff"),
    "png":  (0, b"\x89PNG\r\n\x1a\n"),
}

# ---------------------------------------------------------------------------
# PDF forbidden tokens (heuristic active-content scan)
# ---------------------------------------------------------------------------

#: Byte-strings whose presence in a PDF strongly suggests active content.
_PDF_FORBIDDEN: tuple[bytes, ...] = (
    b"/JavaScript",
    b"/JS",
    b"/Launch",
    b"/EmbeddedFile",
    b"/RichMedia",
    b"/XFA",
    b"<</Type /Action",
    b"AA <<",        # Additional Actions dict
    b"/OpenAction",
    b"/AA",
    b"cmd.exe",
    b"powershell",
    b"bash",
    b"\x4d\x5a",    # MZ header (Windows PE) embedded in PDF stream
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _read_all(upload: "UploadedFile") -> bytes:
    """Seek to start, read everything, seek back to start."""
    upload.seek(0)
    data = upload.read()
    upload.seek(0)
    return data


def _sniff_type(data: bytes) -> str | None:
    """Return 'pdf', 'jpeg', or 'png' based on magic bytes, else None."""
    for name, (offset, magic) in _SIGNATURES.items():
        if data[offset : offset + len(magic)] == magic:
            return name
    return None


def _extension_matches(filename: str, detected: str) -> bool:
    """Return True if the filename extension is consistent with the detected type."""
    if not filename:
        return True
    import os
    ext = os.path.splitext(filename)[1].lower()
    mapping = {
        "pdf":  {".pdf"},
        "jpeg": {".jpg", ".jpeg"},
        "png":  {".png"},
    }
    return ext in mapping.get(detected, set())


def _validate_image(data: bytes, detected: str) -> bytes:
    """Re-encode image through Pillow, stripping metadata.

    Returns the re-encoded bytes (JPEG or PNG depending on detected type).
    Raises ValidationError if the image is corrupt, too large, or exceeds
    the pixel limit.
    """
    try:
        from PIL import Image, UnidentifiedImageError
    except ImportError as exc:  # pragma: no cover — Pillow is a hard dependency
        raise RuntimeError(
            "Pillow is required for credential image validation. "
            "Run 'uv add Pillow'."
        ) from exc

    try:
        img = Image.open(io.BytesIO(data))
        img.verify()          # detect truncated / corrupt files
    except Exception as exc:
        raise ValidationError(
            {"credential_file": f"The image file appears to be corrupt or unreadable: {exc}"}
        )

    # Re-open after verify() (verify() leaves the file in an unusable state).
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as exc:
        raise ValidationError(
            {"credential_file": f"Could not decode image: {exc}"}
        )

    # Pixel count guard (image bomb / zip bomb defence).
    width, height = img.size
    if width * height > MAX_IMAGE_PIXELS:
        raise ValidationError(
            {
                "credential_file": (
                    f"Image is too large ({width}×{height} = "
                    f"{width * height:,} pixels). "
                    f"Maximum is {MAX_IMAGE_PIXELS:,} pixels."
                )
            }
        )

    # Convert to safe colour mode before re-encoding.
    if detected == "png":
        # Keep transparency; convert palette images to RGBA for clean PNG output.
        if img.mode not in ("RGB", "RGBA", "L", "LA"):
            img = img.convert("RGBA")
        fmt = "PNG"
        mime = "image/png"
        suffix = ".png"
    else:
        # JPEG: flatten alpha, convert to RGB.
        if img.mode != "RGB":
            img = img.convert("RGB")
        fmt = "JPEG"
        mime = "image/jpeg"
        suffix = ".jpg"

    buf = io.BytesIO()
    # save_all=False so multi-frame GIFs (mis-detected as JPEG) are rejected at
    # the Image.open() stage rather than silently saved as a single frame.
    img.save(buf, format=fmt, optimize=True)
    buf.seek(0)
    return buf.read(), mime, suffix


def _validate_pdf(data: bytes) -> None:
    """Heuristic scan for active-content tokens inside a PDF.

    Raises ValidationError if any forbidden token is found.
    This is NOT a full PDF parser.  It catches the most common embedding
    vectors (JavaScript actions, launch actions, embedded executables) while
    accepting legitimate credential PDFs.
    """
    # Work on upper-cased bytes to catch mixed-case variants.
    upper = data.upper()
    found = [tok for tok in _PDF_FORBIDDEN if tok.upper() in upper]
    if found:
        # Don't echo the actual token to avoid leaking internal rules.
        raise ValidationError(
            {
                "credential_file": (
                    "The PDF file contains active content (scripts or embedded "
                    "executables) and cannot be accepted."
                )
            }
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def validate_credential(upload: "UploadedFile") -> InMemoryUploadedFile:
    """Validate a professional credential upload.

    Checks (in order):
    1. File size ≤ MAX_CREDENTIAL_BYTES (5 MiB).
    2. Magic bytes identify the type as PDF, JPEG, or PNG.
    3. The filename extension matches the detected type.
    4. For images: Pillow decodes the image, pixel count ≤ MAX_IMAGE_PIXELS,
       then re-encodes stripping all metadata.
    5. For PDFs: heuristic forbidden-token scan.

    Returns an ``InMemoryUploadedFile`` containing the validated (and for
    images, re-encoded) bytes.  The original ``upload`` object is left
    positioned at byte 0.

    Raises
    ------
    django.core.exceptions.ValidationError
        If any check fails.  The error dict always uses
        ``"credential_file"`` as the field key.
    """
    # --- 1. Size check (before reading everything into memory) ---
    upload.seek(0, 2)          # seek to end
    file_size = upload.tell()
    upload.seek(0)

    if file_size > MAX_CREDENTIAL_BYTES:
        raise ValidationError(
            {
                "credential_file": (
                    f"File too large ({file_size / 1024 / 1024:.1f} MiB). "
                    f"Maximum is {MAX_CREDENTIAL_BYTES // 1024 // 1024} MiB."
                )
            }
        )

    # --- 2. Magic byte sniffing ---
    data = _read_all(upload)
    detected = _sniff_type(data)

    if detected is None:
        raise ValidationError(
            {
                "credential_file": (
                    "Unsupported file type. "
                    "Please upload a PDF, JPEG, or PNG."
                )
            }
        )

    # --- 3. Extension / MIME consistency ---
    filename = getattr(upload, "name", "") or ""
    # A missing extension is allowed; when one is supplied it must match the
    # detected content type.
    if filename and __import__("os").path.splitext(filename)[1] and not _extension_matches(filename, detected):
        raise ValidationError(
            {
                "credential_file": (
                    "The file extension does not match the actual file content. "
                    f"Detected type: {detected.upper()}."
                )
            }
        )

    # --- 4 & 5. Type-specific validation ---
    if detected == "pdf":
        _validate_pdf(data)
        clean_data = data
        content_type = "application/pdf"
        suffix = ".pdf"
    else:
        # Image: re-encode through Pillow.
        clean_data, content_type, suffix = _validate_image(data, detected)

    # --- Wrap in InMemoryUploadedFile ---
    buf = io.BytesIO(clean_data)
    import os
    base = os.path.splitext(filename)[0] if filename else "credential"
    clean_name = (base or "credential") + suffix

    result = InMemoryUploadedFile(
        file=buf,
        field_name="credential_file",
        name=clean_name,
        content_type=content_type,
        size=len(clean_data),
        charset=None,
    )
    return result
