import mongoose from "mongoose";

// ── Status transitions ─────────────────────────────────────────────
// Defines which status transitions are valid. The key is the current
// status; the value is an array of allowed next statuses.
// Any transition not listed is blocked.
const VALID_TRANSITIONS = {
  saved:      ["preparing", "applied", "withdrawn"],
  preparing:  ["applied", "saved", "withdrawn"],
  applied:    ["screening", "interview", "rejected", "withdrawn"],
  screening:  ["interview", "rejected", "withdrawn"],
  interview:  ["offer", "screening", "rejected", "withdrawn"],
  offer:      ["accepted", "rejected", "withdrawn"],
  accepted:   [], // terminal state
  rejected:   ["saved"], // can re-apply from rejected
  withdrawn:  ["saved"], // can re-apply from withdrawn
};

/**
 * Check if a status transition is valid.
 * @param {string} from - Current status
 * @param {string} to - Desired new status
 * @returns {{ valid: boolean, reason?: string }}
 */
export function isValidTransition(from, to) {
  if (from === to) return { valid: true, reason: "No change." };
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return { valid: false, reason: `Unknown current status: "${from}".` };
  if (!allowed.includes(to)) {
    return {
      valid: false,
      reason: `Cannot transition from "${from}" to "${to}". Allowed: ${allowed.join(", ") || "none (terminal state)"}.`,
    };
  }
  return { valid: true };
}

/**
 * Get all valid next statuses for a given current status.
 * @param {string} current
 * @returns {string[]}
 */
export function getNextStatuses(current) {
  return VALID_TRANSITIONS[current] || [];
}

// ── Schema ─────────────────────────────────────────────────────────

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Job identification ──
    jobId: { type: String, required: true },
    jobTitle: { type: String, default: "" },
    company: { type: String, default: "" },

    // ── Job snapshot (frozen at creation time) ──
    jobSnapshot: {
      title: { type: String, default: "" },
      company: { type: String, default: "" },
      location: { type: String, default: "" },
      source: { type: String, default: "" },
      description: { type: String, default: "" },
      salary: { type: mongoose.Schema.Types.Mixed, default: null },
      applyUrl: { type: String, default: "" },
      skills: [{ type: String }],
    },

    // ── Status with controlled transitions ──
    status: {
      type: String,
      enum: ["saved", "preparing", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn"],
      default: "saved",
    },

    // ── Timeline ──
    appliedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    followUpAt: { type: Date, default: null },

    // ── Action tracking ──
    nextAction: { type: String, default: "" },
    notes: { type: String, default: "" },

    // ── Document version linkage ──
    resumeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentVersion",
      default: null,
    },
    coverLetterVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentVersion",
      default: null,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
  },
  { timestamps: true }
);

// One application per user per job
applicationSchema.index({ user: 1, jobId: 1 }, { unique: true });
// Dashboard queries: group by status
applicationSchema.index({ user: 1, status: 1 });
// Follow-up reminders
applicationSchema.index({ user: 1, followUpAt: 1 });

export default mongoose.model("Application", applicationSchema);
export { VALID_TRANSITIONS };
