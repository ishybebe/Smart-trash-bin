'use client';

import { HardwareStatusRow } from './HardwareStatusRow';

interface HardwarePanelProps {
  hardware: {
    system: string;
    kiosk: string;
    camera: string;
    esp32: string;
    checked_at: string;
  } | null;
}

const ROWS = [
  { key: 'system', label: 'System' },
  { key: 'kiosk', label: 'Kiosk' },
  { key: 'camera', label: 'Camera' },
  { key: 'esp32', label: 'ESP32' },
] as const;

export function HardwarePanel({ hardware }: HardwarePanelProps) {
  return (
    <div className="border border-rule bg-paper">
      <div className="flex items-baseline justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
        <h2 className="font-data text-[10px] uppercase tracking-[0.22em] text-ink">
          Hardware status
        </h2>
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          Live
        </span>
      </div>

      {hardware ? (
        <div className="px-4 py-2 sm:px-5">
          {ROWS.map((row) => (
            <HardwareStatusRow
              key={row.key}
              name={row.label}
              state={hardware[row.key]}
            />
          ))}
          <p className="border-t border-rule py-3 font-data text-[10px] uppercase tracking-[0.12em] text-muted">
            Last checked {new Date(hardware.checked_at).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="px-4 py-5 text-sm leading-relaxed text-fault sm:px-5">
          Unable to fetch hardware status. Check the API connection.
        </p>
      )}
    </div>
  );
}