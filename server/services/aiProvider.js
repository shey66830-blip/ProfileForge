import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const SUPPORTED_PROVIDERS = ["openai", "openrouter"];

const PROVIDER_MODELS = {
  openai: {
    default: DEFAULT_MODEL,
    allowed: [
      DEFAULT_MODEL,
    ],
  },
  openrouter: {
    default: "openai/gpt-6-astra",
    allowed: [
      "openai/gpt-6-astra",
      "anthropic/claude-fable-5.1",
    ],
  },
};

function getProviderClient(provider = "openai", model = DEFAULT_MODEL) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    provider = "openai";
  }

  const providerConfig = PROVIDER_MODELS[provider] || PROVIDER_MODELS.openai;
  if (!providerConfig.allowed.includes(model)) {
    model = providerConfig.default;
  }

  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is not set server-side. OpenRouter calls are not available."
      );
    }
    return {
      provider,
      client: new OpenAI({
        apiKey,
        baseURL: OPENROUTER_BASE_URL,
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

  const provider =
    SUPPORTED_PROVIDERS.includes(requestedProvider) && requestedProvider !== "openai"
      ? requestedProvider
      : "openai";

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

  if (stream) {
    return client.chat.completions.create(params);
  }

  const response = await client.chat.completions.create(params);
  const text = response.choices[0]?.message?.content?.trim() || "";
  return { text };
}

// Maps provider/SDK failures to safe, human-readable messages.
// Never exposes raw provider errors, status lines, or key material.
export function humanizeProviderError(err) {
  const msg = String(err?.message || "");
  if (err?.code === "ECONNREFUSED" || /fetch failed|network|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
    return "The AI service could not be reached. Please try again in a moment.";
  }
  if (err?.status === 401 || /401|authentication|api key|unauthorized/i.test(msg)) {
    return "The AI service rejected its credentials. The server API key appears to be invalid or expired — please update it in the server .env.";
  }
  if (err?.status === 429 || /rate limit|too many requests/i.test(msg)) {
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
