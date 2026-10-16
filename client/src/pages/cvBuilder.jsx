import React, { useMemo, useRef, useState } from "react";
import { saveDocumentToBackend } from "../services/documentService.js";
import { uploadCvFile } from "../services/uploadService.js";
import {
  BLANK_GRANT_ROW,
  BLANK_PUBLICATION_ROW,
  BLANK_REFERENCE_ROW,
  BLANK_TALK_ROW,
  BLANK_TEACHING_ROW,
  CV_TEMPLATES,
  computeCvChecklist,
  cvBlockingFields,
  cvSections,
  cvTemplateSuggestions,
  generateCVText,
} from "../utils/cvGenerators.js";
import { readImageAsDataURL } from "../utils/resumeSignal.js";

// The CV builder owns the CV shape: scholarship sections, an academic record
// checklist and a layout set chosen for committees rather than for ATS keyword
// filters. Nothing here is shared with the resume wizard except the field
// widgets and the row-to-text helpers, so the two documents can diverge freely.
const blankForm = {
  name: "",
  profession: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  // Identifiers a committee uses to find your citations.
  orcid: "",
  scholar: "",
  summary: "",
  researchInterests: "",
  photo: "",
  educationRows: [],
  education: "",
  publicationsRows: [],
  publications: "",
  grantsRows: [],
  grants: "",
  talksRows: [],
  talks: "",
  teachingRows: [],
  teaching: "",
  experience: "",
  research: "",
  skills: "",
  memberships: "",
  certifications: "",
  referencesRows: [],
  references: "",
  // Eligibility details that overseas departments and visa offices ask for.
  nationality: "",
  languages: "",
  workAuthorization: "",
  relocate: "",
  passport: "",
  nric: "",
  dob: "",
  gender: "",
  maritalStatus: "",
};

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
const METHOD_PRESETS = [
  "Statistics",
  "Machine learning",
  "Python",
  "R",
  "SQL",
  "Qualitative methods",
  "Field research",
  "Lab techniques",
  "Grant writing",
  "Peer review",
  "Teaching",
  "Academic writing",
];
const DEGREE_PRESETS = ["PhD", "M.Sc", "M.A.", "M.Tech", "B.Tech", "B.Sc", "MBA", "Postdoc"];
const TALK_KINDS = [
  "Keynote",
  "Invited talk",
  "Conference talk",
  "Poster",
  "Panel",
  "Seminar",
  "Workshop",
];
const GRANT_KINDS = ["Grant", "Fellowship", "Scholarship", "Award", "Prize", "Medal", "Other"];

// The wizard step order. Kept as a flat list because the checklist and the rail
// both jump by step id, and a step can be reached before it is rendered.
const CV_STEP_IDS = [
  "heading",
  "profile",
  "education",
  "publications",
  "grants",
  "talks",
  "teaching",
  "experience",
  "skills",
  "references",
  "extra",
  "eligibility",
  "finalize",
];

const TOOL_LINKS = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Resume vs Job", page: "resume-job-analysis" },
  { label: "AI Tailoring", page: "tailoring" },
  { label: "ATS Export", page: "export-ats" },
];

// A CV is laid out long-form, so the preview borrows the resume paper styles but
// never the resume section order.
const PREVIEW_MODIFIER = {
  academic: "classic",
  research: "modern",
  industry: "executive",
  ats: "minimal",
};

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

const clean = (value) => (typeof value === "string" ? value.trim() : "");

