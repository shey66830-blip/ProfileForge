import React, { useState, useEffect } from "react";
import { getSavedJobs, unsaveJob } from "../services/savedJobService.js";

function formatSalary(salary) {
  if (!salary) return "Not disclosed";
  if (salary.min && salary.max) return `₹${(salary.min / 1000).toFixed(0)}K – ₹${(salary.max / 1000).toFixed(0)}K`;
  return "Not disclosed";
}

export default function SavedJobs({ setPage }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaved();
  }, []);

  async function loadSaved() {
    setLoading(true);
    const saved = await getSavedJobs();
    setJobs(saved);
    setLoading(false);
  }

  async function handleUnsave(jobId) {
    await unsaveJob(jobId);
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }

  return (
    <main className="container">
      <section className="card split-card">
        <div>
          <p className="eyebrow">Your Bookmarks</p>
          <h1>Saved Jobs</h1>
          <p>Jobs you bookmarked for later review.</p>
        </div>
        <button className="secondary-btn" onClick={() => setPage("jobs")}>Back to Search</button>
      </section>

      {loading && (
        <section className="card" style={{ textAlign: "center", padding: 40 }}>
          <p>Loading saved jobs...</p>
        </section>
      )}

      {!loading && jobs.length === 0 && (
        <section className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>♡</div>
          <h2>No Saved Jobs Yet</h2>
          <p className="muted">Browse jobs and click the heart icon to save them here.</p>
          <button className="primary-btn" style={{ marginTop: 16 }} onClick={() => setPage("jobs")}>Search Jobs</button>
        </section>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid two">
          {jobs.map((saved) => {
            const job = saved.jobData || {};
            return (
              <div className="card" key={saved._id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <h3>{job.title || "Unknown Job"}</h3>
                      <p className="muted">{job.company || "Unknown"}</p>
                    </div>
                    <button onClick={() => handleUnsave(saved.jobId)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 20, cursor: "pointer" }} title="Unsave">♥</button>
                  </div>
                  <hr />
                  <p>📍 {job.location || "N/A"}</p>
                  <p>💰 {formatSalary(job.salary)}</p>
                  <p>🌐 {job.source}</p>
                  <p className="muted">Saved: {new Date(saved.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ marginTop: 12 }}>
                  {job.applyUrl && <button className="primary-btn small" onClick={() => window.open(job.applyUrl, "_blank")}>Apply</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
