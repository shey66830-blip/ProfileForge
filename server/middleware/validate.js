import { z } from "zod";

// AI provider/model allowlist — must match server/services/aiProvider.js
const AI_PROVIDERS = ["openai", "experiential"];
const AI_MODELS = ["gpt-4o-mini", "gpt-6-astra", "claude-fable-5.1"];
const aiProviderEnum = z.string().optional().refine(
  (val) => !val || AI_PROVIDERS.includes(val),
  { message: `Provider must be one of: ${AI_PROVIDERS.join(", ")}` }
);
const aiModelEnum = z.string().optional().refine(
  (val) => !val || AI_MODELS.includes(val),
  { message: `Model must be one of: ${AI_MODELS.join(", ")}` }
);

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(4, "Username must be at least 4 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const documentSchema = z.object({
  type: z.enum(["resume", "cv", "biodata"]),
  title: z.string().optional(),
  data: z.record(z.any()).optional(),
  generatedText: z.string().optional(),
});

const aiEditSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  instruction: z.string().min(1, "Instruction is required"),
  provider: aiProviderEnum,
  model: aiModelEnum,
});

const aiAnalysisSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
  jobTitle: z.string().optional(),
  jobCompany: z.string().optional(),
  jobDescription: z.string().optional(),
  provider: aiProviderEnum,
  model: aiModelEnum,
});

const aiCompareSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
  jobTitle: z.string().optional(),
  jobCompany: z.string().optional(),
  jobDescription: z.string().optional(),
  providerA: aiProviderEnum,
  modelA: aiModelEnum,
  providerB: aiProviderEnum,
  modelB: aiModelEnum,
});

// ── Profile schemas ─────────────────────────────────────────────

const provenanceShape = z.object({
  source: z.enum(["user", "imported", "ai_suggestion"]).optional(),
  verified: z.boolean().optional(),
}).partial().optional();

const profileContactSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(300).optional(),
});

const profileSkillSchema = z.object({
  name: z.string().min(1).max(100),
  provenance: provenanceShape,
});

const profileExperienceSchema = z.object({
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  startDate: z.string().max(30).optional(),
  endDate: z.string().max(30).optional(),
  description: z.string().max(5000).optional(),
  current: z.boolean().optional(),
  provenance: provenanceShape,
});

const profileEducationSchema = z.object({
  degree: z.string().max(200).optional(),
  institution: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  startDate: z.string().max(30).optional(),
  endDate: z.string().max(30).optional(),
  gpa: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  provenance: provenanceShape,
});

const profileProjectSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(3000).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  technologies: z.array(z.string().max(100)).max(20).optional(),
  startDate: z.string().max(30).optional(),
  endDate: z.string().max(30).optional(),
  provenance: provenanceShape,
});

const profileCertificationSchema = z.object({
  name: z.string().max(200).optional(),
  issuer: z.string().max(200).optional(),
  date: z.string().max(30).optional(),
  expiryDate: z.string().max(30).optional(),
  credentialId: z.string().max(200).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  provenance: provenanceShape,
});

const profileLinkSchema = z.object({
  label: z.string().max(100).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  provenance: provenanceShape,
});

const profileJobPreferencesSchema = z.object({
  desiredTitle: z.string().max(200).optional(),
  desiredSalary: z.string().max(100).optional(),
  workMode: z.enum(["remote", "hybrid", "onsite", "any", ""]).optional(),
  locations: z.array(z.string().max(100)).max(10).optional(),
  openToRelocate: z.boolean().optional(),
  provenance: provenanceShape,
});

// Full profile update — all sections optional, validated individually
const profileUpdateSchema = z.object({
  contact: profileContactSchema.optional(),
  summary: z.string().max(5000).optional(),
  skills: z.array(profileSkillSchema).max(100).optional(),
  experience: z.array(profileExperienceSchema).max(50).optional(),
  education: z.array(profileEducationSchema).max(20).optional(),
  projects: z.array(profileProjectSchema).max(30).optional(),
  certifications: z.array(profileCertificationSchema).max(30).optional(),
  links: z.array(profileLinkSchema).max(20).optional(),
  jobPreferences: profileJobPreferencesSchema.optional(),
});

