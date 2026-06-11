import { canStartNodeRuntime, detectRuntimeWarnings } from "../services/runtime-service.js";

// Debug canStartNodeRuntime
const result1 = canStartNodeRuntime({
  analysis: { projectProfile: { engine: "node" } },
  runtime: {}
}, { enabled: true, nodeEnabled: true });
console.log("canStartNodeRuntime result:", JSON.stringify(result1));

// Debug detectRuntimeWarnings
const result2 = detectRuntimeWarnings({
  dependencies: { mysql2: "^3.0.0" },
  scripts: {},
  paths: ["package.json"]
});
console.log("detectRuntimeWarnings result:", JSON.stringify(result2));
