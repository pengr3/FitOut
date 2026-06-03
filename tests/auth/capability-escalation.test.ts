// AUTH-04 (security) / threat T-02-01: capability/role privilege-escalation guard.
//
// canBook/canHost/role are input:false on the user table. A client that POSTs canHost:true
// or role:"admin" at signup MUST NOT self-grant. With the input:false guard in place, Better
// Auth 1.6.x SILENTLY STRIPS those fields and creates the user with the safe defaults
// (canHost=false, canBook=false, role="user"); the signup itself still succeeds for the
// legitimate fields.
//
// Regression behavior (guard removed): without input:false, canBook/canHost are required:true
// *inputs*, so smuggling/omitting them makes signUpEmail throw — i.e. the happy-path assertion
// below (signup succeeds AND user has safe defaults) goes RED. This test therefore fails if the
// input:false guard is removed from those additionalFields.

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

async function readUser(email: string) {
  const rows = await testDb.db.select().from(user).where(eq(user.email, email));
  return rows[0] as
    | { canBook: boolean; canHost: boolean; role: string | null }
    | undefined;
}

describe("capability/role escalation guard (input:false, T-02-01)", () => {
  it("strips client-supplied canHost/role at signup; user gets safe defaults", async () => {
    const email = "escalate@example.com";

    // Attempt to self-grant host capability + admin role at signup. With input:false the
    // privileged fields are stripped and signup succeeds with the legitimate fields.
    const res = await signUp(auth, {
      email,
      password: "averylongpassword",
      name: "Sneaky User",
      firstName: "Sneaky",
      // Intentionally smuggling input:false fields a client must not control.
      canHost: true,
      canBook: true,
      role: "admin",
    });

    // The signup-result user must NOT reflect the smuggled privileges.
    const resultUser = (res as unknown as {
      user: { canHost: boolean; canBook: boolean; role: string | null };
    }).user;
    expect(resultUser.canHost).toBe(false);
    expect(resultUser.canBook).toBe(false);
    expect(resultUser.role).toBe("user");

    // The PERSISTED row must also carry the safe defaults (not the smuggled values).
    const u = await readUser(email);
    expect(u).toBeDefined();
    expect(u!.canHost).toBe(false);
    expect(u!.canBook).toBe(false);
    expect(u!.role).toBe("user");
  });
});
