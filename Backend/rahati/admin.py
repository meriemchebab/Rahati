"""Django admin configuration for the Rahati app.

ContentCardAdmin features:
- list_display: id, starter_key, pattern, author name, status, languages
- Filters on status and pattern
- Translations inline (max 2)
- Actions: Publish selected, Remove selected, Restore selected
- Text fields of professional-authored cards are READ-ONLY
- Only admins (is_staff) can access
"""
from django.contrib import admin, messages
from django.contrib.admin import register
from django.db.models.deletion import ProtectedError
from django.http import FileResponse, Http404
from django.urls import path
from django.shortcuts import get_object_or_404

from .models import (
    AuditLog,
    ContentCard,
    ContentCardTranslation,
    PatternType,
    ProfessionalProfile,
    Topic,
    TopicTranslation,
    User,
)
from .services import audit
from .professionals import transition_professional_status
from django.core.exceptions import ValidationError


# --------------------------------------------------------------------------
# Inline: translations
# --------------------------------------------------------------------------
class ContentCardTranslationInline(admin.TabularInline):
    model = ContentCardTranslation
    extra = 0
    max_num = 2
    fields = ["language", "title", "body", "action_text", "support_note"]

    def get_readonly_fields(self, request, obj=None):
        # If the card has an author (professional card), make text fields read-only
        if obj and obj.author_id is not None:
            return ["language", "title", "body", "action_text", "support_note"]
        return []


class TopicTranslationInline(admin.TabularInline):
    model = TopicTranslation
    extra = 0
    max_num = 2
    fields = ["language", "name"]


@register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["code", "arabic_name", "french_name"]
    search_fields = ["code", "translations__name"]
    inlines = [TopicTranslationInline]

    def get_readonly_fields(self, request, obj=None):
        return ["code"] if obj else []

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("translations")

    @staticmethod
    def _translation_name(obj, language):
        translation = next(
            (item for item in obj.translations.all() if item.language == language),
            None,
        )
        return translation.name if translation else "—"

    def arabic_name(self, obj):
        return self._translation_name(obj, "ar")
    arabic_name.short_description = "Arabic name"

    def french_name(self, obj):
        return self._translation_name(obj, "fr")
    french_name.short_description = "French name"

    def delete_model(self, request, obj):
        try:
            super().delete_model(request, obj)
        except ProtectedError:
            self.message_user(
                request,
                "This topic is in use by check-ins and cannot be deleted.",
                level=messages.ERROR,
            )

    def delete_queryset(self, request, queryset):
        try:
            super().delete_queryset(request, queryset)
        except ProtectedError:
            self.message_user(
                request,
                "One or more topics are in use by check-ins and cannot be deleted.",
                level=messages.ERROR,
            )


# --------------------------------------------------------------------------
# Admin actions
# --------------------------------------------------------------------------
@admin.action(description="Publish selected cards")
def publish_cards(modeladmin, request, queryset):
    successes = []
    failures = []
    for card in queryset.prefetch_related("translations"):
        problems = card.validate_publishable()
        if problems:
            failures.append((card.id, problems))
        else:
            card.status = ContentCard.Status.PUBLISHED
            card.save(update_fields=["status", "updated_at"])
            successes.append(card.id)
    if successes:
        modeladmin.message_user(
            request,
            f"Published cards: {successes}.",
            level="success",
        )
    for card_id, reasons in failures:
        modeladmin.message_user(
            request,
            f"Card {card_id} could not be published: {'; '.join(reasons)}",
            level="error",
        )


@admin.action(description="Remove selected cards (admin takedown)")
def remove_cards(modeladmin, request, queryset):
    ids = list(queryset.values_list("id", flat=True))
    queryset.update(status=ContentCard.Status.REMOVED)
    for card_id in ids:
        audit(request.user, "content_remove", "contentcard", card_id)
    modeladmin.message_user(
        request,
        f"Removed {len(ids)} card(s): {ids}.",
        level="warning",
    )


@admin.action(description="Restore selected removed cards to archived")
def restore_cards(modeladmin, request, queryset):
    ids = list(
        queryset.filter(status=ContentCard.Status.REMOVED).values_list("id", flat=True)
    )
    queryset.filter(status=ContentCard.Status.REMOVED).update(
        status=ContentCard.Status.ARCHIVED
    )
    for card_id in ids:
        audit(request.user, "content_restore", "contentcard", card_id)
    modeladmin.message_user(
        request,
        f"Restored {len(ids)} card(s): {ids}.",
    )


