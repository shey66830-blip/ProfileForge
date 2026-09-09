import Profile from "../models/Profile.js";
import Document from "../models/Document.js";

// ── Helpers ────────────────────────────────────────────────────────

/** Wrap a value with default provenance if not already present */
function withProvenance(item, source = "user") {
  if (item && typeof item === "object" && item.provenance) return item;
  if (item && typeof item === "object") {
    return {
      ...item,
      provenance: { source, verified: source === "user", updatedAt: new Date() },
    };
  }
  return item;
}

/** Tag every item in an array with provenance */
function tagArray(arr, source) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => withProvenance(item, source));
}

// ── GET /api/profile ───────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      // Create an empty canonical profile on first access
      profile = await Profile.create({
        user: req.user._id,
        status: "canonical",
      });
    }
    return res.json({ ok: true, profile });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── PUT /api/profile ───────────────────────────────────────────────
// Full or partial update of profile sections. Only canonical profiles
// can be edited directly (drafts must go through the import-review flow).
export const updateProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.json({ ok: false, message: "Profile not found." });
    }

    const updates = req.validatedBody || req.body;

    // Only allow editing canonical profiles directly
    if (profile.status === "draft") {
      return res.json({
        ok: false,
        message: "Profile is in draft status. Review and promote it first, or update via the import-review flow.",
      });
    }

    // Apply section updates with user provenance
    const allowedSections = [
      "contact", "summary", "skills", "experience",
      "education", "projects", "certifications", "links", "jobPreferences",
    ];

    for (const section of allowedSections) {
      if (updates[section] === undefined) continue;

      if (section === "summary") {
        profile.summary = updates.summary;
        profile.summaryProvenance = {
          source: "user",
          verified: true,
          updatedAt: new Date(),
        };
      } else if (section === "skills" && Array.isArray(updates.skills)) {
        profile.skills = tagArray(updates.skills, "user").map((s) => ({
          name: typeof s === "string" ? s : s.name,
          provenance: s.provenance || { source: "user", verified: true, updatedAt: new Date() },
        }));
      } else if (section === "contact" && typeof updates.contact === "object") {
        profile.contact = {
          ...profile.contact,
          ...updates.contact,
          provenance: { source: "user", verified: true, updatedAt: new Date() },
        };
      } else if (Array.isArray(updates[section])) {
        profile[section] = tagArray(updates[section], "user");
      } else if (typeof updates[section] === "object") {
        // jobPreferences
        profile[section] = {
          ...profile[section],
          ...updates[section],
          provenance: { source: "user", verified: true, updatedAt: new Date() },
        };
      }
    }

    await profile.save();
    return res.json({ ok: true, profile });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── POST /api/profile/import ───────────────────────────────────────
