// QK-IR9 — the post-reset lockout, in a REAL browser, with ONE PERSISTENT CONTEXT.
//
// WHY THIS SPEC EXISTS AT ALL, and why it must not be "simplified" into the shape of its neighbours:
// this bug shipped PRECISELY because every existing e2e spec starts from a clean cookie jar.
// e2e/password-reset.spec.ts calls `context.clearCookies()` before the reset (line ~70) — a sensible
// convention that also makes it structurally incapable of seeing this bug, because the browser never
// carries a stale cookie across a reset. THIS spec never clears cookies. That single difference is
// the entire regression value; if a future edit adds a clearCookies() here, the guard is gone.
//
// It is also the ONLY layer that proves the last link in the chain. The vitest specs
// (tests/auth/stale-session-selfheal.test.ts, tests/auth/login-reachable-after-reset.test.ts) model
// the cookie jar in-process. What they CANNOT prove is that Chrome really applies
// `Set-Cookie: ...; Max-Age=0` from a 307 BEFORE following it. Only a real browser engine can.
//
// THIS IS NOT HYPOTHETICAL — THIS SPEC ALREADY EARNED ITS KEEP. On its first run it FAILED at
// assertion (b) with `Received: ""`: the browser was holding a zombie session cookie with an empty
// value rather than having deleted it. All 11 in-process assertions were green at that moment.
// Cause: the module called `auth.api.getSession()`, and inside a real route handler Better Auth's
// nextCookies() after-hook replays the Set-Cookie through next/headers cookies(), whose serializer
// drops a falsy `maxAge` — so `Max-Age=0` never reached Chrome. Fixed by routing through
// `auth.handler` (better-call sets `_flag:"router"`, which the after-hook skips). If anyone ever
// switches that back, every unit test stays green and THIS assertion is the only thing that fails.
//
// Asserts, per the plan:
//   (a) post-reset the browser lands on /login with the form present, NOT on /
//   (b) better-auth.session_token is gone from the context's cookie jar afterwards
//   (c) a VALID session is still bounced off /login to / and SURVIVES it (constraint 4)
//   (d) no ERR_TOO_MANY_REDIRECTS on either path
// plus the logged-out no-hop baseline (a visitor with no cookie still reaches /login in one 200).

import { test, expect, type Page, type Response } from "@playwright/test";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const DB_URL = process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
const SESSION_COOKIE = "better-auth.session_token";

