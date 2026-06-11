path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of agent section and the Responsive marker
start_marker = "/* ================================================================\n   Agent Publish"
end_marker = "/* --- Responsive --- */"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx > 0 and end_idx > start_idx:
    print(f"Agent section: {start_idx} to {end_idx}")
else:
    print(f"start_idx={start_idx}, end_idx={end_idx}")
