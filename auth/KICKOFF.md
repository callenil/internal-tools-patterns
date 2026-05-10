# Task — install the standard org-passcode auth gates in this project

> Paste the contents of this file into a Claude Code session in any
> internal-tools project (Forge, Tender Hunt, ScrapeGlobal, future
> projects). The session reads it, follows the steps in order, asks
> me only the things it genuinely can't infer, and ships the working
> auth pattern. Calle (the human) is the user; everything below is
> written for Claude.

---

## Goal

Add the same defence-in-depth login pattern Email Search uses
(geo-IP gate → rate limit → 6-digit org passcode → email-domain
allow-list → user-record check → Supabase magic-link OTP) to this
project. Single commit, verified with curl, ready to redeploy.

---

## Step 1 — audit the project before you ask anything

Run these checks in parallel, then proceed based on what you find.
Don't ask the user questions you can answer yourself.

⚠️ **Critical**: do NOT just `ls` the top-level directory and call it
done. The auth files live inside `src/` — recurse properly. A common
near-miss is reporting "no /login page exists" when in fact
`src/app/login/page.tsx` is right there but you didn't look deep
enough.

1. **Stack check** — confirm Next.js App Router + Supabase:
   ```bash
   grep -E '"next":|"@supabase/ssr":|"@supabase/supabase-js":' package.json
   ```
   If `next/ssr` isn't present, **stop** and tell the user this pattern
   is for Next.js + Supabase projects only.

2. **Existing auth detection** — recurse into `src/` (and `app/` if
   the project uses the older Pages-router-adjacent layout). Use these
   exact globs / commands:
   ```bash
   # Login page (any of these locations means auth UI exists)
   find . -type f \( -path "./src/app/login/page.tsx" \
                   -o -path "./app/login/page.tsx" \
                   -o -path "./pages/login.tsx" \) 2>/dev/null

   # Magic-link route handler
   find . -type f \( -path "./src/app/api/auth/send-magic-link/route.ts" \
                   -o -path "./app/api/auth/send-magic-link/route.ts" \) 2>/dev/null

   # Auth helpers directory
   find . -type d -name auth -path "*/lib/*" 2>/dev/null

   # Geo-IP middleware at project root
   ls middleware.ts 2>/dev/null

   # auth_attempts table in any migration
   grep -rl "auth_attempts" supabase/migrations/*.sql 2>/dev/null

   # verifyPasscode helper
   grep -rl "verifyPasscode\|timingSafeEqual" src/ 2>/dev/null
   ```

   If ANY of these find existing files, the pattern is at least
   partly installed. Read the existing files (don't trust filename
   alone — they might be stubs) and confirm with the user before
   doing anything.

3. **Supabase config** — find the project ref:
   ```bash
   grep -r "NEXT_PUBLIC_SUPABASE_URL" .env.local.example .env.example 2>/dev/null
   cat supabase/config.toml 2>/dev/null | grep project_id
   ```

4. **Existing env vars** — read `.env.local.example` to see what
   slots already exist.

If `auth_attempts` table + `verifyPasscode` helper already exist,
this pattern is already installed — **confirm with the user before
proceeding**, don't duplicate or overwrite. Show what you found and
ask if they want to (a) abort because the install is already done,
(b) verify / patch a partially-installed setup, or (c) reinstall
from scratch (rare — only if the existing setup is broken).

---

## Step 2 — ask the user (Calle) these 5 questions, ONE message

Don't trickle them in. Get all five in one block so Calle answers
once and you can proceed:

```
I'm installing the org-passcode auth pattern in <project>. I need
five values from you to proceed:

  1. ORG_PASSCODE — pick a fresh 6-digit code for this project.
     Don't reuse Email Search's (160114). Suggested: a memorable but
     non-obvious sequence.
  2. EMAIL_DOMAIN_ALLOW_LIST — comma-separated email domains that
     can sign in (e.g. concealedwines.com,peoplewine.se). For this
     project specifically, which org's people should have access?
  3. GEO_ALLOWED_COUNTRIES — comma-separated ISO-3166 country codes
     that can reach the login page. Default for the CW fleet:
     SE,NP,IN,GE,FR,IT,ES,DE. Reply "default" to use those, or list
     a different set.
  4. Production URL — what hostname is this project deployed at?
     (e.g. https://<project>.vercel.app — needed for Supabase Auth
     redirect-URL config).
  5. Initial Owner email — who's the first user that should be
     pre-created with role=owner? (Usually you, calle.nilsson@<one-of-
     the-allowed-domains>.)

Reply with all five values and I'll execute the install.
```

When the user replies, validate:
- Passcode is exactly 6 digits, all numeric
- Domains are valid hostnames, no `@`, no protocol
- Country codes are 2 letters
- URL is `https://...` with no trailing slash
- Owner email's domain is in the allow-list

If anything's malformed, point it out and re-ask just that field.

---

## Step 3 — install the files

All 7 files below go in verbatim. Don't refactor, don't modernise,
don't add features. The pattern is intentionally boring; it works
identically across every project.

