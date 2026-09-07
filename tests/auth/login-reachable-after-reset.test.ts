// QK-IR9 / AUTH-02 / AUTH-03 — LAYER 1 (proxy as a pure function) + THE LOOP CLOSURE.
//
// THE ASSERTION THAT MATTERS: after a REAL password reset, a browser still holding the revoked
// session cookie can reach /login. Confirmed broken live on 2026-08-05 — `revokeSessionsOnPassword
// Reset: true` deletes the session ROW, nothing clears the httpOnly cookie, and proxy's
// PRESENCE-only check then bounced /login -> / for the cookie's full 30-day life, with no sign-out
// to recover with.
//
// WHY THIS FILE EXISTS ALONGSIDE stale-session-selfheal.test.ts. That file proves the ENDPOINT
// clears the cookie. It does NOT prove the user is free, because the endpoint is only reachable if
// proxy DELEGATES to it, and /login is only reachable if proxy then lets the post-clear
// request through. Those are two different files' worth of behaviour, and the bug lived in the seam.
// So case 6 runs the WHOLE journey in ONE process against real Postgres:
//   proxy -> /auth/session-check -> apply the Set-Cookie to a simulated cookie jar -> proxy
// and asserts the second proxy call does NOT redirect.
//
// THE SIMULATED COOKIE JAR IS THE ONE THING HERE THAT IS NOT REAL. `applySetCookies` models what a
// browser does with `Max-Age=0` (delete the name). That last link — Chrome actually applying the
// expiry from a 307 BEFORE following it — is what e2e/stale-session-selfheal.spec.ts and the Task-3
// human check cover. Noted so nobody mistakes this file for full proof of the browser's behaviour.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION 1 — EXECUTED 2026-08-05. A mutation that is described but never run is a comment;
// predictions are hypotheses. What follows is the OBSERVED output, verbatim.
//
//   MUTATION 1 — restore the OLD line in src/proxy.ts (literally the shipped bug):
//     `return NextResponse.redirect(new URL("/", request.url))` in place of the delegation.
//     PREDICTED: "the Layer 1 cases and case 6 RED".
//     OBSERVED — Tests  5 failed | 2 passed (7):
//       × case 1: a cookie-bearing /login request is sent to the verifier, NOT to /
//         AssertionError: expected '/' to be '/auth/session-check' // Object.is equality
//         Expected: "/auth/session-check"
//         Received: "/"
//          ❯ tests/auth/login-reachable-after-reset.test.ts:142:32
//       × case 2: the post-reset ?reset=1 notice survives the delegation hop
//         AssertionError: expected null to be '/login?reset=1' // Object.is equality
//          ❯ tests/auth/login-reachable-after-reset.test.ts:150:54
//       × case 5: /signup delegates identically
//         AssertionError: expected '/' to be '/auth/session-check' // Object.is equality
//          ❯ tests/auth/login-reachable-after-reset.test.ts:168:32
//       × case 6: proxy -> session-check -> browser jar -> proxy, in one process
//         AssertionError: expected '/' to be '/auth/session-check' // Object.is equality
//          ❯ tests/auth/login-reachable-after-reset.test.ts:191:28
//       × case 6b (constraint 4): the same journey with a VALID session still ends at /
//         AssertionError: expected '/' to be '/auth/session-check' // Object.is equality
//          ❯ tests/auth/login-reachable-after-reset.test.ts:235:27
//     DIVERGENCE FROM THE PREDICTION, recorded rather than smoothed over: NOT every Layer 1 case
//     went red. Cases 3 (no cookie) and 4 (loop guard) stayed GREEN, because neither reaches the
//     delegation line — case 3 returns at the cookie check and case 4 returns at the guard, which
//     deliberately sits ABOVE it. That is the correct blast radius for this mutation, and it is a
//     useful negative result: case 4 alone would NOT have caught the shipped bug, so it is not
//     redundant with case 1, it is guarding a different failure (ERR_TOO_MANY_REDIRECTS).
//     Restored by EDITING THE FILE BACK -> 7/7 green.
//
// NOTE ON THE RESTORE GATE, so a later reader does not read a missing gate into it: src/proxy.ts
// is a TRACKED file that this plan LEGITIMATELY modifies, so `git diff --exit-code src/proxy.ts`
// cannot be its restore evidence (it is expected to differ from HEAD). THE GREEN RE-RUN IS THE
// RESTORE EVIDENCE, and the mutation is restored by EDITING THE FILE BACK — never via git.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import {
  sessionCheckResponse,
  SESSION_CHECK_PATH,
  RETURN_PARAM,
  CHECKED_PARAM,
  type SessionCheckAuth,
} from "@/lib/session-check";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockResend } from "../helpers/mocks";

