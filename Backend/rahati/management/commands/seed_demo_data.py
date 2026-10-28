"""Seed the reference topics and starter content used by the demo."""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed reference topics and starter content for the demo."

    def handle(self, *args, **options):
        call_command("seed_topics")
        call_command("seed_starter_cards")
        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
