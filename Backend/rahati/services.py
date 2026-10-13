"""Business rules shared by several views.

Gate 3 (consent gate): a professional reads a patient's data only with an
accepted/completed session AND a non-revoked consent for that category.
"""
from .models import AuditLog, Session, SharingConsent

# Statuses that establish a real care relationship between a woman and a
# professional. Nothing gated on consent may rely on anything weaker.
RELATIONSHIP_STATUSES = ("accepted", "completed")


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