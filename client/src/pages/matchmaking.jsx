import React, { useState } from "react";
import PremiumGate from "../components/PremiumGate.jsx";
import { AppContext } from "../App.jsx";
import { getMarriageMatches } from "../utils/matchers.js";

export default function Matchmaking({ documents, setPage }) {
  const { plan } = React.useContext(AppContext);
  const biodatas = documents.filter((doc) => doc.type === "biodata");
  const [selectedId, setSelectedId] = useState(biodatas[0]?._id || "");
  const [scope, setScope] = useState("country");
  const [specificLocation, setSpecificLocation] = useState("");
  const [chatTarget, setChatTarget] = useState(null);
  const selectedDoc = biodatas.find((doc) => doc._id === selectedId);
  const matches = selectedDoc ? getMarriageMatches(selectedDoc, { scope, specificLocation }) : [];

  return (
    <PremiumGate required="premium" currentPlan={plan} feature="Matchmaking allows you to find compatible biodata matches based on location and preferences.">
    <main className="container">
      <section className="card">
        <p className="eyebrow">Marriage biodata matching</p>
        <h1>Matchmaking</h1>
        <p>Select a saved biodata and choose location preference.</p>

        {biodatas.length === 0 ? (
          <div className="empty-state">
            <h2>No biodatas found</h2>
            <p>Pehle ek biodata bana lo, phir matching shuru kar sakte ho!</p>
            <button className="primary-btn" onClick={() => setPage("dashboard")}>Go to Dashboard</button>
          </div>
        ) : (
          <>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {biodatas.map((doc) => (
                <option value={doc.id} key={doc.id}>{doc.title}</option>
              ))}
            </select>
            <div className="grid two">
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="city">Your city</option>
                <option value="country">Your country</option>
                <option value="abroad">Abroad</option>
                <option value="both">Country + Abroad</option>
                <option value="specific">Specific location</option>
              </select>
              <input placeholder="Specific city/country" value={specificLocation} onChange={(e) => setSpecificLocation(e.target.value)} />
            </div>
          </>
        )}
      </section>

      <section className="grid two">
        {matches.length === 0 ? (
          <div className="empty-state">
            <h2>Koi match nahi mila</h2>
            <p>Try changing location or scope — maybe koi match aage milega!</p>
            <button className="ghost-btn" onClick={() => { setScope("country"); setSpecificLocation(""); }}>Reset Filters</button>
          </div>
        ) : (
          matches.map((match) => (
            <div className="card result-card" key={match.name}>
              <p className="eyebrow">{match.score}% compatibility</p>
              <h2>{match.name}</h2>
              <p>{match.location}</p>
              <p>{match.summary}</p>
              <div>{match.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
              {match.details && (
                <div style={{ marginTop: 12 }}>
                  <p className="eyebrow">Compatibility Breakdown</p>
                  {match.details.breakdown && Object.entries(match.details.breakdown).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                      <span style={{ textTransform: 'capitalize' }}>{key}</span>
                      <span>{val.score}/{val.max} — {val.note}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <p className="eyebrow">Profile Details</p>
                    <p>Age: {match.details.age} | Height: {match.details.height}</p>
                    <p>{match.details.family}</p>
                    <p style={{ fontSize: '0.85em', opacity: 0.7 }}>{match.details.lifestyle}</p>
                  </div>
                </div>
              )}
              <button className="primary-btn small" onClick={() => setChatTarget(match)}>Start Chat</button>
            </div>
        ))
        )}
      </section>

      {chatTarget && (
        <div className="modal-overlay" onClick={() => setChatTarget(null)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">Chat with {chatTarget.name}</p>
            <h2>Coming Soon</h2>
            <p>Real-time chat between matched profiles is under development. Stay tuned!</p>
            <div style={{ marginTop: 16, padding: 16, background: "#1a1a2e", borderRadius: 8, minHeight: 120 }}>
              <p className="muted">Chat preview will appear here...</p>
            </div>
            <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => setChatTarget(null)}>Close</button>
          </div>
        </div>
      )}
    </main>
    </PremiumGate>
  );
}
