// =============================================
// ProfileForge ATS Score Engine
// Version 1.0
// =============================================

export default function calculateATS(resumeAnalysis = {}) {

    const {
        skills = {},
        education = {},
        experience = {},
        cleanedText = ""
    } = resumeAnalysis;

    let score = 0;

    const breakdown = {};

    // -----------------------------
    // Contact Information
    // -----------------------------

    const hasEmail =
        /\S+@\S+\.\S+/.test(cleanedText);

    const hasPhone =
        /\+?\d[\d\s-]{8,}/.test(cleanedText);

    breakdown.contact = hasEmail && hasPhone ? 10 : 5;
    score += breakdown.contact;

    // -----------------------------
    // Skills
    // -----------------------------

    const skillScore = Math.min(
        (skills.totalSkills || 0) * 2,
        20
    );

    breakdown.skills = skillScore;
    score += skillScore;

    // -----------------------------
    // Education
    // -----------------------------

    breakdown.education =
        education.highestQualification
            ? 15
            : 5;

    score += breakdown.education;

    // -----------------------------
    // Experience
    // -----------------------------

    breakdown.experience =
        experience.estimatedYears > 0
            ? 15
            : 8;

    score += breakdown.experience;

    // -----------------------------
    // Projects
    // -----------------------------

    breakdown.projects =
        (experience.projectKeywords?.length || 0) > 0
            ? 10
            : 4;

    score += breakdown.projects;

    // -----------------------------
    // Leadership
    // -----------------------------

    breakdown.leadership =
        experience.hasLeadership
            ? 10
            : 4;

    score += breakdown.leadership;

    // -----------------------------
    // Achievements
    // -----------------------------

    breakdown.achievements =
        (experience.achievements?.length || 0) > 0
            ? 10
            : 5;

    score += breakdown.achievements;

    // -----------------------------
    // Resume Length
    // -----------------------------

    const words = cleanedText.split(/\s+/).length;

    if (words >= 250 && words <= 900)
        breakdown.length = 10;
    else
        breakdown.length = 5;

    score += breakdown.length;

    score = Math.min(score, 100);

    // -----------------------------
    // Grade
    // -----------------------------

    let grade = "D";

    if (score >= 90)
        grade = "A+";
    else if (score >= 80)
        grade = "A";
    else if (score >= 70)
        grade = "B";
    else if (score >= 60)
        grade = "C";

    return {

        score,

        grade,

        breakdown,

        suggestions: [

            !hasEmail || !hasPhone
                ? "Add complete contact information."
                : null,

            (skills.totalSkills || 0) < 8
                ? "Add more technical and soft skills."
                : null,

            !education.highestQualification
                ? "Mention your highest qualification."
                : null,

            experience.estimatedYears === 0
                ? "Add internships or projects."
                : null,

            (experience.projectKeywords?.length || 0) === 0
                ? "Include academic or personal projects."
                : null,

            !experience.hasLeadership
                ? "Highlight leadership or extracurricular activities."
                : null

        ].filter(Boolean)

    };

}