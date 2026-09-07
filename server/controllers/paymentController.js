import crypto from "crypto";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Usage from "../models/Usage.js";
import { PLAN_LIMITS } from "../middleware/planLimiter.js";

const PLAN_AMOUNTS = { premium: 19900, pro: 49900 };
const PLAN_DAYS = { premium: 30, pro: 30 };

function isRazorpayConfigured() {
  return process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes("xxxxxxxxxxxx");
}

// Create a Razorpay order (or mock order in test mode)
export const createOrder = async (req, res) => {
  try {
    const plan = req.body.plan || "premium";
    const amount = PLAN_AMOUNTS[plan] || PLAN_AMOUNTS.premium;

    if (isRazorpayConfigured()) {
      // Real Razorpay
      const { Razorpay } = await import("razorpay");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `receipt_${plan}_${Date.now()}`,
        notes: { userId: req.user._id.toString(), plan },
      });
      await Payment.create({ user: req.user._id, razorpayOrderId: order.id, amount, status: "created" });
      res.json({ ok: true, order: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID, plan } });
    } else {
      // Mock mode — simulate order for testing
      const mockOrderId = "order_mock_" + Date.now();
      await Payment.create({ user: req.user._id, razorpayOrderId: mockOrderId, amount, status: "created" });
      res.json({ ok: true, order: { id: mockOrderId, amount, currency: "INR", key: "rzp_test_mock", plan }, mock: true });
    }
  } catch (err) {
    res.json({ ok: false, message: err.message || "Failed to create payment order" });
  }
};

// Verify payment (or auto-verify in mock/test mode)
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id) return res.json({ ok: false, message: "Missing payment parameters" });

    if (isRazorpayConfigured() && !razorpay_order_id.startsWith("order_mock_")) {
      // Real Razorpay verification
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
      if (expectedSignature !== razorpay_signature) {
        return res.json({ ok: false, message: "Payment verification failed" });
      }
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
    if (!payment) return res.json({ ok: false, message: "Payment record not found" });

    payment.razorpayPaymentId = razorpay_payment_id || "mock_payment_" + Date.now();
    payment.razorpaySignature = razorpay_signature || "mock_signature";
    payment.status = "captured";

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (PLAN_DAYS.premium || 30));
    payment.expiryDate = expiryDate;
    await payment.save();

    const planName = payment.amount >= 49900 ? "pro" : "premium";
    await User.findByIdAndUpdate(req.user._id, {
      premium: true,
      plan: planName,
      premiumExpiry: expiryDate,
    });

    res.json({ ok: true, message: planName.charAt(0).toUpperCase() + planName.slice(1) + " activated!", premiumExpiry: expiryDate, plan: planName });
  } catch (err) {
    res.json({ ok: false, message: err.message || "Payment verification failed" });
  }
};

// Check premium status
export const checkPremium = async (req, res) => {
  try {
    const user = req.user;
    if (!user.premium) return res.json({ ok: true, premium: false, plan: user.plan || "free" });
    if (user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
      await User.findByIdAndUpdate(user._id, { premium: false, premiumExpiry: null, plan: "free" });
      return res.json({ ok: true, premium: false, plan: "free" });
    }
    res.json({ ok: true, premium: true, plan: user.plan || "premium", expiry: user.premiumExpiry });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

// Get usage stats
export const getUsage = async (req, res) => {
  try {
    const plan = req.user.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    let usage = await Usage.findOne({ user: req.user._id });
    if (!usage) usage = await Usage.create({ user: req.user._id });
    const now = new Date();
    if (now.toDateString() !== new Date(usage.lastResetDate).toDateString()) {
      usage.aiEditsUsed = 0; usage.pdfExportsUsed = 0; usage.tailoringUsed = 0; usage.coverLetterUsed = 0;
      usage.lastResetDate = now; await usage.save();
    }
    res.json({ ok: true, plan, limits, usage: {
      aiEdits: { used: usage.aiEditsUsed, limit: limits.aiEdits },
      pdfExports: { used: usage.pdfExportsUsed, limit: limits.pdfExports },
      tailoring: { used: usage.tailoringUsed, limit: limits.tailoring },
      coverLetter: { used: usage.coverLetterUsed, limit: limits.coverLetter },
    }});
  } catch (err) { res.json({ ok: false, message: err.message }); }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { premium: false, premiumExpiry: null, plan: "free" });
    res.json({ ok: true, message: "Subscription cancelled." });
  } catch (err) { res.json({ ok: false, message: err.message }); }
};

// Payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id, status: "captured" }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ ok: true, payments });
  } catch (err) { res.json({ ok: false, message: err.message }); }
};

// Mock test endpoint — simulate successful payment without Razorpay
export const mockTestPayment = async (req, res) => {
  try {
    const plan = req.body.plan || "premium";
    const amount = PLAN_AMOUNTS[plan] || PLAN_AMOUNTS.premium;
    const mockOrderId = "order_test_" + Date.now();
    const mockPaymentId = "pay_test_" + Date.now();

    const payment = await Payment.create({
      user: req.user._id, razorpayOrderId: mockOrderId, amount, status: "captured",
      razorpayPaymentId: mockPaymentId, razorpaySignature: "test_sig",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await User.findByIdAndUpdate(req.user._id, {
      premium: true, plan, premiumExpiry: payment.expiryDate,
    });

    res.json({ ok: true, message: "TEST: " + plan + " activated!", premiumExpiry: payment.expiryDate, plan });
  } catch (err) { res.json({ ok: false, message: err.message }); }
};
