f = open(r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx", "r", encoding="utf-8")
lines = f.readlines()
f.close()

for i, line in enumerate(lines):
    if "demo: payload" in line and "SET_LATEST_DEMO" in line:
        # Print 6 lines around it
        for j in range(max(0,i-3), min(len(lines), i+6)):
            marker = ">>>" if j == i else "   "
            print(f"{marker} L{j+1}: {lines[j].rstrip()}")
        break
