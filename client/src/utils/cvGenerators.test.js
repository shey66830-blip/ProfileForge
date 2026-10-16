// The CV generator is a different document model from the resume generator, so
// these tests pin the parts that make it different: the section order per layout,
// the CV-only rows, and the checklist that turns a thin CV into questions.
import { describe, it, expect } from "vitest";
import {
  CV_TEMPLATES,
  computeCvChecklist,
  cvBlockingFields,
  cvSections,
  cvTemplateSuggestions,
  generateCVText,
  grantsToText,
  publicationsToText,
  referencesToText,
  talksToText,
  teachingToText,
} from "./cvGenerators.js";

const academicCv = {
  name: "Dr. Anita Sharma",
  profession: "Assistant Professor of Finance",
  email: "anita@iimb.ac.in",
  phone: "+91 80 1234 5678",
  location: "Bangalore, India",
  orcid: "0000-0002-1825-0097",
  summary:
    "Assistant Professor of Finance working on credit risk and applied machine learning, published in banking and econometrics journals.",
  researchInterests: "Credit risk, applied machine learning",
  educationRows: [
    {
      degree: "PhD",
      field: "Finance",
      institution: "IIM Bangalore",
      year: "2014 - 2019",
      score: "8.9",
      gradeType: "cgpa",
    },
  ],
  publicationsRows: [
    {
      title: "Deep learning for credit scoring",
      authors: "Sharma, A.",
      venue: "Journal of Banking & Finance",
      year: "2023",
      url: "https://doi.org/10.1016/j.jbankfin.2023.106119",
    },
  ],
  grantsRows: [
    { name: "SERB Early Career Research Grant", kind: "Grant", issuer: "SERB", year: "2021" },
  ],
  talksRows: [{ title: "Fair credit models", event: "ACM FAccT", kind: "Keynote", year: "2023" }],
  teachingRows: [
    {
      course: "Corporate Finance",
      role: "Lecturer",
      institution: "IIM Bangalore",
      period: "2019-2023",
    },
  ],
  experience: "Assistant Professor, IIM Bangalore (2019 - present) — built the credit-risk lab.",
  skills: "Statistics, machine learning, Python, R, SQL",
  memberships: "American Finance Association",
  referencesRows: [
    {
      name: "Prof. R. Verma",
      role: "Professor",
      organization: "IIM Bangalore",
      contact: "rverma@iimb.ac.in",
    },
    {
      name: "Dr. A. Nair",
      role: "Associate Professor",
      organization: "NUS",
      contact: "anair@nus.edu.sg",
    },
  ],
  languages: "English (Fluent), Hindi (Native)",
  nationality: "Indian",
};

const positionOf = (text, needle) => text.indexOf(needle);

describe("cvGenerators: templates", () => {
  it("offers the CV layout set with unique ids", () => {
    const ids = CV_TEMPLATES.map((template) => template.id);
    expect(ids).toEqual(["academic", "research", "industry", "ats"]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of CV_TEMPLATES) {
      expect(template.label).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.label2).toBeUndefined();
    }
  });
});

describe("cvGenerators: section text", () => {
  it("renders CV rows with their own labels", () => {
    expect(publicationsToText(academicCv)).toContain("Authors: Sharma, A.");
    expect(publicationsToText(academicCv)).toContain("Link: https://doi.org/");
    expect(grantsToText(academicCv)).toContain("Grant: SERB Early Career Research Grant");
    expect(talksToText(academicCv)).toContain("Event: ACM FAccT");
    expect(teachingToText(academicCv)).toContain("Corporate Finance as Lecturer");
    expect(referencesToText(academicCv)).toContain("rverma@iimb.ac.in");
  });

  it("falls back to the free-text field when there are no rows", () => {
    expect(publicationsToText({ publications: "Thesis: Credit risk in retail lending" })).toBe(
      "Thesis: Credit risk in retail lending",
    );
    expect(referencesToText({})).toBe("");
  });

  it("orders sections by layout instead of using one fixed order", () => {
    const academic = cvSections(academicCv, "academic").map((section) => section.key);
    const industry = cvSections(academicCv, "industry").map((section) => section.key);

    expect(academic.indexOf("publications")).toBeLessThan(academic.indexOf("experience"));
    expect(industry.indexOf("experience")).toBeLessThan(industry.indexOf("publications"));
  });
});

describe("cvGenerators: generateCVText", () => {
  it("leads an academic CV with the profile, education and publications", () => {
    const text = generateCVText(academicCv, "academic");
    expect(text).toContain("Dr. Anita Sharma");
    expect(text).toContain("ACADEMIC PROFILE");
    expect(text).toContain("PUBLICATIONS & RESEARCH");
    expect(positionOf(text, "PUBLICATIONS & RESEARCH")).toBeLessThan(
      positionOf(text, "PROFESSIONAL EXPERIENCE"),
    );
    expect(positionOf(text, "REFERENCES")).toBeGreaterThan(positionOf(text, "EDUCATION"));
  });

  it("prints the plain layout as label: value lines for ATS parsers", () => {
    const text = generateCVText(academicCv, "ats");
    expect(text).toMatch(/^Education: /m);
    expect(text).toMatch(/^Publications: /m);
    expect(text).not.toContain("PUBLICATIONS & RESEARCH");
  });

  it("never prints a section it has no content for", () => {
    const text = generateCVText({ name: "Ravi Kumar", email: "ravi@example.com" }, "academic");
    expect(text).toContain("Ravi Kumar");
    expect(text).not.toContain("PUBLICATIONS");
    expect(text).not.toContain("REFERENCES");
  });
});

describe("cvGenerators: checklist", () => {
  it("asks for the academic sections a bare CV is missing", () => {
    const checklist = computeCvChecklist({ name: "Ravi Kumar", email: "ravi@example.com" });

    expect(checklist.score).toBeLessThan(40);
    const asks = checklist.missing.map((item) => item.ask).join(" | ");
    expect(asks).toMatch(/papers, chapters or preprints/);
    expect(asks).toMatch(/two referees/i);
    expect(asks).toMatch(/funding, fellowships or awards/);
    // Each gap points at the step that fills it.
    expect(checklist.missing.find((item) => item.key === "publications").step).toBe("publications");
  });

  it("reports a complete academic CV as done", () => {
    const checklist = computeCvChecklist(academicCv);
    expect(checklist.missing).toEqual([]);
    expect(checklist.score).toBe(100);
  });

  it("counts a half-filled section as incomplete", () => {
    const checklist = computeCvChecklist({
      ...academicCv,
      referencesRows: [{ name: "Prof. R. Verma" }],
    });
    const keys = checklist.missing.map((item) => item.key);
    expect(keys).toContain("references");
    expect(keys).toContain("referenceContact");
  });
});

describe("cvGenerators: save gate and layout suggestion", () => {
  it("names every blocking gap and passes a real CV", () => {
    expect(cvBlockingFields({ name: "Ravi Kumar" })).toEqual([
      "email",
      "phone",
      "location",
      "academic profile",
      "education",
      "one of publications, grants, teaching or experience",
    ]);
    expect(cvBlockingFields(academicCv)).toEqual([]);
  });

  it("suggests a layout from the sections that are filled", () => {
    expect(cvTemplateSuggestions(academicCv)).toContain("academic");
    expect(cvTemplateSuggestions({ experience: "x".repeat(200) })).toContain("industry");
    expect(cvTemplateSuggestions({})).toContain("ats");
  });
});
