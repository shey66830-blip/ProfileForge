import React, { useState } from "react";
import { generateCoverLetter } from "../../services/aiService.js";

export default function ApplyModal({ job, onClose, documentId }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!job) return null;

  const matchScore = job.match?.overall || "--";

  const handleGenerate = async () => {
    if (!documentId) {
      setError("Select a resume first from the search page.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await generateCoverLetter(documentId, job.title, job.company, job.description);
    setLoading(false);
    if (result.ok) {
      setCoverLetter(result.coverLetter);
    } else {
      setError(result.message || "Failed to generate cover letter.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card" style={{ maxWidth: 900, width: "95%", margin: "40px auto", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Apply for Job</h1>
            <p className="muted">{job.title}</p>
          </div>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
        <hr />

        <div className="grid two">
          <div className="card">
            <h3>Company</h3><p>{job.company}</p>
            <h3>Position</h3><p>{job.title}</p>
            <h3>Location</h3><p>{job.location}</p>
            <h3>Match Score</h3><h2>{matchScore}%</h2>
          </div>
          <div className="card">
            <h3>Before Applying</h3>
            <ul>
              <li>Resume Attached ✅</li>
              <li>ATS Checked ✅</li>
              <li>Skills Compared ✅</li>
              <li>Eligibility Verified ✅</li>
            </ul>
          </div>
        </div>

        <hr />

        <h2>AI Cover Letter</h2>
        <textarea
          rows={12}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder="Click 'Generate with AI' to create a personalized cover letter..."
        />

        {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

        <div style={{ display: "flex", gap: 15, marginTop: 20 }}>
          <button className="secondary-btn" disabled={loading} onClick={handleGenerate}>
            {loading ? "Generating..." : "Generate with AI"}
          </button>
          <button className="primary-btn" onClick={() => job.applyUrl && window.open(job.applyUrl, "_blank")}>
            Apply on Company Website
          </button>
        </div>
      </div>
    </div>
  );
}
