// @vitest-environment jsdom
//
// Renders the builder for real (React 18 + jsdom, no testing-library) so the
// step definitions, the live preview, the structured rows and the rail are
// exercised as a whole — a broken reference inside a step body fails here
// rather than in the browser.

import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import Builder from "./builder.jsx";

// React 18.3 exposes act() from the main entry; the test-utils copy is
// deprecated and logs a warning on every run.
const act = React.act;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const filled = {
  name: "Sanvi Jha",
  profession: "Quant Finance",
  email: "example@gmail.com",
  phone: "+91 22 1234 5677",
  location: "New Delhi, India",
  education: "B.Com, Delhi University, 2019",
  skills: "Financial analysis, Risk management, Python",
  experience: "Increased store revenue 22% by rebuilding the upsell script",
  summary:
    "Quantitative finance analyst with three years of experience building trading models and risk dashboards",
  projectsRows: [
    { name: "Recon Engine", role: "Lead Engineer", responsibilities: "Owned the rollout." },
  ],
  certificationsRows: [{ name: "AWS SAA", credentialId: "AWS-ASA-77812" }],
  languages: "English (Fluent), Tamil (Native)",
  nationality: "Indian",
  age: "28",
  height: "5 ft 7 in",
  family: "Father: retired teacher · Mother: homemaker",
};

const educationRow = {
  degree: "B.Tech",
  field: "Computer Science",
  institution: "NIT Karnataka",
  year: "2016 - 2020",
  score: "8.7",
  gradeType: "cgpa",
};

let container;
let root;

function render(props) {
  act(() => {
    root.render(<Builder {...props} />);
  });
  return container;
}

function baseProps(type, data = {}) {
  return {
    type,
    existingDocument: { _id: "doc-1", type, data: { ...filled, ...data } },
    refreshDocuments: async () => {},
    setActiveDocument: () => {},
    setPage: () => {},
  };
}

function fire(el, event) {
  act(() => {
    el.dispatchEvent(event);
  });
}

function click(el) {
  fire(el, new MouseEvent("click", { bubbles: true, cancelable: true }));
}

// React tracks the DOM value itself, so setting `.value` directly makes it
// think nothing changed. Go through the native setter instead.
function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set;
  setter.call(el, value);
  fire(el, new Event("input", { bubbles: true }));
}

function stepButton(el, label) {
  return Array.from(el.querySelectorAll(".pf-step button")).find((button) =>
    button.textContent.includes(label),
  );
}

function goToStep(el, label) {
  click(stepButton(el, label));
}

function stepLabels(el) {
  return Array.from(el.querySelectorAll(".pf-step-label")).map((node) => node.textContent);
}

