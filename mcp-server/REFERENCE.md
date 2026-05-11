# MCP server pattern — reference

> Read this before installing the pattern. Explains why it's structured
> the way it is, the two-repo split, how MCP works, and the decisions
> baked in. For the actual install task, see `KICKOFF.md`.

---

## What it gives you

Add this pattern to any internal-tool project and you get:

1. **Claude Desktop integration** — your team can ask Claude
   conversational questions and have it search / query that project's
   data with their own permissions.
2. **A federated fleet** — once 3+ projects have MCP servers, Claude
   Desktop becomes a unified cockpit. *"What suppliers from Greece have
   we emailed about tender CW-2024-001?"* triggers calls across Email
   Search, ScrapeGlobal, and the CW tender API in one turn.
3. **Per-user keys with audit trails** — each team member gets their
   own API key, bound to their user account. Their Claude Desktop
   inherits exactly their web access. Every call is audit-logged.
4. **Free programmatic API** — the same `/api/agent/*` endpoints the
   MCP server uses are callable by any other internal-tool project,
   following `conventions/01-agent-api-contract.md`. Build one
   integration surface, get two consumers.

---

## Anatomy — the two-repo split

This pattern installs into **two git repos**:

### Repo 1 — the target project (e.g. `tender-hunt`)

Server-side. Adds:

```
<target-project>/
├── supabase/migrations/<N>_agents.sql        ← agents table
├── src/lib/auth/agent.ts                     ← Bearer-key verifier
├── src/app/api/agent/<resource>/route.ts     ← 4-8 callable endpoints
├── src/app/api/admin/agents/...              ← CRUD for system agents
├── src/app/api/me/agent/route.ts             ← per-user key CRUD
├── src/app/admin/agents/page.tsx             ← Owner UI
├── src/app/account/connect-claude/page.tsx   ← user UI
└── src/components/{admin/agents,account/connect-claude}.tsx
```

### Repo 2 — a sibling MCP server (e.g. `tender-hunt-mcp`)

Client-side. A standalone Node ESM project that Claude Desktop runs
via stdio. Tiny:

```
<target-project>-mcp/
├── package.json
├── README.md
└── src/index.js                              ← MCP SDK + tool definitions
```

Each user clones this on their laptop, sets two env vars
(`<PROJECT>_API_URL` and `<PROJECT>_API_KEY`), and adds an entry to
their Claude Desktop config. From then on, Claude can use the project.

---

## Why two repos, not one

Three reasons:

1. **The MCP server runs on the user's machine, not Vercel.** It's a
   Node process Claude Desktop spawns and talks to over stdio. Bundling
   it into the web project's repo would muddle the build target.
2. **Distribution** — each team member needs to `git clone` and
   `npm install` the MCP repo locally. A sibling repo keeps that
   step clean (`git clone github.com/<org>/<project>-mcp`).
3. **Updates** — when the target project ships new agent endpoints,
   you only need to bump the MCP server's tool list. Two small commits
   in two repos instead of one tangled commit in a monolith.

---

## How MCP works (one paragraph)

Claude Desktop reads `claude_desktop_config.json` on startup. For each
`mcpServers` entry, it spawns the command (e.g. `node
/path/to/<project>-mcp/src/index.js`), opens stdin/stdout pipes, and
speaks the **Model Context Protocol** (JSON-RPC over stdio). The MCP
server registers its tools at handshake; Claude lists them as
available; when the user's prompt needs project data, Claude calls a
tool via MCP, the server (in this pattern) translates that into an
HTTP call to the target project's `/api/agent/*` endpoint with the
user's Bearer key, and returns the JSON result to Claude. Claude then
synthesises a response using that data.

So: **Claude Desktop ⇄ local MCP server (Node) ⇄ HTTPS ⇄ target
project's agent API ⇄ Supabase**.

---

## Auth model — per-user, not per-app

Each team member generates **their own** API key on the target
project's `/account/connect-claude` page. The key is:

- A 32-character random string with `esk_` prefix (e.g.
  `esk_3aF8xK2pL9mNqR7sT4vW6yA1bC5dE0jH`)
- Shown **once at creation**, then SHA-256 hashed in the `agents`
  table — only the prefix `esk_3aF8` is stored visible
- **Bound to the user's `users.id`** (the `user_id` column). When
  the agent calls a search endpoint, the server resolves "what can
  this agent see?" by asking "what can the bound user see?"
- Per-user **unique active key** — regenerating revokes the old one.
  Same partial unique index pattern as Email Search.

Why per-user, not a global "system" key:
- **Audit trails stay clean** — every agent call attributes to a
  specific human, not "the team key"
- **Revocation is granular** — staff leaves → revoke their key, no
  blast radius
- **Permissions auto-update** — if Calle promotes someone from staff
  to org-lead, their Claude Desktop access widens automatically; no
  re-key needed

System agents (no `user_id`, bound to `created_by`) also exist for
cases like "Tender Hunt calls Email Search" where there's no specific
human. Mint these at `/admin/agents`. Use sparingly.

---

