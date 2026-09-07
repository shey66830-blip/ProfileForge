const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getCourses(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.provider) params.set("provider", filters.provider);
    if (filters.skill) params.set("skill", filters.skill);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.search) params.set("search", filters.search);
    if (filters.sort) params.set("sort", filters.sort);
    const res = await fetch(`${API}/courses?${params}`, { credentials: "include" });
    return await res.json();
  } catch { return { ok: false, courses: [] }; }
}

export async function getRecommendedCourses(missingSkills = [], matchedSkills = [], category = null) {
  try {
    const params = new URLSearchParams();
    params.set("missingSkills", missingSkills.join(","));
    if (matchedSkills.length) params.set("matchedSkills", matchedSkills.join(","));
    if (category) params.set("category", category);
    const res = await fetch(`${API}/courses/recommended?${params}`, { credentials: "include" });
    return await res.json();
  } catch { return { ok: false, courses: [], certifications: [], learningPath: null }; }
}

export async function getCertifications(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.skill) params.set("skill", filters.skill);
    if (filters.search) params.set("search", filters.search);
    const res = await fetch(`${API}/certifications?${params}`, { credentials: "include" });
    return await res.json();
  } catch { return { ok: false, certifications: [] }; }
}

export async function getRecommendedCertifications(missingSkills = []) {
  try {
    const params = new URLSearchParams();
    params.set("missingSkills", missingSkills.join(","));
    const res = await fetch(`${API}/certifications/recommended?${params}`, { credentials: "include" });
    return await res.json();
  } catch { return { ok: false, certifications: [] }; }
}

export async function getEnrolledCourses() {
  try {
    const res = await fetch(`${API}/courses/enrolled/my`, { credentials: "include" });
    return await res.json();
  } catch { return { ok: false, enrollments: [] }; }
}

export async function enrollCourse(courseId) {
  try {
    const res = await fetch(`${API}/courses/enrolled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ courseId }),
    });
    return await res.json();
  } catch { return { ok: false, message: "Backend not reachable." }; }
}
