# Behavioral Authentication — Phase 1

A standalone training/enrollment web app + API that collects keystroke
dynamics, trains a per-user Isolation Forest model, and scores live typing
samples with a trust score / confidence / risk level / action. Built to be
called from the LMS later — this phase is deliberately decoupled from it.

## Run it

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
Just open `frontend/index.html` in a browser (it talks to
`http://localhost:8000`). No build step — plain HTML/JS.

## How to test with 2–3 people

1. Each person picks a `user_id` (e.g. `student_riya`) on the **Enroll** tab
   and types the passage ~20 times (different sittings if possible — that's
   what makes the profile realistic instead of one lucky/unlucky sample).
2. Watch the state move `collecting → provisional → full` as samples build up.
3. Go to **Verify**, type the (different) verification passage as *yourself*
   — you should see high trust scores and `allow`.
4. Then have a **different enrolled person** type the verify passage under
   your `user_id` — trust score should drop and `risk_level`/`action`
   should shift toward `step_up` / `deny`. This is your impostor test.
5. Use **Status → Trigger adaptive retrain** after ~10 trusted verify
   sessions have been banked, to see the shadow-model promote/discard logic
   in action (this is the mechanism that answers "how do you handle drift").

## What answers the four review questions

- **Cold start** → `state` field: `collecting` (0–9 samples, password-only)
  → `provisional` (10–19, step-up only, never deny) → `full` (20+, all
  actions available). See `_decide()` in `main.py`.
- **False rejection rate** → `/verify` uses a rolling average of the last 5
  trust scores (`rolling_avg_trust`), and only denies on 3 *sustained* low
  scores in a row — a single bad sample never locks anyone out. Run the
  impostor test above across several genuine + impostor sessions per user
  and you can report a real FRR/FAR from the results.
- **Behavioral drift** → `/users/{id}/retrain`. Trusted verify sessions
  (rolling avg ≥ 75) get banked; every 10 banked sessions you can trigger a
  retrain that trains a *shadow* model on baseline + new sessions and only
  promotes it if it still recognizes the original enrollment samples
  (`drift_score < 15`). The original baseline file is never edited in place.
- **Feature vector specifics** → `features.py`: mean/std dwell time,
  mean/std flight time, WPM, backspace rate, plus per-digraph mean latency
  for the 8 most common letter-pairs in the fixed passage. See
  `feature_names()` for the exact ordering.

## Known simplifications (be upfront about these in review)

- Enrollment and verification use *different* fixed passages, so the 8
  digraph feature slots don't refer to the same letter pairs in both — the
  vector *shape* matches (14-dim) but digraph identity doesn't line up
  1:1 between enroll and verify. Fine for a phase-1 demo; a real version
  should either share one passage or normalize digraphs across both.
- Storage is flat JSON files per user (fine for 2–3 test users). Swap for
  the MongoDB you're already using in the LMS before wiring this in for
  real classes.
- `contamination=0.1` and the retrain drift threshold (`15`) are reasonable
  starting guesses, not tuned values — tune them against your actual
  genuine/impostor test data once you have it.

## Next (phase 2)

Point the LMS's `useBehaviorTracking.jsx` at this API's `/verify` endpoint
during exams, and stream `trust_score` + `action` over the existing
Socket.IO connection to the teacher's live proctoring dashboard.
