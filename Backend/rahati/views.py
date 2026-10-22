"""Views: one class per endpoint. Routes live in urls.py.

Every view passes three gates:
1. Role gate       -> permissions.py
2. Ownership       -> querysets filter user = request.user
3. Consent gate    -> services.can_read (professionals reading a patient)
"""
from datetime import timedelta
from calendar import monthrange

from django.db import transaction
from django.http import FileResponse, Http404
from django.db.models import Count, F, Q, Min
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError, Throttled
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import update_session_auth_hash
from rest_framework_simplejwt.exceptions import TokenError

from .content_rules import PATTERN_PRIORITY, MAX_CARDS_PER_PROFESSIONAL
from .models import (
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
from .permissions import IsSessionActor, IsUserRole, IsVerifiedProfessional, IsProfessionalRole
from .serializers import (
    CardAssignSerializer,
    CardTodoSerializer,
    CheckInSerializer,
    JournalSerializer,
    ProCardCreateSerializer,
    ProCardPatchSerializer,
    RegisterSerializer,
    ProfessionalRegistrationSerializer,
    ProfessionalProfilePatchSerializer,
    SessionSerializer,
    SlotSerializer,
    TodoSerializer,
    DirectorySearchSerializer,
    ProfessionalSlotsQuerySerializer,
    ProfessionalCalendarQuerySerializer,
)
from .wilayas import WILAYAS
from .serializers import _PRO_STATUS_TRANSITIONS  # noqa: internal only
from .services import (
    RELATIONSHIP_STATUSES,
    audit,
    can_read,
    card_action_text,
    free_slots,
    has_relationship,
    _booking_eligible_slots,
    professional_todo_summary,
    todo_status_query,
)
from .professionals import create_professional_registration

# ==========================================================================
# Helpers
# ==========================================================================

_PRIVATE_NO_STORE = "private, no-store"

NOT_FOUND_DETAIL = {"detail": "Not found."}


def _private_response(data, status=200):
    """Return a Response with Cache-Control: private, no-store."""
    r = Response(data, status=status)
    r["Cache-Control"] = _PRIVATE_NO_STORE
    return r


class PrivateDirectoryAPIView(APIView):
    """Directory endpoints always use private caching, including error responses."""

    def handle_exception(self, exc):
        if isinstance(exc, ValidationError):
            response = Response(exc.detail, status=400)
            response.exception = True
            return response
        if isinstance(exc, Throttled):
            response = Response({"detail": "Request was throttled."}, status=429)
            response.exception = True
            return response
        try:
            response = super().handle_exception(exc)
        except Exception:
            response = Response({"detail": "Server error."}, status=500)
            response.exception = True
        if response.status_code >= 500:
            response.data = {"detail": "Server error."}
        return response

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = _PRIVATE_NO_STORE
        return response


def _card_item(card, translation, source, author_name, reviewed_by_name, lang):
    """Build the standard card item dict."""
    return {
        "id": card.id,
        "title": translation.title,
        "body": translation.body,
        "action": translation.action_text,
        "support_note": translation.support_note,
        "pattern": card.pattern_type.code if card.pattern_type_id else None,
        "source": source,
        "author_name": author_name,
        "reviewed_by_name": reviewed_by_name,
        "language": lang,
    }


def _reviewed_by_name(card):
    reviewer = getattr(card.reviewed_by, "professional_profile", None)
    return reviewer.display_name if reviewer else None


def _pro_card_response(card):
    """Serialise a professional's own card for list/create/patch responses."""
    translations = list(card.translations.all())
    times_assigned = Todo.objects.filter(card=card).count()
    return {
        "id": card.id,
        "status": card.status,
        "pattern": card.pattern_type.code if card.pattern_type_id else None,
        "translations": [
            {
                "language": t.language,
                "title": t.title,
                "body": t.body,
                "action_text": t.action_text,
                "support_note": t.support_note,
            }
            for t in translations
        ],
        "times_assigned": times_assigned,
        "created_at": card.created_at,
        "updated_at": card.updated_at,
    }


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


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token_value = request.data.get("refresh")
        if not token_value:
            return Response({"detail": "Refresh token is required."}, status=400)
        try:
            token = RefreshToken(token_value)
            if str(token.get("user_id")) != str(request.user.pk):
                return Response({"detail": "Invalid refresh token."}, status=400)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid refresh token."}, status=400)
        return Response(status=204)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new = request.data.get("new_password", "")
        if not request.user.check_password(current):
            return Response({"current_password": ["Current password is incorrect."]}, status=400)
        try:
            validate_password(new, user=request.user)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError
            if isinstance(exc, DjangoValidationError):
                return Response({"new_password": exc.messages}, status=400)
            raise
        request.user.set_password(new)
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response({"detail": "Password changed."}, status=200)


class ProfessionalRegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "pro_register"

    def post(self, request):
        serializer = ProfessionalRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        user_data = {
            key: values.get(key)
            for key in ("nickname", "password", "language", "email", "phone")
        }
        profile_data = {
            key: values[key]
            for key in ("display_name", "bio", "city", "address", "credential_kind")
        }
        user, profile = create_professional_registration(
            user_data=user_data,
            profile_data=profile_data,
            credential=values["credential_file"],
            terms_accepted_at=timezone.now(),
        )
        return Response(
            {"id": user.id, "nickname": user.username, "status": profile.status},
            status=201,
        )


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


class ProfessionalProfileView(APIView):
    permission_classes = [IsProfessionalRole]
    parser_classes = [JSONParser]

    def get(self, request):
        profile = get_object_or_404(ProfessionalProfile, user=request.user)
        return _private_response({
            "display_name": profile.display_name,
            "bio": profile.bio,
            "city": profile.city,
            "address": profile.address,
            "wilaya": profile.wilaya,
            "credential_kind": profile.credential_kind,
            "status": profile.status,
            "credential_uploaded_at": profile.credential_uploaded_at,
        })

    def patch(self, request):
        profile = get_object_or_404(ProfessionalProfile, user=request.user)
        serializer = ProfessionalProfilePatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = serializer.validated_data
        if not changes:
            return _private_response({
                "display_name": profile.display_name,
                "bio": profile.bio,
                "city": profile.city,
                "address": profile.address,
                "wilaya": profile.wilaya,
                "credential_kind": profile.credential_kind,
                "status": profile.status,
                "credential_uploaded_at": profile.credential_uploaded_at,
            })
        if (
            "display_name" in changes
            and changes["display_name"] != profile.display_name
            and profile.status == ProfessionalProfile.Status.VERIFIED
        ):
            profile.status = ProfessionalProfile.Status.PENDING
            profile.verified_by = None
            profile.verified_at = None
        for field, value in changes.items():
            setattr(profile, field, value)
        profile.save()
        audit(request.user, "pro_profile_update", "professional_profile", profile.user_id)
        return _private_response({
            "display_name": profile.display_name,
            "bio": profile.bio,
            "city": profile.city,
            "address": profile.address,
            "wilaya": profile.wilaya,
            "credential_kind": profile.credential_kind,
            "status": profile.status,
            "credential_uploaded_at": profile.credential_uploaded_at,
        })


class ProfessionalCredentialView(APIView):
    permission_classes = [IsProfessionalRole]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile = get_object_or_404(ProfessionalProfile, user=request.user)
        if not profile.credential_file:
            raise Http404
        try:
            file_obj = profile.credential_file.open("rb")
        except (FileNotFoundError, OSError):
            raise Http404
        response = FileResponse(file_obj, as_attachment=True)
        response["Cache-Control"] = _PRIVATE_NO_STORE
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Type"] = "application/octet-stream"
        return response

    def put(self, request):
        profile = get_object_or_404(ProfessionalProfile, user=request.user)
        upload = request.FILES.get("credential_file")
        if upload is None:
            return Response({"credential_file": ["This field is required."]}, status=400)
        try:
            from .credentials import validate_credential
            clean_file = validate_credential(upload)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError
            if isinstance(exc, DjangoValidationError):
                return Response({"credential_file": exc.messages}, status=400)
            raise
        profile.credential_file = clean_file
        profile.credential_uploaded_at = timezone.now()
        profile.save(update_fields=["credential_file", "credential_uploaded_at"])
        return _private_response({"credential_uploaded_at": profile.credential_uploaded_at}, status=200)


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
# Content cards — woman's side
# ==========================================================================

# Priority index lookup for sorting
_PATTERN_PRIORITY_INDEX = {code: i for i, code in enumerate(PATTERN_PRIORITY)}


class ContentCardsView(APIView):
    """GET /api/content-cards — curated suggestions for this woman.

    Priority order (per spec section 3):
    a. Candidates: published platform cards matching HER UserPattern rows
       with window_end in the last 7 days.
    b. Order by pattern priority, then pattern value (desc), then card id.
    c. Exclude open-todo cards and cards completed within last 14 days.
    d. At most 2 per pattern, 3 total.
    e. Fallback: one rotating general card (no pattern).
    f. Skip cards with no translation in her language.
    g. Never returns professional-authored cards.
    """

    permission_classes = [IsUserRole]
    throttle_scope = "content_read"

    def get(self, request):
        user = request.user
        lang = user.language
        today = timezone.localdate()
        since = today - timedelta(days=7)

        # ------- Build candidate set -------
        # Her recent patterns (last 7 days)
        recent_patterns = (
            UserPattern.objects.filter(user=user, window_end__gte=since)
            .select_related("pattern_type")
        )
        pattern_type_ids = [p.pattern_type_id for p in recent_patterns]

        # Build a map: pattern_type_id -> best (highest) value for her
        pattern_value = {}
        for p in recent_patterns:
            pattern_value[p.pattern_type_id] = max(
                pattern_value.get(p.pattern_type_id, float("-inf")), p.value
            )

        if not pattern_type_ids:
            # No patterns — go straight to fallback
            return _private_response(self._fallback(lang))

        # Fetch published platform cards matching her patterns
        candidates = (
            ContentCard.objects.filter(
                author__isnull=True,
                status=ContentCard.Status.PUBLISHED,
                pattern_type_id__in=pattern_type_ids,
            )
            .select_related("reviewed_by__professional_profile", "pattern_type")
            .prefetch_related("translations")
        )

        # ------- Exclusion: open todos and recently completed todos -------
        fourteen_ago = today - timedelta(days=14)
        open_card_ids = set(
            Todo.objects.filter(user=user, card__isnull=False)
            .filter(todo_status_query("open"))
            .values_list("card_id", flat=True)
        )
        recent_done_ids = set(
            Todo.objects.filter(
                user=user,
                card__isnull=False,
                done_at__isnull=False,
                done_at__date__gte=fourteen_ago,
            )
            .values_list("card_id", flat=True)
        )
        excluded_ids = open_card_ids | recent_done_ids

        # ------- Apply language + exclusion filter -------
        # Group by pattern code, apply limits
        pattern_counts = {}
        total = 0
        out = []

        # Sort candidates: pattern priority, then value (desc), then card id
        def sort_key(card):
            pt_code = card.pattern_type.code if card.pattern_type else ""
            priority = _PATTERN_PRIORITY_INDEX.get(pt_code, 999)
            val = -(pattern_value.get(card.pattern_type_id, 0))  # desc
            return (priority, val, card.id)

        sorted_cards = sorted(candidates, key=sort_key)

        for card in sorted_cards:
            if total >= 3:
                break
            if card.id in excluded_ids:
                continue
            pt_code = card.pattern_type.code
            if pattern_counts.get(pt_code, 0) >= 2:
                continue
            # Find translation
            translation = next(
                (t for t in card.translations.all() if t.language == lang), None
            )
            if translation is None:
                continue
            out.append(
                _card_item(
                    card, translation,
                    source="platform",
                    author_name=None,
                    reviewed_by_name=_reviewed_by_name(card),
                    lang=lang,
                )
            )
            pattern_counts[pt_code] = pattern_counts.get(pt_code, 0) + 1
            total += 1

        if not out:
            out = self._fallback(lang)

        return _private_response(out)

    @staticmethod
    def _fallback(lang):
        """Return at most one general platform card, rotating by ISO week."""
        general = list(
            ContentCard.objects.filter(
                author__isnull=True,
                status=ContentCard.Status.PUBLISHED,
                pattern_type__isnull=True,
            )
            .select_related("reviewed_by__professional_profile")
            .prefetch_related("translations")
            .order_by("id")
        )
        if not general:
            return []
        # Rotate by ISO week number
        week_num = timezone.localdate().isocalendar()[1]
        card = general[week_num % len(general)]
        translation = next(
            (t for t in card.translations.all() if t.language == lang), None
        )
        if translation is None:
            return []
        return [
            _card_item(
                card, translation,
                source="platform",
                author_name=None,
                reviewed_by_name=_reviewed_by_name(card),
                lang=lang,
            )
        ]


class CardDetailView(APIView):
    """GET /api/content-cards/{id} — card detail for a woman.

    Allowed when:
    - Published platform card (author null, status published).
    - She has a to-do referencing the card AND card status is published or archived.
    Everything else → 404 (same body for draft/removed/nonexistent/someone else's).
    Language fallback: try her language, then the other, report which was used.
    """

    permission_classes = [IsUserRole]
    throttle_scope = "content_read"

    def get(self, request, pk):
        try:
            card = (
                ContentCard.objects.select_related(
                    "reviewed_by__professional_profile",
                    "author__professional_profile",
                    "pattern_type",
                )
                .prefetch_related("translations")
                .get(pk=pk)
            )
        except ContentCard.DoesNotExist:
            return _private_response(NOT_FOUND_DETAIL, status=404)

        lang = request.user.language
        accessible = self._is_accessible(card, request.user)
        if not accessible:
            return _private_response(NOT_FOUND_DETAIL, status=404)

        # Language selection with fallback
        translations_by_lang = {t.language: t for t in card.translations.all()}
        translation = translations_by_lang.get(lang)
        actual_lang = lang
        if translation is None:
            # Fallback to any available language
            if translations_by_lang:
                actual_lang, translation = next(iter(translations_by_lang.items()))
            else:
                return _private_response(NOT_FOUND_DETAIL, status=404)

        # Determine source and author_name
        if card.author_id is None:
            source = "platform"
            author_name = None
        else:
            source = "professional"
            profile = getattr(card.author, "professional_profile", None)
            author_name = profile.display_name if profile else None

        return _private_response(
            _card_item(card, translation, source, author_name, _reviewed_by_name(card), actual_lang)
        )

    @staticmethod
    def _is_accessible(card, user):
        """True if this user may see this card."""
        if card.author is None:
            # Platform card: accessible if published
            return card.status == ContentCard.Status.PUBLISHED
        # Professional card: accessible if she has a to-do and card is published/archived
        if card.status in (ContentCard.Status.PUBLISHED, ContentCard.Status.ARCHIVED):
            return Todo.objects.filter(user=user, card=card).exists()
        return False


# ==========================================================================
# Content cards — professional's own cards
# ==========================================================================

class ProContentListView(APIView):
    """GET /api/pro/content and POST /api/pro/content."""

    permission_classes = [IsVerifiedProfessional]
    throttle_scope = "content_read"

    def get(self, request):
        qs = ContentCard.objects.filter(author=request.user).select_related(
            "pattern_type"
        ).prefetch_related("translations")

        # Status filter
        status_param = request.query_params.get("status")
        ALLOWED_STATUS_PARAMS = {"draft", "published", "archived", "removed"}
        if status_param is not None:
            if status_param not in ALLOWED_STATUS_PARAMS:
                return _private_response(
                    {"status": f"Must be one of: {sorted(ALLOWED_STATUS_PARAMS)}."},
                    status=400,
                )
            qs = qs.filter(status=status_param)
        else:
            # By default hide archived and removed
            qs = qs.filter(status__in=["draft", "published"])

        out = []
        for card in qs:
            data = _pro_card_response(card)
            out.append(data)
        return _private_response(out)

    def post(self, request):
        # Check card limit
        count = ContentCard.objects.filter(author=request.user).count()
        if count >= MAX_CARDS_PER_PROFESSIONAL:
            return _private_response(
                {"detail": f"You have reached the limit of {MAX_CARDS_PER_PROFESSIONAL} cards."},
                status=409,
            )

        s = ProCardCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        # Resolve pattern type
        pattern_type = None
        if data.get("pattern"):
            pattern_type = PatternType.objects.filter(code=data["pattern"]).first()

        target_status = data["status"]

        with transaction.atomic():
            card = ContentCard.objects.create(
                author=request.user,
                pattern_type=pattern_type,
                status=ContentCard.Status.DRAFT,
            )
            for t_data in data["translations"]:
                ContentCardTranslation.objects.create(
                    card=card,
                    language=t_data["language"],
                    title=t_data["title"],
                    body=t_data["body"],
                    action_text=t_data["action_text"],
                    support_note=t_data.get("support_note", ""),
                )
            # Refresh to include translations
            card.refresh_from_db()

            if target_status == ContentCard.Status.PUBLISHED:
                problems = card.validate_publishable()
                if problems:
                    raise serializers.ValidationError({"detail": problems})
                card.status = ContentCard.Status.PUBLISHED
                card.save(update_fields=["status", "updated_at"])
                audit(request.user, "content_status", "contentcard", card.id)

        audit(request.user, "content_create", "contentcard", card.id)

        return _private_response(_pro_card_response(card), status=201)


class ProContentDetailView(APIView):
    """GET, PATCH, DELETE /api/pro/content/{id}."""

    permission_classes = [IsVerifiedProfessional]
    throttle_scope = "content_read"  # reads use read scope

    def _get_own_card(self, request, pk):
        """Return the card if it belongs to this professional, else None."""
        try:
            return (
                ContentCard.objects.select_related("pattern_type")
                .prefetch_related("translations")
                .get(pk=pk, author=request.user)
            )
        except ContentCard.DoesNotExist:
            return None

    def get(self, request, pk):
        card = self._get_own_card(request, pk)
        if card is None:
            return _private_response(NOT_FOUND_DETAIL, status=404)
        return _private_response(_pro_card_response(card))

    def patch(self, request, pk):
        card = self._get_own_card(request, pk)
        if card is None:
            return _private_response(NOT_FOUND_DETAIL, status=404)

        if card.status == ContentCard.Status.REMOVED:
            return _private_response(
                {"detail": "A removed card cannot be edited."}, status=409
            )

        s = ProCardPatchSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        text_changed = False

        with transaction.atomic():
            # Pattern update
            if "pattern" in data:
                if data["pattern"]:
                    pt = PatternType.objects.filter(code=data["pattern"]).first()
                    card.pattern_type = pt
                else:
                    card.pattern_type = None
                card.save(update_fields=["pattern_type", "updated_at"])

            # Status update
            if "status" in data:
                new_status = data["status"]
                old_status = card.status
                allowed = _PRO_STATUS_TRANSITIONS.get(old_status, set())
                if new_status not in allowed:
                    if old_status == "published" and new_status == "draft":
                        return _private_response(
                            {"detail": "Cannot move a published card back to draft."},
                            status=409,
                        )
                    return _private_response(
                        {"detail": f"Cannot move from '{old_status}' to '{new_status}'."},
                        status=400,
                    )
                if new_status == ContentCard.Status.PUBLISHED:
                    problems = card.validate_publishable()
                    if problems:
                        raise serializers.ValidationError({"detail": problems})
                card.status = new_status
                card.save(update_fields=["status", "updated_at"])
                audit(request.user, "content_status", "contentcard", card.id)

            # Translation replacement (whole set)
            if "translations" in data and data["translations"] is not None:
                card.translations.all().delete()
                for t_data in data["translations"]:
                    ContentCardTranslation.objects.create(
                        card=card,
                        language=t_data["language"],
                        title=t_data["title"],
                        body=t_data["body"],
                        action_text=t_data["action_text"],
                        support_note=t_data.get("support_note", ""),
                    )
                text_changed = True

        audit(request.user, "content_update", "contentcard", card.id)
        card.refresh_from_db()
        return _private_response(_pro_card_response(card))

    def delete(self, request, pk):
        card = self._get_own_card(request, pk)
        if card is None:
            return _private_response(NOT_FOUND_DETAIL, status=404)

        if card.status == ContentCard.Status.REMOVED:
            return _private_response(
                {"detail": "A removed card cannot be deleted."}, status=409
            )

        has_todos = Todo.objects.filter(card=card).exists()
        if has_todos:
            card.status = ContentCard.Status.ARCHIVED
            card.save(update_fields=["status", "updated_at"])
            audit(request.user, "content_status", "contentcard", card.id)
            audit(request.user, "content_delete", "contentcard", card.id)
            return _private_response(_pro_card_response(card), status=200)

        audit(request.user, "content_delete", "contentcard", card.id)
        card.delete()
        return Response(status=204)


# ==========================================================================
# Content assignment (professional → patient)
# ==========================================================================

class PatientContentTodoView(APIView):
    """POST /api/pro/patients/{user_id}/content — assign a card to a patient."""

    permission_classes = [IsVerifiedProfessional]
    throttle_scope = "content_write"

    def post(self, request, user_id):
        patient = get_object_or_404(User, pk=user_id, role=User.Role.USER)

        # Require an accepted or completed session (cancelled → 403)
        if not has_relationship(request.user, patient.id):
            return _private_response({"detail": "No accepted session."}, status=403)

        s = CardAssignSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        card = s.validated_data["card"]
        due_date = s.validated_data.get("due_date")

        # Card must be published AND (her own card OR a platform card)
        is_own = card.author_id == request.user.id
        is_platform = card.author_id is None
        if not (is_own or is_platform):
            return _private_response(NOT_FOUND_DETAIL, status=404)
        if card.status != ContentCard.Status.PUBLISHED:
            return _private_response(NOT_FOUND_DETAIL, status=404)

        # Choose title in patient's language, fallback to any
        translations = list(card.translations.all())
        translation = next((t for t in translations if t.language == patient.language), None)
        if translation is None:
            translation = next(iter(translations), None)
        if translation is None:
            return _private_response({"detail": "Card has no translations."}, status=400)
        title = translation.action_text

        # Idempotent: same card already assigned by this professional and still open
        existing = Todo.objects.filter(
            user=patient, assigned_by=request.user, card=card, done_at__isnull=True
        ).first()
        if existing:
            existing = Todo.objects.select_related(
                "card", "assigned_by__professional_profile"
            ).get(pk=existing.pk)
            return _private_response(TodoSerializer(existing).data, status=200)

        # Create new to-do
        todo = Todo.objects.create(
            user=patient,
            assigned_by=request.user,
            card=card,
            title=title,
            due_date=due_date,
        )
        audit(request.user, "content_assign", "contentcard", card.id)
        todo = Todo.objects.select_related(
            "card", "assigned_by__professional_profile"
        ).get(pk=todo.pk)
        return _private_response(TodoSerializer(todo).data, status=201)


# ==========================================================================
# To-dos
# ==========================================================================


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


class ProfessionalListView(PrivateDirectoryAPIView):
    permission_classes = [IsUserRole]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "directory_search"

    def get(self, request):
        try:
            response = self._search(request)
        except ValidationError as exc:
            response = Response(exc.detail, status=400)
        except Throttled as exc:
            response = Response({"detail": "Request was throttled."}, status=429)
        except Exception:
            response = Response({"detail": "Server error."}, status=500)
        response["Cache-Control"] = _PRIVATE_NO_STORE
        return response

    def _search(self, request):
        serializer = DirectorySearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        now = timezone.now()
        start_date = params.get("from_date") or timezone.localdate()
        end_date = params.get("to") or (start_date + timedelta(days=60))
        start = timezone.make_aware(timezone.datetime.combine(start_date, timezone.datetime.min.time()))
        end = timezone.make_aware(timezone.datetime.combine(end_date + timedelta(days=1), timezone.datetime.min.time()))
        slots = free_slots(now=now).filter(starts_at__gte=start, starts_at__lt=end, mode=params["mode"])
        if params.get("time_of_day"):
            ranges = {"morning": (5, 12), "afternoon": (12, 17), "evening": (17, 22)}
            low, high = ranges[params["time_of_day"]]
            slots = slots.filter(starts_at__hour__gte=low, starts_at__hour__lt=high)

        requested_wilaya = params.get("wilaya")
        profile_filter = Q()
        if requested_wilaya and params["mode"] == AvailabilitySlot.Mode.IN_PERSON:
            profile_filter &= Q(professional__professional_profile__wilaya=requested_wilaya)
        aggregation = slots.filter(profile_filter).values("professional_id").annotate(
            next_slot=Min("starts_at"), free_count=Count("id"),
            selected_modes=Count("mode", distinct=True),
        )
        summary = {row["professional_id"]: row for row in aggregation}
        profile_query = ProfessionalProfile.objects.filter(
            status=ProfessionalProfile.Status.VERIFIED,
            user__is_active=True,
            user_id__in=summary.keys(),
        ).select_related("user").order_by("display_name", "user_id")
        if requested_wilaya and params["mode"] == AvailabilitySlot.Mode.IN_PERSON:
            profile_query = profile_query.filter(wilaya=requested_wilaya)
        elif params["mode"] == AvailabilitySlot.Mode.IN_PERSON:
            profile_query = profile_query.exclude(wilaya="")
        profiles = list(profile_query[params["offset"]:params["offset"] + params["limit"]])
        lang = request.user.language
        names = dict(WILAYAS)
        output = [{
            "id": profile.user_id,
            "name": profile.display_name,
            "bio": profile.bio,
            "city": profile.city,
            "wilaya": profile.wilaya or None,
            "wilaya_name": names.get(profile.wilaya) if profile.wilaya else None,
            "modes": [params["mode"]] if summary[profile.user_id]["selected_modes"] else [],
            "next_slot": timezone.localtime(summary[profile.user_id]["next_slot"]).isoformat(),
            "free_slots_in_window": summary[profile.user_id]["free_count"],
        } for profile in profiles]
        return _private_response(output)


class WilayaListView(PrivateDirectoryAPIView):
    permission_classes = [IsUserRole]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "directory_search"

    def get(self, request):
        try:
            response = _private_response([{"code": code, "name": name} for code, name in WILAYAS])
        except Exception:
            response = Response({"detail": "Server error."}, status=500)
        response["Cache-Control"] = _PRIVATE_NO_STORE
        return response


class FreeSlotsView(PrivateDirectoryAPIView):
    permission_classes = [IsUserRole]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "directory_search"

    def get(self, request, pro_id):
        try:
            response = self._get_slots(request, pro_id)
        except ValidationError as exc:
            response = Response(exc.detail, status=400)
        except Throttled:
            response = Response({"detail": "Request was throttled."}, status=429)
        except Exception:
            response = Response({"detail": "Server error."}, status=500)
        response["Cache-Control"] = _PRIVATE_NO_STORE
        return response

    def _get_slots(self, request, pro_id):
        query = ProfessionalSlotsQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        professional = User.objects.filter(
            pk=pro_id,
            is_active=True,
            role=User.Role.PROFESSIONAL,
            professional_profile__status=ProfessionalProfile.Status.VERIFIED,
        ).first()
        if professional is None:
            return Response({"detail": "Not found."}, status=404)
        slots = free_slots().filter(professional_id=pro_id).order_by("starts_at", "pk")
        if query.validated_data.get("mode"):
            slots = slots.filter(mode=query.validated_data["mode"])
        offset = query.validated_data["offset"]
        limit = query.validated_data["limit"]
        return _private_response(SlotSerializer(slots[offset:offset + limit], many=True).data)


class ProfessionalCalendarView(PrivateDirectoryAPIView):
    permission_classes = [IsUserRole]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "directory_calendar"

    def get(self, request, pro_id):
        try:
            response = self._get_calendar(request, pro_id)
        except ValidationError as exc:
            response = Response(exc.detail, status=400)
        except Throttled:
            response = Response({"detail": "Request was throttled."}, status=429)
        except Exception:
            response = Response({"detail": "Server error."}, status=500)
        response["Cache-Control"] = _PRIVATE_NO_STORE
        return response

    def _get_calendar(self, request, pro_id):
        query = ProfessionalCalendarQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        professional = User.objects.filter(
            pk=pro_id,
            is_active=True,
            role=User.Role.PROFESSIONAL,
            professional_profile__status=ProfessionalProfile.Status.VERIFIED,
        ).first()
        if professional is None:
            return Response({"detail": "Not found."}, status=404)

        month_start = query.validated_data["month"]
        month_end = month_start.replace(day=monthrange(month_start.year, month_start.month)[1]) + timedelta(days=1)
        tz = timezone.get_current_timezone()
        start = timezone.make_aware(timezone.datetime.combine(month_start, timezone.datetime.min.time()), tz)
        end = timezone.make_aware(timezone.datetime.combine(month_end, timezone.datetime.min.time()), tz)
        slots = free_slots().filter(
            professional_id=pro_id,
            starts_at__gte=start,
            starts_at__lt=end,
        )
        if query.validated_data.get("mode"):
            slots = slots.filter(mode=query.validated_data["mode"])
        # A single grouped database query produces all day counts and modes.
        rows = slots.annotate(local_day=TruncDate("starts_at", tzinfo=tz)).values("local_day").annotate(
            free_slots=Count("id"),
        ).order_by("local_day")
        day_rows = list(rows)
        mode_rows = slots.annotate(local_day=TruncDate("starts_at", tzinfo=tz)).values("local_day", "mode").annotate(
            free_slots=Count("id"),
        ).order_by("local_day", "mode")
        modes_by_day = {}
        for row in mode_rows:
            modes_by_day.setdefault(row["local_day"], []).append(row["mode"])
        return _private_response([
            {
                "date": row["local_day"].isoformat(),
                "modes": modes_by_day[row["local_day"]],
                "free_slots": row["free_slots"],
            }
            for row in day_rows
        ])


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
        now = timezone.now()
        slot = AvailabilitySlot.objects.select_for_update().filter(
            pk=request.data.get("slot")
        ).first()
        if slot is None:
            return Response({"detail": "Slot not available."}, status=404)
        if not free_slots(now=now).filter(pk=slot.pk).exists():
            if (
                _booking_eligible_slots(now=now).filter(pk=slot.pk).exists()
                and Session.objects.filter(slot=slot, status__in=Session.ACTIVE).exists()
            ):
                return Response({"detail": "Slot already taken."}, status=409)
            return Response({"detail": "Slot not available."}, status=404)
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
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .text_rules import clean_private_text
        try:
            body = clean_private_text(request.data.get("body", ""), "body", 20_000)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        note, _ = SessionNote.objects.update_or_create(
            session=self._session(request, pk), defaults={"body": body}
        )
        return Response({"body": note.body})
