// D-07 SOFT GATE: an unverified email/password user CAN still sign in.
//
// Phase 1 sends the verification email but does NOT enforce verification at sign-in
// (requireEmailVerification:false). This test signs up a user, does NOT verify the email,
// and asserts a fresh sign-in succeeds. It would go red if requireEmailVerification were
// flipped to true.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";

let testDb: TestDb;
let auth: TestAuth;

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("soft email-verification gate (D-07)", () => {
  it("lets an UNVERIFIED email/password user sign in", async () => {
    const email = "softgate@example.com";
    const password = "averylongpassword";

    // Sign up — verification email is sent (mocked) but NOT required.
    await signUp(auth, { email, password, name: "Soft Gate", firstName: "Soft" });

    // Confirm the user is NOT email-verified yet.
    const session = await auth.api.getSession({
      headers: new Headers(),
    });
    // getSession with empty headers returns null; we instead prove sign-in works below.
    expect(session).toBeNull();

    // Sign in WITHOUT having verified the email — must succeed (soft gate).
    const signIn = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    expect(signIn.status).toBeLessThan(400);
  });
});
