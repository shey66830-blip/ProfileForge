// CV extraction.
//
// A CV is not a long resume. It is read by a search committee, sectioned by
// scholarship (profile, education, publications, talks, funding, teaching,
// referees) and it is normal for it to be many pages. So this module splits the
// document with its own heading rules, reads the CV-only sections into rows, and
// scores completeness against a full academic record rather than against the
// "does an ATS find keywords" checklist the resume extractor uses.
//
// The shared identity, skills and link work is reused from resumeExtractor; only
// the CV-shaped parts are defined here.
import {
  SECTION_RULES,
  splitSections,
  extractFields,
  extractEducation,
  formatProjects,
  extractStructuredProjects,
  extractCertifications,
  extractPersonalFields,
  formatPersonalDetails,
  extractStructuredExperience,
  extractStructuredEducation,
  categorizeSkills,
} from "./resumeExtractor.js";
import { matchSkills } from "./skillDatabase.js";
import { POPULAR_COUNTRIES } from "./countryDirectory.js";

// CV headings first, resume headings after: splitSections keeps the first rule
// that matches a line, so "AWARDS" has to reach the CV grants bucket before the
// generic achievements rule sees it.
//
// CVs combine headings constantly ("GRANTS AND AWARDS", "PRESENTATIONS AND
// TALKS"), so each family is built from its base words joined by and/&/,
// instead of listing every combination by hand.
const heading = (...words) =>
  new RegExp(`^(?:${words.join("|")})(?:\\s*(?:&|and|/|,)\\s*(?:${words.join("|")}))*\\s*:?$`, "i");

const PUBLICATION_WORDS = [
  "publications?",
  "peer.?reviewed publications?",
  "journal articles?",
  "conference papers?",
  "book chapters?",
  "selected publications?",
  "research (output|publications)",
  "papers?",
  "manuscripts?",
];
const TALK_WORDS = [
  "invited (talks?|lectures?|seminars?)",
  "keynote (addresses?|talks?)",
  "conference (presentations?|talks?|papers? presented)",
  "presentations?",
  "talks?",
  "seminars?",
  "guest lectures?",
];
const GRANT_WORDS = [
  "grants?",
  "research (grants?|funding)",
  "funding",
  "fellowships?",
  "scholarships?",
  "awards?",
  "honou?rs?",
  "prizes?",
  "distinctions?",
];

const CV_SECTION_RULES = [
  {
    key: "researchInterests",
    re: /^(research (interests?|statement|focus|areas?|themes?)|fields? of (interest|research))\s*:?$/i,
  },
  {
    key: "profile",
    re: /^(academic (profile|record|summary)|research (profile|summary)|professional (profile|summary)|teaching (philosophy|statement)|profile|summary|about\s*me)\s*:?$/i,
  },
  { key: "publications", re: heading(...PUBLICATION_WORDS) },
  { key: "talks", re: heading(...TALK_WORDS) },
  { key: "grants", re: heading(...GRANT_WORDS) },
  {
    key: "teaching",
    re: heading(
      "teaching( experience)?",
      "courses? taught",
      "supervision",
      "mentoring",
      "guest faculty",
    ),
  },
  {
    key: "memberships",
    re: heading(
      "professional (memberships?|affiliations?|bodies|societies|associations?)",
      "memberships?",
      "affiliations?",
      "society memberships?",
    ),
  },
  {
    key: "references",
    re: /^(references?|referees?|referees?\s*[/&]\s*references?|references?\s*available\s*on\s*request)\s*:?$/i,
  },
  {
    key: "research",
    re: /^(research( experience| projects?| work| activities)?|research)\s*:?$/i,
  },
  ...SECTION_RULES,
];

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "•[1] Title" and "12. Title" are both how publications are listed.
function cleanLine(line) {
  return String(line || "")
    .replace(/^[\s\u2022\u25cf\u25aa\u25e6*]+/, "")
    .replace(/^(?:\[\d+\]|\(\d+\)|\d{1,3}[.)])\s*/, "")
    .trim();
}

// A list marker is what tells two consecutive citations apart.
const BLOCK_MARKER_RE = /^(?:\[\d+\]|\(\d+\)|\d{1,3}[.)]\s|[\u2022\u25cf\u25aa\u25e6*])/;

const cleanValue = (value) =>
  String(value == null ? "" : value)
    .replace(/^[\s|;,•—–-]+/, "")
    .replace(/[\s|;,•—–-]+$/, "")
    .trim();

function stripYear(text) {
  return String(text || "")
    .replace(/[([]?\b(?:19|20)\d{2}\b[)]?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;.]+$/, "")
    .trim();
}

