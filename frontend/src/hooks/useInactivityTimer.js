// frontend/src/hooks/useInactivityTimer.js
import { useEffect, useRef } from 'react';

const INACTIVITY_DELAY = 4 * 60 * 60 * 1000; 

export function useInactivityTimer(onInactivity, resetOnActivity = true) {
  const timerRef = useRef(null);
  const onInactivityRef = useRef(onInactivity);

  // Garder une référence à la fonction callback
  useEffect(() => {
    onInactivityRef.current = onInactivity;
  }, [onInactivity]);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onInactivityRef.current();
    }, INACTIVITY_DELAY);
  };

  useEffect(() => {
    resetTimer();

    if (resetOnActivity) {
      const events = ['mousedown', 'keydown', 'scroll', 'click', 'mousemove'];
      events.forEach(event => {
        window.addEventListener(event, resetTimer);
      });

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, resetTimer);
        });
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [resetOnActivity]);

  return resetTimer;
}