import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { AppContext } from "../App.jsx";
import {
  getProfile,
  updateProfile,
  importProfile,
  promoteProfile,
  applyProfileSuggestion,
  dismissAllSuggestions,
} from "../services/profileApi.js";
import { fetchDocuments } from "../services/documentService.js";

/* ── Provenance badge ──────────────────────────────────────────── */
function ProvenanceBadge({ source, verified }) {
  const colors = {
    user: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "You" },
    imported: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", label: "Imported" },
    ai_suggestion: { bg: "rgba(168,85,247,0.12)", color: "#a855f7", label: "AI" },
  };
  const c = colors[source] || colors.user;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>
      {c.label}
      {!verified && <span title="Not yet verified" style={{ fontSize: 10 }}>⚠</span>}
      {verified && <span title="Verified" style={{ fontSize: 10 }}>✓</span>}
    </span>
  );
}

/* ── Section renderer ──────────────────────────────────────────── */
function ProfileSection({ title, icon, items, isArray, onRemove }) {
  if (!items || (isArray && (!Array.isArray(items) || items.length === 0))) return null;
  if (!isArray && typeof items === "string" && !items.trim()) return null;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{icon} {title}</h3>
      </div>
      {isArray ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                  {typeof item === "string" ? item : item.name || item.title || item.degree || item.label || JSON.stringify(item).slice(0, 80)}
                </span>
                {item.company && <span style={{ color: "var(--text-muted)", fontSize: 12 }}> @ {item.company}</span>}
                {item.institution && <span style={{ color: "var(--text-muted)", fontSize: 12 }}> @ {item.institution}</span>}
                {item.url && <span style={{ color: "var(--text-muted)", fontSize: 12 }}> — {item.url}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
                {item.provenance && <ProvenanceBadge source={item.provenance.source} verified={item.provenance.verified} />}
                {onRemove && <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: 14 }} title="Remove">✕</button>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>{items}</p>
      )}
    </div>
  );
}