// Every CV section is edited the same way — a list of rows with labelled inputs —
// so one editor renders publications, funding, talks, teaching and referees.
function RowsEditor({
  field,
  rows = [],
  blank,
  addLabel,
  titleKey,
  emptyTitle,
  fields,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const renderInput = (index, def) => {
    const ariaLabel = `${def.aria} ${index + 1} ${def.name}`;
    if (def.options) {
      const options = def.options.map((option) =>
        typeof option === "string" ? { value: option, label: option } : option,
      );
      return (
        <select
          key={def.name}
          aria-label={ariaLabel}
          value={rows[index]?.[def.name] || options[0].value}
          onChange={(event) => onUpdate(field, index, { [def.name]: event.target.value })}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    if (def.textarea) {
      return (
        <textarea
          key={def.name}
          className="pf-textarea"
          aria-label={ariaLabel}
          placeholder={def.placeholder}
          value={rows[index]?.[def.name] || ""}
          onChange={(event) => onUpdate(field, index, { [def.name]: event.target.value })}
        />
      );
    }
    return (
      <input
        key={def.name}
        aria-label={ariaLabel}
        placeholder={def.placeholder}
        value={rows[index]?.[def.name] || ""}
        onChange={(event) => onUpdate(field, index, { [def.name]: event.target.value })}
      />
    );
  };

  return (
    <div className="pf-step-wide">
      <div className="pf-rows">
        {rows.map((row, index) => (
          <div className="pf-row" key={index}>
            <div className="pf-row-head">
              <span className="pf-row-index">{index + 1}</span>
              <strong>{clean(row[titleKey]) || emptyTitle}</strong>
              <button
                type="button"
                className="pf-row-remove"
                onClick={() => onRemove(field, index)}
              >
                Remove
              </button>
            </div>
            {fields.map((entry, entryIndex) =>
              Array.isArray(entry) ? (
                <div className="pf-row-grid two" key={entryIndex}>
                  {entry.map((def) => renderInput(index, def))}
                </div>
              ) : (
                renderInput(index, entry)
              ),
            )}
          </div>
        ))}
      </div>

      <button type="button" className="pf-row-add" onClick={() => onAdd(field, blank)}>
        {addLabel}
      </button>
    </div>
  );
}

// The checklist is the CV's answer to "what is missing and what should I be
// asked for" — each incomplete item carries the question and the step that fixes
// it, so it doubles as the builder's interview script.
function CvChecklist({ checklist, onJump, compact }) {
  const missing = checklist.missing;
  const shown = compact ? missing.slice(0, 3) : missing;

  return (
    <div className="pf-checklist pf-checklist--cv">
      <div className="pf-audit-top">
        <p className="pf-chip-label">CV checklist</p>
        <span className="pf-audit-score">{checklist.score}%</span>
      </div>

      <div className="pf-chip-row">
        {checklist.items.map((item) => (
          <span key={item.key} className={`pf-check ${item.complete ? "ok" : "miss"}`}>
            {item.complete ? "✓" : "✕"} {item.label}
          </span>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="pf-check ok">✓ Every academic section a committee looks for is in place.</p>
      ) : (
        <>
          <p className="pf-chip-label">
            {compact ? "Still to gather" : "We still need this from you"}
          </p>
          <ul className="pf-tips">
            {shown.map((item) => (
              <li key={item.key}>
                <button type="button" className="pf-link-btn" onClick={() => onJump(item.step)}>
                  {item.ask}
                </button>
              </li>
            ))}
          </ul>
          {compact && missing.length > shown.length && (
            <p className="pf-hint">+{missing.length - shown.length} more on the final step.</p>
          )}
        </>
      )}
    </div>
  );
}

function CvPreview({ form, template }) {
  const sections = useMemo(() => cvSections(form, template), [form, template]);
  const modifier = PREVIEW_MODIFIER[template] || "classic";
  const links = [form.linkedin, form.github, form.portfolio].filter(Boolean);

  return (
    <article className={`pf-pv pf-pv--cv pf-pv--${modifier}`}>
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
            {form.orcid && <li>{form.orcid}</li>}
          </ul>
          {(links.length > 0 || form.scholar) && (
            <p className="pf-pv-links">{[...links, form.scholar].filter(Boolean).join(" • ")}</p>
          )}
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.key} className="pf-pv-section">
          <h4>{section.title}</h4>
          {section.plain ? (
            // The plain layout prints "Label: value" lines so an ATS reads a
            // heading it recognises — the preview shows the same thing.
            <p>
              <strong>{section.title}:</strong> {section.body.replace(/\r?\n/g, " ")}
            </p>
          ) : (
            section.body
              .split(/\r?\n/)
              .map((line) => line)
              .filter((line) => line.trim())
              .map((line, index) => (
                <p key={index} className={/^\s{2,}/.test(line) ? "pf-pv-sub" : undefined}>
                  {line.replace(/^[\s•\-*]+/, "")}
                </p>
              ))
          )}
        </section>
      ))}

      {sections.length === 0 && (
        <p className="pf-pv-empty">
          Start with your academic profile — every section lands here as you go, no save required.
        </p>
      )}
    </article>
  );
}

