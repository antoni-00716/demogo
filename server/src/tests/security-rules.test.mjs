// DemoGo v0.9.39 - Unit tests for security-rules constants
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blockedExactNames,
  ignoredPathParts,
  ignoredExactNames,
  ignoredExtensions,
  blockedExtensions,
} from "../lib/security-rules.js";

describe("security-rules sets", () => {
  it("blockedExactNames contains .env files and ssh keys", () => {
    assert.ok(blockedExactNames.has(".env"));
    assert.ok(blockedExactNames.has(".env.local"));
    assert.ok(blockedExactNames.has(".env.production"));
    assert.ok(blockedExactNames.has("id_rsa"));
    assert.ok(blockedExactNames.has("id_dsa"));
  });

  it("blockedExactNames does NOT include safe files", () => {
    assert.equal(blockedExactNames.has("index.html"), false);
    assert.equal(blockedExactNames.has("package.json"), false);
  });

  it("ignoredPathParts contains version control and build dirs", () => {
    assert.ok(ignoredPathParts.has(".git"));
    assert.ok(ignoredPathParts.has(".hg"));
    assert.ok(ignoredPathParts.has("node_modules"));
    assert.ok(ignoredPathParts.has("coverage"));
    assert.ok(ignoredPathParts.has("node_modules"));
  });

  it("ignoredExactNames contains OS and lock files", () => {
    assert.ok(ignoredExactNames.has(".DS_Store"));
    assert.ok(ignoredExactNames.has("Thumbs.db"));
    assert.ok(ignoredExactNames.has("npm-debug.log"));
  });

  it("ignoredExtensions contains temp files", () => {
    assert.ok(ignoredExtensions.has(".log"));
    assert.ok(ignoredExtensions.has(".tmp"));
  });

  it("blockedExtensions contains executable and config files", () => {
    assert.ok(blockedExtensions.has(".exe"));
    assert.ok(blockedExtensions.has(".dll"));
    assert.ok(blockedExtensions.has(".sh"));
    assert.ok(blockedExtensions.has(".key"));
    assert.ok(blockedExtensions.has(".pem"));
    assert.ok(blockedExtensions.has(".bat"));
    assert.ok(blockedExtensions.has(".ps1"));
  });

  it("blockedExtensions does NOT include safe extensions", () => {
    assert.equal(blockedExtensions.has(".html"), false);
    assert.equal(blockedExtensions.has(".css"), false);
    assert.equal(blockedExtensions.has(".js"), false);
  });
});
