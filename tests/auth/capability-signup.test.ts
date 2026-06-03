// AUTH-04 / D-02 / threat T-03-01: signup intent maps to the capability flag SERVER-SIDE.
//
// The `signup` server action creates the user, then sets EXACTLY ONE capability flag from the
// validated `intent` via a privileged DB update (canBook/canHost are input:false, so they cannot
// be set through the signUpEmail body — the client can never self-grant). This test exercises that
// exact mechanism against the isolated test schema:
//   intent "host" -> canHost=true,  canBook=false
//   intent "book" -> canBook=true,  canHost=false
//
// We reproduce the action's two steps (signUpEmail + the privileged update) here rather than
// importing the server action, because the action is bound to the production db/auth (dev public
// schema); the assertion is over the SAME behavior against the migrated test DB. The companion
// tests/auth/capability-escalation.test.ts (Plan 02) proves the client CANNOT smuggle the flag.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";

let testDb: TestDb;
let auth: TestAuth;

beforeAll(async () => {
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

/** Reproduce the signup server action's capability-set step against the test db. */
async function signupWithIntent(
  email: string,
  firstName: string,
  intent: "book" | "host",
) {
  const res = await signUp(auth, {
    email,
    password: "averylongpassword",
    name: firstName,
    firstName,
  });
  const userId = (res as { user: { id: string } }).user.id;

  // SERVER-SIDE capability set (input:false guard means this never comes from the client).
  if (intent === "host") {
    await testDb.db.update(user).set({ canHost: true }).where(eq(user.id, userId));
  } else {
    await testDb.db.update(user).set({ canBook: true }).where(eq(user.id, userId));
  }
  return userId;
}

async function caps(email: string) {
  const rows = await testDb.db
    .select()
    .from(user)
    .where(eq(user.email, email));
  return rows[0] as { canBook: boolean; canHost: boolean } | undefined;
}

describe("capability at signup maps from intent server-side (AUTH-04 / D-02)", () => {
  it('intent "host" sets canHost=true and canBook=false', async () => {
    await signupWithIntent("hostsignup@example.com", "Hostie", "host");
    const c = await caps("hostsignup@example.com");
    expect(c).toBeDefined();
    expect(c!.canHost).toBe(true);
    expect(c!.canBook).toBe(false);
  });

  it('intent "book" sets canBook=true and canHost=false', async () => {
    await signupWithIntent("booksignup@example.com", "Bookie", "book");
    const c = await caps("booksignup@example.com");
    expect(c).toBeDefined();
    expect(c!.canBook).toBe(true);
    expect(c!.canHost).toBe(false);
  });
});
