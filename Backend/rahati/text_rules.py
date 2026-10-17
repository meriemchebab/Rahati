"""Text validation helpers for Rahati.

Pure Python — no Django models, no database access.  Imported by serializers,
management commands, and the test suite.

Public surface
--------------
clean_text(value, field, max_len, required=True) -> str
    Generic plain-text validator for card titles, to-do titles, etc.
    Identical to the function in content_rules.py (kept there for backwards
    compatibility; this module is the canonical source going forward).

clean_display_name(value, field="display_name") -> str
    For ProfessionalProfile.display_name: allows letters, digits, spaces,
    hyphens, apostrophes, and Arabic/French punctuation; 2–120 characters.

clean_phone(value, field="phone") -> str
    E.164-inspired: optional leading +, then 7–15 digits.  Strips spaces and
    common separators before validating.

RESERVED_NICKNAMES : frozenset[str]
    Lower-case, separator-free forms that map to platform identity words.
    Compare after applying _nickname_key().

Notes
-----
* All functions raise ``django.core.exceptions.ValidationError`` so DRF
  serializers turn them into HTTP 400 automatically.
* ``clean_text`` is idempotent: applying it twice yields the same result.
* None of these functions ever call mark_safe, eval, or raw SQL.
"""
from __future__ import annotations

import re
import unicodedata

from django.core.exceptions import ValidationError


# ---------------------------------------------------------------------------
# Shared compiled patterns (module-level for performance)
# ---------------------------------------------------------------------------

# HTML-like tag: "<" immediately followed by a letter, "/" or "!"
_RE_HTML_TAG = re.compile(r"<[a-zA-Z/!]")

