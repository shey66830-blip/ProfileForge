// =============================================
// ProfileForge Eligibility Extractor
// Version 1.0
// =============================================

import { normalizeText, uniqueArray } from "../utils/textCleaner.js";

const EDUCATION = [
  "b.tech","btech","be","b.e",
  "m.tech","mtech","mba","bca","mca",
  "b.sc","bsc","m.sc","msc",
  "mbbs","bds","b.pharm","m.pharm",
  "pharm d","llb","llm","phd",
  "diploma","iti"
];

const EXPERIENCE_REGEX =
  /\d+\+?\s*(year|years|month|months)/gi;

const CERTIFICATION_KEYWORDS = [
  "aws",
  "azure",
  "google cloud",
  "ccna",
  "cisco",
  "oracle",
  "pmp",
  "scrum",
  "salesforce",
  "comptia",
  "coursera",
  "udemy"
];

const LANGUAGE_KEYWORDS = [
  "english",
  "hindi",
  "french",
  "german",
  "spanish",
  "japanese",
  "korean",
  "mandarin",
  "arabic"
];

const REQUIREMENT_PATTERNS = [

  "required",

  "requirements",

  "qualification",

  "qualifications",

  "must have",

  "must possess",

  "who you are",

  "what you need",

  "preferred",

  "ideal candidate",

  "eligibility"

];

export default function extractEligibility(description = "") {

  const lower = normalizeText(description);

  // -------------------------
  // Education
  // -------------------------

  const education = EDUCATION.filter(item =>
    lower.includes(normalizeText(item))
  );

  // -------------------------
  // Experience
  // -------------------------

  const experience =
    description.match(EXPERIENCE_REGEX) || [];

  // -------------------------
  // Certifications
  // -------------------------

  const certifications =
    CERTIFICATION_KEYWORDS.filter(item =>
      lower.includes(item)
    );

  // -------------------------
  // Languages
  // -------------------------

  const languages =
    LANGUAGE_KEYWORDS.filter(item =>
      lower.includes(item)
    );

  // -------------------------
  // Requirement Lines
  // -------------------------

  const lines = description
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const requirements = [];

  for (const line of lines) {

    const clean = normalizeText(line);

    if (
      REQUIREMENT_PATTERNS.some(keyword =>
        clean.includes(keyword)
      )
    ) {

      requirements.push(line);

    }

  }

  // -------------------------
  // Bullet Points
  // -------------------------

  const bullets = lines.filter(line =>

    line.startsWith("-") ||

    line.startsWith("•") ||

    line.startsWith("*")

  );

  // -------------------------
  // Final
  // -------------------------

  return {

    education:
      uniqueArray(education),

    experience:
      uniqueArray(experience),

    certifications:
      uniqueArray(certifications),

    languages:
      uniqueArray(languages),

    eligibility:
      uniqueArray([
        ...requirements,
        ...bullets
      ]).slice(0, 15)

  };

}