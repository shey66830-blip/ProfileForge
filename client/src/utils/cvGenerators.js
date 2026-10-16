// CV generation, section order and completeness.
//
// This module exists because a CV is not a longer resume. It is read by a search
// committee, ordered around scholarship (profile, education, publications,
// funding, teaching, referees) and scored against a full academic record. Resume
// rendering stays in generators.js; the shared row-to-text helpers are imported
// from there so a qualification or a certificate reads the same in both.
import {
  certificationsToText,
  educationToText,
  personalToText,
  projectsToText,
} from "./generators.js";

// The CV layout set is intentionally smaller than the resume set: a CV is judged
// on its sections and their order, not on decoration.
export const CV_TEMPLATES = [
  {
    id: "academic",
    label: "Academic",
    description: "Publications, funding and referees first — for research, teaching and PhD CVs",
  },
  {
    id: "research",
    label: "Research",
    description: "Research interests and outputs lead — for postdoc and research roles",
  },
  {
    id: "industry",
    label: "Industry",
    description: "Experience and skills first, publications condensed — for industry applications",
  },
  {
    id: "ats",
    label: "Plain (ATS)",
    description: "Single-column plain text that parses cleanly in ATS and web forms",
  },
];

export const BLANK_PUBLICATION_ROW = { title: "", authors: "", venue: "", year: "", url: "" };
export const BLANK_GRANT_ROW = { name: "", kind: "Grant", issuer: "", year: "", detail: "" };
export const BLANK_TALK_ROW = { title: "", event: "", kind: "Talk", year: "", location: "" };
export const BLANK_TEACHING_ROW = { course: "", role: "", institution: "", period: "", level: "" };
export const BLANK_REFERENCE_ROW = { name: "", role: "", organization: "", contact: "" };

const clean = (value) => (typeof value === "string" ? value.trim() : "");

// Rows only count once their identifying field is filled, so a half-typed row
// never shows up in the preview, the export or the checklist.
const rowsWith = (rows, key) => (rows || []).filter((row) => row && clean(row[key]));

const toLines = (value) => {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
};

// Skills are typed as one line of comma-separated methods far more often than as
// a list, so count the separators too before calling the section empty.
const countSkills = (value) =>
  toLines(value)
    .flatMap((line) => line.split(/[,;·|]/))
    .map((skill) => skill.trim())
    .filter(Boolean).length;

export function publicationsToText(data = {}) {
  const rows = rowsWith(data.publicationsRows, "title");
  const blocks = rows.map((row) => {
    const linesOut = [`• ${clean(row.title)}`];
    if (clean(row.authors)) linesOut.push(`  Authors: ${clean(row.authors)}`);
    if (clean(row.venue)) linesOut.push(`  Venue: ${clean(row.venue)}`);
    if (clean(row.year)) linesOut.push(`  Year: ${clean(row.year)}`);
    if (clean(row.url)) linesOut.push(`  Link: ${clean(row.url)}`);
    return linesOut.join("\n");
  });
  const extra = clean(data.publications);
  if (blocks.length && extra) return `${blocks.join("\n")}\n${extra}`;
  return blocks.length ? blocks.join("\n") : extra;
}

export function grantsToText(data = {}) {
  const rows = rowsWith(data.grantsRows, "name");
  const blocks = rows.map((row) => {
    const parts = [`• ${clean(row.kind) || "Award"}: ${clean(row.name)}`];
    if (clean(row.issuer)) parts.push(`  Issuer: ${clean(row.issuer)}`);
    if (clean(row.year)) parts.push(`  Year: ${clean(row.year)}`);
    if (clean(row.detail)) parts.push(`  Detail: ${clean(row.detail)}`);
    return parts.join("\n");
  });
  const extra = clean(data.grants);
  if (blocks.length && extra) return `${blocks.join("\n")}\n${extra}`;
  return blocks.length ? blocks.join("\n") : extra;
}

export function talksToText(data = {}) {
  const rows = rowsWith(data.talksRows, "title");
  const blocks = rows.map((row) => {
    const parts = [`• ${clean(row.title)}`];
    if (clean(row.event)) parts.push(`  Event: ${clean(row.event)}`);
    if (clean(row.kind)) parts.push(`  Type: ${clean(row.kind)}`);
    if (clean(row.year)) parts.push(`  Year: ${clean(row.year)}`);
    if (clean(row.location)) parts.push(`  Location: ${clean(row.location)}`);
    return parts.join("\n");
  });
  const extra = clean(data.talks);
  if (blocks.length && extra) return `${blocks.join("\n")}\n${extra}`;
  return blocks.length ? blocks.join("\n") : extra;
}

