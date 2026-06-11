path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """      <div className="ag-tools">
        <span>支持</span>
        <strong>Cursor</strong>
        <span>·</span>
        <strong>Windsurf</strong>
        <span>·</span>
        <strong>Codex</strong>
        <span>·</span>
        <strong>Claude Code</strong>
      </div>"""

new = """      <div className="ag-tools">
        <span>支持</span>
        <strong>Cursor</strong>
        <span>·</span>
        <strong>Windsurf</strong>
        <span>·</span>
        <strong>Codex</strong>
        <span>·</span>
        <strong>Claude Code</strong>
        <span>·</span>
        <strong>OpenClaw</strong>
        <span>等各类 AI 智能体</span>
      </div>"""

if old in content:
    content = content.replace(old, new)
    print("Tools text updated")
else:
    print("Not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
