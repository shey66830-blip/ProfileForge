import { describe, it, expect } from "vitest";
import {
  computeCompleteness,
  computeStepProgress,
  scoreAts,
  scoreImpact,
  scoreEvidence,
  analyzeSignal,
  signalBand,
  wordCount,
  lines,
  REQUIRED_FIELDS,
} from "./resumeSignal.js";

const fullResume = {
  name: "Saavi Patel",
  email: "saavi@example.com",
  phone: "+91 22 1234 5677",
  location: "New Delhi, India",
  education: "B.Com, Delhi University, 2019",
  skills: "Retail operations, Upselling, CRM, Inventory",
  experience:
    "Increased store revenue 22% by rebuilding the upselling script\nLed a team of 6 associates during festive season",
  projects: "Built a repeat-customer tracker that lifted retention 14%",
  summary:
    "Retail sales associate with five years of experience boosting revenue and customer satisfaction across high-traffic stores. Known for turning walk-ins into repeat buyers.",
  linkedin: "https://linkedin.com/in/saavi",
};

describe("computeCompleteness", () => {
  it("reports zero filled fields for an empty draft", () => {
    const result = computeCompleteness({});
    expect(result.percent).toBe(0);
    expect(result.filled).toBe(0);
    expect(result.missing).toEqual(REQUIRED_FIELDS);
  });

  it("reports 100 percent when every required field has text", () => {
    const result = computeCompleteness(fullResume);
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("treats whitespace-only values as missing", () => {
    const result = computeCompleteness({ ...fullResume, skills: "   " });
    expect(result.percent).toBeLessThan(100);
    expect(result.missing).toEqual(["skills"]);
  });
});

describe("computeStepProgress", () => {
  const steps = [
    { id: "heading", label: "Heading", required: ["name", "email"] },
    { id: "education", label: "Education", required: ["education"] },
    { id: "skills", label: "Skills", required: ["skills"] },
    { id: "work", label: "Work history", required: ["experience"] },
  ];

  it("marks a step complete only when all of its required fields are filled", () => {
    const { steps: progress, percent } = computeStepProgress(steps, {
      name: "Saavi Patel",
      email: "saavi@example.com",
      education: "B.Com",
      skills: "",
      experience: "",
    });

    expect(progress[0].complete).toBe(true);
    expect(progress[1].complete).toBe(true);
    expect(progress[2].complete).toBe(false);
    expect(progress[2].missing).toEqual(["skills"]);
    expect(percent).toBe(50);
  });

  it("returns 0 percent when there are no steps", () => {
    expect(computeStepProgress([], fullResume).percent).toBe(0);
  });
});

describe("scoreAts", () => {
  it("scores a complete resume higher than a partial one", () => {
    expect(scoreAts(fullResume)).toBeGreaterThan(scoreAts({ name: "Saavi", email: "s@x.com" }));
  });

  it("penalises parser-hostile formatting", () => {
    const clean = scoreAts(fullResume);
    const messy = scoreAts({ ...fullResume, experience: "Built store pipeline\t| grew sales |" });
    expect(messy).toBeLessThan(clean);
  });

  it("stays within 0-100", () => {
    const score = scoreAts(fullResume);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("scoreImpact", () => {
  it("prefers bullet lists that open with action verbs", () => {
    const strong = scoreImpact({ experience: fullResume.experience });
    const weak = scoreImpact({
      experience:
        "Responsible for the store front\nWorked on restocking shelves\nHelped with customer queries\nMy duties included reporting",
    });
    expect(strong).toBeGreaterThan(weak);
  });

  it("scores nothing when there is no history", () => {
    expect(scoreImpact({})).toBe(0);
  });
});

describe("scoreEvidence", () => {
  it("rewards quantified outcomes", () => {
    const quantified = scoreEvidence({ experience: "Increased revenue 22% across 3 stores" });
    const vague = scoreEvidence({ experience: "Helped customers with their shopping needs" });
    expect(quantified).toBeGreaterThan(vague);
  });
});

describe("analyzeSignal", () => {
  it("flags an empty draft without inventing a weakness", () => {
    const signal = analyzeSignal({});
    expect(signal.hasDraft).toBe(false);
    expect(signal.overall).toBe(0);
    expect(signal.tip).toBeTruthy();
  });

  it("scores a strong resume above a weak one", () => {
    const strong = analyzeSignal(fullResume);
    const weak = analyzeSignal({
      name: "Saavi",
      email: "saavi@example.com",
      phone: "1234",
      location: "Delhi",
      education: "School",
      skills: "Sales",
      experience: "Responsible for the store front",
    });
    expect(strong.overall).toBeGreaterThan(weak.overall);
    expect(strong.tip.length).toBeGreaterThan(0);
  });

  it("reports the weakest dimension as the coaching target", () => {
    const signal = analyzeSignal({
      ...fullResume,
      experience: "Responsible for the store front",
      projects: "",
    });
    expect(["ats", "impact", "evidence"]).toContain(signal.weakest);
    expect(signal.impact).toBeLessThan(signal.ats);
  });
});

describe("signalBand", () => {
  it("maps scores to readable bands", () => {
    expect(signalBand(0).label).toBe("Empty draft");
    expect(signalBand(60).label).toBe("Getting there");
    expect(signalBand(90).label).toBe("Recruiter ready");
  });
});

describe("helpers", () => {
  it("counts words and strips bullet markers", () => {
    expect(wordCount("  two   words ")).toBe(2);
    expect(lines("• First point\n- Second point")).toEqual(["First point", "Second point"]);
  });
});
