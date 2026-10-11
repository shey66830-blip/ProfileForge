import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { AppContext } from "../App.jsx";
import { suggestTailoring, applyTailoring } from "../services/profileApi.js";
import { batchTailor } from "../services/proApi.js";
import { selectableModels, modelValue, findModelByValue } from "../utils/aiModels.js";

/* ── Diff highlight ────────────────────────────────────────────── */
function DiffBlock({ before, after }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
      {before && (
        <div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#ef4444",
              letterSpacing: 0.5,
            }}
          >
            Before
          </span>
          <pre
            style={{
              margin: 0,
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              color: "var(--text-primary)",
            }}
          >
            {before}
          </pre>
        </div>
      )}
      {after && (
        <div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#22c55e",
              letterSpacing: 0.5,
            }}
          >
            After
          </span>
          <pre
            style={{
              margin: 0,
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.15)",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              color: "var(--text-primary)",
            }}
          >
            {typeof after === "string" ? after : JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ── Main Tailoring page ───────────────────────────────────────── */
export default function TailoringPage() {
  const toast = useToast();
  const nav = useNavigate();
  const { documents, plan, isPremium } = useContext(AppContext);
  const [docId, setDocId] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [instruction, setInstruction] = useState("");
  const models = selectableModels(plan);
  const [modelVal, setModelVal] = useState(modelValue(models[0]));
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [accepted, setAccepted] = useState(new Set());
  const [applying, setApplying] = useState(false);
  const [appliedResult, setAppliedResult] = useState(null);
  const [warnings, setWarnings] = useState([]);

  async function handleSuggest() {
    if (!docId || !jobDesc.trim())
      return toast.showToast("Select a document and enter a job description", "error");
    setLoading(true);
    setSuggestions([]);
    setAccepted(new Set());
    setAppliedResult(null);
    setWarnings([]);

    const m = findModelByValue(modelVal);
    const res = await suggestTailoring({
      documentId: docId,
      jobDescription: jobDesc,
      jobTitle,
      jobCompany,
      instruction: instruction || undefined,
      provider: m.provider,
      model: m.model,
    });

    setLoading(false);
    if (res.ok) {
      setSuggestions(res.suggestions || []);
      setWarnings(res.warnings || []);
      if (!res.suggestions?.length) {
        toast.showToast("No suggestions generated — try a different job description", "info");
      }
    } else {
      toast.showToast(res.message || "Tailoring failed", "error");
      if (res.warnings?.length) setWarnings(res.warnings);
    }
  }

  function toggleAccept(idx) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function acceptAll() {
    setAccepted(new Set(suggestions.map((_, i) => i)));
  }

  async function handleApply() {
    if (accepted.size === 0) return toast.showToast("Select at least one suggestion", "error");
    setApplying(true);

    const selected = [...accepted].map((i) => suggestions[i]);
    const res = await applyTailoring({
      documentId: docId,
      suggestions: selected,
      jobDescription: jobDesc,
      jobTitle,
      jobCompany,
    });

    setApplying(false);
    if (res.ok) {
      setAppliedResult(res);
      toast.showToast(
        `Applied ${res.appliedCount} suggestion${res.appliedCount > 1 ? "s" : ""} — new document created`,
        "success",
      );
    } else {
      toast.showToast(res.message || "Apply failed", "error");
    }
  }

  return (
    <main className="container">
      {/* Header */}
      <section className="card">
        <p className="eyebrow">AI Tailoring</p>
        <h1 style={{ margin: "4px 0 8px" }}>Tailor Resume</h1>
        <p className="muted">
          Get structured suggestions to match a specific job. Accept or reject each change
          individually — AI never overwrites your verified facts.
        </p>
      </section>

      {/* Premium gate for free users — the feature is premium-only server-side */}
      {!isPremium && (
        <section className="card premium-banner">
          <span>✂️</span>
          <div>
            <h3>Premium Feature</h3>
            <p>
              Resume Tailoring is part of Premium — 10 tailorings a day (unlimited on Pro). Upgrade
              to unlock structured, reviewable AI suggestions.
            </p>
          </div>
          <button className="primary-btn" onClick={() => nav("/premium")}>
            Upgrade to Premium — ₹199/mo
          </button>
        </section>
      )}

      {/* Input form */}
      <section
        className="card"
        style={!isPremium ? { opacity: 0.55, pointerEvents: "none" } : undefined}
      >
        <h3 style={{ margin: "0 0 12px" }}>📋 Setup</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              Resume
            </label>
            <select
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              style={{ marginTop: 4 }}
            >
              <option value="">Select a document…</option>
              {(documents || [])
                .filter((d) => d.type === "resume" || d.type === "cv")
                .map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title || d.type} ({d.type})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              AI Model
            </label>
            <select
              value={modelVal}
              onChange={(e) => setModelVal(e.target.value)}
              style={{ marginTop: 4 }}
            >
              {models.map((m) => (
                <option key={modelValue(m)} value={modelValue(m)}>
                  {m.label}
                </option>
              ))}
            </select>
            {plan !== "pro" && (
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Early-access models unlock with Pro.
              </p>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              Job Title (optional)
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              Company (optional)
            </label>
            <input
              value={jobCompany}
              onChange={(e) => setJobCompany(e.target.value)}
              placeholder="e.g. Netflix"
              style={{ marginTop: 4 }}
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
            Job Description *
          </label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={6}
            style={{ marginTop: 4 }}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
            Special Instructions (optional)
          </label>
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Emphasize cloud experience, tone: formal"
            style={{ marginTop: 4 }}
          />
        </div>
        <button
          className="primary-btn"
          style={{ marginTop: 14, width: "100%" }}
          onClick={handleSuggest}
          disabled={loading || !docId || !jobDesc.trim()}
        >
          {loading ? "Generating Suggestions…" : "✨ Generate Suggestions"}
        </button>
      </section>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="card" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>⚠️ Warnings</h3>
          {warnings.map((w, i) => (
            <p key={i} style={{ margin: "4px 0", fontSize: 13, color: "var(--warning)" }}>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* AI notice */}
      {suggestions.length > 0 && (
        <div
          className="card"
          style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.2)" }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            ⚠️ <strong>AI-generated content must be reviewed.</strong> Suggestions may contain
            inaccuracies. Accept only changes you've verified.
          </p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>
              💡 {suggestions.length} Suggestion{suggestions.length > 1 ? "s" : ""} —{" "}
              {accepted.size} selected
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="ghost-btn small" onClick={acceptAll}>
                Select All
              </button>
              <button className="ghost-btn small" onClick={() => setAccepted(new Set())}>
                Deselect All
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s, i) => {
              const isSelected = accepted.has(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleAccept(i)}
                  style={{
                    cursor: "pointer",
                    padding: 14,
                    borderRadius: 12,
                    background: isSelected ? "rgba(13,148,136,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isSelected ? "rgba(13,148,136,0.4)" : "var(--glass-border)"}`,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "var(--accent-1)",
                          letterSpacing: 0.5,
                        }}
                      >
                        {s.section}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                        {s.action}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {s.confidence != null && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {Math.round(s.confidence * 100)}% conf.
                        </span>
                      )}
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: `2px solid ${isSelected ? "var(--accent-1)" : "var(--glass-border)"}`,
                          background: isSelected ? "var(--accent-1)" : "transparent",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          color: "#fff",
                          transition: "all 0.15s",
                        }}
                      >
                        {isSelected && "✓"}
                      </span>
                    </div>
                  </div>
                  {s.sourceFact && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      Source: {s.sourceFact}
                    </p>
                  )}
                  {s.reasoning && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                      {s.reasoning}
                    </p>
                  )}
                  <DiffBlock before={s.before} after={s.after} />
                </div>
              );
            })}
          </div>
          <button
            className="primary-btn"
            style={{ marginTop: 14, width: "100%" }}
            onClick={handleApply}
            disabled={applying || accepted.size === 0}
          >
            {applying
              ? "Applying…"
              : `✅ Apply ${accepted.size} Selected Suggestion${accepted.size !== 1 ? "s" : ""}`}
          </button>
        </section>
      )}

      {/* Applied result */}
      {appliedResult && (
        <section className="card" style={{ borderColor: "rgba(34,197,94,0.3)" }}>
          <h3 style={{ margin: "0 0 8px" }}>✅ Tailored Document Created</h3>
          <p className="muted">
            {appliedResult.appliedCount} suggestion{appliedResult.appliedCount > 1 ? "s" : ""}{" "}
            applied. New document: "{appliedResult.document?.title}"
          </p>
          {appliedResult.diff && (
            <pre
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 8,
                background: "rgba(34,197,94,0.05)",
                border: "1px solid rgba(34,197,94,0.15)",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              {typeof appliedResult.diff === "string"
                ? appliedResult.diff
                : JSON.stringify(appliedResult.diff, null, 2)}
            </pre>
          )}
        </section>
      )}

      <BatchTailoringSection plan={plan} />
    </main>
  );
}

