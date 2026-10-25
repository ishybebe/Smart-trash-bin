'use client';

import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  requireTyping?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  requireTyping = false,
}: ConfirmModalProps) {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear confirmation text whenever the dialog opens
    if (isOpen) setInputText('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = requireTyping
    ? inputText.trim().toLowerCase() === 'confirm'
    : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md border border-ink bg-paper"
      >
        <div className="flex items-start justify-between gap-6 border-b border-rule px-6 py-5">
          <div>
            <h2 id="confirm-title" className="font-display text-2xl font-bold tracking-[-0.01em] text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center border border-rule text-xl leading-none text-muted transition-colors hover:bg-zinc-50 hover:text-ink"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-ink">{message}</p>
          {requireTyping && (
            <div className="mt-5">
              <label
                htmlFor="confirm-text"
                className="mb-2 block font-data text-[10px] uppercase tracking-[0.16em] text-muted"
              >
                Type <strong className="text-ink">CONFIRM</strong> to proceed
              </label>
              <input
                id="confirm-text"
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="CONFIRM"
                autoComplete="off"
                className="h-12 w-full border border-rule bg-paper px-3 font-body text-sm text-ink outline-none focus:border-fault"
              />
            </div>
          )}
        </div>

        <div className="border-t border-rule px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 touch-manipulation items-center justify-center border border-rule px-5 font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!isConfirmed}
            onClick={() => {
              if (isConfirmed) {
                onConfirm();
                onClose();
              }
            }}
            className="flex h-12 touch-manipulation items-center justify-center bg-fault px-5 font-display text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
