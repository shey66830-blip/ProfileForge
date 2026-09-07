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
    plan: { type: String, enum: ["free","premium","pro"], default: "free" },
    premium: {
      type: Boolean,
      default: false,
    },
    premiumExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);