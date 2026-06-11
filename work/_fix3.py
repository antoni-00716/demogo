f = open(r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx", "r", encoding="utf-8")
c = f.read()
f.close()

# The exact text to remove (from 4th occurrence context)
old = 'deployDispatch({ type: "SET_FILE", file: null });\n        deployDispatch({ type: "SET_NAME", name: "" });\n        deployDispatch({ type: "RESET" });\n        '
if old in c:
    c = c.replace(old, "")
    f = open(r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx", "w", encoding="utf-8")
    f.write(c)
    f.close()
    print("Removed premature RESET")
else:
    print("Not found, looking for pattern...")
    idx = c.find('SET_LATEST_DEMO, demo: payload')
    if idx > 0:
        print("Surrounding:", repr(c[idx:idx+200]))
