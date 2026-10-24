from datetime import date, timedelta
from io import StringIO
from unittest.mock import patch

from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.core.management import call_command
from rest_framework.test import APIClient

from rahati.models import (
    AuditLog,
    CardRead,
    CheckIn,
    ContentCard,
    ContentCardTranslation,
    PatternType,
    Topic,
    Todo,
    UserPattern,
)
from rahati.test_api import BaseCase, api, make_user


CARD_KEYS = {
    "id",
    "topic",
    "topic_name",
    "title",
    "body",
    "action",
    "support_note",
    "pattern",
    "source",
    "author_name",
    "read",
    "has_open_todo",
    "reviewed_by_name",
    "language",
}


class CardApiHelpers:
    def setUp(self):
        super().setUp()
        call_command("seed_topics", stdout=StringIO())

    def topic(self, code):
        return Topic.objects.get(code=code)

    def make_card(
        self,
        topic=None,
        *,
        status="published",
        author=None,
        languages=("ar", "fr"),
        title=None,
        pattern=None,
    ):
        card = ContentCard.objects.create(
            topic=topic,
            status=status,
            author=author,
            pattern_type=pattern,
        )
        for language in languages:
            ContentCardTranslation.objects.create(
                card=card,
                language=language,
                title=title or f"{language}-{card.pk}",
                body=f"body-{card.pk}",
                action_text=f"action-{card.pk}",
                support_note=f"support-{card.pk}",
            )
        return card

    def tag(self, code, day, user=None):
        checkin, _ = CheckIn.objects.get_or_create(
            user=user or self.nour,
            checkin_date=day,
            defaults={"mood": 3, "energy": 3},
        )
        checkin.topics.add(self.topic(code))
        return checkin


class CardSuggestionTests(CardApiHelpers, BaseCase):
    def test_topic_ranking_uses_count_then_recency_then_code_and_caps(self):
        today = self.today
        self.tag("stress", today - timedelta(days=3))
        self.tag("stress", today - timedelta(days=2))
        self.tag("stress", today - timedelta(days=1))
        self.tag("sleep", today)
        self.tag("sleep", today - timedelta(days=1))
        self.tag("family", today)
        self.tag("family", today - timedelta(days=1))
        cards = {
            code: [self.make_card(topic=self.topic(code)) for _ in range(3)]
            for code in ("stress", "sleep", "family")
        }

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(len(response.data), 4)
        self.assertEqual(AuditLog.objects.count(), 0)
        self.assertEqual(
            [item["id"] for item in response.data],
            [
                cards["stress"][0].id,
                cards["stress"][1].id,
                cards["family"][0].id,
                cards["family"][1].id,
            ],
        )
        self.assertEqual(
            {item["topic"] for item in response.data},
            {"stress", "family"},
        )
        self.assertTrue(all(set(item) == CARD_KEYS for item in response.data))

    def test_unread_cards_rank_before_read_cards_within_a_topic(self):
        self.tag("sleep", self.today)
        first = self.make_card(topic=self.topic("sleep"))
        second = self.make_card(topic=self.topic("sleep"))
        third = self.make_card(topic=self.topic("sleep"))
        CardRead.objects.create(user=self.nour, card=first)

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual(
            [item["id"] for item in response.data],
            [second.id, third.id],
        )
        self.assertEqual([item["read"] for item in response.data], [False, False])

    def test_topic_ties_use_latest_tag_then_topic_code(self):
        self.tag("sleep", self.today)
        self.tag("sleep", self.today - timedelta(days=1))
        self.tag("family", self.today)
        self.tag("family", self.today - timedelta(days=1))
        self.tag("relationships", self.today - timedelta(days=1))
        self.tag("relationships", self.today - timedelta(days=2))
        for code in ("sleep", "family", "relationships"):
            self.make_card(topic=self.topic(code))

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual(
            [item["topic"] for item in response.data],
            ["family", "sleep", "relationships"],
        )

    def test_only_the_last_fourteen_local_days_count_and_thirteen_days_counts(self):
        self.tag("sleep", self.today - timedelta(days=13))
        self.tag("stress", self.today - timedelta(days=15))
        sleep = self.make_card(topic=self.topic("sleep"))
        self.make_card(topic=self.topic("stress"))

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual([item["id"] for item in response.data], [sleep.id])

    def test_general_fallback_rotates_by_iso_week_and_has_a_three_card_limit(self):
        cards = [self.make_card() for _ in range(5)]
        monday_week_two = date(2026, 1, 5)
        monday_week_three = date(2026, 1, 12)

        with patch("rahati.views.timezone.localdate", return_value=monday_week_two):
            first = api(self.nour).get("/api/content-cards")
        with patch("rahati.views.timezone.localdate", return_value=monday_week_three):
            second = api(self.nour).get("/api/content-cards")

        self.assertEqual(len(first.data), 3)
        self.assertEqual(len(second.data), 3)
        self.assertNotEqual(
            [item["id"] for item in first.data],
            [item["id"] for item in second.data],
        )
        self.assertEqual(first.data[0]["id"], cards[2].id)

    def test_topic_with_no_eligible_card_falls_back_to_general(self):
        self.tag("body_cycle", self.today)
        self.make_card(topic=self.topic("body_cycle"), status="draft")
        general = self.make_card()

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual([item["id"] for item in response.data], [general.id])

    def test_language_fallback_skips_cards_without_any_translation(self):
        self.tag("sleep", self.today)
        french_only = self.make_card(topic=self.topic("sleep"), languages=("fr",))
        self.make_card(topic=self.topic("sleep"), languages=())

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual([item["id"] for item in response.data], [french_only.id])
        self.assertEqual(response.data[0]["language"], "fr")
        self.assertEqual(response.data[0]["topic_name"], "النوم")

    def test_hidden_and_professional_cards_never_appear_and_patterns_have_no_effect(self):
        self.make_card(status="draft")
        self.make_card(status="removed")
        self.make_card(author=self.pro)
        pattern = PatternType.objects.create(code="mood_dip", name="Mood dip")
        general = [self.make_card(pattern=pattern) for _ in range(4)]
        baseline = api(self.nour).get("/api/content-cards").data
        UserPattern.objects.create(
            user=self.nour,
            pattern_type=pattern,
            window_start=self.today - timedelta(days=1),
            window_end=self.today,
            value=1,
        )

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual([item["id"] for item in response.data], [item["id"] for item in baseline])
        self.assertEqual(len(response.data), 3)
        self.assertTrue({item["id"] for item in response.data}.issubset({card.id for card in general}))
        self.assertTrue(all(item["source"] == "platform" for item in response.data))

    def test_other_womans_topic_tags_do_not_change_suggestions(self):
        [self.make_card() for _ in range(4)]
        baseline = api(self.nour).get("/api/content-cards").data
        self.tag("sleep", self.today, user=self.lina)
        self.make_card(topic=self.topic("sleep"))

        response = api(self.nour).get("/api/content-cards")

        self.assertEqual(
            [item["id"] for item in response.data],
            [item["id"] for item in baseline],
        )

    def test_suggestions_have_a_constant_query_count_for_thirty_cards(self):
        for _ in range(30):
            self.make_card()

        with CaptureQueriesContext(connection) as queries:
            response = api(self.nour).get("/api/content-cards")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(len(queries), 5)


