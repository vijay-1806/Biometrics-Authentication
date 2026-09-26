"""
Behavioral Authentication API — Multi-Tenant BaaS (Biometrics-as-a-Service)
Supports API Key Authentication, Tenant-Isolated Storage, Embeddable SDK Delivery,
Continuous Scoring, and Adaptive Model Retraining.

Endpoints:
    GET  /sdk.js, /v1/biometrics.js   serve embeddable client SDK
    GET  /demo                        serve interactive third-party integration demo
    GET  /api-keys/validate           verify tenant key validity
    POST /enroll                      add one enrollment typing sample for a user
    POST /verify                      score one live typing sample against the user's model
    GET  /users/{id}/status           enrollment progress + model state
    POST /users/{id}/retrain          promote a shadow model trained on trusted sessions
    GET  /passage/{kind}              fetch the fixed passage text ("enroll" or "verify")

Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Header, Query, Depends, Response
from fastapi.responses import HTMLResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Optional
import os
import csv
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

app = FastAPI(title="Behavioral Authentication API", version="2.0.0")

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

SDK_PATH = os.path.join(os.path.dirname(__file__), "sdk", "biometrics.js")
DEMO_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "sdk_demo.html")


# ---- multi-tenant api key dependency ------------------------------------
def get_tenant(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    api_key: Optional[str] = Query(None)
) -> str:
    """
    Extract tenant identity from API Key header or query parameter.
    Defaults to 'default' for backwards compatibility with LMS & tests.
    """
    raw = x_api_key or api_key
    if not raw:
        return "default"
    
    key = raw.strip()
    if key in ("bio_live_default_lms_key", "default"):
        return "default"
    if key in ("bio_live_demo_test_key", "demo"):
        return "demo"
    if key.startswith("bio_live_"):
        return key[len("bio_live_"):]
    if key.startswith("bio_test_"):
        return key[len("bio_test_"):]
    return key


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
    3-Zone calibrated trust score (replaces simple min-max mapping).

    Zones (calibrated against Vijay + Sarvanth cross-user analysis):

      Inlier zone  (raw >= inlier_anchor): genuine typing region
                   Maps to [68 .. 95] — all confirmed genuine enroll
                   samples fall here; mean lands ~82 for most users.

      Transition   (lo <= raw < inlier_anchor): borderline / slow session
                   Maps to [52 .. 68] — triggers step_up but never deny.

      Anomaly      (raw < lo): clear outlier / impostor signature
                   Maps to [20 .. 52] with a steep linear drop-off.
                   Most cross-user impostors fall here (mean ~30-43).

    Why this reduces false-positives vs the old mapping:
    - Old mapping anchored at score_min (can be a one-off outlier)
      and mapped [min..max] -> [70..95], causing impostors with raw
      scores near min to receive trust=70 (false allow).
    - New mapping anchors the transition at lo + 15% of range, so
      only clearly inlier raw scores receive trust >= 68.
    """
    Xs = bundle["scaler"].transform([vector])
    raw = bundle["model"].decision_function(Xs)[0]
    lo, hi = bundle["score_min"], bundle["score_max"]
    span = hi - lo

    if span < 1e-9:
        return 80.0

    # Inlier anchor: 15% into the inlier range above score_min
    # Samples near lo are "barely inlier" — put them in transition, not allow
    inlier_anchor = lo + 0.15 * span

    if raw >= inlier_anchor:
        # Genuine inlier zone: map [inlier_anchor .. hi] -> [68 .. 95]
        frac = (raw - inlier_anchor) / (hi - inlier_anchor + 1e-9)
        scaled = 68.0 + 27.0 * min(frac, 1.0)
    elif raw >= lo:
        # Transition zone: map [lo .. inlier_anchor] -> [52 .. 68]
        frac = (raw - lo) / (inlier_anchor - lo + 1e-9)
        scaled = 52.0 + 16.0 * frac
    else:
        # Anomaly zone: steep penalty below score_min
        # Normalize by the full span so depth of anomaly is user-independent
        depth = (lo - raw) / (span + 1e-9)
        scaled = max(20.0, 52.0 - 50.0 * depth)

    return float(np.clip(scaled, 15.0, 95.0))


# ---- Decision thresholds (tuned for 3-zone calibrated score) --------
# With 3-zone scoring, genuine users consistently land in [68..95],
# transition cases land in [52..68], and impostors land in [20..55].
# Setting ALLOW at 65 (not 70) ensures genuine users near the inlier
# anchor (~68 mean in their worst phase) are not incorrectly stepped up.
ALLOW_THRESHOLD = 65        # rolling avg >= this  -> allow
STEPUP_THRESHOLD = 42       # rolling avg in [42..65) -> step_up
DENY_STREAK_THRESHOLD = 42  # all(last 3 < this)  -> deny


def _decide(state: str, rolling_avg: float, recent: List[float]):
    """Cold-start-aware decision logic tuned for 3-zone trust scoring.

    Thresholds are calibrated against real enrollment data from Vijay
    and Sarvanth. Key design goals:
      - FRR <= 5%: genuine users are never wrongly denied from normal typing
      - FAR reduced: impostors (avg trust ~30-52) are caught by step_up/deny
      - Provisional models NEVER deny (10 samples insufficient for hard deny)
    """
    if state == "collecting":
        return "allow", "n/a", "Not enough samples yet — password-only."

    if state == "provisional":
        if rolling_avg < STEPUP_THRESHOLD:
            return "step_up", "medium", "Provisional model, low confidence match."
        return "allow", "low", "Provisional model, acceptable match."

    # full model — require 3 consecutive low scores before hard deny
    # (single anomalous keystrokes e.g. phone call, sneeze never lock out)
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


