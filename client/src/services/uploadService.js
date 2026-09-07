import { API_BASE } from "../config.js";

export async function uploadResumeFile(file) {
  try {
    const formData = new FormData();
    formData.append("resume", file);

    const res = await fetch(`${API_BASE}/upload/resume`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    return await res.json();
  } catch {
    return {
      ok: false,
      message: "Upload failed. Backend not reachable.",
    };
  }
}