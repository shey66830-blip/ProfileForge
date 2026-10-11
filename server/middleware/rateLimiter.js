import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { ok: false, message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { ok: false, message: "Too many AI requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Priority AI processing — per-plan minute limits (a Pro perk).
// Higher plans get both a higher ceiling and a fresh bucket keyed by plan,
// so an upgrade takes effect immediately.
const PLAN_AI_RPM = { free: 6, premium: 12, pro: 30 };
const planBuckets = new Map(); // "userId:minute" -> count

export function planAiLimiter(req, res, next) {
  const plan = req.user?.plan || "free";
  const max = PLAN_AI_RPM[plan] || PLAN_AI_RPM.free;
  const minute = Math.floor(Date.now() / 60000);
  const key = `${req.user._id}:${minute}`;
  const used = (planBuckets.get(key) || 0) + 1;
  planBuckets.set(key, used);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (planBuckets.size > 5000) {
    for (const k of planBuckets.keys()) {
      const kMinute = Number(k.split(":")[1]);
      if (kMinute < minute - 2) planBuckets.delete(k);
    }
  }

  if (used > max) {
    const upgradeHint =
      plan === "pro"
        ? ""
        : ` Upgrade to ${plan === "free" ? "Premium" : "Pro"} for ${plan === "free" ? PLAN_AI_RPM.premium : PLAN_AI_RPM.pro} AI requests/minute.`;
    return res.status(429).json({
      ok: false,
      message: `Priority AI limit reached (${plan} plan: ${max}/min).${upgradeHint}`,
      plan,
      limit: max,
    });
  }
  next();
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { ok: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
