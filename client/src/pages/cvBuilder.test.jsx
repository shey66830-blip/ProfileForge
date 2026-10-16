// @vitest-environment jsdom
//
// Renders the CV builder for real (React 18 + jsdom, no testing library) so the
// CV step list, the academic-checklist asks, the layout switching and the save
// path are exercised as a whole — a broken CV section fails here rather than in
// the browser.

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import CvBuilder from "./cvBuilder.jsx";

const act = React.act;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const filledCv = {
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

let container;
let root;
let fetchCalls;

function render(props = {}) {
  act(() => {
    root.render(
      <CvBuilder
        existingDocument={{ _id: "cv-1", type: "cv", data: { ...filledCv } }}
        refreshDocuments={async () => {}}
        setActiveDocument={() => {}}
        setPage={() => {}}
        {...props}
      />,
    );
  });
  return container;
}

function fire(el, event) {
  act(() => {
    el.dispatchEvent(event);
  });
}

function click(el) {
  fire(el, new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function stepButton(el, label) {
  return Array.from(el.querySelectorAll(".pf-step button")).find((button) =>
    button.textContent.includes(label),
  );
}

function goToStep(el, label) {
  click(stepButton(el, label));
}

const stepLabels = (el) =>
  Array.from(el.querySelectorAll(".pf-step-label")).map((node) => node.textContent);
const paper = (el) => el.querySelector(".pf-pv").textContent;
const question = (el) => el.querySelector(".pf-question").textContent;
const activeStep = (el) => el.querySelector(".pf-step--active .pf-step-label").textContent;
const checklistText = (el) => el.querySelector(".pf-aside .pf-checklist").textContent;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchCalls = [];
  globalThis.fetch = vi.fn(async (url, options) => {
    fetchCalls.push({ url: String(url), body: options?.body ? JSON.parse(options.body) : null });
    return { json: async () => ({ ok: true, document: { _id: "cv-1" } }) };
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete globalThis.fetch;
});

describe("CV builder wizard", () => {
  it("renders the CV sections — not the resume ones — with the heading first", () => {
    render();

    expect(stepLabels(container)).toEqual([
      "Heading",
      "Academic profile",
      "Education",
      "Publications",
      "Grants & awards",
      "Talks",
      "Teaching",
      "Experience",
      "Skills & methods",
      "Referees",
      "Memberships",
      "Personal & eligibility",
      "Finalize",
    ]);
    expect(activeStep(container)).toBe("Heading");
    expect(question(container)).toMatch(/committee reach you\?/);
    expect(container.querySelector(".pf-step-count").textContent).toBe("Step 1 of 13 · Heading");
  });

  it("paints the preview with the section order of the chosen layout", () => {
    render();

    const academic = paper(container);
    expect(academic).toContain("ACADEMIC PROFILE");
    expect(academic.indexOf("PUBLICATIONS & RESEARCH")).toBeLessThan(
      academic.indexOf("PROFESSIONAL EXPERIENCE"),
    );
    expect(academic).toContain("REFERENCES");

    goToStep(container, "Finalize");
    const industry = Array.from(container.querySelectorAll(".pf-tpl-card")).find((card) =>
      card.textContent.includes("Industry"),
    );
    click(industry);

    const text = paper(container);
    expect(container.querySelector(".pf-pv").className).toContain("pf-pv--executive");
    expect(text.indexOf("PROFESSIONAL EXPERIENCE")).toBeLessThan(
      text.indexOf("SELECTED PUBLICATIONS"),
    );
  });

  it("marks the asked-for sections complete on a full academic CV", () => {
    render();

    expect(container.querySelector(".pf-progress").getAttribute("aria-valuenow")).toBe("100");
    expect(checklistText(container)).toMatch(/Every academic section/);
    expect(container.querySelectorAll(".pf-step--done").length).toBeGreaterThan(10);
  });

  it("asks for what is missing and jumps to the step that fills it", () => {
    render({
      existingDocument: {
        _id: "cv-2",
        type: "cv",
        data: { name: "Ravi Kumar", email: "ravi@example.com" },
      },
    });

    const asks = checklistText(container);
    expect(asks).toMatch(/Which papers, chapters or preprints/);
    expect(asks).toMatch(/Name two referees/);

    const publicationsAsk = Array.from(
      container.querySelectorAll(".pf-aside .pf-checklist .pf-link-btn"),
    ).find((button) => button.textContent.includes("Which papers"));

    click(publicationsAsk);
    expect(activeStep(container)).toBe("Publications");
    expect(question(container)).toMatch(/What have you published\?/);
  });

  it("edits CV rows and keeps the preview in sync", () => {
    render({
      existingDocument: {
        _id: "cv-3",
        type: "cv",
        data: { ...filledCv, educationRows: [], education: "" },
      },
    });
    goToStep(container, "Education");

    click(
      Array.from(container.querySelectorAll(".pf-chip")).find((chip) =>
        chip.textContent.includes("+ PhD"),
      ),
    );

    const degree = container.querySelector('input[aria-label="Degree 1 degree"]');
    expect(degree.value).toBe("PhD");

    const institution = container.querySelector('input[aria-label="Institution 1 institution"]');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        institution.constructor.prototype,
        "value",
      ).set;
      setter.call(institution, "IIM Bangalore");
      institution.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(paper(container)).toContain("IIM Bangalore");
  });

  it("saves the CV through the CV generator", async () => {
    render();
    goToStep(container, "Finalize");

    click(container.querySelector(".pf-nav .pf-btn.primary"));
    await act(async () => {});

    const saved = fetchCalls.find((call) => call.url.includes("/documents"));
    expect(saved).toBeTruthy();
    expect(saved.body.type).toBe("cv");
    expect(saved.body.title).toBe("CV - Dr. Anita Sharma");
    expect(saved.body.template).toBe("academic");
    expect(saved.body.generatedText).toContain("PUBLICATIONS & RESEARCH");
    expect(saved.body.generatedText).toContain("REFERENCES");
  });

  it("blocks the save and names the missing CV sections", async () => {
    render({
      existingDocument: {
        _id: "cv-4",
        type: "cv",
        data: {
          ...filledCv,
          summary: "",
          publicationsRows: [],
          grantsRows: [],
          teachingRows: [],
          experience: "",
        },
      },
    });
    goToStep(container, "Finalize");

    click(container.querySelector(".pf-nav .pf-btn.primary"));
    await act(async () => {});

    expect(container.querySelector(".pf-error").textContent).toMatch(
      /A CV needs: academic profile, one of publications, grants, teaching or experience/,
    );
    expect(fetchCalls.some((call) => call.url.includes("/documents"))).toBe(false);
  });

  it("fills only the gaps from an uploaded CV", async () => {
    globalThis.fetch = vi.fn(async () => ({
      json: async () => ({
        ok: true,
        documentType: "cv",
        text: "…",
        fields: {
          name: "Someone Else",
          location: "Singapore",
          publicationsRows: [
            {
              title: "Uploaded paper",
              authors: "",
              venue: "Review of Finance",
              year: "2021",
              url: "",
            },
          ],
          personal: { languages: "English" },
          improvements: ["Add a DOI to each publication."],
          suggestedTemplates: ["research"],
          audit: { score: 71, checklist: [{ label: "Publications", complete: true }] },
        },
      }),
    }));

    render({ existingDocument: { _id: "cv-5", type: "cv", data: { ...filledCv, location: "" } } });

    const input = container.querySelector('.pf-dropzone input[type="file"]');
    const file = new File(["%PDF-1.4"], "old-cv.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fire(input, new Event("change", { bubbles: true }));
    await act(async () => {});

    // What the user typed wins; the gaps get filled.
    expect(container.querySelector("#cv-name").value).toBe("Dr. Anita Sharma");
    expect(container.querySelector("#cv-location").value).toBe("Singapore");
    // The upload did not overwrite existing rows.
    goToStep(container, "Publications");
    expect(container.querySelector('input[aria-label="Publication 1 title"]').value).toBe(
      "Deep learning for credit scoring",
    );

    // The upload's own review and tips land on the final step.
    goToStep(container, "Finalize");
    expect(container.textContent).toContain("Uploaded CV check");
    expect(container.textContent).toContain("Add a DOI to each publication.");
    expect(checklistText(container)).toBeTruthy();
  });
});
