import { MaterialIcon } from "./material-icon";

/**
 * Inline loading spinner. Material Symbols progress_activity glyph
 * with animate-spin. Use anywhere we'd otherwise show "Loading…" text.
 */
export function Spinner({
  label,
  size = "text-base",
  className = "",
}: {
  /** Optional caption to the right of the spinner. */
  label?: string;
  /** Tailwind text-* size for the icon. Default text-base (16px). */
  size?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-slate-500 ${className}`.trim()}>
      <MaterialIcon name="progress_activity" size={size} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
