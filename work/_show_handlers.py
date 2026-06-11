path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find onInspect handler
idx = content.find("async function handleInspect")
if idx > 0:
    end = content.find("\n  }", idx + 30)
    print(content[idx:end+5])
    print("---")
idx2 = content.find("async function handleDeploy")
if idx2 > 0:
    end2 = content.find("\n  }", idx2 + 30)
    print(content[idx2:end2+5])
