import React, { useEffect, useState } from "react";
import api from "../api";
import Modal from "../components/Modal";

const INITIAL_FORM = {
  application: "",
  interview_type: "video",
  scheduled_at: "",
  interviewer: "",
  meeting_link: "",
  notes: "",
  completed: false,
};

export default function InterviewsView({ showNotification }) {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'upcoming' | 'completed'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Deletion state
  const [deletingInterview, setDeletingInterview] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = {};
      if (filter === "upcoming") params.status = "upcoming";
      if (filter === "completed") params.status = "completed";

      const [intRes, appRes] = await Promise.all([
        api.get("/interviews/", { params }),
        api.get("/applications/"),
      ]);
      setInterviews(intRes.data);
      setApplications(appRes.data);
    } catch {
      showNotification("Failed to load interviews.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingInterview(null);
    setForm({
      ...INITIAL_FORM,
      application: applications.length > 0 ? applications[0].id : "",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(inv) {
    setEditingInterview(inv);
    // Format scheduled_at for datetime-local input
    let formattedDate = "";
    if (inv.scheduled_at) {
      const d = new Date(inv.scheduled_at);
      formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    setForm({
      application: inv.application,
      interview_type: inv.interview_type || "video",
      scheduled_at: formattedDate,
      interviewer: inv.interviewer || "",
      meeting_link: inv.meeting_link || "",
      notes: inv.notes || "",
      completed: inv.completed || false,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleToggleCompleted(invId, currentStatus) {
    try {
      const res = await api.patch(`/interviews/${invId}/`, {
        completed: !currentStatus,
      });
      setInterviews((prev) =>
        prev.map((item) => (item.id === invId ? res.data : item))
      );
      showNotification(
        !currentStatus ? "Marked as completed." : "Marked as upcoming.",
        "success"
      );
    } catch {
      showNotification("Failed to update status.", "error");
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.application) {
      setFormError("Please select a job application for this interview.");
      return;
    }
    if (!form.scheduled_at) {
      setFormError("Please specify scheduled date and time.");
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingInterview) {
        const res = await api.patch(
          `/interviews/${editingInterview.id}/`,
          form
        );
        setInterviews((prev) =>
          prev.map((item) =>
            item.id === editingInterview.id ? res.data : item
          )
        );
        showNotification("Interview updated successfully.", "success");
      } else {
        const res = await api.post("/interviews/", form);
        setInterviews((prev) => [...prev, res.data]);
        showNotification("Interview scheduled successfully.", "success");
      }
      setIsModalOpen(false);
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        setFormError(
          typeof data === "string"
            ? data
            : Object.values(data).flat().join(" ")
        );
      } else {
        setFormError("Failed to save interview.");
      }
    } finally {
      setFormSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deletingInterview) return;
    try {
      await api.delete(`/interviews/${deletingInterview.id}/`);
      setInterviews((prev) =>
        prev.filter((item) => item.id !== deletingInterview.id)
      );
      showNotification("Interview deleted.", "success");
      setDeletingInterview(null);
    } catch {
      showNotification("Failed to delete interview.", "error");
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        weekday: "short",
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

  return (
    <div className="interviews-view">
      {/* Toolbar */}
      <div className="view-toolbar">
        <div className="filter-pill-group">
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Interviews
          </button>
          <button
            className={`filter-tab ${filter === "upcoming" ? "active" : ""}`}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`filter-tab ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>

        <button className="btn-primary" onClick={handleOpenCreate}>
          <span>+</span> Schedule Interview
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="view-loading">
          <div className="spinner"></div>
          <p>Loading interviews...</p>
        </div>
      ) : interviews.length > 0 ? (
        <div className="interviews-grid-list">
          {interviews.map((inv) => (
            <div
              key={inv.id}
              className={`interview-card ${inv.completed ? "card-completed" : ""}`}
            >
              <div className="card-top-row">
                <span className={`inv-type-pill pill-${inv.interview_type}`}>
                  {inv.interview_type}
                </span>

                <label className="checkbox-toggle" title="Toggle completion">
                  <input
                    type="checkbox"
                    checked={inv.completed}
                    onChange={() =>
                      handleToggleCompleted(inv.id, inv.completed)
                    }
                  />
                  <span>{inv.completed ? "Completed" : "Mark done"}</span>
                </label>
              </div>

              <div className="card-middle-content">
                <h3 className="card-company-role">
                  {inv.application_title || "Job Role"}
                </h3>
                <h4 className="card-company-name">{inv.company_name}</h4>

                <div className="card-time-row">
                  <span className="time-icon">⏰</span>
                  <span className="time-text">
                    {formatDateTime(inv.scheduled_at)}
                  </span>
                </div>

                {inv.interviewer && (
                  <div className="card-interviewer-row">
                    <span>👤</span>
                    <span>Interviewer: {inv.interviewer}</span>
                  </div>
                )}

                {inv.notes && (
                  <div className="card-notes-preview">
                    <p>{inv.notes}</p>
                  </div>
                )}
              </div>

              <div className="card-bottom-actions">
                {inv.meeting_link ? (
                  <a
                    href={inv.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-join-meeting"
                  >
                    Open Meeting Link ↗
                  </a>
                ) : (
                  <span className="no-link-text">No link provided</span>
                )}

                <div className="actions-right">
                  <button
                    className="btn-icon-action"
                    onClick={() => handleOpenEdit(inv)}
                    title="Edit Interview"
                  >
                    ✎
                  </button>
                  <button
                    className="btn-icon-action danger"
                    onClick={() => setDeletingInterview(inv)}
                    title="Delete Interview"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-panel-state large">
          <span className="empty-icon-large">📅</span>
          <h3>No interviews found</h3>
          <p>
            {filter === "upcoming"
              ? "You have no upcoming interviews scheduled."
              : filter === "completed"
              ? "No completed interviews yet."
              : "Schedule your recruiter screenings, technical challenges, and final rounds."}
          </p>
          <button className="btn-primary" onClick={handleOpenCreate}>
            + Schedule First Interview
          </button>
        </div>
      )}

      {/* Schedule / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInterview ? "Edit Interview Session" : "Schedule New Interview"}
      >
        <form onSubmit={handleFormSubmit} className="modal-form">
          {formError && <div className="alert error-alert">{formError}</div>}

          <label>
            Job Application *
            <select
              value={form.application}
              onChange={(e) => setForm({ ...form, application: e.target.value })}
              required
            >
              <option value="">Select target application...</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company_name} — {app.job_title} ({app.status})
                </option>
              ))}
            </select>
          </label>

          <div className="form-row two-cols">
            <label>
              Interview Type *
              <select
                value={form.interview_type}
                onChange={(e) =>
                  setForm({ ...form, interview_type: e.target.value })
                }
              >
                <option value="phone">Phone Screen</option>
                <option value="video">Video Call</option>
                <option value="technical">Technical / Coding</option>
                <option value="hr">HR / Fit</option>
                <option value="onsite">On-site</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Date & Time *
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm({ ...form, scheduled_at: e.target.value })
                }
                required
              />
            </label>
          </div>

          <div className="form-row two-cols">
            <label>
              Interviewer Name / Team
              <input
                type="text"
                placeholder="e.g. Alex (Engineering Lead)"
                value={form.interviewer}
                onChange={(e) =>
                  setForm({ ...form, interviewer: e.target.value })
                }
              />
            </label>

            <label>
              Meeting Link (Zoom, Meet, Teams)
              <input
                type="url"
                placeholder="https://meet.google.com/xyz"
                value={form.meeting_link}
                onChange={(e) =>
                  setForm({ ...form, meeting_link: e.target.value })
                }
              />
            </label>
          </div>

          <label>
            Session Notes & Objectives
            <textarea
              rows={3}
              placeholder="Key projects to discuss, behavioral anecdotes to share, questions for the interviewer..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <label className="checkbox-label-inline">
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(e) => setForm({ ...form, completed: e.target.checked })}
            />
            <span>Mark interview as already completed</span>
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={formSubmitting}
            >
              {formSubmitting
                ? "Saving..."
                : editingInterview
                ? "Update Interview"
                : "Schedule Interview"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingInterview}
        onClose={() => setDeletingInterview(null)}
        title="Confirm Interview Deletion"
      >
        <div className="delete-modal-body">
          <p>
            Are you sure you want to delete the scheduled{" "}
            <strong>{deletingInterview?.interview_type}</strong> interview for{" "}
            <strong>{deletingInterview?.company_name}</strong>?
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setDeletingInterview(null)}
            >
              Cancel
            </button>
            <button className="btn-danger" onClick={confirmDelete}>
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
