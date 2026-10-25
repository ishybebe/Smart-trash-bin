'use client';

import { useState } from 'react';

export interface ConfigMaterial {
  code: string;
  label: string;
  points: number;
}

interface MaterialsConfigPanelProps {
  materials: ConfigMaterial[];
  busy: boolean;
  message: string | null;
  onSave: (code: string, points: number) => Promise<void>;
}

export function MaterialsConfigPanel({ materials, busy, message, onSave }: MaterialsConfigPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <section className="border border-rule bg-paper">
      <div className="border-b border-rule px-4 py-3 sm:px-5">
        <h2 className="font-data text-[10px] uppercase tracking-[0.22em] text-ink">Material points</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Set the points awarded for each accepted item.</p>
      </div>
      <div className="divide-y divide-zinc-100">
        {materials.map((material) => {
          const value = values[material.code] ?? String(material.points);
          return (
            <div key={material.code} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1 font-display text-sm font-semibold text-ink">{material.label}</span>
              <input
                type="number"
                min="1"
                value={value}
                onChange={(event) => setValues((current) => ({ ...current, [material.code]: event.target.value }))}
                className="h-10 w-24 border border-rule bg-paper px-3 font-data tabular-nums text-ink outline-none focus:border-ink"
                aria-label={`${material.label} points`}
              />
              <button
                type="button"
                disabled={busy || !(Number.parseInt(value, 10) > 0)}
                onClick={() => void onSave(material.code, Number.parseInt(value, 10))}
                className="h-10 border border-ink bg-ink px-4 font-data text-[10px] uppercase tracking-[0.14em] text-white hover:bg-signal disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Save
              </button>
            </div>
          );
        })}
      </div>
      {message && <p role="status" className="border-t border-rule px-4 py-3 text-xs text-ink sm:px-5">{message}</p>}
    </section>
  );
}
