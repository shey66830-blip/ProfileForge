import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config.js";
import { useToast } from "../context/ToastContext.jsx";

/* ── API helpers (inline to avoid breaking existing service) ───── */
async function api(path, opts = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
    return await res.json();
  } catch { return { ok: false, message: "Backend not reachable." }; }
}

const getApps = (groupBy) => api(`/applications${groupBy ? `?groupBy=${groupBy}` : ""}`);
const updateApp = (id, data) => api(`/applications/${id}`, { method: "PUT", body: JSON.stringify(data) });
const deleteApp = (id) => api(`/applications/${id}`, { method: "DELETE" });
const getTransitions = (status) => api(`/applications/transitions/${status}`);

/* ── Status config ─────────────────────────────────────────────── */
const STATUSES = [
  { key: "saved", label: "Saved", color: "#666", icon: "♡" },
  { key: "preparing", label: "Preparing", color: "#8b5cf6", icon: "📝" },
  { key: "applied", label: "Applied", color: "#3b82f6", icon: "✉" },
  { key: "screening", label: "Screening", color: "#06b6d4", icon: "🔎" },
  { key: "interview", label: "Interview", color: "#f59e0b", icon: "🕐" },
  { key: "offer", label: "Offer", color: "#22c55e", icon: "🌟" },
  { key: "rejected", label: "Rejected", color: "#ef4444", icon: "✗" },
  { key: "withdrawn", label: "Withdrawn", color: "#94a3b8", icon: "↩" },
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours <= 0) return "Just now";
  if (days <= 0) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ── Transition button ─────────────────────────────────────────── */
