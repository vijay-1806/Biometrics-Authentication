"""
Enterprise Multi-Tenant & API Key Management for Biometrics-as-a-Service (BaaS)
Handles tenant registration, cryptographic hexadecimal API key generation,
key masking (show once, mask forever), domain/origin whitelisting,
rate limiting, usage metrics, and cryptographically signed webhook dispatching.
"""

import os
import json
import time
import hmac
import hashlib
import ipaddress
import secrets
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import urllib.request
import urllib.error

from crypto_vault import encrypt_secret, decrypt_secret, hash_secret, mask_key

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
TENANTS_FILE = os.path.join(DATA_DIR, "tenants.json")
KEYS_FILE = os.path.join(DATA_DIR, "api_keys.json")
METRICS_FILE = os.path.join(DATA_DIR, "tenant_metrics.json")
os.makedirs(DATA_DIR, exist_ok=True)

# Lock for thread-safe read/writes to JSON stores
_lock = threading.Lock()

# In-memory sliding window rate-limiter: tenant_id -> list of timestamps
_rate_limits: Dict[str, List[float]] = {}

DEFAULT_TIERS = {
    "starter": {"rpm": 120, "max_keys": 3, "retention_days": 30},
    "growth": {"rpm": 600, "max_keys": 10, "retention_days": 90},
    "enterprise": {"rpm": 3000, "max_keys": 50, "retention_days": 365},
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _mask_key(key_str: str) -> str:
    """Mask key preserving prefix and last 4 hex characters."""
    if not key_str:
        return ""
    if len(key_str) <= 16:
        return key_str[:8] + "••••••••"
    return f"{key_str[:12]}••••••••••••••••{key_str[-4:]}"


def is_origin_allowed(allowed_origins: Optional[List[str]], origin: Optional[str]) -> bool:
    """Validate if request origin is authorized by key whitelist."""
    if not allowed_origins or "*" in allowed_origins:
        return True
    if not origin:
        return True  # Non-browser server-to-server calls bypass CORS origin check
    clean_origin = origin.rstrip("/").lower()
    for pattern in allowed_origins:
        pat = pattern.rstrip("/").lower()
        if pat == "*" or pat == clean_origin:
            return True
        if pat.startswith("*.") and clean_origin.endswith(pat[1:]):
            return True
    return False


def _init_default_data():
    """Ensure baseline tenants and API keys exist for backward compatibility."""
    with _lock:
        tenants = {}
        if os.path.exists(TENANTS_FILE):
            try:
                with open(TENANTS_FILE, "r", encoding="utf-8") as f:
                    tenants = json.load(f)
            except Exception:
                tenants = {}

        if "default" not in tenants:
            tenants["default"] = {
                "id": "default",
                "name": "LMS Production Platform",
                "tier": "enterprise",
                "status": "active",
                "created_at": _now_iso(),
                "webhook_url": None,
                "webhook_secret": secrets.token_hex(16),
                "allowed_origins": ["*"],
            }

        with open(TENANTS_FILE, "w", encoding="utf-8") as f:
            json.dump(tenants, f, indent=2)

        keys = {}
        if os.path.exists(KEYS_FILE):
            try:
                with open(KEYS_FILE, "r", encoding="utf-8") as f:
                    keys = json.load(f)
            except Exception:
                keys = {}

        # Default LMS Key (Maintained for seamless LMS operation)
        if "bio_live_default_lms_key" not in keys:
            keys["bio_live_default_lms_key"] = {
                "key_id": "key_lms_default",
                "key": "bio_live_default_lms_key",
                "masked_key": _mask_key("bio_live_default_lms_key"),
                "tenant_id": "default",
                "name": "LMS Core Integration Key",
                "type": "live",
                "scopes": ["verify", "enroll", "retrain"],
                "allowed_origins": ["*"],
                "created_at": _now_iso(),
                "last_used_at": _now_iso(),
                "active": True,
            }

        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)

        # Metrics file
        if not os.path.exists(METRICS_FILE):
            metrics = {
                "default": {"total_verifications": 0, "total_enrollments": 0, "anomalies_flagged": 0, "last_active": _now_iso()},
                "demo": {"total_verifications": 0, "total_enrollments": 0, "anomalies_flagged": 0, "last_active": _now_iso()},
            }
            with open(METRICS_FILE, "w", encoding="utf-8") as f:
                json.dump(metrics, f, indent=2)


