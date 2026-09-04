// AVAIL-01/02 — the host availability WRITE path, driven through the REAL exported server actions
// (saveOperatingHours / addBlock / removeBlock) against the isolated test schema.
//
// Harness: the tests/listing/crud.test.ts pattern — setupTestDb + makeTestAuth + a mutable
// sessionHeaders holder feeding a mocked next/headers; because the actions write via `@/lib/db`
// directly, we ALSO doMock `@/lib/db` to the test-schema db and stub next/cache's revalidatePath, then
// lazily import the actions — so a regression INSIDE the action (dropped IDOR guard, wrong tz
// conversion, non-owner unblock, broken replace-the-set) fails HERE.
//
// Proves: block times persist as UTC timestamptz derived from the venue tz (Asia/Manila); unit-scoped
// vs whole-listing (unit null) both persist with the right unit; removeBlock deletes; a NON-owner
// cannot add/unblock (T-03-IDOR-HOURS / T-03-BLOCK-UNBLOCK); saveOperatingHours is a "replace the set"
// full-state save with server re-validation and a clean 'HH:mm:ss' DB round-trip (the 03-04 seam).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { listing, operatingHours, availabilityBlock } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
let saveOperatingHours: (typeof import("@/app/actions/operating-hours"))["saveOperatingHours"];
let addBlock: (typeof import("@/app/actions/blocks"))["addBlock"];
let removeBlock: (typeof import("@/app/actions/blocks"))["removeBlock"];

// Mutable holder so the (hoisted) next/headers mock can pick up the per-test session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ saveOperatingHours } = await import("@/app/actions/operating-hours"));
  ({ addBlock, removeBlock } = await import("@/app/actions/blocks"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a host; stash the session cookie for the next/headers mock. Returns the id. */
async function signInHost(email: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

/** Seed a published Manila listing owned by `hostId`. */
async function makeListing(id: string, hostId: string, unitCount: number): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    unitCount,
    timezone: "Asia/Manila",
  });
}

async function readBlocks(listingId: string) {
  return testDb.db
    .select()
    .from(availabilityBlock)
    .where(eq(availabilityBlock.listingId, listingId));
}

async function readHours(listingId: string) {
  return testDb.db.select().from(operatingHours).where(eq(operatingHours.listingId, listingId));
}

describe("addBlock — venue-tz UTC conversion + unit scoping (AVAIL-02, D-24)", () => {
  it("stores a partial-range block as UTC timestamptz derived from the venue tz (Asia/Manila = UTC+8)", async () => {
    const hostId = await signInHost("blk.partial@example.com");
    await makeListing("L_blk_partial", hostId, 8);

    // 10:00–12:00 Asia/Manila on 2026-08-03 → UTC 02:00–04:00 the same day (Manila is UTC+8, no DST).
    const res = await addBlock("L_blk_partial", {
      date: "2026-08-03",
      wholeDay: false,
      startTime: "10:00",
      endTime: "12:00",
      unit: null,
      reason: "cleaning",
    });
    expect(res.ok).toBe(true);

    const rows = await readBlocks("L_blk_partial");
    expect(rows).toHaveLength(1);
    expect(rows[0].startsAt.toISOString()).toBe("2026-08-03T02:00:00.000Z");
    expect(rows[0].endsAt.toISOString()).toBe("2026-08-03T04:00:00.000Z");
    expect(rows[0].unit).toBeNull(); // whole listing
    expect(rows[0].reason).toBe("cleaning");
  });

  it("stores a whole-day block as venue-local 00:00 → next-day 00:00 in UTC", async () => {
    const hostId = await signInHost("blk.wholeday@example.com");
    await makeListing("L_blk_whole", hostId, 1);

    // Whole day 2026-08-03 Asia/Manila → UTC [2026-08-02T16:00Z, 2026-08-03T16:00Z).
    const res = await addBlock("L_blk_whole", {
      date: "2026-08-03",
      wholeDay: true,
      unit: null,
    });
    expect(res.ok).toBe(true);

    const rows = await readBlocks("L_blk_whole");
    expect(rows[0].startsAt.toISOString()).toBe("2026-08-02T16:00:00.000Z");
    expect(rows[0].endsAt.toISOString()).toBe("2026-08-03T16:00:00.000Z");
  });

  it("persists a unit-scoped block (unit=3) with the right unit", async () => {
    const hostId = await signInHost("blk.unit@example.com");
    await makeListing("L_blk_unit", hostId, 8);
    const res = await addBlock("L_blk_unit", {
      date: "2026-08-03",
      wholeDay: true,
      unit: 3,
    });
    expect(res.ok).toBe(true);
    const rows = await readBlocks("L_blk_unit");
    expect(rows[0].unit).toBe(3);
  });

  it("rejects an invalid block server-side (partial range with end <= start) — client never trusted", async () => {
    const hostId = await signInHost("blk.invalid@example.com");
    await makeListing("L_blk_invalid", hostId, 1);
    const res = await addBlock("L_blk_invalid", {
      date: "2026-08-03",
      wholeDay: false,
      startTime: "12:00",
      endTime: "12:00",
      unit: null,
    });
    expect(res.ok).toBe(false);
    expect(await readBlocks("L_blk_invalid")).toHaveLength(0);
  });
});

