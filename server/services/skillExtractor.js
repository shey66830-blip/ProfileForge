// =============================================
// ProfileForge AI Skill Extractor
// Version 2.0 — thin adapter over the shared
// skillDatabase module (single matching owner).
// =============================================

import { matchSkills, SKILL_DATABASE } from "./skillDatabase.js";

// Back-compat: some imports expect the flat list.
export const ALL_SKILLS = Object.values(SKILL_DATABASE).flat();

// ----------------------------
// Extract Skills
// ----------------------------

export function extractSkills(text = "") {
  return matchSkills(text);
}

// ----------------------------
// Categorize Skills
// ----------------------------

export function categorizeSkills(skillList = []) {
  const result = {};
  for (const category in SKILL_DATABASE) {
    result[category] = skillList.filter((skill) =>
      SKILL_DATABASE[category].includes(skill)
    );
  }
  return result;
}

// ----------------------------
// Skill Count
// ----------------------------

export function skillStatistics(skillList = []) {
  const categorized = categorizeSkills(skillList);
  const stats = {};
  for (const category in categorized) {
    stats[category] = categorized[category].length;
  }
  return stats;
}

// ----------------------------
// Main Function
// ----------------------------

export default function analyzeSkills(text = "") {
  const skills = extractSkills(text);
  return {
    totalSkills: skills.length,
    skills,
    categories: categorizeSkills(skills),
    statistics: skillStatistics(skills),
  };
}
