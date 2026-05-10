# mcp-server pattern (planned)

Bearer-token-authenticated MCP server scaffold — exposes an internal
tool's data to Claude Desktop via stdio MCP transport.

**What this will ship when written:**

- Node ESM `src/index.js` skeleton with the Anthropic MCP SDK
- 4–8 generic tool stubs (search, history-preview, history-export,
  business-context, contact-lookup, contact-search) — wire them up to
  the project's own `/api/agent/*` endpoints
- `claude_desktop_config.json` snippet for users to paste
- Per-user agent-key UI flow (matching Email Search's
  `/account/connect-claude` page) — generate, regenerate, revoke
- Server-side `agents` table schema with hashed key + per-user binding
- Audit-log integration so every agent call is traceable

Status: not yet written. Email Search has the live implementation in
[email-search-mcp](https://github.com/callenil/email-search-mcp) and
in `src/app/api/agent/*` of email-search-system; distilling that into
a clean portable scaffold is on the to-do list.

For now, fork email-search-mcp and adapt as a shortcut.
