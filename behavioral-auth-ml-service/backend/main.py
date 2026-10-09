"""
Behavioral Authentication API — Multi-Tenant Enterprise BaaS (Biometrics-as-a-Service)
Supports API Key Authentication, Scopes, In-Memory Model Caching, Tenant-Isolated Storage,
Embeddable Client SDK Delivery, Continuous Scoring, Adaptive Model Retraining,
and Cryptographically Signed Outbound Webhooks.

Endpoints:
    GET  /sdk.js, /v1/biometrics.js   serve embeddable client SDK
    GET  /demo                        serve interactive third-party integration demo
    GET  /api-keys/validate           verify tenant key validity
    POST /enroll                      add one enrollment typing sample for a user
    POST /verify                      score one live typing sample against the user's model
    GET  /users/{id}/status           enrollment progress + model state + cache telemetry
    POST /users/{id}/retrain          promote a shadow model trained on trusted sessions
    GET  /passage/{kind}              fetch the fixed passage text ("enroll" or "verify")

Enterprise BaaS Endpoints:
    POST /v1/tenants                  register new tenant
    GET  /v1/tenants                  list all tenants
    GET  /v1/tenants/{id}             tenant details, quotas, and active keys
    POST /v1/tenants/{id}/keys        generate new scoped API key
    DELETE /v1/tenants/{id}/keys/{id} revoke an API key
    GET  /v1/tenants/{id}/usage       real-time verification volume & anomaly telemetry
    POST /v1/webhooks/test            trigger test HMAC-signed webhook delivery
    GET  /v1/system/health            enterprise cluster health & in-memory cache telemetry

Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Header, Depends, Response, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Optional, Dict, Any
import os
import json
import csv
import ipaddress
import time
import threading
from datetime import datetime, timezone, timedelta
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from features import extract_features, feature_names
from passages import (
    PASSAGES, ENROLL_DIGRAPHS, VERIFY_DIGRAPHS,
    ENROLL_PASSAGES, PHASE_LABELS, PHASE_DIGRAPHS,
    get_passage_for_sample, get_phase_for_sample,
)
import storage
import tenants
from cache import cache
import auth
import activity

app = FastAPI(
    title="Behavioral Authentication Enterprise BaaS",
    description="Multi-tenant Keystroke Behavioral Biometrics-as-a-Service with continuous verification, in-memory caching, and automated risk scoring.",
    version="2.1.0"
)

_platform_runtime_lock = threading.Lock()
_platform_runtime_started = time.time()
_platform_runtime_events = []


@app.middleware("http")
async def collect_platform_api_telemetry(request: Request, call_next):
    credential = request.headers.get("x-api-key")
    authorization = request.headers.get("authorization", "")
    if not credential and authorization.lower().startswith("bearer bio_"):
        credential = authorization[7:].strip()
    key_info = tenants.get_key_info(credential) if credential else None
    track_request = bool(key_info) or bool(credential and credential.startswith("bio_"))
    started = time.time()
    try:
        response = await call_next(request)
    except Exception:
        if track_request:
            with _platform_runtime_lock:
                _platform_runtime_events.append({
                    "tenant_id": key_info.get("tenant_id") if key_info else None,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status_code": 500,
                    "latency_ms": round((time.time() - started) * 1000, 2),
                })
        raise
    if track_request:
        with _platform_runtime_lock:
            _platform_runtime_events.append({
                "tenant_id": key_info.get("tenant_id") if key_info else None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status_code": response.status_code,
                "latency_ms": round((time.time() - started) * 1000, 2),
            })
            if len(_platform_runtime_events) > 20000:
                del _platform_runtime_events[:5000]
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- config -------------------------------------------------------------
PROVISIONAL_MIN_SAMPLES = 10
FULL_MIN_SAMPLES = 20
ROLLING_WINDOW = 5
RETRAIN_EVERY_N_TRUSTED = 10
TRUSTED_SESSION_THRESHOLD = 72  # avg trust score to count a session as "trusted"
RISK_ALERT_COOLDOWN_SECONDS = 120
_risk_alert_lock = threading.Lock()
_last_risk_alert_at: Dict[str, float] = {}

SDK_PATH = os.path.join(os.path.dirname(__file__), "sdk", "biometrics.js")
DEMO_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "sdk_demo.html")
CONSOLE_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "console.html")


# ---- multi-tenant api key dependency ------------------------------------
def get_tenant_context(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    origin: Optional[str] = Header(None, alias="Origin"),
) -> dict:
    """
    Extract and authenticate tenant from the API key header or Bearer token.
    Enforces key activity, origin whitelisting, rate-limiting, and records telemetry.
    """
    raw = x_api_key
    if not raw and authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()

    if not raw:
        raise HTTPException(401, "An API key is required. Send it in the X-API-Key header.")

    key_str = raw.strip()

    # Look up in registered BaaS key store
    key_info = tenants.get_key_info(key_str)
    if key_info:
        if not key_info.get("active", True):
            raise HTTPException(401, "API Key has been revoked or deactivated.")
        expires_at = key_info.get("expires_at")
        if expires_at:
            try:
                expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                if expiry <= datetime.now(timezone.utc):
                    raise HTTPException(401, "API key has expired. Create a replacement credential.")
            except ValueError:
                raise HTTPException(401, "API key expiration is invalid. Contact platform support.")

        tenant_id = key_info["tenant_id"]
        tenant = tenants.get_tenant(tenant_id)
        if tenant and tenant.get("status", "active") != "active":
            raise HTTPException(403, "This organization is suspended. Contact platform support.")

        # Origin / Domain whitelisting check
        allowed_origins = key_info.get("allowed_origins", ["*"])
        if not tenants.is_origin_allowed(allowed_origins, origin):
            raise HTTPException(403, f"Origin '{origin}' is not authorized to use this API key.")
        allowed_ips = key_info.get("allowed_ips") or []
        remote_ip = request.client.host if request and request.client else None
        if allowed_ips:
            try:
                parsed_ip = ipaddress.ip_address(remote_ip or "")
                if not any(parsed_ip in ipaddress.ip_network(network, strict=False) for network in allowed_ips):
                    raise HTTPException(403, "Request IP is not authorized to use this API key.")
            except ValueError:
                raise HTTPException(403, "Request IP could not be validated against this API key allowlist.")

        # Check tenant rate limit
        if not tenants.check_rate_limit(tenant_id):
            raise HTTPException(429, f"Tenant '{tenant_id}' request rate limit exceeded for plan tier.")

        tenants.record_key_usage(key_str)
        granted_scopes = [
            scope for scope in key_info.get("scopes", ["verify", "enroll", "retrain"])
            if scope != "admin"
        ]
        return {
            "tenant_id": tenant_id,
            "tier": tenant.get("tier", "growth") if tenant else "growth",
            "scopes": granted_scopes,
            "key": key_str,
            "key_id": key_info.get("key_id"),
        }

    raise HTTPException(401, "API key is not recognized. Create a key in the Credentials page.")


def require_api_scope(ctx: dict, scope: str):
    """Require the caller's credential to be granted this API capability."""
    scopes = ctx.get("scopes", [])
    if scope not in scopes:
        raise HTTPException(403, f"This API key does not have the '{scope}' permission.")


def get_tenant(ctx: dict = Depends(get_tenant_context)) -> str:
    """Convenience dependency returning just the tenant_id string."""
    return ctx["tenant_id"]


def get_user_workspace_context(
    workspace_id: str,
    auth_ctx: dict = Depends(auth.get_current_user_and_session),
) -> dict:
    """Validate that the authenticated user has access to the target workspace."""
    user = auth_ctx["user"]
    has_access, role = auth.user_has_tenant_access(user["id"], workspace_id)
    if not has_access:
        raise HTTPException(403, f"Access denied. You do not have permission to access workspace '{workspace_id}'.")
    tenant = tenants.get_tenant(workspace_id)
    if not tenant:
        raise HTTPException(404, f"Workspace '{workspace_id}' not found.")
    if tenant.get("status", "active") != "active" and user.get("role") != "admin":
        raise HTTPException(403, "This organization is suspended. Contact platform support.")
    return {
        "user": user,
        "session": auth_ctx["session"],
        "tenant": tenant,
        "tenant_id": workspace_id,
        "role": role,
    }


