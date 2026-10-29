"""Management command: seed_starter_cards.

Creates the 6 platform starter cards from the fixture file. Idempotent.

Usage:
    python manage.py seed_starter_cards
    python manage.py seed_starter_cards --update       # update translations of draft cards
    python manage.py seed_starter_cards --publish-demo # publish (DEBUG=True only)
"""
import json
from pathlib import Path
from io import StringIO

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from rahati.models import ContentCard, ContentCardTranslation, PatternType, Topic
from .seed_topics import TOPICS

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "fixtures" / "starter_cards.json"

class Command(BaseCommand):
    help = "Seed the starter platform content cards (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--update",
            action="store_true",
            help="Overwrite translations of cards that are still in draft.",
        )
        parser.add_argument(
            "--publish-demo",
            action="store_true",
            help="Publish the seeded cards (only works when DEBUG=True).",
        )

    def handle(self, *args, **options):
        update = options["update"]
        publish_demo = options["publish_demo"]

        # Load and validate fixture
        with open(FIXTURE_PATH, encoding="utf-8") as f:
            entries = json.load(f)

        # Abort if any entry is missing required fields before touching the DB
        self._validate_fixture(entries)
        known_topic_codes = {code for code, _, _ in TOPICS}
        for entry in entries:
            topic_code = entry.get("topic")
            if topic_code is not None and (
                not isinstance(topic_code, str) or topic_code not in known_topic_codes
            ):
                raise CommandError(
                    f"Fixture entry '{entry['starter_key']}' has unknown topic '{topic_code}'."
                )

        if publish_demo and not settings.DEBUG:
            raise CommandError(
                "--publish-demo is only available when settings.DEBUG is True."
            )

        created = 0
        updated = 0

        with transaction.atomic():
            # Keep the seed command self-sufficient while preserving all-or-nothing writes.
            from django.core.management import call_command

            call_command("seed_topics", stdout=StringIO())
            for entry in entries:
                pattern_code = entry.get("pattern")
                starter_key = entry["starter_key"]
                translations_data = entry["translations"]
                topic_code = entry.get("topic")

                # Ensure PatternType exists
                pt = None
                if pattern_code:
                    pt, _ = PatternType.objects.get_or_create(
                        code=pattern_code,
                        defaults={"name": pattern_code.replace("_", " ").title()},
                    )
                topic = Topic.objects.get(code=topic_code) if topic_code else None

                # Get or create the card
                card, was_created = ContentCard.objects.get_or_create(
                    starter_key=starter_key,
                    defaults={
                        "pattern_type": pt,
                        "topic": topic,
                        "author": None,
                        "status": ContentCard.Status.DRAFT,
                    },
                )

                if was_created:
                    created += 1
                    # Create translations
                    for lang, t_data in translations_data.items():
                        ContentCardTranslation.objects.create(
                            card=card,
                            language=lang,
                            title=t_data["title"],
                            body=t_data["body"],
                            action_text=t_data["action_text"],
                            support_note=t_data["support_note"],
                        )
                elif update and card.status == ContentCard.Status.DRAFT:
                    # Replace translations for draft cards only
                    card.pattern_type = pt
                    card.topic = topic
                    card.save(update_fields=["pattern_type", "topic", "updated_at"])
                    card.translations.all().delete()
                    for lang, t_data in translations_data.items():
                        ContentCardTranslation.objects.create(
                            card=card,
                            language=lang,
                            title=t_data["title"],
                            body=t_data["body"],
                            action_text=t_data["action_text"],
                            support_note=t_data["support_note"],
                        )
                    updated += 1

                if publish_demo and card.status == ContentCard.Status.DRAFT:
                    # Only allowed in DEBUG mode; bypasses draft-marker guard
                    card.status = ContentCard.Status.PUBLISHED
                    card.save(update_fields=["status", "updated_at"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {created}, updated: {updated}."
            )
        )

    @staticmethod
    def _validate_fixture(entries):
        """Abort with CommandError if any entry is invalid (writes nothing)."""
        required_langs = {"ar", "fr"}
        if not isinstance(entries, list):
            raise CommandError("Fixture must contain a list of cards.")
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                raise CommandError(f"Fixture entry[{i}] must be an object.")
            key = entry.get("starter_key", f"entry[{i}]")
            translations = entry.get("translations", {})
            if not isinstance(translations, dict):
                raise CommandError(f"Fixture entry '{key}' has invalid translations.")
            for lang in required_langs:
                if lang not in translations:
                    raise CommandError(
                        f"Fixture entry '{key}' is missing language '{lang}'."
                    )
                t = translations[lang]
                if not isinstance(t, dict) or not t.get("support_note"):
                    raise CommandError(
                        f"Fixture entry '{key}' / language '{lang}' is missing support_note."
                    )
