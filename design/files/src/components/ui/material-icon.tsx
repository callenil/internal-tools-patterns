/**
 * Material Symbols Outlined wrapper. The font is loaded via <link> in
 * src/app/layout.tsx; the .material-symbols-outlined class CSS lives in
 * globals.css. This component just wraps a <span> for ergonomic JSX.
 *
 * Usage:
 *   <MaterialIcon name="add" />
 *   <MaterialIcon name="delete" size="text-base" className="text-red-700" />
 *   <MaterialIcon name="progress_activity" className="animate-spin" />
 *
 * Ported from sibling project ScrapeGlobal (app/_components/material-icon.tsx).
 */
export function MaterialIcon({
  name,
  size = "text-lg",
  className = "",
}: {
  name: string;
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${size} ${className}`.trim()}
      aria-hidden
    >
      {name}
    </span>
  );
}
