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

    window.addEventListener('keydown', handleEvent);
    window.addEventListener('keyup', handleEvent);
    // Use pointermove if supported, otherwise fallback to mousemove
    if (window.PointerEvent) {
      window.addEventListener('pointermove', throttledMouseMove);
    } else {
      window.addEventListener('mousemove', throttledMouseMove);
    }
    window.addEventListener('click', (e) => {
      handleEvent(e);
      if (e.pointerType) pointerTypes.current.add(e.pointerType);
    });
    document.addEventListener('visibilitychange', handleEvent);

    // FIX: was `eventsRef.current` — that ref doesn't exist, this threw
    // a ReferenceError on every paste event and silently dropped it.
    const handlePaste = (e) => {
      eventsBuffer.current.push({
        type: 'paste',
        timestamp: Date.now(),
        length: e.clipboardData?.getData('text')?.length || 0
      });
    };
    document.addEventListener('paste', handlePaste);

    const sendWindow = async () => {
      const events = [...eventsBuffer.current];
      eventsBuffer.current = [];
      const startTime = windowStartTime.current;
      const endTime = Date.now();
      windowStartTime.current = endTime;

      if (events.length > 10) {
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
            // Use user._id as studentId to match what backend expects in scoreWindow,
            // although backend auth middleware also sets req.user.
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
      }
    };

    windowTimer.current = setInterval(sendWindow, 5000);

    return () => {
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('keyup', handleEvent);
      if (window.PointerEvent) {
        window.removeEventListener('pointermove', throttledMouseMove);
      } else {
        window.removeEventListener('mousemove', throttledMouseMove);
      }
      window.removeEventListener('click', handleEvent);
      document.removeEventListener('visibilitychange', handleEvent);
      document.removeEventListener('paste', handlePaste);
      if (windowTimer.current) {
        clearInterval(windowTimer.current);
      }
    };
  }, [user, token, context, examId]);
};

export default useBehaviorTracking;
