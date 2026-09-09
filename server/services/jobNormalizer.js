// ── Job Normalizer & Deduplicator ──────────────────────────────────
// Provides a single canonical job shape across all 7 sources,
// deduplication by provider ID and normalized URL/title/company,
// staleness detection, and server-side filtering/pagination/sorting.

/**
 * Canonical job fields that every normalized job must have.
 * @typedef {object} NormalizedJob
 * @property {string} source - Provider name (Remotive, Adzuna, etc.)
 * @property {string} sourceJobId - Provider's own ID
 * @property {string} id - Composite: `${source}-${sourceJobId}`
 * @property {string} canonicalUrl - Dedupe key: normalized apply URL
 * @property {string} title - Job title
 * @property {string} company - Company name
 * @property {string} description - Cleaned text description
 * @property {string[]} skills - Extracted skills from description
 * @property {string} location - Free-text location
 * @property {string} country - Country name or code
 * @property {string} workMode - remote | hybrid | onsite | unknown
 * @property {string} employmentType - full_time | part_time | contract | internship | unknown
 * @property {string} category - Industry/role category
 * @property {string} publishedAt - ISO date string
 * @property {string} fetchedAt - ISO date string (when we fetched it)
 * @property {string} expiresAt - ISO date string or null
 * @property {string} applyUrl - Direct link to apply
 * @property {object|null} salary - { min, max, currency } or null
 * @property {boolean} remote - Whether the job is remote
 */

// ── Helpers ────────────────────────────────────────────────────────

function removeHtml(text = "") {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize a URL for deduplication: lowercase, strip trailing slashes,
 * strip query params and fragments, normalize protocol.
 */
function normalizeUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.origin + u.pathname.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Normalize a title/company for deduplication: lowercase, strip extra whitespace,
 * strip common suffixes like "(Remote)", "(Full-time)".
 */
function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\s*[([][^\])]*[)\]]\s*/g, "") // strip (Remote), [Full-time], etc.
    .replace(/[^a-z0-9\s]/g, "") // keep only alphanumeric + space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Infer workMode from location and remote flag.
 */
function inferWorkMode(job) {
  if (job.remote) return "remote";
  const loc = (job.location || "").toLowerCase();
  if (/remote/i.test(loc)) return "remote";
  if (/hybrid/i.test(loc)) return "hybrid";
  if (/onsite|on-site|office/i.test(loc)) return "onsite";
  return "unknown";
}

/**
 * Infer employmentType from the job's type field.
 */
function inferEmploymentType(type = "") {
  const t = type.toLowerCase();
  if (/part.?time/.test(t)) return "part_time";
  if (/contract|freelance|consultant/.test(t)) return "contract";
  if (/intern/.test(t)) return "internship";
  if (/full.?time|permanent/.test(t)) return "full_time";
  return "unknown";
}

/**
 * Compute expiresAt from publishedAt. Default: 30 days after published.
 */
function computeExpiresAt(publishedAt) {
  if (!publishedAt) return null;
  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

// ── Deduplication ──────────────────────────────────────────────────

/**
 * Deduplicate jobs by composite keys:
 * 1. Same source + sourceJobId → always a dupe
 * 2. Same normalized URL → dupe (different sources linking to same posting)
 * 3. Same normalized title + company → dupe (same role reposted)
 *
 * @param {NormalizedJob[]} jobs
 * @returns {NormalizedJob[]}
 */
export function deduplicateJobs(jobs) {
  const byId = new Map();
  const byUrl = new Map();
  const byTitleCompany = new Map();
  const unique = [];

  for (const job of jobs) {
    const compositeId = `${job.source}:${job.sourceJobId}`;
    if (byId.has(compositeId)) continue;

    const normUrl = normalizeUrl(job.canonicalUrl || job.applyUrl);
    if (normUrl && byUrl.has(normUrl)) continue;

    const normTitle = normalizeText(job.title);
    const normCompany = normalizeText(job.company);
    const titleKey = `${normTitle}|${normCompany}`;
    if (normTitle && normCompany && byTitleCompany.has(titleKey)) continue;

    byId.set(compositeId, true);
    if (normUrl) byUrl.set(normUrl, true);
    if (normTitle && normCompany) byTitleCompany.set(titleKey, true);

    unique.push(job);
  }

  return unique;
}

// ── Staleness ──────────────────────────────────────────────────────

/**
 * Check if a job is stale (past its expiry date).
 * @param {NormalizedJob} job
 * @returns {boolean}
 */
export function isStale(job) {
  if (!job.expiresAt) return false;
  return new Date(job.expiresAt) < new Date();
}

// ── Server-side filtering, pagination, sorting ─────────────────────

/**
 * Filter, sort, and paginate a list of normalized jobs.
 * @param {NormalizedJob[]} jobs
 * @param {object} params
 * @param {string} params.search - Free-text search in title + company + description
 * @param {string} params.workMode - Filter by work mode
 * @param {string} params.employmentType - Filter by employment type
 * @param {string} params.category - Filter by category
 * @param {string} params.source - Filter by source name
 * @param {string} params.sortBy - Sort field (publishedAt, title, company)
 * @param {string} params.sortOrder - asc or desc
 * @param {number} params.page - 1-indexed page number
 * @param {number} params.pageSize - Items per page (default 20, max 100)
 * @param {boolean} params.includeStale - Whether to include stale jobs
 * @returns {{ jobs: NormalizedJob[], total: number, page: number, pageSize: number, totalPages: number }}
 */
export function filterAndPaginate(jobs, params = {}) {
  const {
    search = "",
    workMode = "",
    employmentType = "",
    category = "",
    source = "",
    sortBy = "publishedAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
    includeStale = false,
  } = params;

  let filtered = jobs;

  // Remove stale jobs unless requested
  if (!includeStale) {
    filtered = filtered.filter((j) => !isStale(j));
  }

  // Free-text search
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((j) => {
      const haystack = `${j.title} ${j.company} ${j.description} ${j.location}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  // Work mode filter
  if (workMode) {
    filtered = filtered.filter((j) => j.workMode === workMode);
  }

  // Employment type filter
  if (employmentType) {
    filtered = filtered.filter((j) => j.employmentType === employmentType);
  }

  // Category filter
  if (category) {
    const cat = category.toLowerCase();
    filtered = filtered.filter((j) => (j.category || "").toLowerCase().includes(cat));
  }

  // Source filter
  if (source) {
    const src = source.toLowerCase();
    filtered = filtered.filter((j) => j.source.toLowerCase() === src);
  }

  const total = filtered.length;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case "title":
        aVal = (a.title || "").toLowerCase();
        bVal = (b.title || "").toLowerCase();
        break;
      case "company":
        aVal = (a.company || "").toLowerCase();
        bVal = (b.company || "").toLowerCase();
        break;
      case "publishedAt":
      default:
        aVal = a.publishedAt || "";
        bVal = b.publishedAt || "";
        break;
    }
    if (sortOrder === "asc") return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
  });

  // Paginate
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 20));
  const start = (safePage - 1) * safePageSize;
  const paged = sorted.slice(start, start + safePageSize);

  return {
    jobs: paged,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
  };
}

// ── Exports ────────────────────────────────────────────────────────

export {
  normalizeUrl,
  normalizeText,
  inferWorkMode,
  inferEmploymentType,
  computeExpiresAt,
  removeHtml,
};
