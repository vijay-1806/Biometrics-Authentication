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
  const pointerTypes = useRef(new Set()); // track pointer types used in window

  useEffect(() => {
    if (!user || !token) return;

    const handleEvent = (e) => {
      const eventData = {
        type: e.type,
        timestamp: Date.now(),
      };

      if (e.type === 'keydown' || e.type === 'keyup') {
        eventData.key = e.key;
      } else if (e.type === 'mousemove' || e.type === 'pointermove') {
        eventData.type = 'mousemove'; // normalize
        eventData.x = e.clientX;
        eventData.y = e.clientY;
        if (e.pointerType) pointerTypes.current.add(e.pointerType);
      } else if (e.type === 'visibilitychange') {
        eventData.hidden = document.hidden;
      }

      eventsBuffer.current.push(eventData);
    };

    // Throttle mousemove
    let lastMouseMove = 0;
    const throttledMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMouseMove > 100) { // 100ms throttle
        handleEvent(e);
        lastMouseMove = now;
      }
    };

    const handleClick = (e) => {
      handleEvent(e);
      if (e.pointerType) pointerTypes.current.add(e.pointerType);
    };

    window.addEventListener('keydown', handleEvent);
    window.addEventListener('keyup', handleEvent);
    // Use pointermove if supported, otherwise fallback to mousemove
    if (window.PointerEvent) {
      window.addEventListener('pointermove', throttledMouseMove);
    } else {
      window.addEventListener('mousemove', throttledMouseMove);
    }
    window.addEventListener('click', handleClick);

    const handlePaste = (e) => {
      // Ignore paste events on non-editor inputs (like entering 6-digit session PIN)
      if (e.target && (e.target.tagName === 'INPUT' || e.target.closest('.session-pin-input'))) {
        return;
      }

      const lastEvent = eventsBuffer.current[eventsBuffer.current.length - 1];
      const now = Date.now();
      // Deduplicate: avoid pushing double paste events within 300ms
      if (lastEvent && lastEvent.type === 'paste' && (now - lastEvent.timestamp < 300)) {
        return;
      }

      eventsBuffer.current.push({
        type: 'paste',
        timestamp: now,
        length: e.clipboardData?.getData('text')?.length || 50
      });
      // FIX: paste is a security-relevant event on its own -- don't wait
      // for 10 unrelated events to pile up before it gets sent (see the
      // sendWindow fix below for why this matters).
      setTimeout(() => sendWindow(), 50);
    };
    // Use capture phase (true) so Monaco Editor's internal event stopping doesn't miss paste events
    document.addEventListener('paste', handlePaste, true);

    // Tab-switch and window blur tracking with immediate transmission
    const handleTabBlur = (source = 'tab_switch') => {
      const lastEvent = eventsBuffer.current[eventsBuffer.current.length - 1];
      const now = Date.now();
      if (lastEvent && (lastEvent.type === 'visibilitychange' || lastEvent.type === 'blur') && (now - lastEvent.timestamp < 300)) {
        return;
      }
      eventsBuffer.current.push({
        type: 'visibilitychange',
        hidden: true,
        source: source,
        timestamp: now
      });
      // Force immediate send without event count throttling
      setTimeout(() => sendWindow(true), 10);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabBlur('visibilitychange');
      }
    };

    const handleWindowBlur = () => {
      handleTabBlur('blur');
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const sendWindow = async (force = false) => {
      // FIX: the old version cleared eventsBuffer.current = [] unconditionally,
      // then only sent if events.length > 10. That meant a lone tab-switch or
      // paste event -- pushed specifically to trigger an IMMEDIATE send via
      // the setTimeout calls above -- got wiped from the buffer without ever
      // being transmitted, because on its own it never reached the 10-event
      // threshold. That's why Tab Switches / Pastes stayed at 0x: the event
      // was captured client-side, then silently discarded before it ever
      // left the browser.
      //
      // Fix: only clear+skip if we're NOT forcing a send AND we're under
      // the threshold. A forced send (paste/tab-blur) always goes out,
      // regardless of how many events are buffered.
      const events = [...eventsBuffer.current];
      const hasSecurityEvent = events.some(
        ev => ev.type === 'paste' || (ev.type === 'visibilitychange' && ev.hidden)
      );

      if (!force && !hasSecurityEvent && events.length <= 10) {
        return; // not enough general activity to bother sending -- buffer stays intact for next tick
      }

      eventsBuffer.current = [];
      const startTime = windowStartTime.current;
      const endTime = Date.now();
      windowStartTime.current = endTime;

      if (events.length === 0) return;

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

        await axios.post(
          endpoint,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (error) {
        console.error('Behavior telemetry failed:', error);
      }
    };

    windowTimer.current = setInterval(() => sendWindow(false), 5000);

    return () => {
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('keyup', handleEvent);
      if (window.PointerEvent) {
        window.removeEventListener('pointermove', throttledMouseMove);
      } else {
        window.removeEventListener('mousemove', throttledMouseMove);
      }
      window.removeEventListener('click', handleClick);
      window.removeEventListener('blur', handleTabBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('paste', handlePaste, true);
      if (windowTimer.current) {
        clearInterval(windowTimer.current);
      }
    };
  }, [user, token, context, examId]);
};

export default useBehaviorTracking;
