// AUTH-01: email/password signup creates a user who can sign in IMMEDIATELY even though
// the email is unverified (D-07 soft gate — sign-in is NOT blocked on emailVerified in Phase 1).
//
// This mirrors what the `signup` server action does at its core: validate, then
// auth.api.signUpEmail({ body: { email, password, name, firstName } }). We run it against the
// isolated test schema via the test-scoped Better Auth (helpers/auth.ts) so it never touches
// dev data and uses the SAME production options the app ships. We also re-validate the input
// with the shared signupSchema here to assert the schema accepts a well-formed signup.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";
import { signupSchema } from "@/lib/validation/auth";

let testDb: TestDb;
let auth: TestAuth;

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("email/password signup (AUTH-01, soft gate D-07)", () => {
  it("creates a user and signs them in even though email is unverified", async () => {
    const input = {
      email: "newbooker@example.com",
      password: "averylongpassword",
      firstName: "Newbie",
      intent: "book" as const,
    };

    // The shared schema (the same one the server action re-validates with) accepts it.
    expect(signupSchema.safeParse(input).success).toBe(true);

    // Core of the signup server action: create the user via Better Auth.
    const res = await signUp(auth, {
      email: input.email,
      password: input.password,
      name: input.firstName,
      firstName: input.firstName,
    });
    expect((res as { user?: { id?: string } }).user?.id).toBeTruthy();

    // The persisted user exists and is UNVERIFIED (soft gate keeps sign-in open).
    const rows = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, input.email));
    expect(rows[0]).toBeDefined();
    expect((rows[0] as { emailVerified: boolean }).emailVerified).toBe(false);
    expect((rows[0] as { firstName: string }).firstName).toBe("Newbie");

    // The unverified user can still sign in immediately (D-07 soft gate — NOT blocked).
    const signInRes = await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
      asResponse: true,
    });
    expect(signInRes.status).toBeLessThan(400);
    expect(signInRes.headers.get("set-cookie")).toContain(
      "better-auth.session_token=",
    );
  });
});
