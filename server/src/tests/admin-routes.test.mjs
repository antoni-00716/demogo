// DemoGo v0.9.39 - Unit tests for admin routes
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterAdminDemos } from "../lib/admin-helpers.js";

describe("filterAdminDemos", () => {
  const mockDemos = [
    { id: "1", name: "Project A", slug: "project-a", status: "published", userEmail: "a@test.com" },
    { id: "2", name: "Project B", slug: "project-b", status: "expired", userEmail: "b@test.com" },
    { id: "3", name: "Project C", slug: "project-c", status: "offline", userEmail: "c@test.com" },
    { id: "4", name: "Project D", slug: "project-d", status: "published", userEmail: "a@test.com" },
  ];

  it("returns all demos when no filters", () => {
    const result = filterAdminDemos(mockDemos, {});
    assert.equal(result.length, 4);
  });

  it("filters by status", () => {
    const result = filterAdminDemos(mockDemos, { status: "published" });
    assert.equal(result.length, 2);
    assert.ok(result.every((d) => d.status === "published"));
  });

  it("filters by search (name)", () => {
    const result = filterAdminDemos(mockDemos, { search: "Project A" });
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, "project-a");
  });

  it("searches by slug", () => {
    const result = filterAdminDemos(mockDemos, { search: "project-c" });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "Project C");
  });

  it("searches by user email", () => {
    const result = filterAdminDemos(mockDemos, { search: "b@test.com" });
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, "project-b");
  });

  it("handles empty filters object", () => {
    const result = filterAdminDemos(mockDemos, {});
    assert.equal(result.length, 4);
  });

  it("returns empty array for no matches", () => {
    const result = filterAdminDemos(mockDemos, { search: "nonexistent" });
    assert.equal(result.length, 0);
  });
});
