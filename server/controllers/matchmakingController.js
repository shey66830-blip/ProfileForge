import Document from "../models/Document.js";
import { scoreCompatibility, biodataInput } from "../services/matchmakingService.js";

// ── POST /api/matchmaking/find ─────────────────────────────────────
// Premium feature. Deterministic scoring of the seeker's biodata against
// other users' biodata documents. Own documents are excluded; contact
// details (email/phone) are never exposed — matches show a display name,
// location summary, and the compatibility breakdown only.
export const findMatches = async (req, res) => {
  try {
    const { documentId, scope = "country", specificLocation = "" } = req.validatedBody;

    const seekerDoc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!seekerDoc) {
      return res.json({ ok: false, message: "Biodata document not found." });
    }
    if (seekerDoc.type !== "biodata") {
      return res.json({ ok: false, message: "Selected document is not a biodata." });
    }

    const seeker = biodataInput(seekerDoc);

    // Only other users' biodatas are eligible candidates.
    const candidates = await Document.find({ type: "biodata", user: { $ne: req.user._id } })
      .limit(200)
      .populate("user", "username name");

    const matches = candidates
      .map((c) => {
        const other = biodataInput(c);
        const { score, breakdown } = scoreCompatibility(seeker, other, {
          scope,
          specific: specificLocation,
        });
        return {
          documentId: other.id,
          name: other.name,
          ownerHandle: c.user?.username || c.user?.name || "Anonymous",
          location: other.location || "—",
          summary: (c.data?.summary || "").slice(0, 200),
          score,
          breakdown,
        };
      })
      .filter((m) => m.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    res.json({ ok: true, matches, scanned: candidates.length });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};
