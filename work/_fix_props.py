path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "onInspect={handleInspect}\n            onSubmit={handleDeploy}"
new = "onPublish={handlePublish}"
if old in content:
    content = content.replace(old, new)
    print("Props replaced")
else:
    print("Props pattern not found")
    # Find context
    idx = content.find("onInspect=")
    if idx > 0:
        print(content[idx:idx+100])

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
