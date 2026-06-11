fp = r"C:\Users\wei.gu\Documents\demogo\server\src\server.js"
with open(fp, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 1647-1658 (0-indexed: 1646-1657) — the in-process worker creation
# Keep Redis check (1639-1645) and catch block (1659-1668)
del lines[1646:1658]  # Lines 1647-1658 in 1-indexed

with open(fp, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Removed in-process worker. New line count: {len(lines)}")

# Verify
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()
if 'In-process deployment worker' in c:
    print("WARNING: 'In-process deployment worker' still found!")
else:
    print("Verified: in-process worker removed")
if 'Redis connected successfully' in c:
    print("Verified: Redis check retained")
