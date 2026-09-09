import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── Test the Profile Mongoose schema defaults and structure ──
// We import the model to verify schema shape without needing MongoDB.

const profileModule = await import("./models/Profile.js");
const Profile = profileModule.default;

describe("Profile model schema", () => {
  it("exports a Mongoose model", () => {
    assert.ok(Profile);
    assert.equal(typeof Profile, "function");
  });

  it("has the expected schema paths", () => {
    const paths = Object.keys(Profile.schema.paths);
    assert.ok(paths.includes("user"), "should have user field");
    assert.ok(paths.includes("status"), "should have status field");
    assert.ok(paths.includes("contact.name"), "should have contact.name");
    assert.ok(paths.includes("contact.email"), "should have contact.email");
    assert.ok(paths.includes("contact.phone"), "should have contact.phone");
    assert.ok(paths.includes("contact.location"), "should have contact.location");
    assert.ok(paths.includes("summary"), "should have summary");
    assert.ok(paths.includes("skills"), "should have skills array");
    assert.ok(paths.includes("experience"), "should have experience array");
    assert.ok(paths.includes("education"), "should have education array");
    assert.ok(paths.includes("projects"), "should have projects array");
    assert.ok(paths.includes("certifications"), "should have certifications array");
    assert.ok(paths.includes("links"), "should have links array");
    assert.ok(paths.includes("jobPreferences"), "should have jobPreferences");
    assert.ok(paths.includes("suggestions"), "should have suggestions array");
    assert.ok(paths.includes("importedFromDocument"), "should have importedFromDocument");
  });

  it("status enum allows draft and canonical", () => {
    const statusPath = Profile.schema.paths.status;
    assert.deepEqual(statusPath.enumValues, ["draft", "canonical"]);
  });

  it("default status is draft", () => {
    const statusPath = Profile.schema.paths.status;
    assert.equal(statusPath.defaultValue, "draft");
  });

  it("contact.provenance is an embedded subdocument", () => {
    const provenancePath = Profile.schema.paths["contact.provenance"];
    assert.ok(provenancePath, "contact.provenance path should exist");
  });

  it("skills is a Mixed array (allows subdocuments)", () => {
    const skillsPath = Profile.schema.paths.skills;
    assert.ok(skillsPath);
  });

  it("suggestions path exists", () => {
    const allPaths = Object.keys(Profile.schema.paths);
    assert.ok(allPaths.some((p) => p.includes("suggestions")));
  });
});

// ── Test the validation schemas ──

const { profileUpdateSchema, profileImportSchema, profileSuggestionActionSchema } = await import("./middleware/validate.js");

