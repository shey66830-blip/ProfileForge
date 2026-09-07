import { API_BASE } from "../config.js";

export async function signupUser(user) {
  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(user),
    });

    return await res.json();
  } catch {
    return { ok: false, message: "Backend not running or database not connected." };
  }
}

export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    return await res.json();
  } catch {
    return { ok: false, message: "Backend not running or database not connected." };
  }
}

export async function getCurrentUser() {
  // A clean 401 means genuinely logged out. But 429 (rate limit) or 5xx are
  // transient — retry briefly so a blip doesn't falsify a logout on reload.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });

      if (res.status === 401) return null;

      if (res.ok) {
        const data = await res.json();
        return data.user || null;
      }

      // 429 / 5xx: fall through to retry after a short backoff.
    } catch {
      // Network error: retry.
    }
    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
  }
  return null;
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    return null;
  }
}

export function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain one number.";
  if (!/[!@#$%^&*]/.test(password)) return "Password must contain one special character.";
  return "";
}

export function startOAuth(provider) {
  window.location.href = `${API_BASE}/auth/${provider}`;
}