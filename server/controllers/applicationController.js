import Application from "../models/Application.js";
import { isValidTransition, getNextStatuses } from "../models/Application.js";

// ── POST /api/applications ─────────────────────────────────────────
// Create or update an application. Enforces status transitions on update.
// Accepts jobSnapshot for freezing job data at creation time.
export const createOrUpdateApplication = async (req, res) => {
  try {
    const {
      jobId, jobTitle, company, status, notes,
      jobSnapshot, documentId, resumeVersionId, coverLetterVersionId,
      followUpAt, nextAction,
    } = req.body;

    if (!jobId) {
      return res.json({ ok: false, message: "Job ID is required." });
    }

    // Check if application already exists
    const existing = await Application.findOne({ user: req.user._id, jobId });

    if (existing) {
      // ── Update existing application ──
      const update = {};

      if (jobTitle) update.jobTitle = jobTitle;
      if (company) update.company = company;
      if (notes !== undefined) update.notes = notes;
      if (nextAction !== undefined) update.nextAction = nextAction;
      if (followUpAt) update.followUpAt = new Date(followUpAt);
      if (documentId) update.documentId = documentId;
      if (resumeVersionId) update.resumeVersionId = resumeVersionId;
      if (coverLetterVersionId) update.coverLetterVersionId = coverLetterVersionId;

      // Status transition enforcement
      if (status && status !== existing.status) {
        const { valid, reason } = isValidTransition(existing.status, status);
        if (!valid) {
          return res.json({ ok: false, message: reason });
        }
        update.status = status;

        // Auto-set timestamps on key transitions
        if (status === "applied" && !existing.appliedAt) {
          update.appliedAt = new Date();
        }
        if (status === "applied" && !existing.submittedAt) {
          update.submittedAt = new Date();
        }
      }

      if (jobSnapshot) {
        update.jobSnapshot = { ...existing.jobSnapshot, ...jobSnapshot };
      }

      const app = await Application.findOneAndUpdate(
        { _id: existing._id, user: req.user._id },
        { $set: update },
        { new: true }
      );

      return res.json({ ok: true, application: app });
    }

    // ── Create new application ──
    const createData = {
      user: req.user._id,
      jobId,
      jobTitle: jobTitle || "",
      company: company || "",
      status: status || "saved",
      notes: notes || "",
      nextAction: nextAction || "",
      followUpAt: followUpAt ? new Date(followUpAt) : null,
      documentId: documentId || null,
      resumeVersionId: resumeVersionId || null,
      coverLetterVersionId: coverLetterVersionId || null,
      jobSnapshot: jobSnapshot || {},
    };

    // Auto-set appliedAt when creating directly in "applied" status
    if (createData.status === "applied") {
      createData.appliedAt = new Date();
      createData.submittedAt = new Date();
    }

    const app = await Application.create(createData);
    return res.json({ ok: true, application: app });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── GET /api/applications ──────────────────────────────────────────
// List all applications for the user, with optional status grouping.
export const getApplications = async (req, res) => {
  try {
    const { status, groupBy } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const apps = await Application.find(filter).sort({ updatedAt: -1 });

    // Dashboard grouping
    if (groupBy === "status") {
      const grouped = {};
      for (const app of apps) {
        if (!grouped[app.status]) grouped[app.status] = [];
        grouped[app.status].push(app);
      }
      return res.json({ ok: true, applications: apps, grouped, total: apps.length });
    }

    if (groupBy === "nextAction") {
      const grouped = {};
      for (const app of apps) {
        const key = app.nextAction || "No action set";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(app);
      }
      return res.json({ ok: true, applications: apps, grouped, total: apps.length });
    }

    return res.json({ ok: true, applications: apps, total: apps.length });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── GET /api/applications/:id ──────────────────────────────────────
// Get a single application with valid next statuses.
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const app = await Application.findOne({ _id: id, user: req.user._id });

    if (!app) {
      return res.json({ ok: false, message: "Application not found." });
    }

    const nextStatuses = getNextStatuses(app.status);

    return res.json({ ok: true, application: app, nextStatuses });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── PUT /api/applications/:id ──────────────────────────────────────
// Update an application. Enforces status transitions.
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, notes, nextAction, followUpAt,
      documentId, resumeVersionId, coverLetterVersionId,
      jobSnapshot,
    } = req.body;

    const app = await Application.findOne({ _id: id, user: req.user._id });
    if (!app) {
      return res.json({ ok: false, message: "Application not found." });
    }

    const update = {};

    if (notes !== undefined) update.notes = notes;
    if (nextAction !== undefined) update.nextAction = nextAction;
    if (followUpAt !== undefined) update.followUpAt = followUpAt ? new Date(followUpAt) : null;
    if (documentId) update.documentId = documentId;
    if (resumeVersionId) update.resumeVersionId = resumeVersionId;
    if (coverLetterVersionId) update.coverLetterVersionId = coverLetterVersionId;
    if (jobSnapshot) update.jobSnapshot = { ...app.jobSnapshot, ...jobSnapshot };

    // Status transition enforcement
    if (status && status !== app.status) {
      const { valid, reason } = isValidTransition(app.status, status);
      if (!valid) {
        return res.json({ ok: false, message: reason });
      }
      update.status = status;

      if (status === "applied" && !app.appliedAt) update.appliedAt = new Date();
      if (status === "applied" && !app.submittedAt) update.submittedAt = new Date();
    }

    const updated = await Application.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: update },
      { new: true }
    );

    return res.json({ ok: true, application: updated });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── DELETE /api/applications/:id ───────────────────────────────────
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    await Application.findOneAndDelete({ _id: id, user: req.user._id });
    return res.json({ ok: true });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── GET /api/applications/transitions/:status ──────────────────────
// Get valid next statuses for a given current status (for UI dropdowns).
export const getTransitions = async (req, res) => {
  const { status } = req.params;
  const next = getNextStatuses(status);
  return res.json({ ok: true, current: status, nextStatuses: next });
};
