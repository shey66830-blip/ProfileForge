import analyzeResume from "./aiResumeAnalyzer.js";
import calculateATS from "./atsScoreEngine.js";
import extractEligibility from "./eligibilityExtractor.js";
import analyzeSkills from "./skillExtractor.js";
import jobMatchingEngine, { default as jobMatchingEngineDefault } from "./jobMatchingEngine.js";
import recommendationEngine, { default as recommendationEngineDefault } from "./recommendationEngine.js";
import { chatCompletion } from "./aiProvider.js";

export function parseJobRequirements(text = "") {
  const eligibility = extractEligibility(text);
  const skills = analyzeSkills(text).skills;

  const requiredSkills = [];
  const preferredSkills = [];

  const jobTextLower = text.toLowerCase();

  // Heuristic: extract a local window around each matched skill occurrence and decide whether
  // the job frames it as required or optional. Skills that are framed as required, must-have,
  // or qualification requirements are treated as required; skills framed as preferred/bonus/
  // optional are treated as preferred. If no framing is detected, default to required.
  // Detect sections like "Preferred: Node.js, AWS" and "Required: React, JavaScript".
  const preferredSectionMatch = jobTextLower.match(/(?:preferred|optional|bonus|nice.to.have)\s*[:;]\s*([^.\n]+)/i);
  const preferredList = preferredSectionMatch ? preferredSectionMatch[1].split(/[,\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];

  const requiredSectionMatch = jobTextLower.match(/(?:required|must|qualification)\s*[:;]\s*([^.\n]+)/i);
  const requiredList = requiredSectionMatch ? requiredSectionMatch[1].split(/[,\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];

  for (const skill of skills) {
    const skillLower = skill.toLowerCase();

    // Explicit preferred list wins.
    const inPreferredList = preferredList.some(p =>
      p === skillLower || p.includes(skillLower) || skillLower.includes(p)
    );

    const inRequiredList = requiredList.some(p =>
      p === skillLower || p.includes(skillLower) || skillLower.includes(p)
    );

    if (inPreferredList) {
      preferredSkills.push(skill);
      continue;
    }

    if (inRequiredList) {
      requiredSkills.push(skill);
      continue;
    }

    // Per-occurrence context window as a fallback.
    let searchIndex = 0;
    let found = false;

    while (searchIndex < jobTextLower.length) {
      const idx = jobTextLower.indexOf(skillLower, searchIndex);
      if (idx === -1) break;

      const windowStart = Math.max(0, idx - 120);
      const windowEnd = Math.min(jobTextLower.length, idx + skillLower.length + 120);
      const context = jobTextLower.slice(windowStart, windowEnd);

      if (
        context.includes(skillLower + " required") ||
        context.includes("required " + skillLower) ||
        context.includes(skillLower + " must") ||
        context.includes("must " + skillLower) ||
        context.includes(skillLower + " qualification") ||
        context.includes("qualification: " + skillLower)
      ) {
        requiredSkills.push(skill);
        found = true;
        break;
      }

      if (
        context.includes(skillLower + " preferred") ||
        context.includes("preferred " + skillLower) ||
        context.includes(skillLower + " bonus") ||
        context.includes("bonus " + skillLower) ||
        context.includes(skillLower + " nice to have") ||
        context.includes(skillLower + " nice-to-have") ||
        context.includes(skillLower + " optional") ||
        context.includes("optional " + skillLower)
      ) {
        preferredSkills.push(skill);
        found = true;
        break;
      }

      searchIndex = idx + skillLower.length;
    }

    if (!found) {
      requiredSkills.push(skill);
    }
  }

  const education = eligibility.education;
  const experience = eligibility.experience;
  const certifications = eligibility.certifications;
  const languages = eligibility.languages;

  return {
    rawText: text,
    skills,
    requiredSkills,
    preferredSkills,
    education,
    experience,
    certifications,
    languages,
    eligibilityLines: eligibility.eligibility,
  };
}

export function buildMutableJobProfile({
  title = "",
  company = "",
  location = "",
  remote = false,
  salary = null,
  description = "",
  eligibilityDetails = null,
  skills = [],
}) {
  const eligibility = eligibilityDetails || extractEligibility(description);
  const jobSkills = skills.length ? skills : analyzeSkills(description).skills;

  return {
    title,
    company,
    location,
    remote,
    salary,
    description,
    skills: jobSkills,
    requiredSkills: [],
    preferredSkills: [],
    eligibility,
    eligibilityDetails: eligibility,
  };
}

export function computeResumeJobMatch({ resume, jobProfile, ats }) {
  const match = (jobMatchingEngine && typeof jobMatchingEngine === 'function')
    ? jobMatchingEngine({ resume, job: jobProfile, ats })
    : (jobMatchingEngineDefault && typeof jobMatchingEngineDefault === 'function')
      ? jobMatchingEngineDefault({ resume, job: jobProfile, ats })
      : {
          overall: 0,
          skillMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          eligibilityMatch: 0,
          locationMatch: 100,
          atsScore: ats?.score || 0,
          matchedSkills: [],
          missingSkills: [],
          missingRequired: [],
          missingPreferred: [],
          reasons: [],
          requiredExperience: null,
          candidateExperience: Number(resume?.estimatedExperience || 0),
        };

  const matchedSkills = (Array.isArray(jobProfile.skills) ? jobProfile.skills : [])
    .filter(skill => {
      if (!Array.isArray(resume.skills)) return false;
      return resume.skills.includes(skill);
    });

  const missingRequired = (Array.isArray(jobProfile.requiredSkills) ? jobProfile.requiredSkills : [])
    .filter(skill => !Array.isArray(resume.skills) || !resume.skills.includes(skill));

  const missingPreferred = (Array.isArray(jobProfile.preferredSkills) ? jobProfile.preferredSkills : [])
    .filter(skill => !Array.isArray(resume.skills) || !resume.skills.includes(skill));

  const recommendation = recommendationEngine({
    resume,
    match,
  });

  return {
    overall: match.overall,
    skillMatch: match.skillMatch,
    experienceMatch: match.experienceMatch,
    educationMatch: match.educationMatch,
    eligibilityMatch: match.eligibilityMatch,
    locationMatch: match.locationMatch,
    atsScore: match.atsScore,
    matchedSkills,
    missingRequired,
    missingPreferred,
    reasons: match.reasons,
    requiredExperience: match.requiredExperience,
    candidateExperience: match.candidateExperience,
    recommendation,
  };
}

export function buildAnalysisEnvelope({
  resume,
  resumeAnalysis,
  ats,
  jobProfile,
  matchResult,
  qualitative = null,
}) {
  return {
    analyzedAt: new Date().toISOString(),
    resume: {
      title: resume.title || "Untitled Resume",
      type: resume.type || "resume",
      wordCount: resumeAnalysis.totalWords || 0,
      skillCount: resumeAnalysis.skillsTotal || resumeAnalysis.skills?.length || 0,
      skills: resumeAnalysis.skills || [],
      education: resumeAnalysis.education || {},
      experience: resumeAnalysis.experience || {},
      certifications: resumeAnalysis.certifications || [],
      languages: resumeAnalysis.languages || [],
      careerDomains: resumeAnalysis.careerDomains || [],
      estimatedExperience: resumeAnalysis.estimatedExperience || 0,
      highestQualification: resumeAnalysis.highestQualification || null,
    },
    ats: ats || null,
    job: {
      title: jobProfile.title || "Untitled Job",
      company: jobProfile.company || "",
      location: jobProfile.location || "",
      remote: jobProfile.remote || false,
      salary: jobProfile.salary || null,
      skills: jobProfile.skills || [],
      requiredSkills: jobProfile.requiredSkills || [],
      preferredSkills: jobProfile.preferredSkills || [],
      education: jobProfile.education || [],
      experience: jobProfile.experience || [],
      certifications: jobProfile.certifications || [],
      languages: jobProfile.languages || [],
    },
    match: matchResult,
    qualitative,
  };
}

export async function analyzeWithLLM({
  providerClient,
  model,
  resume,
  resumeAnalysis,
  jobProfile,
  matchResult,
  ats,
}) {
  const systemPrompt = `You are a resume and job matching analyst.
You receive structured resume data and a structured job profile, plus a deterministic match summary.

Your job is to add qualitative insight only. Do not invent skills, education, experience, certifications, or companies that are not supported by the provided data.

Answer in JSON only, with this shape:
{
  "summary": "short overall assessment",
  "strengths": [],
  "weaknesses": [],
  "recommendations": [],
  "evidence": []
}

Use evidence like:
- "Python is listed in the candidate's skills and is also required by the job."
- "The candidate has no listed certification matching the job's preferred certification."
- "Experience gap: job requires 3+ years, resume shows ~0 years."

Do not change the deterministic match score.`;
  const userPrompt = `Resume:
Title: ${resume.title || "Unknown"}
Skills: ${(resumeAnalysis.skills || []).join(", ")}
Education: ${resumeAnalysis.education?.highestQualification || "Not specified"}
Experience: ${resumeAnalysis.experience?.estimatedYears || 0} years estimated
Certifications: ${(resumeAnalysis.certifications || []).join(", ") || "None listed"}
Languages: ${(resumeAnalysis.languages || []).join(", ") || "None listed"}

Job:
Title: ${jobProfile.title || "Unknown"}
Company: ${jobProfile.company || "Unknown"}
Location: ${jobProfile.location || "Unknown"}
Remote: ${jobProfile.remote ? "Yes" : "No"}
Required skills: ${(jobProfile.requiredSkills || []).join(", ") || "None detected"}
Preferred skills: ${(jobProfile.preferredSkills || []).join(", ") || "None detected"}
Education: ${(jobProfile.education || []).join(", ") || "None detected"}
Experience requirement: ${(jobProfile.experience || []).join(", ") || "None detected"}

Deterministic match:
Overall: ${matchResult.overall}%
Skill match: ${matchResult.skillMatch}%
Experience match: ${matchResult.experienceMatch}%
Education match: ${matchResult.educationMatch}%
Eligibility match: ${matchResult.eligibilityMatch}%
ATS score: ${matchResult.atsScore || 0}
Matched skills: ${(matchResult.matchedSkills || []).join(", ") || "None"}
Missing required skills: ${(matchResult.missingRequired || []).join(", ") || "None"}
Missing preferred skills: ${(matchResult.missingPreferred || []).join(", ") || "None"}

Please return JSON only.`;

  const { text } = await chatCompletion({
    provider: providerClient.provider,
    client: providerClient.client,
    model,
    temperature: 0.4,
    maxTokens: 1200,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return normalizeQualitativeJSON(text);
}

// Runs the qualitative LLM pass safely: malformed/empty model output never
// 500s the endpoint (one clean retry for that case). Thrown provider errors
// (auth, payment gating, unknown model, network) are deterministic and never
// improve on a retry — they are propagated immediately so the caller can show
// the specific humanized reason instead of a generic message.
export async function analyzeQualitativeWithRetry(args) {
  let providerError = null;
  try {
    const first = await analyzeWithLLM(args);
    if (first) return first;
  } catch (err) {
    providerError = err;
  }
  if (!providerError) {
    // The model responded but returned no parseable JSON — one clean retry.
    try {
      const second = await analyzeWithLLM(args);
      return second || null;
    } catch (err) {
      providerError = err;
    }
  }
  throw providerError;
}

export function normalizeQualitativeJSON(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const cleaned = raw.trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return null;
    }
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    strengths: ensureArray(parsed.strengths),
    weaknesses: ensureArray(parsed.weaknesses),
    recommendations: ensureArray(parsed.recommendations),
    evidence: ensureArray(parsed.evidence),
  };
}

function ensureArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(item => typeof item === "string" && item.trim());
}
