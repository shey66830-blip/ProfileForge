import { z } from "zod";

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
  provider: z.string().optional(),
  model: z.string().optional(),
});

const aiAnalysisSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
  jobTitle: z.string().optional(),
  jobCompany: z.string().optional(),
  jobDescription: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});

const aiCompareSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
  jobTitle: z.string().optional(),
  jobCompany: z.string().optional(),
  jobDescription: z.string().optional(),
  providerA: z.string().optional(),
  modelA: z.string().optional(),
  providerB: z.string().optional(),
  modelB: z.string().optional(),
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      let message = "Validation failed. Please check your input.";
      try {
        const issues = result.error && result.error.errors;
        if (issues && issues.length) {
          // Human-readable: first issue's field + message, never the raw zod dump.
          const first = issues[0];
          const field = Array.isArray(first.path) && first.path.length ? first.path.join(".") : "";
          message = [field, first.message || "Invalid input"].filter(Boolean).join(": ");
        }
      } catch (e) {
        // best-effort: keep the generic message
      }
      return res.json({ ok: false, message });
    }
    req.validatedBody = result.data;
    next();
  };
}

export { signupSchema, loginSchema, documentSchema, aiEditSchema, aiAnalysisSchema, aiCompareSchema };
