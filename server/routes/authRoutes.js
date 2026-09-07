import express from "express";
import passport from "../config/passport.js";

import { signup, login, logout, me, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate, signupSchema, loginSchema } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", protect, me);
router.put("/update-profile", protect, updateProfile);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/?auth=failed`,
  }),
  (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", req.user.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.CLIENT_URL);
  }
);

// GitHub OAuth
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/?auth=failed`,
  }),
  (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", req.user.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.CLIENT_URL);
  }
);

export default router;