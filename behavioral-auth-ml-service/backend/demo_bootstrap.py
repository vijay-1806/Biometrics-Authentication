"""Install the explicitly enabled local demo without replacing persistent user data."""
import json
import os
from pathlib import Path
import shutil

STUDENTS = {
    "vijay": "6a9268397e77cbd6c3c3e886",
    "ragavan": "6ab3f447e9fa5f05ade70262",
    "sarvanth": "6ab4975852379a75c38844e5",
}


def bootstrap():
    if os.environ.get("DEMO_SEED") != "true":
        return
    root = Path(__file__).resolve().parent.parent
    seeds = Path(os.environ.get("ML_DEMO_SEED_DIR", "/app/demo-seeds/ml"))
    marker = root / "data" / ".saved-demo-v1"
    if marker.exists():
        return
    # Validate all source artifacts before changing persistent volumes.
    import joblib
    for uid in STUDENTS.values():
        profile = json.loads((seeds / "data" / (uid + ".json")).read_text())
        if not profile.get("baseline_trained_at"):
            raise ValueError("Saved profile is not trained: " + uid)
        bundle = joblib.load(seeds / "models" / (uid + ".joblib"))
        if not isinstance(bundle, dict) or not {"model", "scaler"}.issubset(bundle):
            raise ValueError("Invalid saved model: " + uid)
    for uid in STUDENTS.values():
        for directory, suffix in (("data", ".json"), ("models", ".joblib")):
            target = root / directory / (uid + suffix)
            target.parent.mkdir(parents=True, exist_ok=True)
            # A previously retrained model/profile always wins over the demo export.
            if not target.exists():
                shutil.copyfile(seeds / directory / target.name, target)
    marker.write_text("Saved student profiles installed.\n")
    print("Demo bootstrap: trained Vijay, Ragavan and Sarvanth profiles available.", flush=True)


def bootstrap_console_accounts(auth):
    if os.environ.get("DEMO_SEED") != "true":
        return
    marker = Path(auth.DATA_DIR) / ".demo-console-v1"
    if marker.exists():
        return
    for name in STUDENTS:
        email = name + "@gmail.com"
        users = auth._load_json(auth.USERS_FILE, {})
        existing = next((user for user in users.values() if user.get("email") == email), None)
        if existing:
            continue
        user = auth.register_user(name.title(), email, "DemoStudent@2026!", "LuminaLMS Demo")
        memberships = auth._load_json(auth.MEMBERSHIPS_FILE, [])
        memberships.append({
            "id": "mem_demo_" + name,
            "user_id": user["id"],
            "tenant_id": "default",
            "role": "viewer",
            "joined_at": auth._now_iso(),
        })
        auth._save_json(auth.MEMBERSHIPS_FILE, memberships)
    marker.write_text("Demo console accounts installed.\n")
