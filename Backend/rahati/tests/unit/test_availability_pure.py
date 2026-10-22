from datetime import date, datetime, time, timedelta, timezone
from types import SimpleNamespace

from django.test import SimpleTestCase

from rahati.availability import expand_rule, local_dates_between, local_to_utc, overlaps


class AvailabilityPureTests(SimpleTestCase):
    def test_naive_algiers_datetime_converts_to_utc(self):
        self.assertEqual(
            local_to_utc(datetime(2026, 1, 5, 9, 30)),
            datetime(2026, 1, 5, 8, 30, tzinfo=timezone.utc),
        )

    def test_aware_datetime_is_normalized_to_utc(self):
        value = datetime(2026, 1, 5, 9, 30, tzinfo=timezone(timedelta(hours=1)))
        self.assertEqual(local_to_utc(value), datetime(2026, 1, 5, 8, 30, tzinfo=timezone.utc))

    def test_expand_rule_inclusive_weekday_range(self):
        rule = SimpleNamespace(weekday=0, starts_at=time(9), ends_at=time(10), is_active=True)
        self.assertEqual(
            expand_rule(rule, date(2026, 1, 5), date(2026, 1, 12)),
            [
                (datetime(2026, 1, 5, 8, tzinfo=timezone.utc), datetime(2026, 1, 5, 9, tzinfo=timezone.utc)),
                (datetime(2026, 1, 12, 8, tzinfo=timezone.utc), datetime(2026, 1, 12, 9, tzinfo=timezone.utc)),
            ],
        )

    def test_expand_overnight_window_finishes_next_day(self):
        rule = SimpleNamespace(weekday=4, starts_at=time(23), ends_at=time(1), is_active=True)
        self.assertEqual(
            expand_rule(rule, date(2026, 1, 9)),
            [(datetime(2026, 1, 9, 22, tzinfo=timezone.utc), datetime(2026, 1, 10, 0, tzinfo=timezone.utc))],
        )

    def test_overlaps_uses_half_open_intervals(self):
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        end = start + timedelta(hours=1)
        self.assertTrue(overlaps(start, end, end - timedelta(minutes=1), end + timedelta(minutes=1)))
        self.assertFalse(overlaps(start, end, end, end + timedelta(hours=1)))

    def test_local_dates_are_inclusive_and_use_algiers_dates(self):
        start = datetime(2026, 1, 1, 23, 30, tzinfo=timezone.utc)
        end = datetime(2026, 1, 2, 0, 30, tzinfo=timezone.utc)
        self.assertEqual(local_dates_between(start, end), [date(2026, 1, 2)])
        self.assertEqual(local_dates_between(date(2026, 1, 1), date(2026, 1, 3)), [
            date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 3)
        ])
