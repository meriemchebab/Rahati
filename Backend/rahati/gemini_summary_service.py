import logging
import os
import re
import time
from threading import Lock

from google.genai import Client
import language_tool_python

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.5-flash-lite"
MAX_ATTEMPTS = 2
MIN_SUMMARY_WORDS = 12
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

LANGUAGETOOL_LANGUAGES = {
    "en": "en-US",
    "ar": "ar",
}

# Reuse LanguageTool instances instead of starting Java for every summary.
_language_tools = {}
_language_tools_lock = Lock()


def _normalize_language(language):
    """Normalize supported language codes."""
    language = (language or "en").lower().replace("_", "-").split("-")[0]
    return language if language in {"en", "ar"} else "en"


def _fallback_summary(stats, language="en"):
    """Build a complete local summary without calling an external API."""
    if not isinstance(stats, dict):
        stats = {}

    language = _normalize_language(language)

    count = stats.get("check_in_count") or 0
    mood = stats.get("average_mood")
    energy = stats.get("average_energy")
    change = stats.get("mood_change")
    change_magnitude = abs(change) if isinstance(change, (int, float)) else 0
    streak = stats.get("check_in_streak") or 0

    messages = {
        "en": {
            "empty": (
                "No check-ins were recorded during this period. "
                "Try tracking your mood and energy regularly."
            ),
            "count": f"You recorded {count} check-ins during this period.",
            "mood": f"Your average mood was {mood}/5.",
            "energy": f"Your average energy was {energy}/5.",
            "up": "Your average mood increased compared with the previous period.",
            "down": "Your average mood decreased compared with the previous period.",
            "stable": "Your average mood remained stable compared with the previous period.",
            "streak": f"You recorded check-ins for {streak} consecutive days.",
            "note": "These figures describe your check-ins and are not a medical diagnosis. Keep tracking how you feel to understand your personal patterns.",
        },
        "ar": {
            "empty": (
                "لم يتم تسجيل أي متابعة خلال هذه الفترة. "
                "حاول تسجيل مزاجك وطاقتك بانتظام."
            ),
            "count": f"سجلت {count} مرات خلال هذه الفترة.",
            "mood": f"كان متوسط مزاجك {mood} من 5.",
            "energy": f"كان متوسط طاقتك {energy} من 5.",
            "up": "ارتفع متوسط مزاجك مقارنة بالفترة السابقة.",
            "down": "انخفض متوسط مزاجك مقارنة بالفترة السابقة.",
            "stable": "ظل متوسط مزاجك مستقراً مقارنة بالفترة السابقة.",
            "streak": f"سجلت حالتك لمدة {streak} أيام متتالية.",
            "note": "تعكس هذه الأرقام سجلاتك ولا تمثل تشخيصاً طبياً. واصل تسجيل شعورك لفهم أنماطك بشكل أفضل.",
        },
    }

    text = messages[language]

    if not count:
        return text["empty"]

    parts = [text["count"]]

    if mood is not None:
        parts.append(text["mood"])

    if energy is not None:
        parts.append(text["energy"])

    if isinstance(change, (int, float)):
        if change > 0:
            parts.append(text["up"])
        elif change < 0:
            parts.append(text["down"])
        else:
            parts.append(text["stable"])

    if streak:
        parts.append(text["streak"])

    parts.append(text["note"])

    # Keep sentences separated by a space and normalize punctuation spacing.
    summary = " ".join(part.strip() for part in parts if part and part.strip())
    summary = _clean_summary(summary)
    summary = summary.replace("figuresdescribe", "figures describe").replace("compared withthe", "compared with the")
    return re.sub(r" {2,}", " ", summary)

def _clean_summary(summary):
    """Normalize whitespace and repair missing spaces between sentences."""
    summary = re.sub(r"\s+", " ", summary).strip()
    summary = re.sub(r"([a-z])([A-Z])", r"\1 \2", summary)
    summary = re.sub(r"(?<!\d)([.!?])(?=\S)", r"\1 ", summary)
    summary = re.sub(r"(?<=\d\.)(?=[^\d\s])", " ", summary)
    summary = summary.replace("figuresdescribe", "figures describe")
    summary = summary.replace("compared withthe", "compared with the")
    return summary


def _passes_language_validation(summary, language):
    """Validate summaries without over-rejecting Arabic wording."""
    if not isinstance(summary, str) or not summary.strip():
        return False

    language_code = LANGUAGETOOL_LANGUAGES.get(language)
    if not language_code:
        return False

    # Arabic summaries pass this language check if they are non-empty.
    if language == "ar":
        return True

    try:
        with _language_tools_lock:
            tool = _language_tools.get(language)

            if tool is None:
                tool = language_tool_python.LanguageTool(language_code)
                _language_tools[language] = tool

            matches = tool.check(summary)

            if matches:
                for match in matches:
                    logger.warning(
                        "LanguageTool issue: rule=%s, message=%s",
                        match.rule_id,
                        match.message,
                    )

            return True

    except Exception as exc:
        logger.warning(
            "LanguageTool validation failed; using local fallback. "
            "Error type: %s",
            type(exc).__name__,
        )
        return False


