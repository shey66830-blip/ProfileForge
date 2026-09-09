// ── Explainable Job Matcher ────────────────────────────────────────
// Wraps the existing jobMatchingEngine with:
// 1. Required vs preferred skill distinction
// 2. Evidence tracking (which resume item matched which skill)
// 3. Structured score components with weights
// 4. Deterministic scoring (no randomness)

import jobMatchingEngine from "./jobMatchingEngine.js";

// ── Skill classification ───────────────────────────────────────────

/**
 * Patterns that indicate a skill is required vs preferred.
 * Required: "must have", "required", "essential", "mandatory", "minimum"
 * Preferred: "nice to have", "preferred", "bonus", "plus", "advantageous"
 */
const REQUIRED_PATTERNS = /\b(?:must\s*have|required|essential|mandatory|minimum|core|key)\b/i;
const PREFERRED_PATTERNS = /\b(?:nice\s*to\s*have|preferred|bonus|plus|advantageous|desirable|optional)\b/i;

/**
 * Classify skills from a job description into required and preferred.
 * Uses the job's structured skills array plus context from the description.
 * @param {string[]} skills - Extracted skills from the job
 * @param {string} description - Full job description text
 * @returns {{ required: string[], preferred: string[] }}
 */
export function classifySkills(skills = [], description = "") {
  const required = [];
  const preferred = [];
  const lower = description.toLowerCase();

  // Split description into sentences for precise context
  const sentences = lower.split(/[.!;\n]+/).map((s) => s.trim());

  for (const skill of skills) {
    const skillLower = skill.toLowerCase();
    // Find the sentence containing this skill
    const sentence = sentences.find((s) => s.includes(skillLower)) || "";

    if (REQUIRED_PATTERNS.test(sentence)) {
      required.push(skill);
    } else if (PREFERRED_PATTERNS.test(sentence)) {
      preferred.push(skill);
    } else {
      // No context clues — treat as required (conservative)
      required.push(skill);
    }
  }

  return { required, preferred };
}

// ── Evidence tracking ──────────────────────────────────────────────

/**
 * Find evidence in the resume that supports a matched skill.
 * Returns the resume section and text where the skill appears.
 * @param {string} skill
 * @param {object} resume - Resume analysis from aiResumeAnalyzer
 * @returns {{ section: string, text: string } | null}
 */
export function findSkillEvidence(skill, resume = {}) {
  const skillLower = skill.toLowerCase();

  // Check skills list
  const skills = resume.skills || [];
  if (Array.isArray(skills) && skills.some((s) => s.toLowerCase() === skillLower)) {
    return { section: "skills", text: skill };
  }

  // Check experience descriptions
  const experience = resume.experience || [];
  if (Array.isArray(experience)) {
    for (const exp of experience) {
      const text = (exp.description || exp.text || "").toLowerCase();
      if (text.includes(skillLower)) {
        return {
          section: "experience",
          text: exp.description || exp.text || "",
          role: exp.role || exp.title || "",
        };
      }
    }
  }

  // Check projects
  const projects = resume.projects || [];
  if (Array.isArray(projects)) {
    for (const proj of projects) {
      const text = (proj.description || proj.text || "").toLowerCase();
      if (text.includes(skillLower)) {
        return {
          section: "projects",
          text: proj.description || proj.text || "",
          title: proj.title || "",
        };
      }
    }
  }

  // Check education (for degree-level skills like "B.Tech")
  const education = resume.education || [];
  if (Array.isArray(education)) {
    for (const edu of education) {
      const text = `${edu.degree || ""} ${edu.branch || ""} ${edu.institution || ""}`.toLowerCase();
      if (text.includes(skillLower)) {
        return {
          section: "education",
          text: `${edu.degree || ""} ${edu.branch || ""}`.trim(),
          institution: edu.institution || "",
        };
      }
    }
  }

  // Check certifications
  const certs = resume.certifications || [];
  if (Array.isArray(certs)) {
    for (const cert of certs) {
      const name = (typeof cert === "string" ? cert : cert.name || "").toLowerCase();
      if (name.includes(skillLower)) {
        return { section: "certifications", text: typeof cert === "string" ? cert : cert.name || "" };
      }
    }
  }

  // Check full text as last resort
  const fullText = (resume.fullText || resume.text || "").toLowerCase();
  if (fullText.includes(skillLower)) {
    // Find the sentence containing the skill
    const sentences = (resume.fullText || resume.text || "").split(/[.!?\n]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(skillLower)) {
        return { section: "fullText", text: sentence.trim() };
      }
    }
  }

  return null;
}

// ── Score components with weights ──────────────────────────────────

/**
 * Score component weights — must sum to 1.0.
 * These are exposed so the UI can display a breakdown.
 */
export const SCORE_WEIGHTS = {
  skills: 0.35,
  experience: 0.25,
  education: 0.20,
  eligibility: 0.10,
  location: 0.05,
  ats: 0.05,
};

/**
 * Score component labels for UI display.
 */
export const SCORE_LABELS = {
  skills: "Skill Match",
  experience: "Experience",
  education: "Education",
  eligibility: "Eligibility",
  location: "Location",
  ats: "ATS Score",
};