function findYear(text) {
  return (String(text || "").match(/\b(?:19|20)\d{2}\b/g) || []).pop() || "";
}

function findYearRange(text) {
  const match = String(text || "").match(
    /\b(?:19|20)\d{2}\s*(?:[-–]|to)\s*(?:(?:19|20)\d{2}|present|current)\b/i,
  );
  return match ? match[0].replace(/\s+/g, "") : "";
}

function findUrl(text) {
  const match = String(text || "").match(
    /https?:\/\/[^\s<>()]+|\b10\.\d{4,9}\/[^\s<>()]+|doi:\s*10\.\d{4,9}\/\S+/i,
  );
  if (!match) return "";
  const raw = match[0].replace(/^doi:\s*/i, "");
  if (raw.startsWith("10.")) return `https://doi.org/${raw.replace(/[.,;]+$/, "")}`;
  return raw.replace(/[.,;]+$/, "");
}

const CONTACT_RE =
  /[\w.+-]+@[\w-]+\.[\w.]+|(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/g;
const withoutContact = (text) =>
  String(text || "")
    .replace(new RegExp(CONTACT_RE.source, "g"), "")
    .replace(/[|·]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

// "Title: … Authors: … Venue: …" is what a structured CV export looks like, and
// tables use " | " between the cells. A label only counts at the start of a line
// or right after a separator, so the "doi." inside a URL is not read as a label.
const LABEL_NAMES = [
  "title",
  "paper",
  "authors?",
  "by",
  "venue",
  "journal",
  "conference",
  "publisher",
  "book",
  "published(?:\\s*in)?",
  "year",
  "date",
  "url",
  "link",
  "doi",
  "name",
  "award",
  "grant",
  "funding",
  "type",
  "kind",
  "amount",
  "detail",
  "issuer",
  "body",
  "role",
  "position",
  "title/role",
  "organization",
  "organisation",
  "institution",
  "university",
  "affiliation",
  "contact",
  "email",
  "phone",
  "course",
  "level",
  "degree",
  "field",
  "period",
  "duration",
  "event",
  "location",
  "city",
];
const LABEL_RE = new RegExp(
  `(?:^|[|;\\u2022]|,\\s*)\\s*(${LABEL_NAMES.join("|")})\\s*[:.]\\s*`,
  "gi",
);

function labelledParts(line) {
  const out = {};
  LABEL_RE.lastIndex = 0;
  let last = null;
  let lastIndex = 0;
  let match = LABEL_RE.exec(line);
  while (match) {
    if (last) out[last] = cleanValue(`${out[last] || ""} ${line.slice(lastIndex, match.index)}`);
    last = match[1].toLowerCase().replace(/\s+/g, " ");
    lastIndex = match.index + match[0].length;
    match = LABEL_RE.exec(line);
  }
  if (last) out[last] = cleanValue(`${out[last] || ""} ${line.slice(lastIndex)}`);
  return out;
}

const labelValue = (parts, keys) => {
  for (const key of keys) if (parts[key]) return parts[key];
  return "";
};

// ── Publications ──────────────────────────────────────────────────────────────

// "Sharma, A., Verma, R.", "Sharma et al.", "A. Sharma and R. Verma" all read as
// an author list; a title almost never contains two single-letter initials.
function looksLikeAuthors(text) {
  const value = String(text || "");
  if (/et\s+al\.?/i.test(value)) return true;
  if ((value.match(/\b[A-Z]\./g) || []).length >= 2) return true;
  if (/\band\b/.test(value) && (value.match(/,/g) || []).length >= 1) return true;
  return false;
}

function publicationBlocks(lines) {
  const blocks = [];
  let current = [];

  const flush = () => {
    if (current.length) blocks.push(current);
    current = [];
  };

  for (const raw of lines || []) {
    const cleaned = cleanLine(raw);
    if (!cleaned) continue;
    if (/^(?:publications?|papers?|manuscripts?)\s*:?$/i.test(cleaned)) continue;

    const parts = labelledParts(cleaned);
    const hasLabel = Object.keys(parts).length > 0;
    const hasTitleLabel = Boolean(parts.title || parts.paper);
    // A label-less line starts a new citation only when it reads like one and
    // the previous citation is already complete — otherwise it is a wrap.
    const looksLikeCitationStart = /\b(?:19|20)\d{2}\b/.test(cleaned) || /[.;]\s*$/.test(cleaned);
    const currentHasYear = current.some((line) => /\b(?:19|20)\d{2}\b/.test(line));
    const startsBlock =
      BLOCK_MARKER_RE.test(String(raw).trim()) ||
      hasTitleLabel ||
      (!hasLabel && (current.length === 0 || (looksLikeCitationStart && currentHasYear)));

    if (startsBlock) flush();
    current.push(cleaned);
  }
  flush();
  return blocks;
}

function parseCitation(text) {
  const row = { title: "", authors: "", venue: "" };
  // "Authors (Year). Title. Venue" — the year separates the author list from
  // the rest, which matters because initials like "A." also end in a period.
  const yearSplit = text.match(/^(.*?)[(]?\s*((?:19|20)\d{2})[)]?\s*[.,]?\s+([\s\S]+)$/);
  let body = text;
  if (yearSplit && looksLikeAuthors(yearSplit[1])) {
    row.authors = cleanValue(yearSplit[1]);
    body = yearSplit[3];
  }

  const chunks = body
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!row.authors) {
    const first = chunks[0] || body;
    if (chunks.length > 1 && looksLikeAuthors(first)) {
      row.authors = stripYear(first);
      chunks.shift();
    }
  }

  row.title = stripYear(chunks[0] || body);
  if (chunks.length > 1) row.venue = stripYear(chunks.slice(1).join(" "));
  return row;
}

// Citations end with "…, 145, 106-119. doi:10.1016/j.jbankfin.2023.106119", so a
// DOI sits inside the venue text unless it is cut out before the year is read.
function tidyVenue(venue, url) {
  let value = String(venue || "");
  if (url) value = value.split(url)[0];
  value = value.replace(/https?:\/\/\S+/g, "").replace(/\bdoi:?\s*10\.\d{4,9}\/\S*/gi, "");
  return stripYear(cleanValue(value));
}

function parsePublicationBlock(blockLines) {
  const joined = blockLines.join(" | ");
  const row = { title: "", authors: "", venue: "", year: "", url: "" };
  const parts = labelledParts(joined);

  row.title = labelValue(parts, ["title", "paper"]);
  row.authors = labelValue(parts, ["authors", "author", "by"]);
  row.venue = labelValue(parts, [
    "venue",
    "journal",
    "conference",
    "publisher",
    "book",
    "published in",
    "published",
  ]);
  row.url = labelValue(parts, ["url", "link", "doi"]);
  row.year = findYear(labelValue(parts, ["year", "date"]));

  const text = blockLines.join(" ");
  if (!row.url) row.url = findUrl(text);
  if (!row.year) row.year = findYear(text);

  if (!row.title) {
    // Citation form: "Authors (Year). Title. Venue, volume, pages."
    const citation = parseCitation(text);
    row.title = citation.title;
    row.authors = row.authors || citation.authors;
    if (!row.venue) row.venue = citation.venue;
  } else if (!row.authors) {
    const head = text.split(/(?<=\.)\s+/)[0] || "";
    if (looksLikeAuthors(head) && !head.includes(row.title)) row.authors = stripYear(head);
  }

  if (!row.title) return null;
  row.venue = tidyVenue(row.venue, row.url);
  return row;
}

export function extractPublications(lines) {
  return publicationBlocks(lines).map(parsePublicationBlock).filter(Boolean);
}

function formatPublications(rows) {
  return rows
    .map((row) => {
      const tail = [
        row.authors,
        row.venue && row.year ? `${row.venue}, ${row.year}` : row.venue || row.year,
        row.url,
      ].filter(Boolean);
      return tail.length ? `• ${row.title} — ${tail.join(" · ")}` : `• ${row.title}`;
    })
    .join("\n");
}

// ── Grants, awards and funding ────────────────────────────────────────────────

const GRANT_KINDS = [
  ["grant", "Grant"],
  ["funding", "Grant"],
  ["fellowship", "Fellowship"],
  ["scholarship", "Scholarship"],
  ["prize", "Prize"],
  ["medal", "Medal"],
  ["award", "Award"],
  ["honour", "Award"],
  ["honor", "Award"],
  ["distinction", "Award"],
  ["winner", "Award"],
];

function grantKind(text) {
  const lower = String(text || "").toLowerCase();
  const found = GRANT_KINDS.find(([needle]) => lower.includes(needle));
  return found ? found[1] : "";
}

const MONEY_RE =
  /(?:₹|rs\.?|inr|\$|usd|€|eur|£)\s?[\d.,]+\s*(?:lakh|lac|crore|million|billion|k|m)?/i;

export function extractGrants(lines) {
  const rows = [];

  for (const raw of lines || []) {
    const cleaned = cleanLine(raw);
    if (!cleaned || cleaned.length < 6) continue;

    const row = { name: "", kind: "", issuer: "", year: "", detail: "" };
    const parts = labelledParts(cleaned);
    const labelledName = labelValue(parts, ["name", "award", "grant", "funding", "title"]);
    row.kind = grantKind(labelValue(parts, ["type", "kind"])) || grantKind(cleaned);
    row.issuer = labelValue(parts, [
      "issuer",
      "body",
      "organization",
      "organisation",
      "institution",
    ]);
    row.detail = labelValue(parts, ["detail", "amount"]);
    row.year = findYear(labelValue(parts, ["year", "date"]));
    if (!row.year) row.year = findYear(cleaned);

    const source =
      labelledName ||
      // "Winner, National Coding Championship" — drop the leading kind word so
      // it does not become the name.
      stripYear(cleaned).replace(
        /^(?:winner|runner.?up|grant|award|fellowship|scholarship|prize|funding|honou?r)s?\s*[,:.\-–—]\s*/i,
        "",
      );
    // "Best Paper Award — NeurIPS 2022 (ACM)": the dash separates the name from
    // the event, and the parenthetical names the awarding body.
    const [head, ...tailParts] = source.split(/\s+[—–]\s+|\s\|\s/);
    const tail = tailParts.join(" ").trim();

    if (!row.name) {
      const segments = cleanValue(head).split(/,\s*/).filter(Boolean);
      row.name = cleanValue(segments.shift() || head).replace(
        /^(?:winner|runner.?up)\s*[,:]\s*/i,
        "",
      );
      const rest = segments.join(", ");
      if (rest) {
        // "Fellowship: Ramanujan Research Fellowship, DST, 2020" — the trailing
        // short capitalised token is the awarding body, not part of the name.
        if (!row.issuer && rest.split(/\s+/).length <= 4) row.issuer = rest;
        else if (!row.detail) row.detail = rest;
      }
    }

    if (!row.issuer && tail) {
      const parenthetical = tail.match(/\(([^)]+)\)/);
      if (parenthetical && !findYear(parenthetical[1])) row.issuer = parenthetical[1].trim();
      else row.issuer = cleanValue(stripYear(tail).split(/[,;]/)[0]);
    }
    if (!row.detail) {
      const money = cleaned.match(MONEY_RE);
      if (money) row.detail = money[0].trim();
    }

    if (!row.kind) row.kind = grantKind(row.name) || "Award";
    if (!row.name) continue;
    rows.push(row);
  }

  return rows;
}

