import re

path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the handleCopyAgentInstruction function
old_func = """  async function handleCopyAgentInstruction() {
    const instruction = createAgentInstruction(agentToken);
    if (!instruction) {
      show("请先生成一次 AI 发布口令。生成后可长期复用，不需要每次重置。", "warning");
      return;
    }
    if (await writeClipboardText(instruction)) {
      show("给 AI 工具的生成链接指令已复制。", "success");
    } else {
      show("当前浏览器限制了一键复制，请手动复制给 AI 工具的指令。", "warning");
    }
  }
"""
if old_func in content:
    content = content.replace(old_func, "")
    print("Removed handleCopyAgentInstruction function")
else:
    print("Function not found for removal")
    idx = content.find("handleCopyAgentInstruction")
    if idx > 0:
        print("Sample:", repr(content[idx:idx+200]))

# Remove the onCopyInstruction prop line
old_prop = """            onCopyInstruction={handleCopyAgentInstruction}
"""
if old_prop in content:
    content = content.replace(old_prop, "")
    print("Removed onCopyInstruction prop")
else:
    print("Prop not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("UserDashboard.tsx updated")
