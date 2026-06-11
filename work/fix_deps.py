import sys

# === 1. Add formsFile + formSubmissionsFile to demos.js function signature ===
with open(r'C:\Users\wei.gu\Documents\demogo\server\src\routes\demos.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_sig = '  restartDemoRuntime,\n}) {'
new_sig = '  restartDemoRuntime,\n  formsFile,\n  formSubmissionsFile,\n}) {'
content = content.replace(old_sig, new_sig)

with open(r'C:\Users\wei.gu\Documents\demogo\server\src\routes\demos.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('demos.js signature updated')

# === 2. Add formsFile + formSubmissionsFile to server.js registerDemosRoutes call ===
with open(r'C:\Users\wei.gu\Documents\demogo\server\src\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_call = '      restartDemoRuntime,\n      writeTrialEvent: writeTrialEvent,\n    });'
new_call = '      restartDemoRuntime,\n      formsFile,\n      formSubmissionsFile,\n      writeTrialEvent: writeTrialEvent,\n    });'
content = content.replace(old_call, new_call)

with open(r'C:\Users\wei.gu\Documents\demogo\server\src\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('server.js registerDemosRoutes call updated')
