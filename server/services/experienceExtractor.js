// =============================================
// ProfileForge AI Experience Extractor
// Version 1.0
// =============================================

import { normalizeText } from "../utils/textCleaner.js";

const EXPERIENCE_TYPES = [

  "internship",
  "intern",
  "full time",
  "part time",
  "freelance",
  "contract",
  "volunteer",
  "research",
  "teaching",
  "training",
  "apprenticeship"

];

const LEADERSHIP_KEYWORDS = [

  "leader",
  "lead",
  "head",
  "captain",
  "president",
  "secretary",
  "coordinator",
  "mentor",
  "manager",
  "founder"

];

const PROJECT_KEYWORDS = [

  "project",
  "projects",
  "developed",
  "built",
  "created",
  "implemented",
  "designed"

];

const ACHIEVEMENT_KEYWORDS = [

  "award",
  "winner",
  "achievement",
  "certification",
  "certificate",
  "hackathon",
  "competition",
  "rank",
  "medal"

];

function extractYears(text){

    const matches=[
        ...(text.match(/\d+\+?\s+years?/gi)||[]),
        ...(text.match(/\d+\+?\s+months?/gi)||[])
    ];

    return [...new Set(matches)];

}

function extractExperienceTypes(text){

    const lower=normalizeText(text);

    return EXPERIENCE_TYPES.filter(type=>
        lower.includes(normalizeText(type))
    );

}

function extractLeadership(text){

    const lower=normalizeText(text);

    return LEADERSHIP_KEYWORDS.filter(word=>
        lower.includes(normalizeText(word))
    );

}

function extractProjects(text){

    const lower=normalizeText(text);

    return PROJECT_KEYWORDS.filter(word=>
        lower.includes(normalizeText(word))
    );

}

function extractAchievements(text){

    const lower=normalizeText(text);

    return ACHIEVEMENT_KEYWORDS.filter(word=>
        lower.includes(normalizeText(word))
    );

}

function estimateExperience(text){

    const lower=text.toLowerCase();

    if(lower.includes("10 years")) return 10;
    if(lower.includes("9 years")) return 9;
    if(lower.includes("8 years")) return 8;
    if(lower.includes("7 years")) return 7;
    if(lower.includes("6 years")) return 6;
    if(lower.includes("5 years")) return 5;
    if(lower.includes("4 years")) return 4;
    if(lower.includes("3 years")) return 3;
    if(lower.includes("2 years")) return 2;
    if(lower.includes("1 year")) return 1;

    if(lower.includes("intern"))
        return 0.5;

    if(lower.includes("fresher"))
        return 0;

    return 0;

}

export default function analyzeExperience(text=""){

    return{

        estimatedYears:estimateExperience(text),

        duration:extractYears(text),

        experienceTypes:extractExperienceTypes(text),

        leadership:extractLeadership(text),

        projectKeywords:extractProjects(text),

        achievements:extractAchievements(text),

        hasInternship:
            normalizeText(text).includes("intern"),

        hasResearch:
            normalizeText(text).includes("research"),

        hasVolunteer:
            normalizeText(text).includes("volunteer"),

        hasLeadership:
            extractLeadership(text).length>0

    };

}