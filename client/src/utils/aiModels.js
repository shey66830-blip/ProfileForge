// Single source of truth for the selectable AI models on the client.
// Both AI surfaces (aiEditor.jsx, resumeJobAnalysis.jsx) import this list —
// the provider/model values must match the backend allow-list in
// server/services/aiProvider.js (PROVIDER_MODELS).
//
// DEFAULT_MODEL is the first entry and must be a model that actually works
// with the keys configured server-side (claude-fable-5.1 on Experiential is
// verified live; gpt-4o-mini's OpenAI key is currently dead and gpt-6-astra
// is payment-gated upstream — they stay selectable but must not be defaults).
export const AI_MODELS = [
  {
    provider: "experiential",
    model: "claude-fable-5.1",
    label: "Claude Fable 5.1 (Experiential Labs)",
  },
  { provider: "experiential", model: "gpt-6-astra", label: "GPT-6 Astra (Experiential Labs)" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o mini" },
];

// Early-access models — the Pro "Early Access Features" perk. They work
// with the configured Experiential key; the server silently falls back to
// the default model for non-pro plans.
export const EARLY_ACCESS_MODELS = [
  {
    provider: "experiential",
    model: "deepseek-v4-flash",
    label: "DeepSeek v4 Flash — Early Access (Pro)",
  },
  {
    provider: "experiential",
    model: "deepseek-v4.1-flash",
    label: "DeepSeek v4.1 Flash — Early Access (Pro)",
  },
  { provider: "experiential", model: "gpt-5.6-luna", label: "GPT-5.6 Luna — Early Access (Pro)" },
  { provider: "experiential", model: "qwen3.8-27b", label: "Qwen 3.8 27B — Early Access (Pro)" },
];

// What a given plan may pick: pro sees everything.
export function selectableModels(plan = "free") {
  return plan === "pro" ? [...AI_MODELS, ...EARLY_ACCESS_MODELS] : AI_MODELS;
}

// The model every default picker falls back to. Never index AI_MODELS
// directly in pages — import this instead.
export const DEFAULT_MODEL = AI_MODELS[0];

// A stable <select> value that does not collide with model IDs:
// `${provider}::${model}`.
export function modelValue(m) {
  return `${m.provider}::${m.model}`;
}

export function findModelByValue(value) {
  return AI_MODELS.find((m) => modelValue(m) === value) || DEFAULT_MODEL;
}
