import React, { useState, useEffect } from "react";
import { analyzeResumeJob, compareResumeJob } from "../services/aiService.js";
import { AI_MODELS, DEFAULT_MODEL } from "../utils/aiModels.js"; // shared with aiEditor.jsx

async function uploadAndCreateResume(file, onDocumentsChange) {
  const fd = new FormData();
  fd.append("resume", file);

  const up = await fetch("/api/upload/resume", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const upJson = await up.json();
  if (!up.ok) {
    throw new Error(upJson.message || "File upload failed.");
  }

  const { text, fields } = upJson;
  const title = fields.name
    ? `Resume - ${fields.name}`.slice(0, 80)
    : file.name.replace(/\.(pdf|docx|txt)$/i, "");

  const doc = await fetch("/api/documents/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "resume",
      title,
      data: {
        name: fields.name || "",
        email: fields.email || "",
        phone: fields.phone || "",
        location: fields.location || "",
        skills: fields.skills
          ? fields.skills.split(", ").filter(Boolean)
          : [],
        education: fields.education || "",
        experience: fields.experience || "",
        projects: fields.projects || "",
        certifications: fields.certifications || "",
        personalDetails: fields.personalDetails || "",
        summary: fields.summary || "",
        sourceFile: file.name,
      },
      generatedText: text,
    }),
  });
  const docJson = await doc.json();
  if (!doc.ok) {
    throw new Error(docJson.message || "Could not save uploaded resume.");
  }

  const newId = docJson.document?._id || docJson.documents?.[0]?._id;
  if (newId && onDocumentsChange) {
    await onDocumentsChange();
  }
  return newId;
}

