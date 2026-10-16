import { API_BASE } from "../config.js";

async function postFile(endpoint, field, file, fallbackMessage) {
  try {
    const formData = new FormData();
    formData.append(field, file);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    return await res.json();
  } catch {
    return {
      ok: false,
      message: fallbackMessage,
    };
  }
}

// Resumes and CVs are read by different extractors on the server, so they have
// their own endpoints and their own field names.
export async function uploadResumeFile(file) {
  return postFile("/upload/resume", "resume", file, "Upload failed. Backend not reachable.");
}

export async function uploadCvFile(file) {
  return postFile("/upload/cv", "cv", file, "Upload failed. Backend not reachable.");
}