function TransitionButtons({ appId, currentStatus, onTransition }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadOptions() {
    if (open) { setOpen(false); return; }
    setLoading(true);
    const res = await getTransitions(currentStatus);
    setLoading(false);
    if (res.ok) setOptions(res.nextStatuses || []);
    setOpen(true);
  }

  async function doTransition(newStatus) {
    setOpen(false);
    const res = await updateApp(appId, { status: newStatus });
    if (res.ok) onTransition(appId, newStatus);
    else return res;
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="ghost-btn small" onClick={loadOptions} disabled={loading} style={{ fontSize: 11, padding: "3px 8px" }}>
        {loading ? "…" : "→ Move"}
      </button>
      {open && options.length > 0 && (
        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 50, marginTop: 4, minWidth: 140, padding: 4, borderRadius: 10, background: "rgba(20,20,45,0.95)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
          {options.map((s) => {
            const cfg = STATUSES.find((st) => st.key === s);
            return (
              <button key={s} onClick={() => doTransition(s)} style={{ display: "block", width: "100%", padding: "6px 10px", border: "none", background: "none", color: cfg?.color || "var(--text-primary)", fontSize: 12, fontWeight: 600, textAlign: "left", borderRadius: 6, cursor: "pointer" }}
                onMouseEnter={(e) => e.target.style.background = "rgba(108,92,231,0.12)"}
                onMouseLeave={(e) => e.target.style.background = "none"}>
                {cfg?.icon} {cfg?.label || s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Application card ──────────────────────────────────────────── */
function AppCard({ app, onTransition, onDelete }) {
  const [notes, setNotes] = useState(app.notes || "");
  const timer = useRef(null);
  const snap = app.jobSnapshot || {};

  function saveNotes(val) {
    setNotes(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateApp(app._id, { notes: val }), 600);
  }

  return (
    <div className="app-card" style={{ marginBottom: 8 }}>
      <div className="app-card-top">
        <strong>{app.jobTitle || snap.title || "Untitled"}</strong>
        <button className="app-delete" onClick={() => onDelete(app._id)} title="Remove">✕</button>
      </div>
      <p className="app-company">{app.company || snap.company || "Unknown"}</p>

      {/* Job snapshot details */}
      {(snap.location || snap.workMode || snap.salary) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0" }}>
          {snap.location && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>📍 {snap.location}</span>}
          {snap.workMode && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>🏠 {snap.workMode}</span>}
          {snap.salary && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>💰 {snap.salary}</span>}
        </div>
      )}

      {/* Next action */}
      {app.nextAction && (
        <div style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", margin: "4px 0" }}>
          📋 {app.nextAction}
        </div>
      )}

      {/* Follow-up date */}
      {app.followUpAt && (
        <p style={{ margin: "2px 0", fontSize: 10, color: "var(--text-muted)" }}>⏰ Follow up: {new Date(app.followUpAt).toLocaleDateString()}</p>
      )}

      {/* Timestamps */}
      <div style={{ display: "flex", gap: 8, margin: "4px 0", fontSize: 10, color: "var(--text-muted)" }}>
        {app.submittedAt && <span>Submitted {timeAgo(app.submittedAt)}</span>}
        {!app.submittedAt && <span>{timeAgo(app.updatedAt || app.createdAt)}</span>}
      </div>

      {/* Notes */}
      <input className="app-notes" placeholder="Add notes…" value={notes} onChange={(e) => saveNotes(e.target.value)} />

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        <TransitionButtons appId={app._id} currentStatus={app.status} onTransition={onTransition} />
      </div>
    </div>
  );
}

/* ── Main Applications page ────────────────────────────────────── */
export default function Applications() {
  const toast = useToast();
  const [apps, setApps] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");

  useEffect(() => { loadApps(); }, []);

  async function loadApps() {
    setLoading(true);
    const data = await getApps("status");
    setApps(data.applications || []);
    setGrouped(data.grouped || {});
    setLoading(false);
  }

  function handleTransition(id, newStatus) {
    setApps((prev) => prev.map((a) => a._id === id ? { ...a, status: newStatus } : a));
    // Rebuild grouped
    const updated = apps.map((a) => a._id === id ? { ...a, status: newStatus } : a);
    const g = {};
    updated.forEach((a) => { if (!g[a.status]) g[a.status] = []; g[a.status].push(a); });
    setGrouped(g);
    toast.showToast(`Moved to ${newStatus}`, "success");
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this application?")) return;
    setApps((prev) => prev.filter((a) => a._id !== id));
    const g = {};
    apps.filter((a) => a._id !== id).forEach((a) => { if (!g[a.status]) g[a.status] = []; g[a.status].push(a); });
    setGrouped(g);
    await deleteApp(id);
    toast.showToast("Removed", "info");
  }

  async function handleDrop(status) {
    if (!dragId) return;
    setDragId(null);
    const res = await updateApp(dragId, { status });
    if (res.ok) handleTransition(dragId, status);
  }

  const total = apps.length;
  const active = apps.filter((a) => !["rejected", "withdrawn"].includes(a.status)).length;
  const interviews = (grouped.interview || []).length;
  const offers = (grouped.offer || []).length;

  return (
    <main className="container">
      <section className="card">
        <p className="eyebrow">Application Tracker</p>
        <h1>My Applications</h1>
        <p className="muted">{total} total · {active} active · {interviews} interviews · {offers} offers</p>
      </section>

      {/* View mode + stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`mode-tab ${viewMode === "kanban" ? "active" : ""}`} onClick={() => setViewMode("kanban")}>Board</button>
          <button className={`mode-tab ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>List</button>
        </div>
        <Link to="/jobs" className="ghost-btn small" style={{ textDecoration: "none" }}>+ Add from Jobs</Link>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p className="muted">Loading applications…</p>
        </div>
      ) : total === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>📋</span>
          <h3>No applications yet</h3>
          <p className="muted">Start applying from Job Search and track everything here.</p>
          <Link to="/jobs" className="primary-btn" style={{ textDecoration: "none", display: "inline-block", marginTop: 12 }}>Go to Job Search</Link>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="app-kanban">
          {STATUSES.map((col) => {
            const colApps = grouped[col.key] || [];
            return (
              <div key={col.key} className="app-column" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.key)}>
                <div className="app-column-header" style={{ borderBottomColor: col.color + "44" }}>
                  <span className="app-column-icon">{col.icon}</span>
                  <strong style={{ color: col.color }}>{col.label}</strong>
                  <span className="app-column-count">{colApps.length}</span>
                </div>
                <div className="app-column-body">
                  {colApps.map((app) => (
                    <div key={app._id} draggable onDragStart={() => setDragId(app._id)}>
                      <AppCard app={app} onTransition={handleTransition} onDelete={handleDelete} />
                    </div>
                  ))}
                  {colApps.length === 0 && <p className="app-drop-hint">Drop jobs here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {apps.map((app) => {
            const cfg = STATUSES.find((s) => s.key === app.status);
            return (
              <div key={app._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg?.icon || "•"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{app.jobTitle || "Untitled"}</strong>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{app.company || ""}</span>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: (cfg?.color || "#666") + "22", color: cfg?.color || "#666", fontWeight: 700, flexShrink: 0 }}>{cfg?.label || app.status}</span>
                <TransitionButtons appId={app._id} currentStatus={app.status} onTransition={handleTransition} />
                <button className="app-delete" onClick={() => handleDelete(app._id)} title="Remove" style={{ flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
