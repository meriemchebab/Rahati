"""Populate a clearly namespaced, fictional cast for product demos."""

import os
import secrets
from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from rahati.models import (
    AvailabilitySlot,
    CheckIn,
    JournalEntry,
    ProfessionalProfile,
    Session,
    User,
)
from rahati.services import free_slots


WOMEN = (
    ("demo_aya", "steady", (2, 6, 11, 15, 20, 24, 29, 33)),
    ("demo_lina", "declining", (1, 4, 8, 12, 16, 20, 24, 28, 32, 33)),
    ("demo_yasmine", "improving", (3, 7, 10, 14, 18, 22, 26, 30)),
    ("demo_amel", "steady_low", (0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33)),
    ("demo_fatima", "improving", (2, 5, 9, 13, 17, 21, 25, 29, 30, 32)),
)

PROFESSIONALS = (
    ("demo_dr_sara", "Dr Sara Demo", "Algiers", "16", "Demo District A"),
    ("demo_dr_imane", "Dr Imane Demo", "Oran", "31", "Demo District B"),
    ("demo_dr_nawal", "Dr Nawal Demo", "Constantine", "25", "Demo District C"),
)

PENDING_PROFESSIONAL = (
    "demo_dr_pending",
    "Dr Pending Demo",
    "Algiers",
    "16",
    "Demo District P",
)

JOURNAL_BODIES = (
    "[DEMO] I made a little time to rest today.",
    "[DEMO] A short walk helped me clear my head.",
    "[DEMO] I felt supported when I talked with someone I trust.",
    "[DEMO] I noticed my energy changed during the day.",
    "[DEMO] I am trying to be patient with myself.",
    "[DEMO] One small thing I appreciated today was a quiet moment.",
)

REFRESH_TEMP_DAYS = 10_000
SLOT_DURATION = timedelta(minutes=30)