describe("removeBlock — owner-scoped unblock (T-03-BLOCK-UNBLOCK)", () => {
  it("deletes the owner's block", async () => {
    const hostId = await signInHost("blk.remove@example.com");
    await makeListing("L_blk_remove", hostId, 1);
    const added = await addBlock("L_blk_remove", { date: "2026-08-03", wholeDay: true, unit: null });
    expect(added.ok).toBe(true);
    const blockId = added.ok ? added.id! : "";

    const res = await removeBlock("L_blk_remove", blockId);
    expect(res.ok).toBe(true);
    expect(await readBlocks("L_blk_remove")).toHaveLength(0);
  });

  it("a NON-owner cannot unblock someone else's listing (IDOR guard) — the block survives", async () => {
    const ownerId = await signInHost("blk.owner@example.com");
    await makeListing("L_blk_idor", ownerId, 1);
    const added = await addBlock("L_blk_idor", { date: "2026-08-03", wholeDay: true, unit: null });
    const blockId = added.ok ? added.id! : "";

    // A DIFFERENT host signs in and tries to unblock the owner's block.
    await signInHost("blk.attacker@example.com");
    const res = await removeBlock("L_blk_idor", blockId);
    expect(res.ok).toBe(false);
    // The block is untouched — the attacker's delete never landed.
    const rows = await testDb.db
      .select()
      .from(availabilityBlock)
      .where(and(eq(availabilityBlock.id, blockId), eq(availabilityBlock.listingId, "L_blk_idor")));
    expect(rows).toHaveLength(1);
  });

  it("a NON-owner cannot addBlock to someone else's listing (IDOR guard)", async () => {
    const ownerId = await signInHost("blk.owner2@example.com");
    await makeListing("L_blk_idor2", ownerId, 1);

    await signInHost("blk.attacker2@example.com");
    const res = await addBlock("L_blk_idor2", { date: "2026-08-03", wholeDay: true, unit: null });
    expect(res.ok).toBe(false);
    expect(await readBlocks("L_blk_idor2")).toHaveLength(0);
  });
});

describe("saveOperatingHours — replace-the-set + server re-validation (AVAIL-01, D-25)", () => {
  it("replaces the FULL window set on each save (no stale windows leak)", async () => {
    const hostId = await signInHost("oh.replace@example.com");
    await makeListing("L_oh_replace", hostId, 1);

    // First save: two Monday windows.
    let res = await saveOperatingHours("L_oh_replace", {
      windows: [
        { dayOfWeek: 1, openTime: "06:00", closeTime: "09:00" },
        { dayOfWeek: 1, openTime: "10:00", closeTime: "12:00" },
      ],
    });
    expect(res.ok).toBe(true);
    let rows = await readHours("L_oh_replace");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.dayOfWeek === 1)).toBe(true);

    // Second save REPLACES the set: a single Tuesday window; the Monday windows are gone.
    res = await saveOperatingHours("L_oh_replace", {
      windows: [{ dayOfWeek: 2, openTime: "09:00", closeTime: "17:00" }],
    });
    expect(res.ok).toBe(true);
    rows = await readHours("L_oh_replace");
    expect(rows).toHaveLength(1);
    expect(rows[0].dayOfWeek).toBe(2);
  });

  it("re-saving DB-round-tripped 'HH:mm:ss' windows never false-rejects (the 03-04 edit seam)", async () => {
    const hostId = await signInHost("oh.roundtrip@example.com");
    await makeListing("L_oh_roundtrip", hostId, 1);

    await saveOperatingHours("L_oh_roundtrip", {
      windows: [{ dayOfWeek: 1, openTime: "06:00", closeTime: "09:00" }],
    });
    // Postgres `time` round-trips as "HH:mm:ss"; feeding that straight back must still validate + save.
    const rows = await readHours("L_oh_roundtrip");
    expect(rows[0].openTime).toBe("06:00:00");
    const res = await saveOperatingHours("L_oh_roundtrip", {
      windows: [{ dayOfWeek: 1, openTime: rows[0].openTime, closeTime: rows[0].closeTime }],
    });
    expect(res.ok).toBe(true);
    expect(await readHours("L_oh_roundtrip")).toHaveLength(1);
  });

  it("rejects an off-the-hour window server-side (Security V5) — fieldErrors, no write", async () => {
    const hostId = await signInHost("oh.offhour@example.com");
    await makeListing("L_oh_offhour", hostId, 1);
    const res = await saveOperatingHours("L_oh_offhour", {
      windows: [{ dayOfWeek: 1, openTime: "06:15", closeTime: "09:00" }],
    });
    expect(res.ok).toBe(false);
    expect(await readHours("L_oh_offhour")).toHaveLength(0);
  });

  it("a NON-owner cannot save hours to someone else's listing (IDOR guard)", async () => {
    const ownerId = await signInHost("oh.owner@example.com");
    await makeListing("L_oh_idor", ownerId, 1);

    await signInHost("oh.attacker@example.com");
    const res = await saveOperatingHours("L_oh_idor", {
      windows: [{ dayOfWeek: 1, openTime: "06:00", closeTime: "09:00" }],
    });
    expect(res.ok).toBe(false);
    expect(await readHours("L_oh_idor")).toHaveLength(0);
  });
});
