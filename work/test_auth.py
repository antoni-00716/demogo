import urllib.request, json, pymysql, urllib.error
BASE = "http://127.0.0.1:3001"
def api(method, path, data=None, token=None):
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token: headers["x-csrf-token"] = token
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        return json.loads(urllib.request.urlopen(req).read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())

def get_csrf():
    import http.cookiejar
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.open(urllib.request.Request(BASE + "/api/health"))
    for cookie in cj:
        if cookie.name == "csrf_token":
            return cookie.value
    return ""

EMAIL = "new-flow-test@demogo.cn"

print("1. Send verification")
r = api("POST", "/api/auth/send-verification-code", {"email": EMAIL, "password": "TestPass123!"})
print("  ", "OK" if r.get("ok") else "FAIL", r)

print("2. Read code from MySQL")
conn = pymysql.connect(host="127.0.0.1", user="demogo_app", password="atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV", database="demogo")
cur = conn.cursor()
cur.execute("SELECT metadata_json FROM audit_logs WHERE action=%s ORDER BY created_at DESC LIMIT 1", ("email_verification",))
row = cur.fetchone()
code = json.loads(row[0]).get("code") if row else None
print("  Code:", code)
cur.close(); conn.close()

if code:
    csrf = get_csrf()
    print("3. Register (csrf:", csrf[:10] if csrf else "NONE", ")")
    r = api("POST", "/api/auth/register", {"email": EMAIL, "password": "TestPass123!", "name": "Flow Tester", "verificationCode": code}, token=csrf)
    user = r.get("user", {})
    print("  User:", user.get("email"), "plan:", user.get("plan"), "OK" if user.get("email") else "FAIL -", r.get("error",""))

    print("4. Login")
    r = api("POST", "/api/auth/login", {"email": EMAIL, "password": "TestPass123!"}, token=get_csrf())
    user = r.get("user", {})
    print("  User:", user.get("email"), "plan:", user.get("plan"), "OK" if user.get("email") else "FAIL -", r.get("error",""))
