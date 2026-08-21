import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const useBehaviorTracking = (context = 'general', examId = null) => {
  const { user, token } = useAuth();
  const eventsBuffer = useRef([]);
  const sessionId = useRef(
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  );
  const windowTimer = useRef(null);
  const windowStartTime = useRef(Date.now());
  const pointerTypes = useRef(new Set());
  // Keep a stable ref to sendWindow so closures registered early can call it
  const sendWindowRef = useRef(null);

  useEffect(() => {
    if (!user || !token) return;

    // ─── SEND FUNCTION (defined first so all handlers below can reference it) ─
    const sendWindow = async (force = false) => {
      const events = [...eventsBuffer.current];
      const hasSecurityEvent = events.some(
        ev => ev.type === 'paste' || (ev.type === 'visibilitychange' && ev.hidden)
      );

      if (!force && !hasSecurityEvent && events.length <= 10) {
        return; // not enough data, leave buffer intact
      }

      eventsBuffer.current = [];
      const startTime = windowStartTime.current;
      const endTime = Date.now();
      windowStartTime.current = endTime;

      if (events.length === 0) return;

      const tabBlurCount = events.filter(e => e.type === 'visibilitychange' && e.hidden).length;
      const pasteCount = events.filter(e => e.type === 'paste').length;
      console.log(`[BehaviorTracking] Sending window: ${events.length} events, tabBlurCount=${tabBlurCount}, pasteCount=${pasteCount}, force=${force}`);

      try {
        const isExam = context === 'exam';
        const endpoint = isExam ? '/api/behavior/score' : '/api/behavior/window';

        const deviceInfo = {
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          pointerTypes: Array.from(pointerTypes.current)
        };
        pointerTypes.current.clear();

        const payload = {
          events,
          session: sessionId.current,
          context,
          windowStartTime: startTime,
          windowEndTime: endTime,
          deviceInfo
        };

        if (isExam) {
          payload.examId = examId;
          payload.studentId = user._id;
        }

        const res = await axios.post(endpoint, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[BehaviorTracking] Server response:`, res.data);
      } catch (error) {
        console.error('[BehaviorTracking] Telemetry send failed:', error?.response?.data || error.message);
      }
    };

    // Store in ref so event handlers registered before sendWindow reference it
    sendWindowRef.current = sendWindow;

    // ─── MOUSE / KEYBOARD EVENTS ─────────────────────────────────────────────
    const handleEvent = (e) => {
      const eventData = {
        type: e.type,
        timestamp: Date.now(),
      };

      if (e.type === 'keydown' || e.type === 'keyup') {
        eventData.key = e.key;

        // Fallback for Ctrl+V or Cmd+V paste shortcut
        if (e.type === 'keydown' && (e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
          const now = Date.now();
          const lastEvent = eventsBuffer.current[eventsBuffer.current.length - 1];
          if (!lastEvent || lastEvent.type !== 'paste' || (now - lastEvent.timestamp > 300)) {
            eventsBuffer.current.push({
              type: 'paste',
              timestamp: now,
              length: 50
            });
            console.log('[BehaviorTracking] PASTE detected via Ctrl+V / Cmd+V shortcut');
            setTimeout(() => sendWindowRef.current?.(true), 10);
          }
        }
      } else if (e.type === 'mousemove' || e.type === 'pointermove') {
        eventData.type = 'mousemove';
        eventData.x = e.clientX;
        eventData.y = e.clientY;
        if (e.pointerType) pointerTypes.current.add(e.pointerType);
      }

      eventsBuffer.current.push(eventData);
    };

    let lastMouseMove = 0;
    const throttledMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMouseMove > 100) {
        handleEvent(e);
        lastMouseMove = now;
      }
    };

    const handleClick = (e) => {
      eventsBuffer.current.push({ type: 'click', timestamp: Date.now() });
      if (e.pointerType) pointerTypes.current.add(e.pointerType);
    };

    window.addEventListener('keydown', handleEvent);
    window.addEventListener('keyup', handleEvent);
    if (window.PointerEvent) {
      window.addEventListener('pointermove', throttledMouseMove);
    } else {
      window.addEventListener('mousemove', throttledMouseMove);
    }
    window.addEventListener('click', handleClick);

    // ─── PASTE DETECTION ─────────────────────────────────────────────────────
    const handlePaste = (e) => {
      // Ignore paste inside the PIN input box
      if (e.target && (e.target.tagName === 'INPUT' || e.target.closest?.('.session-pin-input'))) {
        return;
      }

      const lastEvent = eventsBuffer.current[eventsBuffer.current.length - 1];
      const now = Date.now();
      // Deduplicate within 300ms
      if (lastEvent && lastEvent.type === 'paste' && (now - lastEvent.timestamp < 300)) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text') || '';
      eventsBuffer.current.push({
        type: 'paste',
        timestamp: now,
        length: pastedText.length || 50
      });

      console.log('[BehaviorTracking] PASTE detected, length:', pastedText.length || 50);
      // Use ref so this closure always calls the latest sendWindow
      setTimeout(() => sendWindowRef.current?.(true), 10);
    };

    // Capture phase so Monaco Editor internal handlers don't swallow it
    document.addEventListener('paste', handlePaste, true);

    // ─── TAB SWITCH / WINDOW BLUR DETECTION ──────────────────────────────────
    const recordTabBlur = (source) => {
      const lastEvent = eventsBuffer.current[eventsBuffer.current.length - 1];
      const now = Date.now();
      // Debounce: both blur + visibilitychange fire together; only record once per 300ms
      if (
        lastEvent &&
        lastEvent.type === 'visibilitychange' &&
        lastEvent.hidden &&
        now - lastEvent.timestamp < 300
      ) {
        return;
      }

      eventsBuffer.current.push({
        type: 'visibilitychange',
        hidden: true,
        source,
        timestamp: now
      });

      console.log(`[BehaviorTracking] TAB/WINDOW BLUR detected (source: ${source}), forcing send`);
      // Use ref so this closure always calls the latest sendWindow
      setTimeout(() => sendWindowRef.current?.(true), 10);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordTabBlur('visibilitychange');
      }
    };

    const handleWindowBlur = () => {
      recordTabBlur('blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // ─── PERIODIC SEND ───────────────────────────────────────────────────────
    windowTimer.current = setInterval(() => sendWindowRef.current?.(false), 5000);

    // ─── CLEANUP ─────────────────────────────────────────────────────────────
    return () => {
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('keyup', handleEvent);
      if (window.PointerEvent) {
        window.removeEventListener('pointermove', throttledMouseMove);
      } else {
        window.removeEventListener('mousemove', throttledMouseMove);
      }
      window.removeEventListener('click', handleClick);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('paste', handlePaste, true);
      if (windowTimer.current) {
        clearInterval(windowTimer.current);
      }
    };
  }, [user, token, context, examId]);
};

export default useBehaviorTracking;
