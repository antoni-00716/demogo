path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Fix 1: Change "让 AI 帮我" to "AI 发布" in dashboardViewTitle
for i, line in enumerate(lines):
    if 'return "让 AI 帮我"' in line:
        lines[i] = line.replace('"让 AI 帮我"', '"AI 发布"')
        print(f"Line {i+1}: Changed title to 'AI 发布'")
        break

# Fix 2: Update the subtitle to be cleaner and not duplicate
for i, line in enumerate(lines):
    if 'return "复制一句话给 Codex、Cursor 或其他 AI 工具，让它们帮你生成试用链接。"' in line:
        lines[i] = line.replace(
            '"复制一句话给 Codex、Cursor 或其他 AI 工具，让它们帮你生成试用链接。"',
            '"选择发布方式，生成指令，复制给 AI 工具即可发布"'
        )
        print(f"Line {i+1}: Changed subtitle")
        break

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
print("UserDashboard.tsx updated")
