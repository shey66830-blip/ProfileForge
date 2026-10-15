// Live resume signal analysis.
//
// The builder recomputes these on every keystroke, so everything here is pure
// and synchronous — no network, no AI round-trip. That keeps the "recruiter
// signal" panel honest and instant, and lets the rules be unit-tested directly
// instead of through the DOM.

export const REQUIRED_FIELDS = ["name", "email", "phone", "location", "education", "skills"];

export const FIELD_LABELS = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  education: "Education",
  skills: "Skills",
  experience: "Work history",
  summary: "Summary",
  profession: "Profession",
  age: "Age",
  height: "Height",
  family: "Family background",
};

// Verbs that open strong bullets. A bullet that starts with one of these reads
// as an accomplishment rather than a job description.
export const ACTION_VERBS = [
  "achieved",
  "accelerated",
  "automated",
  "built",
  "boosted",
  "coached",
  "consolidated",
  "created",
  "cut",
  "delivered",
  "designed",
  "developed",
  "directed",
  "drove",
  "engineered",
  "expanded",
  "generated",
  "grew",
  "implemented",
  "improved",
  "increased",
  "initiated",
  "launched",
  "led",
  "managed",
  "mentored",
  "migrated",
  "negotiated",
  "optimized",
  "orchestrated",
  "overhauled",
  "owned",
  "piloted",
  "pioneered",
  "produced",
  "rebuilt",
  "reduced",
  "redesigned",
  "resolved",
  "restructured",
  "scaled",
  "shipped",
  "simplified",
  "spearheaded",
  "standardized",
  "streamlined",
  "supervised",
  "trained",
  "transformed",
  "tripled",
  "unified",
  "won",
];

// Filler that recruiters read as "no measurable outcome here".
export const WEAK_PHRASES = [
  "responsible for",
  "worked on",
  "helped with",
  "helped to",
  "duties included",
  "involved in",
  "assisted with",
  "in charge of",
  "familiar with",
  "hard worker",
  "team player",
];

const FIRST_PERSON = /\b(i|me|my|myself|mine)\b/i;
const QUANTIFIED = /(\d|%|\u20b9|\$|\u20ac|\u00a3)/;

