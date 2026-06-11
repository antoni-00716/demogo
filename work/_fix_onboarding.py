path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix onboarding - replace the style block
old = """.agent-onboarding {
  text-align: center;
  padding: 64px 24px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: #ffffff;
  display: grid;
  justify-items: center;
  gap: 16px;
}"""
new = """.agent-onboarding {
  text-align: center;
  padding: 64px 24px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  display: grid;
  justify-items: center;
  gap: 16px;
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
    print("Onboarding not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
