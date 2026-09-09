import mongoose from "mongoose";

/**
 * Immutable document version — stores a snapshot of a document at a point
 * in time. Used for the tailoring flow so the user can always revert to
 * the base version or compare against previous tailored versions.
 *
 * Versions are append-only: once created, they are never modified.
 */
const documentVersionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    // "base" = the original document before tailoring
    // "tailored" = a version produced by the AI tailoring service
    versionType: {
      type: String,
      enum: ["base", "tailored"],
      required: true,
    },
    // Snapshot of the document content at this version
    title: { type: String, default: "" },
    type: { type: String, enum: ["resume", "cv", "biodata"], required: true },
    generatedText: { type: String, default: "" },
    data: { type: Object, default: {} },
    // For tailored versions: the job description used for tailoring
    jobDescription: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    jobCompany: { type: String, default: "" },
    // The suggestions that were applied to produce this version
    appliedSuggestions: [{ type: mongoose.Schema.Types.Mixed }],
    // Version number (1 = base, 2+ = tailored)
    versionNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Index for efficient lookup by document + version type
documentVersionSchema.index({ document: 1, versionType: 1 });
documentVersionSchema.index({ user: 1, document: 1 });

export default mongoose.model("DocumentVersion", documentVersionSchema);
