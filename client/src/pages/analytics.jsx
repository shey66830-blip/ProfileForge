import React, { useState, useEffect } from "react";
import { getAnalytics } from "../services/proApi.js";
import PremiumGate from "../components/PremiumGate.jsx";
import { AppContext } from "../App.jsx";
import { announce } from "../utils/announce.js";

const STATUS_LABELS = {
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function StatCard({ label, value, accent }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <p className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </p>
      <strong style={{ fontSize: 28, color: accent || "var(--text-primary)" }}>{value}</strong>
    </div>
  );
}

function FunnelRow({ status, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr 40px",
        gap: 10,
        alignItems: "center",
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        {STATUS_LABELS[status] || status}
      </span>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg,#0d9488,#10b981)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12.5, textAlign: "right" }}>{count}</span>
    </div>
  );
}

function AnalyticsInner() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await getAnalytics();
      setLoading(false);
      if (!res.ok) {
        setError(res.message || "Could not load analytics.");
        return;
      }
      setData(res);
      announce("Analytics loaded");
    })();
  }, []);

  if (loading)
    return (
      <div className="card">
        <p className="muted">Crunching your numbers…</p>
      </div>
    );
  if (error)
    return (
      <div className="card">
        <p style={{ color: "#ef4444" }}>{error}</p>
      </div>
    );
  if (!data) return null;

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);
  const conv = data.conversion || {};

  return (
    <>
      <section className="card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          <StatCard label="Documents" value={data.totals.documents} />
          <StatCard label="Applications" value={data.totals.applications} />
          <StatCard label="Interviews" value={data.totals.interviews} accent="#22c55e" />
          <StatCard label="Offers" value={data.totals.offers} accent="#f59e0b" />
          <StatCard label="Saved jobs" value={data.totals.savedJobs} />
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        <section className="card">
          <p className="eyebrow">Application funnel</p>
          <h2 style={{ marginTop: 4 }}>Where you stand</h2>
          {data.totals.applications === 0 ? (
            <p className="muted" style={{ padding: "18px 0" }}>
              No applications yet — start tracking from the Jobs page to see your funnel.
            </p>
          ) : (
            data.funnel.map((f) => (
              <FunnelRow key={f.status} status={f.status} count={f.count} max={maxFunnel} />
            ))
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Conversion rates</p>
          <h2 style={{ marginTop: 4 }}>Your momentum</h2>
          <div style={{ display: "grid", gap: 12, padding: "10px 0" }}>
            {[
              ["Applied → response", conv.appliedToScreening],
              ["Screening → interview", conv.screeningToInterview],
              ["Interview → offer", conv.interviewToOffer],
            ].map(([label, v]) => (
              <div key={label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  <span className="muted">{label}</span>
                  <strong>{v ?? 0}%</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{
                      width: `${v ?? 0}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "linear-gradient(90deg,#22c55e,#84cc16)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <p className="eyebrow">AI usage today</p>
          <h2 style={{ marginTop: 4 }}>Plan limits</h2>
          <div style={{ display: "grid", gap: 8, padding: "10px 0" }}>
            {Object.entries(data.usageVsLimits || {}).map(([k, v]) => (
              <div
                key={k}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
              >
                <span className="muted" style={{ textTransform: "capitalize" }}>
                  {k.replace(/([A-Z])/g, " $1")}
                </span>
                <span>
                  {v.used} / {v.limit >= 9999 ? "∞" : v.limit}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <p className="eyebrow">Upcoming follow-ups</p>
          <h2 style={{ marginTop: 4 }}>Next actions</h2>
          {(data.upcomingFollowUps || []).length === 0 ? (
            <p className="muted" style={{ padding: "12px 0" }}>
              No follow-ups scheduled. Set them on the Applications board.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8, padding: "10px 0" }}>
              {data.upcomingFollowUps.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 13,
                    borderBottom: "1px solid var(--glass-border)",
                    paddingBottom: 6,
                  }}
                >
                  <span>
                    <strong>{f.company}</strong>
                    {f.role ? ` · ${f.role}` : ""}
                  </span>
                  <span className="muted" style={{ whiteSpace: "nowrap" }}>
                    {new Date(f.followUpAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default function Analytics() {
  const { plan } = React.useContext(AppContext);
  return (
    <main className="container">
      <section className="card">
        <p className="eyebrow">Pro exclusive</p>
        <h1>Advanced Analytics</h1>
        <p className="muted">
          Your real numbers — funnel, conversion momentum, AI usage, and what needs action next.
        </p>
      </section>
      <PremiumGate
        required="pro"
        currentPlan={plan}
        feature="Advanced Analytics shows your application funnel, conversion rates, and AI usage — updated live from your account."
      >
        <AnalyticsInner />
      </PremiumGate>
    </main>
  );
}