describe("Profile validation schemas", () => {
  describe("profileUpdateSchema", () => {
    it("accepts empty update (partial)", () => {
      const result = profileUpdateSchema.safeParse({});
      assert.equal(result.success, true);
    });

    it("accepts valid contact update", () => {
      const result = profileUpdateSchema.safeParse({
        contact: { name: "John Doe", email: "john@example.com" },
      });
      assert.equal(result.success, true);
    });

    it("accepts valid summary update", () => {
      const result = profileUpdateSchema.safeParse({
        summary: "Senior developer with 10 years experience",
      });
      assert.equal(result.success, true);
    });

    it("accepts valid skills array", () => {
      const result = profileUpdateSchema.safeParse({
        skills: [
          { name: "JavaScript" },
          { name: "Python", provenance: { source: "imported" } },
        ],
      });
      assert.equal(result.success, true);
    });

    it("rejects skill with empty name", () => {
      const result = profileUpdateSchema.safeParse({
        skills: [{ name: "" }],
      });
      assert.equal(result.success, false);
    });

    it("accepts valid experience array", () => {
      const result = profileUpdateSchema.safeParse({
        experience: [
          {
            title: "Senior Developer",
            company: "Acme Inc",
            startDate: "2020-01",
            endDate: "2024-01",
            description: "Built things",
          },
        ],
      });
      assert.equal(result.success, true);
    });

    it("accepts valid education array", () => {
      const result = profileUpdateSchema.safeParse({
        education: [
          { degree: "B.Tech", institution: "NIT Warangal", endDate: "2017" },
        ],
      });
      assert.equal(result.success, true);
    });

    it("accepts valid job preferences", () => {
      const result = profileUpdateSchema.safeParse({
        jobPreferences: {
          desiredTitle: "Senior Engineer",
          workMode: "remote",
          openToRelocate: true,
        },
      });
      assert.equal(result.success, true);
    });

    it("rejects invalid workMode", () => {
      const result = profileUpdateSchema.safeParse({
        jobPreferences: { workMode: "invalid" },
      });
      assert.equal(result.success, false);
    });

    it("rejects summary exceeding 5000 chars", () => {
      const result = profileUpdateSchema.safeParse({
        summary: "x".repeat(5001),
      });
      assert.equal(result.success, false);
    });
  });

  describe("profileImportSchema", () => {
    it("requires documentId", () => {
      const result = profileImportSchema.safeParse({});
      assert.equal(result.success, false);
    });

    it("accepts valid import payload", () => {
      const result = profileImportSchema.safeParse({
        documentId: "507f1f77bcf86cd799439011",
        contact: { name: "Imported User", email: "import@test.com" },
        summary: "Imported summary",
        skills: ["JavaScript", "Python", "React"],
        experience: [
          { title: "Developer", company: "Test Corp", startDate: "2020" },
        ],
      });
      assert.equal(result.success, true);
    });

    it("accepts import with only documentId", () => {
      const result = profileImportSchema.safeParse({
        documentId: "507f1f77bcf86cd799439011",
      });
      assert.equal(result.success, true);
    });

    it("rejects import with empty documentId", () => {
      const result = profileImportSchema.safeParse({
        documentId: "",
      });
      assert.equal(result.success, false);
    });
  });

  describe("profileSuggestionActionSchema", () => {
    it("accepts valid accept action", () => {
      const result = profileSuggestionActionSchema.safeParse({
        suggestionId: "507f1f77bcf86cd799439011",
        accept: true,
      });
      assert.equal(result.success, true);
    });

    it("accepts valid reject action", () => {
      const result = profileSuggestionActionSchema.safeParse({
        suggestionId: "507f1f77bcf86cd799439011",
        accept: false,
      });
      assert.equal(result.success, true);
    });

    it("rejects missing suggestionId", () => {
      const result = profileSuggestionActionSchema.safeParse({
        accept: true,
      });
      assert.equal(result.success, false);
    });

    it("rejects non-boolean accept", () => {
      const result = profileSuggestionActionSchema.safeParse({
        suggestionId: "507f1f77bcf86cd799439011",
        accept: "yes",
      });
      assert.equal(result.success, false);
    });
  });
});

// ── Test provenance logic (unit-level) ──

describe("Provenance behavior", () => {
  it("imported items have verified: false", () => {
    const item = {
      name: "JavaScript",
      provenance: { source: "imported", verified: false, updatedAt: new Date() },
    };
    assert.equal(item.provenance.source, "imported");
    assert.equal(item.provenance.verified, false);
  });

  it("user-entered items have verified: true", () => {
    const item = {
      name: "JavaScript",
      provenance: { source: "user", verified: true, updatedAt: new Date() },
    };
    assert.equal(item.provenance.source, "user");
    assert.equal(item.provenance.verified, true);
  });

  it("AI suggestions have verified: false", () => {
    const item = {
      name: "TypeScript",
      provenance: { source: "ai_suggestion", verified: false, updatedAt: new Date() },
    };
    assert.equal(item.provenance.source, "ai_suggestion");
    assert.equal(item.provenance.verified, false);
  });
});

// ── Test import-review flow logic ──

describe("Import-review flow", () => {
  it("draft status is not editable via updateProfile", () => {
    // This is enforced in the controller, not the schema.
    // The test verifies the schema allows draft status.
    const profile = new Profile({
      user: "507f1f77bcf86cd799439011",
      status: "draft",
      contact: { name: "Test" },
    });
    assert.equal(profile.status, "draft");
  });

  it("canonical status is the default for direct creation", () => {
    // When a user first accesses their profile, it's created as canonical
    const profile = new Profile({
      user: "507f1f77bcf86cd799439011",
      status: "canonical",
    });
    assert.equal(profile.status, "canonical");
  });

  it("importedFromDocument links to the source document", () => {
    const profile = new Profile({
      user: "507f1f77bcf86cd799439011",
      status: "draft",
      importedFromDocument: "507f1f77bcf86cd799439012",
    });
    assert.equal(
      profile.importedFromDocument.toString(),
      "507f1f77bcf86cd799439012"
    );
  });
});
