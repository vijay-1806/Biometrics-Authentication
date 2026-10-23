"""
BioAuth Enterprise Multi-Tenant Authentication & Access Control
Handles user accounts, salted PBKDF2 password hashing, secure session management,
workspace memberships with granular roles (owner, admin, developer, viewer),
and password recovery tokens.
"""

import os
import json
import secrets
import hashlib
import threading
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Header, Depends, Request

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
MEMBERSHIPS_FILE = os.path.join(DATA_DIR, "memberships.json")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")
RESETS_FILE = os.path.join(DATA_DIR, "password_resets.json")
os.makedirs(DATA_DIR, exist_ok=True)

_auth_lock = threading.Lock()
SESSION_TTL_DAYS = 14


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_password(password: str, salt_hex: Optional[str] = None) -> tuple[str, str]:
    """Generate salted PBKDF2-HMAC-SHA256 password hash."""
    if not salt_hex:
        salt_bytes = secrets.token_bytes(16)
        salt_hex = salt_bytes.hex()
    else:
        salt_bytes = bytes.fromhex(salt_hex)
    pwd_bytes = password.encode("utf-8")
    dk = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100000)
    return dk.hex(), salt_hex


def _verify_password(password: str, password_hash: str, salt_hex: str) -> bool:
    expected_hash, _ = _hash_password(password, salt_hex)
    return secrets.compare_digest(expected_hash, password_hash)


def _load_json(file_path: str, default_val: Any) -> Any:
    if not os.path.exists(file_path):
        return default_val
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default_val


def _save_json(file_path: str, data: Any):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _init_default_admin():
    """Ensure baseline platform administrator and client account exist."""
    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        memberships = _load_json(MEMBERSHIPS_FILE, [])

        # 1. Platform Super Admin (System Internal)
        admin_email = "admin@bioauth.service"
        admin_found = any(u.get("email") == admin_email for u in users.values())
        if not admin_found:
            salt_admin = secrets.token_hex(16)
            pwd_admin, salt_admin = _hash_password("BioAuth@2026!", salt_admin)
            admin_id = "usr_superadmin_01"
            users[admin_id] = {
                "id": admin_id,
                "email": admin_email,
                "name": "Platform Super Admin",
                "company": "BioAuth Internal Ops",
                "password_hash": pwd_admin,
                "salt": salt_admin,
                "role": "admin",
                "created_at": _now_iso(),
            }

        # 2. Client Account: Vijay (Owner of LMS Production)
        client_email = "vijay@bioauth.io"
        client_found = any(u.get("email") == client_email for u in users.values())
        if not client_found:
            salt_client = secrets.token_hex(16)
            pwd_client, salt_client = _hash_password("BioAuth@2026!", salt_client)
            client_id = "usr_210a9d0620adc3e8"
            users[client_id] = {
                "id": client_id,
                "email": client_email,
                "name": "Vijay",
                "company": "LMS Platform",
                "password_hash": pwd_client,
                "salt": salt_client,
                "role": "client",
                "created_at": _now_iso(),
            }
            # Assign membership exclusively to LMS workspace ('default')
            memberships.append({
                "id": "mem_be83768fdde1b748",
                "user_id": client_id,
                "tenant_id": "default",
                "role": "owner",
                "joined_at": _now_iso(),
            })

        _save_json(USERS_FILE, users)
        _save_json(MEMBERSHIPS_FILE, memberships)


_init_default_admin()


# ---------------------------------------------------------------------------
# User Registration & Account Lifecycle
# ---------------------------------------------------------------------------
def register_user(name: str, email: str, password: str, company: Optional[str] = None) -> dict:
    clean_email = email.strip().lower()
    clean_name = name.strip()
    if not clean_email or "@" not in clean_email:
        raise ValueError("A valid work email is required.")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        for u in users.values():
            if u.get("email", "").lower() == clean_email:
                raise ValueError("An account with this email already exists.")

        pwd_hash, salt = _hash_password(password)
        user_id = "usr_" + secrets.token_hex(8)
        # Self-service registration creates customer accounts only. Platform
        # administrator access is reserved for explicitly provisioned users.
        role = "client"

        new_user = {
            "id": user_id,
            "email": clean_email,
            "name": clean_name,
            "company": (company or "").strip(),
            "password_hash": pwd_hash,
            "salt": salt,
            "role": role,
            "created_at": _now_iso(),
        }
        users[user_id] = new_user
        _save_json(USERS_FILE, users)

        return {
            "id": user_id,
            "email": clean_email,
            "name": clean_name,
            "company": new_user["company"],
            "role": role,
            "created_at": new_user["created_at"],
        }


