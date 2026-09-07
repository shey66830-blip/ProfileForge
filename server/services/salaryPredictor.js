// =============================================
// ProfileForge AI Salary Predictor
// Version 1.0
// =============================================

const COUNTRY_MULTIPLIERS = {
  india: 1,
  usa: 8.5,
  canada: 6.2,
  germany: 5.8,
  singapore: 5.2,
  australia: 6.8,
  uk: 6.5,
};

const BASE_SALARIES = {
  "software development": 600000,
  "artificial intelligence": 1200000,
  "data science": 1000000,
  "cyber security": 900000,
  "cloud computing": 1100000,
  "web development": 650000,
  "mobile development": 700000,
  healthcare: 500000,
  pharmacy: 450000,
  physiotherapy: 420000,
  marketing: 500000,
  finance: 700000,
  law: 650000,
  design: 550000,
  "mechanical engineering": 600000,
  "civil engineering": 580000,
  "electrical engineering": 620000,
  electronics: 650000,
};

export default function salaryPredictor({
  resume = {},
  job = {},
}) {
  const domains = resume.careerDomains || [];
  const experience = Number(resume.estimatedExperience || 0);
  const skills = resume.skills?.totalSkills || 0;

  const country = (job.country || "india").toLowerCase();
  const multiplier = COUNTRY_MULTIPLIERS[country] || 1;

  let base = 500000;

  for (const domain of domains) {
    if (BASE_SALARIES[domain.toLowerCase()]) {
      base = BASE_SALARIES[domain.toLowerCase()];
      break;
    }
  }

  base += experience * 120000;
  base += skills * 8000;
  base *= multiplier;

  const minimum = Math.round(base * 0.85);
  const average = Math.round(base);
  const maximum = Math.round(base * 1.3);

  return {
    currency: country === "india" ? "INR" : "USD",
    minimum,
    average,
    maximum,
    monthlyAverage: Math.round(average / 12),
    confidence: Math.min(60 + skills + experience * 5, 95),
    reason: `Estimated using ${
      domains[0] || "General"
    } profile, ${experience} years experience and ${country.toUpperCase()} market.`,
  };
}