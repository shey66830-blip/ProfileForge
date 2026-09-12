import mongoose from "mongoose";

// ── Reverse Inquiry ────────────────────────────────────────────────
// A company/user applying to hire a worker who posted on the reverse
// board. The worker can accept (share contact) or decline each inquiry.

const reverseInquirySchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReversePost",
      required: true,
    },
    // The hiring-side user (the one applying to hire). The post owner
    // is implied via post.user and never stored here to avoid drift.
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Company name shown to the worker; defaults to the sender's name.
    company: { type: String, default: "", maxlength: 200 },
    role: { type: String, default: "", maxlength: 200 },

    // new → accepted | declined
    // accepted = the worker agreed to be contacted (contact is shared)
    // declined = the worker passed
    status: {
      type: String,
      enum: ["new", "accepted", "declined"],
      default: "new",
    },

    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One inquiry per user per post — no spam.
reverseInquirySchema.index({ post: 1, fromUser: 1 }, { unique: true });
reverseInquirySchema.index({ post: 1, createdAt: -1 });

// Whitelist of fields shown to the post owner. Never leaks the
// inquirer's account email — that stays private until accepted.
export function toOwnerView(inquiry) {
  if (!inquiry) return null;
  const sender = typeof inquiry.fromUser === "object" && inquiry.fromUser !== null ? inquiry.fromUser : null;
  return {
    _id: inquiry._id,
    post: inquiry.post,
    message: inquiry.message,
    company: inquiry.company || (sender ? sender.username || sender.name : "") || "A company",
    role: inquiry.role,
    status: inquiry.status,
    respondedAt: inquiry.respondedAt,
    createdAt: inquiry.createdAt,
  };
}

export default mongoose.model("ReverseInquiry", reverseInquirySchema);
