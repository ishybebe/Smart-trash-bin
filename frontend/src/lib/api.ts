export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Resolve the API host at request time.
 *
 * A configured localhost URL is rewritten to the page's own hostname so a
 * tablet opening the kiosk by LAN IP still reaches the Express server on that
 * machine. An explicit non-loopback URL is always respected.
 */
function resolveApiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');

  if (typeof window === 'undefined') {
    return configured || 'http://localhost:4000';
  }

  const { protocol, hostname } = window.location;

  if (!configured) {
    return `${protocol}//${hostname}:4000`;
  }

  try {
    const url = new URL(configured);

    if (!LOOPBACK_HOSTS.has(hostname) && LOOPBACK_HOSTS.has(url.hostname)) {
      url.hostname = hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // A malformed value should fail loudly at the request, not at import time.
  }

  return configured;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const { headers, signal, ...rest } = options;

  try {
    const res = await fetch(`${resolveApiBase()}${path}`, {
      ...rest,
      signal: signal ?? controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
    });

    return (await res.json()) as ApiResponse<T>;
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: aborted
          ? 'The server took too long to respond. Try again.'
          : 'Unable to reach the server.',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
