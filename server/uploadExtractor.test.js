import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  extractLinks,
  extractStructuredExperience,
  extractStructuredEducation,
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
});
