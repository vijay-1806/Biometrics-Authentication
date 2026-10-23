# Behavioural Authentication Subsystem

## Overview
The LMS implements per-user Isolation Forest behavioral biometric models to continuously authenticate candidate typing dynamics.

## Feature Extraction (20 Vectors)
- Dwell times (mean, std, median, min, max)
- Flight times (mean, std, median, min, max)
- Typing speed (WPM)
- Backspace frequency
- Digraph latencies (TH, HE, IN, ER, AN, RE, ND, ON)

## Sigmoidal Soft-Margin Calibration
Trust scores are computed using smooth sigmoidal decay to eliminate false rejection cliffs for genuine users while preserving impostor rejection:
`TrustScore = 100 / (1 + exp(-k * (score - threshold)))`

## ML Service Degraded Mode
When FastAPI is unreachable, the system enters `DEGRADED` status. ML scores report `NOT_EVALUATED` while deterministic security telemetry (tab switches, paste events) continues recording safely.
