import React, { useEffect, useState } from "react";
import api from "../api";

export default function DashboardView({
  onNavigate,
  onSelectApplication,
  onOpenAddModal,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/dashboard/");
      setData(res.data);
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status) => {
    const formatted = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Saved";
    return <span className={`status-pill status-${status}`}>{formatted}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="view-loading">
        <div className="spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-panel">
        <p>{error}</p>
        <button className="btn-secondary" onClick={fetchDashboard}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* Metrics Row */}
      <div className="stats-row">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Applications</span>
            <span className="metric-icon">📑</span>
          </div>
          <div className="metric-number">{data?.total_applications ?? 0}</div>
          <div className="metric-sub">Active job search items</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Applied</span>
            <span className="metric-icon blue">📤</span>
          </div>
          <div className="metric-number">{data?.applied ?? 0}</div>
          <div className="metric-sub">Awaiting employer review</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Interviews</span>
            <span className="metric-icon amber">🎯</span>
          </div>
          <div className="metric-number">{data?.interviews ?? 0}</div>
          <div className="metric-sub">{data?.upcoming_interviews ?? 0} upcoming sessions</div>
        </div>

        <div className="metric-card highlight-success">
          <div className="metric-header">
            <span className="metric-label">Offers</span>
            <span className="metric-icon green">🎉</span>
          </div>
          <div className="metric-number">{data?.offers ?? 0}</div>
          <div className="metric-sub">Offers received</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Rejected</span>
            <span className="metric-icon red">✕</span>
          </div>
          <div className="metric-number">{data?.rejected ?? 0}</div>
          <div className="metric-sub">Closed opportunities</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Upcoming</span>
            <span className="metric-icon purple">⏰</span>
          </div>
          <div className="metric-number">{data?.upcoming_interviews ?? 0}</div>
          <div className="metric-sub">Next scheduled interviews</div>
        </div>
      </div>

      {/* Grid: Recent Applications & Upcoming Interviews */}
      <div className="dashboard-panels-grid">
        {/* Recent Applications Panel */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Recent Applications</h3>
              <p className="panel-subtitle">Latest activity across target companies</p>
            </div>
            <button
              className="panel-link-btn"
              onClick={() => onNavigate("applications")}
            >
              View all ({data?.total_applications ?? 0}) →
            </button>
          </div>

          {data?.recent_applications?.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_applications.map((app) => (
                    <tr
                      key={app.id}
                      className="table-row-hover"
                      onClick={() => onSelectApplication(app.id)}
                    >
                      <td className="bold-cell">{app.company_name}</td>
                      <td>{app.job_title}</td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>{formatDate(app.application_date || app.created_at)}</td>
                      <td>
                        <button
                          className="btn-table-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectApplication(app.id);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-panel-state">
              <span className="empty-icon-large">📂</span>
              <h4>No applications tracked yet</h4>
              <p>Add your first job application to monitor interviews, notes, and progress.</p>
              <button className="btn-primary" onClick={onOpenAddModal}>
                + Add your first application
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Interviews Panel */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Upcoming Interviews</h3>
              <p className="panel-subtitle">Next scheduled calls & technical loops</p>
            </div>
            <button
              className="panel-link-btn"
              onClick={() => onNavigate("interviews")}
            >
              Manage interviews →
            </button>
          </div>

          {data?.upcoming_interviews_list?.length > 0 ? (
            <div className="upcoming-interviews-list">
              {data.upcoming_interviews_list.map((inv) => (
                <div key={inv.id} className="interview-compact-item">
                  <div className="inv-badge-type">{inv.interview_type}</div>
                  <div className="inv-details">
                    <strong className="inv-title">
                      {inv.application_title || "Role"} • {inv.company_name}
                    </strong>
                    <span className="inv-date">📅 {formatDateTime(inv.scheduled_at)}</span>
                    {inv.interviewer && (
                      <span className="inv-with">👤 With {inv.interviewer}</span>
                    )}
                  </div>
                  {inv.meeting_link && (
                    <a
                      href={inv.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-join-meeting"
                    >
                      Join ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel-state">
              <span className="empty-icon-large">📅</span>
              <h4>No upcoming interviews</h4>
              <p>When you schedule phone screens or technical loops, they'll appear here.</p>
              <button
                className="btn-secondary"
                onClick={() => onNavigate("interviews")}
              >
                Schedule an interview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Launch & Skill Gaps Banner */}
      <div className="quick-action-strip">
        <div className="strip-item" onClick={() => onNavigate("analyzer")}>
          <span className="strip-icon">⚡</span>
          <div>
            <strong>Rule-Based Skill Analyzer</strong>
            <p>Compare your resume against any job description to find missing keywords.</p>
          </div>
          <span className="strip-arrow">→</span>
        </div>

        <div className="strip-item" onClick={() => onNavigate("prep")}>
          <span className="strip-icon">🎯</span>
          <div>
            <strong>Interview Preparation Hub</strong>
            <p>Practice HR, technical, and behavioral STAR questions with structured checklists.</p>
          </div>
          <span className="strip-arrow">→</span>
        </div>

        <div className="strip-item" onClick={() => onNavigate("analytics")}>
          <span className="strip-icon">📊</span>
          <div>
            <strong>Real-time Analytics</strong>
            <p>Review real application funnels, conversion rates, and skill gap frequencies.</p>
          </div>
          <span className="strip-arrow">→</span>
        </div>
      </div>
    </div>
  );
}
