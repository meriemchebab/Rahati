"""API routes for the rahati app.

Paths (no trailing slash) are the contract the test-suite in tests/ drives.

Order matters: the professional routes (/pro/...) are declared before the
patient routes (/pro/patients/<int:user_id>/...) so nothing shadows anything.
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)

from . import views

app_name = "rahati"

urlpatterns = [
    # ----- auth and account -----
    path("auth/register", views.RegisterView.as_view(), name="register"),
    path(
        "auth/register-professional",
        views.ProfessionalRegisterView.as_view(),
        name="register-professional",
    ),
    path("auth/login", views.ThrottledTokenObtainPairView.as_view(), name="login"),
    path("auth/logout", views.LogoutView.as_view(), name="logout"),
    path("auth/change-password", views.ChangePasswordView.as_view(), name="change-password"),
    path("auth/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/verify", TokenVerifyView.as_view(), name="token-verify"),
    path("me", views.MeView.as_view(), name="me"),
    path("pro/profile", views.ProfessionalProfileView.as_view(), name="pro-profile"),
    path(
        "pro/profile/credential",
        views.ProfessionalCredentialView.as_view(),
        name="pro-profile-credential",
    ),
    # ----- tracking -----
    path("check-ins", views.CheckInView.as_view(), name="check-ins"),
    path("cycle-starts", views.CycleStartView.as_view(), name="cycle-starts"),
    path("journal", views.JournalView.as_view(), name="journal"),
    path("patterns", views.PatternsView.as_view(), name="patterns"),
    # ----- content and to-dos (woman) -----
    path("content-cards", views.ContentCardsView.as_view(), name="content-cards"),
    path("content-cards/<int:pk>", views.CardDetailView.as_view(), name="content-card-detail"),
    path(
        "content-cards/<int:card_id>/add-todo",
        views.AddCardTodoView.as_view(),
        name="content-card-add-todo",
    ),
    path("todos", views.TodoView.as_view(), name="todos"),
    path("todos/<int:pk>", views.TodoDetailView.as_view(), name="todo-detail"),
    path("todos/<int:pk>/complete", views.TodoCompleteView.as_view(), name="todo-complete"),
    path("todos/<int:pk>/reopen", views.TodoReopenView.as_view(), name="todo-reopen"),
    # ----- care: user side -----
    path("wilayas", views.WilayaListView.as_view(), name="wilayas"),
    path("professionals", views.ProfessionalListView.as_view(), name="professionals"),
    path(
        "professionals/<int:pro_id>/slots",
        views.FreeSlotsView.as_view(),
        name="professional-slots",
    ),
    path(
        "professionals/<int:pro_id>/calendar",
        views.ProfessionalCalendarView.as_view(),
        name="professional-calendar",
    ),
    path("sessions", views.SessionView.as_view(), name="sessions"),
    path("sessions/<int:pk>", views.SessionUpdateView.as_view(), name="session-update"),
    path("consents", views.ConsentView.as_view(), name="consents"),
    # ----- care: professional side — content management -----
    path("pro/content", views.ProContentListView.as_view(), name="pro-content"),
    path("pro/content/<int:pk>", views.ProContentDetailView.as_view(), name="pro-content-detail"),
    # ----- care: professional side — slots -----
    path("pro/slots", views.ProSlotsView.as_view(), name="pro-slots"),
    path("pro/availability", views.ProAvailabilityView.as_view(), name="pro-availability"),
    path("pro/time-off", views.ProTimeOffView.as_view(), name="pro-time-off"),
    path("pro/calendar", views.ProCalendarView.as_view(), name="pro-calendar"),
    path("pro/patients", views.PatientListView.as_view(), name="pro-patients"),
    path(
        "pro/patients/<int:user_id>/todos",
        views.PatientTodoView.as_view(),
        name="pro-patient-todos",
    ),
    path(
        "pro/patients/<int:user_id>/content",
        views.PatientContentTodoView.as_view(),
        name="pro-patient-content-todo",
    ),
    path(
        "pro/patients/<int:user_id>/todos/<int:pk>",
        views.PatientTodoDetailView.as_view(),
        name="pro-patient-todo-detail",
    ),
    path(
        "pro/patients/<int:user_id>/check-ins",
        views.PatientCheckIns.as_view(),
        name="pro-patient-check-ins",
    ),
    path(
        "pro/patients/<int:user_id>/journal",
        views.PatientJournal.as_view(),
        name="pro-patient-journal",
    ),
    path(
        "pro/patients/<int:user_id>/cycle",
        views.PatientCycle.as_view(),
        name="pro-patient-cycle",
    ),
    path(
        "pro/sessions/<int:pk>/note",
        views.SessionNoteView.as_view(),
        name="pro-session-note",
    ),
]
