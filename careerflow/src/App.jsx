import React, { useEffect, useState } from "react";
import api, { ensureCsrfToken } from "./api";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Notification from "./components/Notification";

import DashboardView from "./pages/DashboardView";
import ApplicationsView from "./pages/ApplicationsView";
import ApplicationDetailView from "./pages/ApplicationDetailView";
import InterviewsView from "./pages/InterviewsView";
import SkillAnalyzerView from "./pages/SkillAnalyzerView";
import InterviewPrepView from "./pages/InterviewPrepView";
import AnalyticsView from "./pages/AnalyticsView";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active sub-page states
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [prefillApp, setPrefillApp] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sidebar badge counts
  const [sidebarCounts, setSidebarCounts] = useState({
    applications: 0,
    interviews: 0,
  });

  // Auth forms
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const [notification, setNotification] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // Ensure CSRF token is initialized
      await ensureCsrfToken();

      const response = await api.get("/auth/me/");
      setUser(response.data.user);
      setPage("dashboard");
      fetchSidebarCounts();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSidebarCounts() {
    try {
      const [appRes, intRes] = await Promise.all([
        api.get("/applications/"),
        api.get("/interviews/?status=upcoming"),
      ]);
      setSidebarCounts({
        applications: appRes.data.length,
        interviews: intRes.data.length,
      });
    } catch {
      // Ignored
    }
  }

  function showNotification(message, type = "success") {
    setNotification({ message, type });
  }

  function clearAuthMessages() {
    setAuthError("");
    setAuthSuccess("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearAuthMessages();

    try {
      await ensureCsrfToken();
      const response = await api.post("/auth/login/", loginForm);
      setUser(response.data.user);
      setPage("dashboard");
      showNotification("Welcome back! Signed in successfully.", "success");
      fetchSidebarCounts();
    } catch (err) {
      setAuthError(
        err.response?.data?.message ||
          "Unable to log in. Please check your username and password."
      );
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    clearAuthMessages();

    try {
      await ensureCsrfToken();
      const response = await api.post("/auth/register/", registerForm);
      setUser(response.data.user);
      setPage("dashboard");
      showNotification(
        "Account created successfully. Welcome to CareerFlow!",
        "success"
      );
      fetchSidebarCounts();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        setAuthError(
          typeof data === "string"
            ? data
            : Object.values(data).flat().join(" ")
        );
      } else {
        setAuthError("Unable to create account. Please check requirements.");
      }
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout/");
    } catch {
      // Clear frontend session anyway
    }

    setUser(null);
    setPage("login");
    setLoginForm({ username: "", password: "" });
    showNotification("Logged out successfully.", "success");
  }

  function handleNavigate(targetPage) {
    if (targetPage !== "application-detail") {
      setSelectedAppId(null);
    }
    setPage(targetPage);
    fetchSidebarCounts();
  }

  function handleSelectApplication(appId) {
    setSelectedAppId(appId);
    setPage("application-detail");
  }

  function handleOpenSkillAnalyzerForApp(app) {
    setPrefillApp(app);
    setPage("analyzer");
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-logo">
          CAREER<span>FLOW</span>
        </div>
        <div className="spinner"></div>
        <p>Initializing your career workspace...</p>
      </div>
    );
  }

  // Unauthenticated: Login & Register Pages
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-decoration decoration-one"></div>
        <div className="auth-decoration decoration-two"></div>

        <div className="auth-container">
          <div className="auth-brand">
            <div className="auth-logo">
              CAREER<span>FLOW</span>
            </div>
            <div className="auth-tagline">
              Professional Job Application & Interview Preparation Platform
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-badge">
                <span></span>
                RECRUITER-READY SUITE
              </div>

              <h1>
                {page === "login"
                  ? "Welcome back."
                  : "Build your career workspace."}
              </h1>

              <p>
                {page === "login"
                  ? "Sign in to manage your applications, interviews, and skills."
                  : "Create an account to organize your job search end-to-end."}
              </p>
            </div>

            {authError && (
              <div className="alert error-alert">{authError}</div>
            )}
            {authSuccess && (
              <div className="alert success-alert">{authSuccess}</div>
            )}

            {page === "login" ? (
              <LoginForm
                form={loginForm}
                setForm={setLoginForm}
                onSubmit={handleLogin}
                onRegister={() => {
                  clearAuthMessages();
                  setPage("register");
                }}
              />
            ) : (
              <RegisterForm
                form={registerForm}
                setForm={setRegisterForm}
                onSubmit={handleRegister}
                onLogin={() => {
                  clearAuthMessages();
                  setPage("login");
                }}
              />
            )}
          </div>

          <div className="auth-footer">
            React + Vite <span>•</span> Django REST Framework{" "}
            <span>•</span> SQLite Database
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Application Workspace
  return (
    <div className="app-layout">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPage={page}
        onNavigate={handleNavigate}
        counts={sidebarCounts}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar
          user={user}
          currentPage={page}
          onLogout={handleLogout}
          onAddApplication={() => {
            if (page !== "applications") {
              setPage("applications");
            }
            setIsAddModalOpen(true);
          }}
          onNavigate={handleNavigate}
        />

        <main className="page-body">
          {page === "dashboard" && (
            <DashboardView
              onNavigate={handleNavigate}
              onSelectApplication={handleSelectApplication}
              onOpenAddModal={() => {
                setPage("applications");
                setIsAddModalOpen(true);
              }}
            />
          )}

          {page === "applications" && (
            <ApplicationsView
              onSelectApplication={handleSelectApplication}
              isAddModalOpen={isAddModalOpen}
              onCloseAddModal={() => setIsAddModalOpen(false)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              showNotification={showNotification}
            />
          )}

          {page === "application-detail" && (
            <ApplicationDetailView
              applicationId={selectedAppId}
              onBack={() => setPage("applications")}
              onOpenSkillAnalyzer={handleOpenSkillAnalyzerForApp}
              showNotification={showNotification}
            />
          )}

          {page === "interviews" && (
            <InterviewsView showNotification={showNotification} />
          )}

          {page === "analyzer" && (
            <SkillAnalyzerView
              prefillApp={prefillApp}
              showNotification={showNotification}
            />
          )}

          {page === "prep" && (
            <InterviewPrepView showNotification={showNotification} />
          )}

          {page === "analytics" && (
            <AnalyticsView showNotification={showNotification} />
          )}
        </main>
      </div>
    </div>
  );
}

function LoginForm({ form, setForm, onSubmit, onRegister }) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Username
        <input
          type="text"
          placeholder="Enter your username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </label>

      <button type="submit" className="auth-submit">
        Sign In <span>→</span>
      </button>

      <div className="switch-auth">
        Don't have an account?
        <button type="button" onClick={onRegister}>
          Create one
        </button>
      </div>
    </form>
  );
}

function RegisterForm({ form, setForm, onSubmit, onLogin }) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="name-fields">
        <label>
          First name
          <input
            type="text"
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            required
          />
        </label>

        <label>
          Last name
          <input
            type="text"
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            required
          />
        </label>
      </div>

      <label>
        Username
        <input
          type="text"
          placeholder="Choose a username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
      </label>

      <label>
        Email address
        <input
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
      </label>

      <button type="submit" className="auth-submit">
        Create Workspace <span>→</span>
      </button>

      <div className="switch-auth">
        Already have an account?
        <button type="button" onClick={onLogin}>
          Sign in
        </button>
      </div>
    </form>
  );
}

export default App;