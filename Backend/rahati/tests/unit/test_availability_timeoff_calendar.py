from datetime import datetime, time, timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.availability_services import generate_slots
from rahati.models import AvailabilitySlot, ProfessionalProfile, Session, TimeOff, User, WeeklyAvailability


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
)
class AvailabilityCalendarAndTimeOffTests(TestCase):
    def setUp(self):
        self.pro = User.objects.create_user(username="calendar_pro", password="password123", role="professional")
        ProfessionalProfile.objects.create(
            user=self.pro, display_name="Calendar Pro", city="Algiers",
            credential_file="credentials/private.pdf", status="verified",
        )
        self.patient = User.objects.create_user(username="calendar_user", password="password123", role="user")
        self.client = APIClient()
        self.client.force_authenticate(self.pro)

    def date_for_weekday(self, weekday, add_week=False):
        today = timezone.localdate()
        days = (weekday - today.weekday()) % 7
        if add_week or days == 0:
            days += 7
        return today + timedelta(days=days)

    def test_time_off_retires_generated_slots_and_blocks_regeneration(self):
        target = self.date_for_weekday((timezone.localdate().weekday() + 1) % 7)
        rule = WeeklyAvailability.objects.create(
            professional=self.pro, weekday=target.weekday(), starts_at=time(9),
            ends_at=time(10), mode="online",
        )
        target_slots = AvailabilitySlot.objects.filter(professional=self.pro, rule=rule, starts_at__date=target)
        self.assertEqual(target_slots.count(), 2)
        response = self.client.post("/api/pro/time-off", {"from": target.isoformat(), "to": target.isoformat()}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(TimeOff.objects.filter(professional=self.pro).count(), 1)
        self.assertEqual(target_slots.filter(closed_at__isnull=False).count(), 2)
        generate_slots(self.pro)
        self.assertEqual(target_slots.filter(closed_at__isnull=True).count(), 0)

    def test_calendar_reports_session_and_availability_states(self):
        target = timezone.localdate()
        starts = timezone.localtime(timezone.now() + timedelta(hours=2)).replace(minute=0, second=0, microsecond=0)
        slots = {}
        for state, offset in (("requested", 0), ("accepted", 1), ("completed", 2), ("free", 3), ("expired", 4)):
            start = starts + timedelta(hours=offset)
            if state == "expired":
                start = timezone.now() - timedelta(days=1)
            slot = AvailabilitySlot.objects.create(
                professional=self.pro, starts_at=start, ends_at=start + timedelta(minutes=30), mode="online"
            )
            slots[state] = slot
            if state in ("requested", "accepted", "completed"):
                Session.objects.create(user=self.patient, slot=slot, status=state)
        response = self.client.get("/api/pro/calendar", {
            "from": (target - timedelta(days=1)).isoformat(),
            "to": (target + timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual({row["id"]: row["state"] for row in response.data}, {slot.pk: state for state, slot in slots.items()})

    def test_manual_slot_patch_detaches_and_delete_retires(self):
        start = timezone.now() + timedelta(days=3)
        slot = AvailabilitySlot.objects.create(
            professional=self.pro, starts_at=start, ends_at=start + timedelta(minutes=30),
            mode="online", source="template",
        )
        response = self.client.patch("/api/pro/slots", {
            "id": slot.pk, "starts_at": (start + timedelta(hours=1)).isoformat(),
            "ends_at": (start + timedelta(hours=1, minutes=30)).isoformat(),
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        slot.refresh_from_db()
        self.assertEqual(slot.source, "manual")
        self.assertIsNone(slot.rule_id)
        self.assertEqual(self.client.delete("/api/pro/slots", {"id": slot.pk}, format="json").status_code, 204)
        slot.refresh_from_db()
        self.assertIsNotNone(slot.closed_at)
