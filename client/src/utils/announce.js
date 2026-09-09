/**
 * Announce a message to screen readers via the aria-live region in App.jsx.
 * Usage: announce("Document saved successfully");
 *        announce("3 jobs found", 5000); // auto-clear after 5 s
 */
export function announce(message, clearAfterMs = 0) {
  const el = document.getElementById("aria-live");
  if (!el) return;
  el.textContent = message;
  if (clearAfterMs > 0) {
    setTimeout(() => {
      if (el.textContent === message) el.textContent = "";
    }, clearAfterMs);
  }
}

/**
 * Announce a loading state, then announce the result or error when settled.
 * const done = announceLoading("Analyzing resume…");
 * done("Analysis complete");   // or done(null, "Analysis failed");
 */
export function announceLoading(message) {
  announce(message);
  return (result, error) => {
    if (error) {
      announce(error);
    } else if (result) {
      announce(result);
    }
  };
}
