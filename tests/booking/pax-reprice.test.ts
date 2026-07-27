// D-108 `updateDeclaredPax` — the PaxStepper's server-side re-quote (08-05).
//
// WHAT THIS FILE IS REALLY GUARDING. The stepper is the first control in the app that lets a booker CHANGE
// the frozen price of a hold they already own. That is a money mutation reachable from a public page, so the
// cases below pin, in order: that the re-freeze is done by the server from the LISTING's own numbers (the
// client sends a headcount and nothing else); that the cap is enforced server-side, not by the input's `max`;
// that a flat listing is completely inert; that the owner gate is not an oracle; that a CONFIRMED (already
// charged) booking and a lapsed hold can never be re-priced; that the pricing MODE comes from the persisted
// `full_day` snapshot rather than being re-derived from a price the surcharge has moved (Pitfall 3); and that
// the spam budget is consulted.
//
// Money discipline: every expectation is derived from `computeServiceFee` — the shared pure module — never a
// hand-written percentage, so a rate change moves the test with the code.
//
// Harness: the REAL action driven through the vi.doMock idiom (next/headers, @/lib/auth, @/lib/db,
// next/cache, @/lib/rate-limit → import the action) against an isolated schema. Cloned from re-request.test.ts.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, booking } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { readDbNow } from "@/lib/booking/bookings-query";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const HOUR = 3_600_000;
const LEAD_MS = 3 * HOUR; // comfortably past MIN_LEAD_INSTANT_MINUTES so the D-96 guard never interferes

const HOST_EMAIL = "rp_host@example.com";
const BOOKER_EMAIL = "rp_booker@example.com";
const RIVAL_EMAIL = "rp_rival@example.com";
const PASSWORD = "averylongpassword";

const HOURLY = 50000; // ₱500/hr
const DAY_RATE = 300000; // ₱3,000/day
const FEE_PER_HEAD = 1500; // ₱15 per extra guest
const MAX_OCCUPANCY = 8;

/** The SHIPPED refusals, asserted as constants so a copy change is a deliberate act, not a silent one. */
const NOT_MINE = "We can't show this booking.";
const NOT_ACTIVE = "Your hold is no longer active. Check availability again.";

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

// The limiter is stubbed so a dozen seeded calls don't exhaust the real module-level Map — and so the last
// case can assert the action consults it with the right KEY and the right NUMBERS.
const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
let rateLimitAllow = true;
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  return rateLimitAllow ? { ok: true } : { ok: false, retryAfter: 42 };
};

let testDb: TestDb;
let testAuth: TestAuth;
type BookingActions = typeof import("@/app/actions/booking");
let updateDeclaredPax: BookingActions["updateDeclaredPax"];

let hostId: string;
let bookerId: string;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** A dedicated listing per case, so seeded holds never collide on the booking_no_overlap EXCLUDE. */
async function makeListing(
  opts: { included?: number | null; extraHeadFee?: number | null; maxOccupancy?: number | null } = {},
): Promise<string> {
  const id = uid("L_rp");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    maxOccupancy: opts.maxOccupancy === undefined ? MAX_OCCUPANCY : opts.maxOccupancy,
    included: opts.included ?? null,
    extraHeadFee: opts.extraHeadFee ?? null,
    currency: "php",
  });
  return id;
}

/** Place a real live hold through the shipped transaction, so the row shape is production-accurate. */
async function hold(
  listingId: string,
  opts: { hours?: number; fullDay?: boolean; declaredPax?: number; bookerId?: string } = {},
) {
  const startsAt = new Date(Date.now() + LEAD_MS);
  const endsAt = new Date(startsAt.getTime() + (opts.hours ?? 2) * HOUR);
  const res = await createPendingHold(testDb.db, {
    listingId,
    bookerId: opts.bookerId ?? bookerId,
    startsAt,
    endsAt,
    fullDay: opts.fullDay ?? false,
    idempotencyKey: null,
    declaredPax: opts.declaredPax,
  });
  if ("error" in res) throw new Error(`hold refused: ${res.error}`);
  return res;
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      fullDay: booking.fullDay,
      declaredPax: booking.declaredPax,
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "RP Host",
    firstName: "RPHost",
    intent: "host",
  });
  for (const [email, name] of [
    [BOOKER_EMAIL, "Cassie"],
    [RIVAL_EMAIL, "Rival"],
  ]) {
    await signUp(testAuth, { email, password: PASSWORD, name, firstName: name, intent: "book" });
  }
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  bookerId = ids.find((u) => u.email === BOOKER_EMAIL)!.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ updateDeclaredPax } = await import("@/app/actions/booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  rateLimitCalls.length = 0;
  rateLimitAllow = true;
});

