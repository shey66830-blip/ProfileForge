import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { default: ReversePost, toPublicPost } = await import("./models/ReversePost.js");
const { default: ReverseInquiry, toOwnerView } = await import("./models/ReverseInquiry.js");
const { reversePostSchema, reverseInquirySchema, reverseInquiryActionSchema } = await import("./middleware/validate.js");

// ── ReversePost model schema ──

describe("ReversePost schema", () => {
  it("exports a Mongoose model", () => {
    assert.ok(ReversePost);
    assert.equal(typeof ReversePost, "function");
  });

  it("has the expected top-level paths", () => {
    const paths = Object.keys(ReversePost.schema.paths);
    for (const p of ["user", "headline", "why", "skills", "workMode", "locations",
      "openToRelocate", "employmentType", "expectedSalary", "availability",
      "portfolioUrl", "status", "inquiryCount"]) {
      assert.ok(paths.includes(p), `should have ${p}`);
    }
  });

  it("status enum is draft/published/paused/closed", () => {
    assert.deepEqual(ReversePost.schema.paths.status.enumValues,
      ["draft", "published", "paused", "closed"]);
  });

  it("default status is draft", () => {
    assert.equal(ReversePost.schema.paths.status.defaultValue, "draft");
  });

  it("workMode enum covers remote/hybrid/onsite/any", () => {
    assert.deepEqual(ReversePost.schema.paths.workMode.enumValues,
      ["remote", "hybrid", "onsite", "any"]);
  });

  it("employmentType enum covers the 5 values", () => {
    assert.deepEqual(ReversePost.schema.paths.employmentType.enumValues,
      ["full_time", "part_time", "contract", "internship", "any"]);
  });

  it("headline is required", () => {
    assert.equal(ReversePost.schema.paths.headline.isRequired, true);
  });

  it("user is required", () => {
    assert.equal(ReversePost.schema.paths.user.isRequired, true);
  });

  it("has a unique index on user (one post per worker)", () => {
    const indexes = ReversePost.schema.indexes();
    const userIndex = indexes.find(([spec]) => spec.user === 1);
    assert.ok(userIndex, "user index should exist");
    assert.equal(userIndex[1].unique, true);
  });

  it("skills setter dedupes, trims, and caps at 40", () => {
    // Exercise the setter through a document instance (no DB needed).
    const doc = new ReversePost({ user: "507f1f77bcf86cd799439011", headline: "x" });
    doc.skills = ["  React ", "react", "", "Node.js", " React"];
    assert.deepEqual(doc.skills, ["React", "react", "Node.js"]);
    doc.skills = "not-an-array";
    assert.deepEqual(doc.skills, []);
  });
});

// ── ReverseInquiry model schema ──

describe("ReverseInquiry schema", () => {
  it("exports a Mongoose model", () => {
    assert.ok(ReverseInquiry);
  });

  it("has the expected paths", () => {
    const paths = Object.keys(ReverseInquiry.schema.paths);
    for (const p of ["post", "fromUser", "message", "company", "role", "status", "respondedAt"]) {
      assert.ok(paths.includes(p), `should have ${p}`);
    }
  });

  it("status enum is new/accepted/declined", () => {
    assert.deepEqual(ReverseInquiry.schema.paths.status.enumValues,
      ["new", "accepted", "declined"]);
  });

  it("default status is new", () => {
    assert.equal(ReverseInquiry.schema.paths.status.defaultValue, "new");
  });

  it("message is required", () => {
    assert.equal(ReverseInquiry.schema.paths.message.isRequired, true);
  });

  it("has a unique index on (post, fromUser) — one inquiry per user per post", () => {
    const indexes = ReverseInquiry.schema.indexes();
    const idx = indexes.find(([spec]) => spec.post === 1 && spec.fromUser === 1);
    assert.ok(idx, "compound index should exist");
    assert.equal(idx[1].unique, true);
  });
});

// ── Public/owner view sanitization ──

