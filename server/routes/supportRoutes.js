import express from "express";
import { createTicket, listTickets } from "../controllers/supportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePlan } from "../middleware/planGate.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const ticketSchema = z.object({
  subject: z.string().min(3, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

const router = express.Router();

// Priority Support is a Pro feature.
router.post("/tickets", protect, requirePlan("pro"), validate(ticketSchema), createTicket);
router.get("/tickets", protect, requirePlan("pro"), listTickets);

export default router;
