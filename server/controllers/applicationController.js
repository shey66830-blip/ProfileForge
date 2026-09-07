import Application from "../models/Application.js";

export const createOrUpdateApplication = async (req, res) => {
  try {
    const { jobId, jobTitle, company, status, notes } = req.body;
    if (!jobId) {
      return res.json({ ok: false, message: "Job ID is required." });
    }

    const update = {};
    if (jobTitle) update.jobTitle = jobTitle;
    if (company) update.company = company;
    if (status) {
      update.status = status;
      if (status === "applied" && !req.body.appliedAt) {
        update.appliedAt = new Date();
      }
    }
    if (notes !== undefined) update.notes = notes;

    const app = await Application.findOneAndUpdate(
      { user: req.user._id, jobId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ ok: true, application: app });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const getApplications = async (req, res) => {
  try {
    const apps = await Application.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ ok: true, applications: apps });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const update = {};
    if (status) {
      update.status = status;
      if (status === "applied") update.appliedAt = new Date();
    }
    if (notes !== undefined) update.notes = notes;

    const app = await Application.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: update },
      { new: true }
    );

    if (!app) {
      return res.json({ ok: false, message: "Application not found." });
    }

    res.json({ ok: true, application: app });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    await Application.findOneAndDelete({ _id: id, user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};
