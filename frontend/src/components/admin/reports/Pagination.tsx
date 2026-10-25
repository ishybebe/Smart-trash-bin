interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-rule">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-9 px-3 border border-rule bg-paper font-data text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`h-9 w-9 font-data text-[10px] tabular-nums transition-colors ${
              page === currentPage
                ? 'bg-ink text-white'
                : 'border border-rule bg-paper text-ink hover:bg-zinc-50'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-9 px-3 border border-rule bg-paper font-data text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
      <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}