// ── Main explainable match function ────────────────────────────────

/**
 * Run the existing matching engine and enrich the result with:
 * - Required vs preferred skills
 * - Evidence for each matched skill
 * - Structured score components
 * - Deterministic overall score
 *
 * @param {object} params
 * @param {object} params.resume - Resume analysis from aiResumeAnalyzer
 * @param {object} params.job - Enhanced job object
 * @param {object} params.ats - ATS score
 * @returns {object} Enriched match result
 */
export function explainableMatch({ resume = {}, job = {}, ats = {} }) {
  // Run the existing engine
  const baseResult = jobMatchingEngine({ resume, job, ats });

  // Classify skills
  const { required, preferred } = classifySkills(job.skills || [], job.description || "");

  // Match required and preferred skills separately
  const resumeSkills = (resume.skills || []).map((s) => (typeof s === "string" ? s : s.name || "").toLowerCase());
  const matchedRequired = required.filter((s) => resumeSkills.includes(s.toLowerCase()));
  const missingRequired = required.filter((s) => !resumeSkills.includes(s.toLowerCase()));
  const matchedPreferred = preferred.filter((s) => resumeSkills.includes(s.toLowerCase()));
  const missingPreferred = preferred.filter((s) => !resumeSkills.includes(s.toLowerCase()));

  // Find evidence for matched skills
  const evidence = {};
  for (const skill of [...matchedRequired, ...matchedPreferred]) {
    const ev = findSkillEvidence(skill, resume);
    if (ev) evidence[skill] = ev;
  }

  // Build structured score components
  const scoreComponents = {
    skills: {
      label: SCORE_LABELS.skills,
      score: baseResult.skillMatch,
      weight: SCORE_WEIGHTS.skills,
      requiredMatched: matchedRequired.length,
      requiredTotal: required.length,
      preferredMatched: matchedPreferred.length,
      preferredTotal: preferred.length,
    },
    experience: {
      label: SCORE_LABELS.experience,
      score: baseResult.experienceMatch,
      weight: SCORE_WEIGHTS.experience,
      required: baseResult.requiredExperience,
      candidate: baseResult.candidateExperience,
    },
    education: {
      label: SCORE_LABELS.education,
      score: baseResult.educationMatch,
      weight: SCORE_WEIGHTS.education,
    },
    eligibility: {
      label: SCORE_LABELS.eligibility,
      score: baseResult.eligibilityMatch,
      weight: SCORE_WEIGHTS.eligibility,
    },
    location: {
      label: SCORE_LABELS.location,
      score: baseResult.locationMatch,
      weight: SCORE_WEIGHTS.location,
    },
    ats: {
      label: SCORE_LABELS.ats,
      score: baseResult.atsScore,
      weight: SCORE_WEIGHTS.ats,
    },
  };

  // Deterministic overall score (recompute from components for transparency)
  const overall = Math.round(
    scoreComponents.skills.score * SCORE_WEIGHTS.skills +
    scoreComponents.experience.score * SCORE_WEIGHTS.experience +
    scoreComponents.education.score * SCORE_WEIGHTS.education +
    scoreComponents.eligibility.score * SCORE_WEIGHTS.eligibility +
    scoreComponents.location.score * SCORE_WEIGHTS.location +
    scoreComponents.ats.score * SCORE_WEIGHTS.ats
  );

  // Apply the same disqualifier caps as the base engine
  let cappedOverall = overall;
  const requiredMinExp = baseResult.requiredExperience;
  const resumeExp = baseResult.candidateExperience;
  if (requiredMinExp !== null && resumeExp === 0 && requiredMinExp >= 3) {
    cappedOverall = Math.min(cappedOverall, 35);
  } else if (requiredMinExp !== null && resumeExp === 0 && requiredMinExp >= 1) {
    cappedOverall = Math.min(cappedOverall, 50);
  }
  if (scoreComponents.skills.score < 10 && (job.skills || []).length >= 3) {
    cappedOverall = Math.min(cappedOverall, 40);
  }

  return {
    // Overall
    overall: cappedOverall,
    overallRaw: overall,

    // Score components
    scoreComponents,

    // Required vs preferred
    requiredSkills: {
      matched: matchedRequired,
      missing: missingRequired,
      total: required.length,
    },
    preferredSkills: {
      matched: matchedPreferred,
      missing: missingPreferred,
      total: preferred.length,
    },

    // Evidence
    evidence,

    // Reasons (from base engine)
    reasons: baseResult.reasons,

    // Legacy compatibility
    matchedSkills: baseResult.matchedSkills,
    missingSkills: baseResult.missingSkills,
    skillMatch: baseResult.skillMatch,
    experienceMatch: baseResult.experienceMatch,
    educationMatch: baseResult.educationMatch,
    eligibilityMatch: baseResult.eligibilityMatch,
    locationMatch: baseResult.locationMatch,
    atsScore: baseResult.atsScore,
    requiredExperience: baseResult.requiredExperience,
    candidateExperience: baseResult.candidateExperience,
  };
}