export function teachingToText(data = {}) {
  const rows = rowsWith(data.teachingRows, "course");
  const lines = rows.map((row) => {
    const head = [clean(row.course), clean(row.role) && `as ${clean(row.role)}`]
      .filter(Boolean)
      .join(" ");
    const tail = [clean(row.institution), clean(row.level), clean(row.period)].filter(Boolean);
    return tail.length ? `• ${head} — ${tail.join(" · ")}` : `• ${head}`;
  });
  const extra = clean(data.teaching);
  if (lines.length && extra) return `${lines.join("\n")}\n${extra}`;
  return lines.length ? lines.join("\n") : extra;
}

export function referencesToText(data = {}) {
  const rows = rowsWith(data.referencesRows, "name");
  const lines = rows.map((row) => {
    const head = [clean(row.name), clean(row.role), clean(row.organization)]
      .filter(Boolean)
      .join(", ");
    return clean(row.contact) ? `${head} — ${clean(row.contact)}` : head;
  });
  const extra = clean(data.references);
  if (lines.length && extra) return `${lines.join("\n")}\n${extra}`;
  return lines.length ? lines.join("\n") : extra;
}

function membershipsToText(data = {}) {
  return toLines(data.memberships).join("\n");
}

// Heading labels per template: the same section is named differently in an
// academic CV and in an industry CV.
const HEADINGS = {
  academic: {
    profile: "ACADEMIC PROFILE",
    researchInterests: "RESEARCH INTERESTS",
    education: "EDUCATION",
    publications: "PUBLICATIONS & RESEARCH",
    grants: "GRANTS, AWARDS & TALKS",
    talks: "INVITED TALKS & PRESENTATIONS",
    teaching: "TEACHING & SUPERVISION",
    experience: "PROFESSIONAL EXPERIENCE",
    research: "RESEARCH EXPERIENCE",
    projects: "RESEARCH & PROJECTS",
    skills: "SKILLS & METHODS",
    certifications: "CERTIFICATIONS",
    memberships: "PROFESSIONAL MEMBERSHIPS",
    personal: "PERSONAL DETAILS & ELIGIBILITY",
    references: "REFERENCES",
  },
  research: {
    profile: "RESEARCH PROFILE",
    researchInterests: "RESEARCH INTERESTS",
    education: "EDUCATION",
    publications: "PUBLICATIONS",
    grants: "FUNDING & AWARDS",
    talks: "PRESENTATIONS",
    teaching: "TEACHING",
    experience: "RESEARCH & PROFESSIONAL EXPERIENCE",
    research: "RESEARCH EXPERIENCE",
    projects: "RESEARCH PROJECTS",
    skills: "METHODS & TOOLS",
    certifications: "CERTIFICATIONS",
    memberships: "MEMBERSHIPS",
    personal: "PERSONAL DETAILS",
    references: "REFERENCES",
  },
  industry: {
    profile: "PROFESSIONAL SUMMARY",
    researchInterests: "AREAS OF INTEREST",
    education: "EDUCATION",
    publications: "SELECTED PUBLICATIONS",
    grants: "AWARDS & RECOGNITION",
    talks: "TALKS & PRESENTATIONS",
    teaching: "TEACHING",
    experience: "PROFESSIONAL EXPERIENCE",
    research: "RESEARCH EXPERIENCE",
    projects: "PROJECTS",
    skills: "SKILLS",
    certifications: "CERTIFICATIONS",
    memberships: "PROFESSIONAL MEMBERSHIPS",
    personal: "ADDITIONAL DETAILS",
    references: "REFERENCES",
  },
};

// Long-form layouts lead with scholarship, short ones lead with experience.
const ORDERS = {
  academic: [
    "profile",
    "researchInterests",
    "education",
    "publications",
    "grants",
    "talks",
    "teaching",
    "research",
    "experience",
    "projects",
    "skills",
    "certifications",
    "memberships",
    "personal",
    "references",
  ],
  research: [
    "profile",
    "researchInterests",
    "education",
    "publications",
    "grants",
    "research",
    "teaching",
    "talks",
    "skills",
    "projects",
    "experience",
    "certifications",
    "memberships",
    "personal",
    "references",
  ],
  industry: [
    "profile",
    "experience",
    "skills",
    "projects",
    "education",
    "certifications",
    "publications",
    "grants",
    "talks",
    "teaching",
    "researchInterests",
    "research",
    "memberships",
    "personal",
    "references",
  ],
  ats: [
    "profile",
    "education",
    "experience",
    "research",
    "publications",
    "grants",
    "talks",
    "teaching",
    "projects",
    "skills",
    "certifications",
    "memberships",
    "researchInterests",
    "personal",
    "references",
  ],
};

