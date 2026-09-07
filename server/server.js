import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";

import connectDB from "./config/db.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import savedJobRoutes from "./routes/savedJobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import courseRoutes, { certRouter } from "./routes/courseRoutes.js";

const app = express();

app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());


const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: isProduction
      ? [process.env.CLIENT_URL || ""]
      : [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          "http://localhost:5176",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
          "http://127.0.0.1:5175",
          "http://127.0.0.1:5176",
        ],
    credentials: true,
  })
);

app.use("/api", generalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/certifications", certRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/", (req, res) => {
  res.send("API running");
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 5000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});