// OC-17 — the occupancy-mode lock, proved end to end against the isolated test schema.
//
// TWO layers, one authority:
//   Layer 1 — `getModeLockState` itself: which bookings actually stand in the way (upcoming or active,
//             confirmed or a live hold) and which deliberately do NOT (already ended, lapsed hold,
//             cancelled). Plus the `{lockedByCount, unlocksAt}` payload the § 1f alert renders.
//   Layer 2 — the ENFORCEMENT: `saveListingStep` refuses a genuine mode CHANGE while the lock holds, and
//             leaves every other autosave (including one that re-sends the same mode) completely alone.
//
// Harness: the tests/listing/crud.test.ts pattern — setupTestDb + makeTestAuth + a mutable sessionHeaders
// holder feeding a mocked next/headers, `@/lib/db` doMocked to the test-schema db, then a lazy import of
// the real server action. A regression INSIDE the action (guard deleted, guard widened to every save)
// therefore fails here.
//
// MUTATION-VERIFY (run before committing):
//   1. delete the `if (d.occupancyMode !== undefined && …)` block from saveListingStep → (7) goes RED.
//   2. drop `&& d.occupancyMode !== owned.occupancyMode` from that condition → (8) goes RED.
//   3. drop `AND ends_at > now()` from getModeLockState's query → (3) goes RED.
//   4. drop `AND expires_at > now()` from the status test → (4b) goes RED.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
// D-255 (plan 18.1-12) — the ONE shared seed, imported rather than re-implemented here.
import { seedHostVerification } from "../helpers/verification";
import { user, listing, booking } from "@/lib/db/schema";
import { getModeLockState } from "@/lib/listing/mode-lock";
import { MODE_LOCKED_MESSAGE } from "@/lib/validation/listing";

let testDb: TestDb;
let testAuth: TestAuth;
let createDraftListing: (typeof import("@/app/actions/listing"))["createDraftListing"];
let saveListingStep: (typeof import("@/app/actions/listing"))["saveListingStep"];

const BOOKER = "ml_booker";

// Fixed, far-future instants so no test can drift into the past as the calendar moves; and one long-past
// pair for the "already finished" case.
const FUTURE_START = new Date("2030-05-10T02:00:00.000Z");
const FUTURE_END = new Date("2030-05-10T04:00:00.000Z");
const LATER_START = new Date("2030-06-20T02:00:00.000Z");
const LATER_END = new Date("2030-06-20T05:00:00.000Z");
const PAST_START = new Date("2020-01-05T02:00:00.000Z");
const PAST_END = new Date("2020-01-05T04:00:00.000Z");
const HOLD_ALIVE = new Date("2030-01-01T00:00:00.000Z"); // expires_at still ahead
const HOLD_LAPSED = new Date("2020-01-01T00:00:00.000Z"); // expires_at long gone

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
  ({ createDraftListing, saveListingStep } = await import("@/app/actions/listing"));

  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "ML Booker",
    email: "ml_booker@example.com",
    firstName: "Booker",
    emailVerified: true,
  });
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

/**
 * Sign up + sign in a host; stash the session cookie for the next/headers mock. Returns the id.
 *
 * ⚠ SEEDS AN `approved` VERIFICATION ROW (D-255, plan 18.1-12). `createDraftListing` now refuses a
 * host with no `host_verification` row — which is what Better Auth's sign-up leaves — so `draftForHost`
 * below would fail at its setup line and the OC-17 refusal cases would never reach their subject.
 * The status is `approved` because nothing in this file is about verification: it is about the mode
 * lock, and a fixture refused for an unrelated reason measures nothing.
 */
async function signInHost(email: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  await seedHostVerification(testDb.db, res.user.id, "approved");
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

/** A bare listing owned by a bare host — enough for the lock query, which only reads bookings. */
async function makeListingWithHost(id: string): Promise<string> {
  const hostId = `${id}_host`;
  await testDb.db.insert(user).values({
    id: hostId,
    name: "ML Host",
    email: `${hostId}@example.com`,
    firstName: "ML",
    emailVerified: true,
  });
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    timezone: "Asia/Manila",
  });
  return hostId;
}

type BookingSpec = {
  id: string;
  listingId: string;
  status: "confirmed" | "pending" | "requested" | "approved" | "cancelled";
  startsAt: Date;
  endsAt: Date;
  expiresAt?: Date;
  unit?: number;
};

async function addBooking(spec: BookingSpec): Promise<void> {
  await testDb.db.insert(booking).values({
    id: spec.id,
    listingId: spec.listingId,
    unit: spec.unit ?? 1,
    bookerId: BOOKER,
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    status: spec.status,
    expiresAt: spec.expiresAt ?? null,
  });
}

async function readListing(id: string) {
  const rows = await testDb.db.select().from(listing).where(eq(listing.id, id));
  return rows[0];
}

