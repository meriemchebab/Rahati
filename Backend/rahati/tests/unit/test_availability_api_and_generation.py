from datetime import time, timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.availability_services import generate_slots
from rahati.models import AvailabilitySlot, ProfessionalProfile, User, WeeklyAvailability


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
)
class AvailabilityGenerationTests(TestCase):
    def setUp(self):
        self.pro = User.objects.create_user(
            username="availability_pro", password="password123", role="professional"
        )
        ProfessionalProfile.objects.create(
            user=self.pro, display_name="Availability Pro", city="Algiers",
            credential_file="credentials/private.pdf", status="verified",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.pro)

    def next_date(self, weekday):
        today = timezone.localdate()
        return today + timedelta(days=(weekday - today.weekday()) % 7 or 7)

    def test_post_rule_synchronously_generates_two_hour_window(self):
        day = self.next_date((timezone.localdate().weekday() + 1) % 7)
        response = self.client.post("/api/pro/availability", {
            "weekday": day.weekday(), "starts_at": "09:00", "ends_at": "11:00",
            "mode": "online",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        slots = AvailabilitySlot.objects.filter(professional=self.pro)
        self.assertEqual(slots.count(), 16)
        self.assertEqual(slots.filter(source="template").count(), 16)

    def test_generation_is_idempotent_and_skips_existing_overlap(self):
        day = self.next_date((timezone.localdate().weekday() + 1) % 7)
        rule = WeeklyAvailability.objects.create(
            professional=self.pro, weekday=day.weekday(), starts_at=time(9),
            ends_at=time(11), mode="online",
        )
        count = AvailabilitySlot.objects.filter(professional=self.pro).count()
        self.assertEqual(count, 16)
        self.assertEqual(generate_slots(self.pro), 0)
        self.assertEqual(AvailabilitySlot.objects.filter(professional=self.pro).count(), count)

    def test_get_patch_delete_are_scoped_and_delete_closes_future_slots(self):
        day = self.next_date((timezone.localdate().weekday() + 1) % 7)
        rule = WeeklyAvailability.objects.create(
            professional=self.pro, weekday=day.weekday(), starts_at=time(9),
            ends_at=time(10), mode="online",
        )
        self.assertEqual(self.client.get("/api/pro/availability").status_code, 200)
        patched = self.client.patch("/api/pro/availability", {"id": rule.pk, "is_active": False}, format="json")
        self.assertEqual(patched.status_code, 200, patched.data)
        response = self.client.delete("/api/pro/availability", {"id": rule.pk}, format="json")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(AvailabilitySlot.objects.filter(professional=self.pro, closed_at__isnull=False).count(), 8)

    def test_patch_rule_with_only_active_flag_does_not_depend_on_current_weekday(self):
        rule = WeeklyAvailability.objects.create(
            professional=self.pro, weekday=6, starts_at=time(9),
            ends_at=time(10), mode="online",
        )
        response = self.client.patch(
            "/api/pro/availability", {"id": rule.pk, "is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        rule.refresh_from_db()
        self.assertFalse(rule.is_active)
