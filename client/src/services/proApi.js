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

// ── Advanced Analytics (Pro) ──
export const getAnalytics = () => api("/analytics");

// ── Batch Tailoring (Pro) ──
export const batchTailor = (payload) =>
  api("/tailoring/batch", { method: "POST", body: JSON.stringify(payload) });

// ── Priority Support (Pro) ──
export const createSupportTicket = (payload) =>
  api("/support/tickets", { method: "POST", body: JSON.stringify(payload) });

export const getSupportTickets = () => api("/support/tickets");

// ── Matchmaking (Premium) ──
export const findMatches = (payload) =>
  api("/matchmaking/find", { method: "POST", body: JSON.stringify(payload) });
