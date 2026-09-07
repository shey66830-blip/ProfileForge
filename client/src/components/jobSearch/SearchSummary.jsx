import React from "react";

export default function SearchSummary({ filters, totalJobs = 0, jobs = [], selectedResume, resumeName }) {
  const currentTime = new Date().toLocaleString();
  const remoteJobs = jobs.filter((j) => j.remote).length;
  const avgMatch = totalJobs > 0
    ? Math.round(jobs.reduce((sum, j) => sum + (j.match?.overall || 0), 0) / totalJobs)
    : 0;

  const sources = [...new Set(jobs.map((j) => j.source))];

  return (
    <section className="card">
      <p className="eyebrow">Search Summary</p>
      <h2>AI Search Overview</h2>

      <div className="grid three">
        <div className="card">
          <h3>Total Results</h3>
          <h1>{totalJobs}</h1>
          <p>Jobs & internships found.</p>
        </div>
        <div className="card">
          <h3>Resume Status</h3>
          <h2>{selectedResume ? "Selected ✅" : "Not Selected ❌"}</h2>
          <p>{selectedResume && resumeName ? `Using: ${resumeName}` : "Select a resume for better matching."}</p>
        </div>
        <div className="card">
          <h3>AI Status</h3>
          <h2>Active 🤖</h2>
          <p>Resume analysis enabled.</p>
        </div>
      </div>

      <hr />

      {/* Live Stats */}
      {totalJobs > 0 && (
        <div className="grid three">
          <div className="card">
            <h3>Remote Jobs</h3>
            <h1>{remoteJobs}</h1>
            <p>of {totalJobs} total</p>
          </div>
          <div className="card">
            <h3>Avg Match</h3>
            <h1>{avgMatch}%</h1>
            <p>Across all results</p>
          </div>
          <div className="card">
            <h3>Sources</h3>
            <h1>{sources.length}</h1>
            <p>{sources.join(", ")}</p>
          </div>
        </div>
      )}

      <hr />

      <h3>Applied Filters</h3>
      <div className="grid three">
        <div className="card"><strong>Looking For</strong><br />{filters.lookingFor || "Any"}</div>
        <div className="card"><strong>Career Domain</strong><br />{filters.domain || "Not Selected"}</div>
        <div className="card"><strong>Specialization</strong><br />{filters.specialization || "Any"}</div>
        <div className="card"><strong>Experience</strong><br />{filters.experience || "Any"}</div>
        <div className="card"><strong>Work Mode</strong><br />{filters.workMode || "Any"}</div>
        <div className="card"><strong>Employment Type</strong><br />{filters.employmentType || "Any"}</div>
        <div className="card"><strong>Country</strong><br />{filters.country || "Auto"}</div>
        <div className="card"><strong>State</strong><br />{filters.state || "Any"}</div>
        <div className="card"><strong>City</strong><br />{filters.city || "Any"}</div>
      </div>

      <hr />

      <div className="grid three">
        <div className="card">
          <h3>AI Matching</h3>
          <p>✔ Resume Skills</p>
          <p>✔ Education</p>
          <p>✔ Eligibility</p>
          <p>✔ Location</p>
          <p>✔ Experience</p>
        </div>
        <div className="card">
          <h3>Search Time</h3>
          <p>{currentTime}</p>
        </div>
        <div className="card">
          <h3>Search Engine</h3>
          <p>AI Multi Source Search</p>
          <small>{sources.join(" • ") || "Pending search..."}</small>
        </div>
      </div>
    </section>
  );
}
