// QK-IR9 / AUTH-02 / AUTH-03 — LAYER 2: the SHIPPED self-heal, against real Postgres.
//
// THE BUG THIS LOCKS DOWN (confirmed live 2026-08-05, by a human, doing the boring thing):
// `revokeSessionsOnPasswordReset: true` (src/lib/auth.ts) deletes the session ROW; nothing clears the
// browser's httpOnly cookie. src/middleware.ts does a PRESENCE-only check, sees the stale cookie,
// concludes "logged in", and bounces /login -> /. The user lands on the public search home and can
// never get back to /login for the 30-day cookie lifetime. There is no sign-out to recover with.
//
// The fix: middleware DELEGATES to /auth/session-check, whose body is `sessionCheckResponse` here.
// It runs the AUTHORITATIVE auth.api.getSession({asResponse:true}) — the only way Better Auth's own
// deleteSessionCookie headers become reachable — and carries them onto a redirect back to /login.
//
// WHY THE ASSERTIONS BELOW ARE SHAPED THIS WAY:
//   - Case 1 reproduces the bug through a REAL requestPasswordReset + resetPassword, NOT by deleting
//     the session row with SQL. The whole point is that the SHIPPED reset produces this state.
//   - Case 1 asserts the CLEARED cookie name is byte-identical to the name `getSessionCookie` (the
//     function middleware calls) actually reads. The entire fix hinges on those two strings being
//     the same one; a mismatch would clear a cookie nobody looks at and the lockout would survive.
//   - Case 2 is the CONVERSE and it is not optional (constraint 4): a VALID session must still be
//     bounced to / and must come back UNDAMAGED. Otherwise this endpoint would be a CSRF-style
//     forced-logout primitive (threat T-IR9-05).
//   - Case 3 covers the ONE path Better Auth does not: session.mjs:41-42 returns BEFORE
//     deleteSessionCookie when the cookie's HMAC does not verify (rotated BETTER_AUTH_SECRET), so a
//     bad-signature cookie is null-but-not-cleared. Measured during planning: status 200, set-cookie
//     []. That is why sessionCheckResponse carries an explicit fallback expiry.
//   - Case 4 is the open-redirect allowlist (threat T-IR9-01). `next` is attacker-controlled.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATIONS — BOTH EXECUTED 2026-08-05. A mutation that is described but never run is a comment.
// Predictions are hypotheses; what follows is the OBSERVED output, verbatim.
//
//   MUTATION 2 — delete `for (const c of emitted) out.headers.append("set-cookie", c);` from
//     sessionCheckResponse (src/lib/session-check.ts).
//     PREDICTED: case 1 RED "and possibly 3".
//     OBSERVED — Tests  1 failed | 3 passed (4):
//       × case 1 (THE BUG): a stale session cookie is cleared and the user is sent back to /login
//         AssertionError: expected undefined not to be undefined
//          ❯ tests/auth/stale-session-selfheal.test.ts:173:25
//     DIVERGENCE FROM THE PREDICTION, resolved by measuring rather than by adjusting code: case 3
//     stayed GREEN. Better Auth's forwarded header is what carries case 1; the explicit fallback is
//     what carries case 3. They cover DISJOINT paths and neither substitutes for the other — which
//     is precisely why both exist. Restored by EDITING THE FILE BACK -> 4/4 green.
//
//   MUTATION 3 — drop the `signedIn ? "/" :` condition so the redirect target is always `target`.
//     PREDICTED: case 2 RED (constraint 4 held by CODE, not luck).
//     OBSERVED — Tests  1 failed | 3 passed (4):
//       × case 2 (CONVERSE, constraint 4): a VALID session is still bounced to / and is NOT cleared
//         AssertionError: expected '/login' to be '/' // Object.is equality
//         Expected: "/"
//         Received: "/login"
//          ❯ tests/auth/stale-session-selfheal.test.ts:193:38
//     Restored by EDITING THE FILE BACK -> 4/4 green.
//
// RESTORE EVIDENCE IS THE GREEN RE-RUN, NOT git. src/lib/session-check.ts was UNTRACKED while these
// mutations ran, and `git diff --exit-code` is blind to untracked files. `git add -N` does NOT fix
// that — it pins an EMPTY index baseline (so the gate can never pass) and makes `git checkout --`
// truncate the file to 0 bytes. Both verified empirically in this repo. Each mutation was restored
// by EDITING THE FILE BACK.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockResend } from "../helpers/mocks";
import {
  sessionCheckResponse,
  safeReturnPath,
  SESSION_CHECK_PATH,
  RETURN_PARAM,
  CHECKED_PARAM,
  type SessionCheckAuth,
} from "@/lib/session-check";

