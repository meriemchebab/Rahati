from django.test import TestCase


# Create your tests here.


"""Tests for the Rahati MVP. Run with:  python manage.py test rahati

They protect the rules that matter most for this product: privacy (consent,
encryption, deletion), booking correctness, and who is allowed to do what.
"""
from datetime import timedelta

from cryptography.fernet import Fernet
from django.db import connection
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    AuditLog,
    AvailabilitySlot,
    CheckIn,
    ContentCard,
    ContentCardTranslation,
    CycleStart,
    JournalEntry,
    PatternType,
    ProfessionalProfile,
    Session,
    SessionNote,
    SharingConsent,
    Todo,
    User,
    UserPattern,
    WeeklySummary,
)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def make_user(name, role="user", language="ar"):
    user = User(username=name, role=role, language=language)
    user.set_password("password123")
    user.save()
    return user


def make_professional(name, status="verified"):
    user = make_user(name, role="professional")
    ProfessionalProfile.objects.create(
        user=user, display_name=name.title(), city="Algiers",
        credential_file="credentials/diploma.pdf", status=status,
    )
    return user


def api(user=None):
    client = APIClient()
    if user:
        client.force_authenticate(user)
    return client


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    # Fast hasher for tests only: the real one is deliberately slow.
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class BaseCase(TestCase):
    """Two women, a verified professional, an unverified one and one future slot."""

    def setUp(self):
        self.nour = make_user("nour")
        self.lina = make_user("lina")
        self.pro = make_professional("dr_sara")
        self.pending_pro = make_professional("dr_pending", status="pending")
        self.slot = self.make_slot(self.pro)
        self.today = timezone.localdate()

    def make_slot(self, professional, days=2):
        start = timezone.now() + timedelta(days=days)
        return AvailabilitySlot.objects.create(
            professional=professional, starts_at=start,
            ends_at=start + timedelta(hours=1), mode="online",
        )

    def book(self, user, slot=None):
        return api(user).post("/api/sessions", {"slot": (slot or self.slot).id}, format="json")

    def accepted_session(self, user=None):
        """A session that the professional has already accepted."""
        user = user or self.nour
        session_id = self.book(user).data["id"]
        api(self.pro).patch(f"/api/sessions/{session_id}", {"status": "accepted"}, format="json")
        return session_id

    def consent(self, user, category, granted=True, pro=None):
        return api(user).put(
            "/api/consents",
            {"professional": (pro or self.pro).id, "category": category, "granted": granted},
            format="json",
        )


