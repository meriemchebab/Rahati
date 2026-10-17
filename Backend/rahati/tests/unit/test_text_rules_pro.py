"""Unit tests for rahati/text_rules.py.

100% SimpleTestCase — no database, no HTTP.

Coverage target: 100% of text_rules.py lines.

Test groups
-----------
CleanTextAcceptsTests      — inputs that must pass clean_text unmodified.
CleanTextRejectsTests      — inputs that must raise ValidationError.
CleanTextIdempotencyTests  — applying clean_text twice yields the same result.
CleanDisplayNameTests      — clean_display_name specific rules.
CleanPhoneTests            — clean_phone normalisation and validation.
CleanPrivateTextTests      — clean_private_text (journal-style, permissive).
ReservedNicknamesTests     — RESERVED_NICKNAMES set and _nickname_key behaviour.
"""
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from rahati.text_rules import (
    RESERVED_NICKNAMES,
    _nickname_key,
    clean_display_name,
    clean_phone,
    clean_private_text,
    clean_text,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(value, max_len=500):
    """Assert clean_text returns without raising."""
    return clean_text(value, "field", max_len)


def _bad(value, max_len=500):
    """Assert clean_text raises ValidationError; return it."""
    with SimpleTestCase().assertRaises(ValidationError):
        clean_text(value, "field", max_len)


# ---------------------------------------------------------------------------
# clean_text — accepted inputs
# ---------------------------------------------------------------------------

class CleanTextAcceptsTests(SimpleTestCase):
    """Inputs that must pass clean_text unchanged (after NFC + strip)."""

    def _ok(self, value, max_len=500):
        result = clean_text(value, "field", max_len)
        return result

    def test_plain_ascii(self):
        self.assertEqual(self._ok("Hello world"), "Hello world")

    def test_arabic_text(self):
        self.assertEqual(self._ok("مرحبا بالعالم"), "مرحبا بالعالم")

    def test_arabic_with_diacritics(self):
        self.assertEqual(self._ok("رَحَمَة"), "رَحَمَة")

    def test_arabic_indic_digits(self):
        self.assertEqual(self._ok("٣ مشاعر"), "٣ مشاعر")

    def test_french_accents(self):
        self.assertEqual(self._ok("événement"), "événement")

    def test_french_cedilla(self):
        self.assertEqual(self._ok("ça va"), "ça va")

    def test_french_guillemets(self):
        self.assertEqual(self._ok("« bonjour »"), "« bonjour »")

    def test_french_apostrophe(self):
        self.assertEqual(self._ok("l'heure"), "l'heure")

    def test_emoji(self):
        self.assertEqual(self._ok("جيد 🌟"), "جيد 🌟")

    def test_less_than_followed_by_space(self):
        """'<' followed by space is not an HTML tag."""
        self.assertEqual(self._ok("mood < 3"), "mood < 3")

    def test_less_than_followed_by_digit(self):
        self.assertEqual(self._ok("score < 10 is bad"), "score < 10 is bad")

    def test_newline_allowed(self):
        result = self._ok("line1\nline2")
        self.assertIn("\n", result)

    def test_tab_allowed(self):
        result = self._ok("col1\tcol2")
        self.assertIn("\t", result)

    def test_sql_looking_text_stored_literally(self):
        """SQL-like text is not special — clean_text is not an SQL guard."""
        val = "Robert'); DROP TABLE users;--"
        self.assertEqual(self._ok(val), val)

    def test_strips_outer_whitespace(self):
        self.assertEqual(self._ok("  hello  "), "hello")

    def test_nfc_normalisation(self):
        # NFD: e + combining acute → NFC: é (single codepoint)
        nfd = "e\u0301"   # NFD
        nfc = "\xe9"       # NFC
        self.assertEqual(self._ok(nfd), nfc)

    def test_optional_field_empty_string_returns_empty(self):
        result = clean_text("", "field", 100, required=False)
        self.assertEqual(result, "")

    def test_optional_field_whitespace_only_returns_empty(self):
        result = clean_text("   ", "field", 100, required=False)
        self.assertEqual(result, "")

    def test_non_string_coerced_to_str(self):
        result = clean_text(42, "field", 100)
        self.assertEqual(result, "42")

    def test_exactly_at_max_len(self):
        val = "a" * 100
        self.assertEqual(self._ok(val, max_len=100), val)


# ---------------------------------------------------------------------------
# clean_text — rejected inputs
# ---------------------------------------------------------------------------

class CleanTextRejectsTests(SimpleTestCase):

    def _raises(self, value, field_name="field", max_len=500):
        with self.assertRaises(ValidationError):
            clean_text(value, field_name, max_len)

    # --- HTML tags ---
    def test_rejects_bold_tag(self):
        self._raises("<b>bold</b>")

    def test_rejects_script_tag(self):
        self._raises("<script>alert(1)</script>")

    def test_rejects_img_onerror(self):
        self._raises("<img src=x onerror=alert(1)>")

    def test_rejects_closing_tag(self):
        self._raises("</div>")

    def test_rejects_html_comment(self):
        self._raises("<!-- comment -->")

    # --- URLs ---
    def test_rejects_http_url(self):
        self._raises("visit http://example.com")

    def test_rejects_https_url(self):
        self._raises("https://example.com")

    def test_rejects_www_prefix(self):
        self._raises("go to www.site.com")

    def test_rejects_javascript_uri(self):
        self._raises("javascript:alert(1)")

    def test_rejects_data_uri(self):
        self._raises("data:text/html,<h1>x</h1>")

    def test_rejects_ftp_url(self):
        self._raises("ftp://files.example.org")

    def test_rejects_markdown_link(self):
        self._raises("[click](http://evil.com)")

    def test_rejects_bare_com_domain(self):
        self._raises("visit example.com today")

    def test_rejects_bare_dz_domain(self):
        self._raises("rahati.dz is the site")

    def test_rejects_bare_fr_domain(self):
        self._raises("sante.fr")

    def test_rejects_bare_io_domain(self):
        self._raises("startup.io")

    def test_rejects_bare_me_domain(self):
        self._raises("my.me is me")

    def test_rejects_bare_net_domain(self):
        self._raises("some.net link")

    def test_rejects_bare_org_domain(self):
        self._raises("ngo.org")

    # --- Control characters ---
    def test_rejects_nul_byte(self):
        self._raises("hello\x00world")

    def test_rejects_bell(self):
        self._raises("ring\x07bell")

    def test_rejects_escape(self):
        self._raises("\x1b[31mred\x1b[0m")

    def test_rejects_backspace(self):
        self._raises("ba\x08ck")

    def test_rejects_form_feed(self):
        self._raises("page\x0Cbreak")

    # --- Bidi overrides ---
    def test_rejects_right_to_left_override(self):
        self._raises("text\u202eoverflow")

    def test_rejects_left_to_right_embedding(self):
        self._raises("text\u202aembed")

    def test_rejects_bidi_isolate(self):
        self._raises("text\u2066isolate")

    def test_rejects_pop_directional_isolate(self):
        self._raises("text\u2069end")

    # --- Empty / blank ---
    def test_rejects_empty_string_when_required(self):
        self._raises("")

    def test_rejects_whitespace_only_when_required(self):
        self._raises("   ")

    # --- Length ---
    def test_rejects_over_max_len(self):
        self._raises("a" * 101, max_len=100)


# ---------------------------------------------------------------------------
# clean_text — idempotency
# ---------------------------------------------------------------------------

class CleanTextIdempotencyTests(SimpleTestCase):
    """Applying clean_text twice must yield the same result as once."""

    def _check(self, value, max_len=500):
        first = clean_text(value, "f", max_len)
        second = clean_text(first, "f", max_len)
        self.assertEqual(first, second, f"Not idempotent for: {value!r}")

    def test_plain_text(self):
        self._check("hello world")

    def test_arabic(self):
        self._check("مرحبا")

    def test_nfd_input(self):
        # NFD input → NFC after first pass → NFC idempotent on second pass
        self._check("e\u0301")

    def test_leading_whitespace(self):
        self._check("  spaced  ")

    def test_sql_text(self):
        self._check("SELECT * FROM users")


# ---------------------------------------------------------------------------
# clean_display_name
# ---------------------------------------------------------------------------

class CleanDisplayNameTests(SimpleTestCase):

    def _ok(self, value):
        return clean_display_name(value)

    def _bad(self, value):
        with self.assertRaises(ValidationError):
            clean_display_name(value)

    def test_accepts_standard_name(self):
        self.assertEqual(self._ok("Dr. Nour"), "Dr. Nour")

    def test_accepts_arabic_name(self):
        self.assertEqual(self._ok("الدكتورة نور"), "الدكتورة نور")

    def test_accepts_french_name_with_apostrophe(self):
        self.assertEqual(self._ok("N'Ait Brahim"), "N'Ait Brahim")

    def test_accepts_hyphenated_name(self):
        self.assertEqual(self._ok("Marie-Claire"), "Marie-Claire")

    def test_accepts_name_with_dots(self):
        # Dots in "Dr." style
        self.assertEqual(self._ok("Dr. Amina"), "Dr. Amina")

    def test_accepts_name_at_exactly_2_chars(self):
        self.assertEqual(self._ok("Li"), "Li")

    def test_accepts_name_at_120_chars(self):
        val = "A" * 120
        self.assertEqual(self._ok(val), val)

    def test_strips_whitespace(self):
        self.assertEqual(self._ok("  Dr. Nour  "), "Dr. Nour")

    def test_rejects_empty(self):
        self._bad("")

    def test_rejects_whitespace_only(self):
        self._bad("   ")

    def test_rejects_single_char(self):
        self._bad("A")

    def test_rejects_over_120_chars(self):
        self._bad("A" * 121)

    def test_rejects_digits_only(self):
        self._bad("12345")

    def test_rejects_html_tag(self):
        self._bad("<script>alert(1)</script>")

    def test_rejects_url(self):
        self._bad("Dr http://evil.com")

    def test_rejects_bidi_override(self):
        self._bad("Dr\u202eNour")

    def test_rejects_control_char(self):
        self._bad("Dr\x00Nour")

    def test_non_string_coerced(self):
        # Should not raise; the number has at least one digit but no letter
        with self.assertRaises(ValidationError):
            clean_display_name(123)


# ---------------------------------------------------------------------------
# clean_phone
# ---------------------------------------------------------------------------

class CleanPhoneTests(SimpleTestCase):

    def _ok(self, value):
        return clean_phone(value)

    def _bad(self, value):
        with self.assertRaises(ValidationError):
            clean_phone(value)

    # --- Accepted inputs ---
    def test_accepts_algerian_landline(self):
        result = self._ok("+213555123456")
        self.assertEqual(result, "+213555123456")

    def test_accepts_plain_digits(self):
        result = self._ok("0555123456")
        self.assertEqual(result, "0555123456")

    def test_accepts_7_digit_min(self):
        result = self._ok("1234567")
        self.assertEqual(result, "1234567")

    def test_accepts_15_digit_max(self):
        result = self._ok("+213" + "1" * 11)
        self.assertIsNotNone(result)

    def test_strips_spaces(self):
        result = self._ok("+213 555 12 34 56")
        self.assertEqual(result, "+213555123456")

    def test_strips_hyphens(self):
        result = self._ok("05-55-12-34-56")
        self.assertEqual(result, "0555123456")

    def test_strips_dots(self):
        result = self._ok("05.55.12.34.56")
        self.assertEqual(result, "0555123456")

    def test_strips_parentheses(self):
        result = self._ok("(0555) 123456")
        self.assertEqual(result, "0555123456")

    def test_none_returns_none(self):
        self.assertIsNone(self._ok(None))

    def test_empty_string_returns_none(self):
        self.assertIsNone(self._ok(""))

    def test_whitespace_only_returns_none(self):
        self.assertIsNone(self._ok("   "))

    # --- Rejected inputs ---
    def test_rejects_too_short(self):
        self._bad("123456")  # 6 digits

    def test_rejects_too_long(self):
        self._bad("+" + "1" * 16)  # 16 digits

    def test_rejects_letters(self):
        self._bad("055512ABCD")

    def test_rejects_double_plus(self):
        self._bad("++213555123")

    def test_rejects_embedded_plus(self):
        self._bad("213+555123")

    def test_non_string_coerced_then_validated(self):
        # int 12345 → "12345" → too short (5 digits) → ValidationError
        self._bad(12345)


# ---------------------------------------------------------------------------
# clean_private_text (journal-style)
# ---------------------------------------------------------------------------

class CleanPrivateTextTests(SimpleTestCase):

    def _ok(self, value, max_len=20_000):
        return clean_private_text(value, "body", max_len)

    def _bad(self, value, max_len=20_000):
        with self.assertRaises(ValidationError):
            clean_private_text(value, "body", max_len)

    def test_allows_html_tags(self):
        """Journal text may contain '<script>' as plain text."""
        val = "<script>alert(1)</script>"
        result = self._ok(val)
        self.assertIn("<script>", result)

    def test_allows_http_link(self):
        result = self._ok("I visited http://example.com today")
        self.assertIn("http://", result)

    def test_allows_newline_and_tab(self):
        result = self._ok("line1\nline2\ttabbed")
        self.assertIn("\n", result)
        self.assertIn("\t", result)

    def test_allows_arabic(self):
        result = self._ok("شعرت بالحزن اليوم")
        self.assertIn("شعرت", result)

    def test_allows_french_accents(self):
        result = self._ok("J'ai ressenti de la tristesse")
        self.assertIn("tristesse", result)

    def test_allows_emoji(self):
        result = self._ok("Today was hard 😔")
        self.assertIn("😔", result)

    def test_nfc_normalised(self):
        nfd = "e\u0301"
        result = self._ok(nfd)
        self.assertEqual(result, "\xe9")

    def test_strips_outer_whitespace(self):
        self.assertEqual(self._ok("  hello  "), "hello")

    def test_rejects_nul_byte(self):
        self._bad("hello\x00world")

    def test_rejects_bidi_override(self):
        self._bad("text\u202eoverflow")

    def test_rejects_bidi_isolate(self):
        self._bad("text\u2066isolate")

    def test_rejects_control_char_bell(self):
        self._bad("ring\x07bell")

    def test_rejects_over_max_len(self):
        self._bad("a" * 20_001)

    def test_rejects_empty_when_required(self):
        self._bad("")

    def test_optional_empty_returns_empty(self):
        result = clean_private_text("", "body", 100, required=False)
        self.assertEqual(result, "")


# ---------------------------------------------------------------------------
# RESERVED_NICKNAMES and _nickname_key
# ---------------------------------------------------------------------------

class ReservedNicknamesTests(SimpleTestCase):

    def test_set_is_frozen(self):
        self.assertIsInstance(RESERVED_NICKNAMES, frozenset)

    def test_contains_expected_words(self):
        for word in ("admin", "administrator", "support", "rahati", "moderator",
                     "staff", "root", "system", "official"):
            self.assertIn(word, RESERVED_NICKNAMES)

    def test_nickname_key_lowercases(self):
        self.assertEqual(_nickname_key("Admin"), "admin")

    def test_nickname_key_removes_underscores(self):
        self.assertEqual(_nickname_key("a_d_m_i_n"), "admin")

    def test_nickname_key_removes_hyphens(self):
        self.assertEqual(_nickname_key("a-d-m-i-n"), "admin")

    def test_nickname_key_removes_dots(self):
        self.assertEqual(_nickname_key("a.d.m.i.n"), "admin")

    def test_nickname_key_removes_digits(self):
        self.assertEqual(_nickname_key("admin1"), "admin")

    def test_nickname_key_nfkc(self):
        # Full-width A → A after NFKC.
        self.assertEqual(_nickname_key("\uff21dmin"), "admin")

    def test_reserved_admin_with_separators(self):
        self.assertIn(_nickname_key("A_d_m_i_n"), RESERVED_NICKNAMES)

    def test_reserved_support_uppercase(self):
        self.assertIn(_nickname_key("SUPPORT1"), RESERVED_NICKNAMES)

    def test_reserved_rahati_mixed_case(self):
        self.assertIn(_nickname_key("Rahati"), RESERVED_NICKNAMES)

    def test_non_reserved_word(self):
        self.assertNotIn(_nickname_key("nour"), RESERVED_NICKNAMES)

    def test_non_reserved_professional(self):
        """'professional' is not in the reserved list."""
        self.assertNotIn(_nickname_key("professional"), RESERVED_NICKNAMES)