describe("updateDeclaredPax — the D-108 server-side re-quote", () => {
  it("(1) re-freezes the whole D-74 triple from the LISTING's own fee, and persists the headcount", async () => {
    const listingId = await makeListing({ included: 2, extraHeadFee: FEE_PER_HEAD });
    const { id } = await hold(listingId, { hours: 2, declaredPax: 1 });
    const before = await readRow(id);
    expect(before.spacePriceCents).toBe(HOURLY * 2); // organizer-only ⇒ no surcharge yet

    await login(BOOKER_EMAIL);
    const res = await updateDeclaredPax(id, 5);
    expect(res.ok).toBe(true);

    const after = await readRow(id);
    const space = HOURLY * 2 + (5 - 2) * FEE_PER_HEAD;
    const fee = computeServiceFee(space);
    expect(after.declaredPax).toBe(5);
    expect(after.spacePriceCents).toBe(space);
    // The service fee is recomputed on the NEW space price, and quoted == space + fee still holds exactly.
    expect(after.serviceFeeCents).toBe(fee.serviceFeeCents);
    expect(after.quotedTotalCents).toBe(fee.allInCents);
    expect(after.quotedTotalCents).toBe(after.spacePriceCents! + after.serviceFeeCents!);
  });

  it("(2) stepping back DOWN re-freezes downward — the surcharge is recomputed, never accumulated", async () => {
    const listingId = await makeListing({ included: 2, extraHeadFee: FEE_PER_HEAD });
    const { id } = await hold(listingId, { hours: 2, declaredPax: 6 });

    await login(BOOKER_EMAIL);
    expect((await updateDeclaredPax(id, 2)).ok).toBe(true);

    const after = await readRow(id);
    // Back to the base: max(0, 2 − 2) = 0 heads. A stepper that added deltas would show a stale surcharge.
    expect(after.declaredPax).toBe(2);
    expect(after.spacePriceCents).toBe(HOURLY * 2);
    expect(after.quotedTotalCents).toBe(computeServiceFee(HOURLY * 2).allInCents);
  });

  it("(3) the CAP is the listing's maxOccupancy, enforced server-side (the input's max is a courtesy)", async () => {
    const listingId = await makeListing({ included: 1, extraHeadFee: FEE_PER_HEAD });
    const { id } = await hold(listingId, { hours: 2, declaredPax: 1 });

    await login(BOOKER_EMAIL);
    // A crafted call far above the cap must not price 400 heads — it clamps to the listing's own limit.
    expect((await updateDeclaredPax(id, 400)).ok).toBe(true);

    const after = await readRow(id);
    expect(after.declaredPax).toBe(MAX_OCCUPANCY);
    expect(after.spacePriceCents).toBe(HOURLY * 2 + (MAX_OCCUPANCY - 1) * FEE_PER_HEAD);
  });

  it("(4) a FLAT listing is completely inert — no declared_pax, no price movement (D-108 zero leak)", async () => {
    const listingId = await makeListing(); // no included / extra_head_fee
    const { id } = await hold(listingId, { hours: 2, declaredPax: 9 });
    const before = await readRow(id);
    expect(before.declaredPax).toBeNull();

    await login(BOOKER_EMAIL);
    // Reported as success (there is nothing wrong with the request) — but nothing is written.
    expect((await updateDeclaredPax(id, 7)).ok).toBe(true);

    const after = await readRow(id);
    expect(after.declaredPax).toBeNull();
    expect(after.spacePriceCents).toBe(before.spacePriceCents);
    expect(after.serviceFeeCents).toBe(before.serviceFeeCents);
    expect(after.quotedTotalCents).toBe(before.quotedTotalCents);
  });

  it("(5) the owner gate is not an oracle — a stranger's call changes nothing and says the same thing", async () => {
    const listingId = await makeListing({ included: 1, extraHeadFee: FEE_PER_HEAD });
    const { id } = await hold(listingId, { hours: 2, declaredPax: 1 });
    const before = await readRow(id);

    await login(RIVAL_EMAIL);
    const mine = await updateDeclaredPax(id, 6);
    // A booking that does not exist at all answers IDENTICALLY — no existence oracle.
    const missing = await updateDeclaredPax("bk_rp_does_not_exist", 6);

    expect(mine).toEqual({ ok: false, error: NOT_MINE });
    expect(missing).toEqual({ ok: false, error: NOT_MINE });
    const after = await readRow(id);
    expect(after.declaredPax).toBe(before.declaredPax);
    expect(after.spacePriceCents).toBe(before.spacePriceCents);
  });

  it("(6) a CONFIRMED booking can never be re-priced — it has already been charged (D-114 defers the top-up)", async () => {
    const listingId = await makeListing({ included: 1, extraHeadFee: FEE_PER_HEAD });
    const id = uid("bk_rp_confirmed");
    const now = await readDbNow(testDb.db);
    const startsAt = new Date(now.getTime() + LEAD_MS);
    const space = HOURLY * 2;
    const fee = computeServiceFee(space);
    await testDb.db.insert(booking).values({
      id,
      listingId,
      unit: 1,
      bookerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * HOUR),
      status: "confirmed",
      fullDay: false,
      declaredPax: 1,
      spacePriceCents: space,
      serviceFeeCents: fee.serviceFeeCents,
      quotedTotalCents: fee.allInCents,
      currency: "php",
      expiresAt: null,
    });

    await login(BOOKER_EMAIL);
    expect(await updateDeclaredPax(id, 6)).toEqual({ ok: false, error: NOT_ACTIVE });

    const after = await readRow(id);
    expect(after.declaredPax).toBe(1);
    expect(after.spacePriceCents).toBe(space);
    expect(after.quotedTotalCents).toBe(fee.allInCents);
  });

  it("(7) a LAPSED hold can never be re-priced (expiry is judged by the Postgres clock in the UPDATE)", async () => {
    const listingId = await makeListing({ included: 1, extraHeadFee: FEE_PER_HEAD });
    const id = uid("bk_rp_lapsed");
    const now = await readDbNow(testDb.db);
    const startsAt = new Date(now.getTime() + LEAD_MS);
    const space = HOURLY * 2;
    await testDb.db.insert(booking).values({
      id,
      listingId,
      unit: 1,
      bookerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * HOUR),
      status: "pending",
      fullDay: false,
      declaredPax: 1,
      spacePriceCents: space,
      serviceFeeCents: computeServiceFee(space).serviceFeeCents,
      quotedTotalCents: computeServiceFee(space).allInCents,
      currency: "php",
      expiresAt: new Date(now.getTime() - 60_000), // one minute past its TTL
    });

    await login(BOOKER_EMAIL);
    expect(await updateDeclaredPax(id, 4)).toEqual({ ok: false, error: NOT_ACTIVE });
    expect((await readRow(id)).declaredPax).toBe(1);
  });

  it("(8) the pricing MODE comes from the PERSISTED full_day snapshot, not from the price (Pitfall 3)", async () => {
    const listingId = await makeListing({ included: 2, extraHeadFee: FEE_PER_HEAD });
    // A full-day hold: the flat day rate froze the price, and full_day = true is persisted with it.
    const { id } = await hold(listingId, { hours: 3, fullDay: true, declaredPax: 1 });
    expect((await readRow(id)).fullDay).toBe(true);

    await login(BOOKER_EMAIL);
    expect((await updateDeclaredPax(id, 5)).ok).toBe(true);

    const after = await readRow(id);
    const space = DAY_RATE + (5 - 2) * FEE_PER_HEAD;
    // Re-priced off the DAY rate, because the row says full-day. An implementation that re-derived the mode
    // by comparing the frozen price to hourlyRate × hours would have re-priced this as an hourly booking:
    expect(after.spacePriceCents).toBe(space);
    expect(space).not.toBe(HOURLY * 3);
    expect(after.quotedTotalCents).toBe(computeServiceFee(space).allInCents);
  });

  it("(9) the spam budget is consulted with the identity-scoped key, and a denial writes nothing", async () => {
    const listingId = await makeListing({ included: 1, extraHeadFee: FEE_PER_HEAD });
    const { id } = await hold(listingId, { hours: 2, declaredPax: 1 });

    await login(BOOKER_EMAIL);
    rateLimitAllow = false;
    const res = await updateDeclaredPax(id, 5);

    expect(res.ok).toBe(false);
    // Keyed on the AUTHENTICATED identity (never the booking id — one booker must not get a fresh budget per
    // hold) and budgeted per minute.
    expect(rateLimitCalls).toHaveLength(1);
    expect(rateLimitCalls[0].key).toBe(`reprice-pax:${bookerId}`);
    expect(rateLimitCalls[0].opts.window).toBe(60);
    expect(rateLimitCalls[0].opts.max).toBeGreaterThan(0);
    // Refused BEFORE any write.
    expect((await readRow(id)).declaredPax).toBe(1);
  });
});
