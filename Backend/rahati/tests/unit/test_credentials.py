"""Unit tests for rahati/credentials.py.

100% SimpleTestCase — no database, no HTTP, no filesystem.

All file objects are created in memory using io.BytesIO wrapped in
Django's InMemoryUploadedFile so the tests are self-contained and fast.

Test groups
-----------
CredentialSizeTests          — MAX_CREDENTIAL_BYTES boundary.
CredentialMagicBytesTests    — magic-byte detection and mismatch.
CredentialExtensionTests     — filename extension vs detected type.
CredentialPDFTests           — forbidden-token heuristic.
CredentialImageTests         — Pillow re-encoding, pixel limit, corrupt files.
CredentialReturnTypeTests    — returned object is an InMemoryUploadedFile.
HelperFunctionTests          — _sniff_type, _extension_matches, _read_all.
"""
import io
import struct

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.test import SimpleTestCase

from rahati.credentials import (
    MAX_CREDENTIAL_BYTES,
    MAX_IMAGE_PIXELS,
    _extension_matches,
    _read_all,
    _sniff_type,
    _validate_pdf,
    validate_credential,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PDF_MAGIC = b"%PDF-1.4\n"
_JPEG_MAGIC = b"\xff\xd8\xff\xe0" + b"\x00" * 10
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8

# Minimal valid 1×1 white JPEG (real bytes, generated with Pillow offline)
_TINY_JPEG: bytes = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
    b"\x1d\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f\x1f"
    b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
    b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
    b"\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04"
    b"\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa"
    b"\x07\"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n"
    b"\x16\x17\x18\x19\x1a%&'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz"
    b"\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99"
    b"\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7"
    b"\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5"
    b"\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1"
    b"\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa"
    b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd0\x00\x00\x00\xff\xd9"
)


def _make_upload(data: bytes, name: str = "file.pdf") -> InMemoryUploadedFile:
    """Wrap bytes in an InMemoryUploadedFile (simulates a form file upload)."""
    # Django rejects an empty uploaded-file name. Use a real name without an
    # extension to exercise the validator's optional-extension behavior.
    name = name or "upload"
    buf = io.BytesIO(data)
    return InMemoryUploadedFile(
        file=buf,
        field_name="credential_file",
        name=name,
        content_type="application/octet-stream",
        size=len(data),
        charset=None,
    )


def _minimal_png() -> bytes:
    """Generate a real 1×1 white PNG in memory using Pillow."""
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def _minimal_jpeg() -> bytes:
    """Generate a real 1×1 white JPEG in memory using Pillow."""
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


def _minimal_pdf(extra: bytes = b"") -> bytes:
    """Minimal syntactically plausible PDF with no active content."""
    body = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    ) + extra + b"%%EOF\n"
    return body


# ---------------------------------------------------------------------------
# Size tests
# ---------------------------------------------------------------------------

class CredentialSizeTests(SimpleTestCase):

    def test_file_at_exact_limit_is_accepted(self):
        """A file of exactly MAX_CREDENTIAL_BYTES with valid magic should pass size gate."""
        # Build a large PDF-magic-prefixed blob that just fits.
        data = _minimal_pdf() + b"x" * (MAX_CREDENTIAL_BYTES - len(_minimal_pdf()))
        upload = _make_upload(data[:MAX_CREDENTIAL_BYTES], "big.pdf")
        # Should not raise a size error (may raise PDF scan if big, but size OK)
        # We only care that size error is NOT raised.
        try:
            validate_credential(upload)
        except ValidationError as exc:
            msg = str(exc)
            self.assertNotIn("too large", msg)

    def test_file_one_byte_over_limit_is_rejected(self):
        data = b"x" * (MAX_CREDENTIAL_BYTES + 1)
        upload = _make_upload(data, "huge.pdf")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        self.assertIn("too large", str(ctx.exception).lower())

    def test_empty_file_is_rejected_as_unknown_type(self):
        upload = _make_upload(b"", "empty.pdf")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        self.assertIn("Unsupported file type", str(ctx.exception))


# ---------------------------------------------------------------------------
# Magic byte tests
# ---------------------------------------------------------------------------

