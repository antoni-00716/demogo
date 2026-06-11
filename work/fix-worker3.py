with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()

# Find and replace the broken section
# The broken section starts with const inProcessWorker = const wqName...
# Find the exact position
idx = data.find(b"const inProcessWorker = const wqName")
if idx >= 0:
    # Find the end of this line (next \n)
    end = data.find(b"\n", idx)
    # Find the next line which also has const inProcessWorker
    next_line = data.find(b"\n", end + 1)
    # Find the line after that with the fixed Worker
    third_line = data.find(b"\n", next_line + 1)
    
    # The fix: keep only lines 2 and 3 (the fixed version)
    # Line 2: const wqName = ...
    # Line 3: const inProcessWorker = new Worker(wqName, ...
    fixed_block = data[end+1:third_line+1]
    
    print(f"Broken section at idx {idx}")
    print(f"Broken: {data[idx:idx+200]!r}")
    print(f"Fixed block: {fixed_block!r}")
    
    # Remove the broken first line but keep the rest
    data = data[:idx] + fixed_block + data[third_line+1:]
    
    with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "wb") as f:
        f.write(data)
    print("Fixed!")
else:
    print("Pattern not found")
