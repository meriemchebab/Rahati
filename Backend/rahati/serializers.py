"""Serializers: validation rules and the JSON shape of each resource."""
from django.utils import timezone
from rest_framework import serializers

from .models import AvailabilitySlot, CheckIn, ContentCard, JournalEntry, Session, Todo, User
from .services import todo_status


class RegisterSerializer(serializers.Serializer):
    nickname = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    language = serializers.ChoiceField(choices=User.Language.choices, default="ar")
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)

    def validate_nickname(self, value):
        if User.objects.filter(username=value).exists():
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

    def validate_check_in(self, value):
        request = self.context.get("request")
        if value and request and value.user_id != request.user.id:
            raise serializers.ValidationError("Not your check-in.")
        return value


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
    """Validate a professional's published-card recommendation request."""

    card = serializers.PrimaryKeyRelatedField(
        queryset=ContentCard.objects.filter(status=ContentCard.Status.PUBLISHED)
    )
    due_date = serializers.DateField(required=False, allow_null=True)

    def validate_due_date(self, value):
        if value is not None and value < timezone.localdate():
            raise serializers.ValidationError("A to-do cannot be due in the past.")
        return value


class SessionSerializer(serializers.ModelSerializer):
    professional = serializers.IntegerField(source="slot.professional_id", read_only=True)
    starts_at = serializers.DateTimeField(source="slot.starts_at", read_only=True)
    mode = serializers.CharField(source="slot.mode", read_only=True)

    class Meta:
        model = Session
        fields = ["id", "slot", "professional", "starts_at", "mode", "status", "created_at"]
        read_only_fields = ["status", "created_at"]


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
