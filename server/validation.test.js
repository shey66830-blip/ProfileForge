import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We test the Zod validation schemas directly by importing the validate module.
// Since it uses ESM exports, we dynamic-import it.

const mod = await import("./middleware/validate.js");
const { validate, signupSchema, loginSchema, documentSchema, aiEditSchema, aiAnalysisSchema, aiCompareSchema } = mod;

// Helper: create a mock req/res/next
function mockReqRes(body = {}) {
  const req = { body, validatedBody: null };
  let statusCode = 200;
  let jsonBody = null;
  const res = {
    status(code) { statusCode = code; return res; },
    json(data) { jsonBody = data; return res; },
  };
  const next = () => {};
  return { req, res, next, getResult: () => ({ statusCode, jsonBody }) };
}

describe("validate middleware", () => {
  it("passes valid signup body", () => {
    const { req, res, next, getResult } = mockReqRes({
      name: "Test User",
      username: "testuser1",
      email: "test@example.com",
      password: "Secure123!",
    });
    validate(signupSchema)(req, res, next);
    assert.equal(getResult().jsonBody, null); // next() called, no response
    assert.ok(req.validatedBody);
  });

  it("rejects signup with short username", () => {
    const { req, res, next, getResult } = mockReqRes({
      name: "Test",
      username: "ab",
      email: "test@example.com",
      password: "Secure123!",
    });
    validate(signupSchema)(req, res, next);
    const result = getResult();
    assert.equal(result.jsonBody.ok, false);
    assert.ok(result.jsonBody.message.includes("Username"));
  });

  it("rejects signup with invalid email", () => {
    const { req, res, next, getResult } = mockReqRes({
      name: "Test",
      username: "testuser1",
      email: "not-an-email",
      password: "Secure123!",
    });
    validate(signupSchema)(req, res, next);
    assert.equal(getResult().jsonBody.ok, false);
  });

  it("rejects signup with short password", () => {
    const { req, res, next, getResult } = mockReqRes({
      name: "Test",
      username: "testuser1",
      email: "test@example.com",
      password: "short",
    });
    validate(signupSchema)(req, res, next);
    assert.equal(getResult().jsonBody.ok, false);
  });

  it("passes valid login body", () => {
    const { req, res, next, getResult } = mockReqRes({
      email: "test@example.com",
      password: "anything",
    });
    validate(loginSchema)(req, res, next);
    assert.equal(getResult().jsonBody, null);
  });

  it("rejects login with invalid email", () => {
    const { req, res, next, getResult } = mockReqRes({
      email: "bad",
      password: "pass",
    });
    validate(loginSchema)(req, res, next);
    assert.equal(getResult().jsonBody.ok, false);
  });

  it("passes valid document body", () => {
    const { req, res, next, getResult } = mockReqRes({
      type: "resume",
      title: "My Resume",
      data: { name: "Test" },
      generatedText: "Test content",
    });
    validate(documentSchema)(req, res, next);
    assert.equal(getResult().jsonBody, null);
  });

  it("rejects document with invalid type", () => {
    const { req, res, next, getResult } = mockReqRes({
      type: "invalid",
    });
    validate(documentSchema)(req, res, next);
    assert.equal(getResult().jsonBody.ok, false);
  });

  it("passes valid AI edit body", () => {
    const { req, res, next, getResult } = mockReqRes({
      documentId: "507f1f77bcf86cd799439011",
      instruction: "Make it better",
    });
    validate(aiEditSchema)(req, res, next);
    assert.equal(getResult().jsonBody, null);
  });

  it("rejects AI edit without documentId", () => {
    const { req, res, next, getResult } = mockReqRes({
      instruction: "Make it better",
    });
    validate(aiEditSchema)(req, res, next);
    assert.equal(getResult().jsonBody.ok, false);
  });

  it("passes valid analysis body", () => {
    const { req, res, next, getResult } = mockReqRes({
      resumeId: "507f1f77bcf86cd799439011",
      jobDescription: "Looking for a developer",
    });
    validate(aiAnalysisSchema)(req, res, next);
    assert.equal(getResult().jsonBody, null);
  });

  it("rejects analysis without resumeId", () => {
    const { req, res, next, getResult } = mockReqRes({
      jobDescription: "Some job",
    });
    validate(aiAnalysisSchema)(req, res, next);
    assert.equal(getResult().jsonBody.ok, false);
  });

  it("passes valid compare body", () => {
    const { req, res, next, getResult } = mockReqRes({
      resumeId: "507f1f77bcf86cd799439011",
      jobDescription: "Some job",
    });
    validate(aiCompareSchema)(req, res, next);
    assert.equal(getResult().jsonBody, null);
  });
});

describe("signupSchema edge cases", () => {
  it("rejects empty name", () => {
    const result = signupSchema.safeParse({
      name: "",
      username: "testuser",
      email: "a@b.com",
      password: "LongPass1!",
    });
    assert.equal(result.success, false);
  });

  it("rejects short username", () => {
    const result = signupSchema.safeParse({
      name: "Test",
      username: "abc",
      email: "a@b.com",
      password: "LongPass1!",
    });
    assert.equal(result.success, false);
  });
});
