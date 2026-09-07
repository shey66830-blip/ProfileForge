// Single source of truth for the selectable AI models on the client.
// Both AI surfaces (aiEditor.jsx, resumeJobAnalysis.jsx) import this list —
// the provider/model values must match the backend allow-list in
// server/services/aiProvider.js (PROVIDER_MODELS).
export const AI_MODELS = [
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o mini" },
  { provider: "openrouter", model: "openai/gpt-6-astra", label: "GPT-6 Astra (OpenRouter)" },
  { provider: "openrouter", model: "anthropic/claude-fable-5.1", label: "Claude Fable 5.1 (OpenRouter)" },
];

// A stable <select> value that does not collide with model IDs:
// `${provider}::${model}`.
export function modelValue(m) {
  return `${m.provider}::${m.model}`;
}

export function findModelByValue(value) {
  return AI_MODELS.find((m) => modelValue(m) === value) || AI_MODELS[0];
}
