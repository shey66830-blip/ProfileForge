import React, { useMemo, useRef, useState } from "react";
import { saveDocumentToBackend } from "../services/documentService.js";
import { uploadResumeFile } from "../services/uploadService.js";
import {
  certificationsToText,
  educationToText,
  generateDocumentText,
  personalToText,
  projectsToText,
  TEMPLATES,
} from "../utils/generators.js";
import {
  analyzeSignal,
  computeCompleteness,
  computeStepProgress,
  readImageAsDataURL,
  signalBand,
  wordCount,
} from "../utils/resumeSignal.js";

const blankForm = {
  name: "",
  profession: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  summary: "",
  experience: "",
  skills: "",
  photo: "",
  // Structured rows: each field is its own input so a qualification, a project
  // role or a credential can be extracted, corrected and verified individually.
  educationRows: [],
  education: "",
  projectsRows: [],
  projects: "",
  certificationsRows: [],
  certifications: "",
  achievements: "",
  personalDetails: "",
  // Eligibility details that overseas employers ask for.
  nationality: "",
  languages: "",
  workAuthorization: "",
  relocate: "",
  passport: "",
  nric: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  age: "",
  height: "",
  family: "",
  partnerPreference: "",
};

const BLANK_EDUCATION_ROW = {
  degree: "",
  field: "",
  institution: "",
  year: "",
  score: "",
  gradeType: "",
};

const BLANK_PROJECT_ROW = {
  name: "",
  role: "",
  responsibilities: "",
  client: "",
  period: "",
  product: "",
};

const BLANK_CERTIFICATION_ROW = {
  name: "",
  issuer: "",
  year: "",
  credentialId: "",
  url: "",
  file: "",
  fileName: "",
};

// Which section order the preview paints for each layout. This is what makes
// the five templates read as genuinely different documents, not recolours.
const PREVIEW_ORDER = {
  modern: [
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "certifications",
    "personal",
  ],
  classic: [
    "summary",
    "education",
    "skills",
    "experience",
    "projects",
    "certifications",
    "personal",
  ],
  minimal: [
    "summary",
    "skills",
    "education",
    "experience",
    "projects",
    "certifications",
    "personal",
  ],
  executive: [
    "summary",
    "experience",
    "projects",
    "education",
    "certifications",
    "skills",
    "personal",
  ],
  technical: [
    "skills",
    "projects",
    "experience",
    "certifications",
    "education",
    "summary",
    "personal",
  ],
};

const SECTION_TITLES = {
  summary: "Professional Summary",
  skills: "Skills",
  experience: "Work History",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications & Achievements",
  personal: "Personal & Work Eligibility",
  family: "Family Background",
  partnerPreference: "Partner Preference",
};

// Ready-made answers for the eligibility questions that block overseas offers.
const RELOCATE_OPTIONS = [
  "Yes — open to relocating",
  "Yes — within my region",
  "No — local candidates only",
];
const WORK_AUTH_PRESETS = [
  "Citizen / PR — no sponsorship needed",
  "Requires work visa sponsorship",
  "Student / graduate visa",
  "Open work permit",
];

const BULLET_STARTERS = ["Led", "Built", "Increased", "Cut", "Launched"];
const EDUCATION_PRESETS = ["B.Com", "B.Tech", "B.Sc", "BBA", "MBA", "M.Tech", "Diploma"];
const SKILL_PRESETS = [
  "Excel",
  "Customer service",
  "Communication",
  "CRM",
  "Inventory management",
  "SQL",
  "Python",
  "React",
  "Project management",
  "Data analysis",
  "Salesforce",
  "Leadership",
];

const TOOL_LINKS = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Resume vs Job", page: "resume-job-analysis" },
  { label: "AI Tailoring", page: "tailoring" },
  { label: "ATS Export", page: "export-ats" },
];

function Field({ id, label, required, hint, children }) {
  return (
    <div className="pf-field">
      <label htmlFor={id}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <p className="pf-field-hint">{hint}</p>}
    </div>
  );
}

function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "PF"
  );
}

