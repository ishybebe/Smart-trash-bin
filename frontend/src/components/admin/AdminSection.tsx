interface AdminSectionProps {
  label: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AdminSection({
  label,
  title,
  description,
  children,
}: AdminSectionProps) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-rule pb-3">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.22em] text-muted">
            {label}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-[-0.01em] text-ink">
            {title}
          </h2>
        </div>
        {description && (
          <p className="max-w-md font-data text-[10px] uppercase tracking-[0.12em] text-muted">
            {description}
          </p>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
