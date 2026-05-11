# Convention 04 — Audit-log schema

> Every project records every action — user clicks, agent calls,
> admin changes, exports — into a uniform `audit_log` table. So 6
> months from now, when someone asks *"who exported customer X's
> data?"* or *"why did Forge call Tender Hunt 400 times yesterday?"*,
> you can answer in 30 seconds with a SQL query.

---

## Why one schema across all projects

If every project's audit log has the same columns and action-naming
convention, then:

- A single SQL query template works on any project
- Cross-project traceability is easy — Tender Hunt's audit log has
  `caller_project: "FORGE"` rows, Forge's audit log has
  `caller_project: "EMAIL_SEARCH"` rows, you can stitch the call
  graph
- New projects copy the schema as-is, no design work
- Forensics during incidents doesn't require learning N different
  audit schemas

---

## The table

Run this in each project's Supabase migrations:

```sql
create table audit_log (
  id bigserial primary key,
  -- WHO
  user_id uuid references users(id),         -- null for agent calls
  agent_id uuid references agents(id),       -- null for human calls
  -- WHAT
  action text not null,                      -- see action-naming below
  -- WHERE FROM
  ip_country text,                           -- 2-letter ISO; from x-vercel-ip-country
  ip_address inet,                           -- optional; populate if you need finer geo
  user_agent text,
  caller_project text,                       -- e.g. "TENDER_HUNT" — set when agent_id is non-null
  -- WHAT HAPPENED
  payload jsonb not null default '{}',       -- structured details — filters, IDs, etc.
  result_count int,                          -- for list endpoints: how many rows returned
  result_status text,                        -- "ok" | "error" | "skipped"
  error_message text,                        -- truncated if result_status = "error"
  -- WHEN
  created_at timestamptz not null default now()
);

create index audit_log_action_time on audit_log (action, created_at desc);
create index audit_log_user_time on audit_log (user_id, created_at desc) where user_id is not null;
create index audit_log_agent_time on audit_log (agent_id, created_at desc) where agent_id is not null;
create index audit_log_caller_time on audit_log (caller_project, created_at desc) where caller_project is not null;

-- RLS: Owner only. Service-role bypasses.
alter table audit_log enable row level security;
create policy audit_log_owner_read on audit_log for select to authenticated using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'owner' and u.status = 'active')
);
-- No INSERT/UPDATE policy — only service-role writes.
```

Adapt for your project's RLS helpers (`is_owner()` etc.) if you have them.

---

## Action naming convention

Pattern: `<surface>_<verb>` in lower_snake_case.

| Surface prefix | Used for |
|---|---|
| `view_` | Read of a single resource (e.g. `view_email`) |
| `search` | List / search endpoint without a prefix (just `search`) |
| `export_` | Anything that produces a downloadable file (`export_history`, `export_search`) |
| `agent_` | Any call made by a Bearer-auth agent (`agent_search`, `agent_history_preview`, `agent_tender_lookup`) |
| `admin_` | Owner-only changes (`admin_acl_change`, `admin_crm_import`, `admin_agent_create`) |
| `auth_` | Login / OTP flow events (`auth_login`, `auth_otp_sent`) |
| `webhook_` | Inbound webhook deliveries (`webhook_sendgrid_event`) |

Examples from Email Search:

```
search                          ← user ran a /dashboard search
view_email                      ← user opened a result detail panel
export_history                  ← user clicked Download CSV on /history
agent_search                    ← someone called /api/agent/search
agent_tender_exclusion_list     ← Tender Hunt called the exclusion endpoint
agent_self_create               ← user generated their personal API key
admin_acl_change                ← Owner granted/revoked per-mailbox access
admin_crm_import                ← Owner uploaded a CRM xlsx
admin_crm_delete_all            ← Owner cleared an org's CRM
```

Don't get creative — use these prefixes verbatim across projects so
queries like `SELECT * FROM audit_log WHERE action LIKE 'agent_%'`
work universally.

---

## Payload conventions

The `payload jsonb` column is freeform but follows these rules:

- **Always include enough to reconstruct the call.** For a search:
  the full filter object. For an export: the address + direction.
  For an admin change: which user / which mailbox / what changed.
