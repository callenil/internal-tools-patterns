# Convention 03 — Service registry

> Living index of every project in the CW internal-tools fleet. When
> a new project comes online, its row goes here. When you wonder "what
> URL is X at?" or "does Y expose tender data?" — this is where you
> look.

---

## How to use

- Bookmark this page.
- Before integrating project A → project B, look up B here. If B
  exists and exposes the endpoints you need, you know its URL,
  agent endpoint surface, and how to get a key.
- If B doesn't exist yet, add a stub row (`status: planned`) so
  future integrations can be scoped.

---

## Registry

| Project | Slug | Owner | Status | Production URL | Repo |
|---|---|---|---|---|---|
| **Email Search** | `EMAIL_SEARCH` | Calle | 🟢 live | `https://email-search-system-delta.vercel.app` | `github.com/callenil/email-search-system` (private) |
| **Email Search Crawler** | `EMAIL_SEARCH_CRAWLER` | Calle | 🟢 live | (no HTTP — GitHub Actions cron) | `github.com/callenil/email-search-crawler` (private) |
| **Email Search MCP** | `EMAIL_SEARCH_MCP` | Calle | 🟢 live | (stdio — runs in Claude Desktop) | `github.com/callenil/email-search-mcp` (private) |
| **Concealed Wines tender API** | `CONCEALEDWINES` | CW eng | 🟢 live | `https://www.concealedwines.com` | (external) |
| **Tender Hunt** | `TENDER_HUNT` | Calle | 🟡 in dev | TBD | TBD |
| **Forge** | `FORGE` | Calle | 🟡 in dev | TBD | TBD |
| **ScrapeGlobal** | `SCRAPEGLOBAL` | Calle | 🟡 in dev | TBD | `github.com/callenil/scrapeglobal` |
| **eWineTag** | `EWINETAG` | Calle | 🟡 in dev | TBD | TBD |
| **Vinjournalen** | `VINJOURNALEN` | Calle | 🟡 in dev | TBD | TBD |
| **Business system** | `BUSINESS_SYSTEM` | Calle | 🔵 planned | — | — |
| **WineTourism chat** | `WINETOURISM_CHAT` | Calle | 🟡 in dev | TBD | TBD |
| **ConcealedWines chat** | `CONCEALEDWINES_CHAT` | Calle | 🟡 in dev | TBD | TBD |
| **Crossword Wine Game** | `CROSSWORD` | Calle | 🟡 in dev | TBD | TBD |

Status legend:

| Emoji | Meaning |
|---|---|
| 🟢 live | Deployed, callable from other projects |
| 🟡 in dev | Repo exists, not yet deployed / not yet exposing the agent API |
| 🔵 planned | Idea / scoped, no repo yet |
| 🔴 deprecated | Don't depend on this — slated for removal |

---

## Per-project detail — Email Search

**Slug:** `EMAIL_SEARCH`
**URL:** `https://email-search-system-delta.vercel.app`
**Auth:** Bearer `esk_…`. Mint at `/admin/agents` (system) or
`/account/connect-claude` (per-user).
**Get a key:** ask Calle, or self-serve at the URLs above.

**Agent endpoints exposed:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/agent/search` | POST | Full-text search across indexed emails. Per-row SendGrid status enrichment. |
| `/api/agent/history/preview` | POST | Count + first/last date for a single address. |
| `/api/agent/history/export` | POST | CSV of full email history with an address. |
| `/api/agent/context` | GET | Business context — orgs, mailbox count, role definitions. |
| `/api/agent/contact/lookup` | POST | CRM contact details for one email. |
| `/api/agent/contact/search` | POST | Fuzzy CRM contact search by name/email/company. |
| `/api/agent/tender/lookup` | GET | Fetch tender details from the CW tender API (proxied). |
| `/api/agent/tender/active` | GET | List currently-active tenders (proxied). |
| `/api/agent/tender/exclusion-list` | POST | Distinct counterparty emails referenced in tender-X conversations — for Tender Hunt's do-not-mail logic. |

**Webhooks (Email Search consumes):**

| Source | Endpoint | Verification |
|---|---|---|
| SendGrid Event Webhook | `POST /api/sendgrid/webhook` | ECDSA P-256 signature, public key in `SENDGRID_WEBHOOK_PUBLIC_KEY` |

**Audit log:** every agent call is logged in the `audit_log` table.
Filter by action prefix `agent_*` to see cross-project traffic.

---

## Per-project detail — Concealed Wines tender API

**Slug:** `CONCEALEDWINES`
**URL:** `https://www.concealedwines.com`
**Auth:** `CONCEALEDWINES_API_KEY` env var (legacy auth scheme — see
the CW eng team's docs for the exact header).
**Status:** external service. Email Search proxies it.

This is the canonical tender data source. Tender Hunt should
eventually call it directly OR continue proxying through Email Search
— TBD when Tender Hunt's architecture is finalised.

---

## Per-project detail — others (stubs)

The rest of the projects are in development or planning. When a
project goes live:

1. Update its row above to 🟢 with the production URL
2. Add a detailed section like the Email Search one
3. Update `02-env-var-naming.md` if its slug changes

For now, the slugs are reserved so future consumers know what env
vars to expect.

---

## Adding a new project

1. Pick a slug (SCREAMING_SNAKE_CASE, short but unambiguous)
2. Add the registry row with status 🔵 planned or 🟡 in dev
3. If it will expose an agent API, list intended endpoints under a
   per-project detail section
4. Coordinate with other projects' owners if they'll consume it —
   they'll need to add `<NEW_SLUG>_API_URL` + `<NEW_SLUG>_API_KEY`
   to their env vars before going live
5. When deployed, flip the row to 🟢 and add the production URL

---

## Discovery from code

In the long run, if the registry gets large enough to be painful as
markdown, port it to a single JSON file in this repo:

```json
{
  "projects": [
    { "slug": "EMAIL_SEARCH", "status": "live", "url": "...", "endpoints": [...] },
    ...
  ]
}
```

…and add a thin TypeScript helper any project can import:

```ts
import { lookupProject } from "@callenil/internal-tools-patterns";
const emailSearch = lookupProject("EMAIL_SEARCH");
fetch(`${emailSearch.url}/api/agent/search`, { headers: { Authorization: `Bearer ${process.env.EMAIL_SEARCH_API_KEY}` }, ... });
```

But for ~10 projects, this Markdown is fine. Don't ship the npm
package until the manual lookup becomes a real friction point.

---

End of registry. Pair with `01-agent-api-contract.md` (request shape)
and `02-env-var-naming.md` (env var naming for the URLs/keys you
found here).
