import { describe, it, expect } from "vitest";
import { AI_MODELS, DEFAULT_MODEL, modelValue, findModelByValue } from "./aiModels.js";

describe("aiModels", () => {
  it("exports a non-empty model list", () => {
    expect(AI_MODELS.length).toBeGreaterThanOrEqual(2);
  });

  it("DEFAULT_MODEL is the first entry", () => {
    expect(DEFAULT_MODEL).toEqual(AI_MODELS[0]);
  });

  it("DEFAULT_MODEL is claude-fable-5.1 on experiential", () => {
    expect(DEFAULT_MODEL.provider).toBe("experiential");
    expect(DEFAULT_MODEL.model).toBe("claude-fable-5.1");
  });

  it("every model has provider, model, and label", () => {
    for (const m of AI_MODELS) {
      expect(typeof m.provider).toBe("string");
      expect(typeof m.model).toBe("string");
      expect(typeof m.label).toBe("string");
      expect(m.provider.length).toBeGreaterThan(0);
      expect(m.model.length).toBeGreaterThan(0);
    }
  });

  it("modelValue produces provider::model format", () => {
    expect(modelValue(AI_MODELS[0])).toBe(`${AI_MODELS[0].provider}::${AI_MODELS[0].model}`);
  });

  it("findModelByValue returns matching model", () => {
    const val = modelValue(AI_MODELS[1]);
    expect(findModelByValue(val)).toEqual(AI_MODELS[1]);
  });

  it("findModelByValue falls back to DEFAULT_MODEL for unknown value", () => {
    expect(findModelByValue("unknown::model")).toEqual(DEFAULT_MODEL);
  });

  it("findModelByValue falls back to DEFAULT_MODEL for empty string", () => {
    expect(findModelByValue("")).toEqual(DEFAULT_MODEL);
  });

  it("no two models share the same provider::model value", () => {
    const values = AI_MODELS.map(modelValue);
    expect(new Set(values).size).toBe(values.length);
  });
});
