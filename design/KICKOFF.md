# Task — install the shared design language in this project

> Paste this file's contents into a Claude Code session in any
> internal-tool project that should match the CW fleet's visual
> language (Email Search, ScrapeGlobal). The session reads this,
> audits, asks Calle three inputs, fetches the canonical files from
> the public patterns repo, and installs them in 10 minutes.
>
> See `REFERENCE.md` for design rationale; this doc is execution-only.

---

## Goal

Drop the same design tokens, component family, and layout primitives
used by Email Search into this project. After install, every page in
the project looks like a sibling of Email Search and ScrapeGlobal:
orange `#e0944d` accent, slate-based neutrals, Material Symbols icons,
brand-first tab titles, focus-visible rings, skip-to-main link,
mobile hamburger nav.

---

## Step 1 — audit before asking

⚠️ **Recurse into `src/`** — don't just `ls` top-level.

```bash
# Stack check — Next.js + Tailwind v4 required
grep -E '"next":|"tailwindcss":' package.json

# Existing design tokens?
grep -l "primary-tint-bg\|--primary: #e0944d" src/app/globals.css 2>/dev/null

# Existing component primitives?
find src/components -type f -name "page-header.tsx" 2>/dev/null
find src/components/ui -type f \( -name "material-icon.tsx" \
                                -o -name "section-card.tsx" \
                                -o -name "tab-pills.tsx" \
                                -o -name "spinner.tsx" \
                                -o -name "toast.tsx" \) 2>/dev/null

# Existing layout primitives?
find src/components -type f -name "navigation-progress.tsx" 2>/dev/null
find src/components -type f -name "dashboard-footer.tsx" 2>/dev/null

# Material Symbols already loaded?
grep -l "Material+Symbols+Outlined" src/app/layout.tsx 2>/dev/null

# Custom 404?
ls src/app/not-found.tsx 2>/dev/null
```

**Branch outcomes:**

| Finding | Action |
|---|---|
| Stack isn't Next.js + Tailwind v4 | **Stop.** Pattern is for that stack only. |
| Tokens + most components already exist | Confirm with Calle whether to update / overwrite (pulls in latest from patterns repo) or skip. |
| Partial install (some files exist) | Read what's there; ask Calle whether to overwrite each file or keep. |
| Nothing exists | Proceed with full install. |

---

## Step 2 — ask Calle these three questions in ONE message

```
I'm installing the design pattern in <current-project>. I need three
inputs from you to proceed:

  1. APP NAME — short name to show in the nav and browser tabs.
     Examples: "Tender Hunt", "Forge", "ScrapeGlobal". Reply with the
     name only.

  2. APP ICON GLYPH — Material Symbols Outlined name for the orange
     logo box. Browse at https://fonts.google.com/icons (any Outlined
     icon works). Examples:
       Email Search → manage_search (magnifying glass)
       Tender Hunt  → gavel  (or "request_quote")
       Forge        → forge  (anvil) — yes, this is a real Material icon
       ScrapeGlobal → manage_search or globe (public)
     Reply with the icon name only (e.g. "gavel").

  3. PRIMARY BRAND COLOUR — hex code. Default: #e0944d (the CW orange).
     Only override if this project belongs to a different brand with
     its own accent (e.g. Vinjournalen might be its own shade). Reply
     "default" or a different hex like "#3d684e".

Reply with all three values and I'll execute the install.
```

Validate:
- App name is non-empty, fits in ~12 chars (wider truncates in mobile nav)
- Glyph is a valid Material Symbols name (one word, lower_snake_case)
- Colour is `#` followed by 3 or 6 hex digits, or the literal string "default"

---

## Step 3 — install the files

All files live in the public patterns repo at:

```
https://raw.githubusercontent.com/callenil/internal-tools-patterns/main/design/files/<path>
```

Each file path here mirrors where it goes in the target project — fetch and
write to the same relative location.

### 3a) Fetch and write the 17 files

For each file below, use **WebFetch** to read the raw URL, then **Write**
to the target project at the relative path (under the project root).

If the project doesn't use the `@/` import alias for `src/`, adjust the
imports in each file after fetching. The canonical setup is `"@/*":
["./src/*"]` in `tsconfig.json`.

