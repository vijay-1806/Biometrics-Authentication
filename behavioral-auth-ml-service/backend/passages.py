"""
Multi-Phase Typing Passages for Behavioral Biometric Enrollment & Verification.

Enrollment uses 4 distinct passages (5 samples each = 20 total), rotating
through different character types to build a richer biometric profile:

  Phase 1 (samples  1–5):  lowercase prose       — baseline rhythm
  Phase 2 (samples  6–10): mixed case + numbers   — shift-key & number-row dynamics
  Phase 3 (samples 11–15): code-like syntax        — brackets, semicolons, camelCase
  Phase 4 (samples 16–20): natural mixed typing    — emails, URLs, symbols

Verification always uses Phase 1's passage so the digraph slots line up
predictably against the most stable portion of the trained model.

The Isolation Forest is trained on ALL 20 samples across all 4 phases.
Because the 6 base features (mean/std dwell, mean/std flight, WPM,
backspace rate) are passage-agnostic, the model learns the user's
*universal* timing signature.  The 8 digraph slots vary per phase —
this is intentional: it forces the model to treat digraph timing as
noisy/variable (which it is in real life) and rely more on the stable
per-user timing characteristics.  This is exactly why Vijay's dataset
(collected with varied sentences) produces better detection.
"""

# ---------------------------------------------------------------------------
# Phase 1 — Lowercase prose (baseline rhythm)
# ---------------------------------------------------------------------------
PASSAGE_PHASE_1 = (
    "the quick brown fox jumps over the lazy dog while the "
    "early morning sun rises above the quiet green hills"
)

# ---------------------------------------------------------------------------
# Phase 2 — Mixed case, numbers, and punctuation
# ---------------------------------------------------------------------------
PASSAGE_PHASE_2 = (
    "On March 15, 2024, Dr. Smith noted: Patient #47 shows "
    "98.6 degrees temperature, within normal range (36.5 to 37.5 Celsius)."
)

# ---------------------------------------------------------------------------
# Phase 3 — Code-like syntax, special characters, camelCase
# ---------------------------------------------------------------------------
PASSAGE_PHASE_3 = (
    "function validateUser(email, pwd123) { "
    "return email.includes('@') && pwd123.length >= 8; // check input }"
)

# ---------------------------------------------------------------------------
# Phase 4 — Natural mixed typing: emails, URLs, symbols
# ---------------------------------------------------------------------------
PASSAGE_PHASE_4 = (
    "Hello! My email is student_01@university.edu. "
    "Visit https://portal.edu/grades?term=2024&id=42 for results."
)

# Ordered list of all enrollment passages
ENROLL_PASSAGES = [
    PASSAGE_PHASE_1,
    PASSAGE_PHASE_2,
    PASSAGE_PHASE_3,
    PASSAGE_PHASE_4,
]

# Phase metadata for the SDK UI
PHASE_LABELS = [
    "Lowercase Prose — Baseline Rhythm",
    "Mixed Case, Numbers & Punctuation",
    "Code Syntax & Special Characters",
    "Natural Mixed Typing — Emails & URLs",
]

SAMPLES_PER_PHASE = 5

# ---------------------------------------------------------------------------
# Backward-compatible aliases (used by existing code & the /verify endpoint)
# ---------------------------------------------------------------------------
ENROLL_PASSAGE = PASSAGE_PHASE_1
VERIFY_PASSAGE = ENROLL_PASSAGE

PASSAGES = {
    "enroll": ENROLL_PASSAGE,
    "verify": VERIFY_PASSAGE,
}


# ---------------------------------------------------------------------------
# Digraph helpers
# ---------------------------------------------------------------------------
def top_digraphs(text: str, k: int = 8):
    """Return the k most frequent adjacent-letter pairs in a passage,
    in first-occurrence order (deterministic given a fixed passage)."""
    text = text.lower()
    seen = []
    counts = {}
    for i in range(len(text) - 1):
        a, b = text[i], text[i + 1]
        if a.isalpha() and b.isalpha():
            pair = a + b
            if pair not in counts:
                seen.append(pair)
            counts[pair] = counts.get(pair, 0) + 1
    ranked = sorted(seen, key=lambda p: -counts[p])
    return ranked[:k]


# Pre-compute digraphs for each phase
PHASE_DIGRAPHS = [top_digraphs(p, 8) for p in ENROLL_PASSAGES]

# Single shared digraph list for backward compatibility & verification
ENROLL_DIGRAPHS = PHASE_DIGRAPHS[0]
VERIFY_DIGRAPHS = ENROLL_DIGRAPHS


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def get_phase_for_sample(sample_number: int) -> int:
    """Return 0-based phase index for a given 1-based sample number.
    Samples beyond 20 cycle back through the phases."""
    if sample_number < 1:
        return 0
    return ((sample_number - 1) // SAMPLES_PER_PHASE) % len(ENROLL_PASSAGES)


def get_passage_for_sample(sample_number: int) -> dict:
    """Return passage text, digraphs, and phase metadata for a sample number.
    
    sample_number is 1-based (the *next* sample the user will type).
    """
    phase = get_phase_for_sample(sample_number)
    return {
        "phase": phase,
        "phase_number": phase + 1,
        "phase_label": PHASE_LABELS[phase],
        "text": ENROLL_PASSAGES[phase],
        "digraphs": PHASE_DIGRAPHS[phase],
        "samples_per_phase": SAMPLES_PER_PHASE,
        "total_phases": len(ENROLL_PASSAGES),
    }
