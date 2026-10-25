'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

export type AdminTab = 'analytics' | 'vendo' | 'reports' | 'testing';

interface AdminHeaderProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  idleWarningSeconds: number | null;
  onStayActive: () => void;
}

function formatWarning(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function AdminHeader({
  activeTab,
  onTabChange,
  onLogout,
  idleWarningSeconds,
  onStayActive,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/Landing-page"
            className="flex items-center gap-3"
          >
            <BrandMark size={36} priority />
            <span className="font-display text-lg font-extrabold uppercase tracking-[-0.01em] text-ink">
              Smart Trash Bin
            </span>
          </Link>
          <span aria-hidden className="h-4 w-px bg-rule" />
          <span className="font-data text-[10px] uppercase tracking-[0.22em] text-muted">
            Operator console
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <p className="hidden items-center gap-2 sm:flex">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-intake" />
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
              Session active
            </span>
          </p>

          <Link
            href="/kiosk"
            className="hidden h-10 items-center border border-rule px-4 font-data text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-ink hover:text-ink sm:flex"
          >
            Standard kiosk
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 touch-manipulation items-center gap-2 bg-ink px-4 font-data text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-signal"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="square"
            >
              <path d="M14 8V5H5v14h9v-3" />
              <path d="M10 12h11" />
              <path d="m18 9 3 3-3 3" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {idleWarningSeconds !== null && (
        <div role="alert" className="border-t border-caution bg-caution/10">
          <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
            <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink">
              <span className="sr-only">
                Your session ends soon due to inactivity. Choose stay signed in
                to continue.
              </span>
              <span aria-hidden>
                Session ends in{' '}
                <span className="tabular-nums">
                  {formatWarning(idleWarningSeconds)}
                </span>{' '}
                due to inactivity.
              </span>
            </p>
            <button
              type="button"
              onClick={onStayActive}
              className="flex h-9 touch-manipulation items-center border border-ink bg-paper px-3 font-data text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Stay signed in
            </button>
          </div>
        </div>
      )}

      <nav
        aria-label="Admin sections"
        className="mx-auto flex w-full max-w-[1400px] items-stretch gap-px overflow-x-auto border-t border-rule px-4 sm:px-6 lg:px-8"
      >
        <button
          type="button"
          onClick={() => onTabChange('analytics')}
          aria-current={activeTab === 'analytics' ? 'page' : undefined}
          className={`h-12 whitespace-nowrap border-b-2 px-4 font-data text-[10px] uppercase tracking-[0.18em] transition-colors ${
            activeTab === 'analytics'
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Analytics &amp; telemetry
        </button>
        <button
          type="button"
          onClick={() => onTabChange('vendo')}
          aria-current={activeTab === 'vendo' ? 'page' : undefined}
          className={`h-12 whitespace-nowrap border-b-2 px-4 font-data text-[10px] uppercase tracking-[0.18em] transition-colors ${
            activeTab === 'vendo'
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Vendo config
        </button>
        <button
          type="button"
          onClick={() => onTabChange('reports')}
          aria-current={activeTab === 'reports' ? 'page' : undefined}
          className={`h-12 whitespace-nowrap border-b-2 px-4 font-data text-[10px] uppercase tracking-[0.18em] transition-colors ${
            activeTab === 'reports'
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Reports
        </button>
        <button
          type="button"
          onClick={() => onTabChange('testing')}
          aria-current={activeTab === 'testing' ? 'page' : undefined}
          className={`h-12 whitespace-nowrap border-b-2 px-4 font-data text-[10px] uppercase tracking-[0.18em] transition-colors ${
            activeTab === 'testing'
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Testing kiosk
        </button>
        <span className="ml-auto hidden items-center font-data text-[10px] uppercase tracking-[0.16em] text-muted md:flex">
          Admin / 02
        </span>
      </nav>
    </header>
  );
}
