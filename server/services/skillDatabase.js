// ============================================================
// Single source of truth for skill matching (server-wide).
//
// Every path that asks "what skills does this text contain" goes through
// matchSkills() here — the upload extractor (uploadRoutes.extractFields) and
// the analysis extractor (skillExtractor.analyzeSkills → aiResumeAnalyzer,
// resumeJobAnalyzer, jobService) both use this module, so the upload preview
// and the matching engine can never disagree about a resume's domain.
//
// Matching semantics (preserved from the battle-tested upload matcher):
// - Longest-first matching so multi-word skills win over their prefixes
//   ("oracle rac" before "oracle", "node.js" before "node").
// - Dedup direction: a candidate is skipped when an already-kept skill's own
//   regex matches the candidate string ("java" skipped because "javascript"
//   is kept; "rman" NOT skipped by "performance tuning").
// - Strict standalone-token rule for short bare-letter tokens (c, r, go, ui):
//   they must be whole tokens, so "go-live" and "(R/W)" emit nothing while
//   "Go, Rust" and "R, Python" still match.
//
// Matching happens on a normalized token grid: lowercase, letter-letter
// hyphen/slash pairs joined (go-live → golive, r/w → rw, hyper-v → hyperv),
// every other non-alphanumeric → space (node.js → "node js", 12c/19c keeps
// its digits: "12c 19c"). c++ and c# are matched on a symbol-preserving form
// instead, because normalization would erase the ++/# that identify them.
// ============================================================

export const SKILL_DATABASE = {
  // Programming
  programming: [
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust",
    "php", "ruby", "swift", "kotlin", "scala", "r", "matlab",
    "shell scripting", "shell script", "bash", "powershell",
  ],

  // Web
  web: [
    "html", "css", "sass", "react", "next.js", "node.js", "node", "vue",
    "angular", "express", "vite", "tailwind", "bootstrap",
  ],

  // Databases
  databases: [
    "mongodb", "sql", "mysql", "postgresql", "postgres", "edb postgres",
    "firebase", "redis", "elasticsearch", "mssql", "sybase", "pl/sql", "sqlplus",
  ],

  // Database administration / enterprise (DBA resumes)
  dba: [
    "oracle", "oracle rac", "oracle 19c", "oracle 12c", "oracle 11g",
    "data guard", "active data guard", "rman", "golden gate",
    "oracle golden gate", "oracle data appliance", "oda",
    "oracle enterprise manager", "oem", "asm", "expdp", "impdp",
    "database migration", "database security", "performance tuning",
    "high availability", "disaster recovery", "backup and recovery",
    "fleet patching", "aws rds", "networker", "srdf", "vcs", "datacenter migration",
  ],

  // Cloud / DevOps
  cloud: [
    "aws", "azure", "gcp", "docker", "kubernetes", "linux", "git", "github",
    "ci/cd", "ansible", "terraform", "itil",
  ],

  // AI / ML
  ai: [
    "machine learning", "deep learning", "artificial intelligence",
    "tensorflow", "pytorch", "keras", "nlp", "opencv", "computer vision",
    "prompt engineering",
  ],

  // Data
  data: [
    "nosql", "tableau", "power bi", "excel", "google analytics",
    "apache spark", "hadoop", "kafka", "airflow", "dbt", "snowflake",
    "bigquery", "redshift", "etl", "data warehousing", "data modeling",
    "pandas", "numpy", "scipy", "jupyter",
  ],

  // Mobile
  mobile: [
    "android", "ios", "react native", "flutter", "xamarin", "ionic", "dart",
    "objective-c", "mobile development", "app development", "pwa", "capacitor",
  ],

  // Embedded / IoT
  embedded: [
    "embedded systems", "microcontroller", "arduino", "raspberry pi", "fpga",
    "vhdl", "verilog", "rtos", "bare metal", "arm cortex", "stm32", "esp32",
    "iot", "mqtt", "bluetooth", "zigbee",
  ],

  // Industrial automation
  industrial: [
    "dcs", "plc", "scada", "hmi", "opc", "modbus", "profibus",
    "foundation fieldbus", "iec 61131", "fieldbus", "siemens", "abb",
    "honeywell", "emerson", "yokogawa", "rockwell", "allen bradley",
    "process automation", "instrumentation", "vfd", "rtu",
    "field instruments", "calibration", "loop tuning", "process control",
    "batch control", "safety systems", "sis", "emergency shutdown",
    "fire and gas", "hazop",
  ],

  // Cybersecurity
  cybersecurity: [
    "cybersecurity", "information security", "penetration testing",
    "vulnerability assessment", "siem", "soc", "firewall", "ids", "ips",
    "mcafee epo", "wsus", "system hardening", "network hardening", "cissp",
    "ceh", "comptia security", "iso 27001", "nist", "zero trust",
    "incident response", "forensics",
  ],

  // Virtualization / infra
  virtualization: [
    "vmware esxi", "hyper-v", "virtualization", "raid", "nas", "san",
    "active directory", "windows server", "dns", "dhcp", "tcp ip",
    "network configuration", "switches", "routers", "cisco", "juniper",
    "palo alto", "fortinet", "wan", "lan", "system administration",
    "windows administration", "linux administration",
  ],

  // Testing
  testing: [
    "testing", "selenium", "cypress", "jest", "mocha", "chai", "pytest",
    "junit", "test automation", "qa", "quality assurance", "unit testing",
    "integration testing", "e2e testing", "tdd", "bdd", "playwright",
    "postman", "api testing",
  ],

  // Blockchain
  blockchain: [
    "blockchain", "solidity", "ethereum", "web3", "smart contracts", "defi",
    "nft", "hyperledger", "polygon", "solana",
  ],

  // ERP / business systems
  erp: [
    "sap", "oracle erp", "salesforce", "dynamics 365", "workday", "zoho",
    "freshworks", "hubspot", "crm", "erp", "hris", "peoplesoft", "jd edwards",
  ],

  // Design
  design: [
    "figma", "sketch", "photoshop", "illustrator", "canva", "video editing",
    "graphic design", "ui", "ux",
  ],

  // Medical
  medical: [
    "patient care", "physiotherapy", "nursing", "pharmacology",
    "clinical research", "medical coding", "medical writing", "diagnosis",
    "healthcare",
  ],

  // Business / soft skills
  business: [
    "marketing", "sales", "finance", "accounting", "business analysis",
    "branding", "customer service", "management", "communication",
    "leadership", "teamwork", "problem solving", "critical thinking",
    "adaptability", "creativity", "time management", "project management",
  ],
};

