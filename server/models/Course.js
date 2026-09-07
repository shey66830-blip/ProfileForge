import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    provider: {
      type: String,
      required: true,
      enum: [
        "Scaler",
        "PW Skills",
        "Udemy",
        "Coursera",
        "edX",
        "HackerRank",
        "freeCodeCamp",
        "LinkedIn Learning",
        "ProfileForge",
      ],
    },
    providerLogo: { type: String, default: "" },
    url: { type: String, default: "#" },
    description: { type: String, default: "" },
    skills: [{ type: String }],
    category: { type: String, default: "General" },
    duration: { type: String, default: "" },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    price: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
      isFree: { type: Boolean, default: true },
    },
    thumbnail: { type: String, default: "" },
    certificationProvided: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.index({ skills: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ provider: 1 });
courseSchema.index({ title: "text", description: "text" });

export default mongoose.model("Course", courseSchema);
