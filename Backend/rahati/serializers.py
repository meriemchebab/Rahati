"""Serializers: validation rules and the JSON shape of each resource.

Rules for every serializer:
- Explicit field list (never __all__).
- author, reviewed_by, starter_key, id, created_at, updated_at are never writable.
- All card text goes through clean_text() from content_rules.
"""
from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .content_rules import (
    ACTION_TEXT_MAX,
    BODY_MAX,
    MAX_TRANSLATIONS_PER_CARD,
    PATTERN_PRIORITY,
    SUPPORT_NOTE_MAX,
    TITLE_MAX,
    clean_text,
)
from .models import (
    AvailabilitySlot,
    CheckIn,
    ContentCard,
    ContentCardTranslation,
    JournalEntry,
    PatternType,
    Session,
    Todo,
    User,
    ProfessionalProfile,
)
from .services import todo_status
from .credentials import validate_credential
from .text_rules import clean_display_name, clean_phone, clean_text, clean_private_text
from .wilayas import WILAYA_CHOICES
_DIRECTORY_BIDI = frozenset(chr(code) for code in (*range(0x202A, 0x202F), *range(0x2066, 0x206A)))


class StrictSerializerMixin:
    """Reject undeclared input fields instead of silently ignoring them."""

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown = set(data.keys()) - set(self.fields.keys())
            if unknown:
                raise serializers.ValidationError(
                    {key: ["Unknown field."] for key in sorted(unknown)}
                )
        return super().to_internal_value(data)


class DirectorySearchSerializer(serializers.Serializer):
    """Strict query validation for the public professional directory."""

    mode = serializers.ChoiceField(choices=["in_person", "online"], required=False)
    wilaya = serializers.ChoiceField(choices=WILAYA_CHOICES, required=False, allow_blank=False)
    from_date = serializers.DateField(required=False)
    to = serializers.DateField(required=False)
    time_of_day = serializers.ChoiceField(choices=["morning", "afternoon", "evening"], required=False)
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=50)
    offset = serializers.IntegerField(required=False, default=0, min_value=0, max_value=10000)

    def to_internal_value(self, data):
        allowed = {"mode", "wilaya", "from", "to", "time_of_day", "limit", "offset"}
        errors = {}
        for key in data.keys():
            if key not in allowed:
                errors.setdefault(str(key), []).append("Unknown query parameter.")
            values = data.getlist(key) if hasattr(data, "getlist") else [data[key]]
            if len(values) != 1:
                errors.setdefault(str(key), []).append("Repeated query parameters are not allowed.")
            if any(isinstance(value, str) and ("\x00" in value or any(ch in _DIRECTORY_BIDI for ch in value)) for value in values):
                errors.setdefault(str(key), []).append("Unsafe characters are not allowed.")
        if errors:
            raise serializers.ValidationError(errors)
        normalized = {("from_date" if key == "from" else key): data[key] for key in data.keys()}
        return super().to_internal_value(normalized)

    def validate(self, attrs):
        attrs.setdefault("mode", "in_person")
        attrs.setdefault("limit", 20)
        attrs.setdefault("offset", 0)
        start, end = attrs.get("from_date"), attrs.get("to")
        today = timezone.localdate()
        if start and end and end < start:
            raise serializers.ValidationError({"to": "Must be on or after from."})
        if start and end and (end - start).days > 60:
            raise serializers.ValidationError({"to": "Search window cannot exceed 60 days."})
        if end and end > today + timedelta(days=180):
            raise serializers.ValidationError({"to": "Date cannot be more than 180 days ahead."})
        if start and start > today + timedelta(days=180):
            raise serializers.ValidationError({"from": "Date cannot be more than 180 days ahead."})
        return attrs


class ProfessionalSlotsQuerySerializer(serializers.Serializer):
    """Strict pagination and optional mode filter for a professional's slots."""

    mode = serializers.ChoiceField(choices=["in_person", "online"], required=False)
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)
    offset = serializers.IntegerField(required=False, default=0, min_value=0, max_value=10000)

    def to_internal_value(self, data):
        allowed = {"mode", "limit", "offset"}
        errors = {}
        for key in data.keys():
            values = data.getlist(key) if hasattr(data, "getlist") else [data[key]]
            if key not in allowed:
                errors.setdefault(str(key), []).append("Unknown query parameter.")
            if len(values) != 1:
                errors.setdefault(str(key), []).append("Repeated query parameters are not allowed.")
            if any(isinstance(value, str) and ("\x00" in value or any(ch in _DIRECTORY_BIDI for ch in value)) for value in values):
                errors.setdefault(str(key), []).append("Unsafe characters are not allowed.")
        if errors:
            raise serializers.ValidationError(errors)
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs.setdefault("limit", 20)
        attrs.setdefault("offset", 0)
        return attrs


