# Task — install the MCP server pattern in this project

> Paste this file's contents into a Claude Code session in any
> internal-tool project that should expose its data to Claude Desktop
> (Tender Hunt, Forge, ScrapeGlobal, etc.). The session reads this,
> audits, asks Calle the inputs it can't infer, installs both sides
> (server-side agent API in the target project + sibling MCP server
> in a new repo), and outputs the Claude Desktop config snippet for
> each user. Everything follows the conventions in
> [`internal-tools-patterns/conventions/`](../conventions/).

---

## Goal

Two deliverables:

1. **In the target project** (current working dir): an `agents` table,
   an auth helper, 4–8 callable `/api/agent/*` endpoints, an
   `/admin/agents` UI for the Owner, and a `/account/connect-claude`
   UI for per-user keys.
2. **In a new sibling repo** (e.g. `<target-project>-mcp` next to
   this one): a Node ESM MCP server that Claude Desktop runs locally
   and that proxies to the agent API.

Single commit per repo. Both repos pushed. User gets a checklist of
3 manual steps + a Claude Desktop config snippet to paste.

---

## Step 1 — audit before asking

⚠️ **Don't blindly ls top-level. Recurse into `src/`.** The auth /
agent files might already exist if a previous install ran.

```bash
# Stack — Next.js App Router + Supabase required
grep -E '"next":|"@supabase/ssr":|"@supabase/supabase-js":' package.json

# Existing agent table?
grep -rl "create table.*agents" supabase/migrations/*.sql 2>/dev/null

# Existing auth helper?
find src -type f -name "agent.ts" -path "*/lib/auth/*" 2>/dev/null

# Existing agent endpoints?
find src -type d -name agent -path "*/api/*" 2>/dev/null

# Existing admin agents UI?
find src -type f -path "*/admin/agents/*" 2>/dev/null

# Existing per-user connect-claude UI?
find src -type d -name connect-claude -path "*/account/*" 2>/dev/null

# Audit log table (this pattern logs every agent call to it)
grep -rl "create table.*audit_log" supabase/migrations/*.sql 2>/dev/null

# Users table — agents bind to users.id
grep -rl "create table.*users" supabase/migrations/*.sql 2>/dev/null
```

**Branch outcomes:**

