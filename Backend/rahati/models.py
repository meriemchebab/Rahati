"""Rahati data model (Django 6.x, 3NF).

Setup checklist
- settings.py: AUTH_USER_MODEL = "rahati.User"  (set BEFORE the first migration)
- settings.py: FIELD_ENCRYPTION_KEY = <output of cryptography Fernet.generate_key()>
- MySQL users: DATABASES["default"]["OPTIONS"] = {"charset": "utf8mb4"}  (needed for Arabic)
- Seed the pattern_types table with the 6 pattern codes (fixture or data migration).
"""
from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from .storage import PrivateMediaStorage, private_credential_path
from .wilayas import WILAYA_CHOICES


# --------------------------------------------------------------------------
# Field-level encryption: journals and session notes are stored as ciphertext.
# --------------------------------------------------------------------------
class EncryptedTextField(models.TextField):
    def _fernet(self):
        return Fernet(settings.FIELD_ENCRYPTION_KEY)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return self._fernet().decrypt(value.encode()).decode()

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return value
        return self._fernet().encrypt(value.encode()).decode()


# --------------------------------------------------------------------------
# ACCOUNTS
# --------------------------------------------------------------------------
class User(AbstractUser):
    """One table for the three personas. `username` is the nickname."""

    class Role(models.TextChoices):
        USER = "user"
        PROFESSIONAL = "professional"
        ADMIN = "admin"

    class Language(models.TextChoices):
        ARABIC = "ar"
        FRENCH = "fr"

    first_name = None  # no real names needed: anonymity first
    last_name = None
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    language = models.CharField(
        max_length=2, choices=Language.choices, default=Language.ARABIC
    )

    def save(self, *args, **kwargs):
        # MySQL allows many NULLs in a UNIQUE column but only one empty string.
        self.email = self.email or None
        self.phone = self.phone or None
        super().save(*args, **kwargs)


class ProfessionalProfile(models.Model):
    """Extended profile for professional users.

    Fields added beyond the MVP:
    - address:               Free-text city/district. Shown in the directory.
    - rejection_reason:      Admin note when status=rejected. Never exposed
                             through the patient-facing API.
    - credential_kind:       Category of the uploaded credential document
                             (diploma, licence_number, …) so admins know what
                             they are reviewing without opening the file.
    - credential_uploaded_at: Timestamp set each time the file is replaced.
    - terms_accepted_at:     When the professional accepted the ToS during
                             registration. NULL means they haven't yet.
    - created_at:            Profile creation timestamp (auto-set).
    """

    class Status(models.TextChoices):
        PENDING = "pending"
        VERIFIED = "verified"
        REJECTED = "rejected"

    class CredentialKind(models.TextChoices):
        DIPLOMA = "diploma", "Diploma / degree"
        LICENCE = "licence", "Professional licence"
        CERTIFICATE = "certificate", "Certificate"
        OTHER = "other", "Other"

    user = models.OneToOneField(
        User,
        primary_key=True,
        on_delete=models.CASCADE,
        related_name="professional_profile",
        limit_choices_to={"role": "professional"},
    )
    display_name = models.CharField(max_length=120)
    bio = models.TextField(blank=True)
    city = models.CharField(max_length=80)
    wilaya = models.CharField(max_length=2, choices=WILAYA_CHOICES, blank=True)
    # Free-text address / district (optional, shown in directory).
    address = models.CharField(max_length=255, blank=True)
    # Credential file stored in PRIVATE_MEDIA_ROOT; never served via URL.
    credential_file = models.FileField(
        storage=PrivateMediaStorage(),
        upload_to=private_credential_path,
    )
    credential_kind = models.CharField(
        max_length=20,
        choices=CredentialKind.choices,
        default=CredentialKind.DIPLOMA,
    )
    credential_uploaded_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    # Admin who approved or rejected the profile.
    verified_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    # Rejection reason visible only to admins (never in the patient API).
    rejection_reason = models.TextField(blank=True)
    # ISO 8601 timestamp when the professional accepted the platform ToS.
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    # Profile creation timestamp.
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return self.display_name


