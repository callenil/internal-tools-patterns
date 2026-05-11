# design

Shared visual language for the CW internal-tools fleet — drop into a
new Next.js + Tailwind v4 project to get the same orange-and-slate
look as Email Search and ScrapeGlobal.

## Files in this folder

| File | Audience | Purpose |
|---|---|---|
| [`KICKOFF.md`](./KICKOFF.md) | Claude in another project's session | Paste-into-Claude install task. Audits, asks Calle 3 inputs, fetches the canonical files from `files/`, writes them into the target project. ~10 min from start to "looks like Email Search". |
| [`REFERENCE.md`](./REFERENCE.md) | Humans | Design doc. Why the pattern exists, the token layer, the 12 components, layout primitives, what's intentional, what to leave alone. |
| [`files/`](./files/) | (used by KICKOFF) | The actual source files — globals.css, layout.tsx, the 12 components, the 3 shadcn overrides. Each file is at `files/src/<path>` mirroring where it goes in the target project. |

## How to use

In Claude Code (or Claude Cowork) inside the **target project's
directory**, send:

> *Fetch this file and apply it as an install task. Audit first, then
> ask me whatever inputs you need before making changes.*
>
> `https://raw.githubusercontent.com/callenil/internal-tools-patterns/main/design/KICKOFF.md`

The session takes it from there.

## What it installs

```
<target-project>/
├── src/app/
│   ├── globals.css           ← token layer + Material Symbols rule + focus-visible + animations
│   ├── layout.tsx            ← root layout with <link> for Material Symbols, skip-to-main, NavigationProgress, ToastViewport
│   └── not-found.tsx         ← branded 404
├── src/components/
│   ├── page-header.tsx       ← PageHeader + HeaderPrimaryButton + HeaderSecondaryButton
│   ├── dashboard-footer.tsx  ← Bottom footer
│   ├── navigation-progress.tsx ← Top progress bar on route changes
│   ├── nav.tsx               ← Sticky top nav with mobile hamburger (template — adapt navItems)
│   └── ui/
│       ├── material-icon.tsx
│       ├── section-card.tsx
│       ├── empty-state.tsx
│       ├── status-badge.tsx  ← + TagPill + TypeEyebrow
│       ├── tab-pills.tsx     ← + FilterFunnelButton
│       ├── spinner.tsx
│       ├── toast.tsx         ← ToastViewport + showToast()
│       ├── button.tsx        ← shadcn override (orange primary + slate outline + TMS hover)
│       ├── input.tsx         ← shadcn override (rounded-lg, orange focus ring)
│       └── label.tsx         ← shadcn override
└── src/lib/
    └── format-date.ts        ← "today" / "yesterday" / "3d ago" / "May 10"
```

## What it does NOT install

- Domain-specific components (build in your project, compose from the
  primitives)
- Auth (use `auth/KICKOFF.md` for that)
- MCP server (use `mcp-server/KICKOFF.md` for that)
- Project-specific page layouts (build with the template in
  KICKOFF.md Step 3e)
