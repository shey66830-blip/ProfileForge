import express from "express";
import { saveJob, getSavedJobs, unsaveJob, checkJobSaved } from "../controllers/savedJobController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, saveJob);
router.get("/", protect, getSavedJobs);
router.delete("/:jobId", protect, unsaveJob);
router.get("/check/:jobId", protect, checkJobSaved);

export default router;
