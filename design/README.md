# design pattern (planned)

Light-only TMS-aligned design system port — drop into a new internal-tool
project to get the same visual language as Email Search and ScrapeGlobal.

**What this will ship when written:**

- `globals.css` design token layer (orange `--primary`, slate scale, focus rings, route-progress animation, prefers-reduced-motion)
- `<MaterialIcon>`, `<SectionCard>`, `<EmptyState>`, `<StatusBadge>`, `<TabPills>`, `<Spinner>` reusable components
- `<PageHeader>` with `HeaderPrimaryButton` / `HeaderSecondaryButton` helpers
- `<DashboardFooter>` and `<NavigationProgress>`
- Material Symbols via `<link>` (the only reliable load in Next 16 + Turbopack)
- System-font stack matching ScrapeGlobal — no `next/font/google` (build issue under Next 16)

Status: not yet written. Email Search has all the components; the
distillation into a portable kickoff is on the to-do list.

If you want to use the design system before this pattern is ready,
copy the relevant files manually from
[email-search-system](https://github.com/callenil/email-search-system) under
`src/components/ui/` and `src/components/page-header.tsx` plus
`src/app/globals.css`.
