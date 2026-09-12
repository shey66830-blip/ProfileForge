import React, { useState, useEffect, useCallback } from "react";
import {
  getMyReversePost, saveMyReversePost, setReversePostStatus,
  getReverseBoard, sendReverseInquiry, getReceivedInquiries, getSentInquiries, respondToInquiry,
} from "../services/reverseBoardApi.js";
import { useToast } from "../context/ToastContext.jsx";
import { announce } from "../utils/announce.js";

const EMPTY_FORM = {
  headline: "",
  why: "",
  skillsText: "",
  workMode: "any",
  locationsText: "",
  openToRelocate: false,
  employmentType: "any",
  expectedSalary: "",
  availability: "",
  portfolioUrl: "",
};

const STATUS_META = {
  draft: { label: "Draft", color: "#94a3b8", hint: "Only you can see this. Publish to appear on the board." },
  published: { label: "Live on board", color: "#22c55e", hint: "Companies can find you and apply to hire you." },
  paused: { label: "Paused", color: "#f59e0b", hint: "Hidden from the board. Inquiries are paused." },
  closed: { label: "Closed", color: "#ef4444", hint: "Not accepting inquiries." },
};

const WORK_MODES = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const EMP_TYPES = [
  { value: "any", label: "Any" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const cardShell = {
  padding: 16,
  borderRadius: 12,
  background: "var(--bg-card)",
  border: "1px solid var(--glass-border)",
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--glass-border)",
  background: "var(--bg-input, rgba(255,255,255,0.04))",
  color: "var(--text-primary)",
  fontSize: 13,
  boxSizing: "border-box",
};

function labelStyle() {
  return { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 };
}

/* ── My Post editor ───────────────────────────────────────────────── */
function MyPostEditor({ toast }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [postId, setPostId] = useState(null);
  const [status, setStatus] = useState("draft");
  const [inquiryCount, setInquiryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getMyReversePost();
      setLoading(false);
      if (!res.ok) { setError(res.message || "Could not load your post."); return; }
      if (res.post) {
        const p = res.post;
        setPostId(p._id);
        setStatus(p.status);
        setInquiryCount(p.inquiryCount || 0);
        setForm({
          headline: p.headline || "",
          why: p.why || "",
          skillsText: (p.skills || []).join(", "),
          workMode: p.workMode || "any",
          locationsText: (p.locations || []).join(", "),
          openToRelocate: !!p.openToRelocate,
          employmentType: p.employmentType || "any",
          expectedSalary: p.expectedSalary || "",
          availability: p.availability || "",
          portfolioUrl: p.portfolioUrl || "",
        });
      }
    })();
  }, []);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function handleSave(publish) {
    setSaving(true);
    const payload = {
      headline: form.headline,
      why: form.why,
      skills: form.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      workMode: form.workMode,
      locations: form.locationsText.split(",").map((s) => s.trim()).filter(Boolean),
      openToRelocate: form.openToRelocate,
      employmentType: form.employmentType,
      expectedSalary: form.expectedSalary,
      availability: form.availability,
      portfolioUrl: form.portfolioUrl,
      ...(publish ? { status: "published" } : {}),
    };
    const res = await saveMyReversePost(payload);
    setSaving(false);
    if (!res.ok) {
      toast.showToast(res.message || "Could not save.", "error");
      return;
    }
    setPostId(res.post._id);
    setStatus(res.post.status);
    toast.showToast(publish ? "Published to the board!" : "Saved.", "success");
    announce(publish ? "Reverse post published" : "Reverse post saved");
  }

  async function handleStatus(next) {
    const res = await setReversePostStatus(next);
    if (res.ok) {
      setStatus(res.post.status);
      toast.showToast(`Post is now ${STATUS_META[next]?.label || next}.`, "success");
    } else {
      toast.showToast(res.message || "Could not update status.", "error");
    }
  }

  if (loading) {
    return <div style={cardShell}><p className="muted">Loading your post…</p></div>;
  }
  if (error) {
    return <div style={cardShell}><p style={{ color: "#ef4444" }}>{error}</p></div>;
  }

  const meta = STATUS_META[status] || STATUS_META.draft;

  return (
    <div style={cardShell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>My "Hire Me" Post</h2>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: meta.color + "22", color: meta.color, fontWeight: 700 }}>
            {meta.label}{status === "published" ? ` · ${inquiryCount} inquiries` : ""}
          </span>
        </div>
        {postId && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {status !== "published" && (
              <button className="primary-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleStatus("published")}>Publish</button>
            )}
            {status === "published" && (
              <button className="ghost-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleStatus("paused")}>Pause</button>
            )}
            {status !== "closed" && (
              <button className="ghost-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleStatus("closed")}>Close</button>
            )}
            {status !== "draft" && (
              <button className="ghost-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleStatus("draft")}>Unpublish</button>
            )}
          </div>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>{meta.hint}</p>

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={labelStyle()} htmlFor="rp-headline">What do you want to work on? *</label>
          <input id="rp-headline" style={inputStyle} maxLength={200} placeholder="e.g. Senior Oracle DBA — performance tuning, RAC, migrations"
            value={form.headline} onChange={set("headline")} />
        </div>
        <div>
          <label style={labelStyle()} htmlFor="rp-why">Why? (your pitch to companies)</label>
          <textarea id="rp-why" style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} maxLength={5000}
            placeholder="Tell companies exactly what you're looking for and why — the problems you want to solve, the standards you hold, what makes you worth hiring."
            value={form.why} onChange={set("why")} />
        </div>
        <div>
          <label style={labelStyle()} htmlFor="rp-skills">Skills (comma-separated)</label>
          <input id="rp-skills" style={inputStyle} placeholder="Oracle, RAC, Data Guard, AWS RDS, Python"
            value={form.skillsText} onChange={set("skillsText")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle()} htmlFor="rp-workmode">Work mode</label>
            <select id="rp-workmode" style={inputStyle} value={form.workMode} onChange={set("workMode")}>
              {WORK_MODES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle()} htmlFor="rp-emptype">Employment type</label>
            <select id="rp-emptype" style={inputStyle} value={form.employmentType} onChange={set("employmentType")}>
              {EMP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle()} htmlFor="rp-locations">Preferred locations (comma-separated, blank = anywhere)</label>
          <input id="rp-locations" style={inputStyle} placeholder="Bengaluru, Dubai, Remote — EU"
            value={form.locationsText} onChange={set("locationsText")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle()} htmlFor="rp-salary">Expected compensation</label>
            <input id="rp-salary" style={inputStyle} maxLength={100} placeholder="₹45 LPA / $140k / negotiable"
              value={form.expectedSalary} onChange={set("expectedSalary")} />
          </div>
          <div>
            <label style={labelStyle()} htmlFor="rp-avail">Availability</label>
            <input id="rp-avail" style={inputStyle} maxLength={100} placeholder="Immediately / 30 days notice"
              value={form.availability} onChange={set("availability")} />
          </div>
        </div>
        <div>
          <label style={labelStyle()} htmlFor="rp-portfolio">Portfolio / LinkedIn URL</label>
          <input id="rp-portfolio" style={inputStyle} type="url" placeholder="https://github.com/you"
            value={form.portfolioUrl} onChange={set("portfolioUrl")} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.openToRelocate} onChange={set("openToRelocate")} />
          Open to relocating
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="ghost-btn" disabled={saving} onClick={() => handleSave(false)}>
          {saving ? "Saving…" : postId ? "Save changes" : "Save as draft"}
        </button>
        <button className="primary-btn" disabled={saving || !form.headline.trim()} onClick={() => handleSave(true)}>
          {saving ? "…" : postId && status === "published" ? "Save & keep live" : "Save & publish"}
        </button>
      </div>
      {!postId && (
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          One post per person — it's your ad on the board, not a listing.
        </p>
      )}
    </div>
  );
}

