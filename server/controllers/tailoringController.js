import Document from "../models/Document.js";
import DocumentVersion from "../models/DocumentVersion.js";
import {
  generateTailoringSuggestions,
  applySuggestions,
  computeDiff,
} from "../services/tailoringService.js";
import { getProviderClient, humanizeProviderError } from "../services/aiProvider.js";
import analyzeResume from "../services/aiResumeAnalyzer.js";
import { incrementUsage } from "../middleware/planGate.js";

// ── POST /api/tailoring/suggest ────────────────────────────────────
// Generate structured tailoring suggestions for a resume + job description.
// Returns individual suggestions with before/after diffs — not a full document.
export const generateSuggestions = async (req, res) => {
  try {
    const { documentId, jobDescription, jobTitle, jobCompany, instruction, provider, model } =
      req.body;

    if (!documentId) {
      return res.json({ ok: false, message: "Document ID is required." });
    }
    if (!jobDescription) {
      return res.json({ ok: false, message: "Job description is required." });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Document not found." });
    }

    const resumeText = doc.generatedText || "";
    if (!resumeText) {
      return res.json({ ok: false, message: "Document has no text content to tailor." });
    }

    // Analyze the resume for structured data
    const resumeAnalysis = analyzeResume(resumeText);

    // Get the AI provider config
    let providerConfig;
    try {
      providerConfig = getProviderClient(provider || "experiential", model || "claude-fable-5.1");
    } catch (err) {
      return res.json({ ok: false, message: humanizeProviderError(err) });
    }

    // Save a base version (first time only)
    const existingBase = await DocumentVersion.findOne({
      document: doc._id,
      versionType: "base",
    });
    if (!existingBase) {
      await DocumentVersion.create({
        user: req.user._id,
        document: doc._id,
        versionType: "base",
        title: doc.title,
        type: doc.type,
        generatedText: doc.generatedText,
        data: doc.data,
        versionNumber: 1,
      });
    }

    // Generate suggestions
    const result = await generateTailoringSuggestions({
      resumeText,
      resumeAnalysis,
      jobDescription,
      jobTitle,
      jobCompany,
      instruction,
      providerConfig,
    });

    // Billable AI action succeeded — count it against the daily limit.
    try {
      await incrementUsage(req.user._id, "tailoring");
    } catch {
      /* non-fatal */
    }

    return res.json({
      ok: true,
      suggestions: result.suggestions,
      warnings: result.warnings,
      jobId: existingBase?._id || null,
    });
  } catch (err) {
    return res.json({ ok: false, message: err.message || "Tailoring failed." });
  }
};

// ── POST /api/tailoring/apply ──────────────────────────────────────
// Apply accepted suggestions to create a new tailored document version.
// Returns the new document and a diff of what changed.
export const applyTailoring = async (req, res) => {
  try {
    const { documentId, suggestions } = req.body;

    if (!documentId) {
      return res.json({ ok: false, message: "Document ID is required." });
    }
    if (!suggestions?.length) {
      return res.json({ ok: false, message: "No suggestions provided." });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Document not found." });
    }

    const originalText = doc.generatedText || "";
    const { newText, appliedCount, appliedSuggestions } = applySuggestions(
      originalText,
      suggestions,
    );

    if (appliedCount === 0) {
      return res.json({
        ok: false,
        message:
          "No suggestions were applied. Check that the before text matches the current document.",
      });
    }

    // Create a new tailored document
    const newDoc = await Document.create({
      user: req.user._id,
      type: doc.type,
      title: `${doc.title} - Tailored`,
      data: doc.data,
      generatedText: newText,
    });

    // Save a version snapshot
    const lastVersion = await DocumentVersion.findOne({ document: doc._id }).sort({
      versionNumber: -1,
    });
    const nextVersion = (lastVersion?.versionNumber || 1) + 1;

    await DocumentVersion.create({
      user: req.user._id,
      document: doc._id,
      versionType: "tailored",
      title: newDoc.title,
      type: doc.type,
      generatedText: newText,
      data: doc.data,
      jobDescription: req.body.jobDescription || "",
      jobTitle: req.body.jobTitle || "",
      jobCompany: req.body.jobCompany || "",
      appliedSuggestions,
      versionNumber: nextVersion,
    });

    // Compute diff for the UI
    const diff = computeDiff(originalText, newText);

    return res.json({
      ok: true,
      document: newDoc,
      appliedCount,
      diff,
    });
  } catch (err) {
    return res.json({ ok: false, message: err.message || "Failed to apply tailoring." });
  }
};

// ── POST /api/tailoring/batch ──────────────────────────────────────
// PRO-only batch mode: run the suggestion engine for up to 10 documents
// against one job description. Returns per-document results — failures for
// one document never abort the rest.
export const batchTailoring = async (req, res) => {
  try {
    const { documentIds, jobDescription, jobTitle, jobCompany, provider, model } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.json({ ok: false, message: "documentIds must be a non-empty array." });
    }
    if (documentIds.length > 10) {
      return res.json({ ok: false, message: "Batch is limited to 10 documents per run." });
    }
    if (!jobDescription) {
      return res.json({ ok: false, message: "Job description is required." });
    }

    const results = [];
    for (const documentId of documentIds) {
      try {
        const doc = await Document.findOne({ _id: documentId, user: req.user._id });
        if (!doc) {
          results.push({ documentId, ok: false, message: "Document not found." });
          continue;
        }
        const resumeText = doc.generatedText || "";
        if (!resumeText) {
          results.push({ documentId, ok: false, message: "Document has no text content." });
          continue;
        }

        const resumeAnalysis = analyzeResume(resumeText);
        const providerConfig = getProviderClient(
          provider || "experiential",
          model || "claude-fable-5.1",
        );
        const result = await generateTailoringSuggestions({
          resumeText,
          resumeAnalysis,
          jobDescription,
          jobTitle,
          jobCompany,
          providerConfig,
        });

        try {
          await incrementUsage(req.user._id, "tailoring");
        } catch {
          /* non-fatal */
        }
        results.push({
          documentId,
          title: doc.title,
          ok: true,
          suggestions: result.suggestions,
          warnings: result.warnings,
        });
      } catch (err) {
        results.push({
          documentId,
          ok: false,
          message: err.message || "Tailoring failed for this document.",
        });
      }
    }

    return res.json({ ok: true, results });
  } catch (err) {
    return res.json({ ok: false, message: err.message || "Batch tailoring failed." });
  }
};

// ── GET /api/tailoring/versions/:documentId ────────────────────────
// Get all versions for a document (base + tailored).
export const getVersions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const versions = await DocumentVersion.find({
      document: documentId,
      user: req.user._id,
    }).sort({ versionNumber: 1 });

    return res.json({ ok: true, versions });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── POST /api/tailoring/revert/:documentId ────────────────────────
// Revert a document to a previous version.
export const revertToVersion = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { versionId } = req.body;

    const version = await DocumentVersion.findOne({
      _id: versionId,
      document: documentId,
      user: req.user._id,
    });
    if (!version) {
      return res.json({ ok: false, message: "Version not found." });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Document not found." });
    }

    // Update the document to the version's content
    doc.generatedText = version.generatedText;
    doc.data = version.data;
    doc.title = version.title;
    await doc.save();

    return res.json({ ok: true, document: doc });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};