function clamp(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function isFilled(value) {
  return text(value).trim().length > 0;
}

export function wordCount(value) {
  return text(value).trim().split(/\s+/).filter(Boolean).length;
}

export function lines(...values) {
  return values
    .flatMap((value) => text(value).split(/\r?\n/))
    .map((line) => line.replace(/^[\s•\-*\u2022]+/, "").trim())
    .filter(Boolean);
}

function ratio(hits, total) {
  if (!total) return 0;
  return hits / total;
}

// ── Completeness (drives the progress bar and the step check-marks) ──────────

export function computeStepProgress(steps = [], data = {}) {
  const results = steps.map((step) => {
    const required = step.required || [];
    const missing = required.filter((field) => !isFilled(data[field]));
    return {
      id: step.id,
      label: step.label,
      // Optional steps still earn a tick when written, but never block a save.
      optional: Boolean(step.optional),
      complete: missing.length === 0,
      missing,
    };
  });

  const percent = results.length
    ? (results.filter((step) => step.complete).length / results.length) * 100
    : 0;

  return {
    percent: Math.round(percent),
    steps: results,
    missingRequired: REQUIRED_FIELDS.filter((field) => !isFilled(data[field])),
  };
}

export function computeCompleteness(data = {}) {
  const filled = REQUIRED_FIELDS.filter((field) => isFilled(data[field]));
  return {
    percent: Math.round((filled.length / REQUIRED_FIELDS.length) * 100),
    filled: filled.length,
    total: REQUIRED_FIELDS.length,
    missing: REQUIRED_FIELDS.filter((field) => !isFilled(data[field])),
  };
}

// ── Signal dimensions ───────────────────────────────────────────────────────

// Will an automated parser read this cleanly?
export function scoreAts(data = {}) {
  let score = 0;

  const contact = ["name", "email", "phone", "location"].filter((field) => isFilled(data[field]));
  score += (contact.length / 4) * 24;

  if (isFilled(data.skills)) score += 14;
  if (isFilled(data.education)) score += 14;
  if (isFilled(data.experience)) score += 14;

  const summaryWords = wordCount(data.summary);
  if (summaryWords >= 30 && summaryWords <= 120) score += 14;
  else if (summaryWords > 0) score += 7;

  if (isFilled(data.linkedin) || isFilled(data.github) || isFilled(data.portfolio)) score += 10;

  // Things parsers choke on: emoji, tab columns, drawn tables, decorative runs.
  // Only worth points once there is a body to parse — an empty draft must not
  // collect credit for being trivially clean.
  const body = [data.summary, data.experience, data.projects, data.education, data.skills]
    .map(text)
    .join("\n");
  if (!body.trim()) return clamp(score);
  if (!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(body)) score += 5;
  if (!/\t|\|\s*\w+\s*\|/.test(body)) score += 5;

  return clamp(score);
}

// Does the writing sound like ownership, or like a job description?
export function scoreImpact(data = {}) {
  const bullets = lines(data.experience, data.projects);
  if (!bullets.length) return 0;

  const body = bullets.join("\n").toLowerCase();
  const strongOpeners = bullets.filter((bullet) =>
    ACTION_VERBS.some((verb) => bullet.toLowerCase().startsWith(verb)),
  ).length;

  // Count each weak phrase once per bullet that contains it.
  const weakUses = bullets.reduce(
    (total, bullet) =>
      total + WEAK_PHRASES.filter((phrase) => bullet.toLowerCase().includes(phrase)).length,
    0,
  );
  const firstPersonUses = FIRST_PERSON.test(body) ? 1 : 0;

  let score = ratio(strongOpeners, bullets.length) * 78;
  score += 22; // baseline for actually having history to read
  score -= Math.min(24, weakUses * 6);
  score -= firstPersonUses * 12;

  return clamp(score);
}

// Is there proof — numbers, percentages, scale — or just adjectives?
export function scoreEvidence(data = {}) {
  const bullets = lines(data.experience, data.projects, data.summary);
  if (!bullets.length) return 0;

  const quantified = bullets.filter((bullet) => QUANTIFIED.test(bullet)).length;
  const numbers = (bullets.join(" ").match(/\d+/g) || []).length;

  let score = 18 + ratio(quantified, bullets.length) * 74;
  score += Math.min(8, numbers);
  return clamp(score);
}

const TIPS = {
  ats: "Fill contact, skills, education and work history, and keep the summary to 30–120 words. Flat text parses better than tables or columns.",
  impact:
    "Open each bullet with a strong verb (Built, Led, Cut, Grew) instead of “Responsible for” and drop first-person wording.",
  evidence:
    "Add numbers to your bullets — %, counts, currency, time saved. Recruiters scan for measurable outcomes first.",
};

export function analyzeSignal(data = {}) {
  const ats = scoreAts(data);
  const impact = scoreImpact(data);
  const evidence = scoreEvidence(data);
  const overall = clamp(ats * 0.4 + impact * 0.3 + evidence * 0.3);

  // Coach on the weakest lever, but never on an empty draft — that would just
  // tell a new user "nothing is filled" three times over.
  const hasDraft = lines(data.experience, data.summary, data.skills, data.education).length > 0;
  let weakest = "ats";
  if (hasDraft) {
    weakest = [
      { key: "ats", value: ats },
      { key: "impact", value: impact },
      { key: "evidence", value: evidence },
    ].reduce((low, item) => (item.value < low.value ? item : low)).key;
  }

  return {
    ats,
    impact,
    evidence,
    overall,
    weakest,
    tip: hasDraft ? TIPS[weakest] : TIPS.ats,
    hasDraft,
  };
}

export function signalBand(score) {
  if (score >= 80) return { label: "Recruiter ready", tone: "great" };
  if (score >= 55) return { label: "Getting there", tone: "good" };
  if (score > 0) return { label: "Needs work", tone: "warn" };
  return { label: "Empty draft", tone: "idle" };
}

// ── Photo helper (used for the preview cover) ───────────────────────────────

// Downscale before storing so a phone photo does not land in the document
// payload at full resolution.
export function readImageAsDataURL(file, maxSize = 420) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));
    if (typeof FileReader === "undefined") return reject(new Error("FileReader unavailable"));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.onload = () => {
      const src = String(reader.result || "");
      if (typeof document === "undefined") return resolve(src);

      const img = new Image();
      img.onerror = () => resolve(src); // fall back to the raw data URL
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        if (scale === 1) return resolve(src);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
