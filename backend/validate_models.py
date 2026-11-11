import pymongo
import joblib
import numpy as np
from train_behavior_models import fetch_student_windows, to_matrix

MONGO_URI = "mongodb://127.0.0.1:27017/lms_demo"

def validate_models():
    client = pymongo.MongoClient(MONGO_URI)
    db = client.get_default_database()
    
    # Get all students with ready models
    ready_students = list(db.behaviormodels.find({'status': 'ready'}))
    
    if len(ready_students) < 2:
        print("Need at least 2 students for cross-validation.")
        return

    student_a = ready_students[0]['student']
    student_b = ready_students[1]['student']

    print(f"Student A ID: {student_a}")
    print(f"Student B ID: {student_b}")

    # Load model for Student A
    try:
        data_a = joblib.load(f"trained_models/{student_a}.pkl")
        model_a = data_a['model']
        scaler_a = data_a['scaler']
    except Exception as e:
        print(f"Could not load model for Student A: {e}")
        return

    # Load model for Student B
    try:
        data_b = joblib.load(f"trained_models/{student_b}.pkl")
        model_b = data_b['model']
        scaler_b = data_b['scaler']
    except Exception as e:
        print(f"Could not load model for Student B: {e}")
        return

    # Get data for Student A and B
    windows_a = fetch_student_windows(db, student_a)
    windows_b = fetch_student_windows(db, student_b)

    matrix_a = to_matrix(windows_a)
    matrix_b = to_matrix(windows_b)

    if len(matrix_a) == 0 or len(matrix_b) == 0:
        print("Not enough complete feature rows for validation.")
        return

    print("\n--- Validating Student A's Model ---")
    
    # Scale both sets using Student A's scaler
    x_a_scaled = scaler_a.transform(matrix_a)
    x_b_scaled = scaler_a.transform(matrix_b)

    # Score
    scores_a_self = model_a.decision_function(x_a_scaled)
    scores_b_cross = model_a.decision_function(x_b_scaled)

    print(f"Self-score (Student A data on Student A model):")
    print(f"Mean: {np.mean(scores_a_self):.4f}, Std: {np.std(scores_a_self):.4f}")
    print(f"Positive predictions: {np.sum(scores_a_self > 0)} / {len(scores_a_self)}")

    print(f"\nCross-score (Student B data on Student A model):")
    print(f"Mean: {np.mean(scores_b_cross):.4f}, Std: {np.std(scores_b_cross):.4f}")
    print(f"Negative predictions (Anomalies): {np.sum(scores_b_cross < 0)} / {len(scores_b_cross)}")


    print("\n--- Validating Student B's Model ---")
    
    x_b_scaled2 = scaler_b.transform(matrix_b)
    x_a_scaled2 = scaler_b.transform(matrix_a)

    scores_b_self = model_b.decision_function(x_b_scaled2)
    scores_a_cross = model_b.decision_function(x_a_scaled2)

    print(f"Self-score (Student B data on Student B model):")
    print(f"Mean: {np.mean(scores_b_self):.4f}, Std: {np.std(scores_b_self):.4f}")
    print(f"Positive predictions: {np.sum(scores_b_self > 0)} / {len(scores_b_self)}")

    print(f"\nCross-score (Student A data on Student B model):")
    print(f"Mean: {np.mean(scores_a_cross):.4f}, Std: {np.std(scores_a_cross):.4f}")
    print(f"Negative predictions (Anomalies): {np.sum(scores_a_cross < 0)} / {len(scores_a_cross)}")


if __name__ == "__main__":
    validate_models()
