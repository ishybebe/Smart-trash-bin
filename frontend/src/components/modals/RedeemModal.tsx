'use client';

import { useEffect, useState } from 'react';
import { Loader } from '@/components/Loader';
import { api } from '@/lib/api';
import type { RicePrice } from '@/lib/ricePricing';

export interface DispenseResult {
  quantity_dispensed: number;
  pack_size?: string | null;
  points_per_pack?: number;
  points_used: number;
  points_remaining: number;
  rice_inventory: number;
  message: string;
}

interface RedeemModalProps {
  onClose: () => void;
  sessionId: string;
  availablePoints: number;
  riceInventory: number;
  ricePricing: RicePrice[];
  requestHeaders?: Record<string, string>;
  onDispensed: (result: DispenseResult) => void;
}

const MAX_PACKS = 10;

type Step = 'select' | 'confirm' | 'dispensing';

export function RedeemModal({
  onClose,
  sessionId,
  availablePoints,
  riceInventory,
  ricePricing,
  requestHeaders,
  onDispensed,
}: RedeemModalProps) {
  const selectedPack = ricePricing.find((price) => price.is_active);
  const pointsPerPack = selectedPack?.points_price ?? 0;

  const ceiling =
    pointsPerPack > 0
      ? Math.max(
          0,
          Math.min(
            MAX_PACKS,
            Math.floor(availablePoints / pointsPerPack),
            riceInventory,
          ),
        )
      : 0;

  const [quantity, setQuantity] = useState(() => (ceiling > 0 ? 1 : 0));
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && step !== 'dispensing') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, onClose]);

  const cost = quantity * pointsPerPack;
  const balanceAfter = availablePoints - cost;
  const outOfStock = riceInventory <= 0;
  const cannotAfford =
    pointsPerPack <= 0 || Math.floor(availablePoints / pointsPerPack) < 1;

  function changeQuantity(delta: number) {
    setError(null);
    setRequestId(null);
    setQuantity((current) => {
      const next = current + delta;
      if (next < 1 || next > ceiling) return current;
      return next;
    });
  }

  async function handleDispense() {
    if (!selectedPack || quantity < 1 || quantity > ceiling) return;

    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    setError(null);
    setStep('dispensing');

    const res = await api<DispenseResult>('/api/session/dispense', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        session_id: sessionId,
        quantity,
        request_id: id,
      }),
    });

    if (res.success && res.data) {
      onDispensed(res.data);
      onClose();
      return;
    }

    setError(
      res.error?.message ??
        'The dispense could not be confirmed. Retry to check its status before closing.',
    );
    setStep('confirm');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && step !== 'dispensing') {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-ink bg-paper"
      >
        <div className="flex items-start justify-between gap-6 border-b border-rule px-6 py-5">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
              Rice vendo
            </p>
            <h2
              id="redeem-title"
              className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink"
            >
              Redeem rice
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === 'dispensing'}
            aria-label="Close redeem rice"
            className="flex h-10 w-10 items-center justify-center border border-rule text-xl leading-none text-muted transition-colors hover:bg-zinc-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            &times;
          </button>
        </div>

        {step === 'select' && (
          <div className="px-6 py-6">
            <div className="mt-3 flex items-center justify-between border border-ink px-4 py-4">
              <div>
                <p className="font-display text-xl font-semibold text-ink">
                  {selectedPack ? `${selectedPack.pack_size} kg` : 'Unavailable'}
                </p>
                <p className="mt-1 font-data text-[10px] uppercase tracking-[0.14em] text-muted">
                  Active vendo pack
                </p>
              </div>
              <p className="font-data text-sm tabular-nums text-muted">
                {selectedPack ? `${selectedPack.points_price} pts / pack` : 'No active price'}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-muted">
                Quantity
              </p>
              <p className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
                {ceiling} available to redeem
              </p>
            </div>

            <div className="mt-3 flex items-stretch border border-ink">
              <button
                type="button"
                onClick={() => changeQuantity(-1)}
                disabled={quantity <= 1}
                aria-label="Decrease rice packs"
                className="flex h-24 w-20 items-center justify-center border-r border-rule font-display text-3xl font-semibold text-ink transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-paper"
              >
                &minus;
              </button>
              <div className="flex flex-1 flex-col items-center justify-center">
                <span
                  aria-live="polite"
                  className="font-display text-5xl font-extrabold leading-none tabular-nums text-ink"
                >
                  {quantity}
                </span>
                <span className="mt-2 font-data text-[10px] uppercase tracking-[0.2em] text-muted">
                  {quantity === 1 ? 'pack' : 'packs'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => changeQuantity(1)}
                disabled={quantity >= ceiling}
                aria-label="Increase rice packs"
                className="flex h-24 w-20 items-center justify-center border-l border-rule font-display text-3xl font-semibold text-ink transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-paper"
              >
                +
              </button>
            </div>

            <dl className="mt-5 divide-y divide-zinc-100 border-y border-rule">
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted">Cost</dt>
                <dd className="font-data text-sm font-medium text-ink">
                  {cost} pts
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted">Points after redeem</dt>
                <dd className="font-data text-sm font-medium text-ink">
                  {Math.max(0, balanceAfter)} pts
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted">Packs in vendo</dt>
                <dd className="font-data text-sm font-medium text-ink">
                  {riceInventory}
                </dd>
              </div>
            </dl>

            {ceiling === 0 && (
              <p className="mt-4 border-l-2 border-caution pl-3 text-sm leading-relaxed text-muted">
                {outOfStock
                  ? 'The vendo is empty. Your points stay saved for when stock returns.'
                  : !selectedPack
                    ? 'Rice pricing is unavailable. Ask an operator for help.'
                    : `This session does not have enough points for a ${selectedPack.pack_size} kg pack yet.`}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 border-l-2 border-fault pl-3 text-sm leading-relaxed text-fault"
              >
                {error}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex h-14 items-center justify-center border border-rule bg-paper font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={quantity < 1 || quantity > ceiling || outOfStock || cannotAfford}
                className="flex h-14 items-center justify-center bg-signal font-display text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="px-6 py-6">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-muted">
              Confirm dispense
            </p>
            <p className="mt-3 font-display text-2xl font-semibold leading-snug text-ink">
              You will redeem this quantity of{' '}
              <span className="tabular-nums">{quantity}</span>{' '}
              {quantity === 1 ? 'pack' : 'packs'} of{' '}
              {selectedPack?.pack_size ?? ''} kg rice.
            </p>

            <dl className="mt-5 divide-y divide-zinc-100 border-y border-rule">
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted">Points used</dt>
                <dd className="font-data text-sm font-medium text-ink">
                  {cost} pts
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted">Points remaining</dt>
                <dd className="font-data text-sm font-medium text-ink">
                  {Math.max(0, balanceAfter)} pts
                </dd>
              </div>
            </dl>

            {error && (
              <p
                role="alert"
                className="mt-4 border-l-2 border-fault pl-3 text-sm leading-relaxed text-fault"
              >
                {error}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex h-14 items-center justify-center border border-rule bg-paper font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDispense}
                className="flex h-14 items-center justify-center bg-intake font-display text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                {error ? 'Retry dispense' : `Dispense ${quantity}`}
              </button>
            </div>
          </div>
        )}

        {step === 'dispensing' && (
          <div className="px-6 py-12">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-muted">
              Dispensing
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">
              {quantity} {quantity === 1 ? 'pack' : 'packs'} of{' '}
              {selectedPack?.pack_size ?? ''} kg rice on the way.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Waiting for the vendo to confirm the dispense. This screen closes
              when the run completes.
            </p>
            <div className="mt-6">
              <Loader label="Awaiting dispense confirmation" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
