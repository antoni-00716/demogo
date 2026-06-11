import re

path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_styles = """

/* --- Token display card --- */
.agent-token-card {
  padding: 20px 24px;
  border: 1px solid var(--cyan-200);
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f9ff, #fafeff);
  margin-bottom: 16px;
}
.agent-token-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.agent-token-label svg {
  color: var(--cyan-400);
}
.agent-token-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.agent-token-value {
  flex: 1;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}
.agent-token-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.agent-token-toggle:hover {
  background: var(--gray-100);
  color: var(--text-primary);
}

/* --- Instruction display card --- */
.agent-instruction-card {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 16px;
}
.agent-instruction-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  background: #fafaf9;
}
.agent-instruction-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
}
.agent-instruction-body {
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
}
.agent-instruction-action {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  background: #fafaf9;
}

/* --- Token bar hint --- */
.agent-token-bar-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 8px;
}

@media (max-width: 820px) {
  .agent-token-row {
    flex-wrap: wrap;
  }
  .agent-instruction-body {
    max-height: 240px;
    font-size: 11px;
  }
}
"""

# Insert after .agent-token-bar svg block
marker = ".agent-token-bar svg {\n  color: var(--green-500);\n}"
if marker in content:
    content = content.replace(marker, marker + new_styles)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("CSS updated successfully")
else:
    print("Still not found")
