# Design pattern — reference

> Read this before installing. Explains the visual language every CW
> internal tool shares, why it's structured the way it is, and what
> not to touch. For the actual install task, see `KICKOFF.md`.

---

## What it gives you

Add this pattern to any Next.js + Tailwind v4 project and you get the
visual + interaction language used by Email Search and ScrapeGlobal:

- **Orange `#e0944d` accent** everywhere (buttons, active nav, focus
  rings, count badges). Single brand colour.
- **Slate-based neutrals**, light-only background (`#f8f9fa`)
- **Material Symbols Outlined** icon set (one icon set across the app)
- **System font stack** — no `next/font/google` (breaks Next 16 +
  Turbopack)
- **Reusable component family** — MaterialIcon, SectionCard, EmptyState,
  StatusBadge / TagPill / TypeEyebrow, TabPills + FilterFunnelButton,
  Spinner, ToastViewport
- **Layout primitives** — Nav (with mobile hamburger), PageHeader (with
  primary + secondary button helpers), DashboardFooter, NavigationProgress
- **A11y baseline** — focus-visible rings, skip-to-main link,
  `prefers-reduced-motion` honoured, semantic landmarks
- **Branded 404 / not-found page**
- **Tab title template** — `Project Name — Page Name` so multi-tab
  workflows stay sortable

In ~10 minutes a brand-new Next.js project goes from "default
Tailwind starter" to "looks like Email Search / ScrapeGlobal."

---

## Why centralise this

Three reasons:

1. **Fleet coherence.** When a colleague switches between Email
   Search, Tender Hunt, Forge, and ScrapeGlobal in one work session,
   the consistent visual language reduces cognitive load —
   keyboard shortcuts, button placement, error styling all transfer.
2. **Speed.** New project setup time goes from "two days fiddling
   with Tailwind + shadcn" to "one paste".
3. **Consistency under drift.** Without this pattern, every project's
   design slowly diverges. With it, version upgrades and design tweaks
   ripple through everything via re-running the kickoff.

---

## The token layer

Three CSS variables anchor the whole system. Every project's
`globals.css` defines them, every component references them. Change
these → entire UI re-themes.

```css
:root {
  --background: #f8f9fa;             /* slate-50 — page body */
  --foreground: #171717;             /* default text colour */

  --primary: #e0944d;                /* THE accent — orange */
  --primary-hover: #d0853f;          /* darker on hover */
  --primary-foreground: #ffffff;     /* text on primary bg */
  --primary-tint-bg: rgba(224, 148, 77, 0.05);    /* selected row, quick-action card */
  --primary-tint-border: rgba(224, 148, 77, 0.2); /* same — for borders */

  --beverage-green: #3d684e;         /* rare secondary accent */
}
```

**Don't introduce ad-hoc colours.** If you find yourself wanting
"a slightly different orange for this widget" — don't. Use the same
`--primary` everywhere. Variation comes from semantic context (slate
for chrome, green/amber/red for status pills), not from custom shades.

---

## The component family

12 reusable building blocks. Each lives at a predictable path
(`src/components/ui/<name>.tsx` or `src/components/<name>.tsx`).
Together they cover ~90% of internal-tool UI surface.

| Component | Where | What it solves |
|---|---|---|
| `<MaterialIcon>` | `ui/material-icon.tsx` | Single wrapper for every icon. `<MaterialIcon name="add" />`. |
| `<SectionCard>` | `ui/section-card.tsx` | Rectangular content block with optional title strip. |
| `<EmptyState>` | `ui/empty-state.tsx` | Centred placeholder with icon + message + optional action. |
| `<StatusBadge>` / `<TagPill>` / `<TypeEyebrow>` | `ui/status-badge.tsx` | The pill family — success/warning/error/neutral pills, category tags, uppercase eyebrows. |
| `<TabPills>` + `<FilterFunnelButton>` | `ui/tab-pills.tsx` | Count-badge tab pattern ("ALL 13 / ACTIVE 12 / BROKEN 1") + orange funnel-icon filter button. |
| `<Spinner>` | `ui/spinner.tsx` | Animated `progress_activity` icon, used in place of "Loading…" text. |
| `<ToastViewport>` + `showToast()` | `ui/toast.tsx` | Stacked bottom-right toasts via `window.dispatchEvent`. |
| `<PageHeader>` + `<HeaderPrimaryButton>` + `<HeaderSecondaryButton>` | `page-header.tsx` | Bold h1 + optional actions on the right. Buttons match ScrapeGlobal's rounded-lg primary/secondary spec. |
| `<DashboardFooter>` | `dashboard-footer.tsx` | Sticky-bottom footer, white bg, slate divider, "sensitive data" reminder. |
| `<NavigationProgress>` | `navigation-progress.tsx` | Thin orange bar that animates at top on every route change. |
| `<Nav>` | `nav.tsx` | Sticky top nav with orange logo box, uppercase pills, active-state highlight, mobile hamburger drawer. Per-project — the kickoff scaffolds a starter version. |
| Override `<Button>` `<Input>` `<Label>` | `ui/button.tsx`, `ui/input.tsx`, `ui/label.tsx` | Shadcn primitives re-themed: `rounded-lg`, `bg-[var(--primary)]`, orange focus ring. |

Anything more domain-specific (e.g. Email Search's `<AggregateCards>`,
`<ResultList>`, `<SearchForm>`) lives in each project's own
`src/components/` tree, NOT in this pattern. The pattern provides
primitives; each project composes them.

---

