import type { RicePrice } from '@/lib/ricePricing';

export interface StatusData {
  system: string;
  kiosk: string;
  camera: string;
  esp32: string;
  rice_inventory?: number;
  rice_pricing?: RicePrice[];
  checked_at: string;
  accepted_materials?: Array<{ code: string; label: string; points: number }>;
}

export interface InventoryResponse {
  riceInventory: number;
}

export interface PricingResponse {
  ricePricing: RicePrice[];
}

export interface ReportsResponse {
  reports: {
    summary: {
      total_detected: number;
      points_generated: number;
      packs_redeemed: number;
    };
    waste_ranking: Array<{ type: string; quantity: number }>;
  };
}
