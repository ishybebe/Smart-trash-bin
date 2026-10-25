'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ADMIN_TOKEN_KEY,
  clearAdminSession,
  isAuthFailure,
  readAdminExpiry,
} from '@/lib/adminSession';

const IDLE_BEFORE_WARNING_MS = 7 * 60 * 1000;
const WARNING_DURATION_MS = 3 * 60 * 1000;
const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

interface RefreshResponse {
  token: string;
}

export function useAdminInactivityLogout() {
  const router = useRouter();
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);
  const activityRef = useRef<() => void>(() => {});

  const stayActive = useCallback(() => {
    activityRef.current();
  }, []);

  useEffect(() => {
    const initialToken = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!initialToken) return;

    let idleTimer: number | null = null;
    let warningInterval: number | null = null;
    let lastRefreshAt = 0;
    let refreshing = false;
    let ended = false;

    function clearIdleTimer() {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
    }

    function clearWarning() {
      if (warningInterval !== null) {
        window.clearInterval(warningInterval);
        warningInterval = null;
      }
      setWarningSeconds(null);
    }

    function endSession() {
      if (ended) return;
      ended = true;
      clearIdleTimer();
      clearWarning();
      clearAdminSession();
      router.replace('/admin/login');
    }

    function startWarning() {
      if (ended) return;

      const deadline = Date.now() + WARNING_DURATION_MS;
      setWarningSeconds(Math.ceil(WARNING_DURATION_MS / 1000));

      warningInterval = window.setInterval(() => {
        const remaining = Math.max(0, deadline - Date.now());
        setWarningSeconds(Math.ceil(remaining / 1000));
        if (remaining <= 0) endSession();
      }, 1000);
    }

    function resetIdleTimer() {
      clearIdleTimer();
      if (ended) return;
      idleTimer = window.setTimeout(startWarning, IDLE_BEFORE_WARNING_MS);
    }

    async function refreshToken(token: string) {
      if (refreshing) return;
      refreshing = true;
      lastRefreshAt = Date.now();

      const res = await api<RefreshResponse>('/api/admin/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      refreshing = false;
      if (ended) return;

      if (res.success && res.data?.token) {
        if (!window.localStorage.getItem(ADMIN_TOKEN_KEY)) {
          endSession();
          return;
        }
        window.localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token);
        lastRefreshAt = Date.now();
        return;
      }

      if (isAuthFailure(res)) endSession();
    }

    function handleActivity() {
      if (ended) return;

      const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) {
        endSession();
        return;
      }

      const expiry = readAdminExpiry(token);
      if (expiry !== null && expiry <= Date.now()) {
        endSession();
        return;
      }

      if (warningInterval !== null) clearWarning();
      resetIdleTimer();

      if (!refreshing && Date.now() - lastRefreshAt >= TOKEN_REFRESH_INTERVAL_MS) {
        void refreshToken(token);
      }
    }

    activityRef.current = handleActivity;

    const expiry = readAdminExpiry(initialToken);
    if (expiry !== null && expiry <= Date.now()) {
      endSession();
      return;
    }

    resetIdleTimer();

    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'];
    events.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );

    return () => {
      ended = true;
      clearIdleTimer();
      if (warningInterval !== null) {
        window.clearInterval(warningInterval);
      }
      activityRef.current = () => {};
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
    };
  }, [router]);

  return { warningSeconds, stayActive };
}
