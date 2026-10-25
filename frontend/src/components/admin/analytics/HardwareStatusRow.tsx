const STATE_DOTS: Record<string, string> = {
  online: 'bg-intake',
  offline: 'bg-fault',
  unknown: 'bg-zinc-400',
};

interface HardwareStatusRowProps {
  name: string;
  state?: string;
}

export function HardwareStatusRow({ name, state }: HardwareStatusRowProps) {
  const value = state ?? 'unknown';

  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-0">
      <span className="font-data text-[11px] uppercase tracking-[0.14em] text-muted">
        {name}
      </span>
      <span className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.14em] text-ink">
        <span
          aria-hidden
          className={`h-2 w-2 ${STATE_DOTS[value] ?? STATE_DOTS.unknown}`}
        />
        {value}
      </span>
    </div>
  );
}