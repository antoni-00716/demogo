path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Remove unused imports
c = c.replace('import { createClientDeploymentSteps, createFailureInspection, createGenericFixPrompt, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";',
              'import { createClientDeploymentSteps, createFailureInspection, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";')

c = c.replace('import { HostingArchitecturePanel } from "./dashboard/HostingArchitecturePanel";\n', '')
c = c.replace('import { FailureDiagnosisPanel } from "../components/dashboard/FailureDiagnosisPanel";\nimport { PlanRequestsTable } from "../components/dashboard/PlanRequestsTable";\n',
              'import { PlanRequestsTable } from "../components/dashboard/PlanRequestsTable";\n')
c = c.replace('import { ProjectProfilePanel } from "../components/dashboard/ProjectProfilePanel";\n', '')
c = c.replace('import { ProjectAssessmentPanel } from "../components/dashboard/ProjectAssessmentPanel";\n', '')

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("Unused imports removed")
