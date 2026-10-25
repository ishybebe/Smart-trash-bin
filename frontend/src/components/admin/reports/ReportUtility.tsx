'use client';

interface ReportUtilityProps {
  busy: boolean;
  currentReport: { report_id: string; created_by_admin: string; created_at: string } | null;
  onGenerate: () => void;
  onDownload: () => void;
  message: string | null;
}

export function ReportUtility({ busy, currentReport, onGenerate, onDownload, message }: ReportUtilityProps) {
  return (
    <div className="print-report-actions px-5 py-6 sm:px-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="flex h-14 w-full sm:w-auto flex-1 items-center justify-center bg-ink px-5 font-display text-sm font-semibold text-white transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        >
          {busy ? 'Generating report' : 'Generate report'}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!currentReport || busy}
          className="flex h-14 w-full sm:w-auto flex-1 items-center justify-center border border-ink bg-paper px-5 font-display text-sm font-semibold text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-rule disabled:text-muted"
        >
          Download report
        </button>
      </div>

      {message && (
        <p role="status" aria-live="polite" className="mt-4 border-l-2 border-signal pl-3 text-sm leading-relaxed text-ink">
          {message}
        </p>
      )}
    </div>
  );
}