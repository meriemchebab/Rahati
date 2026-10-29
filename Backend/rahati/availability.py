"""Pure helpers for recurring availability in Africa/Algiers local time."""

from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from .limits import CALENDAR_MAX_WINDOW_DAYS

LOCAL_TIME_ZONE = ZoneInfo("Africa/Algiers")


def local_to_utc(value):
    """Convert a naive Algiers wall time (or aware datetime) to aware UTC."""
    if not isinstance(value, datetime):
        raise TypeError("value must be a datetime")
    if value.tzinfo is None:
        value = value.replace(tzinfo=LOCAL_TIME_ZONE)
    else:
        value = value.astimezone(LOCAL_TIME_ZONE)
    return value.astimezone(dt_timezone.utc)


def expand_rule(rule, start_date, end_date=None):
    """Return UTC (start, end) intervals for a weekly rule across local dates.

    ``rule`` supplies ``weekday``, ``starts_at`` and ``ends_at`` (a model or
    compatible object). The date range is inclusive; overnight rules end the
    following local day. If end_date is omitted, only start_date is expanded.
    """
    end_date = end_date or start_date
    if end_date < start_date:
        return []
    if (end_date - start_date).days > CALENDAR_MAX_WINDOW_DAYS:
        raise ValueError("date range exceeds the calendar window")
    intervals = []
    current = start_date
    while current <= end_date:
        if current.weekday() == rule.weekday and getattr(rule, "is_active", True):
            start = datetime.combine(current, rule.starts_at)
            end_day = current + timedelta(days=1) if rule.ends_at <= rule.starts_at else current
            end = datetime.combine(end_day, rule.ends_at)
            intervals.append((local_to_utc(start), local_to_utc(end)))
        current += timedelta(days=1)
    return intervals


def overlaps(start_a, end_a, start_b, end_b):
    """Whether two half-open datetime intervals intersect."""
    return start_a < end_b and start_b < end_a


def local_dates_between(start, end):
    """Yield inclusive Algiers calendar dates touched by a datetime range."""
    if isinstance(start, datetime):
        start = start.astimezone(LOCAL_TIME_ZONE).date() if start.tzinfo else start.date()
    if isinstance(end, datetime):
        end = end.astimezone(LOCAL_TIME_ZONE).date() if end.tzinfo else end.date()
    if not isinstance(start, date) or not isinstance(end, date):
        raise TypeError("start and end must be dates or datetimes")
    if end < start:
        return []
    if (end - start).days > CALENDAR_MAX_WINDOW_DAYS:
        raise ValueError("date range exceeds the calendar window")
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]
