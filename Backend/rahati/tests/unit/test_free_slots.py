from datetime import timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AvailabilitySlot, ProfessionalProfile, Session, User
from rahati.services import free_slots


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    APPEND_SLASH=False,
    SECURE_SSL_REDIRECT=False,
)
class FreeSlotsTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.patient = self.make_user("slot_patient")

    def make_user(self, username, role="user", is_active=True):
        user = User.objects.create_user(
            username=username, password="password123", role=role, is_active=is_active
        )
        return user

    def make_professional(self, username, verified=True, active=True, wilaya=""):
        user = self.make_user(username, role="professional", is_active=active)
        profile = ProfessionalProfile.objects.create(
            user=user,
            display_name=username,
            city="Algiers",
            wilaya=wilaya,
            credential_file="credentials/test.pdf",
            status=(
                ProfessionalProfile.Status.VERIFIED
                if verified
                else ProfessionalProfile.Status.PENDING
            ),
        )
        return user, profile

    def make_slot(self, professional, starts_at, mode="online"):
        return AvailabilitySlot.objects.create(
            professional=professional,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=1),
            mode=mode,
        )

    def test_free_slot_definition_table(self):
        cases = (
            ("beyond_minimum_lead", 60, True, True, None, True),
            ("inside_minimum_lead", 59, True, True, None, False),
            ("exactly_now", 0, True, True, None, False),
            ("past", -1, True, True, None, False),
            ("inactive_professional", 120, True, False, None, False),
            ("unverified_professional", 120, False, True, None, False),
            ("requested_session", 120, True, True, "requested", False),
            ("accepted_session", 120, True, True, "accepted", False),
            ("declined_session", 120, True, True, "declined", True),
            ("cancelled_session", 120, True, True, "cancelled", True),
            ("completed_session", 120, True, True, "completed", True),
        )
        slots = {}
        for name, minutes, verified, active, session_status, _ in cases:
            professional, _ = self.make_professional(
                f"pro_{name}", verified=verified, active=active
            )
            slot = self.make_slot(professional, self.now + timedelta(minutes=minutes))
            slots[name] = slot
            if session_status:
                Session.objects.create(
                    user=self.patient, slot=slot, status=session_status
                )

        actual_ids = set(
            free_slots(now=self.now).filter(pk__in=[slot.pk for slot in slots.values()])
            .values_list("pk", flat=True)
        )
        for name, _, _, _, _, expected in cases:
            with self.subTest(case=name):
                self.assertEqual(slots[name].pk in actual_ids, expected)

    def test_free_slots_view_and_booking_share_the_same_eligibility(self):
        professional, _ = self.make_professional("pro_consistency", wilaya="16")
        future = self.make_slot(professional, self.now + timedelta(hours=2))
        taken = self.make_slot(professional, self.now + timedelta(hours=3))
        too_soon = self.make_slot(professional, self.now + timedelta(minutes=30))
        Session.objects.create(user=self.patient, slot=taken, status=Session.Status.REQUESTED)

        expected_ids = set(
            free_slots().filter(professional=professional).values_list("pk", flat=True)
        )
        client = APIClient()
        client.force_authenticate(self.patient)
        listed = client.get(f"/api/professionals/{professional.pk}/slots")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual({row["id"] for row in listed.data}, expected_ids)

        for slot in (future, taken, too_soon):
            with self.subTest(slot=slot.pk):
                response = client.post("/api/sessions", {"slot": slot.pk}, format="json")
                if slot.pk in expected_ids:
                    self.assertEqual(response.status_code, 201)
                elif slot == taken:
                    self.assertEqual(response.status_code, 409)
                else:
                    self.assertEqual(response.status_code, 404)

    def test_in_person_slots_require_a_profile_wilaya_but_online_slots_do_not(self):
        professional, profile = self.make_professional("pro_modes")
        client = APIClient()
        client.force_authenticate(professional)
        starts_at = timezone.now() + timedelta(days=2)

        def post_slot(mode):
            return client.post(
                "/api/pro/slots",
                {
                    "starts_at": starts_at.isoformat(),
                    "ends_at": (starts_at + timedelta(hours=1)).isoformat(),
                    "mode": mode,
                },
                format="json",
            )

        in_person = post_slot("in_person")
        self.assertEqual(in_person.status_code, 400)
        self.assertIn("wilaya_required", str(in_person.data))
        self.assertEqual(post_slot("online").status_code, 201)

        profile.wilaya = "16"
        profile.save(update_fields=["wilaya"])
        starts_at += timedelta(hours=2)
        self.assertEqual(post_slot("in_person").status_code, 201)
