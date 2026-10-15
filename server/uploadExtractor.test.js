import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  extractLinks,
  extractStructuredExperience,
  extractStructuredEducation,
  extractStructuredProjects,
  extractCertifications,
  extractPersonalFields,
  formatEducationRow,
  categorizeSkills,
  extractFields,
} = await import("./routes/uploadRoutes.js");

describe("uploadExtractor: extractLinks", () => {
  it("extracts LinkedIn and GitHub URLs from text", () => {
    const text = "Contact: john@example.com | linkedin.com/in/johndoe | github.com/johndoe";
    const links = extractLinks(text);
    assert.equal(links.linkedin, "https://linkedin.com/in/johndoe");
    assert.equal(links.github, "https://github.com/johndoe");
  });

  it("extracts LeetCode profile links", () => {
    const text = "Profiles: leetcode.com/alexdev | https://hackerrank.com/alexdev";
    const links = extractLinks(text);
    assert.ok(links.leetcode.includes("alexdev"));
  });

  it("extracts personal portfolio and general websites", () => {
    const text = "Portfolio: https://alexdev.io and blog https://alexblog.dev";
    const links = extractLinks(text);
    assert.equal(links.portfolio, "https://alexdev.io");
    assert.ok(links.others.includes("https://alexblog.dev"));
  });
});

describe("uploadExtractor: extractStructuredExperience", () => {
  it("parses roles, companies, dates, and bullet points", () => {
    const lines = [
      "Senior Software Engineer at Acme Corp (July 2022 - Present)",
      "• Built distributed caching with Redis and Node.js.",
      "• Reduced database query load by 40%.",
      "Software Engineer, Tech Mahindra (Jan 2020 – June 2022)",
      "• Developed RESTful services in Python and PostgreSQL.",
    ];
    const exp = extractStructuredExperience(lines);
    assert.equal(exp.length, 2);
    assert.equal(exp[0].role, "Senior Software Engineer");
    assert.equal(exp[0].company, "Acme Corp");
    assert.equal(exp[0].bullets.length, 2);
    assert.equal(exp[1].role, "Software Engineer");
    assert.equal(exp[1].company, "Tech Mahindra");
    assert.equal(exp[1].bullets.length, 1);
  });
});

describe("uploadExtractor: extractStructuredEducation", () => {
  it("extracts degree name, graduation year, and score/CGPA", () => {
    const lines = [
      "B.Tech in Computer Science, NIT Karnataka (2016 - 2020) | CGPA: 8.7",
      "12th Standard, Delhi Public School, 2016",
    ];
    const edu = extractStructuredEducation(lines);
    assert.equal(edu.length, 2);
    assert.equal(edu[0].degree, "B.Tech");
    assert.equal(edu[0].year, "2016 - 2020");
    assert.equal(edu[0].score, "8.7");
  });

  it("keeps the institute name and the field of study, not just the degree token", () => {
    const edu = extractStructuredEducation([
      "B.Tech in Computer Science, NIT Karnataka (2016 - 2020) | CGPA: 8.7",
      "12th Standard, Delhi Public School, 2016 | 92%",
      "MBA, Symbiosis Institute of Business Management, 2022 - 2024 | 7.9 CGPA",
    ]);

    assert.equal(edu[0].institution, "NIT Karnataka");
    assert.equal(edu[0].field, "Computer Science");
    assert.equal(edu[0].gradeType, "cgpa");

    assert.equal(edu[1].institution, "Delhi Public School");
    assert.equal(edu[1].year, "2016");
    assert.equal(edu[1].score, "92%");
    assert.equal(edu[1].gradeType, "percent");

    assert.equal(edu[2].institution, "Symbiosis Institute of Business Management");
    assert.equal(edu[2].score, "7.9");
    assert.equal(edu[2].gradeType, "cgpa");
  });

  it("reads table-shaped education rows and skips the header", () => {
    const edu = extractStructuredEducation([
      "Standard/Degree | Collage/University | Year of passing | Percentage",
      "10th | St. Xavier's High School | 2012 | 88%",
      "B.Com | Delhi University | 2016 | 71%",
    ]);

    assert.equal(edu.length, 2, "header row must be ignored");
    assert.equal(edu[0].degree, "10th");
    assert.equal(edu[0].institution, "St. Xavier's High School");
    assert.equal(edu[0].score, "88%");
    assert.equal(edu[1].institution, "Delhi University");
  });

  it("formats one qualification line with institute, year and score", () => {
    const [row] = extractStructuredEducation([
      "B.Tech in Computer Science, NIT Karnataka (2016 - 2020) | CGPA: 8.7",
    ]);
    const line = formatEducationRow(row);

    assert.ok(line.includes("NIT Karnataka"), line);
    assert.ok(line.includes("CGPA 8.7"), line);
    assert.ok(line.includes("2016 - 2020"), line);
    assert.ok(!line.includes("|"), line);
  });
});