| Source URL (in patterns repo) | Write to (in target project) |
|---|---|
| `design/files/src/app/globals.css` | `src/app/globals.css` |
| `design/files/src/app/layout.tsx` | `src/app/layout.tsx` |
| `design/files/src/app/not-found.tsx` | `src/app/not-found.tsx` |
| `design/files/src/components/page-header.tsx` | `src/components/page-header.tsx` |
| `design/files/src/components/dashboard-footer.tsx` | `src/components/dashboard-footer.tsx` |
| `design/files/src/components/navigation-progress.tsx` | `src/components/navigation-progress.tsx` |
| `design/files/src/components/ui/material-icon.tsx` | `src/components/ui/material-icon.tsx` |
| `design/files/src/components/ui/section-card.tsx` | `src/components/ui/section-card.tsx` |
| `design/files/src/components/ui/empty-state.tsx` | `src/components/ui/empty-state.tsx` |
| `design/files/src/components/ui/status-badge.tsx` | `src/components/ui/status-badge.tsx` |
| `design/files/src/components/ui/tab-pills.tsx` | `src/components/ui/tab-pills.tsx` |
| `design/files/src/components/ui/spinner.tsx` | `src/components/ui/spinner.tsx` |
| `design/files/src/components/ui/toast.tsx` | `src/components/ui/toast.tsx` |
| `design/files/src/components/ui/button.tsx` | `src/components/ui/button.tsx` |
| `design/files/src/components/ui/input.tsx` | `src/components/ui/input.tsx` |
| `design/files/src/components/ui/label.tsx` | `src/components/ui/label.tsx` |
| `design/files/src/lib/format-date.ts` | `src/lib/format-date.ts` |

### 3b) Substitute placeholders in `layout.tsx`

After fetching `src/app/layout.tsx`, find and replace **two** occurrences
of `<APP_NAME>` with the app name from Step 2 question 1, and replace
`<one-line app description>` with a one-line description that fits the
project.

Example for Tender Hunt:

```diff
- default: "<APP_NAME>",
- template: "<APP_NAME> — %s",
+ default: "Tender Hunt",
+ template: "Tender Hunt — %s",

- description: "<one-line app description>",
+ description: "Tender concierge matching CW tenders to suppliers.",
```

### 3c) Substitute the primary colour (only if Step 2 question 3 wasn't "default")

In `src/app/globals.css`, find the `--primary` token block and replace
the three hex values:

```css
--primary: #e0944d;                                   /* new hex */
--primary-hover: #d0853f;                             /* new hex, slightly darker */
--primary-tint-bg: rgba(224, 148, 77, 0.05);          /* same as new --primary but at 0.05 alpha */
--primary-tint-border: rgba(224, 148, 77, 0.2);       /* same at 0.2 alpha */
```

For the tint values, decompose the new hex into RGB:
- `#3d684e` → `rgb(61, 104, 78)` → tints become `rgba(61, 104, 78, 0.05)` and `rgba(61, 104, 78, 0.2)`

For hover, pick a shade 10–15% darker than the base. The Email Search
default's hover is `#d0853f` (orange darkened by ~10%).

Show the proposed values to Calle for confirmation before writing.

### 3d) Add a starter `<Nav>` component

The Nav is project-specific (different pages per project), so it
isn't part of the auto-installed file set. Scaffold a starter at
`src/components/nav.tsx` with the app name + icon glyph from Step 2
question 1 + 2:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/material-icon";

/**
 * Top sticky navigation — shared visual language across the CW
 * internal-tools fleet. Orange logo box + uppercase pills + active-
 * state highlight + mobile hamburger drawer below the lg: breakpoint.
 *
 * Adapt navItems below to this project's actual pages.
 */
