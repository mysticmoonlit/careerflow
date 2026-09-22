import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

BASE_URL = "http://127.0.0.1:8000/api"

# Setup cookie jar to preserve session and csrf tokens
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
urllib.request.install_opener(opener)

def get_csrf_token():
    for cookie in cookie_jar:
        if cookie.name == "csrftoken":
            return cookie.value
    return None

def api_request(method, endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    csrf_token = get_csrf_token()
    if csrf_token:
        headers["X-CSRFToken"] = csrf_token

    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            return status_code, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, json.loads(body) if body else {}

def run_tests():
    print("=== STARTING LIVE END-TO-END VERIFICATION ===")

    # 1. Health check
    status, body = api_request("GET", "/health/")
    assert status == 200, f"Health check failed: {status}"
    print(f"[OK] [1/12] Health Check passed: {body.get('message')}")

    # 2. CSRF Token
    status, body = api_request("GET", "/auth/csrf/")
    assert status == 200, f"CSRF fetch failed: {status}"
    csrf_token = body.get("csrfToken")
    assert csrf_token, "Missing csrfToken"
    print(f"[OK] [2/12] CSRF Token initialized: {csrf_token[:10]}...")

    # 3. Registration
    reg_data = {
        "username": "alex_developer",
        "email": "alex@careerflow.dev",
        "password": "StrongPassword123!",
        "first_name": "Alex",
        "last_name": "Developer",
    }
    status, body = api_request("POST", "/auth/register/", reg_data)
    if status == 400 and "username" in body and "already exists" in str(body["username"]):
        print("  User alex_developer already exists, proceeding to login.")
    else:
        assert status == 201, f"Registration failed: {status} {body}"
        print(f"[OK] [3/12] Registration passed for user: {body['user']['username']}")

    # 4. Login
    login_data = {
        "username": "alex_developer",
        "password": "StrongPassword123!",
    }
    status, body = api_request("POST", "/auth/login/", login_data)
    assert status == 200, f"Login failed: {status} {body}"
    print(f"[OK] [4/12] Login successful: {body.get('message')}")

    # 5. Current User Session
    status, body = api_request("GET", "/auth/me/")
    assert status == 200, f"Current user failed: {status}"
    assert body["user"]["username"] == "alex_developer"
    print(f"[OK] [5/12] Current User Session verified: {body['user']['first_name']} ({body['user']['email']})")

    # 6. Dashboard Initial State
    status, body = api_request("GET", "/dashboard/")
    assert status == 200, f"Dashboard failed: {status}"
    print(f"[OK] [6/12] Dashboard loaded: Total Apps={body['total_applications']}, Upcoming Interviews={body['upcoming_interviews']}")

    # 7. Job Application CRUD
    # CREATE App 1
    app1_data = {
        "company_name": "Stripe",
        "job_title": "Full Stack Platform Engineer",
        "job_url": "https://stripe.com/jobs/fullstack",
        "location": "San Francisco, CA (Remote)",
        "employment_type": "Full-time",
        "status": "applied",
        "application_date": "2026-09-15",
        "salary_range": "$140,000 - $165,000",
        "job_description": "We are looking for an experienced software engineer proficient in Python, Django REST Framework, React, PostgreSQL, Docker, and AWS.",
        "notes": "Connected with the hiring manager on LinkedIn.",
    }
    status, app1 = api_request("POST", "/applications/", app1_data)
    assert status == 201, f"Create application 1 failed: {status} {app1}"
    app1_id = app1["id"]

    # CREATE App 2
    app2_data = {
        "company_name": "GitHub",
        "job_title": "Backend Infrastructure Engineer",
        "job_url": "https://github.com/careers/backend",
        "location": "Remote",
        "employment_type": "Full-time",
        "status": "screening",
        "application_date": "2026-09-18",
        "salary_range": "$150,000 - $175,000",
        "job_description": "Requirements: Python, Go, Docker, Kubernetes, CI/CD with GitHub Actions, and PostgreSQL.",
        "notes": "Recruiter phone call scheduled.",
    }
    status, app2 = api_request("POST", "/applications/", app2_data)
    assert status == 201, f"Create application 2 failed: {status} {app2}"
    app2_id = app2["id"]

    # CREATE App 3
    app3_data = {
        "company_name": "Vercel",
        "job_title": "Frontend Engineer",
        "status": "offer",
        "salary_range": "$160,000",
        "job_description": "React, Next.js, TypeScript, Tailwind CSS, Web Performance.",
    }
    status, app3 = api_request("POST", "/applications/", app3_data)
    assert status == 201, f"Create application 3 failed: {status} {app3}"

    # LIST Applications
    status, apps_list = api_request("GET", "/applications/")
    assert status == 200, f"List applications failed: {status}"
    assert len(apps_list) >= 3
    print(f"[OK] [7a/12] Created 3 applications, List contains {len(apps_list)} applications")

    # RETRIEVE Application Detail
    status, app1_detail = api_request("GET", f"/applications/{app1_id}/")
    assert status == 200, f"Application detail failed: {status}"
    assert app1_detail["company_name"] == "Stripe"
    assert "interviews" in app1_detail

    # UPDATE Application Status
    status, app1_patched = api_request("PATCH", f"/applications/{app1_id}/", {"status": "interview"})
    assert status == 200, f"Patch application failed: {status}"
    assert app1_patched["status"] == "interview"
    print(f"[OK] [7b/12] Application Detail retrieved and status updated to 'interview'")

    # 8. Interview CRUD
    # CREATE Interview
    int1_data = {
        "application": app1_id,
        "interview_type": "technical",
        "scheduled_at": "2026-10-05T15:30:00Z",
        "interviewer": "Sarah Lin (Staff Engineer)",
        "meeting_link": "https://meet.google.com/str-tech-loop",
        "notes": "System design and live full-stack coding challenge.",
        "completed": False,
    }
    status, int1 = api_request("POST", "/interviews/", int1_data)
    assert status == 201, f"Create interview failed: {status} {int1}"
    int1_id = int1["id"]

    int2_data = {
        "application": app2_id,
        "interview_type": "phone",
        "scheduled_at": "2026-09-28T10:00:00Z",
        "interviewer": "Michael (Talent Partner)",
        "meeting_link": "https://zoom.us/j/123456789",
        "notes": "Initial recruiter sync.",
        "completed": True,
    }
    status, int2 = api_request("POST", "/interviews/", int2_data)
    assert status == 201

    # LIST Interviews
    status, int_list = api_request("GET", "/interviews/")
    assert status == 200, f"List interviews failed: {status}"
    assert len(int_list) >= 2

    # PATCH Interview completed
    status, int1_patched = api_request("PATCH", f"/interviews/{int1_id}/", {"completed": True})
    assert status == 200
    assert int1_patched["completed"] is True
    print(f"[OK] [8/12] Interview Tracker CRUD passed ({len(int_list)} interviews scheduled & updated)")

    # 9. Rule-based Resume / Job Skill Analyzer
    resume_text = """
    Software Engineer with hands-on experience developing web applications using Python, Django REST Framework, React, PostgreSQL, and Git. Strong focus on Clean Code, Unit Testing with pytest, and agile methodologies.
    """
    job_desc = "We need an engineer experienced with Python, Django, React, PostgreSQL, Docker, AWS, and Kubernetes."

    analyzer_payload = {
        "resume_text": resume_text,
        "job_description": job_desc,
        "application_id": app1_id,
        "save_report": True,
    }
    status, analysis_res = api_request("POST", "/skills/analyze/", analyzer_payload)
    assert status == 200, f"Skill analysis failed: {status} {analysis_res}"
    assert "CareerFlow Rule-Based" in analysis_res["engine"]
    assert "Python" in analysis_res["matching_skills"]
    assert "React" in analysis_res["matching_skills"]
    assert "Docker" in analysis_res["missing_skills"]
    assert "AWS" in analysis_res["missing_skills"]
    assert analysis_res["match_percentage"] > 0
    print(f"[OK] [9/12] Rule-Based Skill Analyzer passed: Match={analysis_res['match_percentage']}%, Matched={analysis_res['matching_skills']}, Missing={analysis_res['missing_skills']}")

    # 10. Interview Preparation Hub
    status, prep_data = api_request("GET", "/prep/")
    assert status == 200, f"Get prep items failed: {status}"
    items = prep_data["items"]
    assert len(items) > 0, "Prep items should be auto-seeded"
    first_item = items[0]

    # Practice Answer & Completion
    status, prep_updated = api_request("PATCH", f"/prep/{first_item['id']}/", {
        "is_completed": True,
        "user_notes": "Researched latest Q2 financial results and technical architecture blog post.",
    })
    assert status == 200
    assert prep_updated["is_completed"] is True
    assert "Q2 financial results" in prep_updated["user_notes"]

    # Re-verify updated readiness score
    status, prep_data_after = api_request("GET", "/prep/")
    assert prep_data_after["metrics"]["completed"] >= 1
    assert prep_data_after["metrics"]["readiness_score"] > 0
    print(f"[OK] [10/12] Interview Prep Hub verified: {prep_data_after['metrics']['completed']} completed, Readiness Score={prep_data_after['metrics']['readiness_score']}%")

    # 11. Analytics
    status, analytics_data = api_request("GET", "/analytics/")
    assert status == 200, f"Get analytics failed: {status}"
    assert analytics_data["total_applications"] >= 3
    assert analytics_data["offer_metrics"]["total_offers"] >= 1
    assert len(analytics_data["funnel"]) > 0
    print(f"[OK] [11/12] Real-time Analytics verified: Total Apps={analytics_data['total_applications']}, Offers={analytics_data['offer_metrics']['total_offers']}, Top Gaps={len(analytics_data['skill_gaps'])}")

    # 12. Logout
    status, logout_body = api_request("POST", "/auth/logout/")
    assert status == 200, f"Logout failed: {status}"
    print(f"[OK] [12/12] Logout successful: {logout_body.get('message')}")

    print("\n>>> ALL 12 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