describe("uploadExtractor: extractStructuredProjects", () => {
  it("separates the project role from its responsibilities", () => {
    const projects = extractStructuredProjects([
      "Project: Settlement Reconciliation Engine",
      "Client: DBS Bank",
      "Period: 2022 - 2023",
      "Product: ReconX",
      "Role: Lead Engineer",
      "- Designed the matching algorithm handling 2M transactions per day.",
      "- Owned the rollout across 3 markets.",
      "Project: Loyalty Portal",
      "Responsibility: Rebuilt the checkout flow.",
    ]);

    assert.equal(projects.length, 2);
    assert.equal(projects[0].name, "Settlement Reconciliation Engine");
    assert.equal(projects[0].client, "DBS Bank");
    assert.equal(projects[0].period, "2022 - 2023");
    assert.equal(projects[0].product, "ReconX");
    assert.equal(projects[0].role, "Lead Engineer");
    assert.deepEqual(projects[0].responsibilities, [
      "Designed the matching algorithm handling 2M transactions per day.",
      "Owned the rollout across 3 markets.",
    ]);

    assert.equal(projects[1].name, "Loyalty Portal");
    assert.equal(projects[1].role, "");
    assert.deepEqual(projects[1].responsibilities, ["Rebuilt the checkout flow."]);
  });
});

describe("uploadExtractor: extractCertifications", () => {
  it("captures the issuer, year, credential ID and verification link", () => {
    const certs = extractCertifications([
      "AWS Certified Solutions Architect - Amazon Web Services (2023) · Credential ID: AWS-ASA-77812",
      "Coursera Deep Learning Specialization (2021) · coursera.org/verify/AB12CD34",
      "Google Analytics Individual Qualification",
    ]);

    assert.equal(certs.length, 3);
    assert.equal(certs[0].name, "AWS Certified Solutions Architect");
    assert.equal(certs[0].issuer, "Amazon Web Services");
    assert.equal(certs[0].year, "2023");
    assert.equal(certs[0].credentialId, "AWS-ASA-77812");

    assert.equal(certs[1].name, "Coursera Deep Learning Specialization");
    assert.equal(certs[1].url, "https://coursera.org/verify/AB12CD34");

    assert.equal(certs[2].name, "Google Analytics Individual Qualification");
    assert.equal(certs[2].credentialId, "");
  });

  it("keeps achievement lines without inventing a credential", () => {
    const certs = extractCertifications(["Winner, National Coding Championship 2019"]);
    assert.equal(certs.length, 1);
    assert.equal(certs[0].name, "Winner, National Coding Championship");
    assert.equal(certs[0].year, "2019");
    assert.equal(certs[0].credentialId, "");
  });
});

describe("uploadExtractor: extractPersonalFields", () => {
  it("reads passport, NRIC, nationality, languages and work authorization", () => {
    const personal = extractPersonalFields([
      "Nationality: Indian | Passport No: M1234567 | NRIC/FIN No: S7891234B",
      "Languages Known: English (Fluent), Tamil (Native)",
      "Date of Birth: 14 Aug 1998",
      "Marital Status - Single",
      "Work Authorization: Singapore Employment Pass",
      "Willing to relocate",
    ]);

    assert.equal(personal.nationality, "Indian");
    assert.equal(personal.passport, "M1234567");
    assert.equal(personal.nric, "S7891234B");
    assert.equal(personal.languages, "English (Fluent), Tamil (Native)");
    assert.equal(personal.dob, "14 Aug 1998");
    assert.equal(personal.maritalStatus, "Single");
    assert.equal(personal.workAuthorization, "Singapore Employment Pass");
    // A bare "Willing to relocate" line with no value still answers the question.
    assert.equal(personal.relocate, "Yes");
  });
});

