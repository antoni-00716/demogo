path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find handlePublish function
start = content.find("async function handlePublish")
if start > 0:
    end = content.find("async function handleInspect", start)
    if end < 0:
        end = content.find("\n  function ", start)
    block = content[start:end]
    # Find the success section
    su_idx = block.find("SET_LATEST_DEMO, demo: payload")
    if su_idx > 0:
        # Print 15 lines around it
        lines = block.split("\n")
        line_no = block[:su_idx].count("\n")
        for i, line in enumerate(lines):
            if abs(i - line_no) <= 8:
                print(f"L{i}: {line}")
    else:
        print("SET_LATEST_DEMO not in handlePublish")
else:
    print("handlePublish not found")
