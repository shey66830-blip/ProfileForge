import React, { useState } from "react";

const DIFF_COLORS = { Beginner: "#22c55e", Intermediate: "#f59e0b", Advanced: "#ef4444" };

export default function CertificationCard({ cert, missingSkills = [] }) {
  const [showResources, setShowResources] = useState(false);
  const color = DIFF_COLORS[cert.difficulty] || "#6c5ce7";
  const coveredCount = (cert.coveredSkills || []).length;

  return (
    <div className="cert-card" style={{ borderTopColor: color }}>
      <div className="cert-card-header">
        <div>
          <h3 className="cert-card-name">{cert.name}</h3>
          <span className="cert-card-provider">{cert.provider}</span>
        </div>
        <span className="difficulty-badge" style={{ background: color + "22", color, borderColor: color + "44" }}>
          {cert.difficulty}
        </span>
      </div>

      {cert.description && <p className="cert-card-desc">{cert.description}</p>}

      <div className="cert-card-info">
        {cert.examFee?.amount > 0 ? (
          <span>Exam: {cert.examFee.currency === "USD" ? "$" : "\u20B9"}{cert.examFee.amount}</span>
        ) : (
          <span className="price-free">FREE</span>
        )}
        {cert.validityMonths > 0 && <span>Valid: {cert.validityMonths} months</span>}
        {cert.abbrev && <span className="cert-abbrev">{cert.abbrev}</span>}
      </div>

      {cert.skills?.length > 0 && (
        <div className="cert-card-skills">
          {cert.skills.map((s, i) => {
            const isCovered = missingSkills.some(ms => ms.toLowerCase() === s.toLowerCase());
            return <span key={i} className={`skill-chip ${isCovered ? "skill-matched" : ""}`}>{s}</span>;
          })}
        </div>
      )}

      {coveredCount > 0 && missingSkills.length > 0 && (
        <div className="skill-match-bar">
          <div className="skill-match-label">Covers {coveredCount} of {missingSkills.length} missing skills</div>
          <div className="skill-match-track">
            <div className="skill-match-fill" style={{ width: (coveredCount / missingSkills.length) * 100 + "%" }} />
          </div>
        </div>
      )}

      {cert.recommendedFor?.length > 0 && (
        <div className="cert-roles">
          <span className="cert-roles-label">Recommended for:</span>
          {cert.recommendedFor.map((r, i) => <span key={i} className="cert-role-tag">{r}</span>)}
        </div>
      )}

      {cert.studyResources?.length > 0 && (
        <>
          <button className="ghost-btn small" onClick={() => setShowResources(!showResources)} style={{ marginTop: 8 }}>
            {showResources ? "Hide" : "Study Resources"} ({cert.studyResources.length})
          </button>
          {showResources && (
            <div className="cert-resources">
              {cert.studyResources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="cert-resource-link">
                  {r.type === "course" ? "📚" : r.type === "practice" ? "✏️" : "📄"} {r.title}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
