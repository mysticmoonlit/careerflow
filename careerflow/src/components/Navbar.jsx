import React from "react";

export default function Navbar({
  user,
  onLogout,
  onAddApplication,
  onNavigate,
  currentPage,
}) {
  const firstName = user?.first_name || user?.username || "Developer";
  const initial = firstName.charAt(0).toUpperCase();

  const getPageTitle = (page) => {
    switch (page) {
      case "dashboard":
        return "Dashboard Overview";
      case "applications":
        return "Job Applications Tracker";
      case "application-detail":
        return "Application Details";
      case "interviews":
        return "Interview Management";
      case "analyzer":
        return "Rule-Based Skill Analyzer";
      case "prep":
        return "Interview Preparation & Practice";
      case "analytics":
        return "Search & Outcome Analytics";
      default:
        return "CareerFlow";
    }
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <h2 className="navbar-page-title">{getPageTitle(currentPage)}</h2>
      </div>

      <div className="navbar-right">
        <button
          className="btn-primary-compact"
          onClick={onAddApplication}
        >
          <span className="plus-icon">+</span>
          <span>New Application</span>
        </button>

        <div className="navbar-divider"></div>

        <div className="navbar-user-profile">
          <div className="navbar-avatar">{initial}</div>
          <div className="navbar-user-info">
            <span className="user-name">{firstName}</span>
            <span className="user-email">{user?.email || user?.username}</span>
          </div>
        </div>

        <button className="navbar-logout-btn" onClick={onLogout} title="Log out">
          Sign out
        </button>
      </div>
    </header>
  );
}
