"""Create fictional demo accounts and models from generated keystroke timings."""
import json
import os
from pathlib import Path
from random import Random

import joblib

from features import extract_features
from passages import get_passage_for_sample

STUDENTS = {
    "student-one": "00000000000000000000000d",
    "student-two": "00000000000000000000000e",
    "student-three": "00000000000000000000000f",
}


def synthetic_samples(student_index):
    random = Random(7300 + student_index)
    samples = []
    for sample_number in range(1, 21):
        passage = get_passage_for_sample(sample_number)
        events = []
        time_ms = 0.0
        tempo = random.uniform(110, 185) + student_index * 25
        dwell = random.uniform(55, 100) + student_index * 8
        for key in passage["text"]:
            events.append({"key": key, "type": "down", "t": time_ms})
            events.append({
                "key": key, "type": "up", "t": time_ms + dwell + random.uniform(-12, 12),
            })
            time_ms += tempo + random.uniform(-30, 30)
        samples.append(extract_features(events, passage["digraphs"]).tolist())
    return samples


def bootstrap(train):
    if os.environ.get("DEMO_SEED") != "true":
        return
    root = Path(__file__).resolve().parent.parent
    data = root / "data"
    models = root / "models"
    marker = data / ".synthetic-demo-v1"
    if marker.exists():
        return
    data.mkdir(parents=True, exist_ok=True)
    models.mkdir(parents=True, exist_ok=True)
    for index, user_id in enumerate(STUDENTS.values()):
        profile_path = data / (user_id + ".json")
        model_path = models / (user_id + ".joblib")
        if profile_path.exists():
            profile = json.loads(profile_path.read_text())
        else:
            samples = synthetic_samples(index)
            profile = {
                "user_id": user_id, "tenant_id": "default", "enroll_samples": samples,
                "baseline_trained_at": len(samples), "trusted_sessions": [], "recent_scores": [],
            }
        if not model_path.exists() and profile.get("baseline_trained_at"):
            pending = model_path.with_suffix(".tmp")
            joblib.dump(train(profile["enroll_samples"]), pending)
            pending.replace(model_path)
        if not profile_path.exists():
            pending = profile_path.with_suffix(".tmp")
            pending.write_text(json.dumps(profile))
            pending.replace(profile_path)
    marker.write_text("Synthetic demo profiles installed.\n")
    print("Demo bootstrap: synthetic student profiles available.", flush=True)


def bootstrap_console_accounts(auth):
    if os.environ.get("DEMO_SEED") != "true":
        return
    marker = Path(auth.DATA_DIR) / ".demo-console-v1"
    if marker.exists():
        return
    for name in STUDENTS:
        email = name + "@lms.example.com"
        users = auth._load_json(auth.USERS_FILE, {})
        if any(user.get("email") == email for user in users.values()):
            continue
        user = auth.register_user(name.replace("-", " ").title(), email, "DemoStudent@2026!", "LuminaLMS Demo")
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