export default function ResumeJobAnalysis({ documents, onAnalysisResult, onComparisonResult, onDocumentsChange }) {
  const [selectedId, setSelectedId] = useState(documents[0]?._id || "");
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [justUploadedId, setJustUploadedId] = useState(null);
  const [analysisModel, setAnalysisModel] = useState("");
  const [qualError, setQualError] = useState("");

  const selectedDoc = documents.find((doc) => doc._id === selectedId);

  // Documents load asynchronously (AppContext fetches them after mount), so the
  // initial selectedId may be empty while the browser still renders the first
  // option as "selected". Sync once they arrive; otherwise Analyze rejects with
  // "Please select a resume first" even though a resume appears picked.
  useEffect(() => {
    if (!selectedId && documents.length > 0) {
      setSelectedId(documents[0]._id);
    }
  }, [documents, selectedId]);

  const EXPERIENTIAL_PAIR = AI_MODELS.filter((m) => m.provider === "experiential");

  const handleAnalyze = async () => {
    if (!selectedDoc) {
      setError("Please select a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setQualError("");
    setAnalysisModel("");

    const result = await analyzeResumeJob(
      selectedDoc._id,
      jobTitle,
      jobCompany,
      jobDescription,
      selectedModel.provider,
      selectedModel.model
    );

    setLoading(false);

    if (!result.ok) {
      setError(result.message || "Analysis failed.");
      return;
    }

    setAnalysis(result.analysis);
    setAnalysisModel(selectedModel.label);
    setQualError(result.qualitativeError || "");
    if (onAnalysisResult) {
      onAnalysisResult(result.analysis);
    }
  };

  const handleCompare = async () => {
    if (!selectedDoc) {
      setCompareError("Please select a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setCompareError("Please paste a job description.");
      return;
    }

    setCompareLoading(true);
    setCompareError("");
    setComparison(null);

    // Compare is always GPT-6 Astra vs Claude Fable 5.1. When one of them is
    // already selected it stays model A; otherwise the pair is used as-is.
    // (Order-independent: pick by model ID, not list position.)
    const astra = EXPERIENTIAL_PAIR.find((m) => m.model === "gpt-6-astra");
    const claude = EXPERIENTIAL_PAIR.find((m) => m.model === "claude-fable-5.1");
    let modelA = astra;
    let modelB = claude;
    if (selectedModel.provider === "experiential") {
      modelA = selectedModel;
      modelB = selectedModel.model === astra.model ? claude : astra;
    }

    const result = await compareResumeJob(
      selectedDoc._id,
      jobTitle,
      jobCompany,
      jobDescription,
      modelA.provider,
      modelA.model,
      modelB.provider,
      modelB.model
    );

    setCompareLoading(false);

    if (!result.ok) {
      setCompareError(result.message || "Comparison failed.");
      return;
    }

    setComparison(result.comparison);
    if (onComparisonResult) {
      onComparisonResult(result.comparison);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setError("Please select a file first.");
      return;
    }
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(uploadFile.type) &&
        !uploadFile.name.match(/\.(pdf|docx|txt)$/i)) {
      setError("Only PDF, DOCX, or TXT files are allowed.");
      return;
    }

    setUploading(true);
    setError("");
    setJustUploadedId(null);

    try {
      const newId = await uploadAndCreateResume(uploadFile, onDocumentsChange);
      setJustUploadedId(newId);
      setSelectedId(newId);
      setUploadFile(null);
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="ai-editor-page">
      <section className="card ai-hero">
        <div>
          <p className="eyebrow">Resume intelligence</p>
          <h1>Analyze resume against a job description</h1>
          <p>
            Select a saved resume, paste a job description, and see a structured
            match breakdown. You can also compare two models on the same job.
          </p>
        </div>
      </section>

      {documents.length === 0 ? (
        <section className="card empty-state">
          <h2>No resumes to analyze</h2>
          <p>Create a resume first, then come back to analyze it against jobs.</p>
        </section>
      ) : (
        <section className="ai-editor-grid">
          <div className="card ai-editor-panel">
            <p className="eyebrow">Step 1</p>
            <h2>Select or upload resume</h2>

            <p className="muted" style={{ marginBottom: 10 }}>
              Upload a fresh PDF, DOCX, or TXT from your system, or pick a saved resume.
            </p>

            <div className="ai-upload-box">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: "none" }}
                id="resume-upload-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadFile(file);
                  setError("");
                }}
              />
              <label htmlFor="resume-upload-input" className="upload-label">
                {uploadFile ? uploadFile.name : "Browse — choose a resume file"}
              </label>
              <button
                className="secondary-btn"
                style={{ marginTop: 8 }}
                onClick={() => document.getElementById("resume-upload-input").click()}
                disabled={uploading || !jobDescription.trim() && documents.length === 0}
              >
                {uploading ? "Uploading..." : "Upload & Save"}
              </button>
            </div>

            {uploading && (
              <p className="muted" style={{ marginTop: 6 }}>
                Parsing your file and saving it as a resume...
              </p>
            )}

            {justUploadedId && (
              <p className="muted" style={{ marginTop: 6, color: "#22c55e" }}>
                Resume saved. Selected for analysis.
              </p>
            )}

            <div className="ai-select-divider">Or select a saved resume</div>

            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError("");
                setAnalysis(null);
                setJustUploadedId(null);
              }}
            >
              {documents
                .filter((doc) => doc.type === "resume" || doc.type === "cv")
                .map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.title}
                  </option>
                ))}
              {documents.filter((doc) => doc.type === "resume" || doc.type === "cv").length === 0 && (
                <option value="">No saved resumes — upload one above</option>
              )}
            </select>

            {selectedDoc && (
              <p className="muted" style={{ marginTop: 8 }}>
                {selectedDoc.title} — {selectedDoc.type}
                {selectedDoc.data?.sourceFile && (
                  <span className="muted" style={{ marginLeft: 6 }}>
                    (from {selectedDoc.data.sourceFile})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="card ai-editor-panel">
            <p className="eyebrow">Step 2</p>
            <h2>Job details</h2>

            <label className="ai-model-label">Job title <span className="muted">(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. Frontend Developer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />

            <label className="ai-model-label" style={{ marginTop: 12 }}>
              Company <span className="muted">(optional)</span>
            </label>
            <input
              className="input"
              placeholder="e.g. Acme Tech"
              value={jobCompany}
              onChange={(e) => setJobCompany(e.target.value)}
            />

            <label className="ai-model-label" style={{ marginTop: 12 }}>
              Job description
            </label>
            <textarea
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setError("");
              }}
              style={{ minHeight: 160 }}
            />

            {error && <p className="error">{error}</p>}
          </div>

          <aside className="card ai-preview-panel">
            <p className="eyebrow">Model</p>
            <h2>Selected model</h2>
            <div className="ai-model-picker">
              <select
                value={`${selectedModel.provider}::${selectedModel.model}`}
                onChange={(e) => {
                  const next = AI_MODELS.find(
                    (m) => `${m.provider}::${m.model}` === e.target.value
                  ) || DEFAULT_MODEL;
                  setSelectedModel(next);
                }}
              >
                {AI_MODELS.map((m) => (
                  <option key={`${m.provider}::${m.model}`} value={`${m.provider}::${m.model}`}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="primary-btn ai-edit-btn"
              onClick={handleAnalyze}
              disabled={loading || !jobDescription.trim()}
            >
              {loading ? "Analyzing..." : "Analyze Resume vs Job"}
            </button>

            <button
              className="secondary-btn"
              style={{ marginTop: 8, width: "100%" }}
              onClick={handleCompare}
              disabled={compareLoading || !jobDescription.trim()}
            >
              {compareLoading ? "Comparing..." : "Compare Two Models"}
            </button>

            {compareError && <p className="error" style={{ marginTop: 8 }}>{compareError}</p>}

            {comparison && (
              <div className="analysis-result">
                <p className="eyebrow">Comparison loaded</p>
                <p>Both models have been evaluated.</p>
              </div>
            )}
          </aside>
        </section>
      )}

      {analysis && (
        <AnalysisResult
          analysis={analysis}
          modelLabel={analysisModel}
          qualError={qualError}
        />
      )}
      {comparison && <ComparisonResult comparison={comparison} />}
    </main>
  );
}

function AnalysisResult({ analysis, modelLabel, qualError }) {
  const m = analysis.match || {};
  const resume = analysis.resume || {};
  const job = analysis.job || {};
  const ats = analysis.ats || null;
  const qualitative = analysis.qualitative || null;

  return (
    <section className="card analysis-result">
      <p className="eyebrow">Analysis result</p>
      <h2>{analysis.resume?.title || "Resume"} vs {job.title || "Job"}</h2>

      <div className="grid three">
        <div className="analysis-score-card">
          <h3>Overall</h3>
          <p className="analysis-score">{m.overall ?? "—"}%</p>
        </div>
        <div className="analysis-score-card">
          <h3>Skill match</h3>
          <p>{m.skillMatch ?? "—"}%</p>
        </div>
        <div className="analysis-score-card">
          <h3>Experience match</h3>
          <p>{m.experienceMatch ?? "—"}%</p>
        </div>
      </div>

      {ats && (
        <div className="grid two" style={{ marginTop: 16 }}>
          <div className="analysis-score-card">
            <h3>ATS score</h3>
            <p>{ats.score ?? "—"} — {ats.grade || "—"}</p>
          </div>
          <div className="analysis-score-card">
            <h3>Estimated experience</h3>
            <p>{resume.estimatedExperience ?? 0} years</p>
          </div>
        </div>
      )}

      <div className="analysis-section" style={{ marginTop: 16 }}>
        <h3>Matched skills</h3>
        <div className="skill-pills">
          {(m.matchedSkills || []).length === 0 ? (
            <span className="muted">No matched skills detected.</span>
          ) : (
            (m.matchedSkills || []).map((skill) => (
              <span key={skill} className="skill-pill">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="analysis-section">
        <h3>Missing required skills</h3>
        <div className="skill-pills">
          {(m.missingRequired || []).length === 0 ? (
            <span className="muted">None detected.</span>
          ) : (
            (m.missingRequired || []).map((skill) => (
              <span key={skill} className="skill-pill missing">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="analysis-section">
        <h3>Missing preferred skills</h3>
        <div className="skill-pills">
          {(m.missingPreferred || []).length === 0 ? (
            <span className="muted">None detected.</span>
          ) : (
            (m.missingPreferred || []).map((skill) => (
              <span key={skill} className="skill-pill muted-pill">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

      {(m.reasons && m.reasons.length) && (
        <div className="analysis-section">
          <h3>Why this score</h3>
          <ul>
            {m.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {m.recommendation && (
        <div className="analysis-section">
          <h3>Recommendation</h3>
          <p>{m.recommendation?.careerAdvice || "—"}</p>
        </div>
      )}

      {qualError && (
        <div className="analysis-section" style={{ marginTop: 16 }}>
          <span className="badge">AI insight unavailable</span>
          <p className="muted">{qualError}</p>
        </div>
      )}

      {qualitative && (
        <div className="analysis-section" style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>AI insight</h3>
            <span className="badge">AI-generated{modelLabel ? ` · ${modelLabel}` : ""}</span>
          </div>
          {qualitative.summary && <p>{qualitative.summary}</p>}
          {qualitative.strengths?.length > 0 && (
            <>
              <h4>Strengths</h4>
              <ul>{qualitative.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {qualitative.weaknesses?.length > 0 && (
            <>
              <h4>Weaknesses</h4>
              <ul>{qualitative.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {qualitative.recommendations?.length > 0 && (
            <>
              <h4>Recommendations</h4>
              <ul>{qualitative.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {qualitative.evidence?.length > 0 && (
            <>
              <h4>Evidence</h4>
              <ul>{qualitative.evidence.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function QualBlock({ qualitative, error }) {
  if (!qualitative && !error) return null;
  if (!qualitative) {
    return (
      <div style={{ marginTop: 10 }}>
        <span className="badge">AI insight unavailable</span>
        <p className="muted" style={{ margin: "6px 0 0" }}>{error}</p>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <span className="badge">AI-generated insight</span>
      {qualitative.summary && <p className="muted" style={{ margin: "6px 0" }}>{qualitative.summary}</p>}
      {qualitative.strengths?.length > 0 && (
        <p className="muted" style={{ margin: "4px 0" }}><b>Strengths:</b> {qualitative.strengths.join(" • ")}</p>
      )}
      {qualitative.weaknesses?.length > 0 && (
        <p className="muted" style={{ margin: "4px 0" }}><b>Weaknesses:</b> {qualitative.weaknesses.join(" • ")}</p>
      )}
      {qualitative.recommendations?.length > 0 && (
        <p className="muted" style={{ margin: "4px 0" }}><b>Recommendations:</b> {qualitative.recommendations.join(" • ")}</p>
      )}
      {qualitative.evidence?.length > 0 && (
        <p className="muted" style={{ margin: "4px 0" }}><b>Evidence:</b> {qualitative.evidence.join(" • ")}</p>
      )}
    </div>
  );
}

function ComparisonResult({ comparison }) {
  const a = comparison?.modelA?.analysis;
  const b = comparison?.modelB?.analysis;
  const dim = comparison?.dimensionComparison || {};

  // Render one shared value when both models agree, or an "A vs B" pair when
  // they disagree. Without this, an agreed dimension shows a misleading
  // "35 vs —" because the server only emits valueB on disagreement.
  const fmtDim = (d) => {
    if (!d) return "—";
    if (d.agreement === "agree") return `${d.value ?? "—"} (both)`;
    return `${d.valueA ?? "—"} vs ${d.valueB ?? "—"}`;
  };

  return (
    <section className="card analysis-result">
      <p className="eyebrow">Model comparison</p>
      <h2>Compare model analysis</h2>

      <div className="grid two">
        <div className="comparison-column">
          <h3>{comparison?.modelA?.model || "Model A"}</h3>
          <p className="muted">{comparison?.modelA?.provider || "—"}</p>
          <div className="analysis-score-card" style={{ marginTop: 8 }}>
            <h3>Overall</h3>
            <p className="analysis-score">{a?.match?.overall ?? "—"}%</p>
          </div>
          {a?.match?.skillMatch != null && (
            <div className="analysis-score-card" style={{ marginTop: 8 }}>
              <h3>Skill match</h3>
              <p className="analysis-score">{a?.match?.skillMatch}%</p>
            </div>
          )}
          {a?.match?.matchedSkills?.length ? (
            <div style={{ marginTop: 8 }}>
              <p className="muted" style={{ margin: "4px 0 8px" }}>Matched skills</p>
              <div className="skill-pills">
                {a.match.matchedSkills.map((s) => (
                  <span key={s} className="skill-pill">{s}</span>
                ))}
              </div>
            </div>
          ) : null}
          <QualBlock qualitative={a?.qualitative} error={comparison?.modelA?.qualitativeError} />
        </div>
        <div className="comparison-column">
          <h3>{comparison?.modelB?.model || "Model B"}</h3>
          <p className="muted">{comparison?.modelB?.provider || "—"}</p>
          <div className="analysis-score-card" style={{ marginTop: 8 }}>
            <h3>Overall</h3>
            <p className="analysis-score">{b?.match?.overall ?? "—"}%</p>
          </div>
          {b?.match?.skillMatch != null && (
            <div className="analysis-score-card" style={{ marginTop: 8 }}>
              <h3>Skill match</h3>
              <p className="analysis-score">{b?.match?.skillMatch}%</p>
            </div>
          )}
          {b?.match?.matchedSkills?.length ? (
            <div style={{ marginTop: 8 }}>
              <p className="muted" style={{ margin: "4px 0 8px" }}>Matched skills</p>
              <div className="skill-pills">
                {b.match.matchedSkills.map((s) => (
                  <span key={s} className="skill-pill">{s}</span>
                ))}
              </div>
            </div>
          ) : null}
          <QualBlock qualitative={b?.qualitative} error={comparison?.modelB?.qualitativeError} />
        </div>
      </div>

      <div className="comparison-dimension-grid" style={{ marginTop: 16 }}>
        <div className="comparison-dimension">
          <span>Overall</span>
          <span>
            {dim.overall?.agreement === "agree" ? "Agree" : "Disagree"}{" "}
            {fmtDim(dim.overall)}
          </span>
        </div>
        <div className="comparison-dimension">
          <span>Skill match</span>
          <span>
            {dim.skillMatch?.agreement === "agree" ? "Agree" : "Disagree"}{" "}
            {fmtDim(dim.skillMatch)}
          </span>
        </div>
        <div className="comparison-dimension">
          <span>Experience match</span>
          <span>
            {dim.experienceMatch?.agreement === "agree"
              ? "Agree"
              : "Disagree"}{" "}
            {fmtDim(dim.experienceMatch)}
          </span>
        </div>
        <div className="comparison-dimension">
          <span>Education match</span>
          <span>
            {dim.educationMatch?.agreement === "agree"
              ? "Agree"
              : "Disagree"}{" "}
            {fmtDim(dim.educationMatch)}
          </span>
        </div>
      </div>

      <div className="analysis-section">
        <h3>Skills both models agree you already have</h3>
        <div className="skill-pills">
          {(comparison?.consensus?.agreedMatchedSkills || []).length === 0 ? (
            <span className="muted">None detected.</span>
          ) : (
            (comparison?.consensus?.agreedMatchedSkills || []).map((skill) => (
              <span key={skill} className="skill-pill">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="analysis-section">
        <h3>Skills both models agree you are missing</h3>
        <div className="skill-pills">
          {(comparison?.consensus?.agreedMissingRequired || []).length === 0 ? (
            <span className="muted">None.</span>
          ) : (
            (comparison?.consensus?.agreedMissingRequired || []).map((skill) => (
              <span key={skill} className="skill-pill missing">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="analysis-section">
        <h3>Skills only one model flagged as missing</h3>
        <div className="skill-pills">
          {(comparison?.consensus?.disagreedMissingRequired || []).length === 0 ? (
            <span className="muted">None.</span>
          ) : (
            (comparison?.consensus?.disagreedMissingRequired || []).map((skill) => (
              <span key={skill} className="skill-pill muted-pill">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

    </section>
  );
}
