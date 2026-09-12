import ReversePost, { toPublicPost } from "../models/ReversePost.js";
import ReverseInquiry, { toOwnerView } from "../models/ReverseInquiry.js";

// All responses follow the repo convention: { ok, ...data } with a
// human-readable `message` on failure. Owner email is never returned
// by any endpoint — contact is exchanged only when an inquiry is accepted.

// ── My post (owner) ────────────────────────────────────────────────

export async function getMyPost(req, res) {
  try {
    const post = await ReversePost.findOne({ user: req.user._id });
    res.json({ ok: true, post });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}

export async function upsertMyPost(req, res) {
  try {
    const b = req.validatedBody;
    const updates = {
      headline: b.headline,
      why: b.why ?? "",
      skills: b.skills ?? [],
      workMode: b.workMode ?? "any",
      locations: b.locations ?? [],
      openToRelocate: b.openToRelocate ?? false,
      employmentType: b.employmentType ?? "any",
      expectedSalary: b.expectedSalary ?? "",
      availability: b.availability ?? "",
      portfolioUrl: b.portfolioUrl ?? "",
    };

    const existing = await ReversePost.findOne({ user: req.user._id });
    let post;
    if (existing) {
      // Status edits only via dedicated actions — a content update can
      // never accidentally publish or unpause a paused/closed post.
      post = await ReversePost.findOneAndUpdate(
        { user: req.user._id },
        { $set: updates },
        { new: true, runValidators: true }
      );
    } else {
      post = await ReversePost.create({
        user: req.user._id,
        ...updates,
        status: b.status === "published" ? "published" : "draft",
      });
    }
    res.json({ ok: true, post });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}

export async function setPostStatus(req, res) {
  try {
    const { status } = req.params;
    if (!["draft", "published", "paused", "closed"].includes(status)) {
      return res.json({ ok: false, message: "Invalid status." });
    }
    const post = await ReversePost.findOne({ user: req.user._id });
    if (!post) {
      return res.json({ ok: false, message: "Create your post first." });
    }
    post.status = status;
    await post.save();
    res.json({ ok: true, post });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}

// ── Public board ───────────────────────────────────────────────────

export async function getBoard(req, res) {
  try {
    const q = { status: "published" };
    if (req.query.workMode && ["remote", "hybrid", "onsite", "any"].includes(req.query.workMode) && req.query.workMode !== "any") {
      q.workMode = req.query.workMode;
    }
    if (req.query.employmentType && ["full_time", "part_time", "contract", "internship", "any"].includes(req.query.employmentType) && req.query.employmentType !== "any") {
      q.employmentType = req.query.employmentType;
    }
    if (req.query.skill) {
      // Case-insensitive substring match so "oracle" finds "Oracle RAC".
      const escaped = String(req.query.skill).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      q.skills = { $regex: escaped, $options: "i" };
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const posts = await ReversePost.find(q)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate("user", "username name");

    res.json({ ok: true, posts: posts.map(toPublicPost) });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}

// ── Inquiries ──────────────────────────────────────────────────────

export async function sendInquiry(req, res) {
  try {
    const { postId, message, company, role } = req.validatedBody;

    const post = await ReversePost.findById(postId);
    if (!post) {
      return res.json({ ok: false, message: "Post not found." });
    }
    if (post.status !== "published") {
      return res.json({ ok: false, message: "This post is not accepting inquiries." });
    }
    if (String(post.user) === String(req.user._id)) {
      return res.json({ ok: false, message: "You cannot inquire on your own post." });
    }

    const inquiry = await ReverseInquiry.create({
      post: post._id,
      fromUser: req.user._id,
      message,
      company: company || "",
      role: role || "",
    });

    // Denormalized count for board sorting — best effort.
    await ReversePost.updateOne({ _id: post._id }, { $inc: { inquiryCount: 1 } });

    res.json({ ok: true, inquiry: toOwnerView({ ...inquiry.toObject(), fromUser: req.user }) });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.json({ ok: false, message: "You already applied to hire this worker." });
    }
    res.json({ ok: false, message: err.message });
  }
}

// Worker: list inquiries on my post
export async function getMyInquiries(req, res) {
  try {
    const post = await ReversePost.findOne({ user: req.user._id });
    if (!post) {
      return res.json({ ok: true, inquiries: [] });
    }
    const inquiries = await ReverseInquiry.find({ post: post._id })
      .sort({ createdAt: -1 })
      .populate("fromUser", "username name");
    res.json({ ok: true, inquiries: inquiries.map(toOwnerView) });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}

// Hiring side: inquiries I have sent
export async function getSentInquiries(req, res) {
  try {
    const inquiries = await ReverseInquiry.find({ fromUser: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: "post", select: "headline status skills workMode locations" });
    res.json({ ok: true, inquiries });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}

// Worker accepts or declines an inquiry on their own post.
// On accept, the inquirer's contact email is revealed to the worker
// (and the worker's email to the inquirer, in their sent view).
export async function respondToInquiry(req, res) {
  try {
    const { action } = req.validatedBody;

    const inquiry = await ReverseInquiry.findById(req.params.id).populate("post", "user status");
    if (!inquiry) {
      return res.json({ ok: false, message: "Inquiry not found." });
    }
    if (!inquiry.post || String(inquiry.post.user) !== String(req.user._id)) {
      return res.json({ ok: false, message: "Not authorized." });
    }
    if (inquiry.status !== "new") {
      return res.json({ ok: false, message: "This inquiry has already been responded to." });
    }

    inquiry.status = action === "accept" ? "accepted" : "declined";
    inquiry.respondedAt = new Date();
    await inquiry.save();

    let contact = null;
    if (inquiry.status === "accepted") {
      // Reveal the inquirer's email to the worker now that they accepted.
      const inquirer = await inquiry.populate("fromUser", "email username name");
      contact = inquirer.fromUser
        ? { email: inquirer.fromUser.email, name: inquirer.fromUser.username || inquirer.fromUser.name }
        : null;
    }

    res.json({ ok: true, inquiry: toOwnerView({ ...inquiry.toObject(), fromUser: inquiry.fromUser }), contact });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
}