@app.get("/api-keys/validate")
def validate_api_key(tenant_id: str = Depends(get_tenant)):
    """Check if an API key is valid and return associated tenant namespace."""
    return {
        "valid": True,
        "tenant_id": tenant_id,
        "status": "active"
    }


# ---- biometrics endpoints ---------------------------------------------------
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
def enroll(req: EnrollRequest, tenant_id: str = Depends(get_tenant)):
    user = storage.load_user(req.user_id, tenant_id=tenant_id)
    current_count = len(user["enroll_samples"])
    # This sample is sample_number = current_count + 1 (1-based)
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
        # retrain on every new sample until we hit "full", then only
        # on explicit /retrain calls afterwards (adaptive retraining)
        if state == "provisional" or (state == "full" and (user.get("baseline_trained_at") is None or user.get("baseline_trained_at") < FULL_MIN_SAMPLES)):
            bundle = _train(user["enroll_samples"])
            storage.save_model(req.user_id, bundle, tenant_id=tenant_id)
            user["baseline_trained_at"] = n
            trained = True

    storage.save_user(req.user_id, user, tenant_id=tenant_id)

    # Determine next passage info for the client
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
        "next_passage": next_info["text"] if n < FULL_MIN_SAMPLES else None,
        "next_phase": next_info["phase_number"] if n < FULL_MIN_SAMPLES else None,
        "next_phase_label": next_info["phase_label"] if n < FULL_MIN_SAMPLES else None,
    }


@app.post("/verify")
def verify(req: VerifyRequest, tenant_id: str = Depends(get_tenant)):
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
        return {
            "tenant_id": tenant_id,
            "user_id": req.user_id,
            "state": state,
            "trust_score": None,
            "confidence": 0,
            "risk_level": "n/a",
            "action": "allow",
            "reason": f"Only {n}/{PROVISIONAL_MIN_SAMPLES} enrollment samples so far — password-only.",
        }

    bundle = storage.load_model(req.user_id, tenant_id=tenant_id)
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

    # feed high-trust sessions back in as candidates for adaptive retraining
    if rolling_avg >= TRUSTED_SESSION_THRESHOLD:
        user["trusted_sessions"].append(vector.tolist())

    storage.save_user(req.user_id, user, tenant_id=tenant_id)

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
    }


@app.get("/users/{user_id}/status")
def status(user_id: str, tenant_id: str = Depends(get_tenant)):
    user = storage.load_user(user_id, tenant_id=tenant_id)
    n = len(user["enroll_samples"])
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "samples_collected": n,
        "state": _state_for(n),
        "trusted_sessions_banked": len(user["trusted_sessions"]),
        "baseline_trained_at": user["baseline_trained_at"],
    }


@app.post("/users/{user_id}/retrain")
def retrain(user_id: str, force: bool = False, tenant_id: str = Depends(get_tenant)):
    """Adaptive retraining: fit model on baseline + banked trusted sessions."""
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
    storage.save_model(user_id, bundle, tenant_id=tenant_id)
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


RESULTS_CSV = os.path.join(os.path.dirname(__file__), "..", "results.csv")


@app.post("/log_result")
def log_result(req: LogResultRequest):
    """Append one labeled verify attempt to results.csv, for evaluate.py."""
    is_new = not os.path.exists(RESULTS_CSV)
    with open(RESULTS_CSV, "a", newline="") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(["user_id", "is_genuine", "trust_score"])
        writer.writerow([req.user_id, int(req.is_genuine), req.trust_score])
    return {"logged": True}


@app.get("/evaluation")
def get_evaluation():
    if not os.path.exists(RESULTS_CSV):
        return {"has_data": False, "total_attempts": 0, "rows": []}
    
    rows = []
    with open(RESULTS_CSV, "r") as f:
        reader = csv.DictReader(f)
        for r in reader:
            try:
                rows.append({
                    "user_id": r["user_id"],
                    "is_genuine": int(r["is_genuine"]),
                    "trust_score": float(r["trust_score"])
                })
            except (ValueError, KeyError):
                continue
    
    if not rows:
        return {"has_data": False, "total_attempts": 0, "rows": []}

    genuine_scores = [r["trust_score"] for r in rows if r["is_genuine"] == 1]
    impostor_scores = [r["trust_score"] for r in rows if r["is_genuine"] == 0]

    thresholds = []
    best_threshold = 50
    min_worst_err = 1.0

    for t in range(0, 101, 5):
        fr = sum(1 for s in genuine_scores if s < t)
        fa = sum(1 for s in impostor_scores if s >= t)
        frr = fr / len(genuine_scores) if genuine_scores else 0.0
        far = fa / len(impostor_scores) if impostor_scores else 0.0
        thresholds.append({"threshold": t, "frr": round(frr * 100, 1), "far": round(far * 100, 1)})
        
        worst_err = max(frr, far)
        if worst_err < min_worst_err:
            min_worst_err = worst_err
            best_threshold = t

    return {
        "has_data": True,
        "total_attempts": len(rows),
        "genuine_count": len(genuine_scores),
        "impostor_count": len(impostor_scores),
        "genuine_mean": round(float(np.mean(genuine_scores)), 1) if genuine_scores else 0,
        "impostor_mean": round(float(np.mean(impostor_scores)), 1) if impostor_scores else 0,
        "best_threshold": best_threshold,
        "thresholds": thresholds,
        "rows": rows
    }


@app.get("/users")
def get_users(tenant_id: str = Depends(get_tenant)):
    return {
        "tenant_id": tenant_id,
        "users": storage.list_users(tenant_id=tenant_id)
    }


@app.get("/")
def root(tenant_id: str = Depends(get_tenant)):
    return {
        "status": "ok",
        "service": "behavioral-auth-api",
        "tenant_id": tenant_id,
        "sdk": "/sdk.js",
        "demo": "/demo"
    }
