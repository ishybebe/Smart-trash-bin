'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { DepositTable } from '@/components/kiosk/DepositTable';
import { KioskHeader, type HardwareStatus } from '@/components/kiosk/KioskHeader';
import { KioskSidebar } from '@/components/kiosk/KioskSidebar';
import { QrIntake } from '@/components/kiosk/QrIntake';
import { SessionReadout } from '@/components/kiosk/SessionReadout';
import type { IntakeStatus } from '@/components/kiosk/types';
import { Loader } from '@/components/Loader';
import { ClaimModal } from '@/components/modals/ClaimModal';
import { RedeemModal, type DispenseResult } from '@/components/modals/RedeemModal';
import { ErrorModal } from '@/components/modals/ErrorModal';
import { api } from '@/lib/api';
import type { RicePrice } from '@/lib/ricePricing';
import type { TestingActionResult } from '@/components/admin/testing/TestingView';
import { useRouter } from 'next/navigation';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

interface DepositItem {
  type: string;
  label: string;
  quantity: number;
  points: number;
}

interface ClaimResult {
  token: string;
  alphanumeric: string;
  points: number;
}

interface SessionState {
  session_id: string;
  points: number;
  updated_at: string;
}

interface StatusData extends HardwareStatus {
  rice_inventory?: number;
  rice_pricing?: RicePrice[];
  checked_at: string;
}

