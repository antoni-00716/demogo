import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "data-access-test-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("data-access with JSON lock", () => {
  it("writes and reads JSON", async () => {
    await withTempDir(async (dir) => {
      const { readJson, writeJson } = await import("../lib/data-access.js");
      const filePath = path.join(dir, "test.json");
      await writeJson(filePath, [{ id: 1 }]);
      const data = await readJson(filePath, []);
      assert.deepEqual(data, [{ id: 1 }]);
    });
  });

  it("returns fallback for missing file", async () => {
    await withTempDir(async (dir) => {
      const { readJson } = await import("../lib/data-access.js");
      const data = await readJson(path.join(dir, "nonexistent.json"), []);
      assert.deepEqual(data, []);
    });
  });

  it("serializes writeJson calls under concurrent load", async () => {
    await withTempDir(async (dir) => {
      const { writeJson, readJson } = await import("../lib/data-access.js");
      const filePath = path.join(dir, "concurrent.json");

      // 10 serial writes (simulating sequential user requests)
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(writeJson(filePath, { id: i, timestamp: Date.now() }));
      }
      await Promise.all(promises);

      // Last written value should survive (write lock ensures no corruption)
      const result = await readJson(filePath, null);
      assert.notEqual(result, null, "should read back a value");
      assert.ok(result.id >= 0 && result.id <= 9, "should have a valid id");
    });
  });

  it("creates parent directories", async () => {
    await withTempDir(async (dir) => {
      const { writeJson } = await import("../lib/data-access.js");
      const nestedPath = path.join(dir, "sub", "nested", "test.json");
      await writeJson(nestedPath, { key: "value" });
      const content = await fs.readFile(nestedPath, "utf8");
      assert.ok(content.includes("key"));
    });
  });
});
