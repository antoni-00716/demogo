# Fix UploadPanel.tsx - .message
path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\UploadPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace('inspection.message', 'inspection.userSummary || inspection.summary')
with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("UploadPanel fixed")

# Fix UserDashboard.tsx - remaining imports
path2 = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path2, "r", encoding="utf-8") as f:
    c = f.read()
# isSupportedArchive
c = c.replace('import { createClientDeploymentSteps, createFailureInspection, createGenericFixPrompt, isSupportedArchive, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";',
              'import { createClientDeploymentSteps, createFailureInspection, createGenericFixPrompt, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";')
# PublishSuccess  
c = c.replace('import { PublishSuccess } from "../components/dashboard/PublishSuccess";\n', '')
# InspectionPanel
c = c.replace('import { InspectionPanel } from "../components/dashboard/InspectionPanel";\n', '')

with open(path2, "w", encoding="utf-8") as f:
    f.write(c)
print("UserDashboard fixed")
