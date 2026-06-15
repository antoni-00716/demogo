// DemoGo v0.9.39 - Unit tests for external-backend-service
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasSupabaseProject, externalBackendEnvKeys, isUnsafeExternalSecretKey } from "../services/external-backend-service.js";

describe("hasSupabaseProject", () => {
  it("returns false for empty inspection", () => {
    assert.equal(hasSupabaseProject({}), false);
  });

  it("detects supabase in profile databases", () => {
    const inspection = {
      analysis: {
        projectProfile: {
          databases: [{ code: "supabase", label: "Supabase" }],
          environmentVariables: { required: [] },
          signals: []
        }
      }
    };
    assert.equal(hasSupabaseProject(inspection), true);
  });

  it("detects supabase in signals", () => {
    const inspection = {
      analysis: {
        projectProfile: { databases: [], environmentVariables: { required: [] }, signals: ["supabase-auth"] }
      }
    };
    assert.equal(hasSupabaseProject(inspection), true);
  });

  it("returns false for unrelated databases", () => {
    const inspection = {
      analysis: {
        projectProfile: {
          databases: [{ code: "mysql", label: "MySQL" }],
          environmentVariables: { required: [] },
          signals: []
        }
      }
    };
    assert.equal(hasSupabaseProject(inspection), false);
  });
});

describe("externalBackendEnvKeys", () => {
  it("returns empty array when no supabase project", () => {
    assert.deepEqual(externalBackendEnvKeys({}), []);
  });
});

describe("isUnsafeExternalSecretKey", () => {
  it("flags SERVICE_ROLE as unsafe", () => {
    assert.ok(isUnsafeExternalSecretKey("SUPABASE_SERVICE_ROLE_KEY"));
  });

  it("allows anon key", () => {
    assert.ok(!isUnsafeExternalSecretKey("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  });

  it("allows url key", () => {
    assert.ok(!isUnsafeExternalSecretKey("VITE_SUPABASE_URL"));
  });
});
