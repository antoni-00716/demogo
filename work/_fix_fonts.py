path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """.ag-step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}
.ag-step-desc {
  font-size: 12.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}"""
new = """.ag-step-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}
.ag-step-desc {
  font-size: 13.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}"""
if old in content:
    content = content.replace(old, new)
    print("Title/desc font increased")
else:
    print("Title/desc not found")

# Also increase ag-mode-btn text
old2 = """.ag-mode-btn strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.ag-mode-btn span {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
}"""
new2 = """.ag-mode-btn strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.ag-mode-btn span {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.4;
}"""
if old2 in content:
    content = content.replace(old2, new2)
    print("Mode btn text increased")
else:
    print("Mode btn text not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
