#!/usr/bin/env python3
"""DemoGo 核心流程测试 v2 - 修复版"""
import urllib.request, urllib.error, json, http.cookiejar, sys, os

BASE = "http://127.0.0.1:3001"
DATA_DIR = "/var/lib/demogo/data"
MYSQL_CFG = {"host":"127.0.0.1","user":"demogo_app","password":"atMt3hmey-Ro187KS8s8Yv_uJ-ge5y69ipgoVsv7pKNthfsV","database":"demogo"}

def api(method, path, data=None, token=None, auth=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token: headers["x-csrf-token"] = token
    if auth:
        import base64
        b64 = base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode()
        headers["Authorization"] = f"Basic {b64}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read().decode())
        except: return {"error": f"HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"error": str(e)}

def get_csrf_token():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    try:
        opener.open(urllib.request.Request(BASE + "/api/health"))
        for cookie in cj:
            if cookie.name == "csrf_token": return cookie.value
    except: pass
    return ""

def get_verification_code(email):
    """Read verification code from MySQL audit_logs"""
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

EMAIL = "test-core-flow@demogo.cn"
results = []

print("=" * 50)
print("  DemoGo 核心流程测试")
print("=" * 50)

print("\n--- 0. Health Check ---")
h = api("GET", "/api/health")
ok = h.get("ok") and h.get("status") == "healthy"
print(f"  v{h.get('version','?')} ->", "PASS" if ok else "FAIL")
results.append(("Health", ok))

print("\n--- 1. Send Verification Code ---")
r = api("POST", "/api/auth/send-verification-code", {"email": EMAIL, "password": "TestPass123!"})
ok = r.get("ok") == True
print(f"  {r.get('ok')} ->", "PASS" if ok else "FAIL")
results.append(("Send Code", ok))

print("\n--- 2. Read Verification Code ---")
code = get_verification_code(EMAIL)
ok = code is not None
print(f"  Code: {code} ->", "PASS" if ok else "FAIL")
results.append(("Read Code", ok))

if ok:
    print("\n--- 3. Register User ---")
    csrf = get_csrf_token()
    r = api("POST", "/api/auth/register", {"email": EMAIL, "password": "TestPass123!", "name": "流程测试", "verificationCode": code}, token=csrf)
    user = r.get("user", {})
    ok = user.get("email") == EMAIL
    print(f"  User: {user.get('email','?')} plan={user.get('plan','?')} ->", "PASS" if ok else "FAIL")
    results.append(("Register", ok))

print("\n--- 4. Login ---")
csrf = get_csrf_token()
r = api("POST", "/api/auth/login", {"email": EMAIL, "password": "TestPass123!"}, token=csrf)
user = r.get("user", {})
ok = user.get("email") == EMAIL
print(f"  User: {user.get('email','?')} plan={user.get('plan','?')} ->", "PASS" if ok else "FAIL")
results.append(("Login", ok))

if ok:
    print("\n--- 5. Submit Plan Upgrade Request ---")
    csrf = get_csrf_token()
    r = api("POST", "/api/plan-upgrade-requests", {"plan": "lite", "contact": "QQ: 304598006", "message": "测试升级流程"}, token=csrf)
    req_data = r.get("request", {})
    contact = r.get("contact", {})
    ok = req_data.get("requestedPlan") == "lite"
    print(f"  Plan: {req_data.get('requestedPlan','?')} status={req_data.get('status','?')}")
    print(f"  Contact: {contact}")
    print(f"  ->", "PASS" if ok else "FAIL")
    results.append(("Upgrade Request", ok))

    print("\n--- 6. Admin Overview (Basic Auth) ---")
    r = api("GET", "/api/admin/overview", auth=("admin", "admin1234"))
    ok = "metrics" in r
    plan_reqs = r.get("planRequests", [])
    print(f"  Keys: {list(r.keys())[:3]}, planRequests: {len(plan_reqs)} ->", "PASS" if ok else "FAIL")
    results.append(("Admin Overview", ok))

print("\n" + "=" * 50)
print("  测试结果汇总")
print("=" * 50)
all_pass = True
for name, passed in results:
    print(f"  {'PASS' if passed else 'FAIL'} [{name}]")
    if not passed: all_pass = False
print(f"\n  总体: {'全部通过!' if all_pass else '有失败项目'}")
