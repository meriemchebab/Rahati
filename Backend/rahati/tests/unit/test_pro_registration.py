import io
import tempfile

from django.contrib.auth.password_validation import validate_password
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from rahati.models import AuditLog, ProfessionalProfile, User
from rahati.professionals import transition_professional_status
from django.core.exceptions import ValidationError


def png_upload():
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2), "white").save(buffer, format="PNG")
    return SimpleUploadedFile("credential.png", buffer.getvalue(), content_type="image/png")


def form_data(**overrides):
    data = {
        "nickname": "dr_nour",
        "password": "SafePass!2026",
        "language": "fr",
        "email": "nour@example.test",
        "display_name": "Dr Nour",
        "bio": "Psychologue",
        "city": "Algiers",
        "address": "Centre",
        "credential_kind": "diploma",
        "credential_file": png_upload(),
        "terms_accepted": "true",
    }
    data.update(overrides)
    return data


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    PRIVATE_MEDIA_ROOT=tempfile.gettempdir(),
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
        "DEFAULT_THROTTLE_RATES": {"pro_register": "100/hour"},
    },
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class ProfessionalRegistrationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url = "/api/auth/register-professional"

    def test_registers_professional_with_pending_profile_hashed_password_and_audit(self):
        response = self.client.post(self.url, form_data(), format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(username="dr_nour")
        profile = user.professional_profile
        self.assertEqual(user.role, User.Role.PROFESSIONAL)
        self.assertTrue(user.check_password("SafePass!2026"))
        self.assertNotEqual(user.password, "SafePass!2026")
        self.assertEqual(profile.status, ProfessionalProfile.Status.PENDING)
        self.assertEqual(profile.display_name, "Dr Nour")
        self.assertIsNotNone(profile.credential_uploaded_at)
        self.assertIsNotNone(profile.terms_accepted_at)
        audit = AuditLog.objects.get(action="pro_register")
        self.assertEqual(audit.actor_id, user.id)
        self.assertEqual(audit.target_id, profile.user_id)

    def test_invalid_credential_is_rejected_without_creating_rows(self):
        response = self.client.post(
            self.url,
            form_data(credential_file=SimpleUploadedFile("bad.pdf", b"not pdf")),
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())
        self.assertFalse(ProfessionalProfile.objects.exists())
        self.assertFalse(AuditLog.objects.filter(action="pro_register").exists())

    def test_terms_must_be_accepted(self):
        response = self.client.post(self.url, form_data(terms_accepted="false"), format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_text_rules_reject_unsafe_display_name(self):
        response = self.client.post(
            self.url, form_data(display_name="<script>Dr</script>"), format="multipart"
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_password_validators_are_applied(self):
        response = self.client.post(self.url, form_data(password="password"), format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_duplicate_email_uses_generic_contact_message(self):
        User.objects.create_user(username="existing", email="nour@example.test", password="X")
        response = self.client.post(self.url, form_data(), format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("unavailable", str(response.data).lower())
        self.assertNotIn("already registered", str(response.data).lower())

    def test_unknown_fields_are_rejected(self):
        response = self.client.post(self.url, form_data(role="admin"), format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("role", response.data)
        self.assertFalse(User.objects.exists())

    def test_duplicate_nickname_is_rejected(self):
        User.objects.create_user(username="dr_nour", email="other@example.test", password="X")
        response = self.client.post(self.url, form_data(email="new@example.test"), format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ProfessionalProfile.objects.exists())


class ProfessionalStatusTransitionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dr_status", password="Pass!2026")
        self.profile = ProfessionalProfile.objects.create(
            user=self.user,
            display_name="Dr Status",
            city="Algiers",
            credential_file="credentials/test.pdf",
        )

    def test_pending_can_be_verified(self):
        reviewer = User.objects.create_user(username="reviewer", password="Pass!2026")
        transition_professional_status(self.profile, ProfessionalProfile.Status.VERIFIED, actor=reviewer)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, ProfessionalProfile.Status.VERIFIED)
        self.assertEqual(self.profile.verified_by, reviewer)
        self.assertIsNotNone(self.profile.verified_at)

    def test_pending_can_be_rejected_with_reason(self):
        transition_professional_status(
            self.profile, ProfessionalProfile.Status.REJECTED, reason="Unreadable credential"
        )
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, ProfessionalProfile.Status.REJECTED)
        self.assertEqual(self.profile.rejection_reason, "Unreadable credential")
        self.assertIsNone(self.profile.verified_at)

    def test_final_state_cannot_transition_again(self):
        transition_professional_status(self.profile, ProfessionalProfile.Status.REJECTED)
        with self.assertRaises(ValidationError):
            transition_professional_status(self.profile, ProfessionalProfile.Status.VERIFIED)

    def test_unknown_status_is_rejected(self):
        with self.assertRaises(ValidationError):
            transition_professional_status(self.profile, "approved")
