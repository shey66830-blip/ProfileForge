// ── ATS-Safe Template Generator ────────────────────────────────────
// Produces a deterministic, single-column, plain-text resume that
// ATS parsers can read reliably. No tables, no columns, no graphics.

/**
 * Standard section order for ATS-safe output.
 * Must match the order ATS parsers expect.
 */
const SECTION_ORDER = [
  "contact",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "links",
];

/**
 * Section heading labels (displayed in the output).
 */
const SECTION_LABELS = {
  contact: "CONTACT",
  summary: "PROFESSIONAL SUMMARY",
  experience: "EXPERIENCE",
  education: "EDUCATION",
  skills: "SKILLS",
  projects: "PROJECTS",
  certifications: "CERTIFICATIONS",
  links: "LINKS",
};

/**
 * Escape special characters for safe HTML rendering.
 */
function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate an ATS-safe HTML document (single-column, no styling tricks).
 * @param {object} profile - The canonical profile or document data
 * @returns {string} HTML string
 */
export function generateATSHTML(profile) {
  const sections = [];

  // ── Contact ──
  const contact = profile.contact || {};
  const contactParts = [];
  if (contact.name) contactParts.push(`<strong>${esc(contact.name)}</strong>`);
  if (contact.email) contactParts.push(`<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`);
  if (contact.phone) contactParts.push(`<span>${esc(contact.phone)}</span>`);
  if (contact.location) contactParts.push(`<span>${esc(contact.location)}</span>`);

  if (contactParts.length) {
    sections.push({
      key: "contact",
      html: `<div style="text-align:center;margin-bottom:12px;">${contactParts.join(" &nbsp;|&nbsp; ")}</div>`,
    });
  }

  // ── Summary ──
  if (profile.summary) {
    sections.push({
      key: "summary",
      html: `<p style="margin:0;">${esc(profile.summary)}</p>`,
    });
  }

  // ── Experience ──
  if (profile.experience?.length) {
    const items = profile.experience.map((exp) => {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      const header = [exp.title, exp.company].filter(Boolean).join(" at ");
      const parts = [];
      if (header) parts.push(`<strong>${esc(header)}</strong>`);
      if (dates) parts.push(`<em>${esc(dates)}</em>`);
      if (exp.location) parts.push(`<span>${esc(exp.location)}</span>`);
      const headerLine = parts.join(", ");
      const desc = exp.description ? `<div style="margin-top:4px;">${esc(exp.description).replace(/\n/g, "<br/>")}</div>` : "";
      return `<li style="margin-bottom:8px;">${headerLine}${desc}</li>`;
    });
    sections.push({
      key: "experience",
      html: `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`,
    });
  }

  // ── Education ──
  if (profile.education?.length) {
    const items = profile.education.map((edu) => {
      const parts = [];
      if (edu.degree) parts.push(`<strong>${esc(edu.degree)}</strong>`);
      if (edu.institution) parts.push(`<span>${esc(edu.institution)}</span>`);
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      if (dates) parts.push(`<em>${esc(dates)}</em>`);
      if (edu.gpa) parts.push(`<span>GPA: ${esc(edu.gpa)}</span>`);
      return `<li style="margin-bottom:6px;">${parts.join(", ")}</li>`;
    });
    sections.push({
      key: "education",
      html: `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`,
    });
  }

  // ── Skills ──
  if (profile.skills?.length) {
    const skillNames = profile.skills.map((s) => esc(typeof s === "string" ? s : s.name));
    sections.push({
      key: "skills",
      html: `<p style="margin:0;">${skillNames.join(", ")}</p>`,
    });
  }

  // ── Projects ──
  if (profile.projects?.length) {
    const items = profile.projects.map((proj) => {
      const parts = [];
      if (proj.title) parts.push(`<strong>${esc(proj.title)}</strong>`);
      const dates = [proj.startDate, proj.endDate].filter(Boolean).join(" – ");
      if (dates) parts.push(`<em>${esc(dates)}</em>`);
      const header = parts.join(", ");
      const desc = proj.description ? `<div style="margin-top:4px;">${esc(proj.description).replace(/\n/g, "<br/>")}</div>` : "";
      const tech = proj.technologies?.length ? `<div style="margin-top:2px;"><em>Tech: ${proj.technologies.map(esc).join(", ")}</em></div>` : "";
      return `<li style="margin-bottom:8px;">${header}${desc}${tech}</li>`;
    });
    sections.push({
      key: "projects",
      html: `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`,
    });
  }

  // ── Certifications ──
  if (profile.certifications?.length) {
    const items = profile.certifications.map((cert) => {
      const parts = [];
      if (cert.name) parts.push(`<strong>${esc(cert.name)}</strong>`);
      if (cert.issuer) parts.push(`<span>${esc(cert.issuer)}</span>`);
      if (cert.date) parts.push(`<em>${esc(cert.date)}</em>`);
      return `<li style="margin-bottom:4px;">${parts.join(", ")}</li>`;
    });
    sections.push({
      key: "certifications",
      html: `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`,
    });
  }

  // ── Links ──
  if (profile.links?.length) {
    const items = profile.links.map((link) => {
      const label = link.label || link.url;
      return `<li><a href="${esc(link.url)}">${esc(label)}</a></li>`;
    });
    sections.push({
      key: "links",
      html: `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`,
    });
  }

  // ── Build HTML in standard order ──
  const sectionMap = {};
  for (const s of sections) sectionMap[s.key] = s.html;

  const orderedSections = SECTION_ORDER.filter((k) => sectionMap[k]);

  let html = "";
  for (const key of orderedSections) {
    html += `<h2 style="font-size:13px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin:16px 0 8px 0;">${SECTION_LABELS[key]}</h2>\n`;
    html += sectionMap[key] + "\n";
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; color: #222; margin: 0; padding: 24px; }
    h2 { font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 16px 0 8px 0; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 6px; }
    a { color: #222; text-decoration: none; }
    strong { font-weight: 600; }
    em { color: #555; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Generate a plain-text version of the profile for ATS.
 * Single-column, no formatting, standard section headings.
 * @param {object} profile
 * @returns {string} Plain text
 */
export function generateATSPlainText(profile) {
  const lines = [];

  // Contact
  const contact = profile.contact || {};
  if (contact.name) lines.push(contact.name);
  const contactDetails = [contact.email, contact.phone, contact.location].filter(Boolean);
  if (contactDetails.length) lines.push(contactDetails.join(" | "));
  if (contact.name || contactDetails.length) lines.push("");

  // Summary
  if (profile.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(profile.summary);
    lines.push("");
  }

  // Experience
  if (profile.experience?.length) {
    lines.push("EXPERIENCE");
    for (const exp of profile.experience) {
      const header = [exp.title, exp.company].filter(Boolean).join(" at ");
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      const parts = [header, dates, exp.location].filter(Boolean);
      if (parts.length) lines.push(parts.join(", "));
      if (exp.description) {
        const descLines = exp.description.split("\n").filter(Boolean);
        for (const dl of descLines) {
          lines.push("  " + dl.replace(/^[-•*]\s*/, "- "));
        }
      }
      lines.push("");
    }
  }

  // Education
  if (profile.education?.length) {
    lines.push("EDUCATION");
    for (const edu of profile.education) {
      const parts = [edu.degree, edu.institution].filter(Boolean);
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      if (dates) parts.push(dates);
      if (edu.gpa) parts.push("GPA: " + edu.gpa);
      lines.push(parts.join(", "));
    }
    lines.push("");
  }

  // Skills
  if (profile.skills?.length) {
    lines.push("SKILLS");
    const names = profile.skills.map((s) => typeof s === "string" ? s : s.name);
    lines.push(names.join(", "));
    lines.push("");
  }

  // Projects
  if (profile.projects?.length) {
    lines.push("PROJECTS");
    for (const proj of profile.projects) {
      const dates = [proj.startDate, proj.endDate].filter(Boolean).join(" – ");
      const header = [proj.title, dates].filter(Boolean).join(", ");
      if (header) lines.push(header);
      if (proj.description) {
        const descLines = proj.description.split("\n").filter(Boolean);
        for (const dl of descLines) lines.push("  " + dl.replace(/^[-•*]\s*/, "- "));
      }
      if (proj.technologies?.length) lines.push("  Tech: " + proj.technologies.join(", "));
      lines.push("");
    }
  }

  // Certifications
  if (profile.certifications?.length) {
    lines.push("CERTIFICATIONS");
    for (const cert of profile.certifications) {
      const parts = [cert.name, cert.issuer, cert.date].filter(Boolean);
      lines.push(parts.join(", "));
    }
    lines.push("");
  }

  // Links
  if (profile.links?.length) {
    lines.push("LINKS");
    for (const link of profile.links) {
      const label = link.label || link.url;
      lines.push(`${label}: ${link.url}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
