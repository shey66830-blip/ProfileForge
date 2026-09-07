import { API_BASE } from "../config.js";

export async function saveJob(jobId, jobData, source) {
  try {
    const res = await fetch(`${API_BASE}/saved-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ jobId, jobData, source }),
    });
    return await res.json();
  } catch {
    return { ok: false, message: "Backend not reachable." };
  }
}

export async function getSavedJobs() {
  try {
    const res = await fetch(`${API_BASE}/saved-jobs`, { credentials: "include" });
    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

export async function unsaveJob(jobId) {
  try {
    const res = await fetch(`${API_BASE}/saved-jobs/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await res.json();
  } catch {
    return { ok: false, message: "Backend not reachable." };
  }
}

export async function checkJobSaved(jobId) {
  try {
    const res = await fetch(`${API_BASE}/saved-jobs/check/${encodeURIComponent(jobId)}`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.saved || false;
  } catch {
    return false;
  }
}
