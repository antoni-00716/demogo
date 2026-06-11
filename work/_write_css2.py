import re

path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_styles = """

/* --- Mode selector --- */
.agent-mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.agent-mode-btn {
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
}
.agent-mode-btn svg {
  color: var(--cyan-400);
  margin-bottom: 2px;
}
.agent-mode-desc {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* --- Update URL input --- */
.agent-update-url {
  margin-bottom: 16px;
}
.agent-update-url label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.agent-update-url input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.agent-update-url input:focus {
  border-color: var(--cyan-400);
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.1);
}
.agent-update-url input::placeholder {
  color: var(--text-tertiary);
}
"""

# Insert after the existing agent-token-card styles (before Instruction card)
marker = "/* --- Instruction display card --- */"
if marker in content:
    content = content.replace(marker, new_styles + "\n" + marker)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("CSS updated successfully")
else:
    print("Marker not found")
