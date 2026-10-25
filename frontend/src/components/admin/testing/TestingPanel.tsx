'use client';

import { useState } from 'react';

const TEST_MATERIALS = [
  { type: 'plastic_bottle', label: 'Plastic bottle', points: 5 },
  { type: 'plastic_waste', label: 'Plastic waste', points: 3 },
  { type: 'glass_bottle', label: 'Glass bottle', points: 8 },
  { type: 'glass', label: 'Glass', points: 6 },
  { type: 'can', label: 'Aluminum can', points: 7 },
  { type: 'cardboard', label: 'Cardboard', points: 4 },
];

interface TestingPanelProps {
  busy: boolean;
  message: string | null;
  onAddPoints: (points: number) => Promise<void>;
  onAddMaterial: (type: string) => Promise<void>;
  onReset: () => Promise<void>;
}

export function TestingPanel({
  busy,
  message,
  onAddPoints,
  onAddMaterial,
  onReset,
}: TestingPanelProps) {
  const [points, setPoints] = useState('20');
  const [material, setMaterial] = useState(TEST_MATERIALS[0].type);

  const parsedPoints = Number.parseInt(points, 10);

  return (
    <section
      aria-label="Admin testing controls"
      className="border-b border-caution bg-caution/10 px-6 py-4 lg:px-8"
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.24em] text-ink">
            Testing only
          </p>
          <p className="mt-1 font-data text-[10px] uppercase tracking-[0.12em] text-muted">
            Changes stay in the local test sandbox.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
              Dummy points
            </span>
            <input
              type="number"
              min="1"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              className="h-9 w-28 border border-rule bg-paper px-3 font-data text-sm tabular-nums text-ink outline-none focus:border-signal"
            />
          </label>
          <button
            type="button"
            disabled={busy || !(parsedPoints > 0)}
            onClick={() => void onAddPoints(parsedPoints)}
            className="h-9 border border-ink bg-paper px-4 font-display text-xs font-semibold text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-rule disabled:text-muted"
          >
            Add points
          </button>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
              Material
            </span>
            <select
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              className="h-9 border border-rule bg-paper px-2 font-body text-sm text-ink outline-none focus:border-signal"
            >
              {TEST_MATERIALS.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label} · {item.points} pts
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onAddMaterial(material)}
            className="h-9 border border-ink bg-paper px-4 font-display text-xs font-semibold text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-rule disabled:text-muted"
          >
            Add material
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onReset()}
          className="h-9 border border-rule px-4 font-data text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset test session
        </button>

        {message && (
          <p role="status" aria-live="polite" className="font-data text-[10px] uppercase tracking-[0.12em] text-ink">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}