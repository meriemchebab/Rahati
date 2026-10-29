"""Cross-cutting professional security matrix for endpoints and text inputs."""
import io
import tempfile
from datetime import timedelta

from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from rahati.models import (
    AvailabilitySlot, ContentCard, ContentCardTranslation, ProfessionalProfile,
    Session, User,
)
from rahati.serializers import (
    CardTranslationSerializer, JournalSerializer, ProfessionalProfilePatchSerializer,
    ProfessionalRegistrationSerializer, ProCardCreateSerializer, TodoSerializer,
    RegisterSerializer,
)


def credential():
    stream = io.BytesIO()
    Image.new("RGB", (1, 1), "white").save(stream, "PNG")
    return SimpleUploadedFile("proof.png", stream.getvalue(), content_type="image/png")


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    PRIVATE_MEDIA_ROOT=tempfile.gettempdir(),
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
        "DEFAULT_THROTTLE_RATES": {"pro_register": "100/hour", "content_read": "100/hour"},
    },
)
class ProfessionalSecurityMatrixTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.woman = User.objects.create_user(username="matrix_woman", password="Pass!2026", role="user")
        cls.pending = cls.make_professional("matrix_pending", "pending")
        cls.rejected = cls.make_professional("matrix_rejected", "rejected")
        cls.verified = cls.make_professional("matrix_verified", "verified")
        cls.admin = User.objects.create_user(
            username="matrix_admin", password="Pass!2026", is_staff=True, is_superuser=True
        )

    @classmethod
    def make_professional(cls, name, status):
        user = User.objects.create_user(username=name, password="Pass!2026", role="professional")
        ProfessionalProfile.objects.create(
            user=user,
            display_name=f"Dr {name}",
            bio="Profile bio",
            city="Algiers",
            address="Private clinic address",
            credential_file="credentials/matrix.pdf",
            status=status,
        )
        return user

    def setUp(self):
        self.client = APIClient()

    def test_route_inventory_has_auth_profile_credential_admin_and_review_routes(self):
        from django.urls import get_resolver
        routes = set()
        def walk(patterns, prefix=""):
            for item in patterns:
                route = prefix + str(item.pattern)
                if hasattr(item, "url_patterns"):
                    walk(item.url_patterns, route)
                else:
                    routes.add(route)
        walk(get_resolver().url_patterns)
        expected = (
            "api/auth/login", "api/auth/logout", "api/auth/change-password",
            "api/auth/register-professional", "api/pro/profile",
            "api/pro/profile/credential", "admin/rahati/professionalprofile/<path:object_id>/credential/",
        )
        for route in expected:
            self.assertTrue(any(route in registered or registered.endswith(route) for registered in routes), route)

    def test_role_matrix_for_profile_and_verified_content_routes(self):
        matrix = [
            ("anonymous", None, 401),
            ("woman", self.woman, 403),
            ("pending", self.pending, 200),
            ("rejected", self.rejected, 200),
            ("verified", self.verified, 200),
            ("admin", self.admin, 403),
        ]
        for label, user, profile_status in matrix:
            with self.subTest(role=label, endpoint="profile"):
                self.client.force_authenticate(user)
                response = self.client.get("/api/pro/profile")
                self.assertEqual(response.status_code, profile_status)

        content_matrix = [
            ("anonymous", None, 401),
            ("woman", self.woman, 403),
            ("pending", self.pending, 403),
            ("rejected", self.rejected, 403),
            ("verified", self.verified, 200),
            ("admin", self.admin, 403),
        ]
        for label, user, expected in content_matrix:
            with self.subTest(role=label, endpoint="pro content"):
                self.client.force_authenticate(user)
                response = self.client.get("/api/pro/content")
                self.assertEqual(response.status_code, expected)

    def test_session_details_released_only_while_accepted_and_for_matching_mode(self):
        pro_profile = self.verified.professional_profile
        pro_profile.address = "42 Private Street"
        pro_profile.save(update_fields=["address"])
        self.client.force_authenticate(self.woman)
        for mode, status, should_include_address, should_include_link in (
            ("in_person", "requested", False, False),
            ("online", "accepted", False, False),
            ("in_person", "accepted", True, False),
            ("in_person", "completed", False, False),
        ):
            slot = AvailabilitySlot.objects.create(
                professional=self.verified,
                starts_at=timezone.now() + timedelta(days=1),
                ends_at=timezone.now() + timedelta(days=1, minutes=30),
                mode=mode,
            )
            session = Session.objects.create(user=self.woman, slot=slot, status=status)
            response = self.client.get("/api/sessions")
            result = next(row for row in response.data if row["id"] == session.id)
            self.assertEqual("professional_address" in result, should_include_address)
            self.assertEqual("meeting_link" in result, should_include_link)


class TextInjectionMatrixTests(TestCase):
    """Unsafe markup is rejected for every user-controlled public text field."""

    payload = "<script>alert(1)</script>"

    def test_injection_payload_rejected_across_text_serializer_fields(self):
        cases = [
            ("professional registration display_name", ProfessionalRegistrationSerializer,
             {"display_name": self.payload}),
            ("professional registration bio", ProfessionalRegistrationSerializer,
             {"bio": self.payload}),
            ("professional registration city", ProfessionalRegistrationSerializer,
             {"city": self.payload}),
            ("professional registration address", ProfessionalRegistrationSerializer,
             {"address": self.payload}),
            ("user registration nickname", RegisterSerializer, {"nickname": self.payload}),
            ("profile patch display_name", ProfessionalProfilePatchSerializer,
             {"display_name": self.payload}),
            ("profile patch bio", ProfessionalProfilePatchSerializer, {"bio": self.payload}),
            ("profile patch city", ProfessionalProfilePatchSerializer, {"city": self.payload}),
            ("profile patch address", ProfessionalProfilePatchSerializer, {"address": self.payload}),
            ("translation title", CardTranslationSerializer, {"title": self.payload}),
            ("translation body", CardTranslationSerializer, {"body": self.payload}),
            ("translation action_text", CardTranslationSerializer, {"action_text": self.payload}),
            ("translation support_note", CardTranslationSerializer, {"support_note": self.payload}),
            ("todo title", TodoSerializer, {"title": self.payload}),
            ("private journal body control/bidi checks", JournalSerializer,
             {"body": "note\x00\u202e"}),
        ]
        for label, serializer_class, override in cases:
            with self.subTest(field=label):
                data = self.valid_data(serializer_class)
                data.update(override)
                serializer = serializer_class(data=data)
                self.assertFalse(serializer.is_valid(), serializer.errors)

    @staticmethod
    def valid_data(serializer_class):
        if serializer_class is ProfessionalRegistrationSerializer:
            return {
                "nickname": "matrix_new", "password": "GoodPass!2026", "language": "fr",
                "email": "matrix-new@example.test", "display_name": "Dr Name", "bio": "Bio",
                "city": "Algiers", "address": "Centre", "credential_kind": "diploma",
                "credential_file": credential(), "terms_accepted": True,
            }
        if serializer_class is ProfessionalProfilePatchSerializer:
            return {"display_name": "Dr Name", "bio": "Bio", "city": "Algiers", "address": "Centre"}
        if serializer_class is TodoSerializer:
            return {"title": "Remember appointment"}
        if serializer_class is RegisterSerializer:
            return {"nickname": "new_member", "password": "SafePass!2026"}
        if serializer_class is JournalSerializer:
            return {"body": "A private note"}
        return {
            "language": "fr", "title": "Title", "body": "Body", "action_text": "Action",
            "support_note": "Note",
        }
