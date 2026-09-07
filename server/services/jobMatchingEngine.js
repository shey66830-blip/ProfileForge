// =============================================
// ProfileForge Job Matching Engine V2
// Fixed: Experience parsing, eligibility, disqualifiers
// =============================================

export default function jobMatchingEngine({ resume = {}, job = {}, ats = {} }) {
    let resumeSkillsArr = resume.skills ?? [];
    if (!Array.isArray(resumeSkillsArr)) {
      if (resumeSkillsArr?.skills != null) {
        resumeSkillsArr = resumeSkillsArr.skills;
      }
      if (!Array.isArray(resumeSkillsArr)) {
        resumeSkillsArr = [];
      }
    }
    const jobSkills = job.skills || [];

    // ----------------------------
    // 1. SKILL MATCH (35%)
    // ----------------------------
    const resumeSkillsLocal = Array.isArray(resumeSkillsArr) ? resumeSkillsArr : [];
    const resumeSkillsLower = resumeSkillsLocal.map(s => s.toLowerCase());
    const matchedSkills = jobSkills.filter(skill =>
        resumeSkillsLower.includes(skill.toLowerCase())
    );
    const missingSkills = jobSkills.filter(skill =>
        !resumeSkillsLower.includes(skill.toLowerCase())
    );
    const skillMatch = jobSkills.length === 0
        ? (job.description && job.description.length > 200 ? 30 : 50)
        : Math.round((matchedSkills.length / jobSkills.length) * 100);

    // ----------------------------
    // 2. EXPERIENCE MATCH (25% — increased weight)
    // ----------------------------
    // Parse required experience from job
    const requiredMinExp = parseMinExperience(job);
    const requiredMaxExp = parseMaxExperience(job);
    const resumeExp = Number(resume.estimatedExperience || 0);

    let experienceMatch;
    if (requiredMinExp === null) {
        // No experience requirement specified — give moderate score
        experienceMatch = 60;
    } else if (resumeExp >= requiredMinExp && (requiredMaxExp === null || resumeExp <= requiredMaxExp)) {
        // Perfect fit
        experienceMatch = 100;
    } else if (resumeExp >= requiredMinExp) {
        // Over-qualified but close
        experienceMatch = Math.max(40, 100 - (resumeExp - requiredMaxExp) * 5);
    } else {
        // Under-qualified — harsh penalty
        const gap = requiredMinExp - resumeExp;
        if (gap <= 1) experienceMatch = 70;
        else if (gap <= 2) experienceMatch = 45;
        else if (gap <= 4) experienceMatch = 15;
        else if (gap <= 7) experienceMatch = 5;
        else experienceMatch = 1; // Massive gap (e.g., 0 vs 9+)
    }

    // ----------------------------
    // 3. EDUCATION MATCH (20%)
    // ----------------------------
    const educationMatch = calculateEducationMatch(resume, job);

    // ----------------------------
    // 4. ELIGIBILITY MATCH (10%)
    // ----------------------------
    const eligibilityMatch = calculateEligibilityMatch(resume, job);

    // ----------------------------
    // 5. LOCATION MATCH (5%)
    // ----------------------------
    let locationMatch = 100;
    if (job.country && resume.country) {
        locationMatch = job.country.toLowerCase() === resume.country.toLowerCase() ? 100 : 40;
    } else if (job.remote) {
        locationMatch = 90; // Remote jobs are location-flexible
    }

    // ----------------------------
    // 6. ATS SCORE (5%)
    // ----------------------------
    const atsScore = ats.score || 0;

    // ----------------------------
    // OVERALL SCORE
    // ----------------------------
    let overall = Math.round(
        skillMatch * 0.35 +
        experienceMatch * 0.25 +
        educationMatch * 0.20 +
        eligibilityMatch * 0.10 +
        locationMatch * 0.05 +
        atsScore * 0.05
    );

    // ----------------------------
    // HARD DISQUALIFIERS
    // Cap overall score if experience gap is too large
    // ----------------------------
    if (requiredMinExp !== null && resumeExp === 0 && requiredMinExp >= 3) {
        // Fresher applying for 3+ year experience job — cap at 35
        overall = Math.min(overall, 35);
    } else if (requiredMinExp !== null && resumeExp === 0 && requiredMinExp >= 1) {
        overall = Math.min(overall, 50);
    }

    // Also cap if skill match is very low
    if (skillMatch < 10 && jobSkills.length >= 3) {
        overall = Math.min(overall, 40);
    }
    if (jobSkills.length === 0 && job.description && job.description.length > 200) {
        overall = Math.min(overall, 30);
    }

    // ----------------------------
    // REASONS
    // ----------------------------
    const reasons = [];
    if (jobSkills.length === 0) reasons.push("No specific skills detected in job description — match is based on other factors.");
    else if (skillMatch >= 60) reasons.push(`Strong skill match (${matchedSkills.length}/${jobSkills.length} skills matched).`);
    else if (skillMatch >= 30) reasons.push(`Partial skill match (${matchedSkills.length}/${jobSkills.length} skills matched).`);

    if (educationMatch >= 80) reasons.push("Education meets requirements.");
    else if (educationMatch >= 50) reasons.push("Education partially matches requirements.");

    if (experienceMatch >= 80) reasons.push("Experience level is suitable.");
    else if (experienceMatch <= 20 && requiredMinExp !== null) {
        reasons.push(`Requires ${requiredMinExp}+ years experience, but resume shows ~${resumeExp} year(s).`);
    }

    if (requiredMinExp !== null && resumeExp === 0) {
        reasons.push("⚠️ This role requires professional experience — you may not be eligible yet.");
    }

    if (job.remote) reasons.push("Remote-friendly position.");
    if (atsScore >= 75) reasons.push("Resume has a good ATS score.");

    return {
        overall,
        skillMatch,
        experienceMatch,
        educationMatch,
        eligibilityMatch,
        locationMatch,
        atsScore,
        matchedSkills,
        missingSkills,
        reasons,
        requiredExperience: requiredMinExp,
        candidateExperience: resumeExp,
    };
}

