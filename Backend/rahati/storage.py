"""Private file storage for Rahati.

Credential files submitted by professionals must never be served by Django's
development server (MEDIA_URL) or by a CDN.  PrivateMediaStorage stores them
on the local filesystem under PRIVATE_MEDIA_ROOT (outside MEDIA_ROOT) with
base_url = None so that no URL can be constructed from a FileField value.

File names are replaced with a UUID + the original extension so that:
  - the original filename (which may contain PII) is not persisted,
  - collisions across uploads are impossible,
  - the extension gives the admin a basic content-type hint without trusting
    the client-supplied name (the upload view should also sniff the magic
    bytes before accepting the file).

Usage in a model field:
    from rahati.storage import PrivateMediaStorage, private_credential_path

    credential_file = models.FileField(
        storage=PrivateMediaStorage(),
        upload_to=private_credential_path,
    )
"""
import os
import uuid

from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateMediaStorage(FileSystemStorage):
    """FileSystemStorage rooted at settings.PRIVATE_MEDIA_ROOT.

    base_url is intentionally None: there is no URL that serves these files.
    Any attempt to call .url() on a FileField using this storage will raise
    ValueError, which is the correct fail-closed behaviour.

    Both ``location`` and ``base_url`` are resolved *lazily* on every access
    rather than being frozen in ``__init__``.  Django's ``FileSystemStorage``
    only reacts to the ``MEDIA_ROOT`` / ``MEDIA_URL`` settings (see
    ``StorageSettingsMixin._clear_cached_properties``), so caching
    ``PRIVATE_MEDIA_ROOT`` at import time silently ignores
    ``@override_settings(PRIVATE_MEDIA_ROOT=...)`` and made the test suite
    write real uploads into ``Backend/private_media/``.
    """

    def __init__(self, *args, **kwargs):
        # Callers may still pass an explicit location; otherwise it is read
        # from settings on each access.
        self._explicit_location = kwargs.pop("location", None)
        # Not passed to super(): FileSystemStorage would fall back to
        # MEDIA_URL whenever it is None, which would defeat the fail-closed
        # guarantee.  The base_url property below is overridden instead.
        kwargs.pop("base_url", None)
        super().__init__(*args, **kwargs)

    @property
    def base_location(self):
        return self._explicit_location or settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    @property
    def base_url(self):
        # Always None, so FileSystemStorage.url() raises ValueError.
        return None


def private_credential_path(instance, filename: str) -> str:
    """Generate a UUID-based upload path, preserving the original extension.

    The extension is lower-cased and capped at 10 characters to prevent path
    traversal abuse through absurdly long extensions.  If no extension is
    present the file is stored without one (the admin can still download it).

    Returned path example:  credentials/3f2504e0-…-c155d6.pdf
    """
    _, raw_ext = os.path.splitext(filename)
    ext = raw_ext.lower()[:10]          # e.g. ".pdf", ".jpg"
    return f"credentials/{uuid.uuid4()}{ext}"