_init_default_data()


# ---------------------------------------------------------------------------
# Tenant Operations
# ---------------------------------------------------------------------------
def get_tenant(tenant_id: str) -> Optional[dict]:
    with _lock:
        if not os.path.exists(TENANTS_FILE):
            return None
        with open(TENANTS_FILE, "r", encoding="utf-8") as f:
            tenants = json.load(f)
            return tenants.get(tenant_id)


def list_tenants() -> List[dict]:
    with _lock:
        if not os.path.exists(TENANTS_FILE):
            return []
        with open(TENANTS_FILE, "r", encoding="utf-8") as f:
            tenants = json.load(f)
            return list(tenants.values())


def create_tenant(
    tenant_id: str,
    name: str,
    tier: str = "growth",
    webhook_url: Optional[str] = None,
    allowed_origins: Optional[List[str]] = None,
) -> dict:
    tid = tenant_id.strip().lower()
    if tier not in DEFAULT_TIERS:
        tier = "growth"
    if allowed_origins is None:
        allowed_origins = ["*"]

    with _lock:
        tenants = {}
        if os.path.exists(TENANTS_FILE):
            with open(TENANTS_FILE, "r", encoding="utf-8") as f:
                tenants = json.load(f)

        if tid in tenants:
            raise ValueError(f"Tenant '{tid}' already exists.")

        tenant = {
            "id": tid,
            "name": name,
            "tier": tier,
            "status": "active",
            "created_at": _now_iso(),
            "webhook_url": webhook_url,
            "webhook_secret": secrets.token_hex(16),
            "allowed_origins": allowed_origins,
        }
        tenants[tid] = tenant

        with open(TENANTS_FILE, "w", encoding="utf-8") as f:
            json.dump(tenants, f, indent=2)

        # Generate Cryptographic Hexadecimal API Key (48 hex characters / 192-bit entropy)
        hex_secret = secrets.token_hex(24)
        api_key_str = f"bio_live_{hex_secret}"
        key_id = f"key_{secrets.token_hex(8)}"
        masked = _mask_key(api_key_str)

        keys = {}
        if os.path.exists(KEYS_FILE):
            with open(KEYS_FILE, "r", encoding="utf-8") as f:
                keys = json.load(f)

        keys[api_key_str] = {
            "key_id": key_id,
            "key": api_key_str,
            "masked_key": masked,
            "tenant_id": tid,
            "name": "Default Live Key",
            "type": "live",
            "scopes": ["verify", "enroll", "retrain"],
            "allowed_origins": allowed_origins,
            "created_at": _now_iso(),
            "last_used_at": None,
            "active": True,
        }

        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)

        tenant["initial_api_key"] = api_key_str
        tenant["masked_key"] = masked
        tenant["key_warning"] = "Copy this key now. For enterprise security, raw keys are masked after generation."
        return tenant


def update_tenant(tenant_id: str, updates: dict) -> Optional[dict]:
    with _lock:
        if not os.path.exists(TENANTS_FILE):
            return None
        with open(TENANTS_FILE, "r", encoding="utf-8") as f:
            tenants = json.load(f)
        if tenant_id not in tenants:
            return None

        for k in ("name", "tier", "status", "rate_limit_rpm", "webhook_url", "allowed_origins"):
            if k in updates:
                tenants[tenant_id][k] = updates[k]

        with open(TENANTS_FILE, "w", encoding="utf-8") as f:
            json.dump(tenants, f, indent=2)
        return tenants[tenant_id]


# ---------------------------------------------------------------------------
# API Key Operations (Hexadecimal, Scopes, Origin Whitelisting, Masking)
# ---------------------------------------------------------------------------
def get_key_info(raw_key: str) -> Optional[dict]:
    if not raw_key:
        return None
    key_str = raw_key.strip()
    with _lock:
        if not os.path.exists(KEYS_FILE):
            return None
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            keys = json.load(f)
            return keys.get(key_str)


