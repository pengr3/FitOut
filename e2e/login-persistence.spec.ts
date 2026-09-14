// AUTH-02 / D-12: a session persists across a simulated browser restart.
//
// Flow:
//   1. Sign up via the UI (email/password + intent "book") -> autoSignIn sets the session cookie.
//   2. Assert we are authenticated: /api/auth/get-session returns a session for the new user.
//   3. Simulate a BROWSER RESTART: capture the persisted cookies (storageState), open a brand-new
//      browser context seeded with only those cookies, and assert the session is STILL valid.
//      A 30-day persistent cookie (D-12, no "remember me") survives the restart; a session-only
//      cookie would not.
//
// This runs for real against the Playwright webServer (the dev app) + the dev Postgres — it uses
// email/password, which needs no external credentials. We use a unique email per run so repeated
// runs never collide on the unique email constraint.

import { test, expect, chromium } from "@playwright/test";

const BASE = "http://localhost:3000";

function uniqueEmail() {
  return `e2e.persist.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

test("session persists across a simulated browser restart (AUTH-02, D-12)", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  const password = "averylongpassword";

  // 1. Sign up via the UI.
  await page.goto(`${BASE}/signup`);
  // Intent defaults to "book"; click it explicitly to be deterministic.
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Persisty");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: /sign up to book/i }).click();

  // Signup redirects to "/" on success; wait for navigation off /signup.
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), {
    timeout: 15_000,
  });

  // 2. Authenticated now: the session endpoint returns a session for this user.
  const sessionRes = await context.request.get(`${BASE}/api/auth/get-session`);
  expect(sessionRes.ok()).toBeTruthy();
  const sessionBody = await sessionRes.json();
  expect(sessionBody?.user?.email).toBe(email);

  // Capture the persisted storage (cookies) — this is what a real browser keeps on disk.
  const storageState = await context.storageState();
  const sessionCookie = storageState.cookies.find((c) =>
    c.name.includes("better-auth.session_token"),
  );
  expect(sessionCookie, "session cookie must be persisted").toBeTruthy();
  // D-12: a persistent (non-session) cookie has a real expiry in the future (~30 days),
  // not -1 (which would be a session-only cookie cleared on browser close).
  expect(sessionCookie!.expires).toBeGreaterThan(Date.now() / 1000);

  // 3. Simulate a BROWSER RESTART: a fresh browser + context seeded only with the saved cookies.
  const freshBrowser = await chromium.launch();
  const restoredContext = await freshBrowser.newContext({ storageState });
  try {
    const afterRestart = await restoredContext.request.get(
      `${BASE}/api/auth/get-session`,
    );
    expect(afterRestart.ok()).toBeTruthy();
    const afterBody = await afterRestart.json();
    // Still authenticated as the same user after the "restart".
    expect(afterBody?.user?.email).toBe(email);
  } finally {
    await restoredContext.close();
    await freshBrowser.close();
  }
});