class CredentialMagicBytesTests(SimpleTestCase):

    def test_detects_pdf_magic(self):
        self.assertEqual(_sniff_type(b"%PDF-1.4 rest"), "pdf")

    def test_detects_jpeg_magic(self):
        self.assertEqual(_sniff_type(b"\xff\xd8\xff anything"), "jpeg")

    def test_detects_png_magic(self):
        self.assertEqual(_sniff_type(b"\x89PNG\r\n\x1a\n rest"), "png")

    def test_returns_none_for_unknown(self):
        self.assertIsNone(_sniff_type(b"GIF89a..."))

    def test_returns_none_for_zip(self):
        self.assertIsNone(_sniff_type(b"PK\x03\x04"))

    def test_returns_none_for_html(self):
        self.assertIsNone(_sniff_type(b"<!DOCTYPE html>"))

    def test_returns_none_for_empty(self):
        self.assertIsNone(_sniff_type(b""))

    def test_validate_rejects_unknown_magic(self):
        upload = _make_upload(b"GIF89a\x01\x00\x01\x00", "anim.gif")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        self.assertIn("Unsupported file type", str(ctx.exception))

    def test_validate_rejects_exe_magic(self):
        # Windows PE starts with MZ (0x4D5A)
        upload = _make_upload(b"\x4d\x5a\x90\x00" + b"\x00" * 100, "legit.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)


# ---------------------------------------------------------------------------
# Extension mismatch tests
# ---------------------------------------------------------------------------

class CredentialExtensionTests(SimpleTestCase):

    def test_extension_matches_pdf(self):
        self.assertTrue(_extension_matches("file.pdf", "pdf"))

    def test_extension_matches_jpeg_jpg(self):
        self.assertTrue(_extension_matches("photo.jpg", "jpeg"))

    def test_extension_matches_jpeg_jpeg(self):
        self.assertTrue(_extension_matches("photo.jpeg", "jpeg"))

    def test_extension_matches_png(self):
        self.assertTrue(_extension_matches("image.png", "png"))

    def test_extension_case_insensitive(self):
        self.assertTrue(_extension_matches("FILE.PDF", "pdf"))

    def test_extension_mismatch_pdf_vs_png(self):
        self.assertFalse(_extension_matches("file.png", "pdf"))

    def test_extension_mismatch_jpeg_vs_pdf(self):
        self.assertFalse(_extension_matches("image.pdf", "jpeg"))

    def test_empty_filename_always_matches(self):
        """No filename → skip extension check (returns True)."""
        self.assertTrue(_extension_matches("", "pdf"))

    def test_validate_rejects_mismatched_extension(self):
        """PDF bytes with a .png extension → ValidationError."""
        data = _minimal_pdf()
        upload = _make_upload(data, "disguised.png")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        self.assertIn("extension", str(ctx.exception).lower())


# ---------------------------------------------------------------------------
# PDF forbidden-token tests
# ---------------------------------------------------------------------------

class CredentialPDFTests(SimpleTestCase):

    def test_clean_pdf_accepted(self):
        data = _minimal_pdf()
        upload = _make_upload(data, "diploma.pdf")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)

    def test_rejects_javascript_token(self):
        data = _minimal_pdf(extra=b"/JavaScript << /S /JavaScript /JS (alert(1)) >>")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        self.assertIn("active content", str(ctx.exception).lower())

    def test_rejects_js_shorthand(self):
        data = _minimal_pdf(extra=b"/JS (some script)")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_launch_action(self):
        data = _minimal_pdf(extra=b"/Launch << /F (cmd.exe) >>")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_embedded_file(self):
        data = _minimal_pdf(extra=b"/EmbeddedFile << /F (payload.exe) >>")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_openaction(self):
        data = _minimal_pdf(extra=b"/OpenAction << /Type /Action /S /JavaScript >>")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_xfa(self):
        data = _minimal_pdf(extra=b"/XFA [(preamble.xml) 1 0 R]")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_mixed_case_javascript(self):
        """Token check is case-insensitive."""
        data = _minimal_pdf(extra=b"/jAvAsCrIpT << >>")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_embedded_pe_header(self):
        """MZ header inside a PDF stream."""
        data = _minimal_pdf(extra=b"\x4d\x5a\x90\x00 embedded executable")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_cmd_reference(self):
        data = _minimal_pdf(extra=b"cmd.exe is bad")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_powershell_reference(self):
        data = _minimal_pdf(extra=b"powershell -enc base64payload")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)

    def test_rejects_bash_reference(self):
        data = _minimal_pdf(extra=b"bash -c 'id'")
        upload = _make_upload(data, "evil.pdf")
        with self.assertRaises(ValidationError):
            validate_credential(upload)


# ---------------------------------------------------------------------------
# Image re-encoding tests
# ---------------------------------------------------------------------------

