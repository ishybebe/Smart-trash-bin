'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { api } from '@/lib/api';
import { ADMIN_TOKEN_KEY } from '@/lib/adminSession';

interface LoginResponse {
  token: string;
  username: string;
  role?: string;
}

const STATION_FACTS = [
  { label: 'Station', value: '01' },
  { label: 'Session', value: '10 min' },
  { label: 'Access', value: 'Restricted' },
];

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    const res = await api<LoginResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setSubmitting(false);

    if (res.success && res.data) {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token);
      router.replace('/admin');
      return;
    }

    setError(res.error?.message || 'Invalid username or password.');
  }

  return (
    <div className="grid min-h-dvh bg-paper text-ink lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="flex flex-col justify-between bg-ink px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <div>
          <div className="flex items-center gap-4">
            <BrandMark
              size={64}
              variant="white"
              priority
              alt="Smart Trash Bin"
            />
            <div>
              <p className="font-display text-lg font-extrabold uppercase tracking-[-0.01em]">
                Smart Trash Bin
              </p>
              <p className="mt-1 font-data text-[10px] uppercase tracking-[0.22em] text-white/50">
                Rice Vendo
              </p>
            </div>
          </div>

          <p className="mt-10 font-data text-[10px] uppercase tracking-[0.24em] text-white/50 sm:mt-14">
            Operator console
          </p>
          <h1 className="mt-3 max-w-md font-display text-3xl font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Station telemetry, stock, and recovery.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
            Watch intake, manage rice inventory, and open the sandbox testing
            kiosk. Every action here is privileged and audited.
          </p>
        </div>

        <div className="mt-10 border-t border-white/20 pt-5">
          <dl className="grid grid-cols-3 gap-3">
            {STATION_FACTS.map((fact) => (
              <div key={fact.label}>
                <dt className="font-data text-[10px] uppercase tracking-[0.16em] text-white/40">
                  {fact.label}
                </dt>
                <dd className="mt-1 font-data text-xs uppercase tracking-[0.14em] text-white">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 font-data text-[10px] uppercase tracking-[0.14em] text-white/40">
            Smart Trash Bin / Rice Vendo · Restricted access
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12 lg:py-16">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-4">
            <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
              Admin access
            </p>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-intake" />
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
                Secure session
              </span>
            </span>
          </div>

          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.02em] text-ink">
            Sign in
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Use the station operator credentials to open the dashboard. The
            session closes after ten minutes of inactivity.
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-8 border border-rule bg-paper p-5 sm:p-7"
          >
            {error && (
              <div
                role="alert"
                className="mb-5 border-l-2 border-fault bg-fault/5 px-3 py-2 text-sm leading-relaxed text-fault"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="admin-username"
                className="font-data text-[10px] uppercase tracking-[0.16em] text-muted"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="h-12 w-full border border-rule bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-ink"
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <label
                htmlFor="admin-password"
                className="font-data text-[10px] uppercase tracking-[0.16em] text-muted"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="h-12 w-full border border-rule bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-ink"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-7 flex h-14 w-full touch-manipulation items-center justify-center bg-ink font-display text-sm font-semibold text-white transition-colors hover:bg-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-wait disabled:bg-zinc-400"
            >
              {submitting ? 'Signing in' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/kiosk"
              className="flex h-10 items-center gap-2 border border-rule px-3 font-data text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-ink hover:text-ink"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="square"
              >
                <path d="M20 12H5" />
                <path d="m11 18-6-6 6-6" />
              </svg>
              Return to kiosk
            </Link>
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
              Station 01
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
