import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

from django.contrib import admin
from django.contrib.admin.sites import AdminSite
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import RequestFactory, TestCase, override_settings

from rahati.admin import ContentCardAdmin, TopicAdmin, TopicTranslationInline, publish_cards
from rahati.management.commands.seed_starter_cards import FIXTURE_PATH
from rahati.models import (
    CardRead,
    CheckIn,
    CheckInTopic,
    ContentCard,
    ContentCardTranslation,
    Topic,
    TopicTranslation,
    PatternType,
    User,
)
from rahati.test_api import api


def fixture_entries():
    with open(FIXTURE_PATH, encoding="utf-8") as fixture:
        return json.load(fixture)


class SeedStarterCardsTests(TestCase):
    def test_seed_creates_nine_demo_cards_and_leaves_six_pattern_cards_untouched(self):
        entries = fixture_entries()
        pattern_entries = [entry for entry in entries if "pattern" in entry]
        topic_entries = [entry for entry in entries if "topic" in entry]
        self.assertEqual((len(pattern_entries), len(topic_entries)), (6, 9))
        expected_existing_texts = {
            entry["starter_key"]: entry["translations"]
            for entry in pattern_entries
        }

        call_command("seed_starter_cards")

        self.assertEqual(ContentCard.objects.count(), 15)
        self.assertEqual(ContentCard.objects.filter(status="draft").count(), 15)
        self.assertEqual(ContentCard.objects.filter(topic__isnull=False).count(), 9)
        self.assertEqual(Topic.objects.count(), 7)
        for key, translations in expected_existing_texts.items():
            card = ContentCard.objects.get(starter_key=key)
            self.assertIsNone(card.topic_id)
            self.assertEqual(card.status, ContentCard.Status.DRAFT)
            self.assertEqual(
                {
                    translation.language: {
                        "title": translation.title,
                        "body": translation.body,
                        "action_text": translation.action_text,
                        "support_note": translation.support_note,
                    }
                    for translation in card.translations.all()
                },
                translations,
            )

        by_topic = {}
        for entry in topic_entries:
            card = ContentCard.objects.get(starter_key=entry["starter_key"])
            self.assertEqual(card.topic.code, entry["topic"])
            self.assertEqual(card.status, ContentCard.Status.DRAFT)
            self.assertEqual(
                set(card.translations.values_list("language", flat=True)),
                {"ar", "fr"},
            )
            ar = card.translations.get(language="ar")
            fr = card.translations.get(language="fr")
            self.assertEqual(
                (ar.title, ar.body, ar.action_text, ar.support_note),
                (fr.title, fr.body, fr.action_text, fr.support_note),
            )
            for translation in card.translations.all():
                self.assertTrue(translation.support_note)
                for field in ("title", "body", "action_text", "support_note"):
                    self.assertTrue(getattr(translation, field).startswith("[DEMO]"))
            by_topic[entry["topic"]] = by_topic.get(entry["topic"], 0) + 1
        self.assertEqual(
            by_topic,
            {
                "sleep": 2,
                "stress": 2,
                "family": 1,
                "work_study": 1,
                "self_esteem": 1,
                "relationships": 1,
                "body_cycle": 1,
            },
        )

        initial = list(
            ContentCardTranslation.objects.order_by("card_id", "language").values_list(
                "card_id", "language", "title", "body", "action_text", "support_note"
            )
        )
        call_command("seed_starter_cards")
        self.assertEqual(ContentCard.objects.count(), 15)
        self.assertEqual(
            list(
                ContentCardTranslation.objects.order_by("card_id", "language").values_list(
                    "card_id", "language", "title", "body", "action_text", "support_note"
                )
            ),
            initial,
        )

    def test_unknown_topic_code_errors_before_writing_anything(self):
        entries = fixture_entries()
        entries.append(
            {
                "starter_key": "invalid_topic_card",
                "topic": "unknown_topic",
                "translations": entries[-1]["translations"],
            }
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.json"
            path.write_text(json.dumps(entries), encoding="utf-8")
            with patch(
                "rahati.management.commands.seed_starter_cards.FIXTURE_PATH", path
            ):
                with self.assertRaises(CommandError):
                    call_command("seed_starter_cards")

        self.assertEqual(Topic.objects.count(), 0)
        self.assertEqual(ContentCard.objects.count(), 0)
        self.assertEqual(ContentCardTranslation.objects.count(), 0)
        self.assertEqual(PatternType.objects.count(), 0)

    def test_update_only_changes_draft_cards(self):
        call_command("seed_starter_cards")
        entries = fixture_entries()
        topic_entry = next(entry for entry in entries if entry.get("topic") == "sleep")
        draft = ContentCard.objects.get(starter_key=topic_entry["starter_key"])
        published_entry = next(entry for entry in entries if entry.get("pattern"))
        published = ContentCard.objects.get(starter_key=published_entry["starter_key"])
        published.status = ContentCard.Status.PUBLISHED
        published.save(update_fields=["status"])

        topic_entry["translations"]["ar"]["title"] = "[DEMO] Updated sleep card"
        published_entry["translations"]["ar"]["title"] = "Must not update published"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.json"
            path.write_text(json.dumps(entries), encoding="utf-8")
            with patch(
                "rahati.management.commands.seed_starter_cards.FIXTURE_PATH", path
            ):
                call_command("seed_starter_cards", "--update")

        draft.refresh_from_db()
        published.refresh_from_db()
        self.assertEqual(
            draft.translations.get(language="ar").title,
            "[DEMO] Updated sleep card",
        )
        self.assertNotEqual(published.translations.get(language="ar").title, "Must not update published")

    @override_settings(DEBUG=False)
    def test_demo_publish_requires_debug_and_writes_nothing_when_refused(self):
        with self.assertRaises(CommandError):
            call_command("seed_starter_cards", "--publish-demo")
        self.assertEqual(ContentCard.objects.count(), 0)
        self.assertEqual(Topic.objects.count(), 0)

    @override_settings(DEBUG=True)
    def test_demo_publish_is_explicit_and_bypasses_demo_markers_only(self):
        call_command("seed_starter_cards")
        self.assertFalse(ContentCard.objects.exclude(status="draft").exists())
        self.assertTrue(
            all("[DEMO]" in card.translations.first().title
                for card in ContentCard.objects.filter(topic__isnull=False))
        )

        request = RequestFactory().post("/admin/")
        request.user = User(username="staff", is_staff=True)
        model_admin = ContentCardAdmin(ContentCard, AdminSite())
        model_admin.message_user = Mock()
        publish_cards(
            model_admin,
            request,
            ContentCard.objects.filter(topic__isnull=False),
        )
        self.assertTrue(
            all(
                "draft marker" in call.args[1]
                for call in model_admin.message_user.call_args_list
            )
        )
        self.assertFalse(ContentCard.objects.exclude(status="draft").exists())

        call_command("seed_starter_cards", "--publish-demo")

        self.assertEqual(ContentCard.objects.filter(status="published").count(), 15)


class TopicAndCardAdminTests(TestCase):
    def setUp(self):
        call_command("seed_starter_cards")
        self.staff = User.objects.create_user(
            username="topic_staff",
            password="password123",
            is_staff=True,
            is_superuser=True,
        )
        self.topic = Topic.objects.get(code="sleep")
        self.topic_admin = TopicAdmin(Topic, AdminSite())
        self.factory = RequestFactory()

    def test_non_staff_cannot_open_admin_but_staff_can(self):
        response = self.client.get("/admin/rahati/topic/")
        self.assertEqual(response.status_code, 302)

        self.client.force_login(self.staff)
        response = self.client.get("/admin/rahati/topic/")
        self.assertEqual(response.status_code, 200)

    def test_topic_names_are_editable_and_code_is_read_only_after_creation(self):
        request = self.factory.get("/admin/")
        request.user = self.staff
        self.assertEqual(self.topic_admin.get_readonly_fields(request, self.topic), ["code"])
        self.assertEqual(self.topic_admin.get_readonly_fields(request, None), [])
        self.assertNotIn("name", TopicTranslationInline.readonly_fields)

        self.client.force_login(self.staff)
        response = self.client.get(f"/admin/rahati/topic/{self.topic.pk}/change/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "translations-0-name")
        self.assertNotContains(response, 'name="code"')

        ar = self.topic.translations.get(language="ar")
        fr = self.topic.translations.get(language="fr")
        response = self.client.post(
            f"/admin/rahati/topic/{self.topic.pk}/change/",
            {
                "_save": "Save",
                "translations-TOTAL_FORMS": "2",
                "translations-INITIAL_FORMS": "2",
                "translations-MIN_NUM_FORMS": "0",
                "translations-MAX_NUM_FORMS": "2",
                "translations-0-id": str(ar.pk),
                "translations-0-topic": str(self.topic.pk),
                "translations-0-language": "ar",
                "translations-0-name": "اسم النوم المعدل",
                "translations-1-id": str(fr.pk),
                "translations-1-topic": str(self.topic.pk),
                "translations-1-language": "fr",
                "translations-1-name": "Sommeil modifié",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.topic.refresh_from_db()
        self.assertEqual(self.topic.code, "sleep")
        self.assertEqual(self.topic.translations.get(language="ar").name, "اسم النوم المعدل")
        self.assertEqual(self.topic.translations.get(language="fr").name, "Sommeil modifié")
        self.assertEqual(TopicTranslationInline.max_num, 2)

    def test_deleting_topic_in_use_shows_protection_message(self):
        woman = User.objects.create_user(username="topic_owner", role="user")
        checkin = CheckIn.objects.create(
            user=woman, checkin_date="2026-10-24", mood=3, energy=3
        )
        CheckInTopic.objects.create(check_in=checkin, topic=self.topic)
        request = self.factory.post("/admin/")
        request.user = self.staff
        self.topic_admin.message_user = Mock()

        self.topic_admin.delete_model(request, self.topic)

        self.assertTrue(Topic.objects.filter(pk=self.topic.pk).exists())
        self.topic_admin.message_user.assert_called_once()
        self.assertIn("in use by check-ins", self.topic_admin.message_user.call_args.args[1])

    def test_personal_read_and_checkin_topic_models_are_not_registered(self):
        self.assertNotIn(CheckInTopic, admin.site._registry)
        self.assertNotIn(CardRead, admin.site._registry)

    def test_content_card_admin_lists_and_filters_by_topic(self):
        model_admin = ContentCardAdmin(ContentCard, AdminSite())
        self.assertIn("get_topic", model_admin.list_display)
        self.assertIn("topic", model_admin.list_filter)
        self.assertIn("topic", [field.name for field in ContentCard._meta.fields])
        self.client.force_login(self.staff)
        response = self.client.get(
            f"/admin/rahati/contentcard/?topic__id__exact={self.topic.pk}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "topic_sleep_1")
        self.assertNotContains(response, "topic_family_1")

    @override_settings(DEBUG=True)
    def test_all_topics_have_a_card_and_full_flow_after_demo_seed(self):
        call_command("seed_starter_cards", "--publish-demo")
        woman = User.objects.create_user(
            username="topic_smoke_woman", role="user", language="ar"
        )
        response = api(woman).post(
            "/api/check-ins",
            {
                "checkin_date": "2026-10-24",
                "mood": 3,
                "energy": 4,
                "topics": ["sleep"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        suggestions = api(woman).get("/api/content-cards")
        self.assertEqual([item["topic"] for item in suggestions.data], ["sleep", "sleep"])
        first = suggestions.data[0]
        self.assertEqual(first["title"], "[DEMO] Sleep card 1")
        self.assertEqual(
            api(woman).post(f"/api/content-cards/{first['id']}/read").status_code,
            201,
        )
        after_read = api(woman).get("/api/content-cards")
        self.assertEqual(after_read.data[1]["id"], first["id"])
        library = api(woman).get("/api/content-cards/library")
        self.assertEqual(library.data["count"], 15)
        self.assertEqual(sum(item["topic"] is None for item in library.data["results"]), 6)
        self.assertEqual(
            api(woman).post(
                f"/api/content-cards/{first['id']}/add-todo"
            ).status_code,
            201,
        )
