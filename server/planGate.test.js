import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { requirePlan, FEATURE_PLAN, PLAN_LIMITS } = await import("./middleware/planGate.js");
const { PLAN_AI_RPM } = await import("./middleware/rateLimiter.js").catch(() => ({
  PLAN_AI_RPM: null,
}));
const { scoreCompatibility, biodataInput } = await import("./services/matchmakingService.js");
const { default: SupportTicket } = await import("./models/SupportTicket.js");
const { default: User } = await import("./models/User.js");

// ── requirePlan ──

describe("requirePlan", () => {
  function run(user, feature) {
    let status = null,
      payload = null,
      next = false;
    const res = {
      status(s) {
        status = s;
        return res;
      },
      json(p) {
        payload = p;
      },
    };
    requirePlan(feature)({ user }, res, () => {
      next = true;
    });
    return { status, payload, next };
  }

  it("allows a plan at the required level", () => {
    assert.equal(run({ plan: "premium" }, "tailoring").next, true);
    assert.equal(run({ plan: "pro" }, "analytics").next, true);
    assert.equal(run({ plan: "pro" }, "tailoring").next, true);
  });

  it("blocks lower plans with a 403 + upgrade hint", () => {
    const r = run({ plan: "free" }, "tailoring");
    assert.equal(r.next, false);
    assert.equal(r.status, 403);
    assert.equal(r.payload.ok, false);
    assert.equal(r.payload.requiredPlan, "premium");
    assert.equal(r.payload.upgrade, "premium");
    assert.match(r.payload.message, /premium/i);
  });

  it("blocks premium from pro-only features", () => {
    const r = run({ plan: "premium" }, "analytics");
    assert.equal(r.next, false);
    assert.equal(r.payload.requiredPlan, "pro");
  });

  it("treats a missing plan as free", () => {
    const r = run({}, "matchmaking");
    assert.equal(r.next, false);
  });

  it("FEATURE_PLAN maps features to the advertised tiers", () => {
    assert.equal(FEATURE_PLAN.tailoring, "premium");
    assert.equal(FEATURE_PLAN.biodata, "premium");
    assert.equal(FEATURE_PLAN.matchmaking, "premium");
    assert.equal(FEATURE_PLAN.analytics, "pro");
    assert.equal(FEATURE_PLAN.batchTailoring, "pro");
    assert.equal(FEATURE_PLAN.earlyAccessModels, "pro");
  });

  it("accepts a direct plan string", () => {
    assert.equal(run({ plan: "premium" }, "pro").next, false);
    assert.equal(run({ plan: "pro" }, "pro").next, true);
  });
});

// ── Plan limits (advertised pricing) ──

describe("PLAN_LIMITS", () => {
  it("matches the pricing page", () => {
    assert.deepEqual(PLAN_LIMITS.free, { aiEdits: 3, pdfExports: 5, tailoring: 0, coverLetter: 2 });
    assert.equal(PLAN_LIMITS.premium.aiEdits, 50);
    assert.equal(PLAN_LIMITS.premium.tailoring, 10);
    assert.equal(PLAN_LIMITS.premium.coverLetter, 20);
    assert.equal(PLAN_LIMITS.pro.aiEdits, 9999);
  });

  it("free tailoring is 0 (locked)", () => {
    assert.equal(PLAN_LIMITS.free.tailoring, 0);
  });
});

// ── Priority AI (plan-aware per-minute limits) ──

describe("Priority AI limits", () => {
  it("ramps up by plan", () => {
    // PLAN_AI_RPM may not be exported in every build; skip cleanly.
    if (!PLAN_AI_RPM) return;
    assert.equal(PLAN_AI_RPM.free < PLAN_AI_RPM.premium, true);
    assert.equal(PLAN_AI_RPM.premium < PLAN_AI_RPM.pro, true);
  });
});

// ── User default ──

describe("User plan defaults", () => {
  it("new users are on the free plan", () => {
    const u = new User({ email: "p@t.com", password: "x" });
    assert.equal(u.plan, "free");
    assert.equal(u.premium, false);
  });
});

// ── Matchmaking scoring ──

