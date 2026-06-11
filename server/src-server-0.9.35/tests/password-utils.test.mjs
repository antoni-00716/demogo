// DemoGo v0.9.4 - Unit tests for lib/password-utils.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, hashVerificationCode, createVerifyEmailCode } from "../lib/password-utils.js";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and returns salt:hash format", async () => {
    const result = await hashPassword("test1234");
    const parts = result.split(":");
    assert.strictEqual(parts.length, 2);
    assert.ok(parts[0].length > 0);
    assert.ok(parts[1].length > 0);
  });

  it("verifies correct password", async () => {
    const hash = await hashPassword("mypassword");
    const result = await verifyPassword("mypassword", hash);
    assert.strictEqual(result, true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("mypassword");
    const result = await verifyPassword("wrongpassword", hash);
    assert.strictEqual(result, false);
  });

  it("rejects empty stored hash", async () => {
    const result = await verifyPassword("anything", "");
    assert.strictEqual(result, false);
  });

  it("produces different hashes for same password", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    assert.notStrictEqual(h1, h2);
  });
});

describe("hashVerificationCode", () => {
  it("produces a hex string", async () => {
    const result = await hashVerificationCode("123456", "somesalt");
    assert.strictEqual(typeof result, "string");
    assert.ok(result.length > 0);
    assert.ok(/^[0-9a-f]+$/.test(result));
  });

  it("produces different results for different codes", async () => {
    const h1 = await hashVerificationCode("123456", "salt");
    const h2 = await hashVerificationCode("654321", "salt");
    assert.notStrictEqual(h1, h2);
  });
});

describe("verifyEmailCode (via createVerifyEmailCode)", () => {
  let records;
  const readJson = async () => [...records];
  const writeJson = async (_, newRecords) => { records = newRecords; };
  const emailVerificationsFile = "mock";
  const verificationMaxAttempts = 5;

  const { verifyEmailCode, markEmailCodeUsed } = createVerifyEmailCode({
    readJson, writeJson, emailVerificationsFile, verificationMaxAttempts
  });

  it("returns error for non-6-digit code", async () => {
    records = [];
    const result = await verifyEmailCode("test@example.com", "abc");
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes("6"));
  });

  it("returns error when no record exists", async () => {
    records = [];
    const result = await verifyEmailCode("test@example.com", "123456");
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes("获取"));
  });

  it("returns error for expired code", async () => {
    records = [{
      email: "test@example.com",
      purpose: "register",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      codeHash: await hashVerificationCode("123456", "salt"),
      salt: "salt",
      attempts: 0
    }];
    const result = await verifyEmailCode("test@example.com", "123456");
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes("过期"));
  });

  it("returns error for too many attempts", async () => {
    records = [{
      email: "test@example.com",
      purpose: "register",
      usedAt: null,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      codeHash: await hashVerificationCode("123456", "salt"),
      salt: "salt",
      attempts: 5
    }];
    const result = await verifyEmailCode("test@example.com", "123456");
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes("过多"));
  });

  it("verifies correct code", async () => {
    records = [{
      email: "test@example.com",
      purpose: "register",
      usedAt: null,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      codeHash: await hashVerificationCode("123456", "salt"),
      salt: "salt",
      attempts: 0
    }];
    const result = await verifyEmailCode("test@example.com", "123456");
    assert.strictEqual(result.ok, true);
  });

  it("marks code as used", async () => {
    records = [{
      email: "user@example.com",
      purpose: "register",
      usedAt: null,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      codeHash: await hashVerificationCode("999999", "salt"),
      salt: "salt",
      attempts: 0
    }];
    await markEmailCodeUsed("user@example.com", "999999");
    assert.ok(records[0].usedAt !== null);
  });
});
