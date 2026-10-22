"""Shared operational limits and configured media directories."""

from django.conf import settings

MIN_BOOKING_LEAD_MINUTES = 60

MEDIA_DIR = settings.MEDIA_ROOT
PRIVATE_MEDIA_DIR = settings.PRIVATE_MEDIA_ROOT
STATIC_DIR = settings.STATIC_ROOT

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
