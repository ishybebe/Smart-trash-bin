'use client';

import { useState } from 'react';
import { TestingPanel } from './TestingPanel';
import KioskInterface from '@/components/kiosk/KioskInterface';

export interface TestingActionResult {
  session: {
    points: number;
  };
  rice_inventory?: number;
  reset?: boolean;
  deposit?: {
    type: string;
    label: string;
    points: number;
  };
}

interface TestingViewProps {
  testBusy: boolean;
  testMessage: string | null;
  onAddPoints: (points: number) => Promise<TestingActionResult | null>;
  onAddMaterial: (type: string) => Promise<TestingActionResult | null>;
  onReset: () => Promise<TestingActionResult | null>;
}

export function TestingView({
  testBusy,
  testMessage,
  onAddPoints,
  onAddMaterial,
  onReset,
}: TestingViewProps) {
  const [lastResult, setLastResult] = useState<TestingActionResult | null>(null);

  async function addPoints(points: number) {
    const result = await onAddPoints(points);
    if (result) setLastResult(result);
  }

  async function addMaterial(type: string) {
    const result = await onAddMaterial(type);
    if (result) setLastResult(result);
  }

  async function reset() {
    const result = await onReset();
    if (result) setLastResult(result);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <TestingPanel
        busy={testBusy}
        message={testMessage}
        onAddPoints={addPoints}
        onAddMaterial={addMaterial}
        onReset={reset}
      />
      <KioskInterface testingMode testingResult={lastResult} />
    </div>
  );
}
