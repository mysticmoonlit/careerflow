from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=150, blank=True)
    headline = models.CharField(max_length=200, blank=True)
    skills = models.TextField(blank=True)
    resume = models.FileField(
        upload_to="resumes/",
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ("saved", "Saved"),
        ("applied", "Applied"),
        ("screening", "Screening"),
        ("interview", "Interview"),
        ("offer", "Offer"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="applications"
    )
    company_name = models.CharField(max_length=200)
    job_title = models.CharField(max_length=200)
    job_url = models.URLField(blank=True)
    location = models.CharField(max_length=150, blank=True)
    employment_type = models.CharField(max_length=100, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="saved"
    )

    application_date = models.DateField(
        blank=True,
        null=True
    )

    salary_range = models.CharField(
        max_length=100,
        blank=True
    )

    job_description = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job_title} - {self.company_name}"


class Interview(models.Model):
    INTERVIEW_TYPES = [
        ("phone", "Phone"),
        ("video", "Video"),
        ("technical", "Technical"),
        ("hr", "HR"),
        ("onsite", "On-site"),
        ("other", "Other"),
    ]

    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name="interviews"
    )

    interview_type = models.CharField(
        max_length=20,
        choices=INTERVIEW_TYPES,
        default="video"
    )

    scheduled_at = models.DateTimeField()

    interviewer = models.CharField(
        max_length=150,
        blank=True
    )

    meeting_link = models.URLField(
        blank=True
    )

    notes = models.TextField(
        blank=True
    )

    completed = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.application.job_title} - {self.interview_type}"


class SkillAnalysis(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="skill_analyses"
    )

    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name="skill_analyses",
        blank=True,
        null=True
    )

    skill_name = models.CharField(
        max_length=100
    )

    user_has_skill = models.BooleanField(
        default=False
    )

    importance = models.CharField(
        max_length=30,
        default="medium"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.skill_name


class SkillAnalysisReport(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="analysis_reports"
    )

    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="analysis_reports"
    )

    job_title = models.CharField(max_length=200, blank=True)
    company_name = models.CharField(max_length=200, blank=True)
    match_percentage = models.IntegerField(default=0)
    skills_found_in_resume = models.JSONField(default=list, blank=True)
    skills_required = models.JSONField(default=list, blank=True)
    matching_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list, blank=True)
    important_skills = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} Analysis ({self.match_percentage}%)"


class InterviewPrepItem(models.Model):
    CATEGORY_CHOICES = [
        ("checklist", "Preparation Checklist"),
        ("hr", "HR Question"),
        ("technical", "Technical Question"),
        ("behavioral", "Behavioral Question"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="prep_items"
    )

    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="prep_items"
    )

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="checklist"
    )

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    user_notes = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"[{self.category}] {self.title}"