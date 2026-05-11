# internal-tools-patterns

Reusable patterns for the **Concealed Wines internal-tools fleet** —
recipes Calle and the team can drop into new projects to keep them
visually and architecturally consistent without rebuilding common
infrastructure each time.

Each pattern is shipped as a pair:

- **`KICKOFF.md`** — paste-into-Claude task spec. Drop the file
  contents into a fresh Claude Code session inside any project; the
  session audits, asks the user the few inputs it can't infer, and
  installs the pattern end-to-end.
- **`REFERENCE.md`** — design doc for humans. Why the pattern exists,
  threat model / trade-offs, the full code, configuration checklist,
  rules of thumb. Read before you ask Claude to install the pattern.

---

## Patterns

| Pattern | Status | What it gives you |
|---|---|---|
| **[auth](./auth/)** | ✅ ready | 6-digit org passcode + email domain allow-list + per-IP rate limit + magic-link OTP + geo-IP gate. Five layers of defence-in-depth on the login flow. |
| **[mcp-server](./mcp-server/)** | ✅ ready | Bearer-token agent API + per-user keys + sibling MCP server for Claude Desktop. Federated fleet hub. Builds on conventions 01–04. |
| **design** | 🚧 planned | Light-only TMS-aligned design tokens, page header + section card + status badge components, ScrapeGlobal-parity classes. |

## Conventions

Cross-cutting standards every project should follow so they
interoperate cleanly. Read these BEFORE building a new project or
adding a cross-project integration.

| Convention | What it covers |
|---|---|
| **[01-agent-api-contract](./conventions/01-agent-api-contract.md)** | `/api/agent/*` URL shape, Bearer-token auth, request/response envelopes, HTTP status codes, audit-logging requirement. The wire contract every project speaks. |
| **[02-env-var-naming](./conventions/02-env-var-naming.md)** | `<PROJECT_SLUG>_API_URL` + `<PROJECT_SLUG>_API_KEY` for outbound calls. Slug registry. Public-vs-server-only rules. |
| **[03-service-registry](./conventions/03-service-registry.md)** | Living list of every project in the fleet — slug, URL, status, exposed endpoints, owner. Updated as projects come online. |
| **[04-audit-log-schema](./conventions/04-audit-log-schema.md)** | Uniform `audit_log` table schema and action-naming convention. Cross-project call tracing via `caller_project` field. |

---

## How to use

### **From a fresh project (most common)**

1. Open Claude Code in the new project's directory
2. Send the kickoff URL plus a short instruction:

   > *"Fetch this file and apply it as an install task. Audit first, then ask me whatever inputs you need before making changes."*
   > 
   > `https://raw.githubusercontent.com/callenil/internal-tools-patterns/main/auth/KICKOFF.md`

3. Claude in the new session audits the project, asks the few user-inputs (passcode, domain list, etc.), installs the pattern end-to-end.

### **For a colleague**

Same as above. DM the colleague the URL and the wrapper sentence;
they paste it into Claude Code in their project. Three minutes from
cold start.

### **For Calle, locally**

Either:
- Open the `KICKOFF.md` in your editor → Ctrl+A → Ctrl+C → paste in Claude Code in the target project, OR
- Use the URL flow above (works the same).

---

## Conventions across all patterns

- **Light-only design.** Every pattern targets the slate-and-orange
  palette used in Email Search and ScrapeGlobal. Dark-mode is
  explicitly skipped.
- **Same accent colour.** `--primary: #e0944d`. If a pattern adds new
  brand colours, document them in the pattern's `REFERENCE.md`.
- **Stack assumption.** Next.js App Router (16+), Supabase
  (`@supabase/ssr`), Tailwind CSS v4. Each pattern's kickoff stops
  early if these aren't present.
- **Idempotent installs.** Kickoff specs detect existing partial
  installs and don't blindly overwrite working code.
- **Audit-logged actions.** All admin / agent / write actions go
  through an `audit_log` table — Owner can review every action.
- **Fresh secrets per project.** Never reuse passcodes, agent keys, or
  tokens between projects. Each project is its own blast radius.

---

## Adding a new pattern

When you've shipped a new feature in one project that's worth porting,
distil it into a kickoff + reference pair and drop it under a new
top-level folder here:

```
new-pattern-name/
├── KICKOFF.md     ← Claude-oriented install spec
└── REFERENCE.md   ← human-oriented design doc
```

Follow the structure used by `auth/` for consistency.

---

## Repo norms

- Public repo (so kickoff URLs are reachable by `raw.githubusercontent.com`).
- No secrets, ever — passcodes are user-supplied at install time, not stored here.
- Commits squash-merged from feature branches, but for a tiny
  patterns repo direct-to-`main` is fine in practice.
- Tag breaking changes (`v2-auth`, `v2-design`) so old kickoffs keep
  working for in-flight projects that haven't migrated.

---

Maintained by Calle Nilsson. Used across the CW fleet (Email Search,
Tender Hunt, Forge, ScrapeGlobal, eWineTag, Vinjournalen, …).
