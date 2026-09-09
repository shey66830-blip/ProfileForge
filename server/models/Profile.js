import mongoose from "mongoose";

// ── Provenance sub-schema ──────────────────────────────────────────
// Every piece of profile data carries its origin so the UI and
// guardrails can distinguish user-entered facts from imported
// resume text and AI-generated suggestions.
const provenanceSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["user", "imported", "ai_suggestion"],
      default: "user",
    },
    verified: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Section item schemas ───────────────────────────────────────────

const skillItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

const experienceItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    description: { type: String, default: "" },
    current: { type: Boolean, default: false },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

const educationItemSchema = new mongoose.Schema(
  {
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    gpa: { type: String, default: "" },
    description: { type: String, default: "" },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

const projectItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    url: { type: String, default: "" },
    technologies: [{ type: String }],
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

const certificationItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    issuer: { type: String, default: "" },
    date: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    credentialId: { type: String, default: "" },
    url: { type: String, default: "" },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

const linkItemSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    url: { type: String, default: "" },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

const jobPreferencesSchema = new mongoose.Schema(
  {
    desiredTitle: { type: String, default: "" },
    desiredSalary: { type: String, default: "" },
    workMode: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "any", ""],
      default: "",
    },
    locations: [{ type: String }],
    openToRelocate: { type: Boolean, default: false },
    provenance: { type: provenanceSchema, default: () => ({}) },
  },
  { _id: false }
);

// ── AI suggestion sub-document ─────────────────────────────────────
// Suggestions live in a separate array so they never silently
// overwrite verified profile facts. The user must explicitly
// accept each one, at which point it is moved into the profile
// section with source "ai_suggestion" and verified: false.
const aiSuggestionSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      enum: [
        "summary",
        "skills",
        "experience",
        "education",
        "projects",
        "certifications",
        "links",
        "jobPreferences",
      ],
    },
    action: {
      type: String,
      enum: ["add", "update", "remove"],
      required: true,
    },
    field: { type: String, default: "" },
    currentValue: { type: mongoose.Schema.Types.Mixed },
    suggestedValue: { type: mongoose.Schema.Types.Mixed },
    reasoning: { type: String, default: "" },
    accepted: { type: Boolean, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ── Main profile schema ────────────────────────────────────────────

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Status controls the import-review flow:
    //  "draft"     — created by upload/import, not yet reviewed by user
    //  "canonical" — user has reviewed and confirmed; this is the source of truth
    status: {
      type: String,
      enum: ["draft", "canonical"],
      default: "draft",
    },

    // Contact
    contact: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      provenance: { type: provenanceSchema, default: () => ({}) },
    },

    // Summary / objective
    summary: { type: String, default: "" },
    summaryProvenance: { type: provenanceSchema, default: () => ({}) },

    // Skills
    skills: { type: [skillItemSchema], default: [] },

    // Experience
    experience: { type: [experienceItemSchema], default: [] },

    // Education
    education: { type: [educationItemSchema], default: [] },

    // Projects
    projects: { type: [projectItemSchema], default: [] },

    // Certifications
    certifications: { type: [certificationItemSchema], default: [] },

    // Links (portfolio, LinkedIn, GitHub, etc.)
    links: { type: [linkItemSchema], default: [] },

    // Job preferences
    jobPreferences: { type: jobPreferencesSchema, default: () => ({}) },

    // AI suggestions pending review — never auto-applied
    suggestions: { type: [aiSuggestionSchema], default: [] },

    // Reference to the Document this profile was imported from
    importedFromDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
  },
  { timestamps: true }
);

// One profile per user
profileSchema.index({ user: 1 }, { unique: true });

export default mongoose.model("Profile", profileSchema);