export const ALL_SKILLS = Object.values(SKILL_DATABASE).flat();

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Canonical matching form: lowercase; join letter-letter hyphen/slash pairs
 * (go-live → golive, r/w → rw) so compound noise tokens cannot split into
 * short standalone letters; other non-alphanumerics → space (node.js →
 * "node js", "oracle 12c/19c" → "oracle 12c 19c"); collapse whitespace.
 */
export function toMatchText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/([a-z])[-/]([a-z])/g, "$1$2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// c++ / c#-style skills: normalization would erase the identifying symbols,
// so they match on a lowercase symbol-preserving form instead.
const SYMBOL_SKILLS = ALL_SKILLS.filter((s) => /^[a-z](\+\+|#)$/.test(s));

function buildMatcher(skill) {
  if (SYMBOL_SKILLS.includes(skill)) {
    const raw = new RegExp(
      `(^|[\\s,;:])${escapeRegExp(skill)}(?=[\\s,;:]|$)`,
      "i"
    );
    return { skill, form: "raw", re: raw };
  }
  const pattern = escapeRegExp(toMatchText(skill));
  const re = new RegExp(`(^|\\s)${pattern}(?=\\s|$)`, "i");
  return { skill, form: "norm", re };
}

// Longest first: prefixes lose to the multi-word skills that contain them.
const MATCHERS = ALL_SKILLS.slice()
  .sort((a, b) => b.length - a.length)
  .map(buildMatcher);

/**
 * The one matcher. Returns database-form skill names found in `text`.
 */
export function matchSkills(text = "") {
  if (!text || typeof text !== "string") return [];
  const norm = toMatchText(text);
  const raw = String(text).toLowerCase().replace(/\s+/g, " ").trim();
  const matched = [];
  for (const { skill, form, re } of MATCHERS) {
    if (!re.test(form === "raw" ? raw : norm)) continue;
    // Skip when an already-kept skill covers this candidate ("node" after
    // "node.js", "java" after "javascript") — the candidate's own regex is
    // tested against the kept skill, so "rman" survives "performance tuning".
    const coveredByLonger = matched.some((kept) =>
      re.test(form === "raw" ? kept.toLowerCase() : toMatchText(kept))
    );
    if (!coveredByLonger) matched.push(skill);
  }
  return matched;
}