describe("uploadExtractor: categorizeSkills", () => {
  it("groups extracted skills into domains", () => {
    const skills = ["Python", "JavaScript", "React", "Docker", "PostgreSQL", "Machine Learning"];
    const grouped = categorizeSkills(skills);
    assert.ok(grouped.programming.includes("Python"));
    assert.ok(grouped.web.includes("React"));
    assert.ok(grouped.cloudDevops.includes("Docker"));
    assert.ok(grouped.databases.includes("PostgreSQL"));
    assert.ok(grouped.dataAi.includes("Machine Learning"));
  });
});

describe("uploadExtractor: extractFields end-to-end", () => {
  it("populates all legacy and improvised fields cleanly", () => {
    const resumeText = `
Alex Morgan
alex.morgan@gmail.com | +91 9876543210 | Bangalore, India
linkedin.com/in/alexmorgan | github.com/alexmorgan

PROFESSIONAL SUMMARY
Experienced Full Stack Engineer with 5+ years of building web applications with React, Node.js, and AWS.

WORK EXPERIENCE
Senior Full Stack Engineer at Acme Labs (2021 - Present)
• Led microservices architecture reducing downtime by 25%.
• Mentored team of 4 junior developers.

EDUCATION
B.Tech in Computer Science, 2020

TECHNICAL SKILLS
JavaScript, React, Node.js, AWS, MongoDB, Docker
`;

    const fields = extractFields(resumeText);
    assert.equal(fields.name, "Alex Morgan");
    assert.equal(fields.email, "alex.morgan@gmail.com");
    assert.ok(fields.links.linkedin);
    assert.ok(fields.links.github);
    assert.ok(fields.skillsList.length >= 4);
    assert.ok(fields.structuredExperience.length >= 1);
    assert.ok(fields.structuredEducation.length >= 1);
    assert.ok(fields.audit.score >= 70);
    assert.ok(Array.isArray(fields.improvements));
  });

  it("surfaces education, projects, certifications and eligibility for overseas roles", () => {
    const resumeText = `
Ravi Kumar
ravi.kumar@gmail.com | +65 8123 4567 | Singapore
Nationality: Indian | Passport No: M1234567 | NRIC/FIN No: S7891234B
Languages: English (Fluent), Tamil (Native)
linkedin.com/in/ravikumar

PROFESSIONAL SUMMARY
Full stack engineer with 6 years building payment systems across Singapore and India.

WORK EXPERIENCE
Senior Engineer at Grab (Jan 2021 - Present)
• Led migration of 14 services to Kubernetes.

EDUCATION
B.Tech in Computer Science, NIT Karnataka (2016 - 2020) | CGPA: 8.7

TECHNICAL SKILLS
JavaScript, React, Node.js, AWS, Docker, PostgreSQL

PROJECTS
Project: Settlement Reconciliation Engine
Client: DBS Bank
Role: Lead Engineer
- Designed the matching algorithm handling 2M transactions per day.

CERTIFICATIONS
AWS Certified Solutions Architect - Amazon Web Services (2023) · Credential ID: AWS-ASA-77812

PERSONAL DETAILS
Gender: Male
`;

    const fields = extractFields(resumeText);

    // 1. Education keeps the university, the field, the year and the CGPA.
    assert.equal(fields.structuredEducation[0].institution, "NIT Karnataka");
    assert.equal(fields.structuredEducation[0].field, "Computer Science");
    assert.equal(fields.structuredEducation[0].score, "8.7");
    assert.ok(fields.education.includes("NIT Karnataka"), fields.education);

    // 2. Overseas eligibility details.
    assert.equal(fields.personal.passport, "M1234567");
    assert.equal(fields.personal.nric, "S7891234B");
    assert.equal(fields.personal.nationality, "Indian");
    assert.ok(fields.personal.languages.includes("Tamil"));
    assert.ok(fields.personalDetails.includes("Passport"));

    // 3. Projects carry the role and the responsibilities separately.
    assert.equal(fields.structuredProjects[0].role, "Lead Engineer");
    assert.equal(fields.structuredProjects[0].responsibilities.length, 1);

    // 4. Certificates keep their credential ID.
    assert.equal(fields.structuredCertifications[0].credentialId, "AWS-ASA-77812");
    assert.ok(fields.certifications.includes("AWS-ASA-77812"), fields.certifications);

    assert.ok(fields.audit.score >= 80, `expected a high audit score, got ${fields.audit.score}`);
  });
});
