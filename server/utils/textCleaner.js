export function cleanResumeText(text = "") {
  if (!text || typeof text !== "string") {
    return {
      original: "",
      cleaned: "",
      lower: "",
      tokens: [],
      lines: [],
    };
  }

  const original = text;

  let cleaned = text
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  const lower = cleaned.toLowerCase();

  const tokens = lower
    .split(/[\s,.;:/()|[\]{}]+/)
    .filter(Boolean);

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    original,
    cleaned,
    lower,
    tokens,
    lines,
  };
}

export function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsWord(text = "", word = "") {
  return normalizeText(text).includes(normalizeText(word));
}

export function uniqueArray(arr = []) {
  return [...new Set(arr.filter(Boolean))];
}