// OPTIMISTIC ONLY — NOT the security boundary.
//
// This middleware does a cheap COOKIE-PRESENCE check (getSessionCookie just looks for the
// session cookie; it does NOT validate the session against the DB) to bounce an already-logged-in
// user away from /login and /signup. The Better Auth docs explicitly mark this cookie check
// "NOT SECURE" (RESEARCH Anti-Patterns) — the REAL auth checks are per-page/per-action via
// `auth.api.getSession()`. Never gate sensitive data or capability on this middleware alone.

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Logged-out-only routes: a signed-in user has no business here, so optimistically redirect home.
const LOGGED_OUT_ONLY = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = getSessionCookie(request);

  if (hasSession && LOGGED_OUT_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on the logged-out auth routes only. (forgot/reset-password are intentionally
  // accessible while logged in — e.g. a user resetting from a verified-but-stale device.)
  matcher: ["/login", "/signup"],
};
