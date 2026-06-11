path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find all agent-related sections
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith("/* ---") and ("agent" in stripped.lower() or "token" in stripped.lower() or "mode" in stripped.lower() or "instruction" in stripped.lower() or "generate" in stripped.lower() or "update url" in stripped.lower()):
        print(f"L{i+1}: {stripped}")
