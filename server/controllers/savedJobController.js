import SavedJob from "../models/SavedJob.js";

export const saveJob = async (req, res) => {
  try {
    const { jobId, jobData, source } = req.body;
    if (!jobId) {
      return res.json({ ok: false, message: "Job ID is required." });
    }

    const existing = await SavedJob.findOne({ user: req.user._id, jobId });
    if (existing) {
      return res.json({ ok: true, message: "Job already saved.", saved: true });
    }

    const saved = await SavedJob.create({
      user: req.user._id,
      jobId,
      jobData: jobData || {},
      source: source || "",
    });

    res.json({ ok: true, saved });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const getSavedJobs = async (req, res) => {
  try {
    const jobs = await SavedJob.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ ok: true, jobs });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const unsaveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    await SavedJob.findOneAndDelete({ user: req.user._id, jobId });
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const checkJobSaved = async (req, res) => {
  try {
    const { jobId } = req.params;
    const existing = await SavedJob.findOne({ user: req.user._id, jobId });
    res.json({ ok: true, saved: !!existing });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};
