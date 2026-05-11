import { MaterialIcon } from "./material-icon";

/**
 * Status pills following ScrapeGlobal's design language.
 *
 * Variants:
 *   - "success" → green-100 / green-700
 *   - "warning" → amber-100 / amber-700 (for "running" / "paused" states)
 *   - "error"   → red-100 / red-700 (for "broken" / "failed" / "bounced")
 *   - "neutral" → slate-100 / slate-700 (industry tags, type labels)
 *
 * Use these instead of bespoke colored spans so colour usage stays
 * consistent across the app.
 */
const PILL_BASE =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";

export type StatusVariant = "success" | "warning" | "error" | "neutral";

const VARIANT_CLASS: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-700",
};

export function StatusBadge({
  variant,
  children,
  spinning = false,
  icon,
}: {
  variant: StatusVariant;
  children: React.ReactNode;
  spinning?: boolean;
  icon?: string;
}) {
  return (
    <span className={`${PILL_BASE} ${VARIANT_CLASS[variant]}`}>
      {spinning ? (
        <MaterialIcon name="progress_activity" size="text-sm" className="animate-spin" />
      ) : icon ? (
        <MaterialIcon name={icon} size="text-sm" />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Small uppercase tag pill for type / category labels (e.g. "WINE",
 * "ASSOCIATION", "PRODUCER"). Different from StatusBadge — denser,
 * not coloured by semantic state.
 */
export function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {children}
    </span>
  );
}

/**
 * Eyebrow / type label — ALL-CAPS, wide tracking, slate-500. For the
 * "PRODUCER" / "ASSOCIATION" labels on the right of project rows.
 */
export function TypeEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </span>
  );
}