// Import extracted resume fields into a draft profile.
// Creates a new draft or replaces an existing draft.
// Does NOT overwrite a canonical profile — creates a new draft for review.
export const importProfile = async (req, res) => {
  try {
    const {
      documentId, contact, summary, skills,
      experience, education, projects, certifications, links, jobPreferences,
    } = req.body;

    if (!documentId) {
      return res.json({ ok: false, message: "documentId is required." });
    }

    // Verify the document belongs to this user
    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Document not found." });
    }

    // Build the draft profile data from extracted fields
    const draftData = {
      user: req.user._id,
      status: "draft",
      importedFromDocument: doc._id,
    };

    if (contact) {
      draftData.contact = {
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        location: contact.location || "",
        provenance: { source: "imported", verified: false, updatedAt: new Date() },
      };
    }

    if (summary) {
      draftData.summary = summary;
      draftData.summaryProvenance = {
        source: "imported",
        verified: false,
        updatedAt: new Date(),
      };
    }

    if (skills) {
      draftData.skills = (Array.isArray(skills) ? skills : []).map((s) => ({
        name: typeof s === "string" ? s : s.name || s,
        provenance: { source: "imported", verified: false, updatedAt: new Date() },
      }));
    }

    if (experience) {
      draftData.experience = tagArray(experience, "imported");
    }

    if (education) {
      draftData.education = tagArray(education, "imported");
    }

    if (projects) {
      draftData.projects = tagArray(projects, "imported");
    }

    if (certifications) {
      draftData.certifications = tagArray(certifications, "imported");
    }

    if (links) {
      draftData.links = tagArray(links, "imported");
    }

    if (jobPreferences) {
      draftData.jobPreferences = {
        ...jobPreferences,
        provenance: { source: "imported", verified: false, updatedAt: new Date() },
      };
    }

    // Upsert: replace existing draft, or create new
    const existingDraft = await Profile.findOne({
      user: req.user._id,
      status: "draft",
    });

    let profile;
    if (existingDraft) {
      Object.assign(existingDraft, draftData);
      await existingDraft.save();
      profile = existingDraft;
    } else {
      profile = await Profile.create(draftData);
    }

    return res.json({ ok: true, profile, message: "Draft profile created. Review and promote to canonical when ready." });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── POST /api/profile/promote ──────────────────────────────────────
// Promote a draft profile to canonical. This is the "review and confirm"
// step — the user has inspected the imported data and wants it to become
// the source of truth.
export const promoteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id, status: "draft" });
    if (!profile) {
      return res.json({ ok: false, message: "No draft profile to promote." });
    }

    // Check if there's an existing canonical profile
    const canonical = await Profile.findOne({ user: req.user._id, status: "canonical" });
    if (canonical) {
      // Merge draft into canonical — draft data fills empty canonical fields,
      // but verified canonical data is never overwritten.
      for (const section of ["contact", "skills", "experience", "education", "projects", "certifications", "links", "jobPreferences"]) {
        if (section === "contact" && profile.contact) {
          if (!canonical.contact.name && profile.contact.name) canonical.contact.name = profile.contact.name;
          if (!canonical.contact.email && profile.contact.email) canonical.contact.email = profile.contact.email;
          if (!canonical.contact.phone && profile.contact.phone) canonical.contact.phone = profile.contact.phone;
          if (!canonical.contact.location && profile.contact.location) canonical.contact.location = profile.contact.location;
        } else if (section === "skills" && profile.skills?.length) {
          const existingNames = new Set(canonical.skills.map((s) => s.name.toLowerCase()));
          for (const skill of profile.skills) {
            if (!existingNames.has(skill.name.toLowerCase())) {
              canonical.skills.push(skill);
            }
          }
        } else if (Array.isArray(profile[section]) && profile[section].length) {
          const existing = canonical[section] || [];
          if (existing.length === 0) {
            canonical[section] = profile[section];
          }
          // If canonical already has data, don't overwrite — imported data is unverified
        }
      }

      if (!canonical.summary && profile.summary) {
        canonical.summary = profile.summary;
        canonical.summaryProvenance = profile.summaryProvenance;
      }

      canonical.markModified("contact");
      canonical.markModified("skills");
      canonical.markModified("experience");
      canonical.markModified("education");
      canonical.markModified("projects");
      canonical.markModified("certifications");
      canonical.markModified("links");
      canonical.markModified("jobPreferences");
      await canonical.save();

      // Delete the draft
      await Profile.deleteOne({ _id: profile._id });

      return res.json({ ok: true, profile: canonical, message: "Draft merged into canonical profile." });
    }

    // No existing canonical — promote the draft directly
    profile.status = "canonical";

    // Mark all imported items as unverified so the user can review them
    const markUnverified = (items) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (item.provenance) {
          item.provenance.verified = false;
          item.provenance.updatedAt = new Date();
        }
      }
    };
    markUnverified(profile.skills);
    markUnverified(profile.experience);
    markUnverified(profile.education);
    markUnverified(profile.projects);
    markUnverified(profile.certifications);
    markUnverified(profile.links);
    if (profile.contact?.provenance) {
      profile.contact.provenance.verified = false;
    }
    if (profile.summaryProvenance) {
      profile.summaryProvenance.verified = false;
    }

    await profile.save();
    return res.json({ ok: true, profile, message: "Draft promoted to canonical profile." });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── POST /api/profile/suggestions/apply ────────────────────────────
