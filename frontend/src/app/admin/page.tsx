'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader, type AdminTab } from '@/components/admin/AdminHeader';
import { AnalyticsView } from '@/components/admin/analytics';
import { ReportsView } from '@/components/admin/reports';
import { VendoView } from '@/components/admin/vendo';
import { TestingView } from '@/components/admin/testing';
import type { TestingActionResult } from '@/components/admin/testing/TestingView';
import { Loader } from '@/components/Loader';
import { useAdminInactivityLogout } from '@/hooks/useAdminInactivityLogout';
import { api } from '@/lib/api';
import type { RicePrice } from '@/lib/ricePricing';
import {
  ADMIN_TOKEN_KEY,
  clearAdminSession,
  isAuthFailure,
} from '@/lib/adminSession';
import type { StatusData, InventoryResponse, PricingResponse, ReportsResponse } from '@/lib/adminTypes';

export default function AdminPage() {
  const [hw, setHw] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [riceInventory, setRiceInventory] = useState(0);
  const [addAmount, setAddAmount] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [ricePricing, setRicePricing] = useState<RicePrice[]>([]);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportsResponse['reports'] | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [materials, setMaterials] = useState<Array<{ code: string; label: string; points: number }>>([]);
  const [materialsBusy, setMaterialsBusy] = useState(false);
  const [materialsMessage, setMaterialsMessage] = useState<string | null>(null);
  const router = useRouter();

  const { warningSeconds, stayActive } = useAdminInactivityLogout();

  const logout = useCallback(() => {
    clearAdminSession();
    router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    let cancelled = false;

    async function fetchData() {
      const [statusRes, inventoryRes, pricingRes, reportsRes] = await Promise.all([
        api<StatusData>('/api/status'),
        api<InventoryResponse>('/api/admin/inventory', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api<PricingResponse>('/api/admin/rice-pricing', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api<ReportsResponse>('/api/admin/reports', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (cancelled) return;

      if (statusRes.success && statusRes.data) {
        setHw(statusRes.data);
        setMaterials(statusRes.data.accepted_materials ?? []);
      }

      if (isAuthFailure(inventoryRes) || isAuthFailure(pricingRes) || isAuthFailure(reportsRes)) {
        logout();
        return;
      }

      if (inventoryRes.success && inventoryRes.data) {
        setRiceInventory(inventoryRes.data.riceInventory);
      }

      if (pricingRes.success && pricingRes.data) {
        setRicePricing(pricingRes.data.ricePricing);
      }

      if (reportsRes.success && reportsRes.data) {
        setReports(reportsRes.data.reports);
      }

      setLoading(false);
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [logout, router]);

  async function handleAddRice() {
    const amount = Number.parseInt(addAmount, 10);
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);

    if (!(amount > 0) || !token || addBusy) return;

    setAddBusy(true);
    setAddMessage(null);

    const res = await api<InventoryResponse>('/api/admin/inventory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    });

    if (isAuthFailure(res)) {
      logout();
      return;
    }

    if (res.success && res.data) {
      setRiceInventory(res.data.riceInventory);
      setAddAmount('');
      setAddMessage(`Added ${amount} pack${amount === 1 ? '' : 's'}.`);
    } else {
      setAddMessage(res.error?.message ?? 'Could not add stock.');
    }

    setAddBusy(false);
  }

  function openResetConfirm() {
    setResetConfirmOpen(true);
  }

  async function handleResetInventory() {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token || addBusy) return;

    setAddBusy(true);
    setAddMessage(null);
    const res = await api<InventoryResponse>('/api/admin/inventory/reset', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (isAuthFailure(res)) {
      logout();
      return;
    }

    if (res.success && res.data) {
      setRiceInventory(res.data.riceInventory);
      setAddMessage('Rice inventory reset to 0 packs.');
    } else {
      setAddMessage(res.error?.message ?? 'Could not reset inventory.');
    }
    setAddBusy(false);
  }

  async function handleUpdatePricing(
    packSize: string,
    pointsPrice: number,
    isActive: boolean,
  ) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);

    if (!token || pricingBusy) return;

    setPricingBusy(true);
    setPricingMessage(null);

    const res = await api<PricingResponse>('/api/admin/rice-pricing', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pack_size: packSize,
        points_price: pointsPrice,
        is_active: isActive,
      }),
    });

    if (isAuthFailure(res)) {
      logout();
      return;
    }

    if (res.success && res.data) {
      setRicePricing(res.data.ricePricing);
      setPricingMessage(
        `${packSize} kg updated to ${pointsPrice} points${
          isActive ? '' : ' and hidden'
        }.`,
      );
    } else {
      setPricingMessage(res.error?.message ?? 'Could not update rice pricing.');
    }

    setPricingBusy(false);
  }

  async function handleSaveMaterial(code: string, points: number) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token || materialsBusy) return;
    setMaterialsBusy(true);
    setMaterialsMessage(null);
    const res = await api<{ acceptedMaterials: Array<{ code: string; label: string; points: number }> }>('/api/admin/materials', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, points }),
    });
    if (isAuthFailure(res)) {
      logout();
      setMaterialsBusy(false);
      return;
    }
    if (res.success && res.data) {
      setMaterials(res.data.acceptedMaterials);
      setMaterialsMessage('Material points updated.');
    } else {
      setMaterialsMessage(res.error?.message ?? 'Could not update material points.');
    }
    setMaterialsBusy(false);
  }

  async function handleAddTestPoints(points: number) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    const sessionId = window.sessionStorage.getItem('admin_test_session_id');
    if (!token || !sessionId) return null;

    const res = await api<TestingActionResult>('/api/admin/testing/points', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Testing-Mode': 'true' },
      body: JSON.stringify({ session_id: sessionId, points }),
    });

    if (isAuthFailure(res)) {
      logout();
      return null;
    }
    return res.success && res.data ? res.data : null;
  }

  async function handleAddTestMaterial(type: string) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    const sessionId = window.sessionStorage.getItem('admin_test_session_id');
    if (!token || !sessionId) return null;

    const res = await api<TestingActionResult>('/api/admin/testing/deposit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Testing-Mode': 'true' },
      body: JSON.stringify({ session_id: sessionId, type }),
    });

    if (isAuthFailure(res)) {
      logout();
      return null;
    }
    return res.success && res.data ? res.data : null;
  }

  async function handleResetTestSession() {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    const sessionId = window.sessionStorage.getItem('admin_test_session_id');
    if (!token || !sessionId) return null;

    const res = await api<TestingActionResult>('/api/admin/testing/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Testing-Mode': 'true' },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (isAuthFailure(res)) {
      logout();
      return null;
    }
    return res.success && res.data ? { ...res.data, reset: true } : null;
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <Loader label="Reading admin session" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-ink">
      <AdminHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={logout}
        idleWarningSeconds={warningSeconds}
        onStayActive={stayActive}
      />

      {activeTab === 'analytics' ? (
        <AnalyticsView
          hw={hw}
          riceInventory={riceInventory}
          reports={reports}
        />
      ) : activeTab === 'vendo' ? (
        <VendoView
          riceInventory={riceInventory}
          amount={addAmount}
          inventoryBusy={addBusy}
          inventoryMessage={addMessage}
          pricing={ricePricing}
          pricingBusy={pricingBusy}
          pricingMessage={pricingMessage}
          onAmountChange={setAddAmount}
          onAddRice={handleAddRice}
          onResetInventory={handleResetInventory}
          onSavePricing={handleUpdatePricing}
          onOpenResetConfirm={openResetConfirm}
          onCloseResetConfirm={() => setResetConfirmOpen(false)}
          resetConfirmOpen={resetConfirmOpen}
          materials={materials}
          materialsBusy={materialsBusy}
          materialsMessage={materialsMessage}
          onSaveMaterial={handleSaveMaterial}
        />
      ) : activeTab === 'reports' ? (
        <ReportsView onAuthFailure={logout} />
      ) : (
        <TestingView
          testBusy={false}
          testMessage={null}
          onAddPoints={handleAddTestPoints}
          onAddMaterial={handleAddTestMaterial}
          onReset={handleResetTestSession}
        />
      )}
    </div>
  );
}
