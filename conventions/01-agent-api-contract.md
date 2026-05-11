# Convention 01 — Agent API contract

> Every CW internal-tools project exposes its data to other projects
> (and to Claude Desktop, via MCP servers) through a uniform REST
> contract. This doc defines that contract so any project can call any
> other project the same way, with no per-pair custom integration.

---

## Why this exists

Today (May 2026) the fleet has working integrations:

- Tender Hunt calls Email Search's `/api/agent/search` and
  `/api/agent/tender/exclusion-list` to compute do-not-mail lists
- Claude Desktop (via `email-search-mcp`) calls
  `/api/agent/{search, history/preview, contact/lookup, …}`
- Future: Forge will call Email Search for sender history when
  scheduling content. ScrapeGlobal will be called from Tender Hunt for
  supplier enrichment. Business system will read from all of them.

Without a shared contract, every new pair would need custom auth,
custom response shapes, custom error handling — that's where the
project drifts and integrations become brittle. This contract is the
backstop.

---

## The contract — every cross-project endpoint follows this

### 1. URL shape

All callable-from-outside endpoints live under `/api/agent/*` in the
target project. Examples:

```
POST /api/agent/search
POST /api/agent/history/preview
POST /api/agent/history/export
POST /api/agent/contact/lookup
POST /api/agent/contact/search
POST /api/agent/tender/exclusion-list
GET  /api/agent/tender/lookup?reference=CW-2024-001
GET  /api/agent/tender/active
GET  /api/agent/context
```

Convention:
- **POST** for endpoints that take filters / a complex body
- **GET** for simple-keyed lookups (single ID or URL param)
- Path uses kebab-case for multi-word resources
  (`exclusion-list` not `exclusionList`)
- Nest by resource:
  `/api/agent/<resource>/<verb>` (e.g. `contact/lookup`, `history/export`)

Anything NOT under `/api/agent/*` is internal-only and not part of the
inter-project contract.

### 2. Authentication

Every request must include:

```
Authorization: Bearer esk_<32-char-base62>
```