interface KioskInterfaceProps {
  testingMode?: boolean;
  testingResult?: TestingActionResult | null;
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mergeDeposit(items: DepositItem[], deposit: DepositItem) {
  const existing = items.find((item) => item.type === deposit.type);
  if (!existing) return [...items, deposit];
  return items.map((item) =>
    item.type === deposit.type
      ? { ...item, quantity: item.quantity + deposit.quantity }
      : item,
  );
}

function adminHeaders(): Record<string, string> {
  const token = window.localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function testingHeaders(testingMode: boolean): Record<string, string> | undefined {
  if (!testingMode) return undefined;
  return { ...adminHeaders(), 'X-Testing-Mode': 'true' };
}

export default function KioskInterface({ testingMode = false, testingResult }: KioskInterfaceProps) {
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [sessionPoints, setSessionPoints] = useState(0);
  const [riceInventory, setRiceInventory] = useState(0);
  const [ricePricing, setRicePricing] = useState<RicePrice[]>([]);
  const [hardware, setHardware] = useState<HardwareStatus | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const [claimData, setClaimData] = useState<ClaimResult | null>(null);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const router = useRouter();
  const activePrice = ricePricing.find((price) => price.is_active) ?? ricePricing[0];
  const endSession = useCallback(() => {
    window.sessionStorage.removeItem(testingMode ? 'admin_test_session_id' : 'kiosk_session_id');
    router.push('/');
  }, [router, testingMode]);

  useInactivityTimer({
    enabled: Boolean(sessionId) && !isLoading,
    timeoutMs: 2 * 60 * 1000,
    onTimeout: endSession,
  });

  const loadStatus = useCallback(async () => {
    const res = await api<StatusData>('/api/status', {
      headers: testingHeaders(testingMode),
    });
    if (res.success && res.data) {
      setHardware(res.data);
      setRiceInventory(res.data.rice_inventory ?? 0);
      setRicePricing(res.data.rice_pricing ?? []);
      return true;
    }
    throw new Error(res.error?.message ?? 'The kiosk status could not be loaded.');
  }, [testingMode]);

  useEffect(() => {
    void (async () => {
      try {
        const sessionKey = testingMode ? 'admin_test_session_id' : 'kiosk_session_id';
        let id = window.sessionStorage.getItem(sessionKey);
        if (!id) {
          id = createSessionId();
          window.sessionStorage.setItem(sessionKey, id);
        }

        const session = await api<SessionState>(`/api/session/${id}`, {
          headers: testingHeaders(testingMode),
        });
        setSessionId(id);
        if (session.success && session.data) {
          setSessionPoints(session.data.points);
        } else {
          throw new Error(session.error?.message ?? 'The kiosk session could not be loaded.');
        }

        await loadStatus();
        setBootError(null);
      } catch (error) {
        setBootError(
          error instanceof Error
            ? error.message
            : 'The kiosk could not reach the backend. Check the network connection and try again.',
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadStatus, testingMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadStatus().catch(() => {
        setBootError('Live station status is unavailable. The kiosk is operating offline.');
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!testingResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply confirmed sandbox response to the kiosk view
    setSessionPoints(testingResult.session.points);
    if (testingResult.rice_inventory !== undefined) {
      setRiceInventory(testingResult.rice_inventory);
    }
    if (testingResult.reset) {
      setDeposits([]);
    } else if (testingResult.deposit) {
      setDeposits((current) => mergeDeposit(current, {
        type: testingResult.deposit!.type,
        label: testingResult.deposit!.label,
        quantity: 1,
        points: testingResult.deposit!.points,
      }));
    }
  }, [testingResult]);

  async function handleClaim() {
    if (sessionPoints <= 0) {
      setErrorMessage(
        'No points in this session yet. Deposit an accepted item or scan a saved points code.',
      );
      return;
    }

    if (claiming) return;
    setClaiming(true);

    const res = await api<ClaimResult>('/api/session/claim', {
      method: 'POST',
      headers: testingHeaders(testingMode),
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (res.success && res.data) {
      setClaimData(res.data);
      setIsClaimOpen(true);
      setSessionPoints(0);
    } else {
      setErrorMessage(
        res.error?.message ?? 'The points claim could not be created.',
      );
    }

    setClaiming(false);
  }

  function handlePointsLoaded(credited: number, points: number) {
    setSessionPoints(points);
    setSuccessMessage(`Loaded ${credited} points into this session.`);
  }

  function handleDispensed(result: DispenseResult) {
    setSessionPoints(result.points_remaining);
    setRiceInventory(result.rice_inventory);
    setSuccessMessage(result.message);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <KioskHeader hardware={hardware} intake={intakeStatus} />

      {isLoading ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-6">
          <BrandMark size={72} alt="Smart Trash Bin" />
          <Loader label="Reading kiosk session" />
        </main>
      ) : bootError ? (
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <section className="w-full max-w-xl border border-fault bg-paper p-6 sm:p-8">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-fault">
              Kiosk offline
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">
              Connection unavailable
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {bootError} Make sure the backend is running on the host computer and
              that this device is connected to the same network.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 flex h-12 items-center justify-center bg-ink px-5 font-display text-sm font-semibold text-white hover:bg-signal"
            >
              Retry connection
            </button>
          </section>
        </main>
      ) : (
        <main className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="flex min-h-0 flex-col border-b border-rule lg:border-b-0 lg:border-r">
             <SessionReadout points={sessionPoints} pointsPerPack={activePrice?.points_price} />
            <DepositTable deposits={deposits} />
          </section>

          <div className="flex min-h-0 flex-col border-b border-rule lg:border-b-0">
            <QrIntake
              sessionId={sessionId}
              requestHeaders={testingHeaders(testingMode)}
              onLoaded={handlePointsLoaded}
              onStatusChange={setIntakeStatus}
            />
            <KioskSidebar
              points={sessionPoints}
              riceInventory={riceInventory}
              ricePricing={ricePricing}
              busy={claiming}
              onClaim={handleClaim}
              onOpenRedeem={() => setIsRedeemOpen(true)}
            />
          </div>
        </main>
      )}

      <button
        type="button"
        onClick={() => (sessionPoints > 0 ? setEndSessionOpen(true) : endSession())}
        className="fixed bottom-4 left-4 z-30 border border-rule bg-paper px-4 py-3 font-data text-[10px] uppercase tracking-[0.16em] text-muted shadow-sm hover:border-ink hover:text-ink"
      >
        End session
      </button>

      {endSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md border border-ink bg-paper p-6">
            <h2 className="font-display text-2xl font-bold text-ink">Unclaimed points</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This session still holds {sessionPoints} points. Claim them as a code or exit and forfeit them.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { setEndSessionOpen(false); void handleClaim(); }} className="h-12 bg-ink px-4 font-display text-sm font-semibold text-white hover:bg-signal">
                Claim as code
              </button>
              <button type="button" onClick={endSession} className="h-12 border border-fault px-4 font-display text-sm font-semibold text-fault hover:bg-fault hover:text-white">
                Exit &amp; forfeit
              </button>
            </div>
            <button type="button" onClick={() => setEndSessionOpen(false)} className="mt-3 h-10 w-full border border-rule font-data text-[10px] uppercase tracking-[0.16em] text-muted">
              Continue session
            </button>
          </div>
        </div>
      )}

      <ClaimModal
        isOpen={isClaimOpen}
        onClose={() => {
          setIsClaimOpen(false);
          setClaimData(null);
        }}
        alphanumeric={claimData?.alphanumeric || ''}
        points={claimData?.points || 0}
      />

      {isRedeemOpen && (
        <RedeemModal
          onClose={() => setIsRedeemOpen(false)}
          sessionId={sessionId}
          availablePoints={sessionPoints}
          riceInventory={riceInventory}
          ricePricing={ricePricing}
          requestHeaders={testingHeaders(testingMode)}
          onDispensed={handleDispensed}
        />
      )}

      <ErrorModal
        isOpen={Boolean(errorMessage)}
        onClose={() => setErrorMessage(null)}
        message={errorMessage || ''}
      />

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-4 right-4 top-24 z-40 max-w-sm border-l-4 border-intake bg-ink px-5 py-4 text-white shadow-lg sm:left-auto sm:right-6"
        >
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-white/60">
            Confirmed
          </p>
          <p className="mt-1 font-display text-sm font-semibold leading-snug">
            {successMessage}
          </p>
        </div>
      )}
    </div>
  );
}
