// Plan-based gating middleware.
//
// Single owner for "what is each plan allowed to do". Routes attach:
//   requirePlan(feature)          — hard plan gate (403 + upgrade hint)
//   checkFeatureLimit(feature)    — daily usage cap from PLAN_LIMITS
// and controllers call incrementUsage() after a successful billable action.

import { checkLimit, incrementUsage, PLAN_LIMITS } from "./planLimiter.js";

export const PLAN_LEVELS = { free: 0, premium: 1, pro: 2 };

// Central declaration of which plan tier each gated feature requires.
export const FEATURE_PLAN = {
  tailoring: "premium", // Resume Tailoring — premium 10/day, pro unlimited
  biodata: "premium", // Biodata builder — premium+ only
  matchmaking: "premium", // Matchmaking engine — premium+ only
  analytics: "pro", // Advanced analytics — pro only
  batchTailoring: "pro", // Batch resume tailoring — pro only
  earlyAccessModels: "pro", // Early-access AI models — pro only
};

export function requirePlan(feature) {
  // Accept a FEATURE_PLAN key ("tailoring") or a direct plan name ("pro").
  const required =
    typeof feature === "string"
      ? FEATURE_PLAN[feature] || (PLAN_LEVELS[feature] !== undefined ? feature : "premium")
      : feature;
  return (req, res, next) => {
    const plan = req.user?.plan || "free";
    if ((PLAN_LEVELS[plan] || 0) < (PLAN_LEVELS[required] || 0)) {
      return res.status(403).json({
        ok: false,
        message: `This feature requires a ${required} plan. Upgrade to unlock it.`,
        plan,
        requiredPlan: required,
        upgrade: required,
      });
    }
    next();
  };
}

export const checkFeatureLimit = checkLimit;
export { incrementUsage, PLAN_LIMITS };
