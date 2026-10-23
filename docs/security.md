# Security Architecture & Privacy Audit

## Security Controls
- **Session PIN & Access**: Assessment URLs protected behind PIN verification and role-based checks.
- **Identity Isolation**: `studentId` derived strictly from verified JWT tokens (`req.user._id`).
- **Room Isolation**: Socket broadcasts strictly scoped to `assessment-session:<assessmentSessionId>`.
- **Counter Isolation**: Tab switches and paste operations scoped per `{ student, assessmentSessionId }` composite key.

## Privacy Verification
- **Zero Raw Input Storage**: Passwords, raw keystrokes, and text inputs are never stored or logged in telemetry.
- **Metrics Only**: Telemetry records statistical dwell/flight times and counters.
