export function errorHandler(err, req, res, _next) {
  // Log error details in development; only log the message in production
  // to avoid leaking stack traces, file paths, or internal state.
  if (process.env.NODE_ENV === "production") {
    console.error("Unhandled error:", err?.message || err);
  } else {
    console.error("Unhandled error:", err);
  }

  // Never expose internal error details, stack traces, or path info to the client.
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(err.status || 500).json({ ok: false, message });
}