# ---- request/response schemas -------------------------------------------
class KeyEvent(BaseModel):
    key: str
    type: Literal["down", "up"]
    t: float  # ms, relative to sample start


class EnrollRequest(BaseModel):
    user_id: str
    events: List[KeyEvent]


class VerifyRequest(BaseModel):
    user_id: str
    events: List[KeyEvent]


class LogResultRequest(BaseModel):
    user_id: str
    is_genuine: bool
    trust_score: float


class CreateTenantRequest(BaseModel):
    tenant_id: str
    name: str
    tier: Optional[Literal["starter", "growth", "enterprise"]] = "growth"
    webhook_url: Optional[str] = None


class CreateKeyRequest(BaseModel):
    name: str = "Production API Key"
    type: Literal["live", "test"] = "live"
    scopes: Optional[List[Literal["verify", "enroll", "retrain"]]] = ["verify", "enroll", "retrain"]
    allowed_origins: Optional[List[str]] = ["*"]
    allowed_ips: Optional[List[str]] = []
    expires_at: Optional[str] = None


class TestWebhookRequest(BaseModel):
    tenant_id: str
    event_type: str = "biometric.test"
    payload: Optional[Dict[str, Any]] = None


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    company: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class SwitchWorkspaceRequest(BaseModel):
    workspace_id: str


class CreateWorkspaceRequest(BaseModel):
    name: str
    workspace_id: Optional[str] = None
    tier: Optional[Literal["starter", "growth", "enterprise"]] = "growth"
    industry: Optional[str] = None
    webhook_url: Optional[str] = None


class UpdateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    webhook_url: Optional[str] = None
    allowed_origins: Optional[List[str]] = None


class AddMemberRequest(BaseModel):
    email: str
    role: Optional[Literal["owner", "admin", "developer", "viewer"]] = "developer"


class AdminCreateOrganizationRequest(BaseModel):
    name: str
    organization_id: Optional[str] = None
    tier: Literal["starter", "growth", "enterprise"] = "growth"
    owner_email: Optional[str] = None


class AdminUpdateOrganizationRequest(BaseModel):
    name: Optional[str] = None
    tier: Optional[Literal["starter", "growth", "enterprise"]] = None
    status: Optional[Literal["active", "suspended"]] = None
    rate_limit_rpm: Optional[int] = None


class AdminMemberRequest(BaseModel):
    email: str
    role: Literal["owner", "admin", "developer", "viewer"] = "developer"


class AdminNotificationRequest(BaseModel):
    title: str
    message: str
    audience: Literal["all", "organization"] = "all"
    organization_id: Optional[str] = None


class RevealKeyRequest(BaseModel):
    password_confirmation: Optional[str] = None


# ---- helpers --------------------------------------------------------------
def _state_for(n_samples: int) -> str:
    if n_samples >= FULL_MIN_SAMPLES:
        return "full"
    if n_samples >= PROVISIONAL_MIN_SAMPLES:
        return "provisional"
    return "collecting"


def _train(vectors: List[list]) -> dict:
    """Fit a scaler + IsolationForest on a user's samples and calibrate
    the trust-score scale against the training set itself."""
    X = np.array(vectors)
    scaler = StandardScaler().fit(X)
    Xs = scaler.transform(X)
    model = IsolationForest(
        n_estimators=200,
        contamination=0.1,
        random_state=42,
    ).fit(Xs)
    train_scores = model.decision_function(Xs)
    return {
        "scaler": scaler,
        "model": model,
        "score_min": float(train_scores.min()),
        "score_max": float(train_scores.max()),
        "n_samples": len(vectors),
    }


def _trust_score(bundle: dict, vector: np.ndarray) -> float:
    """
    3-Zone calibrated trust score:
      Inlier zone  (raw >= inlier_anchor): genuine typing region -> [68 .. 95]
      Transition   (lo <= raw < inlier_anchor): borderline session -> [52 .. 68]
      Anomaly      (raw < lo): clear outlier / impostor signature -> [20 .. 52]
    """
    Xs = bundle["scaler"].transform([vector])
    raw = bundle["model"].decision_function(Xs)[0]
    lo, hi = bundle["score_min"], bundle["score_max"]
    span = hi - lo

    if span < 1e-9:
        return 80.0

    inlier_anchor = lo + 0.15 * span

    if raw >= inlier_anchor:
        frac = (raw - inlier_anchor) / (hi - inlier_anchor + 1e-9)
        scaled = 68.0 + 27.0 * min(frac, 1.0)
    elif raw >= lo:
        frac = (raw - lo) / (inlier_anchor - lo + 1e-9)
        scaled = 52.0 + 16.0 * frac
    else:
        depth = (lo - raw) / (span + 1e-9)
        scaled = max(20.0, 52.0 - 50.0 * depth)

    return float(np.clip(scaled, 15.0, 95.0))


# ---- Decision thresholds ---------------------------------------------------
ALLOW_THRESHOLD = 65        # rolling avg >= this  -> allow
STEPUP_THRESHOLD = 42       # rolling avg in [42..65) -> step_up
DENY_STREAK_THRESHOLD = 42  # all(last 3 < this)  -> deny


def _decide(state: str, rolling_avg: float, recent: List[float]):
    """Cold-start-aware decision logic tuned for 3-zone trust scoring."""
    if state == "collecting":
        return "allow", "n/a", "Not enough samples yet — password-only."

    if state == "provisional":
        if rolling_avg < STEPUP_THRESHOLD:
            return "step_up", "medium", "Provisional model, low confidence match."
        return "allow", "low", "Provisional model, acceptable match."

    sustained_low = len(recent) >= 3 and all(s < DENY_STREAK_THRESHOLD for s in recent[-3:])
    if sustained_low:
        return "deny", "high", "Trust score stayed low across multiple samples."
    if rolling_avg >= ALLOW_THRESHOLD:
        return "allow", "low", "Behavior matches baseline profile."
    if rolling_avg >= STEPUP_THRESHOLD:
        return "step_up", "medium", "Behavior partially deviates from baseline."
    return "step_up", "medium", "Low trust score, single sample — not yet sustained."


# ---- public sdk & demo delivery ---------------------------------------------
@app.get("/sdk.js")
@app.get("/v1/biometrics.js")
def get_sdk_script():
    """Deliver universal embeddable client SDK script to any web application."""
    if os.path.exists(SDK_PATH):
        with open(SDK_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        return Response(content=content, media_type="application/javascript")
    raise HTTPException(404, "SDK script not found on server")


@app.get("/demo", response_class=HTMLResponse)
def get_demo_page():
    """Deliver interactive external client integration demonstration."""
    if os.path.exists(DEMO_PATH):
        with open(DEMO_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)
    raise HTTPException(404, "Demo page not found on server")


@app.get("/favicon.ico", include_in_schema=False)
def get_favicon():
    """Return an inline SVG biometric icon for clean browser tabs and zero 404 errors."""
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/>'
        '</linearGradient></defs>'
        '<rect width="32" height="32" rx="8" fill="url(#g)"/>'
        '<path d="M16 7c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 3c3.31 0 6 2.69 6 6 0 3.31-2.69 6-6 6s-6-2.69-6-6c0-3.31 2.69-6 6-6zm0 3c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#ffffff"/>'
        '</svg>'
    )
    return Response(content=svg, media_type="image/svg+xml")


@app.get("/console", response_class=HTMLResponse)
@app.get("/console.html", response_class=HTMLResponse)
def get_console_page():
    """Serve the BioAuth BaaS Developer Console (API key management, tenants, SDK quickstart)."""
    if os.path.exists(CONSOLE_PATH):
        with open(CONSOLE_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)
    raise HTTPException(404, "Console not found — run gen_console.py in the frontend folder first")


