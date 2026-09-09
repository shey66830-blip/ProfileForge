import React, { useState, useEffect } from "react";
import { AI_MODELS, DEFAULT_MODEL, modelValue, findModelByValue } from "../utils/aiModels.js";
import { editDocumentWithAI } from "../services/aiService.js";

const presets = [
  "Make this ATS-friendly and professional.",
  "Make this suitable for a frontend internship.",
  "Make this shorter and more impactful.",
  "Improve grammar and formatting.",
  "Add stronger action verbs and achievements.",
];

// Model list lives in utils/aiModels.js (shared with resumeJobAnalysis).
// Local select state uses the collision-free `provider::model` value.

export default function AiEditor({
  documents,
  refreshDocuments,
  setActiveDocument,
  setPage,
}) {
  const [selectedId, setSelectedId] = useState(documents[0]?._id || "");
  const [instruction, setInstruction] = useState("");
  const [selectedModel, setSelectedModel] = useState(modelValue(DEFAULT_MODEL));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Documents arrive async; without this, the select displays the first
  // resume while state still holds "" and Apply refuses with a false
  // "Please select a document."
  useEffect(() => {
    if (documents.length === 0) return;
    if (!selectedId || !documents.some((d) => d._id === selectedId)) {
      setSelectedId(documents[0]._id);
    }
  }, [documents]);

  const selectedDoc = documents.find((doc) => doc._id === selectedId);
  const selectedModelDef = findModelByValue(selectedModel);

  const handleAiEdit = async () => {
    if (!selectedDoc) {
      setError("Please select a document.");
      return;
    }

    if (!instruction.trim()) {
      setError("Please write what you want AI to change.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await editDocumentWithAI(
      selectedDoc._id,
      instruction,
      selectedModelDef.provider,
      selectedModelDef.model
    );

    setLoading(false);

    if (!result.ok) {
      setError(result.message || "AI edit failed.");
      return;
    }

    await refreshDocuments();
    setActiveDocument(result.document);
    setPage("output");
  };

  return (
    <main className="ai-editor-page">
      <section className="card ai-hero">
        <div>
          <p className="eyebrow">AI document editor</p>
          <h1>Improve your resume, CV, or biodata</h1>
          <p>
            Choose a saved document, give editing instructions, and create a new
            improved version.
          </p>
        </div>

        <button className="ghost-btn" onClick={() => setPage("dashboard")}>
          Back to Dashboard
        </button>
      </section>

      {documents.length === 0 ? (
        <section className="card empty-state">
          <h2>No documents to edit</h2>
          <p>Create a resume or CV first, then come back to improve it with AI.</p>
          <button className="primary-btn" onClick={() => setPage("dashboard")}>Go to Dashboard</button>
        </section>
      ) : (
        <section className="ai-editor-grid">
          <div className="card ai-editor-panel">
            <p className="eyebrow">Step 1</p>
            <h2>Select document</h2>

            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError("");
              }}
            >
              {documents.map((doc) => (
                <option value={doc._id} key={doc._id}>
                  {doc.title}
                </option>
              ))}
            </select>

            <div className="selected-doc-preview">
              <p className="eyebrow">Selected</p>
              <h3>{selectedDoc?.title}</h3>
              <p>{selectedDoc?.type?.toUpperCase()}</p>
              {selectedDoc?.title?.includes("AI Edited") && (
                <span className="premium-badge">AI Version</span>
              )}
            </div>

            {selectedDoc?.title?.includes("AI Edited") && (
              <div className="version-info">
                <p className="eyebrow">Version History</p>
                <p className="muted">This document was created by AI editing. The original version is still available in your dashboard.</p>
              </div>
            )}
          </div>

          <div className="card ai-editor-panel">
            <p className="eyebrow">Step 2</p>
            <h2>Choose improvement style</h2>

            <div className="preset-grid">
              {presets.map((preset) => (
                <button
                  key={preset}
                  className="preset-chip"
                  type="button"
                  onClick={() => setInstruction(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="ai-model-picker">
              <label className="ai-model-label">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setError("");
                }}
              >
                {AI_MODELS.map((model) => (
                  <option key={modelValue(model)} value={modelValue(model)}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Example: Make this resume suitable for frontend internship, add stronger action verbs, and keep it ATS-friendly..."
              value={instruction}
              onChange={(e) => {
                setInstruction(e.target.value);
                setError("");
              }}
            />

            {error && <p className="error">{error}</p>}

            <button
              className="primary-btn ai-edit-btn"
              onClick={handleAiEdit}
              disabled={loading}
            >
              {loading ? "Creating improved version..." : "Apply AI Edit"}
            </button>
          </div>

          <aside className="card ai-preview-panel">
            <p className="eyebrow">Current document preview</p>
            <h2>{selectedDoc?.data?.name || "Document"}</h2>

            <div className="mini-document ai-mini-document">
              <pre>
                {selectedDoc?.generatedText ||
                  "Select a document to preview its content."}
              </pre>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}