/* ── Batch Tailoring (Pro) ────────────────────────────────────── */
function BatchTailoringSection({ plan }) {
  const toast = useToast();
  const nav = useNavigate();
  const { documents } = useContext(AppContext);
  const isPro = plan === "pro";
  const resumeDocs = (documents || []).filter((d) => d.type === "resume" || d.type === "cv");
  const [selected, setSelected] = useState(new Set());
  const [jd, setJd] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  function toggleDoc(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 10) next.add(id);
      return next;
    });
  }

  async function runBatch() {
    if (selected.size === 0 || !jd.trim())
      return toast.showToast("Pick documents and paste a job description", "error");
    setRunning(true);
    setResults(null);
    const res = await batchTailor({ documentIds: [...selected], jobDescription: jd });
    setRunning(false);
    if (res.ok) {
      setResults(res.results || []);
      toast.showToast(
        `Batch complete — ${res.results?.filter((r) => r.ok).length}/${res.results?.length} succeeded`,
        "success",
      );
    } else {
      toast.showToast(res.message || "Batch tailoring failed", "error");
    }
  }

  if (!isPro) {
    return (
      <section className="card premium-banner">
        <span>📦</span>
        <div>
          <h3>Batch Resume Tailoring — Pro</h3>
          <p>Tailor up to 10 resumes against one job description in a single run. Part of Pro.</p>
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
      <h2 style={{ margin: "4px 0 10px" }}>📦 Batch Tailoring</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Select up to 10 documents — each gets tailored against the same job description.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
        {resumeDocs.length === 0 && (
          <p className="muted">No resumes yet — create one in the builder first.</p>
        )}
        {resumeDocs.map((d) => {
          const on = selected.has(d._id);
          return (
            <button
              key={d._id}
              onClick={() => toggleDoc(d._id)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                cursor: "pointer",
                border: `1px solid ${on ? "var(--accent-1)" : "var(--glass-border)"}`,
                background: on ? "rgba(13,148,136,0.15)" : "transparent",
                color: "var(--text-primary)",
              }}
            >
              {on ? "✓ " : ""}
              {d.title || d.type}
            </button>
          );
        })}
      </div>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={4}
        placeholder="Paste the job description for the batch…"
        style={{ width: "100%" }}
      />
      <button
        className="primary-btn"
        style={{ marginTop: 10, width: "100%" }}
        onClick={runBatch}
        disabled={running || selected.size === 0 || !jd.trim()}
      >
        {running
          ? "Running batch…"
          : `⚡ Tailor ${selected.size || ""} document${selected.size === 1 ? "" : "s"} in batch`}
      </button>
      {results && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${r.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                fontSize: 13,
              }}
            >
              <strong>
                {r.ok ? "✅" : "❌"} {r.title || r.documentId}
              </strong>
              {r.ok ? (
                <span className="muted"> — {r.suggestions?.length ?? 0} suggestions</span>
              ) : (
                <span style={{ color: "#ef4444" }}> — {r.message}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
