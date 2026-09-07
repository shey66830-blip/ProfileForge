export function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(err.status || 500).json({ ok: false, message });
}
