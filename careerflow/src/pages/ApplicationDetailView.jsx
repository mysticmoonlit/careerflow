import React, { useEffect, useState } from "react";
import api from "../api";
import Modal from "../components/Modal";

export default function ApplicationDetailView({
  applicationId,
  onBack,
  onOpenSkillAnalyzer,
  showNotification,
}) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Edit notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Status quick update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Schedule Interview modal state
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    interview_type: "video",
    scheduled_at: "",
    interviewer: "",
    meeting_link: "",
    notes: "",
    completed: false,
  });
  const [submittingInterview, setSubmittingInterview] = useState(false);

  // Edit application modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleSaveEditApplication(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await api.patch(`/applications/${app.id}/`, editForm);
      setApp(res.data);
      setIsEditModalOpen(false);
      showNotification("Application details updated successfully.", "success");
    } catch {
      showNotification("Failed to update application details.", "error");
    } finally {
      setSavingEdit(false);
    }
  }


  useEffect(() => {
    if (applicationId) {
      fetchDetail();
    }
  }, [applicationId]);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await api.get(`/applications/${applicationId}/`);
      setApp(res.data);
      setNotesValue(res.data.notes || "");
    } catch {
      showNotification("Failed to load application details.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!app || app.status === newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await api.patch(`/applications/${app.id}/`, { status: newStatus });
      setApp((prev) => ({ ...prev, status: res.data.status }));
      showNotification(`Status updated to ${newStatus}.`, "success");
    } catch {
      showNotification("Failed to update status.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const res = await api.patch(`/applications/${app.id}/`, { notes: notesValue });
      setApp((prev) => ({ ...prev, notes: res.data.notes }));
      setEditingNotes(false);
      showNotification("Notes saved.", "success");
    } catch {
      showNotification("Failed to save notes.", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleToggleInterviewCompleted(interviewId, currentStatus) {
    try {
      const res = await api.patch(`/interviews/${interviewId}/`, {
        completed: !currentStatus,
      });
      setApp((prev) => ({
        ...prev,
        interviews: prev.interviews.map((inv) =>
          inv.id === interviewId ? res.data : inv
        ),
      }));
      showNotification("Interview status updated.", "success");
    } catch {
      showNotification("Failed to update interview.", "error");
    }
  }

  async function handleDeleteInterview(interviewId) {
    if (!window.confirm("Are you sure you want to delete this interview?")) return;
    try {
      await api.delete(`/interviews/${interviewId}/`);
      setApp((prev) => ({
        ...prev,
        interviews: prev.interviews.filter((inv) => inv.id !== interviewId),
      }));
      showNotification("Interview deleted.", "success");
    } catch {
      showNotification("Failed to delete interview.", "error");
    }
  }

  async function handleCreateInterview(e) {
    e.preventDefault();
    if (!interviewForm.scheduled_at) {
      showNotification("Please specify the date and time.", "error");
      return;
    }
    setSubmittingInterview(true);
    try {
      const res = await api.post("/interviews/", {
        ...interviewForm,
        application: app.id,
      });
      setApp((prev) => ({
        ...prev,
        interviews: [...(prev.interviews || []), res.data],
      }));
      setIsInterviewModalOpen(false);
      setInterviewForm({
        interview_type: "video",
        scheduled_at: "",
        interviewer: "",
        meeting_link: "",
        notes: "",
        completed: false,
      });
      showNotification("Interview scheduled successfully.", "success");
    } catch (err) {
      showNotification("Failed to schedule interview.", "error");
    } finally {
      setSubmittingInterview(false);
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
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

  if (loading) {
    return (
      <div className="view-loading">
        <div className="spinner"></div>
        <p>Loading application details...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="empty-panel-state">
        <h4>Application not found</h4>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to applications
        </button>
      </div>
    );
  }

  return (
    <div className="app-detail-view">
      {/* Navigation & Header */}
      <div className="detail-top-nav">
        <button className="btn-back" onClick={onBack}>
          ← All Applications
        </button>

        <div className="detail-actions-right">
          <button
            className="btn-secondary"
            onClick={() => {
              setEditForm({
                company_name: app.company_name || "",
                job_title: app.job_title || "",
                job_url: app.job_url || "",
                location: app.location || "",
                employment_type: app.employment_type || "Full-time",
                status: app.status || "applied",
                application_date: app.application_date || "",
                salary_range: app.salary_range || "",
                job_description: app.job_description || "",
                notes: app.notes || "",
              });
              setIsEditModalOpen(true);
            }}
          >
            ✎ Edit Details
          </button>
          <button
            className="btn-accent-gradient"
            onClick={() => onOpenSkillAnalyzer(app)}
          >
            ⚡ Analyze Resume Against This Role
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="detail-hero-card">
        <div className="hero-left">
          <span className="hero-subtitle">{app.company_name}</span>
          <h1 className="hero-title">{app.job_title}</h1>

          <div className="hero-meta-row">
            {app.location && <span>📍 {app.location}</span>}
            {app.employment_type && <span>💼 {app.employment_type}</span>}
            {app.salary_range && <span>💰 {app.salary_range}</span>}
            <span>📅 Applied: {formatDate(app.application_date || app.created_at)}</span>
            {app.job_url && (
              <a
                href={app.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-external-link"
              >
                View Job Post ↗
              </a>
            )}
          </div>
        </div>

        <div className="hero-right">
          <label className="quick-status-label">Stage:</label>
          <select
            className={`status-select status-${app.status}`}
            value={app.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
          >
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tab-bar">
        <button
          className={`detail-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview & Notes
        </button>
        <button
          className={`detail-tab ${activeTab === "description" ? "active" : ""}`}
          onClick={() => setActiveTab("description")}
        >
          Job Description
        </button>
        <button
          className={`detail-tab ${activeTab === "interviews" ? "active" : ""}`}
          onClick={() => setActiveTab("interviews")}
        >
          Interviews ({app.interviews?.length || 0})
        </button>
        <button
          className={`detail-tab ${activeTab === "skills" ? "active" : ""}`}
          onClick={() => setActiveTab("skills")}
        >
          Skill Analysis ({app.skill_analyses?.length || app.analysis_reports?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="detail-tab-content">
        {/* OVERVIEW & NOTES TAB */}
        {activeTab === "overview" && (
          <div className="overview-tab-grid">
            <div className="panel-card">
              <div className="panel-header">
                <h3>Application Notes</h3>
                {!editingNotes ? (
                  <button
                    className="btn-table-action"
                    onClick={() => setEditingNotes(true)}
                  >
                    ✎ Edit Notes
                  </button>
                ) : (
                  <div className="notes-btn-group">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setNotesValue(app.notes || "");
                        setEditingNotes(false);
                      }}
                      disabled={savingNotes}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary-compact"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                )}
              </div>

              {editingNotes ? (
                <textarea
                  className="notes-textarea"
                  rows={8}
                  placeholder="Record recruiter contacts, referral info, salary negotiations, interview impressions..."
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                />
              ) : app.notes ? (
                <div className="notes-preview-box">
                  {app.notes.split("\n").map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className="empty-state-mini">
                  <p>No notes written yet. Keep track of recruiter correspondence, prep notes, and next steps.</p>
                  <button
                    className="btn-secondary"
                    onClick={() => setEditingNotes(true)}
                  >
                    + Add notes
                  </button>
                </div>
              )}
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>Quick Highlights</h3>
              </div>
              <ul className="info-attribute-list">
                <li>
                  <span className="attr-label">Company:</span>
                  <span className="attr-value">{app.company_name}</span>
                </li>
                <li>
                  <span className="attr-label">Role:</span>
                  <span className="attr-value">{app.job_title}</span>
                </li>
                <li>
                  <span className="attr-label">Location:</span>
                  <span className="attr-value">{app.location || "Not specified"}</span>
                </li>
                <li>
                  <span className="attr-label">Employment Type:</span>
                  <span className="attr-value">{app.employment_type || "Full-time"}</span>
                </li>
                <li>
                  <span className="attr-label">Compensation:</span>
                  <span className="attr-value">{app.salary_range || "Not specified"}</span>
                </li>
                <li>
                  <span className="attr-label">Created:</span>
                  <span className="attr-value">{formatDate(app.created_at)}</span>
                </li>
                <li>
                  <span className="attr-label">Last Updated:</span>
                  <span className="attr-value">{formatDate(app.updated_at)}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* JOB DESCRIPTION TAB */}
        {activeTab === "description" && (
          <div className="panel-card">
            <div className="panel-header">
              <h3>Job Description & Qualifications</h3>
              <button
                className="btn-accent-gradient"
                onClick={() => onOpenSkillAnalyzer(app)}
              >
                ⚡ Analyze Skills in this Description
              </button>
            </div>
            {app.job_description ? (
              <div className="job-desc-content">
                {app.job_description.split("\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <div className="empty-panel-state">
                <p>No job description was added for this application.</p>
                <p className="sub-hint">
                  Edit the application to add the job description text, allowing the Rule-Based Skill Analyzer to check keyword alignment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* INTERVIEWS TAB */}
        {activeTab === "interviews" && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Interviews for {app.company_name}</h3>
                <p className="panel-subtitle">Manage upcoming loops, debriefs, and meeting links</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => setIsInterviewModalOpen(true)}
              >
                + Schedule Interview
              </button>
            </div>

            {app.interviews?.length > 0 ? (
              <div className="interviews-list-container">
                {app.interviews.map((inv) => (
                  <div
                    key={inv.id}
                    className={`interview-card-row ${inv.completed ? "completed" : ""}`}
                  >
                    <div className="inv-checkbox-col">
                      <input
                        type="checkbox"
                        checked={inv.completed}
                        onChange={() =>
                          handleToggleInterviewCompleted(inv.id, inv.completed)
                        }
                        title="Mark Completed"
                      />
                    </div>

                    <div className="inv-content-col">
                      <div className="inv-top">
                        <span className="inv-type-pill">{inv.interview_type}</span>
                        <strong className="inv-date-text">
                          {formatDateTime(inv.scheduled_at)}
                        </strong>
                        {inv.completed && (
                          <span className="completed-badge">✓ Completed</span>
                        )}
                      </div>

                      {inv.interviewer && (
                        <div className="inv-person">Interviewer: {inv.interviewer}</div>
                      )}
                      {inv.notes && <div className="inv-notes-snippet">{inv.notes}</div>}
                    </div>

                    <div className="inv-actions-col">
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
                      <button
                        className="btn-icon-action danger"
                        onClick={() => handleDeleteInterview(inv.id)}
                        title="Delete interview"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-panel-state">
                <span className="empty-icon-large">📅</span>
                <h4>No interviews scheduled for this role yet</h4>
                <p>Add phone screenings, technical assessments, or final loops to keep track of schedule and notes.</p>
                <button
                  className="btn-primary"
                  onClick={() => setIsInterviewModalOpen(true)}
                >
                  + Schedule First Interview
                </button>
              </div>
            )}
          </div>
        )}

        {/* SKILL ANALYSIS TAB */}
        {activeTab === "skills" && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Rule-Based Skill Analysis</h3>
                <p className="panel-subtitle">Keyword and requirement coverage for this position</p>
              </div>
              <button
                className="btn-accent-gradient"
                onClick={() => onOpenSkillAnalyzer(app)}
              >
                ⚡ Run New Analysis
              </button>
            </div>

            {app.analysis_reports?.length > 0 ? (
              <div className="analysis-reports-summary">
                {app.analysis_reports.map((report) => (
                  <div key={report.id} className="report-mini-card">
                    <div className="report-header-row">
                      <div className="report-score-circle">
                        <span>{report.match_percentage}%</span>
                        <small>Match</small>
                      </div>
                      <div className="report-summary-text">
                        <h4>Skill Alignment Report</h4>
                        <span className="report-date">Analyzed on {formatDate(report.created_at)}</span>
                      </div>
                    </div>

                    <div className="report-tags-section">
                      <h5>Matched Skills ({report.matching_skills?.length || 0})</h5>
                      <div className="skills-tag-cloud">
                        {report.matching_skills?.map((sk, idx) => (
                          <span key={idx} className="skill-tag matched">
                            ✓ {sk}
                          </span>
                        ))}
                      </div>

                      <h5 className="mt-15">Missing Target Skills ({report.missing_skills?.length || 0})</h5>
                      <div className="skills-tag-cloud">
                        {report.missing_skills?.map((sk, idx) => (
                          <span key={idx} className="skill-tag missing">
                            ✕ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : app.skill_analyses?.length > 0 ? (
              <div className="skills-table-wrap">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Skill Name</th>
                      <th>Status</th>
                      <th>Importance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {app.skill_analyses.map((sk) => (
                      <tr key={sk.id}>
                        <td className="bold-cell">{sk.skill_name}</td>
                        <td>
                          {sk.user_has_skill ? (
                            <span className="skill-tag matched">✓ Matched</span>
                          ) : (
                            <span className="skill-tag missing">✕ Missing</span>
                          )}
                        </td>
                        <td>{sk.importance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-panel-state">
                <span className="empty-icon-large">⚡</span>
                <h4>No skill analysis recorded yet</h4>
                <p>
                  Run the Rule-Based Skill Analyzer to compare your resume text directly
                  against this job's description.
                </p>
                <button
                  className="btn-accent-gradient"
                  onClick={() => onOpenSkillAnalyzer(app)}
                >
                  Run Skill Analyzer Now
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        title={`Schedule Interview: ${app.company_name}`}
      >
        <form onSubmit={handleCreateInterview} className="modal-form">
          <div className="form-row two-cols">
            <label>
              Interview Type *
              <select
                value={interviewForm.interview_type}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, interview_type: e.target.value })
                }
              >
                <option value="phone">Phone Screen</option>
                <option value="video">Video Call</option>
                <option value="technical">Technical / Coding</option>
                <option value="hr">HR / Culture Fit</option>
                <option value="onsite">On-site</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Date & Time *
              <input
                type="datetime-local"
                value={interviewForm.scheduled_at}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })
                }
                required
              />
            </label>
          </div>

          <div className="form-row two-cols">
            <label>
              Interviewer Name / Title
              <input
                type="text"
                placeholder="e.g. Jane Doe (Engineering Manager)"
                value={interviewForm.interviewer}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, interviewer: e.target.value })
                }
              />
            </label>

            <label>
              Meeting Link (Google Meet, Zoom, etc.)
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                value={interviewForm.meeting_link}
                onChange={(e) =>
                  setInterviewForm({ ...interviewForm, meeting_link: e.target.value })
                }
              />
            </label>
          </div>

          <label>
            Preparation Notes & Topics
            <textarea
              rows={3}
              placeholder="System design topics, behavioral stories to emphasize, questions to ask..."
              value={interviewForm.notes}
              onChange={(e) =>
                setInterviewForm({ ...interviewForm, notes: e.target.value })
              }
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsInterviewModalOpen(false)}
              disabled={submittingInterview}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submittingInterview}
            >
              {submittingInterview ? "Scheduling..." : "Schedule Interview"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Application Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Details: ${app.company_name}`}
      >
        <form onSubmit={handleSaveEditApplication} className="modal-form">
          <div className="form-row two-cols">
            <label>
              Company Name *
              <input
                type="text"
                value={editForm.company_name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, company_name: e.target.value })
                }
                required
              />
            </label>

            <label>
              Job Title *
              <input
                type="text"
                value={editForm.job_title || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, job_title: e.target.value })
                }
                required
              />
            </label>
          </div>

          <div className="form-row three-cols">
            <label>
              Status
              <select
                value={editForm.status || "applied"}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
              >
                <option value="saved">Saved</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </label>

            <label>
              Employment Type
              <input
                type="text"
                placeholder="Full-time, Contract, etc."
                value={editForm.employment_type || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, employment_type: e.target.value })
                }
              />
            </label>

            <label>
              Location
              <input
                type="text"
                placeholder="Remote, City, etc."
                value={editForm.location || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
              />
            </label>
          </div>

          <div className="form-row two-cols">
            <label>
              Application Date
              <input
                type="date"
                value={editForm.application_date || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, application_date: e.target.value })
                }
              />
            </label>

            <label>
              Salary Range / Budget
              <input
                type="text"
                placeholder="e.g. $130,000 - $160,000"
                value={editForm.salary_range || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, salary_range: e.target.value })
                }
              />
            </label>
          </div>

          <label>
            Job Listing URL
            <input
              type="url"
              placeholder="https://company.com/careers/..."
              value={editForm.job_url || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, job_url: e.target.value })
              }
            />
          </label>

          <label>
            Job Description & Qualifications
            <textarea
              rows={5}
              placeholder="Paste job description requirements for skill analysis..."
              value={editForm.job_description || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, job_description: e.target.value })
              }
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={savingEdit}
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
