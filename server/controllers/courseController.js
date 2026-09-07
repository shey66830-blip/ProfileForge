import Course from "../models/Course.js";
import Certification from "../models/Certification.js";
import Enrollment from "../models/Enrollment.js";
import { getRecommendations } from "../services/recommendationEngine.js";

// GET /api/courses — list with filters
export async function listCourses(req, res) {
  try {
    const { category, provider, skill, difficulty, search, sort, limit = 50 } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    if (provider) q.provider = provider;
    if (difficulty) q.difficulty = difficulty;
    if (skill) q.skills = { $in: [new RegExp(skill, "i")] };
    if (search) q.$text = { $search: search };

    let query = Course.find(q);
    if (sort === "rating") query = query.sort({ rating: -1 });
    else if (sort === "price-low") query = query.sort({ "price.amount": 1 });
    else if (sort === "price-high") query = query.sort({ "price.amount": -1 });
    else query = query.sort({ rating: -1 });

    const courses = await query.limit(parseInt(limit)).lean();
    res.json({ ok: true, courses });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// GET /api/courses/recommended — AI recommendations based on missing skills
export async function recommendedCourses(req, res) {
  try {
    const { missingSkills = [], matchedSkills = [], category } = req.query;
    const ms = typeof missingSkills === "string" ? missingSkills.split(",").filter(Boolean) : missingSkills;
    const mts = typeof matchedSkills === "string" ? matchedSkills.split(",").filter(Boolean) : matchedSkills;
    const result = await getRecommendations(ms, mts, { category });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// GET /api/courses/:id
export async function getCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ ok: false, message: "Course not found" });
    res.json({ ok: true, course });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// GET /api/certifications — list with filters
export async function listCertifications(req, res) {
  try {
    const { category, difficulty, skill, search, limit = 50 } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    if (difficulty) q.difficulty = difficulty;
    if (skill) q.skills = { $in: [new RegExp(skill, "i")] };
    if (search) q.$text = { $search: search };

    const certs = await Certification.find(q).sort({ name: 1 }).limit(parseInt(limit)).lean();
    res.json({ ok: true, certifications: certs });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// GET /api/certifications/recommended
export async function recommendedCertifications(req, res) {
  try {
    const { missingSkills = [] } = req.query;
    const ms = typeof missingSkills === "string" ? missingSkills.split(",").filter(Boolean) : missingSkills;
    const result = await getRecommendations(ms, [], {});
    res.json({ ok: true, certifications: result.certifications });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// GET /api/certifications/:id
export async function getCertification(req, res) {
  try {
    const cert = await Certification.findById(req.params.id).lean();
    if (!cert) return res.status(404).json({ ok: false, message: "Certification not found" });
    res.json({ ok: true, certification: cert });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// POST /api/courses/enrolled — enroll in a course
export async function enrollCourse(req, res) {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ ok: false, message: "courseId required" });
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ ok: false, message: "Course not found" });

    const existing = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (existing) return res.json({ ok: true, enrollment: existing, message: "Already enrolled" });

    const enrollment = await Enrollment.create({ user: req.user._id, course: courseId });
    res.json({ ok: true, enrollment });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// GET /api/courses/enrolled/my — user's enrollments
export async function myEnrollments(req, res) {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate("course")
      .sort({ enrolledAt: -1 })
      .lean();
    res.json({ ok: true, enrollments });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}
