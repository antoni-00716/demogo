path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        deployDispatch({ type: "SET_LATEST_DEMO", demo: payload });
        show(deployState.updateTarget ? "项目已更新。" : "发布成功！", "success");
        deployDispatch({ type: "SET_FILE", file: null });
        deployDispatch({ type: "SET_NAME", name: "" });
        deployDispatch({ type: "RESET" });
        await refreshDemos(payload.id);"""

new = """        deployDispatch({ type: "SET_LATEST_DEMO", demo: payload });
        show(deployState.updateTarget ? "项目已更新。" : "发布成功！", "success");
        await refreshDemos(payload.id);"""

if old in content:
    content = content.replace(old, new)
    print("Fixed: removed premature RESET after success")
else:
    print("Pattern not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
