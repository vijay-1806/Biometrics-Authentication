"""
Turns raw keydown/keyup events into a fixed-length numeric feature vector.

Event format expected from the frontend, one dict per event:
    {"key": "a", "type": "down" | "up", "t": 1234.5}   # t in milliseconds,
                                                         # relative to sample start

Vector layout (all floats):
    [0] mean dwell time      (ms)
    [1] std  dwell time      (ms)
    [2] mean flight time     (ms)
    [3] std  flight time     (ms)
    [4] typing speed         (WPM)
    [5] backspace rate       (fraction of keystrokes)
    [6:6+K] mean latency for each reference digraph (ms), 0 if absent

Every sample for a given passage produces a vector of the same length,
so the model always sees comparable input regardless of exactly how
fast or slow the person typed.
"""

import numpy as np

MIN_EVENTS = 6  # guard against near-empty samples


def _pair_up(events):
    """Match each key-down with its corresponding key-up (per key, FIFO),
    and return (down_events_in_order, dwell_times)."""
    downs_pending = {}
    dwells = []
    down_sequence = []  # (key, down_t) in the order keys were pressed

    for ev in events:
        key = ev["key"]
        if ev["type"] == "down":
            downs_pending.setdefault(key, []).append(ev["t"])
            down_sequence.append((key, ev["t"]))
        elif ev["type"] == "up":
            pending = downs_pending.get(key)
            if pending:
                down_t = pending.pop(0)
                dwells.append(ev["t"] - down_t)

    return down_sequence, dwells


def extract_features(events, reference_digraphs):
    """
    events: list of raw keystroke events (see module docstring)
    reference_digraphs: fixed list of 2-letter strings, e.g. ["th", "he", ...]
                         -- comes from passages.py, same list for every
                         sample of a given passage.
    """
    if len(events) < MIN_EVENTS:
        raise ValueError(
            f"Sample too short ({len(events)} events) — need at least {MIN_EVENTS}. "
            "The person likely stopped typing early or the passage was skipped."
        )

    events = sorted(events, key=lambda e: e["t"])
    down_sequence, dwells = _pair_up(events)

    if len(down_sequence) < 2:
        raise ValueError("Not enough key-down events to compute timing features.")

    # --- flight time: gap between releasing one key and pressing the next ---
    flights = []
    ups_by_order = [e["t"] for e in events if e["type"] == "up"]
    downs_only = [(k, t) for k, t in down_sequence]
    for i in range(1, len(downs_only)):
        prev_key, prev_down_t = downs_only[i - 1]
        cur_key, cur_down_t = downs_only[i]
        # approximate flight as gap between consecutive key-down times
        # minus nothing extra -- simplest robust proxy across browsers
        gap = cur_down_t - prev_down_t
        if 0 <= gap <= 1000:  # Filter out inter-burst thinking pauses (>1000ms)
            flights.append(gap)

    # --- backspace rate ---
    total_keys = len(down_sequence)
    backspaces = sum(1 for k, _ in down_sequence if k.lower() == "backspace")
    backspace_rate = backspaces / total_keys if total_keys else 0.0

    # --- typing speed (WPM), based on active typing time (excluding thinking pauses) ---
    active_typing_ms = sum(flights) if flights else max(1.0, down_sequence[-1][1] - down_sequence[0][1])
    active_typing_min = max(active_typing_ms / 60000.0, 1e-4)
    printable_chars = sum(
        1 for k, _ in down_sequence if len(k) == 1 or k.lower() == "space"
    )
    wpm = (printable_chars / 5.0) / active_typing_min

    # --- digraph latencies: down(n) -> down(n+1) for specific letter pairs ---
    digraph_latencies = {d: [] for d in reference_digraphs}
    for i in range(1, len(downs_only)):
        prev_key, prev_t = downs_only[i - 1]
        cur_key, cur_t = downs_only[i]
        pair = (prev_key + cur_key).lower()
        if pair in digraph_latencies:
            digraph_latencies[pair].append(cur_t - prev_t)

    # Apply robust variance stabilization for short sample windows
    dwell_std = float(np.std(dwells)) if dwells and len(dwells) > 1 else 0.0
    flight_std = float(np.std(flights)) if flights and len(flights) > 1 else 0.0

    vector = [
        float(np.mean(dwells)) if dwells else 0.0,
        min(dwell_std, 300.0),  # robust upper cap on dwell variance
        float(np.mean(flights)) if flights else 0.0,
        min(flight_std, 500.0), # robust upper cap on flight variance
        float(wpm),
        float(backspace_rate),
    ]
    mean_flight = float(np.mean(flights)) if flights else 0.0
    for d in reference_digraphs:
        vals = digraph_latencies[d]
        vector.append(float(np.mean(vals)) if vals and len(vals) > 0 else mean_flight)

    return np.array(vector, dtype=float)


FEATURE_NAMES_BASE = [
    "mean_dwell_ms",
    "std_dwell_ms",
    "mean_flight_ms",
    "std_flight_ms",
    "wpm",
    "backspace_rate",
]


def feature_names(reference_digraphs):
    return FEATURE_NAMES_BASE + [f"digraph_{d}_ms" for d in reference_digraphs]
