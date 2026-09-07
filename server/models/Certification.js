import mongoose from "mongoose";

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    provider: { type: String, required: true },
    abbrev: { type: String, default: "" },
    category: { type: String, default: "General" },
    skills: [{ type: String }],
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    examFee: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    validityMonths: { type: Number, default: 24 },
    description: { type: String, default: "" },
    recommendedFor: [{ type: String }],
    studyResources: [
      {
        title: { type: String },
        url: { type: String },
        type: { type: String, enum: ["course", "practice", "doc"], default: "course" },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

certificationSchema.index({ skills: 1 });
certificationSchema.index({ category: 1 });
certificationSchema.index({ name: "text", description: "text" });

export default mongoose.model("Certification", certificationSchema);
