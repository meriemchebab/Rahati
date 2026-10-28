#!/usr/bin/env bash
# Make executable with: chmod +x build.sh
set -o errexit

uv sync --frozen
cd Backend
uv run --project .. python manage.py collectstatic --no-input
uv run --project .. python manage.py migrate
uv run --project .. python manage.py seed_demo_data
