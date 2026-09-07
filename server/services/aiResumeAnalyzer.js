// =============================================
// ProfileForge AI Resume Analyzer
// Version 1.0
// =============================================

import { cleanResumeText } from "../utils/textCleaner.js";

import analyzeSkills from "./skillExtractor.js";
import analyzeEducation from "./educationExtractor.js";
import analyzeExperience from "./experienceExtractor.js";
import extractEligibility from "./eligibilityExtractor.js";

function detectCareerDomains(skills = [], education = {}) {

    const domains = [];

    const text = [
        ...skills,
        ...(education.branches || [])
    ].join(" ").toLowerCase();

    if (text.includes("computer") || text.includes("python") || text.includes("react"))
        domains.push("Software Development");

    if (text.includes("machine learning") || text.includes("artificial intelligence"))
        domains.push("Artificial Intelligence");

    if (text.includes("data"))
        domains.push("Data Science");

    if (text.includes("pharmacy"))
        domains.push("Pharmacy");

    if (text.includes("physiotherapy"))
        domains.push("Physiotherapy");

    if (text.includes("nursing"))
        domains.push("Nursing");

    if (text.includes("medical"))
        domains.push("Healthcare");

    if (text.includes("marketing"))
        domains.push("Marketing");

    if (text.includes("finance"))
        domains.push("Finance");

    if (text.includes("law"))
        domains.push("Law");

    if (text.includes("civil"))
        domains.push("Civil Engineering");

    if (text.includes("mechanical"))
        domains.push("Mechanical Engineering");

    if (text.includes("electrical"))
        domains.push("Electrical Engineering");

    if (text.includes("electronics"))
        domains.push("Electronics");

    if (text.includes("design"))
        domains.push("Design");

    return [...new Set(domains)];
}

function calculateConfidence(skillCount, educationFound, experienceFound) {

    let score = 0;

    score += Math.min(skillCount * 2, 40);

    if (educationFound)
        score += 30;

    if (experienceFound)
        score += 30;

    return Math.min(score, 100);

}

export default function analyzeResume(resumeText = "") {

    const cleaned = cleanResumeText(resumeText);

    // Feed the matcher the original text, not the symbol-stripped cleaned
    // copy: the shared skill matcher normalizes "go-live" → "golive" and
    // "node.js" → "node js" itself, but it can only do that if the hyphens
    // and dots still exist in its input.
    const skillAnalysis = analyzeSkills(resumeText || "");

    const educationAnalysis = analyzeEducation(cleaned.cleaned);

    const experienceAnalysis = analyzeExperience(cleaned.cleaned);

    const eligibilityData = extractEligibility(cleaned.cleaned);

    const careerDomains = detectCareerDomains(

        skillAnalysis.skills,

        educationAnalysis

    );

    const confidenceScore = calculateConfidence(

        skillAnalysis.totalSkills,

        educationAnalysis.highestQualification,

        experienceAnalysis.estimatedYears

    );

    return {

        resumeText: resumeText,

        cleanedText: cleaned.cleaned,

        totalWords: cleaned.tokens.length,

        totalLines: cleaned.lines.length,

        skills: skillAnalysis.skills,

        skillsTotal: skillAnalysis.totalSkills,

        education: educationAnalysis,

        experience: experienceAnalysis,

        certifications: eligibilityData.certifications,

        languages: eligibilityData.languages,

        careerDomains,

        highestQualification:
            educationAnalysis.highestQualification,

        estimatedExperience:
            experienceAnalysis.estimatedYears,

        confidenceScore,

        analyzedAt: new Date().toISOString()

    };

}