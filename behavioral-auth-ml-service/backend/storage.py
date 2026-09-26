import json
import os
import joblib

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


def _user_file(user_id: str, tenant_id: str = "default") -> str:
    if tenant_id == "default":
        # Backward compatibility: root data directory
        return os.path.join(DATA_DIR, f"{user_id}.json")
    tenant_dir = os.path.join(DATA_DIR, "tenants", tenant_id)
    os.makedirs(tenant_dir, exist_ok=True)
    return os.path.join(tenant_dir, f"{user_id}.json")


def _model_file(user_id: str, tenant_id: str = "default") -> str:
    if tenant_id == "default":
        # Backward compatibility: root models directory
        return os.path.join(MODEL_DIR, f"{user_id}.joblib")
    tenant_dir = os.path.join(MODEL_DIR, "tenants", tenant_id)
    os.makedirs(tenant_dir, exist_ok=True)
    return os.path.join(tenant_dir, f"{user_id}.joblib")


# Universal alias mappings linking names and emails to MongoDB IDs
USER_ALIASES = {
    # Vijay
    "vijay": "6a9268397e77cbd6c3c3e886",
    "vijay@gmail.com": "6a9268397e77cbd6c3c3e886",
    "6a9268397e77cbd6c3c3e886": "6a9268397e77cbd6c3c3e886",
    "6a76a437f5922b18a8d0c3b0": "6a9268397e77cbd6c3c3e886",

    # Ragavan
    "ragavan": "6ab3f447e9fa5f05ade70262",
    "ragavan@gmail.com": "6ab3f447e9fa5f05ade70262",
    "6ab3f447e9fa5f05ade70262": "6ab3f447e9fa5f05ade70262",

    # Sarvanth
    "sarvanth": "6ab4975852379a75c38844e5",
    "sarvanth@gmail.com": "6ab4975852379a75c38844e5",
    "6ab4975852379a75c38844e5": "6ab4975852379a75c38844e5",
}

CANONICAL_META = {
    "6a9268397e77cbd6c3c3e886": {"name": "vijay", "email": "vijay@gmail.com"},
    "6ab3f447e9fa5f05ade70262": {"name": "ragavan", "email": "ragavan@gmail.com"},
    "6ab4975852379a75c38844e5": {"name": "sarvanth", "email": "sarvanth@gmail.com"},
}


def _sync_aliases_from_mongo():
    """Dynamically scan MongoDB lms_demo to index all user accounts."""
    try:
        import pymongo
        client = pymongo.MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=400)
        db = client['lms_demo']
        users = list(db.users.find({}, {'_id': 1, 'name': 1, 'email': 1}))
        for u in users:
            cid = str(u['_id']).lower()
            name = str(u.get('name') or '').strip().lower()
            email = str(u.get('email') or '').strip().lower()
            USER_ALIASES[cid] = cid
            if name:
                USER_ALIASES[name] = cid
            if email:
                USER_ALIASES[email] = cid
            CANONICAL_META[cid] = {'name': name, 'email': email}
    except Exception:
        pass


# Perform initial scan on startup
_sync_aliases_from_mongo()


def _resolve_canonical_id(user_id: str) -> str:
    """Resolve usernames, emails, or alias IDs to canonical dataset storage ID."""
    uid = str(user_id).strip().lower()
    if uid in USER_ALIASES:
        return USER_ALIASES[uid]

    # Query MongoDB for newly registered users
    try:
        import pymongo
        from bson import ObjectId
        client = pymongo.MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=400)
        db = client['lms_demo']
        
        query = None
        if len(uid) == 24 and all(c in '0123456789abcdef' for c in uid):
            try:
                query = {'_id': ObjectId(uid)}
            except Exception:
                pass
        
        if not query:
            query = {'$or': [{'name': {'$regex': f'^{uid}$', '$options': 'i'}}, {'email': uid}]}

        u = db.users.find_one(query)
        if u and '_id' in u:
            cid = str(u['_id']).lower()
            name = str(u.get('name') or '').strip().lower()
            email = str(u.get('email') or '').strip().lower()
            USER_ALIASES[cid] = cid
            if name:
                USER_ALIASES[name] = cid
            if email:
                USER_ALIASES[email] = cid
            CANONICAL_META[cid] = {'name': name, 'email': email}
            return cid
    except Exception:
        pass

    return user_id


