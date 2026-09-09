import Document from "../models/Document.js";
import Profile from "../models/Profile.js";
import { generateATSHTML, generateATSPlainText } from "../services/atsTemplate.js";
import { validateATS, generatePlainTextPreview } from "../services/atsValidator.js";

// ── POST /api/export/ats-html ──────────────────────────────────────
// Generate an ATS-safe HTML resume from a document or profile.
// Returns the HTML, a plain-text preview, and ATS validation warnings.
export const exportATSHtml = async (req, res) => {
  try {
    const { documentId, profileId } = req.body;

    let profile = null;

    // If a documentId is provided, build a profile from the document's data
    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, user: req.user._id });
      if (!doc) {
        return res.json({ ok: false, message: "Document not found." });
      }

      // Build a profile-like object from the document
      profile = buildProfileFromDocument(doc);
    } else if (profileId) {
      // Use the profile directly
      profile = await Profile.findOne({ _id: profileId, user: req.user._id });
      if (!profile) {
        return res.json({ ok: false, message: "Profile not found." });
      }
    } else {
      // Default: use the user's canonical profile
      profile = await Profile.findOne({ user: req.user._id, status: "canonical" });
      if (!profile) {
        return res.json({ ok: false, message: "No profile found. Create or import a profile first." });
      }
    }

    // Generate outputs
    const html = generateATSHTML(profile);
    const plainText = generateATSPlainText(profile);
    const textPreview = generatePlainTextPreview(plainText);
    const validation = validateATS(plainText);

    return res.json({
      ok: true,
      html,
      plainText,
      textPreview,
      validation,
    });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── POST /api/export/validate ──────────────────────────────────────
// Validate a document or profile for ATS compatibility without generating output.
export const validateExport = async (req, res) => {
  try {
    const { documentId, text } = req.body;

    let resumeText = text || "";

    if (documentId && !resumeText) {
      const doc = await Document.findOne({ _id: documentId, user: req.user._id });
      if (!doc) {
        return res.json({ ok: false, message: "Document not found." });
      }
      resumeText = doc.generatedText || "";
    }

    if (!resumeText) {
      return res.json({ ok: false, message: "No text to validate. Provide documentId or text." });
    }

    const validation = validateATS(resumeText);
    const textPreview = generatePlainTextPreview(resumeText);

    return res.json({ ok: true, validation, textPreview });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── Helper: build a profile-like object from a Document ────────────
function buildProfileFromDocument(doc) {
  const data = doc.data || {};
  const generatedText = doc.generatedText || "";

  return {
    contact: {
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
    },
    summary: data.summary || "",
    skills: (data.skillsList || data.skills || []).map((s) => ({
      name: typeof s === "string" ? s : s.name || s,
    })),
    experience: (data.experience || []).map((exp) => ({
      title: exp.title || "",
      company: exp.company || "",
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || "",
      description: exp.description || "",
    })),
    education: (data.education || []).map((edu) => ({
      degree: edu.degree || "",
      institution: edu.institution || "",
      location: edu.location || "",
      startDate: edu.startDate || "",
      endDate: edu.endDate || "",
      gpa: edu.gpa || "",
    })),
    projects: (data.projects || []).map((proj) => ({
      title: proj.title || "",
      description: proj.description || "",
      technologies: proj.technologies || [],
      startDate: proj.startDate || "",
      endDate: proj.endDate || "",
    })),
    certifications: (data.certifications || []).map((cert) => ({
      name: cert.name || "",
      issuer: cert.issuer || "",
      date: cert.date || "",
    })),
    links: (data.links || []).map((link) => ({
      label: link.label || "",
      url: link.url || "",
    })),
    // If no structured data, fall back to generatedText for validation
    _generatedText: generatedText,
  };
}