function uniqueEmail() {
  return `e2e.ir9.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/**
 * Read the newest reset token straight from Postgres.
 *
 * This is the documented dev capture strategy (same as e2e/password-reset.spec.ts): the token in the
 * `verification` table IS the token the emailed link carries. Reading the DB — rather than the dev
 * console — is also the only strategy that survives RESEND_API_KEY being set: with a real key the app
 * really calls Resend, and Resend's shared `onboarding@resend.dev` sender only delivers to the
 * account owner's own address, so a throwaway @example.com recipient 422s and no email ever arrives.
 * sendResetPassword is fire-and-forget (`void`, Pitfall 4), so the token is stored regardless.
 */
async function latestResetToken(email: string): Promise<string> {
  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });
  try {
    const rows = await sql<{ identifier: string }[]>`
      SELECT v.identifier
      FROM "verification" v
      JOIN "user" u ON u.id = v.value
      WHERE u.email = ${email}
        AND v.identifier LIKE 'reset-password:%'
        AND v.expires_at > now()
      ORDER BY v.created_at DESC
      LIMIT 1
    `;
    if (!rows[0]) throw new Error(`no reset token found for ${email}`);
    return rows[0].identifier.replace(/^reset-password:/, "");
  } finally {
    await sql.end();
  }
}

/** The chain of URLs a navigation was redirected THROUGH, oldest first. */
function redirectChain(response: Response | null): string[] {
  const chain: string[] = [];
  let request = response?.request() ?? null;
  while (request) {
    const from = request.redirectedFrom();
    if (!from) break;
    chain.unshift(from.url());
    request = from;
  }
  return chain;
}

async function sessionCookieValue(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies(BASE);
  return cookies.find((c) => c.name === SESSION_COOKIE)?.value;
}

test("a stale session cookie self-heals: /login stays reachable after a password reset (QK-IR9)", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  const oldPassword = "averylongpassword";
  const newPassword = "abrandnewlongpassword";

  // ── BASELINE: a logged-out visitor reaches /login with NO redirect hop at all. ─────────────────
  // The context is genuinely cookie-less right now, so this costs nothing and needs no second
  // context — which keeps the "ONE persistent context" property of this spec intact.
  const cold = await page.goto(`${BASE}/login`);
  expect(cold?.status()).toBe(200);
  expect(redirectChain(cold)).toEqual([]);

  // ── 1. Sign up. autoSignIn:true leaves a REAL session cookie in this context. ──────────────────
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("First name").fill("Stale");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(oldPassword);
  await page.getByLabel("Confirm password").fill(oldPassword);
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 15_000 });

  const staleToken = await sessionCookieValue(page);
  expect(staleToken, "signup should leave a session cookie").toBeTruthy();

  // 2. The session is live: a gated page renders instead of redirecting.
  await page.goto(`${BASE}/profile`);
  await expect(page).toHaveURL(/\/profile/);

  // ── 3. Reset the password in the SAME browser context. NO clearCookies() — that is the point. ──
  await page.goto(`${BASE}/forgot-password`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(page.getByText(/if an account exists/i)).toBeVisible();

  const token = await latestResetToken(email);
  expect(token.length).toBeGreaterThan(0);

  await page.goto(`${BASE}/reset-password?token=${encodeURIComponent(token)}`);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: /set new password/i }).click();

  // ── (a) THE FIX. The browser still holds the (now revoked) cookie, and must still land on /login.
  // Before this fix it was dumped on / — the public search home, which renders identically signed-in
  // and signed-out — with no way back for the cookie's full 30-day life.
  await page.waitForURL(/\/login/, { timeout: 15_000 });
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(new URL(page.url()).pathname).not.toBe("/");
  await expect(page.getByText(/password updated/i)).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  // ── (b) The stale cookie is GONE from the real browser's jar. This is the assertion no in-process
  // test can make: Chrome applied `Max-Age=0` from a 307 before following it.
  expect(await sessionCookieValue(page)).toBeUndefined();

  // ── (d) No loop. A redirect loop would have thrown net::ERR_TOO_MANY_REDIRECTS above; assert the
  // settled cost explicitly so a regression to "many hops" is caught too.
  const reload = await page.goto(page.url());
  expect(reload?.status()).toBe(200);
  expect(redirectChain(reload).length).toBeLessThanOrEqual(2);

  // ── 4. The new password works, and lands the user on /. ───────────────────────────────────────
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });

  const liveToken = await sessionCookieValue(page);
  expect(liveToken, "logging in should mint a fresh session cookie").toBeTruthy();
  expect(liveToken).not.toBe(staleToken);

  // ── (c) CONSTRAINT 4: the optimistic bounce must STILL work for a genuinely logged-in user, and
  // the check must not damage the live session. This is the half that a "just delete the bounce"
  // fix would have thrown away.
  const bounced = await page.goto(`${BASE}/login`);
  await page.waitForURL(`${BASE}/`, { timeout: 15_000 });
  expect(new URL(page.url()).pathname).toBe("/");
  // (d) again, on the bounce path: /login -> /auth/session-check -> / is two hops, and no more.
  expect(redirectChain(bounced).length).toBeLessThanOrEqual(2);

  // The live session survived the round trip, unchanged.
  expect(await sessionCookieValue(page)).toBe(liveToken);
  await page.goto(`${BASE}/profile`);
  await expect(page).toHaveURL(/\/profile/);

  // Belt and braces: the server agrees this context is still authenticated as the same user.
  const sessionRes = await context.request.get(`${BASE}/api/auth/get-session`);
  expect(sessionRes.ok()).toBeTruthy();
  expect((await sessionRes.json())?.user?.email).toBe(email);
});
