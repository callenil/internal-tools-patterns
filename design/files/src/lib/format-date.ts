/**
 * Human-friendly relative-date formatter for in-app date columns. Returns:
 *   "today"          if same calendar day
 *   "yesterday"      if 1 calendar day before today
 *   "Nd ago"         if 2-6 days ago
 *   "May 10"         if same year but >6 days ago
 *   "May 10, 2025"   if different year
 *
 * Pair with title={iso} on the rendered <span> so users can hover for the
 * exact timestamp when they need precision.
 */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const now = new Date();
  const dayMs = 86_400_000;

  // Calendar-day diff (compare midnight-to-midnight, not 24h windows).
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startToday - startTarget) / dayMs);

  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff}d ago`;

  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString("en-GB", opts);
}
