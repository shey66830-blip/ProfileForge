// ── Fact-Grounded Tailoring Service ────────────────────────────────
// Returns structured suggestions (not opaque full-document replacement).
// Each suggestion has: section, action, before, after, sourceFact, reasoning.
// AI suggestions never silently overwrite user-entered facts.
// Includes prompt-injection defenses and input bounds.

import { chatCompletion, humanizeProviderError } from "./aiProvider.js";

// ── Input bounds ───────────────────────────────────────────────────

const MAX_RESUME_LENGTH = 20000; // chars
const MAX_JOB_DESCRIPTION_LENGTH = 10000; // chars
const MAX_INSTRUCTION_LENGTH = 2000; // chars
const MAX_SUGGESTIONS = 20; // cap per request
const AI_TIMEOUT_MS = 30000; // 30 second timeout

// ── Prompt injection defenses ──────────────────────────────────────

/**
 * Sanitize user-provided text before embedding in prompts.
 * Strips common injection patterns: "ignore previous instructions",
 * "you are now", role-play attempts, system prompt overrides.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+if\s+you\s+are/gi,
  /disregard\s+(all\s+)?prior/gi,
  /system\s*:\s*/gi,
  /assistant\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /Human\s*:\s*/gi,
  /Assistant\s*:\s*/gi,
];

/**
 * Detect potential prompt injection in user text.
 * Returns { safe: boolean, sanitized: string, warnings: string[] }.
 */
export function sanitizeForPrompt(text) {
  const warnings = [];
  let sanitized = text;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      warnings.push(`Potential prompt injection detected: ${pattern.source}`);
      sanitized = sanitized.replace(pattern, "[REDACTED]");
      pattern.lastIndex = 0;
    }
  }

  // Truncate to bounds
  if (sanitized.length > MAX_RESUME_LENGTH) {
    sanitized = sanitized.slice(0, MAX_RESUME_LENGTH);
    warnings.push("Resume text truncated to maximum length.");
  }

  return {
    safe: warnings.length === 0,
    sanitized,
    warnings,
  };
}

/**
 * Sanitize job description for prompt embedding.
 */
export function sanitizeJobDescription(text) {
  const warnings = [];
  let sanitized = text;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      warnings.push("Potential prompt injection in job description.");
      sanitized = sanitized.replace(pattern, "[REDACTED]");
      pattern.lastIndex = 0;
    }
  }

  if (sanitized.length > MAX_JOB_DESCRIPTION_LENGTH) {
    sanitized = sanitized.slice(0, MAX_JOB_DESCRIPTION_LENGTH);
  }

  return { safe: warnings.length === 0, sanitized, warnings };
}

// ── Suggestion schema (JSON output from AI) ────────────────────────

/**
 * The AI is asked to return suggestions in this exact JSON shape.
 * Each suggestion is a discrete, reviewable change — not a full document.
 */
const SUGGESTION_SCHEMA_DESCRIPTION = `Each suggestion must be a JSON object with:
- "section": one of "summary", "experience", "skills", "education", "projects", "certifications"
- "action": one of "add", "update", "remove"
- "before": the current text/value (string or null for "add")
- "after": the suggested new text/value
- "sourceFact": which part of the resume/cover letter this suggestion is grounded in (string)
- "reasoning": why this change improves the document for this specific job (string)
- "confidence": a number 0-1 indicating how confident the AI is in this suggestion

Return a JSON array of suggestions. Return an empty array if no improvements are needed.`;

// ── Core tailoring function ────────────────────────────────────────

/**
 * Generate structured tailoring suggestions for a resume against a job description.
 * Returns individual suggestions with before/after diffs — not a full document replacement.
 *
 * @param {object} params
 * @param {string} params.resumeText - The current resume text
 * @param {object} params.resumeAnalysis - Structured resume analysis from aiResumeAnalyzer
 * @param {string} params.jobDescription - The target job description
 * @param {string} params.jobTitle - Optional job title
 * @param {string} params.jobCompany - Optional company name
 * @param {string} params.instruction - Optional user instruction for tailoring focus
 * @param {object} params.providerConfig - { provider, client, model } from getProviderClient
 * @returns {{ suggestions: Array, warnings: string[], rawResponse: string }}
 */
