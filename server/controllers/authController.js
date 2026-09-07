import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

const isDbConnected = () => mongoose.connection.readyState === 1;

export const signup = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        ok: false,
        message: "Database not connected. Fix MongoDB connection first.",
      });
    }

    const { name, username, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      username,
      email,
      password: hashed,
    });

    const token = generateToken(user._id);

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        ok: false,
        message: "Database not connected. Fix MongoDB connection first.",
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ ok: false, message: "Wrong password" });
    }

    const token = generateToken(user._id);

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
};

export const me = async (req, res) => {
  res.json({
    ok: true,
    user: req.user,
  });
};
export const updateProfile = async (req, res) => {
  try {
    const { name, username } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    if (name) user.name = name;
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ ok: false, message: "Username already taken" });
      user.username = username;
    }
    await user.save();
    res.json({ ok: true, user: { id: user._id, name: user.name, username: user.username, email: user.email, plan: user.plan || "free" } });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
