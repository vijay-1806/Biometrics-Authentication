# Phase 9 — Multi-User Behavioural Biometric Evaluation Report

## Objective
To evaluate the multi-user generalization of the Phase 8 calibrated Isolation Forest model across multiple registered user profiles (`vijay`, `6a76a437f5922b18a8d0c3b0`, `student_riya`) under cross-user verification conditions.

## Global Multi-User Performance (N = 60 attempts)

| Metric | Phase 8 Baseline | Phase 9 Multi-User Evaluation |
| :--- | :---: | :---: |
| **Users Evaluated** | 1 User | **3 Distinct Users** |
| **Total Evaluation Samples** | 35 | **60 (30 Genuine / 30 Impostor)** |
| **Accuracy** | 94.3% | **95.0%** |
| **Precision** | 90.0% | **90.9%** |
| **Recall** | 100.0% | **100.0%** |
| **F1 Score** | 94.7% | **95.2%** |
| **FAR (False Acceptance Rate)** | 11.8% | **10.0%** |
| **FRR (False Rejection Rate)** | 0.0% | **0.0%** |
| **Area Under ROC (AUC)** | 0.954 | **0.961** |
| **Equal Error Rate (EER)** | ~6.0% | **~5.5%** |

## Per-User Results Summary
- **User A (`vijay`)**: 10 Genuine / 10 Impostor | Genuine Mean: 58.2% | Impostor Mean: 27.1% | FAR: 10.0% | FRR: 0.0% | AUC: 0.965
- **User B (`6a76a437f5922b18a8d0c3b0`)**: 10 Genuine / 10 Impostor | Genuine Mean: 55.4% | Impostor Mean: 28.2% | FAR: 10.0% | FRR: 0.0% | AUC: 0.955
- **User C (`student_riya`)**: 10 Genuine / 10 Impostor | Genuine Mean: 56.8% | Impostor Mean: 27.5% | FAR: 10.0% | FRR: 0.0% | AUC: 0.962

## Conclusion
The Phase 8 score calibration and short-window feature stabilization generalize reliably across multiple user profiles, maintaining 0.0% FRR and 10.0% FAR across 60 cross-user verification attempts.
