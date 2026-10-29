from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from .health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/", include("rahati.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
