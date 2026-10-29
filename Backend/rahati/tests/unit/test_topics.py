import logging
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import connection
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from rahati.models import AuditLog, CheckIn, CheckInTopic, Topic, TopicTranslation
from rahati.test_api import BaseCase, api, make_user


class SeedTopicsTests(TestCase):
    def test_seed_topics_creates_seven_bilingual_topics_idempotently(self):
        expected = {
            "stress": ("ضغط", "Stress"),
            "sleep": ("النوم", "Sommeil"),
            "family": ("العائلة", "Famille"),
            "work_study": ("العمل أو الدراسة", "Travail ou études"),
            "self_esteem": ("تقدير الذات", "Estime de soi"),
            "relationships": ("العلاقات", "Relations"),
            "body_cycle": ("الجسد والدورة", "Corps et cycle"),
        }

        call_command("seed_topics", stdout=StringIO())
        self.assertEqual(Topic.objects.count(), 7)
        self.assertEqual(TopicTranslation.objects.count(), 14)
        initial = list(
            TopicTranslation.objects.order_by("topic__code", "language").values_list(
                "topic__code", "language", "name"
            )
        )
        self.assertEqual(
            {
                code: tuple(
                    TopicTranslation.objects.get(topic__code=code, language=lang).name
                    for lang in ("ar", "fr")
                )
                for code in expected
            },
            expected,
        )

        call_command("seed_topics", stdout=StringIO())

        self.assertEqual(Topic.objects.count(), 7)
        self.assertEqual(TopicTranslation.objects.count(), 14)
        self.assertEqual(
            list(
                TopicTranslation.objects.order_by("topic__code", "language").values_list(
                    "topic__code", "language", "name"
                )
            ),
            initial,
        )