class ProfessionalCalendarQuerySerializer(serializers.Serializer):
    month = serializers.CharField()
    mode = serializers.ChoiceField(choices=["in_person", "online"], required=False)

    def validate_month(self, value):
        import re
        from datetime import date

        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
            raise serializers.ValidationError("Use YYYY-MM.")
        year, month = map(int, value.split("-"))
        try:
            date(year, month, 1)
        except ValueError as exc:
            raise serializers.ValidationError("Month is out of range.") from exc
        today = timezone.localdate()
        month_start = date(year, month, 1)
        if month_start < date(today.year, today.month, 1):
            raise serializers.ValidationError("Month must be current or future.")
        if month_start > date(today.year + (today.month + 5) // 13, ((today.month + 5 - 1) % 12) + 1, 1):
            raise serializers.ValidationError("Month cannot be more than six months ahead.")
        return month_start

    def to_internal_value(self, data):
        allowed = {"month", "mode"}
        errors = {}
        for key in data.keys():
            values = data.getlist(key) if hasattr(data, "getlist") else [data[key]]
            if key not in allowed:
                errors.setdefault(str(key), []).append("Unknown query parameter.")
            if len(values) != 1:
                errors.setdefault(str(key), []).append("Repeated query parameters are not allowed.")
            if any(isinstance(value, str) and ("\x00" in value or any(ch in _DIRECTORY_BIDI for ch in value)) for value in values):
                errors.setdefault(str(key), []).append("Unsafe characters are not allowed.")
        if errors:
            raise serializers.ValidationError(errors)
        return super().to_internal_value(data)


# --------------------------------------------------------------------------
# Auth / account
# --------------------------------------------------------------------------
class RegisterSerializer(serializers.Serializer):
    nickname = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    language = serializers.ChoiceField(choices=User.Language.choices, default="ar")
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)

    def validate_nickname(self, value):
        try:
            value = clean_text(value, "nickname", 150)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        from .text_rules import RESERVED_NICKNAMES, _nickname_key
        if _nickname_key(value) in RESERVED_NICKNAMES:
            raise serializers.ValidationError("This nickname is unavailable.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This nickname is taken.")
        return value

    def create(self, data):
        # The role is NEVER read from the request: public signup always makes a user.
        user = User(
            username=data["nickname"],
            language=data["language"],
            email=data.get("email") or None,
            phone=data.get("phone") or None,
        )
        user.set_password(data["password"])
        user.save()
        return user


