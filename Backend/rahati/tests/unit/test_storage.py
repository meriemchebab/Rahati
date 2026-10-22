"""Regression tests for PrivateMediaStorage.

Two bugs let the test suite write real credential uploads into the repo:

1.  ``location`` was frozen from ``settings.PRIVATE_MEDIA_ROOT`` at import
    time, so ``@override_settings(PRIVATE_MEDIA_ROOT=...)`` had no effect and
    files leaked into ``Backend/private_media/credentials/``.
2.  ``base_url`` was set to ``None`` via ``kwargs``, but Django's
    ``FileSystemStorage`` treats a falsy ``_base_url`` as "use MEDIA_URL", so
    ``.url()`` happily built ``/media/credentials/...`` for private files.
"""
import os
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings

from rahati.storage import PrivateMediaStorage


class PrivateMediaStorageTests(SimpleTestCase):
    def test_location_follows_override_settings(self):
        root = tempfile.mkdtemp(prefix="rahati_storage_test_")
        with override_settings(PRIVATE_MEDIA_ROOT=root):
            storage = PrivateMediaStorage()
            self.assertEqual(storage.location, os.path.abspath(root))

    def test_location_is_not_frozen_at_import_time(self):
        storage = PrivateMediaStorage()
        first = storage.location
        with override_settings(PRIVATE_MEDIA_ROOT=tempfile.mkdtemp(prefix="rahati_second_")):
            self.assertNotEqual(storage.location, first)

    def test_explicit_location_wins_over_settings(self):
        explicit = tempfile.mkdtemp(prefix="rahati_explicit_")
        with override_settings(PRIVATE_MEDIA_ROOT=tempfile.mkdtemp(prefix="rahati_ignored_")):
            storage = PrivateMediaStorage(location=explicit)
            self.assertEqual(storage.location, os.path.abspath(explicit))

    def test_base_url_is_none_and_url_raises(self):
        storage = PrivateMediaStorage()
        self.assertIsNone(storage.base_url)
        with self.assertRaisesMessage(ValueError, "not accessible via a URL"):
            storage.url("credentials/example.png")

    def test_saves_under_the_overridden_root(self):
        root = tempfile.mkdtemp(prefix="rahati_save_test_")
        with override_settings(PRIVATE_MEDIA_ROOT=root):
            storage = PrivateMediaStorage()
            name = storage.save(
                "credentials/example.png",
                SimpleUploadedFile("example.png", b"payload", content_type="image/png"),
            )
            try:
                self.assertTrue(os.path.exists(os.path.join(storage.location, name)))
            finally:
                storage.delete(name)
