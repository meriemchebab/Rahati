import os
from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone

from rahati.management.commands.seed_demo import PROFESSIONALS, WOMEN
from rahati.models import (
    AvailabilitySlot,
    CheckIn,
    JournalEntry,
    ProfessionalProfile,
    Session,
    User,
)
from rahati.services import free_slots


ALGIERS = ZoneInfo("Africa/Algiers")
SHARED_PASSWORD = "Demo-Only-Shared-Password-2026!"


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
)
class SeedDemoTests(TestCase):
    def run_seed(self, now, refresh=False):
        with patch.dict(
            os.environ,
            {
                "DEMO_SEED_ALLOWED": "true",
                "DEMO_SHARED_PASSWORD": SHARED_PASSWORD,
            },
        ), patch(
            "rahati.management.commands.seed_demo.timezone.now", return_value=now
        ):
            call_command("seed_demo", refresh=refresh, verbosity=0)

    def test_refuses_without_opt_in_before_touching_database(self):
        outsider = User.objects.create_user(
            username="ordinary_user", password="unrelated-password"
        )
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("DEMO_SEED_ALLOWED", None)
            with self.assertRaisesMessage(CommandError, "DEMO_SEED_ALLOWED=true"):
                call_command("seed_demo")

        self.assertFalse(User.objects.filter(username__startswith="demo_").exists())
        outsider.refresh_from_db()
        self.assertEqual(outsider.username, "ordinary_user")

    def test_rejects_short_shared_password(self):
        with patch.dict(
            os.environ,
            {"DEMO_SEED_ALLOWED": "true", "DEMO_SHARED_PASSWORD": "too-short"},
        ), self.assertRaisesMessage(CommandError, "at least 16 characters"):
            call_command("seed_demo")
        self.assertFalse(User.objects.filter(username__startswith="demo_").exists())

    def test_seeds_fictional_cast_checkins_journals_slots_and_sessions(self):
        now = datetime(2026, 10, 30, 10, 15, tzinfo=ALGIERS)
        self.run_seed(now)
        self.run_seed(now)

        women = User.objects.filter(username__in=[row[0] for row in WOMEN])
        self.assertEqual(women.count(), 5)
        for woman in women:
            self.assertIsNone(woman.email)
            self.assertIsNone(woman.phone)
            self.assertTrue(woman.check_password(SHARED_PASSWORD))

        checkin_counts = {
            username: CheckIn.objects.filter(user__username=username).count()
            for username, _, _ in WOMEN
        }
        self.assertEqual(
            checkin_counts,
            {username: 35 - len(skipped) for username, _, skipped in WOMEN},
        )
        for username, _, skipped in WOMEN:
            self.assertGreaterEqual(len(skipped) / 35, 0.20, username)
            self.assertLessEqual(len(skipped) / 35, 0.35, username)
        for username in checkin_counts:
            self.assertEqual(
                CheckIn.objects.filter(user__username=username).latest("checkin_date").checkin_date,
                now.date(),
            )

        lina = User.objects.get(username="demo_lina")
        yasmine = User.objects.get(username="demo_yasmine")
        self.assertGreater(
            CheckIn.objects.get(user=lina, checkin_date=now.date() - timedelta(days=34)).mood,
            CheckIn.objects.get(user=lina, checkin_date=now.date()).mood,
        )
        self.assertLess(
            CheckIn.objects.get(user=yasmine, checkin_date=now.date() - timedelta(days=34)).mood,
            CheckIn.objects.get(user=yasmine, checkin_date=now.date()).mood,
        )
        self.assertEqual(JournalEntry.objects.filter(user__username="demo_aya").count(), 6)

        for username, _, city, wilaya, district in PROFESSIONALS:
            profile = ProfessionalProfile.objects.get(user__username=username)
            self.assertEqual(profile.status, ProfessionalProfile.Status.VERIFIED)
            self.assertEqual(profile.city, city)
            self.assertEqual(profile.wilaya, wilaya)
            self.assertIn("DEMO ONLY", profile.address)
            self.assertIn(district, profile.address)

        pending = ProfessionalProfile.objects.get(user__username="demo_dr_pending")
        self.assertEqual(pending.status, ProfessionalProfile.Status.PENDING)

        for professional in User.objects.filter(
            username__in=("demo_dr_sara", "demo_dr_imane", "demo_dr_nawal")
        ):
            self.assertGreaterEqual(
                free_slots(now=now).filter(
                    professional=professional,
                    starts_at__lt=now + timedelta(days=7),
                ).count(),
                6,
            )
            self.assertEqual(
                AvailabilitySlot.objects.filter(professional=professional)
                .values_list("mode", flat=True)
                .distinct()
                .count(),
                2,
            )

        accepted = Session.objects.get(
            user__username="demo_aya", status=Session.Status.ACCEPTED
        )
        self.assertEqual(accepted.slot.mode, AvailabilitySlot.Mode.ONLINE)
        self.assertEqual(accepted.slot.starts_at, now + timedelta(hours=48))
        self.assertEqual(
            Session.objects.get(user__username="demo_lina").status,
            Session.Status.REQUESTED,
        )
        completed = Session.objects.get(user__username="demo_amel")
        self.assertEqual(completed.status, Session.Status.COMPLETED)
        self.assertLess(completed.slot.starts_at, now)
        self.assertEqual(
            Session.objects.get(user__username="demo_yasmine").status,
            Session.Status.CANCELLED,
        )

    def test_refresh_moves_demo_dates_and_session_slots_to_current_date(self):
        old_now = datetime(2026, 10, 20, 10, 15, tzinfo=ALGIERS)
        new_now = old_now + timedelta(days=7)
        self.run_seed(old_now)
        old_checkin_dates = list(
            CheckIn.objects.filter(user__username__startswith="demo_")
            .order_by("checkin_date")
            .values_list("checkin_date", flat=True)
        )
        old_slot_starts = list(
            AvailabilitySlot.objects.filter(professional__username__startswith="demo_dr_")
            .order_by("starts_at")
            .values_list("starts_at", flat=True)
        )
        old_accepted_start = Session.objects.get(
            user__username="demo_aya", status=Session.Status.ACCEPTED
        ).slot.starts_at

        self.run_seed(new_now, refresh=True)

        new_checkin_dates = list(
            CheckIn.objects.filter(user__username__startswith="demo_")
            .order_by("checkin_date")
            .values_list("checkin_date", flat=True)
        )
        new_slot_starts = list(
            AvailabilitySlot.objects.filter(professional__username__startswith="demo_dr_")
            .order_by("starts_at")
            .values_list("starts_at", flat=True)
        )
        self.assertEqual(new_checkin_dates, [value + timedelta(days=7) for value in old_checkin_dates])
        self.assertEqual(new_slot_starts, [value + timedelta(days=7) for value in old_slot_starts])
        self.assertEqual(max(new_checkin_dates), new_now.date())
        refreshed_accepted = Session.objects.get(
            user__username="demo_aya", status=Session.Status.ACCEPTED
        )
        self.assertEqual(refreshed_accepted.slot.starts_at, old_accepted_start + timedelta(days=7))
        self.assertEqual(refreshed_accepted.slot.starts_at, new_now + timedelta(hours=48))

    def test_seed_does_not_change_non_demo_records(self):
        outsider = User.objects.create_user(username="ordinary_user", password="safe-password")
        checkin = CheckIn.objects.create(
            user=outsider, checkin_date=datetime(2026, 10, 1).date(), mood=2, energy=3
        )
        professional = User.objects.create_user(
            username="ordinary_professional", password="safe-password", role=User.Role.PROFESSIONAL
        )
        slot = AvailabilitySlot.objects.create(
            professional=professional,
            starts_at=datetime(2026, 11, 1, 10, tzinfo=ALGIERS),
            ends_at=datetime(2026, 11, 1, 10, 30, tzinfo=ALGIERS),
            mode=AvailabilitySlot.Mode.ONLINE,
        )

        self.run_seed(datetime(2026, 10, 30, 10, 15, tzinfo=ALGIERS))

        checkin.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(checkin.checkin_date, datetime(2026, 10, 1).date())
        self.assertEqual(slot.starts_at, datetime(2026, 11, 1, 10, tzinfo=ALGIERS))
