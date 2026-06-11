import subprocess
# Check if the fix is on the server
cmd = 'ssh root@demogo.cn "grep -n finalHasPackageJson /opt/demogo/server/src/services/deployment-executor.js"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
print("stdout:", result.stdout)
print("stderr:", result.stderr[:200] if result.stderr else "")
