'use client';

import { AdminSection } from '../AdminSection';
import { MetricCard } from './MetricCard';
import { HardwarePanel } from './HardwarePanel';
import { InventoryReadout } from './InventoryReadout';
import type { StatusData, ReportsResponse } from '@/lib/adminTypes';

interface AnalyticsViewProps {
  hw: StatusData | null;
  riceInventory: number;
  reports: ReportsResponse['reports'] | null;
}

export function AnalyticsView({ hw, riceInventory, reports }: AnalyticsViewProps) {
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <AdminSection
        label="Station summary"
        title="Today at the bin"
        description="Telemetry feed pending"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total deposits"
            value={reports?.summary.total_detected ?? '—'}
            hint="Accepted and rejected detections"
          />
          <MetricCard
            label="Points issued"
            value={reports?.summary.points_generated ?? '—'}
            hint="Accepted recyclables"
          />
          <MetricCard
            label="Rice dispensed"
            value={reports?.summary.packs_redeemed ?? '—'}
            hint="Confirmed packs"
          />
          <MetricCard
            label="Rice in vendo"
            value={riceInventory}
            hint="Active pack configuration"
          />
        </div>
      </AdminSection>

      <AdminSection
        label="Material intake"
        title="Waste breakdown"
        description="All accepted categories"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {['Plastic bottles', 'Plastic waste', 'Glass bottles', 'Glass', 'Cans', 'Cardboard'].map((label) => {
            const normalized = label.toLowerCase().replaceAll(' ', '_').replace('_bottles', '_bottle');
            const entry = reports?.waste_ranking.find((row: { type: string; quantity: number }) => row.type === normalized);
            return (
              <MetricCard key={label} label={label} value={entry?.quantity ?? '—'} />
            );
          })}
        </div>
      </AdminSection>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <InventoryReadout riceInventory={riceInventory} />
        </div>
        <div className="min-w-0">
          <HardwarePanel hardware={hw} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-5">
        <p className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          Smart Trash Bin / Rice Vendo · Admin session ends after 10 minutes of inactivity
        </p>
      </div>
    </main>
  );
}