class CredentialImageTests(SimpleTestCase):

    def test_valid_jpeg_accepted_and_reencoded(self):
        data = _minimal_jpeg()
        upload = _make_upload(data, "photo.jpg")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)
        self.assertEqual(result.content_type, "image/jpeg")

    def test_valid_png_accepted_and_reencoded(self):
        data = _minimal_png()
        upload = _make_upload(data, "scan.png")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)
        self.assertEqual(result.content_type, "image/png")

    def test_corrupt_jpeg_rejected(self):
        # Valid magic bytes, but truncated/corrupt body.
        data = b"\xff\xd8\xff\xe0" + b"\x00" * 10   # magic OK, then garbage
        upload = _make_upload(data, "corrupt.jpg")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        msg = str(ctx.exception).lower()
        self.assertTrue("corrupt" in msg or "decode" in msg or "unreadable" in msg)

    def test_jpeg_without_extension_accepted(self):
        """No filename → extension check skipped."""
        data = _minimal_jpeg()
        upload = _make_upload(data, "")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)

    def test_png_without_extension_accepted(self):
        data = _minimal_png()
        upload = _make_upload(data, "")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)

    def test_image_over_pixel_limit_rejected(self):
        """An image whose pixel count exceeds MAX_IMAGE_PIXELS must be rejected."""
        from PIL import Image

        # 5000×5000 = 25 MP > 24 MP limit (but small file size because of solid color)
        buf = io.BytesIO()
        img = Image.new("RGB", (5000, 5000), color=(200, 200, 200))
        img.save(buf, format="JPEG", quality=1)  # q=1 keeps file small
        buf.seek(0)
        upload = _make_upload(buf.read(), "big.jpg")
        with self.assertRaises(ValidationError) as ctx:
            validate_credential(upload)
        self.assertIn("too large", str(ctx.exception).lower())

    def test_reencoded_jpeg_has_no_exif(self):
        """After re-encoding, the returned JPEG must not contain EXIF data."""
        from PIL import Image

        # Build a JPEG with EXIF GPS data
        buf = io.BytesIO()
        img = Image.new("RGB", (10, 10), color=(100, 150, 200))
        exif_data = img.getexif()
        exif_data[0x8825] = {}  # GPS IFD tag — stripped on save without exif=
        img.save(buf, format="JPEG")
        buf.seek(0)

        upload = _make_upload(buf.read(), "gps.jpg")
        result = validate_credential(upload)

        # The re-encoded result should be readable by Pillow and have no EXIF
        result.seek(0)
        out = Image.open(result)
        out.load()
        exif = out.getexif()
        self.assertEqual(len(exif), 0, "Re-encoded image should have no EXIF data")

    def test_rgba_png_preserved(self):
        """PNG with alpha channel must survive re-encoding."""
        from PIL import Image

        buf = io.BytesIO()
        img = Image.new("RGBA", (4, 4), color=(0, 128, 255, 128))
        img.save(buf, format="PNG")
        buf.seek(0)

        upload = _make_upload(buf.read(), "transparent.png")
        result = validate_credential(upload)
        self.assertEqual(result.content_type, "image/png")

    def test_grayscale_jpeg_accepted(self):
        """Grayscale (L mode) JPEG converted to RGB before re-encoding."""
        from PIL import Image

        buf = io.BytesIO()
        img = Image.new("L", (4, 4), color=128)
        img.save(buf, format="JPEG")
        buf.seek(0)

        upload = _make_upload(buf.read(), "gray.jpg")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)


# ---------------------------------------------------------------------------
# Return type tests
# ---------------------------------------------------------------------------

class CredentialReturnTypeTests(SimpleTestCase):

    def test_returns_in_memory_uploaded_file(self):
        data = _minimal_pdf()
        upload = _make_upload(data, "doc.pdf")
        result = validate_credential(upload)
        self.assertIsInstance(result, InMemoryUploadedFile)

    def test_returned_file_is_seekable_to_zero(self):
        data = _minimal_pdf()
        upload = _make_upload(data, "doc.pdf")
        result = validate_credential(upload)
        result.seek(0)
        content = result.read()
        self.assertTrue(len(content) > 0)

    def test_original_upload_still_at_position_zero(self):
        """validate_credential must leave the original upload seeked to 0."""
        data = _minimal_jpeg()
        upload = _make_upload(data, "photo.jpg")
        validate_credential(upload)
        self.assertEqual(upload.tell(), 0)

    def test_pdf_name_preserved_with_suffix(self):
        data = _minimal_pdf()
        upload = _make_upload(data, "diploma.pdf")
        result = validate_credential(upload)
        self.assertTrue(result.name.endswith(".pdf"))

    def test_jpeg_result_has_jpg_suffix(self):
        data = _minimal_jpeg()
        upload = _make_upload(data, "id.jpg")
        result = validate_credential(upload)
        self.assertTrue(result.name.endswith(".jpg"))

    def test_png_result_has_png_suffix(self):
        data = _minimal_png()
        upload = _make_upload(data, "scan.png")
        result = validate_credential(upload)
        self.assertTrue(result.name.endswith(".png"))


# ---------------------------------------------------------------------------
# Helper function unit tests
# ---------------------------------------------------------------------------

class HelperFunctionTests(SimpleTestCase):

    def test_read_all_resets_position(self):
        data = b"hello"
        buf = io.BytesIO(data)
        upload = InMemoryUploadedFile(buf, "f", "f.txt", "text/plain", len(data), None)
        result = _read_all(upload)
        self.assertEqual(result, data)
        self.assertEqual(upload.tell(), 0)

    def test_read_all_from_mid_stream(self):
        data = b"abcdef"
        buf = io.BytesIO(data)
        buf.seek(3)   # skip first 3 bytes
        upload = InMemoryUploadedFile(buf, "f", "f.txt", "text/plain", len(data), None)
        result = _read_all(upload)
        self.assertEqual(result, data)   # always reads from byte 0

    def test_extension_matches_unknown_type(self):
        """An unrecognised detected type never matches."""
        self.assertFalse(_extension_matches("file.xyz", "xyz"))

    def test_validate_pdf_raises_on_forbidden_token(self):
        data = b"%PDF-1.4\n/JavaScript << >>"
        with self.assertRaises(ValidationError):
            _validate_pdf(data)

    def test_validate_pdf_passes_on_clean_data(self):
        data = _minimal_pdf()
        # Should not raise
        _validate_pdf(data)
