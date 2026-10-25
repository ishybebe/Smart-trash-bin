export const ADMIN_TOKEN_KEY = 'admin_token';
export const TESTING_SESSION_KEY = 'admin_test_session_id';

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.sessionStorage.removeItem(TESTING_SESSION_KEY);
}

export function readAdminExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const decoded = JSON.parse(window.atob(padded)) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAuthFailure(response: {
  success: boolean;
  error?: { code: string };
}): boolean {
  if (response.success) return false;
  const code = response.error?.code;
  return (
    code === 'UNAUTHORIZED' ||
    code === 'FORBIDDEN' ||
    code === 'INVALID_TOKEN' ||
    code === 'ACCOUNT_DISABLED'
  );
}
