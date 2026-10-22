"""Synchronous generation and lifecycle operations for availability slots."""

from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from .availability import expand_rule, overlaps
from .limits import (
    GENERATION_HORIZON_DAYS,
    MAX_RULES_PER_PROFESSIONAL,
    SLOT_MINUTE_BOUNDARIES,
)
from .models import AvailabilitySlot, TimeOff, WeeklyAvailability

MAX_GENERATED_SLOTS = 300
SLOT_DURATION = timedelta(minutes=30)


def check_slot_rules(professional, rule=None):
    """Validate the rule count, clock alignment and overlap constraints.

    Raises ``ValueError`` with a useful message when a rule cannot be saved.
    """
    rules = WeeklyAvailability.objects.filter(professional=professional)
    if rule is not None and rule.pk:
        rules = rules.exclude(pk=rule.pk)
    if rule is not None:
        if rules.count() >= MAX_RULES_PER_PROFESSIONAL:
            raise ValueError("A professional may have at most 30 weekly rules.")
        if rule.starts_at.minute not in SLOT_MINUTE_BOUNDARIES or rule.ends_at.minute not in SLOT_MINUTE_BOUNDARIES:
            raise ValueError("Rule times must align to quarter-hour boundaries.")
        if rule.starts_at.second or rule.ends_at.second or rule.starts_at == rule.ends_at:
            raise ValueError("A rule must have a non-empty time window.")
        for existing in rules.filter(weekday=rule.weekday, is_active=True):
            # Rules crossing midnight are compared using a common anchor date.
            day = datetime(2026, 1, 5 + rule.weekday)
            candidate = expand_rule(rule, day.date())[0]
            other = expand_rule(existing, day.date())[0]
            if overlaps(*candidate, *other):
                raise ValueError("Weekly availability rules cannot overlap.")
    return True


def _rule_intervals(rule, start_date, end_date):
    """Turn each recurring window into consecutive 30-minute appointments."""
    for window_start, window_end in expand_rule(rule, start_date, end_date):
        cursor = window_start
        while cursor + SLOT_DURATION <= window_end:
            yield cursor, cursor + SLOT_DURATION
            cursor += SLOT_DURATION


@transaction.atomic
def generate_slots(professional, now=None, horizon_days=GENERATION_HORIZON_DAYS):
    """Generate template slots up to the inclusive local date horizon.

    Existing rows (including manual slots) and time-off intervals are respected.
    At most 300 non-closed future slots are kept for the professional.
    Returns the number of newly created slots.
    """
    now = now or timezone.now()
    if timezone.is_naive(now):
        now = timezone.make_aware(now, timezone.get_default_timezone())
    if horizon_days < 0:
        raise ValueError("horizon_days must be non-negative")
    local_now = timezone.localtime(now)
    end_date = local_now.date() + timedelta(days=horizon_days)
    existing_count = AvailabilitySlot.objects.filter(
        professional=professional, starts_at__gte=now, closed_at__isnull=True
    ).count()
    remaining = max(0, MAX_GENERATED_SLOTS - existing_count)
    if not remaining:
        return 0

    time_off = list(TimeOff.objects.filter(
        professional=professional, starts_at__lt=timezone.make_aware(
            datetime.combine(end_date + timedelta(days=1), datetime.min.time()), timezone.get_default_timezone()
        ), ends_at__gt=now,
    ).values_list("starts_at", "ends_at"))
    created = 0
    rules = WeeklyAvailability.objects.filter(professional=professional, is_active=True).order_by("pk")
    for rule in rules:
        for start, end in _rule_intervals(rule, local_now.date(), end_date):
            if start <= now:
                continue
            if any(overlaps(start, end, off_start, off_end) for off_start, off_end in time_off):
                continue
            if AvailabilitySlot.objects.filter(
                professional=professional, starts_at__lt=end, ends_at__gt=start
            ).exists():
                continue
            try:
                AvailabilitySlot.objects.create(
                    professional=professional, starts_at=start, ends_at=end,
                    mode=rule.mode, source=AvailabilitySlot.Source.TEMPLATE, rule=rule,
                )
            except IntegrityError:
                continue
            created += 1
            if created >= remaining:
                return created
    return created


def retire_slot(slot, now=None):
    """Close a future free slot; return whether it was retired."""
    now = now or timezone.now()
    if slot.starts_at <= now or slot.closed_at is not None or slot.sessions.filter(
        status__in=("requested", "accepted")
    ).exists():
        return False
    slot.closed_at = now
    slot.save(update_fields=["closed_at"])
    return True
