# Convention 02 — Env-var naming

> A boring but high-ROI convention. Pick names by rule, not by taste,
> so every project's `.env.local.example` reads the same way and any
> dev (human or Claude) can predict what variable to look for.

---

## The rules

### 1. Cross-project calls

When project **A** calls project **B**, project A holds:

```bash
<B_SLUG>_API_URL=https://b.vercel.app
<B_SLUG>_API_KEY=esk_…
```

`<B_SLUG>` is the slug from the service registry
(`03-service-registry.md`). Use SCREAMING_SNAKE_CASE.

Examples:

```bash
# In Tender Hunt's .env.local, calling Email Search:
EMAIL_SEARCH_API_URL=https://email-search-system-delta.vercel.app
EMAIL_SEARCH_API_KEY=esk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# In Forge's .env.local, calling both:
EMAIL_SEARCH_API_URL=https://email-search-system-delta.vercel.app
EMAIL_SEARCH_API_KEY=esk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENDER_HUNT_API_URL=https://tender-hunt.vercel.app
TENDER_HUNT_API_KEY=esk_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
SCRAPEGLOBAL_API_URL=https://scrapeglobal.vercel.app
SCRAPEGLOBAL_API_KEY=esk_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
```

Predictable. Any new project that wants to call Email Search knows
exactly what env vars to add.

### 2. Project-owned secrets

Anything internal to the project (passcode, DB key, signing key,
provider tokens) uses the project's domain in the name:

```bash
ORG_PASSCODE=160114                # generic — it's per-project anyway
SENDGRID_WEBHOOK_PUBLIC_KEY=…
GITHUB_PAT=…                       # external service, no project prefix needed
BUG_REPORT_TO=dev@concealedwines.com
```

No prefix when the variable is universally about "the project itself"
or about a third-party service that's universally named.

### 3. Supabase — fixed names

Don't be creative here. Every project uses:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…
```

`NEXT_PUBLIC_` prefix → readable in the browser bundle. Without it →
server-only.

### 4. Public vs server-only

- `NEXT_PUBLIC_*` → exposed to the browser bundle. Use ONLY for values
  that genuinely need to reach client code (Supabase URL, Stripe
  publishable key, analytics tokens).
- Everything else → server-only. Default to no prefix.

If in doubt, server-only. You can always add `NEXT_PUBLIC_` later;
unringing the bell of accidentally leaking a secret to the browser
is painful.

### 5. Comments in `.env.local.example`

Every variable gets a 1-2 line comment above it explaining:
- What it's for
- Where to get the value
- What happens if it's unset

Example:

```bash
# GitHub Personal Access Token for triggering workflow_dispatch on
# the crawler repo. Required for "auto-freshen on search activity"
# feature. Token needs `workflow` scope. Without this, the default
# 6h cron still runs.
GITHUB_PAT=
```

This is what a colleague (or future you) reads on a fresh clone.
Make it teach.

---

## The project-slug registry

Standardised mapping from project name → env-var slug. Keep this in
sync with `conventions/03-service-registry.md`.

| Project | Slug (env-var prefix) | Subdomain / Vercel name |
|---|---|---|
| Email Search | `EMAIL_SEARCH` | `email-search-system-delta` |
| Tender Hunt | `TENDER_HUNT` | `tender-hunt` (TBD) |
| Forge | `FORGE` | `forge` (TBD) |
| ScrapeGlobal | `SCRAPEGLOBAL` | `scrapeglobal` (TBD) |
| eWineTag | `EWINETAG` | `ewinetag` (TBD) |
| Vinjournalen | `VINJOURNALEN` | `vinjournalen` (TBD) |
| Concealed Wines tender API | `CONCEALEDWINES` | (existing external API) |
| Business system (planned) | `BUSINESS_SYSTEM` | TBD |

When adding a new project, pick a slug and add it here BEFORE rolling
out any env vars. Once a slug is set, don't change it without
coordinating — it ripples across every consumer.

---

## What NOT to do

❌ Mixed case:
```bash
EmailSearchApiUrl=…       # No
emailSearchApiUrl=…       # No
```

❌ Dashes:
```bash
EMAIL-SEARCH-API-URL=…    # No (shells choke on this in some configs)
```

❌ Inconsistent suffixes:
```bash
EMAIL_SEARCH_URL=…
EMAIL_SEARCH_TOKEN=…
EMAIL_SEARCH_API=…
```

All three are wrong. Use `<SLUG>_API_URL` and `<SLUG>_API_KEY`
period.

❌ Embedding values in names:
```bash
EMAIL_SEARCH_PROD_URL=…   # No — use env-var scoping in Vercel for prod/preview/dev
EMAIL_SEARCH_STAGING_URL=…
```

The Vercel env-var UI lets you set different values per environment.
Use that, not duplicate variables.

❌ Reusing keys across projects:
```bash
# Project A holds Project B's API key.
# Project B holds Project A's API key.
# Both happen to be value "esk_aaa…aaa"  ← NO. NEVER.
```

Each pair has its own key. Compromise of A doesn't compromise B.

---

## Adoption checklist

For each project's `.env.local.example`:

- [ ] Supabase three: `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Auth gates (if using passcode pattern): `ORG_PASSCODE`,
      `EMAIL_DOMAIN_ALLOW_LIST`, `GEO_ALLOWED_COUNTRIES`
- [ ] For every project this one calls, add the pair:
      `<SLUG>_API_URL` + `<SLUG>_API_KEY`
- [ ] Project-specific configs (provider tokens, feature flags, etc.)
- [ ] Comments on every variable explaining its purpose

In Vercel:

- [ ] Set every variable for all 3 environments
      (Production / Preview / Development)
- [ ] Secret values get the "Sensitive" toggle
- [ ] Redeploy after adding new env vars (Vercel doesn't auto-redeploy
      on env changes)

---

End of convention. Pair with `01-agent-api-contract.md` (how to use
those URLs and keys) and `03-service-registry.md` (where they live).
