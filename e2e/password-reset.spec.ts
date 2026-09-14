// AUTH-03: full forgot -> reset -> login-with-new-password flow, end to end.
//
// Flow:
//   1. Create a known user (sign up via the UI), then sign out (drop cookies) so we're logged out.
//   2. Request a reset for that email via the /forgot-password UI -> Better Auth stores a single-use
//      token in the `verification` table (identifier "reset-password:<token>") and "emails" the link.
//   3. Capture the reset token. Real email delivery is the ONE manual-only verification per
//      VALIDATION.md, so we read the token from the dev Postgres `verification` table — the same
//      token the emailed link carries (in dev, with no RESEND_API_KEY, the app also logs the link
//      to the console). This is the documented dev capture strategy.
//   4. Open /reset-password?token=<token>, set a NEW password.
//   5. Log in with the NEW password successfully.
//
// Runs for real against the Playwright webServer + dev Postgres; email/password only (no external
// credentials). Unique email per run avoids unique-constraint collisions across runs.

import { test, expect } from "@playwright/test";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const DB_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

function uniqueEmail() {
  return `e2e.reset.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Read the most recent reset token for a user from the dev verification table. */
async function latestResetToken(email: string): Promise<string> {
  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });
  try {
    // identifier is "reset-password:<token>", value is the user id. Join to the user by email
    // and take the newest unexpired token.
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

test("forgot -> reset -> login with new password (AUTH-03)", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  const oldPassword = "averylongpassword";
  const newPassword = "abrandnewlongpassword";

  // 1. Create a known user via the UI.
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("First name").fill("Reset");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(oldPassword);
  await page.getByLabel("Confirm password").fill(oldPassword);
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), {
    timeout: 15_000,
  });

  // Log out: clear cookies so we are a fresh, logged-out visitor for the reset flow.
  await context.clearCookies();

  // 2. Request a reset via the UI; expect the enumeration-safe confirmation.
  await page.goto(`${BASE}/forgot-password`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(page.getByText(/if an account exists/i)).toBeVisible();

  // 3. Capture the reset token (dev capture strategy — see header).
  const token = await latestResetToken(email);
  expect(token.length).toBeGreaterThan(0);

  // 4. Open the reset page with the token and set a new password.
  await page.goto(`${BASE}/reset-password?token=${encodeURIComponent(token)}`);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: /set new password/i }).click();

  // Redirects to /login?reset=1 on success.
  await page.waitForURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByText(/password updated/i)).toBeVisible();

  // 5. Log in with the NEW password.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });

  // Authenticated with the new password.
  const sessionRes = await context.request.get(`${BASE}/api/auth/get-session`);
  expect(sessionRes.ok()).toBeTruthy();
  const body = await sessionRes.json();
  expect(body?.user?.email).toBe(email);
});
