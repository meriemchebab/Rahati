"""Serializers: validation rules and the JSON shape of each resource."""
from django.utils import timezone
from rest_framework import serializers

from .models import AvailabilitySlot, CheckIn, JournalEntry, Session, Todo, User


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
    class Meta:
        model = Todo
        fields = ["id", "title", "card", "assigned_by", "due_date", "done_at", "created_at"]
        read_only_fields = ["assigned_by", "done_at", "created_at"]


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

    def validate(self, data):
        if data["ends_at"] <= data["starts_at"]:
            raise serializers.ValidationError("A slot must end after it starts.")
        return data