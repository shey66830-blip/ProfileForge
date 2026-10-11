import express from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePlan } from "../middleware/planGate.js";

const router = express.Router();

// Advanced Analytics is a Pro-only feature — enforced here, not just in the UI.
router.get("/", protect, requirePlan("analytics"), getAnalytics);

export default router;
