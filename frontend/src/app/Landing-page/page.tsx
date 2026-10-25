'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { api } from '@/lib/api';

interface StatusData {
  rice_pricing?: Array<{ pack_size: string; points_price: number; is_active: boolean }>;
  accepted_materials?: Array<{ code: string; label: string; points: number }>;
}

export default function LandingPage() {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<StatusData>('/api/status').then((response) => {
      if (!cancelled && response.success && response.data) setStatus(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activePricing = status?.rice_pricing?.find((price) => price.is_active) ?? status?.rice_pricing?.[0];
  const acceptedItems = status?.accepted_materials ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-rule px-6 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandMark size={44} priority />
          <span className="font-display text-lg font-extrabold uppercase tracking-[-0.01em] text-ink">
            Smart Trash Bin
          </span>
          <span aria-hidden className="h-4 w-px bg-rule" />
          <span className="font-data text-[10px] uppercase tracking-[0.22em] text-muted">
            Rice Vendo
          </span>
        </div>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
          Recycling station / 01
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-16">
        <section className="flex flex-col justify-center">
          <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
            Recycling station
          </p>

          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.92] tracking-[-0.03em] text-ink sm:text-6xl xl:text-7xl">
            Deposit.
            <br />
            Earn points.
            <br />
            Take home rice.
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Place an accepted item in the chute. The camera verifies it and
            posts points to your session. Choose a 1/8, 1/4, or 1/2 kg pack;
            the terminal shows the current point price.
          </p>

          <Link
            href="/kiosk"
            className="group mt-10 flex h-16 w-full max-w-md items-center justify-between bg-ink px-6 text-white transition-colors hover:bg-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <span className="font-display text-lg font-bold">
              Start depositing
            </span>
            <span className="flex items-center gap-3">
              <span className="font-data text-[10px] uppercase tracking-[0.16em] text-white/60">
                Enter terminal
              </span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="square"
              >
                <path d="M4 12h15" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </span>
          </Link>

          <p className="mt-4 font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            Session-based / no account required
          </p>
        </section>

        <section className="flex flex-col">
          <div className="bg-ink px-6 py-6 text-white">
            <div className="flex items-baseline justify-between">
              <p className="font-data text-[10px] uppercase tracking-[0.24em] text-white/50">
                Rice vendo
              </p>
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-white/50">
                 {activePricing ? `Live rate / ${activePricing.pack_size} kg` : 'Loading rate'}
              </p>
            </div>

            <div className="mt-5 flex items-end gap-4">
              <span className="font-display text-6xl font-extrabold leading-none tabular-nums">
                 {activePricing?.points_price ?? '—'}
              </span>
              <div className="mb-1">
                <p className="font-data text-[10px] uppercase tracking-[0.16em] text-white/50">
                  points
                </p>
                <p className="font-display text-xl font-semibold">
                   = 1 pack
                </p>
              </div>
            </div>

            <p className="mt-5 border-t border-white/20 pt-4 text-sm leading-relaxed text-white/70">
               {activePricing
                 ? 'Current rate from the station configuration. The terminal confirms the price before you redeem.'
                 : 'Reading the current rate from the station configuration.'}
            </p>
          </div>

          <div className="border border-t-0 border-rule bg-paper">
            <div className="flex items-baseline justify-between border-b border-ink px-4 py-3">
              <h2 className="font-data text-[10px] uppercase tracking-[0.24em] text-ink">
                Accepted items
              </h2>
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
                Points
              </span>
            </div>

            <ul>
               {acceptedItems.map((item) => (
                <li
                   key={item.code}
                  className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 last:border-b-0"
                >
                  <span className="font-display text-sm font-medium text-ink">
                    {item.label}
                  </span>
                  <span className="font-data text-base tabular-nums text-ink">
                    {item.points}
                  </span>
                </li>
               ))}
            </ul>

            <p className="border-t border-rule px-4 py-3 text-xs leading-relaxed text-muted">
              Place one item at a time. The camera confirms accepted materials.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule px-6 py-3 lg:px-8">
        <p className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          Smart Trash Bin / Rice Vendo
        </p>
      </footer>
    </div>
  );
}
