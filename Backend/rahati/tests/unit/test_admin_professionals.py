import tempfile

from django.contrib import admin
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework_simplejwt.tokens import AccessToken

from rahati.admin import ProfessionalProfileAdmin
from rahati.models import AuditLog, ProfessionalProfile, User


@override_settings(PRIVATE_MEDIA_ROOT=tempfile.mkdtemp(prefix="rahati_admin_private_"))
class ProfessionalAdminTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff_admin", password="AdminPass!2026", is_staff=True, is_active=True
        )
        self.user = User.objects.create_user(
            username="pro_admin_test", password="ProPass!2026", role="professional"
        )
        self.profile = ProfessionalProfile.objects.create(
            user=self.user,
            display_name="Dr Review",
            city="Algiers",
            credential_file=SimpleUploadedFile("credential.pdf", b"%PDF-1.4\n%%EOF"),
        )
        self.model_admin = ProfessionalProfileAdmin(ProfessionalProfile, AdminSite())
        self.factory = RequestFactory()

    def test_profile_fields_are_all_read_only(self):
        request = self.factory.get("/admin/")
        request.user = self.staff
        readonly = set(self.model_admin.get_readonly_fields(request, self.profile))
        self.assertEqual(
            readonly,
            {field.name for field in ProfessionalProfile._meta.fields} - {"wilaya"},
        )

    def test_credential_view_streams_and_audits_for_active_staff(self):
        self.client.force_login(self.staff)
        response = self.client.get(
            f"/admin/rahati/professionalprofile/{self.profile.pk}/credential/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn("private, no-store", response["Cache-Control"])
        self.assertEqual(b"".join(response.streaming_content), b"%PDF-1.4\n%%EOF")
        self.assertTrue(AuditLog.objects.filter(action="pro_credential_review", actor=self.staff).exists())

    def test_inactive_staff_is_denied_credential_stream(self):
        self.staff.is_active = False
        self.staff.save(update_fields=["is_active"])
        self.client.force_login(self.staff)
        response = self.client.get(
            f"/admin/rahati/professionalprofile/{self.profile.pk}/credential/"
        )
        self.assertIn(response.status_code, (302, 403))

    def test_verification_action_uses_service_and_audits(self):
        request = self.factory.post("/admin/")
        request.user = self.staff
        self.model_admin.verify_selected(request, ProfessionalProfile.objects.filter(pk=self.profile.pk))
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, ProfessionalProfile.Status.VERIFIED)
        self.assertEqual(self.profile.verified_by, self.staff)
        self.assertTrue(AuditLog.objects.filter(action="pro_verify", actor=self.staff).exists())

    def test_rejection_action_uses_service_and_audits(self):
        request = self.factory.post("/admin/", {"rejection_reason": "Blurry file"})
        request.user = self.staff
        self.model_admin.reject_selected(request, ProfessionalProfile.objects.filter(pk=self.profile.pk))
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, ProfessionalProfile.Status.REJECTED)
        self.assertEqual(self.profile.rejection_reason, "Blurry file")
        self.assertTrue(AuditLog.objects.filter(action="pro_reject", actor=self.staff).exists())

    def test_admin_credential_route_is_registered(self):
        paths = [str(route.pattern) for route in self.model_admin.get_urls()]
        self.assertTrue(any("credential/" in route for route in paths))