const progressNow = (el) => el.querySelector(".pf-progress").getAttribute("aria-valuenow");
const paper = (el) => el.querySelector(".pf-pv").textContent;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Builder wizard", () => {
  it("renders every resume step with the first one active", () => {
    render(baseProps("resume"));

    expect(stepLabels(container)).toEqual([
      "Heading",
      "Work history",
      "Education",
      "Skills",
      "Projects",
      "Certifications",
      "Summary",
      "Personal",
      "Finalize",
    ]);
    expect(container.querySelector(".pf-step--active .pf-step-label").textContent).toBe("Heading");
    expect(container.querySelector(".pf-question").textContent).toMatch(/contact you\?/);
    expect(container.querySelector(".pf-step-count").textContent).toBe("Step 1 of 9 · Heading");
  });

  it("fills the rail progress bar from the step data", () => {
    render(baseProps("resume"));

    expect(progressNow(container)).toBe("100");
    expect(container.querySelector(".pf-progress i").style.width).toBe("100%");
    expect(container.querySelectorAll(".pf-step--done")).toHaveLength(8);
  });

  it("paints the live preview from the form data", () => {
    render(baseProps("resume"));

    const preview = container.querySelector(".pf-pv");
    expect(preview.className).toContain("pf-pv--modern");
    expect(preview.querySelector("h3").textContent).toBe("Sanvi Jha");
    expect(preview.querySelector(".pf-pv-role").textContent).toBe("Quant Finance");
    expect(preview.textContent).toContain("Increased store revenue 22%");
    expect(container.querySelectorAll(".pf-pv-photo img")).toHaveLength(0);
    expect(container.querySelector(".pf-pv-photo").textContent).toBe("SP");
  });

  it("reports a recruiter signal with a coaching tip", () => {
    render(baseProps("resume"));

    expect(Number(container.querySelector(".pf-signal-score").textContent)).toBeGreaterThan(50);
    expect(container.querySelector(".pf-signal-tip").textContent).toMatch(/Next best move:/);
    expect(container.querySelectorAll(".pf-meter")).toHaveLength(3);
  });

  it("advances and rewinds with the nav buttons", () => {
    render(baseProps("resume"));

    click(container.querySelector(".pf-nav .pf-btn.primary"));
    expect(container.querySelector(".pf-question").textContent).toBe(
      "What have you actually shipped?",
    );
    expect(container.querySelector(".pf-textarea.lg").value).toContain("22%");

    click(container.querySelector(".pf-nav .pf-btn.ghost"));
    expect(container.querySelector(".pf-question").textContent).toMatch(/contact you\?/);
  });

  it("keeps the preview and progress in sync while typing", () => {
    render(baseProps("resume", { name: "" }));

    // The heading step needs all four contact fields, so an empty name alone
    // leaves one of nine steps unfinished.
    expect(progressNow(container)).toBe("89");
    expect(container.querySelector(".pf-pv h3").textContent).toBe("Your Name");

    type(container.querySelector("#pf-name"), "Ravi Kumar");

    expect(container.querySelector(".pf-pv h3").textContent).toBe("Ravi Kumar");
    expect(progressNow(container)).toBe("100");
  });

  it("shows the layout picker and review on the final step", () => {
    render(baseProps("resume"));
    goToStep(container, "Finalize");

    expect(container.querySelectorAll(".pf-tpl-card")).toHaveLength(5);
    expect(container.querySelector(".pf-tpl-card.active strong").textContent).toBe("Modern");
    expect(container.querySelector(".pf-checklist").textContent).toMatch(
      /Every field the save needs/,
    );
    expect(container.querySelector(".pf-nav .pf-btn.primary").textContent).toBe("Save & finish");

    const executive = Array.from(container.querySelectorAll(".pf-tpl-card")).find((card) =>
      card.textContent.includes("Executive"),
    );
    click(executive);
    expect(container.querySelector(".pf-pv").className).toContain("pf-pv--executive");
  });

  it("separates blocking gaps from recommended ones", () => {
    render(baseProps("resume", { skills: "", summary: "" }));
    goToStep(container, "Finalize");

    // skills blocks the save; the summary is only recommended.
    expect(container.querySelector(".pf-checklist .pf-check.miss").textContent).toMatch(
      /Still needed to save: skills/,
    );
    expect(container.querySelector(".pf-checklist .pf-check.soft").textContent).toMatch(
      /Worth adding: Summary/,
    );
  });

  it("swaps work history for biodata details on the biodata type", () => {
    render(baseProps("biodata"));

    expect(stepLabels(container)).toEqual([
      "Heading",
      "Personal",
      "Education",
      "Skills",
      "Projects",
      "Certifications",
      "Summary",
      "Finalize",
    ]);

    goToStep(container, "Personal");
    expect(container.querySelector("#pf-age").value).toBe("28");
    expect(container.querySelector("#pf-height").value).toBe("5 ft 7 in");
    expect(container.querySelector("#pf-family").value).toContain("retired teacher");
    expect(paper(container)).toContain("Family Background");
  });
});

// ── The four extraction asks ───────────────────────────────────────────────

