import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  deduplicateJobs,
  isStale,
  filterAndPaginate,
  normalizeUrl,
  normalizeText,
  inferWorkMode,
  inferEmploymentType,
  computeExpiresAt,
} = await import("./services/jobNormalizer.js");

// ── Sample jobs for testing ──

function makeJob(overrides = {}) {
  const id = overrides.sourceJobId || overrides.id || "123";
  return {
    source: overrides.source || "Remotive",
    sourceJobId: id,
    id: `${(overrides.source || "remotive").toLowerCase()}-${id}`,
    canonicalUrl: "canonicalUrl" in overrides ? overrides.canonicalUrl : `https://example.com/job/${id}`,
    title: "Senior Developer",
    company: "Acme Corp",
    description: "Build things",
    skills: ["JavaScript", "React"],
    location: "Remote",
    country: "",
    workMode: "remote",
    employmentType: "full_time",
    category: "Engineering",
    publishedAt: "2025-01-15T00:00:00.000Z",
    fetchedAt: new Date().toISOString(),
    expiresAt: null,
    applyUrl: "applyUrl" in overrides ? overrides.applyUrl : `https://example.com/job/${id}`,
    salary: null,
    remote: true,
    ...overrides,
  };
}

// ── Deduplication tests ──

describe("deduplicateJobs", () => {
  it("removes exact duplicates by source+sourceJobId", () => {
    const jobs = [
      makeJob({ source: "Remotive", sourceJobId: "1" }),
      makeJob({ source: "Remotive", sourceJobId: "1" }),
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 1);
  });

  it("removes cross-source duplicates by URL", () => {
    const jobs = [
      makeJob({ source: "Remotive", sourceJobId: "1", canonicalUrl: "https://example.com/job/abc" }),
      makeJob({ source: "Adzuna", sourceJobId: "2", canonicalUrl: "https://example.com/job/ABC" }),
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 1);
  });

  it("removes cross-source duplicates by title+company", () => {
    const jobs = [
      makeJob({ source: "Remotive", sourceJobId: "1", title: "React Developer", company: "Acme Corp", canonicalUrl: "" }),
      makeJob({ source: "Adzuna", sourceJobId: "2", title: "React Developer", company: "Acme Corp", canonicalUrl: "" }),
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 1);
  });

  it("keeps distinct jobs", () => {
    const jobs = [
      makeJob({ source: "Remotive", sourceJobId: "1", title: "Frontend Dev", company: "Acme" }),
      makeJob({ source: "Remotive", sourceJobId: "2", title: "Backend Dev", company: "Acme" }),
      makeJob({ source: "Adzuna", sourceJobId: "3", title: "Frontend Dev", company: "Beta Inc" }),
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 3);
  });

  it("handles empty input", () => {
    assert.deepEqual(deduplicateJobs([]), []);
  });

  it("handles jobs with no URL or title", () => {
    const jobs = [
      makeJob({ source: "A", sourceJobId: "1", canonicalUrl: "", title: "", company: "" }),
      makeJob({ source: "B", sourceJobId: "2", canonicalUrl: "", title: "", company: "" }),
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 2); // can't dedupe without URL or title
  });
});

// ── Staleness tests ──

describe("isStale", () => {
  it("returns false for null expiresAt", () => {
    assert.equal(isStale(makeJob({ expiresAt: null })), false);
  });

  it("returns true for past expiresAt", () => {
    assert.equal(isStale(makeJob({ expiresAt: "2020-01-01T00:00:00.000Z" })), true);
  });

  it("returns false for future expiresAt", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    assert.equal(isStale(makeJob({ expiresAt: future.toISOString() })), false);
  });
});

// ── Inference tests ──

describe("inferWorkMode", () => {
  it("returns remote for remote jobs", () => {
    assert.equal(inferWorkMode(makeJob({ remote: true })), "remote");
  });

  it("returns hybrid from location text", () => {
    assert.equal(inferWorkMode(makeJob({ remote: false, location: "Hybrid - NYC" })), "hybrid");
  });

  it("returns onsite from location text", () => {
    assert.equal(inferWorkMode(makeJob({ remote: false, location: "Onsite - London" })), "onsite");
  });

  it("returns unknown for ambiguous location", () => {
    assert.equal(inferWorkMode(makeJob({ remote: false, location: "NYC" })), "unknown");
  });
});

describe("inferEmploymentType", () => {
  it("detects part-time", () => {
    assert.equal(inferEmploymentType("Part Time"), "part_time");
  });

  it("detects contract", () => {
    assert.equal(inferEmploymentType("Contract"), "contract");
  });

  it("detects internship", () => {
    assert.equal(inferEmploymentType("Internship"), "internship");
  });

  it("detects full-time", () => {
    assert.equal(inferEmploymentType("Full Time"), "full_time");
  });

  it("returns unknown for unrecognized", () => {
    assert.equal(inferEmploymentType("Something"), "unknown");
  });
});

// ── URL normalization tests ──

describe("normalizeUrl", () => {
  it("lowercases and strips trailing slash", () => {
    assert.equal(normalizeUrl("https://Example.COM/Job/123/"), "https://example.com/job/123");
  });

  it("strips query params and hash", () => {
    assert.equal(normalizeUrl("https://example.com/job/123?ref=home#top"), "https://example.com/job/123");
  });

  it("handles empty string", () => {
    assert.equal(normalizeUrl(""), "");
  });

  it("handles null", () => {
    assert.equal(normalizeUrl(null), "");
  });
});