// ── Layer 1 — the authority itself ────────────────────────────────────────────────────────────────────
describe("getModeLockState (OC-17 — which bookings stand in the way)", () => {
  it("(1) no bookings at all → unlocked, count 0, no unlock date", async () => {
    await makeListingWithHost("L_ml_none");
    const lock = await getModeLockState(testDb.db, "L_ml_none");
    expect(lock.locked).toBe(false);
    expect(lock.lockedByCount).toBe(0);
    expect(lock.unlocksAt).toBeNull();
  });

  it("(2) one CONFIRMED booking still ahead → locked, and unlocksAt is that booking's end", async () => {
    await makeListingWithHost("L_ml_future");
    await addBooking({
      id: "bk_ml_future",
      listingId: "L_ml_future",
      status: "confirmed",
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
    });
    const lock = await getModeLockState(testDb.db, "L_ml_future");
    expect(lock.locked).toBe(true);
    expect(lock.lockedByCount).toBe(1);
    // The § 1f alert says "you can switch after the last one finishes on {date}" — this is that date.
    expect(lock.unlocksAt?.getTime()).toBe(FUTURE_END.getTime());
  });

  it("(3) a confirmed booking that ALREADY ENDED does not lock (a finished session can't be stranded)", async () => {
    await makeListingWithHost("L_ml_past");
    await addBooking({
      id: "bk_ml_past",
      listingId: "L_ml_past",
      status: "confirmed",
      startsAt: PAST_START,
      endsAt: PAST_END,
    });
    const lock = await getModeLockState(testDb.db, "L_ml_past");
    expect(lock.locked).toBe(false);
    expect(lock.lockedByCount).toBe(0);
    expect(lock.unlocksAt).toBeNull();
  });

  it("(4) a LIVE pending hold locks; the SAME hold once lapsed does not (D-48a lazy expiry)", async () => {
    await makeListingWithHost("L_ml_hold");
    await addBooking({
      id: "bk_ml_hold",
      listingId: "L_ml_hold",
      status: "pending",
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
      expiresAt: HOLD_ALIVE,
    });
    // (4a) expires_at still ahead → it holds the slot, so it holds the mode.
    const held = await getModeLockState(testDb.db, "L_ml_hold");
    expect(held.locked).toBe(true);
    expect(held.lockedByCount).toBe(1);

    // (4b) the SAME row, expiry now in the past. No worker deletes it and no status changes — the DB clock
    // alone makes it stop counting, exactly as it stops occupying the slot.
    await testDb.db
      .update(booking)
      .set({ expiresAt: HOLD_LAPSED })
      .where(eq(booking.id, "bk_ml_hold"));
    const lapsed = await getModeLockState(testDb.db, "L_ml_hold");
    expect(lapsed.locked).toBe(false);
    expect(lapsed.lockedByCount).toBe(0);
  });

  it("(5) a CANCELLED future booking does not lock — which is why 'cancel them first' is a real way out", async () => {
    await makeListingWithHost("L_ml_cancelled");
    await addBooking({
      id: "bk_ml_cancelled",
      listingId: "L_ml_cancelled",
      status: "cancelled",
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
    });
    const lock = await getModeLockState(testDb.db, "L_ml_cancelled");
    expect(lock.locked).toBe(false);
    expect(lock.lockedByCount).toBe(0);
  });

  it("(6) two bookings still ahead → count 2, and unlocksAt is the LATER end", async () => {
    await makeListingWithHost("L_ml_two");
    await addBooking({
      id: "bk_ml_two_a",
      listingId: "L_ml_two",
      status: "confirmed",
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
    });
    await addBooking({
      id: "bk_ml_two_b",
      listingId: "L_ml_two",
      status: "confirmed",
      startsAt: LATER_START,
      endsAt: LATER_END,
    });
    const lock = await getModeLockState(testDb.db, "L_ml_two");
    expect(lock.locked).toBe(true);
    expect(lock.lockedByCount).toBe(2);
    // MAX(ends_at), not the first one found — the host must be told when the LAST booking clears.
    expect(lock.unlocksAt?.getTime()).toBe(LATER_END.getTime());
  });
});

// ── Layer 2 — the enforcement (threat T-09-19: the wizard's disabled card is never the gate) ───────────
describe("saveListingStep — the OC-17 refusal (T-09-19)", () => {
  /** Create a real draft through the real action, owned by a freshly signed-in host. */
  async function draftForHost(email: string): Promise<string> {
    await signInHost(email);
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    return created.id!;
  }

  it("(7) a DIFFERENT mode while locked is refused, and the persisted mode is unchanged", async () => {
    const id = await draftForHost("modelock.change@example.com");
    await addBooking({
      id: "bk_ml_change",
      listingId: id,
      status: "confirmed",
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
    });

    const res = await saveListingStep(id, { occupancyMode: "open_capacity" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.fieldErrors?.occupancyMode).toContain(MODE_LOCKED_MESSAGE);

    // The refused write never landed — the row still sells the way its live booking expects.
    const row = await readListing(id);
    expect(row.occupancyMode).toBe("exclusive");
  });

  it("(8) re-sending the SAME mode while locked still saves — the lock never freezes the wizard", async () => {
    const id = await draftForHost("modelock.same@example.com");
    await addBooking({
      id: "bk_ml_same",
      listingId: id,
      status: "confirmed",
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
    });

    // Exactly what every unrelated autosave does: it re-sends the stored mode alongside its own step.
    const res = await saveListingStep(id, {
      occupancyMode: "exclusive",
      title: "Still editable while booked",
    });
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.title).toBe("Still editable while booked");
    expect(row.occupancyMode).toBe("exclusive");
  });

  it("(9) a different mode while NOTHING is ahead is accepted, and the row changes", async () => {
    const id = await draftForHost("modelock.free@example.com");
    // A booking that already finished must not stand in the way (the same rule as (3), through the action).
    await addBooking({
      id: "bk_ml_free",
      listingId: id,
      status: "confirmed",
      startsAt: PAST_START,
      endsAt: PAST_END,
    });

    const res = await saveListingStep(id, { occupancyMode: "open_capacity" });
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.occupancyMode).toBe("open_capacity");
  });
});
