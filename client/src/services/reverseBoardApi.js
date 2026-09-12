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

// ── My post ────────────────────────────────────────────────────────
export const getMyReversePost = () => api("/reverse/me");

export const saveMyReversePost = (data) =>
  api("/reverse/me", { method: "PUT", body: JSON.stringify(data) });

export const setReversePostStatus = (status) =>
  api(`/reverse/me/status/${status}`, { method: "POST" });

// ── Public board ───────────────────────────────────────────────────
export const getReverseBoard = (params = {}) => {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "any") parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return api(`/reverse/board${parts.length ? `?${parts.join("&")}` : ""}`);
};

// ── Inquiries ──────────────────────────────────────────────────────
export const sendReverseInquiry = (data) =>
  api("/reverse/inquiries", { method: "POST", body: JSON.stringify(data) });

export const getReceivedInquiries = () => api("/reverse/inquiries/received");

export const getSentInquiries = () => api("/reverse/inquiries/sent");

export const respondToInquiry = (id, action) =>
  api(`/reverse/inquiries/${id}/respond`, { method: "POST", body: JSON.stringify({ action }) });
