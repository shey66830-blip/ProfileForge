import express from "express";
import multer from "multer";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { protect } from "../middleware/authMiddleware.js";
import { matchSkills, ALL_SKILLS as ALL_SKILLS_LOCAL } from "../services/skillDatabase.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Skill matching now lives in services/skillDatabase.js (single source of
// truth shared with skillExtractor/aiResumeAnalyzer). matchSkills is
// imported above; the local database and matcher were removed.

const SECTION_RULES = [
  { key: "objective", re: /^(objective|professional summary|career objective|career summary|profile|summary)\s*:?$/i },
  { key: "experience", re: /^(experience summary|professional experience|work experience|employment summary|employment|area of experience|areas of experience)\s*:?$/i },
  { key: "skills", re: /^(skills?|skill sets?|technical skills|key skills|core competencies|areas of expertise)\s*:?$/i },
  { key: "education", re: /^(education|qualifications?|academic qualifications?|academic details|academic profile)\s*:?$/i },
  { key: "projects", re: /^(projects?|key projects|major projects|academic projects|work projects|major projects and roles)\s*:?$/i },
  { key: "certifications", re: /^(certifications?|certificates?|professional certifications?|licenses?)\s*:?$/i },
  { key: "personal", re: /^(personal details?|personal profile|personal information|additional details)\s*:?$/i },
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
  return (lines || []).filter((line) =>
    /(worked|working)\s+(with|at)\s+.+?(from|since|till|until|–|\d{4})/i.test(line) ||
    /(\b\d{4}\b.*(from|to|–|until|since))|(from|since).*\b\d{4}\b/i.test(line) && /(ltd|limited|pvt|inc|technologies|services|solutions|infra|tele|hcl|tech mahindra|pspl|niscom|indiabulls)/i.test(line)
  );
}

function extractEducation(lines) {
  const degreeRe = /(10th|10\+2|12th|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|mba|mbbs|phd|bachelor|master|diploma|graduate|post.?graduate|b\.?e|m\.?e|ssc|hsc|intermediate)/i;
  const rows = (lines || []).filter((line) => {
    if (/^(standard\/degree|collage\/university|college\/university|degree\s*\|)/i.test(line)) return false;
    return degreeRe.test(line) || (line.includes("|") && /(\d{4}|%)/.test(line));
  });
  return rows.join("\n") || (lines || [])[0] || "";
}