export async function generateTailoringSuggestions({
  resumeText = "",
  resumeAnalysis = {}, // eslint-disable-line no-unused-vars
  jobDescription = "",
  jobTitle = "",
  jobCompany = "",
  instruction = "",
  providerConfig,
}) {
  const warnings = [];

  // ── Input validation and bounds ──
  if (!resumeText) {
    return { suggestions: [], warnings: ["No resume text provided."], rawResponse: "" };
  }
  if (!jobDescription) {
    return { suggestions: [], warnings: ["No job description provided."], rawResponse: "" };
  }

  // ── Sanitize inputs ──
  const resumeSanitized = sanitizeForPrompt(resumeText);
  const jobSanitized = sanitizeJobDescription(jobDescription);
  const instructionSanitized = sanitizeForPrompt(instruction);

  warnings.push(...resumeSanitized.warnings);
  warnings.push(...jobSanitized.warnings);
  warnings.push(...instructionSanitized.warnings);

  if (!providerConfig?.client) {
    return { suggestions: [], warnings: ["AI provider not configured."], rawResponse: "" };
  }

  // ── Build the prompt ──
  const systemPrompt = `You are an expert career document editor. Your job is to analyze a resume against a specific job description and suggest EXACT, DISCRETE improvements.

Rules:
- Each suggestion must reference a SPECIFIC part of the resume (the "sourceFact")
- Do NOT invent new experiences, skills, or achievements not present in the resume
- Do NOT change contact information
- Focus on: strengthening weak areas, adding missing keywords, improving clarity
- Each suggestion must be actionable and reviewable independently
- Output ONLY a JSON array of suggestions, no explanations

${SUGGESTION_SCHEMA_DESCRIPTION}`;

  const userPrompt = `RESUME:
---
${resumeSanitized.sanitized}
---

JOB DESCRIPTION:
---
${jobSanitized.sanitized}
---

${jobTitle ? `JOB TITLE: ${jobTitle}` : ""}
${jobCompany ? `COMPANY: ${jobCompany}` : ""}
${instructionSanitized.sanitized ? `USER INSTRUCTION: ${instructionSanitized.sanitized}` : ""}

Analyze the resume against this job description. Return a JSON array of improvement suggestions.`;

  // ── Call the AI ──
  let rawResponse = "";
  try {
    const result = await Promise.race([
      chatCompletion({
        provider: providerConfig.provider,
        client: providerConfig.client,
        model: providerConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // low temperature for deterministic suggestions
        maxTokens: 4000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI request timed out")), AI_TIMEOUT_MS)
      ),
    ]);

    rawResponse = result.text || "";
  } catch (err) {
    return {
      suggestions: [],
      warnings: [...warnings, humanizeProviderError(err)],
      rawResponse: "",
    };
  }

  // ── Parse the JSON response ──
  let suggestions = [];
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      suggestions = JSON.parse(jsonMatch[0]);
    } else {
      suggestions = JSON.parse(rawResponse);
    }
  } catch {
    warnings.push("AI response was not valid JSON. Please try again.");
    return { suggestions: [], warnings, rawResponse };
  }

  // ── Validate and cap suggestions ──
  if (!Array.isArray(suggestions)) {
    suggestions = [];
  }

  suggestions = suggestions
    .filter((s) => s && typeof s === "object" && s.section && s.action && s.after)
    .slice(0, MAX_SUGGESTIONS)
    .map((s, i) => ({
      id: `suggestion-${i + 1}`,
      section: s.section,
      action: s.action,
      before: s.before || null,
      after: s.after,
      sourceFact: s.sourceFact || "",
      reasoning: s.reasoning || "",
      confidence: typeof s.confidence === "number" ? Math.min(1, Math.max(0, s.confidence)) : 0.5,
      accepted: null, // null = pending, true = accepted, false = rejected
    }));

  return { suggestions, warnings, rawResponse };
}

// ── Apply accepted suggestions to create a new document ────────────

/**
 * Apply accepted suggestions to the original resume text.
 * Returns the modified text and a list of applied changes.
 * Never modifies the original — always returns a new string.
 *
 * @param {string} originalText - The base resume text
 * @param {Array} suggestions - All suggestions (check .accepted field)
 * @returns {{ newText: string, appliedCount: number, appliedSuggestions: Array }}
 */
export function applySuggestions(originalText, suggestions) {
  if (!originalText || !suggestions?.length) {
    return { newText: originalText, appliedCount: 0, appliedSuggestions: [] };
  }

  let text = originalText;
  const applied = [];

  for (const suggestion of suggestions) {
    if (suggestion.accepted !== true) continue;
    if (!suggestion.before || !suggestion.after) continue;

    // Only apply if the "before" text actually exists in the current text
    if (text.includes(suggestion.before)) {
      text = text.replace(suggestion.before, suggestion.after);
      applied.push(suggestion);
    }
    // If "before" doesn't match, the suggestion is stale — skip it silently
  }

  return { newText: text, appliedCount: applied.length, appliedSuggestions: applied };
}

// ── Generate a diff for before/after comparison ────────────────────

/**
 * Simple line-by-line diff for before/after text comparison.
 * Returns an array of { type: "same"|"added"|"removed", text: string }.
 *
 * @param {string} before
 * @param {string} after
 * @returns {Array<{type: string, text: string}>}
 */
export function computeDiff(before = "", after = "") {
  const beforeLines = before ? before.split("\n") : [];
  const afterLines = after ? after.split("\n") : [];
  const diff = [];

  // Simple line-by-line diff (enough for single-field comparisons)
  let bi = 0;
  let ai = 0;

  while (bi < beforeLines.length || ai < afterLines.length) {
    if (bi >= beforeLines.length) {
      diff.push({ type: "added", text: afterLines[ai] });
      ai++;
    } else if (ai >= afterLines.length) {
      diff.push({ type: "removed", text: beforeLines[bi] });
      bi++;
    } else if (beforeLines[bi] === afterLines[ai]) {
      diff.push({ type: "same", text: beforeLines[bi] });
      bi++;
      ai++;
    } else {
      // Check if the before line appears later in after (it was moved/changed)
      const laterInAfter = afterLines.indexOf(beforeLines[bi], ai);
      const laterInBefore = beforeLines.indexOf(afterLines[ai], bi);

      if (laterInAfter === -1 && laterInBefore === -1) {
        // Both are new/changed — show as remove old, add new
        diff.push({ type: "removed", text: beforeLines[bi] });
        diff.push({ type: "added", text: afterLines[ai] });
        bi++;
        ai++;
      } else if (laterInAfter !== -1 && (laterInBefore === -1 || laterInAfter - ai <= laterInBefore - bi)) {
        // After has extra lines before matching — additions
        while (ai < laterInAfter) {
          diff.push({ type: "added", text: afterLines[ai] });
          ai++;
        }
      } else {
        // Before has extra lines — removals
        while (bi < laterInBefore) {
          diff.push({ type: "removed", text: beforeLines[bi] });
          bi++;
        }
      }
    }
  }

  return diff;
}

export {
  MAX_RESUME_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_INSTRUCTION_LENGTH,
  MAX_SUGGESTIONS,
  AI_TIMEOUT_MS,
};
