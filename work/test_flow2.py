import urllib.request, json, pymysql
BASE = "http://127.0.0.1:3001"
def api(method, path, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": "application/json"}, method=method)
    try:
        return json.loads(urllib.request.urlopen(req).read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())

print("Step 1: Send verification")
resp = api("POST", "/api/auth/send-verification-code", {"email": "new-test-flow@demogo.cn", "password": "TestPass123!"})
print("Result:", resp)
if not resp.get("ok"):
    print("Got error, may be rate limited. Exiting.")
    exit()

print("\nStep 2: Read code from MySQL audit_logs")
conn = pymysql.connect(host="127.0.0.1", user="demogo_app", password="atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV", database="demogo")
cur = conn.cursor()
cur.execute("SELECT metadata_json FROM audit_logs WHERE action=%s ORDER BY created_at DESC LIMIT 1", ("email_verification",))
row = cur.fetchone()
code = None
if row:
    metadata = json.loads(row[0])
    code = metadata.get("code")
    print("Code:", code)
else:
    print("No record found!")
cur.close()
conn.close()

if code:
    print("\nStep 3: Register")
    resp = api("POST", "/api/auth/register", {"email": "new-test-flow@demogo.cn", "password": "TestPass123!", "name": "Flow", "code": code})
    print("Register:", resp.get("user",{}).get("email"), "ok" if resp.get("user") else "FAIL")
    print("\nStep 4: Login")
    resp = api("POST", "/api/auth/login", {"email": "new-test-flow@demogo.cn", "password": "TestPass123!"})
    print("Login:", resp.get("user",{}).get("email"), "plan:", resp.get("user",{}).get("plan"))
