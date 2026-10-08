"""
Test Suite for BioAuth BaaS Customer SaaS Platform & Tenant Isolation
Uses urllib to test directly against running server http://127.0.0.1:8000
"""

import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"


def req(path, method="GET", body=None, headers=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, {"detail": content}


def run_tests():
    print("=== Running BioAuth SaaS Platform Test Suite (Live Server) ===")

    # 1. Register User A
    email_a = "alice@acme.edu"
    st, res = req("/v1/auth/register", "POST", {
        "name": "Alice Smith",
        "email": email_a,
        "password": "Password123!",
        "company": "Acme University"
    })
    if st == 400 and "already exists" in str(res):
        st, res = req("/v1/auth/login", "POST", {"email": email_a, "password": "Password123!"})
    assert st == 200, f"Register A failed: {st} {res}"
    token_a = res["session_token"]
    print("1. [PASS] Register/Login User A:", email_a)

    # 2. Onboarding: Create Workspace A
    ws_name = "Acme University"
    st, res = req(
        "/v1/workspaces",
        "POST",
        {"name": ws_name, "tier": "growth", "industry": "Education"},
        {"Authorization": f"Bearer {token_a}"}
    )
    if st == 400 and "already exists" in str(res):
        ws_a = "acme-university"
    else:
        assert st == 200, f"Create workspace failed: {st} {res}"
        ws_a = res["workspace"]["id"]
    print("2. [PASS] Workspace A active:", ws_a)

    # 3. Check Onboarding Checklist
    st, res = req(f"/v1/workspaces/{ws_a}/checklist", "GET", headers={"Authorization": f"Bearer {token_a}"})
    assert st == 200
    assert res["steps"][0]["completed"] is True
    print("3. [PASS] Onboarding checklist:", res["completed"], "/", res["total"], f"({res['percentage']}%)")

    # 4. Generate API Key in Workspace A
    st, res = req(
        f"/v1/workspaces/{ws_a}/keys",
        "POST",
        {"name": "LMS Exam Key", "type": "live", "scopes": ["verify", "enroll"]},
        {"Authorization": f"Bearer {token_a}"}
    )
    assert st == 200, f"Key create failed: {st} {res}"
    raw_key = res["key"]["key"]
    key_id = res["key"]["key_id"]
    assert raw_key.startswith("bio_live_")
    print("4. [PASS] Generated API Key in Workspace A:", key_id)

    # 5. List Keys in Workspace A (Raw key must NOT be returned in list!)
    st, res = req(f"/v1/workspaces/{ws_a}/keys", "GET", headers={"Authorization": f"Bearer {token_a}"})
    assert st == 200
    keys = res["keys"]
    target_k = next(k for k in keys if k["key_id"] == key_id)
    assert "••••" in target_k["masked_key"]
    print("5. [PASS] Key listed in masked format:", target_k["masked_key"])

    # 6. Reveal Key with Security Confirmation
    st, res = req(
        f"/v1/workspaces/{ws_a}/keys/{key_id}/reveal",
        "POST",
        {},
        {"Authorization": f"Bearer {token_a}"}
    )
    assert st == 200, f"Reveal failed: {st} {res}"
    assert res["key"] == raw_key
    print("6. [PASS] Key decrypted and temporarily revealed successfully")

    # 7. Attempt Deletion of Active Key (Must be rejected with 400!)
    st, res = req(f"/v1/workspaces/{ws_a}/keys/{key_id}", "DELETE", headers={"Authorization": f"Bearer {token_a}"})
    assert st == 400, f"Active key deletion should be rejected! Got {st}"
    print("7. [PASS] Deletion of active key properly blocked with HTTP 400")

    # 8. Revoke Key
    st, res = req(f"/v1/workspaces/{ws_a}/keys/{key_id}/revoke", "POST", headers={"Authorization": f"Bearer {token_a}"})
    assert st == 200
    print("8. [PASS] Key revoked")

    # 9. Permanently Delete Revoked Key
    st, res = req(f"/v1/workspaces/{ws_a}/keys/{key_id}", "DELETE", headers={"Authorization": f"Bearer {token_a}"})
    assert st == 200
    print("9. [PASS] Revoked key permanently deleted")

    # 10. Tenant Isolation: Register User B and verify they CANNOT access Workspace A
    email_b = "bob@other.org"
    st, res = req("/v1/auth/register", "POST", {
        "name": "Bob Jones",
        "email": email_b,
        "password": "Password123!",
        "company": "Other Org"
    })
    if st == 400:
        st, res = req("/v1/auth/login", "POST", {"email": email_b, "password": "Password123!"})
    assert st == 200
    token_b = res["session_token"]

    # User B attempts to access Workspace A: must receive 403 Forbidden!
    st, res = req(f"/v1/workspaces/{ws_a}", "GET", headers={"Authorization": f"Bearer {token_b}"})
    assert st == 403, f"Tenant isolation failed! Expected 403, got {st}"
    print("10. [PASS] Tenant Isolation enforced: User B blocked with HTTP 403 from Workspace A")

    # 11. Workspace A Real Empty States
    st, res = req(f"/v1/workspaces/{ws_a}/analytics?period=7d", "GET", headers={"Authorization": f"Bearer {token_a}"})
    assert st == 200
    assert res["has_data"] is False
    assert res["total_verifications"] == 0
    print("11. [PASS] Real empty state confirmed (0 verifications, has_data=False)")

    # Clean up test users
    import auth, tenants
    users = auth._load_json(auth.USERS_FILE, {})
    auth._save_json(auth.USERS_FILE, {k: v for k, v in users.items() if v["email"] not in (email_a, email_b)})
    tenants.delete_tenant(ws_a)
    print("=== All 11 SaaS Platform & Security Tests Passed Successfully! ===")


if __name__ == "__main__":
    run_tests()
