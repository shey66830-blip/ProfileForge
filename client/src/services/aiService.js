import { API_BASE } from "../config.js";
import { DEFAULT_MODEL } from "../utils/aiModels.js";

export async function analyzeResume(documentId) {
  try {
    const res = await fetch(`${API_BASE}/ai/analyze-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ documentId }),
    });
    return await res.json();
  } catch {
    return { ok: false, message: "AI backend not reachable." };
  }
}

export async function generateCoverLetter(documentId, jobTitle, company, jobDescription) {
  try {
    const res = await fetch(`${API_BASE}/ai/generate-cover-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ documentId, jobTitle, company, jobDescription }),
    });
    return await res.json();
  } catch {
    return { ok: false, message: "AI backend not reachable." };
  }
}

export async function editDocumentWithAI(documentId, instruction, provider, model) {
  try {
    const res = await fetch(`${API_BASE}/ai/edit-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        documentId,
        instruction,
        provider: provider || DEFAULT_MODEL.provider,
        model: model || DEFAULT_MODEL.model,
      }),
    });

    return await res.json();
  } catch {
    return {
      ok: false,
      message: "AI backend not reachable.",
    };
  }
}

export async function analyzeResumeJob(resumeId, jobTitle, jobCompany, jobDescription, provider, model) {
  try {
    const res = await fetch(`${API_BASE}/ai/analyze-resume-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        resumeId,
        jobTitle,
        jobCompany,
        jobDescription,
        provider: provider || DEFAULT_MODEL.provider,
        model: model || DEFAULT_MODEL.model,
      }),
    });

    return await res.json();
  } catch {
    return { ok: false, message: "AI backend not reachable." };
  }
}

export async function compareResumeJob(resumeId, jobTitle, jobCompany, jobDescription, providerA, modelA, providerB, modelB) {
  try {
    const res = await fetch(`${API_BASE}/ai/compare-resume-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        resumeId,
        jobTitle,
        jobCompany,
        jobDescription,
        providerA: providerA || "experiential",
        modelA: modelA || "claude-fable-5.1",
        providerB: providerB || "experiential",
        modelB: modelB || "gpt-6-astra",
      }),
    });

    return await res.json();
  } catch {
    return { ok: false, message: "AI backend not reachable." };
  }
}