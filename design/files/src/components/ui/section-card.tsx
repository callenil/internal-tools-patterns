import type { ReactNode } from "react";

/**
 * Section card — reusable rectangular content block with optional title
 * strip. Ported from sibling project ScrapeGlobal verbatim so the two
 * apps share a single visual language.
 *
 * Usage:
 *   <SectionCard>...</SectionCard>
 *   <SectionCard title="Daily cost (30d)" right="max: $5.23">...</SectionCard>
 *   <SectionCard padding="p-6">...</SectionCard>
 */
export function SectionCard({
  title,
  right,
  children,
  padding = "p-4",
  className = "",
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  padding?: string;
  className?: string;
}) {
  if (!title) {
    return (
      <section
        className={`rounded-lg border border-slate-200 bg-white shadow-sm ${padding} ${className}`.trim()}
      >
        {children}
      </section>
    );
  }
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`.trim()}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h2>
        {right ? <div className="text-xs text-slate-500">{right}</div> : null}
      </div>
      <div className={padding}>{children}</div>
    </section>
  );
}
