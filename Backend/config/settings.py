"""
Django settings for config project.

Environment variables are read from Backend/.env (and the process environment).
"""

import os
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

SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-dev-only-change-me")

DEBUG = env("DJANGO_DEBUG", "true").lower() in ("1", "true", "yes", "on")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")


# --------------------------------------------------------------------------
# Application definition
# --------------------------------------------------------------------------

INSTALLED_APPS = [
    # local
    "rahati",
    # third party
    "rest_framework",
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
# Database (MySQL when DB_ENGINE is set, SQLite otherwise)
# --------------------------------------------------------------------------

if env("DB_ENGINE"):
    DATABASES = {
        "default": {
            "ENGINE": env("DB_ENGINE"),
            "NAME": env("DB_NAME", "rahati"),
            "USER": env("DB_USER", "root"),
            "PASSWORD": env("DB_PASSWORD", ""),
            "HOST": env("DB_HOST", "127.0.0.1"),
            "PORT": env("DB_PORT", "3306"),
            "OPTIONS": {"charset": "utf8mb4"},
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
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
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
}


# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
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