function formatGrants(rows) {
  return rows
    .map((row) => {
      const parts = [`• ${row.kind || "Award"}: ${row.name}`];
      if (row.issuer) parts.push(`  Issuer: ${row.issuer}`);
      if (row.year) parts.push(`  Year: ${row.year}`);
      if (row.detail) parts.push(`  Detail: ${row.detail}`);
      return parts.join("\n");
    })
    .join("\n");
}

// ── Talks, presentations and conferences ──────────────────────────────────────

const TALK_KINDS = [
  ["keynote", "Keynote"],
  ["plenary", "Keynote"],
  ["invited", "Invited talk"],
  ["panel", "Panel"],
  ["poster", "Poster"],
  ["workshop", "Workshop"],
  ["seminar", "Seminar"],
  ["lecture", "Lecture"],
  ["talk", "Talk"],
  ["presentation", "Presentation"],
];

function talkKind(text) {
  const lower = String(text || "").toLowerCase();
  const found = TALK_KINDS.find(([needle]) => lower.includes(needle));
  return found ? found[1] : "";
}

export function extractTalks(lines) {
  const rows = [];

  for (const raw of lines || []) {
    const cleaned = cleanLine(raw);
    if (!cleaned || cleaned.length < 6) continue;

    const row = { title: "", event: "", kind: "", year: "", location: "" };
    const parts = labelledParts(cleaned);
    row.kind = talkKind(labelValue(parts, ["type", "kind"])) || talkKind(cleaned);
    row.event = labelValue(parts, [
      "event",
      "conference",
      "venue",
      "body",
      "organization",
      "organisation",
    ]);
    row.location = labelValue(parts, ["location", "city"]);
    row.year = findYear(labelValue(parts, ["year", "date"])) || findYear(cleaned);

    let title = labelValue(parts, ["title", "paper", "talk"]);
    if (!title) {
      const [head, ...tailParts] = cleaned.split(/\s+[—–]\s+|\s\|\s/);
      let label = cleanValue(head);
      // "Keynote: Fair credit models" — the kind word labels the line.
      const stripped = label.replace(
        /^(?:keynote|plenary|invited talk|talk|presentation|poster|workshop|seminar|lecture)s?\s*[:.-]\s*/i,
        "",
      );
      if (stripped !== label) {
        label = stripped;
      } else if (row.kind !== "Talk") {
        label = cleanValue(
          label.replace(new RegExp(`^${escapeRegExp(row.kind)}\\s*,?\\s*`, "i"), ""),
        );
      }
      let tail = tailParts.join(" ").trim();
      if (!tail) {
        const segments = label.split(/,\s*/).filter(Boolean);
        label = cleanValue(segments.shift() || label);
        tail = segments.join(", ");
      }
      title = stripYear(label);
      if (!row.event) row.event = stripYear(tail.replace(/\([^)]*\)/g, ""));
    }

    if (!row.kind) row.kind = talkKind(title) || "Talk";
    if (!title) continue;
    row.title = title;
    rows.push(row);
  }

  return rows;
}