- **Never include secrets.** No API keys, passcodes, magic-link URLs,
  raw email body content. If you need to record content involvement,
  reference by ID (e.g. `email_id: "uuid"`) and let the reader join
  back to the source table.
- **Include identifying agent metadata for agent calls:**
  `{ agent_id, agent_name }`. Plus the request body that came in.
- **For cross-project calls:** also include
  `{ caller_project: "TENDER_HUNT", caller_key_prefix: "esk_abc1" }`
  for forensics.

Example agent_search row:

```jsonc
{
  "agent_id": "uuid",
  "agent_name": "tender-hunt-system",
  "caller_project": "TENDER_HUNT",
  "filters": {
    "subject": "CW-2024-001",
    "direction": "received",
    "page": 1,
    "pageSize": 100
  }
}
```

Example admin_crm_import row:

```jsonc
{
  "org_id": "uuid",
  "org_name": "Concealed Wines",
  "file_name": "cw_contacts_2026-05-10.xlsx",
  "rows_parsed": 13036,
  "rows_upserted": 13030,
  "rows_skipped": 6
}
```

---

## What to log, when

### Always log

- Every authenticated endpoint call (200 result)
- Every failed auth attempt (with `result_status: "error"` and
  enough payload to forensically diagnose)
- Every admin action (user create, ACL change, denylist edit, CRM
  import / delete)
- Every cross-project agent call
- Every export
- Every webhook delivery (inbound)

### Don't log

- Anonymous 404 / blocked traffic from the middleware (noisy, no
  value)
- Static asset requests (Next.js handles these, no audit value)
- Health checks
- Render-time DB reads inside a server component that are part of
  a logged outer action (avoid double-logging the same logical
  request)

### Log fire-and-forget

Audit writes are best-effort — don't fail the user-facing request
if the audit insert errors. Pattern:

```ts
void supa.from("audit_log").insert({
  user_id: user.id,
  action: "search",
  payload: filters,
  result_count: rows.length,
  ip_country: req.headers.get("x-vercel-ip-country"),
});
```

Note the `void` — no `await`. If the insert fails, the audit row is
lost but the user's request still succeeds. Acceptable trade-off
because the alternative (await + handle errors) couples user latency
to logging-system health.

If audit reliability matters more than latency for a specific action,
use a queue (Supabase Queues, or just a side table that a worker
drains) — but for most uses, fire-and-forget is correct.

---

## Standard SQL queries

These work in any project that follows this schema. Pin them
somewhere convenient.

```sql
-- Last 24 hours of activity by action
SELECT action, count(*) FROM audit_log
WHERE created_at > now() - interval '24 hours'
GROUP BY action ORDER BY count(*) DESC;

-- Who exported data this week?
SELECT u.email, al.payload, al.created_at FROM audit_log al
LEFT JOIN users u ON u.id = al.user_id
WHERE al.action LIKE 'export_%' AND al.created_at > now() - interval '7 days'
ORDER BY al.created_at DESC;

-- Cross-project traffic — which projects called us last week?
SELECT caller_project, count(*) FROM audit_log
WHERE caller_project IS NOT NULL
  AND created_at > now() - interval '7 days'
GROUP BY caller_project ORDER BY count(*) DESC;

-- One agent's call history
SELECT action, payload, result_count, created_at FROM audit_log
WHERE agent_id = '<uuid>' ORDER BY created_at DESC LIMIT 100;

-- Failed auth attempts in the last hour (incident triage)
SELECT ip_country, count(*) FROM audit_log
WHERE action = 'auth_login' AND result_status = 'error'
  AND created_at > now() - interval '1 hour'
GROUP BY ip_country ORDER BY count(*) DESC;
```

---

## Retention

Set in each project per your needs. Suggested default:

- Keep all audit rows indefinitely for the first 6 months of a
  project's life (you want maximum forensic visibility while it's new)
- After 6 months: roll up rows older than 180 days into a daily
  summary table, prune the originals
- Never delete admin / auth rows — these stay forever

Implement with a `pg_cron` job or a GitHub Actions cron calling a
prune function. Not urgent until the table has 10M+ rows.

---

End of convention. Pair with `01-agent-api-contract.md` (which
defines what to log when an agent calls) and
`03-service-registry.md` (which lists the `caller_project` slugs).
