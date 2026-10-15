export const TEMPLATES = [
  { id: "modern", label: "Modern", description: "Clean, sectioned layout with strong headings" },
  { id: "classic", label: "Classic", description: "Traditional format with full paragraphs" },
  { id: "minimal", label: "Minimal", description: "Compact, ATS-friendly plain text" },
  {
    id: "executive",
    label: "Executive",
    description: "Leadership-first layout for senior profiles",
  },
  {
    id: "technical",
    label: "Technical",
    description: "Skills-first layout with projects & certifications",
  },
];

export function generateDocumentText(type, data, template = "modern") {
  if (type === "biodata") return generateBiodata(data);
  if (type === "cv") return generateCV(data, template);
  return generateResume(data, template);
}

function section(title, content) {
  return content && content.trim() ? `\n${title}\n${content.trim()}` : "";
}

function generateResume(data, template) {
  const summary =
    data.summary ||
    "Motivated professional with strong learning ability and practical project experience.";
  const experience =
    data.experience || "Add your internship, work, or volunteering experience here.";
  // The structured rows (education details, project roles, verified
  // certificates, overseas eligibility) are rendered into text here so the
  // saved document, the PDF export and the AI analysis all see them.
  const education = educationToText(data);
  const projects = projectsToText(data) || "Add projects here.";
  const certs = certificationsToText(data);
  const personal = personalToText(data);
  const linksLine = [data.linkedin, data.github, data.portfolio].filter(Boolean).join(" | ");
  const header = `${data.name}\n${data.email} | ${data.phone} | ${data.location}${linksLine ? "\n" + linksLine : ""}`;

  if (template === "classic") {
    return (
      `${header}\n\nPROFESSIONAL SUMMARY\n${summary}\n\nEDUCATION\n${education}\n\nTECHNICAL SKILLS\n${data.skills}\n\nWORK EXPERIENCE\n${experience}\n\nKEY PROJECTS\n${projects}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal)
    );
  }

  if (template === "minimal") {
    return (
      `${header}\n\nSummary: ${summary}\nSkills: ${data.skills}\nEducation: ${education}\nExperience: ${experience}\nProjects: ${projects}` +
      section("Certifications", certs) +
      section("Personal Details", personal)
    );
  }

  if (template === "executive") {
    return (
      `${header}\n\nEXECUTIVE SUMMARY\n${summary}\n\nPROFESSIONAL EXPERIENCE\n${experience}\n\nKEY PROJECTS\n${projects}\n\nEDUCATION\n${education}\n\nSKILLS & EXPERTISE\n${data.skills}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal)
    );
  }

  if (template === "technical") {
    return (
      `${header}\n\nTECHNICAL SKILLS\n${data.skills}\n\nPROJECTS\n${projects}\n\nEXPERIENCE\n${experience}\n\nEDUCATION\n${education}\n\nPROFESSIONAL SUMMARY\n${summary}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal)
    );
  }

  // Modern (default)
  return (
    `${header}\n\nPROFESSIONAL SUMMARY\n${summary}\n\nSKILLS\n${data.skills}\n\nEDUCATION\n${education}\n\nEXPERIENCE\n${experience}\n\nPROJECTS\n${projects}` +
    section("CERTIFICATIONS", certs) +
    section("PERSONAL DETAILS", personal)
  );
}

function generateCV(data, template) {
  const summary =
    data.summary ||
    "Focused learner with interest in academics, projects, and professional development.";
  const education = educationToText(data);
  const projects = projectsToText(data) || "Add academic projects or research work here.";
  const experience =
    data.experience || "Add internships, training, workshops, or achievements here.";
  const certs = certificationsToText(data);
  const personal = personalToText(data);

  if (template === "classic") {
    return (
      `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nACADEMIC PROFILE\n${summary}\n\nEDUCATION\n${education}\n\nRESEARCH & PROJECTS\n${projects}\n\nSKILLS & COMPETENCIES\n${data.skills}\n\nEXPERIENCE & TRAINING\n${experience}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal)
    );
  }

  if (template === "minimal") {
    return (
      `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nProfile: ${summary}\nEducation: ${education}\nSkills: ${data.skills}\nProjects: ${projects}\nExperience: ${experience}` +
      section("Certifications", certs) +
      section("Personal Details", personal)
    );
  }

  if (template === "executive") {
    return (
      `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nPROFESSIONAL PROFILE\n${summary}\n\nCAREER EXPERIENCE\n${experience}\n\nEDUCATION\n${education}\n\nSKILLS & COMPETENCIES\n${data.skills}\n\nRESEARCH & PROJECTS\n${projects}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal)
    );
  }

  if (template === "technical") {
    return (
      `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nTECHNICAL SKILLS\n${data.skills}\n\nPROJECTS / RESEARCH\n${projects}\n\nEXPERIENCE & TRAINING\n${experience}\n\nEDUCATION\n${education}\n\nACADEMIC PROFILE\n${summary}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal)
    );
  }

  // Modern (default)
  return (
    `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nACADEMIC PROFILE\n${summary}\n\nEDUCATION\n${education}\n\nSKILLS\n${data.skills}\n\nPROJECTS / RESEARCH\n${projects}\n\nEXPERIENCE\n${experience}` +
    section("CERTIFICATIONS", certs) +
    section("PERSONAL DETAILS", personal)
  );
}

