import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate, tailoringRequestSchema, tailoringApplySchema } from "../middleware/validate.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  generateSuggestions,
  applyTailoring,
  getVersions,
  revertToVersion,
} from "../controllers/tailoringController.js";

const router = express.Router();

// All tailoring routes require authentication
router.use(protect);

// Generate structured suggestions (rate-limited, uses AI)
router.post("/suggest", aiLimiter, validate(tailoringRequestSchema), generateSuggestions);

// Apply accepted suggestions to create a new tailored version
router.post("/apply", validate(tailoringApplySchema), applyTailoring);

// Version management
router.get("/versions/:documentId", getVersions);
router.post("/revert/:documentId", revertToVersion);

export default router;