| Finding | Action |
|---|---|
| No `users` or `audit_log` table | **Stop.** Tell Calle this pattern needs the org-passcode auth pattern installed first. Point at `auth/KICKOFF.md`. |
| `agents` table + `agent.ts` + `/api/agent/` already exist | The server side is already installed. Confirm with Calle whether to (a) build the MCP server only, (b) add new agent endpoints to the existing setup, or (c) abort. |
| Partial state (some files exist, others don't) | Read what's there, then ask Calle whether to extend or abort. |
| Nothing exists | Proceed with full install. |

Don't proceed past Step 2 if anything's ambiguous — ask.

---

## Step 2 — ask Calle these questions in ONE message

```
I'm installing the MCP server pattern in <current-project>. I need
six values from you to proceed:

  1. PROJECT SLUG — SCREAMING_SNAKE_CASE prefix for env vars (e.g.
     TENDER_HUNT, FORGE, SCRAPEGLOBAL). Must match the slug in
     conventions/03-service-registry.md. Reply with just the slug.

  2. SIBLING MCP REPO NAME — what to name the standalone MCP server
     repo. Convention: <project-slug-lowercase>-mcp (e.g.
     tender-hunt-mcp). Reply with the name only. I will create it
     locally under C:\dev\<name> and push to github.com/callenil/<name>.

  3. PRODUCTION URL — current production URL of this project (e.g.
     https://tender-hunt.vercel.app). Used in the MCP server's
     env-var template. Reply "not deployed yet" if it's pre-deploy
     — I'll use http://localhost:3000 and you'll update later.

  4. TOOL LIST — 4-8 tools to expose. Reply with a numbered list,
     one tool per line, with what each does. Example for Tender Hunt:
       1. search_tenders — find tenders by ref / status / date
       2. lookup_tender — get full details of one tender by ref
       3. list_active_tenders — currently-open tenders
       4. get_tender_context — orgs / current operator / counts
     I will scaffold endpoint stubs for each; you can implement
     the SQL / data layer afterwards.

  5. ADMIN UI? — should /admin/agents render? Yes if this project has
     Owner-level admin pages already; no for projects without admin UI.
     Reply yes / no.

  6. PER-USER KEYS? — should /account/connect-claude render so each
     team member generates their own Claude Desktop key? Strongly
     recommended yes. Reply yes / no.

Reply with all six values and I'll execute the install.
```

Validate:
- Slug matches conventions/03's registry (or, if new, tell Calle to add a row there first)
- Tool names are lower_snake_case
- Tool descriptions are 1-2 sentences each
- URL is `https://...` with no trailing slash

---

## Step 3 — install server-side (target project)

All paths relative to current working dir. Commit at the end.

### 3a) Migration — `agents` table

Find the next sequential migration number (`ls supabase/migrations/`).
Create `supabase/migrations/<NNNN>_agents.sql`:

```sql
-- <NNNN>_agents.sql
-- AI agent principals. Authenticate via API key (sha256-hashed).
-- Per-agent allowed_scope is optional and project-specific (use
-- mailbox_ids for email-search-like systems, project_ids for
-- forge-like systems, etc. — null = unrestricted).

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  device_label text,
  api_key_hash text not null unique,
  api_key_prefix text not null,            -- first 12 chars of plaintext for display
  allowed_scope text[],                    -- null = all; otherwise project-specific IDs
  status text not null default 'active' check (status in ('active','revoked')),
  user_id uuid references users(id) on delete cascade,  -- per-user key when set
  created_by uuid references users(id),
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create index if not exists agents_status on agents (status);
create index if not exists agents_user_id on agents (user_id);

-- At most ONE active agent per user (regenerate replaces).
create unique index if not exists agents_one_active_per_user
  on agents (user_id) where status = 'active' and user_id is not null;

alter table agents enable row level security;

-- Adapt these policies to your project's helper functions.
-- Most projects have an is_owner() function from the auth pattern.
create policy agents_owner_read on agents for select to authenticated using (is_owner());
create policy agents_owner_write on agents for all to authenticated using (is_owner()) with check (is_owner());

-- Per-user keys: a user can read / regenerate / revoke their own.
create policy agents_self_read on agents for select to authenticated
  using (user_id = auth.uid());
create policy agents_self_write on agents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Adapt the policies if your project's auth helpers are named differently.

### 3b) Auth helper — `src/lib/auth/agent.ts`

Verbatim:

```ts
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest } from "next/server";

export type Agent = {
  id: string;
  name: string;
  user_id: string | null;
  allowed_scope: string[] | null;
  status: "active" | "revoked";
};

export type AgentWithUser = Agent & {
  user?: { id: string; email: string; role: string; status: string } | null;
};

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/**
 * Reads Bearer token from Authorization header, looks up agent by hash.
 * Returns the active agent (with bound user, if any) or null.
 * Updates last_used_at as a side effect (fire-and-forget).
 *
 * If the agent is bound to a user (user_id set), the bound user must
 * still be active — otherwise the agent is treated as disabled.
 */
export async function getAgentFromRequest(req: NextRequest): Promise<AgentWithUser | null> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  const token = m[1];
  const sa = createServiceClient();
  const { data: agent } = await sa
    .from("agents")
    .select("id, name, user_id, allowed_scope, status")
    .eq("api_key_hash", hashKey(token))
    .maybeSingle();
  if (!agent || agent.status !== "active") return null;

  let user: { id: string; email: string; role: string; status: string } | null = null;
  if (agent.user_id) {
    const { data: u } = await sa
      .from("users")
      .select("id, email, role, status")
      .eq("id", agent.user_id)
      .maybeSingle();
    if (!u || u.status !== "active") return null;
    user = u as { id: string; email: string; role: string; status: string };
  }

  void sa.from("agents").update({ last_used_at: new Date().toISOString() }).eq("id", agent.id);
  return { ...(agent as Agent), user };
}
```

### 3c) Key-generation helper — `src/lib/auth/agent-keys.ts`

```ts
import { randomBytes } from "node:crypto";
import { hashKey } from "./agent";

