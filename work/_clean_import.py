path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_import = "import { createAgentInstruction, createClientDeploymentSteps, createFailureInspection, createGenericFixPrompt, isSupportedArchive, markClientStepsFailed, waitForDeploymentJob }"
new_import = "import { createClientDeploymentSteps, createFailureInspection, createGenericFixPrompt, isSupportedArchive, markClientStepsFailed, waitForDeploymentJob }"

if old_import in content:
    content = content.replace(old_import, new_import)
    print("Import cleaned up")
else:
    print("Import pattern not found")
    # Try to find it
    for line in content.split("\n"):
        if "createAgentInstruction" in line and "import" in line:
            print("Found:", line)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
