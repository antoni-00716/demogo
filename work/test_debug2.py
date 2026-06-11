import urllib.request, json, http.cookiejar, time

BASE = "http://127.0.0.1:3001"
CJ = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CJ))

def api(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["x-csrf-token"] = token
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    return json.loads(OPENER.open(req).read().decode())

def get_csrf():
    OPENER.open(urllib.request.Request(BASE + "/api/health"))
    for c in CJ: 
        if c.name == "csrf_token": return c.value
    return ""

EMAIL = f"debug-{int(time.time())}@demogo.cn"
print(f"Email: {EMAIL}")

# Send code
api("POST", "/api/auth/send-verification-code", {"email": EMAIL, "password": "TestPass123!"})

# Read code from MySQL
import pymysql
conn = pymysql.connect(host="127.0.0.1", user="demogo_app", password="atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV", database="demogo")
cur = conn.cursor()
cur.execute("SELECT metadata_json FROM audit_logs WHERE action=%s ORDER BY created_at DESC LIMIT 1", ("email_verification",))
code = json.loads(cur.fetchone()[0]).get("code")
cur.close(); conn.close()

# Register
api("POST", "/api/auth/register", {"email": EMAIL, "password": "TestPass123!", "name": "Debug", "verificationCode": code}, token=get_csrf())

# Login
r = api("POST", "/api/auth/login", {"email": EMAIL, "password": "TestPass123!"}, token=get_csrf())
print("Login result:", r.get("user",{}).get("email","FAIL"))

# Dump all cookies
print("Cookies after login:")
for c in CJ:
    print(f"  {c.name}: {c.value[:20]}... domain={c.domain} path={c.path} secure={c.secure}")

# Try plan upgrade
r = api("POST", "/api/plan-upgrade-requests", {"plan":"lite","contact":"QQ:","message":"test"}, token=get_csrf())
print(f"Upgrade: {r.get('error','OK')} {r.get('request',{}).get('requestedPlan','')}")
