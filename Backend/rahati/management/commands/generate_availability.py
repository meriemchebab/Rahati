from django.core.management.base import BaseCommand, CommandError

from rahati.availability_services import generate_slots
from rahati.limits import GENERATION_HORIZON_DAYS
from rahati.models import User


class Command(BaseCommand):
    help = "Generate availability slots from professionals' weekly rules."

    def add_arguments(self, parser):
        parser.add_argument("--professional-id", type=int)
        parser.add_argument("--days", type=int, default=GENERATION_HORIZON_DAYS)

    def handle(self, *args, **options):
        days = options["days"]
        if days < 0:
            raise CommandError("--days must be non-negative")
        professionals = User.objects.filter(role=User.Role.PROFESSIONAL)
        if options["professional_id"] is not None:
            professionals = professionals.filter(pk=options["professional_id"])
            if not professionals.exists():
                raise CommandError("Professional not found")
        total = sum(generate_slots(pro, horizon_days=days) for pro in professionals.iterator())
        self.stdout.write(self.style.SUCCESS(f"Created {total} availability slot(s)."))
