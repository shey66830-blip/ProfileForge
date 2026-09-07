import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: String,
      required: true,
    },
    jobTitle: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["saved", "applied", "interview", "rejected", "offered", "accepted"],
      default: "saved",
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, jobId: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
