'use client';

import { BrandMark } from '@/components/BrandMark';
import type { IntakeStatus } from '@/components/kiosk/types';

export interface HardwareStatus {
  system: string;
  kiosk: string;
  camera: string;
  esp32: string;
}

const INTAKE_META: Record<
  IntakeStatus,
  { label: string; dot: string; pulse?: boolean }
> = {
  idle: { label: 'Idle', dot: 'bg-zinc-400' },
  scanning: { label: 'Scanning', dot: 'bg-caution', pulse: true },
  verifying: { label: 'Verifying', dot: 'bg-caution', pulse: true },
  loaded: { label: 'Loaded', dot: 'bg-intake' },
  rejected: { label: 'Rejected', dot: 'bg-fault' },
  unavailable: { label: 'Unavailable', dot: 'bg-fault' },
};

function StatusChip({ label, state }: { label: string; state?: string }) {
  const value = state ?? 'unknown';

  const dot =
    value === 'online'
      ? 'bg-intake'
      : value === 'offline'
        ? 'bg-fault'
        : 'bg-zinc-400';

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${dot} ${value === 'online' ? 'status-breathe' : ''}`}
      />
      <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <span className="font-data text-[10px] uppercase tracking-[0.16em] text-ink">
        {value}
      </span>
    </span>
  );
}

function IntakeChip({ status }: { status: IntakeStatus }) {
  const meta = INTAKE_META[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border border-rule px-3 py-1.5"
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${meta.dot} ${meta.pulse ? 'status-breathe' : ''}`}
      />
      <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
        Intake
      </span>
      <span className="font-data text-[10px] uppercase tracking-[0.16em] text-ink">
        {meta.label}
      </span>
    </span>
  );
}

export function KioskHeader({
  hardware,
  intake,
}: {
  hardware: HardwareStatus | null;
  intake: IntakeStatus;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-rule px-5 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <BrandMark size={36} priority />
        <span className="font-display text-lg font-extrabold uppercase tracking-[-0.01em] text-ink">
          Smart Trash Bin
        </span>
        <span aria-hidden className="h-4 w-px bg-rule" />
        <span className="font-data text-[10px] uppercase tracking-[0.22em] text-muted">
          Rice Vendo
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <IntakeChip status={intake} />

        <span aria-hidden className="hidden h-4 w-px bg-rule sm:block" />

        <StatusChip label="Kiosk" state={hardware?.kiosk} />
        <StatusChip label="Camera" state={hardware?.camera} />
        <StatusChip label="ESP32" state={hardware?.esp32} />
      </div>
    </header>
  );
}
