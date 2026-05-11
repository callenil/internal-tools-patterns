"use client";
import { MaterialIcon } from "./material-icon";

/**
 * Count-badge tab-pills (the "ALL 13 / ACTIVE 12 / PAUSED 0 / BROKEN 1"
 * pattern from ScrapeGlobal). Ported verbatim. Use whenever the user is
 * filtering a list by a single mutually-exclusive status.
 *
 * Usage:
 *   <TabPills
 *     value={direction}
 *     onChange={setDirection}
 *     tabs={[
 *       { key: "any", label: "Both" },
 *       { key: "sent", label: "Sent" },
 *       { key: "received", label: "Received" },
 *     ]}
 *     counts={{ any: 1234, sent: 678, received: 556 }}
 *   />
 */
export type TabPillItem<K extends string = string> = {
  key: K;
  label: string;
};

export function TabPills<K extends string = string>({
  value,
  onChange,
  tabs,
  counts,
  rightSlot,
}: {
  value: K;
  onChange: (key: K) => void;
  tabs: TabPillItem<K>[];
  counts?: Partial<Record<K, number>>;
  /** Optional right-side element (e.g. filter funnel button). */
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map((tab) => {
          const isActive = value === tab.key;
          const count = counts?.[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition-colors duration-200 ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {rightSlot ? <div className="ml-auto">{rightSlot}</div> : null}
    </div>
  );
}

/**
 * Square orange filter-funnel button — sits on the right of TabPills.
 * Has an optional red dot indicator for "advanced filters active".
 */
export function FilterFunnelButton({
  active,
  hasActiveFilters,
  onClick,
  ariaLabel = "Filters",
}: {
  active: boolean;
  hasActiveFilters: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={active}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition-colors duration-200 hover:bg-[var(--primary-hover)]"
    >
      <MaterialIcon name="filter_list" size="text-lg" />
      {hasActiveFilters ? (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      ) : null}
    </button>
  );
}
