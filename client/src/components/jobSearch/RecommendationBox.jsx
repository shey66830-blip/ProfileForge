import React from "react";
import { Link } from "react-router-dom";

export default function RecommendationBox({ jobs = [], onOpenJob }) {
  const sorted = [...jobs].sort((a, b) => (b.match?.overall || 0) - (a.match?.overall || 0));
  const topJob = sorted[0] || null;
  const top3 = sorted.slice(0, 3);

  const topScore = topJob?.match?.overall || 0;
  const rec = topJob?.recommendation;
  const reasons = topJob?.match?.reasons || [];
  const missingSkills = topJob?.match?.missingSkills || [];
  const certifications = rec?.suggestedCertifications || [];
  const recLevel = rec?.recommendationLevel || "N/A";
  const recAdvice = rec?.careerAdvice || "";
  const suggestions = rec?.recommendations || [];
  const warnings = rec?.warnings || [];
  const improvements = rec?.improvements || [];
  const suggestedCountries = rec?.suggestedCountries || [];
  const suggestedCompanies = rec?.suggestedCompanies || [];
  const salaryPred = topJob?.salaryPrediction;
  const careerAdvice = topJob?.careerAdvice;

  function matchColor(score) {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  }

  return (
    <section className="card">
      <p className="eyebrow">AI Career Recommendation</p>
      <h2>Personalized Recommendation</h2>

      {!topJob ? (
        <div className="card">
          <h3>No Recommendation Yet</h3>
          <p>Search jobs first. AI will analyze your resume, compare opportunities and recommend the best ones.</p>
        </div>
      ) : (
        <>
          {/* Top 3 Recommendations */}
          <h3>🏆 Top 3 Recommended Jobs</h3>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "8px 0", marginBottom: 20 }}>
            {top3.map((job, i) => (
              <div
                key={job.id || i}
                className="card"
                style={{ minWidth: 280, flexShrink: 0, cursor: onOpenJob ? "pointer" : "default" }}
                onClick={() => onOpenJob && onOpenJob(job)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 24 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <span style={{ color: matchColor(job.match?.overall || 0), fontWeight: 700, fontSize: 18 }}>
                    {job.match?.overall || 0}%
                  </span>
                </div>
                <h3 style={{ marginTop: 8 }}>{job.title}</h3>
                <p className="muted">{job.company}</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>
                  {job.match?.reasons?.[0] || "Good match for your profile"}
                </p>
              </div>
            ))}
          </div>

          <hr />

          {/* Top Match Detail */}
          <div className="grid three">
            <div className="card">
              <h3>Best Match</h3>
              <h2>{topJob.title}</h2>
              <p>{topJob.company}</p>
            </div>
            <div className="card">
              <h3>AI Match</h3>
              <h1>{topScore}%</h1>
            </div>
            <div className="card">
              <h3>Recommendation</h3>
              <h1 style={{ fontSize: 28 }}>{recLevel}</h1>
              {recAdvice && <p className="muted" style={{ marginTop: 8 }}>{recAdvice}</p>}
            </div>
          </div>

          <hr />

          {reasons.length > 0 && (
            <div className="card">
              <h3>Why this job?</h3>
              <ul>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {(suggestions.length > 0 || warnings.length > 0) && (
            <div className="grid two">
              {suggestions.length > 0 && (
                <div className="card">
                  <h3>💡 Suggestions</h3>
                  <ul>{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="card">
                  <h3>⚠️ Warnings</h3>
                  <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          <hr />

          <div className="grid two">
            <div className="card">
              <h3>Skills to Improve</h3>
              {missingSkills.length > 0 ? <ul>{missingSkills.map((s, i) => <li key={i}>{s}</li>)}</ul> : (topJob?.match?.skillMatch === 50 && (!topJob?.skills?.length) ? <p className="muted">No skills detected in job description</p> : <p className="muted">Your skills match well! No gaps identified.</p>)}
            </div>
            <div className="card">
              <h3>Suggested Certifications</h3>
              {certifications.length > 0 ? <ul>{certifications.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="muted">Add career domains to your resume for personalized certification suggestions.</p>}
            </div>
          </div>

          <hr />

          {improvements.length > 0 && (
            <div className="card">
              <h3>📈 Areas for Improvement</h3>
              <ul>{improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
            </div>
          )}

          {/* Courses CTA */}
          <div className="rec-courses-cta">
            <div className="rec-courses-cta-text">
              <span className="rec-courses-cta-icon">📚</span>
              <div>
                <h4>Improve Your Skills with Recommended Courses</h4>
                <p>Based on your resume gaps, we found courses that can help you land better jobs.</p>
              </div>
            </div>
            <div className="rec-courses-cta-actions">
              {missingSkills.length > 0 && (
                <Link to={"/courses?skill=" + encodeURIComponent(missingSkills.join(","))} className="primary-btn">
                  Browse Courses ({missingSkills.length} skills)
                </Link>
              )}
              {certifications.length > 0 && (
                <Link to={"/courses?cert=" + encodeURIComponent(certifications.join(","))} className="ghost-btn">
                  View Certifications ({certifications.length})
                </Link>
              )}
              {missingSkills.length === 0 && certifications.length === 0 && (
                <Link to="/courses" className="primary-btn">Explore Learning Hub</Link>
              )}
            </div>
          </div>

          <hr />
        </>
      )}
    </section>
  );
}