function generateBiodata(data) {
  const education = educationToText(data);
  return `BIODATA\n\nName: ${data.name}\nAge: ${data.age}\nHeight: ${data.height}\nLocation: ${data.location}\nEmail: ${data.email}\nPhone: ${data.phone}\n\nEducation:\n${education}\n\nAbout:\n${data.summary || "Simple, family-oriented, and career-focused individual."}\n\nFamily Background:\n${data.family}\n\nPartner Preference:\n${data.partnerPreference || "Compatible, respectful, educated, and family-oriented partner."}`;
}
// ── Structured rows → text ──────────────────────────────────────────────────
// The builder collects education, projects, certificates and eligibility
// details as rows so each piece can be extracted, edited and verified on its
// own. These helpers turn those rows back into the plain text an ATS parser, a
// PDF export or an AI reviewer expects, falling back to the legacy free-text
// fields whenever no rows exist.

function cleanRowValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function joinRowParts(parts, separator = " · ") {
  return parts.map(cleanRowValue).filter(Boolean).join(separator);
}

function toTextLines(value) {
  if (Array.isArray(value)) return value.map(cleanRowValue).filter(Boolean);
  return cleanRowValue(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

// "8.7" reads as a CGPA, "88%" as a percentage, and anything else is printed
// exactly as the user typed it.
function scoreLabel(row) {
  const score = cleanRowValue(row.score);
  if (!score) return "";
  if (row.gradeType === "cgpa") return `CGPA ${score}`;
  if (row.gradeType === "percent" || score.includes("%")) return score;
  const numeric = Number(score);
  return Number.isFinite(numeric) && numeric <= 10 ? `CGPA ${score}` : score;
}

export function educationToText(data = {}) {
  const rows = (data.educationRows || []).filter(
    (row) =>
      row &&
      (cleanRowValue(row.degree) ||
        cleanRowValue(row.institution) ||
        cleanRowValue(row.year) ||
        cleanRowValue(row.score)),
  );

  const lines = rows.map((row) => {
    const degree = cleanRowValue(row.degree);
    const field = cleanRowValue(row.field);
    const heading = field ? (degree ? `${degree} in ${field}` : field) : degree;
    const left = [heading, cleanRowValue(row.institution)].filter(Boolean).join(" — ");
    const tail = joinRowParts([cleanRowValue(row.year), scoreLabel(row)]);
    if (left && tail) return `${left} (${tail})`;
    return left || tail;
  });

  const extra = cleanRowValue(data.education);
  if (lines.length && extra) return [...lines, extra].join("\n");
  return lines.length ? lines.join("\n") : extra;
}

export function projectsToText(data = {}) {
  const rows = (data.projectsRows || []).filter(
    (row) => row && (cleanRowValue(row.name) || cleanRowValue(row.role)),
  );

  const blocks = rows.map((row) => {
    const lines = [`• ${cleanRowValue(row.name) || "Project"}`];
    if (cleanRowValue(row.client)) lines.push(`  Client: ${cleanRowValue(row.client)}`);
    if (cleanRowValue(row.period)) lines.push(`  Period: ${cleanRowValue(row.period)}`);
    if (cleanRowValue(row.product)) lines.push(`  Product: ${cleanRowValue(row.product)}`);
    if (cleanRowValue(row.role)) lines.push(`  Role: ${cleanRowValue(row.role)}`);

    const responsibilities = toTextLines(row.responsibilities);
    if (responsibilities.length) {
      lines.push("  Responsibilities:");
      for (const item of responsibilities) lines.push(`    • ${item}`);
    }
    return lines.join("\n");
  });

  const extra = cleanRowValue(data.projects);
  if (blocks.length && extra) return `${blocks.join("\n\n")}\n${extra}`;
  return blocks.length ? blocks.join("\n\n") : extra;
}

export function certificationsToText(data = {}) {
  const rows = (data.certificationsRows || []).filter((row) => row && cleanRowValue(row.name));

  const lines = rows.map((row) => {
    const head = [cleanRowValue(row.name), cleanRowValue(row.issuer)].filter(Boolean).join(" — ");
    const meta = joinRowParts([
      cleanRowValue(row.year),
      cleanRowValue(row.credentialId) ? `ID ${cleanRowValue(row.credentialId)}` : "",
      cleanRowValue(row.url),
    ]);
    return meta ? `${head} (${meta})` : head;
  });

  const parts = [];
  if (lines.length) parts.push(lines.join("\n"));

  const achievements = toTextLines(data.achievements);
  if (achievements.length) {
    parts.push(`Achievements:\n${achievements.map((item) => `• ${item}`).join("\n")}`);
  }

  const extra = cleanRowValue(data.certifications);
  if (extra) parts.push(extra);
  return parts.join("\n");
}

// Order matters: eligibility first, identity numbers next — the way an overseas
// employer reads them.
const PERSONAL_TEXT_ROWS = [
  { key: "nationality", label: "Nationality" },
  { key: "languages", label: "Languages" },
  { key: "workAuthorization", label: "Work authorization" },
  { key: "relocate", label: "Willing to relocate" },
  { key: "passport", label: "Passport" },
  { key: "nric", label: "NRIC / FIN" },
  { key: "dob", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "maritalStatus", label: "Marital status" },
];

export function personalToText(data = {}) {
  const lines = PERSONAL_TEXT_ROWS.map((row) => {
    const value = cleanRowValue(data[row.key]);
    return value ? `${row.label}: ${value}` : "";
  }).filter(Boolean);

  const extra = cleanRowValue(data.personalDetails);
  if (lines.length && extra) return [...lines, extra].join("\n");
  return lines.length ? lines.join("\n") : extra;
}
