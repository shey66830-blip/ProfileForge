import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Not logged in"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "User not found"
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      message: "Invalid or expired token"
    });
  }
};