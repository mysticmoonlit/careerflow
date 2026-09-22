import React, { useEffect, useState } from "react";
import api from "../api";
import Modal from "../components/Modal";

const STATUSES = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

const INITIAL_FORM = {
  company_name: "",
  job_title: "",
  job_url: "",
  location: "",
  employment_type: "Full-time",
  status: "applied",
  application_date: new Date().toISOString().split("T")[0],
  salary_range: "",
  job_description: "",
  notes: "",
};

export default function ApplicationsView({
  onSelectApplication,
  isAddModalOpen,
  onCloseAddModal,
  onOpenAddModal,
  showNotification,
}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal editing state
  const [editingApp, setEditingApp] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete modal state
  const [deletingApp, setDeletingApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, searchQuery]);

  // When add modal opens from outside (e.g. navbar), reset form
  useEffect(() => {
    if (isAddModalOpen && !editingApp) {
      setForm(INITIAL_FORM);
      setFormError("");
    }
  }, [isAddModalOpen]);


  async function fetchApplications() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/applications/", { params });
      setApplications(res.data);
    } catch (err) {
      showNotification("Failed to load applications.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingApp(null);
    setForm(INITIAL_FORM);
    setFormError("");
    onOpenAddModal();
  }

  function handleOpenEdit(app, e) {
    if (e) e.stopPropagation();
    setEditingApp(app);
    setForm({
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
    setFormError("");
    onOpenAddModal();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);

    try {
      if (editingApp) {
        // Update
        const res = await api.patch(`/applications/${editingApp.id}/`, form);
        setApplications((prev) =>
          prev.map((item) => (item.id === editingApp.id ? res.data : item))
        );
        showNotification("Application updated successfully.", "success");
      } else {
        // Create
        const res = await api.post("/applications/", form);
        setApplications((prev) => [res.data, ...prev]);
        showNotification("Application added successfully.", "success");
      }
      onCloseAddModal();
      setEditingApp(null);
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        setFormError(
          typeof data === "string"
            ? data
            : Object.values(data).flat().join(" ")
        );
      } else {
        setFormError("Failed to save application. Please verify the input.");
      }
    } finally {
      setFormSubmitting(false);
    }
  }

  function handleCloseModal() {
    onCloseAddModal();
    setEditingApp(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }


  async function confirmDelete() {
    if (!deletingApp) return;
    try {
      await api.delete(`/applications/${deletingApp.id}/`);
      setApplications((prev) => prev.filter((a) => a.id !== deletingApp.id));
      showNotification("Application deleted.", "success");
      setDeletingApp(null);
    } catch {
      showNotification("Failed to delete application.", "error");
    }
  }

  const getStatusBadge = (st) => {
    const formatted = st ? st.charAt(0).toUpperCase() + st.slice(1) : "Saved";
    return <span className={`status-pill status-${st}`}>{formatted}</span>;
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

  return (
    <div className="applications-view">
      {/* Search & Actions Header */}
      <div className="view-toolbar">
        <div className="search-bar-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search company, job title, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <button className="btn-primary" onClick={handleOpenCreate}>
          <span>+</span> Add Application
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="status-filter-tabs">
        {STATUSES.map((st) => (
          <button
            key={st.id}
            className={`filter-tab ${statusFilter === st.id ? "active" : ""}`}
            onClick={() => setStatusFilter(st.id)}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Applications List/Table */}
      {loading ? (
        <div className="view-loading">
          <div className="spinner"></div>
          <p>Loading applications...</p>
        </div>
      ) : applications.length > 0 ? (
        <div className="panel-card table-panel">
          <div className="table-responsive">
            <table className="custom-table applications-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Employment</th>
                  <th>Salary</th>
                  <th>Applied</th>
                  <th>Interviews</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="table-row-hover"
                    onClick={() => onSelectApplication(app.id)}
                  >
                    <td className="bold-cell">
                      <div className="company-cell-flex">
                        <span>{app.company_name}</span>
                        {app.job_url && (
                          <a
                            href={app.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link-icon"
                            onClick={(e) => e.stopPropagation()}
                            title="Open Job Listing"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{app.job_title}</td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td className="sub-cell">{app.location || "—"}</td>
                    <td className="sub-cell">{app.employment_type || "—"}</td>
                    <td className="sub-cell">{app.salary_range || "—"}</td>
                    <td>{formatDate(app.application_date || app.created_at)}</td>
                    <td>
                      <span className="interview-count-badge">
                        {app.interviews_count || 0}
                      </span>
                    </td>
                    <td className="text-right actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon-action"
                        onClick={() => onSelectApplication(app.id)}
                        title="View Details"
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon-action"
                        onClick={(e) => handleOpenEdit(app, e)}
                        title="Edit Application"
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon-action danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingApp(app);
                        }}
                        title="Delete Application"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-panel-state large">
          <span className="empty-icon-large">📋</span>
          <h3>No applications found</h3>
          <p>
            {searchQuery || statusFilter !== "all"
              ? "No job applications match your current search or filter criteria."
              : "Track your job applications in one central place with notes, stages, and interviews."}
          </p>
          <button className="btn-primary" onClick={handleOpenCreate}>
            + Add New Application
          </button>
        </div>
      )}

      {/* Add / Edit Application Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title={editingApp ? `Edit: ${editingApp.company_name}` : "Track New Job Application"}
      >
        <form onSubmit={handleFormSubmit} className="modal-form">
          {formError && <div className="alert error-alert">{formError}</div>}

          <div className="form-row two-cols">
            <label>
              Company Name *
              <input
                type="text"
                placeholder="e.g. Stripe, Google, Acme Corp"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </label>

            <label>
              Job Title *
              <input
                type="text"
                placeholder="e.g. Senior Full Stack Engineer"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="form-row three-cols">
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
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
                placeholder="Full-time, Contract, Part-time"
                value={form.employment_type}
                onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
              />
            </label>

            <label>
              Location
              <input
                type="text"
                placeholder="Remote, San Francisco, NY"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
          </div>

          <div className="form-row two-cols">
            <label>
              Application Date
              <input
                type="date"
                value={form.application_date}
                onChange={(e) => setForm({ ...form, application_date: e.target.value })}
              />
            </label>

            <label>
              Salary Range / Budget
              <input
                type="text"
                placeholder="e.g. $130,000 - $160,000"
                value={form.salary_range}
                onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
              />
            </label>
          </div>

          <label>
            Job Listing URL
            <input
              type="url"
              placeholder="https://company.com/careers/job-id"
              value={form.job_url}
              onChange={(e) => setForm({ ...form, job_url: e.target.value })}
            />
          </label>

          <label>
            Job Description / Requirements
            <textarea
              rows={4}
              placeholder="Paste the job description or required skills here for skill analysis..."
              value={form.job_description}
              onChange={(e) => setForm({ ...form, job_description: e.target.value })}
            />
          </label>

          <label>
            Personal Notes & Strategy
            <textarea
              rows={3}
              placeholder="Referral contact, recruiter notes, interview pointers, salary expectations..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCloseModal}
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={formSubmitting}
            >
              {formSubmitting ? "Saving..." : editingApp ? "Update Application" : "Save Application"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingApp}
        onClose={() => setDeletingApp(null)}
        title="Confirm Deletion"
      >
        <div className="delete-modal-body">
          <p>
            Are you sure you want to delete the application for{" "}
            <strong>{deletingApp?.job_title}</strong> at{" "}
            <strong>{deletingApp?.company_name}</strong>?
          </p>
          <p className="sub-warning">
            This will permanently remove the application and all its scheduled interviews and
            skill records.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setDeletingApp(null)}
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
