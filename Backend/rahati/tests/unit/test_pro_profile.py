from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from rahati.models import AuditLog, ProfessionalProfile, User


@override_settings(FIELD_ENCRYPTION_KEY=Fernet.generate_key())
class ProfessionalProfileEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pro_one", password="Pass!2026", role="professional")
        self.profile = ProfessionalProfile.objects.create(
            user=self.user,
            display_name="Dr One",
            bio="Original",
            city="Algiers",
            credential_file="credentials/one.pdf",
            status=ProfessionalProfile.Status.VERIFIED,
        )
        self.other = User.objects.create_user(username="pro_two", password="Pass!2026", role="professional")
        ProfessionalProfile.objects.create(
            user=self.other, display_name="Dr Two", city="Oran", credential_file="credentials/two.pdf"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = "/api/pro/profile"

    def test_get_returns_only_authenticated_professionals_profile(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "Dr One")
        self.assertEqual(response.data["status"], "verified")

    def test_patch_updates_profile_and_audits_field_names_only(self):
        response = self.client.patch(self.url, {"bio": "Updated", "city": "Oran"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.bio, "Updated")
        audit = AuditLog.objects.get(action="pro_profile_update")
        self.assertEqual(audit.actor_id, self.user.id)
        self.assertNotIn("Updated", audit.action)
        self.assertEqual(set(response.data), {
            "display_name", "bio", "city", "address", "wilaya", "credential_kind",
            "status", "credential_uploaded_at"
        })

    def test_wilaya_can_be_updated_and_is_returned(self):
        response = self.client.patch(self.url, {"wilaya": "16"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.wilaya, "16")
        self.assertEqual(response.data["wilaya"], "16")

    def test_invalid_wilaya_is_rejected(self):
        response = self.client.patch(self.url, {"wilaya": "99"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_changing_verified_display_name_returns_to_pending(self):
        reviewer = User.objects.create_user(username="reviewer", password="Pass!2026")
        self.profile.verified_by = reviewer
        self.profile.save(update_fields=["verified_by"])
        response = self.client.patch(self.url, {"display_name": "Dr New Name"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, ProfessionalProfile.Status.PENDING)
        self.assertIsNone(self.profile.verified_by)
        self.assertIsNone(self.profile.verified_at)

    def test_unchanged_display_name_does_not_drop_verification(self):
        response = self.client.patch(self.url, {"display_name": "Dr One"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, ProfessionalProfile.Status.VERIFIED)

    def test_unknown_or_protected_fields_are_rejected(self):
        response = self.client.patch(self.url, {"status": "verified"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, "verified")

    def test_non_json_patch_is_rejected(self):
        response = self.client.patch(self.url, {"bio": "x"}, format="multipart")
        self.assertEqual(response.status_code, 415)

    def test_user_role_cannot_access_profile(self):
        patient = User.objects.create_user(username="patient", password="Pass!2026", role="user")
        self.client.force_authenticate(patient)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_professional_cannot_target_another_profile_id(self):
        self.client.force_authenticate(self.other)
        response = self.client.patch(self.url, {"bio": "Changed"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.bio, "Original")
