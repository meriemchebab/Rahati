import re
from datetime import timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AvailabilitySlot, ProfessionalProfile, Session, User


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
    APPEND_SLASH=False,
)
class SessionMeetingTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="meeting_patient", password="password123", role=User.Role.USER
        )
        self.other_patient = User.objects.create_user(
            username="meeting_other_patient", password="password123", role=User.Role.USER
        )
        self.professional = self.make_professional("meeting_professional")
        self.other_professional = self.make_professional("meeting_other_professional")
        self.professional.professional_profile.address = "42 Private Street"
        self.professional.professional_profile.save(update_fields=["address"])

    def make_professional(self, username):
        user = User.objects.create_user(
            username=username, password="password123", role=User.Role.PROFESSIONAL
        )
        ProfessionalProfile.objects.create(
            user=user,
            display_name=username,
            city="Algiers",
            address="",
            credential_file="credentials/test.pdf",
            status=ProfessionalProfile.Status.VERIFIED,
        )
        return user

    def make_slot(self, mode=AvailabilitySlot.Mode.ONLINE, offset=0):
        starts_at = timezone.now() + timedelta(days=2, minutes=offset)
        return AvailabilitySlot.objects.create(
            professional=self.professional,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=30),
            mode=mode,
        )

    def book(self, slot=None, patient=None):
        return self.client_for(patient or self.patient).post(
            "/api/sessions",
            {"slot": (slot or self.make_slot()).pk},
            format="json",
        )

    @staticmethod
    def client_for(user=None):
        client = APIClient()
        if user is not None:
            client.force_authenticate(user)
        return client

    def accept(self, session_id):
        return self.client_for(self.professional).patch(
            f"/api/sessions/{session_id}", {"status": "accepted"}, format="json"
        )

    def test_accepting_online_session_generates_random_link_and_reveals_to_both_participants(self):
        booked = self.book()
        self.assertEqual(booked.status_code, 201)
        self.assertNotIn("meeting_link", booked.data)
        self.assertNotIn("professional_address", booked.data)

        accepted = self.accept(booked.data["id"])
        self.assertEqual(accepted.status_code, 200)
        link = accepted.data["meeting_link"]
        self.assertRegex(link, re.compile(r"^https://meet\.jit\.si/rahati-[0-9a-f]{32}$"))
        self.assertNotIn("professional_address", accepted.data)
        self.assertEqual(Session.objects.get(pk=booked.data["id"]).meeting_link, link)

        for participant in (self.patient, self.professional):
            fetched = self.client_for(participant).get(f"/api/sessions/{booked.data['id']}")
            self.assertEqual(fetched.status_code, 200)
            self.assertEqual(fetched.data["meeting_link"], link)
            self.assertNotIn("professional_address", fetched.data)

    def test_accepting_in_person_session_reveals_address_without_a_link(self):
        booked = self.book(self.make_slot(AvailabilitySlot.Mode.IN_PERSON))
        accepted = self.accept(booked.data["id"])
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.data["professional_address"], "42 Private Street")
        self.assertNotIn("meeting_link", accepted.data)

    def test_pending_and_declined_sessions_do_not_return_link_or_address(self):
        booked = self.book()
        pending = self.client_for(self.patient).get(f"/api/sessions/{booked.data['id']}")
        self.assertEqual(pending.status_code, 200)
        self.assertNotIn("meeting_link", pending.data)
        self.assertNotIn("professional_address", pending.data)

        declined = self.client_for(self.professional).patch(
            f"/api/sessions/{booked.data['id']}", {"status": "declined"}, format="json"
        )
        self.assertEqual(declined.status_code, 200)
        self.assertNotIn("meeting_link", declined.data)
        self.assertNotIn("professional_address", declined.data)

    def test_two_online_sessions_get_different_links(self):
        first = self.book()
        second = self.book(self.make_slot(offset=60))
        first_accepted = self.accept(first.data["id"])
        second_accepted = self.accept(second.data["id"])
        self.assertEqual(first_accepted.status_code, 200)
        self.assertEqual(second_accepted.status_code, 200)
        self.assertNotEqual(first_accepted.data["meeting_link"], second_accepted.data["meeting_link"])

    def test_get_and_repeated_accept_preserve_the_same_link(self):
        booked = self.book()
        accepted = self.accept(booked.data["id"])
        link = accepted.data["meeting_link"]

        repeated = self.accept(booked.data["id"])
        fetched = self.client_for(self.patient).get(f"/api/sessions/{booked.data['id']}")
        fetched_again = self.client_for(self.patient).get(f"/api/sessions/{booked.data['id']}")
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(repeated.data["meeting_link"], link)
        self.assertEqual(fetched.data["meeting_link"], link)
        self.assertEqual(fetched_again.data["meeting_link"], link)

    def test_nonparticipants_cannot_fetch_or_accept_another_professional_session(self):
        booked = self.book()
        other_patient = self.client_for(self.other_patient).get(f"/api/sessions/{booked.data['id']}")
        other_professional = self.client_for(self.other_professional).get(
            f"/api/sessions/{booked.data['id']}"
        )
        attempted_accept = self.client_for(self.other_professional).patch(
            f"/api/sessions/{booked.data['id']}", {"status": "accepted"}, format="json"
        )
        self.assertEqual(other_patient.status_code, 404)
        self.assertEqual(other_professional.status_code, 404)
        self.assertEqual(attempted_accept.status_code, 403)

    def test_session_endpoints_require_authentication(self):
        booked = self.book()
        anonymous = self.client_for()
        self.assertEqual(anonymous.get("/api/sessions").status_code, 401)
        self.assertEqual(anonymous.get(f"/api/sessions/{booked.data['id']}").status_code, 401)
        self.assertEqual(
            anonymous.patch(f"/api/sessions/{booked.data['id']}", {"status": "accepted"}).status_code,
            401,
        )

    def test_patient_cannot_accept_session_or_trigger_link_creation(self):
        booked = self.book()
        response = self.client_for(self.patient).patch(
            f"/api/sessions/{booked.data['id']}", {"status": "accepted"}, format="json"
        )
        session = Session.objects.get(pk=booked.data["id"])
        self.assertEqual(response.status_code, 403)
        self.assertEqual(session.status, Session.Status.REQUESTED)
        self.assertIsNone(session.meeting_link)

    def test_cancelling_accepted_session_hides_previously_generated_link(self):
        booked = self.book()
        accepted = self.accept(booked.data["id"])
        self.assertIn("meeting_link", accepted.data)

        cancelled = self.client_for(self.patient).patch(
            f"/api/sessions/{booked.data['id']}", {"status": "cancelled"}, format="json"
        )
        fetched = self.client_for(self.patient).get(f"/api/sessions/{booked.data['id']}")
        self.assertEqual(cancelled.status_code, 200)
        self.assertNotIn("meeting_link", cancelled.data)
        self.assertNotIn("professional_address", cancelled.data)
        self.assertNotIn("meeting_link", fetched.data)

