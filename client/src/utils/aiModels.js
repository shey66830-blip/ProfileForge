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
  { provider: "experiential", model: "claude-fable-5.1", label: "Claude Fable 5.1 (Experiential Labs)" },
  { provider: "experiential", model: "gpt-6-astra", label: "GPT-6 Astra (Experiential Labs)" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o mini" },
];

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