import React, { useState } from "react";
import { enrollCourse } from "../../services/courseService.js";

const PROVIDER_COLORS = {
  Scaler: "#e74c3c",
  "PW Skills": "#2ecc71",
  Udemy: "#a855f7",
  Coursera: "#0056d2",
  edX: "#02262b",
  HackerRank: "#2ec866",
  freeCodeCamp: "#0a0a23",
  "LinkedIn Learning": "#0077b5",
  ProfileForge: "#6c5ce7",
};

export default function CourseCard({ course, missingSkills = [], isPremium = false, onEnroll }) {
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const color = PROVIDER_COLORS[course.provider] || "#6c5ce7";

  const coveredCount = (course.coveredSkills || []).length;
  const totalMissing = missingSkills.length;

  async function handleEnroll() {
    if (!isPremium && course.price && !course.price.isFree) return;
    setEnrolling(true);
    const result = await enrollCourse(course._id);
    if (result.ok) { setEnrolled(true); onEnroll && onEnroll(course); }
    setEnrolling(false);
  }

  return (
    <div className="course-card" style={{ borderLeftColor: color }}>
      <div className="course-card-header">
        <span className="provider-badge" style={{ background: color + "22", color, borderColor: color + "44" }}>
          {course.provider}
        </span>
        {course.difficulty && (
          <span className={`difficulty-badge difficulty-${course.difficulty.toLowerCase()}`}>
            {course.difficulty}
          </span>
        )}
      </div>

      <h3 className="course-card-title">{course.title}</h3>
      <p className="course-card-desc">{course.description?.slice(0, 120)}{course.description?.length > 120 ? "..." : ""}</p>

      <div className="course-card-meta">
        {course.duration && <span>⏱ {course.duration}</span>}
        {course.rating > 0 && (
          <span className="rating-stars">
            {"★".repeat(Math.floor(course.rating))}{"☆".repeat(5 - Math.floor(course.rating))} {course.rating}
          </span>
        )}
      </div>

      <div className="course-card-price">
        {course.price?.isFree ? (
          <span className="price-free">FREE</span>
        ) : (
          <span className="price-paid">{course.price?.currency === "USD" ? "$" : "\u20B9"}{course.price?.amount?.toLocaleString()}</span>
        )}
        {course.certificationProvided && <span className="cert-badge">📜 Certificate</span>}
      </div>

      {course.skills?.length > 0 && (
        <div className="course-card-skills">
          {course.skills.slice(0, 5).map((s, i) => (
            <span key={i} className="skill-chip">{s}</span>
          ))}
        </div>
      )}

      {coveredCount > 0 && totalMissing > 0 && (
        <div className="skill-match-bar">
          <div className="skill-match-label">Covers {coveredCount} of {totalMissing} missing skills</div>
          <div className="skill-match-track">
            <div className="skill-match-fill" style={{ width: (coveredCount / totalMissing) * 100 + "%" }} />
          </div>
        </div>
      )}

      <div className="course-card-actions">
        {enrolled ? (
          <span className="enrolled-badge">✓ Enrolled</span>
        ) : (
          <button
            className="primary-btn small"
            onClick={handleEnroll}
            disabled={enrolling}
            style={{ flex: 1 }}
          >
            {enrolling ? "Enrolling..." : course.url ? "Enroll & Open" : "Enroll"}
          </button>
        )}
        {course.url && course.url !== "#" && (
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ghost-btn small"
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            Visit Course
          </a>
        )}
      </div>
    </div>
  );
}
