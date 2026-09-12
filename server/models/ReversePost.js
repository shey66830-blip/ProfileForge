import mongoose from "mongoose";

// ── Reverse Job Board ──────────────────────────────────────────────
// The flip of a normal job board: instead of companies posting jobs,
// workers post "here's exactly what I want to work on and why", and
// companies (other users of the platform) apply to hire them.

const reversePostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── The pitch ──
    headline: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200, // "what I want to work on", one line
    },
    why: {
      type: String,
      trim: true,
      maxlength: 5000, // the "and why" — motivation, standards, goals
    },
    skills: {
      type: [String],
      default: [],
      set: (skills) =>
        Array.isArray(skills)
          ? [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))].slice(0, 40)
          : [],
    },

    // ── Constraints (what the worker requires of the job) ──
    workMode: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "any"],
      default: "any",
    },
    locations: {
      type: [String],
      default: [],
    },
    openToRelocate: { type: Boolean, default: false },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "any"],
      default: "any",
    },
    expectedSalary: { type: String, default: "", maxlength: 100 },
    availability: { type: String, default: "", maxlength: 100 }, // e.g. "Immediately", "From March 2027"
    portfolioUrl: { type: String, default: "", maxlength: 500 },

    // ── Lifecycle ──
    // draft: only visible to the owner
    // published: visible on the public board
    // paused: hidden from the board but kept (temporary unavailability)
    // closed: no longer accepting inquiries
    status: {
      type: String,
      enum: ["draft", "published", "paused", "closed"],
      default: "draft",
    },

    // Denormalized count so the board can sort by demand without a lookup.
    inquiryCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One post per user — this is "your ad", not a list of ads.
reversePostSchema.index({ user: 1 }, { unique: true });

// Board filters / sorting.
reversePostSchema.index({ status: 1, updatedAt: -1 });
reversePostSchema.index({ skills: 1 });

// Whitelist of fields that may appear in a public (board) response.
// Never leak the owner's account email — contact happens via inquiries.
export function toPublicPost(post) {
  if (!post) return null;
  const owner = typeof post.user === "object" && post.user !== null ? post.user : null;
  return {
    _id: post._id,
    headline: post.headline,
    why: post.why,
    skills: post.skills,
    workMode: post.workMode,
    locations: post.locations,
    openToRelocate: post.openToRelocate,
    employmentType: post.employmentType,
    expectedSalary: post.expectedSalary,
    availability: post.availability,
    portfolioUrl: post.portfolioUrl,
    status: post.status,
    inquiryCount: post.inquiryCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    ownerName: owner ? owner.username || owner.name || "Anonymous" : "Anonymous",
  };
}

export default mongoose.model("ReversePost", reversePostSchema);
