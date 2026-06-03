// AUTH-05 / D-09 / D-10: profile edit persistence + the public/private projection boundary.
//
// WR-07 change: the persistence test now imports and drives the REAL exported `updateProfile`
// server action (binding it to the isolated test schema + a mocked session) instead of reproducing
// a bare db.update against the test db. So a regression INSIDE the action — a dropped field, a
// broken session gate, or the WR-05 null-normalization being reverted — fails this test.
//
// WR-05 change: cleared optional fields must persist as NULL (not ""). We assert that submitting a
// field as "" / whitespace round-trips to NULL on the row (absent-vs-empty preserved for Phase 2).
//
// The publicProfile projection test (the load-bearing leak guard) is unchanged — it correctly
// asserts the allow-list output and excludes every private field.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user } from "@/lib/db/schema";
import {
  publicProfile,
  PRIVATE_PROFILE_FIELDS,
  formatMemberSince,
} from "@/lib/profile";

let testDb: TestDb;
let testAuth: TestAuth;
let updateProfile: typeof import("@/app/actions/profile")["updateProfile"];

// The real updateProfile reads the session via next/headers + auth.api.getSession, and writes via
// auth.api.updateUser({ headers }). We mock next/headers to return the signed-in user's cookie, and
// bind @/lib/auth to the test-schema auth. A mutable holder lets the next/headers mock pick up the
// per-test session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.resetModules();
  ({ updateProfile } = await import("@/app/actions/profile"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a user; return their id and stash the session cookie for the next/headers mock. */
async function signInUser(email: string, firstName: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: firstName,
    firstName,
    intent: "book",
  })) as { user: { id: string } };
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  expect(sessionHeaders.cookie).toContain("better-auth.session_token=");
  return res.user.id;
}

async function readUser(email: string) {
  const rows = await testDb.db.select().from(user).where(eq(user.email, email));
  return rows[0];
}

describe("profile persistence via the real updateProfile action (AUTH-05, D-09/D-10, WR-07)", () => {
  it("persists every editable field submitted through updateProfile()", async () => {
    const email = "profile.persist@example.com";
    await signInUser(email, "Persy");

    const res = await updateProfile({
      firstName: "Persephone",
      lastName: "Hollis",
      phone: "+1 555 0100",
      bio: "Pickleball most mornings.",
      city: "Austin",
    });
    expect(res.ok).toBe(true);

    const row = await readUser(email);
    expect(row.firstName).toBe("Persephone");
    expect(row.lastName).toBe("Hollis");
    expect(row.phone).toBe("+1 555 0100");
    expect(row.bio).toBe("Pickleball most mornings.");
    expect(row.city).toBe("Austin");
  });

  it("clears optional fields to NULL (not \"\") when submitted empty/whitespace (WR-05)", async () => {
    const email = "profile.clear@example.com";
    await signInUser(email, "Clarence");

    // First populate the optional fields.
    await updateProfile({
      firstName: "Clarence",
      lastName: "Stale",
      phone: "+1 555 9999",
      bio: "Old bio",
      city: "Old City",
    });
    let row = await readUser(email);
    expect(row.lastName).toBe("Stale");

    // Now clear them with empty / whitespace-only values — must persist as NULL, not "".
    const res = await updateProfile({
      firstName: "Clarence",
      lastName: "",
      phone: "   ",
      bio: "",
      city: undefined,
    });
    expect(res.ok).toBe(true);

    row = await readUser(email);
    expect(row.firstName).toBe("Clarence"); // required field preserved.
    expect(row.lastName).toBeNull();
    expect(row.phone).toBeNull();
    expect(row.bio).toBeNull();
    expect(row.city).toBeNull();
    // Belt-and-suspenders: NONE of the cleared fields may be the empty string.
    expect(row.lastName).not.toBe("");
    expect(row.phone).not.toBe("");
  });

  it("rejects the update when there is no session (gate enforced by the real action)", async () => {
    sessionHeaders.cookie = ""; // no session cookie.
    const res = await updateProfile({ firstName: "Nobody" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/signed in/i);
  });
});

describe("public/private projection (D-09/D-10, threat T-04-03)", () => {
  it("publicProfile returns ONLY the public subset and excludes private fields", async () => {
    const email = "profile.public@example.com";
    await signInUser(email, "Pubby");
    await testDb.db
      .update(user)
      .set({
        lastName: "Secret",
        phone: "+1 555 0199",
        bio: "Yoga + climbing.",
        city: "Denver",
        avatarUrl: "https://res.cloudinary.com/mock/image/upload/u.jpg",
        avatarPublicId: "fitout/avatars/u",
      })
      .where(eq(user.email, email));

    const row = await readUser(email);
    const pub = publicProfile({
      ...row,
      email: row.email,
    });

    // Public face: exactly these five keys, nothing else.
    expect(Object.keys(pub).sort()).toEqual(
      ["avatarUrl", "bio", "city", "createdAt", "firstName"].sort(),
    );
    expect(pub.firstName).toBe("Pubby");
    expect(pub.bio).toBe("Yoga + climbing.");
    expect(pub.city).toBe("Denver");
    expect(pub.avatarUrl).toBe(
      "https://res.cloudinary.com/mock/image/upload/u.jpg",
    );
    expect(pub.createdAt).toBeInstanceOf(Date);

    // Private fields must NOT be present in the public projection.
    for (const field of PRIVATE_PROFILE_FIELDS) {
      expect(field in pub).toBe(false);
    }
    // Explicit belt-and-suspenders on the three most sensitive (D-10).
    expect("lastName" in pub).toBe(false);
    expect("email" in pub).toBe(false);
    expect("phone" in pub).toBe(false);
  });

  it('formatMemberSince renders the createdAt as locale month + year (no naive timestamp)', () => {
    // A fixed UTC instant; render in a fixed locale/zone for determinism (Pitfall 5).
    const created = new Date("2026-06-15T12:00:00.000Z");
    const label = formatMemberSince(created, "en-US", "UTC");
    expect(label).toBe("June 2026");
  });
});
