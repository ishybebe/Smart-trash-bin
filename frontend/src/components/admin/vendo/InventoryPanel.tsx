'use client';

import { HopperMeter } from '@/components/common/HopperMeter';

interface InventoryPanelProps {
  riceInventory: number;
  amount: string;
  busy?: boolean;
  message?: string | null;
  onAmountChange: (value: string) => void;
  onAdd: () => void;
  onReset: () => void;
}

export function InventoryPanel({
  riceInventory,
  amount,
  busy = false,
  message,
  onAmountChange,
  onAdd,
  onReset,
}: InventoryPanelProps) {
  return (
    <div className="border border-rule bg-paper">
      <div className="flex items-baseline justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
        <h2 className="font-data text-[10px] uppercase tracking-[0.22em] text-ink">
          Rice inventory
        </h2>
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          1/8 · 1/4 · 1/2 kg
        </span>
      </div>

      <div className="grid min-w-0 gap-6 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <HopperMeter
            riceInventory={riceInventory}
            label="Packs available"
            subLabel="Live count"
            capacity={50}
            segments={10}
          />
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">
            Stock shown here is the live count from the database this console is
            connected to.
          </p>
        </div>

        <div className="min-w-0 lg:border-l lg:border-rule lg:pl-10">
          <label
            htmlFor="rice-amount"
            className="font-data text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            Add packs
          </label>
          <input
            id="rice-amount"
            type="number"
            min="1"
            inputMode="numeric"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="Enter number of packs"
            className="mt-2 h-12 w-full border border-rule bg-paper px-3 font-data text-base tabular-nums text-ink outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={busy || !(parseInt(amount, 10) > 0)}
            className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center bg-ink px-5 font-display text-sm font-semibold text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            {busy ? 'Adding stock' : 'Add stock'}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="mt-2 flex h-11 w-full touch-manipulation items-center justify-center border border-fault px-5 font-display text-sm font-semibold text-fault transition-colors hover:bg-fault hover:text-white disabled:cursor-not-allowed disabled:border-rule disabled:text-zinc-400"
          >
            Reset inventory
          </button>
          <p className="mt-2 font-data text-[10px] uppercase tracking-[0.12em] text-muted">
            Adds to the current count
          </p>
          {message && (
            <p
              role="status"
              aria-live="polite"
              className="mt-3 border-l-2 border-signal pl-3 text-xs leading-relaxed text-ink"
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