/* ── Main Profile page ─────────────────────────────────────────── */
export default function ProfilePage() {
  const toast = useToast();
  const { documents } = React.useContext(AppContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [error, setError] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({});

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");
    const res = await getProfile();
    if (res.ok) {
      setProfile(res.profile);
      setContactForm(res.profile.contact || {});
    } else {
      setError(res.message || "Failed to load profile");
    }
    setLoading(false);
  }

  async function handleImport() {
    if (!selectedDoc) return toast.showToast("Select a document first", "error");
    setImporting(true);
    const doc = documents.find((d) => d._id === selectedDoc);
    const extracted = doc?.data || {};
    const res = await importProfile({
      documentId: selectedDoc,
      contact: { name: doc?.title || "", email: extracted.email || "", phone: extracted.phone || "", location: extracted.location || "" },
      summary: extracted.summary || "",
      skills: (extracted.skillsList || extracted.skills || []).map((s) => (typeof s === "string" ? s : s.name)),
      experience: extracted.experience || [],
      education: extracted.education || [],
      projects: extracted.projects || [],
      certifications: extracted.certifications || [],
      links: extracted.links || [],
    });
    setImporting(false);
    if (res.ok) {
      setProfile(res.profile);
      toast.showToast("Draft created — review and promote", "success");
    } else {
      toast.showToast(res.message || "Import failed", "error");
    }
  }

  async function handlePromote() {
    setPromoting(true);
    const res = await promoteProfile();
    setPromoting(false);
    if (res.ok) {
      setProfile(res.profile);
      toast.showToast(res.message || "Profile promoted", "success");
    } else {
      toast.showToast(res.message || "Promote failed", "error");
    }
  }

  async function handleSaveContact() {
    const res = await updateProfile({ contact: contactForm });
    if (res.ok) {
      setProfile(res.profile);
      setEditingContact(false);
      toast.showToast("Contact updated", "success");
    } else {
      toast.showToast(res.message || "Update failed", "error");
    }
  }

  async function handleApplySuggestion(id) {
    const res = await applyProfileSuggestion(id, true);
    if (res.ok) {
      setProfile(res.profile);
      toast.showToast("Suggestion applied", "success");
    } else {
      toast.showToast(res.message || "Failed", "error");
    }
  }

  async function handleDismissSuggestion(id) {
    const res = await applyProfileSuggestion(id, false);
    if (res.ok) setProfile(res.profile);
  }

  async function handleDismissAll() {
    const res = await dismissAllSuggestions();
    if (res.ok) {
      setProfile(res.profile);
      toast.showToast("All suggestions dismissed", "info");
    }
  }

  if (loading) return <main className="container"><div className="card"><p className="muted">Loading profile…</p></div></main>;
  if (error) return <main className="container"><div className="card"><p className="error">{error}</p></div></main>;

  const p = profile || {};
  const isDraft = p.status === "draft";
  const suggestions = p.suggestions || [];

  return (
    <main className="container">
      {/* Header */}
      <section className="card">
        <p className="eyebrow">Canonical Profile</p>
        <h1 style={{ margin: "4px 0 8px" }}>My Profile</h1>
        <p className="muted">Your structured career profile with provenance tracking. Every fact knows where it came from.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: isDraft ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)", color: isDraft ? "#f59e0b" : "#22c55e", border: `1px solid ${isDraft ? "#f59e0b33" : "#22c55e33"}` }}>
            {isDraft ? "📋 Draft — review & promote" : "✅ Canonical"}
          </span>
        </div>
      </section>

      {/* Import from document */}
      <section className="card">
        <h3 style={{ margin: "0 0 10px" }}>📥 Import from Document</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
            <option value="">Select a document…</option>
            {(documents || []).map((d) => (
              <option key={d._id} value={d._id}>{d.title || d.type} ({d.type})</option>
            ))}
          </select>
          <button className="primary-btn small" onClick={handleImport} disabled={importing || !selectedDoc}>
            {importing ? "Importing…" : "Import as Draft"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>Creates a draft for you to review before promoting to your canonical profile.</p>
      </section>

      {/* Promote button for drafts */}
      {isDraft && (
        <section className="card" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>⚡ Promote Draft</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>Make this draft your canonical profile. Verified facts won't be overwritten.</p>
            </div>
            <button className="primary-btn" onClick={handlePromote} disabled={promoting}>
              {promoting ? "Promoting…" : "Promote to Canonical"}
            </button>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>👤 Contact</h3>
          {!editingContact && (
            <button className="ghost-btn small" onClick={() => setEditingContact(true)}>Edit</button>
          )}
        </div>
        {editingContact ? (
          <div style={{ marginTop: 12 }}>
            {["name", "email", "phone", "location"].map((f) => (
              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={contactForm[f] || ""} onChange={(e) => setContactForm({ ...contactForm, [f]: e.target.value })} />
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="ghost-btn small" onClick={() => { setEditingContact(false); setContactForm(p.contact || {}); }}>Cancel</button>
              <button className="primary-btn small" onClick={handleSaveContact}>Save</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {["name", "email", "phone", "location"].map((f) => (
              <div key={f}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>{f}</span>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)" }}>{p.contact?.[f] || "—"}</p>
              </div>
            ))}
            {p.contact?.provenance && <ProvenanceBadge source={p.contact.provenance.source} verified={p.contact.provenance.verified} />}
          </div>
        )}
      </section>

      {/* Summary */}
      <ProfileSection title="Summary" icon="📝" items={p.summary} isArray={false} />
      {p.summaryProvenance && (
        <div style={{ marginBottom: 14 }}><ProvenanceBadge source={p.summaryProvenance.source} verified={p.summaryProvenance.verified} /></div>
      )}

      {/* Skills */}
      <ProfileSection title="Skills" icon="🛠" items={p.skills} isArray={true} />

      {/* Experience */}
      <ProfileSection title="Experience" icon="💼" items={p.experience} isArray={true} />

      {/* Education */}
      <ProfileSection title="Education" icon="🎓" items={p.education} isArray={true} />

      {/* Projects */}
      <ProfileSection title="Projects" icon="🚀" items={p.projects} isArray={true} />

      {/* Certifications */}
      <ProfileSection title="Certifications" icon="📜" items={p.certifications} isArray={true} />

      {/* Links */}
      <ProfileSection title="Links" icon="🔗" items={p.links} isArray={true} />

      {/* Job Preferences */}
      {p.jobPreferences && Object.keys(p.jobPreferences).filter((k) => k !== "provenance").length > 0 && (
        <section className="card">
          <h3 style={{ margin: "0 0 10px" }}>🎯 Job Preferences</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(p.jobPreferences).filter(([k]) => k !== "provenance").map(([k, v]) => (
              <div key={k}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>{k}</span>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)" }}>{typeof v === "object" ? JSON.stringify(v) : v || "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <section className="card" style={{ borderColor: "rgba(168,85,247,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>🤖 AI Suggestions ({suggestions.length})</h3>
            <button className="ghost-btn small" onClick={handleDismissAll}>Dismiss All</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Review each suggestion before accepting. AI cannot overwrite verified facts.</p>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s) => (
              <div key={s._id} style={{ padding: 12, borderRadius: 10, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{s.section} — {s.action}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="primary-btn small" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => handleApplySuggestion(s._id)}>Accept</button>
                    <button className="ghost-btn small" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => handleDismissSuggestion(s._id)}>Reject</button>
                  </div>
                </div>
                {s.reasoning && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{s.reasoning}</p>}
                {s.before && <pre style={{ margin: "6px 0 0", padding: 8, borderRadius: 6, background: "rgba(239,68,68,0.08)", fontSize: 11, whiteSpace: "pre-wrap" }}>{s.before}</pre>}
                {s.after && <pre style={{ margin: "4px 0 0", padding: 8, borderRadius: 6, background: "rgba(34,197,94,0.08)", fontSize: 11, whiteSpace: "pre-wrap" }}>{typeof s.after === "string" ? s.after : JSON.stringify(s.after, null, 2)}</pre>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
