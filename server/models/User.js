import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    username: String,
    email: { type: String, unique: true },
    password: String,
    provider: { type: String, default: "local" },
    googleId: String,
    githubId: String,
    avatar: String,
    plan: { type: String, enum: ["free", "premium", "pro"], default: "free" },
    premium: {
      type: Boolean,
      default: false,
    },
    premiumExpiry: {
      type: Date,
      default: null,
    },
    // Hiring mode flips the Reverse Job Board into its company-side view:
    // only hiring-mode users can browse talent and apply to hire workers.
    hiringMode: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
