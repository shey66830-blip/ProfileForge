import Document from "../models/Document.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import Usage from "../models/Usage.js";
import Payment from "../models/Payment.js";
import { PLAN_LIMITS } from "../middleware/planGate.js";

// ── GET /api/analytics ─────────────────────────────────────────────
// Pro-only. Everything is computed from the user's own records; scoring
// is deterministic for the same underlying data.
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const [documents, applications, savedJobs, usage, payments] = await Promise.all([
      Document.find({ user: userId }).select("type title createdAt updatedAt").lean(),
      Application.find({ user: userId })
        .select("status company role jobSnapshot createdAt submittedAt followUpAt nextAction")
        .lean(),
      SavedJob.countDocuments({ user: userId }),
      Usage.findOne({ user: userId }).lean(),
      Payment.find({ user: userId })
        .select("plan amount status createdAt")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    // ── Application funnel (by status, in pipeline order) ──
    const FUNNEL = [
      "saved",
      "preparing",
      "applied",
      "screening",
      "interview",
      "offer",
      "rejected",
      "withdrawn",
      "accepted",
    ];
    const statusCounts = {};
    for (const s of FUNNEL) statusCounts[s] = 0;
    for (const a of applications) {
      if (statusCounts[a.status] !== undefined) statusCounts[a.status] += 1;
    }

    const total = applications.length;
    const appliedPlus = FUNNEL.slice(2).reduce((n, s) => n + statusCounts[s], 0);
    const interviews = statusCounts.interview + statusCounts.offer + (statusCounts.accepted || 0);
    const offers = statusCounts.offer + (statusCounts.accepted || 0);

    // Deterministic conversion rates (0 when no base to avoid NaN).
    const rate = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

    // ── Upcoming actions (follow-ups sorted by date) ──
    const upcomingFollowUps = applications
      .filter((a) => a.followUpAt && new Date(a.followUpAt) >= new Date(Date.now() - 86400000))
      .sort((a, b) => new Date(a.followUpAt) - new Date(b.followUpAt))
      .slice(0, 5)
      .map((a) => ({
        id: a._id,
        company: a.company || a.jobSnapshot?.company || "—",
        role: a.role || a.jobSnapshot?.title || "",
        followUpAt: a.followUpAt,
        nextAction: a.nextAction || "",
      }));

    // ── Document mix ──
    const documentsByType = { resume: 0, cv: 0, biodata: 0 };
    for (const d of documents) {
      if (documentsByType[d.type] !== undefined) documentsByType[d.type] += 1;
    }

    // ── AI usage vs plan limits ──
    const plan = req.user.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const used = {
      aiEdits: usage?.aiEditsUsed || 0,
      pdfExports: usage?.pdfExportsUsed || 0,
      tailoring: usage?.tailoringUsed || 0,
      coverLetter: usage?.coverLetterUsed || 0,
    };
    const usageVsLimits = Object.fromEntries(
      Object.entries(used).map(([k, v]) => [k, { used: v, limit: limits[k] ?? 0 }]),
    );

    res.json({
      ok: true,
      plan,
      totals: {
        documents: documents.length,
        applications: total,
        savedJobs,
        interviews,
        offers,
      },
      funnel: FUNNEL.map((s) => ({ status: s, count: statusCounts[s] })),
      conversion: {
        appliedToScreening: rate(
          statusCounts.screening + interviews + statusCounts.rejected,
          appliedPlus,
        ),
        screeningToInterview: rate(
          interviews,
          statusCounts.screening + interviews + statusCounts.rejected,
        ),
        interviewToOffer: rate(offers, interviews),
      },
      upcomingFollowUps,
      documentsByType,
      usageVsLimits,
      payments: payments.map((p) => ({
        plan: p.plan,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};