## Layout primitives

### Page wrapper

Every authenticated page wraps in:

```tsx
<div className="flex min-h-screen flex-col">
  <Nav email={me.email} isOwner={me.role === "owner"} />
  <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6">
    <PageHeader title="…" actions={…} />
    {/* page content */}
  </main>
  <DashboardFooter />
</div>
```

- `flex min-h-screen flex-col` pins the footer to the bottom of short
  pages
- `max-w-7xl` (80rem) is the canonical content width — wider pages
  feel sprawling, narrower feels cramped
- `id="main-content" tabIndex={-1}` is the target for the skip-to-main
  accessibility link in `layout.tsx`

### Root layout

`app/layout.tsx` is the single place that loads Material Symbols
(via `<link>`, NOT via `@import url()` — the latter silently fails on
Next 16 + Turbopack), mounts `<NavigationProgress>` + `<ToastViewport>`,
and renders the skip-to-main link.

```tsx
<html lang="en" className="h-full antialiased">
  <head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" />
  </head>
  <body className="bg-slate-50 text-slate-900 min-h-full flex flex-col">
    <a href="#main-content" className="sr-only focus:not-sr-only …">Skip to main content</a>
    <NavigationProgress />
    {children}
    <ToastViewport />
  </body>
</html>
```

---

## What's intentional (don't undo these in your project)

- **Light-only.** No `prefers-color-scheme: dark` styles. The CW
  internal tools are explicitly light-only — adding dark mode is
  weeks of work for no benefit in our use case.
- **No `next/font/google`.** It trips a build error on Next 16 +
  Turbopack. The system font stack (`ui-sans-serif, system-ui,
  -apple-system, "Segoe UI", Roboto, ...`) gives identical
  modern-app feel without the build hazard.
- **Material Symbols loaded via `<link>` in `<head>`,** not via
  CSS `@import url()`. The latter fails silently in Next 16's
  Turbopack and your icons render as literal text
  ("alternate_email" instead of the glyph).
- **System font stack lives in `--font-sans` CSS variable.** Tailwind
  v4 `@theme inline` resolves to this. Don't `font-family: "Some
  Specific Font";` directly anywhere.
- **Only ONE accent colour.** Orange `--primary`. The hover and tint
  variants are derived from it. No competing brand colours.
- **Slate scale for everything not-orange.** No `gray-` / `zinc-` /
  `neutral-` — slate everywhere so the palette stays unified.
- **`focus-visible` (not `focus`) for rings.** Mouse clicks don't
  trigger outlines; keyboard Tab does. Best of both worlds.

---

## Customization

The kickoff asks for three things, and that's it:

1. **App name** — used in `<Nav>` logo text and tab title template
   ("Tender Hunt — Dashboard", etc.)
2. **App icon glyph** — Material Symbols name for the logo box icon.
   Email Search uses `manage_search` (magnifying glass). Tender Hunt
   might use `gavel`. Forge might use `forge` (yes, that's a real
   Material Symbols icon). Browse at
   https://fonts.google.com/icons.
3. **Primary brand colour** — defaults to `#e0944d` (CW orange). Only
   override if this project explicitly belongs to a different brand
   with its own accent (e.g. Vinjournalen might be its own shade).
   Most CW projects share the orange.

Everything else is fixed across the fleet.

---

## What this pattern does NOT do

- **Domain-specific components** (Email Search's result list,
  ScrapeGlobal's project rows, etc.). Build those in the project,
  composed from the primitives this pattern ships.
- **Domain logic / data fetching / auth.** Pair with `auth/KICKOFF.md`
  and `mcp-server/KICKOFF.md` for those.
- **Dark mode.** Intentional — see above.
- **Custom typography scales.** The canonical scale is `text-3xl` /
  `xl` / `base` / `sm` / `xs` / `[10px]` / `[11px]`. Don't add new
  sizes. Don't load custom display fonts.
- **Animation library.** A few keyframe animations (route progress,
  spinner spin, animate-pulse) live in `globals.css`. No Framer
  Motion / Lottie / GSAP — they're overkill for internal tools.

---

## Canonical example

Live in production today (May 2026):

- **Email Search** — every component this pattern ships is in use:
  https://email-search-system-delta.vercel.app (the dashboard, contact
  pages, admin pages, etc.)
- **Codebase** —
  [email-search-system](https://github.com/callenil/email-search-system):
  - `src/app/globals.css` (token layer)
  - `src/app/layout.tsx` (Material Symbols `<link>`, skip-to-main,
    NavigationProgress, ToastViewport)
  - `src/components/ui/*` (the component family)
  - `src/components/nav.tsx`, `page-header.tsx`, `dashboard-footer.tsx`,
    `navigation-progress.tsx`
- **ScrapeGlobal** is the sibling project this design language was
  originally distilled from.

When in doubt, copy from Email Search and adapt the project-specific
text. The components are battle-tested in production.

---

## Roadmap

- **Storybook / Ladle** if the component count grows past ~20 and
  you want a visual catalogue. Not needed at current scale.
- **`@callenil/internal-tools-design` npm package** if more than 4
  projects need centralised version-managed components. For now,
  each project gets a copy at install time — drift between projects
  is minor and contained.
- **More granular tokens** (semantic colour roles like
  `--color-success-bg`) if accessibility audits ever demand higher
  contrast ratios or theming flexibility. Currently the
  green-100/amber-100/red-100 Tailwind defaults are fine.

---

End of reference. Read `KICKOFF.md` next when you're ready to install.
