# CareerFlow — Job Application & Interview Preparation Platform

CareerFlow is an end-to-end, full-stack career workspace built for software engineers and professionals to organize job applications, track multi-stage interview loops, assess skill alignment using a deterministic rule-based analyzer, practice structured interview questions, and visualize hiring conversion funnels using real-time database metrics.

---

## Features

### 1. Authentication & Session Security
- User registration, login, logout, and current user session verification (`/api/auth/me/`).
- Automated CSRF token handling with an Axios interceptor attaching `X-CSRFToken` to mutating requests.
- Configured CORS credentials support for secure communication between Vite (`localhost:5173`) and Django (`127.0.0.1:8000`).
- Strict multi-tenant data isolation: all database queries and mutating actions are strictly scoped to the authenticated user (`request.user`).

### 2. Live Metrics Dashboard
- Real-time KPIs computed directly from the SQLite database:
  - **Total Applications**
  - **Applied**
  - **Interviews**
  - **Offers**
  - **Rejected**
  - **Upcoming Interviews**
- Recent Applications panel with stage badges and direct click-through to details.
- Upcoming Interviews panel displaying scheduled dates, interviewers, and direct meeting launcher buttons (Zoom, Google Meet, Microsoft Teams).
- Quick navigation shortcuts to core workflow tools.

### 3. Job Application Tracker (Full CRUD)
- Tracks comprehensive application metadata: Company Name, Job Title, Listing URL, Location, Employment Type, Status, Application Date, Salary Range, Job Description, and Personal Notes.
- Supported statuses: `Saved`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, and `Withdrawn`.
- Real-time search across company name, role, and location, combined with status filter tabs.
- Add and edit modal dialogues with client and server validation.
- Safe deletion dialogs with cascading cleanup.

### 4. Application Details Hub
- Company header with role metadata badges, external job listing link, and instant status updater dropdown.
- **Overview & Notes Tab**: In-place editable candidate notes with immediate database persistence.
- **Job Description Tab**: Formatted requirements with a single-click button to trigger the skill analyzer.
- **Interviews Tab**: List of interviews for that specific role, "+ Schedule Interview" modal, and completion checkboxes.
- **Skill Analysis Tab**: Matched and missing skills breakdown for that position.
- **Edit Details Modal**: Directly modify role, company, salary, and job description from the detail view.

### 5. Interview Tracker (Full CRUD)
- Supports all interview formats: `Phone Screen`, `Video Call`, `Technical / Coding`, `HR / Culture Fit`, `On-site`, and `Other`.
- Tracks scheduled date/time, interviewer name, meeting link, and preparation notes.
- Filter tabs: `All`, `Upcoming`, and `Completed`.
- One-click launch for meeting links and instant completion toggle checkboxes.

### 6. Rule-Based Resume & Job Skill Analyzer
- Deterministic keyword and pattern matching engine (`core/analyzer.py`) with zero generative AI hallucinations.
- Analyzes resume text against target job descriptions (or pre-populates from any tracked application).
- Computes:
  - **Match Percentage** with a color-coded radial gauge.
  - **Readiness Badge** (`Excellent Match`, `Competitive Match`, `Moderate Gap`, `High Gap`).
  - **Matching Skills** (green badges) and **Missing Target Skills** (rose badges).
  - **Important Required Skills** ranked by occurrence frequency and priority tiers.
  - Actionable keyword suggestions for resume tailoring.
- Automatically saves and persists analysis reports to the database with a report history log.

### 7. Interview Preparation Hub
- Four structured categories:
  - **Preparation Checklist**: Research company background, analyze JD, prepare questions for interviewers, verify audio/video setup.
  - **HR Questions**: "Tell me about yourself", salary expectations, reasons for leaving, 5-year outlook.
  - **Technical Questions**: RESTful API design, database query optimization, React state management, auth concepts, system design.
  - **Behavioral Questions (STAR Method)**: Conflict resolution, production bug under pressure, ambiguous requirements, handling critical feedback.
- Automatically seeds 19 starter questions and checklist tasks upon user registration or first visit.
- Interactive checkboxes update the candidate's **Interview Readiness Index (%)** dynamically.
- Expandable practice area on each question to draft and save personalized answers to the database.
- Ability to add custom interview questions and checklist items.

### 8. Search & Outcome Analytics
- 100% computed from real database data (zero mock statistics):
  - **Conversion Funnel**: `Saved` → `Applied` → `Screening` → `Interviewing` → `Offers` → `Rejected`.
  - **Key Ratios**: Offer Rate (%), Rejection Rate (%), and Interview Conversion Rate (%).
  - **Application Status Distribution**: Proportional distribution across all statuses.
  - **Timeline**: Applications over time grouped by month/period.
  - **Top Skill Gaps**: Aggregated most-frequently missing skills across all analyzed job descriptions.

### 9. Recruiter-Ready Dark UI
- Modern dark design system (`#08080c`, `#101017`, `#9b7cff` purple accents).
- Responsive layout supporting desktop (1280px+), tablet (768px), and mobile (375px) viewports.
- Fixed sidebar navigation with real-time application and interview count badges.
- Accessible modals, toast notifications with auto-dismiss, loading spinners, and clean empty states.

---

## Technology Stack

- **Frontend**: React 19, Vite 8, JavaScript (ES6+), Axios, CSS3 (Custom Design System).
- **Backend**: Python 3.11, Django 5.2, Django REST Framework (DRF) 3.18, django-cors-headers.
- **Database**: SQLite (local development and testing).
- **Authentication**: Django Session Authentication with CSRF protection and multi-tenant scoping.

