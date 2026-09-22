import React, { useEffect, useState } from "react";
import api from "../api";

const SAMPLE_RESUME = `SENIOR FULL STACK ENGINEER
Summary: Experienced software engineer building scalable web applications with Python, Django, Django REST Framework, React, and PostgreSQL. Experienced in Docker containerization, RESTful APIs, Git version control, and Unit Testing with pytest.

TECHNICAL SKILLS:
- Languages: Python, JavaScript, TypeScript, SQL, HTML5, CSS3, Bash
- Frameworks & Libs: Django, FastAPI, React, Redux, Node.js, Express.js, Tailwind CSS
- Databases: PostgreSQL, SQLite, Redis, MongoDB
- DevOps & Cloud: Docker, AWS (EC2, S3), CI/CD (GitHub Actions), Linux, Nginx
- Practices: Agile / Scrum, System Design, OOP, Test-Driven Development (TDD), Code Review
`;

export default function SkillAnalyzerView({ prefillApp, showNotification }) {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [applications, setApplications] = useState([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [pastReports, setPastReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchPastReports();

    if (prefillApp) {
      if (prefillApp.job_description) {
        setJobDescription(prefillApp.job_description);
      }
      setSelectedAppId(prefillApp.id);
    }
  }, [prefillApp]);

  async function fetchApplications() {
    try {
      const res = await api.get("/applications/");
      setApplications(res.data);
    } catch {
      // Ignored non-critical
    }
  }

  async function fetchPastReports() {
    setLoadingReports(true);
    try {
      const res = await api.get("/skills/reports/");
      setPastReports(res.data);
    } catch {
      // Ignored
    } finally {
      setLoadingReports(false);
    }
  }

  function handleSelectApplication(e) {
    const appId = e.target.value;
    setSelectedAppId(appId);
    if (!appId) return;

    const chosen = applications.find((a) => a.id === parseInt(appId, 10));
    if (chosen && chosen.job_description) {
      setJobDescription(chosen.job_description);
    }
  }

  async function handleRunAnalysis(e) {
    e.preventDefault();
    if (!resumeText.trim()) {
      showNotification("Please paste your resume text.", "error");
      return;
    }
    if (!jobDescription.trim()) {
      showNotification("Please paste the target job description.", "error");
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const payload = {
        resume_text: resumeText,
        job_description: jobDescription,
        application_id: selectedAppId ? parseInt(selectedAppId, 10) : null,
        save_report: true,
      };

      const res = await api.post("/skills/analyze/", payload);
      setResult(res.data);
      showNotification("Skill analysis completed.", "success");
      fetchPastReports();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Analysis failed. Please check inputs.",
        "error"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDeleteReport(reportId) {
    try {
      await api.delete(`/skills/reports/${reportId}/`);
      setPastReports((prev) => prev.filter((r) => r.id !== reportId));
      showNotification("Report deleted.", "success");
    } catch {
      showNotification("Failed to delete report.", "error");
    }
  }

  const getScoreColor = (pct) => {
    if (pct >= 80) return "#10b981"; // green
    if (pct >= 55) return "#3b82f6"; // blue
    if (pct >= 35) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
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
    <div className="skill-analyzer-view">
      {/* Informational Banner */}
      <div className="analyzer-info-banner">
        <div className="info-badge">DETERMINISTIC ENGINE</div>
        <h3>Rule-Based Resume & Job Skill Analyzer</h3>
        <p>
          CareerFlow uses a comprehensive, exact pattern-matching dictionary across industry
          technologies, frameworks, databases, and engineering practices. No generative AI
          hallucinations—all results reflect pure keyword and skill presence.
        </p>
      </div>

      {/* Input Form Grid */}
      <div className="analyzer-inputs-grid">
        {/* Resume Column */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Your Resume Text</h3>
              <p className="panel-subtitle">Paste plain resume text or qualifications</p>
            </div>
            <button
              type="button"
              className="btn-text-action"
              onClick={() => setResumeText(SAMPLE_RESUME)}
            >
              Insert Sample Resume
            </button>
          </div>

          <textarea
            className="analyzer-textarea"
            rows={12}
            placeholder="Paste your resume content, skills section, or technical summary here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>

        {/* Job Description Column */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Target Job Description</h3>
              <p className="panel-subtitle">Paste posting or select from tracked jobs</p>
            </div>
            {applications.length > 0 && (
              <select
                className="select-compact"
                value={selectedAppId}
                onChange={handleSelectApplication}
              >
                <option value="">Or pick tracked job...</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company_name} - {a.job_title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            className="analyzer-textarea"
            rows={12}
            placeholder="Paste the job description, required skills, and qualification requirements here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Run Analysis Action Button */}
      <div className="analyzer-cta-bar">
        <button
          className="btn-accent-cta"
          onClick={handleRunAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <span className="spinner-inline"></span>
              <span>Running Rule-Based Analysis...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Compare & Analyze Alignment</span>
            </>
          )}
        </button>
      </div>

      {/* Results View */}
      {result && (
        <div className="analysis-results-container">
          <div className="result-hero-card">
            <div className="score-radial-wrap">
              <div
                className="score-circle-display"
                style={{ borderColor: getScoreColor(result.match_percentage) }}
              >
                <span
                  className="score-value"
                  style={{ color: getScoreColor(result.match_percentage) }}
                >
                  {result.match_percentage}%
                </span>
                <span className="score-subtext">Skill Match</span>
              </div>
            </div>

            <div className="result-narrative">
              <span className="readiness-pill">{result.readiness_badge}</span>
              <h2>{result.summary}</h2>
              <p className="engine-disclaimer">
                Analyzed via <strong>{result.engine}</strong>
              </p>

              <div className="result-quick-stats">
                <div className="stat-box">
                  <strong>{result.total_required}</strong>
                  <span>Skills Required</span>
                </div>
                <div className="stat-box">
                  <strong className="text-success">{result.total_matched}</strong>
                  <span>Matching Skills</span>
                </div>
                <div className="stat-box">
                  <strong className="text-danger">{result.total_missing}</strong>
                  <span>Missing Skills</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Suggestions */}
          {result.suggestions?.length > 0 && (
            <div className="suggestion-box">
              <span className="sugg-icon">💡</span>
              <div>
                <strong>Tailoring Recommendation:</strong>
                {result.suggestions.map((sugg, i) => (
                  <p key={i}>{sugg}</p>
                ))}
              </div>
            </div>
          )}

          {/* Skills Breakdown Grid */}
          <div className="skills-breakdown-grid">
            {/* Matching Skills */}
            <div className="panel-card">
              <div className="panel-header">
                <h3>
                  Matching Skills ({result.matching_skills.length})
                </h3>
              </div>
              {result.matching_skills.length > 0 ? (
                <div className="skills-tag-cloud">
                  {result.matching_skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag matched">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="sub-hint">No direct matching skills found in the resume.</p>
              )}
            </div>

            {/* Missing Skills */}
            <div className="panel-card">
              <div className="panel-header">
                <h3>
                  Missing Target Skills ({result.missing_skills.length})
                </h3>
              </div>
              {result.missing_skills.length > 0 ? (
                <div className="skills-tag-cloud">
                  {result.missing_skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag missing">
                      ✕ {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="sub-hint text-success">
                  Great job! You have all the skills requested in this posting.
                </p>
              )}
            </div>

            {/* Important Required Skills Table */}
            <div className="panel-card full-width">
              <div className="panel-header">
                <h3>Target Job Skill Inventory & Priority</h3>
                <p className="panel-subtitle">Frequency & importance in the posting</p>
              </div>

              {result.important_skills.length > 0 ? (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Skill Name</th>
                        <th>Importance Tier</th>
                        <th>Job Description Occurrences</th>
                        <th>Status in Resume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.important_skills.map((item, idx) => (
                        <tr key={idx}>
                          <td className="bold-cell">{item.skill}</td>
                          <td>
                            <span
                              className={`priority-pill priority-${item.importance.toLowerCase()}`}
                            >
                              {item.importance}
                            </span>
                          </td>
                          <td>{item.frequency_in_jd}x mentioned</td>
                          <td>
                            {item.status === "Matched" ? (
                              <span className="skill-tag matched">✓ In Resume</span>
                            ) : (
                              <span className="skill-tag missing">✕ Missing</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="sub-hint">No standard tech skills detected in job description.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Reports History */}
      <div className="panel-card mt-30">
        <div className="panel-header">
          <div>
            <h3>Previous Skill Analysis Reports</h3>
            <p className="panel-subtitle">Saved comparisons from your session</p>
          </div>
        </div>

        {loadingReports ? (
          <p className="sub-hint">Loading report history...</p>
        ) : pastReports.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Job Title / Role</th>
                  <th>Company</th>
                  <th>Match Score</th>
                  <th>Matched</th>
                  <th>Missing</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pastReports.map((rep) => (
                  <tr key={rep.id}>
                    <td className="bold-cell">{rep.job_title || "Custom Role"}</td>
                    <td>{rep.company_name || "—"}</td>
                    <td>
                      <span
                        className="score-badge"
                        style={{ color: getScoreColor(rep.match_percentage) }}
                      >
                        {rep.match_percentage}%
                      </span>
                    </td>
                    <td>
                      <span className="skill-tag matched">
                        {rep.matching_skills?.length || 0} skills
                      </span>
                    </td>
                    <td>
                      <span className="skill-tag missing">
                        {rep.missing_skills?.length || 0} skills
                      </span>
                    </td>
                    <td className="sub-cell">{formatDate(rep.created_at)}</td>
                    <td className="text-right">
                      <button
                        className="btn-icon-action danger"
                        onClick={() => handleDeleteReport(rep.id)}
                        title="Delete report"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel-state small">
            <p>No saved reports yet. Run an analysis above to see past comparisons here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
