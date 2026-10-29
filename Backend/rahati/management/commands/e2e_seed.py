"""Seed disposable, deterministic data for the Playwright suite."""

from datetime import timedelta

import os

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from rahati.models import AvailabilitySlot, ProfessionalProfile, Session, User


class Command(BaseCommand):
    help = "Create test-only users and slots for the E2E environment."

    def handle(self, *args, **options):
        if os.environ.get("DJANGO_SETTINGS_MODULE") != "config.e2e_settings":
            raise CommandError("e2e_seed is available only with config.e2e_settings.")

        woman = User.objects.create_user(
            username="e2e_woman",
            password="E2E-only-Password-2026!",
            role=User.Role.USER,
        )
        existing_woman = User.objects.create_user(
            username="e2e_existing_woman",
            password="E2E-only-Password-2026!",
            role=User.Role.USER,
        )
        professional = User.objects.create_user(
            username="e2e_professional",
            password="E2E-only-Password-2026!",
            role=User.Role.PROFESSIONAL,
        )
        ProfessionalProfile.objects.create(
            user=professional,
            display_name="E2E Test Professional",
            city="Algiers",
            wilaya="16",
            credential_file="e2e/fixture.pdf",
            status=ProfessionalProfile.Status.VERIFIED,
            verified_at=timezone.now(),
        )

        now = timezone.now()
        AvailabilitySlot.objects.create(
            professional=professional,
            starts_at=now + timedelta(hours=2),
            ends_at=now + timedelta(hours=2, minutes=30),
            mode=AvailabilitySlot.Mode.ONLINE,
        )
        already_taken = AvailabilitySlot.objects.create(
            professional=professional,
            starts_at=now + timedelta(hours=4),
            ends_at=now + timedelta(hours=4, minutes=30),
            mode=AvailabilitySlot.Mode.ONLINE,
        )
        AvailabilitySlot.objects.create(
            professional=professional,
            starts_at=now + timedelta(minutes=30),
            ends_at=now + timedelta(hours=1),
            mode=AvailabilitySlot.Mode.ONLINE,
        )
        Session.objects.create(user=existing_woman, slot=already_taken)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded E2E accounts and one bookable slot for woman {woman.pk}."
            )
        )
