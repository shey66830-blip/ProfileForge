import express from "express";
import {
  editDocument,
  analyzeResumeEndpoint,
  generateCoverLetter,
  analyzeResumeJob,
  compareResumeJob,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validate,
  aiEditSchema,
  aiAnalysisSchema,
  aiCompareSchema,
} from "../middleware/validate.js";
import { planAiLimiter } from "../middleware/rateLimiter.js";
import { checkFeatureLimit } from "../middleware/planGate.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ ok: true, message: "AI route working" });
});

// Daily plan limits (free 3, premium 50, pro unlimited) + per-minute
// priority limits (free 6, premium 12, pro 30).
router.post(
  "/edit-document",
  protect,
  planAiLimiter,
  checkFeatureLimit("aiEdits"),
  validate(aiEditSchema),
  editDocument,
);
router.post("/analyze-resume", protect, analyzeResumeEndpoint);
router.post(
  "/generate-cover-letter",
  protect,
  planAiLimiter,
  checkFeatureLimit("coverLetter"),
  generateCoverLetter,
);
router.post(
  "/analyze-resume-job",
  protect,
  planAiLimiter,
  validate(aiAnalysisSchema),
  analyzeResumeJob,
);
router.post(
  "/compare-resume-job",
  protect,
  planAiLimiter,
  validate(aiCompareSchema),
  compareResumeJob,
);

export default router;
