import express from "express";
import {
  createOrUpdateApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getTransitions,
} from "../controllers/applicationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate, applicationCreateSchema, applicationUpdateSchema } from "../middleware/validate.js";

const router = express.Router();

// All application routes require authentication
router.use(protect);

// CRUD
router.post("/", validate(applicationCreateSchema), createOrUpdateApplication);
router.get("/", getApplications);
router.get("/transitions/:status", getTransitions);
router.get("/:id", getApplicationById);
router.put("/:id", validate(applicationUpdateSchema), updateApplication);
router.delete("/:id", deleteApplication);

export default router;
