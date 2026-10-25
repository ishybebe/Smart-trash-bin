'use client';

export function SessionReadout({ points, pointsPerPack = 20 }: { points: number; pointsPerPack?: number }) {
  return (
    <section className="px-5 pb-7 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
            Current session
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-[72px] font-extrabold leading-[0.78] tracking-[-0.04em] tabular-nums lg:text-[92px]">
              {points}
            </span>
            <span className="mb-3 font-data text-[11px] uppercase tracking-[0.2em] text-muted">
              points
            </span>
          </div>
        </div>

        <div className="border-l border-rule pl-5 text-right">
          <p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
            Exchange rate
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-ink">
             {pointsPerPack} pts <span className="font-normal text-muted">/</span> 1 pack
          </p>
        </div>
      </div>
    </section>
  );
}