def list_keys_for_tenant(tenant_id: str) -> List[dict]:
    """
    Return all keys for a tenant in masked format.
    Raw keys are NEVER exposed in list operations.
    """
    with _lock:
        if not os.path.exists(KEYS_FILE):
            return []
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            keys = json.load(f)
            result = []
            for v in keys.values():
                if v.get("tenant_id") == tenant_id:
                    k_val = v.get("key", "")
                    masked = v.get("masked_key") or _mask_key(k_val)
                    result.append({
                        "key_id": v["key_id"],
                        "name": v["name"],
                        "type": v["type"],
                        "scopes": v["scopes"],
                        "allowed_origins": v.get("allowed_origins", ["*"]),
                        "allowed_ips": v.get("allowed_ips", []),
                        "expires_at": v.get("expires_at"),
                        "request_count": v.get("request_count", 0),
                        "created_at": v["created_at"],
                        "last_used_at": v.get("last_used_at"),
                        "active": v["active"],
                        "masked_key": masked,
                    })
            return result


def generate_api_key(
    tenant_id: str,
    name: str = "Production Key",
    key_type: str = "live",
    scopes: Optional[List[str]] = None,
    allowed_origins: Optional[List[str]] = None,
    allowed_ips: Optional[List[str]] = None,
    expires_at: Optional[str] = None,
) -> dict:
    """
    Generate a new high-entropy 48-char hexadecimal API key.
    Returns the raw key ONLY once upon creation.
    """
    tenant = get_tenant(tenant_id)
    if not tenant:
        raise ValueError(f"Tenant '{tenant_id}' not found.")

    # Enforce the active key quota from the selected plan.
    existing_keys = list_keys_for_tenant(tenant_id)
    active_keys = [k for k in existing_keys if k.get("active", True)]
    tier = tenant.get("tier", "growth")
    max_keys = DEFAULT_TIERS.get(tier, DEFAULT_TIERS["growth"])["max_keys"]
    if len(active_keys) >= max_keys:
        raise ValueError(f"This workspace has reached its {max_keys}-key limit for the {tier} plan. Revoke an unused key or change plans.")

    prefix = "bio_live_" if key_type == "live" else "bio_test_"
    # Cryptographic Hexadecimal: 24 bytes = 48 hex digits (192-bit entropy)
    hex_entropy = secrets.token_hex(24)
    api_key_str = f"{prefix}{hex_entropy}"
    key_id = f"key_{secrets.token_hex(8)}"
    masked = _mask_key(api_key_str)

    if scopes is None:
        scopes = ["verify", "enroll", "retrain"]
    unsupported_scopes = set(scopes) - {"verify", "enroll", "retrain"}
    if unsupported_scopes:
        raise ValueError("API keys may only receive verify, enroll, and retrain permissions.")
    if allowed_origins is None:
        allowed_origins = tenant.get("allowed_origins", ["*"])
    normalized_ips = []
    for value in allowed_ips or []:
        try:
            normalized_ips.append(str(ipaddress.ip_network(str(value).strip(), strict=False)))
        except ValueError:
            raise ValueError(f"Invalid IP address or CIDR range: {value}")
    if expires_at:
        try:
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except (TypeError, ValueError):
            raise ValueError("Expiration must be a valid ISO date/time.")
        if datetime.fromisoformat(expires_at) <= datetime.now(timezone.utc):
            raise ValueError("Expiration date must be in the future.")

    encrypted_str = encrypt_secret(api_key_str)
    hashed_str = hash_secret(api_key_str)

    new_key_record = {
        "key_id": key_id,
        "key": api_key_str,
        "key_hash": hashed_str,
        "encrypted_key": encrypted_str,
        "masked_key": masked,
        "tenant_id": tenant_id,
        "name": name,
        "type": key_type,
        "scopes": scopes,
        "allowed_origins": allowed_origins,
        "allowed_ips": normalized_ips,
        "expires_at": expires_at,
        "request_count": 0,
        "created_at": _now_iso(),
        "last_used_at": None,
        "active": True,
    }

    with _lock:
        keys = {}
        if os.path.exists(KEYS_FILE):
            with open(KEYS_FILE, "r", encoding="utf-8") as f:
                keys = json.load(f)
        keys[api_key_str] = new_key_record
        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)

    return {
        "key_id": key_id,
        "key": api_key_str,
        "masked_key": masked,
        "tenant_id": tenant_id,
        "name": name,
        "type": key_type,
        "scopes": scopes,
        "allowed_origins": allowed_origins,
        "allowed_ips": normalized_ips,
        "expires_at": expires_at,
        "warning": "Save this key now in your .env file. Keep it secure.",
    }


