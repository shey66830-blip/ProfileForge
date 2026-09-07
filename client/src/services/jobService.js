import { API_BASE } from "../config.js";

function cleanHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractEligibility(description = "") {
  const text = cleanHtml(description);

  const lower = text.toLowerCase();

  const keywords = [
    "requirements",
    "requirement",
    "qualifications",
    "qualification",
    "eligibility",
    "candidate profile",
    "you have",
    "you should",
    "must have",
    "minimum",
    "experience",
    "skills required",
  ];

  const found = keywords.find((word) => lower.includes(word));

  if (!found) {
    return "Eligibility criteria not clearly mentioned by company.";
  }

  const index = lower.indexOf(found);

  return text.slice(index, index + 800);
}

export async function fetchJobs({
  search = "",
  category = "",
  country = "all",
}) {
  try {
    const params = new URLSearchParams();

    if (search) params.append("search", search);

    if (category) params.append("category", category);

    if (country) params.append("country", country);

    const res = await fetch(
      `${API_BASE}/jobs?${params.toString()}`,
      {
        credentials: "include",
      }
    );

    const data = await res.json();

    if (!data.ok) return data;

    const improvedJobs = (data.jobs || []).map((job) => ({
      ...job,

      eligibility:
        job.eligibility ||
        extractEligibility(job.description || ""),

      description:
        cleanHtml(job.description || ""),

      location:
        job.location ||
        "Location not clearly mentioned",

      salary:
        job.salary ||
        "Salary/Stipend not disclosed",

      company:
        job.company ||
        "Unknown company",
    }));

    return {
      ...data,
      jobs: improvedJobs,
    };
  } catch {
    return {
      ok: false,
      message: "Job backend not reachable.",
    };
  }
}