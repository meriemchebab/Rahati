"""Text safety and content limits for ContentCard and ContentCardTranslation.

This module is pure Python — no Django models, no database access.
It is imported by serializers, the seed command, and the test suite.

Usage
-----
    from .content_rules import clean_text, TITLE_MAX, BODY_MAX, ...
    value = clean_text(raw, "title", TITLE_MAX)
"""
import re
import unicodedata

from django.core.exceptions import ValidationError


# --------------------------------------------------------------------------
# Field-length limits (characters after normalisation)
# --------------------------------------------------------------------------
TITLE_MAX = 200
BODY_MAX = 2000
ACTION_TEXT_MAX = 255
SUPPORT_NOTE_MAX = 500

# Per-professional card limit
MAX_CARDS_PER_PROFESSIONAL = 200

# Maximum translations per card
MAX_TRANSLATIONS_PER_CARD = 2

# The six valid pattern codes, in display priority order.
PATTERN_PRIORITY = [
    "mood_dip",
    "low_energy_streak",
    "late_cycle_dip",
    "big_swings",
    "improving_trend",
    "silent_5_days",
]

# --------------------------------------------------------------------------
# Compiled regexes (module-level for performance & idempotency)
# --------------------------------------------------------------------------

# HTML-like tags: "<" immediately followed by a letter, "/" or "!"
_RE_HTML_TAG = re.compile(r"<[a-zA-Z/!]")

# URL / link patterns
_RE_URL = re.compile(
    r"""
    (https?://|ftp://|www\.|javascript:|data:|]\()   # common prefixes
    |
    \b[\w-]+\.(?:com|net|org|dz|fr|io|me)\b          # bare domain with TLD
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Control characters (C0/C1 + NUL) other than newline (0x0A) and tab (0x09).
# Unicode category "Cc" covers 0x00-0x1F and 0x7F-0x9F.
_RE_CONTROL = re.compile(
    r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]"
)

# Bidirectional override/isolate codepoints
# U+202A-U+202E: left-to-right embedding, right-to-left embedding, etc.
# U+2066-U+2069: isolate characters
_RE_BIDI = re.compile(
    "[\u202a-\u202e\u2066-\u2069]"
)


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------

def clean_text(value: str, field: str, max_len: int, required: bool = True) -> str:
    """Validate and normalise a single plain-text card field.

    Normalises to Unicode NFC and strips outer whitespace, then raises
    ``django.core.exceptions.ValidationError`` (HTTP 400 via DRF) for any of:

    * HTML-like tags (``<`` followed by letter, ``/`` or ``!``)
    * URLs / links (http, https, ftp, www., javascript:, data:, ``](``, bare TLD domains)
    * Control characters other than newline and tab (including NUL)
    * Bidirectional override / isolate characters (U+202A-U+202E, U+2066-U+2069)
    * Empty or whitespace-only when ``required=True``
    * Over-length

    Accepts
    -------
    * French: apostrophes, accents (e with acute, cedilla, etc.), guillemets
    * Arabic: diacritics (tashkil), Arabic punctuation, Arabic-Indic digits
    * Emoji
    * A plain ``<`` followed by a space or digit - e.g. ``mood < 3``

    Calling ``clean_text`` twice on the same value always returns the same result.
    Never uses ``mark_safe``, raw SQL, or ``eval``.
    """
    if not isinstance(value, str):
        value = str(value)

    # 1. NFC normalisation (idempotent).
    value = unicodedata.normalize("NFC", value)

    # 2. Strip outer whitespace.
    value = value.strip()

    # 3. Empty check (must come after strip).
    if required and not value:
        raise ValidationError({field: "This field may not be blank."})
    if not required and not value:
        return value

    # 4. Control characters (NUL, bell, escape, etc.) - excludes \n (0x0A) and \t (0x09).
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
