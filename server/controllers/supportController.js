import SupportTicket from "../models/SupportTicket.js";

// ── POST /api/support/tickets ──────────────────────────────────────
export const createTicket = async (req, res) => {
  try {
    const { subject, message } = req.validatedBody;
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      message,
      plan: req.user.plan || "free",
    });
    res.json({
      ok: true,
      ticket: {
        _id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        plan: ticket.plan,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

// ── GET /api/support/tickets ───────────────────────────────────────
// Only the user's own tickets — never anyone else's.
export const listTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ ok: true, tickets });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};
