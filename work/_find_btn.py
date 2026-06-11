path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "生成发布指令" in line or "复制给 AI" in line:
        # Print surrounding context
        start = max(0, i-1)
        end = min(len(lines), i+3)
        for j in range(start, end):
            print(f"L{j+1}: {lines[j].rstrip()}")
        print("---")