class Command(BaseCommand):
    help = "Create fictional demo users and data (requires DEMO_SEED_ALLOWED=true)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--refresh",
            action="store_true",
            help="Shift existing demo check-ins, slots, and session times to today.",
        )

    def handle(self, *args, **options):
        if os.environ.get("DEMO_SEED_ALLOWED", "").strip().lower() != "true":
            raise CommandError("Refusing to seed demo data unless DEMO_SEED_ALLOWED=true.")

        shared_password = os.environ.get("DEMO_SHARED_PASSWORD", "")
        if shared_password and len(shared_password) < 16:
            raise CommandError("DEMO_SHARED_PASSWORD must contain at least 16 characters.")

        now = timezone.now()
        today = timezone.localdate(now)
        with transaction.atomic():
            women = {
                name: self._get_demo_user(name, User.Role.USER, shared_password)
                for name, _, _ in WOMEN
            }
            professional_profiles = {
                name: self._get_professional_profile(
                    name, display_name, city, wilaya, district,
                    ProfessionalProfile.Status.VERIFIED, now, shared_password,
                )
                for name, display_name, city, wilaya, district in PROFESSIONALS
            }
            self._get_professional_profile(
                *PENDING_PROFESSIONAL,
                ProfessionalProfile.Status.PENDING,
                now,
                shared_password,
            )

            woman_ids = [user.pk for user in women.values()]
            checkins = CheckIn.objects.filter(user_id__in=woman_ids)
            existing_dates = list(checkins.values_list("checkin_date", flat=True))
            anchor_date = max(existing_dates) if existing_dates else today

            if options["refresh"] and existing_dates:
                self._shift_demo_data(
                    women=women,
                    professionals=professional_profiles,
                    delta=today - anchor_date,
                )
                anchor_date = today

            for name, trend, skipped_days in WOMEN:
                user = women[name]
                if not CheckIn.objects.filter(user=user).exists():
                    self._seed_checkins(user, trend, skipped_days, anchor_date)

            aya = women["demo_aya"]
            if not JournalEntry.objects.filter(user=aya).exists():
                checkins_by_date = {
                    row.checkin_date: row
                    for row in CheckIn.objects.filter(user=aya)
                }
                for offset, body in enumerate(JOURNAL_BODIES):
                    checkin_date = anchor_date - timedelta(days=offset * 5)
                    JournalEntry.objects.create(
                        user=aya,
                        check_in=checkins_by_date.get(checkin_date),
                        body=body,
                    )

            self._ensure_free_slots(professional_profiles, now, anchor_date)
            self._ensure_sessions(women, professional_profiles, now)

        self.stdout.write(
            self.style.SUCCESS(
                "Demo cast ready: 5 women, 3 verified professionals, "
                "1 pending professional, check-ins, journals, slots, and sessions."
            )
        )

    @staticmethod
    def _get_demo_user(username, role, shared_password):
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={
                "role": role,
                "language": User.Language.FRENCH,
                "email": None,
                "phone": None,
            },
        )
        user.role = role
        user.language = User.Language.FRENCH
        user.email = None
        user.phone = None
        user.is_active = True
        user.is_staff = False
        user.is_superuser = False
        user.set_password(shared_password or secrets.token_urlsafe(24))
        user.save(
            update_fields=(
                "role", "language", "email", "phone", "is_active",
                "is_staff", "is_superuser", "password",
            )
        )
        return user

    @classmethod
    def _get_professional_profile(
        cls, username, display_name, city, wilaya, district, status, now, shared_password
    ):
        user = cls._get_demo_user(username, User.Role.PROFESSIONAL, shared_password)
        profile, _ = ProfessionalProfile.objects.get_or_create(user=user)
        profile.display_name = display_name
        profile.bio = (
            f"Fictional demo profile for {display_name}. "
            "This biography and all contact details are invented."
        )
        profile.city = city
        profile.wilaya = wilaya
        profile.address = f"DEMO ONLY — {district}, {city}"
        profile.status = status
        profile.verified_at = now if status == ProfessionalProfile.Status.VERIFIED else None
        profile.verified_by = None
        profile.credential_uploaded_at = None
        profile.terms_accepted_at = None
        profile.save()
        return profile

    @staticmethod
    def _seed_checkins(user, trend, skipped_days, anchor_date):
        skipped = set(skipped_days)
        for day_index in range(35):
            if day_index in skipped:
                continue
            if trend == "declining":
                mood = 5 - round(4 * day_index / 34)
            elif trend == "improving":
                mood = 1 + round(4 * day_index / 34)
            elif trend == "steady_low":
                mood = 2 + (1 if day_index % 9 in (0, 1, 2) else 0)
            else:
                mood = 3 + (1 if day_index % 8 in (1, 2, 5) else 0)
            energy = max(1, min(5, mood + ((day_index % 5) - 2) // 2))
            CheckIn.objects.get_or_create(
                user=user,
                checkin_date=anchor_date - timedelta(days=34 - day_index),
                defaults={"mood": mood, "energy": energy},
            )

    @staticmethod
    def _ensure_free_slots(profiles, now, anchor_date):
        # Eight bookable 30-minute slots per professional, spread across four
        # of the next seven local dates and split across both visit modes.
        local_tz = timezone.get_default_timezone()
        for profile in profiles.values():
            for day_offset, hours in ((1, (9, 10)), (5, (9, 10)), (6, (9, 10)), (7, (9, 10))):
                slot_date = anchor_date + timedelta(days=day_offset)
                for index, hour in enumerate(hours):
                    start = timezone.make_aware(
                        datetime.combine(slot_date, time(hour, 0)), local_tz
                    )
                    if start <= now:
                        continue
                    AvailabilitySlot.objects.get_or_create(
                        professional=profile.user,
                        starts_at=start,
                        defaults={
                            "ends_at": start + SLOT_DURATION,
                            "mode": (
                                AvailabilitySlot.Mode.ONLINE
                                if (day_offset + index) % 2
                                else AvailabilitySlot.Mode.IN_PERSON
                            ),
                            "source": AvailabilitySlot.Source.MANUAL,
                        },
                    )

            # If a demo slot has since been booked or closed, top the free
            # inventory back up with additional deterministic candidates.
            upper_bound = now + timedelta(days=7)
            for day_offset in range(1, 7):
                for hour in range(9, 17):
                    if free_slots(now=now).filter(
                        professional=profile.user,
                        starts_at__lt=upper_bound,
                    ).count() >= 6:
                        break
                    start = timezone.make_aware(
                        datetime.combine(anchor_date + timedelta(days=day_offset), time(hour, 0)),
                        local_tz,
                    )
                    if start <= now:
                        continue
                    AvailabilitySlot.objects.get_or_create(
                        professional=profile.user,
                        starts_at=start,
                        defaults={
                            "ends_at": start + SLOT_DURATION,
                            "mode": (
                                AvailabilitySlot.Mode.ONLINE
                                if hour % 2
                                else AvailabilitySlot.Mode.IN_PERSON
                            ),
                            "source": AvailabilitySlot.Source.MANUAL,
                        },
                    )
                if free_slots(now=now).filter(
                    professional=profile.user,
                    starts_at__lt=upper_bound,
                ).count() >= 6:
                    break

    @staticmethod
    def _ensure_sessions(women, profiles, now):
        assignments = (
            ("demo_aya", "demo_dr_sara", Session.Status.ACCEPTED, AvailabilitySlot.Mode.ONLINE, timedelta(hours=48)),
            ("demo_lina", "demo_dr_imane", Session.Status.REQUESTED, AvailabilitySlot.Mode.IN_PERSON, timedelta(hours=72)),
            ("demo_amel", "demo_dr_nawal", Session.Status.COMPLETED, AvailabilitySlot.Mode.ONLINE, -timedelta(days=3)),
            ("demo_yasmine", "demo_dr_sara", Session.Status.CANCELLED, AvailabilitySlot.Mode.IN_PERSON, timedelta(hours=96)),
        )
        for woman_name, professional_name, status, mode, offset in assignments:
            woman = women[woman_name]
            professional = profiles[professional_name].user
            existing = Session.objects.filter(
                user=woman,
                slot__professional=professional,
            ).order_by("pk").first()
            if existing:
                continue
            starts_at = now + offset
            slot, _ = AvailabilitySlot.objects.get_or_create(
                professional=professional,
                starts_at=starts_at,
                defaults={
                    "ends_at": starts_at + SLOT_DURATION,
                    "mode": mode,
                    "source": AvailabilitySlot.Source.MANUAL,
                },
            )
            if slot.mode != mode or slot.ends_at != starts_at + SLOT_DURATION:
                slot.mode = mode
                slot.ends_at = starts_at + SLOT_DURATION
                slot.save(update_fields=["mode", "ends_at"])
            Session.objects.create(user=woman, slot=slot, status=status)

    @staticmethod
    def _shift_demo_data(women, professionals, delta):
        if not delta.days:
            return
        demo_checkins = CheckIn.objects.filter(user__in=women.values())
        for checkin in demo_checkins.iterator():
            checkin.checkin_date += delta
            checkin.save(update_fields=["checkin_date"])

        demo_slots = AvailabilitySlot.objects.filter(
            professional__in=[profile.user for profile in professionals.values()]
        )
        temporary_delta = timedelta(days=REFRESH_TEMP_DAYS)
        for slot in demo_slots.iterator():
            slot.starts_at += temporary_delta
            slot.ends_at += temporary_delta
            slot.save(update_fields=["starts_at", "ends_at"])
        for slot in demo_slots.iterator():
            slot.starts_at += delta - temporary_delta
            slot.ends_at += delta - temporary_delta
            slot.save(update_fields=["starts_at", "ends_at"])
