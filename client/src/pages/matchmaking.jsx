import React, { useState, useEffect } from "react";
import PremiumGate from "../components/PremiumGate.jsx";
import { AppContext } from "../App.jsx";
import { findMatches } from "../services/proApi.js";
import { announce } from "../utils/announce.js";

export default function Matchmaking({ documents }) {
  const { plan } = React.useContext(AppContext);
  const biodatas = documents.filter((doc) => doc.type === "biodata");
  const [selectedId, setSelectedId] = useState("");
  const [scope, setScope] = useState("country");
  const [specificLocation, setSpecificLocation] = useState("");
  const [matches, setMatches] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedId && biodatas.length > 0) setSelectedId(biodatas[0]._id);
  }, [biodatas, selectedId]);

  async function search() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    const res = await findMatches({ documentId: selectedId, scope, specificLocation });
    setLoading(false);
    if (!res.ok) {
      setError(res.message || "Matching failed.");
      setMatches([]);
      return;
    }
    setMatches(res.matches || []);
    announce(`${res.matches?.length || 0} matches found`);
  }

  return (
    <PremiumGate
      required="premium"
      currentPlan={plan}
      feature="Matchmaking finds compatible biodata matches from real profiles on the platform, scored on age, location, education, lifestyle, and family values."
    >
      <main className="container">
        <section className="card">
          <p className="eyebrow">Marriage biodata matching</p>
          <h1>Matchmaking</h1>
          <p>
            Select your biodata and location preference — we score real biodatas on the platform
            against yours.
          </p>

          {biodatas.length === 0 ? (
            <div className="empty-state">
              <h2>No biodatas found</h2>
              <p>Create a biodata first (Premium), then matching will find compatible profiles.</p>
              <button
                className="primary-btn"
                onClick={() => (window.location.href = "/builder/biodata")}
              >
                Create a Biodata
              </button>
            </div>
          ) : (
            <>
              <div className="grid two">
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {biodatas.map((doc) => (
                    <option value={doc._id} key={doc._id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
                <select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="city">Your city</option>
                  <option value="country">Your country</option>
                  <option value="abroad">Abroad</option>
                  <option value="both">Country + Abroad</option>
                  <option value="specific">Specific location</option>
                </select>
              </div>
              {scope === "specific" && (
                <input
                  placeholder="Specific city/country"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  style={{ marginTop: 10, width: "100%" }}
                />
              )}
              <button
                className="primary-btn"
                style={{ marginTop: 12 }}
                onClick={search}
                disabled={loading || !selectedId}
              >
                {loading ? "Searching…" : "🔮 Find Matches"}
              </button>
            </>
          )}
        </section>

        {error && (
          <section className="card">
            <p style={{ color: "#ef4444" }}>{error}</p>
          </section>
        )}

        <section className="grid two">
          {matches === null ? (
            <div className="empty-state">
              <h2>Ready when you are</h2>
              <p>Pick your biodata and hit Find Matches.</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty-state">
              <h2>Koi match nahi mila</h2>
              <p>No compatible biodatas yet — as more people join, matches appear here.</p>
              <button
                className="ghost-btn"
                onClick={() => {
                  setScope("country");
                  setSpecificLocation("");
                  setMatches(null);
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            matches.map((m) => (
              <div className="card result-card" key={m.documentId}>
                <p className="eyebrow">{m.score}% compatibility</p>
                <h2>{m.name}</h2>
                <p className="muted">
                  by {m.ownerHandle} · {m.location}
                </p>
                {m.summary && <p>{m.summary}</p>}
                <div style={{ marginTop: 10 }}>
                  <p className="eyebrow">Compatibility Breakdown</p>
                  {Object.entries(m.breakdown || {}).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        borderBottom: "1px solid var(--glass-border)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ textTransform: "capitalize" }}>{key}</span>
                      <span className="muted">
                        {val.score}/{val.max} — {val.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </PremiumGate>
  );
}