// The plain layout prints "Title: body" instead of shouting headings, so an ATS
// reads a label it recognises.
const PLAIN_MODE = {
  profile: "Profile",
  researchInterests: "Research interests",
  education: "Education",
  publications: "Publications",
  grants: "Grants & awards",
  talks: "Talks",
  teaching: "Teaching",
  experience: "Experience",
  research: "Research",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  memberships: "Memberships",
  personal: "Personal details",
  references: "References",
};

export function cvSectionBodies(data = {}) {
  return {
    profile: clean(data.summary),
    researchInterests: clean(data.researchInterests),
    education: educationToText(data),
    publications: publicationsToText(data),
    grants: grantsToText(data),
    talks: talksToText(data),
    teaching: teachingToText(data),
    experience: clean(data.experience),
    research: clean(data.research),
    projects: projectsToText(data),
    skills: clean(data.skills),
    certifications: certificationsToText(data),
    memberships: membershipsToText(data),
    personal: personalToText(data),
    references: referencesToText(data),
  };
}

// One section list drives the live preview and the saved text, so what the user
// sees on paper is exactly what the document will contain.
export function cvSections(data = {}, template = "academic") {
  const bodies = cvSectionBodies(data);
  const order = ORDERS[template] || ORDERS.academic;
  const headings = HEADINGS[template] || HEADINGS.academic;
  const plain = template === "ats";

  return order
    .map((key) => {
      const body = (bodies[key] || "").trim();
      const title = plain ? PLAIN_MODE[key] || key : headings[key] || key;
      return { key, title, body, plain };
    })
    .filter((section) => section.body);
}

export function cvHeadline(data = {}) {
  return [
    clean(data.name),
    [data.email, data.phone, data.location].map(clean).filter(Boolean).join(" | "),
    [data.profession, data.orcid, data.scholar].map(clean).filter(Boolean).join(" · "),
    [data.linkedin, data.github, data.portfolio].map(clean).filter(Boolean).join(" | "),
  ].filter(Boolean);
}

export function generateCVText(data = {}, template = "academic") {
  const headline = cvHeadline(data).join("\n");
  const body = cvSections(data, template)
    .map((section) =>
      section.plain ? `${section.title}: ${section.body}` : `${section.title}\n${section.body}`,
    )
    .join("\n\n");
  return body ? `${headline}\n\n${body}` : headline;
}

