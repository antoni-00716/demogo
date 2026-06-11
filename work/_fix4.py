f = open(r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx", "r", encoding="utf-8")
c = f.read()
f.close()
# Find all occurrences of SET_LATEST_DEMO and print surrounding context
import re
for m in re.finditer(r'SET_LATEST_DEMO.{0,100}', c):
    print(repr(m.group()))
    print("---")
