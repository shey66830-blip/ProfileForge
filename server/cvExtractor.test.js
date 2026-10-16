import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  extractPublications,
  extractGrants,
  extractTalks,
  extractTeaching,
  extractReferences,
  computeCVCompleteness,
  extractCVFields,
} = await import("./services/cvExtractor.js");

describe("cvExtractor: extractPublications", () => {
  it("reads labelled publication lines", () => {
    const rows = extractPublications([
      "Title: Deep learning for credit scoring",
      "Authors: Sharma, A., Verma, R.",
      "Venue: Journal of Banking & Finance",
      "Year: 2023",
      "Link: https://doi.org/10.1016/j.jbankfin.2023.106119",
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, "Deep learning for credit scoring");
    assert.equal(rows[0].authors, "Sharma, A., Verma, R.");
    assert.equal(rows[0].venue, "Journal of Banking & Finance");
    assert.equal(rows[0].year, "2023");
    assert.match(rows[0].url, /doi\.org/);
  });

  it("separates authors, title and venue in a plain citation", () => {
    const rows = extractPublications([
      "[1] Sharma, A., Verma, R. (2023). Deep learning for credit scoring. Journal of Banking & Finance, 145, 106-119.",
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, "Deep learning for credit scoring");
    assert.match(rows[0].authors, /Sharma/);
    assert.match(rows[0].venue, /Journal of Banking & Finance/);
    assert.equal(rows[0].year, "2023");
  });

  it("keeps the DOI out of the venue text", () => {
    const rows = extractPublications([
      "[1] Sharma, A., Verma, R. (2023). Deep learning for credit scoring. Journal of Banking & Finance, 145, 106-119. doi:10.1016/j.jbankfin.2023.106119",
    ]);

    assert.equal(rows[0].venue, "Journal of Banking & Finance, 145, 106-119");
    assert.equal(rows[0].url, "https://doi.org/10.1016/j.jbankfin.2023.106119");
  });

  it("keeps a title-first line as the title and ignores section headings", () => {
    const rows = extractPublications([
      "PUBLICATIONS",
      "• Graph neural networks for fraud detection. Expert Systems with Applications (2022)",
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, "Graph neural networks for fraud detection");
    assert.equal(rows[0].year, "2022");
  });
});

describe("cvExtractor: extractGrants", () => {
  it("captures the kind, name, issuer and year", () => {
    const rows = extractGrants([
      "Grant: SERB Early Career Research Grant — SERB (2021)",
      "Best Paper Award — NeurIPS 2022 (ACM)",
      "Winner, National Coding Championship 2019",
    ]);

    assert.equal(rows.length, 3);
    assert.equal(rows[0].kind, "Grant");
    assert.equal(rows[0].name, "SERB Early Career Research Grant");
    assert.equal(rows[0].issuer, "SERB");
    assert.equal(rows[0].year, "2021");

    assert.equal(rows[1].kind, "Award");
    assert.equal(rows[1].issuer, "ACM");
    assert.equal(rows[1].year, "2022");

    assert.equal(rows[2].name, "National Coding Championship");
    assert.equal(rows[2].year, "2019");
  });

  it("labels a fellowship line with its own kind", () => {
    const rows = extractGrants(["Fellowship: Ramanujan Research Fellowship, DST, 2020"]);
    assert.equal(rows[0].kind, "Fellowship");
    assert.equal(rows[0].name, "Ramanujan Research Fellowship");
  });
});

describe("cvExtractor: extractTalks", () => {
  it("reads the talk type, event and year", () => {
    const rows = extractTalks([
      "Keynote: Fair credit models — ACM FAccT 2023",
      "Invited talk, Postgraduate seminar, IIM Bangalore (2021)",
    ]);

    assert.equal(rows.length, 2);
    assert.equal(rows[0].kind, "Keynote");
    assert.equal(rows[0].title, "Fair credit models");
    assert.match(rows[0].event, /FAccT/);
    assert.equal(rows[0].year, "2023");

    assert.equal(rows[1].kind, "Invited talk");
    assert.equal(rows[1].year, "2021");
  });
});

describe("cvExtractor: extractTeaching", () => {
  it("keeps the course, the role and the institution apart", () => {
    const rows = extractTeaching([
      "Course: Data Structures | Role: Lecturer | Institution: NIT Karnataka | Period: 2019-2021",
      "Teaching Assistant — Econometrics, IIM Bangalore (2018)",
    ]);

    assert.equal(rows.length, 2);
    assert.equal(rows[0].course, "Data Structures");
    assert.equal(rows[0].role, "Lecturer");
    assert.equal(rows[0].institution, "NIT Karnataka");
    assert.equal(rows[0].period, "2019-2021");

    assert.equal(rows[1].course, "Econometrics");
    assert.equal(rows[1].role, "Teaching Assistant");
    assert.equal(rows[1].institution, "IIM Bangalore");
  });
});

describe("cvExtractor: extractReferences", () => {
  it("groups a referee block into one row with contact details", () => {
    const rows = extractReferences([
      "Prof. R. Verma",
      "Professor of Finance, IIM Bangalore",
      "rverma@iimb.ac.in | +91 80 1234 5678",
      "Dr. A. Nair, Associate Professor, NUS Business School",
      "anair@nus.edu.sg",
    ]);

    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, "Prof. R. Verma");
    assert.match(rows[0].role, /Professor of Finance/);
    assert.match(rows[0].contact, /rverma@iimb\.ac\.in/);

    assert.equal(rows[1].name, "Dr. A. Nair");
    assert.match(rows[1].organization, /NUS Business School/);
    assert.match(rows[1].contact, /anair@nus\.edu\.sg/);
  });

  it("keeps a one-line referee readable", () => {
    const rows = extractReferences(["Prof. S. Rao, Professor, IIT Bombay — srao@iitb.ac.in"]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Prof. S. Rao");
    assert.match(rows[0].contact, /srao@iitb\.ac\.in/);
  });
});

describe("cvExtractor: computeCVCompleteness", () => {
  it("asks for the academic sections a CV needs", () => {
    const audit = computeCVCompleteness({
      name: "Ravi Kumar",
      email: "ravi@example.com",
      phone: "+65 8123 4567",
      location: "Singapore",
      summary: "x",
      structuredEducation: [],
      publicationsRows: [],
      grantsRows: [],
      talksRows: [],
      teachingRows: [],
      referencesRows: [],
      skillsList: [],
      personal: {},
    });

    const missing = audit.checklist.filter((item) => !item.complete).map((item) => item.label);
    assert.ok(
      missing.some((label) => /publications/i.test(label)),
      missing.join(" | "),
    );
    assert.ok(
      missing.some((label) => /referees/i.test(label)),
      missing.join(" | "),
    );
    assert.ok(
      missing.some((label) => /grants/i.test(label)),
      missing.join(" | "),
    );
    assert.ok(audit.score < 50, `expected a low score, got ${audit.score}`);
  });
});

describe("cvExtractor: extractCVFields end-to-end", () => {
  it("reads a full academic CV into CV-shaped fields", () => {
    const cvText = `
Dr. Anita Sharma
anita.sharma@iimb.ac.in | +91 80 1234 5678 | Bangalore, India
orcid.org/0000-0002-1825-0097

ACADEMIC PROFILE
Assistant Professor of Finance working on credit risk, machine learning and household finance. Published in top-tier banking journals.

EDUCATION
PhD in Finance, IIM Bangalore (2014 - 2019) | CGPA: 8.9
M.Sc in Economics, Delhi School of Economics (2012 - 2014)

RESEARCH INTERESTS
Credit risk modelling, applied machine learning, household finance.

PUBLICATIONS
[1] Sharma, A., Verma, R. (2023). Deep learning for credit scoring. Journal of Banking & Finance, 145, 106-119. doi:10.1016/j.jbankfin.2023.106119
[2] Sharma, A. (2021). Household debt and defaults. Review of Finance, 25, 100-140.

GRANTS AND AWARDS
Grant: SERB Early Career Research Grant — SERB (2021)
Best Paper Award — NeurIPS 2022 (ACM)

INVITED TALKS
Keynote: Fair credit models — ACM FAccT 2023

TEACHING EXPERIENCE
Course: Corporate Finance | Role: Lecturer | Institution: IIM Bangalore | Period: 2019-2023

TECHNICAL SKILLS
Python, R, SQL, Machine Learning, Stochastic modelling

PROFESSIONAL MEMBERSHIPS
American Finance Association, Indian Econometric Society

LANGUAGES
English (Fluent), Hindi (Native)

REFERENCES
Prof. R. Verma
Professor of Finance, IIM Bangalore
rverma@iimb.ac.in

Dr. A. Nair
Associate Professor, NUS Business School
anair@nus.edu.sg
`;

    const fields = extractCVFields(cvText);

    assert.equal(fields.name, "Dr. Anita Sharma");
    assert.equal(fields.email, "anita.sharma@iimb.ac.in");
    // The location comes off the contact line, not off the education line that
    // happens to name its institution ("IIM Bangalore").
    assert.equal(fields.location, "Bangalore, India");
    assert.match(fields.links.orcid, /0000-0002-1825-0097/);

    assert.equal(fields.publicationsRows.length, 2);
    assert.equal(fields.publicationsRows[0].title, "Deep learning for credit scoring");
    assert.equal(fields.publicationsRows[0].venue, "Journal of Banking & Finance, 145, 106-119");
    assert.match(fields.publicationsRows[0].url, /doi\.org/);

    assert.equal(fields.grantsRows.length, 2);
    assert.equal(fields.grantsRows[0].kind, "Grant");

    assert.equal(fields.talksRows.length, 1);
    assert.equal(fields.teachingRows.length, 1);
    assert.equal(fields.teachingRows[0].role, "Lecturer");

    assert.equal(fields.referencesRows.length, 2);
    assert.match(fields.memberships, /American Finance Association/);
    assert.match(fields.personal.languages, /Hindi/);

    assert.ok(fields.structuredEducation.length >= 2);
    assert.ok(fields.skillsList.length >= 4);
    assert.ok(fields.improvements.length >= 0);
    assert.ok(fields.suggestedTemplates.includes("academic"));
    assert.ok(fields.audit.score >= 70, `expected a high CV score, got ${fields.audit.score}`);
  });

  it("keeps the resume and CV readings separate for the same text", () => {
    const cvText = `
Ravi Kumar
ravi@example.com | +65 8123 4567 | Singapore

PUBLICATIONS
Sharma, A. (2020). Payment systems at scale. Journal of Payments, 12, 1-20.

REFERENCES
Prof. S. Rao, Professor, IIT Bombay — srao@iitb.ac.in
`;
    const cvFields = extractCVFields(cvText);

    // The CV reader finds the CV sections...
    assert.equal(cvFields.publicationsRows.length, 1);
    assert.equal(cvFields.referencesRows.length, 1);
    // ...and the shared fields are still populated for the rest of the builder.
    assert.equal(cvFields.email, "ravi@example.com");
    assert.match(cvFields.location, /Singapore/);
  });
});
