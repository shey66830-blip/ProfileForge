import React, { useState, useContext } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { AppContext } from "../App.jsx";
import { validateATS, exportATSHtml } from "../services/profileApi.js";

/* ── Severity badge ────────────────────────────────────────────── */
function SeverityBadge({ severity }) {
  const colors = {
    error: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    info: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  };
  const c = colors[severity] || colors.info;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>
      {severity}
    </span>
  );
}

/* ── Main ATS Export page ──────────────────────────────────────── */
export default function ExportATSPage() {
  const toast = useToast();
  const { documents } = useContext(AppContext);
  const [docId, setDocId] = useState("");
  const [validating, setValidating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [textPreview, setTextPreview] = useState("");
  const [htmlOutput, setHtmlOutput] = useState("");
  const [activeTab, setActiveTab] = useState("validate");

  async function handleValidate() {
    if (!docId) return toast.showToast("Select a document first", "error");
    setValidating(true);
    setValidation(null);
    setTextPreview("");
    setHtmlOutput("");

    const res = await validateATS({ documentId: docId });
    setValidating(false);

    if (res.ok) {
      setValidation(res.validation);
      setTextPreview(res.textPreview || "");
      setActiveTab("validate");
    } else {
      toast.showToast(res.message || "Validation failed", "error");
    }
  }

  async function handleGenerate() {
    if (!docId) return toast.showToast("Select a document first", "error");
    setGenerating(true);
    setHtmlOutput("");
    setTextPreview("");

    const res = await exportATSHtml({ documentId: docId });
    setGenerating(false);

    if (res.ok) {
      setHtmlOutput(res.html || "");
      setTextPreview(res.plainText || res.textPreview || "");
      setValidation(res.validation || null);
      setActiveTab("preview");
      toast.showToast("ATS-safe HTML generated", "success");
    } else {
      toast.showToast(res.message || "Generation failed", "error");
    }
  }

  function downloadHTML() {
    if (!htmlOutput) return;
    const blob = new Blob([htmlOutput], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-ats-safe.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadText() {
    if (!textPreview) return;
    const blob = new Blob([textPreview], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-ats-safe.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const warnings = validation?.warnings || [];
  const warningCount = warnings.filter((w) => w.severity === "warning").length;
  const infoCount = warnings.filter((w) => w.severity === "info").length;

  return (
    <main className="container">
      {/* Header */}
      <section className="card">
        <p className="eyebrow">ATS-Safe Export</p>
        <h1 style={{ margin: "4px 0 8px" }}>Export Validation</h1>
        <p className="muted">Validate your resume for ATS compatibility and generate a clean, single-column HTML or plain-text export.</p>
      </section>

      {/* Input */}
      <section className="card">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={docId} onChange={(e) => setDocId(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
            <option value="">Select a document…</option>
            {(documents || []).filter((d) => d.type === "resume" || d.type === "cv").map((d) => (
              <option key={d._id} value={d._id}>{d.title || d.type} ({d.type})</option>
            ))}
          </select>
          <button className="primary-btn small" onClick={handleValidate} disabled={validating || !docId}>
            {validating ? "Validating…" : "🔍 Validate"}
          </button>
          <button className="secondary-btn small" onClick={handleGenerate} disabled={generating || !docId}>
            {generating ? "Generating…" : "📄 Generate ATS HTML"}
          </button>
        </div>
      </section>

      {/* ATS Score summary */}
      {validation && (
        <section className="card">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, textAlign: "center" }}>
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <span style={{ display: "block", fontSize: 28, fontWeight: 800, color: warningCount > 0 ? "#f59e0b" : "#22c55e" }}>{warningCount}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Warnings</span>
            </div>
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <span style={{ display: "block", fontSize: 28, fontWeight: 800, color: "#3b82f6" }}>{infoCount}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Info</span>
            </div>
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <span style={{ display: "block", fontSize: 28, fontWeight: 800, color: "#22c55e" }}>{warnings.length === 0 ? "✓" : warnings.length}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{warnings.length === 0 ? "All Clear" : "Total Issues"}</span>
            </div>
          </div>
        </section>
      )}

      {/* Tabs */}
      {(validation || htmlOutput) && (
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          <button className={`mode-tab ${activeTab === "validate" ? "active" : ""}`} onClick={() => setActiveTab("validate")}>Warnings</button>
          <button className={`mode-tab ${activeTab === "preview" ? "active" : ""}`} onClick={() => setActiveTab("preview")}>Text Preview</button>
          {htmlOutput && <button className={`mode-tab ${activeTab === "html" ? "active" : ""}`} onClick={() => setActiveTab("html")}>HTML Output</button>}
        </div>
      )}

      {/* Warnings tab */}
      {activeTab === "validate" && warnings.length > 0 && (
        <section className="card">
          <h3 style={{ margin: "0 0 12px" }}>⚠️ ATS Warnings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {warnings.map((w, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
                <SeverityBadge severity={w.severity} />
                <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{w.message}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>These are suggestions to improve ATS compatibility. No resume can guarantee ATS success — always review before submitting.</p>
        </section>
      )}

      {/* Text Preview tab */}
      {activeTab === "preview" && textPreview && (
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>📝 Plain Text Preview</h3>
            <button className="ghost-btn small" onClick={downloadText}>⬇ Download .txt</button>
          </div>
          <pre style={{ padding: 16, borderRadius: 10, background: "#fff", color: "#111", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 500, overflow: "auto", fontFamily: "Georgia, serif" }}>
            {textPreview}
          </pre>
        </section>
      )}

      {/* HTML Output tab */}
      {activeTab === "html" && htmlOutput && (
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>📄 ATS-Safe HTML</h3>
            <button className="primary-btn small" onClick={downloadHTML}>⬇ Download .html</button>
          </div>
          <div style={{ padding: 16, borderRadius: 10, background: "#fff", maxHeight: 600, overflow: "auto" }}>
            <div dangerouslySetInnerHTML={{ __html: htmlOutput }} />
          </div>
        </section>
      )}

      {/* Empty state */}
      {!validation && !htmlOutput && !validating && !generating && (
        <section className="card" style={{ textAlign: "center", padding: 40 }}>
          <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🔍</span>
          <h3 style={{ margin: "0 0 8px" }}>Select a document to validate</h3>
          <p className="muted">Choose a resume or CV, then click Validate to check ATS compatibility or Generate to create an ATS-safe export.</p>
        </section>
      )}
    </main>
  );
}
