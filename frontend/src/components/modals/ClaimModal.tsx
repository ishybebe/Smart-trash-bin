'use client';

import { QRCodeSVG } from 'qrcode.react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  alphanumeric: string;
  points: number;
}

export function ClaimModal({
  isOpen,
  onClose,
  alphanumeric,
  points,
}: ClaimModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border border-ink bg-paper"
      >
        <div className="flex items-start justify-between gap-6 border-b border-rule px-6 py-5">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
              Single-use claim
            </p>
            <h2
              id="claim-title"
              className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink"
            >
              Points claim
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close points claim"
            className="flex h-10 w-10 items-center justify-center border border-rule text-xl leading-none text-muted transition-colors hover:bg-zinc-50 hover:text-ink"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col items-center px-6 py-7">
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-muted">
            Take a picture of this code
          </p>

          <div className="mt-4 border border-ink bg-white p-4">
            <QRCodeSVG value={alphanumeric} size={200} level="L" />
          </div>

          <p className="mt-4 font-data text-2xl font-semibold tracking-[0.18em] text-ink">
            {alphanumeric}
          </p>
          <p className="mt-2 max-w-xs text-center text-xs leading-relaxed text-muted">
            Type this code into the points intake rail if the camera is
            unavailable.
          </p>

          <div className="mt-6 w-full border-t border-rule pt-5 text-center">
            <p className="font-display text-4xl font-extrabold tabular-nums text-signal">
              {points} <span className="font-data text-sm font-medium text-muted">pts</span>
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              This code now holds these points. It can be scanned once, so take
              your picture before you close this screen.
            </p>
          </div>
        </div>

        <div className="border-t border-rule px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-full items-center justify-center bg-ink font-display text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            Close and return
          </button>
        </div>
      </div>
    </div>
  );
}
