path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_styles = """
/* --- Token regenerate link --- */
.agent-token-regenerate {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.agent-token-regenerate:hover {
  color: var(--text-secondary);
  background: var(--gray-100);
}

/* --- Instruction placeholder --- */
.agent-instruction-placeholder {
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
}
.agent-placeholder-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f0f9ff, #fafeff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cyan-400);
  margin-bottom: 16px;
}
.agent-instruction-placeholder p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 8px;
  max-width: 400px;
  line-height: 1.6;
}
.agent-placeholder-sub {
  font-size: 12px !important;
  color: var(--text-tertiary) !important;
}
"""

# Insert before "/* --- Instruction display card --- */"
marker = "/* --- Instruction display card --- */"
if marker in content:
    content = content.replace(marker, new_styles + "\n" + marker)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("CSS updated")
else:
    print("Marker not found")
