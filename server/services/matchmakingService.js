// Marriage-biodata compatibility scoring.
//
// Deterministic: the same two biodatas always produce the same score and
// breakdown. Scoring compares the SEEKER's biodata document against other
// users' biodata documents — never against hardcoded fake profiles.
//
// Components (100 total):
//   age        25 — proximity within a mutually sensible band
//   location   25 — same city > same country > abroad
//   education  20 — keyword overlap of study fields/degrees (canonicalized)
//   lifestyle  15 — shared tags extracted with conflict awareness (e.g., smoker vs non-smoker)
//   family     15 — family-values keyword overlap

export const CITY_SYNONYMS = {
  bangalore: ["bengaluru", "bangalore"],
  bengaluru: ["bangalore", "bengaluru"],
  mumbai: ["mumbai", "bombay"],
  bombay: ["mumbai", "bombay"],
  chennai: ["chennai", "madras"],
  madras: ["chennai", "madras"],
  kolkata: ["kolkata", "calcutta"],
  calcutta: ["kolkata", "calcutta"],
  pune: ["pune", "poona"],
  poona: ["pune", "poona"],
  delhi: ["delhi", "new delhi"],
  "new delhi": ["delhi", "new delhi"],
  hyderabad: ["hyderabad", "secunderabad"],
  secunderabad: ["hyderabad", "secunderabad"],
  gurgaon: ["gurgaon", "gurugram"],
  gurugram: ["gurgaon", "gurugram"],
  kochi: ["kochi", "cochin", "ernakulam"],
  cochin: ["kochi", "cochin", "ernakulam"],
  ernakulam: ["kochi", "cochin", "ernakulam"],
  thiruvananthapuram: ["thiruvananthapuram", "trivandrum"],
  trivandrum: ["thiruvananthapuram", "trivandrum"],
};

export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim();
}

export function cityKey(loc) {
  const n = norm(loc);
  for (const [key, syns] of Object.entries(CITY_SYNONYMS)) {
    if (syns.some((s) => n.includes(s))) return key;
  }
  return n.split(/[,\n]/)[0].trim();
}

