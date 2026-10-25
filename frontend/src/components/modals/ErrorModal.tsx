'use client';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function ErrorModal({ isOpen, onClose, message }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 sm:p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        aria-describedby="notice-message"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto border border-ink bg-paper"
      >
        <div className="border-b border-rule px-6 py-5">
          <p className="font-data text-[10px] uppercase tracking-[0.24em] text-fault">
            Kiosk notice
          </p>
          <h2
            id="notice-title"
            className="mt-1 font-display text-xl font-bold text-ink"
          >
            Could not continue
          </h2>
        </div>

        <p
          id="notice-message"
          className="border-l-2 border-fault px-4 py-5 text-sm leading-relaxed text-ink"
        >
          {message}
        </p>

        <div className="border-t border-rule px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center bg-ink font-display text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
