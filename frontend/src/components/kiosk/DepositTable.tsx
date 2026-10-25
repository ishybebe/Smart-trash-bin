'use client';

interface DepositItem {
  type: string;
  label: string;
  quantity: number;
  points: number;
}

interface DepositTableProps {
  deposits: DepositItem[];
}

export function DepositTable({ deposits }: DepositTableProps) {
  const totalItems = deposits.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-ink pb-2">
        <h2 className="font-data text-[10px] uppercase tracking-[0.24em] text-ink">
          Deposit ledger
        </h2>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-muted">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

      {deposits.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center border border-dashed border-rule"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            >
              <path d="M12 4v13" />
              <path d="m6.5 11.5 5.5 5.5 5.5-5.5" />
            </svg>
          </div>
          <p className="mt-5 font-display text-xl font-semibold text-ink">
            The chute is clear.
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Place a recyclable in the chute. Accepted items post here with their
            points.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[360px] border-collapse">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-3 font-data text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                  Item
                </th>
                <th className="py-3 text-right font-data text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((item) => (
                <tr key={item.type} className="border-b border-zinc-100">
                  <td className="py-4">
                    <span className="font-display text-base font-semibold text-ink">
                      {item.label}
                    </span>
                    <span className="ml-2 font-data text-[10px] uppercase tracking-[0.12em] text-muted">
                      {item.points} pts ea.
                    </span>
                  </td>
                  <td className="py-4 text-right font-data text-xl tabular-nums text-ink">
                    {String(item.quantity).padStart(2, '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
