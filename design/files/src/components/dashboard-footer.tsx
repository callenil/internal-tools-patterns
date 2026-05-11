/**
 * Standard footer for authenticated pages. Pattern ported from
 * ScrapeGlobal: border-t, white bg, small slate text, max-w-7xl
 * inner. Used inside the column-flex page layout so it sticks to
 * the bottom of short pages.
 */
export function DashboardFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 text-xs text-slate-500 sm:px-6">
        <span>Sensitive data — every action is recorded in the audit log.</span>
        <span className="hidden sm:inline">Email Search · Concealed Wines</span>
      </div>
    </footer>
  );
}
