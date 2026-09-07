import React from "react";

function companyColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["#6d28d9","#2563eb","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#0284c7","#0d9488","#16a34a"];
  return colors[Math.abs(hash) % colors.length];
}

function relativeDate(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  if (days < 30) return Math.floor(days / 7) + "w ago";
  return new Date(dateStr).toLocaleDateString();
}

function formatSalary(salary) {
  if (!salary) return null;
  if (typeof salary === "string") return salary;
  const sym = salary.currency === "USD" ? "$" : "₹";
  if (salary.min && salary.max) return sym + (salary.min / 1000).toFixed(0) + "K – " + sym + (salary.max / 1000).toFixed(0) + "K";
  if (salary.average) return "~" + sym + (salary.average / 1000).toFixed(0) + "K";
  return null;
}

function matchColor(score) {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#3b82f6";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function atsGradeColor(g) {
  if (g === "A+" || g === "A") return "#22c55e";
  if (g === "B") return "#3b82f6";
  if (g === "C") return "#f59e0b";
  return "#ef4444";
}

export default function JobCard({ job, openJob, applyJob, isSaved, onToggleSave, onFilterSkill, onFilterRemote }) {
  const score = job.match?.overall || 0;
  const topSkills = (job.match?.matchedSkills || []).slice(0, 3);
  const missingCount = job.match?.missingSkills?.length || 0;
  const salary = formatSalary(job.salary);
  const desc = (job.description || "").replace(/<[^>]*>/g, "").slice(0, 150);

  return (
    <div className="card js-card">
      <div>
        <div className="js-card-header">
          <div style={{ flex: 1 }}>
            <h3 className="js-card-title">{job.title}</h3>
            <p className="js-card-company">{job.company}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {onToggleSave && (
              <button onClick={(e) => { e.stopPropagation(); onToggleSave(job); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: isSaved ? "#ef4444" : "var(--text-muted)", padding: 0 }} title={isSaved ? "Unsave" : "Save"}>{isSaved ? "♥" : "♡"}</button>
            )}
            <div className="js-company-avatar" style={{ background: companyColor(job.company) }}>{job.company?.charAt(0)}</div>
          </div>
        </div>
{desc && <p className="js-card-desc">{desc}...</p>}
<div className="js-card-meta">
  <div className="js-card-meta-row"><strong>Location</strong> {job.location}</div>
  <div className="js-card-meta-row"><strong>Type</strong> {job.type}</div>
  <div className="js-card-meta-row"><strong>Source</strong> {job.source}</div>
  <div className="js-card-meta-row"><strong>Posted</strong> <span className="js-card-date">{relativeDate(job.publishedAt)}</span></div>
  <div className="js-card-meta-row"><strong>Salary</strong> <span className={"js-card-salary" + (salary ? "" : " null")}>{salary || "Not disclosed"}</span></div>
</div>
<div className="js-card-badges">
  {job.remote && <span className="js-badge js-badge-remote" onClick={(e) => { e.stopPropagation(); onFilterRemote && onFilterRemote(); }}>Remote</span>}
  {job.ats?.grade && <span className="js-badge js-badge-ats">ATS {job.ats.grade}</span>}
  {missingCount > 0 && <span className="js-badge js-badge-missing">{missingCount} missing</span>}
</div>
{topSkills.length > 0 && (
  <div className="js-card-skills">
    {topSkills.map((s, i) => (
      <span key={i} className="js-skill-chip" onClick={(e) => { e.stopPropagation(); onFilterSkill && onFilterSkill(s); }}>{s}</span>
    ))}
  </div>
)}
<div className="js-card-score">
  <div className="js-card-score-label"><span>Match</span><strong style={{ color: matchColor(score) }}>{score}%</strong></div>
  <div className="js-score-bar"><div className="js-score-fill" style={{ width: score + "%", background: matchColor(score) }} /></div>
</div>
</div>
<div className="js-card-actions">
  <button className="ghost-btn small" onClick={() => openJob(job)}>Details</button>
  <button className="primary-btn small" onClick={() => applyJob(job)}>Apply</button>
</div>
</div>
);
}