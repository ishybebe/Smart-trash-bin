interface HopperMeterProps {
  riceInventory: number;
  capacity?: number;
  segments?: number;
  label?: string;
  subLabel?: string;
  showValue?: boolean;
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_CAPACITY = 50;
const DEFAULT_SEGMENTS = 10;

export function HopperMeter({
  riceInventory,
  capacity = DEFAULT_CAPACITY,
  segments = DEFAULT_SEGMENTS,
  label,
  subLabel,
  showValue = true,
  ariaLabel = 'Rice pack stock',
  className = '',
}: HopperMeterProps) {
  const filled = Math.max(
    0,
    Math.min(segments, Math.ceil((riceInventory / capacity) * segments)),
  );
  const displayValue = Math.min(riceInventory, capacity);

  return (
    <div className={className}>
      {(label || subLabel) && (
        <div className="flex items-baseline justify-between gap-4">
          {label && (
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
              {label}
            </p>
          )}
          {subLabel && (
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
              {subLabel}
            </span>
          )}
        </div>
      )}
      {showValue && (
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-6xl font-extrabold leading-none tabular-nums text-ink">
            {riceInventory}
          </span>
          <span className="mb-1 font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            packs
          </span>
        </div>
      )}
      <div
        className="mt-4 flex gap-1"
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={displayValue}
      >
        {Array.from({ length: segments }).map((_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 ${index < filled ? 'bg-signal' : 'bg-rule'}`}
          />
        ))}
      </div>
    </div>
  );
}