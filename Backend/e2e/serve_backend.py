"""Migrate and serve Django using a fresh disposable SQLite database."""

import os
import sys
import tempfile
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def main():
    with tempfile.TemporaryDirectory(prefix="rahati-e2e-") as temp_dir:
        env = os.environ.copy()
        env.update(
            {
                "DJANGO_SETTINGS_MODULE": "config.e2e_settings",
                "DJANGO_DEBUG": "true",
                "DJANGO_SECRET_KEY": "e2e-only-not-a-secret-key-for-tests",
                "FIELD_ENCRYPTION_KEY": "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
                "E2E_DB_PATH": os.path.join(temp_dir, "rahati-e2e.sqlite3"),
                "SECURE_SSL_REDIRECT": "false",
            }
        )
        os.environ.update(env)

        from django import setup
        from django.core.management import call_command

        setup()
        call_command("migrate", interactive=False, verbosity=0)
        call_command("e2e_seed", verbosity=0)

        port = os.environ.get("E2E_BACKEND_PORT", "8010")
        call_command("runserver", f"127.0.0.1:{port}", "--noreload")


if __name__ == "__main__":
    main()