const ORIGIN = "http://localhost:3000";

let testDb: TestDb;
let auth: TestAuth;

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

/** The test-schema auth instance, narrowed to the structural contract the helper needs. */
function injected(): SessionCheckAuth {
  return auth as unknown as SessionCheckAuth;
}

/** Pull the better-auth session cookie (name=value) out of a Set-Cookie header. */
function sessionCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

/** Extract the reset token from the emailed link (query param, else last path segment). */
function tokenFromLink(link: string | null): string {
  if (!link) throw new Error("no reset link captured");
  const url = new URL(link);
  return url.searchParams.get("token") ?? url.pathname.split("/").pop() ?? "";
}

/** Build the GET /auth/session-check request a delegating middleware would produce. */
function checkRequest(next: string | null, cookie: string): NextRequest {
  const url = new URL(SESSION_CHECK_PATH, ORIGIN);
  if (next !== null) url.searchParams.set(RETURN_PARAM, next);
  return new NextRequest(url, { headers: { cookie } });
}

/** The Set-Cookie entry (if any) that EXPIRES `name` — value emptied and/or Max-Age<=0. */
function expiryFor(setCookies: string[], name: string): string | undefined {
  return setCookies.find((c) => {
    if (!c.startsWith(`${name}=`)) return false;
    const value = c.slice(name.length + 1).split(";")[0];
    const maxAge = /;\s*max-age=(-?\d+)/i.exec(c);
    return value === "" || (maxAge !== null && Number(maxAge[1]) <= 0);
  });
}

/** The `location` header of a redirect Response, parsed. */
function locationOf(res: Response): URL {
  const location = res.headers.get("location");
  if (!location) throw new Error(`no location header (status ${res.status})`);
  return new URL(location, ORIGIN);
}