/**
 * Generate a new agent API key.
 * Returns the plaintext (show ONCE to user) and the hash (store in DB).
 * Plaintext is `esk_` + 32 base62 chars.
 */
export function generateAgentKey(): {
  plaintext: string;
  hash: string;
  prefix: string;
} {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(32);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const plaintext = `esk_${body}`;
  return {
    plaintext,
    hash: hashKey(plaintext),
    prefix: plaintext.slice(0, 12), // "esk_XXXXXXXX" — 12 chars
  };
}
```

### 3d) Per-user key API — `src/app/api/me/agent/route.ts`

For the `/account/connect-claude` flow. GET returns the current key
metadata; POST regenerates (revokes any active one for this user);
DELETE revokes. Verbatim shape (adapt the createClient import path
if your project differs):

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAgentKey } from "@/lib/auth/agent-keys";

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sa = createServiceClient();
  const { data: agent } = await sa
    .from("agents")
    .select("id, name, device_label, api_key_prefix, status, created_at, last_used_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return NextResponse.json({ agent });
}

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const deviceLabel: string | null = body?.device_label ?? null;

  const sa = createServiceClient();

  // Revoke any existing active key for this user
  await sa.from("agents").update({ status: "revoked" }).eq("user_id", user.id).eq("status", "active");

  // Generate + insert new key
  const { plaintext, hash, prefix } = generateAgentKey();
  const { data: row, error } = await sa.from("agents").insert({
    name: `<PROJECT_SLUG>-${user.email}`,
    description: "Per-user Claude Desktop key",
    device_label: deviceLabel,
    api_key_hash: hash,
    api_key_prefix: prefix,
    user_id: user.id,
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void sa.from("audit_log").insert({
    user_id: user.id,
    action: "agent_self_create",
    payload: { agent_id: row.id, device_label: deviceLabel },
  });

  return NextResponse.json({ key: plaintext, agent_id: row.id });
}

export async function DELETE() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sa = createServiceClient();
  await sa.from("agents").update({ status: "revoked" }).eq("user_id", user.id).eq("status", "active");
  void sa.from("audit_log").insert({
    user_id: user.id,
    action: "agent_self_revoke",
    payload: {},
  });
  return NextResponse.json({ ok: true });
}
```

Replace `<PROJECT_SLUG>` (line ~30) with the actual slug from Step 2.

### 3e) Owner agent CRUD API — `src/app/api/admin/agents/route.ts` + `.../[id]/route.ts`

For `/admin/agents` page. List, create system agents, revoke.

**`src/app/api/admin/agents/route.ts`:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAgentKey } from "@/lib/auth/agent-keys";

const Body = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  allowed_scope: z.array(z.string().uuid()).optional(),
});

async function requireOwner() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const sa = createServiceClient();
  const { data: profile } = await sa
    .from("users")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner" || profile.status !== "active") return null;
  return profile;
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sa = createServiceClient();
  const { data: agents } = await sa
    .from("agents")
    .select("id, name, description, api_key_prefix, allowed_scope, status, created_at, last_used_at, user_id")
    .order("created_at", { ascending: false });

  return NextResponse.json({ agents: agents ?? [] });
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });

  const { name, description, allowed_scope } = parsed.data;
  const { plaintext, hash, prefix } = generateAgentKey();

  const sa = createServiceClient();
  const { data, error } = await sa.from("agents").insert({
    name,
    description: description ?? null,
    api_key_hash: hash,
    api_key_prefix: prefix,
    allowed_scope: allowed_scope ?? null,
    created_by: owner.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void sa.from("audit_log").insert({
    user_id: owner.id,
    action: "admin_agent_create",
    payload: { agent_id: data.id, name, allowed_scope: allowed_scope ?? null },
  });

  return NextResponse.json({ agent: data, key: plaintext });
}
```

**`src/app/api/admin/agents/[id]/route.ts`** (revoke):

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const PatchBody = z.object({
  status: z.enum(["active", "revoked"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sa = createServiceClient();
  const { data: profile } = await sa.from("users").select("role, status").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "owner" || profile.status !== "active") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { error } = await sa.from("agents").update(parsed.data).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void sa.from("audit_log").insert({
    user_id: user.id,
    action: "admin_agent_revoke",
    payload: { agent_id: id, ...parsed.data },
  });
  return NextResponse.json({ ok: true });
}
```

### 3f) Sample agent endpoint — `src/app/api/agent/<resource>/route.ts`

This is the template. Repeat for each tool in the user's list from
Step 2.

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentFromRequest } from "@/lib/auth/agent";
import { createServiceClient } from "@/lib/supabase/service";

