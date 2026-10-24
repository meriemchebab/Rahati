"""Seed the fixed, translated check-in topic vocabulary."""

from django.core.management.base import BaseCommand
from django.db import transaction

from rahati.models import Topic, TopicTranslation


# Initial Arabic and French labels; these names need native review.
TOPICS = (
    ("stress", "ضغط", "Stress"),
    ("sleep", "النوم", "Sommeil"),
    ("family", "العائلة", "Famille"),
    ("work_study", "العمل أو الدراسة", "Travail ou études"),
    ("self_esteem", "تقدير الذات", "Estime de soi"),
    ("relationships", "العلاقات", "Relations"),
    ("body_cycle", "الجسد والدورة", "Corps et cycle"),
)


class Command(BaseCommand):
    help = "Seed the fixed check-in topics and their Arabic and French names."

    def handle(self, *args, **options):
        topics_created = 0
        translations_created = 0
        with transaction.atomic():
            for code, arabic_name, french_name in TOPICS:
                topic, created = Topic.objects.get_or_create(code=code)
                topics_created += int(created)
                for language, name in (("ar", arabic_name), ("fr", french_name)):
                    _, created = TopicTranslation.objects.get_or_create(
                        topic=topic,
                        language=language,
                        defaults={"name": name},
                    )
                    translations_created += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {topics_created} topic(s) and "
                f"{translations_created} translation(s)."
            )
        )
