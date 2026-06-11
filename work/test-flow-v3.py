#!/usr/bin/env python3
"""DemoGo 核心流程测试 v3"""
import urllib.request, urllib.error, json, http.cookiejar, sys, os

BASE = "http://127.0.0.1:3001"
MYSQL_CFG = {"host":"127.0.0.1","user":"demogo_app","password":"atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV","database":"demogo"}

# Global cookie jar + opener for session persistence
COOKIE_JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(COOKIE_JAR))

def api(method, path, data=None, token=None, auth=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token: headers["x-csrf-token"] = token
    if auth:
        import base64
        b64 = base64.b64_encode(f"{auth[0]}:{auth[1]}".encode()).decode()
        headers["Authorization"] = f"Basic {b64}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with OPENER.open(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read().decode())
        except: return {"error": f"HTTP {e.code}"}
    except Exception as e:
        return {"error": str(e)}

def get_csrf():
    """Ensure CSRF cookie is set, return current token from cookie"""
    OPENER.open(urllib.request.Request(BASE + "/api/health"))
    for cookie in COOKIE_JAR:
        if cookie.name == "csrf_token":
            return cookie.value
    return ""

def get_code(email):
    try:
        import pymysql
        conn = pymysql.connect(**MYSQL_CFG)
        cur = conn.cursor()
        cur.execute("SELECT metadata_json FROM audit_logs WHERE action=%s ORDER BY created_at DESC LIMIT 1", ("email_verification",))
        row = cur.fetchone()
        cur.close(); conn.close()
        if row:
            meta = json.loads(row[0])
            if meta.get("email") == email: return meta.get("code")
    except: pass
    return None

EMAIL = "test-core-v3@demogo.cn"
results = []

print("=== DemoGo 核心流程测试 v3 ===")

print("\n1. Health Check")
r = api("GET", "/api/health")
ok = r.get("ok") and r.get("status") == "healthy"
print(f"   v{r.get('version','?')} ->", "PASS" if ok else "FAIL")
results.append(("Health", ok))

print("\n2. Send Verification Code")
csrf = get_csrf()
print(f"   CSRF token: {csrf[:10] if csrf else 'NONE'}...")
r = api("POST", "/api/auth/send-verification-code", {"email": EMAIL, "password": "TestPass123!"})
ok = r.get("ok") == True
print(f"   ->", "PASS" if ok else "FAIL", r.get("error",""))
results.append(("Send Code", ok))

print("\n3. Read Code from MySQL")
code = get_code(EMAIL)
ok = code is not None
print(f"   Code: {code} ->", "PASS" if ok else "FAIL")
results.append(("Read Code", ok))

if code:
    print("\n4. Register")
    r = api("POST", "/api/auth/register", {"email": EMAIL, "password": "TestPass123!", "name": "流程测试", "verificationCode": code}, token=get_csrf())
    user = r.get("user", {})
    ok = user.get("email") == EMAIL
    print(f"   User: {user.get('email','?')} plan={user.get('plan','?')} ->", "PASS" if ok else "FAIL")
    results.append(("Register", ok))

print("\n5. Login")
r = api("POST", "/api/auth/login", {"email": EMAIL, "password": "TestPass123!"}, token=get_csrf())
user = r.get("user", {})
ok = user.get("email") == EMAIL
print(f"   User: {user.get('email','?')} plan={user.get('plan','?')} ->", "PASS" if ok else "FAIL")
results.append(("Login", ok))

print("\n6. Submit Plan Upgrade Request")
r = api("POST", "/api/plan-upgrade-requests", {"plan": "lite", "contact": "QQ: 304598006", "message": "测试升级"}, token=get_csrf())
req_data = r.get("request", {})
contact = r.get("contact", {})
ok = req_data.get("requestedPlan") == "lite"
print(f"   Plan: {req_data.get('requestedPlan','?')} status={req_data.get('status','?')}")
print(f"   Contact: {contact}")
print(f"   ->", "PASS" if ok else "FAIL", r.get("error",""))
results.append(("Upgrade Request", ok))

print("\n7. Admin Overview")
r = api("GET", "/api/admin/overview", auth=("admin", "admin1234"))
ok = "metrics" in r
print(f"   Has metrics: {ok} ->", "PASS" if ok else "FAIL")
results.append(("Admin Overview", ok))

print("\n=== 结果汇总 ===")
for name, passed in results:
    print(f"  {'PASS' if passed else 'FAIL'} [{name}]")
print(f"\n总体: {'全部通过!' if all([p for _,p in results]) else '有失败'}")
