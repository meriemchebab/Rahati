"""Shared operational limits and configured media directories."""

from django.conf import settings

MIN_BOOKING_LEAD_MINUTES = 60

# Availability generation and calendar bounds.
MAX_RULES_PER_PROFESSIONAL = 30
MAX_TIME_OFF_ENTRIES = 20
GENERATION_HORIZON_DAYS = 28
CALENDAR_MAX_WINDOW_DAYS = 62

# Slot starts and ends are aligned to quarter hours.
SLOT_MINUTE_BOUNDARIES = (0, 15, 30, 45)

MEDIA_DIR = settings.MEDIA_ROOT
PRIVATE_MEDIA_DIR = settings.PRIVATE_MEDIA_ROOT
STATIC_DIR = settings.STATIC_ROOT

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

MAX_TOPICS_PER_CHECKIN = 3
