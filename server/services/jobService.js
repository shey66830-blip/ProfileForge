// =====================================================
// ProfileForge Job Service V3
// AI Powered Multi Source Job Search Engine
// =====================================================

import analyzeSkills from "./skillExtractor.js";
import analyzeResume from "./aiResumeAnalyzer.js";
import calculateATS from "./atsScoreEngine.js";
import jobMatchingEngine from "./jobMatchingEngine.js";
import extractEligibility from "./eligibilityExtractor.js";
import summarizeJob from "./jobSummaryAI.js";
import recommendationEngine from "./recommendationEngine.js";
import salaryPredictor from "./salaryPredictor.js";
import careerAdvisor from "./careerAdvice.js";
import locationMatcher from "./locationMatcher.js";
import { resolveCountry, adzunaCode } from "./countryDirectory.js";

import {
    cleanResumeText,
    normalizeText,
    uniqueArray
} from "../utils/textCleaner.js";

// =====================================================
// Configuration
// =====================================================

// Env-configurable; hard-capped for sanity.
const MAX_RESULTS = Math.min(Math.max(parseInt(process.env.MAX_JOBS, 10) || 150, 20), 300);

// Per-source fetch timeout so one slow provider cannot stall a search.
const SOURCE_TIMEOUT_MS = 8000;

const DEFAULT_COUNTRY = "Worldwide";

const REMOTIVE_URL =
    "https://remotive.com/api/remote-jobs";

const ADZUNA_BASE =
    "https://api.adzuna.com/v1/api/jobs";

const JSEARCH_URL = "https://jsearch.p.rapidapi.com/search";
// Arbeitnow's public API is free and keyless (250 jobs/page).
const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";

// Country handling (worldwide + ~200 countries) lives in countryDirectory.js.

// =====================================================
// Helpers
// =====================================================

function removeHtml(text = "") {

    return text

        .replace(/<[^>]*>/g, " ")

        .replace(/\r/g, "")

        .replace(/\t/g, " ")

        .replace(/\s+/g, " ")

        .trim();

}

function uniqueJobs(jobs = []) {

    const seen = new Set();

    return jobs.filter(job => {

        const id =

            `${job.title}-${job.company}-${job.location}`

            .toLowerCase();

        if (seen.has(id))

            return false;

        seen.add(id);

        return true;

    });

}

// Keeps location-relevant jobs for country-specific searches. Remote jobs are
// location-independent and always survive the filter; non-remote jobs must
// mention the chosen country (name or ISO code) in their location/country.
function filterByCountry(jobs = [], resolved) {
    if (!resolved) return jobs;
    const name = resolved.name.toLowerCase();
    return jobs.filter(job => {
        if (job.remote) return true;
        const hay = `${job.location || ""} ${job.country || ""}`.toLowerCase();
        if (name && hay.includes(name)) return true;
        // ISO-code match only for real codes (empty code would match everything).
        return Boolean(resolved.code) && hay.includes(resolved.code.toLowerCase());
    });
}

async function fetchJSON(url, headers = {}, timeoutMs = SOURCE_TIMEOUT_MS) {
    try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        return null;
    }
}

// =====================================================
// Resume Analysis
// =====================================================

async function analyzeCandidateResume(resumeText = "") {

    if (!resumeText)
        return null;

    const analysis = analyzeResume(resumeText);

    const ats = calculateATS(analysis);

    return {

        analysis,

        ats

    };

}
// =====================================================
// Job Fetchers
// =====================================================

async function fetchRemotiveJobs(search = "", category = "") {

    const params = new URLSearchParams({ limit: "50" });

    if (search)
        params.append("search", search);

    if (category)
        params.append("category", category);

    const data = await fetchJSON(
        `${REMOTIVE_URL}?${params.toString()}`
    );

    return data?.jobs || [];

}

async function fetchAdzunaJobs(search = "", country = DEFAULT_COUNTRY) {

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey)
        return [];

    // Worldwide searches skip Adzuna (it is per-country by design); countries
    // outside its supported set are covered by JSearch instead.
    const code = adzunaCode(resolveCountry(country));
    if (!code)
        return [];

    const params = new URLSearchParams({

        app_id: appId,

        app_key: appKey,

        what: search,

        results_per_page: "50",

        "content-type": "application/json"

    });

    const url =
