import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getApplications, updateApplication, deleteApplication } from "../services/applicationService.js";
import { useToast } from "../context/ToastContext.jsx"; 

const COLUMNS = [
  { key: "saved", label: "Saved", color: "#666", icon: "♡" },
  { key: "applied", label: "Applied", color: "#3b82f6", icon: "✉" },
  { key: "interview", label: "Interview", color: "#f59e0b", icon: "🕐" },
  { key: "offered", label: "Offered", color: "#22c55e", icon: "🌟" },
  { key: "rejected", label: "Rejected", color: "#ef4444", icon: "✗" },
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days <= 0 && hours <= 0) return "Just now";
  if (days <= 0) return hours + "h ago";
  if (days === 1) return "Yesterday";
  if (days < 7) return days + " days ago";
  if (days < 30) return Math.floor(days / 7) + "w ago";
  return d.toLocaleDateString();
}

export default function Applications() {
  const toast = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const noteTimers = useRef({});

  useEffect(() => { loadApps(); }, []);

  useEffect(() => () => {
    Object.values(noteTimers.current).forEach(clearTimeout);
  }, []);

  async function loadApps() {
    setLoading(true);
    const data = await getApplications();
    setApps(data);
    setLoading(false);
  }

  async function handleDrop(status) {
    if (!dragId) return;
    const app = apps.find(a => a._id === dragId);
    if (!app || app.status === status) { setDragId(null); return; }
    setApps(prev => prev.map(a => a._id === dragId ? { ...a, status } : a));
    setDragId(null);
    const res = await updateApplication(dragId, { status });
    if (res && res.ok !== false) toast.showToast("Moved to " + status, "success");
  }

  function handleNotes(id, notes) {
    setApps(prev => prev.map(a => a._id === id ? { ...a, notes } : a));
    clearTimeout(noteTimers.current[id]);
    noteTimers.current[id] = setTimeout(() => {
      delete noteTimers.current[id];
      updateApplication(id, { notes });
    }, 600);
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this application?")) return;
    setApps(prev => prev.filter(a => a._id !== id));
    await deleteApplication(id);
    toast.showToast("Application removed", "info");
  }

  const appsByCol = {};
  COLUMNS.forEach(c => { appsByCol[c.key] = apps.filter(a => a.status === c.key); });
  const total = apps.length;
  const interviews = appsByCol.interview?.length || 0;
  const offers = appsByCol.offered?.length || 0;
  const applied = appsByCol.applied?.length || 0;

  return (
    <main className="container">
      <section className="card">
        <p className="eyebrow">Application Tracker</p>
        <h1>My Applications</h1>
        <p className="muted">{total} total applications</p>
      </section>

      {/* Stats bar */}
      <div className="app-stats">
        <div className="app-stat-card app-stat--blue"><strong>{applied}</strong><span>Applied</span></div>
        <div className="app-stat-card app-stat--amber"><strong>{interviews}</strong><span>Interviews</span></div>
        <div className="app-stat-card app-stat--green"><strong>{offers}</strong><span>Offers</span></div>
        <div className="app-stat-card"><strong>{total}</strong><span>Total</span></div>
      </div>

      {loading ? (
        <div className="card app-loading-state"><p className="muted">Loading applications...</p></div>
      ) : total === 0 ? (
        <div className="card app-empty">
          <span className="app-empty-icon">📋</span>
          <h2>No applications yet</h2>
          <p className="muted">Start applying from Job Search and track everything here.</p>
          <Link to="/jobs" className="primary-btn app-empty-cta">Go to Job Search</Link>
        </div>
      ) : (
        <div className="app-kanban">
          {COLUMNS.map(col => (
            <div key={col.key} className="app-column" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.key)}>
              <div className="app-column-header">
                <span className="app-column-icon">{col.icon}</span>
                <strong>{col.label}</strong>
                <span className="app-column-count">{appsByCol[col.key]?.length || 0}</span>
              </div>
              <div className="app-column-body">
                {(appsByCol[col.key] || []).map(app => (
                  <div key={app._id} className="app-card" draggable onDragStart={() => setDragId(app._id)}>
                    <div className="app-card-top">
                      <strong>{app.jobTitle || "Untitled"}</strong>
                      <button className="app-delete" onClick={() => handleDelete(app._id)} title="Remove">✕</button>
                    </div>
                    <p className="app-company">{app.company || "Unknown company"}</p>
                    <p className="app-date">🕐 {timeAgo(app.updatedAt || app.createdAt)}</p>
                    <input
                      className="app-notes"
                      placeholder="Add notes..."
                      value={app.notes || ""}
                      onChange={e => handleNotes(app._id, e.target.value)}
                    />
                  </div>
                ))}
                {(!appsByCol[col.key] || appsByCol[col.key].length === 0) && (
                  <p className="app-drop-hint">Drop jobs here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
