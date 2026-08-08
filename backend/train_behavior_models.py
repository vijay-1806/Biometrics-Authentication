import pymongo
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
import joblib, os
from datetime import datetime, timezone
import numpy as np

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/lms_demo")
MIN_WINDOWS = int(os.getenv("MIN_WINDOWS", "200"))
MIN_DISTINCT_DAYS = int(os.getenv("MIN_DISTINCT_DAYS", "5"))
FEATURE_COLUMNS = [
    'dwellTimeMean', 'dwellTimeStd', 'flightTimeMean', 'flightTimeStd',
    'typingSpeed', 'backspaceRate', 'mouseSpeedMean', 'mouseSpeedStd',
    'clickCount', 'pathCurvature'
]
MODEL_DIR = "trained_models"

def fetch_student_windows(db, student_id):
    cursor = db.behaviorwindows.find({
        'student': student_id,
        'context': {'$ne': 'exam'}       # never train on exam sessions — only "trusted" contexts
    })
    return list(cursor)

def is_eligible(windows):
    if len(windows) < MIN_WINDOWS:
        return False, "not_enough_windows"
    distinct_days = {w['windowStartTime'].date() for w in windows}
    if len(distinct_days) < MIN_DISTINCT_DAYS:
        return False, "not_enough_distinct_days"
    return True, "ok"

def to_matrix(windows):
    import numpy as np
    rows = []
    for w in windows:
        f = w['features']
        row = [f.get(c) for c in FEATURE_COLUMNS]
        if any(v is None for v in row):
            continue  # skip incomplete rows rather than imputing silently
        rows.append(row)
    return np.array(rows)

def train_for_student(db, student_id):
    windows = fetch_student_windows(db, student_id)
    eligible, reason = is_eligible(windows)
    if not eligible:
        db.behaviormodels.update_one(
            {'student': student_id},
            {'$set': {'status': 'not_ready', 'reason': reason}},
            upsert=True
        )
        return

    X = to_matrix(windows)
    if len(X) < MIN_WINDOWS:  # re-check after dropping incomplete rows
        db.behaviormodels.update_one(
            {'student': student_id},
            {'$set': {'status': 'not_ready', 'reason': 'too_many_incomplete_rows'}},
            upsert=True
        )
        return

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = OneClassSVM(kernel='rbf', gamma='scale', nu=0.05)
    model.fit(X_scaled)
    
    # Calculate baseline model quality (self-score normal rate)
    train_scores = model.decision_function(X_scaled)
    normal_count = sum(train_scores >= 0)
    baselineNormalRate = normal_count / len(train_scores) if len(train_scores) > 0 else 0

    # Derive personalized threshold: 10th percentile of own training scores
    personalThreshold = np.percentile(train_scores, 10) if len(train_scores) > 0 else 0.0

    os.makedirs(MODEL_DIR, exist_ok=True)
    path = f"{MODEL_DIR}/{student_id}.pkl"
    joblib.dump({'model': model, 'scaler': scaler, 'features': FEATURE_COLUMNS}, path)

    db.behaviormodels.update_one(
        {'student': student_id},
        {'$set': {
            'status': 'ready',
            'modelPath': path,
            'trainedAt': datetime.now(timezone.utc),
            'trainingWindowCount': len(X),
            'baselineNormalRate': float(baselineNormalRate),
            'personalThreshold': float(personalThreshold),
            'scalerParams': {
                'mean': scaler.mean_.tolist(),
                'scale': scaler.scale_.tolist()
            }
        }},
        upsert=True
    )
    return True

def main():
    client = pymongo.MongoClient(MONGO_URI)
    db = client.get_default_database()
    student_ids = db.behaviorwindows.distinct('student')
    
    ready_count = 0
    not_ready_count = 0
    
    for sid in student_ids:
        if train_for_student(db, sid):
            ready_count += 1
            print(f"processed {sid} - READY")
        else:
            not_ready_count += 1
            print(f"processed {sid} - NOT READY")
            
    print(f"\n--- Training Summary ---")
    print(f"Eligible (Ready): {ready_count}")
    print(f"Not Eligible (Waiting): {not_ready_count}")

if __name__ == "__main__":
    main()
