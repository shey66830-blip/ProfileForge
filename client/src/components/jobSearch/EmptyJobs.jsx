import React from "react";

export default function EmptyJobs() {
  return (
    <section className="card">

      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
        }}
      >

        <div
          style={{
            fontSize: "70px",
            marginBottom: "15px",
          }}
        >
          🔍
        </div>

        <h2>No Matching Jobs Found</h2>

        <p className="muted">
          We couldn't find any jobs that strongly match your resume,
          selected field and location.
        </p>

        <hr />

        <div className="grid two">

          <div className="card">

            <h3>Possible Reasons</h3>

            <ul>

              <li>Very specific specialization selected.</li>

              <li>Country or city has limited openings.</li>

              <li>Resume doesn't match current requirements.</li>

              <li>Experience level is too restrictive.</li>

              <li>Very few companies are hiring right now.</li>

            </ul>

          </div>

          <div className="card">

            <h3>Try These</h3>

            <ul>

              <li>Choose <strong>Worldwide</strong>.</li>

              <li>Try nearby cities.</li>

              <li>Select <strong>All Fields</strong>.</li>

              <li>Choose a broader specialization.</li>

              <li>Update your resume.</li>

            </ul>

          </div>

        </div>

        <hr />

        <div className="card">

          <h3>🤖 AI Recommendation</h3>

          <p>
            Based on your resume, ProfileForge can suggest
            alternative career paths that have a higher hiring
            probability and better resume compatibility.
          </p>

          <button
            className="primary-btn"
            style={{
              marginTop: "15px",
            }}
          >
            Show AI Career Suggestions
          </button>

        </div>

        <div
          style={{
            marginTop: "25px",
          }}
        >

          <button className="secondary-btn">
            Search Again
          </button>

        </div>

      </div>

    </section>
  );
}