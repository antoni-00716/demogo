import re

path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add new styles after agent-token-label svg
old_block = """.agent-token-label svg {
  color: var(--cyan-400);
}
.agent-token-row {"""
new_block = """.agent-token-label svg {
  color: var(--cyan-400);
}
.agent-token-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
}
.agent-token-divider {
  width: 1px;
  height: 20px;
  background: var(--border-light);
  margin: 0 4px;
}
.agent-token-row {"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Token card styles added")
else:
    print("Token card block not found")

# Update .agent-token-label to have flex-wrap
old_label = """.agent-token-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}"""
new_label = """.agent-token-label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}"""
if old_label in content:
    content = content.replace(old_label, new_label)
    print("Token label updated")
else:
    print("Token label not found")

# Add section label style before the mode selector
old_mode = "/* --- Mode selector --- */"
new_section_label = """
/* --- Section label --- */
.agent-section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  margin-top: 4px;
}

/* --- Mode selector --- */"""
if old_mode in content:
    content = content.replace(old_mode, new_section_label + "\n" + old_mode)
    print("Section label added")
else:
    print("Mode selector marker not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("CSS done")
