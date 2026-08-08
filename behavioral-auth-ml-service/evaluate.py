"""
Evaluate false-reject / false-accept rate from labeled verify attempts.

Fill in results.csv with one row per verify attempt you already ran:
    user_id,is_genuine,trust_score
    student_riya,1,82.3
    student_riya,0,31.0
    ...

is_genuine = 1 if the real enrolled person typed it, 0 if an impostor did.
trust_score = the trust_score your /verify endpoint returned for that attempt.

Run:
    python evaluate.py results.csv
"""

import sys
import csv
import numpy as np

def load(path):
    rows = []
    with open(path) as f:
        for r in csv.DictReader(f):
            rows.append((r["user_id"], int(r["is_genuine"]), float(r["trust_score"])))
    return rows

def evaluate(rows, threshold):
    """At this threshold: score >= threshold => 'accept'."""
    fr = fa = genuine_n = impostor_n = 0
    for _, is_genuine, score in rows:
        accept = score >= threshold
        if is_genuine:
            genuine_n += 1
            if not accept:
                fr += 1  # false reject: genuine user, denied
        else:
            impostor_n += 1
            if accept:
                fa += 1  # false accept: impostor, let in
    frr = fr / genuine_n if genuine_n else 0.0
    far = fa / impostor_n if impostor_n else 0.0
    return frr, far, genuine_n, impostor_n

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "results.csv"
    rows = load(path)
    genuine_scores = [s for _, g, s in rows if g == 1]
    impostor_scores = [s for _, g, s in rows if g == 0]

    print(f"Loaded {len(rows)} attempts: {len(genuine_scores)} genuine, {len(impostor_scores)} impostor\n")
    print(f"Genuine scores  — mean {np.mean(genuine_scores):.1f}, min {np.min(genuine_scores):.1f}, max {np.max(genuine_scores):.1f}")
    print(f"Impostor scores — mean {np.mean(impostor_scores):.1f}, min {np.min(impostor_scores):.1f}, max {np.max(impostor_scores):.1f}\n")

    print(f"{'threshold':>10} | {'FRR':>6} | {'FAR':>6}")
    print("-" * 32)
    best = None
    for t in range(0, 101, 5):
        frr, far, gn, imn = evaluate(rows, t)
        print(f"{t:>10} | {frr:>5.0%} | {far:>5.0%}")
        # simple equal-error-rate-style pick: minimize the larger of the two
        score = max(frr, far)
        if best is None or score < best[0]:
            best = (score, t, frr, far)

    print(f"\nSuggested threshold (minimizes worst of FRR/FAR): {best[1]}  (FRR={best[2]:.0%}, FAR={best[3]:.0%})")
    print("\nCaveat: with ~10 samples/user this is a rough estimate, not a robust")
    print("number — report it as 'preliminary, N=X attempts' rather than a final claim.")

if __name__ == "__main__":
    main()
