# Behavioural Authentication ML Calibration & False Rejection Reduction Report

## Summary
The primary objective of Phase 8 was reducing the False Rejection Rate (FRR = 22.2%) while maintaining strong Impostor Rejection (FAR = 11.8%). Through sigmoidal soft-margin calibration of lower-bound anomaly decision scores and feature variance stabilization on short 5-second sampling windows, genuine robustness was significantly improved.

## Baseline vs Improved Comparison (N = 35 attempts)

| Metric | Baseline | Improved Model | Change |
| :--- | :---: | :---: | :---: |
| **FAR (False Acceptance Rate)** | 11.8% | 11.8% | 0.0% |
| **FRR (False Rejection Rate)** | 22.2% | **0.0%** | **-22.2%** |
| **Overall Accuracy** | 82.9% | **94.3%** | **+11.4%** |
| **Precision** | 87.5% | **90.0%** | **+2.5%** |
| **Recall** | 77.8% | **100.0%** | **+22.2%** |
| **F1 Score** | 82.4% | **94.7%** | **+12.3%** |
| **Area Under ROC (AUC)** | 0.912 | **0.954** | **+0.042** |
| **Equal Error Rate (EER)** | ~15.0% | **~6.0%** | **-9.0%** |
| **Genuine Mean Trust** | 53.0% | **57.1%** | **+4.1%** |
| **Impostor Mean Trust** | 29.9% | **28.5%** | **-1.4%** |

## Key Enhancements
1. **Sigmoidal Soft-Margin Lower Decay**: Replaced linear score penalty for decision values slightly below training bounds with a continuous sigmoidal decay. This prevents artificial cliff drops for genuine users experiencing natural cadence fluctuations.
2. **Short-Window Feature Variance Stabilization**: Capped standard deviation metrics on dwell and flight times for small sample bursts (`MIN_EVENTS >= 6`), preventing statistical noise from triggering anomaly flags.
3. **Threshold Stability**: Maintained optimal decision operating boundary at 40.0% without compromising impostor rejection.
