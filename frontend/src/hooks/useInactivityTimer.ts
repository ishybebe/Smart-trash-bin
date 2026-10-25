'use client';

import { useEffect } from 'react';

export function useInactivityTimer({
  enabled,
  timeoutMs,
  onTimeout,
}: {
  enabled: boolean;
  timeoutMs: number;
  onTimeout: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    let timer = window.setTimeout(onTimeout, timeoutMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onTimeout, timeoutMs);
    };
    const events = ['touchstart', 'mousemove', 'keydown', 'click'];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [enabled, onTimeout, timeoutMs]);
}
