import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { classifySkills, findSkillEvidence, explainableMatch, SCORE_WEIGHTS } = await import("./services/explainableMatcher.js");

// ── Skill classification tests ──

describe("classifySkills", () => {
  it("classifies required skills from context", () => {
    const skills = ["JavaScript", "React", "Python"];
    const desc = "We require JavaScript and React. Python is nice to have.";
    const result = classifySkills(skills, desc);
    assert.ok(result.required.includes("JavaScript"));
    assert.ok(result.required.includes("React"));
    assert.ok(result.preferred.includes("Python"));
  });

  it("classifies preferred skills from context", () => {
    const skills = ["TypeScript", "Docker", "AWS"];
    const desc = "TypeScript required. Docker and AWS are preferred.";
    const result = classifySkills(skills, desc);
    assert.ok(result.required.includes("TypeScript"));
    assert.ok(result.preferred.includes("Docker"));
    assert.ok(result.preferred.includes("AWS"));
  });

  it("defaults to required when no context clues", () => {
    const skills = ["Java", "SQL"];
    const desc = "Join our team to build great products.";
    const result = classifySkills(skills, desc);
    assert.equal(result.required.length, 2);
    assert.equal(result.preferred.length, 0);
  });

  it("handles empty skills", () => {
    const result = classifySkills([], "Some description");
    assert.equal(result.required.length, 0);
    assert.equal(result.preferred.length, 0);
  });

  it("detects 'must have' pattern", () => {
    const skills = ["Go"];
    const desc = "Go is a must have for this role.";
    const result = classifySkills(skills, desc);
    assert.ok(result.required.includes("Go"));
  });

  it("detects 'bonus' pattern", () => {
    const skills = ["Kubernetes"];
    const desc = "Kubernetes experience is a bonus.";
    const result = classifySkills(skills, desc);
    assert.ok(result.preferred.includes("Kubernetes"));
  });
});

// ── Evidence tracking tests ──

describe("findSkillEvidence", () => {
  const resume = {
    skills: ["JavaScript", "React", "Node.js"],
    experience: [
      { role: "Frontend Dev", description: "Built React applications with TypeScript" },
      { role: "Backend Dev", description: "Developed Node.js APIs" },
    ],
    projects: [
      { title: "Inventory App", description: "Full-stack app using React and PostgreSQL" },
    ],
    education: [
      { degree: "B.Tech Computer Science", branch: "Software Engineering", institution: "NIT" },
    ],
    certifications: ["AWS Solutions Architect"],
  };

  it("finds evidence in skills list", () => {
    const ev = findSkillEvidence("JavaScript", resume);
    assert.ok(ev);
    assert.equal(ev.section, "skills");
  });

  it("finds evidence in experience", () => {
    const ev = findSkillEvidence("TypeScript", resume);
    assert.ok(ev);
    assert.equal(ev.section, "experience");
  });

  it("finds evidence in projects", () => {
    const ev = findSkillEvidence("PostgreSQL", resume);
    assert.ok(ev);
    assert.equal(ev.section, "projects");
  });

  it("finds evidence in certifications", () => {
    const ev = findSkillEvidence("AWS", resume);
    assert.ok(ev);
    assert.equal(ev.section, "certifications");
  });

  it("returns null for missing skills", () => {
    const ev = findSkillEvidence("COBOL", resume);
    assert.equal(ev, null);
  });

  it("handles case-insensitive matching", () => {
    const ev = findSkillEvidence("react", resume);
    assert.ok(ev);
  });

  it("handles empty resume", () => {
    const ev = findSkillEvidence("JavaScript", {});
    assert.equal(ev, null);
  });
});

// ── Explainable match tests ──

describe("explainableMatch", () => {
  const resume = {
    skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
    experience: [
      { role: "Frontend Dev", description: "Built React apps", title: "Frontend Dev" },
    ],
    estimatedExperience: 3,
    highestQualification: "B.Tech",
    education: { branches: ["Computer Science"] },
  };

  const job = {
    skills: ["JavaScript", "React", "Python", "Docker"],
    description: "We require JavaScript and React. Python is preferred. Docker is nice to have.",
    eligibilityDetails: { experience: ["3+ years"] },
    remote: true,
  };

  it("returns overall score", () => {
    const result = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.ok(typeof result.overall === "number");
    assert.ok(result.overall >= 0 && result.overall <= 100);
  });

  it("returns score components with weights", () => {
    const result = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.ok(result.scoreComponents);
    assert.ok(result.scoreComponents.skills);
    assert.ok(result.scoreComponents.experience);
    assert.ok(result.scoreComponents.education);
    // Weights should sum to 1
    const totalWeight = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(totalWeight, 1.0);
  });

  it("classifies required and preferred skills", () => {
    const result = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.ok(result.requiredSkills.total > 0);
    assert.ok(result.preferredSkills.total > 0);
    assert.ok(result.requiredSkills.matched.includes("JavaScript"));
    assert.ok(result.requiredSkills.matched.includes("React"));
  });

  it("returns evidence for matched skills", () => {
    const result = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.ok(result.evidence.JavaScript);
    assert.ok(result.evidence.React);
  });

  it("returns reasons", () => {
    const result = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.ok(Array.isArray(result.reasons));
    assert.ok(result.reasons.length > 0);
  });

  it("is deterministic (same inputs → same output)", () => {
    const r1 = explainableMatch({ resume, job, ats: { score: 70 } });
    const r2 = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.equal(r1.overall, r2.overall);
    assert.deepEqual(r1.requiredSkills, r2.requiredSkills);
    assert.deepEqual(r1.preferredSkills, r2.preferredSkills);
  });

  it("returns legacy compatibility fields", () => {
    const result = explainableMatch({ resume, job, ats: { score: 70 } });
    assert.ok(Array.isArray(result.matchedSkills));
    assert.ok(Array.isArray(result.missingSkills));
    assert.ok(typeof result.skillMatch === "number");
  });

  it("handles missing resume skills gracefully", () => {
    const result = explainableMatch({ resume: {}, job, ats: {} });
    assert.ok(typeof result.overall === "number");
    assert.equal(result.requiredSkills.matched.length, 0);
  });

  it("handles empty job skills", () => {
    const result = explainableMatch({ resume, job: { ...job, skills: [] }, ats: {} });
    assert.ok(typeof result.overall === "number");
  });
});