### 3a) `middleware.ts` (project root)

```ts
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED = (process.env.GEO_ALLOWED_COUNTRIES ?? "")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|blocked|api).*)"],
};

export function middleware(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (!country) return NextResponse.next();
  if (!ALLOWED.includes(country)) {
    const url = req.nextUrl.clone();
    url.pathname = "/blocked";
    url.searchParams.set("c", country);
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}
```

### 3b) `src/app/blocked/page.tsx`

```tsx
export default function Blocked() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Access not permitted</h1>
      <p className="text-sm text-slate-600">
        This system is restricted to specific regions. If you believe this is an error,
        contact your administrator.
      </p>
    </main>
  );
}
```

### 3c) `src/lib/auth/passcode.ts`

```ts
import { timingSafeEqual } from "node:crypto";

/** Constant-time compare — defends against timing-attack enumeration. */
export function verifyPasscode(submitted: string, expected: string): boolean {
  if (submitted.length !== expected.length) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  return timingSafeEqual(a, b);
}
```

### 3d) `src/lib/auth/domains.ts`

```ts
const ALLOWED = (process.env.EMAIL_DOMAIN_ALLOW_LIST ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return ALLOWED.includes(email.slice(at + 1).toLowerCase());
}
```

### 3e) `src/lib/auth/rate-limit.ts`

```ts
import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MINUTES = 60;
const MAX_FAILS = 5;

export async function isRateLimited(ip: string): Promise<boolean> {
  const supa = createServiceClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supa
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("succeeded", false)
    .gte("attempted_at", since);
  if (error) return false; // fail-open on DB error
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordAttempt(ip: string, succeeded: boolean) {
  const supa = createServiceClient();
  await supa.from("auth_attempts").insert({ ip_address: ip, succeeded });
}
```

### 3f) `src/app/api/auth/send-magic-link/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPasscode } from "@/lib/auth/passcode";
import { isAllowedEmail } from "@/lib/auth/domains";
import { isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const Body = z.object({
  email: z.string().email().max(254),
  passcode: z.string().regex(/^\d{6}$/),
});

const GENERIC = { error: "Invalid passcode or email" };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0";

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(GENERIC, { status: 400 });
  const { email, passcode } = parsed.data;

  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 1 hour." },
      { status: 429 }
    );
  }

  if (!verifyPasscode(passcode, process.env.ORG_PASSCODE!)) {
    await recordAttempt(ip, false);
    return NextResponse.json(GENERIC, { status: 401 });
  }

  if (!isAllowedEmail(email)) {
    await recordAttempt(ip, false);
    return NextResponse.json(GENERIC, { status: 401 });
  }

  const supa = createServiceClient();
  const { data: user } = await supa
    .from("users")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();
  if (!user || user.status !== "active") {
    await recordAttempt(ip, false);
    return NextResponse.json(GENERIC, { status: 401 });
  }

  await recordAttempt(ip, true);
  return NextResponse.json({ ok: true });
}
```

### 3g) `src/app/login/page.tsx`

⚠ If a `/login` page already exists in the project, MERGE the
relevant pieces (passcode field + Step-1 server validation call +
Step-2 browser-side `signInWithOtp`) into the existing page rather
than overwriting it. Keep the project's existing styling.

```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);

    const validation = await fetch("/api/auth/send-magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, passcode }),
    });
    if (!validation.ok) {
      const data = await validation.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setState("error");
      return;
    }

    const supa = createClient();
    const { error: otpErr } = await supa.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (otpErr) {
      setError("Failed to send link: " + otpErr.message);
      setState("error");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Check your inbox</h1>
        <p className="text-sm text-slate-600">
          A magic link has been sent to {email} (if the credentials are valid).
          The link expires in 60 minutes.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Sign in</h1>
      <p className="mb-6 text-sm text-slate-600">
        Enter your organisation passcode and work email — we&apos;ll send a magic link.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Organisation passcode</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Send magic link"}
        </button>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
```

### 3h) `src/app/auth/callback/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login", req.url));
  const supa = await createClient();
  const { error } = await supa.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));
  }
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

(If the project's post-login landing page isn't `/dashboard`, change
the final redirect to whatever it is — e.g. `/projects` for ScrapeGlobal.)

---

## Step 4 — Supabase migration

Create the next migration file in `supabase/migrations/` (use the next
sequential number — read the directory first to get the right prefix).

Filename: `<NNNN>_auth_attempts.sql`. Content:

```sql
-- <NNNN>_auth_attempts.sql
-- Per-IP failed-attempt log for the rate limiter on /api/auth/send-magic-link.
-- Only service-role writes / reads it.

create table auth_attempts (
  id bigserial primary key,
  ip_address inet not null,
  succeeded boolean not null,
  attempted_at timestamptz default now()
);
create index auth_attempts_ip_time on auth_attempts (ip_address, attempted_at desc);

alter table auth_attempts enable row level security;
```

