// DemoGo v0.9.39 - Pipeline helper functions (extracted from deployment-pipeline-service)
// Pure functions with no factory dependencies. Safe to import anywhere.

/**
 * Check if an inspection indicates a Node.js runtime project.
 */
export function isNodeRuntimeInspection(inspection = {}) {
  return inspection.analysis?.hostingMode === "node_runtime" ||
    inspection.analysis?.projectProfile?.type === "node_service" ||
    (inspection.analysis?.projectProfile?.type === "fullstack_framework" && inspection.hosting?.mode === "node_runtime") ||
    (inspection.analysis?.hasBackend && inspection.runtime?.engine === "node");
}

/**
 * Create a config_required runtime status object.
 * Callers should pass pre-computed failureDiagnosis as the 3rd arg.
 */
export function createConfigRequiredRuntime(previousRuntime = null, runtimeConfigStatus = {}, diagnosis = null) {
  return {
    ...(previousRuntime || {}),
    status: "config_required",
    statusLabel: "等待配置就绪",
    logs: previousRuntime?.logs || "",
    logSummary: runtimeConfigStatus.nextAction || "",
    failureDiagnosis: diagnosis || null,
    lifecycle: {
      ...(previousRuntime?.lifecycle || {}),
      stage: "config_required",
      stageLabel: "等待配置就绪",
      startedAt: null,
      stoppedAt: null
    },
    config: runtimeConfigStatus
  };
}

/**
 * Attach runtime info to an inspection object.
 */
export function attachRuntimeToInspection(inspection = {}, runtime = {}) {
  return {
    ...inspection,
    runtime: {
      ...(inspection.runtime || {}),
      ...runtime,
      status: runtime.status,
      statusLabel: runtime.statusLabel
    },
    hosting: {
      ...(inspection.hosting || {}),
      runtime: {
        ...(inspection.hosting?.runtime || {}),
        ...runtime,
        status: runtime.status,
        statusLabel: runtime.statusLabel
      }
    }
  };
}

/**
 * Infer project display name from request or inspection data.
 */
export function inferProjectDisplayName({ requestedName, uploadedFileName, inspection }) {
  const candidates = [
    requestedName,
    inspection?.entries?.projectTitle,
    inspection?.entries?.detectedTitle,
    inspection?.analysis?.packageJson?.name,
    uploadedFileName
      ?.replace(/\.(zip|tar\.gz|tgz)$/i, "")
      ?.replace(/[_-]/g, " "),
    "My Project"
  ];
  return candidates.find((c) => c?.trim?.()?.length > 0)?.trim() || "My Project";
}
