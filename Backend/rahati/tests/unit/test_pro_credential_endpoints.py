import io
import tempfile

from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.db import transaction
from PIL import Image
from rest_framework.test import APIClient

from rahati.models import ProfessionalProfile, User


def make_png(name="credential.png"):
    buf = io.BytesIO()
    Image.new("RGB", (3, 3), "white").save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(
    FIELD_ENCRYPTION_KEY=Fernet.generate_key(),
    PRIVATE_MEDIA_ROOT=tempfile.mkdtemp(prefix="rahati_private_test_"),
    MEDIA_ROOT=tempfile.mkdtemp(prefix="rahati_public_test_"),
)
class ProfessionalCredentialEndpointTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="credential_owner", password="Pass!2026", role="professional")
        self.profile = ProfessionalProfile.objects.create(
            user=self.owner,
            display_name="Dr Owner",
            city="Algiers",
            credential_file=make_png("initial.png"),
        )
        self.other = User.objects.create_user(username="credential_other", password="Pass!2026", role="professional")
        self.other_profile = ProfessionalProfile.objects.create(
            user=self.other, display_name="Dr Other", city="Oran", credential_file=make_png("other.png")
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.url = "/api/pro/profile/credential"

    def test_owner_can_upload_validated_replacement_and_old_file_removed(self):
        old_name = self.profile.credential_file.name
        old_storage = self.profile.credential_file.storage
        self.assertTrue(old_storage.exists(old_name))
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.put(
                self.url, {"credential_file": make_png("new.png")}, format="multipart"
            )
        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertNotEqual(self.profile.credential_file.name, old_name)
        self.assertFalse(old_storage.exists(old_name))
        self.assertIsNotNone(self.profile.credential_uploaded_at)

    def test_old_file_is_kept_if_database_transaction_rolls_back(self):
        old_name = self.profile.credential_file.name
        storage = self.profile.credential_file.storage
        try:
            with transaction.atomic():
                replacement = self.profile
                replacement.credential_file = make_png("rolled-back.png")
                replacement.save(update_fields=["credential_file"])
                self.assertTrue(storage.exists(old_name))
                raise RuntimeError("rollback")
        except RuntimeError:
            pass
        self.assertTrue(storage.exists(old_name))

    def test_owner_can_download_own_file_as_private_attachment(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(b"".join(response.streaming_content)[:8], b"\x89PNG\r\n\x1a\n")

    def test_other_professional_only_downloads_their_own_file(self):
        self.client.force_authenticate(self.other)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        body = b"".join(response.streaming_content)
        self.assertEqual(body[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(self.other_profile.credential_file.storage.open(self.other_profile.credential_file.name).read(), body)

    def test_patient_cannot_upload_or_download_credentials(self):
        patient = User.objects.create_user(username="credential_patient", password="Pass!2026", role="user")
        self.client.force_authenticate(patient)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(
            self.client.put(self.url, {"credential_file": make_png()}, format="multipart").status_code,
            403,
        )

    def test_invalid_upload_is_rejected_without_replacing_file(self):
        old_name = self.profile.credential_file.name
        bad = SimpleUploadedFile("bad.pdf", b"not a pdf")
        response = self.client.put(self.url, {"credential_file": bad}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.credential_file.name, old_name)

    def test_public_media_url_does_not_serve_private_credential(self):
        response = self.client.get("/media/" + self.profile.credential_file.name)
        self.assertEqual(response.status_code, 404)

    def test_missing_upload_is_rejected(self):
        response = self.client.put(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, 400)
