"""
URL configuration for backend project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from core import views

urlpatterns = [
    path("admin/", admin.site.urls),

    # System & Health
    path("api/health/", views.health_check, name="health-check"),
    path("api/auth/csrf/", views.csrf_token_view, name="csrf-token"),

    # Authentication & User Profile
    path("api/auth/register/", views.register, name="register"),
    path("api/auth/login/", views.user_login, name="login"),
    path("api/auth/logout/", views.user_logout, name="logout"),
    path("api/auth/me/", views.current_user, name="current-user"),
    path("api/auth/profile/", views.user_profile_view, name="user-profile"),

    # Dashboard & Analytics
    path("api/dashboard/", views.dashboard, name="dashboard"),
    path("api/analytics/", views.analytics_view, name="analytics"),

    # Job Applications
    path("api/applications/", views.applications, name="applications"),
    path("api/applications/<int:application_id>/", views.application_detail, name="application-detail"),

    # Interviews
    path("api/interviews/", views.interviews, name="interviews"),
    path("api/interviews/<int:interview_id>/", views.interview_detail, name="interview-detail"),

    # Skill Analysis (Rule-Based Analyzer & Persistence)
    path("api/skills/analyze/", views.analyze_skills_view, name="analyze-skills"),
    path("api/skills/reports/", views.analysis_reports_list, name="analysis-reports-list"),
    path("api/skills/reports/<int:report_id>/", views.analysis_report_detail, name="analysis-report-detail"),
    path("api/skills/", views.skill_analysis, name="skill-analysis"),

    # Interview Preparation & Readiness Tracker
    path("api/prep/", views.interview_prep_items, name="interview-prep-items"),
    path("api/prep/<int:item_id>/", views.interview_prep_detail, name="interview-prep-detail"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)