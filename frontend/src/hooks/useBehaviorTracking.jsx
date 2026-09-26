import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { startBiometricExamSession, stopBiometricExamSession, fetchBiometricStatus } from '../services/bioAuth';

export const useBehaviorTracking = (context = 'general', examId = null) => {
  const { user, token } = useAuth();
  const toastTimer = useRef(null);

  useEffect(() => {
    if (!user || !token) return;

    const isExam = context === 'exam' || context === 'quiz' || Boolean(examId);
    if (!isExam) return;

    // Toast banner to warn students on violations during exams
    const showWarningToast = (message) => {
      const toastId = 'behavior-violation-toast';
      let toast = document.getElementById(toastId);
      if (!toast) {
        toast = document.createElement('div');
        toast.id = toastId;
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = '#881337'; // Rose 900
        toast.style.color = '#ffe4e6'; // Rose 100
        toast.style.border = '1px solid #f43f5e';
        toast.style.padding = '10px 22px';
        toast.style.borderRadius = '10px';
        toast.style.fontSize = '13px';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '99999';
        toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '8px';
        toast.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(toast);
      }
      toast.innerHTML = `<span style="font-size: 16px;">⚠️</span> <span>${message}</span>`;
      toast.style.opacity = '1';
      toast.style.pointerEvents = 'auto';

      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.pointerEvents = 'none';
        }
      }, 3500);
    };

    // Forward telemetry & results to LMS proctoring backend so the teacher dashboard updates
    const syncWithProctor = async (payload) => {
      try {
        await axios.post(
          '/api/behavior/score',
          {
            examId,
            studentId: user._id,
            events: payload.events || [],
            ...payload
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (err) {
        // Non-blocking for students
        console.warn('[BioAuth LMS Sync] Sync error:', err.message);
      }
    };

    // Initialize Universal Client SDK (Approach A)
    let isMounted = true;

    // Immediately sync student's authentic model baseline (e.g. 'full') to proctor control room
    fetchBiometricStatus(user._id).then(status => {
      if (!isMounted) return;
      syncWithProctor({
        modelState: status?.state || 'ready',
        events: []
      });
    }).catch(() => {});

    startBiometricExamSession(user._id, {
      examId: examId || 'exam_' + Date.now(),
      intervalMs: 5000,
      onScore: (scoreData) => {
        if (!isMounted) return;
        console.log('[BioAuth SDK] Live verification result:', scoreData);

        if (scoreData.action === 'deny' || scoreData.risk_level === 'high') {
          showWarningToast('Biometric Rhythm Anomaly: Unrecognized typing dynamics detected.');
        }

        // Notify teacher proctor dashboard
        syncWithProctor({
          mockTime: Date.now(),
          scoreData,
          events: [{ type: 'keydown', key: 'x', timestamp: Date.now() }, { type: 'keyup', key: 'x', timestamp: Date.now() }]
        });
      },
      onViolation: (violation) => {
        if (!isMounted) return;
        console.warn('[BioAuth SDK] Security flag:', violation);

        let msg = 'Exam Rule Violation Detected';
        let alertType = 'rule_violation';
        let fakeEvents = [];

        if (violation.type === 'tab_switch') {
          msg = 'Tab or Window Switch Detected! This event is logged by proctor.';
          alertType = 'tab_switch';
          fakeEvents = [{ type: 'visibilitychange', hidden: true, timestamp: Date.now() }];
        } else if (violation.type === 'paste_detected') {
          msg = `Paste Detected (${violation.length || 0} chars)! Pasting is monitored.`;
          alertType = 'paste_detected';
          fakeEvents = [{ type: 'paste', length: violation.length || 1, timestamp: Date.now() }];
        } else if (violation.type === 'copy_detected') {
          msg = `Copy Detected (${violation.length || 0} chars)! Copying is monitored.`;
          alertType = 'copy_detected';
          fakeEvents = [{ type: 'copy', length: violation.length || 1, timestamp: Date.now() }];
        } else if (violation.type === 'biometric_anomaly') {
          msg = 'Biometric Deviation: Keystroke cadence deviated from authentic profile.';
        }

        showWarningToast(msg);

        // Notify teacher proctor dashboard immediately
        if (fakeEvents.length > 0) {
          syncWithProctor({
            events: fakeEvents
          });
        }
      }
    }).catch(err => console.error('[BioAuth SDK] Failed to start exam session:', err));

    return () => {
      isMounted = false;
      stopBiometricExamSession();

      if (toastTimer.current) clearTimeout(toastTimer.current);
      const toast = document.getElementById('behavior-violation-toast');
      if (toast) toast.remove();
    };
  }, [user, token, context, examId]);
};

export default useBehaviorTracking;