function formatTalks(rows) {
  return rows
    .map((row) => {
      const parts = [`• ${row.title}`];
      if (row.event) parts.push(`  Event: ${row.event}`);
      if (row.kind) parts.push(`  Type: ${row.kind}`);
      if (row.year) parts.push(`  Year: ${row.year}`);
      if (row.location) parts.push(`  Location: ${row.location}`);
      return parts.join("\n");
    })
    .join("\n");
}

// ── Teaching and supervision ──────────────────────────────────────────────────

const TEACHING_ROLES = [
  ["teaching assistant", "Teaching Assistant"],
  ["teaching fellow", "Teaching Fellow"],
  ["guest faculty", "Guest Faculty"],
  ["adjunct", "Adjunct Professor"],
  ["lecturer", "Lecturer"],
  ["instructor", "Instructor"],
  ["professor", "Professor"],
  ["tutor", "Tutor"],
  ["mentor", "Mentor"],
  ["supervisor", "Supervisor"],
];

function teachingRole(text) {
  const lower = String(text || "").toLowerCase();
  const found = TEACHING_ROLES.find(([needle]) => lower.includes(needle));
  return found ? found[1] : "";
}

export function extractTeaching(lines) {
  const rows = [];

  for (const raw of lines || []) {
    const cleaned = cleanLine(raw);
    if (!cleaned || cleaned.length < 6) continue;

    const row = { course: "", role: "", institution: "", period: "", level: "" };
    const parts = labelledParts(cleaned);
    row.course = labelValue(parts, ["course", "title", "paper", "name"]);
    row.role = labelValue(parts, ["role", "position", "title/role"]) || teachingRole(cleaned);
    row.institution = labelValue(parts, [
      "institution",
      "university",
      "organization",
      "organisation",
      "affiliation",
    ]);
    row.period = labelValue(parts, ["period", "duration", "date", "year"]) || findYear(cleaned);
    row.level = labelValue(parts, ["level", "degree"]);

    if (!row.course) {
      // "Teaching Assistant — Econometrics, IIM Bangalore (2018)": the role can
      // sit on either side of the dash, so the side that is not the role holds
      // the course, the institution and the year.
      const [left, ...rightParts] = cleaned.split(/\s+[—–]\s+|\s\|\s/);
      const right = rightParts.join(" ").trim();
      let courseSide = teachingRole(left) ? right : cleanValue(left);
      if (!courseSide) courseSide = cleanValue(left);
      const segments = courseSide.split(/,\s*/).filter(Boolean);
      const first = cleanValue(segments.shift() || courseSide);
      row.course = stripYear(first);
      if (!row.institution && segments.length) row.institution = stripYear(segments.join(", "));
    }

    if (!row.period) row.period = findYearRange(cleaned);
    if (!row.course) continue;
    rows.push(row);
  }

  return rows;
}