`${ADZUNA_BASE}/${code}/search/1?${params.toString()}`;

    const data = await fetchJSON(url);

    return data?.results || [];

}

// =====================================================
// Job Normalizers
// =====================================================

function normalizeRemotiveJob(job) {

    const description = removeHtml(job.description || "");

    return {

        id: `remotive-${job.id}`,

        source: "Remotive",

        title: job.title,

        company: job.company_name,

        location:
            job.candidate_required_location ||

            "Worldwide",

        country:
            job.candidate_required_location ||

            "Worldwide",

        category:
            job.category ||

            "General",

        type:
            job.job_type ||

            "Remote",

        salary:
            job.salary ||

            null,

        description,

        applyUrl:
            job.url,

        publishedAt:
            normalizePublishedAt(job.publication_date),

        remote: true

    };

}

function normalizeAdzunaJob(job) {

    const description =
        removeHtml(job.description || "");

    return {

        id: `adzuna-${job.id}`,

        source: "Adzuna",

        title: job.title,

        company:
            job.company?.display_name ||

            "Unknown",

        location:
            job.location?.display_name ||

            "Unknown",

        country:
            job.location?.area?.[0] ||

            "",

        category:
            job.category?.label ||

            "General",

        type:
            job.contract_type ||

            job.contract_time ||

            "Full Time",

        salary:

            job.salary_min && job.salary_max

            ?

            {

                min: Math.round(job.salary_min),

                max: Math.round(job.salary_max)

            }

            :

            null,

        description,

        applyUrl:
            job.redirect_url,

        publishedAt:
            normalizePublishedAt(job.created),

        remote: false

    };

}// =====================================================
// JSearch Fetcher
// =====================================================
async function fetchJSearchJobs(search = "", country = "") {
    const apiKey = process.env.JSEARCH_API_KEY;
    if (!apiKey) return [];

    // Worldwide → plain keyword query; specific country → natural-language
    // location ("react in Japan") which JSearch resolves to cities/regions.
    const resolved = resolveCountry(country);
    const query = resolved ? `${search} in ${resolved.name}` : search;
    const numPages = Math.min(Math.max(parseInt(process.env.JOBSEARCH_PAGES, 10) || 2, 1), 5);
    const params = new URLSearchParams({ query, page: "1", num_pages: String(numPages) });
    const headers = {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    };
    const data = await fetchJSON(`${JSEARCH_URL}?${params}`, headers);
    return data?.data || [];
}

// =====================================================
// Arbeitnow Fetcher
// =====================================================
async function fetchArbeitnowJobs(search = "") {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const data = await fetchJSON(`${ARBEITNOW_URL}?${params.toString()}`);
    return data?.data || [];
}

// =====================================================
// JSearch Normalizer
// =====================================================
function normalizeJSearchJob(job) {
    const description = removeHtml(job.job_description || "");
    const salary = job.job_min_salary && job.job_max_salary
        ? { min: Math.round(job.job_min_salary), max: Math.round(job.job_max_salary) }
        : null;
    return {
        id: `jsearch-${job.job_id || Math.random().toString(36).slice(2)}`,
        source: "JSearch",
        title: job.job_title || "Unknown",
        company: job.employer_name || "Unknown",
        location: job.job_city ? `${job.job_city}, ${job.job_state || ""}, ${job.job_country || ""}`.trim().replace(/,\s*,/g, ",") : job.job_country || "Remote",
        country: job.job_country || "",
        category: job.job_employment_type || "Full Time",
        type: job.job_employment_type || "Full Time",
        salary,
        description,
        applyUrl: job.job_apply_link || "",
        publishedAt: job.job_posted_at_timestamp ? new Date(job.job_posted_at_timestamp * 1000).toISOString() : "",
        remote: job.job_is_remote || false,
    };
}

