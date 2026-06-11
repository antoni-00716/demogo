import urllib.request, json, os, pymysql

BASE = "http://127.0.0.1:3001"

def api(method, path, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": "application/json"}, method=method)
    return json.loads(urllib.request.urlopen(req).read().decode())

print("=== Step 1: Send verification code ===")
resp = api("POST", "/api/auth/send-verification-code", {"email": "flow-test@demogo.cn", "password": "TestPass123!"})
print("Result:", "PASS" if resp.get("ok") else "FAIL", resp)

print("\n=== Step 2: Read code from MySQL ===")
conn = pymysql.connect(host="127.0.0.1", user="demogo_app", password="atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV", database="demogo")
cur = conn.cursor()
cur.execute("SELECT metadata_json FROM audit_logs WHERE action=%s ORDER BY created_at DESC LIMIT 1", ("email_verification",))
row = cur.fetchone()
code = None
if row:
    metadata = json.loads(row[0])
    code = metadata.get("code")
    print("Found code:", code)
else:
    print("No record found!")
cur.close()
conn.close()

if code:
    print("\n=== Step 3: Register with code ===")
    resp = api("POST", "/api/auth/register", {"email": "flow-test@demogo.cn", "password": "TestPass123!", "name": "Flow Test", "code": code})
    user = resp.get("user", {})
    print("User:", user.get("email"), "plan:", user.get("plan"))
    print("Result:", "PASS" if user.get("email") else "FAIL")

    print("\n=== Step 4: Login ===")
    resp = api("POST", "/api/auth/login", {"email": "flow-test@demogo.cn", "password": "TestPass123!"})
    user = resp.get("user", {})
    print("User:", user.get("email"), "plan:", user.get("plan"))
    print("Result:", "PASS" if user.get("email") else "FAIL")
else:
    print("\nCannot proceed without code")
