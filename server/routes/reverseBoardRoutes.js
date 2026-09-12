import express from "express";
import {
  getMyPost, upsertMyPost, setPostStatus,
  getBoard,
  sendInquiry, getMyInquiries, getSentInquiries, respondToInquiry,
} from "../controllers/reverseBoardController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  reversePostSchema, reverseInquirySchema, reverseInquiryActionSchema, validate,
} from "../middleware/validate.js";

const router = express.Router();

// Everything requires login — the board itself is login-gated too,
// matching the rest of the app (all job/application surfaces are protected).
router.use(protect);

// My post
router.get("/me", getMyPost);
router.put("/me", validate(reversePostSchema), upsertMyPost);
router.post("/me/status/:status", setPostStatus);

// Public board (login-gated)
router.get("/board", getBoard);

// Inquiries
router.post("/inquiries", validate(reverseInquirySchema), sendInquiry);
router.get("/inquiries/received", getMyInquiries);
router.get("/inquiries/sent", getSentInquiries);
router.post("/inquiries/:id/respond", validate(reverseInquiryActionSchema), respondToInquiry);

export default router;
