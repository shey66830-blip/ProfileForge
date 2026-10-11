import express from "express";
import { findMatches } from "../controllers/matchmakingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePlan } from "../middleware/planGate.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const findSchema = z.object({
  documentId: z.string().min(1, "Biodata document ID is required"),
  scope: z.enum(["city", "country", "abroad", "both", "specific"]).default("country"),
  specificLocation: z.string().max(100).optional().default(""),
});

const router = express.Router();

// Matchmaking Engine is a Premium feature.
router.post("/find", protect, requirePlan("matchmaking"), validate(findSchema), findMatches);

export default router;
