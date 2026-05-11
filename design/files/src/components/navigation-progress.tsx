"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin orange progress strip across the top of the page that animates
 * for ~700ms after every route change. No deps, no wrapping required —
 * just drop it once in the root layout and it picks up every navigation.
 *
 * Limitation: animation fires AFTER navigation completes, not during
 * (Next 16 doesn't expose a direct "navigation in flight" signal without
 * a third-party library). In practice this still gives the user a clear
 * "yes, the click registered, you've moved" cue, and reads as faster
 * than a blank gap.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 700);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!animating) return null;

  return (
    <div
      aria-hidden
      className="route-progress-bar pointer-events-none fixed left-0 top-0 z-[60] h-[3px] w-full bg-[var(--primary)]"
      style={{ transformOrigin: "left center" }}
    />
  );
}
