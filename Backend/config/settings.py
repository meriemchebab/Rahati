"""
Django settings for config project.

Environment variables are read from Backend/.env (and the process environment).
"""

import os
import secrets
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env(name, default=None, required=False):
    """Read an env var, treating an empty string as unset."""
    value = os.environ.get(name)
    if value in (None, ""):
        if required:
            raise ImproperlyConfigured(f"Set the {name} environment variable (Backend/.env).")
        return default
    return value


def env_list(name, default=""):
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


# --------------------------------------------------------------------------
# Core
# --------------------------------------------------------------------------

DEBUG = env("DJANGO_DEBUG", "false").lower() in ("1", "true", "yes", "on")

SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY for non-debug deployments.")
    SECRET_KEY = secrets.token_urlsafe(64)

SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT", "false" if DEBUG else "true").lower() in (
    "1", "true", "yes", "on"
)
SECURE_HSTS_SECONDS = int(env("SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", "false" if DEBUG else "true"
).lower() in ("1", "true", "yes", "on")
SECURE_HSTS_PRELOAD = env("SECURE_HSTS_PRELOAD", "false" if DEBUG else "true").lower() in (
    "1", "true", "yes", "on"
)
SESSION_COOKIE_SECURE = env("SESSION_COOKIE_SECURE", "false" if DEBUG else "true").lower() in (
    "1", "true", "yes", "on"
)
CSRF_COOKIE_SECURE = env("CSRF_COOKIE_SECURE", "false" if DEBUG else "true").lower() in (
    "1", "true", "yes", "on"
)

ALLOWED_HOSTS = ["*"]

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")


# --------------------------------------------------------------------------
# Application definition
# --------------------------------------------------------------------------

INSTALLED_APPS = [
    # local
    "rahati",
    # third party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# --------------------------------------------------------------------------
# Database (DATABASE_URL for managed PostgreSQL, SQLite otherwise for local development)
# --------------------------------------------------------------------------

import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}


# --------------------------------------------------------------------------
# Password validation
# --------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# --------------------------------------------------------------------------
# Internationalization
# --------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Algiers"
USE_I18N = True
USE_TZ = True


# --------------------------------------------------------------------------
# Static and media files
# --------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# Credential documents are stored here and are NEVER served via a URL.
# Set PRIVATE_MEDIA_ROOT to an absolute path outside the web root in production.
PRIVATE_MEDIA_ROOT = Path(env("PRIVATE_MEDIA_ROOT", str(BASE_DIR / "private_media")))


# --------------------------------------------------------------------------
# Email (prints to the console in development)
# --------------------------------------------------------------------------

EMAIL_BACKEND = env(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "no-reply@rahati.local")


# --------------------------------------------------------------------------
# Django REST framework + JWT
# --------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # Content endpoints: read-heavy but still rate-limited to deter scraping.
        "content_read": "600/hour",
        # Write operations (create, patch, delete, assign) — tighter limit.
        "content_write": "60/hour",
        "pro_register": "5/hour",
        "auth_login": "10/minute",
        "directory_search": "120/hour",
        "directory_calendar": "240/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}


# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# --------------------------------------------------------------------------
# Rahati
# --------------------------------------------------------------------------

AUTH_USER_MODEL = "rahati.User"

# Fernet key used to encrypt journal entries and session notes at rest.
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", required=True)


# --------------------------------------------------------------------------
# Cache (used by ScopedRateThrottle; LocMemCache is fine in dev/test)
# --------------------------------------------------------------------------

CACHES = {
    "default": {
        "BACKEND": env(
            "CACHE_BACKEND",
            "django.core.cache.backends.locmem.LocMemCache",
        ),
        "LOCATION": env("CACHE_LOCATION", "rahati-default"),
    }
}
