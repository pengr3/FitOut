// THE STALE-SESSION SELF-HEAL — shared by src/proxy.ts and src/app/auth/session-check/route.ts.
//
// PROBLEM (confirmed live 2026-08-05). `revokeSessionsOnPasswordReset: true` (src/lib/auth.ts, D-13)
// deletes the session ROW. Nothing clears the browser's cookie, and the cookie is httpOnly so client
// JS cannot. Middleware's PRESENCE-only check then sees a cookie, concludes "logged in", and bounces
// /login -> /. The user is locked out of /login for the 30-day cookie lifetime, with no sign-out to
// recover with. Same lockout for any stale cookie: expired session, admin revocation, wiped dev DB.
//
// WHY THE CLEARING LIVES IN A ROUTE HANDLER AND NOWHERE ELSE — measured, not theorised.
// Next.js permits cookie mutation only in Proxy, Route Handlers and Server Actions.
//   - NOT a shared requireSession() helper on the gated pages. Better Auth applies its Set-Cookie
//     headers through the nextCookies() after-hook
//     (node_modules/better-auth/dist/integrations/next-js.mjs), which calls Next's cookies().set()
//     inside a bare `try { ... } catch {}`. In a React Server Component cookies().set() THROWS and
//     that catch swallows it SILENTLY. Such a helper would compile, run, review as correct — and
//     clear nothing. It also would not fix the plainest repro: typing /login directly, which touches
//     no gated page at all.
//   - NOT Proxy doing the check itself. Proxy must stay optimistic and DB-free (it says so in its
//     own header, and Better Auth documents the cookie check as "NOT SECURE"). There is also
//     no DB-free way to know: a revoked row still carries a VALID HMAC and session.cookieCache is
//     off, so nothing in the request distinguishes live from dead.
// Therefore Proxy DEFERS to /auth/session-check, and the authoritative read + the (legal)
// cookie write happen here.
//
// WHERE THE CLEARING HEADER COMES FROM. Better Auth already produces exactly the right header:
// /get-session calls deleteSessionCookie(ctx) when findSession returns null or the row is expired
// (dist/api/routes/session.mjs). We take it VERBATIM off `auth.handler`'s Response — cookie names,
// prefixes and attributes are NEVER hand-rolled here. See the long comment at the call site for why
// it MUST be auth.handler and not auth.api.getSession: the direct server-API call routes the header
// through nextCookies() -> next/headers cookies(), which silently drops `Max-Age=0` and leaves the
// browser holding a zombie empty cookie. That was caught in a real browser, not in review.
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
// EDGE-SAFETY: the ONLY value import here is next/server, because src/proxy.ts imports this file into
// the Edge bundle. Better Auth is referenced by STRUCTURAL TYPE only. If a future edit adds
// @/lib/auth or @/lib/db, `npm run build` breaks LOUDLY — a visible failure mode, chosen on purpose.

import { NextResponse, type NextRequest } from "next/server";

/** The delegation endpoint. Deliberately NOT under /api/auth/* — that is Better Auth's catch-all. */
export const SESSION_CHECK_PATH = "/auth/session-check";

/** Query param carrying the path the user was actually trying to reach. Attacker-controlled. */
export const RETURN_PARAM = "next";

/**
 * One-shot loop guard (threat T-IR9-02). A request already carrying this marker is passed straight
 * through by Proxy, so a failure to clear the cookie degrades to "one extra redirect" and NEVER
 * to ERR_TOO_MANY_REDIRECTS — which would be a WORSE failure than the bug this fixes. It is a QUERY
 * PARAM and not a guard cookie precisely so it does not share a failure mode with the Set-Cookie it
 * guards. It is forgeable; that is accepted and documented in src/proxy.ts.
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
  /** Better Auth's HTTP entry point — the same one src/app/api/auth/[...all]/route.ts mounts. */
  handler: (request: Request) => Promise<Response>;
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
    // WHY auth.handler AND NOT auth.api.getSession — measured in a real browser, not assumed.
    //
    // Both return the same JSON and the same Set-Cookie headers. The difference is what Next.js
    // then does to them. `auth.api.getSession()` is a DIRECT server-API call, so Better Auth's
    // nextCookies() after-hook treats it as "no HTTP response of its own" and replays the headers
    // through next/headers cookies(). This route handler IS a writable cookie scope, so unlike in
    // an RSC that replay SUCCEEDS — and corrupts the header on the way:
    //
    //   emitted by Better Auth : better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
    //   received by Chrome     : better-auth.session_token=;            Path=/; HttpOnly; SameSite=lax
    //
    // parseSetCookieHeader maps "Max-Age=0" to the NUMBER 0, and next/headers cookies().set() drops
    // a FALSY maxAge. Next then merges that request-scoped store OVER the response, so the correct
    // header cannot be rescued from this side — measured: appending it and re-setting it via
    // NextResponse.cookies both lost to the merge. Result: a zombie cookie with an empty value that
    // the browser keeps, instead of a deleted one.
    //
    // Going through auth.handler routes the call via better-call, which sets `_flag: "router"`, and
    // the nextCookies after-hook returns early on exactly that flag — because a routed call already
    // carries its Set-Cookie on a real HTTP response, which is precisely our situation. So there is
    // exactly ONE writer of Set-Cookie here and it is Better Auth's own header, verbatim.
    //
    // It also removes a TEST/PROD DIVERGENCE that is the reason this class of bug hides: the
    // in-process tests inject makeTestAuth() and take the same routed path production takes.
    // OPS-08 makes Better Auth's base URL request-specific, so the unresolved root context no
    // longer owns one string baseURL. Preserve the incoming authority instead and ensure direct
    // test/Server Function requests that carry it only in the URL still provide an exact Host.
    const authHeaders = new Headers(request.headers);
    if (!authHeaders.has("host")) authHeaders.set("host", request.nextUrl.host);
    const res = await auth.handler(
      new Request(new URL("/api/auth/get-session", request.url), { headers: authHeaders }),
    );

    // NOT AUTHORITATIVE unless it is a clean 200. Better Auth answers 200 + body `null` for "no
    // session", so anything else (429 from the rateLimit config, 5xx) means we do not KNOW. Never
    // clear a cookie on a non-200: a rate-limited burst must not log a legitimate user out.
    if (res.status !== 200) return degradedRedirect(target, request);

    session = (await res.json()) as { user?: unknown } | null;
    emitted = res.headers.getSetCookie();
  } catch {
    // Bias EVERY failure toward "/login is reachable", never toward the lockout. A logged-in user
    // briefly seeing the public login page during a DB outage is not a security event — the real
    // gate is the per-page auth.api.getSession() on each protected route.
    return degradedRedirect(target, request);
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
      // Names and attributes still come from the framework so production's __Secure- prefix is
      // never hand-typed. NextResponse's own cookies.set() serializes maxAge:0 correctly.
      out.cookies.set(sessionToken.name, "", { ...sessionToken.attributes, maxAge: 0 });
    }
  }

  // No CDN or router cache may memoise a redirect whose target depends on cookie state.
  out.headers.set("cache-control", "no-store");
  return out;
}

/**
 * The failure/degraded redirect: go where the user was headed, WITHOUT touching any cookie.
 * Every uncertain path routes here, so the worst case is "the login page is reachable", never the
 * lockout and never a cleared cookie we were not sure about.
 */
function degradedRedirect(target: string, request: NextRequest): Response {
  const res = NextResponse.redirect(new URL(target, request.url));
  res.headers.set("cache-control", "no-store");
  return res;
}
