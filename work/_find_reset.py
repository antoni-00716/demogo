path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("SET_LATEST_DEMO")
if idx > 0:
    print(content[idx:idx+400])
else:
    print("Not found")
