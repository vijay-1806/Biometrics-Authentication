"""
Fixed typing passages used for enrollment and verification.

Using fixed passages (rather than free text) keeps the feature vector
comparable across samples and makes digraph-level timing meaningful --
every sample contains the same letter pairs, so we can compare
apples-to-apples instead of guessing which digraphs happened to appear.
"""

ENROLL_PASSAGE = (
    "the quick brown fox jumps over the lazy dog while the "
    "early morning sun rises above the quiet green hills"
)

# IMPORTANT: verify uses the SAME passage as enroll, on purpose.
# The digraph features are tied to specific letter pairs (e.g. "th", "he")
# found in the enroll passage. If verify used a different passage, those
# digraph slots would come back empty/mismatched at verify time even for
# the genuine user -- which is exactly what was producing artificially low
# trust scores. A future version could support free-text verification by
# extracting whichever reference digraphs happen to appear, but for phase 1
# a shared passage keeps scoring correct and easy to reason about.
VERIFY_PASSAGE = ENROLL_PASSAGE

PASSAGES = {
    "enroll": ENROLL_PASSAGE,
    "verify": VERIFY_PASSAGE,
}


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


# Single shared digraph list -- since verify reuses the enroll passage,
# enroll and verify vectors now line up slot-for-slot, letter-pair-for-
# letter-pair, which is what makes the trust score comparison valid.
ENROLL_DIGRAPHS = top_digraphs(ENROLL_PASSAGE, 8)
VERIFY_DIGRAPHS = ENROLL_DIGRAPHS
