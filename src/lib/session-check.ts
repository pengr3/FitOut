// THE STALE-SESSION SELF-HEAL — shared by src/middleware.ts and src/app/auth/session-check/route.ts.
//
// PROBLEM (confirmed live 2026-08-05). `revokeSessionsOnPasswordReset: true` (src/lib/auth.ts, D-13)
// deletes the session ROW. Nothing clears the browser's cookie, and the cookie is httpOnly so client
// JS cannot. Middleware's PRESENCE-only check then sees a cookie, concludes "logged in", and bounces
// /login -> /. The user is locked out of /login for the 30-day cookie lifetime, with no sign-out to
// recover with. Same lockout for any stale cookie: expired session, admin revocation, wiped dev DB.
//
// WHY THE CLEARING LIVES IN A ROUTE HANDLER AND NOWHERE ELSE — measured, not theorised.
// Next.js permits cookie mutation only in middleware, Route Handlers and Server Actions.
//   - NOT a shared requireSession() helper on the gated pages. Better Auth applies its Set-Cookie
//     headers through the nextCookies() after-hook
//     (node_modules/better-auth/dist/integrations/next-js.mjs), which calls Next's cookies().set()
//     inside a bare `try { ... } catch {}`. In a React Server Component cookies().set() THROWS and
//     that catch swallows it SILENTLY. Such a helper would compile, run, review as correct — and
//     clear nothing. It also would not fix the plainest repro: typing /login directly, which touches
//     no gated page at all.
//   - NOT middleware doing the check itself. Middleware must stay optimistic and DB-free (it says so
//     in its own header, and Better Auth documents the cookie check as "NOT SECURE"). There is also
//     no DB-free way to know: a revoked row still carries a VALID HMAC and session.cookieCache is
//     off, so nothing in the request distinguishes live from dead.
// Therefore middleware DEFERS to /auth/session-check, and the authoritative read + the (legal)
// cookie write happen here.
//
// WHERE THE CLEARING HEADER COMES FROM. Better Auth already produces exactly the right header:
// /get-session calls deleteSessionCookie(ctx) when findSession returns null or the row is expired
// (dist/api/routes/session.mjs). We take it VERBATIM via getSession({ asResponse: true }) — cookie
// names, prefixes and attributes are NEVER hand-rolled here.
//
// THE ONE PATH BETTER AUTH SKIPS, and why the fallback below is not optional. session.mjs:41-42 is
// `const sessionCookieToken = await ctx.getSignedCookie(...); if (!sessionCookieToken) return null;`
// — it returns BEFORE deleteSessionCookie. A cookie whose HMAC no longer verifies (rotated
// BETTER_AUTH_SECRET) is therefore null-but-not-cleared; measured: status 200, set-cookie []. The
// explicit fallback fires ONLY on that path, and still sources the cookie NAME and ATTRIBUTES from
// the framework (auth.$context.authCookies) so production's __Secure- prefix is never hand-typed.
//
// CONSTRAINT 3, ABSOLUTE: this module must NEVER call a sign-in / sign-up / session-create API. The
// only cookie mutation it may ever perform is an EXPIRY. Gated by a grep in the plan's verify block.
//
// EDGE-SAFETY: the ONLY value import here is next/server, because middleware imports this file into
// the Edge bundle. Better Auth is referenced by STRUCTURAL TYPE only. If a future edit adds
// @/lib/auth or @/lib/db, `npm run build` breaks LOUDLY — a visible failure mode, chosen on purpose.

import { NextResponse, type NextRequest } from "next/server";

/** The delegation endpoint. Deliberately NOT under /api/auth/* — that is Better Auth's catch-all. */
export const SESSION_CHECK_PATH = "/auth/session-check";

/** Query param carrying the path the user was actually trying to reach. Attacker-controlled. */
export const RETURN_PARAM = "next";

/**
 * One-shot loop guard (threat T-IR9-02). A request already carrying this marker is passed straight
 * through by middleware, so a failure to clear the cookie degrades to "one extra redirect" and NEVER
 * to ERR_TOO_MANY_REDIRECTS — which would be a WORSE failure than the bug this fixes. It is a QUERY
 * PARAM and not a guard cookie precisely so it does not share a failure mode with the Set-Cookie it
 * guards. It is forgeable; that is accepted and documented in src/middleware.ts.
 */
export const CHECKED_PARAM = "_sc";