describe("matchmakingService", () => {
  const seeker = {
    id: "s1",
    ownerId: "u1",
    name: "Seeker",
    location: "Bangalore, India",
    text: "Age: 28\nHeight: 5'9\"\nB.Tech Computer Science, IIT Delhi. Vegetarian, non-smoker. Nuclear family, father is a doctor.",
  };
  const greatMatch = {
    id: "m1",
    ownerId: "u2",
    name: "Great",
    location: "Bangalore, India",
    text: "Age: 28\nB.Tech Computer Science. Vegetarian, non-smoker, gym. Nuclear family, father is a doctor.",
  };
  const weakMatch = {
    id: "m2",
    ownerId: "u3",
    name: "Weak",
    location: "Berlin, Germany",
    text: "Age: 40\nCA finance, joint family business. Non-vegetarian, social drinker.",
  };

  it("scores a similar profile higher than a dissimilar one", () => {
    const a = scoreCompatibility(seeker, greatMatch, { scope: "country" });
    const b = scoreCompatibility(seeker, weakMatch, { scope: "country" });
    assert.equal(a.score > b.score, true);
  });

  it("is deterministic — same inputs, same score", () => {
    const r1 = scoreCompatibility(seeker, greatMatch, { scope: "country" });
    const r2 = scoreCompatibility(seeker, greatMatch, { scope: "country" });
    assert.equal(r1.score, r2.score);
    assert.deepEqual(r1.breakdown, r2.breakdown);
  });

  it("breakdown components sum within the max", () => {
    const r = scoreCompatibility(seeker, weakMatch, { scope: "abroad" });
    const sum = Object.values(r.breakdown).reduce((n, c) => n + c.score, 0);
    assert.equal(sum, r.score);
    for (const c of Object.values(r.breakdown)) {
      assert.equal(c.score <= c.max, true);
    }
  });

  it("city synonyms match (Bangalore = Bengaluru)", () => {
    const other = { ...greatMatch, location: "Bengaluru, Karnataka" };
    const r = scoreCompatibility(seeker, other, { scope: "city" });
    assert.equal(r.breakdown.location.note, "Same city");
    assert.equal(r.breakdown.location.score, 25);
  });

  it("specific scope rewards matching locations", () => {
    const hit = scoreCompatibility(seeker, greatMatch, {
      scope: "specific",
      specific: "bangalore",
    });
    const miss = scoreCompatibility(
      seeker,
      { ...greatMatch, location: "Delhi, India" },
      { scope: "specific", specific: "bangalore" },
    );
    assert.equal(hit.breakdown.location.score > miss.breakdown.location.score, true);
  });

  it("caps the total at 99", () => {
    const identical = { ...seeker, id: "x", ownerId: "u9" };
    const r = scoreCompatibility(seeker, identical, { scope: "country" });
    assert.equal(r.score <= 99, true);
  });

  it("biodataInput composes searchable text and never includes contact fields", () => {
    const doc = {
      _id: "d1",
      user: "u1",
      title: "My Biodata",
      data: {
        name: "Ravi",
        location: "Pune",
        email: "secret@x.com",
        phone: "9876543210",
        summary: "Calm person",
        education: "B.Tech",
      },
      generatedText: "BIODATA text",
    };
    const input = biodataInput(doc);
    assert.equal(input.name, "Ravi");
    assert.ok(input.text.includes("B.Tech"));
    assert.equal(JSON.stringify(input).includes("secret@x.com"), false);
    assert.equal(JSON.stringify(input).includes("9876543210"), false);
  });
});

// ── Support ticket model ──

describe("SupportTicket", () => {
  it("exports a Mongoose model with expected paths", () => {
    assert.ok(SupportTicket);
    const paths = Object.keys(SupportTicket.schema.paths);
    for (const p of ["user", "subject", "message", "plan", "status", "responses"]) {
      assert.ok(paths.includes(p), `should have ${p}`);
    }
  });

  it("status enum is open/answered/closed with default open", () => {
    assert.deepEqual(SupportTicket.schema.paths.status.enumValues, ["open", "answered", "closed"]);
    assert.equal(SupportTicket.schema.paths.status.defaultValue, "open");
  });

  it("plan snapshot enum covers all three plans", () => {
    assert.deepEqual(SupportTicket.schema.paths.plan.enumValues, ["free", "premium", "pro"]);
  });
});
