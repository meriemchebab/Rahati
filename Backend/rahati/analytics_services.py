from datetime import timedelta

from django.utils import timezone

from .models import CheckIn


def get_user_analytics(user, days=7):
    """Calculate analytics using only the requested user's check-ins."""
    if days not in (7, 30, 90):
        raise ValueError("Range must be 7, 30, or 90 days.")

    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)
    previous_start = start_date - timedelta(days=days)
    previous_end = start_date - timedelta(days=1)

    rows = list(
        CheckIn.objects.filter(
            user=user,
            checkin_date__gte=start_date,
            checkin_date__lte=today,
        ).order_by("checkin_date")
    )

    previous_rows = CheckIn.objects.filter(
        user=user,
        checkin_date__gte=previous_start,
        checkin_date__lte=previous_end,
    )

    mood_values = [row.mood for row in rows]
    energy_values = [row.energy for row in rows]
    mood_average = round(sum(mood_values) / len(mood_values), 1) if rows else None
    energy_average = round(sum(energy_values) / len(energy_values), 1) if rows else None

    previous_moods = list(previous_rows.values_list("mood", flat=True))
    previous_average = (
        round(sum(previous_moods) / len(previous_moods), 1)
        if previous_moods else None
    )

    by_date = {row.checkin_date: row for row in rows}
    series = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        row = by_date.get(day)
        series.append({
            "date": day.isoformat(),
            "mood": row.mood if row else None,
            "energy": row.energy if row else None,
        })

    checkin_dates = set(by_date)
    streak = 0
    day = today
    while day in checkin_dates:
        streak += 1
        day -= timedelta(days=1)

    lowest_mood = min(mood_values) if mood_values else None
    lowest_mood_dates = [
        row.checkin_date.isoformat()
        for row in rows
        if lowest_mood is not None and row.mood == lowest_mood
    ]

    return {
        "range": days,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "check_in_count": len(rows),
        "average_mood": mood_average,
        "average_energy": energy_average,
        "previous_average_mood": previous_average,
        "mood_change": (
            round(mood_average - previous_average, 1)
            if mood_average is not None and previous_average is not None
            else None
        ),
        "check_in_streak": streak,
        "lowest_mood": lowest_mood,
        "lowest_mood_dates": lowest_mood_dates,
        "series": series,
        "topics": [],
    }
