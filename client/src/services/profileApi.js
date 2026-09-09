import { API_BASE } from "../config.js";

async function api(path, opts = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    return await res.json();
  } catch {
    return { ok: false, message: "Backend not reachable." };
  }
}

// ── Profile ───────────────────────────────────────────────────────
export const getProfile = () => api("/profile");

export const updateProfile = (data) =>
  api("/profile", { method: "PUT", body: JSON.stringify(data) });

export const importProfile = (data) =>
  api("/profile/import", { method: "POST", body: JSON.stringify(data) });

export const promoteProfile = () =>
  api("/profile/promote", { method: "POST" });

export const applyProfileSuggestion = (suggestionId, accept) =>
  api("/profile/suggestions/apply", {
    method: "POST",
    body: JSON.stringify({ suggestionId, accept }),
  });

export const dismissAllSuggestions = () =>
  api("/profile/suggestions/dismiss-all", { method: "POST" });

// ── Tailoring ─────────────────────────────────────────────────────
export const suggestTailoring = (data) =>
  api("/tailoring/suggest", { method: "POST", body: JSON.stringify(data) });

export const applyTailoring = (data) =>
  api("/tailoring/apply", { method: "POST", body: JSON.stringify(data) });

export const getTailoringVersions = (documentId) =>
  api(`/tailoring/versions/${documentId}`);

// ── Export ────────────────────────────────────────────────────────
export const validateATS = (data) =>
  api("/export/validate", { method: "POST", body: JSON.stringify(data) });

export const exportATSHtml = (data) =>
  api("/export/ats-html", { method: "POST", body: JSON.stringify(data) });