export function Nav({
  email,
  isOwner,
}: {
  email: string;
  isOwner: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  // EDIT THIS — list of nav items for this project's pages.
  // Use section="primary" for everyone-can-see items, "admin" for
  // owner-only ones (will be hidden when !isOwner).
  const navItems = [
    { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard", tooltip: "Project home", section: "primary" as const },
    { href: "/help", label: "Help", active: pathname.startsWith("/help"), tooltip: "Reference docs", section: "primary" as const },
    ...(isOwner ? [
      { href: "/admin/users", label: "Users", active: pathname.startsWith("/admin/users"), tooltip: "Manage team", section: "admin" as const },
      // Add more admin items as the project grows
    ] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
              <MaterialIcon name="<APP_ICON_GLYPH>" size="text-xl" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-base font-bold uppercase tracking-wide text-slate-900">
                <APP_NAME>
              </span>
            </span>
            <span className="text-base font-bold uppercase tracking-wide text-slate-900 sm:hidden">
              <APP_INITIALS>
            </span>
          </Link>

          {/* Wide-viewport nav (>= lg) */}
          <nav className="hidden min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs lg:flex lg:text-sm">
            {navItems.map((it, i) => {
              const showSep = it.section === "admin" && navItems[i - 1]?.section === "primary";
              return (
                <span key={it.href} className="flex items-center">
                  {showSep && <span className="mx-2 h-4 w-px bg-slate-200" aria-hidden />}
                  <Link
                    href={it.href}
                    title={it.tooltip}
                    className={`rounded-md px-3 py-1.5 font-semibold uppercase transition-colors duration-200 ${
                      it.active ? "bg-[var(--primary)] text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {it.label}
                  </Link>
                </span>
              );
            })}
          </nav>

          {/* Narrow-viewport hamburger (< lg) */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <MaterialIcon name={menuOpen ? "close" : "menu"} size="text-xl" />
          </button>
        </div>

        {/* Right: email + sign out */}
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="hidden max-w-[220px] truncate text-xs text-slate-500 2xl:inline" title={email}>
            {email}
          </span>
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-red-700"
            >
              <MaterialIcon name="logout" size="text-base" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav className="border-t border-slate-200 bg-white lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col gap-0.5 px-3 py-2">
            {navItems.map((it, i) => {
              const showSep = it.section === "admin" && navItems[i - 1]?.section === "primary";
              return (
                <li key={it.href}>
                  {showSep && <div className="my-1 h-px bg-slate-200" aria-hidden />}
                  <Link
                    href={it.href}
                    onClick={() => setMenuOpen(false)}
                    title={it.tooltip}
                    className={`block rounded-md px-3 py-2 text-sm font-semibold uppercase transition-colors duration-200 ${
                      it.active ? "bg-[var(--primary)] text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
```

Replace `<APP_NAME>`, `<APP_ICON_GLYPH>`, `<APP_INITIALS>` (2-3 letter
fallback like "EM" for Email Search, "TH" for Tender Hunt) with the
values from Step 2.

For a canonical example with admin section + tooltips on every item,
see Email Search's
[`src/components/nav.tsx`](https://github.com/callenil/email-search-system/blob/main/src/components/nav.tsx).

### 3e) Page-template guidance

Every page in this project should follow the wrapper pattern. Tell
Calle the template to use for new pages:

```tsx
// src/app/<route>/page.tsx
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { PageHeader } from "@/components/page-header";
import { DashboardFooter } from "@/components/dashboard-footer";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "<Page name>",   // becomes "<App Name> — <Page name>"
};

export default async function MyPage() {
  const me = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Nav email={me.email} isOwner={me.role === "owner"} />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6">
        <PageHeader title="<Page heading>" />
        {/* content */}
      </main>
      <DashboardFooter />
    </div>
  );
}
```

The `id="main-content" tabIndex={-1}` is the target for the
skip-to-main link in `layout.tsx`.

### 3f) Commit

```bash
git add src/app/globals.css src/app/layout.tsx src/app/not-found.tsx \
        src/components/page-header.tsx src/components/dashboard-footer.tsx \
        src/components/navigation-progress.tsx src/components/nav.tsx \
        src/components/ui/ \
        src/lib/format-date.ts

git commit -m "design: install CW fleet visual language

Brings in the shared design tokens, component family, and layout
primitives from internal-tools-patterns/design. After this commit
the project shares the look of Email Search + ScrapeGlobal:

  - Orange #e0944d accent (--primary token)
  - Slate-based neutrals, light-only background
  - Material Symbols Outlined icons via <link>
  - System font stack (no next/font/google)
  - <PageHeader> + <DashboardFooter> + <NavigationProgress>
  - <Nav> with mobile hamburger
  - <MaterialIcon> <SectionCard> <EmptyState> <StatusBadge>
    <TabPills> <Spinner> <ToastViewport>
  - Shadcn <Button> <Input> <Label> re-themed
  - focus-visible rings, skip-to-main link, prefers-reduced-motion
  - Branded /not-found page
  - Brand-first tab title template
"
git push
```

---

## Step 4 — hand-off message to Calle

Output exactly:

```
Design language installed (commit <hash>). Push triggered Vercel
redeploy.

What to check on production after the deploy lands:

1. /login (if it exists) — the form should look like Email Search's:
   no card, mx-auto flex min-h-screen max-w-md flex-col justify-center,
   bold heading, orange Send button.

2. /dashboard (if it exists) — orange logo box top-left with the
   <APP_ICON_GLYPH> icon, "<APP_NAME>" wordmark, nav pills with
   active-state orange highlight, search content / page content
   below the PageHeader.

3. Resize browser narrow (under ~1000px) — nav pills collapse into a
   hamburger icon. Click → drawer drops down.

4. Open multiple tabs in different pages — browser tab titles read
   "<APP_NAME> — Dashboard", "<APP_NAME> — Help", etc.

5. Hover any button — orange darkens on hover. Press Tab on any page
   — orange focus ring appears on the focused element.

6. Visit a non-existent URL like /this-doesnt-exist — branded 404 with
   "Back to Dashboard" button.

If anything looks off (icon doesn't render, colours wrong, hover dead),
paste the screenshot here.
```

---

## Step 5 — verify (you, automatically, after Calle confirms redeploy)

```bash
URL=<production-url>

# Tab title check — fetch /login (or any public page), grep <title>
curl -sS "$URL/login" | grep -oP '<title>[^<]*</title>'
# Expect: <title><APP_NAME>...</title> — brand should appear first

# Material Symbols link present
curl -sS "$URL/login" | grep -c "fonts.googleapis.com/icon"
# Expect: 1 (or higher if it loads more than once)

# 404 page
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/this-does-not-exist"
# Expect: 200 (Next renders not-found.tsx with 200 status)

# CSS — token check via static fetch isn't directly possible, but the
# build should succeed; if Vercel build failed, the deploy URL would
# 502 / 503. So:
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/login"
# Expect: 200
```

---

## Things you must NOT do

- Don't add new top-level brand colours. The single accent is
  `--primary`. Variation comes from semantic context (slate for
  chrome, green/amber/red for status pills).
- Don't switch fonts to `next/font/google` — it breaks Next 16 +
  Turbopack. Stick with the system font stack defined in
  `globals.css`.
- Don't load Material Symbols via CSS `@import url()` — silently
  fails in Next 16. Only the `<link>` in `layout.tsx` is reliable.
- Don't introduce `prefers-color-scheme: dark` styles. The fleet is
  light-only by design.
- Don't override `focus-visible` per-element. The global rule in
  `globals.css` handles every interactive element uniformly.
- Don't add `gray-` / `zinc-` / `neutral-` Tailwind classes. Use
  slate everywhere so the palette stays unified.
- Don't bloat the component family. If a new project needs a widget,
  build it locally — don't promote it to this pattern unless 3+
  projects need the same widget.

---

## Done definition

- [ ] Stack check passed (Next.js + Tailwind v4 detected)
- [ ] 17 files fetched from patterns repo and written to project
- [ ] `<APP_NAME>` and description substituted in `layout.tsx`
- [ ] `<APP_ICON_GLYPH>` + `<APP_NAME>` + `<APP_INITIALS>` substituted
      in `nav.tsx`
- [ ] Primary colour swapped (if user gave a non-default)
- [ ] Nav starter scaffolded with project-appropriate navItems
- [ ] Single commit pushed
- [ ] Vercel redeploy completes successfully (status 🟢)
- [ ] Calle has eyeballed `/login`, `/dashboard`, and a 404 page on
      production and confirmed the look matches Email Search

When all nine are checked, tell Calle "Design language installed —
<project> now matches the CW fleet visual standard." Stop.
