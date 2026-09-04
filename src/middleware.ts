// OPTIMISTIC ONLY — NOT the security boundary.
//
// This middleware does a cheap COOKIE-PRESENCE check (getSessionCookie just looks for the
// session cookie; it does NOT validate the session against the DB) to bounce an already-logged-in
// user away from /login and /signup. The Better Auth docs explicitly mark this cookie check
// "NOT SECURE" (RESEARCH Anti-Patterns) — the REAL auth checks are per-page/per-action via
// `auth.api.getSession()`. Never gate sensitive data or capability on this middleware alone.
//
// QK-IR9 — IT NOW DEFERS INSTEAD OF DECIDING, and that is the whole fix.
// Presence is not liveness. A password reset (revokeSessionsOnPasswordReset:true, D-13) deletes the
// session ROW while the browser keeps its httpOnly cookie, so this check used to see a cookie,
// conclude "logged in", and redirect /login -> / — locking the user out of /login for the cookie's
// full 30-day life, with no sign-out to recover with (confirmed live 2026-08-05). The same lockout
// followed from ANY stale cookie: expired session, admin revocation, wiped dev database.
// So instead of terminating the journey at /, a cookie-bearing request is now handed to
// /auth/session-check, which does the authoritative getSession() and the (legal) cookie write —
// see the reasoning in @/lib/session-check. THIS FILE STILL TOUCHES NO DATABASE, still imports
// nothing from the auth or db layer, and still makes no authoritative decision. It only DEFERS.
//
// `_sc` IS A ONE-SHOT LOOP GUARD, and it is checked BEFORE the cookie so it holds even when the
// clearing failed to reach the browser. Without it, a cookie that would not clear (the measured
// bad-signature / rotated-secret path) would bounce /login -> check -> /login forever:
// ERR_TOO_MANY_REDIRECTS, a WORSE failure than the bug this fixes. It is a QUERY PARAM rather than a
// guard cookie precisely so it cannot share a failure mode with the Set-Cookie it guards.
// ACCEPTED TRADEOFF (threat T-IR9-02): the param is forgeable, so a genuinely logged-in user who
// hand-types /login?_sc=1 reaches the login page instead of being bounced. That bypasses an
// optimistic UX convenience which this very header already declares is not a security boundary, and
// /login exposes no gated data.
//
// DELIBERATE ASYMMETRY: the match below uses `startsWith` (byte-equivalent to the previous
// behaviour) while `safeReturnPath` allowlists the return path EXACTLY, so a hypothetical /login/x
// would come back as /login. Strictly safe, and config.matcher makes it unreachable anyway.

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  SESSION_CHECK_PATH,
  RETURN_PARAM,
  CHECKED_PARAM,
  LOGGED_OUT_ONLY,
} from "@/lib/session-check";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Not a logged-out-only route: nothing to do.
  if (!LOGGED_OUT_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // THE LOOP GUARD — before the cookie check, on purpose (see header).
  if (request.nextUrl.searchParams.has(CHECKED_PARAM)) {
    return NextResponse.next();
  }

  // Presence-only, exactly as before. No cookie -> no hop, no cost.
  if (!getSessionCookie(request)) {
    return NextResponse.next();
  }

  // A cookie is present, but only the verifier can tell whether it is alive.
  const check = new URL(SESSION_CHECK_PATH, request.url);
  check.searchParams.set(RETURN_PARAM, `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(check);
}

export const config = {
  // Run on the logged-out auth routes only. (forgot/reset-password are intentionally
  // accessible while logged in — e.g. a user resetting from a verified-but-stale device.)
  // /auth/session-check must NOT be matched, or the delegation would intercept itself.
  matcher: ["/login", "/signup"],
};
