import logging
import os
import re
import time

from google.genai import Client

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.8-flash"
MAX_ATTEMPTS = 2
MIN_SUMMARY_WORDS = 12
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _normalize_language(language):
    """Normalize language codes such as fr-FR to fr."""
    language = (language or "en").lower().replace("_", "-").split("-")[0]
    return language if language in {"en", "fr", "ar"} else "en"


def _fallback_summary(stats, language="en"):
    """Build a complete summary locally without calling an external API."""
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
            "count": f"You recorded {count} check-in(s) during this period.",
            "mood": f"Your average mood was {mood}/5.",
            "energy": f"Your average energy was {energy}/5.",
            "up": (
                f"Your average mood increased by {change} points "
                "compared with the previous period."
            ),
            "down": (
                f"Your average mood decreased by {change_magnitude} points "
                "compared with the previous period."
            ),
            "stable": (
                "Your average mood remained stable compared with "
                "the previous period."
            ),
            "streak": f"You have a {streak}-day check-in streak.",
            "note": (
                "These figures describe your check-ins and are not a "
                "medical diagnosis. Keep tracking how you feel to better "
                "understand your personal patterns."
            ),
        },
        "fr": {
            "empty": (
                "Aucun suivi n'a été enregistré pendant cette période. "
                "Essayez de noter régulièrement votre humeur et votre énergie."
            ),
            "count": (
                f"Vous avez enregistré {count} suivi(s) pendant cette période."
            ),
            "mood": f"Votre humeur moyenne était de {mood}/5.",
            "energy": f"Votre énergie moyenne était de {energy}/5.",
            "up": (
                f"Votre humeur moyenne a augmenté de {change} point(s) "
                "par rapport à la période précédente."
            ),
            "down": (
                f"Votre humeur moyenne a diminué de {change_magnitude} point(s) "
                "par rapport à la période précédente."
            ),
            "stable": (
                "Votre humeur moyenne est restée stable par rapport "
                "à la période précédente."
            ),
            "streak": (
                f"Vous avez effectué un suivi pendant "
                f"{streak} jour(s) consécutif(s)."
            ),
            "note": (
                "Ces chiffres décrivent vos suivis et ne constituent pas "
                "un diagnostic médical. Continuez à noter votre ressenti "
                "pour mieux comprendre vos habitudes."
            ),
        },
        "ar": {
            "empty": (
                "لم يتم تسجيل أي متابعة خلال هذه الفترة. "
                "حاول تسجيل مزاجك وطاقتك بانتظام."
            ),
            "count": f"سجلت {count} متابعة خلال هذه الفترة.",
            "mood": f"كان متوسط مزاجك {mood}/5.",
            "energy": f"كان متوسط طاقتك {energy}/5.",
            "up": (
                f"ارتفع متوسط مزاجك بمقدار {change} مقارنة بالفترة السابقة."
            ),
            "down": (
                f"انخفض متوسط مزاجك بمقدار {change_magnitude} "
                "مقارنة بالفترة السابقة."
            ),
            "stable": "ظل متوسط مزاجك مستقراً مقارنة بالفترة السابقة.",
            "streak": f"سجلت متابعة لمدة {streak} يومًا متتاليًا.",
            "note": (
                "تعكس هذه الأرقام متابعاتك وليست تشخيصًا طبيًا. "
                "واصل تسجيل شعورك لفهم أنماطك بشكل أفضل."
            ),
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

    # Join complete sentences and normalize repeated whitespace.
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def _is_complete_summary(summary):
    """Reject empty or obviously truncated model responses."""
    if not isinstance(summary, str):
        return False

    summary = summary.strip()

    if len(summary.split()) < MIN_SUMMARY_WORDS:
        return False

    if summary.endswith(("...", "…")):
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

    Only explicitly allowlisted numerical statistics are sent to Gemini.
    Journal entries and free-text user content are never sent.
    A local summary is returned if Gemini is unavailable.
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

    # Privacy allowlist: never send journal text or free-text fields.
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
        f"Write a concise, supportive wellbeing summary in {target_language}. "
        f"Use only these numerical statistics: {safe_stats}. "
        "Write 2 to 4 complete sentences. Describe trends cautiously. "
        "Do not diagnose, infer causes, prescribe treatment, invent facts, "
        "or shame the user. State that these figures are not a medical "
        "diagnosis. Return only the summary, without a heading."
    )

    try:
        client = Client(api_key=api_key)

        for attempt in range(MAX_ATTEMPTS):
            try:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config={
                        "temperature": 0.3,
                        "max_output_tokens": 220,
                    },
                )

                summary = (
                    getattr(response, "text", None) or ""
                ).strip()

                if _is_complete_summary(summary):
                    return re.sub(r"\s+", " ", summary).strip()

                logger.warning(
                    "Gemini returned an empty or incomplete summary; "
                    "using local fallback."
                )
                return fallback

            except Exception as exc:
                status = _get_status_code(exc)

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