/* ── Inquiry modal (apply to hire) ────────────────────────────────── */
function InquiryModal({ post, onClose, onSent, toast }) {
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (message.trim().length < 10) {
      toast.showToast("Message must be at least 10 characters.", "warning");
      return;
    }
    setSending(true);
    const res = await sendReverseInquiry({ postId: post._id, message, company, role });
    setSending(false);
    if (res.ok) {
      toast.showToast("Inquiry sent — the worker will respond.", "success");
      onSent(post._id);
      onClose();
    } else {
      toast.showToast(res.message || "Could not send inquiry.", "error");
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Apply to hire ${post.ownerName}`}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.6)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...cardShell, maxWidth: 520, width: "100%", background: "var(--bg-elevated, var(--bg-card))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Apply to hire {post.ownerName}</h3>
          <button className="ghost-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>{post.headline}</p>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div>
            <label style={labelStyle()} htmlFor="inq-company">Company / team name</label>
            <input id="inq-company" style={inputStyle} maxLength={200} placeholder="Acme Corp (optional)"
              value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle()} htmlFor="inq-role">Role</label>
            <input id="inq-role" style={inputStyle} maxLength={200} placeholder="Staff DBA (optional)"
              value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle()} htmlFor="inq-message">Message *</label>
            <textarea id="inq-message" style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} maxLength={2000}
              placeholder="Introduce your company, the problem you want them to solve, and why you think they're a fit. (min 10 chars)"
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button className="ghost-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" disabled={sending} onClick={send}>{sending ? "Sending…" : "Send inquiry"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Board card ───────────────────────────────────────────────────── */
function BoardCard({ post, onInquire, inquiredIds }) {
  return (
    <div style={{ ...cardShell, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <strong style={{ fontSize: 14, lineHeight: 1.3 }}>{post.headline}</strong>
        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>{post.ownerName}</span>
      </div>
      {post.why && <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.why}</p>}
      {post.skills?.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {post.skills.slice(0, 8).map((s) => (
            <span key={s} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: "rgba(108,92,231,0.14)", color: "var(--text-primary)" }}>{s}</span>
          ))}
          {post.skills.length > 8 && <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>+{post.skills.length - 8}</span>}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {post.workMode !== "any" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>🏠 {post.workMode}</span>}
        {post.employmentType !== "any" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>🕐 {post.employmentType.replace("_", "-")}</span>}
        {post.expectedSalary && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>💰 {post.expectedSalary}</span>}
        {post.availability && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>📅 {post.availability}</span>}
        {post.locations?.length > 0 && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>📍 {post.locations.slice(0, 2).join(", ")}</span>}
        {post.openToRelocate && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>✈️ relocates</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", gap: 8 }}>
        {post.portfolioUrl ? (
          <a href={post.portfolioUrl} target="_blank" rel="noreferrer noopener" style={{ fontSize: 12, color: "#8b7cf6" }}>Portfolio ↗</a>
        ) : <span />}
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {post.inquiryCount > 0 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{post.inquiryCount} interested</span>}
          <button className="primary-btn" style={{ fontSize: 12, padding: "6px 12px" }}
            disabled={inquiredIds.has(post._id)}
            onClick={() => onInquire(post)}>
            {inquiredIds.has(post._id) ? "✓ Applied" : "Hire me"}
          </button>
        </span>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function ReverseBoard() {
  const toast = useToast();
  const [tab, setTab] = useState("board"); // board | post | inbox | sent
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("any");
  const [inquiryPost, setInquiryPost] = useState(null);
  const [inquiredIds, setInquiredIds] = useState(new Set());
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const res = await getReverseBoard({ skill: skillFilter, workMode: workModeFilter });
    setLoading(false);
    if (!res.ok) { setLoadError(res.message || "Could not load the board."); return; }
    setPosts(res.posts || []);
  }, [skillFilter, workModeFilter]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    const [r, s] = await Promise.all([getReceivedInquiries(), getSentInquiries()]);
    setInboxLoading(false);
    if (r.ok) setReceived(r.inquiries || []);
    if (s.ok) {
      setSent(s.inquiries || []);
      setInquiredIds(new Set((s.inquiries || []).map((i) => i.post?._id || i.post).filter(Boolean)));
    }
  }, []);

  useEffect(() => { if (tab === "inbox" || tab === "sent") loadInbox(); }, [tab, loadInbox]);

  async function handleRespond(id, action) {
    const res = await respondToInquiry(id, action);
    if (res.ok) {
      toast.showToast(action === "accept" ? "Accepted — contact details are now visible below." : "Declined.", "success");
      setReceived((prev) => prev.map((i) => i._id === id ? { ...i, status: action === "accept" ? "accepted" : "declined", contact: res.contact } : i));
      announce(action === "accept" ? "Inquiry accepted" : "Inquiry declined");
    } else {
      toast.showToast(res.message || "Could not respond.", "error");
    }
  }

  function handleInquired(postId) {
    setInquiredIds((prev) => new Set(prev).add(postId));
    setPosts((prev) => prev.map((p) => p._id === postId ? { ...p, inquiryCount: (p.inquiryCount || 0) + 1 } : p));
  }

  return (
    <main className="container">
      <section className="card">
        <p className="eyebrow">Reverse Job Board</p>
        <h1>Flip the hiring power dynamic</h1>
        <p className="muted">
          Post exactly what you want to work on and why — then let companies apply to hire <em>you</em>.
        </p>
      </section>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { key: "board", label: "🔎 Browse talent" },
          { key: "post", label: "📣 My post" },
          { key: "inbox", label: `📥 Inquiries${received.length ? ` (${received.length})` : ""}` },
          { key: "sent", label: "↗ Sent" },
        ].map((t) => (
          <button key={t.key} className={`mode-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "post" && <MyPostEditor toast={toast} />}

      {tab === "board" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...inputStyle, maxWidth: 240 }} placeholder="Filter by skill (e.g. Oracle)"
              value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadBoard()} aria-label="Filter by skill" />
            <select style={{ ...inputStyle, maxWidth: 160 }} value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)} aria-label="Filter by work mode">
              <option value="any">Any work mode</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </div>
          {loading ? (
            <div style={cardShell}><p className="muted">Loading talent…</p></div>
          ) : loadError ? (
            <div style={cardShell}>
              <p style={{ color: "#ef4444" }}>{loadError}</p>
              <button className="ghost-btn" onClick={loadBoard}>Retry</button>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ ...cardShell, textAlign: "center", padding: 40 }}>
              <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🎯</span>
              <h3>No one is looking yet</h3>
              <p className="muted">Be the first: post what you want to work on, and let companies come to you.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {posts.map((p) => (
                <BoardCard key={p._id} post={p} inquiredIds={inquiredIds}
                  onInquire={(post) => setInquiryPost(post)} />
              ))}
            </div>
          )}
        </>
      )}

      {(tab === "inbox" || tab === "sent") && (
        inboxLoading ? (
          <div style={cardShell}><p className="muted">Loading…</p></div>
        ) : tab === "inbox" ? (
          received.length === 0 ? (
            <div style={{ ...cardShell, textAlign: "center", padding: 40 }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 10 }}>📭</span>
              <h3>No inquiries yet</h3>
              <p className="muted">Publish your post and companies can apply to hire you.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {received.map((i) => (
                <div key={i._id} style={cardShell}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13.5 }}>{i.company}{i.role ? ` · ${i.role}` : ""}</strong>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 700, background: i.status === "accepted" ? "rgba(34,197,94,0.12)" : i.status === "declined" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: i.status === "accepted" ? "#22c55e" : i.status === "declined" ? "#ef4444" : "#f59e0b" }}>
                      {i.status}
                    </span>
                  </div>
                  <p style={{ margin: "8px 0", fontSize: 13, lineHeight: 1.55 }}>{i.message}</p>
                  {i.status === "accepted" && i.contact?.email && (
                    <p style={{ fontSize: 12.5, margin: "6px 0", padding: "6px 10px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                      ✉ Contact: <strong>{i.contact.name}</strong> — {i.contact.email}
                    </p>
                  )}
                  {i.status === "new" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="primary-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleRespond(i._id, "accept")}>Accept & share contact</button>
                      <button className="ghost-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => handleRespond(i._id, "decline")}>Decline</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : sent.length === 0 ? (
          <div style={{ ...cardShell, textAlign: "center", padding: 40 }}>
            <span style={{ fontSize: 36, display: "block", marginBottom: 10 }}>↗</span>
            <h3>No inquiries sent</h3>
            <p className="muted">Browse talent and apply to hire someone whose pitch fits your problem.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sent.map((i) => {
              const p = i.post && typeof i.post === "object" ? i.post : null;
              return (
                <div key={i._id} style={cardShell}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13.5 }}>{p ? p.headline : "Post removed"}</strong>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 700, background: i.status === "accepted" ? "rgba(34,197,94,0.12)" : i.status === "declined" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: i.status === "accepted" ? "#22c55e" : i.status === "declined" ? "#ef4444" : "#f59e0b" }}>
                      {i.status}
                    </span>
                  </div>
                  {p && <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{(p.skills || []).slice(0, 5).join(" · ")}{p.workMode && p.workMode !== "any" ? ` · ${p.workMode}` : ""}</p>}
                  <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>Your message: “{i.message}”</p>
                </div>
              );
            })}
          </div>
        )
      )}

      {inquiryPost && (
        <InquiryModal post={inquiryPost} toast={toast} onClose={() => setInquiryPost(null)} onSent={handleInquired} />
      )}
    </main>
  );
}