@app.get("/api-keys/validate")
def validate_api_key(ctx: dict = Depends(get_tenant_context)):
    """Check if an API key is valid and return associated tenant namespace."""
    return {
        "valid": True,
        "tenant_id": ctx["tenant_id"],
        "tier": ctx.get("tier", "growth"),
        "scopes": ctx.get("scopes", []),
        "status": "active"
    }


# ---- biometrics core endpoints -----------------------------------------------
@app.get("/passage/{kind}")
def get_passage(kind: Literal["enroll", "verify"], sample_number: Optional[int] = None):
    if kind == "enroll" and sample_number is not None:
        info = get_passage_for_sample(sample_number)
        return {
            "kind": kind,
            "text": info["text"],
            "phase": info["phase_number"],
            "phase_label": info["phase_label"],
            "total_phases": info["total_phases"],
            "samples_per_phase": info["samples_per_phase"],
        }
    return {"kind": kind, "text": PASSAGES[kind]}


@app.post("/enroll")
def enroll(req: EnrollRequest, ctx: dict = Depends(get_tenant_context)):
    require_api_scope(ctx, "enroll")
    tenant_id = ctx["tenant_id"]
    user = storage.load_user(req.user_id, tenant_id=tenant_id)
    current_count = len(user["enroll_samples"])
    sample_number = current_count + 1
    phase = get_phase_for_sample(sample_number)
    phase_digraphs = PHASE_DIGRAPHS[phase]

    try:
        vector = extract_features(
            [e.dict() for e in req.events], phase_digraphs
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    user["enroll_samples"].append(vector.tolist())
    n = len(user["enroll_samples"])
    state = _state_for(n)

    trained = False
    if state in ("provisional", "full"):
        if state == "provisional" or (state == "full" and (user.get("baseline_trained_at") is None or user.get("baseline_trained_at") < FULL_MIN_SAMPLES)):
            bundle = _train(user["enroll_samples"])
            # Update cache and disk atomically
            cache.set_model(tenant_id, req.user_id, bundle, persist_to_disk=True)
            user["baseline_trained_at"] = n
            trained = True

    storage.save_user(req.user_id, user, tenant_id=tenant_id)

    # Telemetry
    tenants.increment_metric(tenant_id, "total_enrollments", 1)

    next_sample = n + 1
    next_info = get_passage_for_sample(next_sample)

    return {
        "tenant_id": tenant_id,
        "user_id": req.user_id,
        "samples_collected": n,
        "state": state,
        "samples_to_provisional": max(0, PROVISIONAL_MIN_SAMPLES - n),
        "samples_to_full": max(0, FULL_MIN_SAMPLES - n),
        "model_trained_this_call": trained,
        "current_phase": phase + 1,
        "current_phase_label": PHASE_LABELS[phase],
        "next_passage": next_info["text"],
        "next_phase": next_info["phase_number"],
        "next_phase_label": next_info["phase_label"],
    }


@app.post("/verify")
def verify(req: VerifyRequest, ctx: dict = Depends(get_tenant_context)):
    require_api_scope(ctx, "verify")
    t0 = time.time()
    tenant_id = ctx["tenant_id"]

    try:
        vector = extract_features(
            [e.dict() for e in req.events], VERIFY_DIGRAPHS
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    user = storage.load_user(req.user_id, tenant_id=tenant_id)
    n = len(user["enroll_samples"])
    state = _state_for(n)

    if state == "collecting":
        tenants.increment_metric(tenant_id, "total_verifications", 1)
        activity.record_verification(tenant_id, {
            "user_id": req.user_id,
            "trust_score": None,
            "confidence": 0,
            "risk_level": "n/a",
            "action": "allow",
            "latency_ms": round((time.time() - t0) * 1000, 2),
            "reason": f"Only {n}/{PROVISIONAL_MIN_SAMPLES} enrollment samples so far — password-only.",
        })
        return {
            "tenant_id": tenant_id,
            "user_id": req.user_id,
            "state": state,
            "trust_score": None,
            "confidence": 0,
            "risk_level": "n/a",
            "action": "allow",
            "reason": f"Only {n}/{PROVISIONAL_MIN_SAMPLES} enrollment samples so far — password-only.",
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    # Fetch model via high-speed in-memory cache
    bundle = cache.get_model(tenant_id, req.user_id)
    if bundle is None:
        raise HTTPException(409, f"No trained model yet for user {req.user_id} in tenant {tenant_id}.")

    trust = _trust_score(bundle, vector)
    confidence = 60 if state == "provisional" else min(95, 80 + (n - FULL_MIN_SAMPLES) * 0.5)

    recent = user.get("recent_scores", [])
    recent.append(trust)
    recent = recent[-ROLLING_WINDOW:]
    user["recent_scores"] = recent
    rolling_avg = float(np.mean(recent))

    action, risk_level, reason = _decide(state, rolling_avg, recent)

    # Bank trusted sessions for continuous adaptive retraining
    if rolling_avg >= TRUSTED_SESSION_THRESHOLD:
        user["trusted_sessions"].append(vector.tolist())

    storage.save_user(req.user_id, user, tenant_id=tenant_id)

    # Record real verification event into workspace activity store
    ver_event = {
        "user_id": req.user_id,
        "trust_score": round(trust, 1),
        "confidence": round(confidence, 1),
        "risk_level": risk_level,
        "action": action,
        "latency_ms": round((time.time() - t0) * 1000, 2),
        "reason": reason,
    }
    activity.record_verification(tenant_id, ver_event)

    # Metrics & Webhook alerting
    tenants.increment_metric(tenant_id, "total_verifications", 1)
    if action in ("deny", "step_up"):
        tenants.increment_metric(tenant_id, "anomalies_flagged", 1)
        alert_key = f"{tenant_id}:{req.user_id}:{action}"
        now = time.time()
        with _risk_alert_lock:
            previous_alert = _last_risk_alert_at.get(alert_key, 0)
            should_dispatch_alert = now - previous_alert >= RISK_ALERT_COOLDOWN_SECONDS
            if should_dispatch_alert:
                _last_risk_alert_at[alert_key] = now
        has_webhook = bool(tenants.get_tenant(tenant_id) and tenants.get_tenant(tenant_id).get("webhook_url"))
        activity.record_risk_event(tenant_id, {
            "user_id": req.user_id,
            "action": action,
            "risk_level": risk_level,
            "trust_score": round(trust, 1),
            "rolling_avg_trust": round(rolling_avg, 1),
            "reason": reason,
            "webhook_dispatched": has_webhook and should_dispatch_alert,
            "alert_grouped": not should_dispatch_alert,
        })
        if should_dispatch_alert:
            tenants.dispatch_webhook(
                tenant_id,
                f"biometric.{action}",
                {
                    "user_id": req.user_id,
                    "action": action,
                    "risk_level": risk_level,
                    "trust_score": round(trust, 1),
                    "rolling_avg_trust": round(rolling_avg, 1),
                    "reason": reason,
                }
            )

    return {
        "tenant_id": tenant_id,
        "user_id": req.user_id,
        "state": state,
        "trust_score": round(trust, 1),
        "rolling_avg_trust": round(rolling_avg, 1),
        "confidence": round(confidence, 1),
        "risk_level": risk_level,
        "action": action,
        "reason": reason,
        "trusted_sessions_banked": len(user["trusted_sessions"]),
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }


@app.get("/users/{user_id}/status")
def status(user_id: str, ctx: dict = Depends(get_tenant_context)):
    require_api_scope(ctx, "verify")
    tenant_id = ctx["tenant_id"]
    user = storage.load_user(user_id, tenant_id=tenant_id)
    n = len(user["enroll_samples"])
    canonical_id = storage._resolve_canonical_id(user_id)
    cached = f"{tenant_id}::{canonical_id}" in cache._cache

    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "canonical_id": canonical_id,
        "samples_collected": n,
        "state": _state_for(n),
        "trusted_sessions_banked": len(user["trusted_sessions"]),
        "baseline_trained_at": user["baseline_trained_at"],
        "in_memory_cached": cached,
    }


@app.post("/users/{user_id}/retrain")
def retrain(user_id: str, force: bool = False, ctx: dict = Depends(get_tenant_context)):
    """Adaptive retraining: fit model on baseline + banked trusted sessions."""
    require_api_scope(ctx, "retrain")
    tenant_id = ctx["tenant_id"]
    user = storage.load_user(user_id, tenant_id=tenant_id)
    trusted = user.get("trusted_sessions", [])
    enroll_samples = user.get("enroll_samples", [])

    if not force and len(trusted) < RETRAIN_EVERY_N_TRUSTED:
        return {
            "tenant_id": tenant_id,
            "retrained": False,
            "reason": f"Only {len(trusted)}/{RETRAIN_EVERY_N_TRUSTED} trusted sessions banked so far.",
        }

    combined = enroll_samples + trusted
    if not combined:
        raise HTTPException(400, "No enrollment or verified session samples available for this user.")

    bundle = _train(combined)
    # Save to storage and update cache
    cache.set_model(tenant_id, user_id, bundle, persist_to_disk=True)
    user["trusted_sessions"] = []
    user["recent_scores"] = []
    user["baseline_trained_at"] = len(combined)
    storage.save_user(user_id, user, tenant_id=tenant_id)

    return {
        "tenant_id": tenant_id,
        "retrained": True,
        "user_id": user_id,
        "samples_used": len(combined),
        "reason": f"Model successfully retrained and updated on {len(combined)} samples."
    }


# ---- Enterprise BaaS Multi-Tenant Routes ------------------------------------
@app.post("/v1/tenants")
def api_create_tenant(req: CreateTenantRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    """Provision a new tenant organization with custom tier and webhook."""
    try:
        tenant = tenants.create_tenant(
            tenant_id=req.tenant_id,
            name=req.name,
            tier=req.tier,
            webhook_url=req.webhook_url
        )
        return {"status": "created", "tenant": tenant}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/v1/tenants")
def api_list_tenants(admin_ctx: dict = Depends(auth.require_admin_user)):
    """List all registered tenants on this BaaS cluster."""
    return {"tenants": tenants.list_tenants()}


@app.get("/v1/tenants/{target_tenant_id}")
def api_get_tenant(target_tenant_id: str, admin_ctx: dict = Depends(auth.require_admin_user)):
    """Get tenant configuration, tier limits, active keys, and telemetry."""
    t = tenants.get_tenant(target_tenant_id)
    if not t:
        raise HTTPException(404, f"Tenant '{target_tenant_id}' not found.")
    metrics = tenants.get_tenant_metrics(target_tenant_id)
    keys = tenants.list_keys_for_tenant(target_tenant_id)
    users = storage.list_users(tenant_id=target_tenant_id)
    return {
        "tenant": t,
        "metrics": metrics,
        "active_keys_count": len([k for k in keys if k["active"]]),
        "enrolled_users_count": len(users),
        "keys": keys
    }


@app.post("/v1/tenants/{target_tenant_id}/keys")
def api_create_key(target_tenant_id: str, req: CreateKeyRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    """Generate a new live or test high-entropy hexadecimal API key for a tenant."""
    try:
        new_key = tenants.generate_api_key(
            tenant_id=target_tenant_id,
            name=req.name,
            key_type=req.type,
            scopes=req.scopes,
            allowed_origins=req.allowed_origins,
            allowed_ips=req.allowed_ips,
            expires_at=req.expires_at,
        )
        return {"status": "generated", "key": new_key}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.delete("/v1/tenants/{target_tenant_id}/keys/{key_id}")
def api_revoke_key(target_tenant_id: str, key_id: str, admin_ctx: dict = Depends(auth.require_admin_user)):
    """Revoke an API key immediately."""
    ok = tenants.revoke_api_key(target_tenant_id, key_id)
    if not ok:
        raise HTTPException(404, "Key not found or could not be revoked.")
    return {"status": "revoked", "key_id": key_id}


@app.get("/v1/tenants/{target_tenant_id}/usage")
def api_tenant_usage(target_tenant_id: str, admin_ctx: dict = Depends(auth.require_admin_user)):
    """Retrieve verification volume, enrollment count, and anomaly frequency."""
    metrics = tenants.get_tenant_metrics(target_tenant_id)
    users = storage.list_users(tenant_id=target_tenant_id)
    return {
        "tenant_id": target_tenant_id,
        "metrics": metrics,
        "enrolled_users_count": len(users)
    }


@app.post("/v1/webhooks/test")
def api_test_webhook(req: TestWebhookRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    """Dispatch an HMAC-SHA256 signed test webhook event."""
    tenants.dispatch_webhook(
        tenant_id=req.tenant_id,
        event_type=req.event_type,
        payload=req.payload or {"ping": "pong", "time": time.time(), "message": "BioAuth BaaS webhook verified"}
    )
    return {"status": "dispatched", "target_tenant": req.tenant_id}


@app.post("/v1/workspaces/{workspace_id}/webhooks/test")
def api_workspace_test_webhook(ctx: dict = Depends(get_user_workspace_context)):
    """Send a test event to the selected project's configured webhook."""
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Workspace owner or administrator permission is required.")
    if not ctx["tenant"].get("webhook_url"):
        raise HTTPException(400, "Add a webhook URL before sending a test event.")
    tenants.dispatch_webhook(
        ctx["tenant_id"],
        "biometric.test",
        {"ping": "pong", "time": time.time(), "message": "BioAuth webhook test"},
    )
    return {"status": "queued", "workspace_id": ctx["tenant_id"]}


@app.get("/v1/system/health")
def api_system_health():
    """Enterprise cluster health, memory cache hit-ratio, and feature manifest."""
    cache_stats = cache.get_stats()
    all_tenants = tenants.list_tenants()
    return {
        "status": "healthy",
        "service": "behavioral-auth-baas",
        "version": "2.1.0",
        "total_tenants": len(all_tenants),
        "cache": cache_stats,
        "features": {
            "multi_tenancy": True,
            "api_key_scoping": True,
            "in_memory_model_cache": True,
            "rate_limiting": True,
            "signed_hmac_webhooks": True,
            "calibrated_3_zone_scoring": True,
            "adaptive_retraining": True
        }
    }


@app.get("/users")
def get_users(ctx: dict = Depends(get_tenant_context)):
    require_api_scope(ctx, "verify")
    tenant_id = ctx["tenant_id"]
    return {
        "tenant_id": tenant_id,
        "users": storage.list_users(tenant_id=tenant_id)
    }


# =============================================================================
# BioAuth SaaS Customer Authentication Endpoints
# =============================================================================
@app.post("/v1/auth/register")
def api_register(req: RegisterRequest):
    """Register a new BioAuth customer account."""
    try:
        user = auth.register_user(
            name=req.name,
            email=req.email,
            password=req.password,
            company=req.company
        )
        sess = auth.create_session(user["id"])
        return {
            "status": "ok",
            "user": user,
            "session_token": sess["token"],
            "has_workspaces": False,
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/v1/auth/login")
def api_login(req: LoginRequest):
    """Authenticate customer and return active session token."""
    user = auth.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(401, "Invalid email or password.")
    default_tenant = None
    if user.get("role") == "admin":
        all_ts = tenants.list_tenants()
        if all_ts:
            default_tenant = all_ts[0]["id"]
    sess = auth.create_session(user["id"], default_tenant_id=default_tenant)
    memberships = auth.get_user_memberships(user["id"])
    return {
        "status": "ok",
        "user": user,
        "session_token": sess["token"],
        "active_workspace": sess.get("active_tenant_id"),
        "has_workspaces": True if user.get("role") == "admin" else len(memberships) > 0,
    }


@app.post("/v1/auth/logout")
def api_logout(auth_ctx: dict = Depends(auth.get_current_user_and_session)):
    """Terminate customer session."""
    auth.destroy_session(auth_ctx["session"]["token"])
    return {"status": "logged_out"}


@app.get("/v1/auth/me")
def api_auth_me(auth_ctx: dict = Depends(auth.get_current_user_and_session)):
    """Get authenticated user profile and workspaces list."""
    user = auth_ctx["user"]
    sess = auth_ctx["session"]
    raw_memberships = auth.get_user_memberships(user["id"])

    # If admin, also include all tenants in workspace list
    if user.get("role") == "admin":
        all_ts = tenants.list_tenants()
        workspaces = [
            {
                "id": t["id"],
                "name": t["name"],
                "tier": t.get("tier", "growth"),
                "role": "owner",
                "is_active": (t["id"] == sess.get("active_tenant_id")),
            }
            for t in all_ts
        ]
    else:
        workspaces = []
        for m in raw_memberships:
            t = tenants.get_tenant(m["tenant_id"])
            if t:
                workspaces.append({
                    "id": t["id"],
                    "name": t["name"],
                    "tier": t.get("tier", "growth"),
                    "role": m.get("role", "developer"),
                    "is_active": (t["id"] == sess.get("active_tenant_id")),
                })

    return {
        "user": user,
        "active_workspace_id": sess.get("active_tenant_id"),
        "workspaces": workspaces,
    }


@app.post("/v1/auth/forgot-password")
def api_forgot_password(req: ForgotPasswordRequest):
    """Initiate password recovery flow."""
    token = auth.create_password_reset_token(req.email)
    return {
        "status": "ok",
        "message": "If this email is registered, password reset instructions have been issued.",
        "reset_token": token,
    }


@app.post("/v1/auth/reset-password")
def api_reset_password(req: ResetPasswordRequest):
    """Reset user password using verification token."""
    try:
        ok = auth.reset_password_with_token(req.token, req.new_password)
        if not ok:
            raise HTTPException(400, "Reset token is invalid or expired.")
        return {"status": "ok", "message": "Password reset successfully. Please sign in."}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/v1/auth/switch-workspace")
def api_switch_workspace(
    req: SwitchWorkspaceRequest,
    auth_ctx: dict = Depends(auth.get_current_user_and_session),
):
    """Switch active workspace in the authenticated session."""
    user = auth_ctx["user"]
    sess = auth_ctx["session"]
    has_access, _ = auth.user_has_tenant_access(user["id"], req.workspace_id)
    if not has_access:
        raise HTTPException(403, f"Access denied. You are not a member of workspace '{req.workspace_id}'.")

    ok = auth.switch_session_workspace(sess["token"], req.workspace_id)
    if not ok:
        raise HTTPException(400, "Unable to switch workspace.")
    return {"status": "ok", "active_workspace": req.workspace_id}


@app.put("/v1/auth/password")
def api_update_password(
    req: UpdatePasswordRequest,
    auth_ctx: dict = Depends(auth.get_current_user_and_session),
):
    """Update password for authenticated user."""
    try:
        auth.update_user_password(auth_ctx["user"]["id"], req.old_password, req.new_password)
        return {"status": "ok", "message": "Password updated successfully."}
    except ValueError as e:
        raise HTTPException(400, str(e))


# =============================================================================
# Customer Scoped Workspace Management Endpoints
# =============================================================================
@app.post("/v1/workspaces")
def api_create_workspace(
    req: CreateWorkspaceRequest,
    auth_ctx: dict = Depends(auth.get_current_user_and_session),
):
    """
    Customer onboarding / workspace creation.
    Automatically provisions workspace, sets user as owner, and generates initial API key.
    """
    user = auth_ctx["user"]
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(400, "Workspace name is required.")

    # Generate slug identifier if not specified
    slug = (req.workspace_id or clean_name.lower().replace(" ", "-").replace("_", "-")).strip()
    clean_slug = "".join(c for c in slug if c.isalnum() or c in ("-", "_")).strip("-_")
    if not clean_slug:
        clean_slug = "workspace-" + secrets.token_hex(4)

    try:
        tenant = tenants.create_tenant(
            tenant_id=clean_slug,
            name=clean_name,
            tier=req.tier or "growth",
            webhook_url=req.webhook_url
        )
        # Assign user as owner
        auth.add_membership(user["id"], clean_slug, role="owner")
        auth.switch_session_workspace(auth_ctx["session"]["token"], clean_slug)

        activity.record_audit_event(
            clean_slug,
            user["name"],
            "workspace_created",
            f"Workspace '{clean_name}' created on plan {req.tier or 'growth'}."
        )

        return {
            "status": "created",
            "workspace": tenant,
            "initial_api_key": tenant.get("initial_api_key"),
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/v1/workspaces")
def api_list_workspaces(auth_ctx: dict = Depends(auth.get_current_user_and_session)):
    """List ONLY workspaces the current user has access to."""
    user = auth_ctx["user"]
    if user.get("role") == "admin":
        return {"workspaces": tenants.list_tenants()}

    memberships = auth.get_user_memberships(user["id"])
    results = []
    for m in memberships:
        t = tenants.get_tenant(m["tenant_id"])
        if t:
            item = dict(t)
            item["user_role"] = m.get("role", "developer")
            results.append(item)
    return {"workspaces": results}


@app.get("/v1/workspaces/{workspace_id}")
def api_get_workspace_details(ctx: dict = Depends(get_user_workspace_context)):
    """Retrieve workspace config, plan tier limits, active keys count, and metrics."""
    target_id = ctx["tenant_id"]
    t = ctx["tenant"]
    metrics = tenants.get_tenant_metrics(target_id)
    keys = tenants.list_keys_for_tenant(target_id)
    users = storage.list_users(tenant_id=target_id)
    return {
        "workspace": t,
        "user_role": ctx["role"],
        "limits": tenants.DEFAULT_TIERS.get(t.get("tier", "growth"), tenants.DEFAULT_TIERS["growth"]),
        "metrics": metrics,
        "active_keys_count": len([k for k in keys if k["active"]]),
        "enrolled_users_count": len(users),
        "keys": keys,
    }


@app.put("/v1/workspaces/{workspace_id}")
def api_update_workspace(
    req: UpdateWorkspaceRequest,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Update workspace name, webhook, or allowed origins."""
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Administrator or Owner role required to update workspace settings.")

    updates = {}
    if req.name:
        updates["name"] = req.name.strip()
    if req.webhook_url is not None:
        updates["webhook_url"] = req.webhook_url.strip() or None
    if req.allowed_origins is not None:
        updates["allowed_origins"] = req.allowed_origins

    updated = tenants.update_tenant(ctx["tenant_id"], updates)
    activity.record_audit_event(
        ctx["tenant_id"],
        ctx["user"]["name"],
        "workspace_updated",
        "Workspace settings updated."
    )
    return {"status": "updated", "workspace": updated}


@app.delete("/v1/workspaces/{workspace_id}")
def api_delete_workspace(ctx: dict = Depends(get_user_workspace_context)):
    """Permanently delete a workspace."""
    if ctx["role"] != "owner" and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Only the workspace owner can delete this workspace.")

    try:
        tenants.delete_tenant(ctx["tenant_id"])
        auth.remove_membership(ctx["tenant_id"], ctx["user"]["id"])
        return {"status": "deleted", "workspace_id": ctx["tenant_id"]}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/v1/workspaces/{workspace_id}/checklist")
def api_workspace_checklist(ctx: dict = Depends(get_user_workspace_context)):
    """
    Compute onboarding progress (0 to 6) based strictly on real workspace state.
    Zero fake progress.
    """
    tid = ctx["tenant_id"]
    t = ctx["tenant"]
    keys = tenants.list_keys_for_tenant(tid)
    active_keys = [k for k in keys if k["active"]]
    has_key = len(active_keys) > 0
    has_sdk_installed = any(k.get("last_used_at") for k in keys)
    users = storage.list_users(tenant_id=tid)
    has_enrolled = len(users) > 0
    metrics = tenants.get_tenant_metrics(tid)
    has_verified = (metrics.get("total_verifications", 0) > 0)
    has_webhook = bool(t.get("webhook_url"))

    steps = [
        {"id": "create_workspace", "label": "Create workspace", "completed": True},
        {"id": "create_key", "label": "Create API key", "completed": has_key},
        {"id": "install_sdk", "label": "Install SDK", "completed": has_sdk_installed},
        {"id": "enroll_user", "label": "Create first enrollment", "completed": has_enrolled},
        {"id": "verify_user", "label": "Perform first verification", "completed": has_verified},
        {"id": "configure_webhook", "label": "Configure webhook", "completed": has_webhook},
    ]

    completed_count = sum(1 for s in steps if s["completed"])
    return {
        "steps": steps,
        "completed": completed_count,
        "total": len(steps),
        "percentage": round((completed_count / len(steps)) * 100),
    }


# =============================================================================
# Scoped API Key Management Endpoints
# =============================================================================
@app.get("/v1/workspaces/{workspace_id}/keys")
def api_workspace_keys(ctx: dict = Depends(get_user_workspace_context)):
    """Return all API keys for this workspace in masked format."""
    keys = tenants.list_keys_for_tenant(ctx["tenant_id"])
    limits = tenants.DEFAULT_TIERS.get(ctx["tenant"].get("tier", "growth"), tenants.DEFAULT_TIERS["growth"])
    return {"keys": keys, "limits": limits, "active_keys_count": sum(1 for key in keys if key.get("active"))}


@app.post("/v1/workspaces/{workspace_id}/keys")
def api_workspace_create_key(
    req: CreateKeyRequest,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Generate a new high-entropy API key. Raw key is returned only once."""
    if ctx["role"] not in ("owner", "admin", "developer") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Insufficient permissions to generate API keys.")

    try:
        new_key = tenants.generate_api_key(
            tenant_id=ctx["tenant_id"],
            name=req.name,
            key_type=req.type,
            scopes=req.scopes,
            allowed_origins=req.allowed_origins,
            allowed_ips=req.allowed_ips,
            expires_at=req.expires_at,
        )
        activity.record_audit_event(
            ctx["tenant_id"],
            ctx["user"]["name"],
            "api_key_created",
            f"Created API key '{req.name}' ({req.type})."
        )
        return {"status": "generated", "key": new_key}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/v1/workspaces/{workspace_id}/keys/{key_id}/reveal")
def api_workspace_reveal_key(
    key_id: str,
    req: RevealKeyRequest,
    ctx: dict = Depends(get_user_workspace_context),
):
    """
    Securely decrypt and reveal the raw key upon security confirmation.
    """
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Owner or Admin privileges required to reveal API keys.")

    # If confirmation password provided, verify it
    if req.password_confirmation:
        full_u = auth._load_json(auth.USERS_FILE, {}).get(ctx["user"]["id"])
        if full_u and not auth._verify_password(req.password_confirmation, full_u["password_hash"], full_u["salt"]):
            raise HTTPException(401, "Password confirmation failed.")

    raw_key = tenants.reveal_api_key(ctx["tenant_id"], key_id)
    if not raw_key:
        raise HTTPException(404, "API key not found.")

    activity.record_audit_event(
        ctx["tenant_id"],
        ctx["user"]["name"],
        "api_key_revealed",
        f"Temporarily revealed API key '{key_id}'."
    )
    return {"status": "revealed", "key_id": key_id, "key": raw_key}


@app.post("/v1/workspaces/{workspace_id}/keys/{key_id}/revoke")
def api_workspace_revoke_key(
    key_id: str,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Immediately revoke an API key."""
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Owner or Admin privileges required to revoke API keys.")

    ok = tenants.revoke_api_key(ctx["tenant_id"], key_id)
    if not ok:
        raise HTTPException(404, "API key not found.")

    activity.record_audit_event(
        ctx["tenant_id"],
        ctx["user"]["name"],
        "api_key_revoked",
        f"Revoked API key '{key_id}'."
    )
    return {"status": "revoked", "key_id": key_id}


@app.delete("/v1/workspaces/{workspace_id}/keys/{key_id}")
def api_workspace_delete_key(
    key_id: str,
    ctx: dict = Depends(get_user_workspace_context),
):
    """
    Permanently delete an API key.
    STRICT SECURITY RULE: Only REVOKED keys can be permanently deleted.
    """
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Owner or Admin privileges required to delete API keys.")

    try:
        ok = tenants.delete_api_key(ctx["tenant_id"], key_id)
        if not ok:
            raise HTTPException(404, "API key not found.")

        activity.record_audit_event(
            ctx["tenant_id"],
            ctx["user"]["name"],
            "api_key_deleted",
            f"Permanently deleted revoked API key '{key_id}'."
        )
        return {"status": "deleted", "key_id": key_id}
    except ValueError as e:
        raise HTTPException(400, str(e))


# =============================================================================
# Workspace Activity, Telemetry, and Members Endpoints
# =============================================================================
def _activity_account_name(user_id: Any) -> str:
    uid = str(user_id or "").strip()
    canonical_id = storage.USER_ALIASES.get(uid.lower(), uid.lower()) if uid else ""
    meta = storage.CANONICAL_META.get(canonical_id, {})
    return meta.get("name") or uid or "Unknown user"


@app.get("/v1/workspaces/{workspace_id}/verifications")
def api_workspace_verifications(
    action: Optional[str] = None,
    limit: int = 50,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Retrieve real verification logs for this workspace."""
    events = activity.get_verifications(ctx["tenant_id"], limit=limit, action_filter=action)
    for event in events:
        event["display_name"] = _activity_account_name(event.get("user_id"))
    return {"verifications": events, "count": len(events)}


@app.get("/v1/workspaces/{workspace_id}/notifications")
def api_workspace_notifications(ctx: dict = Depends(get_user_workspace_context)):
    """Return platform announcements visible to the current organization."""
    return {"notifications": activity.get_platform_notifications(ctx["tenant_id"])}


@app.get("/v1/workspaces/{workspace_id}/risk-events")
def api_workspace_risk_events(
    limit: int = 50,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Retrieve real risk / anomaly detection events for this workspace."""
    events = activity.get_risk_events(ctx["tenant_id"], limit=limit)
    for event in events:
        event["display_name"] = _activity_account_name(event.get("user_id"))
    return {"risk_events": events, "count": len(events)}


@app.get("/v1/workspaces/{workspace_id}/activity")
def api_workspace_activity(
    limit: int = 20,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Retrieve chronological recent activity feed for workspace dashboard."""
    feed = activity.get_recent_activity(ctx["tenant_id"], limit=limit)
    return {"activity": feed}


@app.get("/v1/workspaces/{workspace_id}/analytics")
def api_workspace_analytics(
    period: str = "7d",
    ctx: dict = Depends(get_user_workspace_context),
):
    """Retrieve real time-bucketed analytics strictly scoped to this workspace."""
    data = activity.get_analytics(ctx["tenant_id"], period=period)
    return data


@app.get("/v1/workspaces/{workspace_id}/enrollments")
def api_workspace_enrollments(ctx: dict = Depends(get_user_workspace_context)):
    """Retrieve real enrolled profiles and model training states."""
    users = storage.list_users(tenant_id=ctx["tenant_id"])
    profiles = []
    for uid in users:
        u_data = storage.load_user(uid, tenant_id=ctx["tenant_id"])
        samples_count = len(u_data.get("enroll_samples", []))
        meta = storage.CANONICAL_META.get(uid) or {}
        display_name = meta.get("name") or uid
        email = meta.get("email") or ""
        profiles.append({
            "user_id": uid,
            "display_name": display_name,
            "email": email,
            "samples_collected": samples_count,
            "state": _state_for(samples_count),
            "baseline_trained_at": u_data.get("baseline_trained_at"),
            "trusted_sessions_count": len(u_data.get("trusted_sessions", [])),
            "model_ready": u_data.get("baseline_trained_at") is not None or samples_count >= 15,
        })
    return {"enrolled_profiles": profiles, "total": len(profiles)}


@app.get("/v1/workspaces/{workspace_id}/members")
def api_workspace_members(ctx: dict = Depends(get_user_workspace_context)):
    """List members of this workspace."""
    members = auth.get_tenant_members(ctx["tenant_id"])
    return {"members": members}


@app.post("/v1/workspaces/{workspace_id}/members")
def api_workspace_add_member(
    req: AddMemberRequest,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Add/invite a member to this workspace."""
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Owner or Admin role required to add members.")

    users = auth._load_json(auth.USERS_FILE, {})
    target_user = None
    for u in users.values():
        if u.get("email", "").lower() == req.email.strip().lower():
            target_user = u
            break

    if not target_user:
        raise HTTPException(404, f"No user account found with email '{req.email}'. They must register first.")

    mem = auth.add_membership(target_user["id"], ctx["tenant_id"], role=req.role or "developer")
    activity.record_audit_event(
        ctx["tenant_id"],
        ctx["user"]["name"],
        "member_added",
        f"Added member {target_user['email']} as {req.role or 'developer'}."
    )
    return {"status": "added", "member": mem}


@app.delete("/v1/workspaces/{workspace_id}/members/{target_user_id}")
def api_workspace_remove_member(
    target_user_id: str,
    ctx: dict = Depends(get_user_workspace_context),
):
    """Remove a member from this workspace."""
    if ctx["role"] not in ("owner", "admin") and ctx["user"].get("role") != "admin":
        raise HTTPException(403, "Owner or Admin role required to remove members.")

    if target_user_id == ctx["user"]["id"]:
        raise HTTPException(400, "You cannot remove yourself from the workspace.")

    ok = auth.remove_membership(ctx["tenant_id"], target_user_id)
    if not ok:
        raise HTTPException(404, "Member not found.")

    activity.record_audit_event(
        ctx["tenant_id"],
        ctx["user"]["name"],
        "member_removed",
        f"Removed member '{target_user_id}'."
    )
    return {"status": "removed"}


# =============================================================================
# Platform Admin Console Endpoints (Protected by Platform Admin Role)
# =============================================================================
@app.get("/v1/admin/overview")
def api_admin_overview(admin_ctx: dict = Depends(auth.require_admin_user)):
    """System-wide platform KPI metrics for internal administrators."""
    all_tenants = tenants.list_tenants()
    all_users = auth._load_json(auth.USERS_FILE, {})
    all_keys = auth._load_json(tenants.KEYS_FILE, {})
    cache_stats = cache.get_stats()

    active_keys = [k for k in all_keys.values() if k.get("active")]
    total_verifications = 0
    all_metrics = auth._load_json(tenants.METRICS_FILE, {})
    for m in all_metrics.values():
        total_verifications += m.get("total_verifications", 0)
    with _platform_runtime_lock:
        runtime_events = list(_platform_runtime_events)
    runtime_errors = sum(event["status_code"] >= 400 for event in runtime_events)
    runtime_latency = [event["latency_ms"] for event in runtime_events]

    return {
        "total_organizations": len(all_tenants),
        "total_users": len(all_users),
        "total_verifications": total_verifications,
        "total_keys": len(all_keys),
        "active_keys": len(active_keys),
        "runtime_requests": len(runtime_events),
        "runtime_errors": runtime_errors,
        "runtime_error_rate": round(runtime_errors / len(runtime_events) * 100, 2) if runtime_events else 0,
        "runtime_avg_latency_ms": round(sum(runtime_latency) / len(runtime_latency), 2) if runtime_latency else 0,
        "runtime_since": datetime.fromtimestamp(_platform_runtime_started, timezone.utc).isoformat(),
        "cache": cache_stats,
        "service_status": "healthy",
    }


@app.get("/v1/admin/telemetry")
def api_admin_telemetry(admin_ctx: dict = Depends(auth.require_admin_user)):
    """Return real platform request telemetry for the last 24 hours and process lifetime."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    with _platform_runtime_lock:
        events = list(_platform_runtime_events)
    recent = []
    for event in events:
        try:
            stamp = datetime.fromisoformat(event["timestamp"])
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=timezone.utc)
            if stamp >= cutoff:
                recent.append((event, stamp))
        except (TypeError, ValueError):
            continue
    buckets = []
    hour_start = cutoff.replace(minute=0, second=0, microsecond=0)
    for index in range(24):
        start = hour_start + timedelta(hours=index)
        end = start + timedelta(hours=1)
        matches = [event for event, stamp in recent if start <= stamp < end]
        buckets.append({"label": start.strftime("%H:%M"), "requests": len(matches), "errors": sum(item["status_code"] >= 400 for item in matches)})
    user_ids = set()
    for organization in tenants.list_tenants():
        for verification in activity.get_verifications(organization["id"], limit=500):
            try:
                stamp = datetime.fromisoformat(verification["timestamp"])
                if stamp.tzinfo is None:
                    stamp = stamp.replace(tzinfo=timezone.utc)
                if stamp >= cutoff and verification.get("user_id"):
                    user_ids.add(f"{organization['id']}::{verification['user_id']}")
            except (TypeError, ValueError):
                continue
    org_usage = []
    for organization in tenants.list_tenants():
        org_usage.append({"id": organization["id"], **tenants.get_rate_limit_state(organization["id"])})
    error_count = sum(event["status_code"] >= 400 for event, _ in recent)
    latency_values = [event["latency_ms"] for event, _ in recent]
    return {
        "window": "24h",
        "requests": len(recent),
        "errors": error_count,
        "error_rate": round(error_count / len(recent) * 100, 2) if recent else 0,
        "average_latency_ms": round(sum(latency_values) / len(latency_values), 2) if latency_values else 0,
        "active_end_users": len(user_ids),
        "buckets": buckets,
        "rate_limits": org_usage,
        "since_service_start": datetime.fromtimestamp(_platform_runtime_started, timezone.utc).isoformat(),
        "data_note": "Request error and latency telemetry starts when this service process starts. User activity uses the retained verification event history.",
    }


@app.get("/v1/admin/organizations")
def api_admin_organizations(admin_ctx: dict = Depends(auth.require_admin_user)):
    """List all registered organizations on this cluster."""
    all_tenants = tenants.list_tenants()
    for t in all_tenants:
        t.pop("webhook_secret", None)
        t.pop("initial_api_key", None)
        t.pop("key_warning", None)
        t["enrolled_users"] = len(storage.list_users(t["id"]))
        t["metrics"] = tenants.get_tenant_metrics(t["id"])
        t["api_keys"] = tenants.list_keys_for_tenant(t["id"])
        t["member_count"] = len(auth.get_tenant_members(t["id"]))
        t["rate_limit"] = tenants.get_rate_limit_state(t["id"])
    return {"organizations": all_tenants}


@app.get("/v1/admin/notifications")
def api_admin_notifications(admin_ctx: dict = Depends(auth.require_admin_user)):
    return {"notifications": activity.get_platform_notifications()}


@app.post("/v1/admin/notifications")
def api_admin_create_notification(req: AdminNotificationRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    title = req.title.strip()
    message = req.message.strip()
    if not title or len(title) > 120:
        raise HTTPException(400, "Notification title must be between 1 and 120 characters.")
    if not message or len(message) > 2000:
        raise HTTPException(400, "Notification message must be between 1 and 2,000 characters.")
    organization_id = None
    if req.audience == "organization":
        organization_id = (req.organization_id or "").strip()
        if not organization_id:
            raise HTTPException(400, "Choose an organization for a targeted notification.")
        if not tenants.get_tenant(organization_id):
            raise HTTPException(404, "Organization not found.")
    notice = activity.create_platform_notification(
        title=title,
        message=message,
        audience=req.audience,
        organization_id=organization_id,
        created_by=admin_ctx["user"].get("name", "Platform administrator"),
    )
    return {"notification": notice}


@app.post("/v1/admin/organizations")
def api_admin_create_organization(req: AdminCreateOrganizationRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    name = req.name.strip()
    if not name:
        raise HTTPException(400, "Organization name is required.")
    source_id = (req.organization_id or name).strip().lower().replace(" ", "-").replace("_", "-")
    org_id = "".join(c for c in source_id if c.isalnum() or c == "-").strip("-")
    if not org_id:
        org_id = "org-" + secrets.token_hex(4)
    owner = None
    if req.owner_email:
        owner = next((u for u in auth._load_json(auth.USERS_FILE, {}).values() if u.get("email", "").lower() == req.owner_email.strip().lower()), None)
        if not owner:
            raise HTTPException(404, "No platform user has that email yet. Ask the owner to register first.")
        if owner.get("role") == "admin":
            raise HTTPException(400, "A platform administrator cannot be assigned as a customer organization owner.")
    try:
        organization = tenants.create_tenant(org_id, name, tier=req.tier)
    except ValueError as exc:
        raise HTTPException(409, str(exc))
    if owner:
        auth.add_membership(owner["id"], org_id, role="owner")
    activity.record_audit_event(org_id, admin_ctx["user"]["name"], "organization_created", f"Created {req.tier} organization '{name}'.")
    return {"organization": {k: v for k, v in organization.items() if k not in ("webhook_secret", "initial_api_key", "key_warning")}}


@app.get("/v1/admin/organizations/{organization_id}")
def api_admin_organization_detail(organization_id: str, admin_ctx: dict = Depends(auth.require_admin_user)):
    organization = tenants.get_tenant(organization_id)
    if not organization:
        raise HTTPException(404, "Organization not found.")
    return {
        "organization": {k: v for k, v in organization.items() if k != "webhook_secret"},
        "metrics": tenants.get_tenant_metrics(organization_id),
        "enrolled_users": len(storage.list_users(organization_id)),
        "members": auth.get_tenant_members(organization_id),
        "api_keys": tenants.list_keys_for_tenant(organization_id),
        "limits": tenants.DEFAULT_TIERS.get(organization.get("tier", "growth"), tenants.DEFAULT_TIERS["growth"]),
        "rate_limit": tenants.get_rate_limit_state(organization_id),
    }


@app.patch("/v1/admin/organizations/{organization_id}")
def api_admin_update_organization(organization_id: str, req: AdminUpdateOrganizationRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    current = tenants.get_tenant(organization_id)
    if not current:
        raise HTTPException(404, "Organization not found.")
    updates = req.dict(exclude_unset=True)
    updates = {key: value for key, value in updates.items() if value is not None or key == "rate_limit_rpm"}
    if not updates:
        raise HTTPException(400, "Provide a name, plan, or status to update.")
    if organization_id in ("default", "demo") and updates.get("status") == "suspended":
        raise HTTPException(409, "System integration workspaces cannot be suspended from customer administration.")
    if "name" in updates:
        updates["name"] = updates["name"].strip()
        if not updates["name"]:
            raise HTTPException(400, "Organization name cannot be empty.")
    if updates.get("rate_limit_rpm") is not None and not 1 <= updates["rate_limit_rpm"] <= 100000:
        raise HTTPException(400, "Custom rate limit must be between 1 and 100,000 requests per minute.")
    updated = tenants.update_tenant(organization_id, updates)
    activity.record_audit_event(organization_id, admin_ctx["user"]["name"], "organization_updated", f"Updated organization settings: {', '.join(updates.keys())}.")
    return {"organization": {k: v for k, v in updated.items() if k != "webhook_secret"}}


@app.put("/v1/admin/organizations/{organization_id}/members")
def api_admin_upsert_organization_member(organization_id: str, req: AdminMemberRequest, admin_ctx: dict = Depends(auth.require_admin_user)):
    if not tenants.get_tenant(organization_id):
        raise HTTPException(404, "Organization not found.")
    target = next((u for u in auth._load_json(auth.USERS_FILE, {}).values() if u.get("email", "").lower() == req.email.strip().lower()), None)
    if not target:
        raise HTTPException(404, "No platform user has that email yet. Ask them to register first.")
    if target.get("role") == "admin":
        raise HTTPException(400, "Platform administrators are managed separately from customer workspace members.")
    members = auth.get_tenant_members(organization_id)
    existing = next((member for member in members if member["user_id"] == target["id"]), None)
    if existing and existing.get("role") == "owner" and req.role != "owner" and sum(m.get("role") == "owner" for m in members) < 2:
        raise HTTPException(409, "Add another owner before changing the only organization owner.")
    membership = auth.add_membership(target["id"], organization_id, req.role)
    activity.record_audit_event(organization_id, admin_ctx["user"]["name"], "organization_member_updated", f"Set {target['email']} to {req.role}.")
    return {"membership": membership}


@app.delete("/v1/admin/organizations/{organization_id}/members/{user_id}")
def api_admin_remove_organization_member(organization_id: str, user_id: str, admin_ctx: dict = Depends(auth.require_admin_user)):
    if not tenants.get_tenant(organization_id):
        raise HTTPException(404, "Organization not found.")
    members = auth.get_tenant_members(organization_id)
    target = next((member for member in members if member["user_id"] == user_id), None)
    if target and target.get("role") == "owner" and sum(m.get("role") == "owner" for m in members) < 2:
        raise HTTPException(409, "Add another owner before removing the only organization owner.")
    if not auth.remove_membership(organization_id, user_id):
        raise HTTPException(404, "Organization member not found.")
    activity.record_audit_event(organization_id, admin_ctx["user"]["name"], "organization_member_removed", f"Removed member {user_id}.")
    return {"status": "removed"}


@app.post("/v1/admin/organizations/{organization_id}/keys/{key_id}/revoke")
def api_admin_revoke_organization_key(organization_id: str, key_id: str, admin_ctx: dict = Depends(auth.require_admin_user)):
    if not tenants.revoke_api_key(organization_id, key_id):
        raise HTTPException(404, "API key not found.")
    activity.record_audit_event(organization_id, admin_ctx["user"]["name"], "api_key_revoked", f"Revoked API key {key_id}.")
    return {"status": "revoked"}


@app.get("/v1/admin/users")
def api_admin_users(admin_ctx: dict = Depends(auth.require_admin_user)):
    """List all registered users on this platform."""
    users = auth._load_json(auth.USERS_FILE, {})
    sanitized = [
        {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "company": u.get("company", ""),
            "role": u.get("role", "user"),
            "created_at": u.get("created_at"),
        }
        for u in users.values()
    ]
    return {"users": sanitized}


@app.get("/v1/admin/audit-logs")
def api_admin_audit_logs(admin_ctx: dict = Depends(auth.require_admin_user)):
    """System-wide audit trail across all tenants."""
    logs = activity.get_all_platform_audit_logs(limit=100)
    return {"audit_logs": logs}


# =============================================================================
# Single Page Application HTML Delivery
# =============================================================================
@app.get("/console", response_class=HTMLResponse)
@app.get("/console.html", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
@app.get("/register", response_class=HTMLResponse)
@app.get("/forgot-password", response_class=HTMLResponse)
@app.get("/reset-password", response_class=HTMLResponse)
@app.get("/onboarding", response_class=HTMLResponse)
@app.get("/app", response_class=HTMLResponse)
@app.get("/app/{path:path}", response_class=HTMLResponse)
@app.get("/admin", response_class=HTMLResponse)
@app.get("/admin/{path:path}", response_class=HTMLResponse)
def get_console_app_page():
    """Deliver the BioAuth BaaS Enterprise Developer Console SPA."""
    if os.path.exists(CONSOLE_PATH):
        with open(CONSOLE_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)
    raise HTTPException(404, "Console application not found on server.")


@app.get("/", response_class=HTMLResponse)
def root(accept: Optional[str] = Header(None)):
    """Deliver BaaS Portal UI for browsers, or JSON metadata for API clients."""
    if accept and "application/json" in accept and "text/html" not in accept:
        return Response(
            content=json.dumps({
                "status": "ok",
                "service": "behavioral-auth-baas",
                "version": "2.1.0",
                "sdk": "/sdk.js",
                "demo": "/demo",
                "console": "/login",
                "health": "/v1/system/health",
                "docs": "/docs"
            }),
            media_type="application/json"
        )

    # In browsers, open console app
    if os.path.exists(CONSOLE_PATH):
        with open(CONSOLE_PATH, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h2>BioAuth BaaS Service Online</h2><p><a href='/docs'>API Docs</a> | <a href='/v1/system/health'>Health</a></p>")

# Enterprise Multi-Tenant Behavioral Authentication BaaS v2.1
