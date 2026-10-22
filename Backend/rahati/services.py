"""Business rules shared by several views.

Gate 3 (consent gate): a professional reads a patient's data only with an
accepted/completed session AND a non-revoked consent for that category.
"""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from .limits import MIN_BOOKING_LEAD_MINUTES
from .models import (
    AuditLog,
    AvailabilitySlot,
    ProfessionalProfile,
    Session,
    SharingConsent,
)

# Statuses that establish a real care relationship between a woman and a
# professional. Nothing gated on consent may rely on anything weaker.
RELATIONSHIP_STATUSES = ("accepted", "completed")


def _booking_eligible_slots(now=None):
    """Slots with sufficient lead time owned by an active, verified professional."""
    now = now or timezone.now()
    return AvailabilitySlot.objects.filter(
        starts_at__gte=now + timedelta(minutes=MIN_BOOKING_LEAD_MINUTES),
        professional__is_active=True,
        professional__professional_profile__status=ProfessionalProfile.Status.VERIFIED,
    )


def free_slots(now=None):
    """Return slots that can be booked at ``now`` without an active session."""
    return _booking_eligible_slots(now).exclude(sessions__status__in=Session.ACTIVE)


def has_relationship(professional, user_id):
    """Is there an accepted or completed session between them?"""
    return Session.objects.filter(
        user_id=user_id,
        slot__professional=professional,
        status__in=RELATIONSHIP_STATUSES,
    ).exists()


def can_read(professional, user_id, category):
    """The consent gate: relationship + active consent for this category."""
    return has_relationship(professional, user_id) and SharingConsent.objects.filter(
        user_id=user_id,
        professional=professional,
        category=category,
        revoked_at__isnull=True,
    ).exists()


def audit(actor, action, target_type, target_id):
    AuditLog.objects.create(
        actor=actor, action=action, target_type=target_type, target_id=target_id
    )


def todo_status(todo, today=None):
    """Return the public status derived from completion and due date."""
    if todo.done_at is not None:
        return "done"
    today = today or timezone.localdate()
    if todo.due_date is not None and todo.due_date < today:
        return "overdue"
    return "open"


def todo_status_query(status, today=None):
    """Build the queryset condition for a derived to-do status."""
    today = today or timezone.localdate()
    if status == "done":
        return Q(done_at__isnull=False)
    if status == "overdue":
        return Q(done_at__isnull=True, due_date__lt=today)
    return Q(done_at__isnull=True) & (Q(due_date__isnull=True) | Q(due_date__gte=today))


def card_action_text(card, language):
    """Return a card's action in the requested language, then any available language."""
    translation = card.translations.filter(language=language).first()
    if translation is None:
        translation = card.translations.order_by("language", "pk").first()
    return translation.action_text if translation else None


def professional_todo_summary(queryset, today=None):
    """Count assigned, done, open, and overdue to-dos for a progress response."""
    today = today or timezone.localdate()
    totals = queryset.aggregate(
        assigned=Count("id"),
        done=Count("id", filter=Q(done_at__isnull=False)),
        open=Count(
            "id",
            filter=Q(done_at__isnull=True)
            & (Q(due_date__isnull=True) | Q(due_date__gte=today)),
        ),
        overdue=Count("id", filter=Q(done_at__isnull=True, due_date__lt=today)),
    )
    return totals
