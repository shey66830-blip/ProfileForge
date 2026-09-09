import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { validateATS, generatePlainTextPreview } = await import("./services/atsValidator.js");

// ── Sample resumes for testing ──

const GOOD_RESUME = `
John Doe
john.doe@email.com
+1 234 567 8901

SUMMARY
Senior software engineer with 8 years of experience in full-stack development.

EXPERIENCE
Senior Developer at TechCorp (2020 - Present)
- Led a team of 5 engineers
- Improved system performance by 40%

Developer at StartupXYZ (2017 - 2020)
- Built REST APIs serving 1M+ requests/day
- Reduced deployment time by 60%

EDUCATION
B.Tech Computer Science, NIT Warangal (2017)

SKILLS
JavaScript, Python, React, Node.js, PostgreSQL, AWS

PROJECTS
Inventory Management System (2019)
- Built a full-stack inventory tracking system
`.trim();

const BAD_RESUME = `
■ Creative Resume ■

~About Me~
I'm a passionate developer who loves building things.

What I've Done
Tab separated	data	here
More stuff with pipes | and | special chars

Contact me at not-an-email
`.trim();

const MINIMAL_RESUME = `
Jane Smith
jane@example.com
Senior Developer
`.trim();

const LONG_RESUME = Array.from({ length: 200 }, (_, i) => `Line ${i + 1} of the resume`).join("\n");

// ── Tests ──

describe("validateATS", () => {
  it("returns no warnings for a well-structured resume", () => {
    const result = validateATS(GOOD_RESUME);
    assert.equal(result.warnings.length, 0, `Expected 0 warnings, got: ${JSON.stringify(result.warnings)}`);
  });

  it("detects sections in correct order", () => {
    const result = validateATS(GOOD_RESUME);
    assert.ok(result.sections.includes("summary"));
    assert.ok(result.sections.includes("experience"));
    assert.ok(result.sections.includes("education"));
    assert.ok(result.sections.includes("skills"));
    assert.ok(result.sections.includes("projects"));
  });

  it("reports contact information correctly", () => {
    const result = validateATS(GOOD_RESUME);
    assert.equal(result.hasContact, true);
    assert.equal(result.hasEmail, true);
    assert.equal(result.hasPhone, true);
  });

  it("reports dates correctly", () => {
    const result = validateATS(GOOD_RESUME);
    assert.equal(result.hasDates, true);
    assert.ok(result.dateCount >= 3);
  });

  it("reports line count", () => {
    const result = validateATS(GOOD_RESUME);
    assert.ok(result.lineCount > 10);
  });

  it("warns about missing email", () => {
    const text = "John Doe\nPhone: 1234567890\n\nEXPERIENCE\nDeveloper (2020 - Present)";
    const result = validateATS(text);
    const emailWarning = result.warnings.find((w) => w.message.includes("email"));
    assert.ok(emailWarning, "Should warn about missing email");
  });

  it("warns about missing phone", () => {
    const text = "John Doe\njohn@example.com\n\nEXPERIENCE\nDeveloper (2020 - Present)";
    const result = validateATS(text);
    const phoneWarning = result.warnings.find((w) => w.message.includes("phone"));
    assert.ok(phoneWarning, "Should warn about missing phone");
  });

  it("warns about missing dates", () => {
    const text = "John Doe\njohn@example.com\n\nEXPERIENCE\nDeveloper at Company\nEDUCATION\nB.Tech";
    const result = validateATS(text);
    const dateWarning = result.warnings.find((w) => w.message.includes("dates"));
    assert.ok(dateWarning, "Should warn about missing dates");
  });

  it("warns about special characters", () => {
    const result = validateATS(BAD_RESUME);
    const bulletWarning = result.warnings.find((w) => w.message.includes("bullet"));
    assert.ok(bulletWarning, "Should warn about special bullet characters");
  });

  it("warns about tab characters", () => {
    const result = validateATS(BAD_RESUME);
    const tabWarning = result.warnings.find((w) => w.message.includes("Tab"));
    assert.ok(tabWarning, "Should warn about tab characters");
  });

  it("warns about pipe characters", () => {
    const result = validateATS(BAD_RESUME);
    const pipeWarning = result.warnings.find((w) => w.message.includes("Pipe"));
    assert.ok(pipeWarning, "Should warn about pipe characters");
  });

  it("warns about missing experience section", () => {
    const text = "John Doe\njohn@example.com\n\nEDUCATION\nB.Tech (2017)\n\nSKILLS\nJavaScript";
    const result = validateATS(text);
    const expWarning = result.warnings.find((w) => w.message.includes("experience"));
    assert.ok(expWarning, "Should warn about missing experience");
  });

  it("warns about missing skills section", () => {
    const text = "John Doe\njohn@example.com\n\nEXPERIENCE\nDeveloper (2020 - Present)\n\nEDUCATION\nB.Tech (2017)";
    const result = validateATS(text);
    const skillWarning = result.warnings.find((w) => w.message.includes("skills"));
    assert.ok(skillWarning, "Should warn about missing skills section");
  });

  it("warns about very short resume", () => {
    const result = validateATS(MINIMAL_RESUME);
    const shortWarning = result.warnings.find((w) => w.message.includes("lines"));
    assert.ok(shortWarning, "Should warn about short resume");
  });

  it("warns about very long resume", () => {
    const result = validateATS(LONG_RESUME);
    const longWarning = result.warnings.find((w) => w.message.includes("lines"));
    assert.ok(longWarning, "Should warn about long resume");
  });

  it("warns about missing contact/summary at top", () => {
    const text = "EXPERIENCE\nDeveloper (2020 - Present)\n\nEDUCATION\nB.Tech (2017)";
    const result = validateATS(text);
    const contactWarning = result.warnings.find((w) => w.message.includes("contact"));
    assert.ok(contactWarning, "Should warn about missing contact at top");
  });

  it("handles empty text gracefully", () => {
    const result = validateATS("");
    assert.ok(result);
    assert.ok(Array.isArray(result.warnings));
    assert.equal(result.lineCount, 0);
  });

  it("detects Present/current as a date", () => {
    const text = "Developer at Company (2020 - Present)";
    const result = validateATS(text);
    assert.equal(result.hasDates, true);
  });
});

