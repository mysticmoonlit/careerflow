from datetime import datetime, date
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import (
    JobApplication,
    Interview,
    SkillAnalysisReport,
    InterviewPrepItem,
)
from core.analyzer import analyze_skills


class CareerFlowAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create primary test user
        self.user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "Password123!",
            "first_name": "Test",
            "last_name": "User",
        }
        self.user = User.objects.create_user(**self.user_data)

        # Create secondary test user for security/isolation checks
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="OtherPassword123!",
            first_name="Other",
            last_name="User",
        )

    def test_health_check(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

    def test_csrf_token(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrfToken", response.data)

    def test_register_and_seed_prep(self):
        new_client = APIClient()
        reg_payload = {
            "username": "newdev",
            "email": "newdev@example.com",
            "password": "SecurePassword999!",
            "first_name": "Dev",
            "last_name": "One",
        }
        response = new_client.post("/api/auth/register/", reg_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("user", response.data)

        # Verify default interview prep items seeded for new user
        new_user = User.objects.get(username="newdev")
        prep_count = InterviewPrepItem.objects.filter(user=new_user).count()
        self.assertGreater(prep_count, 0)

    def test_login_and_logout(self):
        client = APIClient()
        # Invalid login
        res_fail = client.post("/api/auth/login/", {"username": "testuser", "password": "WrongPassword"})
        self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)

        # Valid login
        res_success = client.post("/api/auth/login/", {"username": "testuser", "password": "Password123!"})
        self.assertEqual(res_success.status_code, status.HTTP_200_OK)

        # Check me
        res_me = client.get("/api/auth/me/")
        self.assertEqual(res_me.status_code, status.HTTP_200_OK)
        self.assertEqual(res_me.data["user"]["username"], "testuser")

        # Logout
        res_logout = client.post("/api/auth/logout/")
        self.assertEqual(res_logout.status_code, status.HTTP_200_OK)

    def test_application_crud(self):
        self.client.force_authenticate(user=self.user)

        # Create application
        payload = {
            "company_name": "Acme Corp",
            "job_title": "Full Stack Engineer",
            "job_url": "https://acme.com/jobs/1",
            "location": "Remote",
            "employment_type": "Full-time",
            "status": "applied",
            "application_date": "2026-09-01",
            "salary_range": "$120,000 - $140,000",
            "job_description": "We are seeking a Python, Django, React, and PostgreSQL developer.",
            "notes": "Spoke to the recruiter on LinkedIn.",
        }
        res_create = self.client.post("/api/applications/", payload, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        app_id = res_create.data["id"]

        # List applications
        res_list = self.client.get("/api/applications/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

        # Retrieve detail
        res_detail = self.client.get(f"/api/applications/{app_id}/")
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data["company_name"], "Acme Corp")

        # Update application status to interview
        res_patch = self.client.patch(f"/api/applications/{app_id}/", {"status": "interview"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data["status"], "interview")

        # Delete application
        res_del = self.client.delete(f"/api/applications/{app_id}/")
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(JobApplication.objects.filter(id=app_id).count(), 0)

    def test_interview_crud(self):
        self.client.force_authenticate(user=self.user)

        app = JobApplication.objects.create(
            user=self.user,
            company_name="Stripe",
            job_title="Backend Engineer",
            status="applied",
        )

        # Create interview
        int_payload = {
            "application": app.id,
            "interview_type": "technical",
            "scheduled_at": "2026-10-15T14:00:00Z",
            "interviewer": "Alice Smith",
            "meeting_link": "https://meet.google.com/abc-defg-hij",
            "notes": "System design and live coding round.",
            "completed": False,
        }
        res_int = self.client.post("/api/interviews/", int_payload, format="json")
        self.assertEqual(res_int.status_code, status.HTTP_201_CREATED)
        int_id = res_int.data["id"]

        # Verify application status advanced to 'interview'
        app.refresh_from_db()
        self.assertEqual(app.status, "interview")

        # List interviews
        res_list = self.client.get("/api/interviews/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

        # Patch interview to completed
        res_patch = self.client.patch(f"/api/interviews/{int_id}/", {"completed": True}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertTrue(res_patch.data["completed"])

    def test_security_user_isolation(self):
        # User A creates an application
        app_user_a = JobApplication.objects.create(
            user=self.user,
            company_name="Confidential A",
            job_title="Lead Architect",
            status="interview",
        )

        # Authenticate as User B
        self.client.force_authenticate(user=self.other_user)

        # User B should NOT see User A's application
        res_list = self.client.get("/api/applications/")
        self.assertEqual(len(res_list.data), 0)

        # User B should NOT be able to access User A's application detail
        res_detail = self.client.get(f"/api/applications/{app_user_a.id}/")
        self.assertEqual(res_detail.status_code, status.HTTP_404_NOT_FOUND)

        # User B should NOT be able to modify User A's application
        res_patch = self.client.patch(f"/api/applications/{app_user_a.id}/", {"company_name": "Hacked"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_404_NOT_FOUND)

    def test_rule_based_skill_analyzer(self):
        resume_text = "Proficient software engineer with deep expertise in Python, Django, PostgreSQL, and Git. Some experience with React."
        job_description = "We are seeking a Backend Engineer with strong Python, Django, Docker, Kubernetes, and PostgreSQL experience."

        result = analyze_skills(resume_text, job_description)

        self.assertIn("Python", result["matching_skills"])
        self.assertIn("Django", result["matching_skills"])
        self.assertIn("PostgreSQL", result["matching_skills"])
        self.assertIn("Docker", result["missing_skills"])
        self.assertIn("Kubernetes", result["missing_skills"])
        self.assertGreater(result["match_percentage"], 40)
        self.assertIn("CareerFlow Rule-Based", result["engine"])

    def test_skill_analyzer_endpoint(self):
        self.client.force_authenticate(user=self.user)
        app = JobApplication.objects.create(
            user=self.user,
            company_name="TechCorp",
            job_title="Software Developer",
            job_description="Requirements: Python, React, PostgreSQL, Docker, AWS.",
        )

        payload = {
            "resume_text": "Experienced Python and React developer who builds REST APIs with Django.",
            "application_id": app.id,
            "save_report": True,
        }
        response = self.client.post("/api/skills/analyze/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("match_percentage", response.data)
        self.assertIn("report_id", response.data)
        self.assertIn("Python", response.data["matching_skills"])
        self.assertIn("React", response.data["matching_skills"])
        self.assertIn("Docker", response.data["missing_skills"])

    def test_interview_prep_and_readiness(self):
        self.client.force_authenticate(user=self.user)

        # GET should auto-seed default items
        res = self.client.get("/api/prep/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data["items"]
        self.assertGreater(len(items), 5)
        self.assertEqual(res.data["metrics"]["completed"], 0)

        # Complete one item
        item_id = items[0]["id"]
        res_patch = self.client.patch(
            f"/api/prep/{item_id}/",
            {"is_completed": True, "user_notes": "Reviewed company 10-K report and tech blog."},
            format="json"
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertTrue(res_patch.data["is_completed"])

        # Re-check readiness score
        res_check = self.client.get("/api/prep/")
        self.assertEqual(res_check.data["metrics"]["completed"], 1)
        self.assertGreater(res_check.data["metrics"]["readiness_score"], 0)

    def test_dashboard_and_analytics(self):
        self.client.force_authenticate(user=self.user)

        # Create applications in different stages
        JobApplication.objects.create(user=self.user, company_name="Company 1", job_title="Dev", status="applied")
        app_int = JobApplication.objects.create(user=self.user, company_name="Company 2", job_title="Dev", status="interview")
        JobApplication.objects.create(user=self.user, company_name="Company 3", job_title="Dev", status="offer")

        # Create interview
        Interview.objects.create(
            application=app_int,
            interview_type="video",
            scheduled_at="2026-11-01T10:00:00Z",
            completed=False,
        )

        # Test Dashboard
        res_dash = self.client.get("/api/dashboard/")
        self.assertEqual(res_dash.status_code, status.HTTP_200_OK)
        self.assertEqual(res_dash.data["total_applications"], 3)
        self.assertEqual(res_dash.data["applied"], 1)
        self.assertEqual(res_dash.data["offers"], 1)
        self.assertEqual(res_dash.data["upcoming_interviews"], 1)
        self.assertEqual(len(res_dash.data["recent_applications"]), 3)

        # Test Analytics
        res_analytics = self.client.get("/api/analytics/")
        self.assertEqual(res_analytics.status_code, status.HTTP_200_OK)
        self.assertEqual(res_analytics.data["total_applications"], 3)
        self.assertEqual(res_analytics.data["offer_metrics"]["total_offers"], 1)
        self.assertEqual(res_analytics.data["interview_metrics"]["total"], 1)
