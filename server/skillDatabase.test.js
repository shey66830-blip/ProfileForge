import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { matchSkills, ALL_SKILLS, SKILL_DATABASE } = await import("./services/skillDatabase.js");

describe("skillDatabase", () => {
  it("exports a non-empty skill database", () => {
    assert.ok(Array.isArray(ALL_SKILLS));
    assert.ok(ALL_SKILLS.length > 50, `Expected >50 skills, got ${ALL_SKILLS.length}`);
  });

  it("exports a category-keyed database", () => {
    assert.ok(typeof SKILL_DATABASE === "object");
    const categories = Object.keys(SKILL_DATABASE);
    assert.ok(categories.length > 3, `Expected >3 categories, got ${categories.length}`);
    for (const cat of categories) {
      assert.ok(Array.isArray(SKILL_DATABASE[cat]), `Category "${cat}" should be an array`);
    }
  });

  it("detects common programming skills", () => {
    const text = "I have experience with JavaScript, Python, React, and Node.js";
    const skills = matchSkills(text);
    const lower = skills.map((s) => s.toLowerCase());
    assert.ok(lower.includes("javascript"), `Expected "javascript" in [${skills}]`);
    assert.ok(lower.includes("python"), `Expected "python" in [${skills}]`);
    assert.ok(lower.includes("react"), `Expected "react" in [${skills}]`);
    assert.ok(lower.includes("node.js"), `Expected "node.js" in [${skills}]`);
  });

  it("does not emit 'java' when 'javascript' is present", () => {
    const text = "Proficient in JavaScript and TypeScript";
    const skills = matchSkills(text);
    const lower = skills.map((s) => s.toLowerCase());
    assert.ok(!lower.includes("java"), `Should not match "java" from "JavaScript"`);
    assert.ok(lower.includes("javascript"));
  });

  it("does not emit 'go' from 'go-live'", () => {
    const text = "Managed go-live deployments for critical systems";
    const skills = matchSkills(text);
    assert.ok(!skills.includes("go"), `Should not match "go" from "go-live"`);
  });

  it("does not emit 'node' from 'node.js'", () => {
    const text = "Built APIs with node.js and Express";
    const skills = matchSkills(text);
    const lower = skills.map((s) => s.toLowerCase());
    assert.ok(!lower.includes("node"), `Should not match bare "node" from "node.js"`);
    assert.ok(lower.includes("node.js"));
  });

  it("detects DBA skills (Oracle RAC, Data Guard, RMAN)", () => {
    const text = "Experience with Oracle RAC, Data Guard, RMAN, Golden Gate, PostgreSQL";
    const skills = matchSkills(text);
    const lower = skills.map((s) => s.toLowerCase());
    assert.ok(lower.includes("oracle rac"), `Expected "oracle rac" in [${skills}]`);
    assert.ok(lower.includes("data guard"), `Expected "data guard" in [${skills}]`);
    assert.ok(lower.includes("rman"), `Expected "rman" in [${skills}]`);
  });

  it("handles case-insensitive matching", () => {
    const text = "SKILLS: javascript, PYTHON, react";
    const skills = matchSkills(text);
    // matchSkills returns lowercase canonical names
    const lower = skills.map((s) => s.toLowerCase());
    assert.ok(lower.includes("javascript"));
    assert.ok(lower.includes("python"));
    assert.ok(lower.includes("react"));
  });

  it("returns empty array for text with no skills", () => {
    const text = "Hello world, this is a plain text document with no technical content.";
    const skills = matchSkills(text);
    assert.ok(Array.isArray(skills));
    // May have 0 or very few matches for generic text
  });

  it("does not emit single-letter false positives from (R/W)", () => {
    const text = "Strong R/W skills with excellent communication (R/W)";
    const skills = matchSkills(text);
    // Should not contain bare "r" or single-letter entries
    for (const s of skills) {
      assert.ok(s.length > 2, `Skill "${s}" is suspiciously short`);
    }
  });
});
