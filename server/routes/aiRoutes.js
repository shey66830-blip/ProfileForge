import express from "express";
import { editDocument, analyzeResumeEndpoint, generateCoverLetter, analyzeResumeJob, compareResumeJob } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate, aiEditSchema, aiAnalysisSchema, aiCompareSchema } from "../middleware/validate.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ ok: true, message: "AI route working" });
});

router.post("/edit-document", protect, aiLimiter, validate(aiEditSchema), editDocument);
router.post("/analyze-resume", protect, analyzeResumeEndpoint);
router.post("/generate-cover-letter", protect, aiLimiter, generateCoverLetter);
router.post("/analyze-resume-job", protect, aiLimiter, validate(aiAnalysisSchema), analyzeResumeJob);
router.post("/compare-resume-job", protect, aiLimiter, validate(aiCompareSchema), compareResumeJob);

export default router;