describe("Builder wizard: extracted details", () => {
  it("shows a qualification as editable rows, not one line of text", () => {
    render(baseProps("resume", { educationRows: [educationRow], education: "" }));
    goToStep(container, "Education");

    const inputs = Array.from(container.querySelectorAll(".pf-row-grid input")).map(
      (input) => input.value,
    );
    expect(inputs).toEqual(["B.Tech", "Computer Science", "NIT Karnataka", "2016 - 2020", "8.7"]);

    // The preview prints the same line the export will.
    expect(paper(container)).toContain("NIT Karnataka");
    expect(paper(container)).toContain("CGPA 8.7");
    expect(container.querySelector(".pf-row-head strong").textContent).toBe("B.Tech");
  });

  it("keeps the preview in sync when a qualification row is edited", () => {
    render(baseProps("resume", { educationRows: [educationRow], education: "" }));
    goToStep(container, "Education");

    const institute = Array.from(container.querySelectorAll(".pf-row-grid input"))[2];
    type(institute, "IIT Bombay");

    expect(paper(container)).toContain("IIT Bombay");
    expect(paper(container)).not.toContain("NIT Karnataka");
  });

  it("adds and removes qualification rows", () => {
    render(baseProps("resume", { educationRows: [], education: "" }));
    goToStep(container, "Education");

    expect(container.querySelectorAll(".pf-row")).toHaveLength(0);

    click(container.querySelector(".pf-row-add"));
    expect(container.querySelectorAll(".pf-row")).toHaveLength(1);

    click(container.querySelector(".pf-row-remove"));
    expect(container.querySelectorAll(".pf-row")).toHaveLength(0);
  });

  it("captures the project role and responsibilities separately", () => {
    render(
      baseProps("resume", {
        projectsRows: [],
        projects: "",
        structuredFromUpload: true,
      }),
    );
    goToStep(container, "Projects");

    click(container.querySelector(".pf-row-add"));

    const name = container.querySelector('input[aria-label="Project 1 name"]');
    const role = container.querySelector('input[aria-label="Project 1 role"]');
    const responsibilities = container.querySelector(
      'textarea[aria-label="Project 1 responsibilities"]',
    );

    type(name, "Settlement Reconciliation Engine");
    type(role, "Lead Engineer");
    type(responsibilities, "Designed the matching algorithm.\nOwned the rollout across 3 markets.");

    expect(paper(container)).toContain("Role: Lead Engineer");
    expect(paper(container)).toContain("Designed the matching algorithm.");
    expect(paper(container)).toContain("Owned the rollout across 3 markets.");
  });

  it("stores a certificate with its credential ID and achievements", () => {
    render(baseProps("resume", { certificationsRows: [], certifications: "", achievements: "" }));
    goToStep(container, "Certifications");

    click(container.querySelector(".pf-row-add"));

    type(
      container.querySelector('input[aria-label="Certificate 1 name"]'),
      "AWS Solutions Architect",
    );
    type(
      container.querySelector('input[aria-label="Certificate 1 issuer"]'),
      "Amazon Web Services",
    );
    type(
      container.querySelector('input[aria-label="Certificate 1 credential id"]'),
      "AWS-ASA-77812",
    );
    type(
      container.querySelector('input[aria-label="Certificate 1 verification link"]'),
      "https://credly.com/x1",
    );
    type(container.querySelector("#pf-achievements"), "Winner, National Coding Championship 2019");

    const text = paper(container);
    expect(text).toContain("AWS Solutions Architect");
    expect(text).toContain("Amazon Web Services");
    expect(text).toContain("ID AWS-ASA-77812");
    expect(text).toContain("https://credly.com/x1");
    expect(text).toMatch(/Winner, National Coding Championship 2019/);
  });

  it("files an attached certificate even when it is a PDF", () => {
    render(baseProps("resume", { certificationsRows: [], certifications: "" }));
    goToStep(container, "Certifications");
    click(container.querySelector(".pf-row-add"));

    const input = container.querySelector('.pf-attach-btn input[type="file"]');
    const file = new File(["%PDF-1.4"], "aws-certificate.pdf", { type: "application/pdf" });
    // jsdom has no DataTransfer, so hand the input a file list directly.
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fire(input, new Event("change", { bubbles: true }));

    expect(container.querySelector(".pf-attach-name").textContent).toBe("aws-certificate.pdf");
    expect(container.querySelector(".pf-attach-btn").textContent).toMatch(/Replace certificate/);
    expect(container.querySelectorAll(".pf-attach-preview")).toHaveLength(0);
  });

  it("collects the eligibility details an overseas employer asks for", () => {
    render(
      baseProps("resume", {
        languages: "",
        nationality: "",
        passport: "",
        workAuthorization: "",
        relocate: "",
      }),
    );
    goToStep(container, "Personal");

    expect(container.querySelector("#pf-nationality").value).toBe("");
    type(container.querySelector("#pf-languages"), "English (Fluent), Tamil (Native)");
    type(container.querySelector("#pf-passport"), "M1234567");
    type(container.querySelector("#pf-nric"), "S7891234B");

    const workAuth = Array.from(container.querySelectorAll(".pf-chip")).find((chip) =>
      chip.textContent.includes("Requires work visa sponsorship"),
    );
    click(workAuth);

    const text = paper(container);
    expect(text).toContain("Languages: English (Fluent), Tamil (Native)");
    expect(text).toContain("Passport: M1234567");
    expect(text).toContain("NRIC / FIN: S7891234B");
    expect(text).toContain("Work authorization: Requires work visa sponsorship");
    expect(text).toContain("Personal & Work Eligibility");
  });
});
