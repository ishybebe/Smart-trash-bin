'use client';

import { useState } from 'react';
import type { RicePrice } from '@/lib/ricePricing';

interface RicePricingPanelProps {
  pricing: RicePrice[];
  busy?: boolean;
  message?: string | null;
  onSave: (packSize: string, pointsPrice: number, isActive: boolean) => void;
}

export function RicePricingPanel({
  pricing,
  busy = false,
  message,
  onSave,
}: RicePricingPanelProps) {
  const active = pricing.find((row) => row.is_active) ?? pricing[0];
  const [selectedSizeState, setSelectedSizeState] = useState('');
  const [price, setPrice] = useState('');
  const selectedSize = selectedSizeState || active?.pack_size || '';
  const selectedRow = pricing.find((row) => row.pack_size === selectedSize);
  const displayedPrice =
    price || String(selectedRow?.points_price ?? active?.points_price ?? '');

  function selectSize(packSize: string) {
    const row = pricing.find((item) => item.pack_size === packSize);
    setSelectedSizeState(packSize);
    setPrice(String(row?.points_price ?? ''));
  }

  const parsedPrice = Number.parseInt(displayedPrice, 10);
  const validPrice =
    Number.isInteger(parsedPrice) && parsedPrice > 0 && parsedPrice <= 65535;

  return (
    <div className="border border-rule bg-paper">
      <div className="border-b border-rule px-4 py-3 sm:px-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-data text-[10px] uppercase tracking-[0.22em] text-ink">
            Active pack load
          </h2>
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-intake">
            One size at a time
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Select the pack physically loaded in the vendo. Activating a new size
          automatically retires the previous size.
        </p>
      </div>

      {pricing.length > 0 ? (
        <div className="px-4 py-5 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {pricing.map((row) => {
              const selected = row.pack_size === selectedSize;
              return (
                <button
                  key={row.pack_size}
                  type="button"
                  onClick={() => selectSize(row.pack_size)}
                  aria-pressed={selected}
                  className={`border px-4 py-4 text-left transition-colors ${
                    selected
                      ? 'border-ink bg-ink text-white'
                      : 'border-rule bg-paper text-ink hover:border-ink'
                  }`}
                >
                  <span className="block font-display text-xl font-semibold">
                    {row.pack_size} kg
                  </span>
                  <span
                    className={`mt-1 block font-data text-[10px] uppercase tracking-[0.14em] ${
                      selected ? 'text-white/60' : 'text-muted'
                    }`}
                  >
                    {row.is_active ? 'Currently loaded' : 'Available to load'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex max-w-sm flex-col gap-1">
            <label
              htmlFor="active-pack-price"
              className="font-data text-[10px] uppercase tracking-[0.14em] text-muted"
            >
              Point cost per pack
            </label>
            <input
              id="active-pack-price"
              type="number"
              min="1"
              max="65535"
              inputMode="numeric"
              value={displayedPrice}
              onChange={(event) => setPrice(event.target.value)}
              className="h-12 border border-rule bg-paper px-3 font-data text-base tabular-nums text-ink outline-none focus:border-ink"
            />
          </div>

          <button
            type="button"
            onClick={() => onSave(selectedSize, parsedPrice, true)}
            disabled={busy || !selectedSize || !validPrice}
            className="mt-4 flex h-12 w-full max-w-sm items-center justify-center bg-ink px-5 font-display text-sm font-semibold text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            {busy ? 'Saving vendo config' : 'Save active pack'}
          </button>
        </div>
      ) : (
        <p className="px-4 py-5 text-sm leading-relaxed text-muted sm:px-5">
          Pricing is unavailable. Check the database connection and reload.
        </p>
      )}

      {message && (
        <p
          role="status"
          aria-live="polite"
          className="border-t border-rule px-4 py-3 text-xs leading-relaxed text-ink sm:px-5"
        >
          {message}
        </p>
      )}
    </div>
  );
}