// The shareable artifact: a template-aware rendering of the same form state
// that the export path serialises to text.
function PreviewResume({ form, template, type }) {
  // The paper is rendered from the same text helpers the save uses, so what the
  // user sees live is exactly what the document will contain.
  const sections = useMemo(() => {
    const entries = {
      summary: form.summary,
      skills: form.skills,
      experience: form.experience,
      education: educationToText(form),
      projects: projectsToText(form),
      certifications: certificationsToText(form),
      personal: personalToText(form),
      family: type === "biodata" ? form.family : "",
      partnerPreference: type === "biodata" ? form.partnerPreference : "",
    };
    const order = PREVIEW_ORDER[template] || PREVIEW_ORDER.modern;
    const extra = type === "biodata" ? ["family", "partnerPreference"] : [];
    return [...order, ...extra]
      .map((key) => ({ key, title: SECTION_TITLES[key], body: (entries[key] || "").trim() }))
      .filter((section) => section.body);
  }, [form, template, type]);

  const links = [form.linkedin, form.github, form.portfolio].filter(Boolean);

  return (
    <article className={`pf-pv pf-pv--${template}`}>
      <header className="pf-pv-head">
        <div className="pf-pv-photo" aria-hidden={!form.photo}>
          {form.photo ? <img src={form.photo} alt="" /> : <span>{initials(form.name)}</span>}
        </div>
        <div className="pf-pv-id">
          <h3>{form.name || "Your Name"}</h3>
          {form.profession && <p className="pf-pv-role">{form.profession}</p>}
          <ul className="pf-pv-contact">
            {form.email && <li>{form.email}</li>}
            {form.phone && <li>{form.phone}</li>}
            {form.location && <li>{form.location}</li>}
            {type === "biodata" && form.age && <li>Age {form.age}</li>}
            {type === "biodata" && form.height && <li>{form.height}</li>}
          </ul>
          {links.length > 0 && <p className="pf-pv-links">{links.join(" • ")}</p>}
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.key} className="pf-pv-section">
          <h4>{section.title}</h4>
          {section.body
            .split(/\r?\n/)
            .map((line) => ({
              text: line.replace(/^[\s•\-*]+/, "").trim(),
              // Nested lines (project client/period/role, responsibilities)
              // keep their indent so the hierarchy still reads on paper.
              nested: /^\s{2,}/.test(line),
            }))
            .filter((line) => line.text)
            .map((line, index) => (
              <p key={index} className={line.nested ? "pf-pv-sub" : undefined}>
                {line.text}
              </p>
            ))}
        </section>
      ))}

      {sections.length === 0 && (
        <p className="pf-pv-empty">
          Start typing on the left — every field lands here as you go, no save required.
        </p>
      )}
    </article>
  );
}

function SignalPanel({ signal }) {
  const band = signalBand(signal.overall);
  const meters = [
    { key: "ats", label: "ATS parse", value: signal.ats },
    { key: "impact", label: "Ownership", value: signal.impact },
    { key: "evidence", label: "Proof", value: signal.evidence },
  ];

  return (
    <div className="pf-signal">
      <div className="pf-signal-top">
        <div>
          <p className="pf-signal-label">Recruiter signal</p>
          <strong className="pf-signal-score">{signal.overall}</strong>
          <span className={`pf-band pf-band--${band.tone}`}>{band.label}</span>
        </div>
        <div className="pf-dial" style={{ "--value": `${signal.overall}%` }} aria-hidden="true" />
      </div>

      <div className="pf-meters">
        {meters.map((meter) => (
          <div className="pf-meter" key={meter.key}>
            <span>{meter.label}</span>
            <div className="pf-meter-track">
              <i style={{ width: `${meter.value}%` }} />
            </div>
            <b>{meter.value}</b>
          </div>
        ))}
      </div>

      <p className="pf-signal-tip">
        <strong>Next best move:</strong> {signal.tip}
      </p>
    </div>
  );
}

