import Document from "../models/Document.js";
import analyzeResume from "../services/aiResumeAnalyzer.js";
import calculateATS from "../services/atsScoreEngine.js";
import { resolveChatConfig, chatCompletion, getProviderClient, humanizeProviderError } from "../services/aiProvider.js";

export const analyzeResumeEndpoint = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.json({ ok: false, message: "Document ID is required." });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Document not found." });
    }

    const analysis = analyzeResume(doc.generatedText || "");
    const ats = calculateATS(analysis);

    res.json({ ok: true, analysis, ats });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
};

export const editDocument = async (req, res) => {
  try {
    const { documentId, instruction } = req.body;

    if (!documentId || !instruction) {
      return res.json({
        ok: false,
        message: "Document and instruction are required.",
      });
    }

    const oldDoc = await Document.findOne({
      _id: documentId,
      user: req.user._id,
    });

    if (!oldDoc) {
      return res.json({
        ok: false,
        message: "Document not found.",
      });
    }

    const docTypeLabel = oldDoc.type === "resume"
      ? "resume"
      : oldDoc.type === "cv"
        ? "curriculum vitae"
        : "biodata";

    const systemPrompt = `You are an expert career document editor. The user has a ${docTypeLabel} and wants you to improve it.\r\n\r\nRules:\r\n- Keep the overall structure and sections intact\r\n- Improve clarity, impact, and professionalism\r\n- Use strong action verbs and quantified achievements where possible\r\n- Make it ATS-friendly (use standard section headings, avoid special characters)\r\n- Keep the same information — do not fabricate new details\r\n- Output ONLY the improved document text, no explanations or markdown formatting`;

    const userPrompt = `Here is the current ${docTypeLabel}:\r\n\r\n---\r\n${oldDoc.generatedText}\r\n---\r\n\r\nInstruction: ${instruction}\r\n\r\nPlease return the improved ${docTypeLabel} text.`;

    const { provider, model } = resolveChatConfig(req.body);
    const { client } = getProviderClient(provider, model);

    const completionResult = await chatCompletion({
      provider,
      client,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const editedText = completionResult.text;

    if (!editedText) {
      return res.json({
        ok: false,
        message: "AI did not return a result. Please try again.",
      });
    }

    const newDoc = await Document.create({
      user: req.user._id,
      type: oldDoc.type,
      title: `${oldDoc.title} - AI Edited`,
      data: oldDoc.data,
      generatedText: editedText,
    });

    res.json({
      ok: true,
      document: newDoc,
    });
  } catch (err) {
    const message = humanizeProviderError(err);

    res.json({
      ok: false,
      message,
    });
  }
};

export const generateCoverLetter = async (req, res) => {
  try {
    const { documentId, jobTitle, company, jobDescription } = req.body;
    if (!documentId || !jobTitle || !company) {
      return res.json({ ok: false, message: "documentId, jobTitle, and company are required." });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Document not found." });
    }

    const prompt = `Write a professional cover letter for a ${jobTitle} position at ${company}.\r\n\r\nUse the candidate's resume below to personalize it. Mention specific skills, experiences, and achievements that are relevant to this role.\r\n\r\nJob Description (if available):\r\n${jobDescription || "Not provided"}\r\n\r\nCandidate Resume:\r\n${doc.generatedText}\r\n\r\nKeep it concise (3-4 paragraphs). Be professional, enthusiastic, and specific. Do not use generic phrases. Output ONLY the cover letter text, no explanations.`;

    const { provider, model } = resolveChatConfig(req.body);
    const { client } = getProviderClient(provider, model);

    const completionResult = await chatCompletion({
      provider,
      client,
      model,
      temperature: 0.7,
      maxTokens: 1000,
      messages: [
        { role: "system", content: "You are an expert career coach who writes compelling, personalized cover letters." },
        { role: "user", content: prompt },
      ],
    });

    const letter = completionResult.text;
    if (!letter) {
      return res.json({ ok: false, message: "AI did not generate a cover letter. Please try again." });
    }

    res.json({ ok: true, coverLetter: letter });
  } catch (err) {
    const message = err.message?.includes("API key")
      ? "Invalid or missing OPENAI_API_KEY"
      : err.message;
    res.json({ ok: false, message });
  }
};

export const analyzeResumeJob = async (req, res) => {
  try {
    const { resumeId, jobTitle, jobCompany, jobDescription, provider, model } = req.body;

    if (!resumeId) {
      return res.json({ ok: false, message: "Resume ID is required." });
    }

    if (!jobDescription) {
      return res.json({ ok: false, message: "Job description is required for job analysis." });
    }

    const doc = await Document.findOne({ _id: resumeId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Resume not found." });
    }

    const resumeText = doc.generatedText || "";
    const resumeAnalysis = analyzeResume(resumeText);
    const ats = calculateATS(resumeAnalysis);

    const resume = {
      title: doc.title || "Untitled Resume",
      type: doc.type || "resume",
      data: doc.data || {},
      generatedText: resumeText,
    };

    const { buildMutableJobProfile, computeResumeJobMatch, buildAnalysisEnvelope, parseJobRequirements, analyzeQualitativeWithRetry } = await import("../services/resumeJobAnalyzer.js");

    const jobProfile = buildMutableJobProfile({
      title: jobTitle || "",
      company: jobCompany || "",
      description: jobDescription,
    });

    // Derive structured required/preferred skills from the job description and attach to profile.
    const parsedReqs = parseJobRequirements(jobDescription || "");
    jobProfile.requiredSkills = parsedReqs.requiredSkills;
    jobProfile.preferredSkills = parsedReqs.preferredSkills;

    const matchResult = computeResumeJobMatch({
      resume: resumeAnalysis,
      jobProfile,
      ats,
    });

    // Qualitative LLM pass — only when the client explicitly chose a provider/model.
    // The deterministic match above is unchanged; the model adds evidence-based
    // strengths/weaknesses/recommendations. Failures degrade to a clean message
    // without ever 500-ing or leaking provider internals.
    let qualitative = null;
    let qualitativeError = "";
    let qualitativeModel = "";

    if (typeof provider === "string" || typeof model === "string") {
      try {
        const {
          provider: effectiveProvider,
          client,
          model: effectiveModel,
        } = getProviderClient(
          typeof provider === "string" ? provider : "openrouter",
          typeof model === "string" ? model : ""
        );
        qualitativeModel = effectiveModel;

        qualitative = await analyzeQualitativeWithRetry({
          providerClient: { provider: effectiveProvider, client },
          model: effectiveModel,
          resume,
          resumeAnalysis,
          jobProfile,
          matchResult,
          ats,
        });

        if (!qualitative) {
          qualitativeError =
            "The AI model returned no usable structured analysis. Please try again.";
        }
      } catch (err) {
        const message = err.message || "";
        qualitativeError = /api.key/i.test(message)
          ? message.includes("OPENROUTER_API_KEY")
            ? "OpenRouter is not configured on the server (missing OPENROUTER_API_KEY)."
            : "Invalid or missing API key for the selected AI provider."
          : "AI analysis is temporarily unavailable. Please try again later.";
      }
    }

    const analysis = buildAnalysisEnvelope({
      resume,
      resumeAnalysis,
      ats,
      jobProfile,
      matchResult,
      qualitative,
    });

    return res.json({ ok: true, analysis, qualitativeError, qualitativeModel });
  } catch (err) {
    return res.json({ ok: false, message: err.message || "AI analysis failed." });
  }
};

export const compareResumeJob = async (req, res) => {
  try {     const safeBody = (req?.body && typeof req.body === 'object') ? req.body : {};

     const {
       resumeId,
       jobTitle,
       jobCompany,
       jobDescription,
       providerA,
       modelA,
       providerB,
       modelB,
     } = safeBody;

     if (!resumeId) {
       return res.json({ ok: false, message: "Resume ID is required for comparison." });
     }

     if (!jobDescription) {
       return res.json({ ok: false, message: "Job description is required for comparison." });
     }

    const doc = await Document.findOne({ _id: resumeId, user: req.user._id });
    if (!doc) {
      return res.json({ ok: false, message: "Resume not found." });
    }

    const resumeText = doc.generatedText || "";
    const resumeAnalysis = analyzeResume(resumeText);
    const ats = calculateATS(resumeAnalysis);

    const resume = {
      title: doc.title || "Untitled Resume",
      type: doc.type || "resume",
      data: doc.data || {},
      generatedText: resumeText,
    };

    const { buildMutableJobProfile, parseJobRequirements } = await import("../services/resumeJobAnalyzer.js");
    const { compareModels } = await import("../services/resumeJobComparison.js"); // named import

    // The comparison service now exports named functions only.
    // If any wildcard/default import was used elsewhere, switch to named imports.

    const jobProfile = buildMutableJobProfile({
      title: jobTitle || "",
      company: jobCompany || "",
      description: jobDescription,
    });

    // Derive structured required/preferred skills from the job description and attach to profile.
    const parsedReqs = parseJobRequirements(jobDescription || "");
    jobProfile.requiredSkills = parsedReqs.requiredSkills;
    jobProfile.preferredSkills = parsedReqs.preferredSkills;

    const configA = getProviderClient(
      providerA || "openai",
      modelA || "openai/gpt-6-astra"
    );
    const configB = providerB || modelB
      ? getProviderClient(
          providerB || "openai",
          modelB || "anthropic/claude-fable-5.1"
        )
      : null;

    const comparison = await compareModels({
      providerConfigA: configA,
      modelA: configA.model,
      providerConfigB: configB,
      modelB: configB?.model,
      resume,
      resumeAnalysis,
      ats,
      jobProfile,
    });

    // If either provider threw a non-network, non-auth error, surface it clearly.
    // If both sides succeeded their deterministic match piece, comparison is still useful.

    return res.json({ ok: true, comparison });
  } catch (err) {
    return res.json({ ok: false, message: err.message || "Resume comparison failed." });
  }
};
