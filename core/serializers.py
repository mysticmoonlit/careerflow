from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    UserProfile,
    JobApplication,
    Interview,
    SkillAnalysis,
    SkillAnalysisReport,
    InterviewPrepItem,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "phone",
            "location",
            "headline",
            "skills",
            "resume",
            "created_at",
            "updated_at",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        UserProfile.objects.create(user=user)

        return user


class JobApplicationSerializer(serializers.ModelSerializer):
    interviews_count = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "company_name",
            "job_title",
            "job_url",
            "location",
            "employment_type",
            "status",
            "application_date",
            "salary_range",
            "job_description",
            "notes",
            "interviews_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "interviews_count",
        ]

    def get_interviews_count(self, obj):
        return obj.interviews.count()


class InterviewSerializer(serializers.ModelSerializer):
    application_title = serializers.CharField(
        source="application.job_title",
        read_only=True
    )

    company_name = serializers.CharField(
        source="application.company_name",
        read_only=True
    )

    class Meta:
        model = Interview
        fields = [
            "id",
            "application",
            "application_title",
            "company_name",
            "interview_type",
            "scheduled_at",
            "interviewer",
            "meeting_link",
            "notes",
            "completed",
            "created_at",
        ]
        read_only_fields = [
            "created_at",
            "application_title",
            "company_name",
        ]


class SkillAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillAnalysis
        fields = [
            "id",
            "application",
            "skill_name",
            "user_has_skill",
            "importance",
            "created_at",
        ]
        read_only_fields = [
            "created_at",
        ]


class SkillAnalysisReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillAnalysisReport
        fields = [
            "id",
            "application",
            "job_title",
            "company_name",
            "match_percentage",
            "skills_found_in_resume",
            "skills_required",
            "matching_skills",
            "missing_skills",
            "important_skills",
            "created_at",
        ]
        read_only_fields = [
            "created_at",
        ]


class JobApplicationDetailSerializer(serializers.ModelSerializer):
    interviews = InterviewSerializer(many=True, read_only=True)
    skill_analyses = SkillAnalysisSerializer(many=True, read_only=True)
    analysis_reports = SkillAnalysisReportSerializer(many=True, read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "company_name",
            "job_title",
            "job_url",
            "location",
            "employment_type",
            "status",
            "application_date",
            "salary_range",
            "job_description",
            "notes",
            "interviews",
            "skill_analyses",
            "analysis_reports",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "interviews",
            "skill_analyses",
            "analysis_reports",
        ]


class InterviewPrepItemSerializer(serializers.ModelSerializer):
    application_title = serializers.CharField(
        source="application.job_title",
        read_only=True
    )

    class Meta:
        model = InterviewPrepItem
        fields = [
            "id",
            "application",
            "application_title",
            "category",
            "title",
            "description",
            "user_notes",
            "is_completed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "application_title",
        ]