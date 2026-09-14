// AUTH-04 / D-02 / threat T-03-01 + CR-02: signup intent maps to the capability flag SERVER-SIDE,
// ATOMICALLY, by importing and driving the REAL exported `signup` server action.
//
// What changed (WR-07 + CR-02): the earlier version REPRODUCED the action's steps (signUpEmail +
// a separate db.update) against the test db, which only proved Drizzle writes a column — it could
// not catch a regression inside signup() itself (e.g. inverted intent mapping, or the old
// non-atomic second-write being reintroduced). This version imports the shipped `signup` action
// and binds it (via a non-hoisted vi.doMock of `@/lib/auth`) to the ISOLATED test schema while
// still using the PRODUCTION auth options — crucially including the
// `databaseHooks.user.create.before` hook that performs the atomic intent->flag grant. So a break
// in the action OR the hook fails this test.
//
// Ordering matters: makeTestAuth() reads the REAL prod options, so we build the test auth FIRST,
// THEN doMock `@/lib/auth` to return it, THEN dynamically import the action so it binds to the mock.
//
// Atomicity proof: the capability is now written in the SAME insert as the user (the hook), so
// there is no reachable state where a user exists with BOTH canBook and canHost false. We assert
// exactly one flag is set per intent, and (negatively) that no created user is ever both-false.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
let signup: typeof import("@/app/actions/auth")["signup"];

beforeAll(async () => {
  testDb = await setupTestDb();
  // Build the test-schema auth from the REAL production options (incl. the capability create hook)
  // BEFORE mocking the module — makeTestAuth itself imports the genuine @/lib/auth.
  testAuth = makeTestAuth(testDb);

  // Now bind the shipped action to that test auth. doMock is NOT hoisted, so it only affects the
  // dynamic import below — makeTestAuth above already resolved the genuine module.
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.resetModules();
  ({ signup } = await import("@/app/actions/auth"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  await teardownTestDb(testDb);
});

async function caps(email: string) {
  const rows = await testDb.db.select().from(user).where(eq(user.email, email));
  return rows[0] as { canBook: boolean; canHost: boolean } | undefined;
}

describe("capability at signup maps from intent atomically (AUTH-04 / D-02 / CR-02)", () => {
  it('intent "host" sets canHost=true and canBook=false via the real signup() action', async () => {
    const email = "hostsignup@example.com";
    const res = await signup({
      email,
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Hostie",
      intent: "host",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.redirectTo).toBe("/host");

    const c = await caps(email);
    expect(c).toBeDefined();
    expect(c!.canHost).toBe(true);
    expect(c!.canBook).toBe(false);
  });

  it('intent "book" sets canBook=true and canHost=false via the real signup() action', async () => {
    const email = "booksignup@example.com";
    const res = await signup({
      email,
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Bookie",
      intent: "book",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.redirectTo).toBe("/");

    const c = await caps(email);
    expect(c).toBeDefined();
    expect(c!.canBook).toBe(true);
    expect(c!.canHost).toBe(false);
  });

  it("never persists a user with BOTH capabilities false (the D-02 atomic invariant)", async () => {
    // Drive both intents, then scan every created row: no user may be flagless. Because the flag is
    // set in the SAME insert as the user (the create.before hook), there is no window in which a
    // created user has neither capability — even if the grant logic had thrown, no user would exist.
    await signup({
      email: "invariant.host@example.com",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Inv1",
      intent: "host",
    });
    await signup({
      email: "invariant.book@example.com",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Inv2",
      intent: "book",
    });

    const rows = await testDb.db.select().from(user);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // Every persisted user carries at least one capability — never both-false.
      expect(row.canBook || row.canHost).toBe(true);
    }
  });

  it("duplicate-email signup reports a recoverable error without claiming the account was not created", async () => {
    // First signup succeeds; the retry must NOT falsely say "could not create your account" (the
    // CR-02 misreport). It should surface the distinct "may already exist" path instead.
    const email = "dup.signup@example.com";
    const first = await signup({
      email,
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Dup",
      intent: "book",
    });
    expect(first.ok).toBe(true);

    const second = await signup({
      email,
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Dup",
      intent: "book",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toMatch(/already exist/i);
    }
  });
});
