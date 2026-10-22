from datetime import datetime, timedelta
from unittest.mock import patch

from cryptography.fernet import Fernet
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AuditLog, AvailabilitySlot, ProfessionalProfile, Session, User


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
    APPEND_SLASH=False,
)
class DirectoryConsistencyPrivacyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.patient = User.objects.create_user(username="directory_e2e_user", password="password123", role="user")
        self.client.force_authenticate(self.patient)
        self.pro = User.objects.create_user(username="directory_e2e_pro", password="password123", role="professional")
        ProfessionalProfile.objects.create(
            user=self.pro, display_name="Directory Pro", bio="Public bio", city="Alger", wilaya="16",
            address="Private address", credential_file="credentials/private.pdf",
            status=ProfessionalProfile.Status.VERIFIED,
        )
        self.slot = self.make_slot()

    def make_slot(self):
        start = timezone.now() + timedelta(days=3)
        return AvailabilitySlot.objects.create(professional=self.pro, starts_at=start, ends_at=start + timedelta(hours=1), mode="in_person")

    def test_booking_hides_slot_everywhere_decline_restores_it_and_suspension_removes_professional(self):
        search_url = "/api/professionals"
        slots_url = f"/api/professionals/{self.pro.pk}/slots"
        calendar_url = f"/api/professionals/{self.pro.pk}/calendar"
        month = timezone.localtime(self.slot.starts_at).strftime("%Y-%m")
        self.assertEqual(len(self.client.get(search_url).data), 1)
        self.assertEqual(len(self.client.get(slots_url).data), 1)
        self.assertTrue(self.client.get(calendar_url, {"month": month}).data)

        booked = self.client.post("/api/sessions", {"slot": self.slot.pk}, format="json")
        self.assertEqual(booked.status_code, 201)
        self.assertEqual(self.client.get(search_url).data, [])
        self.assertEqual(self.client.get(slots_url).data, [])
        self.assertEqual(self.client.get(calendar_url, {"month": month}).data, [])

        self.client.force_authenticate(self.pro)
        declined = self.client.patch(f"/api/sessions/{booked.data['id']}", {"status": "declined"}, format="json")
        self.assertEqual(declined.status_code, 200)
        self.client.force_authenticate(self.patient)
        self.assertEqual(len(self.client.get(search_url).data), 1)
        self.assertEqual(len(self.client.get(slots_url).data), 1)

        self.pro.is_active = False
        self.pro.save(update_fields=["is_active"])
        self.assertEqual(self.client.get(search_url).data, [])
        self.assertEqual(self.client.get(slots_url).status_code, 404)
        self.assertEqual(self.client.get(calendar_url, {"month": month}).status_code, 404)

    def test_search_reads_do_not_write_database_or_audit_and_responses_are_private(self):
        before_audit = AuditLog.objects.count()
        with self.assertNumQueries(2):
            response = self.client.get("/api/professionals", {"mode": "in_person"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(AuditLog.objects.count(), before_audit)
        self.assertEqual(Session.objects.count(), 0)
        self.assertEqual(AvailabilitySlot.objects.count(), 1)
        for url in ("/api/wilayas", f"/api/professionals/{self.pro.pk}/slots"):
            result = self.client.get(url)
            self.assertEqual(result["Cache-Control"], "private, no-store")

    def test_calendar_invalid_query_is_clean_400_and_no_query_string_is_logged(self):
        with self.assertLogs("django.request", level="WARNING") as captured:
            response = self.client.get("/api/professionals?secret-search-term=hidden")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertNotIn("secret-search-term", " ".join(captured.output))
        self.assertNotIn("hidden", " ".join(captured.output))

    def test_search_and_calendar_have_independent_user_scoped_throttles(self):
        statuses = [self.client.get("/api/professionals").status_code for _ in range(121)]
        self.assertEqual(statuses[:120], [200] * 120)
        third = self.client.get("/api/professionals")
        self.assertEqual(third.status_code, 429)
        self.assertEqual(third["Cache-Control"], "private, no-store")
        self.assertEqual(third.data, {"detail": "Request was throttled."})
        another_user = User.objects.create_user(username="directory_second_user", password="password123", role="user")
        other_client = APIClient()
        other_client.force_authenticate(another_user)
        self.assertEqual(other_client.get("/api/professionals").status_code, 200)

        cache.clear()
        month = timezone.localdate().strftime("%Y-%m")
        url = f"/api/professionals/{self.pro.pk}/calendar?month={month}"
        statuses = [self.client.get(url).status_code for _ in range(241)]
        self.assertEqual(statuses[:240], [200] * 240)
        self.assertEqual(statuses[240], 429)

    def test_unexpected_directory_errors_are_generic_and_private(self):
        with patch("rahati.views.free_slots", side_effect=RuntimeError("sensitive internal detail")):
            response = self.client.get("/api/professionals")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data, {"detail": "Server error."})
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertNotIn("sensitive internal detail", str(response.data))
