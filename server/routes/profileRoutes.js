import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate, profileUpdateSchema, profileImportSchema, profileSuggestionActionSchema } from "../middleware/validate.js";
import {
  getProfile,
  updateProfile,
  importProfile,
  promoteProfile,
  applySuggestion,
  dismissAllSuggestions,
  deleteProfile,
} from "../controllers/profileController.js";

const router = express.Router();

// All profile routes require authentication
router.use(protect);

// CRUD
router.get("/", getProfile);
router.put("/", validate(profileUpdateSchema), updateProfile);
router.delete("/", deleteProfile);

// Import-review flow
router.post("/import", validate(profileImportSchema), importProfile);
router.post("/promote", promoteProfile);

// AI suggestions
router.post("/suggestions/apply", validate(profileSuggestionActionSchema), applySuggestion);
router.post("/suggestions/dismiss-all", dismissAllSuggestions);

export default router;
