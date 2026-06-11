path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Find and remove the local InspectionPanel function
idx = c.find("\nfunction InspectionPanel({ inspection }: { inspection: Inspection })")
if idx > 0:
    end = c.find("\nfunction ", idx + 10)
    if end < 0:
        end = c.find("\n}", idx + 10)
    c = c[:idx] + c[end:]
    print("InspectionPanel function removed")
else:
    print("Not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
