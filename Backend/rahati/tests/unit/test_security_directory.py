from datetime import timedelta

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from rahati.models import AvailabilitySlot, ProfessionalProfile, User


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    SECURE_SSL_REDIRECT=False,
    APPEND_SLASH=False,
)
class DirectorySecurityMatrixTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(username="security_patient", password="password123", role="user")
        self.professionals = []
        for username, status, active in (("verified_target", ProfessionalProfile.Status.VERIFIED, True), ("pending_target", ProfessionalProfile.Status.PENDING, True), ("inactive_target", ProfessionalProfile.Status.VERIFIED, False)):
            pro = User.objects.create_user(username=username, password="password123", role="professional", is_active=active)
            ProfessionalProfile.objects.create(user=pro, display_name=username, city="Alger", wilaya="16", credential_file="credentials/private.pdf", status=status)
            AvailabilitySlot.objects.create(professional=pro, starts_at=timezone.now() + timedelta(days=2), ends_at=timezone.now() + timedelta(days=2, hours=1), mode="in_person")
            self.professionals.append(pro)
        self.admin = User.objects.create_superuser(username="security_admin", password="password123", email="admin@example.test", role=User.Role.ADMIN)

    def test_role_matrix_for_all_directory_reads(self):
        for caller, expected in ((self.patient, 200), (self.professionals[0], 403), (self.professionals[1], 403), (self.professionals[2], 403), (self.admin, 403)):
            client = APIClient()
            client.force_authenticate(caller)
            urls = ["/api/wilayas", "/api/professionals", f"/api/professionals/{self.professionals[0].pk}/slots", f"/api/professionals/{self.professionals[0].pk}/calendar?month={timezone.localdate():%Y-%m}"]
            for url in urls:
                with self.subTest(role=caller.role, url=url):
                    self.assertEqual(client.get(url).status_code, expected)

    def test_idor_probes_return_same_not_found_for_pending_inactive_wrong_role_and_missing_ids(self):
        client = APIClient()
        client.force_authenticate(self.patient)
        missing = max(pro.pk for pro in self.professionals) + 999
        month = timezone.localdate().strftime("%Y-%m")
        targets = [self.professionals[1].pk, self.professionals[2].pk, self.admin.pk, missing]
        for endpoint in ("slots", "calendar"):
            results = []
            for pro_id in targets:
                url = f"/api/professionals/{pro_id}/{endpoint}"
                if endpoint == "calendar":
                    url += f"?month={month}"
                response = client.get(url)
                results.append((response.status_code, response.data))
            self.assertEqual(results, [(404, {"detail": "Not found."})] * len(targets))

    def test_directory_results_do_not_expose_other_professional_contact_or_address(self):
        target = self.professionals[0]
        target.email = "secret@example.test"
        target.phone = "+213555555555"
        target.save(update_fields=["email", "phone"])
        profile = target.professional_profile
        profile.address = "Private office address"
        profile.save(update_fields=["address"])
        client = APIClient()
        client.force_authenticate(self.patient)
        response = client.get("/api/professionals")
        self.assertEqual(response.status_code, 200)
        rendered = str(response.data)
        for secret in ("secret@example.test", "+213555555555", "Private office address"):
            self.assertNotIn(secret, rendered)