// ── Filtering and pagination tests ──

describe("filterAndPaginate", () => {
  const jobs = [
    makeJob({ source: "Remotive", sourceJobId: "1", title: "Frontend Dev", workMode: "remote", category: "Engineering", publishedAt: "2025-01-01T00:00:00.000Z" }),
    makeJob({ source: "Adzuna", sourceJobId: "2", title: "Backend Dev", workMode: "onsite", category: "Engineering", publishedAt: "2025-01-02T00:00:00.000Z" }),
    makeJob({ source: "Jobicy", sourceJobId: "3", title: "Designer", workMode: "remote", category: "Design", publishedAt: "2025-01-03T00:00:00.000Z" }),
    makeJob({ source: "Remotive", sourceJobId: "4", title: "DevOps Engineer", workMode: "remote", category: "Engineering", publishedAt: "2025-01-04T00:00:00.000Z" }),
    makeJob({ source: "Adzuna", sourceJobId: "5", title: "PM", workMode: "hybrid", category: "Product", publishedAt: "2025-01-05T00:00:00.000Z" }),
  ];

  it("returns all jobs with no filters", () => {
    const result = filterAndPaginate(jobs);
    assert.equal(result.total, 5);
    assert.equal(result.jobs.length, 5);
  });

  it("filters by workMode", () => {
    const result = filterAndPaginate(jobs, { workMode: "remote" });
    assert.equal(result.total, 3);
    assert.ok(result.jobs.every((j) => j.workMode === "remote"));
  });

  it("filters by source", () => {
    const result = filterAndPaginate(jobs, { source: "Remotive" });
    assert.equal(result.total, 2);
  });

  it("filters by category", () => {
    const result = filterAndPaginate(jobs, { category: "Design" });
    assert.equal(result.total, 1);
    assert.equal(result.jobs[0].title, "Designer");
  });

  it("filters by free-text search", () => {
    const result = filterAndPaginate(jobs, { search: "frontend" });
    assert.equal(result.total, 1);
    assert.equal(result.jobs[0].title, "Frontend Dev");
  });

  it("paginates correctly", () => {
    const result = filterAndPaginate(jobs, { page: 1, pageSize: 2 });
    assert.equal(result.jobs.length, 2);
    assert.equal(result.total, 5);
    assert.equal(result.totalPages, 3);
  });

  it("paginates page 2", () => {
    const result = filterAndPaginate(jobs, { page: 2, pageSize: 2 });
    assert.equal(result.jobs.length, 2);
  });

  it("sorts by publishedAt desc (default)", () => {
    const result = filterAndPaginate(jobs, { sortBy: "publishedAt", sortOrder: "desc" });
    assert.equal(result.jobs[0].title, "PM"); // most recent
  });

  it("sorts by title asc", () => {
    const result = filterAndPaginate(jobs, { sortBy: "title", sortOrder: "asc" });
    assert.equal(result.jobs[0].title, "Backend Dev");
  });

  it("excludes stale jobs by default", () => {
    const staleJob = makeJob({ source: "X", sourceJobId: "99", expiresAt: "2020-01-01T00:00:00.000Z" });
    const result = filterAndPaginate([...jobs, staleJob]);
    assert.equal(result.total, 5); // stale job excluded
  });

  it("includes stale jobs when requested", () => {
    const staleJob = makeJob({ source: "X", sourceJobId: "99", expiresAt: "2020-01-01T00:00:00.000Z" });
    const result = filterAndPaginate([...jobs, staleJob], { includeStale: true });
    assert.equal(result.total, 6);
  });

  it("handles empty input", () => {
    const result = filterAndPaginate([]);
    assert.equal(result.total, 0);
    assert.equal(result.jobs.length, 0);
    assert.equal(result.totalPages, 0);
  });

  it("clamps invalid page numbers", () => {
    const result = filterAndPaginate(jobs, { page: -1, pageSize: 10 });
    assert.equal(result.page, 1);
    assert.equal(result.jobs.length, 5);
  });

  it("clamps oversized pageSize", () => {
    const result = filterAndPaginate(jobs, { pageSize: 999 });
    assert.equal(result.pageSize, 100); // max 100
  });
});

// ── computeExpiresAt tests ──

describe("computeExpiresAt", () => {
  it("returns 30 days after publishedAt", () => {
    const result = computeExpiresAt("2025-01-01T00:00:00.000Z");
    const expected = new Date("2025-01-31T00:00:00.000Z");
    assert.equal(new Date(result).getTime(), expected.getTime());
  });

  it("returns null for empty input", () => {
    assert.equal(computeExpiresAt(""), null);
    assert.equal(computeExpiresAt(null), null);
  });
});

// ── normalizeText tests ──

describe("normalizeText", () => {
  it("lowercases and strips parenthetical", () => {
    assert.equal(normalizeText("React Developer (Remote)"), "react developer");
  });

  it("strips special characters", () => {
    assert.equal(normalizeText("C++ Engineer"), "c engineer");
  });

  it("handles empty input", () => {
    assert.equal(normalizeText(""), "");
    assert.equal(normalizeText(null), "");
  });
});
