path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_styles = """
/* --- Generate button area --- */
.agent-generate-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.agent-generate-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}
"""

# Insert before Instruction display card
marker = "/* --- Instruction display card --- */"
if marker in content:
    content = content.replace(marker, new_styles + "\n" + marker)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("CSS updated")
else:
    print("Marker not found")
