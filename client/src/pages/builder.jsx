import React, { useState } from "react";
import { saveDocumentToBackend } from "../services/documentService.js";
import { uploadResumeFile } from "../services/uploadService.js";
import { generateDocumentText, TEMPLATES } from "../utils/generators.js";

const blankForm = {
  name: "",
  email: "",
  phone: "",
  location: "",
  education: "",
  skills: "",
  experience: "",
  projects: "",
  summary: "",
  age: "",
  height: "",
  family: "",
  partnerPreference: "",
};

export default function Builder({
  type,
  existingDocument,
  refreshDocuments,
  setActiveDocument,
  setPage,
}) {
  const [form, setForm] = useState(existingDocument?.data || blankForm);
  const [template, setTemplate] = useState("modern");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [improvements, setImprovements] = useState([]);
  const [templateSuggestions, setTemplateSuggestions] = useState([]);

  const update = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const result = await uploadResumeFile(file);

    setUploading(false);

    if (!result.ok) {
      setError(result.message || "Upload failed.");
      return;
    }

    // Fill every field the extractor found — name, contact, education, skills,
    // experience, projects, certifications, personal details — in original
    // document order so nothing from the uploaded resume is lost.
    const {
      improvements: tips,
      suggestedTemplates: templates,
      skillsList,
      experienceCompanies,
      ...formFields
    } = result.fields;

    setForm({ ...form, ...formFields });
    setImprovements(tips || []);
    setTemplateSuggestions(templates || []);
    setError("");
  };

  const chooseTemplate = (id) => {
    setTemplate(id);
    setError("");
  };

  const validate = () => {
    if (!form.name || !form.email || !form.phone || !form.location) {
      setError("Please fill name, email, phone, and location.");
      return false;
    }

    if (!form.education || !form.skills) {
      setError("Please fill education and skills.");
      return false;
    }

    if (type === "biodata" && (!form.age || !form.height || !form.family)) {
      setError("For biodata, age, height, and family background are required.");
      return false;
    }

    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;

    const generatedText = generateDocumentText(type, form, template);

    const result = await saveDocumentToBackend({
      _id: existingDocument?._id,
      type,
      title: `${type.toUpperCase()} - ${form.name}`,
      data: form,
      generatedText,
    });

    if (!result.ok) {
      setError(result.message || "Failed to save document.");
      return;
    }

    await refreshDocuments();
    setActiveDocument(result.document);
    setPage("output");
  };

  const previewText = generateDocumentText(type, form, template);

  return (
    <main className="builder-page">
      <section className="builder-header card">
        <div>
          <p className="eyebrow">Smart document builder</p>
          <h1>Create {type.toUpperCase()}</h1>
          <p>
            Upload an old resume/CV or fill details manually. Your document will
            be saved to your workspace.
          </p>
        </div>

        <button className="primary-btn" onClick={handleGenerate}>
          Generate & Save
        </button>
      </section>

      <section className="builder-grid">
        <div className="builder-form">
          <section className="card upload-card">
            <div>
              <p className="eyebrow">Auto fill</p>
              <h2>Upload Old Resume / CV</h2>
              <p>Supports PDF, DOCX and TXT files.</p>
            </div>

            <label className="upload-box">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleUpload}
              />
              <span>{uploading ? "Parsing file..." : "Click to upload file"}</span>
              <small>PDF, DOCX, TXT up to 5MB</small>
            </label>

            {improvements.length > 0 && (
              <div className="upload-improvements">
                <p className="eyebrow" style={{ marginTop: 14 }}>
                  Resume checked — improvements
                </p>
                <ul>
                  {improvements.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {templateSuggestions.length > 0 && (
              <div className="upload-templates">
                <p className="eyebrow" style={{ marginTop: 14 }}>
                  Suggested templates for this profile
                </p>
                <div className="template-selector">
                  {templateSuggestions.map((t) => {
                    const meta = TEMPLATES.find((x) => x.id === t);
                    if (!meta) return null;
                    return (
                      <button
                        key={t}
                        className={`template-chip ${template === t ? "active" : ""}`}
                        onClick={() => chooseTemplate(t)}
                        type="button"
                      >
                        <strong>{meta.label}</strong>
                        <small>{meta.description}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {type !== "biodata" && (
            <section className="card form-section">
              <p className="eyebrow">Template</p>
              <h2>Choose Layout</h2>
              <div className="template-selector">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    className={`template-chip ${template === t.id ? "active" : ""}`}
                    onClick={() => chooseTemplate(t.id)}
                    type="button"
                  >
                    <strong>{t.label}</strong>
                    <small>{t.description}</small>
                    {templateSuggestions.includes(t.id) && (
                      <em className="recommended-tag">Recommended</em>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card form-section">
            <p className="eyebrow">Section 1</p>
            <h2>Personal Details</h2>

            <div className="grid two">
              <input
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />

              <input
                placeholder="Email *"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />

              <input
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />

              <input
                placeholder="Location *"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
          </section>

          <section className="card form-section">
            <p className="eyebrow">Section 2</p>
            <h2>Education & Skills</h2>

            <textarea
              placeholder="Education *"
              value={form.education}
              onChange={(e) => update("education", e.target.value)}
            />

            <textarea
              placeholder="Skills * — example: React, JavaScript, Python, MongoDB"
              value={form.skills}
              onChange={(e) => update("skills", e.target.value)}
            />
          </section>

          <section className="card form-section">
            <p className="eyebrow">Section 3</p>
            <h2>Experience & Projects</h2>

            <textarea
              placeholder="Experience"
              value={form.experience}
              onChange={(e) => update("experience", e.target.value)}
            />

            <textarea
              placeholder="Projects"
              value={form.projects}
              onChange={(e) => update("projects", e.target.value)}
            />

            <textarea
              placeholder="Summary"
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
            />
          </section>

          {type === "biodata" && (
            <section className="card form-section premium-builder-section">
              <p className="eyebrow">Premium Personal Mode</p>
              <h2>Biodata Details</h2>

              <div className="grid two">
                <input
                  placeholder="Age *"
                  value={form.age}
                  onChange={(e) => update("age", e.target.value)}
                />

                <input
                  placeholder="Height *"
                  value={form.height}
                  onChange={(e) => update("height", e.target.value)}
                />
              </div>

              <textarea
                placeholder="Family Background *"
                value={form.family}
                onChange={(e) => update("family", e.target.value)}
              />

              <textarea
                placeholder="Partner Preference"
                value={form.partnerPreference}
                onChange={(e) => update("partnerPreference", e.target.value)}
              />
            </section>
          )}

          {error && <p className="error">{error}</p>}

          <button className="primary-btn builder-save-btn" onClick={handleGenerate}>
            Generate & Save
          </button>
        </div>

        <aside className="builder-preview card">
          <p className="eyebrow">Live Preview</p>
          <h2>{form.name || "Your Name"}</h2>

          <div className="preview-meta">
            <span>{form.email || "email@example.com"}</span>
            <span>{form.phone || "+91 XXXXX XXXXX"}</span>
            <span>{form.location || "City, Country"}</span>
          </div>

          <div className="mini-document">
            <pre>{previewText}</pre>
          </div>
        </aside>
      </section>
    </main>
  );
}