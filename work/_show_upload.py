path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find UploadPanel function start and end
start = None
end = None
for i, line in enumerate(lines):
    if "function UploadPanel(props:" in line:
        start = i
    if start is not None and "function PublishSuccess" in line:
        end = i
        break

if start and end:
    for j in range(start, end):
        print(f"L{j+1}: {lines[j].rstrip()}")