# --------------------------------------------------------------------------
# ContentCard admin
# --------------------------------------------------------------------------
@register(ContentCard)
class ContentCardAdmin(admin.ModelAdmin):
    list_display = ["id", "starter_key", "get_pattern", "get_topic", "get_author", "status", "get_languages"]
    list_filter = ["status", "pattern_type", "topic"]
    search_fields = ["starter_key", "author__username"]
    readonly_fields = ["starter_key", "author", "reviewed_by", "created_at", "updated_at"]
    inlines = [ContentCardTranslationInline]
    actions = [publish_cards, remove_cards, restore_cards]

    def get_pattern(self, obj):
        return obj.pattern_type.code if obj.pattern_type else "—"
    get_pattern.short_description = "Pattern"

    def get_topic(self, obj):
        return obj.topic.code if obj.topic else "—"
    get_topic.short_description = "Topic"

    def get_author(self, obj):
        if obj.author_id is None:
            return "platform"
        profile = getattr(obj.author, "professional_profile", None)
        return profile.display_name if profile else obj.author.username
    get_author.short_description = "Author"

    def get_languages(self, obj):
        langs = list(obj.translations.values_list("language", flat=True))
        return ", ".join(sorted(langs)) if langs else "—"
    get_languages.short_description = "Languages"

    def has_module_perms(self, request):
        return request.user.is_staff

    def has_view_permission(self, request, obj=None):
        return request.user.is_staff

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff

    def has_delete_permission(self, request, obj=None):
        return request.user.is_staff

    def has_add_permission(self, request):
        return request.user.is_staff

    def get_readonly_fields(self, request, obj=None):
        base = list(self.readonly_fields)
        if obj and obj.author_id is not None:
            # For professional-authored cards, text content is read-only
            base += ["pattern_type", "status"]
        return base


@register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = ["display_name", "user", "city", "wilaya", "credential_kind", "status", "created_at"]
    list_filter = ["status", "credential_kind", "city", "wilaya"]
    search_fields = ["display_name", "user__username", "user__email"]
    readonly_fields = [field.name for field in ProfessionalProfile._meta.fields]
    actions = ["verify_selected", "reject_selected"]

    def get_readonly_fields(self, request, obj=None):
        return [field for field in super().get_readonly_fields(request, obj) if field != "wilaya"]

    def get_urls(self):
        return [
            path(
                "<path:object_id>/credential/",
                self.admin_site.admin_view(self.credential_view),
                name="rahati_professionalprofile_credential",
            ),
        ] + super().get_urls()

    def credential_view(self, request, object_id):
        if not request.user.is_active or not request.user.is_staff:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied
        profile = get_object_or_404(ProfessionalProfile, pk=object_id)
        if not profile.credential_file:
            raise Http404
        try:
            stream = profile.credential_file.open("rb")
        except (FileNotFoundError, OSError):
            raise Http404
        audit(request.user, "pro_credential_review", "professional_profile", profile.user_id)
        response = FileResponse(stream, as_attachment=True)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Type"] = "application/octet-stream"
        return response

    @admin.action(description="Verify selected professionals")
    def verify_selected(self, request, queryset):
        for profile in queryset:
            try:
                transition_professional_status(
                    profile, ProfessionalProfile.Status.VERIFIED, actor=request.user
                )
                audit(request.user, "pro_verify", "professional_profile", profile.user_id)
            except ValidationError as exc:
                self.message_user(request, f"{profile}: {exc}", level=messages.ERROR)

    @admin.action(description="Reject selected professionals")
    def reject_selected(self, request, queryset):
        reason = request.POST.get("rejection_reason", "")
        for profile in queryset:
            try:
                transition_professional_status(
                    profile,
                    ProfessionalProfile.Status.REJECTED,
                    actor=request.user,
                    reason=reason,
                )
                audit(request.user, "pro_reject", "professional_profile", profile.user_id)
            except ValidationError as exc:
                self.message_user(request, f"{profile}: {exc}", level=messages.ERROR)

    def has_module_perms(self, request):
        return request.user.is_active and request.user.is_staff

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_staff

    def has_change_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_staff

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
