import express from "express";
import {
  createOrUpdateApplication,
  getApplications,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createOrUpdateApplication);
router.get("/", protect, getApplications);
router.put("/:id", protect, updateApplication);
router.delete("/:id", protect, deleteApplication);

export default router;
