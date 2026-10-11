import Document from "../models/Document.js";
import { PLAN_LEVELS } from "../middleware/planGate.js";

export const createDocument = async (req, res) => {
  try {
    // Biodata is a Premium feature — enforce server-side, not just in the UI.
    if (req.body.type === "biodata") {
      const plan = req.user.plan || "free";
      if ((PLAN_LEVELS[plan] || 0) < PLAN_LEVELS.premium) {
        return res.status(403).json({
          ok: false,
          message: "The Biodata Builder requires a premium plan. Upgrade to unlock it.",
          plan,
          requiredPlan: "premium",
          upgrade: "premium",
        });
      }
    }

    const doc = await Document.create({
      user: req.user._id,
      type: req.body.type,
      title: req.body.title,
      data: req.body.data,
      generatedText: req.body.generatedText,
    });

    res.json({ ok: true, document: doc });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user._id }).sort({
      updatedAt: -1,
    });

    res.json({ ok: true, documents: docs });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!doc) {
      return res.json({ ok: false, message: "Document not found" });
    }

    res.json({ ok: true, document: doc });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        type: req.body.type,
        title: req.body.title,
        data: req.body.data,
        generatedText: req.body.generatedText,
      },
      { new: true },
    );

    if (!doc) {
      return res.json({ ok: false, message: "Document not found" });
    }

    res.json({ ok: true, document: doc });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    await Document.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};
