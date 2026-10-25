interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="border border-rule bg-paper px-4 py-4 sm:px-5">
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-extrabold leading-none tabular-nums text-ink">
        {value}
      </p>
      {hint && (
        <p className="mt-2 font-data text-[10px] uppercase tracking-[0.12em] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}