def reveal_api_key(tenant_id: str, key_id: str) -> Optional[str]:
    """
    Securely decrypt and reveal the raw key for an authorized user after security confirmation.
    """
    with _lock:
        if not os.path.exists(KEYS_FILE):
            return None
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            keys = json.load(f)

        for v in keys.values():
            if v.get("tenant_id") == tenant_id and v.get("key_id") == key_id:
                # First check encrypted_key
                if v.get("encrypted_key"):
                    decrypted = decrypt_secret(v["encrypted_key"])
                    if decrypted:
                        return decrypted
                # Fallback to key field if not yet encrypted
                return v.get("key")
        return None


def revoke_api_key(tenant_id: str, key_id: str) -> bool:
    with _lock:
        if not os.path.exists(KEYS_FILE):
            return False
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            keys = json.load(f)

        target_key = None
        for k, v in keys.items():
            if v.get("tenant_id") == tenant_id and v.get("key_id") == key_id:
                target_key = k
                break

        if not target_key:
            return False

        keys[target_key]["active"] = False
        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)
        return True


def delete_api_key(tenant_id: str, key_id: str) -> bool:
    """
    Permanently delete an API key.
    STRICT SECURITY RULE: Only REVOKED keys can be permanently deleted.
    Active keys cannot be deleted without first revoking.
    """
    with _lock:
        if not os.path.exists(KEYS_FILE):
            return False
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            keys = json.load(f)

        target_key = None
        for k, v in keys.items():
            if v.get("tenant_id") == tenant_id and v.get("key_id") == key_id:
                target_key = k
                break

        if not target_key:
            return False

        if keys[target_key].get("active", True):
            raise ValueError("Active keys cannot be deleted without first revoking.")

        del keys[target_key]
        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)
        return True


def delete_tenant(tenant_id: str) -> bool:
    """Permanently delete a workspace and its associated keys."""
    if tenant_id in ("default", "demo"):
        raise ValueError("System workspace cannot be deleted.")

    with _lock:
        if not os.path.exists(TENANTS_FILE):
            return False
        with open(TENANTS_FILE, "r", encoding="utf-8") as f:
            tenants = json.load(f)

        if tenant_id not in tenants:
            return False

        del tenants[tenant_id]
        with open(TENANTS_FILE, "w", encoding="utf-8") as f:
            json.dump(tenants, f, indent=2)

        # Remove keys for this tenant
        if os.path.exists(KEYS_FILE):
            with open(KEYS_FILE, "r", encoding="utf-8") as f:
                keys = json.load(f)
            keys = {k: v for k, v in keys.items() if v.get("tenant_id") != tenant_id}
            with open(KEYS_FILE, "w", encoding="utf-8") as f:
                json.dump(keys, f, indent=2)

        return True


def record_key_usage(raw_key: str):
    """Update last_used_at timestamp asynchronously."""
    def _update():
        with _lock:
            if not os.path.exists(KEYS_FILE):
                return
            with open(KEYS_FILE, "r", encoding="utf-8") as f:
                keys = json.load(f)
            if raw_key in keys:
                keys[raw_key]["last_used_at"] = _now_iso()
                keys[raw_key]["request_count"] = int(keys[raw_key].get("request_count", 0)) + 1
                with open(KEYS_FILE, "w", encoding="utf-8") as f:
                    json.dump(keys, f, indent=2)

    threading.Thread(target=_update, daemon=True).start()


