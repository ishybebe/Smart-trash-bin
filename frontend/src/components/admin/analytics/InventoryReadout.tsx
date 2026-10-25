'use client';

import { HopperMeter } from '@/components/common/HopperMeter';

interface InventoryReadoutProps {
  riceInventory: number;
}

export function InventoryReadout({ riceInventory }: InventoryReadoutProps) {
  return (
    <div className="border border-rule bg-paper px-4 py-5 sm:px-5">
      <HopperMeter
        riceInventory={riceInventory}
        label="Rice in vendo"
        subLabel="Live count"
        capacity={50}
        segments={10}
      />
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Read-only inventory status from the connected database.
      </p>
    </div>
  );
}