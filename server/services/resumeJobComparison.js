import {
  computeResumeJobMatch,
  buildAnalysisEnvelope,
  analyzeQualitativeWithRetry,
} from "./resumeJobAnalyzer.js";

export function computeAgreementItem(a, b) {
  if (a === b) {
    return { value: a, agreement: "agree" };
  }
  return {
    valueA: a,
    valueB: b,
    agreement: "disagree",
  };
}

export async function analyzeWithModel({
  providerClient,
  model,
  resume,
  resumeAnalysis,
  ats,
  jobProfile,
}) {
  // Run the deterministic match on the extracted resume profile (same object the
  // single-model analyze endpoint uses) so both endpoints agree on the score.
  const matchResult = computeResumeJobMatch({
    resume: resumeAnalysis,
    jobProfile,
    ats,
  });

  const qualitative = await analyzeQualitativeWithRetry({
    providerClient,
    model,
    resume,
    resumeAnalysis,
    jobProfile,
    matchResult,
    ats,
  });

  return {
    model,
    provider: providerClient.provider,
    match: matchResult,
    qualitative,
  };
}

export async function compareModels({
  providerConfigA,
  modelA,
  providerConfigB,
  modelB,
  resume,
  resumeAnalysis,
  ats,
  jobProfile,
}) {
  const clientA = providerConfigA.client;

  const resultA = await analyzeWithModel({
    providerClient: { provider: providerConfigA.provider, client: clientA },
    model: modelA,
    resume,
    resumeAnalysis,
    ats,
    jobProfile,
  });

  const secondResult = providerConfigB && modelB
    ? await (async () => {
        const clientB = providerConfigB.client;
        return analyzeWithModel({
          providerClient: { provider: providerConfigB.provider, client: clientB },
          model: modelB,
          resume,
          resumeAnalysis,
          ats,
          jobProfile,
        });
      })()
    : {
        model: modelB || "(not provided)",
        provider: providerConfigB?.provider || "(not provided)",
        match: null,
        qualitative: null,
      };

  const envelopeA = buildAnalysisEnvelope({
    resume,
    resumeAnalysis,
    ats,
    jobProfile,
    matchResult: resultA.match,
    qualitative: resultA.qualitative,
  });

  const secondMatch = secondResult.match;
  const secondEnvelope = secondMatch
    ? buildAnalysisEnvelope({
        resume,
        resumeAnalysis,
        ats,
        jobProfile,
        matchResult: secondMatch,
        qualitative: secondResult.qualitative,
      })
    : null;

  const dimA = resultA.match;
  const dimB = secondMatch && secondMatch.skillMatch != null ? secondMatch : resultA.match;
  const skillAgreement = computeAgreementItem(resultA.match.skillMatch, dimB.skillMatch);
  const experienceAgreement = computeAgreementItem(resultA.match.experienceMatch, dimB.experienceMatch);
  const educationAgreement = computeAgreementItem(resultA.match.educationMatch, dimB.educationMatch);
  const overallAgreement = computeAgreementItem(resultA.match.overall, dimB.overall);

  const comparison = {
    resume: envelopeA.resume,
    job: envelopeA.job,
    ats: envelopeA.ats,
    modelA: {
      model: resultA.model,
      provider: resultA.provider,
      analysis: envelopeA,
    },
    modelB: {
      model: secondResult.model,
      provider: secondResult.provider,
      analysis: dimB === resultA.match ? null : secondEnvelope,
    },
    dimensionComparison: {
      overall: overallAgreement,
      skillMatch: skillAgreement,
      experienceMatch: experienceAgreement,
      educationMatch: educationAgreement,
    },
    consensus: {
      agreedMatchedSkills: intersection(
        resultA.match.matchedSkills || [],
        dimB.matchedSkills || []
      ),
      agreedMissingRequired: intersection(
        resultA.match.missingRequired || [],
        dimB.missingRequired || []
      ),
      disagreedMissingRequired: symmetricDifference(
        resultA.match.missingRequired || [],
        dimB.missingRequired || []
      ),
    },
  };

  return comparison;
}

function intersection(a, b) {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => setB.has(s.toLowerCase()));
}

function symmetricDifference(a, b) {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => !setB.has(s.toLowerCase()));
}