function formatTeaching(rows) {
  return rows
    .map((row) => {
      const head = [row.course, row.role && `as ${row.role}`].filter(Boolean).join(" ");
      const tail = [row.institution, row.level, row.period].filter(Boolean).join(" · ");
      return tail ? `• ${head} — ${tail}` : `• ${head}`;
    })
    .join("\n");
}

// ── Referees ──────────────────────────────────────────────────────────────────

// A title abbreviation, not the word "Professor" on its own: "Professor of
// Finance, IIM Bangalore" is a job line, not a referee's name.
const REFEREE_TITLE_RE = /^(dr|prof|mr|mrs|ms|miss|sir|er)\.?\s+/i;
const ROLE_WORDS =
  /(professor|associate|assistant|dean|head|chair|director|scientist|engineer|manager|lecturer|reader|fellow|consultant|advisor|adviser)/i;

function looksLikeRefereeName(line) {
  const cleaned = cleanValue(stripYear(line));
  if (!cleaned || cleaned.length > 80) return false;
  if (cleaned.includes("@")) return false;
  if (/\d{3,}/.test(cleaned)) return false;
  // "Dr. A. Nair, Associate Professor, NUS Business School" is one referee line,
  // so a title abbreviation is enough — the word cap only guards bare names.
  if (REFEREE_TITLE_RE.test(cleaned)) return true;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  return /^[A-Z][\w'.-]+(\s+[A-Z][\w'.-]+){0,2}(,\s*[A-Z][\w'.-]+)*$/.test(cleaned);
}

function refereeFromLine(line) {
  const row = { name: "", role: "", organization: "", contact: "" };
  const parts = labelledParts(line);
  row.name = labelValue(parts, ["name"]);
  row.role = labelValue(parts, ["role", "position"]);
  row.organization = labelValue(parts, [
    "organization",
    "organisation",
    "institution",
    "university",
    "affiliation",
  ]);
  row.contact = labelValue(parts, ["contact", "email", "phone"]);

  if (!row.name) {
    const segments = line.split(/,\s*/).map(cleanValue).filter(Boolean);
    row.name = segments.shift() || cleanValue(line);
    for (const segment of segments) {
      if (!row.role && ROLE_WORDS.test(segment)) row.role = segment;
      else if (!row.organization) row.organization = segment;
      else row.organization = `${row.organization}, ${segment}`;
    }
  }
  return row;
}

export function extractReferences(lines) {
  const rows = [];
  let current = null;

  const push = () => {
    if (current && (current.name || current.contact)) rows.push(current);
    current = null;
  };

  for (const raw of lines || []) {
    const cleaned = cleanLine(raw);
    if (!cleaned) continue;
    if (/^(?:references?|referees?)\s*:?$/i.test(cleaned)) continue;

    const contacts = cleaned.match(CONTACT_RE) || [];
    // A name line starts a new referee; the lines under it (role, department,
    // email) belong to that referee until the next name line arrives.
    if (looksLikeRefereeName(cleaned)) {
      push();
      current = refereeFromLine(cleaned);
      continue;
    }

    if (!current) current = { name: "", role: "", organization: "", contact: "" };
    if (contacts.length) {
      current.contact = [current.contact, contacts.join(" · ")].filter(Boolean).join(" · ");
    }

    const rest = cleanValue(withoutContact(cleaned));
    if (!rest) continue;

    if (!current.name) {
      const parsed = refereeFromLine(rest);
      current.name = parsed.name;
      current.role = current.role || parsed.role;
      current.organization = current.organization || parsed.organization;
      continue;
    }

    const parts = labelledParts(rest);
    const role = labelValue(parts, ["role", "position"]);
    const organization = labelValue(parts, [
      "organization",
      "organisation",
      "institution",
      "university",
      "affiliation",
    ]);
    if (role) current.role = current.role || role;
    if (organization) current.organization = current.organization || organization;
    if (role || organization) continue;

    if (!current.role && ROLE_WORDS.test(rest)) current.role = rest;
    else if (!current.organization) current.organization = rest;
  }
  push();

  return rows.filter((row) => row.name);
}

function formatReferences(rows) {
  return rows
    .map((row) => {
      const head = [row.name, row.role, row.organization].filter(Boolean).join(", ");
      return row.contact ? `${head} — ${row.contact}` : head;
    })
    .join("\n");
}

// ── Completeness: a full academic record ──────────────────────────────────────

// Weights sum to 100. The CV-only sections carry real weight because a CV
// without publications, funding or referees is not a CV yet — and the checklist
// doubles as the list of questions the builder has to ask.
export function computeCVCompleteness(fields) {
  let score = 0;
  const checklist = [];

  const check = (points, complete, okLabel, missLabel) => {
    if (complete) score += points;
    checklist.push({ label: complete ? okLabel : missLabel, complete: Boolean(complete) });
  };

  check(5, !!fields.name, "Full name", "Name missing");
  check(10, Boolean(fields.email && fields.phone), "Email & phone", "Contact details incomplete");
  check(5, Boolean(fields.location), "Location / country", "Location missing");

  const profile = fields.summary || "";
  check(
    10,
    profile.trim().length >= 60,
    "Academic profile",
    "Academic profile too short or missing",
  );

  const education = fields.structuredEducation || [];
  const hasDegreeDetail = education.some((row) => row.degree || row.field);
  check(6, education.length > 0, "Education history", "Education missing");
  check(4, hasDegreeDetail, "Degree and field of study", "Degree or field of study missing");

  const publications = fields.publicationsRows || [];
  check(
    10,
    publications.length > 0,
    `${publications.length} publication(s)`,
    "No publications listed",
  );
  check(
    6,
    publications.some((row) => row.url),
    "Publication DOI or link",
    "Publications have no DOI or link",
  );
  check(
    6,
    Boolean(fields.research || fields.researchInterests),
    "Research interests or experience",
    "No research interests or experience",
  );

  const grants = fields.grantsRows || [];
  check(
    8,
    grants.length > 0,
    `${grants.length} grant(s) / award(s)`,
    "No grants, awards or funding",
  );

  const teaching = fields.teachingRows || [];
  check(
    8,
    teaching.length > 0 || Boolean(fields.experience),
    "Teaching or professional experience",
    "No teaching or professional experience",
  );

  const talks = fields.talksRows || [];
  check(
    6,
    talks.length > 0,
    `${talks.length} talk(s) / presentation(s)`,
    "No talks or conference presentations",
  );

  const skillCount = fields.skillsList?.length || 0;
  check(5, skillCount >= 5, `${skillCount} skills identified`, "Fewer than 5 skills detected");

  check(4, Boolean(fields.memberships), "Professional memberships", "No professional memberships");

  check(3, Boolean(fields.personal?.languages), "Languages", "No languages listed");

  const references = fields.referencesRows || [];
  check(4, references.length >= 2, `${references.length} referees`, "Fewer than 2 referees");
  check(
    4,
    references.some((row) => row.contact),
    "Referee contact details",
    "Referees have no contact details",
  );

  const eligibility = fields.personal || {};
  check(
    6,
    Boolean(
      eligibility.passport ||
      eligibility.nric ||
      eligibility.nationality ||
      eligibility.workAuthorization,
    ),
    "Work eligibility for overseas applications",
    "No nationality, passport, NRIC or work authorization",
  );

  return { score: Math.min(100, score), checklist };
}

function suggestImprovements(fields, links) {
  const tips = [];

  if (!fields.summary || fields.summary.trim().length < 60) {
    tips.push(
      "Write a 3–4 line academic profile: your field, your current position and the research you are known for.",
    );
  }
  if (!(fields.publicationsRows || []).length) {
    tips.push(
      "A CV with no publications reads as a resume to a search committee. List papers, chapters or preprints, or state clearly that you are early-career.",
    );
  } else if (!(fields.publicationsRows || []).some((row) => row.url)) {
    tips.push("Add a DOI or link to each publication so a committee can verify it in one click.");
  }
  if (!(fields.grantsRows || []).length) {
    tips.push(
      "Add grants, fellowships, scholarships or awards — funding history is a core CV section.",
    );
  }
  if (!(fields.talksRows || []).length) {
    tips.push("List conference talks, posters or invited lectures with the event name and year.");
  }
  if (!(fields.teachingRows || []).length) {
    tips.push("Add teaching or supervision (course, level and institution) if you have any.");
  }
  if ((fields.referencesRows || []).length < 2) {
    tips.push("Give two referees with role, institution and contact details.");
  } else if (!(fields.referencesRows || []).some((row) => row.contact)) {
    tips.push("Referees need contact details — an official email is enough.");
  }
  if (!links?.orcid && !links?.scholar) {
    tips.push("Add your ORCID iD or Google Scholar profile so citations are linked to you.");
  }
  if (!fields.memberships) {
    tips.push("List professional society memberships and any editorial or reviewing roles.");
  }
  const eligibility = fields.personal || {};
  if (!eligibility.nationality && !eligibility.passport && !eligibility.workAuthorization) {
    tips.push(
      "For overseas applications, add nationality and work authorization so sponsorship is clear.",
    );
  }

  return tips;
}

// Which CV layout suits this record. The industry and ATS layouts exist because
// a CV is also used for non-academic applications in many countries.
function suggestTemplates(fields) {
  const suggestions = [];
  const publications = (fields.publicationsRows || []).length;
  const teaching = (fields.teachingRows || []).length;
  const grants = (fields.grantsRows || []).length;

  if (publications >= 2 || teaching > 0 || grants > 0) suggestions.push("academic");
  if (publications >= 1 && teaching === 0) suggestions.push("research");
  if (!publications && (fields.experience || "").length > 120) suggestions.push("industry");
  if (!publications && !grants) suggestions.push("ats");
  if (!suggestions.length) suggestions.push("academic");

  return [...new Set(suggestions)];
}

// A CV often writes the country on the header line ("Singapore | +65 …") rather
// than under a present-address label, so the resume location rule is backed up by
// a country-name scan of the contact line.
function findLocation(lines) {
  const addressLine = lines.find((line) => /present\s*address/i.test(line));
  if (addressLine) {
    const value = addressLine.replace(/^present\s*address\s*[:.]?\s*/i, "").trim();
    if (value) return value;
  }
  for (const line of lines.slice(0, 20)) {
    const rest = cleanValue(withoutContact(line).replace(/^[|;,\s]+/, ""));
    if (!rest) continue;
    const country = POPULAR_COUNTRIES.find(
      (name) => name !== "Worldwide" && new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(rest),
    );
    if (country) return rest;
  }
  return "";
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function extractCVFields(text) {
  // Identity, links and skills are the same work either way; only the section
  // splitting, the CV-only rows and the scoring differ.
  const base = extractFields(text);

  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = splitSections(text, CV_SECTION_RULES);

  const profile = (sections.profile || []).join(" ").trim();
  const summary = profile || base.summary;
  const inlineInterests = (sections.profile || []).find((line) =>
    /^research\s+interests?\s*[:.-]/i.test(line),
  );
  const researchInterests =
    (sections.researchInterests || []).join(" ").trim() ||
    (inlineInterests
      ? inlineInterests.replace(/^research\s+interests?\s*[:.-]\s*/i, "").trim()
      : "");
  const researchLines = sections.research || [];

  const experienceLines = sections.experience || [];
  const experience = experienceLines.length ? experienceLines.join("\n") : base.experience;
  const structuredExperience = experienceLines.length
    ? extractStructuredExperience(experienceLines)
    : base.structuredExperience;

  const educationLines = sections.education || [];
  const structuredEducation = educationLines.length
    ? extractStructuredEducation(educationLines)
    : base.structuredEducation;
  const education = educationLines.length ? extractEducation(educationLines) : base.education;

  const skillsText = [(sections.skills || []).join("\n"), researchLines.join("\n"), text].join(
    "\n",
  );
  const skillsList = matchSkills(skillsText);
  const skills = skillsList.join(", ");

  const projectLines = [...(sections.projects || []), ...researchLines];
  const structuredProjects = extractStructuredProjects(projectLines);
  const projects = structuredProjects.length ? formatProjects(structuredProjects) : base.projects;

  const certLines = (sections.certifications || []).filter(
    (line) => !/^(certifications?|licen[cs]es?)\s*:?$/i.test(line),
  );
  const structuredCertifications = certLines.length
    ? extractCertifications(certLines)
    : base.structuredCertifications;
  const certifications = structuredCertifications
    .map((row) =>
      [row.name, row.issuer, row.year, row.credentialId ? `ID ${row.credentialId}` : "", row.url]
        .filter(Boolean)
        .join(" · "),
    )
    .join("\n");

  const publicationsRows = extractPublications(sections.publications || []);
  const grantsRows = extractGrants(sections.grants || []);
  const talksRows = extractTalks(sections.talks || []);
  const teachingRows = extractTeaching(sections.teaching || []);
  const referencesRows = extractReferences(sections.references || []);
  const memberships = (sections.memberships || []).join("\n").trim();

  const languageLines = (sections.languages || []).length
    ? [`Languages: ${(sections.languages || []).join(", ")}`]
    : [];
  const personal = extractPersonalFields([...(sections.personal || []), ...languageLines]);
  // A label written in the header ("Nationality: Singaporean") only fills a gap
  // the dedicated section left open.
  const headerPersonal = extractPersonalFields(
    lines.slice(0, 16).filter((line) => /^[A-Za-z][A-Za-z\s/]{2,24}\s*[:|]/.test(line)),
  );
  for (const [key, value] of Object.entries(headerPersonal)) {
    if (!personal[key]) personal[key] = value;
  }

  const links = { ...base.links };
  const orcid = String(text || "").match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-[\dX]{4})/i);
  if (orcid) links.orcid = `https://orcid.org/${orcid[1]}`;
  if (/scholar\.google\.[a-z.]+\/citations/i.test(text)) {
    links.scholar = String(text).match(/https?:\/\/scholar\.google\.[^\s<>()]+/i)?.[0] || "";
  }

  const fields = {
    ...base,
    // The resume location rule fires on any line that merely mentions a city
    // ("IIM Bangalore"), so the contact line is read first on a CV.
    location: findLocation(lines) || base.location,
    links,
    summary,
    researchInterests,
    research: researchLines.join("\n").trim(),
    skills,
    skillsList,
    skillsByCategory: categorizeSkills(skillsList),
    education,
    structuredEducation,
    experience,
    structuredExperience,
    projects,
    structuredProjects,
    certifications,
    structuredCertifications,
    achievements: (sections.achievements || []).join("\n").trim(),
    publications: formatPublications(publicationsRows),
    publicationsRows,
    grants: formatGrants(grantsRows),
    grantsRows,
    talks: formatTalks(talksRows),
    talksRows,
    teaching: formatTeaching(teachingRows),
    teachingRows,
    references: formatReferences(referencesRows),
    referencesRows,
    memberships,
    personal,
    personalDetails: formatPersonalDetails(personal),
  };

  fields.improvements = suggestImprovements(fields, links);
  fields.suggestedTemplates = suggestTemplates(fields);
  fields.audit = computeCVCompleteness(fields);

  return fields;
}
