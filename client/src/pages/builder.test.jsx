// @vitest-environment jsdom
//
// Renders the builder for real (React 18 + jsdom, no testing-library) so the
// step definitions, the live preview and the rail are exercised as a whole —
// a broken reference inside a step body fails here rather than in the browser.

import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import Builder from "./builder.jsx";

// React 18.3 exposes act() from the main entry; the test-utils copy is
// deprecated and logs a warning on every run.
const act = React.act;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const filled = {
  name: "Saavi Patel",
  profession: "Retail Sales Associate",
  email: "saavi@example.com",
  phone: "+91 22 1234 5677",
  location: "New Delhi, India",
  education: "B.Com, Delhi University, 2019",
  skills: "Retail operations, Upselling, CRM",
  experience: "Increased store revenue 22% by rebuilding the upsell script",
  summary:
    "Retail sales associate with five years of experience boosting revenue and customer satisfaction across busy stores.",
  age: "28",
  height: "5 ft 7 in",
  family: "Father: retired teacher · Mother: homemaker",
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

const stepLabels = (root) =>
  Array.from(root.querySelectorAll(".pf-step-label")).map((el) => el.textContent);

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
  it("renders the six resume steps with the first one active", () => {
    render(baseProps("resume"));

    expect(stepLabels(container)).toEqual([
      "Heading",
      "Work history",
      "Education",
      "Skills",
      "Summary",
      "Finalize",
    ]);
    expect(container.querySelector(".pf-step--active .pf-step-label").textContent).toBe("Heading");
    expect(container.querySelector(".pf-question").textContent).toMatch(/contact you\?/);
    expect(container.querySelector(".pf-step-count").textContent).toBe("Step 1 of 6 · Heading");
  });

  it("fills the rail progress bar from the required fields", () => {
    render(baseProps("resume"));

    const bar = container.querySelector(".pf-progress");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(container.querySelector(".pf-progress i").style.width).toBe("100%");
    expect(container.querySelectorAll(".pf-step--done")).toHaveLength(5);
  });

  it("paints the live preview from the form data", () => {
    render(baseProps("resume"));

    const paper = container.querySelector(".pf-pv");
    expect(paper.className).toContain("pf-pv--modern");
    expect(paper.querySelector("h3").textContent).toBe("Saavi Patel");
    expect(paper.querySelector(".pf-pv-role").textContent).toBe("Retail Sales Associate");
    expect(paper.textContent).toContain("Increased store revenue 22%");
    expect(container.querySelectorAll(".pf-pv-photo img")).toHaveLength(0);
    expect(container.querySelector(".pf-pv-photo").textContent).toBe("SP");
  });

  it("reports a recruiter signal with a coaching tip", () => {
    render(baseProps("resume"));

    const score = Number(container.querySelector(".pf-signal-score").textContent);
    expect(score).toBeGreaterThan(50);
    expect(container.querySelector(".pf-signal-tip").textContent).toMatch(/Next best move:/);
    expect(container.querySelectorAll(".pf-meter")).toHaveLength(3);
  });

  it("advances and rewinds with the nav buttons", () => {
    render(baseProps("resume"));

    const next = () => container.querySelector(".pf-nav .pf-btn.primary");
    click(next());
    expect(container.querySelector(".pf-question").textContent).toBe(
      "What have you actually shipped?",
    );
    expect(container.querySelector(".pf-textarea.lg").value).toContain("22%");

    click(container.querySelector(".pf-nav .pf-btn.ghost"));
    expect(container.querySelector(".pf-question").textContent).toMatch(/contact you\?/);
  });

  it("jumps to a step from the rail", () => {
    render(baseProps("resume"));

    const skillsStep = Array.from(container.querySelectorAll(".pf-step button")).find((button) =>
      button.textContent.includes("Skills"),
    );
    click(skillsStep);

    expect(container.querySelector(".pf-step-count").textContent).toBe("Step 4 of 6 · Skills");
    expect(container.querySelector(".pf-chip-label")).toBeTruthy();
  });

  it("keeps the preview and progress in sync while typing", () => {
    render(baseProps("resume", { name: "" }));

    // The heading step needs all four contact fields, so an empty name alone
    // leaves one of six steps unfinished.
    expect(container.querySelector(".pf-progress").getAttribute("aria-valuenow")).toBe("83");
    expect(container.querySelector(".pf-pv h3").textContent).toBe("Your Name");

    type(container.querySelector("#pf-name"), "Ravi Kumar");

    expect(container.querySelector(".pf-pv h3").textContent).toBe("Ravi Kumar");
    expect(container.querySelector(".pf-progress").getAttribute("aria-valuenow")).toBe("100");
  });

  it("shows the layout picker and review on the final step", () => {
    render(baseProps("resume"));

    const finalize = Array.from(container.querySelectorAll(".pf-step button")).find((button) =>
      button.textContent.includes("Finalize"),
    );
    click(finalize);

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

  it("swaps work history for biodata details on the biodata type", () => {
    render(baseProps("biodata"));

    expect(stepLabels(container)).toEqual([
      "Heading",
      "Personal",
      "Education",
      "Skills",
      "Summary",
      "Finalize",
    ]);

    const personal = Array.from(container.querySelectorAll(".pf-step button")).find((button) =>
      button.textContent.includes("Personal"),
    );
    click(personal);

    expect(container.querySelector("#pf-age").value).toBe("28");
    expect(container.querySelector("#pf-height").value).toBe("5 ft 7 in");
    expect(container.querySelector("#pf-family").value).toContain("retired teacher");
    expect(container.querySelector(".pf-pv").textContent).toContain("Family Background");
  });

  it("separates blocking gaps from recommended ones", () => {
    render(baseProps("resume", { skills: "", summary: "" }));

    const finalize = Array.from(container.querySelectorAll(".pf-step button")).find((button) =>
      button.textContent.includes("Finalize"),
    );
    click(finalize);

    // skills blocks the save; the summary is only recommended.
    expect(container.querySelector(".pf-checklist .pf-check.miss").textContent).toMatch(
      /Still needed to save: skills/,
    );
    expect(container.querySelector(".pf-checklist .pf-check.soft").textContent).toMatch(
      /Worth adding: Summary/,
    );
  });
});