describe("stale session self-heal (/auth/session-check)", () => {
  it("case 1 (THE BUG): a stale session cookie is cleared and the user is sent back to /login", async () => {
    const email = "ir9.stale@example.com";
    const password = "averylongpassword";
    const newPassword = "anotherlongpassword";

    await signUp(auth, { email, password, name: "Stale User", firstName: "Stale" });

    // Session A — the cookie the browser will still be holding after the reset.
    const signInRes = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookieA = sessionCookie(signInRes.headers.get("set-cookie"));
    expect(cookieA).toContain("better-auth.session_token=");
    const cookieName = cookieA.slice(0, cookieA.indexOf("="));

    // THE NAME LINKAGE: this is the exact cookie middleware's presence check reads. If the cleared
    // name below is not this name, the lockout survives the "fix".
    expect(
      getSessionCookie(new NextRequest(new URL("/login", ORIGIN), { headers: { cookie: cookieA } })),
    ).toBeTruthy();

    // The REAL shipped reset — not an SQL DELETE. This is what produces the stale-cookie state.
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${ORIGIN}/reset-password` },
    });
    const token = tokenFromLink(mockResend.lastLink());
    expect(token.length).toBeGreaterThan(0);
    await auth.api.resetPassword({ body: { token, newPassword } });

    // The row is gone; the browser still has cookie A. Middleware delegates here.
    const res = await sessionCheckResponse(injected(), checkRequest("/login?reset=1", cookieA));

    expect(res.status).toBe(307);
    const location = locationOf(res);
    expect(location.pathname).toBe("/login");
    // The post-reset notice must survive the extra hop, and the loop guard must be set.
    expect(location.searchParams.get("reset")).toBe("1");
    expect(location.searchParams.get(CHECKED_PARAM)).toBe("1");

    // Better Auth's own deleteSessionCookie header, carried onto the redirect.
    const emitted = res.headers.getSetCookie();
    const cleared = expiryFor(emitted, cookieName);
    expect(cleared).not.toBeUndefined();
    expect(cleared).toMatch(/max-age=0/i);

    // No CDN or router cache may memoise a redirect that depends on cookie state (T-IR9-03).
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("case 2 (CONVERSE, constraint 4): a VALID session is still bounced to / and is NOT cleared", async () => {
    const email = "ir9.valid@example.com";
    const password = "averylongpassword";

    await signUp(auth, { email, password, name: "Valid User", firstName: "Valid" });
    const signInRes = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookieB = sessionCookie(signInRes.headers.get("set-cookie"));
    expect(cookieB).toContain("better-auth.session_token=");
    const cookieName = cookieB.slice(0, cookieB.indexOf("="));

    const res = await sessionCheckResponse(injected(), checkRequest("/login", cookieB));

    expect(res.status).toBe(307);
    expect(locationOf(res).pathname).toBe("/");

    // A live session must survive the check untouched — otherwise this endpoint is a
    // forced-logout primitive (threat T-IR9-05).
    expect(expiryFor(res.headers.getSetCookie(), cookieName)).toBeUndefined();

    // And it really is still a session, not just an uncleared cookie.
    const still = await auth.api.getSession({ headers: new Headers({ cookie: cookieB }) });
    expect(still).not.toBeNull();
  });

  it("case 3 (the measured Better-Auth gap): a bad-signature cookie is cleared by the fallback", async () => {
    // session.mjs:41-42 returns null BEFORE deleteSessionCookie when getSignedCookie fails, so
    // Better Auth emits NOTHING here (measured: set-cookie []). Without the explicit fallback this
    // cookie would never clear and the _sc loop guard would be the only thing between the user and
    // ERR_TOO_MANY_REDIRECTS.
    const res = await sessionCheckResponse(
      injected(),
      checkRequest("/login", "better-auth.session_token=garbage.garbage"),
    );

    expect(res.status).toBe(307);
    expect(locationOf(res).pathname).toBe("/login");
    expect(expiryFor(res.headers.getSetCookie(), "better-auth.session_token")).not.toBeUndefined();
  });

  it("case 4 (T-IR9-01): `next` cannot be used as an open redirect", async () => {
    const hostile = ["https://evil.com/", "//evil.com", "/\\evil.com", "/host", "/profile"];

    for (const raw of hostile) {
      // Direct unit assertion on the guard...
      expect(safeReturnPath(raw)).toBe(`/login?${CHECKED_PARAM}=1`);
      // ...and through the shipped handler, so the guard is proven to be WIRED, not merely present.
      const res = await sessionCheckResponse(injected(), checkRequest(raw, ""));
      const location = locationOf(res);
      expect(location.origin).toBe(ORIGIN);
      expect(location.pathname).toBe("/login");
    }

    // Absent `next` falls back to /login too.
    expect(safeReturnPath(null)).toBe(`/login?${CHECKED_PARAM}=1`);
    expect(locationOf(await sessionCheckResponse(injected(), checkRequest(null, ""))).pathname).toBe(
      "/login",
    );

    // /signup IS honored (it is the other logged-out-only route middleware delegates for).
    expect(safeReturnPath("/signup")).toBe(`/signup?${CHECKED_PARAM}=1`);
    expect(locationOf(await sessionCheckResponse(injected(), checkRequest("/signup", "")))
      .pathname).toBe("/signup");

    // An inbound `_sc` cannot be stacked — exactly one marker comes back out.
    expect(safeReturnPath(`/login?${CHECKED_PARAM}=1`)).toBe(`/login?${CHECKED_PARAM}=1`);
    expect(safeReturnPath(`/login?reset=1&${CHECKED_PARAM}=1`)).toBe(
      `/login?reset=1&${CHECKED_PARAM}=1`,
    );
  });
});
