// =============================================
// ProfileForge AI Job Summary
// Version 1.0
// =============================================

import { normalizeText } from "../utils/textCleaner.js";

const IMPORTANT_SECTIONS = [

    "about",

    "about the role",

    "about us",

    "job summary",

    "responsibilities",

    "key responsibilities",

    "what you'll do",

    "what you will do",

    "requirements",

    "qualifications",

    "who you are",

    "candidate",

    "role",

    "position"

];

const REMOVE_PATTERNS = [

    "equal opportunity employer",

    "privacy policy",

    "click here",

    "apply now",

    "about the company",

    "benefits may vary",

    "all rights reserved",

    "terms and conditions"

];

function cleanDescription(text = "") {

    let cleaned = text
        .replace(/<[^>]*>/g, " ")
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    REMOVE_PATTERNS.forEach(pattern => {

        const regex = new RegExp(pattern, "ig");

        cleaned = cleaned.replace(regex, "");

    });

    return cleaned;

}

function splitSentences(text = "") {

    return text

        .split(/(?<=[.!?])\s+/)

        .map(sentence => sentence.trim())

        .filter(Boolean);

}

function scoreSentence(sentence = "") {

    const lower = normalizeText(sentence);

    let score = 0;

    IMPORTANT_SECTIONS.forEach(keyword => {

        if (lower.includes(keyword))

            score += 3;

    });

    if (lower.includes("experience"))

        score += 2;

    if (lower.includes("skills"))

        score += 2;

    if (lower.includes("responsible"))

        score += 2;

    if (lower.includes("required"))

        score += 2;

    if (lower.includes("qualification"))

        score += 2;

    if (lower.includes("team"))

        score++;

    if (lower.includes("customer"))

        score++;

    if (lower.includes("develop"))

        score++;

    if (sentence.length > 40 && sentence.length < 220)

        score += 2;

    return score;

}

export default function summarizeJob(description = "", maxWords = 120) {

    if (!description)

        return "No job description provided.";

    const cleaned = cleanDescription(description);

    const sentences = splitSentences(cleaned);

    const ranked = sentences

        .map(sentence => ({

            sentence,

            score: scoreSentence(sentence)

        }))

        .sort((a, b) => b.score - a.score);

    let summary = "";

    let wordCount = 0;

    for (const item of ranked) {

        const words = item.sentence.split(" ");

        if (wordCount + words.length > maxWords)

            continue;

        summary += item.sentence + " ";

        wordCount += words.length;

        if (wordCount >= maxWords)

            break;

    }

    if (!summary) {

        summary = cleaned

            .split(" ")

            .slice(0, maxWords)

            .join(" ");

    }

    return summary.trim();

}