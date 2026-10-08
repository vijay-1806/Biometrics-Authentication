import urllib.request
import json
import time

BASE = "http://127.0.0.1:8000"

def get(path, headers=None):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers or {})
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.headers.get_content_type(), resp.read()

def post(path, data, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", data=json.dumps(data).encode("utf-8"), headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.headers.get_content_type(), resp.read()

print("--- Testing ML Service API & SDK ---")

# 1. Root
status, ctype, body = get("/", headers={"Accept": "application/json"})
print(f"1. Root [/]: status={status}, ctype={ctype}, bytes={len(body)}")
assert status == 200

# 2. Key validate default
status, ctype, body = get("/api-keys/validate", {"X-API-Key": "bio_live_default_lms_key"})
data = json.loads(body)
print(f"2. Validate Default Key: tenant_id={data.get('tenant_id')}")
assert data.get("tenant_id") == "default"

# 3. Key validate custom tenant
status, ctype, body = get("/api-keys/validate", {"X-API-Key": "bio_live_acme_university"})
data = json.loads(body)
print(f"3. Validate Custom Tenant: tenant_id={data.get('tenant_id')}")
assert data.get("tenant_id") == "acme_university"

# 4. SDK Script Delivery
status, ctype, body = get("/sdk.js")
print(f"4. SDK Delivery [/sdk.js]: status={status}, ctype={ctype}, size={len(body)} bytes")
assert status == 200
assert "application/javascript" in ctype
assert b"BioAuth" in body

# 5. Demo Page Delivery
status, ctype, body = get("/demo")
print(f"5. Demo Delivery [/demo]: status={status}, ctype={ctype}, size={len(body)} bytes")
assert status == 200
assert "text/html" in ctype

# 6. Existing user 'vijay' status in default tenant
status, ctype, body = get("/users/vijay/status", {"X-API-Key": "bio_live_default_lms_key"})
data = json.loads(body)
print(f"6. Check existing student 'vijay': samples={data.get('samples_collected')}, state={data.get('state')}, tenant={data.get('tenant_id')}")
assert data.get("tenant_id") == "default"
assert data.get("samples_collected", 0) > 0

# 7. Check user 'vijay' in another tenant (e.g. acme_university) -> should be 0 samples (clean tenant isolation)
status, ctype, body = get("/users/vijay/status", {"X-API-Key": "bio_live_acme_university"})
data = json.loads(body)
print(f"7. Check 'vijay' in 'acme_university' tenant: samples={data.get('samples_collected')}, state={data.get('state')}, tenant={data.get('tenant_id')}")
assert data.get("tenant_id") == "acme_university"
assert data.get("samples_collected", 0) == 0

def delete(path, headers=None):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers or {}, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.headers.get_content_type(), resp.read()

# 8. Enterprise System Health Check
status, ctype, body = get("/v1/system/health")
health = json.loads(body)
print(f"8. System Health: status={health.get('status')}, cache_hits={health.get('cache', {}).get('hits')}, tenants={health.get('total_tenants')}")
assert health.get("status") == "healthy"
assert health.get("features", {}).get("in_memory_model_cache") is True

# 9. Register a New Enterprise Tenant
tenant_code = f"testcorp_{int(time.time())}"
status, ctype, body = post("/v1/tenants", {
    "tenant_id": tenant_code,
    "name": "Test Global Enterprises",
    "tier": "enterprise",
    "webhook_url": "https://httpbin.org/post"
}, {"X-API-Key": "bio_live_default_lms_key"})
t_data = json.loads(body)
print(f"9. Create Tenant '{tenant_code}': status={t_data.get('status')}, initial_key={t_data.get('tenant', {}).get('initial_api_key')}")
assert status == 200
assert t_data.get("tenant", {}).get("tier") == "enterprise"

# 10. Generate a Test Scoped Key for New Tenant
status, ctype, body = post(f"/v1/tenants/{tenant_code}/keys", {
    "name": "Staging Server Key",
    "type": "test",
    "scopes": ["verify", "enroll"]
}, {"X-API-Key": "bio_live_default_lms_key"})
key_res = json.loads(body)
new_key_str = key_res.get("key", {}).get("key")
key_id = key_res.get("key", {}).get("key_id")
print(f"10. Generate Scoped Key: key={new_key_str}, scopes={key_res.get('key', {}).get('scopes')}")
assert new_key_str.startswith("bio_test_")

# 11. Validate the New Generated Key
status, ctype, body = get("/api-keys/validate", {"X-API-Key": new_key_str})
val_res = json.loads(body)
print(f"11. Validate New Key: tenant_id={val_res.get('tenant_id')}, valid={val_res.get('valid')}")
assert val_res.get("tenant_id") == tenant_code
assert val_res.get("valid") is True

# 12. Test Outbound Signed Webhook Dispatch
status, ctype, body = post("/v1/webhooks/test", {
    "tenant_id": tenant_code,
    "event_type": "biometric.anomaly_detected",
    "payload": {"user_id": "student_99", "risk": "high", "trust_score": 31.4}
}, {"X-API-Key": new_key_str})
wh_res = json.loads(body)
print(f"12. Webhook Dispatch: status={wh_res.get('status')}, target={wh_res.get('target_tenant')}")
assert wh_res.get("status") == "dispatched"

# 13. Revoke Key
status, ctype, body = delete(f"/v1/tenants/{tenant_code}/keys/{key_id}", {"X-API-Key": "bio_live_default_lms_key"})
rev_res = json.loads(body)
print(f"13. Revoke Key '{key_id}': status={rev_res.get('status')}")
assert rev_res.get("status") == "revoked"

# 15. Origin / Domain Whitelist Protection & Hex Format Test
status, ctype, body = post(f"/v1/tenants/default/keys", {
    "name": "Restricted Domain Key",
    "type": "live",
    "allowed_origins": ["https://my-lms.edu"]
}, {"X-API-Key": "bio_live_default_lms_key"})
res = json.loads(body)
dom_key = res["key"]["key"]
print(f"15. Generate Domain-Restricted 48-Hex Key: masked={res['key']['masked_key']}, origins={res['key']['allowed_origins']}")
assert "••••" in res['key']['masked_key']
assert dom_key.startswith("bio_live_")

# Test 15a: Allowed Origin -> 200 OK
status, ctype, body = get("/api-keys/validate", {"X-API-Key": dom_key, "Origin": "https://my-lms.edu"})
assert status == 200

# Test 15b: Rogue Origin -> 403 Forbidden
try:
    status, ctype, body = get("/api-keys/validate", {"X-API-Key": dom_key, "Origin": "https://attacker-site.com"})
    assert False, "Should have failed with 403"
except urllib.error.HTTPError as e:
    print(f"15b. Rogue Origin Rejected: HTTP {e.code} (Expected 403 Forbidden)")
    assert e.code == 403

print("\n--> All 15 Enterprise BaaS tests passed successfully!")
