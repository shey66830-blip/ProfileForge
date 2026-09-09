import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { isValidTransition, getNextStatuses, VALID_TRANSITIONS } = await import("./models/Application.js");
const { applicationCreateSchema, applicationUpdateSchema, APPLICATION_STATUSES } = await import("./middleware/validate.js");

// ── Status transition tests ──

describe("isValidTransition", () => {
  it("allows saved → preparing", () => {
    assert.equal(isValidTransition("saved", "preparing").valid, true);
  });

  it("allows saved → applied", () => {
    assert.equal(isValidTransition("saved", "applied").valid, true);
  });

  it("allows saved → withdrawn", () => {
    assert.equal(isValidTransition("saved", "withdrawn").valid, true);
  });

  it("allows preparing → applied", () => {
    assert.equal(isValidTransition("preparing", "applied").valid, true);
  });

  it("allows preparing → saved (backtrack)", () => {
    assert.equal(isValidTransition("preparing", "saved").valid, true);
  });

  it("allows applied → screening", () => {
    assert.equal(isValidTransition("applied", "screening").valid, true);
  });

  it("allows applied → interview", () => {
    assert.equal(isValidTransition("applied", "interview").valid, true);
  });

  it("allows applied → rejected", () => {
    assert.equal(isValidTransition("applied", "rejected").valid, true);
  });

  it("allows screening → interview", () => {
    assert.equal(isValidTransition("screening", "interview").valid, true);
  });

  it("allows interview → offer", () => {
    assert.equal(isValidTransition("interview", "offer").valid, true);
  });

  it("allows interview → screening (loop back)", () => {
    assert.equal(isValidTransition("interview", "screening").valid, true);
  });

  it("allows offer → accepted", () => {
    assert.equal(isValidTransition("offer", "accepted").valid, true);
  });

  it("allows offer → rejected", () => {
    assert.equal(isValidTransition("offer", "rejected").valid, true);
  });

  it("allows rejected → saved (re-apply)", () => {
    assert.equal(isValidTransition("rejected", "saved").valid, true);
  });

  it("allows withdrawn → saved (re-apply)", () => {
    assert.equal(isValidTransition("withdrawn", "saved").valid, true);
  });

  it("rejects accepted → anything (terminal)", () => {
    assert.equal(isValidTransition("accepted", "interview").valid, false);
    assert.equal(isValidTransition("accepted", "rejected").valid, false);
  });

  it("rejects saved → interview (skipping steps)", () => {
    assert.equal(isValidTransition("saved", "interview").valid, false);
  });

  it("rejects saved → offer (skipping steps)", () => {
    assert.equal(isValidTransition("saved", "offer").valid, false);
  });

  it("rejects rejected → interview (must go through saved)", () => {
    assert.equal(isValidTransition("rejected", "interview").valid, false);
  });

  it("allows same-status transition (no-op)", () => {
    assert.equal(isValidTransition("applied", "applied").valid, true);
  });

  it("rejects unknown status", () => {
    assert.equal(isValidTransition("unknown", "applied").valid, false);
  });
});

describe("getNextStatuses", () => {
  it("returns valid next statuses for saved", () => {
    const next = getNextStatuses("saved");
    assert.ok(next.includes("preparing"));
    assert.ok(next.includes("applied"));
    assert.ok(next.includes("withdrawn"));
  });

  it("returns empty for accepted (terminal)", () => {
    assert.deepEqual(getNextStatuses("accepted"), []);
  });

  it("returns empty for unknown status", () => {
    assert.deepEqual(getNextStatuses("unknown"), []);
  });

  it("returns re-apply options for rejected", () => {
    const next = getNextStatuses("rejected");
    assert.ok(next.includes("saved"));
  });
});

// ── Validation schema tests ──