// Accept or reject an AI suggestion. Accepted suggestions are moved
// into the profile section with source "ai_suggestion" and verified: false.
// Rejected suggestions are removed from the queue.
// CRITICAL: AI suggestions NEVER overwrite verified facts.
export const applySuggestion = async (req, res) => {
  try {
    const { suggestionId, accept } = req.body;
    if (!suggestionId || typeof accept !== "boolean") {
      return res.json({ ok: false, message: "suggestionId and accept (boolean) are required." });
    }

    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.json({ ok: false, message: "Profile not found." });
    }

    const idx = profile.suggestions.findIndex(
      (s) => s._id.toString() === suggestionId
    );
    if (idx === -1) {
      return res.json({ ok: false, message: "Suggestion not found." });
    }

    const suggestion = profile.suggestions[idx];

    if (accept) {
      // ── GUARDRAIL: Never overwrite verified facts ──
      // Check if the target section has verified data that would be overwritten.
      const section = suggestion.section;
      if (section === "summary") {
        if (profile.summaryProvenance?.verified) {
          return res.json({
            ok: false,
            message: "Cannot apply: the summary is already verified. Edit it manually instead.",
          });
        }
        profile.summary = suggestion.suggestedValue;
        profile.summaryProvenance = {
          source: "ai_suggestion",
          verified: false,
          updatedAt: new Date(),
        };
      } else if (section === "contact") {
        // Contact fields are always user-verified; reject AI overwrite
        return res.json({
          ok: false,
          message: "AI suggestions cannot modify contact information. Please edit manually.",
        });
      } else if (section === "skills" && Array.isArray(suggestion.suggestedValue)) {
        // For skills, only add new ones — never remove verified skills
        const verifiedNames = new Set(
          (profile.skills || [])
            .filter((s) => s.provenance?.verified)
            .map((s) => s.name.toLowerCase())
        );
        for (const name of suggestion.suggestedValue) {
          if (!verifiedNames.has(name.toLowerCase())) {
            profile.skills.push({
              name,
              provenance: { source: "ai_suggestion", verified: false, updatedAt: new Date() },
            });
          }
        }
      } else if (Array.isArray(suggestion.suggestedValue)) {
        // For experience, education, projects, certifications, links:
        // Only add if the section is empty or the suggestion is "add"
        if (suggestion.action === "add") {
          const items = suggestion.suggestedValue.map((item) => ({
            ...item,
            provenance: { source: "ai_suggestion", verified: false, updatedAt: new Date() },
          }));
          profile[section] = [...(profile[section] || []), ...items];
        }
      } else if (typeof suggestion.suggestedValue === "object") {
        // jobPreferences
        if (profile.jobPreferences?.provenance?.verified) {
          return res.json({
            ok: false,
            message: `Cannot apply: ${section} is already verified. Edit it manually instead.`,
          });
        }
        profile[section] = {
          ...suggestion.suggestedValue,
          provenance: { source: "ai_suggestion", verified: false, updatedAt: new Date() },
        };
      }

      // Mark the suggestion as accepted and remove it
      profile.suggestions.splice(idx, 1);
    } else {
      // Reject — remove the suggestion
      profile.suggestions.splice(idx, 1);
    }

    profile.markModified("suggestions");
    profile.markModified("skills");
    profile.markModified("experience");
    profile.markModified("education");
    profile.markModified("projects");
    profile.markModified("certifications");
    profile.markModified("links");
    profile.markModified("jobPreferences");
    await profile.save();

    return res.json({
      ok: true,
      profile,
      message: accept ? "Suggestion applied." : "Suggestion rejected.",
    });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── POST /api/profile/suggestions/dismiss-all ──────────────────────
export const dismissAllSuggestions = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.json({ ok: false, message: "Profile not found." });
    }

    profile.suggestions = [];
    profile.markModified("suggestions");
    await profile.save();

    return res.json({ ok: true, profile, message: "All suggestions dismissed." });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};

// ── DELETE /api/profile ────────────────────────────────────────────
export const deleteProfile = async (req, res) => {
  try {
    await Profile.deleteOne({ user: req.user._id });
    return res.json({ ok: true, message: "Profile deleted." });
  } catch (err) {
    return res.json({ ok: false, message: err.message });
  }
};
