import urllib.request, json, http.cookiejar

BASE = "http://127.0.0.1:3001"
CJ = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CJ))

def get_csrf():
    OPENER.open(urllib.request.Request(BASE + "/api/health"))
    for c in CJ:
        if c.name == "csrf_token": return c.value
    return ""

def dump(msg):
    print(f"  [{msg}] Cookies:", {c.name: c.value[:12] for c in CJ})

# Get CSRF first
csrf = get_csrf()
dump("after health")

# Send verification code
import pymysql
data = json.dumps({"email": "csrf-debug@demogo.cn", "password": "TestPass123!"}).encode()
req = urllib.request.Request(BASE + "/api/auth/send-verification-code", data=data, headers={"Content-Type":"application/json"}, method="POST")
urlopen = urllib.request.urlopen(req)
resp = json.loads(urlopen.read().decode())
print(f"  Send code: {resp.get('ok')}")

# Read code from MySQL
conn = pymysql.connect(host="127.0.0.1", user="demogo_app", password="atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV", database="demogo")
cur = conn.cursor()
cur.execute("SELECT metadata_json FROM audit_logs WHERE action=%s ORDER BY created_at DESC LIMIT 1", ("email_verification",))
row = cur.fetchone()
code = json.loads(row[0]).get("code") if row else None
cur.close(); conn.close()
print(f"  Code: {code}")

# Register
csrf = get_csrf()
dump("before register")
data = json.dumps({"email": "csrf-debug@demogo.cn", "password": "TestPass123!", "name": "CSRF Debug", "verificationCode": code}).encode()
req = urllib.request.Request(BASE + "/api/auth/register", data=data, headers={"Content-Type":"application/json","x-csrf-token": csrf or ""}, method="POST")
resp = json.loads(urllib.request.urlopen(req).read().decode())
print(f"  Register: {resp.get('user',{}).get('email','FAIL')}")
dump("after register")

# Login
data = json.dumps({"email": "csrf-debug@demogo.cn", "password": "TestPass123!"}).encode()
req = urllib.request.Request(BASE + "/api/auth/login", data=data, headers={"Content-Type":"application/json"}, method="POST")
resp = json.loads(urllib.request.urlopen(req).read().decode())
user = resp.get("user", {})
print(f"  Login: {user.get('email','FAIL')}")
dump("after login")
print(f"  Session cookies: {[c.name for c in CJ if 'session' in c.name.lower()]}")

# Try plan upgrade
csrf = get_csrf()
dump("before upgrade")
data = json.dumps({"plan":"lite","contact":"QQ:","message":"test"}).encode()
req = urllib.request.Request(BASE + "/api/plan-upgrade-requests", data=data, headers={"Content-Type":"application/json","x-csrf-token": csrf or ""}, method="POST")
try:
    resp = json.loads(OPENER.open(req).read().decode())
    print(f"  Upgrade: {resp}")
except urllib.error.HTTPError as e:
    print(f"  Upgrade FAIL: {e.code} {e.read().decode()[:200]}")
dump("after upgrade")
