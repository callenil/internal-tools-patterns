import type { ReactNode } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/material-icon";

/**
 * Standard page heading. Class strings ported verbatim from sibling
 * project ScrapeGlobal so the two apps share an identical visual
 * language.
 *
 * Pattern: h1 (text-xl font-bold) on the left, action buttons on the
 * right, mb-4 underneath. No border-bottom divider, no subtitle in the
 * default rendering. If you need richer header content (subtitle,
 * eyebrow, two action rows), compose inline rather than extending the
 * component.
 */
export function PageHeader({
  title,
  actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Button helpers — both styles ported verbatim from ScrapeGlobal:
 *
 *   primary:  rounded-lg bg-[var(--primary)] px-4 py-2 text-sm
 *             font-medium text-white transition-colors duration-200
 *             hover:bg-[var(--primary-hover)]
 *
 *   secondary:rounded-lg border border-slate-300 bg-white px-4 py-2
 *             text-sm font-medium text-slate-700 transition-colors
 *             duration-200 hover:bg-slate-50
 *
 * Both wrap in inline-flex with gap-1.5 so an optional icon name
 * (Material Symbols glyph) renders as a leading icon. ------------------*/

const PRIMARY_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:opacity-50";

const SECONDARY_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-50";

type ButtonInnerProps = {
  href?: string;
  onClick?: () => void;
  icon?: string;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
};

function renderInner({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <>
      {icon && <MaterialIcon name={icon} size="text-base" />}
      {children}
    </>
  );
}

export function HeaderPrimaryButton({
  href,
  onClick,
  icon,
  children,
  type = "button",
  disabled,
  ariaLabel,
}: ButtonInnerProps) {
  if (href) {
    return (
      <Link href={href} className={PRIMARY_CLASS} aria-label={ariaLabel}>
        {renderInner({ icon, children })}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      className={PRIMARY_CLASS}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {renderInner({ icon, children })}
    </button>
  );
}

export function HeaderSecondaryButton({
  href,
  onClick,
  icon,
  children,
  type = "button",
  disabled,
  ariaLabel,
}: ButtonInnerProps) {
  if (href) {
    return (
      <Link href={href} className={SECONDARY_CLASS} aria-label={ariaLabel}>
        {renderInner({ icon, children })}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      className={SECONDARY_CLASS}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {renderInner({ icon, children })}
    </button>
  );
}
