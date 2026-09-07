// =============================================
// ProfileForge AI Education Extractor
// Version 1.0
// =============================================

import { normalizeText } from "../utils/textCleaner.js";

const DEGREES = [

  "b.tech",
  "btech",
  "be",
  "b.e",

  "m.tech",
  "mtech",
  "me",
  "m.e",

  "bca",
  "mca",

  "b.sc",
  "bsc",
  "m.sc",
  "msc",

  "mba",

  "mbbs",
  "bds",
  "bams",
  "bhms",

  "pharm d",
  "b.pharm",
  "m.pharm",
  "d.pharm",

  "llb",
  "llm",

  "ba",
  "ma",

  "bcom",
  "mcom",

  "bba",

  "phd",
  "doctorate",

  "diploma",

  "iti"

];

const BRANCHES = [

  "computer science",
  "information technology",
  "electronics",
  "electrical",
  "civil",
  "mechanical",
  "chemical",
  "biotechnology",
  "biomedical",
  "automobile",
  "robotics",
  "artificial intelligence",
  "machine learning",
  "data science",
  "cyber security",
  "pharmacy",
  "physiotherapy",
  "nursing",
  "law",
  "commerce",
  "economics",
  "finance",
  "marketing",
  "psychology",
  "mathematics",
  "physics",
  "chemistry",
  "biology"

];

function extractDegrees(text){

    const lower=normalizeText(text);

    return DEGREES.filter(degree=>
        lower.includes(normalizeText(degree))
    );

}

function extractBranches(text){

    const lower=normalizeText(text);

    return BRANCHES.filter(branch=>
        lower.includes(normalizeText(branch))
    );

}

function extractCGPA(text){

    const match=text.match(/([0-9]\.[0-9]{1,2})\s*\/\s*10/i);

    if(match) return match[1]+"/10";

    return null;

}

function extractPercentage(text){

    const match=text.match(/([0-9]{2,3}(\.[0-9]+)?)\s*%/);

    if(match) return match[1]+"%";

    return null;

}

function extractPassingYears(text){

    return [...new Set(

        text.match(/\b(19|20)\d{2}\b/g) || []

    )];

}

function extractInstitutes(text){

    const regex=/([A-Z][A-Za-z&().,' -]{5,}(University|Institute|College|School))/g;

    const matches=text.match(regex);

    return matches || [];

}

function highestQualification(degrees){

    const priority=[

        "doctorate",
        "phd",

        "m.tech",
        "mtech",
        "mba",
        "mca",
        "msc",
        "m.sc",
        "m.pharm",

        "b.tech",
        "btech",
        "be",
        "b.e",
        "mbbs",
        "bca",
        "bsc",
        "b.sc",
        "b.pharm",
        "llb",

        "diploma",

        "iti"

    ];

    for(const degree of priority){

        if(degrees.includes(degree))
            return degree;

    }

    return null;

}

export default function analyzeEducation(text=""){

    const degrees=extractDegrees(text);

    const branches=extractBranches(text);

    return{

        degrees,

        branches,

        highestQualification:highestQualification(degrees),

        institutes:extractInstitutes(text),

        cgpa:extractCGPA(text),

        percentage:extractPercentage(text),

        passingYears:extractPassingYears(text)

    };

}