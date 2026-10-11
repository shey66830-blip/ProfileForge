import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate, tailoringRequestSchema, tailoringApplySchema } from "../middleware/validate.js";
import { z } from "zod";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { requirePlan, checkFeatureLimit } from "../middleware/planGate.js";
import {
  generateSuggestions,
  applyTailoring,
  getVersions,
  revertToVersion,
  batchTailoring,
} from "../controllers/tailoringController.js";

const router = express.Router();

// All tailoring routes require authentication
router.use(protect);

// Generate structured suggestions (rate-limited, uses AI).
// Premium-only feature: free users get a clean 403 with an upgrade hint;
// premium users are capped at 10/day, pro is unlimited.
router.post(
  "/suggest",
  requirePlan("tailoring"),
  aiLimiter,
  checkFeatureLimit("tailoring"),
  validate(tailoringRequestSchema),
  generateSuggestions,
);

// Apply accepted suggestions to create a new tailored version (no AI call,
// so no daily cap — but still premium-gated).
router.post("/apply", requirePlan("tailoring"), validate(tailoringApplySchema), applyTailoring);

// Version management
router.get("/versions/:documentId", getVersions);
router.post("/revert/:documentId", revertToVersion);

// PRO-only batch mode: tailor up to 10 documents against one JD.
router.post(
  "/batch",
  requirePlan("batchTailoring"),
  aiLimiter,
  validate(
    z.object({
      documentIds: z.array(z.string().min(1)).min(1).max(10),
      jobDescription: z.string().min(1, "Job description is required"),
      jobTitle: z.string().optional(),
      jobCompany: z.string().optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
    }),
  ),
  batchTailoring,
);

export default router;
