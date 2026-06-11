# Fix UploadPanel.tsx
path1 = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\UploadPanel.tsx"
with open(path1, "r", encoding="utf-8") as f:
    c = f.read()

# Remove useState import
c = c.replace('import { useState, type DragEvent } from "react";', 'import { type DragEvent } from "react";')
# Fix Inspection import
c = c.replace('import type { Demo, Inspection, DeploymentStep } from "../../types";', 'import type { Demo, DeploymentStep } from "../../types";\nimport type { Inspection } from "../../api/demos";')

with open(path1, "w", encoding="utf-8") as f:
    f.write(c)
print("UploadPanel.tsx fixed")

# Fix UserDashboard.tsx
path2 = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path2, "r", encoding="utf-8") as f:
    c = f.read()

# Remove unused imports
c = c.replace('import { useCallback, useEffect, useReducer, useState, type DragEvent, type FormEvent } from "react";',
              'import { useCallback, useEffect, useReducer, useState } from "react";')
c = c.replace('import { isSupportedArchive, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";',
              'import { markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";')
c = c.replace('import { DeploymentSteps } from "../components/dashboard/DashPanels";\n', '')
c = c.replace('import { FailureDiagnosisPanel } from "../components/dashboard/FailureDiagnosisPanel";\nimport { PlanRequestsTable } from "../components/dashboard/PlanRequestsTable";\nimport { PublishSuccess } from "../components/dashboard/PublishSuccess";\n',
              'import { FailureDiagnosisPanel } from "../components/dashboard/FailureDiagnosisPanel";\nimport { PlanRequestsTable } from "../components/dashboard/PlanRequestsTable";\n')

# Fix createClientDeploymentSteps("inspecting") → empty array
c = c.replace('createClientDeploymentSteps("inspecting")', '[]')

# Fix .message → .userSummary || .summary
c = c.replace('inspectionPayload.inspection?.message', 'inspectionPayload.inspection?.userSummary || inspectionPayload.inspection?.summary')

with open(path2, "w", encoding="utf-8") as f:
    f.write(c)
print("UserDashboard.tsx fixed")