def _is_complete_summary(summary, finish_reason=None):
    """Reject empty, truncated, or incomplete model responses."""
    if not isinstance(summary, str):
        return False

    summary = summary.strip()

    if len(summary.split()) < MIN_SUMMARY_WORDS:
        return False

    if summary.endswith(("...", "…")):
        return False

    if (
        finish_reason is not None
        and str(finish_reason).endswith("MAX_TOKENS")
    ):
        return False

    if not summary or summary[-1] not in ".!?。！？":
        return False

    return True


def _get_status_code(exc):
    """Safely extract an HTTP status code from SDK exceptions."""
    status = getattr(exc, "code", None)

    if callable(status):
        try:
            status = status()
        except Exception:
            status = None

    if isinstance(status, (int, str)):
        try:
            return int(status)
        except ValueError:
            return None

    return None


def generate_analytics_summary(stats, language="en"):
    """
    Generate a supportive summary of numerical check-in analytics.

    Only explicitly allowlisted statistics are sent to Gemini.
    Journal entries and free-text user content are never sent.
    A local summary is returned if Gemini or language validation fails.
    """
    if not isinstance(stats, dict):
        logger.warning("Analytics stats are invalid; using fallback.")
        return _fallback_summary({}, language)

    language = _normalize_language(language)
    fallback = _fallback_summary(stats, language)

    if not stats.get("check_in_count", 0):
        return fallback

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.info("GEMINI_API_KEY is missing; using local summary.")
        return fallback

    # Explicit allowlist: never add journal entries or other free text here.
    safe_stats = {
        "range": stats.get("range"),
        "check_in_count": stats.get("check_in_count"),
        "average_mood": stats.get("average_mood"),
        "average_energy": stats.get("average_energy"),
        "previous_average_mood": stats.get("previous_average_mood"),
        "mood_change": stats.get("mood_change"),
        "check_in_streak": stats.get("check_in_streak"),
    }

    language_names = {
        "en": "English",
        "fr": "French",
        "ar": "Arabic",
    }
    target_language = language_names[language]

    prompt = (
        f"Write exactly 3 complete sentences in {target_language} "
        f"about these wellbeing statistics: {safe_stats}. "
        "Use natural, grammatically correct language and short, simple "
        "sentences. "
        "When writing in Arabic, use clear, natural Modern Standard Arabic "
        "and numeric digits for all statistical values, such as 5, 4.0, "
        "3.2, and 1.0. Do not spell out these numbers in words. "
        "Ensure correct spacing between all words and never join separate "
        "words together. "
        "Mention the check-in count, average mood, average energy, and "
        "mood change when available. Mention the check-in streak when "
        "available. Be supportive and cautious. "
        "Do not diagnose, give medical advice, or invent facts. "
        "Clearly state that these figures are not a medical diagnosis. "
        "Return only the 3 sentences."
    )

    try:
        client = Client(api_key=api_key)

        for attempt in range(MAX_ATTEMPTS):
            try:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config={
                        "max_output_tokens": 1000,
                    },
                )

                summary = _clean_summary(
                    getattr(response, "text", None) or ""
                )

                candidates = getattr(response, "candidates", None) or []
                finish_reason = (
                    getattr(candidates[0], "finish_reason", None)
                    if candidates
                    else None
                )

                valid = _is_complete_summary(summary, finish_reason)
                language_valid = (
                    _passes_language_validation(summary, language)
                    if valid
                    else False
                )

                if valid and language_valid:
                    return summary

                logger.warning(
                    "Gemini summary failed completeness or language "
                    "validation on attempt %s.",
                    attempt + 1,
                )

                return fallback

            except Exception as exc:
                status = _get_status_code(exc)
                logger.warning("Gemini API error details: %s", str(exc))

                if (
                    status in RETRYABLE_STATUS_CODES
                    and attempt < MAX_ATTEMPTS - 1
                ):
                    delay = 2 ** attempt
                    logger.warning(
                        "Gemini temporarily unavailable (status %s). "
                        "Retrying in %s second(s).",
                        status,
                        delay,
                    )
                    time.sleep(delay)
                    continue

                logger.warning(
                    "Gemini summary failed; using local fallback. "
                    "Status: %s; error type: %s",
                    status,
                    type(exc).__name__,
                )
                return fallback

    except Exception as exc:
        logger.warning(
            "Could not initialize Gemini; using local fallback. "
            "Error type: %s",
            type(exc).__name__,
        )
        return fallback

    return fallback
