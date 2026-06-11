import re
with open('server/src/routes/auth.js','r',encoding='utf-8') as f:
    content = f.read()
# Check for template literals with backticks
lines = content.split('\n')
for i,line in enumerate(lines):
    if '' in line:
        print(f'L{i+1}: backtick found')
    if '\\' in line and '\\\\' not in line:
        # Check for invalid escape sequences
        for m in re.finditer(r'\\(?!\\)', line):
            print(f'L{i+1}: backslash at pos {m.start()}')