export function countryKey(loc) {
  const n = norm(loc);
  const INDIA = [
    "india",
    "bangalore",
    "bengaluru",
    "mumbai",
    "bombay",
    "delhi",
    "new delhi",
    "chennai",
    "madras",
    "kolkata",
    "calcutta",
    "hyderabad",
    "pune",
    "poona",
    "ahmedabad",
    "jaipur",
    "lucknow",
    "indore",
    "noida",
    "gurgaon",
    "gurugram",
    "chandigarh",
    "kochi",
    "surat",
    "kanpur",
    "kerala",
    "karnataka",
    "maharashtra",
    "tamil nadu",
    "gujarat",
    "punjab",
    "up",
    "uttar pradesh",
  ];
  if (INDIA.some((k) => n.includes(k))) return "india";
  const KNOWN = [
    "usa",
    "united states",
    "uk",
    "united kingdom",
    "canada",
    "australia",
    "germany",
    "singapore",
    "uae",
    "dubai",
  ];
  for (const k of KNOWN) if (n.includes(k)) return k;
  // Fall back to last comma segment (often the country).
  const parts = n
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function extractAge(text) {
  const s = String(text || "");
  const m1 = s.match(/\b(?:age|aged)\s*[:-]?\s*(\d{2})\b/i);
  if (m1) {
    const v = parseInt(m1[1], 10);
    if (v >= 18 && v <= 100) return v;
  }
  const m2 = s.match(/\b(\d{2})\s*(?:years?\s*old|yo|yrs?)\b/i);
  if (m2) {
    const v = parseInt(m2[1], 10);
    if (v >= 18 && v <= 100) return v;
  }
  return null;
}

// ── Degree normalization & Education extraction ─────────────────────

const DEGREE_CANONICAL = [
  {
    match: /\b(?:b\.?tech|b\.?e\.?|bachelor of engineering|bachelor of technology)\b/gi,
    canonical: "btech",
  },
  {
    match: /\b(?:m\.?tech|m\.?e\.?|master of engineering|master of technology)\b/gi,
    canonical: "mtech",
  },
  { match: /\b(?:b\.?sc\.?|bsc|bachelor of science)\b/gi, canonical: "bsc" },
  { match: /\b(?:m\.?sc\.?|msc|master of science)\b/gi, canonical: "msc" },
  { match: /\b(?:b\.?com\.?|bcom|bachelor of commerce)\b/gi, canonical: "bcom" },
  { match: /\b(?:m\.?com\.?|mcom|master of commerce)\b/gi, canonical: "mcom" },
  { match: /\b(?:bca|bachelor of computer applications)\b/gi, canonical: "bca" },
  { match: /\b(?:mca|master of computer applications)\b/gi, canonical: "mca" },
  { match: /\b(?:m\.?b\.?a\.?|mba|master of business administration)\b/gi, canonical: "mba" },
  { match: /\b(?:b\.?b\.?a\.?|bba)\b/gi, canonical: "bba" },
  { match: /\b(?:c\.?a\.?|chartered accountant)\b/gi, canonical: "ca" },
  { match: /\b(?:ll\.?b\.?|llm|law degree)\b/gi, canonical: "law_degree" },
  {
    match: /\b(?:m\.?b\.?b\.?s\.?|mbbs|m\.?d\.?|doctor of medicine)\b/gi,
    canonical: "medical_degree",
  },
  { match: /\b(?:ph\.?d\.?|phd|doctorate)\b/gi, canonical: "phd" },
];

const EDU_FIELDS = [
  "iit",
  "nit",
  "bits",
  "iim",
  "aiims",
  "commerce",
  "engineering",
  "medicine",
  "law",
  "finance",
  "computer science",
  "data science",
  "mechanical",
  "civil",
  "electrical",
  "electronics",
  "information technology",
  "artificial intelligence",
  "biotechnology",
  "architecture",
  "design",
];

export function educationTokens(text) {
  const n = norm(text);
  const tokens = new Set();

  for (const { match, canonical } of DEGREE_CANONICAL) {
    if (match.test(n)) {
      tokens.add(canonical);
    }
  }

  for (const field of EDU_FIELDS) {
    const rx = new RegExp(`\\b${field.replace(/ /g, "\\s+")}\\b`, "i");
    if (rx.test(n)) {
      tokens.add(field);
    }
  }

  return Array.from(tokens);
}

// ── Lifestyle Extraction & Conflict-Aware Matching ─────────────────

export function lifestyleTraits(text) {
  const n = norm(text);
  const traits = {
    diet: null, // "veg", "vegan", "non-veg"
    smoking: null, // "smoker", "non-smoker"
    drinking: null, // "drinker", "teetotaler"
    hobbies: new Set(),
  };

  // Diet detection (check non-veg / vegan first)
  if (/\b(?:non[-\s]?veg(?:etarian)?)\b/i.test(n)) {
    traits.diet = "non-veg";
  } else if (/\bvegan\b/i.test(n)) {
    traits.diet = "vegan";
  } else if (/\b(?:veg(?:etarian)?)\b/i.test(n)) {
    traits.diet = "veg";
  }

  // Smoking detection
  if (/\b(?:non[-\s]?smok(?:er|ing)|does(?:n't| not) smoke|no smoking)\b/i.test(n)) {
    traits.smoking = "non-smoker";
  } else if (/\b(?:smok(?:er|es|ing))\b/i.test(n)) {
    traits.smoking = "smoker";
  }

  // Drinking detection
  if (/\b(?:non[-\s]?drink(?:er|ing)|does(?:n't| not) drink|teetotaler|no drinking)\b/i.test(n)) {
    traits.drinking = "teetotaler";
  } else if (/\b(?:drink(?:er|s|ing)|social drinker|occasional drinker)\b/i.test(n)) {
    traits.drinking = "drinker";
  }

  // General positive hobbies & habits
  const HOBBIES = [
    "gym",
    "yoga",
    "trekking",
    "reading",
    "cricket",
    "football",
    "music",
    "travel",
    "spiritual",
    "fitness",
    "marathon",
    "sports",
    "cooking",
    "photography",
    "art",
    "dance",
    "swimming",
  ];
  for (const h of HOBBIES) {
    const rx = new RegExp(`\\b${h}\\b`, "i");
    if (rx.test(n)) traits.hobbies.add(h);
  }

  return traits;
}

export function scoreLifestyle(seekerText, otherText) {
  const s = lifestyleTraits(seekerText);
  const o = lifestyleTraits(otherText);

  let sharedCount = 0;
  let conflicts = [];

  // Diet comparison
  if (s.diet && o.diet) {
    if (
      s.diet === o.diet ||
      (s.diet === "veg" && o.diet === "vegan") ||
      (s.diet === "vegan" && o.diet === "veg")
    ) {
      sharedCount += 1;
    } else {
      conflicts.push(`Diet: ${s.diet} vs ${o.diet}`);
    }
  }

  // Smoking comparison
  if (s.smoking && o.smoking) {
    if (s.smoking === o.smoking) {
      sharedCount += 1;
    } else {
      conflicts.push(`Smoking: ${s.smoking} vs ${o.smoking}`);
    }
  }

  // Drinking comparison
  if (s.drinking && o.drinking) {
    if (s.drinking === o.drinking) {
      sharedCount += 1;
    } else {
      conflicts.push(`Drinking: ${s.drinking} vs ${o.drinking}`);
    }
  }

  // Hobbies overlap
  for (const h of s.hobbies) {
    if (o.hobbies.has(h)) sharedCount += 1;
  }

  const totalHobbies = Math.max(s.hobbies.size, o.hobbies.size, 1);
  let score = 4; // baseline

  if (sharedCount > 0) {
    score = Math.min(15, 6 + Math.round((sharedCount / (totalHobbies + 2)) * 9));
  }

  // Conflict penalty
  if (conflicts.length > 0) {
    score = Math.max(1, score - conflicts.length * 3);
  }

  let note = "Few habits stated";
  if (conflicts.length > 0 && sharedCount === 0) {
    note = `Opposite habits (${conflicts.join(", ")})`;
  } else if (conflicts.length > 0) {
    note = `${sharedCount} shared, but conflicting (${conflicts.join(", ")})`;
  } else if (sharedCount > 0) {
    note = `${sharedCount} shared habit${sharedCount === 1 ? "" : "s"}`;
  }

  return { score, max: 15, note };
}

// ── Family Values ───────────────────────────────────────────────────

const FAMILY_KEYWORDS = [
  "joint family",
  "nuclear family",
  "business family",
  "government service",
  "government",
  "army",
  "defense",
  "teacher",
  "doctor",
  "engineer",
  "farmer",
  "bank",
  "professor",
  "advocate",
  "judge",
  "married sister",
  "married brother",
  "only child",
  "only son",
  "only daughter",
  "elder brother",
  "elder sister",
  "younger brother",
  "younger sister",
];

export function familyTokens(text) {
  const n = norm(text);
  return FAMILY_KEYWORDS.filter((k) => {
    const rx = new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`, "i");
    return rx.test(n);
  });
}

// ── Component scores ────────────────────────────────────────────────

export function scoreAge(a, b) {
  if (a == null || b == null) return { score: 12, max: 25, note: "Age partially missing" };
  const diff = Math.abs(a - b);
  let score;
  if (diff <= 2) score = 25;
  else if (diff <= 4) score = 20;
  else if (diff <= 7) score = 12;
  else score = 5;
  return {
    score,
    max: 25,
    note: diff === 0 ? "Same age" : `${diff} year${diff === 1 ? "" : "s"} apart`,
  };
}

export function scoreLocation(seeker, other, scope, specific) {
  const sCity = cityKey(seeker.location);
  const oCity = cityKey(other.location);
  const sCountry = countryKey(seeker.location);
  const oCountry = countryKey(other.location);

  const sameCity = sCity && oCity && (sCity === oCity || CITY_SYNONYMS[sCity]?.includes(oCity));
  const sameCountry = sCountry && oCountry && sCountry === oCountry;

  let score = 8,
    note = "Different regions";
  if (scope === "specific" && norm(specific)) {
    const want = norm(specific);
    const matchHit = norm(other.location).includes(want);
    score = matchHit ? 25 : 5;
    note = matchHit ? `Matches "${specific}"` : `Outside "${specific}"`;
  } else if (sameCity) {
    score = 25;
    note = "Same city";
  } else if (sameCountry) {
    score = 16;
    note = scope === "abroad" ? "Same country" : "Same country, different city";
  } else if (scope === "abroad" || scope === "both") {
    score = 12;
    note = "Abroad";
  }
  return { score, max: 25, note };
}

function overlapScore(seekerTokens, otherTokens, max, high, low) {
  const s = new Set(seekerTokens);
  const o = new Set(otherTokens);
  let shared = 0;
  for (const t of s) if (o.has(t)) shared += 1;
  const denom = Math.max(s.size, o.size, 1);
  const ratio = shared / denom;
  const score = shared === 0 ? low : Math.round(low + (high - low) * ratio);
  return { shared, score, max };
}

// ── Public API ──────────────────────────────────────────────────────

export function scoreCompatibility(seeker, other, { scope = "country", specific = "" } = {}) {
  const seekerAge = seeker.age ?? extractAge(seeker.text);
  const otherAge = other.age ?? extractAge(other.text);
  const age = scoreAge(seekerAge, otherAge);

  const location = scoreLocation(seeker, other, scope, specific);

  const eduS = educationTokens(seeker.text);
  const eduO = educationTokens(other.text);
  const eduOverlap = overlapScore(eduS, eduO, 20, 20, 5);
  const education = {
    score: eduOverlap.score,
    max: 20,
    note:
      eduOverlap.shared > 0
        ? `Shared: ${[...new Set(eduS.filter((t) => eduO.includes(t)))].slice(0, 3).join(", ")}`
        : "Different fields",
  };

  const lifestyle = scoreLifestyle(seeker.text, other.text);

  const famS = familyTokens(seeker.text);
  const famO = familyTokens(other.text);
  const famOverlap = overlapScore(famS, famO, 15, 15, 5);
  const family = {
    score: famOverlap.score,
    max: 15,
    note:
      famOverlap.shared > 0
        ? `${famOverlap.shared} family-value match${famOverlap.shared === 1 ? "" : "es"}`
        : "Different family backgrounds",
  };

  const total = Math.min(
    99,
    Math.max(0, age.score + location.score + education.score + lifestyle.score + family.score),
  );

  return {
    score: total,
    breakdown: { age, location, education, lifestyle, family },
  };
}

// Build the compact matcher input from a biodata Document.
export function biodataInput(doc) {
  const data = doc.data || {};
  const text = [
    data.summary,
    data.education,
    data.experience,
    data.family,
    data.partnerPreference,
    data.skills,
    data.age != null ? `Age: ${data.age}` : "",
    data.height != null ? `Height: ${data.height}` : "",
    doc.generatedText || "",
  ]
    .filter(Boolean)
    .join("\n");

  const parsedAge = data.age != null && !isNaN(Number(data.age)) ? Number(data.age) : undefined;

  return {
    id: String(doc._id),
    ownerId: String(doc.user?._id || doc.user),
    name: data.name || doc.title || "Biodata",
    location: data.location || "",
    age: parsedAge,
    text,
  };
}
