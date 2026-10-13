"""Views: one class per endpoint. Routes live in urls.py.

Every view passes three gates:
1. Role gate       -> permissions.py
2. Ownership       -> querysets filter user = request.user
3. Consent gate    -> services.can_read (professionals reading a patient)
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AvailabilitySlot,
    CheckIn,
    ContentCard,
    CycleStart,
    JournalEntry,
    ProfessionalProfile,
    Session,
    SessionNote,
    SharingConsent,
    Todo,
    User,
    UserPattern,
    WeeklySummary,
)
from .permissions import IsSessionActor, IsUserRole, IsVerifiedProfessional
from .serializers import (
    CheckInSerializer,
    CardTodoSerializer,
    JournalSerializer,
    RegisterSerializer,
    SessionSerializer,
    SlotSerializer,
    TodoSerializer,
)
from .services import (
    RELATIONSHIP_STATUSES,
    audit,
    can_read,
    card_action_text,
    has_relationship,
    professional_todo_summary,
    todo_status_query,
)

# ==========================================================================
# Auth and account
# ==========================================================================


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response({"id": user.id, "nickname": user.username}, status=201)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response(
            {"id": u.id, "nickname": u.username, "role": u.role, "language": u.language}
        )

    def delete(self, request):
        # ON DELETE CASCADE removes every row she owns. One line, by design.
        request.user.delete()
        return Response(status=204)


# ==========================================================================
# Tracking: the Preventing loop
# ==========================================================================


class CheckInView(APIView):
    permission_classes = [IsUserRole]

    def get(self, request):
        rows = CheckIn.objects.filter(user=request.user)[:90]
        return Response(CheckInSerializer(rows, many=True).data)

    def post(self, request):
        s = CheckInSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        # One check-in per day: posting again the same day edits it.
        obj, created = CheckIn.objects.update_or_create(
            user=request.user,
            checkin_date=d["checkin_date"],
            defaults={"mood": d["mood"], "energy": d["energy"]},
        )
        return Response(CheckInSerializer(obj).data, status=201 if created else 200)


class CycleStartView(APIView):
    permission_classes = [IsUserRole]

    def post(self, request):
        day = serializers.DateField().run_validation(request.data.get("start_date"))
        obj, created = CycleStart.objects.get_or_create(user=request.user, start_date=day)
        return Response({"id": obj.id, "start_date": obj.start_date}, status=201 if created else 200)


class JournalView(generics.ListCreateAPIView):
    permission_classes = [IsUserRole]
    serializer_class = JournalSerializer

    def get_queryset(self):
        return JournalEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PatternsView(APIView):
    """Read-only: patterns and summaries are written by the Celery jobs."""

    permission_classes = [IsUserRole]

    def get(self, request):
        since = timezone.localdate() - timedelta(days=30)
        rows = UserPattern.objects.filter(
            user=request.user, window_end__gte=since
        ).select_related("pattern_type")
        summary = WeeklySummary.objects.filter(user=request.user).first()
        return Response(
            {
                "patterns": [
                    {
                        "type": r.pattern_type.code,
                        "from": r.window_start,
                        "to": r.window_end,
                        "value": r.value,
                    }
                    for r in rows
                ],
                "summary": summary
                and {"week_start": summary.week_start, "body": summary.body},
            }
        )


# ==========================================================================
# Content and to-dos
# ==========================================================================


class ContentCardsView(APIView):
    """Cards for the patterns she showed this week + general cards, in her language."""

    permission_classes = [IsUserRole]

    def get(self, request):
        since = timezone.localdate() - timedelta(days=7)
        type_ids = list(
            UserPattern.objects.filter(user=request.user, window_end__gte=since)
            .values_list("pattern_type_id", flat=True)
        )
        cards = (
            ContentCard.objects.filter(status=ContentCard.Status.PUBLISHED)
            .filter(Q(pattern_type__isnull=True) | Q(pattern_type_id__in=type_ids))
            .select_related("reviewed_by__professional_profile")
            .prefetch_related("translations")
        )
        out = []
        for c in cards:
            t = next((x for x in c.translations.all() if x.language == request.user.language), None)
            if not t:
                continue
            reviewer = getattr(c.reviewed_by, "professional_profile", None)
            out.append(
                {
                    "id": c.id,
                    "title": t.title,
                    "body": t.body,
                    "action": t.action_text,
                    "reviewed_by": reviewer.display_name if reviewer else None,
                }
            )
        return Response(out)


class TodoView(generics.ListCreateAPIView):
    permission_classes = [IsUserRole]
    serializer_class = TodoSerializer

    def get_queryset(self):
        queryset = Todo.objects.filter(user=self.request.user).select_related(
            "card", "assigned_by__professional_profile"
        )
        status = self.request.query_params.get("status")
        if status:
            if status not in {"open", "done", "overdue"}:
                raise serializers.ValidationError({"status": "Use open, done, or overdue."})
            queryset = queryset.filter(todo_status_query(status))
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TodoDetailView(APIView):
    """Update or delete one of the woman's self-created or card to-dos."""

    permission_classes = [IsUserRole]

    def patch(self, request, pk):
        todo = get_object_or_404(
            Todo.objects.select_related("card", "assigned_by__professional_profile"),
            pk=pk,
            user=request.user,
        )
        if todo.assigned_by_id is not None:
            return Response({"detail": "This to-do was assigned by a professional."}, status=403)
        serializer = TodoSerializer(todo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        todo = get_object_or_404(Todo, pk=pk, user=request.user)
        if todo.assigned_by_id is not None:
            return Response({"detail": "This to-do was assigned by a professional."}, status=403)
        todo.delete()
        return Response(status=204)


class TodoReopenView(APIView):
    """Reopen any to-do belonging to the authenticated woman."""

    permission_classes = [IsUserRole]

    def post(self, request, pk):
        todo = get_object_or_404(
            Todo.objects.select_related("card", "assigned_by__professional_profile"),
            pk=pk,
            user=request.user,
        )
        todo.done_at = None
        todo.save(update_fields=["done_at"])
        return Response(TodoSerializer(todo).data)


class AddCardTodoView(APIView):
    """Add a published content card's translated action to her to-do list."""

    permission_classes = [IsUserRole]

    def post(self, request, card_id):
        card = get_object_or_404(
            ContentCard.objects.prefetch_related("translations"),
            pk=card_id,
            status=ContentCard.Status.PUBLISHED,
        )
        title = card_action_text(card, request.user.language)
        if title is None:
            return Response({"detail": "This card has no action translation."}, status=400)
        existing = (
            Todo.objects.filter(
                user=request.user, card=card, assigned_by__isnull=True,
            )
            .filter(todo_status_query("open"))
            .select_related("card", "assigned_by__professional_profile")
            .first()
        )
        if existing:
            return Response(TodoSerializer(existing).data, status=200)
        todo = Todo.objects.create(user=request.user, card=card, title=title)
        todo = Todo.objects.select_related("card", "assigned_by__professional_profile").get(pk=todo.pk)
        return Response(TodoSerializer(todo).data, status=201)


class TodoCompleteView(APIView):
    permission_classes = [IsUserRole]

    def post(self, request, pk):
        todo = get_object_or_404(
            Todo.objects.select_related("card", "assigned_by__professional_profile"),
            pk=pk,
            user=request.user,
        )
        todo.done_at = timezone.now()
        todo.save(update_fields=["done_at"])
        return Response(TodoSerializer(todo).data)


# ==========================================================================
# Care: Healing mode (user side)
# ==========================================================================


class ProfessionalListView(APIView):
    permission_classes = [IsUserRole]

    def get(self, request):
        qs = ProfessionalProfile.objects.filter(status=ProfessionalProfile.Status.VERIFIED)
        if request.query_params.get("city"):
            qs = qs.filter(city__iexact=request.query_params["city"])
        return Response(
            [{"id": p.user_id, "name": p.display_name, "bio": p.bio, "city": p.city} for p in qs]
        )


class FreeSlotsView(APIView):
    permission_classes = [IsUserRole]

    def get(self, request, pro_id):
        slots = (
            AvailabilitySlot.objects.filter(professional_id=pro_id, starts_at__gt=timezone.now())
            .exclude(sessions__status__in=Session.ACTIVE)
        )
        return Response(SlotSerializer(slots, many=True).data)


class SessionView(APIView):
    """GET: my sessions (role-aware). POST: request a slot (users only)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == User.Role.PROFESSIONAL:
            qs = Session.objects.filter(slot__professional=request.user)
        else:
            qs = Session.objects.filter(user=request.user)
        return Response(SessionSerializer(qs.select_related("slot"), many=True).data)

    @transaction.atomic
    def post(self, request):
        if request.user.role != User.Role.USER:
            return Response({"detail": "Only users can book."}, status=403)
        # Lock the slot row so two women cannot grab it at the same moment.
        slot = (
            AvailabilitySlot.objects.select_for_update()
            .filter(
                pk=request.data.get("slot"),
                starts_at__gt=timezone.now(),
                professional__professional_profile__status="verified",
            )
            .first()
        )
        if not slot:
            return Response({"detail": "Slot not available."}, status=404)
        if Session.objects.filter(slot=slot, status__in=Session.ACTIVE).exists():
            return Response({"detail": "Slot already taken."}, status=409)
        session = Session.objects.create(user=request.user, slot=slot)
        return Response(SessionSerializer(session).data, status=201)


# Who may move a session from which status to which. Everything else is refused.
TRANSITIONS = {
    ("professional", "requested"): {"accepted", "declined"},
    ("professional", "accepted"): {"completed", "cancelled"},
    ("user", "requested"): {"cancelled"},
    ("user", "accepted"): {"cancelled"},
}


class SessionUpdateView(APIView):
    # A verified professional or the woman who booked. IsAuthenticated alone would
    # let an unverified (or revoked) professional accept and complete sessions,
    # which is what unlocks the whole consent flow.
    permission_classes = [IsSessionActor]

    def patch(self, request, pk):
        session = get_object_or_404(Session.objects.select_related("slot"), pk=pk)
        u = request.user
        is_owner = (u.role == User.Role.USER and session.user_id == u.id) or (
            u.role == User.Role.PROFESSIONAL and session.slot.professional_id == u.id
        )
        new = request.data.get("status")
        if not is_owner or new not in TRANSITIONS.get((u.role, session.status), set()):
            return Response({"detail": "Not allowed."}, status=403)
        session.status = new
        session.save(update_fields=["status"])
        return Response(SessionSerializer(session).data)


class ConsentView(APIView):
    permission_classes = [IsUserRole]

    def get(self, request):
        rows = SharingConsent.objects.filter(user=request.user, revoked_at__isnull=True)
        return Response([{"professional": r.professional_id, "category": r.category} for r in rows])

    def put(self, request):
        pro = get_object_or_404(User, pk=request.data.get("professional"), role=User.Role.PROFESSIONAL)
        category = request.data.get("category")
        if category not in SharingConsent.Category.values:
            return Response({"detail": "Unknown category."}, status=400)
        if not has_relationship(pro, request.user.id):
            return Response({"detail": "No accepted session with this professional."}, status=403)
        obj, _ = SharingConsent.objects.get_or_create(
            user=request.user, professional=pro, category=category
        )
        if request.data.get("granted"):
            obj.revoked_at, obj.granted_at = None, timezone.now()
        else:
            obj.revoked_at = timezone.now()
        obj.save()
        return Response({"category": category, "granted": obj.is_active})


# ==========================================================================
# Care: professional dashboard
# ==========================================================================


class ProSlotsView(generics.ListCreateAPIView):
    permission_classes = [IsVerifiedProfessional]
    serializer_class = SlotSerializer

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(professional=self.request.user)

    def perform_create(self, serializer):
        serializer.save(professional=self.request.user)


class PatientListView(APIView):
    permission_classes = [IsVerifiedProfessional]

    def get(self, request):
        today = timezone.localdate()
        patients = User.objects.filter(
            sessions__slot__professional=request.user,
            sessions__status__in=["accepted", "completed"],
        ).annotate(
            todo_open=Count(
                "todos",
                filter=(Q(todos__assigned_by=request.user, todos__done_at__isnull=True)
                        & (Q(todos__due_date__isnull=True) | Q(todos__due_date__gte=today))),
                distinct=True,
            ),
            todo_done=Count(
                "todos", filter=Q(todos__assigned_by=request.user, todos__done_at__isnull=False),
                distinct=True,
            ),
            todo_overdue=Count(
                "todos", filter=Q(todos__assigned_by=request.user, todos__done_at__isnull=True,
                                  todos__due_date__lt=today), distinct=True,
            ),
        ).distinct()
        active = SharingConsent.objects.filter(professional=request.user, revoked_at__isnull=True)
        shared = {}
        for c in active:
            shared.setdefault(c.user_id, []).append(c.category)
        return Response(
            [
                {
                    "id": p.id,
                    "nickname": p.username,
                    "shared": shared.get(p.id, []),
                    "todos": {"open": p.todo_open, "done": p.todo_done, "overdue": p.todo_overdue},
                }
                for p in patients
            ]
        )


class PatientData(APIView):
    """Base for every 'professional reads a patient's data' endpoint."""

    permission_classes = [IsVerifiedProfessional]
    category = None

    def rows(self, user_id):
        raise NotImplementedError

    def get(self, request, user_id):
        if not can_read(request.user, user_id, self.category):
            return Response({"detail": "No consent for this data."}, status=403)
        audit(request.user, f"read_{self.category}", "user", user_id)
        return Response(self.rows(user_id))


class PatientCheckIns(PatientData):
    category = SharingConsent.Category.MOOD

    def rows(self, user_id):
        return CheckInSerializer(CheckIn.objects.filter(user_id=user_id)[:180], many=True).data


class PatientJournal(PatientData):
    category = SharingConsent.Category.JOURNAL

    def rows(self, user_id):
        return JournalSerializer(JournalEntry.objects.filter(user_id=user_id)[:100], many=True).data


class PatientCycle(PatientData):
    category = SharingConsent.Category.CYCLE

    def rows(self, user_id):
        return list(CycleStart.objects.filter(user_id=user_id).values_list("start_date", flat=True))


class PatientTodoView(APIView):
    """Assign a to-do and read only this professional's progress with a patient."""

    permission_classes = [IsVerifiedProfessional]

    def _patient(self, request, user_id):
        patient = get_object_or_404(User, pk=user_id, role=User.Role.USER)
        if not has_relationship(request.user, patient.id):
            return None
        return patient

    def get(self, request, user_id):
        """Return this professional's assignments and their progress summary."""
        patient = self._patient(request, user_id)
        if patient is None:
            return Response({"detail": "No accepted session."}, status=403)
        todos = Todo.objects.filter(user=patient, assigned_by=request.user)
        summary = professional_todo_summary(todos)
        items = todos.select_related("card", "assigned_by__professional_profile").order_by(
            "done_at", F("due_date").asc(nulls_last=True), "-created_at"
        )
        return Response({"summary": summary, "items": TodoSerializer(items, many=True).data})

    def post(self, request, user_id):
        patient = self._patient(request, user_id)
        if patient is None:
            return Response({"detail": "No accepted session."}, status=403)
        s = TodoSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        # TODO(notifications): emit TodoAssigned event
        s.save(user=patient, assigned_by=request.user)
        todo = Todo.objects.select_related("card", "assigned_by__professional_profile").get(pk=s.instance.pk)
        return Response(TodoSerializer(todo).data, status=201)


class PatientContentTodoView(APIView):
    """Recommend a published card action to a patient as a professional."""

    permission_classes = [IsVerifiedProfessional]

    def post(self, request, user_id):
        patient = get_object_or_404(User, pk=user_id, role=User.Role.USER)
        if not has_relationship(request.user, patient.id):
            return Response({"detail": "No accepted session."}, status=403)
        serializer = CardTodoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        card = serializer.validated_data["card"]
        title = card_action_text(card, patient.language)
        if title is None:
            return Response({"detail": "This card has no action translation."}, status=400)
        existing = Todo.objects.filter(
            user=patient, assigned_by=request.user, card=card, done_at__isnull=True
        ).first()
        if existing:
            existing = Todo.objects.select_related("card", "assigned_by__professional_profile").get(pk=existing.pk)
            return Response(TodoSerializer(existing).data, status=200)
        # TODO(notifications): emit TodoAssigned event
        todo = Todo.objects.create(
            user=patient,
            assigned_by=request.user,
            card=card,
            title=title,
            due_date=serializer.validated_data.get("due_date"),
        )
        todo = Todo.objects.select_related("card", "assigned_by__professional_profile").get(pk=todo.pk)
        return Response(TodoSerializer(todo).data, status=201)


class PatientTodoDetailView(APIView):
    """Edit or delete an unfinished to-do assigned by this professional."""

    permission_classes = [IsVerifiedProfessional]

    def _todo(self, request, user_id, pk):
        patient = get_object_or_404(User, pk=user_id, role=User.Role.USER)
        if not has_relationship(request.user, patient.id):
            return None, Response({"detail": "No accepted session."}, status=403)
        todo = get_object_or_404(
            Todo.objects.select_related("card", "assigned_by__professional_profile"),
            pk=pk, user=patient, assigned_by=request.user,
        )
        return todo, None

    def patch(self, request, user_id, pk):
        todo, denial = self._todo(request, user_id, pk)
        if denial:
            return denial
        if todo.done_at is not None:
            return Response({"detail": "Completed to-dos cannot be edited."}, status=409)
        serializer = TodoSerializer(todo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, user_id, pk):
        todo, denial = self._todo(request, user_id, pk)
        if denial:
            return denial
        if todo.done_at is not None:
            return Response({"detail": "Completed to-dos cannot be deleted."}, status=409)
        todo.delete()
        return Response(status=204)


class SessionNoteView(APIView):
    permission_classes = [IsVerifiedProfessional]

    def _session(self, request, pk):
        session = get_object_or_404(
            Session.objects.select_related("slot"), pk=pk, slot__professional=request.user
        )
        # Notes are private clinical records: only once the woman has actually
        # accepted the session, same gate as has_relationship elsewhere.
        if session.status not in RELATIONSHIP_STATUSES:
            raise PermissionDenied("The session must be accepted before it can be noted.")
        return session

    def get(self, request, pk):
        note = SessionNote.objects.filter(session=self._session(request, pk)).first()
        return Response({"body": note.body if note else ""})

    def put(self, request, pk):
        note, _ = SessionNote.objects.update_or_create(
            session=self._session(request, pk), defaults={"body": request.data.get("body", "")}
        )
        return Response({"body": note.body})
