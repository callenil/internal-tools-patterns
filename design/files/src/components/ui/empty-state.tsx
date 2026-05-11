import type { ReactNode } from "react";
import { MaterialIcon } from "./material-icon";

/**
 * Empty-state placeholder for empty lists / no-data screens. Ported from
 * sibling project ScrapeGlobal.
 *
 * Usage:
 *   <EmptyState icon="folder_off" message="No projects yet." />
 *   <EmptyState icon="filter_alt_off" message="Nothing matches." action={<button>Reset</button>} />
 *   <EmptyState fullPage message="Sign in to continue." />
 */
export function EmptyState({
  icon = "inbox",
  message,
  action,
  fullPage = false,
}: {
  icon?: string;
  message: ReactNode;
  action?: ReactNode;
  fullPage?: boolean;
}) {
  const heightClass = fullPage ? "min-h-[60vh]" : "py-12";
  return (
    <div className={`flex flex-col items-center justify-center ${heightClass}`}>
      <MaterialIcon name={icon} size="text-5xl" className="text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
