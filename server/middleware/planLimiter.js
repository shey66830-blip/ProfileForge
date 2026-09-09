import Usage from "../models/Usage.js";

const PLAN_LIMITS = {
  free: { aiEdits: 3, pdfExports: 5, tailoring: 0, coverLetter: 2 },
  premium: { aiEdits: 50, pdfExports: 999, tailoring: 10, coverLetter: 20 },
  pro: { aiEdits: 9999, pdfExports: 9999, tailoring: 9999, coverLetter: 9999 },
};

function needsReset(usage) {
  const now = new Date();
  const last = new Date(usage.lastResetDate);
  return now.toDateString() !== last.toDateString();
}

async function getOrCreateUsage(userId) {
  let usage = await Usage.findOne({ user: userId });
  if (!usage) usage = await Usage.create({ user: userId });
  if (needsReset(usage)) {
    usage.aiEditsUsed = 0;
    usage.pdfExportsUsed = 0;
    usage.tailoringUsed = 0;
    usage.coverLetterUsed = 0;
    usage.lastResetDate = new Date();
    await usage.save();
  }
  return usage;
}

export function checkLimit(feature) {
  return async (req, res, next) => {
    try {
      const plan = req.user.plan || "free";
      if (plan === "pro") return next();

      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      const usage = await getOrCreateUsage(req.user._id);
      const used = usage[feature + "Used"] || 0;
      const limit = limits[feature] || 0;

      if (used >= limit) {
        return res.status(403).json({
          ok: false,
          message: `Daily limit reached for this feature (${plan} plan: ${limit}/day). Upgrade for more.`,
          limit,
          used,
          plan,
          upgrade: plan === "free" ? "premium" : "pro",
        });
      }

      req.usage = usage;
      req.featureLimit = { used, limit, remaining: limit - used };
      next();
    } catch {
      next();
    }
  };
}

export async function incrementUsage(userId, feature) {
  const usage = await getOrCreateUsage(userId);
  usage[feature + "Used"] = (usage[feature + "Used"] || 0) + 1;
  await usage.save();
  return usage;
}

export async function getUsage(userId) {
  const usage = await getOrCreateUsage(userId);
  return usage;
}

export { PLAN_LIMITS };
