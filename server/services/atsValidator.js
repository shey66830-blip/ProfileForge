// ── ATS-Safe Export Validator ───────────────────────────────────────
// Validates a resume/CV text against common ATS parsing rules and
// returns actionable warnings (not a pass/fail grade — ATS success
// is never guaranteed).

/**
 * Standard section order that most ATS parsers expect.
 * Items earlier in the list should appear earlier in the document.
 */
const STANDARD_SECTION_ORDER = [
  "contact",
  "summary",
  "objective",
  "experience",
  "work experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "awards",
  "languages",
  "references",
];

/**
 * Recognized section headings (case-insensitive, trimmed).
 * Maps common variants to a canonical key.
 */
const HEADING_MAP = {
  contact: "contact",
  "contact information": "contact",
  "personal information": "contact",
  "personal details": "contact",
  summary: "summary",
  "professional summary": "summary",
  "career summary": "summary",
  "career objective": "objective",
  objective: "objective",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "employment history": "experience",
  "employment summary": "experience",
  "area of experience": "experience",
  education: "education",
  qualifications: "education",
  "academic qualifications": "education",
  "academic details": "education",
  skills: "skills",
  "technical skills": "skills",
  "key skills": "skills",
  "core competencies": "skills",
  "areas of expertise": "skills",
  projects: "projects",
  "key projects": "projects",
  "major projects": "projects",
  certifications: "certifications",
  certificates: "certifications",
  "professional certifications": "certifications",
  licenses: "certifications",
  awards: "awards",
  honors: "awards",
  achievements: "awards",
  languages: "languages",
  "language proficiency": "languages",
  references: "references",
};

/**
 * Date patterns that ATS systems can parse.
 * Covers: MM/YYYY, MM-DD-YYYY, Month YYYY, YYYY, Mon YYYY, etc.
 */
const DATE_PATTERNS = [
  /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, // 01/2024, 01-15-2024
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi, // January 2024
  /\b\d{4}\s*[\u2013\u2014\u2015]\s*(?:Present|Current|Now)\b/gi, // 2020 - Present
  /\b(?:Present|Current|Now)\b/gi, // standalone Present
  /\b\d{4}\b/g, // bare years
];

/**
 * Suspicious formatting that ATS systems struggle with.
 */
const SUSPICIOUS_PATTERNS = [
  { re: /\t/g, warning: "Tab characters detected — ATS may collapse or misalign content. Use spaces instead." },
  { re: /\|/g, warning: "Pipe characters (|) detected — some ATS parsers treat these as delimiters. Use commas or separate lines." },
  { re: /■|●|►|→|•|★|☆/g, warning: "Special bullet characters detected — use simple hyphens (-) or asterisks (*) for ATS compatibility." },
  { re: /\t.*\t/g, warning: "Multiple tabs on the same line — ATS may misread column layouts." },
  { re: /(?<!\+)\b\d{3}[-.]\d{3}[-.]\d{4}\b/g, warning: "Dotted phone format (123.456.7890) may confuse some ATS — consider using dashes or spaces." },
];

// ── Core validation function ───────────────────────────────────────

/**
 * Validate a resume text for ATS compatibility.
 * @param {string} text - The full resume text

 * @returns {{ warnings: Array<{severity, section?, message}>, sections: string[], hasContact: boolean, hasDates: boolean, lineCount: number }}
 */
