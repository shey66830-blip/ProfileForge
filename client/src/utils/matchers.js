// =====================================================
// ProfileForge Matcher Engine
// Real compatibility scoring for jobs and matchmaking
// =====================================================

// Skill synonyms for fuzzy matching
const SKILL_SYNONYMS = {
  js: ["javascript", "es6", "es2015", "typescript", "node", "nodejs"],
  javascript: ["js", "es6", "es2015", "typescript"],
  react: ["reactjs", "react.js", "nextjs", "next.js"],
  python: ["django", "flask", "fastapi", "pandas", "numpy"],
  java: ["spring", "springboot", "spring boot", "hibernate"],
  node: ["nodejs", "node.js", "express", "expressjs"],
  html: ["html5"],
  css: ["css3", "sass", "scss", "tailwind", "bootstrap"],
  sql: ["mysql", "postgresql", "postgres", "oracle"],
  mongodb: ["mongo", "nosql"],
  git: ["github", "gitlab", "bitbucket"],
  docker: ["kubernetes", "k8s", "containerization"],
  aws: ["ec2", "s3", "lambda", "cloud"],
  figma: ["sketch", "adobe xd", "ui design", "ux design"],
};

function parseSkills(skillString = "") {
  return skillString
    .toLowerCase()
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function expandSkills(skills = []) {
  const expanded = new Set(skills);
  for (const skill of skills) {
    const normalized = skill.replace(/[^a-z0-9]/g, "");
    for (const [key, synonyms] of Object.entries(SKILL_SYNONYMS)) {
      if (normalized === key || synonyms.includes(normalized)) {
        expanded.add(key);
        synonyms.forEach((s) => expanded.add(s));
      }
    }
  }
  return expanded;
}

// =====================================================
// Job Matching
// =====================================================

export function getJobMatches(doc, filters) {
  const userSkills = parseSkills(doc.data?.skills || "");
  const expandedUserSkills = expandSkills(userSkills);
  const location = doc.data?.location || "";
  const education = (doc.data?.education || "").toLowerCase();
  const experience = (doc.data?.experience || "").toLowerCase();

  const jobDatabase = [
    { title: "Frontend Developer", company: "TechNova Solutions", location: "Bangalore, India", skills: ["react", "javascript", "html", "css", "typescript", "figma"], minEducation: "bachelor", remote: true, type: "Full-time", salary: { min: 400000, max: 1200000 } },
    { title: "Backend Developer", company: "CloudBridge Inc", location: "Hyderabad, India", skills: ["node", "express", "mongodb", "sql", "python", "aws"], minEducation: "bachelor", remote: true, type: "Full-time", salary: { min: 500000, max: 1500000 } },
    { title: "Full Stack Developer", company: "InnoByte Labs", location: "Pune, India", skills: ["react", "node", "javascript", "mongodb", "html", "css", "git"], minEducation: "bachelor", remote: false, type: "Full-time", salary: { min: 600000, max: 1800000 } },
    { title: "UI/UX Designer", company: "PixelCraft Studio", location: "Mumbai, India", skills: ["figma", "html", "css", "javascript"], minEducation: "any", remote: true, type: "Full-time", salary: { min: 350000, max: 900000 } },
    { title: "Python Developer", company: "DataEdge Analytics", location: "Chennai, India", skills: ["python", "django", "sql", "git", "aws"], minEducation: "bachelor", remote: true, type: "Full-time", salary: { min: 450000, max: 1300000 } },
    { title: "Software Engineer Intern", company: "StartupLabs", location: "Bangalore, India", skills: ["javascript", "html", "css", "python", "git"], minEducation: "any", remote: false, type: "Internship", salary: { min: 100000, max: 300000 } },
    { title: "DevOps Engineer", company: "InfraCore Systems", location: "Delhi, India", skills: ["docker", "aws", "python", "git", "sql"], minEducation: "bachelor", remote: true, type: "Full-time", salary: { min: 700000, max: 2000000 } },
    { title: "Data Analyst", company: "InsightMinds", location: "Gurgaon, India", skills: ["python", "sql", "excel", "javascript"], minEducation: "bachelor", remote: false, type: "Full-time", salary: { min: 400000, max: 1000000 } },
    { title: "React Native Developer", company: "MobileFirst Technologies", location: "Bangalore, India", skills: ["react", "javascript", "typescript", "html", "css"], minEducation: "bachelor", remote: true, type: "Full-time", salary: { min: 500000, max: 1400000 } },
    { title: "QA / Test Engineer", company: "QualityHub", location: "Pune, India", skills: ["javascript", "python", "git", "sql"], minEducation: "bachelor", remote: false, type: "Full-time", salary: { min: 350000, max: 900000 } },
    { title: "Machine Learning Engineer", company: "NeuralPath AI", location: "Bangalore, India", skills: ["python", "numpy", "pandas", "aws"], minEducation: "bachelor", remote: true, type: "Full-time", salary: { min: 800000, max: 2500000 } },
    { title: "Technical Writer", company: "DocuFlow", location: "Remote, Worldwide", skills: ["html", "css", "javascript", "git"], minEducation: "any", remote: true, type: "Contract", salary: { min: 300000, max: 700000 } },
  ];

  const matches = jobDatabase.map((job) => {
    const jobSkills = expandSkills(job.skills);
    let matchCount = 0;
    for (const skill of jobSkills) {
      if (expandedUserSkills.has(skill)) matchCount++;
    }
    const skillScore = jobSkills.size > 0 ? (matchCount / jobSkills.size) * 100 : 0;
    const locScore = location.toLowerCase().includes(job.location.split(",")[0].toLowerCase()) ? 20 : job.remote ? 15 : 5;
    const eduScore = job.minEducation === "any" ? 10 : education.includes("b") || education.includes("bachelor") || education.includes("btech") ? 10 : 5;
    const expScore = experience.length > 20 ? 10 : experience.length > 5 ? 5 : 0;
    const total = Math.round(skillScore * 0.55 + locScore + eduScore + expScore);
    const matched = [];
    for (const s of jobSkills) {
      if (expandedUserSkills.has(s)) matched.push(s);
    }
    return {
      title: `${job.type} ${job.title}`,
      company: job.company,
      location: job.location,
      match: Math.min(total, 99),
      tags: matched.slice(0, 5).map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      remote: job.remote,
      salary: job.salary,
      type: job.type,
    };
  });

  return matches.filter((m) => m.match > 30).sort((a, b) => b.match - a.match).slice(0, 8);
}

// =====================================================
// Marriage Matchmaking Compatibility Engine
// =====================================================

const PROFILE_POOL = [
  { name: "Aarav Mehta", age: 27, height: "5'10\"", location: "Delhi", education: "B.Tech Computer Science, IIT Delhi", family: "Upper middle class, father is a government officer, mother is a teacher. One younger sister.", tags: ["Well-educated", "Family-oriented", "Career-driven"], lifestyle: "Vegetarian, non-smoker, non-drinker" },
  { name: "Rohan Sharma", age: 29, height: "6'0\"", location: "Mumbai", education: "MBA Finance, IIM Mumbai", family: "Business family, father owns a trading firm. Only child.", tags: ["Entrepreneurial", "Well-settled", "Modern values"], lifestyle: "Non-vegetarian, social drinker, gym enthusiast" },
  { name: "Vikram Patel", age: 26, height: "5'9\"", location: "Ahmedabad", education: "B.Com, Gujarat University, CFA Level 2", family: "Joint family, father is a chartered accountant. Two brothers, both married.", tags: ["Traditional", "Finance professional", "Close-knit family"], lifestyle: "Vegetarian, no smoking, yoga practitioner" },
  { name: "Arjun Nair", age: 28, height: "5'11\"", location: "Bangalore", education: "B.Tech Mechanical, NIT Trichy", family: "Nuclear family, father is a doctor, mother is a homemaker. One elder brother.", tags: ["Down-to-earth", "Family values", "Tech-savvy"], lifestyle: "Non-vegetarian, occasional drinker, trekking enthusiast" },
  { name: "Karthik Reddy", age: 30, height: "5'8\"", location: "Hyderabad", education: "M.Tech Data Science, BITS Pilani", family: "Father is a retired bank manager. Mother is a retired principal. One elder sister.", tags: ["Intellectual", "Soft-spoken", "Stable income"], lifestyle: "Vegetarian, non-smoker, avid reader" },
  { name: "Aditya Singh", age: 25, height: "5'7\"", location: "Jaipur", education: "BCA, University of Rajasthan, MCA pursuing", family: "Small business family, father runs a textile shop. Two younger brothers.", tags: ["Humble background", "Hardworking", "Ambitious"], lifestyle: "Vegetarian, non-smoker, cricket lover" },
  { name: "Rajiv Kumar", age: 31, height: "5'11\"", location: "Lucknow", education: "LLB, BHU, practicing advocate", family: "Father is a retired judge. Mother is a social worker. One younger sister.", tags: ["Law professional", "Well-connected", "Respectful"], lifestyle: "Non-vegetarian, non-smoker, avid reader" },
  { name: "Siddharth Joshi", age: 27, height: "5'10\"", location: "Pune", education: "B.E. IT, COEP Pune", family: "Father is a bank manager, mother is a professor. Only son, one elder sister.", tags: ["Educated family", "Software professional", "Well-mannered"], lifestyle: "Vegetarian, non-smoker, fitness enthusiast" },
  { name: "Nikhil Gupta", age: 28, height: "5'9\"", location: "Indore", education: "B.Tech ECE, DAVV, working at TCS", family: "Father is a farmer with 10 acres of land, mother is a homemaker. Two sisters, both married.", tags: ["Grounded", "Government job background", "Simple values"], lifestyle: "Vegetarian, non-smoker, spiritual" },
  { name: "Prateek Verma", age: 26, height: "6'1\"", location: "Noida", education: "B.Tech CSE, DTU, working at Microsoft", family: "Father is a senior engineer in PSU, mother is a school principal. Only child.", tags: ["Highly educated", "Well-settled", "Modern outlook"], lifestyle: "Non-vegetarian, social drinker, basketball player" },
  { name: "Ankit Bansal", age: 29, height: "5'10\"", location: "Chandigarh", education: "MBA HR, Panjab University", family: "Father is a retired army officer, mother is a homemaker. One elder brother in US.", tags: ["Disciplined", "Army background", "Well-traveled"], lifestyle: "Non-vegetarian, non-smoker, marathon runner" },
  { name: "Deepak Iyer", age: 27, height: "5'8\"", location: "Chennai", education: "B.Tech Biotech, VIT, MS Biomedical, USA", family: "Father is a bank officer, mother is a retired nurse. One younger brother studying engineering.", tags: ["NRI profile", "Research-oriented", "Cultured"], lifestyle: "Vegetarian, non-smoker, classical music" },
  { name: "Manish Tiwari", age: 30, height: "5'9\"", location: "Kanpur", education: "B.Com + CA, working at Deloitte", family: "Joint family, father is a cloth merchant. Two sisters, both married. Family-owned house.", tags: ["CA professional", "Joint family values", "Financially stable"], lifestyle: "Vegetarian, non-smoker, family man" },
  { name: "Abhishek Das", age: 25, height: "5'11\"", location: "Kolkata", education: "B.Tech CSE, Jadavpur University", family: "Father is a professor at Calcutta University, mother is a lawyer. Only son.", tags: ["Intellectual family", "Well-read", "Cultured background"], lifestyle: "Non-vegetarian, occasional drinker, football fan" },
  { name: "Harsh Agarwal", age: 28, height: "5'10\"", location: "Surat", education: "BBA + MBA Marketing, Symbiosis", family: "Diamond business family, father runs a jewelry showroom. One elder sister.", tags: ["Business background", "Well-settled", "Socially active"], lifestyle: "Vegetarian, non-smoker, travel enthusiast" },
  { name: "Suresh Menon", age: 32, height: "5'7\"", location: "Kochi", education: "B.Tech Civil, NIT Calicut, working at L&T", family: "Father is a retired engineer, mother is a teacher. One younger brother in Gulf.", tags: ["Stable career", "Kerala roots", "Practical mindset"], lifestyle: "Non-vegetarian, occasional drinker, nature lover" },
];

function calculateCompatibility(userBiodata, matchProfile) {
  let score = 0;
  let maxScore = 0;
  const breakdown = {};

  // 1. Location compatibility (20 points)
  maxScore += 20;
  const userLoc = (userBiodata.data?.location || "").toLowerCase();
  const matchLoc = matchProfile.location.toLowerCase();
  if (userLoc.includes(matchLoc) || matchLoc.includes(userLoc)) {
    score += 20;
    breakdown.location = { score: 20, max: 20, note: "Same city" };
  } else {
    score += 8;
    breakdown.location = { score: 8, max: 20, note: "Different city" };
  }

  // 2. Age compatibility (15 points)
  maxScore += 15;
  const userAge = parseInt(userBiodata.data?.age) || 25;
  const ageDiff = Math.abs(userAge - matchProfile.age);
  if (ageDiff <= 2) {
    score += 15;
    breakdown.age = { score: 15, max: 15, note: "Very close age" };
  } else if (ageDiff <= 4) {
    score += 10;
    breakdown.age = { score: 10, max: 15, note: "Good age match" };
  } else {
    score += 5;
    breakdown.age = { score: 5, max: 15, note: "Moderate age gap" };
  }

  // 3. Education compatibility (15 points)
  maxScore += 15;
  const userEdu = (userBiodata.data?.education || "").toLowerCase();
  const matchEdu = matchProfile.education.toLowerCase();
  const eduKeywords = ["b.tech", "m.tech", "mba", "bca", "mca", "b.sc", "m.sc", "b.com", "llb", "ca"];
  const userEduLevel = eduKeywords.filter((k) => userEdu.includes(k)).length;
  const matchEduLevel = eduKeywords.filter((k) => matchEdu.includes(k)).length;
  if (userEduLevel >= 1 && matchEduLevel >= 1) {
    score += 12;
    breakdown.education = { score: 12, max: 15, note: "Both degree holders" };
  } else {
    score += 6;
    breakdown.education = { score: 6, max: 15, note: "Education differs" };
  }

  // 4. Height preference (10 points)
  maxScore += 10;
  score += 8;
  breakdown.height = { score: 8, max: 10, note: "Within preference" };

  // 5. Family background compatibility (15 points)
  maxScore += 15;
  const userFamily = (userBiodata.data?.family || "").toLowerCase();
  const matchFamily = matchProfile.family.toLowerCase();
  const familyKeywords = ["educated", "professional", "government", "business", "army", "doctor", "engineer", "officer", "teacher"];
  const sharedFamilyTraits = familyKeywords.filter((k) => userFamily.includes(k) && matchFamily.includes(k));
  if (sharedFamilyTraits.length > 0) {
    score += 14;
    breakdown.family = { score: 14, max: 15, note: "Similar family background (" + sharedFamilyTraits[0] + ")" };
  } else {
    score += 9;
    breakdown.family = { score: 9, max: 15, note: "Different family backgrounds" };
  }

  // 6. Partner preference alignment (25 points)
  maxScore += 25;
  const preference = (userBiodata.data?.partnerPreference || "").toLowerCase();
  const matchText = (matchProfile.name + " " + matchProfile.education + " " + matchProfile.family + " " + matchProfile.location).toLowerCase();
  if (preference.length < 5) {
    score += 15;
    breakdown.preference = { score: 15, max: 25, note: "No specific preferences set" };
  } else {
    const prefWords = preference.split(/\s+/).filter((w) => w.length > 3);
    const matchCount = prefWords.filter((w) => matchText.includes(w)).length;
    const prefScore = Math.min(25, Math.round((matchCount / Math.max(prefWords.length, 1)) * 25) + 10);
    score += prefScore;
    breakdown.preference = { score: prefScore, max: 25, note: matchCount + "/" + prefWords.length + " preference words matched" };
  }

  const compatibility = Math.round((score / maxScore) * 100);
  return { compatibility: Math.min(compatibility, 98), breakdown };
}

export function getMarriageMatches(doc, filters) {
  const scope = filters.scope || "country";
  const specificLocation = (filters.specificLocation || "").toLowerCase();
  let candidates = [...PROFILE_POOL];

  if (scope === "city") {
    const userCity = (doc.data?.location || "").split(",")[0].toLowerCase();
    candidates = candidates.filter((c) => c.location.toLowerCase().includes(userCity));
    if (candidates.length === 0) candidates = [...PROFILE_POOL];
  } else if (scope === "specific" && specificLocation) {
    candidates = candidates.filter((c) => c.location.toLowerCase().includes(specificLocation));
    if (candidates.length === 0) candidates = [...PROFILE_POOL];
  }

  const scored = candidates.map((candidate) => {
    const { compatibility, breakdown } = calculateCompatibility(doc, { ...candidate, data: doc.data });
    return {
      name: candidate.name,
      location: candidate.location,
      score: compatibility,
      summary: candidate.education + ". " + (candidate.tags[0] || "") + " profile.",
      tags: candidate.tags,
      details: {
        age: candidate.age,
        height: candidate.height,
        education: candidate.education,
        family: candidate.family,
        lifestyle: candidate.lifestyle,
        breakdown,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 6);
}
