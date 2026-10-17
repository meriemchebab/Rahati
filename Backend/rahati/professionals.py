"""Professional profile status transitions and registration services."""
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import ProfessionalProfile


_ALLOWED_TRANSITIONS = {
    ProfessionalProfile.Status.PENDING: {
        ProfessionalProfile.Status.VERIFIED,
        ProfessionalProfile.Status.REJECTED,
    },
}


def transition_professional_status(profile, status, *, actor=None, reason=""):
    """Move a profile from pending to a final review state.

    Verification/rejection is intentionally terminal here. Re-registration or
    a future administrative appeal should be explicit workflow operations.
    """
    valid_statuses = {choice for choice, _label in ProfessionalProfile.Status.choices}
    if status not in valid_statuses:
        raise ValidationError({"status": "Unknown professional status."})
    if status not in _ALLOWED_TRANSITIONS.get(profile.status, set()):
        raise ValidationError(
            {"status": f"Cannot transition a {profile.status} profile to {status}."}
        )

    profile.status = status
    profile.verified_by = actor if status == ProfessionalProfile.Status.VERIFIED else None
    profile.verified_at = timezone.now() if status == ProfessionalProfile.Status.VERIFIED else None
    profile.rejection_reason = reason if status == ProfessionalProfile.Status.REJECTED else ""
    profile.save(update_fields=["status", "verified_by", "verified_at", "rejection_reason"])
    return profile


@transaction.atomic
def create_professional_registration(*, user_data, profile_data, credential, terms_accepted_at=None):
    """Create the professional account and pending profile as one transaction."""
    from .models import User

    user = User(
        username=user_data["nickname"],
        email=user_data.get("email") or None,
        phone=user_data.get("phone") or None,
        language=user_data["language"],
        role=User.Role.PROFESSIONAL,
    )
    user.set_password(user_data["password"])
    user.save()

    profile = ProfessionalProfile(
        user=user,
        credential_file=credential,
        credential_uploaded_at=timezone.now(),
        status=ProfessionalProfile.Status.PENDING,
        terms_accepted_at=terms_accepted_at or timezone.now(),
        **profile_data,
    )
    profile.save()

    from .services import audit

    audit(user, "pro_register", "professional_profile", user.pk)
    return user, profile
