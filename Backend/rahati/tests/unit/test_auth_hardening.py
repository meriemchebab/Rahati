from datetime import timedelta

from django.contrib.auth import authenticate
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from rahati.models import User


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
        "DEFAULT_THROTTLE_RATES": {"auth_login": "100/hour"},
    },
)
class AuthHardeningTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="auth_user", password="OldPass!2026")
        self.client = APIClient()

    def test_login_wrong_username_and_password_have_same_error(self):
        bad_password = self.client.post(
            "/api/auth/login", {"username": "auth_user", "password": "wrong"}, format="json"
        )
        bad_username = self.client.post(
            "/api/auth/login", {"username": "nobody", "password": "wrong"}, format="json"
        )
        self.assertEqual(bad_password.status_code, 401)
        self.assertEqual(bad_username.status_code, 401)
        self.assertEqual(bad_password.data, bad_username.data)

    def test_login_returns_access_and_refresh(self):
        response = self.client.post(
            "/api/auth/login", {"username": "auth_user", "password": "OldPass!2026"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_logout_blacklists_owned_refresh_token(self):
        token = str(RefreshToken.for_user(self.user))
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/auth/logout", {"refresh": token}, format="json")
        self.assertEqual(response.status_code, 204)
        self.assertTrue(
            BlacklistedToken.objects.filter(token__token=token).exists()
        )

    def test_logout_rejects_another_users_refresh(self):
        other = User.objects.create_user(username="other_auth", password="OldPass!2026")
        token = str(RefreshToken.for_user(other))
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/auth/logout", {"refresh": token}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_change_password_requires_current_and_valid_new_password(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/auth/change-password",
            {"current_password": "wrong", "new_password": "NewPass!2026"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        response = self.client.post(
            "/api/auth/change-password",
            {"current_password": "OldPass!2026", "new_password": "password"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        response = self.client.post(
            "/api/auth/change-password",
            {"current_password": "OldPass!2026", "new_password": "BrandNew!2026"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNew!2026"))

    def test_access_token_setting_is_15_minutes_and_rotation_enabled(self):
        from django.conf import settings
        self.assertEqual(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"], timedelta(minutes=15))
        self.assertTrue(settings.SIMPLE_JWT["ROTATE_REFRESH_TOKENS"])
        self.assertTrue(settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"])
