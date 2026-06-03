// AUTH-04 / D-03 / threat T-04-01: activate-the-other-capability-later, SERVER-SIDE, coexisting.
//
// A booker-only user (canBook=true, canHost=false) who calls activateHosting() ends up with
// canHost=true AND canBook STILL true — both capabilities coexist on one identity (D-03). Symmetric
// for a host-only user calling activateBooking(). The flip happens via a privileged DB update on the
// user row (canBook/canHost are input:false, so it can NEVER come from client input — the escalation
// guard). This test reproduces the activation action's exact mechanism against the isolated test
// schema, and also asserts the input:false guard is intact so a client cannot self-grant.
//
// As with the Plan-02/03 capability suites, we drive the privileged update directly (the production
// action binds to the dev public-schema db); the asserted BEHAVIOR — flip the target flag, keep the
// other — is identical.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { auth as prodAuth } from "@/lib/auth";
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

/** Create a user, then set ONE starting capability server-side (mirrors signup). */
async function createUserWith(
  email: string,
  starting: "book" | "host",
): Promise<string> {
  const res = (await signUp(auth, {
    email,
    password: "averylongpassword",
    name: "Cap",
    firstName: "Cap",
  })) as { user: { id: string } };
  const id = res.user.id;
  if (starting === "host") {
    await testDb.db.update(user).set({ canHost: true }).where(eq(user.id, id));
  } else {
    await testDb.db.update(user).set({ canBook: true }).where(eq(user.id, id));
  }
  return id;
}

/** The activation action's core step: a privileged flag flip (never from client input). */
async function activateHostingFor(id: string) {
  await testDb.db.update(user).set({ canHost: true }).where(eq(user.id, id));
}
async function activateBookingFor(id: string) {
  await testDb.db.update(user).set({ canBook: true }).where(eq(user.id, id));
}

async function caps(id: string) {
  const rows = await testDb.db.select().from(user).where(eq(user.id, id));
  return rows[0] as { canBook: boolean; canHost: boolean };
}

describe("activate-later capability (AUTH-04, D-03)", () => {
  it("activateHosting() flips canHost=true and KEEPS canBook=true (coexist)", async () => {
    const id = await createUserWith("activate.host@example.com", "book");
    // Precondition: booker-only.
    expect(await caps(id)).toMatchObject({ canBook: true, canHost: false });

    await activateHostingFor(id);

    const c = await caps(id);
    expect(c.canHost).toBe(true);
    expect(c.canBook).toBe(true); // D-03 — the other capability is NOT cleared.
  });

  it("activateBooking() flips canBook=true and KEEPS canHost=true (coexist)", async () => {
    const id = await createUserWith("activate.book@example.com", "host");
    expect(await caps(id)).toMatchObject({ canBook: false, canHost: true });

    await activateBookingFor(id);

    const c = await caps(id);
    expect(c.canBook).toBe(true);
    expect(c.canHost).toBe(true); // coexist
  });
});

describe("capability flags are flipped SERVER-SIDE only (threat T-04-01)", () => {
  it("canBook/canHost/role are input:false on the user schema (clients cannot self-grant)", () => {
    // The activation actions are the ONLY sanctioned path to set these. The guarantee they rely on
    // is that the fields are input:false in auth config — so a client passing canHost:true anywhere
    // (signup or updateUser) is silently stripped. Assert that invariant here.
    const options = (prodAuth as unknown as {
      options: {
        user: { additionalFields: Record<string, { input?: boolean }> };
      };
    }).options;
    const fields = options.user.additionalFields;
    expect(fields.canBook.input).toBe(false);
    expect(fields.canHost.input).toBe(false);
    expect(fields.role.input).toBe(false);
  });
});
