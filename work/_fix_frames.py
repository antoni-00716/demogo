path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove border/background from step blocks
old = """.ag-step {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  padding: 22px 24px;
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.ag-step.active {
  border-color: var(--cyan-400);
  box-shadow: 0 0 0 1px var(--cyan-400), 0 4px 20px rgba(6,182,212,0.08);
}
.ag-step.completed {
  border-color: var(--border-light);
}
.ag-step.pending {
  border-color: var(--border-light);
  opacity: 0.45;
  pointer-events: none;
}"""
new = """.ag-step {
  padding: 18px 0;
  transition: opacity 0.2s;
}
.ag-step.active {
  /* active step: no frame */
}
.ag-step.pending {
  opacity: 0.45;
  pointer-events: none;
}"""
if old in content:
    content = content.replace(old, new)
    print("Step frames removed")
else:
    print("Step frames not found")

# 2. Increase button font size  
old = """.ag-result-action {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
}"""
new = """.ag-result-action {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
}
.ag-result-action .btn,
.ag-gen-row .btn {
  font-size: 15px;
}"""
if old in content:
    content = content.replace(old, new)
    print("Button font increased")
else:
    print("Result action not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
