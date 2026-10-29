"""Settings for isolated end-to-end runs; never uses the developer database."""

import os

from .settings import *  # noqa: F401,F403


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ["E2E_DB_PATH"],
    }
}