def load_user(user_id: str, tenant_id: str = "default") -> dict:
    canonical_id = _resolve_canonical_id(user_id)
    
    # Check all possible candidate file paths
    candidate_paths = [_user_file(canonical_id, tenant_id)]
    if canonical_id != user_id:
        candidate_paths.append(_user_file(user_id, tenant_id))
    
    meta = CANONICAL_META.get(canonical_id)
    if meta:
        if meta.get("name"):
            candidate_paths.append(_user_file(meta["name"], tenant_id))
        if meta.get("email"):
            candidate_paths.append(_user_file(meta["email"], tenant_id))

    found_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            found_path = p
            break

    if not found_path:
        return {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "enroll_samples": [],       # list of feature vectors (lists)
            "trusted_sessions": [],     # feature vectors from high-trust verify sessions
            "baseline_trained_at": None,
            "recent_scores": [],        # rolling trust scores for smoothing (last N)
        }

    with open(found_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        if "enroll_samples" not in data:
            data["enroll_samples"] = []
        if "tenant_id" not in data:
            data["tenant_id"] = tenant_id

    # If canonical path was missing, auto-sync it immediately
    canonical_path = _user_file(canonical_id, tenant_id)
    if not os.path.exists(canonical_path):
        try:
            with open(canonical_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    return data


def save_user(user_id: str, data: dict, tenant_id: str = "default"):
    canonical_id = _resolve_canonical_id(user_id)
    data["tenant_id"] = tenant_id

    # Save to canonical ID path
    canonical_path = _user_file(canonical_id, tenant_id)
    os.makedirs(os.path.dirname(canonical_path), exist_ok=True)
    with open(canonical_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    # Multi-sync to raw user_id file if different
    if canonical_id != user_id:
        raw_path = _user_file(user_id, tenant_id)
        with open(raw_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    # Multi-sync to friendly username and email files if known
    meta = CANONICAL_META.get(canonical_id)
    if meta:
        if meta.get("name") and meta["name"] != canonical_id and meta["name"] != user_id:
            name_path = _user_file(meta["name"], tenant_id)
            with open(name_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)


def save_model(user_id: str, model_bundle: dict, tenant_id: str = "default"):
    canonical_id = _resolve_canonical_id(user_id)
    canonical_path = _model_file(canonical_id, tenant_id)
    os.makedirs(os.path.dirname(canonical_path), exist_ok=True)
    joblib.dump(model_bundle, canonical_path)

    # Multi-sync to raw user_id model if different
    if canonical_id != user_id:
        joblib.dump(model_bundle, _model_file(user_id, tenant_id))

    # Multi-sync to friendly username model if known
    meta = CANONICAL_META.get(canonical_id)
    if meta and meta.get("name") and meta["name"] != canonical_id and meta["name"] != user_id:
        joblib.dump(model_bundle, _model_file(meta["name"], tenant_id))


def load_model(user_id: str, tenant_id: str = "default"):
    canonical_id = _resolve_canonical_id(user_id)
    
    candidate_paths = [_model_file(canonical_id, tenant_id)]
    if canonical_id != user_id:
        candidate_paths.append(_model_file(user_id, tenant_id))
    
    meta = CANONICAL_META.get(canonical_id)
    if meta and meta.get("name"):
        candidate_paths.append(_model_file(meta["name"], tenant_id))

    for p in candidate_paths:
        if os.path.exists(p):
            return joblib.load(p)

    return None


def list_users(tenant_id: str = "default"):
    users = []
    target_dir = DATA_DIR if tenant_id == "default" else os.path.join(DATA_DIR, "tenants", tenant_id)
    if not os.path.exists(target_dir):
        return users
    for fname in os.listdir(target_dir):
        if fname.endswith(".json"):
            users.append(fname[:-5])
    return users