export default function Builder({
  type,
  existingDocument,
  refreshDocuments,
  setActiveDocument,
  setPage,
}) {
  const [form, setForm] = useState(existingDocument?.data || blankForm);
  const [template, setTemplate] = useState(existingDocument?.template || "modern");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showAutofill, setShowAutofill] = useState(false);
  const [improvements, setImprovements] = useState([]);
  const [templateSuggestions, setTemplateSuggestions] = useState([]);
  const [auditResult, setAuditResult] = useState(null);
  const [categorizedSkills, setCategorizedSkills] = useState(null);
  const photoInput = useRef(null);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const appendLine = (field, value) => {
    setForm((prev) => {
      const current = (prev[field] || "").trimEnd();
      return { ...prev, [field]: current ? `${current}\n${value}` : value };
    });
    setError("");
  };

  // Row helpers — education, projects and certificates are edited as rows so
  // every extracted detail keeps its own input.
  const addRow = (field, blank) => {
    setForm((prev) => ({ ...prev, [field]: [...(prev[field] || []), { ...blank }] }));
    setError("");
  };

  const updateRow = (field, index, patch) => {
    setForm((prev) => ({
      ...prev,
      [field]: (prev[field] || []).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
    setError("");
  };

  const removeRow = (field, index) => {
    setForm((prev) => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
    setError("");
  };

  // The rows are what the save, the export and the AI analysis will read, so
  // completeness, the step ticks and the signal all score this same view.
  const scored = useMemo(
    () => ({
      ...form,
      education: educationToText(form),
      projects: projectsToText(form),
      certifications: certificationsToText(form),
      personalDetails: personalToText(form),
    }),
    [form],
  );

  const completeness = computeCompleteness(scored);
  const summaryWords = wordCount(form.summary);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await readImageAsDataURL(file);
      update("photo", dataUrl);
    } catch {
      setError("That image could not be read. Try a JPG or PNG.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // ── Steps: each one owns its own layout, so the wizard never feels like the
  // same form five times over. ────────────────────────────────────────────────
  const steps = useMemo(() => {
    const heading = {
      id: "heading",
      label: "Heading",
      required: ["name", "email", "phone", "location"],
      question: "What's the best way for employers to contact you?",
      hint: "We suggest including an email and phone number — recruiters filter on them first.",
      body: (
        <div className="pf-step-split">
          <div className="pf-photo-col">
            <div className={`pf-photo-frame ${form.photo ? "has-photo" : ""}`}>
              {form.photo ? (
                <img src={form.photo} alt="Resume photo" />
              ) : (
                <span>{initials(form.name)}</span>
              )}
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="pf-hidden-input"
              onChange={handlePhoto}
            />
            <button
              type="button"
              className="pf-link-btn"
              onClick={() => photoInput.current?.click()}
              disabled={photoBusy}
            >
              {photoBusy ? "Optimising…" : form.photo ? "Replace photo" : "Upload photo"}
            </button>
            {form.photo && (
              <button
                type="button"
                className="pf-link-btn muted"
                onClick={() => update("photo", "")}
              >
                Remove
              </button>
            )}
          </div>

          <div className="pf-fields">
            <div className="pf-grid-2">
              <Field id="pf-name" label="Full name" required>
                <input
                  id="pf-name"
                  placeholder="Sanvi Jha"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field id="pf-profession" label="Profession">
                <input
                  id="pf-profession"
                  placeholder="Quant Finance"
                  value={form.profession || ""}
                  onChange={(e) => update("profession", e.target.value)}
                />
              </Field>
            </div>

            <Field id="pf-email" label="Email" required>
              <input
                id="pf-email"
                type="email"
                placeholder="example@gmail.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>

            <div className="pf-grid-2">
              <Field id="pf-phone" label="Phone" required>
                <input
                  id="pf-phone"
                  placeholder="+91 22 1234 5677"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field id="pf-location" label="Location" required>
                <input
                  id="pf-location"
                  placeholder="New Delhi, India"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />
              </Field>
            </div>

            <div className="pf-grid-3">
              <Field id="pf-linkedin" label="LinkedIn">
                <input
                  id="pf-linkedin"
                  placeholder="linkedin.com/in/…"
                  value={form.linkedin || ""}
                  onChange={(e) => update("linkedin", e.target.value)}
                />
              </Field>
              <Field id="pf-github" label="GitHub">
                <input
                  id="pf-github"
                  placeholder="github.com/…"
                  value={form.github || ""}
                  onChange={(e) => update("github", e.target.value)}
                />
              </Field>
              <Field id="pf-portfolio" label="Portfolio">
                <input
                  id="pf-portfolio"
                  placeholder="yoursite.com"
                  value={form.portfolio || ""}
                  onChange={(e) => update("portfolio", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      ),
    };

    const work = {
      id: "work",
      label: "Work history",
      // Recommended, not blocking — the save gate stays what it always was.
      optional: true,
      required: ["experience"],
      question: "What have you actually shipped?",
      hint: "One achievement per line. Open with a verb and close with a number.",
      body: (
        <div className="pf-step-wide">
          <textarea
            className="pf-textarea lg"
            placeholder={
              "Increased store revenue 22% by rebuilding the upsell script\nLed a team of 6 associates through festive season"
            }
            value={form.experience}
            onChange={(e) => update("experience", e.target.value)}
          />
          <div className="pf-coach-row">
            <span className="pf-chip-label">Quick openers</span>
            {BULLET_STARTERS.map((word) => (
              <button
                key={word}
                type="button"
                className="pf-chip"
                onClick={() => appendLine("experience", `${word} …`)}
              >
                + {word}
              </button>
            ))}
          </div>
        </div>
      ),
    };

    const personal = {
      id: "personal",
      label: "Personal",
      required: ["age", "height", "family"],
      question: "What should families know about you?",
      hint: "Household, values and work — kept factual and short.",
      body: (
        <div className="pf-step-wide">
          <div className="pf-grid-2">
            <Field id="pf-age" label="Age" required>
              <input
                id="pf-age"
                placeholder="28"
                value={form.age || ""}
                onChange={(e) => update("age", e.target.value)}
              />
            </Field>
            <Field id="pf-height" label="Height" required>
              <input
                id="pf-height"
                placeholder="5 ft 7 in"
                value={form.height || ""}
                onChange={(e) => update("height", e.target.value)}
              />
            </Field>
          </div>
          <Field id="pf-family" label="Family background" required>
            <textarea
              id="pf-family"
              className="pf-textarea"
              placeholder="Father: retired teacher · Mother: homemaker · One younger brother"
              value={form.family || ""}
              onChange={(e) => update("family", e.target.value)}
            />
          </Field>
          <Field id="pf-partner" label="Partner preference">
            <textarea
              id="pf-partner"
              className="pf-textarea"
              placeholder="Working professional, values education, based in Delhi NCR"
              value={form.partnerPreference || ""}
              onChange={(e) => update("partnerPreference", e.target.value)}
            />
          </Field>
        </div>
      ),
    };

    const education = {
      id: "education",
      label: "Education",
      required: ["education"],
      question: "Where did you study?",
      hint: "Degree, institute, year — most recent first.",
      body: (
        <div className="pf-step-wide">
          <div className="pf-chip-row">
            <span className="pf-chip-label">Add a qualification</span>
            {EDUCATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="pf-chip"
                onClick={() => addRow("educationRows", { ...BLANK_EDUCATION_ROW, degree: preset })}
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="pf-rows">
            {(form.educationRows || []).map((row, index) => (
              <div className="pf-row" key={index}>
                <div className="pf-row-head">
                  <span className="pf-row-index">{index + 1}</span>
                  <strong>{row.degree || row.institution || "New qualification"}</strong>
                  <button
                    type="button"
                    className="pf-row-remove"
                    onClick={() => removeRow("educationRows", index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="pf-row-grid">
                  <input
                    aria-label={`Qualification ${index + 1} degree`}
                    placeholder="Degree / standard (B.Tech)"
                    value={row.degree || ""}
                    onChange={(e) => updateRow("educationRows", index, { degree: e.target.value })}
                  />
                  <input
                    aria-label={`Qualification ${index + 1} field of study`}
                    placeholder="Field (Computer Science)"
                    value={row.field || ""}
                    onChange={(e) => updateRow("educationRows", index, { field: e.target.value })}
                  />
                  <input
                    aria-label={`Qualification ${index + 1} institute`}
                    placeholder="School / college / university"
                    value={row.institution || ""}
                    onChange={(e) =>
                      updateRow("educationRows", index, { institution: e.target.value })
                    }
                  />
                  <input
                    aria-label={`Qualification ${index + 1} year`}
                    placeholder="Year (2016 - 2020)"
                    value={row.year || ""}
                    onChange={(e) => updateRow("educationRows", index, { year: e.target.value })}
                  />
                  <input
                    aria-label={`Qualification ${index + 1} score`}
                    placeholder="CGPA / % (8.7)"
                    value={row.score || ""}
                    onChange={(e) => updateRow("educationRows", index, { score: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="pf-row-add"
            onClick={() => addRow("educationRows", BLANK_EDUCATION_ROW)}
          >
            + Add another qualification
          </button>

          <Field id="pf-education-notes" label="Anything else about your education">
            <textarea
              id="pf-education-notes"
              className="pf-textarea"
              placeholder="Scholarships, relevant coursework, exchange semester…"
              value={form.education}
              onChange={(e) => update("education", e.target.value)}
            />
          </Field>
        </div>
      ),
    };

    const projects = {
      id: "projects",
      label: "Projects",
      optional: true,
      required: ["projects"],
      question: "Which projects prove you can do the job?",
      hint: "For each project, name your role and what you were responsible for — that is the first thing an interviewer asks.",
      body: (
        <div className="pf-step-wide">
          <div className="pf-rows">
            {(form.projectsRows || []).map((row, index) => (
              <div className="pf-row" key={index}>
                <div className="pf-row-head">
                  <span className="pf-row-index">{index + 1}</span>
                  <strong>{row.name || "New project"}</strong>
                  <button
                    type="button"
                    className="pf-row-remove"
                    onClick={() => removeRow("projectsRows", index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="pf-row-grid two">
                  <input
                    aria-label={`Project ${index + 1} name`}
                    placeholder="Project name"
                    value={row.name || ""}
                    onChange={(e) => updateRow("projectsRows", index, { name: e.target.value })}
                  />
                  <input
                    aria-label={`Project ${index + 1} role`}
                    placeholder="Your role (Lead Engineer)"
                    value={row.role || ""}
                    onChange={(e) => updateRow("projectsRows", index, { role: e.target.value })}
                  />
                  <input
                    aria-label={`Project ${index + 1} client`}
                    placeholder="Client / company"
                    value={row.client || ""}
                    onChange={(e) => updateRow("projectsRows", index, { client: e.target.value })}
                  />
                  <input
                    aria-label={`Project ${index + 1} period`}
                    placeholder="Period (2022 - 2023)"
                    value={row.period || ""}
                    onChange={(e) => updateRow("projectsRows", index, { period: e.target.value })}
                  />
                </div>
                <textarea
                  aria-label={`Project ${index + 1} responsibilities`}
                  className="pf-textarea"
                  placeholder={
                    "One responsibility per line:\nDesigned the matching algorithm handling 2M transactions per day.\nOwned the rollout across 3 markets."
                  }
                  value={row.responsibilities || ""}
                  onChange={(e) =>
                    updateRow("projectsRows", index, { responsibilities: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="pf-row-add"
            onClick={() => addRow("projectsRows", BLANK_PROJECT_ROW)}
          >
            + Add a project
          </button>

          <Field id="pf-projects-notes" label="Other projects worth mentioning">
            <textarea
              id="pf-projects-notes"
              className="pf-textarea"
              placeholder="Built a repeat-customer tracker that lifted retention 14%"
              value={form.projects}
              onChange={(e) => update("projects", e.target.value)}
            />
          </Field>
        </div>
      ),
    };

    const certifications = {
      id: "certifications",
      label: "Certifications",
      optional: true,
      required: ["certifications"],
      question: "What have you earned that others can verify?",
      hint: "Add the issuer, then the credential ID or verification link — Coursera, Credly, AWS and NPTEL all hand you one.",
      body: (
        <div className="pf-step-wide">
          <div className="pf-rows">
            {(form.certificationsRows || []).map((row, index) => (
              <div className="pf-row" key={index}>
                <div className="pf-row-head">
                  <span className="pf-row-index">{index + 1}</span>
                  <strong>{row.name || "New certificate"}</strong>
                  <button
                    type="button"
                    className="pf-row-remove"
                    onClick={() => removeRow("certificationsRows", index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="pf-row-grid two">
                  <input
                    aria-label={`Certificate ${index + 1} name`}
                    placeholder="Certificate name"
                    value={row.name || ""}
                    onChange={(e) =>
                      updateRow("certificationsRows", index, { name: e.target.value })
                    }
                  />
                  <input
                    aria-label={`Certificate ${index + 1} issuer`}
                    placeholder="Issuer (Coursera, AWS)"
                    value={row.issuer || ""}
                    onChange={(e) =>
                      updateRow("certificationsRows", index, { issuer: e.target.value })
                    }
                  />
                  <input
                    aria-label={`Certificate ${index + 1} year`}
                    placeholder="Year (2023)"
                    value={row.year || ""}
                    onChange={(e) =>
                      updateRow("certificationsRows", index, { year: e.target.value })
                    }
                  />
                  <input
                    aria-label={`Certificate ${index + 1} credential id`}
                    placeholder="Credential ID (AB12CD34)"
                    value={row.credentialId || ""}
                    onChange={(e) =>
                      updateRow("certificationsRows", index, { credentialId: e.target.value })
                    }
                  />
                </div>
                <input
                  aria-label={`Certificate ${index + 1} verification link`}
                  placeholder="Verification link (coursera.org/verify/…)"
                  value={row.url || ""}
                  onChange={(e) => updateRow("certificationsRows", index, { url: e.target.value })}
                />
                <div className="pf-row-attach">
                  <label className="pf-attach-btn">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(e) => attachCertificate(index, e)}
                    />
                    {row.file || row.fileName ? "Replace certificate" : "Attach certificate"}
                  </label>
                  {row.fileName && <span className="pf-attach-name">{row.fileName}</span>}
                  {row.file && <img className="pf-attach-preview" src={row.file} alt="" />}
                  <small className="pf-attach-note">
                    Image or PDF · images are kept with the document, PDFs are identified by name
                    and the credential ID above.
                  </small>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="pf-row-add"
            onClick={() => addRow("certificationsRows", BLANK_CERTIFICATION_ROW)}
          >
            + Add a certificate
          </button>

          <Field
            id="pf-achievements"
            label="Achievements"
            hint="Awards, rankings, hackathons, publications — one per line."
          >
            <textarea
              id="pf-achievements"
              className="pf-textarea"
              placeholder="Winner, National Coding Championship 2019"
              value={form.achievements}
              onChange={(e) => update("achievements", e.target.value)}
            />
          </Field>
        </div>
      ),
    };

    const skills = {
      id: "skills",
      label: "Skills",
      required: ["skills"],
      question: "What are you genuinely good at?",
      hint: "Mix tools, domain knowledge and people skills. One per line shops best with ATS filters.",
      body: (
        <div className="pf-step-wide">
          <textarea
            className="pf-textarea lg"
            placeholder={"Financial analysis, Risk management, Python, Bloomberg"}
            value={form.skills}
            onChange={(e) => update("skills", e.target.value)}
          />
          <div className="pf-chip-row">
            <span className="pf-chip-label">Tap to add</span>
            {SKILL_PRESETS.filter(
              (skill) => !form.skills.toLowerCase().includes(skill.toLowerCase()),
            )
              .slice(0, 7)
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="pf-chip"
                  onClick={() => appendLine("skills", skill)}
                >
                  + {skill}
                </button>
              ))}
          </div>

          {categorizedSkills && (
            <div className="pf-categories">
              <p className="pf-chip-label">Detected domains</p>
              <div className="pf-chip-row">
                {Object.entries(categorizedSkills).map(
                  ([category, list]) =>
                    list.length > 0 && (
                      <span key={category} className="pf-category">
                        <strong>{category.replace(/([A-Z])/g, " $1")}</strong>
                        {list.slice(0, 4).join(", ")}
                      </span>
                    ),
                )}
              </div>
            </div>
          )}
        </div>
      ),
    };

    const summary = {
      id: "summary",
      label: "Summary",
      optional: true,
      required: ["summary"],
      question: "Open with a short pitch.",
      hint: "Aim for 30–120 words. Write it last if it fights you.",
      body: (
        <div className="pf-step-wide">
          <textarea
            className="pf-textarea lg"
            placeholder="Quantitative finance analyst with three years of experience building trading models and risk dashboards…"
            value={form.summary}
            onChange={(e) => update("summary", e.target.value)}
          />
          <div className="pf-coach-row">
            <span
              className={`pf-word-meter ${summaryWords >= 30 && summaryWords <= 120 ? "good" : ""}`}
            >
              {summaryWords} words · target 30–120
            </span>
          </div>
        </div>
      ),
    };

    // Overseas applications live or die on these answers, so they get their own
    // step instead of being buried in the free-text personal details.
    const eligibility = {
      id: "personal",
      label: "Personal",
      optional: true,
      required: ["languages"],
      question: "What does an overseas employer need to know?",
      hint: "Nationality, languages and work-authorization answers decide whether your application is even processed.",
      body: (
        <div className="pf-step-wide">
          <div className="pf-grid-2">
            <Field id="pf-nationality" label="Nationality">
              <input
                id="pf-nationality"
                placeholder="Indian"
                value={form.nationality || ""}
                onChange={(e) => update("nationality", e.target.value)}
              />
            </Field>
            <Field
              id="pf-languages"
              label="Languages"
              hint="Add proficiency — Fluent, Native, Conversational."
            >
              <input
                id="pf-languages"
                placeholder="English (Fluent), Tamil (Native)"
                value={form.languages || ""}
                onChange={(e) => update("languages", e.target.value)}
              />
            </Field>
          </div>

          <Field
            id="pf-workauth"
            label="Work authorization"
            hint="Say plainly whether you need sponsorship."
          >
            <input
              id="pf-workauth"
              placeholder="Requires work visa sponsorship"
              value={form.workAuthorization || ""}
              onChange={(e) => update("workAuthorization", e.target.value)}
            />
          </Field>
          <div className="pf-chip-row">
            <span className="pf-chip-label">Common answers</span>
            {WORK_AUTH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="pf-chip"
                onClick={() => update("workAuthorization", preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <Field id="pf-relocate" label="Willing to relocate">
            <input
              id="pf-relocate"
              placeholder="Yes — open to relocating"
              value={form.relocate || ""}
              onChange={(e) => update("relocate", e.target.value)}
            />
          </Field>
          <div className="pf-chip-row">
            {RELOCATE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className="pf-chip"
                onClick={() => update("relocate", option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="pf-grid-2">
            <Field id="pf-passport" label="Passport number" hint="Only if the role asks for it.">
              <input
                id="pf-passport"
                placeholder="M1234567"
                value={form.passport || ""}
                onChange={(e) => update("passport", e.target.value)}
              />
            </Field>
            <Field id="pf-nric" label="NRIC / FIN / National ID">
              <input
                id="pf-nric"
                placeholder="S7891234B"
                value={form.nric || ""}
                onChange={(e) => update("nric", e.target.value)}
              />
            </Field>
          </div>

          <div className="pf-grid-3">
            <Field id="pf-dob" label="Date of birth">
              <input
                id="pf-dob"
                placeholder="14 Aug 1998"
                value={form.dob || ""}
                onChange={(e) => update("dob", e.target.value)}
              />
            </Field>
            <Field id="pf-gender" label="Gender">
              <input
                id="pf-gender"
                placeholder="Prefer not to say"
                value={form.gender || ""}
                onChange={(e) => update("gender", e.target.value)}
              />
            </Field>
            <Field id="pf-marital" label="Marital status">
              <input
                id="pf-marital"
                placeholder="Single"
                value={form.maritalStatus || ""}
                onChange={(e) => update("maritalStatus", e.target.value)}
              />
            </Field>
          </div>
        </div>
      ),
    };

    const finalize = {
      id: "finalize",
      label: "Finalize",
      required: [],
      question: "Pick a layout and ship it.",
      hint: "Everything is saved to your workspace — you can keep editing after this.",
      body: (
        <div className="pf-step-wide">
          <div className="pf-tpl-grid">
            {TEMPLATES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`pf-tpl-card ${template === option.id ? "active" : ""}`}
                onClick={() => {
                  setTemplate(option.id);
                  setError("");
                }}
                aria-pressed={template === option.id}
              >
                <span className={`pf-tpl-thumb pf-pv--${option.id}`}>
                  <i />
                  <b />
                  <em />
                  <em />
                </span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
                {templateSuggestions.includes(option.id) && (
                  <span className="pf-tag">Recommended</span>
                )}
              </button>
            ))}
          </div>
          {auditResult && (
            <div className="pf-audit">
              <div className="pf-audit-top">
                <p className="pf-chip-label">Uploaded résumé check</p>
                <span className="pf-audit-score">{auditResult.score}%</span>
              </div>
              <div className="pf-chip-row">
                {auditResult.checklist?.map((item, index) => (
                  <span key={index} className={`pf-check ${item.complete ? "ok" : "miss"}`}>
                    {item.complete ? "✓" : "✕"} {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {improvements.length > 0 && (
            <div className="pf-audit">
              <p className="pf-chip-label">Improvements found</p>
              <ul className="pf-tips">
                {improvements.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}{" "}
        </div>
      ),
    };

    return type === "biodata"
      ? [heading, personal, education, skills, projects, certifications, summary, finalize]
      : [
          heading,
          work,
          education,
          skills,
          projects,
          certifications,
          summary,
          eligibility,
          finalize,
        ];
  }, [
    form,
    type,
    template,
    summaryWords,
    categorizedSkills,
    auditResult,
    improvements,
    templateSuggestions,
    completeness.missing,
  ]);

  const progress = computeStepProgress(steps, scored);
  const recommended = progress.steps
    .filter((step) => step.optional && !step.complete)
    .map((step) => step.label);
  const signal = useMemo(() => analyzeSignal(scored), [scored]);
  // Clamp once so the question, the step counter and the nav button always
  // agree, even if a future step list is shorter than the current index.
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const active = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

  const attachCertificate = async (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      // A PDF cannot be embedded without blowing past the API payload limit, so
      // the file name is kept and the verification link carries the proof.
      updateRow("certificationsRows", index, { fileName: file.name, file: "" });
      return;
    }

    try {
      const dataUrl = await readImageAsDataURL(file, 520);
      updateRow("certificationsRows", index, { file: dataUrl, fileName: file.name });
    } catch {
      setError("That certificate image could not be read. Try a JPG or PNG.");
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const result = await uploadResumeFile(file);
    setUploading(false);

    if (!result.ok) {
      setError(result.message || "Upload failed.");
      return;
    }

    // The extractor returns every field it found. `skillsByCategory`, `links`,
    // `audit` and the review lists are display state; the rest merges straight
    // into the form so nothing from the old résumé is lost.
    const {
      improvements: tips,
      suggestedTemplates: templates,
      skillsByCategory,
      links,
      audit,
      structuredEducation,
      structuredProjects,
      structuredCertifications,
      personal,
      ...formFields
    } = result.fields;

    const merged = { ...form, ...formFields };
    if (links?.linkedin && !merged.linkedin) merged.linkedin = links.linkedin;
    if (links?.github && !merged.github) merged.github = links.github;
    if (links?.portfolio && !merged.portfolio) merged.portfolio = links.portfolio;

    // Extracted rows become editable inputs. Each extractor's plain-text
    // mirror is cleared when it has rows, because the rows are what the save
    // and the export render — keeping both would duplicate the same content.
    if (structuredEducation?.length) {
      merged.educationRows = structuredEducation.map((row) => ({
        degree: row.degree || "",
        field: row.field || "",
        institution: row.institution || "",
        year: row.year || "",
        score: row.score || "",
        gradeType: row.gradeType || "",
      }));
      merged.education = "";
    }

    if (structuredProjects?.length) {
      merged.projectsRows = structuredProjects.map((row) => ({
        name: row.name || "",
        role: row.role || "",
        responsibilities: (row.responsibilities || []).join("\n"),
        client: row.client || "",
        period: row.period || "",
        product: row.product || "",
      }));
      merged.projects = "";
    }

    if (structuredCertifications?.length) {
      merged.certificationsRows = structuredCertifications.map((row) => ({
        name: row.name || "",
        issuer: row.issuer || "",
        year: row.year || "",
        credentialId: row.credentialId || "",
        url: row.url || "",
        file: "",
        fileName: "",
      }));
      merged.certifications = "";
    }

    if (personal) {
      for (const key of [
        "nationality",
        "languages",
        "workAuthorization",
        "relocate",
        "passport",
        "nric",
        "dob",
        "gender",
        "maritalStatus",
      ]) {
        if (personal[key] && !merged[key]) merged[key] = personal[key];
      }
    }

    setForm(merged);
    setImprovements(tips || []);
    setTemplateSuggestions(templates || []);
    setAuditResult(audit || null);
    setCategorizedSkills(skillsByCategory || null);
    setShowAutofill(false);
  };

  const validate = () => {
    if (type === "biodata" && (!form.age || !form.height || !form.family)) {
      setError("Age, height and family background are required for a biodata.");
      return false;
    }
    if (completeness.missing.length > 0) {
      setError(
        `Please add: ${completeness.missing.join(", ")}. Use the step list on the left to jump there.`,
      );
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

  const goNext = () => {
    if (!isLast) {
      setStepIndex((index) => index + 1);
      setError("");
      return;
    }
    handleGenerate();
  };

  return (
    <main className="pf-wizard">
      <aside className="pf-rail">
        <div className="pf-rail-brand">
          <span className="pf-rail-mark">PF</span>
          <div>
            <strong>ProfileForge</strong>
            <small>AI résumé studio</small>
          </div>
        </div>

        <nav aria-label="Builder steps">
          <ol className="pf-steps">
            {progress.steps.map((step, index) => {
              const state = index === stepIndex ? "active" : step.complete ? "done" : "pending";
              return (
                <li key={step.id} className={`pf-step pf-step--${state}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setStepIndex(index);
                      setError("");
                    }}
                    aria-current={index === stepIndex ? "step" : undefined}
                  >
                    <span className="pf-step-dot">{step.complete ? "✓" : index + 1}</span>
                    <span className="pf-step-label">{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="pf-rail-progress">
          <p>
            <strong>{type.toUpperCase()} completeness</strong>
            <span aria-hidden="true">{progress.percent}%</span>
          </p>
          <div
            className="pf-progress"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${type} completeness`}
          >
            <i style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        <ul className="pf-rail-tools">
          {TOOL_LINKS.map((tool) => (
            <li key={tool.page}>
              <button type="button" onClick={() => setPage(tool.page)}>
                {tool.label}
              </button>
            </li>
          ))}
        </ul>

        <p className="pf-rail-foot">
          © {new Date().getFullYear()} ProfileForge. All rights reserved.
        </p>
      </aside>

      <section className="pf-stage">
        <button type="button" className="pf-back" onClick={() => setPage("dashboard")}>
          ← Back to dashboard
        </button>

        <p className="pf-step-count">
          Step {safeIndex + 1} of {steps.length} · {active.label}
        </p>
        <h1 className="pf-question">{active.question}</h1>
        <p className="pf-hint">{active.hint}</p>
        <p className="pf-required-note">
          * indicates a required field · changes preview live, nothing is saved until the last step
        </p>

        <div className="pf-stage-body">
          <div className="pf-autofill">
            <button
              type="button"
              className="pf-autofill-toggle"
              onClick={() => setShowAutofill((open) => !open)}
              aria-expanded={showAutofill}
            >
              Have an old résumé? Fill this out automatically
              <span aria-hidden="true">{showAutofill ? "−" : "+"}</span>
            </button>

            {showAutofill && (
              <div className="pf-autofill-body">
                <label className="pf-dropzone">
                  <input type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} />
                  <strong>{uploading ? "Parsing file…" : "Click to upload"}</strong>
                  <small>
                    PDF, DOCX or TXT up to 5MB — we map what we can and you fix the rest.
                  </small>
                </label>
              </div>
            )}

            {auditResult && !showAutofill && (
              <p className="pf-autofill-note">
                Imported résumé scored {auditResult.score}% — full report on the final step.
              </p>
            )}
          </div>

          {active.body}

          {/* Reviewed here (not inside the step body) so it can read the
              computed step progress that the rail uses. */}
          {active.id === "finalize" && (
            <div className="pf-checklist">
              <p className="pf-chip-label">Before you save</p>
              {completeness.missing.length === 0 ? (
                <p className="pf-check ok">✓ Every field the save needs is filled in.</p>
              ) : (
                <p className="pf-check miss">
                  ✕ Still needed to save: {completeness.missing.join(", ")}
                </p>
              )}
              {recommended.length > 0 && (
                <p className="pf-check soft">○ Worth adding: {recommended.join(", ")}</p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="pf-error" role="alert">
            {error}
          </p>
        )}

        <div className="pf-nav">
          <button
            type="button"
            className="pf-btn ghost"
            onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            disabled={safeIndex === 0}
          >
            ← Back
          </button>

          <button type="button" className="pf-btn primary" onClick={goNext}>
            {isLast ? "Save & finish" : "Next step →"}
          </button>
        </div>
      </section>

      <aside className="pf-aside">
        <div className="pf-aside-card">
          <div className="pf-aside-top">
            <p className="pf-aside-label">Live preview</p>
            <span className="pf-aside-tpl">{template}</span>
          </div>
          <div className="pf-paper">
            <PreviewResume form={form} template={template} type={type} />
          </div>
        </div>

        <SignalPanel signal={signal} />

        <p className="pf-aside-foot">
          Scores are computed on your device from the text you type — nothing is uploaded to grade
          it.
        </p>
      </aside>
    </main>
  );
}