describe("toPublicPost", () => {
  const base = {
    _id: "p1", headline: "H", why: "W", skills: ["react"], workMode: "remote",
    locations: ["EU"], openToRelocate: true, employmentType: "full_time",
    expectedSalary: "120k", availability: "Now", portfolioUrl: "https://x.dev",
    status: "published", inquiryCount: 3, createdAt: "d1", updatedAt: "d2",
    user: { email: "secret@example.com", passwordHash: "x", username: "dev1", name: "Dev One" },
  };

  it("exposes board-safe fields", () => {
    const pub = toPublicPost(base);
    assert.equal(pub.headline, "H");
    assert.equal(pub.ownerName, "dev1");
    assert.equal(pub.inquiryCount, 3);
  });

  it("never leaks the owner's email or password", () => {
    const json = JSON.stringify(toPublicPost(base));
    assert.ok(!json.includes("secret@example.com"));
    assert.ok(!json.includes("passwordHash"));
    assert.ok(!("user" in toPublicPost(base)));
  });

  it("falls back to Anonymous without a populated owner", () => {
    assert.equal(toPublicPost({ ...base, user: "id-string" }).ownerName, "Anonymous");
    assert.equal(toPublicPost(null), null);
  });
});

describe("toOwnerView", () => {
  it("never leaks the inquirer's account email", () => {
    const view = toOwnerView({
      _id: "i1", post: "p1", message: "hi", status: "new",
      fromUser: { email: "hr@example.com", username: "hruser", name: "HR" },
      createdAt: "d",
    });
    const json = JSON.stringify(view);
    assert.ok(!json.includes("hr@example.com"));
    assert.equal(view.company, "hruser");
  });

  it("prefers the stated company over the account name", () => {
    const view = toOwnerView({
      message: "hi", status: "new",
      fromUser: { username: "hruser" }, company: "Acme Corp",
    });
    assert.equal(view.company, "Acme Corp");
  });

  it("returns null for missing inquiry", () => {
    assert.equal(toOwnerView(null), null);
  });
});

// ── Validation schemas ──

describe("reversePostSchema", () => {
  it("accepts a minimal valid post", () => {
    const r = reversePostSchema.safeParse({ headline: "Senior DBA seeking remote work" });
    assert.equal(r.success, true);
  });

  it("requires headline of at least 4 chars", () => {
    assert.equal(reversePostSchema.safeParse({ headline: "hi" }).success, false);
    assert.equal(reversePostSchema.safeParse({}).success, false);
  });

  it("rejects an invalid status", () => {
    assert.equal(reversePostSchema.safeParse({ headline: "abcdef", status: "live" }).success, false);
  });

  it("rejects an invalid workMode", () => {
    assert.equal(reversePostSchema.safeParse({ headline: "abcdef", workMode: "underwater" }).success, false);
  });

  it("caps skills at 40", () => {
    const skills = Array.from({ length: 41 }, (_, i) => `s${i}`);
    assert.equal(reversePostSchema.safeParse({ headline: "abcdef", skills }).success, false);
  });

  it("accepts empty portfolioUrl but rejects a non-URL", () => {
    assert.equal(reversePostSchema.safeParse({ headline: "abcdef", portfolioUrl: "" }).success, true);
    assert.equal(reversePostSchema.safeParse({ headline: "abcdef", portfolioUrl: "not-a-url" }).success, false);
  });
});

describe("reverseInquirySchema", () => {
  it("requires postId and a message of at least 10 chars", () => {
    assert.equal(reverseInquirySchema.safeParse({ postId: "p1", message: "too short" }).success, false);
    assert.equal(reverseInquirySchema.safeParse({ message: "this is long enough" }).success, false);
  });

  it("accepts a valid inquiry", () => {
    const r = reverseInquirySchema.safeParse({ postId: "p1", message: "We would love to hire you for our platform team." });
    assert.equal(r.success, true);
  });

  it("caps message at 2000 chars", () => {
    assert.equal(reverseInquirySchema.safeParse({ postId: "p1", message: "x".repeat(2001) }).success, false);
  });
});

describe("reverseInquiryActionSchema", () => {
  it("only allows accept/decline", () => {
    assert.equal(reverseInquiryActionSchema.safeParse({ action: "accept" }).success, true);
    assert.equal(reverseInquiryActionSchema.safeParse({ action: "decline" }).success, true);
    assert.equal(reverseInquiryActionSchema.safeParse({ action: "maybe" }).success, false);
  });
});
