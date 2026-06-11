with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
# Find all DEMOGO_BUILD_MODE positions and check if DEMOGO_QUEUE_NAME is nearby
positions = []
start = 0
while True:
    idx = data.find(b"DEMOGO_BUILD_MODE", start)
    if idx < 0:
        break
    nearby = data[idx:idx+600]
    has_q = b"DEMOGO_QUEUE_NAME" in nearby
    # Find which function contains this
    fn_start = data.rfind(b"async function", 0, idx)
    fn_name = data[fn_start:fn_start+80].split(b"\n")[0] if fn_start >= 0 else b"unknown"
    print(f"  {'OK' if has_q else 'MISSING'} at byte {idx}: {fn_name.decode('utf-8', errors='replace')[:80]}")
    start = idx + 1
