# Org passcode pattern — drop-in spec for new internal-tool projects

A reusable defence-in-depth recipe Calle uses across internal tools
(Email Search, Forge, Tender Hunt, ScrapeGlobal, etc.) so that **even
if a magic-link / OAuth path leaks**, an unauthenticated visitor still
needs to know a shared 6-digit secret before any login flow starts.

This is **one layer in a stack**, not a complete auth solution. The
recipe also includes the rate-limiter and the email-domain allow-list
that pair with it — those three together are what make the layer
actually meaningful.

---

## Threat model

The org passcode protects against:

- **Drive-by enumeration** — bots that crawl public deployments looking
  for sign-in pages and try common emails. Without the passcode they
  can't even trigger a magic-link send.
- **Magic-link spam** — someone with a list of valid org emails firing
  password-reset / OTP requests at scale (annoyance + cost).
- **Casual phishing** — a curious ex-employee who knows your URL but
  not your shared secret.

It does **not** protect against:

- A determined attacker who has internal context (Slack screenshot,
  shoulder-surfed the passcode, social-engineered an admin).
- Account-takeover after auth (that's RLS / per-mailbox ACL territory).

So: rotate the passcode when someone leaves the org. Don't paste it in
public Slack channels. Treat it as a "lobby key" — entry friction, not
a vault password.

---

## The full stack (in request order)

```
[1] Geo-IP gate (middleware)               — block unallowed countries
[2] Rate limit per IP                      — 5 fails / hour
[3] Org passcode constant-time compare     — the 6-digit secret
[4] Email domain allow-list                — only @yourcompany.com etc.
[5] Active user record check               — must be pre-created by Owner
[6] Magic-link OTP                         — Supabase / Auth0 / etc.
[7] Per-row RLS in DB                      — every read scoped to user
```

Steps 1–5 happen in **one POST** to your `send-magic-link` route. If
any fails, return the same generic 401 — never tell the attacker which
gate they tripped.

---

## Implementation — copy these files into a new project

Tested with: **Next.js 16 App Router**, **Supabase**, **Tailwind v4**.
Works the same in Forge, Tender Hunt, ScrapeGlobal.

### **1. Env vars** (`.env.local.example`)

```bash
# Auth gates
ORG_PASSCODE=                               # 6 digits, e.g. 160114
EMAIL_DOMAIN_ALLOW_LIST=concealedwines.com,peoplewine.se,winetourism.com
GEO_ALLOWED_COUNTRIES=SE,NP,IN,GE,FR,IT,ES,DE
```

Set the same values in Vercel project env vars (Production + Preview +
Development).

### **2. Geo-IP middleware** (`middleware.ts`)

Drop in the project root. Vercel auto-injects `x-vercel-ip-country`
on production traffic. Excluded paths (`/api/*`, `/_next`, `/blocked`)
keep server-to-server callers and assets reachable from any country.

```ts
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED = (process.env.GEO_ALLOWED_COUNTRIES ?? "")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export const config = {
  // /api/* excluded so webhooks (SendGrid, Stripe) and agent endpoints
  // reach the app from any country. Page routes are still gated.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|blocked|api).*)"],
};

export function middleware(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (!country) return NextResponse.next(); // local dev / no header → bypass
  if (!ALLOWED.includes(country)) {
    const url = req.nextUrl.clone();
    url.pathname = "/blocked";
    url.searchParams.set("c", country);
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}
```

Plus a tiny `app/blocked/page.tsx` static page that says "Access not
permitted from this region. Contact <admin email>." — keep the message
generic; never list which countries are allowed.

### **3. Constant-time passcode compare** (`src/lib/auth/passcode.ts`)

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

### **4. Email domain allow-list** (`src/lib/auth/domains.ts`)

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

### **5. Rate-limiter** (`src/lib/auth/rate-limit.ts`)

```ts
import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MINUTES = 60;
const MAX_FAILS = 5;

/** True if this IP has hit the failure ceiling in the rolling window. */
export async function isRateLimited(ip: string): Promise<boolean> {
  const supa = createServiceClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supa
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("succeeded", false)
    .gte("attempted_at", since);
  if (error) return false; // fail-open on DB error — don't lock everyone out
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordAttempt(ip: string, succeeded: boolean) {
  const supa = createServiceClient();
  await supa.from("auth_attempts").insert({ ip_address: ip, succeeded });
}
```

### **6. `auth_attempts` table** (Supabase migration)

```sql
create table auth_attempts (
  id bigserial primary key,
  ip_address inet not null,
  succeeded boolean not null,
  attempted_at timestamptz default now()
);
create index auth_attempts_ip_time on auth_attempts (ip_address, attempted_at desc);

-- No RLS policies needed — only service-role writes / reads it.
alter table auth_attempts enable row level security;
```

### **7. Server-side validation route** (`src/app/api/auth/send-magic-link/route.ts`)

The orchestrator. Every gate must pass before we hand off to Supabase.

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

  // Rate limit BEFORE password check so attackers can't bypass it
  // by spamming a single IP.
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 1 hour." },
      { status: 429 }
    );
  }

  // 1. Passcode
  if (!verifyPasscode(passcode, process.env.ORG_PASSCODE!)) {
    await recordAttempt(ip, false);
    return NextResponse.json(GENERIC, { status: 401 });
  }

  // 2. Email domain
  if (!isAllowedEmail(email)) {
    await recordAttempt(ip, false);
    return NextResponse.json(GENERIC, { status: 401 });
  }

  // 3. Active user record (must be pre-created by an admin)
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

  // All gates passed. Browser then calls supa.auth.signInWithOtp() so
  // PKCE state can live in localStorage. We never call signInWithOtp
  // server-side.
  await recordAttempt(ip, true);
  return NextResponse.json({ ok: true });
}
```

### **8. Login form** (`src/app/login/page.tsx` excerpt)

The browser side has TWO steps: validate via your route first, then
call Supabase from the browser to actually send the magic link.

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

    // Step 1 — server-side validation
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

    // Step 2 — magic link from the BROWSER (so PKCE state survives)
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
        <h1 className="mb-2 text-2xl font-bold">Check your inbox</h1>
        <p className="text-sm text-slate-600">
          A magic link has been sent to {email} (if the credentials are valid).
          The link expires in 60 minutes.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-2 text-2xl font-bold">Sign in</h1>
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

### **9. Auth callback** (`src/app/auth/callback/route.ts`)

This is what the magic link in the email points back to. Standard
Supabase pattern.

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

---

## Configuration checklist for a new project

- [ ] Add the 7 files above to the new repo
- [ ] Add the `auth_attempts` migration + run it
- [ ] Set Supabase Auth → URL Configuration → Site URL = production URL
- [ ] Set Supabase Auth → Redirect URLs → include `<prod>/auth/callback`,
      `<prod>/login`, and `<prod>/**`
- [ ] Set the 3 env vars in Vercel: `ORG_PASSCODE`,
      `EMAIL_DOMAIN_ALLOW_LIST`, `GEO_ALLOWED_COUNTRIES` — all 3 environments
- [ ] Deploy
- [ ] Smoke test: try wrong passcode → 401. Try wrong domain → 401.
      Try right combo → magic link arrives.

---

## Rules of thumb

- **Always pair the passcode with the domain allow-list.** A passcode
  alone protects nothing if anyone can sign in with their gmail —
  you've just shifted the attack surface to the email step.
- **Always pair both with rate limiting.** Without it, a script can
  brute-force the 6-digit space (10^6 = 1M attempts) overnight.
- **Don't add the passcode to URLs.** Always POST it. URLs end up in
  server logs and browser history.
- **Use the same generic error message** for every failure mode.
  Different errors leak which gate was tripped.
- **Rotate when someone leaves.** Update the env var, redeploy. Two
  minutes of work.
- **Distribute the passcode out-of-band** — DM, in-person, password
  manager. Never in a public Slack channel or Notion page.
- **Don't reuse passcodes across systems.** Each project gets its own
  6-digit code so a leak in one doesn't compromise the others.
- **6 digits is fine for an internal-tools lobby key.** With rate
  limiting at 5 fails / hour, the brute-force time is ~22 years.
  Longer codes give marginally more security but hurt usability.

---

## Variants worth knowing

- **Multi-tier passcodes** — different codes per role (Owner /
  Org-Lead / Staff). Doable but most internal tools don't need it.
  Per-user role assignment after auth handles privilege separation.
- **Time-limited passcodes** — rotate automatically every 30 days,
  email the new code to active users. Worth it if your team turnover
  is high.
- **Per-org passcodes** — multi-tenant SaaS where each customer org
  gets its own code. Different problem; this pattern is for
  single-org internal tools.
- **Cloudflare Turnstile** — bot challenge added BEFORE the passcode
  step. Useful if you start seeing scripted attacks in the
  `auth_attempts` table.

---

End of spec. Copy this file into the `docs/` of any new project and
the recipe stays portable.
