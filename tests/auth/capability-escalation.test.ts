// AUTH-04 (security) / threat T-02-01: capability/role privilege-escalation guard.
//
// canBook/canHost/role are input:false on the user table. A client that POSTs canHost:true
// or role:"admin" at signup MUST NOT self-grant. With the input:false guard in place, Better
// Auth 1.6.x SILENTLY STRIPS those fields from the client body; the privileged values never reach
// the row. The signup itself still succeeds for the legitimate fields.
//
// CR-02 interaction: capability is now granted SERVER-SIDE by the create.before hook from the
// signup `intent` (threaded by the real action). This call deliberately smuggles privileged fields
// but provides NO intent, so the hook applies the SAFE booker default (canBook=true) — NOT the
// smuggled host/admin grant. The load-bearing security assertions are therefore: the smuggled
// canHost stays FALSE and the smuggled role stays "user" (both stripped by input:false). canBook
// reflects the server-chosen safe default, never the client's smuggled value of its own accord.
//
// Regression behavior (guard removed): without input:false, canBook/canHost are required:true
// *inputs*, so smuggling/omitting them makes signUpEmail throw — i.e. the happy-path assertion
// below (signup succeeds AND host/role are not escalated) goes RED. And if the hook were dropped,
// the user would have neither capability — also caught here. This test therefore fails if the
// input:false guard is removed from those additionalFields or the host/role grant ever leaks.

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
  it("strips client-supplied canHost/role at signup; host+admin are never escalated", async () => {
    const email = "escalate@example.com";

    // Attempt to self-grant host capability + admin role at signup, with NO intent. With input:false
    // the privileged fields are stripped; the create.before hook applies the SAFE booker default.
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

    // The signup-result user must NOT reflect the smuggled HOST/ADMIN privileges (the dangerous
    // escalations). canBook is the server-chosen safe default for an intent-less signup.
    const resultUser = (res as unknown as {
      user: { canHost: boolean; canBook: boolean; role: string | null };
    }).user;
    expect(resultUser.canHost).toBe(false); // smuggled host grant stripped (the real escalation).
    expect(resultUser.role).toBe("user"); // smuggled admin role stripped.

    // The PERSISTED row must also carry the safe values: host/admin stripped, and at most the safe
    // booker default — never the smuggled host capability or admin role.
    const u = await readUser(email);
    expect(u).toBeDefined();
    expect(u!.canHost).toBe(false); // load-bearing: smuggled canHost:true did NOT persist.
    expect(u!.role).toBe("user"); // load-bearing: smuggled role:"admin" did NOT persist.
    // The user is a booker by the server's safe default, not by client control — and is never
    // left with NO capability (the CR-02 invariant: never both-false).
    expect(u!.canBook).toBe(true);
    expect(u!.canBook || u!.canHost).toBe(true);
  });
});