const Body = z.object({
  // Replace with the endpoint's actual filters
  q: z.string().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).max(200).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export async function POST(req: NextRequest) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { q, page, pageSize } = parsed.data;

  const sa = createServiceClient();

  // TODO: replace with the project's actual search SQL or RPC.
  // Apply agent.allowed_scope or agent.user_id to scope results.
  const { data: rows, error, count } = await sa
    .from("<project_resource_table>")
    .select("*", { count: "exact" })
    .ilike("name", q ? `%${q}%` : "%")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void sa.from("audit_log").insert({
    user_id: null,
    action: "agent_<resource>",
    payload: { agent_id: agent.id, agent_name: agent.name, filters: parsed.data },
    result_count: rows?.length ?? 0,
  });

  return NextResponse.json({
    rows: rows ?? [],
    count: count ?? 0,
    page,
    pageSize,
  });
}
```

For each tool in Step 2's list, create one file at
`src/app/api/agent/<tool-name>/route.ts` using this template.
Replace the resource table, filter shape, and audit action name.

For **canonical, production-tested examples** of every endpoint type
(search, lookup, history-preview, history-export, context, contact,
tender-exclusion-list), see Email Search:
[email-search-system/src/app/api/agent/](https://github.com/callenil/email-search-system/tree/main/src/app/api/agent).

### 3g) Admin UI page — `src/app/admin/agents/page.tsx`

(Only if Step 2 question 5 answered "yes".)

Server component reads `agents` table, renders the client component:

```tsx
import { AgentsAdmin } from "@/components/admin/agents-admin";
import { createClient } from "@/lib/supabase/server";

export default async function AgentsPage() {
  const supa = await createClient();
  const { data: agents } = await supa.from("agents")
    .select("id, name, description, api_key_prefix, allowed_scope, status, created_at, last_used_at, user_id")
    .order("created_at", { ascending: false });
  return <AgentsAdmin agents={agents ?? []} />;
}
```

For the client component (CRUD UI), see Email Search:
[`src/components/admin/agents-admin.tsx`](https://github.com/callenil/email-search-system/blob/main/src/components/admin/agents-admin.tsx).
Copy it and adapt the field names (`allowed_mailboxes` → `allowed_scope`
or whatever your project calls it).

### 3h) Per-user UI page — `src/app/account/connect-claude/page.tsx`

(Only if Step 2 question 6 answered "yes".)

Server component wrapping the client component:

```tsx
import { ConnectClaudeView } from "@/components/account/connect-claude";
import { requireUser } from "@/lib/auth/require-user";

export default async function ConnectClaudePage() {
  const me = await requireUser();
  return <ConnectClaudeView userEmail={me.email} />;
}
```

For the client component (key generation, copy-once UI, Claude Desktop
config snippet), see Email Search:
[`src/components/account/connect-claude.tsx`](https://github.com/callenil/email-search-system/blob/main/src/components/account/connect-claude.tsx).
Adapt the MCP server path + project slug.

### 3i) Commit + push

```bash
cd <target-project>
git add supabase/migrations/<NNNN>_agents.sql \
        src/lib/auth/agent.ts src/lib/auth/agent-keys.ts \
        src/app/api/me/agent/route.ts \
        src/app/api/admin/agents/route.ts src/app/api/admin/agents/\[id\]/route.ts \
        src/app/api/agent/ \
        src/app/admin/agents/ src/components/admin/ \
        src/app/account/connect-claude/ src/components/account/

git commit -m "feat(agents): add Bearer-token agent API + per-user keys + Owner admin UI