## What tools to expose

Pick tools that match what your users actually ask Claude. Email
Search's set (as of May 2026):

| Tool | What Claude can ask |
|---|---|
| `search_emails` | "Find emails about tender X" / "What did we send to alice@…" |
| `get_email_history_preview` | "How many emails have we had with @vineyard.fr?" |
| `export_email_history` | "Download all emails with bob@…" (returns a CSV file) |
| `get_business_context` | One-shot orientation — orgs, mailbox counts, role definitions (Claude calls at start of session) |
| `lookup_tender` | "Tell me about tender CW-2024-001" |
| `list_active_tenders` | "What tenders are open right now?" |
| `lookup_contact` | "Who is contact@xyz.com in our CRM?" |
| `find_contacts` | "Find suppliers from Greece in our CRM" |

For a new project (e.g. Tender Hunt), match this shape:
- 1× context tool (`get_<project>_context`)
- 2-3× search / lookup tools (project-specific)
- 1× export tool if there's bulk data
- 1× action tool only if it's safe and idempotent

Keep tool counts under ~10 per project. More than that and Claude
starts struggling to pick the right one. Better to combine
related tools behind a single flexible search.

---

## Tool-design rules of thumb

- **Return shapes match the agent API contract** (see
  `conventions/01-agent-api-contract.md`). Paged list → `{rows, count,
  page, pageSize}`. Single object → `{tender: {...}}` or `{tender:
  null}`. Aggregate → flat object with named fields.
- **Truncate body text in MCP responses** — Claude doesn't need full
  100KB email bodies; 300 chars is enough for relevance triage. Full
  body via a separate "get full email" tool if needed.
- **Always include enough metadata** to disambiguate — IDs, dates,
  counterparty emails, mailbox info. Claude will use those to ask
  follow-up questions or chain calls.
- **Don't include secrets in responses** — never expose API keys,
  session tokens, etc. via MCP, even to legitimate users. The MCP
  server is logging-adjacent territory.

---

## Customization knobs

When installing the pattern in a new project, the kickoff will ask:

1. **Project slug** — used for env var names (`TENDER_HUNT_API_URL`,
   etc. — see `conventions/02-env-var-naming.md`)
2. **Tool list** — which 4-8 tools to expose, matching the project's
   actual data shape
3. **Whether to also wire `/admin/agents`** — needed if the project
   has Owner-level admin already; skip for projects without an admin
   UI yet
4. **Whether to include the per-user `/account/connect-claude` page** —
   recommended yes; only skip for system-agent-only setups (rare)

Everything else (table schema, auth helper, MCP scaffold structure)
is identical across projects.

---

## What this pattern does NOT do

- It doesn't replace your project's regular web auth. Users still sign
  in to the web UI normally; the MCP key is a separate, narrower
  credential for AI access.
- It doesn't expose write operations through MCP. If you want Claude
  Desktop to **modify** data (send emails, create tenders, etc.),
  build those endpoints separately and document them as "actions" not
  "queries" — they need much stricter auth + confirmation flows.
- It doesn't manage Claude Desktop installation on user machines —
  the user runs Claude Desktop and edits their config file themselves.
  The kickoff outputs the config snippet but doesn't push it.
- It doesn't proxy Claude API calls. The MCP server only translates
  tool calls into agent-API HTTP calls. Claude's reasoning happens in
  the Claude Desktop process.

---

## Canonical example

Live in production today (May 2026):

- **Email Search server side** — see
  [email-search-system](https://github.com/callenil/email-search-system):
  - Agents table: `supabase/migrations/0022_agents.sql` +
    `0024_agents_per_user.sql`
  - Auth helper: `src/lib/auth/agent.ts`
  - Agent endpoints: `src/app/api/agent/*`
  - Owner UI: `src/app/admin/agents/page.tsx` +
    `src/components/admin/agents-admin.tsx`
  - User UI: `src/app/account/connect-claude/page.tsx` +
    `src/components/account/connect-claude.tsx`
- **Email Search MCP client side** — see
  [email-search-mcp](https://github.com/callenil/email-search-mcp):
  - Single-file Node ESM server with 8 tools, all proxying to
    `email-search-system-delta.vercel.app/api/agent/*`

The kickoff is built from these working files. New projects get a
clean copy with the project name substituted.

---

## Roadmap / future improvements

- **OAuth 2.1 + PKCE for MCP auth** — the MCP spec is moving toward
  OAuth-based auth. When that's stable across Claude Desktop and the
  MCP SDK, the pattern will migrate from Bearer tokens to OAuth flows.
  Bearer is fine for now — Forge already considered + Calle decided
  to stick with Bearer for the CW fleet.
- **Server-Sent Events transport** — currently this pattern uses stdio
  (local Node process). Once MCP-over-HTTP-SSE matures, we can host
  the MCP server on Vercel directly and skip the local-clone step.
- **Shared types package** — if cross-project type drift becomes
  painful, factor out a `@callenil/internal-tools-types` npm package.

---

End of reference. Read `KICKOFF.md` next when you're ready to install.
