import React, { useEffect, useState } from "react";
import api from "../api";

export default function AnalyticsView({ showNotification }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await api.get("/analytics/");
      setAnalytics(res.data);
    } catch {
      showNotification("Failed to load analytics.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="view-loading">
        <div className="spinner"></div>
        <p>Calculating real-time analytics from database...</p>
      </div>
    );
  }

  const totalApps = analytics?.total_applications || 0;
  const offerRate = analytics?.offer_metrics?.offer_rate_percentage || 0;
  const rejectionRate = analytics?.rejection_metrics?.rejection_rate_percentage || 0;
  const interviewRate = analytics?.interview_metrics?.interview_rate_percentage || 0;

  const statusList = analytics?.applications_by_status || [];
  const funnel = analytics?.funnel || [];
  const skillGaps = analytics?.skill_gaps || [];
  const interviewMetrics = analytics?.interview_metrics || {};
  const timeline = analytics?.applications_over_time || [];

  return (
    <div className="analytics-view">
      {/* KPI Top Cards */}
      <div className="stats-row">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Applications</span>
            <span className="metric-icon">📑</span>
          </div>
          <div className="metric-number">{totalApps}</div>
          <div className="metric-sub">Tracked in database</div>
        </div>

        <div className="metric-card highlight-success">
          <div className="metric-header">
            <span className="metric-label">Offer Rate</span>
            <span className="metric-icon green">🎉</span>
          </div>
          <div className="metric-number">{offerRate}%</div>
          <div className="metric-sub">
            {analytics?.offer_metrics?.total_offers || 0} received
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Interview Conversion</span>
            <span className="metric-icon amber">🎯</span>
          </div>
          <div className="metric-number">{interviewRate}%</div>
          <div className="metric-sub">Apps reaching interviews</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Rejection Rate</span>
            <span className="metric-icon red">✕</span>
          </div>
          <div className="metric-number">{rejectionRate}%</div>
          <div className="metric-sub">
            {analytics?.rejection_metrics?.total_rejections || 0} recorded
          </div>
        </div>
      </div>

      {totalApps === 0 ? (
        <div className="empty-panel-state large mt-30">
          <span className="empty-icon-large">📊</span>
          <h3>No data available yet</h3>
          <p>
            Add job applications and schedule interviews to generate real analytics and
            visualize your funnel.
          </p>
        </div>
      ) : (
        <>
          {/* Funnel & Status Distribution */}
          <div className="dashboard-panels-grid mt-20">
            {/* Conversion Funnel */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Application Pipeline Funnel</h3>
                  <p className="panel-subtitle">Progression across hiring stages</p>
                </div>
              </div>

              <div className="funnel-bars-container">
                {funnel.map((step, idx) => {
                  const pct =
                    totalApps > 0 ? Math.round((step.count / totalApps) * 100) : 0;
                  return (
                    <div key={idx} className="funnel-step-row">
                      <div className="funnel-label-col">
                        <strong>{step.stage}</strong>
                        <span>{step.count} ({pct}%)</span>
                      </div>
                      <div className="funnel-bar-track">
                        <div
                          className={`funnel-bar-fill stage-${step.stage.toLowerCase()}`}
                          style={{ width: `${Math.max(pct, step.count > 0 ? 8 : 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Application Status Distribution */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Status Breakdown</h3>
                  <p className="panel-subtitle">Current status distribution</p>
                </div>
              </div>

              <div className="status-bars-container">
                {statusList.map((item, idx) => {
                  const pct =
                    totalApps > 0 ? Math.round((item.count / totalApps) * 100) : 0;
                  const label =
                    item.status.charAt(0).toUpperCase() + item.status.slice(1);
                  return (
                    <div key={idx} className="status-item-row">
                      <div className="status-label-wrap">
                        <span className={`status-pill status-${item.status}`}>
                          {label}
                        </span>
                        <span className="status-count-val">{item.count} items</span>
                      </div>
                      <div className="status-progress-track">
                        <div
                          className={`status-progress-fill status-${item.status}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline & Interview Types Grid */}
          <div className="dashboard-panels-grid mt-20">
            {/* Applications Over Time */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Applications Over Time</h3>
                  <p className="panel-subtitle">Application activity by period</p>
                </div>
              </div>

              {timeline.length > 0 ? (
                <div className="timeline-bars-list">
                  {timeline.map((period, idx) => {
                    const pct =
                      totalApps > 0
                        ? Math.round((period.count / totalApps) * 100)
                        : 0;
                    return (
                      <div key={idx} className="timeline-item-bar">
                        <div className="timeline-period-label">{period.period}</div>
                        <div className="timeline-bar-track">
                          <div
                            className="timeline-bar-fill"
                            style={{ width: `${Math.max(pct, 12)}%` }}
                          >
                            <span>{period.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="sub-hint">No timeline records found.</p>
              )}
            </div>

            {/* Interviews Breakdown */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Interviews Breakdown</h3>
                  <p className="panel-subtitle">
                    {interviewMetrics.total || 0} total sessions ({interviewMetrics.completed || 0} completed, {interviewMetrics.upcoming || 0} upcoming)
                  </p>
                </div>
              </div>

              {interviewMetrics.by_type?.length > 0 ? (
                <div className="interview-types-list">
                  {interviewMetrics.by_type.map((t, idx) => (
                    <div key={idx} className="interview-type-row">
                      <span className={`inv-type-pill pill-${t.interview_type}`}>
                        {t.interview_type}
                      </span>
                      <strong className="inv-count-text">{t.count} session(s)</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-mini">
                  <p>No interviews recorded yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Skill Gaps Card */}
          <div className="panel-card full-width mt-20">
            <div className="panel-header">
              <div>
                <h3>Target Skill Gaps Analysis</h3>
                <p className="panel-subtitle">
                  Most frequently missing requirements aggregated from your Rule-Based Skill Analyses
                </p>
              </div>
            </div>

            {skillGaps.length > 0 ? (
              <div className="skill-gaps-grid">
                {skillGaps.map((gap, idx) => (
                  <div key={idx} className="skill-gap-card">
                    <span className="gap-rank">#{idx + 1}</span>
                    <strong className="gap-name">{gap.skill}</strong>
                    <span className="gap-occurrences">
                      Missing in {gap.count} job post{gap.count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-mini">
                <p>
                  No skill gaps detected yet. Run comparisons in the Skill Analyzer to
                  aggregate high-priority missing skills here.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