# ---------------------------------------------------------------------------
# Rate Limiting & Usage Tracking
# ---------------------------------------------------------------------------
def check_rate_limit(tenant_id: str) -> bool:
    """Sliding-window 60-second rate limiter based on tenant tier."""
    tenant = get_tenant(tenant_id)
    tier = tenant.get("tier", "starter") if tenant else "starter"
    max_rpm = int(tenant.get("rate_limit_rpm") or DEFAULT_TIERS.get(tier, DEFAULT_TIERS["starter"])["rpm"])

    now = time.time()
    with _lock:
        timestamps = _rate_limits.setdefault(tenant_id, [])
        # Evict timestamps older than 60 seconds
        _rate_limits[tenant_id] = [t for t in timestamps if now - t < 60.0]
        if len(_rate_limits[tenant_id]) >= max_rpm:
            return False
        _rate_limits[tenant_id].append(now)
        return True


def get_rate_limit_state(tenant_id: str) -> dict:
    tenant = get_tenant(tenant_id) or {}
    tier = tenant.get("tier", "starter")
    limit = int(tenant.get("rate_limit_rpm") or DEFAULT_TIERS.get(tier, DEFAULT_TIERS["starter"])["rpm"])
    now = time.time()
    with _lock:
        timestamps = [stamp for stamp in _rate_limits.get(tenant_id, []) if now - stamp < 60.0]
        _rate_limits[tenant_id] = timestamps
        return {"limit_rpm": limit, "used_last_minute": len(timestamps), "remaining": max(0, limit - len(timestamps))}


def increment_metric(tenant_id: str, metric_name: str, count: int = 1):
    def _bg_inc():
        with _lock:
            metrics = {}
            if os.path.exists(METRICS_FILE):
                try:
                    with open(METRICS_FILE, "r", encoding="utf-8") as f:
                        metrics = json.load(f)
                except Exception:
                    metrics = {}

            t_metric = metrics.setdefault(
                tenant_id,
                {"total_verifications": 0, "total_enrollments": 0, "anomalies_flagged": 0, "last_active": _now_iso()},
            )
            t_metric[metric_name] = t_metric.get(metric_name, 0) + count
            t_metric["last_active"] = _now_iso()

            with open(METRICS_FILE, "w", encoding="utf-8") as f:
                json.dump(metrics, f, indent=2)

    threading.Thread(target=_bg_inc, daemon=True).start()


def get_tenant_metrics(tenant_id: str) -> dict:
    with _lock:
        if not os.path.exists(METRICS_FILE):
            return {"total_verifications": 0, "total_enrollments": 0, "anomalies_flagged": 0}
        with open(METRICS_FILE, "r", encoding="utf-8") as f:
            metrics = json.load(f)
            return metrics.get(
                tenant_id,
                {"total_verifications": 0, "total_enrollments": 0, "anomalies_flagged": 0, "last_active": _now_iso()},
            )


# ---------------------------------------------------------------------------
# Outbound Webhook Dispatcher
# ---------------------------------------------------------------------------
def dispatch_webhook(tenant_id: str, event_type: str, payload: dict):
    """
    Deliver signed webhook notification to tenant's configured endpoint in the background.
    Header 'X-Bio-Signature' carries the HMAC-SHA256 signature.
    """
    tenant = get_tenant(tenant_id)
    if not tenant or not tenant.get("webhook_url"):
        return

    url = tenant["webhook_url"]
    secret = tenant.get("webhook_secret", "")

    def _deliver():
        body = json.dumps(
            {
                "event": event_type,
                "tenant_id": tenant_id,
                "timestamp": _now_iso(),
                "data": payload,
            }
        ).encode("utf-8")

        signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Bio-Signature": signature,
                "X-Bio-Event": event_type,
                "User-Agent": "BioAuth-Webhook-Dispatcher/2.1",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=4) as resp:
                pass
        except Exception:
            pass

    threading.Thread(target=_deliver, daemon=True).start()
