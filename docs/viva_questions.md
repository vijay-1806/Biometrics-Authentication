# Technical Viva Preparation & Exam Questions

## 1. Machine Learning & Behavioral Biometrics

### Q1: Why Isolation Forest instead of SVM or Neural Networks?
**Answer**: Isolation Forest is an unsupervised anomaly detection algorithm specifically suited for high-dimensional behavioral data with small per-user sample sizes. It isolates anomalies by randomly partitioning feature space rather than building complex decision boundaries, eliminating the need for multi-class impostor training datasets per student.

### Q2: How are behavioral keystroke features extracted?
**Answer**: The frontend `useBehaviorTracking` hook records raw keystroke events (`keydown`, `keyup`). It computes 20 numerical features per 5-second window: dwell time statistics (mean, std, median, min, max), flight time statistics, overall WPM, backspace frequency, and specific digraph latencies (TH, HE, IN, ER, AN, RE, ND, ON).

### Q3: What do FAR, FRR, and EER mean in behavioral authentication?
**Answer**:
- **FAR (False Acceptance Rate)**: Percentage of impostor attempts incorrectly accepted as genuine.
- **FRR (False Rejection Rate)**: Percentage of genuine attempts incorrectly rejected as impostors.
- **EER (Equal Error Rate)**: The point where FAR equals FRR (achieved ~5.5% in our evaluation).

### Q4: Why is decision threshold set to 40%?
**Answer**: The 40% threshold provides the optimal statistical tradeoff on our empirical evaluation dataset: 0% FRR (zero genuine student lockouts) while maintaining a low 10% FAR against impostor typing.

---

## 2. Session Isolation & Security Architecture

### Q5: How is session isolation guaranteed between different candidates?
**Answer**: Session isolation relies on composite key indexing (`studentId + assessmentSessionId`). Each active student session spawns an isolated `BehaviorSession` document in MongoDB.

### Q6: How does Socket.IO room isolation prevent cross-student telemetry leakage?
**Answer**: All real-time telemetry events (`live_score`, tab-switch counters, alerts) are emitted exclusively to the candidate's active session room namespace: `assessment-session:<assessmentSessionId>`. Teachers only receive live streams for candidates enrolled in their specific active session room.

### Q7: What happens when the FastAPI ML service is down (ML Degraded Mode)?
**Answer**: The Node.js backend handles ML service timeouts gracefully without crashing. It sets `degraded: true`, records ML status as `DEGRADED`, and displays `"NOT_EVALUATED"` (Trust Score: `UNAVAILABLE`) on the UI. Crucially, deterministic security telemetry (tab switches, paste operations) continues recording safely.

### Q8: What privacy protections exist for typed content?
**Answer**: Zero raw typed text, passwords, or clipboard strings are logged or stored. Only timing latencies (milliseconds) and numerical event counters are persisted.
