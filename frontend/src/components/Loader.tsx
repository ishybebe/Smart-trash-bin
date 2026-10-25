interface LoaderProps {
  label?: string;
  tone?: 'ink' | 'paper' | 'muted';
  className?: string;
}

const toneClasses = {
  ink: { track: 'bg-rule', segment: 'bg-signal', label: 'text-muted' },
  paper: { track: 'bg-white/25', segment: 'bg-white', label: 'text-white/60' },
  muted: { track: 'bg-rule', segment: 'bg-muted', label: 'text-muted' },
} as const;

export function Loader({
  label = 'Loading',
  tone = 'ink',
  className = '',
}: LoaderProps) {
  const colors = toneClasses[tone];

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <span
        aria-hidden
        className={`loader-track relative h-[2px] w-16 overflow-hidden ${colors.track}`}
      >
        <span
          className={`loader-segment absolute inset-y-0 left-0 w-1/3 ${colors.segment}`}
        />
      </span>
      <span
        className={`font-data text-[10px] uppercase tracking-[0.18em] ${colors.label}`}
      >
        {label}
      </span>
    </span>
  );
}