// Import from extracted fields — the upload route posts extracted fields
// to create a draft profile for review.
const profileImportSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  contact: profileContactSchema.optional(),
  summary: z.string().max(5000).optional(),
  skills: z.array(z.string().max(100)).max(100).optional(),
  experience: z.array(profileExperienceSchema).max(50).optional(),
  education: z.array(profileEducationSchema).max(20).optional(),
  projects: z.array(profileProjectSchema).max(30).optional(),
  certifications: z.array(profileCertificationSchema).max(30).optional(),
  links: z.array(profileLinkSchema).max(20).optional(),
  jobPreferences: profileJobPreferencesSchema.optional(),
});

// Accept/reject AI suggestions
const profileSuggestionActionSchema = z.object({
  suggestionId: z.string().min(1, "Suggestion ID is required"),
  accept: z.boolean(),
});

// Promote draft to canonical
const profilePromoteSchema = z.object({}); // no body needed

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      let message = "Validation failed. Please check your input.";
      try {
        const issues = result.error && (result.error.issues || result.error.errors);
        if (issues && issues.length) {
          // Human-readable: first issue's field + message, never the raw zod dump.
          const first = issues[0];
          const field = Array.isArray(first.path) && first.path.length ? first.path.join(".") : "";
          message = [field, first.message || "Invalid input"].filter(Boolean).join(": ");
        }
      } catch {
        // best-effort: keep the generic message
      }
      return res.json({ ok: false, message });
    }
    req.validatedBody = result.data;
    next();
  };
}

// ── Tailoring schemas ─────────────────────────────────────────────

const tailoringRequestSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  jobDescription: z.string().min(1, "Job description is required").max(10000),
  jobTitle: z.string().max(200).optional(),
  jobCompany: z.string().max(200).optional(),
  instruction: z.string().max(2000).optional(),
  provider: aiProviderEnum,
  model: aiModelEnum,
});

const tailoringApplySchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  suggestions: z.array(z.object({
    id: z.string(),
    accepted: z.boolean(),
  })).min(1).max(20),
});

// ── Application schemas ───────────────────────────────────────────

const APPLICATION_STATUSES = [
  "saved", "preparing", "applied", "screening",
  "interview", "offer", "accepted", "rejected", "withdrawn",
];

const applicationCreateSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(5000).optional(),
  nextAction: z.string().max(200).optional(),
  followUpAt: z.string().optional(), // ISO date string
  documentId: z.string().optional(),
  resumeVersionId: z.string().optional(),
  coverLetterVersionId: z.string().optional(),
  jobSnapshot: z.object({
    title: z.string().max(200).optional(),
    company: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    source: z.string().max(100).optional(),
    description: z.string().max(10000).optional(),
    salary: z.any().optional(),
    applyUrl: z.string().max(500).optional(),
    skills: z.array(z.string().max(100)).max(50).optional(),
  }).optional(),
});

const applicationUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(5000).optional(),
  nextAction: z.string().max(200).optional(),
  followUpAt: z.string().optional(),
  documentId: z.string().optional(),
  resumeVersionId: z.string().optional(),
  coverLetterVersionId: z.string().optional(),
  jobSnapshot: z.object({
    title: z.string().max(200).optional(),
    company: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    source: z.string().max(100).optional(),
    description: z.string().max(10000).optional(),
    salary: z.any().optional(),
    applyUrl: z.string().max(500).optional(),
    skills: z.array(z.string().max(100)).max(50).optional(),
  }).optional(),
});

// ── Reverse job board schemas ─────────────────────────────────────

const reversePostSchema = z.object({
  headline: z.string().min(4, "Headline must be at least 4 characters").max(200),
  why: z.string().max(5000).optional(),
  skills: z.array(z.string().min(1).max(100)).max(40).optional(),
  workMode: z.enum(["remote", "hybrid", "onsite", "any"]).optional(),
  locations: z.array(z.string().min(1).max(200)).max(20).optional(),
  openToRelocate: z.boolean().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship", "any"]).optional(),
  expectedSalary: z.string().max(100).optional(),
  availability: z.string().max(100).optional(),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "paused", "closed"]).optional(),
});

const reverseInquirySchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
});

const reverseInquiryActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export {
  signupSchema, loginSchema, documentSchema,
  aiEditSchema, aiAnalysisSchema, aiCompareSchema,
  profileUpdateSchema, profileImportSchema, profileSuggestionActionSchema, profilePromoteSchema,
  tailoringRequestSchema, tailoringApplySchema,
  applicationCreateSchema, applicationUpdateSchema, APPLICATION_STATUSES,
  reversePostSchema, reverseInquirySchema, reverseInquiryActionSchema,
};
