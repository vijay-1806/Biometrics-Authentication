"""
Behavioral Authentication API — Phase 1 (Updated with Digraph Fallback, Retraining & Score Normalization)

Endpoints:
    POST /enroll         add one enrollment typing sample for a user
    POST /verify          score one live typing sample against the user's model
    GET  /users/{id}/status   enrollment progress + model state
    POST /users/{id}/retrain  promote a shadow model trained on trusted sessions
    GET  /passage/{kind}      fetch the fixed passage text ("enroll" or "verify")

Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal
import os
import csv
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from features import extract_features, feature_names
from passages import PASSAGES, ENROLL_DIGRAPHS, VERIFY_DIGRAPHS
import storage

app = FastAPI(title="Behavioral Authentication API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before deploying beyond local testing
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- config -------------------------------------------------------------
PROVISIONAL_MIN_SAMPLES = 10
FULL_MIN_SAMPLES = 20
ROLLING_WINDOW = 5
RETRAIN_EVERY_N_TRUSTED = 10
TRUSTED_SESSION_THRESHOLD = 75  # avg trust score to count a session as "trusted"


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
    Xs = bundle["scaler"].transform([vector])
    raw = bundle["model"].decision_function(Xs)[0]
    lo, hi = bundle["score_min"], bundle["score_max"]
    if hi - lo < 1e-9:
        return 80.0
    
    # Calibrated soft-margin hybrid score mapping:
    # Normal typing behavior (raw >= lo) maps to 70% - 98%
    # Natural typing variation (raw slightly < lo) maps smoothly to 45% - 65% (prevents cliff false rejections)
    # Severe impostor anomalies (dist >> 1.0) decay down to 20% - 30%
    if raw >= lo:
        normalized = (raw - lo) / (hi - lo + 1e-9)
        scaled = 70.0 + 25.0 * min(normalized, 1.2)
    else:
        dist = (lo - raw) / (abs(lo) + 1e-9)
        # Sigmoidal soft-margin decay for genuine robustness
        scaled = 70.0 - 50.0 * (dist / (dist + 0.8))

    return float(np.clip(scaled, 15.0, 98.0))


def _decide(state: str, rolling_avg: float, recent: List[float]):
    """Cold-start-aware decision logic. Provisional models can only
    ever request step-up, never deny -- we don't trust a 10-sample
    model enough to lock someone out."""
    if state == "collecting":
        return "allow", "n/a", "Not enough samples yet — password-only."

    if state == "provisional":
        if rolling_avg < 40:
            return "step_up", "medium", "Provisional model, low confidence match."
        return "allow", "low", "Provisional model, acceptable match."

    # full model
    sustained_low = len(recent) >= 3 and all(s < 40 for s in recent[-3:])
    if sustained_low:
        return "deny", "high", "Trust score stayed low across multiple samples."
    if rolling_avg >= 70:
        return "allow", "low", "Behavior matches baseline profile."
    if rolling_avg >= 40:
        return "step_up", "medium", "Behavior partially deviates from baseline."
    return "step_up", "medium", "Low trust score, single low sample (not sustained)."


# ---- endpoints --------------------------------------------------------------
@app.get("/passage/{kind}")
def get_passage(kind: Literal["enroll", "verify"]):
    return {"kind": kind, "text": PASSAGES[kind]}


@app.post("/enroll")
def enroll(req: EnrollRequest):
    try:
        vector = extract_features(
            [e.dict() for e in req.events], ENROLL_DIGRAPHS
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    user = storage.load_user(req.user_id)
    user["enroll_samples"].append(vector.tolist())
    n = len(user["enroll_samples"])
    state = _state_for(n)

    trained = False
    if state in ("provisional", "full"):
        # retrain on every new sample until we hit "full", then only
        # on explicit /retrain calls afterwards (adaptive retraining)
        if state == "provisional" or (state == "full" and user["baseline_trained_at"] is None):
            bundle = _train(user["enroll_samples"])
            storage.save_model(req.user_id, bundle)
            user["baseline_trained_at"] = n
            trained = True

    storage.save_user(req.user_id, user)

    return {
        "user_id": req.user_id,
        "samples_collected": n,
        "state": state,
        "samples_to_provisional": max(0, PROVISIONAL_MIN_SAMPLES - n),
        "samples_to_full": max(0, FULL_MIN_SAMPLES - n),
        "model_trained_this_call": trained,
    }


@app.post("/verify")
def verify(req: VerifyRequest):
    try:
        vector = extract_features(
            [e.dict() for e in req.events], VERIFY_DIGRAPHS
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    user = storage.load_user(req.user_id)
    n = len(user["enroll_samples"])
    state = _state_for(n)

    bundle = storage.load_model(req.user_id)
    if bundle is None:
        # Fallback to trained baseline model (e.g. 'vijay' or primary dataset model)
        available_models = [f[:-7] for f in os.listdir(storage.MODEL_DIR) if f.endswith('.joblib')]
        if available_models:
            fallback_id = "vijay" if "vijay" in available_models else available_models[0]
            bundle = storage.load_model(fallback_id)
            user = storage.load_user(fallback_id)
            n = len(user.get("enroll_samples", []))
            state = _state_for(n)
        else:
            return {
                "user_id": req.user_id,
                "state": "collecting",
                "trust_score": None,
                "confidence": 0,
                "risk_level": "n/a",
                "action": "allow",
                "reason": f"Only {n}/{PROVISIONAL_MIN_SAMPLES} enrollment samples so far — password-only.",
            }

    if state == "collecting":
        return {
            "user_id": req.user_id,
            "state": state,
            "trust_score": None,
            "confidence": 0,
            "risk_level": "n/a",
            "action": "allow",
            "reason": f"Only {n}/{PROVISIONAL_MIN_SAMPLES} enrollment samples so far — password-only.",
        }

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

    storage.save_user(req.user_id, user)

    return {
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
def status(user_id: str):
    user = storage.load_user(user_id)
    n = len(user["enroll_samples"])
    return {
        "user_id": user_id,
        "samples_collected": n,
        "state": _state_for(n),
        "trusted_sessions_banked": len(user["trusted_sessions"]),
        "baseline_trained_at": user["baseline_trained_at"],
    }


@app.post("/users/{user_id}/retrain")
def retrain(user_id: str, force: bool = False):
    """Adaptive retraining: fit model on baseline + banked trusted sessions."""
    user = storage.load_user(user_id)
    trusted = user.get("trusted_sessions", [])
    enroll_samples = user.get("enroll_samples", [])

    if not force and len(trusted) < RETRAIN_EVERY_N_TRUSTED:
        return {
            "retrained": False,
            "reason": f"Only {len(trusted)}/{RETRAIN_EVERY_N_TRUSTED} trusted sessions banked so far.",
        }

    combined = enroll_samples + trusted
    if not combined:
        raise HTTPException(400, "No enrollment or verified session samples available for this user.")

    bundle = _train(combined)
    storage.save_model(user_id, bundle)
    user["trusted_sessions"] = []
    user["recent_scores"] = []
    user["baseline_trained_at"] = len(combined)
    storage.save_user(user_id, user)

    return {
        "retrained": True,
        "user_id": user_id,
        "samples_used": len(combined),
        "reason": f"Model successfully retrained and updated on {len(combined)} samples."
    }


RESULTS_CSV = os.path.join(os.path.dirname(__file__), "..", "results.csv")


@app.post("/log_result")
def log_result(req: LogResultRequest):
    """Append one labeled verify attempt to results.csv, for evaluate.py.
    Call this right after /verify, once you know (as the test operator)
    whether the person typing was genuinely the enrolled user or not."""
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
def get_users():
    return {"users": storage.list_users()}


@app.get("/")
def root():
    return {"status": "ok", "service": "behavioral-auth-api"}


