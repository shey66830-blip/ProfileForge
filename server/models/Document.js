import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["resume", "cv", "biodata"],
      required: true,
    },
    title: String,
    data: Object,
    generatedText: String,
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);