from django.apps import AppConfig


class RahatiConfig(AppConfig):
    name = "rahati"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        # Register file lifecycle signals (credential file delete / replace).
        import rahati.signals  # noqa: F401