export function validateATS(text) {
  const warnings = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // ── 1. Detect sections and their order ──
  const detectedSections = [];
  const headingLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase().replace(/[:.]+$/, "").trim();

    const canonical = HEADING_MAP[lineLower];
    if (canonical) {
      detectedSections.push({ key: canonical, line: i + 1, raw: line });
      headingLines.push(i);
    }
  }

  // Check for out-of-order sections
  const canonicalOrder = detectedSections.map((s) => s.key);
  for (let i = 1; i < canonicalOrder.length; i++) {
    const prevIdx = STANDARD_SECTION_ORDER.indexOf(canonicalOrder[i - 1]);
    const currIdx = STANDARD_SECTION_ORDER.indexOf(canonicalOrder[i]);
    if (prevIdx !== -1 && currIdx !== -1 && currIdx < prevIdx) {
      warnings.push({
        severity: "warning",
        section: canonicalOrder[i],
        message: `Section "${canonicalOrder[i]}" appears before "${canonicalOrder[i - 1]}" — ATS parsers may not find it in the expected order. Consider reordering.`,
      });
    }
  }

  // Check for missing critical sections
  const sectionKeys = new Set(canonicalOrder);
  if (!sectionKeys.has("contact") && !sectionKeys.has("summary") && !sectionKeys.has("objective")) {
    warnings.push({
      severity: "warning",
      message: "No contact or summary section detected at the top. ATS parsers expect contact information first.",
    });
  }
  if (!sectionKeys.has("experience") && !sectionKeys.has("work experience")) {
    warnings.push({
      severity: "info",
      message: "No experience section detected. Most ATS parsers expect work experience.",
    });
  }
  if (!sectionKeys.has("education")) {
    warnings.push({
      severity: "info",
      message: "No education section detected. Many job postings require education details.",
    });
  }
  if (!sectionKeys.has("skills")) {
    warnings.push({
      severity: "info",
      message: "No skills section detected. ATS systems heavily rely on keyword matching from a skills section.",
    });
  }

  // ── 2. Check for contact information ──
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /\+?\d[-\d\s().]{7,}/.test(text);
  const hasContact = hasEmail || hasPhone;

  if (!hasEmail) {
    warnings.push({
      severity: "warning",
      message: "No email address detected. ATS and recruiters need a way to contact you.",
    });
  }
  if (!hasPhone) {
    warnings.push({
      severity: "info",
      message: "No phone number detected. Consider adding one for recruiter outreach.",
    });
  }

  // ── 3. Check for dates ──
  let dateCount = 0;
  for (const pattern of DATE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) dateCount += matches.length;
  }
  const hasDates = dateCount > 0;

  if (!hasDates) {
    warnings.push({
      severity: "warning",
      message: "No dates detected in the resume. ATS parsers use dates to determine recency and tenure.",
    });
  }

  // ── 4. Check for suspicious formatting ──
  for (const { re, warning } of SUSPICIOUS_PATTERNS) {
    if (re.test(text)) {
      warnings.push({ severity: "warning", message: warning });
      re.lastIndex = 0; // reset for global regex
    }
  }

  // ── 5. Check line count (too short or too long) ──
  if (lines.length < 15) {
    warnings.push({
      severity: "info",
      message: `Resume is only ${lines.length} lines — most ATS-friendly resumes are 30-80 lines. Consider adding more detail.`,
    });
  }
  if (lines.length > 150) {
    warnings.push({
      severity: "warning",
      message: `Resume is ${lines.length} lines — very long resumes may be truncated by ATS. Keep it to 2-3 pages.`,
    });
  }

  // ── 6. Check for standard headings (not custom/creative) ──
  for (const { raw } of detectedSections) {
    const rawLower = raw.toLowerCase().replace(/[:.]+$/, "").trim();
    // Check if it's a non-standard heading that maps to a known section
    if (!HEADING_MAP[rawLower] && HEADING_MAP[rawLower.replace(/s$/, "")]) {
      // e.g., "Work Experiences" vs "Work Experience" — this is fine
    }
  }

  // ── 7. Check for selectable text issues (heuristic) ──
  // If the text contains mostly non-ASCII, it might be a scanned PDF
  // eslint-disable-next-line no-control-regex
  const asciiRatio = text.replace(/[^\x00-\x7F]/g, "").length / Math.max(text.length, 1);
  if (asciiRatio < 0.8) {
    warnings.push({
      severity: "warning",
      message: "Low ASCII character ratio — the resume may contain non-standard characters that ATS parsers cannot read. Ensure all text is selectable.",
    });
  }

  return {
    warnings,
    sections: canonicalOrder,
    hasContact,
    hasEmail,
    hasPhone,
    hasDates,
    dateCount,
    lineCount: lines.length,
    headingCount: detectedSections.length,
  };
}

/**
 * Generate a plain-text preview of the resume with section markers.
 * This is what the ATS would "see" — clean, single-column, no formatting.
 */
export function generatePlainTextPreview(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const preview = [];
  let inSection = false;

  for (const line of lines) {
    if (!line) {
      if (inSection) {
        preview.push(""); // preserve blank lines between sections
      }
      continue;
    }

    const lineLower = line.toLowerCase().replace(/[:.]+$/, "").trim();
    const canonical = HEADING_MAP[lineLower];

    if (canonical) {
      preview.push(""); // blank line before heading
      preview.push(line.toUpperCase()); // standardize heading case
      preview.push("---"); // underline for visual clarity
      inSection = true;
    } else {
      preview.push(line);
    }
  }

  return preview.join("\n").trim();
}
