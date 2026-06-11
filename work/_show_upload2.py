path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find UploadPanel
idx = content.find("function UploadPanel")
if idx > 0:
    end_idx = content.find("\nfunction ", idx + 1)
    if end_idx < 0:
        end_idx = len(content)
    print(content[idx:end_idx])
else:
    print("UploadPanel not found")
