import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
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
    jobData: {
      type: Object,
      default: {},
    },
    source: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

savedJobSchema.index({ user: 1, jobId: 1 }, { unique: true });

export default mongoose.model("SavedJob", savedJobSchema);
