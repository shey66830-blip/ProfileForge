import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 5000 },
    // Plan the user was on when opening the ticket — priority queues are
    // evaluated against this snapshot, not their (possibly downgraded) plan.
    plan: { type: String, enum: ["free", "premium", "pro"], default: "free" },
    status: { type: String, enum: ["open", "answered", "closed"], default: "open" },
    responses: [
      {
        body: { type: String, maxlength: 5000 },
        by: { type: String, default: "support" },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

supportTicketSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("SupportTicket", supportTicketSchema);