/** Routes a signed-in user has no business on. The only paths `next` may resolve to. */
export const LOGGED_OUT_ONLY = ["/login", "/signup"];

/** Opaque base used only to resolve `next` safely; nothing is ever fetched from it. */
const INTERNAL_BASE = "http://internal.invalid";

/**
 * Open-redirect guard for the attacker-controlled `next` param (threat T-IR9-01).
 *
 * Anything that is not an EXACT member of LOGGED_OUT_ONLY resolves to /login. Rejected up front:
 * absolute URLs, protocol-relative `//evil.com`, and backslash-smuggled `/\evil.com` (which some
 * browsers normalise to protocol-relative). The surviving query is preserved — the post-reset
 * `?reset=1` notice MUST survive the extra hop — and then CHECKED_PARAM is forced to exactly one
 * copy so an inbound marker cannot be stacked.
 */
export function safeReturnPath(raw: string | null): string {
  let pathname = "/login";
  let params = new URLSearchParams();

  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    try {
      const resolved = new URL(raw, INTERNAL_BASE);
      if (resolved.origin === INTERNAL_BASE && LOGGED_OUT_ONLY.includes(resolved.pathname)) {
        pathname = resolved.pathname;
        params = resolved.searchParams;
      }
    } catch {
      // Unparseable -> keep the /login fallback.
    }
  }

  params.delete(CHECKED_PARAM);
  params.set(CHECKED_PARAM, "1");
  return `${pathname}?${params.toString()}`;
}

/**
 * The minimal structural contract sessionCheckResponse needs from a Better Auth instance. Typed
 * structurally (not imported) so this module stays Edge-safe and so the test can inject
 * makeTestAuth(testDb) while the route handler injects the production instance.
 */
export type SessionCheckAuth = {
  api: {
    getSession: (options: { headers: Headers; asResponse: true }) => Promise<Response>;
  };
  $context: Promise<{
    authCookies: {
      sessionToken: { name: string; attributes: Record<string, unknown> };
    };
  }>;
};

/**
 * The body of GET /auth/session-check.
 *
 * STALE cookie -> 307 to `next` (allowlisted) carrying Better Auth's own expiring Set-Cookie.
 * VALID cookie -> 307 to `/` carrying NO clearing at all (constraint 4; threat T-IR9-05).
 * NO/garbage cookie -> 307 to `next`; costs ZERO database queries, because Better Auth returns
 *   before any DB access when the token is absent or its HMAC fails (threat T-IR9-03).
 */
export async function sessionCheckResponse(
  auth: SessionCheckAuth,
  request: NextRequest,
): Promise<Response> {
  const target = safeReturnPath(request.nextUrl.searchParams.get(RETURN_PARAM));

  let session: { user?: unknown } | null = null;
  let emitted: string[] = [];

  try {
    // asResponse is LOAD-BEARING: it is the only way deleteSessionCookie's headers are reachable.
    const res = await auth.api.getSession({ headers: request.headers, asResponse: true });
    session = (await res.json()) as { user?: unknown } | null;
    emitted = res.headers.getSetCookie();
  } catch {
    // Bias EVERY failure toward "/login is reachable", never toward the lockout. A logged-in user
    // briefly seeing the public login page during a DB outage is not a security event — the real
    // gate is the per-page auth.api.getSession() on each protected route.
    const degraded = NextResponse.redirect(new URL(target, request.url));
    degraded.headers.set("cache-control", "no-store");
    return degraded;
  }

  const signedIn = Boolean(session?.user);
  const out = NextResponse.redirect(new URL(signedIn ? "/" : target, request.url));

  // Forward whatever the framework emitted: the clearing headers for a dead session, or the
  // sliding-session refresh for a live one. Never reconstructed by hand.
  for (const c of emitted) {
    out.headers.append("set-cookie", c);
  }

  if (!signedIn) {
    const { sessionToken } = (await auth.$context).authCookies;
    const alreadyCleared = emitted.some((c) => c.startsWith(`${sessionToken.name}=`));
    if (!alreadyCleared) {
      // The measured bad-signature / rotated-secret path: Better Auth returned before
      // deleteSessionCookie, so nothing was emitted and the cookie would survive forever.
      out.cookies.set(sessionToken.name, "", { ...sessionToken.attributes, maxAge: 0 });
    }
  }

  // No CDN or router cache may memoise a redirect whose target depends on cookie state.
  out.headers.set("cache-control", "no-store");
  return out;
}
