import { canStartNodeRuntime, detectRuntimeWarnings } from "../services/runtime-service.js";

// Test with proper inspection structure
const result1 = canStartNodeRuntime({
  analysis: { 
    hasBackend: true,
    projectProfile: { engine: "node", type: "node_service" } 
  },
  runtime: { startCommand: "node server.js" }
}, { enabled: true, nodeEnabled: true });
console.log("canStartNodeRuntime (hasBackend):", result1.ok);

// Test detectRuntimeWarnings with proper object
const result2 = detectRuntimeWarnings({
  dependencies: { mysql2: "^3.0.0" },
  scripts: {},
  paths: ["package.json"]
});
console.log("detectRuntimeWarnings:", JSON.stringify(result2));