# --------------------------------------------------------------------------
# Accounts
# --------------------------------------------------------------------------
class AccountTests(BaseCase):
    def test_register_always_creates_a_user_role(self):
        res = api().post(
            "/api/auth/register",
            {"nickname": "sneaky", "password": "password123", "role": "admin"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(username="sneaky").role, "user")

    def test_many_women_can_register_without_email_or_phone(self):
        for name in ("a_one", "a_two", "a_three"):
            res = api().post(
                "/api/auth/register",
                {"nickname": name, "password": "password123", "email": "", "phone": ""},
                format="json",
            )
            self.assertEqual(res.status_code, 201)

    def test_duplicate_nickname_is_refused(self):
        res = api().post(
            "/api/auth/register", {"nickname": "nour", "password": "password123"}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_login_returns_tokens(self):
        res = api().post(
            "/api/auth/login", {"username": "nour", "password": "password123"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_me_returns_role_and_language(self):
        res = api(self.nour).get("/api/me")
        self.assertEqual(res.data["role"], "user")
        self.assertEqual(res.data["language"], "ar")

    def test_anonymous_requests_are_refused(self):
        self.assertEqual(api().get("/api/check-ins").status_code, 401)

    def test_delete_me_removes_everything_she_owns_and_nothing_else(self):
        CheckIn.objects.create(user=self.nour, checkin_date=self.today, mood=3, energy=3)
        CheckIn.objects.create(user=self.lina, checkin_date=self.today, mood=4, energy=4)
        JournalEntry.objects.create(user=self.nour, body="private")
        CycleStart.objects.create(user=self.nour, start_date=self.today)
        Todo.objects.create(user=self.nour, title="walk")
        self.accepted_session(self.nour)
        self.consent(self.nour, "mood")
        log = AuditLog.objects.create(actor=self.nour, action="x", target_type="user", target_id=1)

        self.assertEqual(api(self.nour).delete("/api/me").status_code, 204)

        self.assertFalse(User.objects.filter(username="nour").exists())
        for model in (JournalEntry, CycleStart, Todo, Session, SharingConsent):
            self.assertEqual(model.objects.count(), 0, model.__name__)
        self.assertEqual(CheckIn.objects.count(), 1)  # lina's row survives
        log.refresh_from_db()
        self.assertIsNone(log.actor)  # the log stays, the link to her is gone


# --------------------------------------------------------------------------
# Tracking: the Preventing loop
# --------------------------------------------------------------------------
class TrackingTests(BaseCase):
    def test_checkin_posted_twice_the_same_day_edits_the_first(self):
        client = api(self.nour)
        body = {"checkin_date": str(self.today), "mood": 2, "energy": 3}
        self.assertEqual(client.post("/api/check-ins", body, format="json").status_code, 201)
        body["mood"] = 5
        self.assertEqual(client.post("/api/check-ins", body, format="json").status_code, 200)
        self.assertEqual(CheckIn.objects.filter(user=self.nour).count(), 1)
        self.assertEqual(CheckIn.objects.get(user=self.nour).mood, 5)

    def test_checkin_rejects_future_dates_and_out_of_range_scores(self):
        client = api(self.nour)
        future = {"checkin_date": str(self.today + timedelta(days=1)), "mood": 3, "energy": 3}
        self.assertEqual(client.post("/api/check-ins", future, format="json").status_code, 400)
        for bad in (0, 6):
            body = {"checkin_date": str(self.today), "mood": bad, "energy": 3}
            self.assertEqual(client.post("/api/check-ins", body, format="json").status_code, 400)

    def test_a_woman_only_sees_her_own_checkins(self):
        CheckIn.objects.create(user=self.lina, checkin_date=self.today, mood=1, energy=1)
        self.assertEqual(api(self.nour).get("/api/check-ins").data, [])

    def test_cycle_start_is_idempotent_and_needs_a_date(self):
        client = api(self.nour)
        body = {"start_date": str(self.today)}
        self.assertEqual(client.post("/api/cycle-starts", body, format="json").status_code, 201)
        self.assertEqual(client.post("/api/cycle-starts", body, format="json").status_code, 200)
        self.assertEqual(CycleStart.objects.filter(user=self.nour).count(), 1)
        self.assertEqual(client.post("/api/cycle-starts", {}, format="json").status_code, 400)

    def test_journal_is_encrypted_at_rest_but_readable_through_the_api(self):
        res = api(self.nour).post("/api/journal", {"body": "my private thought"}, format="json")
        self.assertEqual(res.status_code, 201)
        with connection.cursor() as cursor:
            cursor.execute("SELECT body FROM rahati_journalentry")
            raw = cursor.fetchone()[0]
        self.assertNotIn("private", raw)
        self.assertEqual(api(self.nour).get("/api/journal").data[0]["body"], "my private thought")

    def test_journal_cannot_be_attached_to_someone_elses_checkin(self):
        theirs = CheckIn.objects.create(user=self.lina, checkin_date=self.today, mood=3, energy=3)
        res = api(self.nour).post(
            "/api/journal", {"body": "x", "check_in": theirs.id}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_patterns_endpoint_returns_recent_patterns_and_latest_summary(self):
        mood_dip = PatternType.objects.create(code="mood_dip", name="Mood dip")
        UserPattern.objects.create(
            user=self.nour, pattern_type=mood_dip,
            window_start=self.today - timedelta(days=5), window_end=self.today, value=-0.8,
        )
        WeeklySummary.objects.create(
            user=self.nour, week_start=self.today - timedelta(days=7), language="ar", body="old"
        )
        WeeklySummary.objects.create(user=self.nour, week_start=self.today, language="ar", body="new")
        data = api(self.nour).get("/api/patterns").data
        self.assertEqual(data["patterns"][0]["type"], "mood_dip")
        self.assertEqual(data["summary"]["body"], "new")


# --------------------------------------------------------------------------
# Content and to-dos
# --------------------------------------------------------------------------
class ContentTests(BaseCase):
    def make_card(self, pattern=None, status="published", reviewed_by=None):
        card = ContentCard.objects.create(pattern_type=pattern, status=status, reviewed_by=reviewed_by)
        ContentCardTranslation.objects.create(card=card, language="ar", title="AR title", body="b", action_text="a")
        ContentCardTranslation.objects.create(card=card, language="fr", title="FR title", body="b", action_text="a")
        return card

    def test_cards_match_her_patterns_language_and_published_status(self):
        dip = PatternType.objects.create(code="mood_dip", name="Mood dip")
        other = PatternType.objects.create(code="big_swings", name="Big swings")
        UserPattern.objects.create(
            user=self.nour, pattern_type=dip,
            window_start=self.today - timedelta(days=3), window_end=self.today, value=1,
        )
        self.make_card(pattern=dip)                      # matches her pattern
        self.make_card(pattern=None)                     # general card, shown to everyone
        self.make_card(pattern=other)                    # a pattern she did not show
        self.make_card(pattern=dip, status="draft")      # not published yet
        cards = api(self.nour).get("/api/content-cards").data
        self.assertEqual(len(cards), 2)
        self.assertTrue(all(c["title"] == "AR title" for c in cards))

    def test_cards_come_in_the_users_language(self):
        self.make_card(pattern=None)
        french = make_user("amel", language="fr")
        self.assertEqual(api(french).get("/api/content-cards").data[0]["title"], "FR title")

    def test_card_shows_the_professional_who_reviewed_it(self):
        self.make_card(pattern=None, reviewed_by=self.pro)
        self.assertEqual(api(self.nour).get("/api/content-cards").data[0]["reviewed_by"], "Dr_Sara")

    def test_todo_create_and_complete(self):
        client = api(self.nour)
        todo_id = client.post("/api/todos", {"title": "10 minute walk"}, format="json").data["id"]
        done = client.post(f"/api/todos/{todo_id}/complete")
        self.assertEqual(done.status_code, 200)
        self.assertIsNotNone(done.data["done_at"])

    def test_nobody_can_complete_someone_elses_todo(self):
        todo = Todo.objects.create(user=self.lina, title="private")
        self.assertEqual(api(self.nour).post(f"/api/todos/{todo.id}/complete").status_code, 404)


# --------------------------------------------------------------------------
# Booking
# --------------------------------------------------------------------------
class BookingTests(BaseCase):
    def test_directory_lists_only_verified_professionals(self):
        names = [p["name"] for p in api(self.nour).get("/api/professionals").data]
        self.assertEqual(names, ["Dr_Sara"])

    def test_booked_slot_disappears_from_free_slots(self):
        client = api(self.nour)
        self.assertEqual(len(client.get(f"/api/professionals/{self.pro.id}/slots").data), 1)
        self.assertEqual(self.book(self.nour).status_code, 201)
        self.assertEqual(len(client.get(f"/api/professionals/{self.pro.id}/slots").data), 0)

    def test_second_woman_cannot_take_a_booked_slot(self):
        self.assertEqual(self.book(self.nour).status_code, 201)
        self.assertEqual(self.book(self.lina).status_code, 409)

    def test_declined_slot_can_be_booked_again(self):
        session_id = self.book(self.nour).data["id"]
        api(self.pro).patch(f"/api/sessions/{session_id}", {"status": "declined"}, format="json")
        self.assertEqual(self.book(self.lina).status_code, 201)

    def test_cannot_book_a_slot_in_the_past(self):
        past = self.make_slot(self.pro, days=-1)
        self.assertEqual(self.book(self.nour, past).status_code, 404)

    def test_cannot_book_an_unverified_professionals_slot(self):
        slot = self.make_slot(self.pending_pro)
        self.assertEqual(self.book(self.nour, slot).status_code, 404)

    def test_professionals_cannot_book_sessions(self):
        self.assertEqual(self.book(self.pro).status_code, 403)

    def test_professional_accepts_and_user_cannot_accept_her_own_request(self):
        session_id = self.book(self.nour).data["id"]
        self.assertEqual(
            api(self.nour).patch(f"/api/sessions/{session_id}", {"status": "accepted"}, format="json").status_code, 403
        )
        self.assertEqual(
            api(self.pro).patch(f"/api/sessions/{session_id}", {"status": "accepted"}, format="json").status_code, 200
        )

    def test_another_professional_cannot_touch_the_session(self):
        other = make_professional("dr_other")
        session_id = self.book(self.nour).data["id"]
        res = api(other).patch(f"/api/sessions/{session_id}", {"status": "accepted"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_user_can_cancel_but_not_complete(self):
        session_id = self.accepted_session()
        client = api(self.nour)
        self.assertEqual(client.patch(f"/api/sessions/{session_id}", {"status": "completed"}, format="json").status_code, 403)
        self.assertEqual(client.patch(f"/api/sessions/{session_id}", {"status": "cancelled"}, format="json").status_code, 200)

    def test_sessions_list_is_role_aware(self):
        self.book(self.nour)
        self.assertEqual(len(api(self.nour).get("/api/sessions").data), 1)
        self.assertEqual(len(api(self.lina).get("/api/sessions").data), 0)
        self.assertEqual(len(api(self.pro).get("/api/sessions").data), 1)

    def test_professional_publishes_slots_and_end_must_follow_start(self):
        start = timezone.now() + timedelta(days=3)
        ok = {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat(), "mode": "online"}
        bad = {**ok, "ends_at": (start - timedelta(hours=1)).isoformat()}
        self.assertEqual(api(self.pro).post("/api/pro/slots", ok, format="json").status_code, 201)
        self.assertEqual(api(self.pro).post("/api/pro/slots", bad, format="json").status_code, 400)

    def test_a_slot_cannot_be_published_in_the_past(self):
        start = timezone.now() - timedelta(days=3)
        res = api(self.pro).post(
            "/api/pro/slots",
            {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat(), "mode": "online"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(AvailabilitySlot.objects.count(), 1)  # only the fixture slot

    def test_overlapping_slots_are_refused_but_back_to_back_is_fine(self):
        client = api(self.pro)
        start = timezone.now() + timedelta(days=10)
        first = {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat(), "mode": "online"}
        self.assertEqual(client.post("/api/pro/slots", first, format="json").status_code, 201)

        identical = client.post("/api/pro/slots", first, format="json")
        self.assertEqual(identical.status_code, 400)

        # Partial overlap: starts inside the first slot.
        partial = {**first, "starts_at": (start + timedelta(minutes=30)).isoformat()}
        self.assertEqual(client.post("/api/pro/slots", partial, format="json").status_code, 400)

        # Ends inside the first slot.
        straddling = {**first, "ends_at": (start + timedelta(minutes=90)).isoformat(),
                      "starts_at": (start - timedelta(minutes=30)).isoformat()}
        self.assertEqual(client.post("/api/pro/slots", straddling, format="json").status_code, 400)

        # Back-to-back: ends exactly when the next begins -> allowed.
        back_to_back = {**first, "starts_at": (start + timedelta(hours=1)).isoformat(),
                        "ends_at": (start + timedelta(hours=2)).isoformat()}
        self.assertEqual(client.post("/api/pro/slots", back_to_back, format="json").status_code, 201)

        self.assertEqual(AvailabilitySlot.objects.filter(professional=self.pro).count(), 3)

    def test_overlap_check_is_scoped_to_one_professional(self):
        other = make_professional("dr_other")
        start = timezone.now() + timedelta(days=11)
        body = {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat(), "mode": "online"}
        self.assertEqual(api(self.pro).post("/api/pro/slots", body, format="json").status_code, 201)
        # Same window, a different verified professional: not a conflict.
        self.assertEqual(api(other).post("/api/pro/slots", body, format="json").status_code, 201)
        # But the same professional repeating it is.
        self.assertEqual(api(self.pro).post("/api/pro/slots", body, format="json").status_code, 400)

    def test_unverified_professional_cannot_publish_slots(self):
        start = timezone.now() + timedelta(days=3)
        body = {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat(), "mode": "online"}
        self.assertEqual(api(self.pending_pro).post("/api/pro/slots", body, format="json").status_code, 403)


# --------------------------------------------------------------------------
# Consent: the privacy core
# --------------------------------------------------------------------------
class ConsentTests(BaseCase):
    def setUp(self):
        super().setUp()
        CheckIn.objects.create(user=self.nour, checkin_date=self.today, mood=2, energy=2)
        JournalEntry.objects.create(user=self.nour, body="secret")
        CycleStart.objects.create(user=self.nour, start_date=self.today)

    def read(self, kind):
        return api(self.pro).get(f"/api/pro/patients/{self.nour.id}/{kind}")

    def test_consent_requires_an_accepted_session(self):
        self.assertEqual(self.consent(self.nour, "mood").status_code, 403)
        self.book(self.nour)  # still only requested
        self.assertEqual(self.consent(self.nour, "mood").status_code, 403)

    def test_unknown_category_is_refused(self):
        self.accepted_session()
        self.assertEqual(self.consent(self.nour, "location").status_code, 400)

    def test_professional_sees_nothing_without_consent(self):
        self.accepted_session()
        for kind in ("check-ins", "journal", "cycle"):
            self.assertEqual(self.read(kind).status_code, 403, kind)

    def test_consent_opens_only_the_category_granted(self):
        self.accepted_session()
        self.consent(self.nour, "mood")
        self.assertEqual(self.read("check-ins").status_code, 200)
        self.assertEqual(self.read("journal").status_code, 403)
        self.assertEqual(self.read("cycle").status_code, 403)

    def test_each_category_returns_its_own_data(self):
        self.accepted_session()
        for category in ("mood", "journal", "cycle"):
            self.consent(self.nour, category)
        self.assertEqual(self.read("check-ins").data[0]["mood"], 2)
        self.assertEqual(self.read("journal").data[0]["body"], "secret")
        self.assertEqual(len(self.read("cycle").data), 1)

    def test_revoking_closes_access_again_and_regranting_reopens_it(self):
        self.accepted_session()
        self.consent(self.nour, "mood")
        self.assertEqual(self.read("check-ins").status_code, 200)
        self.consent(self.nour, "mood", granted=False)
        self.assertEqual(self.read("check-ins").status_code, 403)
        self.consent(self.nour, "mood")
        self.assertEqual(self.read("check-ins").status_code, 200)
        self.assertEqual(SharingConsent.objects.filter(user=self.nour).count(), 1)

    def test_consent_is_not_enough_after_the_session_is_cancelled(self):
        session_id = self.accepted_session()
        self.consent(self.nour, "mood")
        api(self.nour).patch(f"/api/sessions/{session_id}", {"status": "cancelled"}, format="json")
        self.assertEqual(self.read("check-ins").status_code, 403)

    def test_a_professional_cannot_read_another_professionals_patient(self):
        self.accepted_session()
        self.consent(self.nour, "mood")
        other = make_professional("dr_other")
        res = api(other).get(f"/api/pro/patients/{self.nour.id}/check-ins")
        self.assertEqual(res.status_code, 403)

    def test_unverified_professional_is_always_refused(self):
        res = api(self.pending_pro).get(f"/api/pro/patients/{self.nour.id}/check-ins")
        self.assertEqual(res.status_code, 403)

    def test_every_successful_read_is_audited_and_refusals_are_not(self):
        self.accepted_session()
        self.read("check-ins")  # refused: no consent
        self.assertEqual(AuditLog.objects.count(), 0)
        self.consent(self.nour, "mood")
        self.read("check-ins")
        log = AuditLog.objects.get()
        self.assertEqual((log.actor, log.action, log.target_id), (self.pro, "read_mood", self.nour.id))

    def test_patient_list_shows_only_accepted_patients_and_what_they_share(self):
        self.book(self.lina, self.make_slot(self.pro, days=4))  # requested only
        self.accepted_session()
        self.consent(self.nour, "mood")
        patients = api(self.pro).get("/api/pro/patients").data
        self.assertEqual(len(patients), 1)
        self.assertEqual(patients[0]["nickname"], "nour")
        self.assertEqual(patients[0]["shared"], ["mood"])

    def test_consents_endpoint_lists_only_active_ones(self):
        self.accepted_session()
        self.consent(self.nour, "mood")
        self.consent(self.nour, "journal")
        self.consent(self.nour, "journal", granted=False)
        categories = [c["category"] for c in api(self.nour).get("/api/consents").data]
        self.assertEqual(categories, ["mood"])


# --------------------------------------------------------------------------
# Professional tools and role boundaries
# --------------------------------------------------------------------------
class ProfessionalToolsTests(BaseCase):
    def test_assigned_todo_lands_in_the_womans_own_list(self):
        self.accepted_session()
        res = api(self.pro).post(f"/api/pro/patients/{self.nour.id}/todos", {"title": "10 minute walk"}, format="json")
        self.assertEqual(res.status_code, 201)
        todo = api(self.nour).get("/api/todos").data[0]
        self.assertEqual(todo["title"], "10 minute walk")
        self.assertEqual(todo["assigned_by"], self.pro.id)

    def test_cannot_assign_todos_without_an_accepted_session(self):
        res = api(self.pro).post(f"/api/pro/patients/{self.nour.id}/todos", {"title": "x"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(api(self.pro).get(f"/api/pro/patients/{self.nour.id}/todos").status_code, 403)
        todo = Todo.objects.create(user=self.nour, title="Existing", assigned_by=self.pro)
        base = f"/api/pro/patients/{self.nour.id}/todos/{todo.id}"
        self.assertEqual(api(self.pro).patch(base, {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(api(self.pro).delete(base).status_code, 403)

    def test_session_note_is_encrypted_and_private_to_its_professional(self):
        session_id = self.accepted_session()
        client = api(self.pro)
        client.put(f"/api/pro/sessions/{session_id}/note", {"body": "clinical note"}, format="json")
        with connection.cursor() as cursor:
            cursor.execute("SELECT body FROM rahati_sessionnote")
            self.assertNotIn("clinical", cursor.fetchone()[0])
        self.assertEqual(client.get(f"/api/pro/sessions/{session_id}/note").data["body"], "clinical note")
        other = make_professional("dr_other")
        self.assertEqual(api(other).get(f"/api/pro/sessions/{session_id}/note").status_code, 404)
        self.assertEqual(api(self.nour).get(f"/api/pro/sessions/{session_id}/note").status_code, 403)

    def test_roles_cannot_cross_into_each_others_endpoints(self):
        self.assertEqual(api(self.nour).get("/api/pro/patients").status_code, 403)
        self.assertEqual(api(self.pro).get("/api/check-ins").status_code, 403)
        self.assertEqual(api(self.pro).get("/api/todos").status_code, 403)
        self.assertEqual(api(self.pro).get("/api/professionals").status_code, 403)

    def test_revoked_professional_can_no_longer_move_sessions(self):
        """A rejected professional must not accept, complete or cancel anything."""
        session_id = self.book(self.nour).data["id"]
        ProfessionalProfile.objects.filter(user=self.pro).update(status="rejected")
        # Fresh object: a real request decodes the JWT into a new User each time.
        client = api(User.objects.get(pk=self.pro.pk))
        for status in ("accepted", "completed", "cancelled"):
            res = client.patch(f"/api/sessions/{session_id}", {"status": status}, format="json")
            self.assertEqual(res.status_code, 403, status)
        self.assertEqual(Session.objects.get(pk=session_id).status, "requested")

    def test_note_needs_an_accepted_session(self):
        """Notes are clinical records: refused until the woman accepts."""
        session_id = self.book(self.nour).data["id"]
        client = api(self.pro)
        self.assertEqual(
            client.put(f"/api/pro/sessions/{session_id}/note", {"body": "premature"}, format="json").status_code,
            403,
        )
        self.assertFalse(SessionNote.objects.filter(session_id=session_id).exists())

        api(self.pro).patch(f"/api/sessions/{session_id}", {"status": "accepted"}, format="json")
        self.assertEqual(
            client.put(f"/api/pro/sessions/{session_id}/note", {"body": "clinical"}, format="json").status_code,
            200,
        )

    def test_note_is_still_refused_after_the_session_is_cancelled(self):
        session_id = self.accepted_session()
        api(self.pro).put(f"/api/pro/sessions/{session_id}/note", {"body": "kept"}, format="json")
        api(self.nour).patch(f"/api/sessions/{session_id}", {"status": "cancelled"}, format="json")
        self.assertEqual(api(self.pro).put(
            f"/api/pro/sessions/{session_id}/note", {"body": "again"}, format="json"
        ).status_code, 403)


# --------------------------------------------------------------------------
# Complete to-do workflow
# --------------------------------------------------------------------------
class TodoWorkflowTests(BaseCase):
    def make_card(self, status="published", ar_action="خطوة يومية", fr_action="Une action"):
        card = ContentCard.objects.create(status=status)
        ContentCardTranslation.objects.create(
            card=card, language="ar", title="Arabic", body="Body", action_text=ar_action
        )
        ContentCardTranslation.objects.create(
            card=card, language="fr", title="Français", body="Texte", action_text=fr_action
        )
        return card

    def test_woman_can_edit_and_delete_her_own_todos_only(self):
        client = api(self.nour)
        own = Todo.objects.create(user=self.nour, title="Original")
        self.assertEqual(client.patch(f"/api/todos/{own.id}", {"title": "Changed"}, format="json").status_code, 200)
        self.assertEqual(client.delete(f"/api/todos/{own.id}").status_code, 204)

        assigned = Todo.objects.create(user=self.nour, title="Assigned", assigned_by=self.pro)
        self.assertEqual(client.patch(f"/api/todos/{assigned.id}", {"title": "No"}, format="json").status_code, 403)
        self.assertEqual(client.delete(f"/api/todos/{assigned.id}").status_code, 403)

        theirs = Todo.objects.create(user=self.lina, title="Private")
        self.assertEqual(client.patch(f"/api/todos/{theirs.id}", {"title": "No"}, format="json").status_code, 404)
        self.assertEqual(client.delete(f"/api/todos/{theirs.id}").status_code, 404)

    def test_complete_and_reopen_work_for_professional_assignments(self):
        todo = Todo.objects.create(user=self.nour, title="Assigned", assigned_by=self.pro)
        client = api(self.nour)
        completed = client.post(f"/api/todos/{todo.id}/complete")
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.data["status"], "done")
        reopened = client.post(f"/api/todos/{todo.id}/reopen")
        self.assertEqual(reopened.status_code, 200)
        self.assertIsNone(reopened.data["done_at"])
        self.assertEqual(reopened.data["source"], "professional")

    def test_card_action_uses_language_and_add_is_idempotent(self):
        card = self.make_card()
        client = api(self.nour)
        first = client.post(f"/api/content-cards/{card.id}/add-todo")
        second = client.post(f"/api/content-cards/{card.id}/add-todo")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["title"], "خطوة يومية")
        self.assertEqual(first.data["source"], "card")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["id"], second.data["id"])
        french = make_user("amel", language="fr")
        translated = api(french).post(f"/api/content-cards/{card.id}/add-todo")
        self.assertEqual(translated.data["title"], "Une action")

    def test_card_action_rejects_drafts_and_falls_back_to_available_translation(self):
        draft = self.make_card(status="draft")
        self.assertEqual(api(self.nour).post(f"/api/content-cards/{draft.id}/add-todo").status_code, 404)
        card = ContentCard.objects.create(status="published")
        ContentCardTranslation.objects.create(
            card=card, language="fr", title="Titre", body="Corps", action_text="Fallback action"
        )
        result = api(self.nour).post(f"/api/content-cards/{card.id}/add-todo")
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.data["title"], "Fallback action")

    def test_past_due_dates_are_rejected(self):
        yesterday = self.today - timedelta(days=1)
        self.assertEqual(
            api(self.nour).post("/api/todos", {"title": "Past", "due_date": yesterday}, format="json").status_code,
            400,
        )
        self.accepted_session()
        self.assertEqual(
            api(self.pro).post(
                f"/api/pro/patients/{self.nour.id}/todos",
                {"title": "Past", "due_date": yesterday}, format="json",
            ).status_code,
            400,
        )

    def test_professional_can_assign_text_and_card_actions_visible_with_source(self):
        self.accepted_session()
        client = api(self.pro)
        manual = client.post(
            f"/api/pro/patients/{self.nour.id}/todos", {"title": "Take a break"}, format="json"
        )
        card = self.make_card()
        recommended = client.post(
            f"/api/pro/patients/{self.nour.id}/content", {"card": card.id}, format="json"
        )
        self.assertEqual(manual.status_code, 201)
        self.assertEqual(recommended.status_code, 201)
        self.assertEqual(recommended.data["title"], "خطوة يومية")
        todos = api(self.nour).get("/api/todos").data
        by_title = {todo["title"]: todo for todo in todos}
        self.assertEqual(by_title["Take a break"]["source"], "professional")
        self.assertEqual(by_title["Take a break"]["assigned_by_name"], "Dr_Sara")
        self.assertEqual(by_title["خطوة يومية"]["source"], "professional")
        self.assertEqual(by_title["خطوة يومية"]["assigned_by"], self.pro.id)
        repeated = client.post(
            f"/api/pro/patients/{self.nour.id}/content", {"card": card.id}, format="json"
        )
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(repeated.data["id"], recommended.data["id"])
        draft = self.make_card(status="draft")
        self.assertEqual(client.post(
            f"/api/pro/patients/{self.nour.id}/content", {"card": draft.id}, format="json"
        ).status_code, 400)

    def test_progress_contains_only_this_professionals_todos_and_correct_counts(self):
        self.accepted_session()
        Todo.objects.create(user=self.nour, title="Open", assigned_by=self.pro)
        Todo.objects.create(user=self.nour, title="Done", assigned_by=self.pro, done_at=timezone.now())
        Todo.objects.create(user=self.nour, title="Late", assigned_by=self.pro, due_date=self.today - timedelta(days=1))
        Todo.objects.create(user=self.nour, title="Private self task")
        other = make_professional("dr_other")
        Todo.objects.create(user=self.nour, title="Other pro task", assigned_by=other)

        result = api(self.pro).get(f"/api/pro/patients/{self.nour.id}/todos")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["summary"], {"assigned": 3, "done": 1, "open": 1, "overdue": 1})
        self.assertEqual({item["title"] for item in result.data["items"]}, {"Open", "Done", "Late"})
        self.assertEqual({item["source"] for item in result.data["items"]}, {"professional"})

    def test_patient_list_counts_only_assignments_from_this_professional(self):
        self.accepted_session()
        Todo.objects.create(user=self.nour, title="Open", assigned_by=self.pro)
        Todo.objects.create(user=self.nour, title="Done", assigned_by=self.pro, done_at=timezone.now())
        Todo.objects.create(user=self.nour, title="Late", assigned_by=self.pro, due_date=self.today - timedelta(days=1))
        Todo.objects.create(user=self.nour, title="Private")
        other = make_professional("dr_other")
        Todo.objects.create(user=self.nour, title="Other", assigned_by=other)
        patients = api(self.pro).get("/api/pro/patients").data
        self.assertEqual(patients[0]["todos"], {"open": 1, "done": 1, "overdue": 1})

    def test_professional_todo_mutations_require_relationship_and_ownership(self):
        session_id = self.accepted_session()
        own = Todo.objects.create(user=self.nour, title="Assigned", assigned_by=self.pro)
        done = Todo.objects.create(user=self.nour, title="Done", assigned_by=self.pro, done_at=timezone.now())
        other_pro = make_professional("dr_other")
        theirs = Todo.objects.create(user=self.nour, title="Other pro", assigned_by=other_pro)
        client = api(self.pro)
        base = f"/api/pro/patients/{self.nour.id}/todos"
        self.assertEqual(client.patch(f"{base}/{own.id}", {"title": "Updated"}, format="json").status_code, 200)
        self.assertEqual(client.patch(f"{base}/{done.id}", {"title": "No"}, format="json").status_code, 409)
        self.assertEqual(client.delete(f"{base}/{done.id}").status_code, 409)
        self.assertEqual(client.patch(f"{base}/{theirs.id}", {"title": "No"}, format="json").status_code, 404)
        self.assertEqual(client.delete(f"{base}/{theirs.id}").status_code, 404)
        self.assertEqual(client.delete(f"{base}/{own.id}").status_code, 204)

        api(self.pro).patch(f"/api/sessions/{session_id}", {"status": "cancelled"}, format="json")
        self.assertEqual(client.get(base).status_code, 403)
        self.assertEqual(client.post(base, {"title": "Blocked"}, format="json").status_code, 403)
        self.assertEqual(client.patch(f"{base}/{done.id}", {"title": "No"}, format="json").status_code, 403)
        self.assertEqual(client.delete(f"{base}/{done.id}").status_code, 403)

    def test_role_boundaries_for_todo_endpoints(self):
        self.assertEqual(api(self.nour).get(f"/api/pro/patients/{self.nour.id}/todos").status_code, 403)
        self.assertEqual(api(self.nour).post(f"/api/pro/patients/{self.nour.id}/todos", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(api(self.pro).get("/api/todos").status_code, 403)
