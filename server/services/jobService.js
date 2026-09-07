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

import {
    cleanResumeText,
    normalizeText,
    uniqueArray
} from "../utils/textCleaner.js";

// =====================================================
// Configuration
// =====================================================

const MAX_RESULTS = 80;

const DEFAULT_COUNTRY = "India";

const REMOTIVE_URL =
    "https://remotive.com/api/remote-jobs";

const ADZUNA_BASE =
    "https://api.adzuna.com/v1/api/jobs";

const JSEARCH_URL = "https://jsearch.p.rapidapi.com/search";
const ARBEITNOW_URL = "https://arbeitnow.p.rapidapi.com/api/job-board-api";

const COUNTRY_CODES = {

    India: "in",

    "United States": "us",

    USA: "us",

    Canada: "ca",

    Australia: "au",

    Germany: "de",

    Singapore: "sg",

    "United Kingdom": "gb"

};

// =====================================================
// Helpers
// =====================================================

function getCountryCode(country = DEFAULT_COUNTRY) {

    return (
        COUNTRY_CODES[country] ||

        COUNTRY_CODES[DEFAULT_COUNTRY]
    );

}

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

}async function fetchJSON(url, headers = {}) {
    try {
        const response = await fetch(url, { headers });
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

    const params = new URLSearchParams();

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

    const params = new URLSearchParams({

        app_id: appId,

        app_key: appKey,

        what: search,

        results_per_page: "40",

        "content-type": "application/json"

    });

    const url =
`${ADZUNA_BASE}/${getCountryCode(country)}/search/1?${params.toString()}`;

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
            job.publication_date,

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
            job.created,

        remote: false

    };

}// =====================================================
// JSearch Fetcher
// =====================================================
async function fetchJSearchJobs(search = "", country = "") {
    const apiKey = process.env.JSEARCH_API_KEY;
    if (!apiKey) return [];

    const query = country ? `${search} in ${country}` : search;
    const params = new URLSearchParams({ query, page: "1", num_pages: "1" });
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
    const apiKey = process.env.ARBEITNOW_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    const headers = {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "arbeitnow.p.rapidapi.com",
    };
    const data = await fetchJSON(`${ARBEITNOW_URL}?${params}`, headers);
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
    const description = removeHtml(job.description || "");
    return {
        id: `arbeitnow-${job.id}`,
        source: "Arbeitnow",
        title: job.title || "Unknown",
        company: job.company_name || "Unknown",
        location: job.location || "Remote",
        country: "",
        category: "General",
        type: job.remote ? "Remote" : "Full Time",
        salary: null,
        description,
        applyUrl: job.url || "",
        publishedAt: job.created_at || "",
        remote: job.remote || false,
    };
}

// =====================================================
// Multi Source Search
// =====================================================
async function collectJobs({
    search,
    category,
    country
}) {
    const [
        remotive,
        adzuna,
        jsearch,
        arbeitnow
    ] = await Promise.all([
        fetchRemotiveJobs(search, category),
        fetchAdzunaJobs(search, country),
        fetchJSearchJobs(search, country),
        fetchArbeitnowJobs(search),
    ]);

    return uniqueJobs([
        ...remotive.map(normalizeRemotiveJob),
        ...adzuna.map(normalizeAdzunaJob),
        ...jsearch.map(normalizeJSearchJob),
        ...arbeitnow.map(normalizeArbeitnowJob),
    ]);
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

    country = DEFAULT_COUNTRY

}) {

    // First Try

    let jobs = await collectJobs({

        search,

        category,

        country

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

        country

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

              );

    return {

        search,

        country,

        totalJobs,

        remoteJobs,

        companies: companies.size,

        averageMatch,

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

    resumeText = ""

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

                country

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