from datetime import datetime
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .analyzer import analyze_skills
from .models import (
    JobApplication,
    Interview,
    SkillAnalysis,
    SkillAnalysisReport,
    InterviewPrepItem,
    UserProfile,
)
from .prep_data import DEFAULT_PREP_ITEMS
from .serializers import (
    RegisterSerializer,
    JobApplicationSerializer,
    JobApplicationDetailSerializer,
    InterviewSerializer,
    SkillAnalysisSerializer,
    SkillAnalysisReportSerializer,
    InterviewPrepItemSerializer,
    UserSerializer,
    UserProfileSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def health_check(request):
    return Response({
        "status": "success",
        "message": "CareerFlow API is running.",
        "timestamp": timezone.now().isoformat(),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
@ensure_csrf_cookie
def csrf_token_view(request):
    csrf_token = get_token(request)
    return Response({
        "csrfToken": csrf_token,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        login(request, user)

        # Seed default interview prep items for the newly registered user
        prep_objects = [
            InterviewPrepItem(
                user=user,
                category=item["category"],
                title=item["title"],
                description=item["description"],
            )
            for item in DEFAULT_PREP_ITEMS
        ]
        InterviewPrepItem.objects.bulk_create(prep_objects)

        return Response(
            {
                "message": "Account created successfully.",
                "user": UserSerializer(user).data,
                "csrfToken": get_token(request),
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def user_login(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {
                "message": "Username and password are required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None:
        return Response(
            {
                "message": "Invalid username or password."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)

    return Response({
        "message": "Login successful.",
        "user": UserSerializer(user).data,
        "csrfToken": get_token(request),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def user_logout(request):
    logout(request)
    return Response({
        "message": "Logout successful.",
        "csrfToken": get_token(request),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return Response({
        "user": UserSerializer(request.user).data,
        "profile": UserProfileSerializer(profile).data,
        "csrfToken": get_token(request),
    })


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return Response(UserProfileSerializer(profile).data)

    serializer = UserProfileSerializer(
        profile,
        data=request.data,
        partial=request.method == "PATCH",
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def applications(request):
    if request.method == "GET":
        queryset = (
            JobApplication.objects
            .filter(user=request.user)
            .prefetch_related("interviews")
        )

        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(company_name__icontains=search_query) |
                Q(job_title__icontains=search_query) |
                Q(location__icontains=search_query) |
                Q(notes__icontains=search_query)
            )

        status_filter = request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        queryset = queryset.order_by("-created_at")
        serializer = JobApplicationSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = JobApplicationSerializer(data=request.data)
    if serializer.is_valid():
        application = serializer.save(user=request.user)
        return Response(
            JobApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def application_detail(request, application_id):
    try:
        application = JobApplication.objects.prefetch_related(
            "interviews",
            "skill_analyses",
            "analysis_reports"
        ).get(
            id=application_id,
            user=request.user,
        )
    except JobApplication.DoesNotExist:
        return Response(
            {"message": "Application not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = JobApplicationDetailSerializer(application)
        return Response(serializer.data)

    if request.method in ["PUT", "PATCH"]:
        serializer = JobApplicationSerializer(
            application,
            data=request.data,
            partial=request.method == "PATCH",
        )
        if serializer.is_valid():
            updated_app = serializer.save()
            return Response(JobApplicationDetailSerializer(updated_app).data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    application.delete()
    return Response(
        {"message": "Application deleted successfully."},
        status=status.HTTP_204_NO_CONTENT,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def interviews(request):
    if request.method == "GET":
        queryset = (
            Interview.objects
            .filter(application__user=request.user)
            .select_related("application")
        )

        status_param = request.query_params.get("status")
        if status_param == "upcoming":
            queryset = queryset.filter(completed=False)
        elif status_param == "completed":
            queryset = queryset.filter(completed=True)

        app_id = request.query_params.get("application")
        if app_id:
            queryset = queryset.filter(application_id=app_id)

        queryset = queryset.order_by("scheduled_at")
        serializer = InterviewSerializer(queryset, many=True)
        return Response(serializer.data)

    application_id = request.data.get("application")
    if not application_id:
        return Response(
            {"message": "An application ID is required to schedule an interview."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        application = JobApplication.objects.get(
            id=application_id,
            user=request.user,
        )
    except JobApplication.DoesNotExist:
        return Response(
            {"message": "Application not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = InterviewSerializer(data=request.data)
    if serializer.is_valid():
        interview = serializer.save(application=application)

        # Automatically advance application status to 'interview' if currently saved/applied/screening
        if application.status in ["saved", "applied", "screening"]:
            application.status = "interview"
            application.save()

        return Response(
            InterviewSerializer(interview).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def interview_detail(request, interview_id):
    try:
        interview = Interview.objects.select_related("application").get(
            id=interview_id,
            application__user=request.user,
        )
    except Interview.DoesNotExist:
        return Response(
            {"message": "Interview not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = InterviewSerializer(interview)
        return Response(serializer.data)

    if request.method in ["PUT", "PATCH"]:
        new_app_id = request.data.get("application")
        if new_app_id and str(new_app_id) != str(interview.application_id):
            try:
                JobApplication.objects.get(id=new_app_id, user=request.user)
            except JobApplication.DoesNotExist:
                return Response(
                    {"message": "Invalid application for current user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = InterviewSerializer(
            interview,
            data=request.data,
            partial=request.method == "PATCH",
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    interview.delete()
    return Response(
        {"message": "Interview deleted successfully."},
        status=status.HTTP_204_NO_CONTENT,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    apps = JobApplication.objects.filter(user=request.user)
    user_interviews = Interview.objects.filter(application__user=request.user)

    total_apps = apps.count()
    applied_count = apps.filter(status="applied").count()
    screening_count = apps.filter(status="screening").count()
    interview_stage_count = apps.filter(status="interview").count()
    offers_count = apps.filter(status="offer").count()
    rejected_count = apps.filter(status="rejected").count()
    saved_count = apps.filter(status="saved").count()

    total_interviews = user_interviews.count()
    upcoming_interviews_qs = (
        user_interviews
        .filter(completed=False)
        .select_related("application")
        .order_by("scheduled_at")
    )
    upcoming_interviews_count = upcoming_interviews_qs.count()

    # Recent 5 applications
    recent_apps = apps.order_by("-created_at")[:5]
    recent_apps_data = JobApplicationSerializer(recent_apps, many=True).data

    # Upcoming 5 interviews
    upcoming_interviews_data = InterviewSerializer(upcoming_interviews_qs[:5], many=True).data

    # Breakdown by status
    status_counts = (
        apps.values("status")
        .annotate(total=Count("id"))
        .order_by("status")
    )

    # Missing skill gaps from analysis reports
    missing_skill_counts = {}
    reports = SkillAnalysisReport.objects.filter(user=request.user)
    for r in reports:
        for sk in r.missing_skills:
            missing_skill_counts[sk] = missing_skill_counts.get(sk, 0) + 1

    sorted_skill_gaps = sorted(
        [{"skill": k, "count": v} for k, v in missing_skill_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    return Response({
        "total_applications": total_apps,
        "applied": applied_count,
        "screening": screening_count,
        "interview_stage": interview_stage_count,
        "interviews": total_interviews,
        "offers": offers_count,
        "rejected": rejected_count,
        "saved": saved_count,
        "upcoming_interviews": upcoming_interviews_count,
        "recent_applications": recent_apps_data,
        "upcoming_interviews_list": upcoming_interviews_data,
        "status_breakdown": list(status_counts),
        "top_skill_gaps": sorted_skill_gaps,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_skills_view(request):
    resume_text = request.data.get("resume_text", "").strip()
    job_description = request.data.get("job_description", "").strip()
    application_id = request.data.get("application_id")
    save_report = request.data.get("save_report", True)

    application = None
    if application_id:
        try:
            application = JobApplication.objects.get(
                id=application_id,
                user=request.user,
            )
            # If job_description is not provided, use the application's job_description
            if not job_description and application.job_description:
                job_description = application.job_description
        except JobApplication.DoesNotExist:
            return Response(
                {"message": "Application not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    if not resume_text:
        # Check if user has skills in profile
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.skills:
            resume_text = profile.skills
        else:
            return Response(
                {"message": "Please provide your resume text or add skills in your profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if not job_description:
        return Response(
            {"message": "Please provide the job description text to compare against."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Perform rule-based analysis
    result = analyze_skills(resume_text, job_description)

    # Persist report if requested
    report_obj = None
    if save_report:
        report_obj = SkillAnalysisReport.objects.create(
            user=request.user,
            application=application,
            job_title=application.job_title if application else request.data.get("job_title", "Custom Job"),
            company_name=application.company_name if application else request.data.get("company_name", ""),
            match_percentage=result["match_percentage"],
            skills_found_in_resume=result["skills_found_in_resume"],
            skills_required=result["skills_required"],
            matching_skills=result["matching_skills"],
            missing_skills=result["missing_skills"],
            important_skills=result["important_skills"],
        )
        result["report_id"] = report_obj.id

        # Also populate or sync SkillAnalysis entries for this application
        if application:
            # Clear old skill analysis entries for this app to stay clean
            SkillAnalysis.objects.filter(user=request.user, application=application).delete()
            bulk_skills = []
            for item in result["important_skills"]:
                bulk_skills.append(
                    SkillAnalysis(
                        user=request.user,
                        application=application,
                        skill_name=item["skill"],
                        user_has_skill=(item["status"] == "Matched"),
                        importance=item["importance"].lower(),
                    )
                )
            if bulk_skills:
                SkillAnalysis.objects.bulk_create(bulk_skills)

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analysis_reports_list(request):
    reports = SkillAnalysisReport.objects.filter(user=request.user).order_by("-created_at")
    serializer = SkillAnalysisReportSerializer(reports, many=True)
    return Response(serializer.data)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def analysis_report_detail(request, report_id):
    try:
        report = SkillAnalysisReport.objects.get(id=report_id, user=request.user)
    except SkillAnalysisReport.DoesNotExist:
        return Response({"message": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(SkillAnalysisReportSerializer(report).data)

    report.delete()
    return Response({"message": "Report deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def skill_analysis(request):
    if request.method == "GET":
        queryset = SkillAnalysis.objects.filter(
            user=request.user
        ).order_by("-created_at")

        app_id = request.query_params.get("application")
        if app_id:
            queryset = queryset.filter(application_id=app_id)

        serializer = SkillAnalysisSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = SkillAnalysisSerializer(data=request.data)
    if serializer.is_valid():
        application_id = request.data.get("application")
        application = None
        if application_id:
            try:
                application = JobApplication.objects.get(
                    id=application_id,
                    user=request.user,
                )
            except JobApplication.DoesNotExist:
                return Response(
                    {"message": "Application not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        skill = serializer.save(
            user=request.user,
            application=application,
        )

        return Response(
            SkillAnalysisSerializer(skill).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def interview_prep_items(request):
    # Ensure default items exist for this user
    user_items = InterviewPrepItem.objects.filter(user=request.user)
    if not user_items.exists():
        prep_objects = [
            InterviewPrepItem(
                user=request.user,
                category=item["category"],
                title=item["title"],
                description=item["description"],
            )
            for item in DEFAULT_PREP_ITEMS
        ]
        InterviewPrepItem.objects.bulk_create(prep_objects)
        user_items = InterviewPrepItem.objects.filter(user=request.user)

    if request.method == "GET":
        category_param = request.query_params.get("category")
        if category_param:
            user_items = user_items.filter(category=category_param)

        total_count = user_items.count()
        completed_count = user_items.filter(is_completed=True).count()
        readiness_score = round((completed_count / total_count * 100)) if total_count > 0 else 0

        serializer = InterviewPrepItemSerializer(user_items, many=True)
        return Response({
            "items": serializer.data,
            "metrics": {
                "total": total_count,
                "completed": completed_count,
                "remaining": total_count - completed_count,
                "readiness_score": readiness_score,
            }
        })

    serializer = InterviewPrepItemSerializer(data=request.data)
    if serializer.is_valid():
        item = serializer.save(user=request.user)
        return Response(
            InterviewPrepItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def interview_prep_detail(request, item_id):
    try:
        item = InterviewPrepItem.objects.get(id=item_id, user=request.user)
    except InterviewPrepItem.DoesNotExist:
        return Response({"message": "Prep item not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(InterviewPrepItemSerializer(item).data)

    if request.method in ["PUT", "PATCH"]:
        serializer = InterviewPrepItemSerializer(
            item,
            data=request.data,
            partial=request.method == "PATCH",
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    item.delete()
    return Response({"message": "Item deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_view(request):
    apps = JobApplication.objects.filter(user=request.user)
    interviews_qs = Interview.objects.filter(application__user=request.user)
    reports = SkillAnalysisReport.objects.filter(user=request.user)

    total_apps = apps.count()
    status_counts = list(
        apps.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    # Timeline: applications grouped by date/month (using application_date or created_at)
    timeline_dict = {}
    for app in apps:
        dt = app.application_date or app.created_at.date()
        month_key = dt.strftime("%b %Y")
        timeline_dict[month_key] = timeline_dict.get(month_key, 0) + 1

    timeline_data = [{"period": k, "count": v} for k, v in timeline_dict.items()]

    # Interviews breakdown
    interviews_by_type = list(
        interviews_qs.values("interview_type")
        .annotate(count=Count("id"))
        .order_by("interview_type")
    )
    total_interviews = interviews_qs.count()
    completed_interviews = interviews_qs.filter(completed=True).count()
    upcoming_interviews = interviews_qs.filter(completed=False).count()

    # Offers and Rejections
    offers_count = apps.filter(status="offer").count()
    rejections_count = apps.filter(status="rejected").count()

    offer_rate = round((offers_count / total_apps * 100), 1) if total_apps > 0 else 0.0
    rejection_rate = round((rejections_count / total_apps * 100), 1) if total_apps > 0 else 0.0
    interview_rate = round((interviews_qs.values("application").distinct().count() / total_apps * 100), 1) if total_apps > 0 else 0.0

    # Skill gaps aggregated from real user reports
    skill_gap_counts = {}
    for r in reports:
        for sk in r.missing_skills:
            skill_gap_counts[sk] = skill_gap_counts.get(sk, 0) + 1

    sorted_skill_gaps = sorted(
        [{"skill": k, "count": v} for k, v in skill_gap_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # Conversion Funnel
    saved_count = apps.filter(status="saved").count()
    applied_count = apps.filter(status="applied").count()
    screening_count = apps.filter(status="screening").count()
    interview_stage_count = apps.filter(status="interview").count()

    funnel = [
        {"stage": "Saved", "count": saved_count},
        {"stage": "Applied", "count": applied_count},
        {"stage": "Screening", "count": screening_count},
        {"stage": "Interviewing", "count": interview_stage_count},
        {"stage": "Offers", "count": offers_count},
        {"stage": "Rejected", "count": rejections_count},
    ]

    return Response({
        "total_applications": total_apps,
        "applications_by_status": status_counts,
        "applications_over_time": timeline_data,
        "interview_metrics": {
            "total": total_interviews,
            "completed": completed_interviews,
            "upcoming": upcoming_interviews,
            "by_type": interviews_by_type,
            "interview_rate_percentage": interview_rate,
        },
        "offer_metrics": {
            "total_offers": offers_count,
            "offer_rate_percentage": offer_rate,
        },
        "rejection_metrics": {
            "total_rejections": rejections_count,
            "rejection_rate_percentage": rejection_rate,
        },
        "skill_gaps": sorted_skill_gaps,
        "funnel": funnel,
    })