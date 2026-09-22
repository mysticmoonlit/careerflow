import React, { useEffect, useState } from "react";
import api from "../api";
import Modal from "../components/Modal";

const CATEGORIES = [
  { id: "checklist", label: "Preparation Checklist", icon: "✓" },
  { id: "hr", label: "HR Questions", icon: "👥" },
  { id: "technical", label: "Technical Questions", icon: "💻" },
  { id: "behavioral", label: "Behavioral (STAR)", icon: "⭐" },
];

export default function InterviewPrepView({ showNotification }) {
  const [activeCategory, setActiveCategory] = useState("checklist");
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    readiness_score: 0,
  });
  const [loading, setLoading] = useState(true);

  // Note-taking expansion state
  const [expandedId, setExpandedId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);

  // Add custom item modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    category: "hr",
    title: "",
    description: "",
    user_notes: "",
  });
  const [submittingCustom, setSubmittingCustom] = useState(false);

  useEffect(() => {
    fetchPrepData();
  }, [activeCategory]);

  async function fetchPrepData() {
    setLoading(true);
    try {
      const res = await api.get("/prep/", {
        params: { category: activeCategory },
      });
      setItems(res.data.items);
      setMetrics(res.data.metrics);

      // Pre-fill note drafts
      const drafts = {};
      res.data.items.forEach((it) => {
        drafts[it.id] = it.user_notes || "";
      });
      setNoteDrafts(drafts);
    } catch {
      showNotification("Failed to load interview prep items.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCompleted(item) {
    const newStatus = !item.is_completed;
    try {
      const res = await api.patch(`/prep/${item.id}/`, {
        is_completed: newStatus,
      });

      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? res.data : it))
      );

      // Update metrics locally
      setMetrics((prev) => {
        const newCompleted = newStatus
          ? prev.completed + 1
          : Math.max(0, prev.completed - 1);
        const newScore =
          prev.total > 0 ? Math.round((newCompleted / prev.total) * 100) : 0;
        return {
          ...prev,
          completed: newCompleted,
          readiness_score: newScore,
        };
      });

      showNotification(
        newStatus ? "Marked as completed!" : "Marked as incomplete.",
        "success"
      );
    } catch {
      showNotification("Failed to update item status.", "error");
    }
  }

  async function handleSaveNotes(itemId) {
    setSavingNoteId(itemId);
    try {
      const draft = noteDrafts[itemId] || "";
      const res = await api.patch(`/prep/${itemId}/`, { user_notes: draft });
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? res.data : it))
      );
      showNotification("Practice notes saved.", "success");
    } catch {
      showNotification("Failed to save answer notes.", "error");
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleAddCustomItem(e) {
    e.preventDefault();
    if (!customForm.title.trim()) {
      showNotification("Please enter a question or checklist title.", "error");
      return;
    }

    setSubmittingCustom(true);
    try {
      const res = await api.post("/prep/", customForm);
      if (customForm.category === activeCategory) {
        setItems((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
      setCustomForm({
        category: activeCategory,
        title: "",
        description: "",
        user_notes: "",
      });
      showNotification("Added new interview prep item.", "success");
      fetchPrepData();
    } catch {
      showNotification("Failed to add custom item.", "error");
    } finally {
      setSubmittingCustom(false);
    }
  }

  async function handleDeleteItem(itemId, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/prep/${itemId}/`);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      showNotification("Item deleted.", "success");
      fetchPrepData();
    } catch {
      showNotification("Failed to delete item.", "error");
    }
  }

  return (
    <div className="interview-prep-view">
      {/* Readiness Hero Metric */}
      <div className="prep-hero-card">
        <div className="prep-hero-left">
          <span className="hero-subtitle">PREPARATION TRACKER</span>
          <h2>Interview Readiness Index</h2>
          <p>
            Track completion across vital checklist steps, HR questions, system design & technical
            topics, and behavioral STAR stories.
          </p>
        </div>

        <div className="prep-hero-meter">
          <div className="readiness-number-row">
            <span className="readiness-big-num">{metrics.readiness_score}%</span>
            <span className="readiness-status-label">
              {metrics.completed} of {metrics.total} prepared
            </span>
          </div>

          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${metrics.readiness_score}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Tabs & Actions */}
      <div className="view-toolbar mt-20">
        <div className="filter-pill-group">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`filter-tab ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(cat.id);
                setExpandedId(null);
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            setCustomForm({ ...customForm, category: activeCategory });
            setIsModalOpen(true);
          }}
        >
          + Add Custom Item
        </button>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="view-loading">
          <div className="spinner"></div>
          <p>Loading prep items...</p>
        </div>
      ) : items.length > 0 ? (
        <div className="prep-items-list">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`prep-item-card ${item.is_completed ? "completed" : ""}`}
              >
                <div className="prep-item-main-row">
                  <label className="prep-checkbox-label">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleToggleCompleted(item)}
                    />
                  </label>

                  <div
                    className="prep-item-text"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <h4 className="prep-item-title">{item.title}</h4>
                    {item.description && (
                      <p className="prep-item-desc">{item.description}</p>
                    )}
                  </div>

                  <div className="prep-item-actions">
                    <button
                      className="btn-secondary-compact"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? "Hide Answer Notes ▲" : "Practice / Notes ▼"}
                    </button>
                    <button
                      className="btn-icon-action danger"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      title="Delete question"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Expanded Answer / Practice Notes Area */}
                {isExpanded && (
                  <div className="prep-item-expanded-box">
                    <div className="prep-notes-header">
                      <span>Draft your response / talking points:</span>
                      {item.user_notes && (
                        <span className="saved-indicator">✓ Saved in database</span>
                      )}
                    </div>

                    <textarea
                      rows={5}
                      className="prep-notes-textarea"
                      placeholder="Write your talking points, STAR framework components (Situation, Task, Action, Result), or technical notes..."
                      value={noteDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setNoteDrafts({
                          ...noteDrafts,
                          [item.id]: e.target.value,
                        })
                      }
                    />

                    <div className="prep-notes-footer">
                      <button
                        className="btn-primary-compact"
                        onClick={() => handleSaveNotes(item.id)}
                        disabled={savingNoteId === item.id}
                      >
                        {savingNoteId === item.id ? "Saving..." : "Save Answer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel-state large">
          <span className="empty-icon-large">🎯</span>
          <h3>No items in this category</h3>
          <p>Add custom questions or checklist tasks to prepare for your interviews.</p>
          <button
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Add First Item
          </button>
        </div>
      )}

      {/* Add Custom Prep Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Custom Interview Question or Task"
      >
        <form onSubmit={handleAddCustomItem} className="modal-form">
          <label>
            Category
            <select
              value={customForm.category}
              onChange={(e) =>
                setCustomForm({ ...customForm, category: e.target.value })
              }
            >
              <option value="checklist">Preparation Checklist</option>
              <option value="hr">HR Question</option>
              <option value="technical">Technical Question</option>
              <option value="behavioral">Behavioral Question</option>
            </select>
          </label>

          <label>
            Question or Task Title *
            <input
              type="text"
              placeholder="e.g. Design a URL Shortener or Review SQL index types"
              value={customForm.title}
              onChange={(e) =>
                setCustomForm({ ...customForm, title: e.target.value })
              }
              required
            />
          </label>

          <label>
            Explanation or Guidance Notes
            <textarea
              rows={3}
              placeholder="Key points to mention, framework rules, or reference links..."
              value={customForm.description}
              onChange={(e) =>
                setCustomForm({ ...customForm, description: e.target.value })
              }
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submittingCustom}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submittingCustom}
            >
              {submittingCustom ? "Adding..." : "Add to Prep Hub"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