export default function CvBuilder({
  existingDocument,
  refreshDocuments,
  setActiveDocument,
  setPage,
}) {
  const [form, setForm] = useState({ ...blankForm, ...(existingDocument?.data || {}) });
  const [template, setTemplate] = useState(existingDocument?.template || "academic");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [imported, setImported] = useState(null);
  const [improvements, setImprovements] = useState([]);
  const [templateSuggestions, setTemplateSuggestions] = useState([]);
  const photoInput = useRef(null);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const appendMethod = (value) => {
    setForm((prev) => {
      const current = (prev.skills || "").trimEnd();
      if (current.toLowerCase().includes(value.toLowerCase())) return prev;
      return { ...prev, skills: current ? `${current}, ${value}` : value };
    });
    setError("");
  };

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

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await readImageAsDataURL(file, 520);
      update("photo", dataUrl);
    } catch {
      setError("That image could not be read. Try a JPG or PNG.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // Import an existing CV. Unlike the resume importer this only fills the gaps a
  // user has left empty, so a second import can never wipe edits made in between.
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");

    const result = await uploadCvFile(file);
    setUploading(false);

    if (!result.ok) {
      setError(result.message || "Upload failed.");
      return;
    }

    const {
      improvements: tips,
      suggestedTemplates: templates,
      links,
      audit,
      structuredEducation,
      publicationsRows,
      grantsRows,
      talksRows,
      teachingRows,
      referencesRows,
      personal,
      ...rest
    } = result.fields;

    setForm((prev) => {
      const merged = { ...prev };

      for (const [key, value] of Object.entries(rest)) {
        if (key.endsWith("Rows")) continue;
        if (key === "skillsByCategory" || key === "links") continue;
        // Fill the gaps only; what the user typed always wins.
        if (!clean(merged[key]) && clean(value)) merged[key] = value;
      }
      if (links?.linkedin && !merged.linkedin) merged.linkedin = links.linkedin;
      if (links?.github && !merged.github) merged.github = links.github;
      if (links?.portfolio && !merged.portfolio) merged.portfolio = links.portfolio;
      if (links?.orcid && !merged.orcid) merged.orcid = links.orcid;
      if (links?.scholar && !merged.scholar) merged.scholar = links.scholar;

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
        if (personal?.[key] && !merged[key]) merged[key] = personal[key];
      }

      // Extracted rows replace the matching editor rows only when the editor is
      // still empty, and the plain-text mirror is cleared so the save, the
      // preview and the export all read the same rows.
      if (structuredEducation?.length && !(prev.educationRows || []).length) {
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
      if (publicationsRows?.length && !(prev.publicationsRows || []).length) {
        merged.publicationsRows = publicationsRows;
        merged.publications = "";
      }
      if (grantsRows?.length && !(prev.grantsRows || []).length) {
        merged.grantsRows = grantsRows;
        merged.grants = "";
      }
      if (talksRows?.length && !(prev.talksRows || []).length) {
        merged.talksRows = talksRows;
        merged.talks = "";
      }
      if (teachingRows?.length && !(prev.teachingRows || []).length) {
        merged.teachingRows = teachingRows;
        merged.teaching = "";
      }
      if (referencesRows?.length && !(prev.referencesRows || []).length) {
        merged.referencesRows = referencesRows;
        merged.references = "";
      }
      return merged;
    });

    setImprovements(tips || []);
    setTemplateSuggestions(templates || []);
    setImported(audit || null);
  };

  const checklist = useMemo(() => computeCvChecklist(form), [form]);
  const blocking = useMemo(() => cvBlockingFields(form), [form]);
  // A layout is recommended either from what the uploaded CV looked like, or
  // from the sections the user has filled in here.
  const recommended = useMemo(
    () => [...new Set([...templateSuggestions, ...cvTemplateSuggestions(form)])],
    [templateSuggestions, form],
  );

  // Hoisted on purpose: the step bodies below render checklist links that jump
  // to another step, and they are built before the step array exists.
  function jumpToStep(id) {
    const index = CV_STEP_IDS.indexOf(id);
    if (index >= 0) {
      setStepIndex(index);
      setError("");
    }
  }

  const steps = useMemo(() => {
    const isComplete = (id) => {
      const items = checklist.items.filter((item) => item.step === id);
      return items.length > 0 && items.every((item) => item.complete);
    };

    const sectionStep = (id, label, question, hint, body) => ({
      id,
      label,
      question,
      hint,
      body,
      complete: isComplete(id),
    });

    const heading = sectionStep(
      "heading",
      "Heading",
      "Who are you, and how should a committee reach you?",
      "Name, current position, email, phone and country — add ORCID or Google Scholar so citations find you.",
      <div className="pf-step-split">
        <div className="pf-photo-col">
          <div className={`pf-photo-frame ${form.photo ? "has-photo" : ""}`}>
            {form.photo ? (
              <img src={form.photo} alt="CV photo" />
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
            <button type="button" className="pf-link-btn muted" onClick={() => update("photo", "")}>
              Remove
            </button>
          )}
        </div>

        <div className="pf-fields">
          <div className="pf-grid-2">
            <Field id="cv-name" label="Full name" required>
              <input
                id="cv-name"
                placeholder="Dr. Anita Sharma"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field id="cv-profession" label="Current position">
              <input
                id="cv-profession"
                placeholder="Assistant Professor of Finance"
                value={form.profession || ""}
                onChange={(e) => update("profession", e.target.value)}
              />
            </Field>
          </div>

          <Field id="cv-email" label="Email" required>
            <input
              id="cv-email"
              type="email"
              placeholder="name@university.edu"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>

          <div className="pf-grid-2">
            <Field id="cv-phone" label="Phone" required>
              <input
                id="cv-phone"
                placeholder="+91 80 1234 5678"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
            <Field id="cv-location" label="City / country" required>
              <input
                id="cv-location"
                placeholder="Bangalore, India"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </Field>
          </div>

          <div className="pf-grid-2">
            <Field id="cv-orcid" label="ORCID iD">
              <input
                id="cv-orcid"
                placeholder="0000-0002-1825-0097"
                value={form.orcid || ""}
                onChange={(e) => update("orcid", e.target.value)}
              />
            </Field>
            <Field id="cv-scholar" label="Google Scholar">
              <input
                id="cv-scholar"
                placeholder="scholar.google.com/citations?user=…"
                value={form.scholar || ""}
                onChange={(e) => update("scholar", e.target.value)}
              />
            </Field>
          </div>

          <div className="pf-grid-3">
            <Field id="cv-linkedin" label="LinkedIn">
              <input
                id="cv-linkedin"
                placeholder="linkedin.com/in/…"
                value={form.linkedin || ""}
                onChange={(e) => update("linkedin", e.target.value)}
              />
            </Field>
            <Field id="cv-github" label="GitHub">
              <input
                id="cv-github"
                placeholder="github.com/…"
                value={form.github || ""}
                onChange={(e) => update("github", e.target.value)}
              />
            </Field>
            <Field id="cv-portfolio" label="Website">
              <input
                id="cv-portfolio"
                placeholder="yoursite.com"
                value={form.portfolio || ""}
                onChange={(e) => update("portfolio", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>,
    );

    const profile = sectionStep(
      "profile",
      "Academic profile",
      "What do you work on, and what are you known for?",
      "Three or four lines: your field, your current position, and the research you want to be contacted about.",
      <div className="pf-step-wide">
        <textarea
          id="cv-summary"
          className="pf-textarea lg"
          placeholder={
            "Assistant Professor of Finance working on credit risk and applied machine learning, with work published in banking and econometrics journals."
          }
          value={form.summary}
          onChange={(e) => update("summary", e.target.value)}
        />
        <Field
          id="cv-research-interests"
          label="Research interests"
          hint="Comma-separated areas — committees match your CV to their department's focus."
        >
          <input
            id="cv-research-interests"
            placeholder="Credit risk, applied machine learning, household finance"
            value={form.researchInterests || ""}
            onChange={(e) => update("researchInterests", e.target.value)}
          />
        </Field>
      </div>,
    );

    const education = sectionStep(
      "education",
      "Education",
      "Walk through your degrees, newest first.",
      "Degree, field, institution, year and grade — one row each, no matter how many you have.",
      <div className="pf-step-wide">
        <RowsEditor
          field="educationRows"
          rows={form.educationRows}
          blank={{ degree: "", field: "", institution: "", year: "", score: "", gradeType: "" }}
          addLabel="+ Add a degree"
          titleKey="degree"
          emptyTitle="New qualification"
          fields={[
            [
              { name: "degree", aria: "Degree", placeholder: "Degree (PhD, M.Sc…)" },
              { name: "field", aria: "Field", placeholder: "Field of study" },
            ],
            [
              { name: "institution", aria: "Institution", placeholder: "University / institution" },
              { name: "year", aria: "Year", placeholder: "2014 - 2019" },
            ],
            [
              { name: "score", aria: "Score", placeholder: "CGPA or %" },
              {
                name: "gradeType",
                aria: "Grade type",
                options: [
                  { value: "", label: "Auto-detect" },
                  { value: "cgpa", label: "CGPA" },
                  { value: "percent", label: "Percentage" },
                  { value: "grade", label: "Grade" },
                ],
              },
            ],
          ]}
          onAdd={addRow}
          onUpdate={updateRow}
          onRemove={removeRow}
        />

        <div className="pf-coach-row">
          <span className="pf-chip-label">Quick degrees</span>
          {DEGREE_PRESETS.map((degree) => (
            <button
              key={degree}
              type="button"
              className="pf-chip"
              onClick={() =>
                addRow("educationRows", {
                  degree,
                  field: "",
                  institution: "",
                  year: "",
                  score: "",
                  gradeType: "",
                })
              }
            >
              + {degree}
            </button>
          ))}
        </div>

        <Field id="cv-education-extra" label="Anything else about your education">
          <textarea
            id="cv-education-extra"
            className="pf-textarea"
            placeholder="Thesis title, exchange programmes, coursework…"
            value={form.education}
            onChange={(e) => update("education", e.target.value)}
          />
        </Field>
      </div>,
    );

    const publications = sectionStep(
      "publications",
      "Publications",
      "What have you published?",
      "Journal articles, conference papers, chapters, preprints or a thesis. Add a DOI or link where you have one.",
      <div className="pf-step-wide">
        <RowsEditor
          field="publicationsRows"
          rows={form.publicationsRows}
          blank={BLANK_PUBLICATION_ROW}
          addLabel="+ Add a publication"
          titleKey="title"
          emptyTitle="New publication"
          fields={[
            { name: "title", aria: "Publication", placeholder: "Title" },
            { name: "authors", aria: "Publication", placeholder: "Authors" },
            [
              { name: "venue", aria: "Publication", placeholder: "Journal / conference" },
              { name: "year", aria: "Publication", placeholder: "Year" },
            ],
            { name: "url", aria: "Publication", placeholder: "DOI or link (doi.org/…)" },
          ]}
          onAdd={addRow}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
        <Field id="cv-publications-extra" label="Other publications">
          <textarea
            id="cv-publications-extra"
            className="pf-textarea"
            placeholder="Preprints, patents, under review…"
            value={form.publications}
            onChange={(e) => update("publications", e.target.value)}
          />
        </Field>
      </div>,
    );

    const grants = sectionStep(
      "grants",
      "Grants & awards",
      "What funding or recognition have you received?",
      "Grants, fellowships, scholarships and awards with the awarding body and the year.",
      <div className="pf-step-wide">
        <RowsEditor
          field="grantsRows"
          rows={form.grantsRows}
          blank={BLANK_GRANT_ROW}
          addLabel="+ Add a grant or award"
          titleKey="name"
          emptyTitle="New grant or award"
          fields={[
            [
              { name: "kind", aria: "Grant", options: GRANT_KINDS },
              { name: "name", aria: "Grant", placeholder: "Name" },
            ],
            [
              { name: "issuer", aria: "Grant", placeholder: "Awarding body" },
              { name: "year", aria: "Grant", placeholder: "Year" },
            ],
            { name: "detail", aria: "Grant", placeholder: "Amount / topic / role" },
          ]}
          onAdd={addRow}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
        <Field id="cv-grants-extra" label="Other funding or recognition">
          <textarea
            id="cv-grants-extra"
            className="pf-textarea"
            placeholder="Travel grants, reviewing awards…"
            value={form.grants}
            onChange={(e) => update("grants", e.target.value)}
          />
        </Field>
      </div>,
    );

    const talks = sectionStep(
      "talks",
      "Talks",
      "Where have you presented your work?",
      "Keynotes, invited talks, conference presentations and posters — event and year included.",
      <div className="pf-step-wide">
        <RowsEditor
          field="talksRows"
          rows={form.talksRows}
          blank={BLANK_TALK_ROW}
          addLabel="+ Add a talk"
          titleKey="title"
          emptyTitle="New talk"
          fields={[
            { name: "title", aria: "Talk", placeholder: "Talk title" },
            [
              { name: "kind", aria: "Talk", options: TALK_KINDS },
              { name: "event", aria: "Talk", placeholder: "Event / conference" },
            ],
            [
              { name: "year", aria: "Talk", placeholder: "Year" },
              { name: "location", aria: "Talk", placeholder: "City / country" },
            ],
          ]}
          onAdd={addRow}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
        <Field id="cv-talks-extra" label="Other talks">
          <textarea
            id="cv-talks-extra"
            className="pf-textarea"
            placeholder="Department seminars, guest lectures…"
            value={form.talks}
            onChange={(e) => update("talks", e.target.value)}
          />
        </Field>
      </div>,
    );

    const teaching = sectionStep(
      "teaching",
      "Teaching",
      "What have you taught or supervised?",
      "Course, your role, institution and years — plus the level (undergraduate, postgraduate, doctoral).",
      <div className="pf-step-wide">
        <RowsEditor
          field="teachingRows"
          rows={form.teachingRows}
          blank={BLANK_TEACHING_ROW}
          addLabel="+ Add a course"
          titleKey="course"
          emptyTitle="New course"
          fields={[
            { name: "course", aria: "Course", placeholder: "Course name" },
            [
              { name: "role", aria: "Course", placeholder: "Your role (Lecturer, TA…)" },
              { name: "institution", aria: "Course", placeholder: "Institution" },
            ],
            [
              { name: "level", aria: "Course", placeholder: "Level (UG / PG / PhD)" },
              { name: "period", aria: "Course", placeholder: "2019 - 2023" },
            ],
          ]}
          onAdd={addRow}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
        <Field id="cv-teaching-extra" label="Other teaching">
          <textarea
            id="cv-teaching-extra"
            className="pf-textarea"
            placeholder="Supervision, mentoring, curriculum design…"
            value={form.teaching}
            onChange={(e) => update("teaching", e.target.value)}
          />
        </Field>
      </div>,
    );

    const experience = sectionStep(
      "experience",
      "Experience",
      "Where have you worked or researched?",
      "One achievement per line. Keep research appointments and industry roles in their own box.",
      <div className="pf-step-wide">
        <Field id="cv-experience" label="Research and professional experience">
          <textarea
            id="cv-experience"
            className="pf-textarea lg"
            placeholder={
              "Assistant Professor, IIM Bangalore (2019 - present)\nBuilt the credit-risk lab and supervised 4 doctoral students"
            }
            value={form.experience}
            onChange={(e) => update("experience", e.target.value)}
          />
        </Field>
        <Field
          id="cv-research"
          label="Research positions & projects"
          hint="Postdoc, visiting positions, funded projects and the outcomes."
        >
          <textarea
            id="cv-research"
            className="pf-textarea"
            placeholder={
              "Postdoctoral Fellow, NUS (2019)\nHousehold debt project with the Monetary Authority of Singapore"
            }
            value={form.research || ""}
            onChange={(e) => update("research", e.target.value)}
          />
        </Field>
      </div>,
    );

    const skills = sectionStep(
      "skills",
      "Skills & methods",
      "Which methods and tools do you work with?",
      "Methods, instruments, software and languages — the first five are what a checklist is scanned for.",
      <div className="pf-step-wide">
        <textarea
          id="cv-skills"
          className="pf-textarea"
          placeholder="Statistics, machine learning, Python, R, Stata, qualitative interviews"
          value={form.skills}
          onChange={(e) => update("skills", e.target.value)}
        />
        <div className="pf-coach-row">
          <span className="pf-chip-label">Quick add</span>
          {METHOD_PRESETS.map((method) => (
            <button
              key={method}
              type="button"
              className="pf-chip"
              onClick={() => appendMethod(method)}
            >
              + {method}
            </button>
          ))}
        </div>
      </div>,
    );

    const references = sectionStep(
      "references",
      "Referees",
      "Who can vouch for your work?",
      "Two referees with role, institution and an official email. Ask them before you list them.",
      <div className="pf-step-wide">
        <RowsEditor
          field="referencesRows"
          rows={form.referencesRows}
          blank={BLANK_REFERENCE_ROW}
          addLabel="+ Add a referee"
          titleKey="name"
          emptyTitle="New referee"
          fields={[
            [
              { name: "name", aria: "Referee", placeholder: "Prof. R. Verma" },
              { name: "role", aria: "Referee", placeholder: "Role / title" },
            ],
            { name: "organization", aria: "Referee", placeholder: "Institution" },
            { name: "contact", aria: "Referee", placeholder: "Official email / phone" },
          ]}
          onAdd={addRow}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
        <Field id="cv-references-extra" label="Other referees or notes">
          <textarea
            id="cv-references-extra"
            className="pf-textarea"
            placeholder="References available on request…"
            value={form.references}
            onChange={(e) => update("references", e.target.value)}
          />
        </Field>
      </div>,
    );

    const extra = sectionStep(
      "extra",
      "Memberships",
      "Which professional bodies are you part of?",
      "Societies, editorial boards and reviewing roles — plus licences and certifications.",
      <div className="pf-step-wide">
        <Field id="cv-memberships" label="Professional memberships & service">
          <textarea
            id="cv-memberships"
            className="pf-textarea"
            placeholder={
              "American Finance Association\nReviewer for the Journal of Banking & Finance"
            }
            value={form.memberships || ""}
            onChange={(e) => update("memberships", e.target.value)}
          />
        </Field>
        <Field id="cv-certifications" label="Certifications & licences">
          <textarea
            id="cv-certifications"
            className="pf-textarea"
            placeholder="Chartered Financial Analyst (Level II), 2022"
            value={form.certifications || ""}
            onChange={(e) => update("certifications", e.target.value)}
          />
        </Field>
      </div>,
    );

    const eligibility = sectionStep(
      "eligibility",
      "Personal & eligibility",
      "What do overseas departments need to know?",
      "Nationality, languages and work authorization decide whether a department can hire you at all.",
      <div className="pf-step-wide">
        <div className="pf-grid-3">
          <Field id="cv-nationality" label="Nationality">
            <input
              id="cv-nationality"
              placeholder="Indian"
              value={form.nationality || ""}
              onChange={(e) => update("nationality", e.target.value)}
            />
          </Field>
          <Field id="cv-languages" label="Languages">
            <input
              id="cv-languages"
              placeholder="English (Fluent), Hindi (Native)"
              value={form.languages || ""}
              onChange={(e) => update("languages", e.target.value)}
            />
          </Field>
          <Field id="cv-marital-status" label="Marital status">
            <input
              id="cv-marital-status"
              placeholder="Single"
              value={form.maritalStatus || ""}
              onChange={(e) => update("maritalStatus", e.target.value)}
            />
          </Field>
        </div>

        <Field
          id="cv-work-authorization"
          label="Work authorization for overseas roles"
          hint="Say it plainly — sponsorship is the first thing an international search committee checks."
        >
          <input
            id="cv-work-authorization"
            placeholder="Requires work visa sponsorship"
            value={form.workAuthorization || ""}
            onChange={(e) => update("workAuthorization", e.target.value)}
          />
        </Field>

        <div className="pf-coach-row">
          <span className="pf-chip-label">Ready-made answers</span>
          {WORK_AUTH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`pf-chip ${form.workAuthorization === preset ? "pf-chip--active" : ""}`}
              onClick={() => update("workAuthorization", preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="pf-coach-row">
          <span className="pf-chip-label">Willing to relocate?</span>
          {RELOCATE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`pf-chip ${form.relocate === option ? "pf-chip--active" : ""}`}
              onClick={() => update("relocate", option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="pf-grid-3">
          <Field id="cv-passport" label="Passport no.">
            <input
              id="cv-passport"
              placeholder="M1234567"
              value={form.passport || ""}
              onChange={(e) => update("passport", e.target.value)}
            />
          </Field>
          <Field id="cv-nric" label="NRIC / FIN / national ID">
            <input
              id="cv-nric"
              placeholder="S7891234B"
              value={form.nric || ""}
              onChange={(e) => update("nric", e.target.value)}
            />
          </Field>
          <Field id="cv-dob" label="Date of birth">
            <input
              id="cv-dob"
              placeholder="14 Aug 1998"
              value={form.dob || ""}
              onChange={(e) => update("dob", e.target.value)}
            />
          </Field>
        </div>
      </div>,
    );

    const finalize = {
      id: "finalize",
      label: "Finalize",
      question: "Pick a layout and ship it.",
      hint: "The checklist below is what a search committee looks for — everything is saved to your workspace.",
      complete: checklist.missing.length === 0,
      body: (
        <div className="pf-step-wide">
          <div className="pf-tpl-grid">
            {CV_TEMPLATES.map((option) => (
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
                <span className={`pf-tpl-thumb pf-pv--${PREVIEW_MODIFIER[option.id]}`}>
                  <i />
                  <b />
                  <em />
                  <em />
                </span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
                {recommended.includes(option.id) && <span className="pf-tag">Recommended</span>}
              </button>
            ))}
          </div>

          <CvChecklist checklist={checklist} onJump={jumpToStep} />

          {imported && (
            <div className="pf-audit">
              <div className="pf-audit-top">
                <p className="pf-chip-label">Uploaded CV check</p>
                <span className="pf-audit-score">{imported.score}%</span>
              </div>
              <div className="pf-chip-row">
                {imported.checklist?.map((item, index) => (
                  <span key={index} className={`pf-check ${item.complete ? "ok" : "miss"}`}>
                    {item.complete ? "✓" : "✕"} {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {improvements.length > 0 && (
            <div className="pf-audit">
              <p className="pf-chip-label">Improvements found in your CV</p>
              <ul className="pf-tips">
                {improvements.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    };

    return [
      heading,
      profile,
      education,
      publications,
      grants,
      talks,
      teaching,
      experience,
      skills,
      references,
      extra,
      eligibility,
      finalize,
    ];
  }, [form, checklist, template, recommended, imported, improvements, photoBusy]);

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const active = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;
  const doneSteps = steps.filter((step) => step.complete).length;

  const handleGenerate = async () => {
    const missing = cvBlockingFields(form);
    if (missing.length > 0) {
      setError(`A CV needs: ${missing.join(", ")}. Fill those in before saving.`);
      return;
    }

    const result = await saveDocumentToBackend({
      _id: existingDocument?._id,
      type: "cv",
      template,
      title: `CV - ${form.name}`,
      data: form,
      generatedText: generateCVText(form, template),
    });

    if (!result.ok) {
      setError(result.message || "Failed to save document.");
      return;
    }

    await refreshDocuments();
    setActiveDocument(result.document);
    setPage("output");
  };

  return (
    <main className="pf-wizard">
      <aside className="pf-rail">
        <div className="pf-rail-brand">
          <span className="pf-rail-mark">CV</span>
          <div>
            <strong>ProfileForge</strong>
            <small>Academic CV studio</small>
          </div>
        </div>

        <nav aria-label="CV builder steps">
          <ol className="pf-steps">
            {steps.map((step, index) => {
              const state = index === safeIndex ? "active" : step.complete ? "done" : "pending";
              return (
                <li key={step.id} className={`pf-step pf-step--${state}`}>
                  <button
                    type="button"
                    onClick={() => jumpToStep(step.id)}
                    aria-current={index === safeIndex ? "step" : undefined}
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
            <strong>CV completeness</strong>
            <span aria-hidden="true">{checklist.score}%</span>
          </p>
          <div
            className="pf-progress"
            role="progressbar"
            aria-valuenow={checklist.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="CV completeness"
          >
            <i style={{ width: `${checklist.score}%` }} />
          </div>
          <p className="pf-hint">
            {doneSteps} of {steps.length} sections ready · {checklist.missing.length} to gather
          </p>
        </div>

        <CvChecklist checklist={checklist} onJump={jumpToStep} compact />

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
            <label className="pf-dropzone">
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} />
              <strong>{uploading ? "Reading your CV…" : "Already have a CV?"}</strong>
              <small>
                Upload a PDF, DOCX or TXT and we fill the CV sections we recognise — your typing
                always wins.
              </small>
            </label>
          </div>

          {active.body}

          {active.id === "finalize" && (
            <div className="pf-checklist">
              <p className="pf-chip-label">Before you save</p>
              {blocking.length === 0 ? (
                <p className="pf-check ok">✓ Everything the save needs is filled in.</p>
              ) : (
                <p className="pf-check miss">✕ Still needed to save: {blocking.join(", ")}</p>
              )}
              {checklist.missing.length > 0 && (
                <p className="pf-check soft">
                  ○ Worth adding: {checklist.missing.map((item) => item.label).join(", ")}
                </p>
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

          <button
            type="button"
            className="pf-btn primary"
            onClick={() => (isLast ? handleGenerate() : setStepIndex(safeIndex + 1))}
          >
            {isLast ? "Save & finish" : "Next step →"}
          </button>
        </div>
      </section>

      <aside className="pf-aside">
        <div className="pf-aside-card">
          <div className="pf-aside-top">
            <p className="pf-aside-label">Live CV preview</p>
            <span className="pf-aside-tpl">{template}</span>
          </div>
          <div className="pf-paper">
            <CvPreview form={form} template={template} />
          </div>
        </div>

        <CvChecklist checklist={checklist} onJump={jumpToStep} />

        <p className="pf-aside-foot">
          The checklist is scored on your device from the sections you filled — nothing is uploaded
          to grade it.
        </p>
      </aside>
    </main>
  );
}
