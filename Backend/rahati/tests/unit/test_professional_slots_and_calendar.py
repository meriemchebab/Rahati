from datetime import datetime, timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AvailabilitySlot, ProfessionalProfile, Session, User


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class ProfessionalSlotsAndCalendarTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(username="calendar_patient", password="password123", role="user")
        self.client.force_authenticate(self.patient)
        self.now = timezone.now()
        self.local_today = timezone.localdate(self.now)

    def make_professional(self, name, *, verified=True, active=True, role="professional"):
        user = User.objects.create_user(username=name, password="password123", role=role, is_active=active)
        if role == "professional":
            profile = ProfessionalProfile.objects.create(
                user=user, display_name=name, city="Alger", wilaya="16",
                credential_file="credentials/private.pdf",
                status=ProfessionalProfile.Status.VERIFIED if verified else ProfessionalProfile.Status.PENDING,
            )
            return user, profile
        return user, None

    def slot(self, professional, day, hour=12, mode="in_person"):
        local_dt = timezone.make_aware(datetime.combine(day, datetime.min.time()).replace(hour=hour))
        return AvailabilitySlot.objects.create(
            professional=professional, starts_at=local_dt,
            ends_at=local_dt + timedelta(hours=1), mode=mode,
        )

    def test_slots_are_ordered_paginated_and_mode_filter_is_applied(self):
        pro, _ = self.make_professional("slots_pro")
        later = self.slot(pro, self.local_today + timedelta(days=4), hour=10)
        first = self.slot(pro, self.local_today + timedelta(days=2), hour=11)
        online = self.slot(pro, self.local_today + timedelta(days=3), hour=12, mode="online")
        base = f"/api/professionals/{pro.pk}/slots"
        response = self.client.get(base, {"limit": 2, "offset": 0}, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [first.pk, online.pk])
        page = self.client.get(base, {"limit": 2, "offset": 1}, follow=True)
        self.assertEqual([row["id"] for row in page.data], [online.pk, later.pk])
        in_person = self.client.get(base, {"mode": "in_person"}, follow=True)
        self.assertEqual([row["id"] for row in in_person.data], [first.pk, later.pk])

    def test_slots_reject_unknown_repeated_and_capped_query_values(self):
        pro, _ = self.make_professional("strict_pro")
        base = f"/api/professionals/{pro.pk}/slots"
        for query in ("?city=Alger", "?limit=1&limit=2", "?limit=101", "?mode=unknown"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(base + query, follow=True).status_code, 400)

    def test_missing_unverified_and_inactive_profiles_have_identical_404s(self):
        unverified, _ = self.make_professional("unverified", verified=False)
        inactive, _ = self.make_professional("inactive", active=False)
        missing_id = User.objects.order_by("-pk").first().pk + 100
        responses = [
            self.client.get(f"/api/professionals/{missing_id}/slots", follow=True),
            self.client.get(f"/api/professionals/{unverified.pk}/slots", follow=True),
            self.client.get(f"/api/professionals/{inactive.pk}/slots", follow=True),
            self.client.get(f"/api/professionals/{missing_id}/calendar?month={self.local_today:%Y-%m}", follow=True),
            self.client.get(f"/api/professionals/{unverified.pk}/calendar?month={self.local_today:%Y-%m}", follow=True),
            self.client.get(f"/api/professionals/{inactive.pk}/calendar?month={self.local_today:%Y-%m}", follow=True),
        ]
        self.assertEqual({response.status_code for response in responses}, {404})
        self.assertEqual([response.data for response in responses], [{"detail": "Not found."}] * len(responses))

    def test_calendar_groups_slots_by_local_algiers_day_and_reports_modes_counts(self):
        pro, _ = self.make_professional("calendar_pro")
        start_day = self.local_today
        if timezone.localtime(self.now).hour >= 22:
            start_day += timedelta(days=1)
        # 23:30 UTC falls on the next Algiers date; the calendar must group it there.
        late_utc = timezone.make_aware(datetime.combine(start_day, datetime.min.time()).replace(hour=23, minute=30), timezone.get_fixed_timezone(0))
        AvailabilitySlot.objects.create(professional=pro, starts_at=late_utc, ends_at=late_utc + timedelta(minutes=30), mode="online")
        self.slot(pro, start_day + timedelta(days=1), hour=9, mode="in_person")
        self.slot(pro, start_day + timedelta(days=1), hour=15, mode="online")
        self.slot(pro, start_day + timedelta(days=2), hour=8, mode="online")
        response = self.client.get(f"/api/professionals/{pro.pk}/calendar", {"month": start_day.strftime("%Y-%m")}, follow=True)
        self.assertEqual(response.status_code, 200)
        expected_date = (start_day + timedelta(days=1)).isoformat()
        target = next(item for item in response.data if item["date"] == expected_date)
        self.assertEqual(target["free_slots"], 3)
        self.assertEqual(target["modes"], ["in_person", "online"])

    def test_calendar_applies_lead_time_this_month_and_optional_mode(self):
        pro, _ = self.make_professional("lead_calendar")
        today_local = timezone.localtime(self.now)
        soon = self.now + timedelta(minutes=30)
        eligible = self.now + timedelta(minutes=90)
        for starts_at, mode in ((soon, "online"), (eligible, "in_person")):
            AvailabilitySlot.objects.create(professional=pro, starts_at=starts_at, ends_at=starts_at + timedelta(minutes=30), mode=mode)
        month = today_local.strftime("%Y-%m")
        all_modes = self.client.get(f"/api/professionals/{pro.pk}/calendar", {"month": month}, follow=True)
        self.assertEqual(sum(row["free_slots"] for row in all_modes.data), 1)
        filtered = self.client.get(f"/api/professionals/{pro.pk}/calendar", {"month": month, "mode": "online"}, follow=True)
        self.assertEqual(filtered.data, [])

    def test_calendar_rejects_invalid_month_shapes_range_and_extra_parameters(self):
        pro, _ = self.make_professional("month_validation")
        base = f"/api/professionals/{pro.pk}/calendar"
        for month in ("2026-1", "2026-13", "26-10", "2026-00", "not-a-month"):
            with self.subTest(month=month):
                self.assertEqual(self.client.get(base, {"month": month}, follow=True).status_code, 400)
        previous = self.local_today.replace(day=1) - timedelta(days=1)
        self.assertEqual(self.client.get(base, {"month": previous.strftime("%Y-%m")}, follow=True).status_code, 400)
        future_limit = self.local_today.replace(day=1)
        for _ in range(7):
            future_limit = (future_limit.replace(day=28) + timedelta(days=4)).replace(day=1)
        self.assertEqual(self.client.get(base, {"month": future_limit.strftime("%Y-%m")}, follow=True).status_code, 400)
        self.assertEqual(self.client.get(base, {"month": self.local_today.strftime("%Y-%m"), "extra": "1"}, follow=True).status_code, 400)

    def test_calendar_query_count_does_not_grow_with_number_of_days(self):
        pro, _ = self.make_professional("query_constant")
        month = self.local_today.strftime("%Y-%m")
        for offset in range(1, 20):
            self.slot(pro, self.local_today + timedelta(days=offset), hour=14)
        with self.assertNumQueries(3):
            response = self.client.get(f"/api/professionals/{pro.pk}/calendar", {"month": month}, follow=True)
        self.assertEqual(response.status_code, 200)