describe("generatePlainTextPreview", () => {
  it("standardizes section headings to uppercase", () => {
    const text = "John Doe\n\nSummary\nSenior developer\n\nExperience\nDev at Co";
    const preview = generatePlainTextPreview(text);
    assert.ok(preview.includes("SUMMARY"));
    assert.ok(preview.includes("EXPERIENCE"));
  });

  it("adds underline after headings", () => {
    const text = "John Doe\n\nExperience\nDeveloper at Co";
    const preview = generatePlainTextPreview(text);
    const lines = preview.split("\n");
    const expIdx = lines.findIndex((l) => l === "EXPERIENCE");
    assert.ok(expIdx >= 0);
    assert.equal(lines[expIdx + 1], "---");
  });

  it("preserves content lines", () => {
    const text = "John Doe\njohn@email.com\n\nEXPERIENCE\nDeveloper (2020 - Present)\n- Built things";
    const preview = generatePlainTextPreview(text);
    assert.ok(preview.includes("John Doe"));
    assert.ok(preview.includes("john@email.com"));
    assert.ok(preview.includes("Developer (2020 - Present)"));
    assert.ok(preview.includes("- Built things"));
  });

  it("handles text with no sections", () => {
    const text = "Just some plain text without any section headings at all.";
    const preview = generatePlainTextPreview(text);
    assert.equal(preview, text);
  });

  it("handles empty text", () => {
    const preview = generatePlainTextPreview("");
    assert.equal(preview, "");
  });
});
