import OpenAI from "openai";

const OPENAI_FALLBACK_MODEL = "gpt-4o-mini"; // legacy provider; not the app default
const OPENAI_BASE_MODEL = "gpt-4o-mini";
const EXPERIENTIAL_BASE_URL = "https://api.experientiallabs.ai/v1";
const SUPPORTED_PROVIDERS = ["openai", "experiential"];

// App-wide default: must be a model that actually works with the configured
// server keys. claude-fable-5.1 on Experiential is verified live; the OpenAI
// key is currently dead (401) and gpt-6-astra is payment-gated upstream, so
// they remain selectable but never become defaults.
const DEFAULT_PROVIDER = "experiential";
const DEFAULT_MODEL = "claude-fable-5.1";

const PROVIDER_MODELS = {
  openai: {
    default: OPENAI_FALLBACK_MODEL,
    allowed: [
      OPENAI_BASE_MODEL,
    ],
  },
  experiential: {
    default: DEFAULT_MODEL,
    allowed: [
      "gpt-6-astra",
      DEFAULT_MODEL,
    ],
  },
};

function getProviderClient(provider = DEFAULT_PROVIDER, model = DEFAULT_MODEL) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    provider = DEFAULT_PROVIDER;
  }

  const providerConfig = PROVIDER_MODELS[provider] || PROVIDER_MODELS[DEFAULT_PROVIDER];
  if (!providerConfig.allowed.includes(model)) {
    model = providerConfig.default;
  }

  if (provider === "experiential") {
    const apiKey = process.env.EXPERIENTIAL_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "EXPERIENTIAL_API_KEY is not set server-side. Experiential Labs calls are not available."
      );
    }
    return {
      provider,
      client: new OpenAI({
        apiKey,
        baseURL: EXPERIENTIAL_BASE_URL,
      }),
      model,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set server-side. OpenAI calls are not available."
    );
  }

  return {
    provider: "openai",
    client: new OpenAI({ apiKey }),
    model,
  };
}

export function resolveChatConfig(reqBody = {}) {
  const requestedProvider = typeof reqBody.provider === "string" ? reqBody.provider.trim().toLowerCase() : "";
  const requestedModel = typeof reqBody.model === "string" ? reqBody.model.trim() : "";

  // Honor any explicitly supported provider (including legacy openai);
  // only unknown/missing values fall back to the app default.
  const provider =
    SUPPORTED_PROVIDERS.includes(requestedProvider)
      ? requestedProvider
      : DEFAULT_PROVIDER;

  const modelConfig = PROVIDER_MODELS[provider];
  const defaultModel = modelConfig.default;
  const allowedModels = modelConfig.allowed;

  let model = requestedModel && allowedModels.includes(requestedModel)
    ? requestedModel
    : defaultModel;

  return { provider, model };
}

export async function chatCompletion({ provider, client, model, messages, temperature, maxTokens, stream }) {
  const params = {
    model,
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens ?? 2000,
    messages,
  };

  // Some gateway model routes restrict sampling (e.g. temperature must be
  // exactly 1.0). The rejection is a 400 naming the parameter — retry once
  // without it so the route's own default applies.
  try {
    const response = await client.chat.completions.create(params);
    const text = response.choices[0]?.message?.content?.trim() || "";
    return { text };
  } catch (err) {
    const msg = String(err?.message || "");
    if (/temperature.*not supported|not supported.*temperature/i.test(msg)) {
      const { temperature: _omit, ...rest } = params;
      const response = await client.chat.completions.create(rest);
      const text = response.choices[0]?.message?.content?.trim() || "";
      return { text };
    }
    throw err;
  }
}

// Maps provider/SDK failures to safe, human-readable messages.
// Never exposes raw provider errors, status lines, or key material.
export function humanizeProviderError(err) {
  const msg = String(err?.message || "");
  if (err?.code === "ECONNREFUSED" || /fetch failed|network|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
    return "The AI service could not be reached. Please try again in a moment.";
  }
  // Payment/credit gating can arrive with any status code (402, 403, 400…),
  // so match the wording first — it is the most reliable signal.
  if (/payment|pre-?paid|credit|billing|top.?up|upgrade your plan|requires a payment/i.test(msg)) {
    return "This AI model needs payment set up on the provider account. Add a card / top up credits on the provider's billing page, then try again.";
  }
  if (err?.status === 401 || /401|authentication|api key|unauthorized/i.test(msg)) {
    return "The AI service rejected its credentials. The server API key appears to be invalid or expired — please update it in the server .env.";
  }
  if (err?.status === 429 || /rate limit|too many requests/i.test(msg)) {
    if (/card on file|top up|payment|credits page/i.test(msg)) {
      return "The AI model's free tier needs a small payment to unlock it. Please add a card / top up on the provider's Credits page, then retry.";
    }
    return "The AI service is rate-limiting requests. Please wait a bit and try again.";
  }
  if (err?.status === 402 || /insufficient|credits|quota/i.test(msg)) {
    return "The AI service reported insufficient credits. Please check the account tied to the server API key.";
  }
  if (err?.status === 404 || /not found|no such model/i.test(msg)) {
    return "The selected AI model is not available right now.";
  }
  return "The AI service could not complete the request. Please try again.";
}

export { DEFAULT_MODEL, SUPPORTED_PROVIDERS, PROVIDER_MODELS, getProviderClient };