// ============================
// Parse experience from job description
// ============================
function parseMinExperience(job) {
    // First check eligibilityDetails (extracted by eligibilityExtractor)
    const expStrings = job.eligibilityDetails?.experience || [];
    for (const exp of expStrings) {
        const match = exp.match(/(\d+)\s*[-–to]+\s*(\d+)\s*year/i);
        if (match) return parseInt(match[1]);
        const matchMin = exp.match(/(\d+)\+?\s*year/i);
        if (matchMin) return parseInt(matchMin[1]);
    }

    // Fallback: parse from description
    const desc = (job.description || "").toLowerCase();
    const rangeMatch = desc.match(/(\d+)\s*[-–to]+\s*(\d+)\s*year/i);
    if (rangeMatch) return parseInt(rangeMatch[1]);
    const minMatch = desc.match(/(\d+)\+?\s*year/i);
    if (minMatch) return parseInt(minMatch[1]);

    return null;
}

function parseMaxExperience(job) {
    const expStrings = job.eligibilityDetails?.experience || [];
    for (const exp of expStrings) {
        const match = exp.match(/(\d+)\s*[-–to]+\s*(\d+)\s*year/i);
        if (match) return parseInt(match[2]);
    }
    const desc = (job.description || "").toLowerCase();
    const rangeMatch = desc.match(/(\d+)\s*[-–to]+\s*(\d+)\s*year/i);
    if (rangeMatch) return parseInt(rangeMatch[2]);

    return null;
}

// ============================
// Education Match
// ============================
function calculateEducationMatch(resume, job) {
    const jobEducation = job.eligibilityDetails?.education || [];
    const resumeQual = (resume.highestQualification || "").toLowerCase();
    const resumeBranches = (resume.education?.branches || []).map(b => b.toLowerCase());
    const resumeAll = [resumeQual, ...resumeBranches].join(" ");

    if (jobEducation.length === 0) return 60; // No requirement = moderate score

    // Check if candidate's education level meets the requirement
    const levels = ["phd", "m.tech", "mtech", "mba", "mca", "m.sc", "msc", "b.tech", "btech", "be", "b.e", "bca", "b.sc", "bsc", "diploma"];
    const jobLevel = findHighestLevel(jobEducation.join(" "), levels);
    const resumeLevel = findHighestLevel(resumeAll, levels);

    if (jobLevel === -1 || resumeLevel === -1) return 50; // Can't determine

    if (resumeLevel >= jobLevel) return 100; // Meets or exceeds
    if (resumeLevel === jobLevel - 1) return 70; // One level below
    if (resumeLevel === jobLevel - 2) return 40; // Two levels below
    return 20; // Way below
}

function findHighestLevel(text, levels) {
    const lower = text.toLowerCase();
    for (let i = 0; i < levels.length; i++) {
        if (lower.includes(levels[i])) return i;
    }
    return -1;
}

// ============================
// Eligibility Match
// ============================
function calculateEligibilityMatch(resume, job) {
    const jobEdu = job.eligibilityDetails?.education || [];
    const jobCerts = job.eligibilityDetails?.certifications || [];
    const jobLangs = job.eligibilityDetails?.languages || [];

    let score = 0;
    let checks = 0;

    // Education check
    if (jobEdu.length > 0) {
        checks++;
        const resumeQual = (resume.highestQualification || "").toLowerCase();
        const matched = jobEdu.some(e => resumeQual.includes(e.toLowerCase()));
        if (matched) score += 100;
        else score += 30;
    }

    // Certification check (bonus, don't penalize heavily)
    if (jobCerts.length > 0) {
        checks++;
        const resumeCerts = (resume.certifications || []).map(c => c.toLowerCase());
        const matched = jobCerts.filter(c => resumeCerts.some(r => r.includes(c.toLowerCase())));
        score += Math.min(100, (matched.length / jobCerts.length) * 100);
    }

    // Language check
    if (jobLangs.length > 0) {
        checks++;
        const resumeLangs = (resume.languages || []).map(l => l.toLowerCase());
        const matched = jobLangs.filter(l => resumeLangs.some(r => r.includes(l.toLowerCase())));
        score += Math.min(100, (matched.length / jobLangs.length) * 100);
    }

    if (checks === 0) return 50; // No specific eligibility requirements found
    return Math.round(score / checks);
}
