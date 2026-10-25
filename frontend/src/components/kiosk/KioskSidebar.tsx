'use client';

import type { RicePrice } from '@/lib/ricePricing';

interface KioskSidebarProps {
  points: number;
  riceInventory: number;
  ricePricing: RicePrice[];
  busy?: boolean;
  onClaim: () => void;
  onOpenRedeem: () => void;
}

const HOPPER_CAPACITY = 50;
const SEGMENTS = 10;

export function KioskSidebar({
  points,
  riceInventory,
  ricePricing,
  busy = false,
  onClaim,
  onOpenRedeem,
}: KioskSidebarProps) {
  const outOfStock = riceInventory <= 0;
  const activePricing = ricePricing.filter((price) => price.is_active);
  const pricingAvailable = activePricing.length > 0;
  const packSizes = activePricing.map((price) => price.pack_size).join(' · ');
  const prices = activePricing.map((price) => price.points_price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceLabel = !pricingAvailable
    ? 'Pricing unavailable'
    : minPrice === maxPrice
      ? `${minPrice} points per pack`
      : `${minPrice}–${maxPrice} points per pack`;
  const filledSegments = Math.max(
    0,
    Math.min(SEGMENTS, Math.ceil((riceInventory / HOPPER_CAPACITY) * SEGMENTS)),
  );

  return (
    <aside className="grid gap-8 px-5 py-8 sm:grid-cols-2 sm:gap-x-10 sm:px-6 lg:flex lg:flex-col lg:px-8">
      <section>
        <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
          Saved points
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold text-ink">
          Claim extra points
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Move this session&apos;s points to a single-use code you can scan here
          whenever you are ready to redeem.
        </p>
        <button
          type="button"
          onClick={onClaim}
          disabled={points <= 0 || busy}
          className="mt-4 flex h-14 w-full items-center justify-center border border-ink bg-paper px-5 font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-paper"
        >
          {busy ? 'Creating claim' : `Claim ${points > 0 ? `${points} points` : 'points'}`}
        </button>
        {points <= 0 && (
          <p className="mt-2 font-data text-[10px] uppercase tracking-[0.12em] text-muted">
            Deposit an accepted item to earn points.
          </p>
        )}
      </section>

      <div aria-hidden className="hidden border-t border-rule lg:block" />

      <section>
        <div className="flex items-start justify-between gap-4">
          <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
            Rice vendo
          </p>
          <p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
            {pricingAvailable ? `${packSizes} kg` : '—'}
          </p>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-6xl font-extrabold leading-none tabular-nums text-ink">
            {riceInventory}
          </span>
          <span className="mb-1 font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            remaining
          </span>
        </div>

        <div
          className="mt-4 flex gap-1"
          role="meter"
          aria-label="Rice pack stock"
          aria-valuemin={0}
          aria-valuemax={HOPPER_CAPACITY}
          aria-valuenow={Math.min(riceInventory, HOPPER_CAPACITY)}
        >
          {Array.from({ length: SEGMENTS }).map((_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 ${index < filledSegments ? 'bg-signal' : 'bg-rule'}`}
            />
          ))}
        </div>

        <p className="mt-2 font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          {priceLabel}
        </p>

        <button
          type="button"
          onClick={onOpenRedeem}
          disabled={outOfStock || !pricingAvailable}
          className="mt-4 flex h-16 w-full items-center justify-between bg-signal px-5 text-left text-white transition-colors hover:bg-blue-900 active:bg-blue-950 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        >
          <span className="font-display text-lg font-bold">Redeem rice</span>
          <span className="font-data text-[10px] uppercase tracking-[0.16em] opacity-80">
            {outOfStock ? 'Empty' : pricingAvailable ? 'Open' : 'Unavailable'}
          </span>
        </button>

        {outOfStock && (
          <p className="mt-3 border-l-2 border-caution pl-3 text-sm leading-relaxed text-muted">
            Out of rice. Keep depositing — your points stay saved until stock
            returns.
          </p>
        )}

        {!outOfStock && !pricingAvailable && (
          <p className="mt-3 border-l-2 border-caution pl-3 text-sm leading-relaxed text-muted">
            Rice pricing is unavailable. Ask an operator for help.
          </p>
        )}
      </section>
    </aside>
  );
}