class CardDetailReadLibraryTests(CardApiHelpers, BaseCase):
    def test_detail_is_published_platform_only_and_does_not_mark_read(self):
        visible = self.make_card(topic=self.topic("sleep"), languages=("fr",))
        hidden = [
            self.make_card(status="draft"),
            self.make_card(status="removed"),
            self.make_card(author=self.pro),
        ]
        client = api(self.nour)

        response = client.get(f"/api/content-cards/{visible.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["language"], "fr")
        self.assertFalse(response.data["read"])
        self.assertFalse(CardRead.objects.filter(user=self.nour, card=visible).exists())
        for card in hidden:
            response = client.get(f"/api/content-cards/{card.id}")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.data, {"detail": "Not found."})
        missing = client.get("/api/content-cards/999999")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.data, {"detail": "Not found."})
        self.assertEqual(set(response.data), {"detail"})
        self.assertEqual(set(client.get(f"/api/content-cards/{visible.id}").data), CARD_KEYS)

    def test_read_is_idempotent_private_and_visible_in_card_surfaces(self):
        self.tag("sleep", self.today)
        card = self.make_card(topic=self.topic("sleep"))
        self.make_card(status="draft")
        client = api(self.nour)

        first = client.post(f"/api/content-cards/{card.id}/read", {}, format="json")
        second = client.post(f"/api/content-cards/{card.id}/read", {}, format="json")

        self.assertEqual((first.status_code, first.content), (201, b""))
        self.assertEqual((second.status_code, second.content), (200, b""))
        self.assertEqual(first["Cache-Control"], "private, no-store")
        self.assertTrue(client.get(f"/api/content-cards/{card.id}").data["read"])
        self.assertTrue(client.get("/api/content-cards").data[0]["read"])
        self.assertTrue(
            client.get("/api/content-cards/library").data["results"][0]["read"]
        )
        self.assertFalse(
            api(self.lina).get(f"/api/content-cards/{card.id}").data["read"]
        )
        self.assertFalse(
            api(self.lina).get("/api/content-cards/library").data["results"][0]["read"]
        )
        self.assertEqual(
            client.post("/api/content-cards/999999/read").status_code,
            404,
        )
        draft = ContentCard.objects.create(status="draft")
        self.assertEqual(
            client.post(f"/api/content-cards/{draft.id}/read").status_code,
            404,
        )

        self.nour.delete()
        self.assertFalse(CardRead.objects.filter(card=card).exists())

    def test_library_filters_orders_paginates_and_caps_page_size(self):
        sleep_a = self.make_card(topic=self.topic("sleep"))
        family = self.make_card(topic=self.topic("family"))
        general = self.make_card()
        sleep_b = self.make_card(topic=self.topic("sleep"))
        self.make_card(status="draft")
        client = api(self.nour)

        all_cards = client.get("/api/content-cards/library")
        self.assertEqual(
            [item["id"] for item in all_cards.data["results"]],
            [family.id, sleep_a.id, sleep_b.id, general.id],
        )
        self.assertEqual(set(all_cards.data), {"count", "next", "previous", "results"})
        self.assertIsNone(all_cards.data["next"])
        self.assertTrue(all(item["body"] == "" for item in all_cards.data["results"]))
        self.assertTrue(all(set(item) == CARD_KEYS for item in all_cards.data["results"]))
        topic_page = client.get(
            "/api/content-cards/library?topic=sleep&limit=1&offset=1"
        )
        self.assertEqual(topic_page.data["count"], 2)
        self.assertEqual(topic_page.data["results"][0]["id"], sleep_b.id)
        self.assertIn("topic=sleep", topic_page.data["previous"])
        general_page = client.get("/api/content-cards/library?topic=general")
        self.assertEqual([item["id"] for item in general_page.data["results"]], [general.id])
        capped = client.get("/api/content-cards/library?limit=51")
        self.assertEqual(capped.data["count"], 4)
        self.assertEqual(len(capped.data["results"]), 4)
        self.assertEqual(client.get("/api/content-cards/library").status_code, 200)

    def test_library_topic_validation_and_query_injection_matrix(self):
        query_values = (
            "?topic=missing_topic",
            "?topic=%27%20OR%201%3D1--",
            "?topic=%00",
            "?topic=%E2%80%AE",
            "?topic=" + ("x" * 1_000_000),
            "?limit=%27%20OR%201%3D1--",
            "?limit=%00",
            "?limit=%E2%80%AE",
            "?limit=" + ("9" * 1_000_000),
            "?limit=-1",
            "?limit=1.5",
            "?offset=%27%20OR%201%3D1--",
            "?offset=%00",
            "?offset=%E2%80%AE",
            "?offset=" + ("9" * 1_000_000),
            "?limit=" + ("9" * 1_000_000),
            "?offset=-1",
            "?offset=1.5",
            "?topic=sleep&topic=stress",
            "?limit=1&limit=2",
            "?offset=1&offset=2",
        )

        for query in query_values:
            response = api(self.nour).get("/api/content-cards/library" + query)
            self.assertEqual(response.status_code, 400, query[:80])

        self.assertEqual(
            api(self.nour).get("/api/content-cards/library?topic=library").status_code,
            400,
        )

    def test_library_query_count_is_fixed_for_thirty_cards(self):
        for _ in range(30):
            self.make_card()
        client = api(self.nour)
        with CaptureQueriesContext(connection) as many:
            self.assertEqual(client.get("/api/content-cards/library").status_code, 200)
        ContentCard.objects.filter(pk__gt=ContentCard.objects.order_by("id").first().id + 1).delete()
        with CaptureQueriesContext(connection) as few:
            self.assertEqual(client.get("/api/content-cards/library").status_code, 200)
        self.assertEqual(len(many), len(few))

    def test_all_card_routes_are_woman_only_and_private(self):
        card = self.make_card()
        routes = (
            ("GET", "/api/content-cards"),
            ("GET", f"/api/content-cards/{card.id}"),
            ("POST", f"/api/content-cards/{card.id}/read"),
            ("GET", "/api/content-cards/library"),
        )
        admin = make_user("card_admin", role="admin")
        for method, path in routes:
            anonymous = APIClient()
            response = getattr(anonymous, method.lower())(path)
            self.assertEqual(response.status_code, 401, path)
            self.assertEqual(api(self.pro).__getattribute__(method.lower())(path).status_code, 403)
            self.assertEqual(api(admin).__getattribute__(method.lower())(path).status_code, 403)
            for user in (self.nour, self.lina):
                response = getattr(api(user), method.lower())(path)
                self.assertLess(response.status_code, 400, path)
                self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_woman_cannot_attach_a_card_through_post_todos(self):
        card = self.make_card()

        response = api(self.nour).post(
            "/api/todos",
            {"title": "not a card action", "card": card.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["card"])
        self.assertIsNone(Todo.objects.get(pk=response.data["id"]).card_id)

    def test_add_todo_open_state_flips_and_completion_allows_a_new_todo(self):
        card = self.make_card()
        client = api(self.nour)

        created = client.post(f"/api/content-cards/{card.id}/add-todo")
        self.assertEqual(created.status_code, 201)
        self.assertTrue(client.get(f"/api/content-cards/{card.id}").data["has_open_todo"])
        completed = client.post(f"/api/todos/{created.data['id']}/complete")
        self.assertEqual(completed.status_code, 200)
        self.assertFalse(client.get(f"/api/content-cards/{card.id}").data["has_open_todo"])
        again = client.post(f"/api/content-cards/{card.id}/add-todo")
        self.assertEqual(again.status_code, 201)
        self.assertNotEqual(again.data["id"], created.data["id"])