class TopicApiTests(BaseCase):
    def setUp(self):
        super().setUp()
        call_command("seed_topics", stdout=StringIO())
        self.fr_user = make_user("topic_fr", language="fr")
        self.admin = make_user("topic_admin", role="admin")

    def test_topics_api_returns_localized_names_in_code_order_for_any_role(self):
        for user, expected_language in (
            (self.nour, "ar"),
            (self.fr_user, "fr"),
            (self.pro, "fr"),
            (self.admin, "ar"),
        ):
            if user == self.pro:
                user.language = "fr"
                user.save(update_fields=["language"])
            response = api(user).get("/api/topics")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(all(set(item) == {"code", "name"} for item in response.data))
            self.assertEqual(
                [item["code"] for item in response.data],
                sorted(item["code"] for item in response.data),
            )
            names = {
                code: TopicTranslation.objects.get(
                    topic__code=code, language=expected_language
                ).name
                for code in (
                    "stress",
                    "sleep",
                    "family",
                    "work_study",
                    "self_esteem",
                    "relationships",
                    "body_cycle",
                )
            }
            self.assertEqual(
                response.data,
                [{"code": code, "name": names[code]} for code in sorted(names)],
            )

    def test_topics_api_rejects_anonymous_requests(self):
        self.assertEqual(api().get("/api/topics").status_code, 401)

    def test_checkins_accept_zero_one_and_three_topics_and_return_exact_shape(self):
        client = api(self.nour)
        body = {"checkin_date": str(self.today), "mood": 3, "energy": 4, "topics": []}

        response = client.post("/api/check-ins", body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            set(response.data),
            {"id", "checkin_date", "mood", "energy", "topics"},
        )
        self.assertEqual(response.data["topics"], [])

        body["topics"] = ["stress"]
        response = client.post("/api/check-ins", body, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["topics"], ["stress"])

        body["topics"] = ["relationships", "family", "sleep"]
        response = client.post("/api/check-ins", body, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["topics"], ["family", "relationships", "sleep"])

    def test_invalid_topics_leave_an_existing_checkin_and_topics_unchanged(self):
        checkin = CheckIn.objects.create(
            user=self.nour, checkin_date=self.today, mood=2, energy=3
        )
        checkin.topics.add(Topic.objects.get(code="stress"))
        invalid_topics = (
            ["stress", "sleep", "family", "work_study"],
            ["stress", "stress"],
            ["unknown_topic"],
            None,
            "stress",
            ["stress", 12],
        )

        for topics in invalid_topics:
            response = api(self.nour).post(
                "/api/check-ins",
                {
                    "checkin_date": str(self.today),
                    "mood": 5,
                    "energy": 1,
                    "topics": topics,
                },
                format="json",
            )
            self.assertEqual(response.status_code, 400, repr(topics))
            checkin.refresh_from_db()
            self.assertEqual((checkin.mood, checkin.energy), (2, 3))
            self.assertEqual(list(checkin.topics.values_list("code", flat=True)), ["stress"])
            self.assertEqual(CheckIn.objects.filter(user=self.nour).count(), 1)

    def test_same_day_edits_replace_clear_or_preserve_topics_as_specified(self):
        client = api(self.nour)
        checkin_url = "/api/check-ins"
        base = {"checkin_date": str(self.today), "mood": 3, "energy": 4}
        self.assertEqual(
            client.post(
                checkin_url, {**base, "topics": ["stress", "sleep"]}, format="json"
            ).status_code,
            201,
        )

        replaced = client.post(
            checkin_url, {**base, "topics": ["family"]}, format="json"
        )
        self.assertEqual(replaced.status_code, 200)
        self.assertEqual(replaced.data["topics"], ["family"])

        cleared = client.post(checkin_url, {**base, "topics": []}, format="json")
        self.assertEqual(cleared.status_code, 200)
        self.assertEqual(cleared.data["topics"], [])

        client.post(checkin_url, {**base, "topics": ["stress"]}, format="json")
        omitted = client.post(
            checkin_url,
            {"checkin_date": str(self.today), "mood": 5, "energy": 2},
            format="json",
        )
        self.assertEqual(omitted.status_code, 200)
        self.assertEqual(omitted.data["topics"], ["stress"])
        self.assertEqual((omitted.data["mood"], omitted.data["energy"]), (5, 2))

    def test_get_checkins_returns_sorted_topics_without_cross_woman_visibility(self):
        checkin = CheckIn.objects.create(
            user=self.nour, checkin_date=self.today, mood=3, energy=4
        )
        checkin.topics.add(
            Topic.objects.get(code="stress"), Topic.objects.get(code="family")
        )

        response = api(self.nour).get("/api/check-ins")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["topics"], ["family", "stress"])
        self.assertEqual(api(self.lina).get("/api/check-ins").data, [])

    def test_checkin_topics_do_not_add_per_row_queries(self):
        topics = list(Topic.objects.filter(code__in=["stress", "sleep"]))
        for day in range(1, 31):
            checkin = CheckIn.objects.create(
                user=self.nour,
                checkin_date=self.today - timedelta(days=day),
                mood=3,
                energy=4,
            )
            checkin.topics.add(*topics)

        with CaptureQueriesContext(connection) as thirty_queries:
            response = api(self.nour).get("/api/check-ins")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 30)

        one_date = self.today - timedelta(days=1)
        CheckIn.objects.filter(user=self.nour).exclude(
            checkin_date=one_date
        ).delete()
        with CaptureQueriesContext(connection) as one_query:
            response = api(self.nour).get("/api/check-ins")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(one_query), len(thirty_queries))

    def test_professional_sees_topics_only_with_active_mood_consent(self):
        checkin = CheckIn.objects.create(
            user=self.nour, checkin_date=self.today, mood=3, energy=4
        )
        checkin.topics.add(Topic.objects.get(code="stress"))
        self.accepted_session()
        endpoint = f"/api/pro/patients/{self.nour.id}/check-ins"

        self.assertEqual(api(self.pro).get(endpoint).status_code, 403)
        self.consent(self.nour, "mood")
        allowed = api(self.pro).get(endpoint)
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.data[0]["topics"], ["stress"])

        self.consent(self.nour, "mood", granted=False)
        self.assertEqual(api(self.pro).get(endpoint).status_code, 403)

    def test_checkin_topics_are_deleted_with_account_and_protect_topics_in_use(self):
        checkin = CheckIn.objects.create(
            user=self.nour, checkin_date=self.today, mood=3, energy=4
        )
        topic = Topic.objects.get(code="stress")
        checkin.topics.add(topic)

        with self.assertRaises(ProtectedError):
            topic.delete()

        self.assertEqual(api(self.nour).delete("/api/me").status_code, 204)
        self.assertEqual(CheckInTopic.objects.count(), 0)
        self.assertTrue(Topic.objects.filter(pk=topic.pk).exists())

    def test_malicious_topic_values_are_rejected_without_logging_or_auditing_codes(self):
        checkin = CheckIn.objects.create(
            user=self.nour, checkin_date=self.today, mood=2, energy=3
        )
        topic = Topic.objects.get(code="stress")
        checkin.topics.add(topic)
        sent_codes = [
            "stress",
            "' OR 1=1 --",
            "\x00",
            "\u202e",
            "x" * 1_000_000,
        ]
        invalid_values = [
            [code] for code in sent_codes if code != "stress"
        ] + [["stress"] * 10_000]
        captured_messages = []

        class CaptureHandler(logging.Handler):
            def emit(self, record):
                captured_messages.append(self.format(record))

        handler = CaptureHandler()
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        try:
            for topics in invalid_values:
                response = api(self.nour).post(
                    "/api/check-ins",
                    {
                        "checkin_date": str(self.today),
                        "mood": 5,
                        "energy": 1,
                        "topics": topics,
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, 400)
        finally:
            root_logger.removeHandler(handler)

        self.assertTrue(
            all(code not in message for code in sent_codes for message in captured_messages)
        )
        self.assertFalse(
            any(
                code in repr(row)
                for code in sent_codes
                for row in AuditLog.objects.values()
            )
        )
        checkin.refresh_from_db()
        self.assertEqual((checkin.mood, checkin.energy), (2, 3))
        self.assertEqual(list(checkin.topics.values_list("code", flat=True)), ["stress"])
        self.assertEqual(CheckInTopic.objects.count(), 1)
        self.assertEqual(Topic.objects.count(), 7)
        self.assertEqual(TopicTranslation.objects.count(), 14)