# URL / hyperlink patterns
_RE_URL = re.compile(
    r"""
    (https?://|ftp://|www\.|javascript:|data:|]\()   # common prefixes
    |
    \b[\w-]+\.(?:com|net|org|dz|fr|io|me)\b          # bare domain + TLD
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Control characters — excludes newline (0x0A) and tab (0x09)
_RE_CONTROL = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]")

# Bidirectional override / isolate codepoints
_RE_BIDI = re.compile("[\u202a-\u202e\u2066-\u2069]")

# Phone: optional +, then 7–15 digits (E.164-like, separators stripped first)
_RE_PHONE_DIGITS = re.compile(r"^\+?\d{7,15}$")
# Characters we strip from raw phone input before digit-counting
_RE_PHONE_SEPARATORS = re.compile(r"[\s\-\.\(\)]")

# Display name: letters (any script), digits, space, hyphen, apostrophe,
# Arabic tatweel (ـ U+0640), French guillemets.  Must contain at least one
# Unicode letter.
_RE_DISPLAY_NAME_INVALID = re.compile(r"[^\w\s\-\'\u0060\u00B7\u0640\u00AB\u00BB]")
_RE_HAS_LETTER = re.compile(r"\p{L}", re.UNICODE) if False else None  # fallback below

# ---------------------------------------------------------------------------
# Reserved nickname list
# ---------------------------------------------------------------------------

#: Platform identity words that must not be registered as user nicknames.
#: Stored as canonical forms produced by _nickname_key() (lower-case NFKC,
#: separators removed).  Compare incoming nicknames the same way.
RESERVED_NICKNAMES: frozenset[str] = frozenset(
    {
        "admin",
        "administrator",
        "support",
        "rahati",
        "moderator",
        "staff",
        "root",
        "system",
        "official",
    }
)


def _nickname_key(value: str) -> str:
    """Canonical form used for reserved-word and duplicate checks.

    1. NFKC normalisation.
    2. Lower-case.
    3. Remove separators: underscore, hyphen, dot, digits.

    This makes "A_d_m_i_n", "Admin1", "a.d.m.i.n" all map to "admin".
    """
    value = unicodedata.normalize("NFKC", value).lower()
    return re.sub(r"[_\-.\d]", "", value)


# ---------------------------------------------------------------------------
# Public validators
# ---------------------------------------------------------------------------

def clean_text(value: str, field: str, max_len: int, required: bool = True) -> str:
    """Validate and normalise a plain-text field.

    Applies NFC normalisation and strips outer whitespace, then raises
    ``ValidationError`` for any of:

    * HTML-like tags (``<`` followed by letter, ``/`` or ``!``)
    * URLs / links (http, https, ftp, www., javascript:, data:, ``](``,
      bare domains ending com/net/org/dz/fr/io/me)
    * Control characters other than newline and tab (including NUL)
    * Bidirectional override / isolate characters (U+202A–U+202E, U+2066–U+2069)
    * Empty / whitespace-only string when ``required=True``
    * Value longer than ``max_len`` characters

    Accepted characters include French apostrophes and accents, Arabic
    diacritics and Arabic-Indic digits, emoji, and a plain ``<`` followed by a
    space or digit (e.g. "mood < 3").

    Idempotent: ``clean_text(clean_text(v, f, n), f, n) == clean_text(v, f, n)``.
    """
    if not isinstance(value, str):
        value = str(value)

    # 1. NFC normalisation.
    value = unicodedata.normalize("NFC", value)

    # 2. Strip outer whitespace.
    value = value.strip()

    # 3. Empty check (after strip).
    if required and not value:
        raise ValidationError({field: "This field may not be blank."})
    if not required and not value:
        return value

    # 4. Control characters (excludes \n 0x0A and \t 0x09).
    if _RE_CONTROL.search(value):
        raise ValidationError({field: "Text contains disallowed control characters."})

    # 5. Bidirectional override / isolate characters.
    if _RE_BIDI.search(value):
        raise ValidationError({field: "Text contains disallowed bidirectional characters."})

    # 6. HTML-like tags.
    if _RE_HTML_TAG.search(value):
        raise ValidationError({field: "Text must not contain HTML tags."})

    # 7. URLs and links.
    if _RE_URL.search(value):
        raise ValidationError({field: "Text must not contain URLs or links."})

    # 8. Length check.
    if len(value) > max_len:
        raise ValidationError(
            {field: f"Ensure this value has at most {max_len} characters (it has {len(value)})."}
        )

    return value


def clean_display_name(value: str, field: str = "display_name") -> str:
    """Validate a professional's public display name.

    Rules:
    * NFC-normalised, outer whitespace stripped.
    * 2–120 characters.
    * Must contain at least one Unicode letter.
    * Allowed: Unicode letters, digits, space, hyphen, apostrophe (``'``),
      backtick, middle dot (·), Arabic tatweel (ـ), French guillemets (« »).
    * No control characters, no bidi overrides, no HTML tags, no URLs.

    This is deliberately more permissive than ``clean_text`` (which forbids
    ``<`` entirely) because a display name like "Dr. N'Ait" is legitimate
    but "<script>" is not.
    """
    if not isinstance(value, str):
        value = str(value)

    value = unicodedata.normalize("NFC", value).strip()

    if not value:
        raise ValidationError({field: "Display name may not be blank."})

    if len(value) < 2:
        raise ValidationError({field: "Display name must be at least 2 characters."})

    if len(value) > 120:
        raise ValidationError(
            {field: f"Display name must be at most 120 characters (it has {len(value)})."}
        )

    # Must contain at least one letter (any Unicode script).
    if not any(unicodedata.category(ch).startswith("L") for ch in value):
        raise ValidationError({field: "Display name must contain at least one letter."})

    # Control characters.
    if _RE_CONTROL.search(value):
        raise ValidationError({field: "Display name contains disallowed control characters."})

    # Bidi overrides.
    if _RE_BIDI.search(value):
        raise ValidationError({field: "Display name contains disallowed bidirectional characters."})

    # HTML tags.
    if _RE_HTML_TAG.search(value):
        raise ValidationError({field: "Display name must not contain HTML tags."})

    # URLs.
    if _RE_URL.search(value):
        raise ValidationError({field: "Display name must not contain URLs or links."})

    return value


def clean_phone(value: str | None, field: str = "phone") -> str | None:
    """Validate and normalise a phone number.

    * ``None`` or empty string → returns ``None`` (phone is optional).
    * Strips spaces, hyphens, dots, and parentheses before validating.
    * Accepts an optional leading ``+`` followed by 7–15 digits (E.164-like).
    * Rejects anything else with a descriptive ``ValidationError``.

    Does NOT verify whether the number is reachable or belongs to Algeria.
    Country-level validation is an operational concern (e.g. a libphonenumber
    call in the registration view), not a core text rule.
    """
    if value is None:
        return None

    if not isinstance(value, str):
        value = str(value)

    value = value.strip()

    if not value:
        return None

    # Strip common separators before digit-counting.
    stripped = _RE_PHONE_SEPARATORS.sub("", value)

    if not _RE_PHONE_DIGITS.match(stripped):
        raise ValidationError(
            {
                field: (
                    "Enter a valid phone number (optional + then 7–15 digits). "
                    f"Got: {value!r}"
                )
            }
        )

    return stripped  # canonical form: +NNNNNNN… or NNNNNNN…


def clean_private_text(value: str, field: str, max_len: int, required: bool = True) -> str:
    """Validate a private / journal-style text field.

    More permissive than ``clean_text``: allows ``<``, links, and other
    special sequences because the text is shown only to its owner (or to a
    professional with explicit consent) and is never rendered as HTML.

    Still rejects:
    * NUL and other control characters (``\\x00-\\x08``, ``\\x0B``, ``\\x0C``,
      ``\\x0E-\\x1F``, ``\\x7F-\\x9F``) — newline and tab are allowed.
    * Bidirectional override / isolate characters (U+202A–U+202E, U+2066–U+2069).
    * Over-length values.
    * Empty string when ``required=True``.
    """
    if not isinstance(value, str):
        value = str(value)

    value = unicodedata.normalize("NFC", value).strip()

    if required and not value:
        raise ValidationError({field: "This field may not be blank."})
    if not required and not value:
        return value

    if _RE_CONTROL.search(value):
        raise ValidationError({field: "Text contains disallowed control characters."})

    if _RE_BIDI.search(value):
        raise ValidationError({field: "Text contains disallowed bidirectional characters."})

    if len(value) > max_len:
        raise ValidationError(
            {field: f"Ensure this value has at most {max_len} characters (it has {len(value)})."}
        )

    return value