---

## Project Structure

```
careerflow/
├── backend/                  # Django project configuration
│   ├── asgi.py
│   ├── settings.py           # CORS, CSRF, REST framework & env configuration
│   ├── urls.py               # Main API URL routes
│   └── wsgi.py
├── core/                     # Core application logic
│   ├── analyzer.py           # Deterministic rule-based skill analyzer engine
│   ├── migrations/           # Database migration files
│   ├── models.py             # UserProfile, JobApplication, Interview, Prep & Reports
│   ├── prep_data.py          # Starter questions & checklist items
│   ├── serializers.py        # DRF serializers with detail & relationship support
│   ├── tests.py              # Automated Django unit test suite (11 tests)
│   └── views.py              # Secure API endpoints with user isolation
├── careerflow/               # React + Vite frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/       # Navbar, Sidebar, Modal, Notification
│   │   ├── pages/            # Dashboard, Applications, Detail, Interviews, Analyzer, Prep, Analytics
│   │   ├── api.js            # Configured Axios client with CSRF interceptor
│   │   ├── App.jsx           # Main router state & workspace layout
│   │   ├── App.css           # Responsive dark theme stylesheet
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── manage.py                 # Django management script
├── test_e2e_live.py          # Live end-to-end API verification suite (12 checks)
├── test_browser_e2e.js       # Headless Chrome CDP browser test suite (10 checks)
├── .gitignore                # Git ignore for venv, node_modules, sqlite, env
└── README.md
```

---

## How to Run

### Prerequisites
- Python 3.11+
- Node.js 18+ (tested on Node.js v24)

### 1. Running the Backend (Django REST Framework)
From the root directory:
```powershell
# 1. Activate the Python 3.11 virtual environment
.\venv\Scripts\activate

# 2. Run database migrations (if not already applied)
python manage.py migrate

# 3. Start the Django development server
python manage.py runserver 127.0.0.1:8000
```
The API will be available at `http://127.0.0.1:8000/api/`.

### 2. Running the Frontend (React + Vite)
From the `careerflow` directory:
```powershell
# Navigate to the frontend directory
cd careerflow

# Install dependencies (if not already installed)
npm install

# Start the Vite development server (using cmd to avoid PowerShell execution policy restrictions)
cmd /c npm run dev
```
The application will open at `http://localhost:5173/`.

### 3. Production Build
To create a production-optimized build of the React frontend:
```powershell
cd careerflow
cmd /c npm run build
```
The compiled assets will be created in `careerflow/dist/`.

---

## API Overview

All API endpoints require authentication (session cookie + CSRF token) except public registration, login, and health check endpoints.

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health/` | API health check and server time | No |
| `GET` | `/api/auth/csrf/` | Retrieve CSRF token | No |
| `POST` | `/api/auth/register/` | Register new user & seed prep items | No |
| `POST` | `/api/auth/login/` | Authenticate and create session | No |
| `POST` | `/api/auth/logout/` | Terminate session | Yes |
| `GET` | `/api/auth/me/` | Current user & profile info | Yes |
| `GET` | `/api/dashboard/` | Real database counts, recent apps & upcoming interviews | Yes |
| `GET`, `POST` | `/api/applications/` | List (with search & status filter) or create applications | Yes |
| `GET`, `PUT`, `PATCH`, `DELETE` | `/api/applications/<id>/` | Application details (with nested interviews & reports), update, delete | Yes |
| `GET`, `POST` | `/api/interviews/` | List (all, upcoming, completed) or schedule an interview | Yes |
| `GET`, `PUT`, `PATCH`, `DELETE` | `/api/interviews/<id>/` | Retrieve, update, toggle completed, or delete interview | Yes |
| `POST` | `/api/skills/analyze/` | Run rule-based skill comparison and persist report | Yes |
| `GET` | `/api/skills/reports/` | List candidate's saved analysis reports | Yes |
| `DELETE` | `/api/skills/reports/<id>/` | Delete an analysis report | Yes |
| `GET`, `POST` | `/api/prep/` | List prep questions by category & track readiness score | Yes |
| `PATCH`, `DELETE` | `/api/prep/<id>/` | Toggle item completion or save drafted answers | Yes |
| `GET` | `/api/analytics/` | Real application conversion funnel, rates & skill gaps | Yes |

---

## Testing

CareerFlow includes three layers of automated verification:

### 1. Django Unit Test Suite
Covers authentication, models, serializers, application CRUD, interview scheduling, security isolation, skill analysis logic, prep readiness, and analytics:
```powershell
python manage.py test
```
*Result: 11 tests passed in ~16 seconds.*

### 2. Live End-to-End API Verification
Executes realistic candidate flows against the running server using Python HTTP client:
```powershell
python test_e2e_live.py
```
*Result: 12 checks passed (Registration, Login, Session, Dashboard, App CRUD, Interview CRUD, Analyzer, Prep, Analytics, Logout).*

### 3. Headless Chrome Browser Verification (CDP)
Launches headless Chrome, opens `http://localhost:5173/`, and drives real UI interactions (form typing, modal clicks, tab switching, responsive viewports, and multi-tenant isolation):
```powershell
node test_browser_e2e.js
```
*Result: 10 browser verification checks passed.*

---

## Environment Variables (Optional)

The application works out of the box with safe development defaults. For production deployment, configure the following environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | Development key | Secret key for cryptographic signing |
| `DJANGO_DEBUG` | `True` | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated list of allowed hostnames |
