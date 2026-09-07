import { API_BASE } from "../config.js";

export async function createOrUpdateApplication(data) {
  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return { ok: false, message: "Backend not reachable." };
  }
}

export async function getApplications() {
  try {
    const res = await fetch(`${API_BASE}/applications`, { credentials: "include" });
    const data = await res.json();
    return data.applications || [];
  } catch {
    return [];
  }
}

export async function updateApplication(id, data) {
  try {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return { ok: false, message: "Backend not reachable." };
  }
}

export async function deleteApplication(id) {
  try {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await res.json();
  } catch {
    return { ok: false, message: "Backend not reachable." };
  }
}
