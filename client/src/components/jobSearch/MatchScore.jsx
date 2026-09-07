import React from "react";

export default function MatchScore({
  overall = 0,
  skills = 0,
  education = 0,
  eligibility = 0,
  experience = 0,
  location = 0,
  ats = 0,
}) {
  const getColor = (score) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const ScoreBar = ({ title, value }) => (
    <div
      className="card"
      style={{
        marginBottom: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <strong>{title}</strong>

        <strong
          style={{
            color: getColor(value),
          }}
        >
          {value}%
        </strong>
      </div>

      <div
        style={{
          width: "100%",
          height: 12,
          borderRadius: 50,
          background: "#27273c",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: 50,
            background: getColor(value),
            transition: "0.4s",
          }}
        />
      </div>
    </div>
  );

  return (
    <section className="card">

      <p className="eyebrow">
        AI Resume Analysis
      </p>

      <h2>
        Resume Match Breakdown
      </h2>

      <div
        className="card"
        style={{
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        <h3>
          Overall Match Score
        </h3>

        <h1
          style={{
            fontSize: 60,
            color: getColor(overall),
          }}
        >
          {overall}%
        </h1>

        <p>
          AI calculated this score after comparing
          your resume with the selected opportunity.
        </p>
      </div>

      <ScoreBar
        title="ATS Compatibility"
        value={ats}
      />

      <ScoreBar
        title="Skills Match"
        value={skills}
      />

      <ScoreBar
        title="Education Match"
        value={education}
      />

      <ScoreBar
        title="Eligibility Match"
        value={eligibility}
      />

      <ScoreBar
        title="Experience Match"
        value={experience}
      />

      <ScoreBar
        title="Location Match"
        value={location}
      />

      <div
        className="card"
        style={{
          marginTop: 30,
        }}
      >
        <h3>
          AI Explanation
        </h3>

        <ul>

          <li>
            ATS score checks formatting and resume quality.
          </li>

          <li>
            Skills match compares resume skills with employer requirements.
          </li>

          <li>
            Education match checks qualification compatibility.
          </li>

          <li>
            Eligibility verifies mandatory requirements.
          </li>

          <li>
            Experience compares required and available experience.
          </li>

          <li>
            Location checks whether the opportunity matches your preferred region.
          </li>

        </ul>
      </div>

    </section>
  );
}