# --------------------------------------------------------------------------
# TRACKING (everything here belongs to one user and cascades on delete)
# --------------------------------------------------------------------------
class CheckIn(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="check_ins")
    checkin_date = models.DateField()
    mood = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    energy = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-checkin_date"]
        constraints = [
            # also serves as the (user, date) lookup index
            models.UniqueConstraint(
                fields=["user", "checkin_date"], name="uniq_checkin_per_day"
            )
        ]


class CycleStart(models.Model):
    """Only the start date is stored. Cycle day is computed, never saved (3NF)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cycle_starts")
    start_date = models.DateField()

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "start_date"], name="uniq_cycle_start"
            )
        ]


class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="journal_entries")
    check_in = models.ForeignKey(
        CheckIn, null=True, blank=True, on_delete=models.SET_NULL, related_name="journal_entries"
    )
    body = EncryptedTextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class PatternType(models.Model):
    """Lookup table: mood_dip, low_energy_streak, late_cycle_dip, big_swings,
    improving_trend, silent_5_days."""

    code = models.SlugField(unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.code


class WeeklySummary(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="summaries")
    week_start = models.DateField()
    language = models.CharField(max_length=2, choices=User.Language.choices)
    body = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-week_start"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "week_start"], name="uniq_summary_per_week"
            )
        ]


class UserPattern(models.Model):
    """A pattern the rules engine detected for a user in a date window."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="patterns")
    pattern_type = models.ForeignKey(PatternType, on_delete=models.PROTECT)
    summary = models.ForeignKey(
        WeeklySummary, null=True, blank=True, on_delete=models.SET_NULL, related_name="patterns"
    )
    window_start = models.DateField()
    window_end = models.DateField()
    value = models.FloatField(help_text="Strength of the pattern (slope, streak length...)")

    class Meta:
        indexes = [models.Index(fields=["user", "window_end"])]


class DeviceToken(models.Model):
    class Platform(models.TextChoices):
        ANDROID = "android"
        IOS = "ios"
        WEB = "web"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="device_tokens")
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices)


# --------------------------------------------------------------------------
# CONTENT AND ACTION
# --------------------------------------------------------------------------
class ContentCard(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        ARCHIVED = "archived"   # retired by author; still readable by assigned patients
        REMOVED = "removed"     # admin takedown; readable by nobody except the author

    # null pattern_type = general or onboarding card, shown to everyone
    pattern_type = models.ForeignKey(
        PatternType, null=True, blank=True, on_delete=models.SET_NULL, related_name="cards"
    )
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_cards"
    )
    # null author = platform card; professional FK means the card belongs to that professional
    author = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.CASCADE, related_name="authored_cards"
    )
    # Stable identity for the six starter platform cards; many NULLs allowed
    starter_key = models.CharField(max_length=80, unique=True, null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def validate_publishable(self):
        """Return a list of human-readable problems (empty = publishable)."""
        MARKER = "[DRAFT - NOT REVIEWED]"
        problems = []
        translations = list(self.translations.all())
        if not translations:
            problems.append("No translations.")
            return problems
        langs = {t.language for t in translations}
        if self.author is None:
            # Platform card: must have both ar and fr
            for lang in ("ar", "fr"):
                if lang not in langs:
                    problems.append(f"Platform card missing '{lang}' translation.")
        for t in translations:
            for field, value in (
                ("title", t.title),
                ("body", t.body),
                ("action_text", t.action_text),
                ("support_note", t.support_note),
            ):
                if not value or not value.strip():
                    problems.append(f"Translation '{t.language}' has empty {field}.")
                elif MARKER in value:
                    problems.append(f"Translation '{t.language}' {field} contains draft marker.")
        return problems

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.author is not None and self.author.role != User.Role.PROFESSIONAL:
            raise ValidationError({"author": "Card author must have role 'professional'."})


class ContentCardTranslation(models.Model):
    card = models.ForeignKey(ContentCard, on_delete=models.CASCADE, related_name="translations")
    language = models.CharField(max_length=2, choices=User.Language.choices)
    title = models.CharField(max_length=200)
    body = models.TextField()
    action_text = models.CharField(max_length=255)
    # "When to reach out for support" — required before publishing
    support_note = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["card", "language"], name="uniq_card_language")
        ]


