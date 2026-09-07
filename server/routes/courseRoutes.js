import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  listCourses,
  recommendedCourses,
  getCourse,
  listCertifications,
  recommendedCertifications,
  getCertification,
  enrollCourse,
  myEnrollments,
} from "../controllers/courseController.js";

const router = express.Router();

// Courses
router.get("/", listCourses);
router.get("/recommended", protect, recommendedCourses);
router.get("/enrolled/my", protect, myEnrollments);
router.post("/enrolled", protect, enrollCourse);
router.get("/:id", getCourse);

// Certifications (mounted at /api/certifications)
const certRouter = express.Router();
certRouter.get("/", listCertifications);
certRouter.get("/recommended", protect, recommendedCertifications);
certRouter.get("/:id", getCertification);

export { certRouter };
export default router;
