import React, { useState, useEffect } from "react";
import { analyzeResume } from "../../services/aiService.js";

function atsGradeColor(grade) {
  if (grade === "A+" || grade === "A") return "#22c55e";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#f59e0b";
  return "#ef4444";
}

export default function ResumeSelector({
  documents = [],
  selectedResume,
  setSelectedResume,
  onAnalysis,
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [ats, setAts] = useState(null);
  const [error, setError] = useState("");

  const resumes = documents.filter(
    (doc) => doc.type === "resume" || doc.type === "cv"
  );

  useEffect(() => {
    if (!selectedResume) { setAnalysis(null); setAts(null); return; }
    let cancelled = false;
    async function run() {
      setLoading(true); setError(""); setAnalysis(null); setAts(null);
      const result = await analyzeResume(selectedResume);
      if (cancelled) return;
      setLoading(false);
      if (result.ok) { setAnalysis(result.analysis); setAts(result.ats); if (onAnalysis) onAnalysis(result); }
      else { setError(result.message || "Analysis failed."); }
    }
    run();
    return () => { cancelled = true; };
  }, [selectedResume]);

  return (
    <section className="card">
      <div className="split-card">
        <div>
          <p className="eyebrow">Resume Selection</p>
          <h2>Select Resume / CV</h2>
          <p>AI will analyze this resume to calculate your ATS score, skill match, education match, eligibility and overall job compatibility.</p>
        </div>
        <div>
          <select value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}>
            <option value="">Select Resume</option>
            {resumes.map((r) => (<option key={r._id} value={r._id}>{r.title}</option>))}
          </select>
        </div>
      </div>

      {selectedResume && (
        <div className="card" style={{ marginTop: 25, background: "#181825" }}>
          {resumes.filter((r) => r._id === selectedResume).map((resume) => (
            <div key={resume._id}>
              <h3>{resume.title}</h3>
              <p className="muted">Last Updated: {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}</p>
              <hr />
              <div className="grid three">
                <div className="card">
                  <h3>ATS Score</h3>
                  {loading ? <h1 style={{ color: "#f59e0b" }}>Analyzing...</h1>
                   : ats ? <><h1 style={{ color: atsGradeColor(ats.grade), fontSize: 48 }}>{ats.score}</h1>
                   <span style={{ padding: "4px 12px", borderRadius: 20, background: atsGradeColor(ats.grade) + "22", color: atsGradeColor(ats.grade), fontWeight: 700, fontSize: 14 }}>Grade: {ats.grade}</span></>
                   : <h1 style={{ color: "#666" }}>--</h1>}
                  <p>{ats ? "Calculated from your resume." : "Select a resume to analyze."}</p>
                </div>
                <div className="card">
                  <h3>Resume Status</h3>
                  <h1 style={{ color: "#22c55e" }}>{loading ? "Analyzing..." : "Ready"}</h1>
                  <p>Resume selected successfully.</p>
                </div>
                <div className="card">
                  <h3>AI Analysis</h3>
                  {loading ? <h1 style={{ color: "#f59e0b" }}>Running...</h1>
                   : analysis ? <h1 style={{ color: "#22c55e" }}>Complete ✅</h1>
                   : <h1 style={{ color: "#666" }}>Pending</h1>}
                  <p>{analysis ? analysis.totalWords + " words analyzed." : "Will run automatically after selection."}</p>
                </div>
              </div>

              {analysis && (
                <div style={{ marginTop: 20 }}>
                  <div className="grid three">
                    <div className="card">
                      <h3>Skills Found</h3>
                      <h2>{analysis.skills?.totalSkills || 0}</h2>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                        {(analysis.skills?.skills || []).slice(0, 6).map((s, i) => (
                          <span key={i} style={{ padding: "2px 8px", borderRadius: 12, background: "#3b82f622", color: "#3b82f6", fontSize: 11 }}>{s}</span>
                        ))}
                        {(analysis.skills?.skills || []).length > 6 && <span style={{ fontSize: 11, color: "#666" }}>+{(analysis.skills.skills.length - 6)} more</span>}
                      </div>
                    </div>
                    <div className="card">
                      <h3>Education</h3>
                      <h2 style={{ fontSize: 22 }}>{analysis.highestQualification || "Not detected"}</h2>
                      {analysis.education?.cgpa && <p className="muted">CGPA: {analysis.education.cgpa}</p>}
                      {analysis.education?.percentage && <p className="muted">Percentage: {analysis.education.percentage}</p>}
                    </div>
                    <div className="card">
                      <h3>Experience</h3>
                      <h2>{analysis.estimatedExperience || 0} years</h2>
                      <p className="muted">{analysis.experience?.experienceTypes?.length > 0 ? analysis.experience.experienceTypes.join(", ") : "No experience type detected"}</p>
                    </div>
                  </div>
                  {analysis.careerDomains?.length > 0 && (
                    <div className="card" style={{ marginTop: 12 }}>
                      <h3>Career Domains</h3>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {analysis.careerDomains.map((d, i) => (
                          <span key={i} style={{ padding: "4px 12px", borderRadius: 20, background: "#22c55e22", color: "#22c55e", fontSize: 13 }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ats?.suggestions?.length > 0 && (
                    <div className="card" style={{ marginTop: 12 }}>
                      <h3>ATS Improvement Tips</h3>
                      <ul>{ats.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
              {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
            </div>
          ))}
        </div>
      )}

      {!selectedResume && (
        <div className="card" style={{ marginTop: 25, textAlign: "center" }}>
          <h3>No Resume Selected</h3>
          <p>Select one of your saved resumes or CVs. AI cannot calculate job match without it.</p>
        </div>
      )}
    </section>
  );
}
