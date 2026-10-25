'use client';

import { InventoryPanel } from './InventoryPanel';
import { RicePricingPanel } from './RicePricingPanel';
import { ConfirmModal } from './ConfirmModal';
import { MaterialsConfigPanel, type ConfigMaterial } from './MaterialsConfigPanel';
import type { RicePrice } from '@/lib/ricePricing';

interface VendoViewProps {
  riceInventory: number;
  amount: string;
  inventoryBusy: boolean;
  inventoryMessage: string | null;
  pricing: RicePrice[];
  pricingBusy: boolean;
  pricingMessage: string | null;
  onAmountChange: (value: string) => void;
  onAddRice: () => void;
  onResetInventory: () => void;
  onSavePricing: (packSize: string, pointsPrice: number, isActive: boolean) => void;
  onOpenResetConfirm: () => void;
  onCloseResetConfirm: () => void;
  resetConfirmOpen: boolean;
  materials: ConfigMaterial[];
  materialsBusy: boolean;
  materialsMessage: string | null;
  onSaveMaterial: (code: string, points: number) => Promise<void>;
}

export function VendoView({
  riceInventory,
  amount,
  inventoryBusy,
  inventoryMessage,
  pricing,
  pricingBusy,
  pricingMessage,
  onAmountChange,
  onAddRice,
  onResetInventory,
  onSavePricing,
  onOpenResetConfirm,
  onCloseResetConfirm,
  resetConfirmOpen,
  materials,
  materialsBusy,
  materialsMessage,
  onSaveMaterial,
}: VendoViewProps) {
  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <p className="font-data text-[10px] uppercase tracking-[0.24em] text-muted">
            Physical configuration
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.02em] text-ink">
            Vendo config
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Manage stock and keep the database aligned with the pack currently
            loaded in the machine.
          </p>
        </header>

        <InventoryPanel
          riceInventory={riceInventory}
          amount={amount}
          busy={inventoryBusy}
          message={inventoryMessage}
          onAmountChange={onAmountChange}
          onAdd={onAddRice}
          onReset={onOpenResetConfirm}
        />
        <RicePricingPanel
          pricing={pricing}
          busy={pricingBusy}
          message={pricingMessage}
          onSave={onSavePricing}
        />
        <MaterialsConfigPanel
          materials={materials}
          busy={materialsBusy}
          message={materialsMessage}
          onSave={onSaveMaterial}
        />
      </main>

      <ConfirmModal
        isOpen={resetConfirmOpen}
        onClose={onCloseResetConfirm}
        onConfirm={onResetInventory}
        title="Reset inventory"
        message="Are you sure you want to reset the rice inventory to 0? This cannot be undone."
        confirmLabel="Confirm reset"
        requireTyping
      />
    </>
  );
}