describe("applicationCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    const result = applicationCreateSchema.safeParse({ jobId: "job-123" });
    assert.equal(result.success, true);
  });

  it("accepts full payload with job snapshot", () => {
    const result = applicationCreateSchema.safeParse({
      jobId: "job-123",
      jobTitle: "Senior Dev",
      company: "Acme",
      status: "applied",
      notes: "Applied via LinkedIn",
      nextAction: "Follow up next week",
      followUpAt: "2025-02-01T00:00:00.000Z",
      documentId: "507f1f77bcf86cd799439011",
      jobSnapshot: {
        title: "Senior Dev",
        company: "Acme",
        location: "Remote",
        source: "Remotive",
        skills: ["JavaScript", "React"],
      },
    });
    assert.equal(result.success, true);
  });

  it("rejects missing jobId", () => {
    const result = applicationCreateSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("rejects invalid status", () => {
    const result = applicationCreateSchema.safeParse({
      jobId: "job-123",
      status: "invalid-status",
    });
    assert.equal(result.success, false);
  });

  it("accepts all valid statuses", () => {
    for (const status of APPLICATION_STATUSES) {
      const result = applicationCreateSchema.safeParse({ jobId: "job-1", status });
      assert.equal(result.success, true, `Status "${status}" should be valid`);
    }
  });
});

describe("applicationUpdateSchema", () => {
  it("accepts status update", () => {
    const result = applicationUpdateSchema.safeParse({ status: "interview" });
    assert.equal(result.success, true);
  });

  it("accepts notes update", () => {
    const result = applicationUpdateSchema.safeParse({ notes: "Updated notes" });
    assert.equal(result.success, true);
  });

  it("accepts nextAction update", () => {
    const result = applicationUpdateSchema.safeParse({ nextAction: "Send thank you email" });
    assert.equal(result.success, true);
  });

  it("accepts document linkage", () => {
    const result = applicationUpdateSchema.safeParse({
      documentId: "507f1f77bcf86cd799439011",
      resumeVersionId: "507f1f77bcf86cd799439012",
    });
    assert.equal(result.success, true);
  });

  it("rejects invalid status", () => {
    const result = applicationUpdateSchema.safeParse({ status: "bogus" });
    assert.equal(result.success, false);
  });
});

// ── VALID_TRANSITIONS completeness tests ──

describe("VALID_TRANSITIONS completeness", () => {
  it("covers all application statuses", () => {
    for (const status of APPLICATION_STATUSES) {
      assert.ok(
        status in VALID_TRANSITIONS,
        `Status "${status}" must have transition rules`
      );
    }
  });

  it("no transition references unknown statuses", () => {
    for (const [from, tos] of Object.entries(VALID_TRANSITIONS)) {
      assert.ok(APPLICATION_STATUSES.includes(from), `From-status "${from}" must be in enum`);
      for (const to of tos) {
        assert.ok(APPLICATION_STATUSES.includes(to), `To-status "${to}" (from "${from}") must be in enum`);
      }
    }
  });
});

// ── Ownership tests (unit-level) ──

const ApplicationModule = await import("./models/Application.js");
const Application = ApplicationModule.default;

describe("Application ownership", () => {
  it("schema requires user field", () => {
    const userPath = Application.schema.paths.user;
    assert.ok(userPath);
    assert.equal(userPath.isRequired, true);
  });

  it("schema requires jobId field", () => {
    const jobIdPath = Application.schema.paths.jobId;
    assert.ok(jobIdPath);
    assert.equal(jobIdPath.isRequired, true);
  });

  it("unique index on user+jobId", () => {
    const indexes = Application.schema.indexes();
    const uniquePair = indexes.find(
      (idx) => idx[0].user === 1 && idx[0].jobId === 1 && idx[1]?.unique === true
    );
    assert.ok(uniquePair, "Should have unique index on { user, jobId }");
  });
});

// ── Document version linkage tests (schema-level) ──

describe("Document version linkage", () => {
  it("schema has resumeVersionId field", () => {
    assert.ok(Application.schema.paths.resumeVersionId);
  });

  it("schema has coverLetterVersionId field", () => {
    assert.ok(Application.schema.paths.coverLetterVersionId);
  });

  it("schema has documentId field", () => {
    assert.ok(Application.schema.paths.documentId);
  });

  it("schema has jobSnapshot as nested subdocument", () => {
    // Nested subdocuments are in childSchemas, not paths
    const hasJobSnapshot = Application.schema.childSchemas.size > 0 ||
      Application.schema.paths.jobSnapshot !== undefined;
    // Check via the actual schema tree
    const tree = Application.schema.tree;
    assert.ok(tree.jobSnapshot, "jobSnapshot should be in schema tree");
  });

  it("schema has followUpAt field", () => {
    assert.ok(Application.schema.paths.followUpAt);
  });

  it("schema has nextAction field", () => {
    assert.ok(Application.schema.paths.nextAction);
  });

  it("schema has submittedAt field", () => {
    assert.ok(Application.schema.paths.submittedAt);
  });
});
