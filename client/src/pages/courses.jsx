import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CourseCard from "../components/courses/CourseCard.jsx";
import CertificationCard from "../components/courses/CertificationCard.jsx";
import LearningPath from "../components/courses/LearningPath.jsx";
import { getCourses, getRecommendedCourses, getCertifications, getRecommendedCertifications, getEnrolledCourses } from "../services/courseService.js";
import { AppContext } from "../App.jsx";

const TABS = ["Recommended", "All Courses", "Certifications", "My Learning"];
const CATEGORIES = ["Web Development", "Data Science", "Cloud", "DevOps", "AI/ML", "Computer Science", "Design", "Mobile", "Security"];

export default function Courses({ missingSkills = [] }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSkills = searchParams.get("skill") ? searchParams.get("skill").split(",") : [];
  const urlCerts = searchParams.get("cert") ? searchParams.get("cert").split(",") : [];
  const [tab, setTab] = useState("Recommended");
  const { isPremium } = React.useContext(AppContext);
  const [loading, setLoading] = useState(true);

  // Recommended
  const [recCourses, setRecCourses] = useState([]);
  const [recCerts, setRecCerts] = useState([]);
  const [learningPath, setLearningPath] = useState(null);

  // All Courses
  const [allCourses, setAllCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState({ category: "", provider: "", difficulty: "", search: "", sort: "rating" });

  // Certifications
  const [allCerts, setAllCerts] = useState([]);
  const [certFilter, setCertFilter] = useState({ category: "", difficulty: "", search: "" });

  // My Learning
  const [enrollments, setEnrollments] = useState([]);

  // Auto-switch tab based on URL params
  useEffect(() => {
    if (urlCerts.length > 0) setTab("Certifications");
    else if (urlSkills.length > 0) setTab("Recommended");
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === "Recommended") loadRecommended();
    else if (tab === "All Courses") loadAllCourses();
    else if (tab === "Certifications") loadAllCerts();
    else if (tab === "My Learning") loadMyLearning();
  }, [tab, courseFilter, certFilter]);

  async function loadRecommended() {
    const skills = urlSkills.length > 0 ? urlSkills : (missingSkills.length > 0 ? missingSkills : ["javascript", "react", "python"]);
    const [cRes, certRes] = await Promise.all([
      getRecommendedCourses(skills),
      getRecommendedCertifications(skills),
    ]);
    setRecCourses(cRes.courses || []);
    setRecCerts(certRes.certifications || []);
    setLearningPath(cRes.learningPath || null);
    setLoading(false);
  }

  async function loadAllCourses() {
    const res = await getCourses(courseFilter);
    setAllCourses(res.courses || []);
    setLoading(false);
  }

  async function loadAllCerts() {
    const filter = urlCerts.length > 0 ? { ...certFilter, search: urlCerts.join(",") } : certFilter;
    const res = await getCertifications(filter);
    setAllCerts(res.certifications || []);
    setLoading(false);
  }

  async function loadMyLearning() {
    const res = await getEnrolledCourses();
    setEnrollments(res.enrollments || []);
    setLoading(false);
  }

  const lockedCourses = !isPremium ? recCourses.slice(2) : [];
  const visibleCourses = !isPremium ? recCourses.slice(0, 2) : recCourses;

  return (
    <main className="courses-page">
      <section className="card">
        <p className="eyebrow">Learning Hub</p>
        <h1>Upskill with Recommended Courses</h1>
        <p className="muted">AI-powered recommendations based on your skill gaps and career goals.</p>
      </section>

      {/* Tab bar */}
      <div className="courses-tabs">
        {TABS.map(t => (
          <button key={t} className={`courses-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "Recommended" && "✨ "}
            {t === "All Courses" && "📖 "}
            {t === "Certifications" && "📜 "}
            {t === "My Learning" && "🎓 "}
            {t}
          </button>
        ))}
      </div>

      {/* Recommended Tab */}
      {tab === "Recommended" && (
        <div className="courses-content">
          {!isPremium && (
            <div className="premium-banner card">
              <span>⭐</span>
              <div>
                <h3>Premium Feature</h3>
                <p>Unlock AI-powered course recommendations, learning paths, and enrollment tracking.</p>
              </div>
              <button className="primary-btn small" onClick={() => nav("/premium")}>Upgrade</button>
            </div>
          )}

          {learningPath && (
            <LearningPath path={learningPath} />
          )}

          <h2>Recommended Courses</h2>
          {loading ? <p className="muted">Loading recommendations...</p> : (
            <div className="courses-grid">
              {visibleCourses.map(c => <CourseCard key={c._id} course={c} missingSkills={missingSkills} isPremium={isPremium} />)}
            </div>
          )}

          {lockedCourses.length > 0 && (
            <div className="premium-locked-section">
              <div className="courses-grid blurred">
                {lockedCourses.map(c => <CourseCard key={c._id} course={c} missingSkills={missingSkills} isPremium={false} />)}
              </div>
              <div className="premium-overlay">
                <button className="primary-btn" onClick={() => nav("/premium")}>Unlock All Recommendations with Premium</button>
              </div>
            </div>
          )}

          {recCerts.length > 0 && (
            <>
              <h2 style={{ marginTop: 32 }}>Recommended Certifications</h2>
              <div className="certs-grid">
                {(isPremium ? recCerts : recCerts.slice(0, 2)).map(c => (
                  <CertificationCard key={c._id} cert={c} missingSkills={missingSkills} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* All Courses Tab */}
      {tab === "All Courses" && (
        <div className="courses-content">
          <div className="courses-filters">
            <input
              className="courses-search"
              placeholder="Search courses..."
              value={courseFilter.search}
              onChange={e => setCourseFilter(p => ({ ...p, search: e.target.value }))}
            />
            <select value={courseFilter.category} onChange={e => setCourseFilter(p => ({ ...p, category: e.target.value }))}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={courseFilter.difficulty} onChange={e => setCourseFilter(p => ({ ...p, difficulty: e.target.value }))}>
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <select value={courseFilter.sort} onChange={e => setCourseFilter(p => ({ ...p, sort: e.target.value }))}>
              <option value="rating">Top Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          {loading ? <p className="muted">Loading courses...</p> : (
            <div className="courses-grid">
              {allCourses.map(c => <CourseCard key={c._id} course={c} missingSkills={missingSkills} isPremium={isPremium} />)}
            </div>
          )}
          {!loading && allCourses.length === 0 && <div className="card" style={{ textAlign: "center", padding: 40 }}><p>No courses found.</p></div>}
        </div>
      )}

      {/* Certifications Tab */}
      {tab === "Certifications" && (
        <div className="courses-content">
          <div className="courses-filters">
            <input
              className="courses-search"
              placeholder="Search certifications..."
              value={certFilter.search}
              onChange={e => setCertFilter(p => ({ ...p, search: e.target.value }))}
            />
            <select value={certFilter.category} onChange={e => setCertFilter(p => ({ ...p, category: e.target.value }))}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={certFilter.difficulty} onChange={e => setCertFilter(p => ({ ...p, difficulty: e.target.value }))}>
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          {loading ? <p className="muted">Loading certifications...</p> : (
            <div className="certs-grid">
              {allCerts.map(c => <CertificationCard key={c._id} cert={c} missingSkills={missingSkills} />)}
            </div>
          )}
        </div>
      )}

      {/* My Learning Tab */}
      {tab === "My Learning" && (
        <div className="courses-content">
          {loading ? <p className="muted">Loading your courses...</p> : enrollments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 50 }}>
              <h2>No courses enrolled yet</h2>
              <p className="muted">Start learning by enrolling in a course from the Recommended or All Courses tab.</p>
              <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => setTab("Recommended")}>Browse Courses</button>
            </div>
          ) : (
            <div className="enrollments-list">
              {enrollments.map(e => (
                <div key={e._id} className="card enrollment-card">
                  <div className="enrollment-info">
                    <h3>{e.course?.title || "Course"}</h3>
                    <p className="muted">{e.course?.provider} • Enrolled {new Date(e.enrolledAt).toLocaleDateString()}</p>
                  </div>
                  <div className="enrollment-progress">
                    <div className="enrollment-bar-bg">
                      <div className="enrollment-bar-fill" style={{ width: e.progress + "%" }} />
                    </div>
                    <span className="muted">{e.progress}%</span>
                  </div>
                  <span className={`enrollment-status status-${e.status}`}>{e.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
