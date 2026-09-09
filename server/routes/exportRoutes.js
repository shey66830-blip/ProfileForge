import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { exportATSHtml, validateExport } from "../controllers/exportController.js";

const router = express.Router();

// All export routes require authentication
router.use(protect);

// ATS-safe HTML export (generates HTML + plain-text + validation warnings)
router.post("/ats-html", exportATSHtml);

// Validate a document for ATS compatibility (returns warnings only)
router.post("/validate", validateExport);

export default router;
