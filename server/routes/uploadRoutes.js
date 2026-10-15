import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { protect } from "../middleware/authMiddleware.js";
import {
  matchSkills,
  ALL_SKILLS as ALL_SKILLS_LOCAL,
  SKILL_DATABASE,
} from "../services/skillDatabase.js";

// PDF parsing is loaded lazily so running the server's unit tests (`npm test`)
// never pulls the pdfjs runtime into the process before a PDF is actually needed.
// The test runner evaluates file top-level import statements before any test,
// and pdfjs-dist's legacy build has runtime web-api deps (DOMMatrix etc.) that
// throw in Node's test execution model even when the import is never consumed.
let createPDFParser;
async function getPDFParser() {
  if (!createPDFParser) {
    const { PDFParse } = await import("pdf-parse");
    createPDFParser = (opts) => new PDFParse(opts);
  }
  return createPDFParser;
}

const router = express.Router();

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only PDF, DOCX, or TXT files are allowed."));
    }
    if (
      file.mimetype &&
      !ALLOWED_MIMES.includes(file.mimetype) &&
      file.mimetype !== "application/octet-stream"
    ) {
      return cb(new Error("File type not allowed."));
    }
    cb(null, true);
  },
});

// Skill matching now lives in services/skillDatabase.js (single source of
// truth shared with skillExtractor/aiResumeAnalyzer). matchSkills is
// imported above; the local database and matcher were removed.

const SECTION_RULES = [
  {
    key: "objective",
    re: /^(objective|professional summary|career objective|career summary|profile|summary)\s*:?$/i,
  },
  {
    key: "experience",
    re: /^(experience summary|professional experience|work experience|employment summary|employment|area of experience|areas of experience)\s*:?$/i,
  },
  {
    key: "skills",
    re: /^(skills?|skill sets?|technical skills|key skills|core competencies|areas of expertise)\s*:?$/i,
  },
  {
    key: "education",
    re: /^(education|qualifications?|academic qualifications?|academic details|academic profile)\s*:?$/i,
  },
  {
    key: "projects",
    re: /^(projects?|key projects|major projects|academic projects|work projects|major projects and roles)\s*:?$/i,
  },
  {
    key: "certifications",
    re: /^(certifications?|certificates?|professional certifications?|licenses?|licences?|courses?\s*(?:&|and)\s*certifications?)(\s*(?:&|and)\s*achievements?)?\s*:?$/i,
  },
  {
    key: "achievements",
    re: /^(achievements?|awards?|honou?rs?|accomplishments?|extra.?curricular activities?)\s*:?$/i,
  },
  {
    key: "languages",
    re: /^(languages?|languages?\s*known|language proficiency)\s*:?$/i,
  },
  {
    key: "personal",
    re: /^(personal details?|personal profile|personal information|additional details|personal data|other details)\s*:?$/i,
  },
];

