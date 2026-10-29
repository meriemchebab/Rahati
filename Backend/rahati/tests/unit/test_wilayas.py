from django.test import SimpleTestCase

from rahati.wilayas import (
    WILAYA_CHOICES,
    WILAYA_CODES,
    get_wilaya_name,
    is_valid_wilaya,
    normalize_wilaya_code,
)


class WilayaTests(SimpleTestCase):
    def test_choices_cover_all_58_two_digit_codes_once(self):
        codes = [code for code, _ in WILAYA_CHOICES]
        self.assertEqual(len(codes), 58)
        self.assertEqual(len(set(codes)), 58)
        self.assertEqual(codes, [f"{number:02d}" for number in range(1, 59)])
        self.assertEqual(WILAYA_CODES, set(codes))

    def test_known_names_include_the_added_wilayas(self):
        self.assertEqual(get_wilaya_name("01"), "Adrar")
        self.assertEqual(get_wilaya_name("16"), "Alger")
        self.assertEqual(get_wilaya_name("48"), "Relizane")
        self.assertEqual(get_wilaya_name("49"), "Timimoun")
        self.assertEqual(get_wilaya_name("58"), "El Meniaa")

    def test_code_helpers_normalize_supported_inputs_and_reject_invalid_values(self):
        cases = (
            ("01", "01", True),
            ("1", "01", True),
            (1, "01", True),
            ("58", "58", True),
            ("59", None, False),
            ("00", None, False),
            ("xx", None, False),
            (" 16 ", "16", True),
            (None, None, False),
        )
        for value, normalized, valid in cases:
            with self.subTest(value=value):
                self.assertEqual(normalize_wilaya_code(value), normalized)
                self.assertEqual(is_valid_wilaya(value), valid)
                if not valid:
                    self.assertIsNone(get_wilaya_name(value))
