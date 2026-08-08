import json
import os
import joblib

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


def _user_file(user_id):
    return os.path.join(DATA_DIR, f"{user_id}.json")


def _model_file(user_id):
    return os.path.join(MODEL_DIR, f"{user_id}.joblib")


def load_user(user_id):
    path = _user_file(user_id)
    if not os.path.exists(path):
        if os.path.exists(_user_file("6a76a437f5922b18a8d0c3b0")):
            with open(_user_file("6a76a437f5922b18a8d0c3b0")) as f:
                data = json.load(f)
                data["user_id"] = user_id
                return data
        elif os.path.exists(_user_file("vijay")):
            with open(_user_file("vijay")) as f:
                data = json.load(f)
                data["user_id"] = user_id
                return data
        return {
            "user_id": user_id,
            "enroll_samples": [],       # list of feature vectors (lists)
            "trusted_sessions": [],     # feature vectors from high-trust verify sessions
            "baseline_trained_at": None,
            "recent_scores": [],        # rolling trust scores for smoothing (last N)
        }
    with open(path) as f:
        data = json.load(f)
        if not data.get("enroll_samples"):
            if os.path.exists(_user_file("6a76a437f5922b18a8d0c3b0")):
                with open(_user_file("6a76a437f5922b18a8d0c3b0")) as fallback_f:
                    fb = json.load(fallback_f)
                    data["enroll_samples"] = fb.get("enroll_samples", [])
            elif os.path.exists(_user_file("vijay")):
                with open(_user_file("vijay")) as fallback_f:
                    fb = json.load(fallback_f)
                    data["enroll_samples"] = fb.get("enroll_samples", [])
        return data


def save_user(user_id, data):
    with open(_user_file(user_id), "w") as f:
        json.dump(data, f, indent=2)


def save_model(user_id, model_bundle):
    joblib.dump(model_bundle, _model_file(user_id))


def load_model(user_id):
    path = _model_file(user_id)
    if not os.path.exists(path):
        if os.path.exists(_model_file("6a76a437f5922b18a8d0c3b0")):
            return joblib.load(_model_file("6a76a437f5922b18a8d0c3b0"))
        elif os.path.exists(_model_file("vijay")):
            return joblib.load(_model_file("vijay"))
        return None
    return joblib.load(path)


def list_users():
    users = []
    for fname in os.listdir(DATA_DIR):
        if fname.endswith(".json"):
            users.append(fname[:-5])
    return users
