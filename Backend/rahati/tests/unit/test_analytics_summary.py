from datetime import timedelta
from unittest.mock import patch

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AnalyticsSummary, CheckIn, ProfessionalProfile, User


def make_user(name, role="user", language="ar"):
    user = User(username=name, role=role, language=language)
    user.set_password("password123")
    user.save()
    return user


def make_professional(name, status="verified"):
    user = make_user(name, role="professional")
    ProfessionalProfile.objects.create(
        user=user,
        display_name=name.title(),
        city="Algiers",
        credential_file="credentials/diploma.pdf",
        status=status,
    )
    return user


def api(user=None):
    client = APIClient()
    if user:
        client.force_authenticate(user)
    return client


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
    APPEND_SLASH=False,
)
class AnalyticsSummaryPersistenceAndHistoryTests(TestCase):
    def setUp(self):
        self.summary_patcher = patch(
            "rahati.views.generate_analytics_summary",
            side_effect=lambda stats, language="en": f"Summary for {language} with {stats.get('check_in_count', 0)} check-ins.",
        )
        self.summary_patcher.start()
        self.addCleanup(self.summary_patcher.stop)

        self.nour = make_user("nour", role="user", language="ar")
        self.lina = make_user("lina", role="user", language="ar")
        self.sarah = make_user("sarah", role="user", language="en")
        self.pro = make_professional("dr_sara")

        # Seed some check-ins for Nour so analytics has numbers
        today = timezone.localdate()
        for i in range(5):
            CheckIn.objects.create(
                user=self.nour,
                checkin_date=today - timedelta(days=i),
                mood=4,
                energy=3,
            )

    def test_post_analytics_persists_summary_and_preserves_response_shape(self):
        client = api(self.nour)
        res = client.post("/api/analytics", {"range": 7}, format="json")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Cache-Control"], "private, no-store")
        self.assertIn("range", res.data)
        self.assertIn("summary", res.data)
        self.assertIn("analytics", res.data)
        self.assertEqual(res.data["range"], 7)

        # Verify persisted in database
        saved = AnalyticsSummary.objects.filter(user=self.nour)
        self.assertEqual(saved.count(), 1)
        record = saved.first()
        self.assertEqual(record.range, 7)
        self.assertEqual(record.language, "ar")
        self.assertEqual(record.body, res.data["summary"])
        self.assertIsNotNone(record.created_at)

    def test_post_analytics_summary_route_alias_works(self):
        client = api(self.nour)
        res = client.post("/api/analytics/summary", {"range": 30}, format="json")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Cache-Control"], "private, no-store")
        self.assertEqual(res.data["range"], 30)
        self.assertTrue(
            AnalyticsSummary.objects.filter(user=self.nour, range=30).exists()
        )

    def test_multiple_historical_summaries_allowed_for_same_user_and_range(self):
        client = api(self.nour)

        res1 = client.post("/api/analytics", {"range": 7}, format="json")
        res2 = client.post("/api/analytics", {"range": 7}, format="json")
        res3 = client.post("/api/analytics", {"range": 7}, format="json")

        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res3.status_code, 200)

        # Exactly 3 historical records exist for Nour with range 7
        self.assertEqual(
            AnalyticsSummary.objects.filter(user=self.nour, range=7).count(),
            3,
        )

    def test_history_endpoint_ordering_newest_first(self):
        # Create summaries at different times
        now = timezone.now()
        s1 = AnalyticsSummary.objects.create(
            user=self.nour, range=7, language="ar", body="First summary"
        )
        AnalyticsSummary.objects.filter(pk=s1.pk).update(
            created_at=now - timedelta(minutes=10)
        )

        s2 = AnalyticsSummary.objects.create(
            user=self.nour, range=30, language="ar", body="Second summary"
        )
        AnalyticsSummary.objects.filter(pk=s2.pk).update(
            created_at=now - timedelta(minutes=5)
        )

        s3 = AnalyticsSummary.objects.create(
            user=self.nour, range=90, language="ar", body="Third summary"
        )
        AnalyticsSummary.objects.filter(pk=s3.pk).update(
            created_at=now
        )

        client = api(self.nour)
        res = client.get("/api/analytics/history")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Cache-Control"], "private, no-store")
        self.assertEqual(len(res.data), 3)

        # Ordering must be newest first: s3, then s2, then s1
        ids = [item["id"] for item in res.data]
        self.assertEqual(ids, [s3.id, s2.id, s1.id])

        # Validate metadata fields in response
        first_item = res.data[0]
        self.assertEqual(first_item["id"], s3.id)
        self.assertEqual(first_item["range"], 90)
        self.assertEqual(first_item["language"], "ar")
        self.assertEqual(first_item["body"], "Third summary")
        self.assertIn("created_at", first_item)

    def test_history_range_filtering(self):
        AnalyticsSummary.objects.create(
            user=self.nour, range=7, language="ar", body="7 days"
        )
        AnalyticsSummary.objects.create(
            user=self.nour, range=30, language="ar", body="30 days"
        )
        AnalyticsSummary.objects.create(
            user=self.nour, range=90, language="ar", body="90 days"
        )

        client = api(self.nour)

        # Filter by 7
        res7 = client.get("/api/analytics/history?range=7")
        self.assertEqual(res7.status_code, 200)
        self.assertEqual(len(res7.data), 1)
        self.assertEqual(res7.data[0]["range"], 7)

        # Filter by 30
        res30 = client.get("/api/analytics/history?range=30")
        self.assertEqual(res30.status_code, 200)
        self.assertEqual(len(res30.data), 1)
        self.assertEqual(res30.data[0]["range"], 30)

        # Filter by 90
        res90 = client.get("/api/analytics/history?range=90")
        self.assertEqual(res90.status_code, 200)
        self.assertEqual(len(res90.data), 1)
        self.assertEqual(res90.data[0]["range"], 90)

        # No filter returns all 3
        res_all = client.get("/api/analytics/history")
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(len(res_all.data), 3)

    def test_range_validation_on_post_and_history(self):
        client = api(self.nour)

        # POST invalid ranges
        for invalid_range in (0, 14, 15, 60, "abc", -7):
            with self.subTest(invalid_post=invalid_range):
                res = client.post(
                    "/api/analytics", {"range": invalid_range}, format="json"
                )
                self.assertEqual(res.status_code, 400)
                self.assertIn("range", res.data)

        # History GET invalid ranges
        for invalid_range in (0, 14, 15, 60, "abc", -7):
            with self.subTest(invalid_get=invalid_range):
                res = client.get(f"/api/analytics/history?range={invalid_range}")
                self.assertEqual(res.status_code, 400)
                self.assertIn("range", res.data)

    def test_user_isolation_history_and_detail(self):
        # Create summaries for Nour and Lina
        nour_summary = AnalyticsSummary.objects.create(
            user=self.nour, range=7, language="ar", body="Nour's secret summary"
        )
        lina_summary = AnalyticsSummary.objects.create(
            user=self.lina, range=7, language="en", body="Lina's secret summary"
        )

        # Nour views history
        nour_client = api(self.nour)
        nour_res = nour_client.get("/api/analytics/history")
        self.assertEqual(nour_res.status_code, 200)
        nour_ids = [item["id"] for item in nour_res.data]
        self.assertIn(nour_summary.id, nour_ids)
        self.assertNotIn(lina_summary.id, nour_ids)

        # Lina views history
        lina_client = api(self.lina)
        lina_res = lina_client.get("/api/analytics/history")
        self.assertEqual(lina_res.status_code, 200)
        lina_ids = [item["id"] for item in lina_res.data]
        self.assertIn(lina_summary.id, lina_ids)
        self.assertNotIn(nour_summary.id, lina_ids)

        # Nour attempts to read Lina's summary by ID -> 404 (IDOR protection)
        res_cross = nour_client.get(f"/api/analytics/history/{lina_summary.id}")
        self.assertEqual(res_cross.status_code, 404)

        # Nour reads her own summary by ID -> 200
        res_own = nour_client.get(f"/api/analytics/history/{nour_summary.id}")
        self.assertEqual(res_own.status_code, 200)
        self.assertEqual(res_own.data["body"], "Nour's secret summary")

    def test_role_permissions_and_unauthenticated_access(self):
        # Unauthenticated calls
        anon_client = api()
        self.assertEqual(
            anon_client.post("/api/analytics", {"range": 7}, format="json").status_code,
            401,
        )
        self.assertEqual(
            anon_client.get("/api/analytics/history").status_code,
            401,
        )

        # Professional user calls (only User.Role.USER is allowed)
        pro_client = api(self.pro)
        self.assertEqual(
            pro_client.post("/api/analytics", {"range": 7}, format="json").status_code,
            403,
        )
        self.assertEqual(
            pro_client.get("/api/analytics/history").status_code,
            403,
        )

    def test_summaries_route_alias(self):
        AnalyticsSummary.objects.create(
            user=self.nour, range=7, language="ar", body="Alias test"
        )
        client = api(self.nour)
        res = client.get("/api/analytics/summaries")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["body"], "Alias test")

    def test_cascade_delete_with_user(self):
        AnalyticsSummary.objects.create(
            user=self.nour, range=7, language="ar", body="To be deleted"
        )
        self.assertEqual(
            AnalyticsSummary.objects.filter(user=self.nour).count(), 1
        )
        self.nour.delete()
        self.assertEqual(
            AnalyticsSummary.objects.filter(user_id=self.nour.id).count(), 0
        )

    def test_post_analytics_saves_actual_language_used_arabic_and_english(self):
        # Nour is Arabic
        res_nour = api(self.nour).post("/api/analytics", {"range": 7}, format="json")
        self.assertEqual(res_nour.status_code, 200)
        saved_nour = AnalyticsSummary.objects.filter(user=self.nour).first()
        self.assertEqual(saved_nour.language, "ar")

        # Sarah is English
        res_sarah = api(self.sarah).post("/api/analytics", {"range": 7}, format="json")
        self.assertEqual(res_sarah.status_code, 200)
        saved_sarah = AnalyticsSummary.objects.filter(user=self.sarah).first()
        self.assertEqual(saved_sarah.language, "en")

    def test_post_analytics_respects_explicit_language_in_payload_english_and_arabic(self):
        # Nour (Arabic) explicitly requests English summary
        res = api(self.nour).post(
            "/api/analytics", {"range": 7, "language": "en"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        saved = AnalyticsSummary.objects.filter(user=self.nour, range=7).latest("created_at")
        self.assertEqual(saved.language, "en")

        # Sarah (English) explicitly requests Arabic summary
        res_ar = api(self.sarah).post(
            "/api/analytics", {"range": 7, "language": "ar"}, format="json"
        )
        self.assertEqual(res_ar.status_code, 200)
        saved_ar = AnalyticsSummary.objects.filter(user=self.sarah, range=7).latest("created_at")
        self.assertEqual(saved_ar.language, "ar")

    def test_french_is_not_allowed_and_defaults_to_english(self):
        # French ("fr") is not supported; falls back to English default
        res = api(self.nour).post(
            "/api/analytics", {"range": 7, "language": "fr"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        saved = AnalyticsSummary.objects.filter(user=self.nour, range=7).latest("created_at")
        self.assertEqual(saved.language, "en")
        self.assertNotEqual(saved.language, "fr")