function splitSections(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const sections = {};
  let current = null;
  for (const line of lines) {
    const rule = SECTION_RULES.find((r) => r.re.test(line));
    if (rule) {
      current = rule.key;
      sections[current] = sections[current] || [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return sections;
}

function extractCompanies(lines) {
  return (lines || []).filter(
    (line) =>
      /(worked|working)\s+(with|at)\s+.+?(from|since|till|until|–|\d{4})/i.test(line) ||
      (/(\b\d{4}\b.*(from|to|–|until|since))|(from|since).*\b\d{4}\b/i.test(line) &&
        /(ltd|limited|pvt|inc|technologies|services|solutions|infra|tele|hcl|tech mahindra|pspl|niscom|indiabulls)/i.test(
          line,
        )),
  );
}

// Institutions are recognised by their own words, not by position — that is
// what lets "B.Tech in CS, NIT Karnataka (2016 – 2020) | CGPA: 8.7" keep its
// college name instead of collapsing to the degree token.
const INSTITUTION_HINT_RE =
  /(school|college|university|institute|institution|academy|polytechnic|vidyalaya|vidalaya|iit\b|nit\b|iiit\b|bits\b|srm\b|vit\b|manipal|amity|symbiosis|convent|matriculation|higher secondary|sainik|navodaya|open university|distance education)/i;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitEducationSegments(value) {
  return String(value || "")
    .split(/[|,;•\t]|\s+[-–—]\s+/)
    .map((segment) =>
      segment
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

// "B.Tech in Computer Science" -> the study area is the part after in/of.
function extractFieldOfStudy(raw) {
  const match = raw.match(/\b(?:in|of)\s+([A-Za-z][A-Za-z&.,'\- ]{2,40}?)(?=\s*[,|(]|\s*$)/i);
  if (!match) return "";
  return match[1].trim().replace(/[.,]$/, "");
}

function stripEducationExtras(raw, row) {
  let head = raw;
  if (row.institution) head = head.replace(row.institution, " ");
  if (row.year) head = head.replace(row.year, " ");
  if (row.score) head = head.replace(new RegExp(escapeRegExp(row.score), "g"), " ");
  head = head.replace(/(cgpa|gpa|percentage|percent|aggregate|marks)\s*[:=]?/gi, " ");
  return head
    .replace(/[|,;•]|\s+[-–—]\s+|[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// One human-readable line per qualification, used for the free-text education
// field so nothing an ATS reads is left behind in the structured rows.
export function formatEducationRow(row) {
  const head = stripEducationExtras(row.raw || row.degree || "", row) || row.degree || "";
  const scoreText = row.score
    ? row.gradeType === "cgpa"
      ? `CGPA ${row.score}`
      : row.score
    : "";
  const tail = [row.year, scoreText].filter(Boolean).join(" · ");
  const line = [head, row.institution].filter(Boolean).join(" — ");
  return tail ? `${line} (${tail})` : line;
}

function extractEducation(lines) {
  const structured = extractStructuredEducation(lines);
  const formatted = structured
    .map((row) => formatEducationRow(row))
    .filter((line) => line && line.length > 2);
  if (formatted.length) return formatted.join("\n");

  const degreeRe =
    /(10th|10\+2|12th|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|mba|mbbs|phd|bachelor|master|diploma|graduate|post.?graduate|b\.?e|m\.?e|ssc|hsc|intermediate)/i;
  const rows = (lines || []).filter((line) => {
    if (/^(standard\/degree|collage\/university|college\/university|degree\s*\|)/i.test(line))
      return false;
    return degreeRe.test(line) || (line.includes("|") && /(\d{4}|%)/.test(line));
  });
  return rows.join("\n") || (lines || [])[0] || "";
}

// Projects keep the two things a recruiter actually reads — what your role was
// and what you were responsible for — as separate fields.
export function extractStructuredProjects(lines) {
  const normTitle = (s) =>
    s
      .replace(/^[\s.\-–]+/, "")
      .replace(/[.\s]+$/, "")
      .trim()
      .toLowerCase();
  const blocks = [];
  let current = null;

  const pushResponsibility = (value) => {
    const clean = String(value || "")
      .replace(/^[•>\-–\s]+/, "")
      .trim();
    if (clean) current.responsibilities.push(clean);
  };

  for (const line of lines || []) {
    if (/^project\s*[:.\-–]?\s*/i.test(line)) {
      const name = line
        .replace(/^project\s*[:.\-–]?\s*/i, "")
        .replace(/^[\s.\-–]+/, "")
        .replace(/[.\s]+$/, "")
        .trim();
      // Merge the "Project: ..." heading above a table with the table's own
      // "Project: ..." row when they refer to the same project (same or
      // overlapping title) and the heading block has no client/period/product yet.
      if (
        current &&
        !current.client &&
        !current.period &&
        !current.product &&
        (normTitle(current.name) === normTitle(name) ||
          normTitle(current.name).includes(normTitle(name)) ||
          normTitle(name).includes(normTitle(current.name)))
      ) {
        current.name = name;
      } else {
        if (current) blocks.push(current);
        current = {
          name,
          client: "",
          period: "",
          product: "",
          role: "",
          responsibilities: [],
        };
      }
      continue;
    }
    if (!current) continue;

    const client = line.match(/^client\s*[:.]?\s*(.+)/i);
    const period = line.match(/^period\s*[:.]?\s*(.+)/i);
    const product = line.match(/^product\s*[:.]?\s*(.+)/i);
    const responsibility = line.match(/^responsibilit(?:y|ies)\s*[:.]?\s*(.*)/i);
    const role = line.match(/^role\s*(?:and\s*responsibilities?)?\s*[:.]?\s*(.*)/i);

    if (client) current.client = client[1].trim();
    else if (period) current.period = period[1].trim();
    else if (product) current.product = product[1].trim();
    else if (responsibility) pushResponsibility(responsibility[1]);
    else if (role) {
      const value = role[1].trim();
      if (value) current.role = current.role ? `${current.role}; ${value}` : value;
    } else if (!/^(project|client|period|product|role|responsibilit)\b/i.test(line)) {
      pushResponsibility(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function formatProjects(blocks) {
  return blocks
    .map((p) => {
      let s = `• ${p.name}`;
      if (p.client) s += `\n  Client: ${p.client}`;
      if (p.period) s += `\n  Period: ${p.period}`;
      if (p.product) s += `\n  Product: ${p.product}`;
      if (p.role) s += `\n  Role: ${p.role}`;
      if (p.responsibilities.length) {
        s += `\n  Responsibilities:`;
        for (const r of p.responsibilities) s += `\n    • ${r}`;
      }
      return s;
    })
    .join("\n\n");
}

// Certificates and badges: the issuer, the year and — crucially for verification
// — the credential ID or the public verification link.
export function extractCertifications(lines) {
  const entries = [];

  for (const rawLine of lines || []) {
    const line = String(rawLine).trim();
    if (!line) continue;
    if (/^(certifications?|certificates?|licen[cs]es?|achievements?|awards?)\s*:?$/i.test(line)) continue;
    if (/^(credential|id|year|issuer|issued by|valid till|expiry)\s*[:.]?\s*$/i.test(line)) continue;

    const credentialMatch = line.match(
      /(?:credential|licen[cs]e|certificate|cert|badge|registration|reg)\s*(?:id|no|no\.|number|code|#)\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\-_.]{3,})/i,
    );
    const urlMatch = line.match(
      /(?:https?:\/\/)?(?:www\.)?((?:coursera|credly|udemy|edx|linkedin|pluralsight|nptel|microsoft|aws|google|cisco|huawei)\.\w{2,}\/[^\s)]+)/i,
    );
    const yearMatch = line.match(/\b(19\d{2}|20\d{2})\b/);

    // Peel off everything already captured so what remains is "name + issuer".
    let working = line
      .replace(/\b(19\d{2}|20\d{2})\b/g, " ")
      .replace(
        /(?:credential|licen[cs]e|certificate|cert|badge|registration|reg)\s*(?:id|no|no\.|number|code|#)\s*[:.]?\s*[A-Za-z0-9\-_.]+/gi,
        " ",
      )
      .replace(/(?:https?:\/\/)?(?:www\.)?\w+\.\w{2,}\/\S+/gi, " ")
      .replace(/\(\s*\)/g, " ")
      .replace(/\s{2,}/g, " ")
      // A trailing separator with nothing behind it would hide the issuer split.
      .replace(/[\s\-–—|·]+$/, "")
      .trim();

    // "(Issuer)" is the most explicit form, "Certification - Issuer" the runner-up.
    const parenIssuer = working.match(/\(([^)]{3,60})\)/);
    let issuer = parenIssuer ? parenIssuer[1].trim() : "";
    if (parenIssuer) working = working.replace(parenIssuer[0], " ");

    if (!issuer) {
      const byIssuer = working.match(/(?:issued\s*by|by)\s+([A-Za-z][A-Za-z0-9&.,'\- ]{2,50})\s*$/i);
      if (byIssuer) {
        issuer = byIssuer[1].trim();
        working = working.replace(byIssuer[0], " ");
      }
    }

    if (!issuer) {
      const separated = working.match(/^(.*?)\s+[-–—|·]\s+([A-Za-z][A-Za-z0-9&.,'\- ]{2,50})$/);
      if (separated && !/(credential|verify)/i.test(separated[2])) {
        working = separated[1];
        issuer = separated[2].trim();
      }
    }

    const name = working
      .replace(/^[\s\-–—|·]+/, "")
      .replace(/[\s\-–—|·]+$/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!name || name.length < 3) continue;

    entries.push({
      name,
      issuer,
      year: yearMatch ? yearMatch[1] : "",
      credentialId: credentialMatch ? credentialMatch[1] : "",
      url: urlMatch ? (urlMatch[0].startsWith("http") ? urlMatch[0] : `https://${urlMatch[0]}`) : "",
      raw: line,
    });
  }

  return entries;
}

// Labels that appear in the header or a "Personal Details" block. Overseas
// applications hinge on the last few, so they get real keys of their own.
const PERSONAL_KEYS = [
  { key: "passport", label: "Passport", re: /^passport(?:\s*(?:no|no\.|number|#))?$/i },
  {
    key: "nric",
    label: "NRIC",
    re: /^(?:nric(?:\/fin)?(?:\s*(?:no|no\.|number|#))?|fin(?:\s*(?:no|number))?|identity\s*card|ic\s*(?:no|number)|national\s*id)$/i,
  },
  {
    key: "nationality",
    label: "Nationality",
    re: /^(?:nationality|country\s*of\s*citizenship|citizenship)$/i,
  },
  { key: "dob", label: "Date of birth", re: /^(?:date\s*of\s*birth|dob|birth\s*date)$/i },
  { key: "gender", label: "Gender", re: /^(?:gender|sex)$/i },
  {
    key: "maritalStatus",
    label: "Marital status",
    re: /^(?:marital\s*status|marriage\s*status|marital\s*state)$/i,
  },
  {
    key: "languages",
    label: "Languages",
    re: /^(?:languages?(?:\s*known|\s*proficiency)?|spoken\s*languages?)$/i,
  },
  {
    key: "address",
    label: "Address",
    re: /^(?:present\s*address|permanent\s*address|current\s*address|residential\s*address|address)$/i,
  },
  { key: "fatherName", label: "Father's name", re: /^(?:father'?s?\s*name)$/i },
  { key: "hobbies", label: "Hobbies", re: /^(?:hobbies(?:\s*and\s*interests)?|interests)$/i },
  {
    key: "workAuthorization",
    label: "Work authorization",
    re: /^(?:work\s*(?:authorization|authorisation|permit|status|eligibility|pass)|employment\s*pass|visa(?:\s*status)?|pass\s*type|right\s*to\s*work|eligibility\s*to\s*work|permit\s*type)$/i,
  },
  {
    key: "relocate",
    label: "Willing to relocate",
    re: /^(?:willing\s*to\s*relocate|open\s*to\s*relocat(?:e|ion)|relocation(?:\s*preference)?|relocate)$/i,
  },
];

function personalKeyFor(label) {
  const clean = String(label || "")
    .replace(/\s+/g, " ")
    .trim();
  return PERSONAL_KEYS.find((entry) => entry.re.test(clean)) || null;
}

// Accepts "Key: value", "Key - value" and table cells ("Passport | M1234567"),
// because the same detail is written five different ways across resumes.
export function extractPersonalFields(lines) {
  const fields = {};

  for (const line of lines || []) {
    const cells = String(line)
      .split(/\s*[|\t]\s*/)
      .map((cell) => cell.trim())
      .filter(Boolean);

    for (const cell of cells) {
      const match = cell.match(/^([A-Za-z][A-Za-z\s'./()\-]{1,32}?)\s*[:.\-–]\s*(.+)$/);
      if (!match) continue;
      const entry = personalKeyFor(match[1]);
      if (!entry) continue;
      const value = match[2].replace(/^[,\s]+/, "").trim();
      if (!value) continue;
      if (fields[entry.key]) fields[entry.key] = `${fields[entry.key]}, ${value}`;
      else fields[entry.key] = value;
    }
  }

  // "Willing to relocate" is usually written as a bare flag with no value —
  // that still answers the question, so record it as a yes.
  for (const line of lines || []) {
    const bare = String(line)
      .replace(/[.:\-\s]+$/, "")
      .trim();
    if (
      /^(?:willing\s*to\s*(?:relocate|travel|move)|open\s*to\s*relocat(?:e|ion)|relocat(?:e|ion))$/i.test(
        bare,
      ) &&
      !fields.relocate
    ) {
      fields.relocate = "Yes";
    }
  }

  return fields;
}

function formatPersonalDetails(fields) {
  return PERSONAL_KEYS.filter((entry) => fields[entry.key])
    .map((entry) => `${entry.label}: ${fields[entry.key]}`)
    .join("\n");
}

function suggestImprovements(f) {
  const tips = [];
  if (!f.summary || f.summary.length < 40)
    tips.push(
      "Add a professional summary (2–3 lines) at the top so recruiters understand your profile instantly.",
    );
  if (!f.projects)
    tips.push(
      "Add your major projects with client, period, product, and your role & responsibilities.",
    );
  if (f.skillsList.length < 5)
    tips.push("Add more skills — aim for 8–15 relevant keywords so ATS filters match your resume.");
  if (!f.certifications)
    tips.push("Add professional certifications (AWS, Oracle, vendor-specific) to stand out.");
  if (!f.experienceCompanies.length)
    tips.push("List each employer with the period you worked there (from – to), newest first.");
  if (!/%/.test(f.experience) && !/\d+%/.test(f.experience))
    tips.push(
      "Quantify achievements — add metrics like % improvements, uptime, team size, and database counts.",
    );
  if ((f.experience.split("\n").filter(Boolean).length || 0) > 30)
    tips.push(
      "Your experience section is very long — keep the most relevant 8–12 points per role for ATS readability.",
    );
  if (!f.personalDetails)
    tips.push(
      "Add personal details (address, languages, passport, etc.) if the role requires them.",
    );

  // ── Detail checks on the structured rows ────────────────────────────────
  const educationRows = f.structuredEducation || [];
  if (educationRows.length && !educationRows.some((row) => row.institution || row.year)) {
    tips.push(
      "Add the institute name, passing year and CGPA/percentage to each qualification — ATS filters read those, not just the degree.",
    );
  }

  const projectsWithoutRole = (f.structuredProjects || []).filter(
    (p) => !p.role && !(p.responsibilities || []).length,
  );
  if (projectsWithoutRole.length) {
    tips.push(
      `Add your role and 2–3 responsibilities for ${projectsWithoutRole.length} project(s): what you owned, built, or delivered.`,
    );
  }

  const certs = f.structuredCertifications || [];
  const unverifiable = certs.filter((c) => !c.credentialId && !c.url);
  if (unverifiable.length) {
    tips.push(
      `Add the credential ID or verification link for ${unverifiable.length} certificate(s) (Coursera, Credly, etc. provide one) so employers can verify them.`,
    );
  }

  if (!f.personal?.languages) {
    tips.push(
      "List the languages you speak with fluency levels — many employers abroad screen on this.",
    );
  }
  if (!f.personal?.nationality && !f.personal?.passport && !f.personal?.workAuthorization) {
    tips.push(
      "Applying outside your home country? Add nationality, passport / NRIC number and work-authorization status.",
    );
  }
  if (tips.length === 0)
    tips.push(
      "Resume looks complete! Tailor the summary and skills to each job description before applying.",
    );
  return tips;
}

function suggestTemplates(f) {
  const suggestions = [];
  if (f.experienceCompanies.length >= 3 || f.skillsList.includes("project management"))
    suggestions.push("executive");
  if (f.skillsList.length >= 5 && f.projects) suggestions.push("technical");
  if (!suggestions.length) suggestions.push("modern", "minimal");
  return suggestions;
}

// pdf-parse inserts page separators like "-- 1 of 4 --" into the extracted
// text; they must never leak into experience/education fields.
const PDF_PAGE_MARKER_RE = /^\s*[-–—]+\s*\d+\s*(of|\/)\s*\d+\s*[-–—]+\s*$/i;
const PDF_PAGE_NO_RE = /^\s*page\s+\d+\s*(of|\/)\s+\d+\s*$/i;

function cleanPdfText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const counts = new Map();
  for (const line of lines) {
    counts.set(line, (counts.get(line) || 0) + 1);
  }
  const cleaned = lines.filter((line) => {
    // Drop pdf-parse page separators ("-- 1 of 4 --", "Page 3 of 6") outright.
    if (PDF_PAGE_MARKER_RE.test(line) || PDF_PAGE_NO_RE.test(line)) return false;
    const c = counts.get(line);
    // Drop lines that repeat verbatim across the document (likely header/footer)
    if (c > 2) return false;
    // Drop very short lines that look like page numbers or stray markers
    if (line.length < 6) {
      if (/^\d+$/.test(line)) return false; // "1", "2" ...
      if (/^\s*-\s*\d+\s*-\s*$/.test(line)) return false; // "- 3 -"
      if (/^page\s*\d+/i.test(line)) return false; // "Page 5"
      if (/^pg\.?\s*\d+/i.test(line)) return false; // "Pg 5"
    }
    return true;
  });

  // Also drop loosely repeated header-ish lines: short lines that appear more than once
  // but weren't caught by the >2 rule (e.g. a 2-page doc where header appears twice).
  const surviving = cleaned.filter((line) => {
    if (counts.get(line) > 1 && line.length < 20) {
      // keep if it looks like meaningful content (has a @ or is a skill-ish line)
      if (
        !line.includes("@") &&
        !ALL_SKILLS_LOCAL.some((s) => line.toLowerCase().includes(s.toLowerCase()))
      ) {
        return false;
      }
    }
    return true;
  });
  return surviving.join("\n");
}

// ── Improvised Extraction Helpers ─────────────────────────────────────

export function extractLinks(text) {
  const links = {
    linkedin: "",
    github: "",
    leetcode: "",
    portfolio: "",
    others: [],
  };

  const linkedinMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i,
  );
  if (linkedinMatch)
    links.linkedin = linkedinMatch[0].startsWith("http")
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`;

  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(github\.com\/[a-zA-Z0-9_-]+)/i);
  if (githubMatch)
    links.github = githubMatch[0].startsWith("http") ? githubMatch[0] : `https://${githubMatch[0]}`;

  const leetcodeMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?(leetcode\.com\/[a-zA-Z0-9_-]+|hackerrank\.com\/[a-zA-Z0-9_-]+)/i,
  );
  if (leetcodeMatch)
    links.leetcode = leetcodeMatch[0].startsWith("http")
      ? leetcodeMatch[0]
      : `https://${leetcodeMatch[0]}`;

  const urlMatches = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s)"]*)?/gi) || [];
  for (const url of urlMatches) {
    if (/linkedin\.com|github\.com|leetcode\.com|hackerrank\.com/i.test(url)) continue;
    if (!links.portfolio && !/schema\.org|w3\.org|adobe\.com/i.test(url)) {
      links.portfolio = url;
    } else if (!/schema\.org|w3\.org/i.test(url) && !links.others.includes(url)) {
      links.others.push(url);
    }
  }

  return links;
}

export function extractStructuredExperience(lines) {
  const experiences = [];
  let current = null;
  const dateRe =
    /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:–|-|to|till|until)\s*(?:present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})/i;

  for (const line of lines || []) {
    const isBullet = /^[•>\-–*]\s*/.test(line);
    const hasDate = dateRe.test(line);
    const hasRoleOrCompany =
      /(?:at|@)\s+[A-Za-z0-9&., ]+/i.test(line) ||
      /(?:engineer|developer|lead|manager|consultant|architect|specialist|analyst|intern|programmer|administrator)\b/i.test(
        line,
      );

    if (!isBullet && (hasDate || hasRoleOrCompany)) {
      if (current) experiences.push(current);
      const dateMatch = line.match(dateRe);
      const duration = dateMatch ? dateMatch[0].trim() : "";
      const titleCompany = line.replace(dateRe, "").replace(/[()]/g, "").trim();
      const parts = titleCompany.split(/\s+(?:at|@|-)\s+|\s*,\s*/i);
      current = {
        role: parts[0]?.trim() || titleCompany,
        company: parts[1]?.trim() || "",
        duration,
        bullets: [],
      };
    } else if (current) {
      const cleanBullet = line.replace(/^[•>\-–*\s]+/, "").trim();
      if (cleanBullet) current.bullets.push(cleanBullet);
    }
  }
  if (current) experiences.push(current);
  return experiences;
}

const DEGREE_RE =
  /(?:10th|10\+2|12th|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|mba|mbbs|bds|phd|bachelor(?:'?s)?|master(?:'?s)?|diploma|graduate|post.?graduate|b\.?e\b|m\.?e\b|ssc|hsc|intermediate|b\.?com|m\.?com|b\.?a\b|m\.?a\b|b\.?arch|llb|b\.?ed|iti|polytechnic)/i;

// Header rows of an education table must never become a qualification.
function isEducationHeaderRow(line) {
  return /^(standard\/degree|collage\/university|college\/university|degree\s*\||course\s*\||qualification\s*\|)/i.test(
    line,
  );
}

export function extractStructuredEducation(lines) {
  const yearRe = /\b(19\d{2}|20\d{2})\b(?:\s*[-–—]\s*(?:19\d{2}|20\d{2}|present))?/i;
  const labelledScoreRe =
    /(cgpa|gpa|percentage|percent|aggregate|marks)\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(cgpa|gpa|%)?/i;
  const trailingScoreRe = /(\d{1,3}(?:\.\d+)?)\s*(cgpa|gpa)\b/i;
  const percentRe = /(\d{1,3}(?:\.\d+)?)\s*%/;

  return (lines || [])
    .map((l) => l.trim())
    .filter((l) => l && !isEducationHeaderRow(l) && DEGREE_RE.test(l))
    .map((raw) => {
      const degreeMatch = raw.match(DEGREE_RE);
      const yearMatch = raw.match(yearRe);

      const labelled = raw.match(labelledScoreRe);
      const trailing = raw.match(trailingScoreRe);
      const percent = raw.match(percentRe);

      let score = "";
      let gradeType = "";
      if (labelled) {
        score = labelled[2];
        gradeType = /cgpa|gpa/i.test(labelled[1]) ? "cgpa" : "percent";
      } else if (trailing) {
        score = trailing[1];
        gradeType = /cgpa|gpa/i.test(trailing[2]) ? "cgpa" : "percent";
      } else if (percent) {
        score = `${percent[1]}%`;
        gradeType = "percent";
      }

      // Everything we have already captured is removed before hunting for the
      // institute, so "NIT Karnataka" survives as the only real segment left.
      let rest = raw;
      if (degreeMatch) rest = rest.replace(degreeMatch[0], " ");
      if (yearMatch) rest = rest.replace(yearMatch[0], " ");
      rest = rest
        .replace(labelledScoreRe, " ")
        .replace(trailingScoreRe, " ")
        .replace(new RegExp(percentRe.source, "g"), " ");

      const segments = splitEducationSegments(rest);
      const institution =
        segments.find((segment) => INSTITUTION_HINT_RE.test(segment)) ||
        segments.find(
          (segment) =>
            segment.split(/\s+/).length >= 2 &&
            /^[A-Za-z][A-Za-z.&'\- ]{4,}$/.test(segment) &&
            !/^(?:in|of)\s/i.test(segment),
        ) ||
        "";

      return {
        degree: degreeMatch ? degreeMatch[0].trim() : "",
        field: extractFieldOfStudy(raw),
        institution,
        year: yearMatch ? yearMatch[0].trim() : "",
        score,
        gradeType,
        raw,
      };
    });
}

export function categorizeSkills(skillsList) {
  const categorized = {
    programming: [],
    web: [],
    cloudDevops: [],
    databases: [],
    dataAi: [],
    toolsOther: [],
  };
  const lowerMap = new Map();
  for (const [cat, list] of Object.entries(SKILL_DATABASE)) {
    for (const item of list) {
      lowerMap.set(item.toLowerCase(), cat);
    }
  }

  for (const skill of skillsList || []) {
    const s = skill.toLowerCase();
    const cat = lowerMap.get(s);
    if (cat === "programming") categorized.programming.push(skill);
    else if (cat === "web") categorized.web.push(skill);
    else if (cat === "cloud" || cat === "devops") categorized.cloudDevops.push(skill);
    else if (cat === "databases" || cat === "dba") categorized.databases.push(skill);
    else if (cat === "ai" || cat === "data") categorized.dataAi.push(skill);
    else categorized.toolsOther.push(skill);
  }
  return categorized;
}

// Weights sum to 100. The newer sections (education detail, projects, badges,
// eligibility) are folded in by trimming the older buckets rather than adding
// points on top, so the score keeps meaning "how complete is this resume".
export function computeCompletenessScore(fields) {
  let score = 0;
  const checklist = [];

  const check = (points, complete, okLabel, missLabel) => {
    if (complete) score += points;
    checklist.push({ label: complete ? okLabel : missLabel, complete: Boolean(complete) });
  };

  check(8, !!fields.name, "Full name detected", "Name missing");

  check(
    12,
    Boolean(fields.email && fields.phone),
    "Contact info (email & phone)",
    "Contact info incomplete",
  );

  check(
    12,
    Boolean(fields.summary && fields.summary.length >= 40),
    "Professional summary",
    "Summary too short or missing",
  );

  const skillCount = fields.skillsList?.length || 0;
  check(
    16,
    skillCount >= 5,
    `${skillCount} skills identified`,
    "Fewer than 5 skills detected",
  );

  check(
    18,
    Boolean(fields.experience && fields.experience.length > 50),
    "Work experience section",
    "Work experience sparse or missing",
  );

  check(8, Boolean(fields.education), "Education section", "Education missing");

  const educationDetail = (fields.structuredEducation || []).some(
    (row) => row.institution || row.year || row.score,
  );
  check(
    4,
    educationDetail,
    "Qualification details (institute, year, score)",
    "Qualification details missing (institute, year, score)",
  );

  const projects = fields.structuredProjects || [];
  check(
    4,
    projects.length > 0,
    `${projects.length} project(s) listed`,
    "No projects listed",
  );
  const projectsWithRole = projects.some(
    (p) => p.role || (p.responsibilities || []).length > 0,
  );
  check(
    4,
    projectsWithRole,
    "Project role & responsibilities",
    "Projects have no role or responsibilities",
  );

  const certs = fields.structuredCertifications || [];
  check(
    3,
    certs.length > 0,
    `${certs.length} certificate(s) / achievement(s)`,
    "No certifications or achievements",
  );
  check(
    3,
    certs.some((c) => c.credentialId || c.url),
    "Credential ID or verification link",
    "Certificates have no credential ID or link",
  );

  check(
    4,
    Boolean(fields.links?.linkedin || fields.links?.github),
    "Professional links attached",
    "No LinkedIn/GitHub links found",
  );

  const eligibility = fields.personal || {};
  check(
    4,
    Boolean(eligibility.languages || eligibility.nationality || eligibility.passport || eligibility.workAuthorization),
    "Languages / work eligibility",
    "No languages, nationality or work authorization",
  );

  return { score: Math.min(100, score), checklist };
}

export function extractFields(text) {
  // Email — broad match
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "";

  // Phone — Indian + international
  const phone =
    text.match(/(\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/)?.[0] || "";

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Name — first non-empty line that looks like a name (2-5 words, no digits),
  // falling back to a clean capitalized two-word line anywhere in the document.
  const name =
    lines.find((l) => {
      const words = l.split(/\s+/);
      return (
        words.length >= 2 &&
        words.length <= 5 &&
        !/\d/.test(l) &&
        l.length < 60 &&
        !/@/.test(l) &&
        !/^(email|phone|objective|summary|skills?|education|experience|projects?|certification|address)/i.test(
          l,
        )
      );
    }) ||
    lines.find((l) => /^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(l)) ||
    lines[0] ||
    "";

  // Split the resume into known sections so content is extracted in its
  // original order (Objective -> Experience -> Skills -> Projects -> etc.)
  const sections = splitSections(text);

  const objective = (sections.objective || []).join(" ").trim();
  const summary = objective || (sections.objective || []).join("\n").trim();

  const experienceLines = sections.experience || [];
  const experience = experienceLines.join("\n");
  const experienceCompanies = extractCompanies(experienceLines);

  const skillsText = [
    (sections.skills || []).join("\n"),
    (sections.experience || []).join("\n"),
    text,
  ].join("\n");
  const skillsList = matchSkills(skillsText);
  const skills = skillsList.join(", ");

  const education = extractEducation(sections.education || []);

  const structuredProjects = extractStructuredProjects(sections.projects || []);
  const projects = formatProjects(structuredProjects);

  // Certificate lines carry their own verification data; the joined string below
  // keeps that ID / link visible in the free-text certificate section too.
  const certLines = (sections.certifications || []).filter(
    (l) => !/^(certification|certifications?|licen[cs]es?)\s*:?$/i.test(l),
  );
  const structuredCertifications = extractCertifications(certLines);
  const achievements = (sections.achievements || []).join("\n").trim();
  const certifications = structuredCertifications
    .map((c) =>
      [c.name, c.issuer, c.year, c.credentialId ? `ID ${c.credentialId}` : "", c.url]
        .filter(Boolean)
        .join(" · "),
    )
    .join("\n");

  // "LANGUAGES" is its own section on most resumes; treat it as a personal key.
  const languageLines = (sections.languages || []).length
    ? [`Languages: ${(sections.languages || []).join(", ")}`]
    : [];
  const personal = extractPersonalFields([...(sections.personal || []), ...languageLines]);
  // A label written in the header ("Nationality: Singaporean") only fills a gap
  // the dedicated section left open.
  const headerPersonal = extractPersonalFields(
    lines.slice(0, 14).filter((line) => personalKeyFor(line.split(/[:|]/)[0])),
  );
  for (const [key, value] of Object.entries(headerPersonal)) {
    if (!personal[key]) personal[key] = value;
  }
  const personalDetails = formatPersonalDetails(personal);

  // Location: prefer the Present Address value, then any line that reads like
  // an address containing a country/city.
  const addressLine = lines.find((l) => /present\s*address/i.test(l));
  const location = addressLine
    ? addressLine.replace(/^present\s*address\s*[:.]?\s*/i, "").trim()
    : lines.find(
        (l) =>
          /(singapore|india|united states|usa|uk|united kingdom|canada|germany|australia|dubai|uae|bangalore|mumbai|delhi|hyderabad|pune)/i.test(
            l,
          ) &&
          /\d/.test(l) &&
          l.length > 12 &&
          !/@/.test(l),
      ) || "";

  const links = extractLinks(text);
  const structuredExperience = extractStructuredExperience(experienceLines);
  const structuredEducation = extractStructuredEducation(sections.education || []);
  const skillsByCategory = categorizeSkills(skillsList);
  const hasWorkAuthorization =
    /\b(?:work\s*(?:permit|authorization|authorisation)|employment\s*pass|visa|eligible\s*to\s*work|right\s*to\s*work)\b/i.test(
      text,
    );
  if (hasWorkAuthorization && !personal.workAuthorization) {
    personal.workAuthorization =
      text
        .match(
          /[^\n.]{0,60}\b(?:work\s*(?:permit|authorization|authorisation)|employment\s*pass|visa|eligible\s*to\s*work|right\s*to\s*work)\b[^\n.]{0,60}/i,
        )?.[0]
        ?.trim() || "";
  }

  const fields = {
    name,
    email,
    phone,
    location,
    links,
    summary,
    education,
    structuredEducation,
    skills,
    skillsList,
    skillsByCategory,
    experience,
    structuredExperience,
    experienceCompanies,
    projects,
    structuredProjects,
    certifications,
    structuredCertifications,
    achievements,
    personal,
    personalDetails,
  };

  fields.improvements = suggestImprovements(fields);
  fields.suggestedTemplates = suggestTemplates(fields);
  fields.audit = computeCompletenessScore(fields);

  return fields;
}

router.post("/resume", protect, upload.single("resume"), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      return res.json({ ok: false, message: "No file uploaded." });
    }

    const originalName = req.file.originalname.toLowerCase();
    const ext = path.extname(originalName);

    // Validate file signature (magic bytes) for PDF and DOCX
    const buffer = fs.readFileSync(filePath);
    if (ext === ".pdf" && !buffer.slice(0, 4).toString().startsWith("%PDF")) {
      fs.unlinkSync(filePath);
      return res.json({ ok: false, message: "File does not appear to be a valid PDF." });
    }
    if (ext === ".docx") {
      // DOCX is a ZIP archive — check for PK header
      const header = buffer.slice(0, 4);
      if (header[0] !== 0x50 || header[1] !== 0x4b) {
        fs.unlinkSync(filePath);
        return res.json({ ok: false, message: "File does not appear to be a valid DOCX." });
      }
    }

    let text = "";

    if (ext === ".pdf") {
      const Parser = await getPDFParser();
      const parser = Parser({ data: buffer, verbosity: 0 });
      const parsed = await parser.getText();
      text = cleanPdfText(parsed.text || "");
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (ext === ".txt") {
      text = buffer.toString("utf-8");
    } else {
      return res.json({
        ok: false,
        message: "Only PDF, DOCX, or TXT files are allowed.",
      });
    }

    // Clean up uploaded file immediately
    try {
      fs.unlinkSync(filePath);
    } catch {}

    res.json({
      ok: true,
      text,
      fields: extractFields(text),
    });
  } catch (err) {
    // Always clean up temp file on error
    if (filePath)
      try {
        fs.unlinkSync(filePath);
      } catch {}
    res.json({ ok: false, message: err.message });
  }
});

export default router;
