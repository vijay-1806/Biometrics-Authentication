from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import glob
import numpy as np
import sys

app = FastAPI()
models = {}

MODEL_DIR = "trained_models"

# Load models on startup
@app.on_event("startup")
def load_models():
    print("Loading models...")
    load_errors = []
    for path in glob.glob(f"{MODEL_DIR}/*.pkl"):
        filename = os.path.basename(path)
        student_id = filename.replace('.pkl', '')
        try:
            data = joblib.load(path)
            models[student_id] = {
                'model': data['model'],
                'scaler': data['scaler'],
                'features': data['features']
            }
            print(f"Loaded model for {student_id}")
        except Exception as e:
            load_errors.append((path, str(e)))

    if load_errors and not models:
        # total failure — don't limp along pretending to be healthy
        print(f"FATAL: failed to load any models. Errors: {load_errors}", file=sys.stderr)
        sys.exit(1)
    elif load_errors:
        print(f"WARNING: {len(load_errors)} models failed to load: {load_errors}", file=sys.stderr)

@app.get("/health")
def health():
    return {"status": "ok" if models else "degraded", "models_loaded": len(models)}

class ScoreRequest(BaseModel):
    studentId: str
    features: dict

@app.post("/score")
def score(req: ScoreRequest):
    if req.studentId not in models:
        raise HTTPException(status_code=404, detail="Model not found or not ready")
    
    m_data = models[req.studentId]
    model = m_data['model']
    scaler = m_data['scaler']
    feature_cols = m_data['features']
    
    # Construct feature row
    row = [req.features.get(c, 0) for c in feature_cols]
    
    # Scale and score
    X = np.array([row])
    X_scaled = scaler.transform(X)
    score_val = model.decision_function(X_scaled)[0]
    
    return {"scored": True, "score": float(score_val)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5001)