class Todo(models.Model):
    """Source is derived, not stored:
    card set -> from a content card; assigned_by set -> from a professional;
    both null -> created by the user herself."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="todos")
    title = models.CharField(max_length=255)
    card = models.ForeignKey(
        ContentCard, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    assigned_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_todos"
    )
    due_date = models.DateField(null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["done_at", "-created_at"]


# --------------------------------------------------------------------------
# CARE
# --------------------------------------------------------------------------
class AvailabilitySlot(models.Model):
    class Mode(models.TextChoices):
        ONLINE = "online"
        IN_PERSON = "in_person"

    class Source(models.TextChoices):
        MANUAL = "manual"
        TEMPLATE = "template"

    professional = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="slots",
        limit_choices_to={"role": "professional"},
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    mode = models.CharField(max_length=10, choices=Mode.choices)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL)
    rule = models.ForeignKey(
        "WeeklyAvailability", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="slots",
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["professional", "starts_at"]),
            models.Index(fields=["mode", "starts_at"], name="slot_mode_start_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["professional", "starts_at"], name="uniq_professional_slot_start"
            )
        ]


class WeeklyAvailability(models.Model):
    """A recurring local-time availability window for one weekday."""

    professional = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="weekly_availability",
        limit_choices_to={"role": "professional"},
    )
    weekday = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        help_text="Monday is 0 and Sunday is 6.",
    )
    starts_at = models.TimeField()
    ends_at = models.TimeField()
    mode = models.CharField(max_length=10, choices=AvailabilitySlot.Mode.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["weekday", "starts_at"]
        indexes = [models.Index(fields=["professional", "weekday"])]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from .availability_services import generate_slots

        generate_slots(self.professional)


class TimeOff(models.Model):
    """A local Algiers-time interval during which the professional is away."""

    professional = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="time_off_entries",
        limit_choices_to={"role": "professional"},
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


class Session(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested"
        ACCEPTED = "accepted"
        DECLINED = "declined"
        CANCELLED = "cancelled"
        COMPLETED = "completed"

    ACTIVE = ("requested", "accepted")  # statuses that occupy a slot

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    # The professional is reached through the slot (no duplicate column).
    # No UNIQUE on slot: MySQL has no partial unique index, so the "one active
    # session per slot" rule is enforced in the booking view inside a transaction.
    slot = models.ForeignKey(AvailabilitySlot, on_delete=models.CASCADE, related_name="sessions")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.REQUESTED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status"])]


class SessionNote(models.Model):
    """Private notes written by the professional. Never visible to the user API."""

    session = models.OneToOneField(
        Session, primary_key=True, on_delete=models.CASCADE, related_name="note"
    )
    body = EncryptedTextField()
    updated_at = models.DateTimeField(auto_now=True)


class SharingConsent(models.Model):
    """One row per (woman, professional, category). Revoking sets revoked_at."""

    class Category(models.TextChoices):
        MOOD = "mood"
        JOURNAL = "journal"
        CYCLE = "cycle"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="consents_given")
    professional = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="consents_received",
        limit_choices_to={"role": "professional"},
    )
    category = models.CharField(max_length=10, choices=Category.choices)
    granted_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "professional", "category"], name="uniq_consent"
            )
        ]

    @property
    def is_active(self):
        return self.revoked_at is None


# --------------------------------------------------------------------------
# SYSTEM
# --------------------------------------------------------------------------
class AuditLog(models.Model):
    """Who touched what. actor is SET NULL so deleting an account keeps the log
    but removes the link to the person."""

    actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="+")
    action = models.CharField(max_length=50)
    target_type = models.CharField(max_length=50)
    target_id = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["created_at"])]
