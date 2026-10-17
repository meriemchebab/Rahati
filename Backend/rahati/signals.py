"""File lifecycle signals for Rahati.

Ensures that a credential file stored in PRIVATE_MEDIA_ROOT is removed from
the filesystem when:

  1. The ProfessionalProfile is deleted  (post_delete).
  2. The credential_file field is replaced with a new upload  (pre_save).

Both signals use ``storage.delete()`` (via the FieldFile helper) instead of
``os.remove()`` directly so the logic stays compatible if the storage backend
is swapped out in future (e.g. a vendor-managed secure object store).

Why post_delete and not pre_delete?
  post_delete fires after the DB row is gone, so a crash during file deletion
  leaves a dangling file but does NOT leave a DB row with a missing file.
  That is the safer failure mode: an orphaned file is discoverable with a
  periodic audit; a DB row referencing a missing file would crash every
  access.

Why pre_save and not post_save for replacement?
  pre_save still has access to the OLD file path via the database. After
  post_save the field already holds the new value and the old path is lost.
"""
import logging
from django.db import transaction

from django.db import models
from django.dispatch import receiver

from .models import ProfessionalProfile

logger = logging.getLogger(__name__)


def _delete_file(file_field) -> None:
    """Delete the physical file backing a FieldFile (silently on failure)."""
    if not file_field or not file_field.name:
        return
    try:
        storage = file_field.storage
        if storage.exists(file_field.name):
            storage.delete(file_field.name)
            logger.info("Deleted credential file: %s", file_field.name)
    except Exception:
        # Log but never crash: a missing/locked file must not break the
        # delete/update transaction.
        logger.exception(
            "Could not delete credential file '%s'. Manual cleanup may be required.",
            file_field.name,
        )


@receiver(models.signals.post_delete, sender=ProfessionalProfile)
def _credential_post_delete(sender, instance, **kwargs):
    """Remove the credential file when the profile row is deleted."""
    _delete_file(instance.credential_file)


@receiver(models.signals.pre_save, sender=ProfessionalProfile)
def _credential_pre_save(sender, instance, **kwargs):
    """Remove the OLD credential file when it is being replaced.

    Fires only when the instance already exists in the database (pk is set)
    AND the file field value has actually changed. The old blob is removed
    only after the surrounding database transaction commits.
    """
    if not instance.pk:
        # New profile, nothing to delete.
        return

    try:
        old = ProfessionalProfile.objects.get(pk=instance.pk)
    except ProfessionalProfile.DoesNotExist:
        return

    old_file = old.credential_file
    new_file = instance.credential_file

    # Compare by name; both may be empty strings / None when no file exists.
    if old_file and old_file.name and old_file.name != getattr(new_file, "name", None):
        storage = old_file.storage
        old_name = old_file.name
        transaction.on_commit(lambda: storage.delete(old_name) if storage.exists(old_name) else None)