const ORIGIN = "http://localhost:3000";
const STALE = "better-auth.session_token=stale.but.validly-shaped";

let testDb: TestDb;
let auth: TestAuth;

describe("NEXT.JS 16 PROXY CONVENTION", () => {
  it("uses src/proxy.ts as the sole request interception entry point", () => {
    expect(existsSync(resolve(process.cwd(), "src/proxy.ts"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src/middleware.ts"))).toBe(false);
  });
});

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

function req(path: string, cookie?: string): NextRequest {
  return new NextRequest(
    new URL(path, ORIGIN),
    cookie === undefined ? undefined : { headers: { cookie } },
  );
}

/** The `location` of a proxy redirect, or null when it passed the request through. */
function redirectOf(res: Response): URL | null {
  const location = res.headers.get("location");
  return location === null ? null : new URL(location, ORIGIN);
}

/** Pull the better-auth session cookie (name=value) out of a Set-Cookie header. */
function sessionCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

function tokenFromLink(link: string | null): string {
  if (!link) throw new Error("no reset link captured");
  const url = new URL(link);
  return url.searchParams.get("token") ?? url.pathname.split("/").pop() ?? "";
}

/**
 * Model a browser applying Set-Cookie headers to its jar. An entry with Max-Age<=0 (or an emptied
 * value) DELETES the name — that deletion is the whole mechanism under test.
 */
function applySetCookies(jar: Map<string, string>, setCookies: string[]): void {
  for (const raw of setCookies) {
    const [pair, ...attrs] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const maxAge = attrs.map((a) => a.trim()).find((a) => /^max-age=/i.test(a));
    const expired = value === "" || (maxAge !== undefined && Number(maxAge.split("=")[1]) <= 0);
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

function jarHeader(jar: Map<string, string>): string {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

describe("LAYER 1 — proxy delegates instead of terminating the journey", () => {
  it("case 1: a cookie-bearing /login request is sent to the verifier, NOT to /", () => {
    const location = redirectOf(proxy(req("/login", STALE)));

    expect(location).not.toBeNull();
    expect(location!.pathname).toBe(SESSION_CHECK_PATH);
    expect(location!.searchParams.get(RETURN_PARAM)).toBe("/login");
    // THE BUG, named explicitly: terminating at / is what locked the user out.
    expect(location!.pathname).not.toBe("/");
  });

  it("case 2: the post-reset ?reset=1 notice survives the delegation hop", () => {
    const location = redirectOf(proxy(req("/login?reset=1", STALE)));
    expect(location!.searchParams.get(RETURN_PARAM)).toBe("/login?reset=1");
  });

  it("case 3: with NO cookie, /login passes straight through (the state after the heal)", () => {
    expect(redirectOf(proxy(req("/login")))).toBeNull();
    expect(redirectOf(proxy(req("/login", "")))).toBeNull();
  });

  it("case 4 (LOOP GUARD): a request already carrying the marker is passed through", () => {
    // The guard must hold even WITH a cookie still present — that is the entire point. If clearing
    // ever fails, this degrades to one extra redirect instead of ERR_TOO_MANY_REDIRECTS.
    expect(redirectOf(proxy(req(`/login?${CHECKED_PARAM}=1`, STALE)))).toBeNull();
    expect(redirectOf(proxy(req(`/signup?${CHECKED_PARAM}=1`, STALE)))).toBeNull();
    expect(redirectOf(proxy(req(`/login?reset=1&${CHECKED_PARAM}=1`, STALE)))).toBeNull();
  });

  it("case 5: /signup delegates identically", () => {
    const location = redirectOf(proxy(req("/signup", STALE)));
    expect(location!.pathname).toBe(SESSION_CHECK_PATH);
    expect(location!.searchParams.get(RETURN_PARAM)).toBe("/signup");
  });
});

describe("LAYER 2 — the loop closure: a real reset leaves /login reachable", () => {
  it("case 6: proxy -> session-check -> browser jar -> proxy, in one process", async () => {
    const email = "ir9.loop@example.com";
    const password = "averylongpassword";
    const newPassword = "anotherlongpassword";

    await signUp(auth, { email, password, name: "Loop User", firstName: "Loop" });
    const signInRes = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookieA = sessionCookie(signInRes.headers.get("set-cookie"));
    expect(cookieA).toContain("better-auth.session_token=");

    // The browser's jar, as it stands the moment the user finishes the reset.
    const jar = new Map<string, string>();
    applySetCookies(jar, [cookieA]);
    expect(jar.has("better-auth.session_token")).toBe(true);

    // HOP 1 — the user asks for /login. Middleware defers.
    const hop1 = redirectOf(proxy(req("/login?reset=1", jarHeader(jar))));
    expect(hop1!.pathname).toBe(SESSION_CHECK_PATH);

    // The REAL shipped reset destroys the session row behind that still-present cookie.
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${ORIGIN}/reset-password` },
    });
    await auth.api.resetPassword({
      body: { token: tokenFromLink(mockResend.lastLink()), newPassword },
    });

    // HOP 2 — the verifier. It clears, and sends the user back where they were going.
    const checked = await sessionCheckResponse(
      auth as unknown as SessionCheckAuth,
      req(`${hop1!.pathname}${hop1!.search}`, jarHeader(jar)),
    );
    const hop2 = redirectOf(checked)!;
    expect(hop2.pathname).toBe("/login");
    expect(hop2.searchParams.get("reset")).toBe("1");

    // The browser applies the expiry BEFORE following the redirect.
    applySetCookies(jar, checked.headers.getSetCookie());
    expect(jar.has("better-auth.session_token")).toBe(false);

    // HOP 3 — /login, with the post-clear jar. THE USER IS FREE.
    expect(redirectOf(proxy(req(`${hop2.pathname}${hop2.search}`, jarHeader(jar))))).toBeNull();

    // And it is the CLEARED COOKIE doing the work, not merely the one-shot marker: a fresh /login
    // with no marker at all is now equally reachable. Without this assertion the test would still
    // pass if the clearing silently no-opped.
    expect(redirectOf(proxy(req("/login", jarHeader(jar))))).toBeNull();
  });

  it("case 6b (constraint 4): the same journey with a VALID session still ends at /", async () => {
    const email = "ir9.loop.valid@example.com";
    const password = "averylongpassword";

    await signUp(auth, { email, password, name: "Loop Valid", firstName: "Valid" });
    const signInRes = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookieB = sessionCookie(signInRes.headers.get("set-cookie"));

    const jar = new Map<string, string>();
    applySetCookies(jar, [cookieB]);

    const hop1 = redirectOf(proxy(req("/login", jarHeader(jar))))!;
    expect(hop1.pathname).toBe(SESSION_CHECK_PATH);

    const checked = await sessionCheckResponse(
      auth as unknown as SessionCheckAuth,
      req(`${hop1.pathname}${hop1.search}`, jarHeader(jar)),
    );
    expect(redirectOf(checked)!.pathname).toBe("/");

    // The live session survived the round trip — the bounce is preserved, not weaponised.
    applySetCookies(jar, checked.headers.getSetCookie());
    expect(jar.has("better-auth.session_token")).toBe(true);
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie: jarHeader(jar) }) }),
    ).not.toBeNull();
  });
});
