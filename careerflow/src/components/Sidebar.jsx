import React from "react";

export default function Sidebar({ currentPage, onNavigate, counts }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "applications", label: "Applications", icon: "📋", count: counts?.applications },
    { id: "interviews", label: "Interviews", icon: "📅", count: counts?.interviews },
    { id: "analyzer", label: "Skill Analyzer", icon: "⚡" },
    { id: "prep", label: "Interview Prep", icon: "🎯" },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          CAREER<span>FLOW</span>
        </div>
        <span className="sidebar-tag">WORKSPACE</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            currentPage === item.id ||
            (currentPage === "application-detail" && item.id === "applications");
          return (
            <button
              key={item.id}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.label}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span className="sidebar-badge">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-pill">
          <span className="status-dot"></span>
          <span>DRF + SQLite v1.0</span>
        </div>
      </div>
    </aside>
  );
}