def authenticate_user(email: str, password: str) -> Optional[dict]:
    clean_email = email.strip().lower()
    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        for u in users.values():
            if u.get("email", "").lower() == clean_email:
                if _verify_password(password, u["password_hash"], u["salt"]):
                    return {
                        "id": u["id"],
                        "email": u["email"],
                        "name": u["name"],
                        "company": u.get("company", ""),
                        "role": u.get("role", "user"),
                        "created_at": u["created_at"],
                    }
                return None
    return None


def get_user_by_id(user_id: str) -> Optional[dict]:
    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        u = users.get(user_id)
        if not u:
            return None
        return {
            "id": u["id"],
            "email": u["email"],
            "name": u["name"],
            "company": u.get("company", ""),
            "role": u.get("role", "user"),
            "created_at": u["created_at"],
        }


def update_user_password(user_id: str, old_password: str, new_password: str) -> bool:
    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters long.")
    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        u = users.get(user_id)
        if not u:
            return False
        if not _verify_password(old_password, u["password_hash"], u["salt"]):
            raise ValueError("Current password is incorrect.")
        pwd_hash, salt = _hash_password(new_password)
        u["password_hash"] = pwd_hash
        u["salt"] = salt
        users[user_id] = u
        _save_json(USERS_FILE, users)
        return True


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
def create_session(user_id: str, default_tenant_id: Optional[str] = None) -> dict:
    with _auth_lock:
        sessions = _load_json(SESSIONS_FILE, {})
        token = secrets.token_hex(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()

        # If no active tenant specified, pick first workspace from memberships
        if not default_tenant_id:
            memberships = _load_json(MEMBERSHIPS_FILE, [])
            for m in memberships:
                if m.get("user_id") == user_id:
                    default_tenant_id = m.get("tenant_id")
                    break

        sessions[token] = {
            "token": token,
            "user_id": user_id,
            "active_tenant_id": default_tenant_id,
            "created_at": _now_iso(),
            "expires_at": expires_at,
        }
        _save_json(SESSIONS_FILE, sessions)
        return sessions[token]


def get_session(token: str) -> Optional[dict]:
    if not token:
        return None
    with _auth_lock:
        sessions = _load_json(SESSIONS_FILE, {})
        sess = sessions.get(token)
        if not sess:
            return None
        # Check expiry
        try:
            exp = datetime.fromisoformat(sess["expires_at"])
            if datetime.now(timezone.utc) > exp:
                del sessions[token]
                _save_json(SESSIONS_FILE, sessions)
                return None
        except Exception:
            pass
        return sess


def destroy_session(token: str) -> bool:
    with _auth_lock:
        sessions = _load_json(SESSIONS_FILE, {})
        if token in sessions:
            del sessions[token]
            _save_json(SESSIONS_FILE, sessions)
            return True
        return False


def switch_session_workspace(token: str, tenant_id: str) -> bool:
    """Switch active workspace in the authenticated session."""
    with _auth_lock:
        sessions = _load_json(SESSIONS_FILE, {})
        sess = sessions.get(token)
        if not sess:
            return False
        # Verify user has membership in tenant
        memberships = _load_json(MEMBERSHIPS_FILE, [])
        users = _load_json(USERS_FILE, {})
        user = users.get(sess["user_id"], {})
        has_access = user.get("role") == "admin" or any(
            m.get("user_id") == sess["user_id"] and m.get("tenant_id") == tenant_id
            for m in memberships
        )
        if not has_access:
            return False

        sess["active_tenant_id"] = tenant_id
        sessions[token] = sess
        _save_json(SESSIONS_FILE, sessions)
        return True


# ---------------------------------------------------------------------------
# Workspace Memberships
# ---------------------------------------------------------------------------
def add_membership(user_id: str, tenant_id: str, role: str = "member") -> dict:
    if role not in ("owner", "admin", "developer", "viewer"):
        role = "developer"
    with _auth_lock:
        memberships = _load_json(MEMBERSHIPS_FILE, [])
        for m in memberships:
            if m.get("user_id") == user_id and m.get("tenant_id") == tenant_id:
                m["role"] = role
                _save_json(MEMBERSHIPS_FILE, memberships)
                return m

        mem_id = "mem_" + secrets.token_hex(8)
        new_mem = {
            "id": mem_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "joined_at": _now_iso(),
        }
        memberships.append(new_mem)
        _save_json(MEMBERSHIPS_FILE, memberships)
        return new_mem


def get_user_memberships(user_id: str) -> List[dict]:
    with _auth_lock:
        memberships = _load_json(MEMBERSHIPS_FILE, [])
        return [m for m in memberships if m.get("user_id") == user_id]


def get_tenant_members(tenant_id: str) -> List[dict]:
    with _auth_lock:
        memberships = _load_json(MEMBERSHIPS_FILE, [])
        users = _load_json(USERS_FILE, {})
        results = []
        for m in memberships:
            if m.get("tenant_id") == tenant_id:
                u = users.get(m.get("user_id"), {})
                results.append({
                    "membership_id": m.get("id"),
                    "user_id": m.get("user_id"),
                    "name": u.get("name", "Unknown"),
                    "email": u.get("email", ""),
                    "role": m.get("role", "developer"),
                    "joined_at": m.get("joined_at"),
                })
        return results


def user_has_tenant_access(user_id: str, tenant_id: str) -> tuple[bool, Optional[str]]:
    """Return (has_access, role). Admins have universal platform access."""
    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        u = users.get(user_id)
        if u and u.get("role") == "admin":
            return True, "owner"

        memberships = _load_json(MEMBERSHIPS_FILE, [])
        for m in memberships:
            if m.get("user_id") == user_id and m.get("tenant_id") == tenant_id:
                return True, m.get("role", "developer")
    return False, None


def remove_membership(tenant_id: str, target_user_id: str) -> bool:
    with _auth_lock:
        memberships = _load_json(MEMBERSHIPS_FILE, [])
        filtered = [
            m for m in memberships
            if not (m.get("tenant_id") == tenant_id and m.get("user_id") == target_user_id)
        ]
        if len(filtered) != len(memberships):
            _save_json(MEMBERSHIPS_FILE, filtered)
            return True
        return False


# ---------------------------------------------------------------------------
# Password Recovery
# ---------------------------------------------------------------------------
def create_password_reset_token(email: str) -> Optional[str]:
    clean_email = email.strip().lower()
    with _auth_lock:
        users = _load_json(USERS_FILE, {})
        target_uid = None
        for u in users.values():
            if u.get("email", "").lower() == clean_email:
                target_uid = u["id"]
                break
        if not target_uid:
            return None

        resets = _load_json(RESETS_FILE, {})
        token = secrets.token_hex(24)
        resets[token] = {
            "token": token,
            "user_id": target_uid,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        }
        _save_json(RESETS_FILE, resets)
        return token


def reset_password_with_token(token: str, new_password: str) -> bool:
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    with _auth_lock:
        resets = _load_json(RESETS_FILE, {})
        rec = resets.get(token)
        if not rec:
            return False
        try:
            exp = datetime.fromisoformat(rec["expires_at"])
            if datetime.now(timezone.utc) > exp:
                del resets[token]
                _save_json(RESETS_FILE, resets)
                return False
        except Exception:
            return False

        user_id = rec["user_id"]
        users = _load_json(USERS_FILE, {})
        if user_id not in users:
            return False

        pwd_hash, salt = _hash_password(new_password)
        users[user_id]["password_hash"] = pwd_hash
        users[user_id]["salt"] = salt
        _save_json(USERS_FILE, users)

        del resets[token]
        _save_json(RESETS_FILE, resets)
        return True


# ---------------------------------------------------------------------------
# FastAPI Dependency Helpers
# ---------------------------------------------------------------------------
def get_current_user_and_session(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
) -> dict:
    """Authenticate incoming HTTP request via Bearer token or session header."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
        # If it's an API key (starts with bio_), let API key flow handle it
        if not raw.startswith("bio_"):
            token = raw
    if not token and x_session_token:
        token = x_session_token.strip()

    if not token:
        raise HTTPException(401, "Authentication required. Please sign in.")

    sess = get_session(token)
    if not sess:
        raise HTTPException(401, "Session expired or invalid. Please sign in again.")

    user = get_user_by_id(sess["user_id"])
    if not user:
        raise HTTPException(401, "User account not found.")

    return {
        "user": user,
        "session": sess,
        "active_tenant_id": sess.get("active_tenant_id"),
    }


def require_admin_user(auth_ctx: dict = Depends(get_current_user_and_session)) -> dict:
    """Enforce platform administrator authorization."""
    if auth_ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Access denied. Platform administrator privilege required.")
    return auth_ctx