Installs the MCP server pattern's server side. Adds the agents table
(hashed API keys, optional user binding), /api/agent/* endpoints
following conventions/01-agent-api-contract.md, Owner UI at
/admin/agents for system agents, and per-user UI at
/account/connect-claude for Claude Desktop integration.

Audit-logged via convention 04. Sibling MCP repo committed separately."
git push
```

---

## Step 4 — create the sibling MCP server repo

Create at `C:\dev\<sibling-repo-name>` (from Step 2 question 2).

### 4a) `package.json`

```json
{
  "name": "<sibling-repo-name>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

### 4b) `src/index.js`

The full MCP server. Replace `<PROJECT_SLUG>` and the tool definitions
with the user's values from Step 2.

```js
#!/usr/bin/env node
/**
 * <Project Name> MCP server.
 * Exposes the <Project Name> agent API as MCP tools for Claude Desktop.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = (process.env.<PROJECT_SLUG>_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API_KEY = process.env.<PROJECT_SLUG>_API_KEY;

if (!API_KEY) {
  console.error("ERROR: <PROJECT_SLUG>_API_KEY is not set. Add it to the env block in your Claude Desktop config.");
  process.exit(1);
}

async function call(path, body) {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`API ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

async function callGet(path) {
  const r = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: { "authorization": `Bearer ${API_KEY}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`API ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

// Replace these with the tool definitions from Step 2's user input.
const TOOLS = [
  {
    name: "example_tool",
    description: "Replace this with the project's actual tool. Be specific about what it does, what filters are accepted, and what it returns. Claude reads this to decide when to call it.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query." },
        page: { type: "number", description: "Page (1-indexed)." },
      },
      required: [],
    },
  },
];

const server = new Server(
  { name: "<sibling-repo-name>", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let result;
    switch (name) {
      case "example_tool":
        result = await call("/api/agent/<resource>", args);
        break;
      // Add a case per tool you defined above:
      // case "search_X": result = await call("/api/agent/search-x", args); break;
      // case "lookup_Y": result = await callGet(`/api/agent/lookup-y?id=${encodeURIComponent(args.id)}`); break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
```

For canonical examples of each tool's full inputSchema + dispatch,
see Email Search MCP:
[email-search-mcp/src/index.js](https://github.com/callenil/email-search-mcp/blob/main/src/index.js).

### 4c) `README.md`

```markdown
# <Project Name> MCP server

MCP server that exposes <Project Name> data to Claude Desktop. Each
team member installs locally and adds an entry to their Claude
Desktop config.

## Install

```bash
git clone https://github.com/callenil/<sibling-repo-name>.git C:\dev\<sibling-repo-name>
cd C:\dev\<sibling-repo-name>
npm install
```

## Get your API key

Sign in to <Project Name> → go to `/account/connect-claude` → click
"Generate key". Copy the `esk_...` string immediately — it's shown
once.

## Configure Claude Desktop

Open your Claude Desktop config:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS:   `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux:   `~/.config/Claude/claude_desktop_config.json`

Add (or merge into existing `mcpServers`):

\`\`\`json
{
  "mcpServers": {
    "<project-name-kebab>": {
      "command": "node",
      "args": ["C:\\\\dev\\\\<sibling-repo-name>\\\\src\\\\index.js"],
      "env": {
        "<PROJECT_SLUG>_API_URL": "<production-url>",
        "<PROJECT_SLUG>_API_KEY": "esk_…paste your key…"
      }
    }
  }
}
\`\`\`

Fully quit Claude Desktop (system tray → Quit, not just close) and
reopen. The tools should appear in Claude's tool list.

## Test

In a new Claude Desktop conversation:

> *Use the <project-name-kebab> MCP to <do something>*

If you see Claude calling the tool and returning data, you're set.
```

### 4d) Initialise git, push to GitHub

```bash
cd C:\dev\<sibling-repo-name>
git init -q
git add -A
git commit -m "init: <Project Name> MCP server

Standalone Node ESM MCP server that proxies tool calls to the
<Project Name> agent API. Per-user Bearer auth, stdio transport
for Claude Desktop.

Tools:
  - <list each tool one per line>

Pair with server-side install (committed separately in target repo).
"
gh repo create callenil/<sibling-repo-name> --public --source=. --push \
  --description "MCP server for <Project Name> — exposes its agent API to Claude Desktop"
```

---

## Step 5 — hand-off message to Calle

Output exactly this checklist (with placeholders filled in):

```
Two repos shipped (server side committed in <target-project>; client
side at github.com/callenil/<sibling-repo-name>).

Three manual steps to make it live:

1. Supabase migration — paste in https://supabase.com/dashboard/project/<ref>/sql/new:
   <paste the contents of the migration file you just created>

   Verify with:
     SELECT count(*) FROM agents;
   Should return 0 (the table exists, no rows yet).

2. (Optional) Add to internal-tools-patterns conventions/03-service-registry.md
   — update <PROJECT_SLUG>'s row to include the new agent endpoints
   you exposed in Step 3f, so future projects know what's available.

3. Tell each team member to set up Claude Desktop:
   - git clone https://github.com/callenil/<sibling-repo-name>.git C:\dev\<sibling-repo-name>
   - cd <sibling-repo-name> && npm install
   - Sign in to <Project Name> → /account/connect-claude → generate
     their key
   - Add the JSON snippet (with their key) to their Claude Desktop
     config; fully quit + reopen Claude

After step 1, hit /admin/agents (Owner) and /account/connect-claude
(any user) on production to verify the UIs render. Generate a test
key, configure Claude Desktop, and ask Claude:
  "Use <project-name-kebab> MCP to <do something simple>"

Tell me what happens.
```

---

## Step 6 — verify (you, automatically, after Calle confirms migration ran)

```bash
URL=<production-url>

# Endpoints exist and require auth
for tool in search example; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
    -H "content-type: application/json" -d '{}' \
    "$URL/api/agent/$tool")
  echo "/api/agent/$tool   $code  (expect 401 — Bearer missing)"
done

# Per-user keys page redirects to login when unauthed
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/account/connect-claude"
# Expect 307 to /login
```

If you got a valid key (Calle generated one for testing), do one
real call:

```bash
curl -sS -X POST -H "content-type: application/json" \
  -H "Authorization: Bearer esk_<key>" \
  -d '{"q":"test"}' \
  "$URL/api/agent/<any-tool>" | head -c 500
```

Expected: 200 with the response shape from conventions/01.

---

## Things you must NOT do

- Don't run the Supabase migration yourself — Calle pastes it. Each
  project has its own credentials.
- Don't store the plaintext API key anywhere except the response to
  the user who generated it. Only the hash goes in the DB.
- Don't reuse keys across projects — each project gets its own
  `agents` table, its own keys. Generating `esk_…` in Tender Hunt
  has no effect on Email Search.
- Don't expose write operations as MCP tools (send_email, create_tender,
  etc.). MCP tools should be read-only / idempotent. Writes need
  stricter auth + confirmation flows.
- Don't skip audit logging on agent endpoints — every call should
  insert one row to `audit_log` per convention 04. Without it,
  cross-project forensics is impossible.
- Don't include full email bodies / customer PII / files in MCP tool
  responses. Truncate to 300 chars; return IDs so Claude can ask
  follow-up if it needs full content.

---

## Done definition

- [ ] Migration file added with correct sequential prefix
- [ ] All server-side files created (agent.ts, agent-keys.ts,
      /api/me/agent/, /api/admin/agents/, /api/agent/<tools>/)
- [ ] `/admin/agents` UI page + components (if requested)
- [ ] `/account/connect-claude` UI page + components (if requested)
- [ ] Audit logging wired into every agent endpoint
- [ ] Single commit in target project, pushed
- [ ] Sibling MCP repo created, package.json + src/index.js + README
- [ ] Sibling repo committed and pushed to github.com/callenil/<name>
- [ ] Calle has run the migration in Supabase
- [ ] Curl probes return 401 / 307 / 200 as expected
- [ ] Calle has done a real Claude Desktop sign-in test and confirmed
      the tools work

When all eleven are checked, tell Calle "MCP server pattern installed
in <project>; <N> tools exposed; <project>-mcp pushed and ready for
team to clone." Stop.
