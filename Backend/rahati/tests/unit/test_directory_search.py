from datetime import datetime, timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AvailabilitySlot, ProfessionalProfile, User
from rahati.wilayas import WILAYAS


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class DirectorySearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="directory_user", password="password123", role="user", language="fr")
        self.client.force_authenticate(self.user)
        self.today = timezone.localdate()

    def professional(self, name, wilaya, *, email=None, phone=None, address="Secret address"):
        user = User.objects.create_user(username=name.lower().replace(" ", "_"), password="password123", role="professional", email=email, phone=phone)
        profile = ProfessionalProfile.objects.create(
            user=user, display_name=name, bio="Public bio", city="Alger", wilaya=wilaya,
            address=address, credential_file="credentials/private.pdf",
            status=ProfessionalProfile.Status.VERIFIED,
        )
        return user, profile

    def slot(self, professional, days=2, hour=10, mode="in_person"):
        local = timezone.make_aware(datetime.combine(self.today + timedelta(days=days), datetime.min.time()).replace(hour=hour))
        return AvailabilitySlot.objects.create(professional=professional, starts_at=local, ends_at=local + timedelta(hours=1), mode=mode)

    def test_wilayas_returns_all_code_name_pairs(self):
        response = self.client.get("/api/wilayas", follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [{"code": code, "name": name} for code, name in WILAYAS])

    def test_in_person_requires_matching_wilaya_and_returns_only_public_allow_list(self):
        matching, _ = self.professional("Matching", "16", email="private@example.test", phone="1234567890")
        other, _ = self.professional("Other", "31")
        online_only, _ = self.professional("Online", "")
        self.slot(matching)
        self.slot(other)
        self.slot(online_only, mode="online")
        response = self.client.get("/api/professionals", {"wilaya": "16"}, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [matching.pk])
        row = response.data[0]
        self.assertEqual(set(row), {"id", "name", "bio", "city", "wilaya", "wilaya_name", "modes", "next_slot", "free_slots_in_window"})
        self.assertEqual(row["wilaya_name"], "Alger")
        self.assertNotIn("email", row)
        self.assertNotIn("phone", row)
        self.assertNotIn("address", row)

    def test_online_wilaya_does_not_restrict_professional_location(self):
        local, _ = self.professional("Local", "16")
        unspecified, _ = self.professional("Unspecified", "")
        other, _ = self.professional("Other Online", "31")
        for professional in (local, unspecified, other):
            self.slot(professional, mode="online")
        response = self.client.get("/api/professionals", {"mode": "online", "wilaya": "16"}, follow=True)
        self.assertEqual({row["id"] for row in response.data}, {local.pk, unspecified.pk, other.pk})

    def test_baseline_and_pagination_caps(self):
        pro, _ = self.professional("Baseline", "16")
        self.slot(pro)
        baseline = self.client.get("/api/professionals", follow=True)
        self.assertEqual(baseline.status_code, 200)
        self.assertEqual(baseline.data[0]["free_slots_in_window"], 1)
        for query in ({"limit": "51"}, {"offset": "-1"}, {"offset": "10001"}):
            self.assertEqual(self.client.get("/api/professionals", query, follow=True).status_code, 400)

    def test_strict_query_rejects_unknown_repeated_nul_and_bidi(self):
        for query in ("?city=Alger", "?limit=1&limit=2", "?wilaya=%00", "?mode=%E2%80%AEonline"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get("/api/professionals" + query, follow=True).status_code, 400)

    def test_date_window_and_time_of_day_boundaries_use_algiers_local_dates(self):
        pro, _ = self.professional("Timed", "16")
        self.slot(pro, days=1, hour=11)
        self.slot(pro, days=1, hour=12)
        self.slot(pro, days=1, hour=17)
        date = (self.today + timedelta(days=1)).isoformat()
        morning = self.client.get("/api/professionals", {"from": date, "to": date, "time_of_day": "morning"}, follow=True)
        self.assertEqual(morning.status_code, 200)
        self.assertEqual(morning.data[0]["free_slots_in_window"], 1)
        afternoon = self.client.get("/api/professionals", {"from": date, "to": date, "time_of_day": "afternoon"}, follow=True)
        self.assertEqual(afternoon.data[0]["free_slots_in_window"], 1)
        self.assertEqual(self.client.get("/api/professionals", {"from": date, "to": (self.today + timedelta(days=62)).isoformat()}, follow=True).status_code, 400)
        self.assertEqual(self.client.get("/api/professionals", {"to": (self.today + timedelta(days=181)).isoformat()}, follow=True).status_code, 400)
        self.assertEqual(self.client.get("/api/professionals", {"from": (self.today + timedelta(days=181)).isoformat()}, follow=True).status_code, 400)
        valid_window = self.client.get("/api/professionals", {"from": date, "to": (self.today + timedelta(days=61)).isoformat()}, follow=True)
        self.assertEqual(valid_window.status_code, 200)

    def test_role_access_is_user_only(self):
        pro, _ = self.professional("Caller", "16")
        self.client.force_authenticate(pro)
        self.assertEqual(self.client.get("/api/professionals", follow=True).status_code, 403)
        self.assertEqual(self.client.get("/api/wilayas", follow=True).status_code, 403)