class ProfessionalRegistrationSerializer(StrictSerializerMixin, serializers.Serializer):
    nickname = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    language = serializers.ChoiceField(choices=User.Language.choices, default="ar")
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=40)
    display_name = serializers.CharField(max_length=120)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=5000, default="")
    city = serializers.CharField(max_length=80)
    address = serializers.CharField(required=False, allow_blank=True, max_length=255, default="")
    credential_kind = serializers.ChoiceField(
        choices=ProfessionalProfile.CredentialKind.choices, default="diploma"
    )
    credential_file = serializers.FileField(write_only=True)
    terms_accepted = serializers.BooleanField()

    def validate_nickname(self, value):
        value = clean_text(value, "nickname", 150)
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This nickname is unavailable.")
        from .text_rules import RESERVED_NICKNAMES, _nickname_key
        if _nickname_key(value) in RESERVED_NICKNAMES:
            raise serializers.ValidationError("This nickname is unavailable.")
        return value

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def validate_display_name(self, value):
        try:
            return clean_display_name(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_bio(self, value):
        try:
            return clean_text(value, "bio", 5000, required=False)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_city(self, value):
        try:
            return clean_text(value, "city", 80)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_address(self, value):
        try:
            return clean_text(value, "address", 255, required=False)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_phone(self, value):
        try:
            return clean_phone(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_email(self, value):
        value = (value or "").strip().lower()
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This contact information is unavailable.")
        return value or None

    def validate_credential_file(self, value):
        try:
            return validate_credential(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the terms to register.")
        return value

    def validate(self, attrs):
        phone = attrs.get("phone")
        email = attrs.get("email")
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError(
                {"non_field_errors": ["This contact information is unavailable."]}
            )
        if not email and not phone:
            raise serializers.ValidationError(
                {"non_field_errors": ["Provide an email address or phone number."]}
            )
        return attrs


class ProfessionalProfilePatchSerializer(StrictSerializerMixin, serializers.Serializer):
    display_name = serializers.CharField(max_length=120, required=False)
    bio = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    city = serializers.CharField(max_length=80, required=False)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    wilaya = serializers.ChoiceField(
        choices=WILAYA_CHOICES, required=False, allow_blank=True
    )

    def validate_display_name(self, value):
        try:
            return clean_display_name(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_bio(self, value):
        try:
            return clean_text(value, "bio", 5000, required=False)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_city(self, value):
        try:
            return clean_text(value, "city", 80)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_address(self, value):
        try:
            return clean_text(value, "address", 255, required=False)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc


# --------------------------------------------------------------------------
# Tracking
# --------------------------------------------------------------------------
class CheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ["id", "checkin_date", "mood", "energy"]

    def validate_checkin_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Check-ins cannot be in the future.")
        return value


class JournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ["id", "body", "check_in", "created_at"]
        read_only_fields = ["created_at"]

    def validate_body(self, value):
        try:
            return clean_private_text(value, "body", 20_000)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def validate_check_in(self, value):
        request = self.context.get("request")
        if value and request and value.user_id != request.user.id:
            raise serializers.ValidationError("Not your check-in.")
        return value


# --------------------------------------------------------------------------
# To-dos
# --------------------------------------------------------------------------
class TodoSerializer(serializers.ModelSerializer):
    source = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Todo
        fields = [
            "id", "title", "card", "assigned_by", "due_date", "done_at",
            "created_at", "source", "status", "assigned_by_name",
        ]
        read_only_fields = [
            "card", "assigned_by", "done_at", "created_at", "source", "status",
            "assigned_by_name",
        ]

    def validate_due_date(self, value):
        if value is not None and value < timezone.localdate():
            raise serializers.ValidationError("A to-do cannot be due in the past.")
        return value

    def validate_title(self, value):
        try:
            return clean_text(value, "title", 255)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

    def get_source(self, obj):
        if obj.assigned_by_id is not None:
            return "professional"
        if obj.card_id is not None:
            return "card"
        return "self"

    def get_status(self, obj):
        return todo_status(obj)

    def get_assigned_by_name(self, obj):
        if obj.assigned_by_id is None:
            return None
        profile = getattr(obj.assigned_by, "professional_profile", None)
        return profile.display_name if profile else None


class CardTodoSerializer(serializers.Serializer):
    """Validate a published-card self-add request (woman adding to her own list)."""

    card = serializers.PrimaryKeyRelatedField(
        queryset=ContentCard.objects.filter(status=ContentCard.Status.PUBLISHED)
    )
    due_date = serializers.DateField(required=False, allow_null=True)

    def validate_due_date(self, value):
        if value is not None and value < timezone.localdate():
            raise serializers.ValidationError("A to-do cannot be due in the past.")
        return value


# --------------------------------------------------------------------------
# Sessions and slots
# --------------------------------------------------------------------------
class SessionSerializer(serializers.ModelSerializer):
    professional = serializers.IntegerField(source="slot.professional_id", read_only=True)
    starts_at = serializers.DateTimeField(source="slot.starts_at", read_only=True)
    mode = serializers.CharField(source="slot.mode", read_only=True)
    professional_address = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            "id", "slot", "professional", "starts_at", "mode", "status",
            "professional_address", "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def get_professional_address(self, obj):
        if (
            obj.status not in (Session.Status.ACCEPTED, Session.Status.COMPLETED)
            or obj.slot.mode != AvailabilitySlot.Mode.IN_PERSON
        ):
            return None
        profile = getattr(obj.slot.professional, "professional_profile", None)
        return profile.address if profile else None


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ["id", "starts_at", "ends_at", "mode"]

    def _professional(self):
        """The slot's owner, during create or update."""
        if self.instance is not None:
            return self.instance.professional
        request = self.context.get("request")
        return getattr(request, "user", None) if request else None

    def validate_starts_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("A slot cannot start in the past.")
        return value

    def validate(self, data):
        starts_at = data.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = data.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("A slot must end after it starts.")

        professional = self._professional()
        mode = data.get("mode", getattr(self.instance, "mode", None))
        if mode == AvailabilitySlot.Mode.IN_PERSON and professional:
            wilaya = ProfessionalProfile.objects.filter(user=professional).values_list(
                "wilaya", flat=True
            ).first()
            if not wilaya:
                raise serializers.ValidationError({"wilaya": "wilaya_required"})
        if professional and starts_at and ends_at:
            # Half-open comparison: a slot ending exactly when another begins is fine.
            overlapping = AvailabilitySlot.objects.filter(
                professional=professional,
                starts_at__lt=ends_at,
                ends_at__gt=starts_at,
            )
            if self.instance is not None:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError("This slot overlaps one you already published.")
        return data


# --------------------------------------------------------------------------
# Card translation serializer (used inside pro card serializers)
# --------------------------------------------------------------------------
VALID_LANGUAGES = {c[0] for c in User.Language.choices}


class CardTranslationSerializer(serializers.Serializer):
    """Validates one translation object for card create / patch."""

    language = serializers.ChoiceField(choices=User.Language.choices)
    title = serializers.CharField(max_length=TITLE_MAX)
    body = serializers.CharField(max_length=BODY_MAX)
    action_text = serializers.CharField(max_length=ACTION_TEXT_MAX)
    support_note = serializers.CharField(
        max_length=SUPPORT_NOTE_MAX, required=False, allow_blank=True, default=""
    )

    def validate_title(self, value):
        return clean_text(value, "title", TITLE_MAX)

    def validate_body(self, value):
        return clean_text(value, "body", BODY_MAX)

    def validate_action_text(self, value):
        return clean_text(value, "action_text", ACTION_TEXT_MAX)

    def validate_support_note(self, value):
        if value:
            return clean_text(value, "support_note", SUPPORT_NOTE_MAX, required=False)
        return value


# --------------------------------------------------------------------------
# Professional card serializers
# --------------------------------------------------------------------------

# Allowed status transitions for professionals through the API
_PRO_STATUS_TRANSITIONS = {
    "draft": {"published"},
    "published": {"archived"},
    "archived": {"published"},
}

# Status values that are forbidden via the API (admin-only)
_FORBIDDEN_VIA_API = {"removed"}


class ProCardCreateSerializer(serializers.Serializer):
    """Validates the POST /api/pro/content body.

    author, reviewed_by, starter_key, id, created_at, updated_at are not
    accepted from the client — they are set in the view.
    """

    VALID_PATTERN_CODES = set(PATTERN_PRIORITY)

    pattern = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, default=None
    )
    status = serializers.ChoiceField(
        choices=[("draft", "draft"), ("published", "published")],
        default="draft",
    )
    translations = CardTranslationSerializer(many=True)

    def validate_pattern(self, value):
        if value in (None, ""):
            return None
        if value not in self.VALID_PATTERN_CODES:
            raise serializers.ValidationError(
                f"Unknown pattern code. Valid codes: {sorted(self.VALID_PATTERN_CODES)}."
            )
        return value

    def validate_translations(self, value):
        if not value:
            raise serializers.ValidationError("At least one translation is required.")
        if len(value) > MAX_TRANSLATIONS_PER_CARD:
            raise serializers.ValidationError(
                f"A card may have at most {MAX_TRANSLATIONS_PER_CARD} translations."
            )
        langs = [t["language"] for t in value]
        if len(langs) != len(set(langs)):
            raise serializers.ValidationError("Duplicate language in translations.")
        for lang in langs:
            if lang not in VALID_LANGUAGES:
                raise serializers.ValidationError(f"Language '{lang}' is not supported.")
        return value


class ProCardPatchSerializer(serializers.Serializer):
    """Validates the PATCH /api/pro/content/{id} body."""

    VALID_PATTERN_CODES = set(PATTERN_PRIORITY)

    pattern = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    status = serializers.CharField(required=False)
    translations = CardTranslationSerializer(many=True, required=False)

    def validate_pattern(self, value):
        if value in (None, ""):
            return None
        if value not in self.VALID_PATTERN_CODES:
            raise serializers.ValidationError(
                f"Unknown pattern code. Valid codes: {sorted(self.VALID_PATTERN_CODES)}."
            )
        return value

    def validate_status(self, value):
        if value in _FORBIDDEN_VIA_API:
            raise serializers.ValidationError(
                "Status 'removed' cannot be set through the API."
            )
        all_valid = (
            {s for moves in _PRO_STATUS_TRANSITIONS.values() for s in moves}
            | set(_PRO_STATUS_TRANSITIONS)
        )
        if value not in all_valid:
            raise serializers.ValidationError(f"Invalid status '{value}'.")
        return value

    def validate_translations(self, value):
        if value is None:
            return value
        if len(value) > MAX_TRANSLATIONS_PER_CARD:
            raise serializers.ValidationError(
                f"A card may have at most {MAX_TRANSLATIONS_PER_CARD} translations."
            )
        langs = [t["language"] for t in value]
        if len(langs) != len(set(langs)):
            raise serializers.ValidationError("Duplicate language in translations.")
        return value


# --------------------------------------------------------------------------
# Card assignment serializer (POST /api/pro/patients/{user_id}/content)
# --------------------------------------------------------------------------
class CardAssignSerializer(serializers.Serializer):
    """Validates the professional's card assignment request.

    The card queryset is intentionally wide here; scope checks (own card or
    platform card, correct status, etc.) are done in the view so they return
    the right status code (404 vs 400).
    """

    card = serializers.PrimaryKeyRelatedField(
        queryset=ContentCard.objects.all()
    )
    due_date = serializers.DateField(required=False, allow_null=True)

    def validate_due_date(self, value):
        if value is not None and value < timezone.localdate():
            raise serializers.ValidationError("A to-do cannot be due in the past.")
        return value
