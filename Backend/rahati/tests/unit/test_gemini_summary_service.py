from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from rahati.gemini_summary_service import (
    _clean_summary,
    _fallback_summary,
    _is_complete_summary,
    _normalize_language,
    _passes_language_validation,
    generate_analytics_summary,
)


class GeminiSummaryServiceTests(SimpleTestCase):

    def test_normalize_supported_languages(self):
        self.assertEqual(_normalize_language("en"), "en")
        self.assertEqual(_normalize_language("ar"), "ar")
        self.assertEqual(_normalize_language("ar-SA"), "ar")

    def test_unsupported_language_defaults_to_english(self):
        self.assertEqual(_normalize_language("fr"), "en")

    def test_clean_summary_repairs_missing_spaces(self):
        result = _clean_summary("Hello.World")
        self.assertEqual(result, "Hello. World")

    def test_empty_summary_fails_language_validation(self):
        self.assertFalse(_passes_language_validation("", "en"))

    def test_arabic_nonempty_summary_passes_language_check(self):
        self.assertTrue(_passes_language_validation("ملخص تجريبي", "ar"))

    def test_complete_summary_passes_completeness_check(self):
        summary = (
            "You recorded 5 check-ins. Your average mood was 4 out of 5. "
            "Your average energy was 3 out of 5. These figures are not "
            "a medical diagnosis."
        )
        self.assertTrue(_is_complete_summary(summary))

    def test_short_summary_fails_completeness_check(self):
        self.assertFalse(_is_complete_summary("You feel good today."))

    def test_truncated_summary_fails_completeness_check(self):
        summary = (
            "You recorded 5 check-ins and your average mood was 4. "
            "Your energy was stable during this period and your mood "
            "patterns show a consistent trend..."
        )
        self.assertFalse(_is_complete_summary(summary))

    def test_fallback_returns_english_summary(self):
        summary = _fallback_summary(
            {
                "check_in_count": 2,
                "average_mood": 4,
                "average_energy": 3,
                "check_in_streak": 2,
            },
            language="en",
        )
        self.assertTrue(summary)
        self.assertIn("2 check-ins", summary)
        self.assertIn("medical diagnosis", summary)

    def test_fallback_returns_arabic_summary(self):
        summary = _fallback_summary(
            {"check_in_count": 2},
            language="ar",
        )
        self.assertTrue(summary)

    @patch(
        "rahati.gemini_summary_service._passes_language_validation",
        return_value=True,
    )
    @patch("rahati.gemini_summary_service.genai.Client")
    @patch(
        "rahati.gemini_summary_service.os.getenv",
        return_value="test-api-key",
    )
    def test_incomplete_gemini_response_uses_fallback(
        self, mock_env, mock_client, mock_language
    ):
        mock_client.return_value.models.generate_content.return_value = (
            MagicMock(
                text="A short incomplete response...",
                candidates=[],
            )
        )

        stats = {
            "check_in_count": 2,
            "average_mood": 4,
            "average_energy": 3,
            "check_in_streak": 2,
        }

        result = generate_analytics_summary(stats, language="en")
        self.assertEqual(result, _fallback_summary(stats, "en"))

    @patch(
        "rahati.gemini_summary_service.genai.Client",
        side_effect=RuntimeError("API unavailable"),
    )
    @patch(
        "rahati.gemini_summary_service.os.getenv",
        return_value="test-api-key",
    )
    def test_client_initialization_error_uses_fallback(
        self, mock_env, mock_client
    ):
        stats = {
            "check_in_count": 2,
            "average_mood": 4,
            "average_energy": 3,
            "check_in_streak": 2,
        }

        result = generate_analytics_summary(stats, language="en")
        self.assertEqual(result, _fallback_summary(stats, "en"))

    @patch("rahati.gemini_summary_service._language_tools", {})
    @patch("rahati.gemini_summary_service.language_tool_python.LanguageTool")
    def test_language_warnings_do_not_reject_summary(self, mock_tool_class):
        mock_tool_class.return_value.check.return_value = [
            MagicMock(rule_id="TEST_RULE", message="Test warning")
        ]

        result = _passes_language_validation(
            "This is a sufficiently long example summary.", "en"
        )
        self.assertTrue(result)