- `esk_` = "external service key", same prefix in every project
- Key is generated either via the target project's `/admin/agents` page
  (system agents, scope = "all mailboxes" or similar) or via per-user
  pages like `/account/connect-claude` (per-user agents inherit the
  user's access level)
- Server side: SHA-256 hash of the key is stored in an `agents` table;
  the plaintext is shown to the user ONCE at creation
- Server side: every request hash-compares the Bearer prefix against
  the `agents` table; on match, request proceeds with that agent's
  permissions
- Server side: every successful auth records `agents.last_used_at` for
  visibility / staleness pruning

Wrong / missing / revoked keys → `401 {"error": "unauthorized"}`.

### 3. Request shape — POST endpoints

JSON body, validated with Zod (or equivalent in non-TS projects):

```jsonc
{
  // The filters / inputs the endpoint operates on.
  "subject": "tender",
  "counterparty": "@vineyard.fr",
  "direction": "received",
  "page": 1,
  "pageSize": 50
}
```

Conventions:
- Use **camelCase** for field names
- All fields **optional** unless the endpoint genuinely needs them —
  return helpful empty/zero results rather than 400ing on missing
  optional fields
- Date fields: ISO-8601 with offset (e.g. `2024-04-12T10:23:00Z`)
- Email fields: lowercase, no leading/trailing whitespace, validated
  with a sane regex
- Pagination: `page` (1-indexed) and `pageSize` (default 50, max 100
  unless documented otherwise)

### 4. Request shape — GET endpoints

Query string params, same naming rules. Example:

```
GET /api/agent/tender/lookup?reference=CW-2024-001
```

### 5. Response shape — success

Always JSON. Two flavours depending on endpoint type:

**Paged list endpoint:**

```jsonc
{
  "rows": [ /* array of result objects */ ],
  "count": 42,         // total matches across all pages
  "page": 1,           // echoed back
  "pageSize": 50,      // echoed back
  // optionally, extra aggregates the endpoint computes server-side:
  "uniqueCount": 17,
  "responseRate": 67.5
}
```

**Single-object endpoint:**

```jsonc
{
  "tender": { /* object */ }       // or null if not found (with 404)
}
```

Or:

```jsonc
{
  "contact": null                  // explicit "not found" with 200
}
```

Convention: the top-level key matches the singular noun of what's
being fetched (`tender`, `contact`, `email`, etc.). Use **explicit
null** for "not found" rather than 404 when the absence is a normal
business state (e.g. CRM lookup for an unknown email).

**Aggregate endpoint** (counts, stats):

```jsonc
{
  "tender_ref": "CW-2024-001",
  "counterparty_emails": ["alice@…", "bob@…"],
  "counterparty_count": 17,
  "match_count": 42
}
```

Flat object, named fields. No `rows` wrapper.

### 6. Response shape — error

```jsonc
{
  "error": "human-readable message",
  // optionally:
  "details": { /* Zod issues, debug info, etc. */ }
}
```

Standard HTTP status codes:

| Status | When |
|---|---|
| **200** | Success (including "explicit null" for not-found business states) |
| **400** | Malformed request body — `details` includes Zod issues |
| **401** | Missing / bad / revoked Bearer key — `{"error": "unauthorized"}` |
| **403** | Authenticated but not authorised for this resource (e.g. mailbox outside agent's scope) |
| **404** | Resource genuinely doesn't exist (different from "lookup miss") |
| **405** | Method not allowed — return early if someone sends GET to a POST endpoint |
| **429** | Rate-limited |
| **500** | Server error — `details` includes the truncated error message |

Never leak stack traces in `error` or `details`. Log internally,
return human-readable summaries only.

### 7. Audit logging

Every request that passes auth must record one row in the target
project's `audit_log` table. Minimum payload:

```jsonc
{
  "user_id": null,                              // null for agent calls
  "action": "agent_search",                     // see convention 04
  "payload": {
    "agent_id": "uuid",
    "agent_name": "tender-hunt",
    "filters": { /* the request body */ }
  },
  "result_count": 42,
  "ip_country": "<country if available>",
  "user_agent": "<user-agent string>"
}
```

See `conventions/04-audit-log-schema.md` for the full schema.

### 8. Idempotency & retries

- All GET endpoints MUST be idempotent (same input → same output, no
  side effects beyond audit logging)
- POST endpoints that modify state (delete, revoke, regenerate) MUST
  accept an `Idempotency-Key` header and dedupe on it for at least
  24 h — though as of 2026-05 most cross-project calls are read-only
  so this rarely fires
- Callers should retry 5xx and 429s with exponential backoff (start
  at 1s, max 60s, give up after 5 attempts)

### 9. Crawler / freshness triggers

Some endpoints (especially search-heavy) call `maybeTriggerCrawl()`
fire-and-forget on every request to keep the underlying index fresh.
This is a 5-min debounced no-op so cheap to call always. Pattern:

```ts
import { maybeTriggerCrawl } from "@/lib/crawler/trigger";

export async function POST(req: NextRequest) {
  void maybeTriggerCrawl();
  // ... rest of handler
}
```

Adopt if your project also crawls / ingests external data.

---

## Canonical example — Email Search's `/api/agent/search`

See [email-search-system](https://github.com/callenil/email-search-system)
→ `src/app/api/agent/search/route.ts`. Implements every part of this
contract. New projects should follow the same shape verbatim.

The MCP server pattern (planned, `mcp-server/`) is built on top of
this contract — write your agent endpoints to this spec and you get
Claude Desktop integration for free.

---

## How to adopt this in a new project

1. Create an `agents` table — see Email Search's
   `supabase/migrations/0022_agents.sql` for the schema (id, name,
   description, api_key_hash, api_key_prefix, allowed_scope, status,
   created_at, last_used_at, created_by, user_id).
2. Create an `agent` auth library — see Email Search's
   `src/lib/auth/agent.ts` (`getAgentFromRequest()` helper).
3. For each callable endpoint, follow this contract:
   - Validate input with Zod
   - Call `getAgentFromRequest()`, return 401 if null
   - Authorise (scope check)
   - Execute
   - Audit-log
   - Return the convention-shaped response
4. Add a `/admin/agents` UI for the Owner to mint / revoke system
   agents.
5. Optionally add `/account/connect-claude` for per-user agents
   (when the project wants Claude Desktop access).

The MCP-server kickoff (when written) will scaffold all of the above.
For now, port from Email Search manually.

---

## Versioning

When this contract changes incompatibly:

- Bump the patterns repo's `auth` and `mcp-server` folder versions
  (e.g. tag `v2-agent-api`)
- Old projects keep working until they migrate
- Don't break field names — add new fields, deprecate old ones with
  a comment in the response (`_deprecated: ["oldField"]`)

For minor additions (new optional filter, new response field), no
version bump needed — clients ignoring unknown fields is the
expected behaviour.

---

End of contract. Pair this with `02-env-var-naming.md` (so projects
know what URLs and keys to use to reach each other) and
`03-service-registry.md` (the living index of which projects exist).