function extractProjects(lines) {
  const normTitle = (s) => s.replace(/^[\s.\-–]+/, "").replace(/[.\s]+$/, "").trim().toLowerCase();
  const blocks = [];
  let current = null;
  for (const line of lines || []) {
    if (/^project\s*[:.\-–]?\s*/i.test(line)) {
      const title = line
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
        (normTitle(current.title) === normTitle(title) ||
          normTitle(current.title).includes(normTitle(title)) ||
          normTitle(title).includes(normTitle(current.title)))
      ) {
        current.title = title;
      } else {
        if (current) blocks.push(current);
        current = {
          title,
          client: "",
          period: "",
          product: "",
          role: [],
        };
      }
      continue;
    }
    if (!current) continue;
    const client = line.match(/^client\s*[:.]?\s*(.+)/i);
    const period = line.match(/^period\s*[:.]?\s*(.+)/i);
    const product = line.match(/^product\s*[:.]?\s*(.+)/i);
    const role = line.match(/^role\s*(?:and\s*responsibilities)?\s*[:.]?\s*(.*)/i);
    if (client) current.client = client[1].trim();
    else if (period) current.period = period[1].trim();
    else if (product) current.product = product[1].trim();
    else if (role) {
      if (role[1].trim()) current.role.push(role[1].trim());
    } else if (!/^(project|client|period|product|role)\b/i.test(line)) {
      current.role.push(line.replace(/^[•>\-–\s]+/, ""));
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function formatProjects(blocks) {
  return blocks
    .map((p) => {
      let s = `• ${p.title}`;
      if (p.client) s += `\n  Client: ${p.client}`;
      if (p.period) s += `\n  Period: ${p.period}`;
      if (p.product) s += `\n  Product: ${p.product}`;
      if (p.role.length) {
        s += `\n  Role & Responsibilities:`;
        for (const r of p.role) s += `\n    • ${r}`;
      }
      return s;
    })
    .join("\n\n");
}

function extractPersonalDetails(lines) {
  const keyRe = /^(father'?s\s*name|date\s*of\s*birth|dob|hobbies|present\s*address|address|languages\s*(known)?|passport(\s*(no|number))?|nric(\/fin\s*no)?|marital\s*status|nationality|gender|age)\s*[:.]?\s*(.+)$/i;
  const pairs = [];
  for (const line of lines || []) {
    const m = line.match(keyRe);
    if (m) {
      const key = m[1].trim();
      // The value is always the final capture group (m[m.length - 1]).
      const value = m[m.length - 1].trim();
      pairs.push(`${key}: ${value}`);
    }
  }
  return pairs.join("\n");
}

function suggestImprovements(f) {
  const tips = [];
  if (!f.summary || f.summary.length < 40)
    tips.push("Add a professional summary (2–3 lines) at the top so recruiters understand your profile instantly.");
  if (!f.projects)
    tips.push("Add your major projects with client, period, product, and your role & responsibilities.");
  if (f.skillsList.length < 5)
    tips.push("Add more skills — aim for 8–15 relevant keywords so ATS filters match your resume.");
  if (!f.certifications)
    tips.push("Add professional certifications (AWS, Oracle, vendor-specific) to stand out.");
  if (!f.experienceCompanies.length)
    tips.push("List each employer with the period you worked there (from – to), newest first.");
  if (!/%/.test(f.experience) && !/\d+%/.test(f.experience))
    tips.push("Quantify achievements — add metrics like % improvements, uptime, team size, and database counts.");
  if ((f.experience.split("\n").filter(Boolean).length || 0) > 30)
    tips.push("Your experience section is very long — keep the most relevant 8–12 points per role for ATS readability.");
  if (!f.personalDetails)
    tips.push("Add personal details (address, languages, passport, etc.) if the role requires them.");
  if (tips.length === 0)
    tips.push("Resume looks complete! Tailor the summary and skills to each job description before applying.");
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
const PDF_PAGE_MARKER_RE =
  /^\s*[-–—]+\s*\d+\s*(of|\/)\s*\d+\s*[-–—]+\s*$/i;
const PDF_PAGE_NO_RE =
  /^\s*page\s+\d+\s*(of|\/)\s+\d+\s*$/i;

function cleanPdfText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
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
      if (/^\d+$/.test(line)) return false;          // "1", "2" ...
      if (/^\s*-\s*\d+\s*-\s*$/.test(line)) return false; // "- 3 -"
      if (/^page\s*\d+/i.test(line)) return false;   // "Page 5"
      if (/^pg\.?\s*\d+/i.test(line)) return false;  // "Pg 5"
    }
    return true;
  });

  // Also drop loosely repeated header-ish lines: short lines that appear more than once
  // but weren't caught by the >2 rule (e.g. a 2-page doc where header appears twice).
  const surviving = cleaned.filter((line) => {
    if (counts.get(line) > 1 && line.length < 20) {
      // keep if it looks like meaningful content (has a @ or is a skill-ish line)
      if (!line.includes("@") && !ALL_SKILLS_LOCAL.some((s) => line.toLowerCase().includes(s.toLowerCase()))) {
        return false;
      }
    }
    return true;
  });
  return surviving.join("\n");
}

export function extractFields(text) {
  const lower = text.toLowerCase();

  // Email — broad match
  const email =
    text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "";

  // Phone — Indian + international
  const phone =
    text.match(/(\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/)?.[0] || "";

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

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
        !/^(email|phone|objective|summary|skills?|education|experience|projects?|certification|address)/i.test(l)
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

  const projectBlocks = extractProjects(sections.projects || []);
  const projects = formatProjects(projectBlocks);

  const certifications = (sections.certifications || [])
    .filter((l) => !/^(certification|certifications?)\s*:?$/i.test(l))
    .join("\n");

  const personalDetails = extractPersonalDetails(sections.personal || []);

  // Location: prefer the Present Address value, then any line that reads like
  // an address containing a country/city.
  const addressLine = lines.find((l) => /present\s*address/i.test(l));
  const location = addressLine
    ? addressLine.replace(/^present\s*address\s*[:.]?\s*/i, "").trim()
    : lines.find(
        (l) =>
          /(singapore|india|united states|usa|uk|united kingdom|canada|germany|australia|dubai|uae|bangalore|mumbai|delhi|hyderabad|pune)/i.test(l) &&
          /\d/.test(l) &&
          l.length > 12 &&
          !/@/.test(l)
      ) || "";

  const fields = {
    name,
    email,
    phone,
    location,
    summary,
    education,
    skills,
    skillsList,
    experience,
    experienceCompanies,
    projects,
    certifications,
    personalDetails,
  };

  fields.improvements = suggestImprovements(fields);
  fields.suggestedTemplates = suggestTemplates(fields);

  return fields;
}

router.post("/resume", protect, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ ok: false, message: "No file uploaded." });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();

    let text = "";

    if (originalName.endsWith(".pdf")) {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      const parsed = await parser.getText();
      text = cleanPdfText(parsed.text || "");
    } else if (originalName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (originalName.endsWith(".txt")) {
      text = fs.readFileSync(filePath, "utf-8");
    } else {
      fs.unlinkSync(filePath);
      return res.json({
        ok: false,
        message: "Only PDF, DOCX, or TXT files are allowed.",
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      ok: true,
      text,
      fields: extractFields(text),
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

export default router;