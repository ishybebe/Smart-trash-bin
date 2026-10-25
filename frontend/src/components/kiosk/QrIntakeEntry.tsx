'use client';

import type { IntakeStatus } from '@/components/kiosk/types';

interface QrIntakeEntryProps {
  status: IntakeStatus;
  message: string;
  cameraHint: string;
  manualOpen: boolean;
  manualCode: string;
  busyState: boolean;
  requesting: boolean;
  faulted: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onCloseManual: () => void;
}

export function QrIntakeEntry({
  status,
  message,
  cameraHint,
  manualOpen,
  manualCode,
  busyState,
  requesting,
  faulted,
  onCodeChange,
  onSubmit,
  onOpenScanner,
  onOpenManual,
  onCloseManual,
}: QrIntakeEntryProps) {
  return (
    <div className="mt-4">
      <p
        role={faulted ? 'alert' : undefined}
        className={`text-sm leading-relaxed ${faulted ? 'text-red-300' : 'text-white/70'}`}
      >
        {message ||
          cameraHint ||
          'Scan a saved points code to load it into this session.'}
      </p>

      {manualOpen ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="mt-4 flex flex-col gap-2"
        >
          <label
            htmlFor="manual-code"
            className="font-data text-[10px] uppercase tracking-[0.16em] text-white/50"
          >
            Points code
          </label>
          <input
            id="manual-code"
            value={manualCode}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder="Enter the 8-character code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="h-14 w-full border border-white/25 bg-transparent px-3 font-data text-base tracking-[0.12em] text-white outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-white/40 focus:border-white"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              disabled={!manualCode.trim() || busyState}
              className="h-14 touch-manipulation bg-paper font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
            >
              {status === 'verifying' ? 'Checking code' : 'Load code'}
            </button>
            <button
              type="button"
              onClick={onCloseManual}
              className="h-14 touch-manipulation border border-white/30 px-4 font-data text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <p className="text-xs leading-relaxed text-white/50">
            The code sits under the QR image on your points claim. It works once.
          </p>
        </form>
      ) : (
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onOpenScanner}
            disabled={requesting || busyState}
            className="flex h-14 touch-manipulation items-center justify-center bg-paper px-4 font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-100 disabled:cursor-wait disabled:bg-white/20 disabled:text-white/60"
          >
            {requesting ? 'Requesting camera' : faulted ? 'Try camera' : 'Open scanner'}
          </button>
          <button
            type="button"
            onClick={onOpenManual}
            disabled={busyState}
            className="flex h-14 touch-manipulation items-center justify-center border border-white/30 px-4 font-data text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enter code
          </button>
        </div>
      )}
    </div>
  );
}