If a `users` table doesn't exist in this project yet, **stop** and ask
Calle if he wants you to also seed a basic users-and-orgs schema —
that's a different, larger task. The pattern above assumes
`users (id, email, role, status, primary_org_id, ...)` exists.

---

## Step 5 — `.env.local.example` update

Append (or merge into) the existing `.env.local.example`:

```bash
# Auth gates — see docs/org-passcode-pattern.md for the design rationale
ORG_PASSCODE=                               # exactly 6 digits, fresh per project
EMAIL_DOMAIN_ALLOW_LIST=                    # comma-separated, e.g. domain1.com,domain2.com
GEO_ALLOWED_COUNTRIES=SE,NP,IN,GE,FR,IT,ES,DE
```

---

## Step 6 — first-Owner seed SQL (give to user)

Generate a SQL block Calle pastes in his Supabase SQL editor. Use the
Owner email he gave in Step 2 question 5:

```sql
INSERT INTO users (id, email, full_name, role, status, primary_org_id)
VALUES (
  gen_random_uuid(),
  '<owner-email>',
  '<owner-name-or-email>',
  'owner',
  'active',
  (SELECT id FROM orgs WHERE primary_domain = '<owner-domain>')
)
ON CONFLICT (email) DO NOTHING;

SELECT u.email, u.role, u.status, o.name AS org
FROM users u LEFT JOIN orgs o ON o.id = u.primary_org_id
WHERE u.email = '<owner-email>';
```

If there's no `orgs` table or no row matching `<owner-domain>`, fall
back to `primary_org_id = NULL` and tell Calle to wire up the org
table separately.

---

## Step 7 — hand-off message to Calle

After the commit lands, output exactly this checklist to him (with
the `<placeholders>` filled in):

```
Code shipped (commit <hash>). Three manual steps to make the gates live:

1. Vercel env vars — https://vercel.com/<team>/<project>/settings/environment-variables
   Add (all 3 environments: Production, Preview, Development):
     ORG_PASSCODE = <the 6 digits I picked>
     EMAIL_DOMAIN_ALLOW_LIST = <the CSV>
     GEO_ALLOWED_COUNTRIES = <the CSV>
   Then Deployments → ⋯ → Redeploy.

2. Supabase Auth URL configuration —
   https://supabase.com/dashboard/project/<ref>/auth/url-configuration
   Site URL: <production-url>
   Redirect URLs (add all):
     <production-url>/auth/callback
     <production-url>/login
     <production-url>/**
     http://localhost:3000/**

3. Supabase SQL editor — paste the Owner-seed SQL above to create
   your first user. Run it; verify 1 row returned.

After all three, hit /login on production and try signing in. Tell me:
  - "redirect to /dashboard" → 🟢 working
  - "stuck on /login with an error" → paste the error
  - "magic link arrives but Supabase says invalid path" → URL config off
```

---

## Step 8 — verify (you, automatically, after deploy)

Once Calle confirms the redeploy is done, curl-probe these endpoints
without telling him to log in:

```bash
URL=https://<production-url>
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/login"
# Expect 200

curl -sS -X POST -H "content-type: application/json" -d '{}' \
  "$URL/api/auth/send-magic-link" -w "\n[%{http_code}]\n"
# Expect 400 with {"error":"Invalid passcode or email"}

curl -sS -X POST -H "content-type: application/json" \
  -d '{"email":"foo@notallowed.com","passcode":"000000"}' \
  "$URL/api/auth/send-magic-link" -w "\n[%{http_code}]\n"
# Expect 401 with {"error":"Invalid passcode or email"}
```

If any return 500, fetch the Vercel logs and diagnose. The most
common cause is a missing env var (NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
ORG_PASSCODE) — re-check Step 7 item 1.

---

## Things you must NOT do

- Don't run the migration yourself via Supabase CLI — Calle pastes
  it. (Different projects have different ways of running migrations
  and you might not have the right credentials.)
- Don't put the passcode in any URL, log, or audit-log payload.
- Don't return distinct error messages per failure mode. Every gate
  failure is the same generic 401 with `Invalid passcode or email`.
- Don't add Cloudflare Turnstile / hCaptcha. Calle decided the 5
  layers are enough — adding more friction without more security
  would be cargo-cult.
- Don't reuse Email Search's passcode (160114). Each project gets
  a fresh one to limit blast-radius if one leaks.
- Don't skip the rate limiter. Without it, the 6-digit space (10^6)
  is brute-forceable in hours.
- Don't hard-code the passcode anywhere except the env var.

---

## Done definition

- [ ] All 7 code files created (or merged into existing)
- [ ] Migration file added with correct sequential prefix
- [ ] `.env.local.example` updated
- [ ] Owner-seed SQL provided to Calle
- [ ] Single commit pushed (no env values in commit message)
- [ ] Calle has run the 3 manual steps
- [ ] Curl-probes return 200 / 400 / 401 as expected
- [ ] Calle confirms a magic-link sign-in works end-to-end

When all eight are checked, tell Calle "auth gates installed and
verified; <project> is up." Stop.
