"""Django admin configuration for the Rahati app.

ContentCardAdmin features:
- list_display: id, starter_key, pattern, author name, status, languages
- Filters on status and pattern
- Translations inline (max 2)
- Actions: Publish selected, Remove selected, Restore selected
- Text fields of professional-authored cards are READ-ONLY
- Only admins (is_staff) can access
"""
from django.contrib import admin
from django.contrib.admin import register

from .models import (
    AuditLog,
    ContentCard,
    ContentCardTranslation,
    PatternType,
    ProfessionalProfile,
    User,
)
from .services import audit


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
    list_display = ["id", "starter_key", "get_pattern", "get_author", "status", "get_languages"]
    list_filter = ["status", "pattern_type"]
    search_fields = ["starter_key", "author__username"]
    readonly_fields = ["starter_key", "author", "reviewed_by", "created_at", "updated_at"]
    inlines = [ContentCardTranslationInline]
    actions = [publish_cards, remove_cards, restore_cards]

    def get_pattern(self, obj):
        return obj.pattern_type.code if obj.pattern_type else "—"
    get_pattern.short_description = "Pattern"

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
