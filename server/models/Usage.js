import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    aiEditsUsed: { type: Number, default: 0 },
    pdfExportsUsed: { type: Number, default: 0 },
    tailoringUsed: { type: Number, default: 0 },
    coverLetterUsed: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Usage", usageSchema);
