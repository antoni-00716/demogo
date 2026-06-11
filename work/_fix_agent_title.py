path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the no-token title block
old_no_token = """      <div className="workspace-home">
        <div className="ws-welcome" style={{ marginBottom: 24 }}>
          <h1 className="ws-greeting">AI 发布</h1>
        </div>
        <div className="agent-onboarding">"""
new_no_token = """      <div className="workspace-home">
        <div className="agent-onboarding">"""

if old_no_token in content:
    content = content.replace(old_no_token, new_no_token)
    print("Removed no-token title")
else:
    print("No-token title block not found - checking...")
    idx = content.find("No token")
    if idx > 0:
        print(content[idx:idx+300])

# Remove the has-token title block
old_has_token = """    <div className="workspace-home">
      <div className="ws-welcome" style={{ marginBottom: 24 }}>
        <h1 className="ws-greeting">AI 发布</h1>
      </div>

      {/* 口令卡片 */}"""
new_has_token = """    <div className="workspace-home">
      {/* 口令卡片 */}"""

if old_has_token in content:
    content = content.replace(old_has_token, new_has_token)
    print("Removed has-token title")
else:
    print("Has-token title block not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("AgentPublishPanel.tsx updated")