// ── Completeness: the full academic CV, asked for as questions ────────────────
//
// Every item names the step that fixes it and the question the builder should
// ask, so a thin CV turns into a checklist instead of a silent low score.
const CV_CHECKLIST = [
  {
    key: "contact",
    label: "Name, email & phone",
    weight: 10,
    step: "heading",
    complete: (form) => Boolean(form.name && form.email && form.phone),
    ask: "Who are you and how should a committee reach you?",
  },
  {
    key: "location",
    label: "City / country",
    weight: 5,
    step: "heading",
    complete: (form) => Boolean(clean(form.location)),
    ask: "Which city and country are you based in?",
  },
  {
    key: "identity",
    label: "ORCID or Scholar profile",
    weight: 3,
    step: "heading",
    complete: (form) => Boolean(clean(form.orcid) || clean(form.scholar)),
    ask: "Do you have an ORCID iD or Google Scholar profile?",
  },
  {
    key: "profile",
    label: "Academic profile",
    weight: 10,
    step: "profile",
    complete: (form) => clean(form.summary).length >= 60,
    ask: "Describe your field, your current position and what your research is known for (3–4 lines).",
  },
  {
    key: "researchInterests",
    label: "Research interests",
    weight: 6,
    step: "profile",
    complete: (form) => Boolean(clean(form.researchInterests) || clean(form.research)),
    ask: "Which research areas do you work in?",
  },
  {
    key: "education",
    label: "Education with degree & institution",
    weight: 10,
    step: "education",
    complete: (form) =>
      rowsWith(form.educationRows, "degree").length > 0 ||
      rowsWith(form.educationRows, "institution").length > 0 ||
      Boolean(clean(form.education)),
    ask: "List every degree with its institution, year and score.",
  },
  {
    key: "publications",
    label: "Publications",
    weight: 12,
    step: "publications",
    complete: (form) =>
      rowsWith(form.publicationsRows, "title").length > 0 || Boolean(clean(form.publications)),
    ask: "Which papers, chapters or preprints have you published?",
  },
  {
    key: "publicationLinks",
    label: "DOI or link per publication",
    weight: 6,
    step: "publications",
    complete: (form) => rowsWith(form.publicationsRows, "url").length > 0,
    ask: "Can you add a DOI or link for each publication?",
  },
  {
    key: "grants",
    label: "Grants, awards or fellowships",
    weight: 8,
    step: "grants",
    complete: (form) => rowsWith(form.grantsRows, "name").length > 0 || Boolean(clean(form.grants)),
    ask: "What funding, fellowships or awards have you received, and from whom?",
  },
  {
    key: "talks",
    label: "Talks & conference presentations",
    weight: 6,
    step: "talks",
    complete: (form) => rowsWith(form.talksRows, "title").length > 0 || Boolean(clean(form.talks)),
    ask: "Which conferences or seminars have you presented at?",
  },
  {
    key: "teaching",
    label: "Teaching or supervision",
    weight: 6,
    step: "teaching",
    complete: (form) =>
      rowsWith(form.teachingRows, "course").length > 0 || Boolean(clean(form.teaching)),
    ask: "Which courses have you taught or supervised, and at what level?",
  },
  {
    key: "experience",
    label: "Research or professional experience",
    weight: 8,
    step: "experience",
    complete: (form) => clean(form.experience).length > 60 || clean(form.research).length > 40,
    ask: "Where have you worked or researched, and what did you deliver?",
  },
  {
    key: "skills",
    label: "Skills & methods",
    weight: 6,
    step: "skills",
    complete: (form) => countSkills(form.skills) >= 5,
    ask: "List your methods, tools and technical skills.",
  },
  {
    key: "references",
    label: "Two referees",
    weight: 6,
    step: "references",
    complete: (form) =>
      rowsWith(form.referencesRows, "name").length >= 2 || Boolean(clean(form.references)),
    ask: "Name two referees — their role, institution and contact.",
  },
  {
    key: "referenceContact",
    label: "Referee contact details",
    weight: 3,
    step: "references",
    complete: (form) => rowsWith(form.referencesRows, "contact").length > 0,
    ask: "What are your referees' official email addresses?",
  },
  {
    key: "memberships",
    label: "Professional memberships",
    weight: 2,
    step: "extra",
    complete: (form) => Boolean(clean(form.memberships)),
    ask: "Which societies or professional bodies are you a member of?",
  },
  {
    key: "eligibility",
    label: "Languages & work eligibility",
    weight: 7,
    step: "eligibility",
    complete: (form) =>
      Boolean(
        clean(form.languages) ||
        clean(form.nationality) ||
        clean(form.passport) ||
        clean(form.nric) ||
        clean(form.workAuthorization),
      ),
    ask: "Which languages do you speak, and what is your work authorization for overseas roles?",
  },
];

export function computeCvChecklist(form = {}) {
  const total = CV_CHECKLIST.reduce((sum, item) => sum + item.weight, 0);
  const items = CV_CHECKLIST.map((item) => {
    const complete = Boolean(item.complete(form));
    return {
      key: item.key,
      label: item.label,
      step: item.step,
      weight: item.weight,
      complete,
      ask: item.ask,
    };
  });
  const earned = items.reduce((sum, item) => (item.complete ? sum + item.weight : sum), 0);
  return {
    score: Math.round((earned / total) * 100),
    items,
    missing: items.filter((item) => !item.complete),
  };
}

// What has to be in place before a CV can be saved. Everything else is
// recommended — a CV is graded on depth, not blocked by it.
export function cvBlockingFields(form = {}) {
  const missing = [];
  if (!clean(form.name)) missing.push("name");
  if (!clean(form.email)) missing.push("email");
  if (!clean(form.phone)) missing.push("phone");
  if (!clean(form.location)) missing.push("location");
  if (!clean(form.summary)) missing.push("academic profile");
  const education =
    rowsWith(form.educationRows, "degree").length > 0 ||
    rowsWith(form.educationRows, "institution").length > 0 ||
    Boolean(clean(form.education));
  if (!education) missing.push("education");
  const depth =
    rowsWith(form.publicationsRows, "title").length > 0 ||
    rowsWith(form.grantsRows, "name").length > 0 ||
    rowsWith(form.teachingRows, "course").length > 0 ||
    clean(form.experience).length > 0;
  if (!depth) missing.push("one of publications, grants, teaching or experience");
  return missing;
}

export function cvTemplateSuggestions(form = {}) {
  const suggestions = [];
  const publications = rowsWith(form.publicationsRows, "title").length;
  const grants = rowsWith(form.grantsRows, "name").length;
  const teaching = rowsWith(form.teachingRows, "course").length;

  if (publications >= 2 || teaching > 0 || grants > 0) suggestions.push("academic");
  if (publications >= 1 && teaching === 0) suggestions.push("research");
  if (!publications && clean(form.experience).length > 120) suggestions.push("industry");
  if (!publications && !clean(form.summary)) suggestions.push("ats");
  if (!suggestions.length) suggestions.push("academic");
  return [...new Set(suggestions)];
}
