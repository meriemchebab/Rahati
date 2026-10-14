"""Management command: seed_starter_cards.

Creates the 6 platform starter cards from the fixture file. Idempotent.

Usage:
    python manage.py seed_starter_cards
    python manage.py seed_starter_cards --update       # update translations of draft cards
    python manage.py seed_starter_cards --publish-demo # publish (DEBUG=True only)
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from rahati.models import ContentCard, ContentCardTranslation, PatternType

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "fixtures" / "starter_cards.json"
DRAFT_MARKER = "[DRAFT - NOT REVIEWED]"


class Command(BaseCommand):
    help = "Seed the 6 starter platform content cards (idempotent)."

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

        if publish_demo and not settings.DEBUG:
            raise CommandError(
                "--publish-demo is only available when settings.DEBUG is True."
            )

        created = 0
        updated = 0

        with transaction.atomic():
            for entry in entries:
                pattern_code = entry["pattern"]
                starter_key = entry["starter_key"]
                translations_data = entry["translations"]

                # Ensure PatternType exists
                pt, _ = PatternType.objects.get_or_create(
                    code=pattern_code,
                    defaults={"name": pattern_code.replace("_", " ").title()},
                )

                # Get or create the card
                card, was_created = ContentCard.objects.get_or_create(
                    starter_key=starter_key,
                    defaults={
                        "pattern_type": pt,
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
        for i, entry in enumerate(entries):
            key = entry.get("starter_key", f"entry[{i}]")
            translations = entry.get("translations", {})
            for lang in required_langs:
                if lang not in translations:
                    raise CommandError(
                        f"Fixture entry '{key}' is missing language '{lang}'."
                    )
                t = translations[lang]
                if not t.get("support_note"):
                    raise CommandError(
                        f"Fixture entry '{key}' / language '{lang}' is missing support_note."
                    )
