import React from "react";
import { useNavigate } from "react-router-dom";
import MatchScore from "./MatchScore.jsx";

function fmt(s) {
  if (!s) return "Not disclosed";
  if (s.min && s.max) {
    const c = s.currency === "USD" ? "$" : "\u20B9";
    return c + s.min.toLocaleString() + " \u2013 " + c + s.max.toLocaleString();
  }
  if (s.average) {
    const c = s.currency === "USD" ? "$" : "\u20B9";
    return "~" + c + s.average.toLocaleString() + "/yr";
  }
  return "Not disclosed";
}

function relativeDate(d) {
  if (!d) return "N/A";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return "Just now";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks + "w ago";
  return new Date(d).toLocaleDateString();
}

export default function JobDetailsModal({ job, onClose }) {
  if (!job) return null;
  const nav = useNavigate();
  const desc = (job.description || "").replace(/<[^>]*>/g, "");
  const salaryPred = job.salaryPrediction;
  const maxSal = salaryPred
    ? Math.max(salaryPred.minimum || 0, salaryPred.average || 0, salaryPred.maximum || 0)
    : 1;

  function barWidth(val) {
    return maxSal > 0 ? (val / maxSal) * 100 : 0;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem" }}>{job.title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {job.company} &bull; {job.source} &bull; {job.location}
            </p>
          </div>
          <button className="ghost-btn modal-close-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>

        {/* Match Breakdown */}
        <MatchScore
          overall={job.match?.overall || 0}
          skills={job.match?.skillMatch || 0}
          education={job.match?.educationMatch || 0}
          eligibility={job.match?.eligibilityMatch || 0}
          experience={job.match?.experienceMatch || 0}
          location={job.match?.locationMatch || 0}
          ats={job.ats?.score || 0}
        />

        {/* Job Info Grid */}
        <div className="modal-grid">
          <div className="modal-info-col">
            <InfoItem label="Company" value={job.company} />
            <InfoItem label="Location" value={job.location} />
            <InfoItem label="Type" value={job.type} />
            <InfoItem label="Salary" value={fmt(job.salary)} />
            <InfoItem label="Source" value={job.source} />
          </div>
          <div className="modal-info-col">
            <InfoItem label="Posted" value={relativeDate(job.publishedAt)} />
            <InfoItem label="Category" value={job.category} />
            <InfoItem label="Remote" value={job.remote ? "Yes" : "No"} />
            {job.locationMatch && (
              <InfoItem
                label="Location Match"
                value={`${job.locationMatch.score}% \u2014 ${job.locationMatch.reason}`}
              />
            )}
          </div>
        </div>

        {/* Full Job Description */}
        {desc && (
          <section className="modal-section">
            <h2>Job Description</h2>
            <div className="modal-desc-box">
              <pre className="modal-desc-text">{desc}</pre>
            </div>
          </section>
        )}

        {/* AI Summary */}
        {job.summary && (
          <section className="modal-section">
            <h2>AI Summary</h2>
            <p className="modal-ai-summary">{job.summary}</p>
          </section>
        )}

        {/* Why Recommended */}
        {job.match?.reasons?.length > 0 && (
          <section className="modal-section">
            <h2>Why AI Recommended</h2>
            <ul className="modal-reasons-list">
              {job.match.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Eligibility with indicators */}
        {job.eligibility?.length > 0 && (
          <section className="modal-section">
            <h2>Eligibility</h2>
            <div className="modal-eligibility">
              {job.eligibility.map((item, i) => {
                const pass =
                  !item.toLowerCase().includes("not") &&
                  !item.toLowerCase().includes("lack");
                return (
                  <div key={i} className="modal-eligibility-item">
                    <span
                      style={{
                        color: pass ? "var(--success)" : "var(--error)",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {pass ? "\u2713" : "\u2717"}
                    </span>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Salary Prediction */}
        {salaryPred && (
          <section className="modal-section">
            <h2>Salary Prediction</h2>
            <div className="modal-salary-box">
              {[
                ["Minimum", salaryPred.minimum],
                ["Average", salaryPred.average],
                ["Maximum", salaryPred.maximum],
              ].map(
                ([label, val]) =>
                  val ? (
                    <div key={label} className="modal-salary-row">
                      <div className="modal-salary-labels">
                        <span className="modal-salary-label">{label}</span>
                        <span className="modal-salary-val">
                          {fmt({ min: val, max: val, currency: salaryPred.currency })}
                        </span>
                      </div>
                      <div className="modal-salary-bar-bg">
                        <div
                          className="modal-salary-bar-fill"
                          style={{ width: barWidth(val) + "%" }}
                        />
                      </div>
                    </div>
                  ) : null
              )}
              {salaryPred.reason && (
                <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                  {salaryPred.reason}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Career Advice */}
        {job.careerAdvice && (
          <section className="modal-section">
            <h2>Career Advice</h2>
            <div className="modal-grid">
              <div className="card" style={{ padding: 14 }}>
                <h3 style={{ margin: "0 0 4px" }}>Current Level</h3>
                <p style={{ margin: 0 }}>{job.careerAdvice.currentLevel}</p>
                <h3 style={{ margin: "12px 0 4px" }}>Primary Career</h3>
                <p style={{ margin: 0 }}>{job.careerAdvice.primaryCareer}</p>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <h3 style={{ margin: "0 0 4px" }}>Target Companies</h3>
                <ul className="modal-company-list">
                  {(job.careerAdvice.targetCompanies || [])
                    .slice(0, 5)
                    .map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                </ul>
              </div>
            </div>
            {job.careerAdvice.recommendedSkills?.length > 0 && (
              <div className="card" style={{ marginTop: 10, padding: 14 }}>
                <h3 style={{ margin: "0 0 8px" }}>Recommended Skills</h3>
                <div className="modal-chip-wrap">
                  {job.careerAdvice.recommendedSkills.map((s, i) => (
                    <span key={i} className="js-skill-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {job.careerAdvice.certifications?.length > 0 && (
              <div className="card" style={{ marginTop: 10, padding: 14 }}>
                <h3 style={{ margin: "0 0 8px" }}>Certifications</h3>
                <div className="modal-chip-wrap">
                  {job.careerAdvice.certifications.map((c, i) => (
                    <span key={i} className="js-badge js-badge-ats">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {job.recommendation?.suggestedCertifications?.length > 0 && (
              <div className="card" style={{ marginTop: 10, padding: 14 }}>
                <h3 style={{ margin: "0 0 8px" }}>Suggested Certifications</h3>
                <div className="modal-chip-wrap">
                  {job.recommendation.suggestedCertifications.map((c, i) => (
                    <span key={i} className="js-badge js-badge-ats">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Matched / Missing Skills */}
        {(job.match?.matchedSkills?.length > 0 || job.match?.missingSkills?.length > 0) && (
          <section className="modal-section">
            <div className="modal-grid">
              {job.match?.matchedSkills?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h3 style={{ margin: "0 0 8px" }}>&#10003; Matched Skills</h3>
                  <div className="modal-chip-wrap">
                    {job.match.matchedSkills.map((s, i) => (
                      <span key={i} className="js-badge js-badge-matched">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.match?.missingSkills?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h3 style={{ margin: "0 0 8px" }}>&#9888; Missing Skills</h3>
                  <div className="modal-chip-wrap">
                    {job.match.missingSkills.map((s, i) => (
                      <span key={i} className="js-badge js-badge-missing">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ATS Tips */}
        {job.ats?.suggestions?.length > 0 && (
          <section className="modal-section">
            <h2>ATS Tips</h2>
            <ul className="modal-ats-list">
              {job.ats.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="ghost-btn"
            onClick={() => {
              nav("/resume-job-analysis");
              onClose();
            }}
          >
            Compare with Resume
          </button>
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-btn"
            onClick={() => job.applyUrl && window.open(job.applyUrl, "_blank")}
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="modal-info-item">
      <span className="modal-info-label">{label}</span>
      <span className="modal-info-value">{value || "N/A"}</span>
    </div>
  );
}
