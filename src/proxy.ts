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
import { classifyRequestHost } from "@/lib/app-origins";

const OPS_AUTH_PREFIX = "/_ops-auth";
const OPS_CLOAK_PATH = "/_ops-cloak";
const OPS_PATH = "/ops";
const AUTH_API_PATH = "/api/auth";

const OPS_VISIBLE_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"] as const;
const OPS_PUBLIC_ASSETS = new Set([
  "/favicon.ico",
  "/icon-court.svg",
  "/icon-grove.svg",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
]);

function isPathSegment(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(`${segment}/`);
}

function rewrite(request: NextRequest, pathname: string): NextResponse {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  return NextResponse.rewrite(target);
}

function opsAuthTarget(pathname: string): string | null {
  if (OPS_VISIBLE_AUTH_PATHS.includes(pathname as (typeof OPS_VISIBLE_AUTH_PATHS)[number])) {
    return `${OPS_AUTH_PREFIX}${pathname}`;
  }
  if (isPathSegment(pathname, "/invite")) return `${OPS_AUTH_PREFIX}${pathname}`;
  return null;
}

function isOpsPassPath(pathname: string): boolean {
  return (
    isPathSegment(pathname, OPS_PATH) ||
    isPathSegment(pathname, AUTH_API_PATH) ||
    isPathSegment(pathname, "/_next") ||
    OPS_PUBLIC_ASSETS.has(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The cloak target must be allowed to render its root notFound() response after a rewrite.
  if (isPathSegment(pathname, OPS_CLOAK_PATH)) return NextResponse.next();

  const hostClass = classifyRequestHost(request.headers.get("host"));

  if (hostClass === "ops") {
    // Internal route names are never a public API, even on the correct host.
    if (isPathSegment(pathname, OPS_AUTH_PREFIX)) return rewrite(request, OPS_CLOAK_PATH);

    const authTarget = opsAuthTarget(pathname);
    if (authTarget !== null) return rewrite(request, authTarget);
    if (isOpsPassPath(pathname)) return NextResponse.next();

    // The dedicated host exposes only the ops console, its auth surface and required assets.
    return rewrite(request, OPS_CLOAK_PATH);
  }

  // Public, exact preview and unknown hosts can never reach the ops segment or internal auth tree.
  if (isPathSegment(pathname, OPS_PATH) || isPathSegment(pathname, OPS_AUTH_PREFIX)) {
    return rewrite(request, OPS_CLOAK_PATH);
  }

  // Not a logged-out-only route: nothing to do.
  if (!LOGGED_OUT_ONLY.includes(pathname as (typeof LOGGED_OUT_ONLY)[number])) {
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
  // Host partitioning must see every route. The explicit matrix above passes required framework,
  // auth API and public-asset traffic before applying a cloak or visible ops-auth rewrite.
  matcher: ["/:path*"],
};
