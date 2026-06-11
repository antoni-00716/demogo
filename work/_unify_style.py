path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace agent-token-card styling
old = """.agent-token-card {
  padding: 20px 24px;
  border: 1px solid var(--cyan-200);
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f9ff, #fafeff);
  margin-bottom: 16px;
}"""
new = """.agent-token-card {
  padding: 20px 24px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  margin-bottom: 16px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.agent-token-card:hover {
  border-color: var(--cyan-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.06);
}"""
if old in content:
    content = content.replace(old, new)
    print("Token card updated")
else:
    print("Token card not found")

# Update agent-onboarding to match workspace
old = """.agent-onboarding {
  text-align: center;
  padding: 64px 24px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: #ffffff;
}"""
new = """.agent-onboarding {
  text-align: center;
  padding: 64px 24px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.agent-onboarding:hover {
  border-color: var(--cyan-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.06);
}"""
if old in content:
    content = content.replace(old, new)
    print("Onboarding card updated")
else:
    print("Onboarding card not found")

# Update agent-onboarding-icon to use cyan gradient
old = """.agent-onboarding-icon {
  width: 72px; height: 72px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--cyan-50), #f0fdff);
  display: flex; align-items: center; justify-content: center;
  color: var(--cyan-600);"""
new = """.agent-onboarding-icon {
  width: 72px; height: 72px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--cyan-500), var(--cyan-600));
  display: flex; align-items: center; justify-content: center;
  color: #ffffff;"""
if old in content:
    content = content.replace(old, new)
    print("Onboarding icon updated")
else:
    print("Onboarding icon not found")

# Update agent-mode-btn to match ws-publish-card pattern
old = """.agent-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px 20px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.agent-mode-btn:hover {
  border-color: var(--cyan-300);
  background: #fafffe;
}
.agent-mode-btn.active {
  border-color: var(--cyan-400);
  background: linear-gradient(135deg, #f0f9ff, #fafeff);
  box-shadow: 0 0 0 1px var(--cyan-400);
}"""
new = """.agent-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 20px 24px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.agent-mode-btn:hover {
  border-color: var(--cyan-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.06);
}
.agent-mode-btn.active {
  border-color: var(--cyan-400);
  background: #fafaf9;
  box-shadow: 0 0 0 1px var(--cyan-400), 0 4px 16px rgba(6, 182, 212, 0.06);
}"""
if old in content:
    content = content.replace(old, new)
    print("Mode button updated")
else:
    print("Mode button not found")

# Update agent-instruction-card to match workspace
old = """.agent-instruction-card {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 16px;
}"""
new = """.agent-instruction-card {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  overflow: hidden;
  margin-bottom: 16px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.agent-instruction-card:hover {
  border-color: var(--cyan-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.06);
}"""
if old in content:
    content = content.replace(old, new)
    print("Instruction card updated")
else:
    print("Instruction card not found")

# Update agent-instruction-header bg
old = """.agent-instruction-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  background: #fafaf9;
}"""
new = """.agent-instruction-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  background: transparent;
}"""
if old in content:
    content = content.replace(old, new)
    print("Instruction header updated")
else:
    print("Instruction header not found")

# Update agent-instruction-body bg
old = """.agent-instruction-body {
  margin: 0;
  padding: 20px 24px;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-secondary);
  background: #fdfdfc;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 360px;
  overflow-y: auto;
  border-bottom: 1px solid var(--border-light);
}"""
new = """.agent-instruction-body {
  margin: 0;
  padding: 20px 24px;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-secondary);
  background: #fdfdfc;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 360px;
  overflow-y: auto;
}"""
if old in content:
    content = content.replace(old, new)
    print("Instruction body updated")
else:
    print("Instruction body not found")

# Update agent-instruction-action bg
old = """.agent-instruction-action {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  background: #fafaf9;
}"""
new = """.agent-instruction-action {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
  background: transparent;
}"""
if old in content:
    content = content.replace(old, new)
    print("Instruction action updated")
else:
    print("Instruction action not found")

# Update agent-instruction-placeholder
old = """.agent-instruction-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  margin-top: 20px;
  border: 1px dashed var(--border-light);
  border-radius: 12px;
  background: #fdfdfc;
  text-align: center;
}"""
new = """.agent-instruction-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  margin-top: 20px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  text-align: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.agent-instruction-placeholder:hover {
  border-color: var(--cyan-300);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.06);
}"""
if old in content:
    content = content.replace(old, new)
    print("Placeholder updated")
else:
    print("Placeholder not found")

# Update agent-placeholder-icon
old = """.agent-placeholder-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f0f9ff, #fafeff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cyan-400);
  margin-bottom: 16px;
}"""
new = """.agent-placeholder-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--cyan-500), var(--cyan-600));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  margin-bottom: 16px;
}"""
if old in content:
    content = content.replace(old, new)
    print("Placeholder icon updated")
else:
    print("Placeholder icon not found")

# Update agent-tools-bar to add card feel
old = """.agent-tools-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 0;
  font-size: 13px;
  color: var(--text-tertiary);
}"""
new = """.agent-tools-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  margin-top: 20px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  font-size: 13px;
  color: var(--text-tertiary);
  transition: border-color 0.2s;
}
.agent-tools-bar:hover {
  border-color: var(--cyan-300);
}"""
if old in content:
    content = content.replace(old, new)
    print("Tools bar updated")
else:
    print("Tools bar not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("All CSS updated")
