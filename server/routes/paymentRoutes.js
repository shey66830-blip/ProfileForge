import express from "express";
import {
  createOrder, verifyPayment, checkPremium,
  getUsage, cancelSubscription, getPaymentHistory, mockTestPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/premium-status", protect, checkPremium);
router.get("/usage", protect, getUsage);
router.post("/cancel", protect, cancelSubscription);
router.get("/history", protect, getPaymentHistory);
router.post("/mock-test", protect, mockTestPayment);

export default router;
