"""Gate 1 (role gate): who may call an endpoint at all."""
from rest_framework import permissions

from .models import ProfessionalProfile, User


class IsUserRole(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.USER)


class IsProfessionalRole(permissions.BasePermission):
    """Allow any authenticated professional, including pending applications."""

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.PROFESSIONAL)


class IsVerifiedProfessional(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        u = request.user
        if not (u and u.is_authenticated and u.role == User.Role.PROFESSIONAL):
            return False
        # Re-read the profile so a revoked verification takes effect immediately
        # even if the caller already touched u.professional_profile.
        profile = ProfessionalProfile.objects.filter(user=u).first()
        return profile is not None and profile.status == ProfessionalProfile.Status.VERIFIED


class IsSessionActor(permissions.BasePermission):
    """Gate 1 for session transitions: the woman who booked, or a verified pro.

    Ownership of the specific session is still checked in the view; this only
    decides who is allowed to attempt a transition at all. Any other role
    (including admin) fails closed.
    """

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.role == User.Role.USER:
            return True
        if u.role == User.Role.PROFESSIONAL:
            return IsVerifiedProfessional().has_permission(request, view)
        return False
