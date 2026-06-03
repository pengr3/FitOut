// AUTH-03 / D-13 / threat T-02-02: a password reset revokes all OTHER active sessions.
//
// Flow: sign up -> sign in (session A, captured via its cookie) -> confirm A is valid ->
// requestPasswordReset (the link is captured from the mocked Resend) -> resetPassword with the
// emailed token + a new password -> assert session A is NO LONGER valid.
//
// This is the #1 silent-failure landmine (RESEARCH Pitfall 3): revokeSessionsOnPasswordReset
// DEFAULTS TO false and resetPassword() takes no revoke argument. With the config set to true,
// the pre-existing session A is invalidated. This test goes red if that config line is removed.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockResend } from "../helpers/mocks";

let testDb: TestDb;
let auth: TestAuth;

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

/** Pull the better-auth session cookie (name=value) out of a Set-Cookie header. */
function sessionCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0]; // "better-auth.session_token=...."
}

/** Extract the reset token from the emailed link (it is the last path segment). */
function tokenFromLink(link: string | null): string {
  if (!link) throw new Error("no reset link captured");
  const url = new URL(link);
  return url.searchParams.get("token") ?? url.pathname.split("/").pop() ?? "";
}

describe("password reset revokes other sessions (D-13, T-02-02)", () => {
  it("invalidates a pre-existing session after reset", async () => {
    const email = "revoke@example.com";
    const password = "averylongpassword";
    const newPassword = "anothelongpassword";

    await signUp(auth, { email, password, name: "Revoke User", firstName: "Revoke" });

    // Session A — sign in and keep its cookie.
    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    const cookieA = sessionCookie(signInRes.headers.get("set-cookie"));
    expect(cookieA).toContain("better-auth.session_token=");

    // Session A is valid right now.
    const before = await auth.api.getSession({
      headers: new Headers({ cookie: cookieA }),
    });
    expect(before).not.toBeNull();

    // Trigger reset; read the emailed link (mocked Resend captured it).
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: "http://localhost:3000/reset-password" },
    });
    const token = tokenFromLink(mockResend.lastLink());
    expect(token.length).toBeGreaterThan(0);

    // Complete the reset with the new password.
    await auth.api.resetPassword({ body: { token, newPassword } });

    // Session A must now be INVALID (revoked by the reset).
    const after = await auth.api.getSession({
      headers: new Headers({ cookie: cookieA }),
    });
    expect(after).toBeNull();

    // Sanity: the new password works (the account itself is fine, only old sessions died).
    const reSignIn = await auth.api.signInEmail({
      body: { email, password: newPassword },
      asResponse: true,
    });
    expect(reSignIn.status).toBeLessThan(400);
  });
});
