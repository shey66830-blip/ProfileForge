import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUsage, cancelSubscription, getPaymentHistory } from "../services/paymentService.js";
import { createSupportTicket, getSupportTickets } from "../services/proApi.js";
import { AppContext } from "../App.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Subscription() {
  const nav = useNavigate();
  const { plan, premiumExpiry, refreshPlan } = React.useContext(AppContext);
  const toast = useToast();
  const [usage, setUsage] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function load() {
      const [usageRes, histRes] = await Promise.all([getUsage(), getPaymentHistory()]);
      if (usageRes.ok) setUsage(usageRes);
      if (histRes.ok) setHistory(histRes.payments || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    setCancelling(true);
    const r = await cancelSubscription();
    setCancelling(false);
    if (r.ok) {
      await refreshPlan();
      toast.showToast("Subscription cancelled. Free plan active.", "info");
    } else {
      toast.showToast(r.message || "Cancel failed", "error");
    }
  }

  if (loading)
    return (
      <main className="sub-page">
        <p className="muted">Loading...</p>
      </main>
    );

  return (
    <main className="sub-page">
      <section className="card split-card">
        <div>
          <p className="eyebrow">My Subscription</p>
          <h1>Subscription & Usage</h1>
          <p className="muted">Manage your plan, track usage, and view payment history.</p>
        </div>
        <button className="ghost-btn" onClick={() => nav("/premium")}>
          Browse Plans
        </button>
      </section>

      {/* Current Plan */}
      <section className="card">
        <h2>Current Plan</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <span className={`active-sub-badge`} style={{ fontSize: 18 }}>
            {plan === "pro" ? "⚡ Pro" : plan === "premium" ? "⭐ Premium" : "Free"}
          </span>
          {premiumExpiry && (
            <p className="muted" style={{ margin: 0 }}>
              Expires: <strong>{new Date(premiumExpiry).toLocaleDateString()}</strong>
            </p>
          )}
          {plan !== "free" && (
            <button
              className="ghost-btn small"
              onClick={handleCancel}
              disabled={cancelling}
              style={{ marginLeft: "auto" }}
            >
              {cancelling ? "Cancelling..." : "Cancel Subscription"}
            </button>
          )}
          {plan === "free" && (
            <button
              className="primary-btn small"
              onClick={() => nav("/premium")}
              style={{ marginLeft: "auto" }}
            >
              Upgrade Now
            </button>
          )}
        </div>
      </section>

      {/* Usage Stats */}
      {usage && usage.usage && (
        <section className="card">
          <h2>Today's Usage</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Limits reset daily at midnight.
          </p>
          <div className="usage-grid">
            {Object.entries(usage.usage).map(([key, val]) => (
              <div key={key} className="card usage-card">
                <h3>{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                <div className="usage-num">{val.used}</div>
                <div className="usage-limit">
                  / {val.limit === 9999 ? "∞" : val.limit}{" "}
                  {val.limit === 9999 ? "(Unlimited)" : "per day"}
                </div>
                {val.limit < 9999 && (
                  <div
                    style={{
                      marginTop: 8,
                      width: "100%",
                      height: 4,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: Math.min(100, (val.used / val.limit) * 100) + "%",
                        height: 4,
                        borderRadius: 999,
                        background:
                          val.used >= val.limit ? "var(--error)" : "var(--gradient-primary)",
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment History */}
      <section className="card">
        <h2>Payment History</h2>
        {history.length === 0 ? (
          <p className="muted">No payments yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {p.amount >= 49900 ? "Pro" : "Premium"} Plan
                </span>
                <span style={{ color: "var(--text-muted)" }}>₹{(p.amount / 100).toFixed(0)}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <span className="active-sub-badge" style={{ fontSize: 11 }}>
                  Paid
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <PrioritySupportSection plan={plan} nav={nav} />
    </main>
  );
}

/* ── Priority Support (Pro) ───────────────────────────────────── */
function PrioritySupportSection({ plan, nav }) {
  const toast = useToast();
  const isPro = plan === "pro";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isPro) return;
    getSupportTickets().then((r) => {
      if (r.ok) setTickets(r.tickets || []);
      setLoaded(true);
    });
  }, [isPro]);

  async function submit() {
    if (subject.trim().length < 3 || message.trim().length < 10) {
      return toast.showToast("Subject (3+) and message (10+ chars) required", "warning");
    }
    setSending(true);
    const r = await createSupportTicket({ subject, message });
    setSending(false);
    if (r.ok) {
      setTickets((prev) => [r.ticket, ...prev]);
      setSubject("");
      setMessage("");
      toast.showToast("Ticket submitted — Pro tickets are answered first.", "success");
    } else {
      toast.showToast(r.message || "Could not submit ticket", "error");
    }
  }

  if (!isPro) {
    return (
      <section className="card premium-banner">
        <span>🎧</span>
        <div>
          <h3>Priority Support — Pro</h3>
          <p>
            Pro members get a direct support line with fastest-first response. Your tickets jump the
            queue.
          </p>
        </div>
        <button
          className="primary-btn"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}
          onClick={() => nav("/premium")}
        >
          Upgrade to Pro — ₹499/mo
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <p className="eyebrow">Pro exclusive</p>
      <h2 style={{ margin: "4px 0 10px" }}>🎧 Priority Support</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Open a ticket — Pro tickets are prioritized in the support queue.
      </p>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        <input
          placeholder="Subject — e.g. AI edits failing on my CV"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
        />
        <textarea
          placeholder="Describe the issue (min 10 characters)…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={5000}
        />
        <button className="primary-btn" onClick={submit} disabled={sending}>
          {sending ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
      {loaded && tickets.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>
            Your tickets
          </p>
          {tickets.map((t) => (
            <div
              key={t._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--glass-border)",
                fontSize: 13,
              }}
            >
              <span>
                <strong>{t.subject}</strong>
              </span>
              <span
                style={{
                  color:
                    t.status === "open"
                      ? "#f59e0b"
                      : t.status === "answered"
                        ? "#22c55e"
                        : "var(--text-muted)",
                }}
              >
                {t.status}
              </span>
              <span className="muted" style={{ whiteSpace: "nowrap" }}>
                {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