// =====================================================
// Arbeitnow Normalizer
// =====================================================
function normalizeArbeitnowJob(job) {
    // Their description HTML is entity-encoded ("&lt;p&gt;…") — decode first.
    const rawDescription = (job.description || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
    const description = removeHtml(rawDescription);
    return {
        id: `arbeitnow-${job.slug || job.id}`,
        source: "Arbeitnow",
        title: job.title || "Unknown",
        company: job.company_name || "Unknown",
        location: job.location || (job.remote ? "Remote" : "Not specified"),
        country: "",
        category: (job.tags || [])[0] || "General",
        type: (job.job_types || []).join(", ") || (job.remote ? "Remote" : "Full Time"),
        salary: null,
        description,
        applyUrl: job.url || "",
        publishedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : "",
        remote: job.remote || false,
    };
}

// =====================================================
// Jobicy Fetcher (free, keyless — worldwide remote)
// =====================================================
async function fetchJobicyJobs(search = "") {
    const params = new URLSearchParams({ count: "50" });
    if (search) params.append("tag", search);
    const data = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?${params.toString()}`);
    return data?.jobs || [];
}

// =====================================================
// Jobicy Normalizer
// =====================================================
function normalizeJobicyJob(job) {
    const description = removeHtml(job.jobDescription || job.jobExcerpt || "");
    return {
        id: `jobicy-${job.id}`,
        source: "Jobicy",
        title: job.jobTitle || "Unknown",
        company: job.companyName || "Unknown",
        location: job.jobGeo || "Worldwide",
        country: "",
        category: job.industryName || "General",
        type: job.jobLevel || "Remote",
        salary: null,
        description,
        applyUrl: job.url || "",
        publishedAt: normalizePublishedAt(job.pubDate || ""),
        remote: true,
    };
}

// =====================================================
// Himalayas Fetcher (free, keyless — worldwide remote)
// =====================================================
async function fetchHimalayasJobs(search = "") {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.append("q", search);
    const data = await fetchJSON(`https://himalayas.app/jobs/api?${params.toString()}`);
    return data?.jobs || [];
}

// =====================================================
// Himalayas Normalizer
// =====================================================
function normalizeHimalayasJob(job) {
    const description = removeHtml(job.descriptionPlain || "");
    const loc = Array.isArray(job.locationRestrictions) && job.locationRestrictions.length
        ? job.locationRestrictions.join(", ")
        : "Worldwide";
    return {
        id: `himalayas-${job.guid || job.id || Math.random().toString(36).slice(2)}`,
        source: "Himalayas",
        title: job.title || "Unknown",
        company: job.companyName || job.company?.name || "Unknown",
        location: loc,
        country: "",
        category: "General",
        type: "Remote",
        salary: null,
        description,
        applyUrl: job.applicationLink || job.guid || "",
        publishedAt: normalizePublishedAt(job.pubDate),
        remote: true,
    };
}

// Normalizes epoch-seconds / epoch-millis timestamps (some sources, e.g.
// Himalayas, return raw integers) into ISO strings. Leaves ISO strings as-is.
function normalizePublishedAt(v) {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number" || /^\d+$/.test(String(v))) {
        const n = Number(v);
        // Epoch seconds are ~10 digits; millis are ~13. Anything that parses
        // to a pre-2001 date under either interpretation is unusable — drop it.
        const dSec = new Date(n < 1e12 ? n * 1000 : n);
        if (!isNaN(dSec.getTime()) && dSec.getTime() > 978307200000) return dSec.toISOString();
        return "";
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
}

// =====================================================
// Jooble Fetcher (optional — set JOOBLE_API_KEY; covers 60+ countries)
// =====================================================
async function fetchJoobleJobs(search = "", resolved = null) {
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch(`https://jooble.org/api/${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                keywords: search || "",
                location: resolved?.name || "",
                page: 1,
            }),
            signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data?.jobs || [];
    } catch (err) {
        return [];
    }
}

// =====================================================
// Jooble Normalizer
// =====================================================
function normalizeJoobleJob(job) {
    const description = removeHtml(job.snippet || "");
    return {
        id: `jooble-${job.id || `${job.title}-${job.company}`.toLowerCase()}`,
        source: "Jooble",
        title: job.title || "Unknown",
        company: job.company || "Unknown",
        location: job.location || "Worldwide",
        country: "",
        category: "General",
        type: job.type || "Full Time",
        salary: null,
        description,
        applyUrl: job.link || "",
        publishedAt: normalizePublishedAt(job.updated || ""),
        remote: /remote/i.test(`${job.location || ""} ${job.title || ""}`),
    };
}

// =====================================================
// Multi Source Search
// =====================================================
async function collectJobs({
    search,
    category,
    country,
    sources = []
}) {
    const resolved = resolveCountry(country);

    // sources=[] means every source; a non-empty array is the allow-list the
    // client's Source checkboxes map to (names must match the normalizers).
    const want = (name) => sources.length === 0 || sources.includes(name);
    const fetchAll = sources.length === 0;

    const [
        remotive,
        adzuna,
        jsearch,
        arbeitnow,
        jobicy,
        himalayas,
        jooble
    ] = await Promise.all([
        fetchAll || want("Remotive") ? fetchRemotiveJobs(search, category) : Promise.resolve([]),
        fetchAll || want("Adzuna") ? fetchAdzunaJobs(search, country) : Promise.resolve([]),
        fetchAll || want("JSearch") ? fetchJSearchJobs(search, country) : Promise.resolve([]),
        fetchAll || want("Arbeitnow") ? fetchArbeitnowJobs(search) : Promise.resolve([]),
        fetchAll || want("Jobicy") ? fetchJobicyJobs(search) : Promise.resolve([]),
        fetchAll || want("Himalayas") ? fetchHimalayasJobs(search) : Promise.resolve([]),
        fetchAll || want("Jooble") ? fetchJoobleJobs(search, resolved) : Promise.resolve([]),
    ]);

    // Adzuna is queried per-country at the API level, so its results are
    // inherently scoped to the chosen country and skip the post-filter.
    const adzunaJobs = adzuna.map(normalizeAdzunaJob);

    const scopedJobs = filterByCountry([
        ...remotive.map(normalizeRemotiveJob),
        ...jsearch.map(normalizeJSearchJob),
        ...arbeitnow.map(normalizeArbeitnowJob),
        ...jobicy.map(normalizeJobicyJob),
        ...himalayas.map(normalizeHimalayasJob),
        ...jooble.map(normalizeJoobleJob),
    ], resolved);

    return uniqueJobs([...adzunaJobs, ...scopedJobs]);
}
// =====================================================
// AI Job Enhancement
// =====================================================

async function enhanceJob(job, resumeData = null) {

    const enhanced = { ...job };

    // ---------------------------------
    // Eligibility
    // ---------------------------------

    const eligibilityData = extractEligibility(
    job.description || ""
);

enhanced.eligibility = eligibilityData.eligibility;
enhanced.eligibilityDetails = eligibilityData;
    // ---------------------------------
    // AI Summary
    // ---------------------------------

    enhanced.summary =
        summarizeJob(
            job.description || ""
        );

    enhanced.skills =
    analyzeSkills(
        job.description || ""
    ).skills;

    // ---------------------------------
    // Default Values
    // ---------------------------------

    enhanced.match = {

        overall: 0,

        breakdown: {}

    };

    enhanced.salaryPrediction = null;

    enhanced.careerAdvice = null;

    enhanced.locationMatch = null;

    enhanced.recommendation = null;

    enhanced.ats = null;

    // ---------------------------------
    // Resume Dependent AI
    // ---------------------------------

    if (!resumeData)
        return enhanced;

    const {

        analysis,

        ats

    } = resumeData;

    // ATS

    enhanced.ats = ats;

    // Match Score

 const matchResult = jobMatchingEngine({
    resume: analysis,
    job: enhanced,
    ats
});

enhanced.match = matchResult;
enhanced.matchScore = matchResult.overall;

    // Salary Prediction

    enhanced.salaryPrediction = salaryPredictor({
    resume: analysis,
    job: enhanced
});

    // Career Advice

    enhanced.careerAdvice = careerAdvisor({
    resume: analysis,
    salary: enhanced.salaryPrediction
});

    // Recommendation

    enhanced.recommendation =
        recommendationEngine({

            resume: analysis,

            match:
                enhanced.match

        });

    // Location Match

    enhanced.locationMatch = locationMatcher({
    userLocation: analysis.location,
    jobLocation: enhanced.location
});

return enhanced;

}
// =====================================================
// Smart Search Fallback
// =====================================================

async function searchWithFallback({

    search = "",

    category = "",

    country = DEFAULT_COUNTRY,

    sources = []

}) {

    // First Try

    let jobs = await collectJobs({

        search,

        category,

        country,

        sources

    });

    if (jobs.length > 0)

        return jobs;

    // ----------------------------------
    // Intelligent Fallback Keywords
    // ----------------------------------

    const lower = search.toLowerCase();

    let fallback = "";

    if (

        lower.includes("physio") ||

        lower.includes("medical") ||

        lower.includes("doctor") ||

        lower.includes("clinical") ||

        lower.includes("health")

    )

        fallback = "healthcare";

    else if (

        lower.includes("frontend") ||

        lower.includes("react")

    )

        fallback = "frontend";

    else if (

        lower.includes("backend") ||

        lower.includes("node")

    )

        fallback = "backend";

    else if (

        lower.includes("python")

    )

        fallback = "python";

    else if (

        lower.includes("data")

    )

        fallback = "data";

    else if (

        lower.includes("ai") ||

        lower.includes("machine learning")

    )

        fallback = "artificial intelligence";

    else

        fallback =

            search.split(" ")[0];

    // Second Try

    jobs = await collectJobs({

        search: fallback,

        category,

        country,

        sources

    });

    return jobs;

}
// =====================================================
// Job Ranking Engine
// =====================================================

function rankJobs(jobs = []) {

    return [...jobs]

        .map(job => {

            let score = 0;

            // --------------------------
            // Match Score (Highest Priority)
            // --------------------------

            score +=
                job.match?.overall || 0;

            // --------------------------
            // ATS Score
            // --------------------------

            score +=
                (job.ats?.score || 0) * 0.20;

            // --------------------------
            // Salary
            // --------------------------

            if (job.salaryPrediction)
                score += 8;

            if (job.salary?.max)
                score += 5;

            // --------------------------
            // Remote Bonus
            // --------------------------

            if (job.remote)
                score += 4;

            // --------------------------
            // Recommendation Bonus
            // --------------------------

            if (
                job.recommendation?.recommended
            )
                score += 12;

            // --------------------------
            // Summary Available
            // --------------------------

            if (job.summary)
                score += 2;

            return {

                ...job,

                rankingScore: Math.round(score)

            };

        })

        .sort(

            (a, b) =>

                b.rankingScore -

                a.rankingScore

        );

}
// =====================================================
// Search Summary
// =====================================================

function buildSearchSummary({

    jobs = [],

    search = "",

    country = DEFAULT_COUNTRY

}) {

    const totalJobs = jobs.length;

    const remoteJobs = jobs.filter(

        job => job.remote

    ).length;

    const companies = new Set(

        jobs.map(

            job => job.company

        )

    );

    const averageMatch =

        totalJobs === 0

            ? 0

            : Math.round(

                  jobs.reduce(

                      (sum, job) =>

                          sum +

                          (job.match?.overall || 0),

                      0

                  ) / totalJobs

              );    const perSource = {};
    jobs.forEach(job => {
        perSource[job.source] = (perSource[job.source] || 0) + 1;
    });

    return {
        search,
        country,
        totalJobs,
        remoteJobs,
        companies: companies.size,
        averageMatch,
        perSource,
        generatedAt:
            new Date().toISOString()
    };

}
// =====================================================
// Main Search Engine
// =====================================================

export async function searchRemoteJobs({

    search = "",

    category = "",

    country = DEFAULT_COUNTRY,

    resumeText = "",

    sources = []

}) {

    try {

        // --------------------------------
        // Resume Analysis
        // --------------------------------

        const resumeData =

            await analyzeCandidateResume(

                resumeText

            );

        // --------------------------------
        // Fetch Jobs
        // --------------------------------

        let jobs =

            await searchWithFallback({

                search,

                category,

                country,

                sources

            });

        if (!jobs.length) {

            return {

                success: true,

                jobs: [],

                summary: buildSearchSummary({

                    jobs: [],

                    search,

                    country

                }),

                message:

                    "No jobs found."

            };

        }

        // --------------------------------
        // AI Enhancement
        // --------------------------------

        jobs = await Promise.all(

            jobs.map(job =>

                enhanceJob(

                    job,

                    resumeData

                )

            )

        );
                // --------------------------------
        // Ranking
        // --------------------------------


        jobs = rankJobs(jobs);

        // --------------------------------
        // Limit Results
        // --------------------------------

        jobs = jobs.slice(0, MAX_RESULTS);

        // --------------------------------
        // Search Summary
        // --------------------------------

        const summary = buildSearchSummary({

            jobs,

            search,

            country

        });

        // --------------------------------
        // Final Response
        // --------------------------------

        return {

            success: true,

            jobs,

            summary,

            resumeAnalysis:
                resumeData?.analysis || null,

            ats:
                resumeData?.ats || null

        };

    }

    catch (error) {



        return {

            success: false,

            jobs: [],

            summary: null,

            resumeAnalysis: null,

            ats: null,

            error:

                error.message ||

                "Internal Server Error"

        };

    }

}