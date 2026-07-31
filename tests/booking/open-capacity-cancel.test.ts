// OPEN-02 / OPEN-04 · OC-15 / OC-16 — cancelling a DROP-IN pass, driven end to end through the REAL
// cancelBookingAsHost / cancelBookingAsBooker against a real Postgres (the tests/payments/host-cancel.test.ts
// vi.doMock harness).
//
// THE ONE THING THIS FILE EXISTS FOR (09-RESEARCH Pitfall 5 / threat T-09-31): D-70's anti-resell auto-block
// inserts an `availability_block` over the freed `(unit, window)`. For an exclusive booking that is one slot
// on one unit. For a drop-in booking the window is the venue's WHOLE OPERATING DAY and the unit is the
// sentinel `1` that EVERY open booking on that date shares — so ONE host cancellation would make the entire
// date read "Fully booked" for every other booker who already holds a pass. A guest's cancellation becomes a
// mass outage, and nothing in the schema would object.
//
// So the fork is asserted in BOTH directions, and neither direction is proven by matching a sentence:
//   - case (1) reads the availability_block table back and finds NOTHING for a drop-in cancel, while the
//     refund, the D-71 debit and the status flip are all present exactly as on an exclusive cancel;
//   - case (2) is the D-70 REGRESSION GUARD — the same call on an EXCLUSIVE booking still writes exactly one
//     sentinel block. Without it a later refactor could delete the block for everyone and this file would
//     still be green.
//   - case (3) is Pitfall 5 stated the way a BOOKER experiences it: after the host cancels one of two passes
//     on a shared date, `getAvailability` still reports the date open, with the freed head back in the pool.
//     ⚠️ Read case (3)'s own note before trusting its headline: measured against the SHIPPED 09-04 open
//     branch, the spots-left half CANNOT go red (that projection never joins availability_block); the
//     block-count half is what the mutation kills, and the harm it names — a permanent, host-UNDELETABLE
//     whole-day block per cancelled pass — is the real one.
//
// The other two facts pinned here:
//   - OC-15's seat release needs NO release code: `remaining` is a live SUM over the occupying set, so a
//     cancelled row simply leaves it (case 4 proves the freed heads are genuinely re-sellable, not merely
//     re-counted, by minting a fresh claim for exactly them);
//   - there is NO drop-in-specific refund rule (case 5): `quoteRefund` / `LADDER` are reused verbatim against
//     the D-67 tier snapshot and OC-03's `starts_at`, which for a pass is the venue's OPENING instant.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 lesson): the claim in case 4
// refuses a date whose pass window has closed or that lies beyond the 90-day horizon, so a hardcoded date
// would quietly turn the case into a PAST_DATE refusal and go green by vacuum.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import {
  user,
  listing,
  booking,
  availabilityBlock,
  hostPayout,
  hostPayoutLedger,
  operatingHours,
} from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { getAvailability } from "@/lib/availability/read-model";
import { createOpenCapacityHold } from "@/lib/availability/units";
import { lowStockThreshold } from "@/lib/availability/open-capacity";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { LADDER, quoteRefund } from "@/lib/payments/cancellation";
import { HOST_CANCEL_FEE_CENTS } from "@/lib/payments/config";
import type { RateLimitResult } from "@/lib/rate-limit";

/** The sentinel `availability_block.reason` cancelBookingAsHost writes — asserted as a literal so a
 *  rename is a deliberate act. Mirrors the constant the action keeps private. */
const HOST_CANCEL_BLOCK_REASON = "host_cancellation";

const HOST_EMAIL = "occ_host@example.com";
const BOOKER_EMAIL = "occ_booker@example.com";
const OTHER_BOOKER_EMAIL = "occ_other_booker@example.com";
const PASSWORD = "averylongpassword";

const CAP = 4; // admissions per (listing, date)
const PER_HEAD_CENTS = 35000; // ₱350.00 per pass
const HOURLY = 100000; // the exclusive fixture's ₱1,000/h
const DAY_RATE = 300000;
const SERVICE_FEE_EXCL = 5000; // 5% of ₱1,000 — the exclusive fixture's frozen fee
const EXCL_TOTAL = HOURLY + SERVICE_FEE_EXCL;

const L_DROPIN = "L_occ_dropin"; // open_capacity, hours every weekday
const L_EXCL = "L_occ_excl"; // exclusive — the D-70 regression guard's listing

const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — so the instants below are plain UTC arithmetic
const OPEN_HOUR = 6;
const CLOSE_HOUR = 22;
const HOUR_MS = 3_600_000;

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

function toLocalDate(d: Date): LocalDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
/** A venue-local calendar date `n` days from now — clock-relative on purpose (see the header). */
function daysOut(n: number): LocalDate {
  return toLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
/** The venue's OPENING instant on a venue-local date: 06:00 +08 == 22:00Z the PREVIOUS day. This is what
 *  OC-03 persists as `starts_at`, and therefore what the Phase-7 refund ladder anchors on. */
function openInstant(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, OPEN_HOUR - MANILA_OFFSET_HOURS, 0, 0));
}
/** The venue's CLOSING instant: 22:00 +08 == 14:00Z the SAME day. Persisted as `ends_at`. */
function closeInstant(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, CLOSE_HOUR - MANILA_OFFSET_HOURS, 0, 0));
}
/**
 * The CR-03 counter identity for a venue-local date: `[midnight, next midnight)` plus the `YYYY-MM-DD` key.
 * NEVER persisted — it is what a pass COUNTS AGAINST, while openInstant/closeInstant are what it COVERS.
 * Derived with the same plain +08 arithmetic as the two above, so it is an independent second opinion on
 * `venueDayBoundsUtc` rather than a re-run of it.
 */
function dayBounds(d: LocalDate): { dayStartUtc: Date; dayEndUtc: Date; dateKey: string } {
  const dayStartUtc = new Date(Date.UTC(d.year, d.month - 1, d.day, -MANILA_OFFSET_HOURS, 0, 0));
  return {
    dayStartUtc,
    dayEndUtc: new Date(dayStartUtc.getTime() + 24 * HOUR_MS),
    dateKey: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`,
  };
}

// One date per case, so one case's committed heads can never pre-fill the cap another case needs.
const D_NOBLOCK = daysOut(30); // (1) the host cancel that must write NO block
const D_SHARED = daysOut(31); // (3) two pass-holders, one host cancel
const D_FREE = daysOut(32); // (4) booker cancel → the heads are re-sellable
const D_LADDER = daysOut(33); // (5) the refund ladder against the opening instant

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the client. */
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    payload: { href: string; whenLabel?: string; refundLabel?: string; side?: string };
  };
};
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/** The limiter is stubbed: this file cancels far more than the real 5-per-60s budget allows as the same
 *  host, and every case past the fifth would otherwise assert against a rate-limit denial wearing a
 *  result's name. (tests/payments/host-cancel.test.ts owns the assertions about the budget itself.) */
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
let testAuth: TestAuth;

type CancelActions = typeof import("@/app/actions/cancel-booking");
let cancelBookingAsHost: CancelActions["cancelBookingAsHost"];
let cancelBookingAsBooker: CancelActions["cancelBookingAsBooker"];

let hostId: string;
let bookerId: string;
let otherBookerId: string;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/**
 * A CONFIRMED drop-in booking: the row shape `createOpenCapacityHold` writes (unit 1 sentinel,
 * open_capacity true, declared_pax always set, starts/ends = the venue's opening/closing instants), with the
 * money frozen the way the claim freezes it (linear per-head + the D-74 service fee).
 */
async function seedDropIn(
  id: string,
  day: LocalDate,
  heads: number,
  owner: string,
): Promise<{ spacePriceCents: number; quotedTotalCents: number; startsAt: Date }> {
  const spacePriceCents = PER_HEAD_CENTS * heads;
  const fee = computeServiceFee(spacePriceCents);
  const startsAt = openInstant(day);
  await testDb.db.insert(booking).values({
    id,
    listingId: L_DROPIN,
    unit: 1,
    bookerId: owner,
    startsAt,
    endsAt: closeInstant(day),
    status: "confirmed",
    bookingMode: "instant",
    openCapacity: true,
    fullDay: false,
    declaredPax: heads,
    cancellationPolicy: "standard",
    spacePriceCents,
    serviceFeeCents: fee.serviceFeeCents,
    quotedTotalCents: fee.allInCents,
    currency: "php",
    paymentId: `pay_${id}`,
    paymentMethod: "gcash",
    expiresAt: null,
  });
  return { spacePriceCents, quotedTotalCents: fee.allInCents, startsAt };
}

/** A CONFIRMED EXCLUSIVE booking on L_EXCL, `msToStart` from the DB clock — the case-2 control. */
async function seedExclusive(id: string, msToStart: number): Promise<{ startsAt: Date; endsAt: Date }> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + msToStart);
  const endsAt = new Date(startsAt.getTime() + HOUR_MS);
  await testDb.db.insert(booking).values({
    id,
    listingId: L_EXCL,
    unit: 1,
    bookerId,
    startsAt,
    endsAt,
    status: "confirmed",
    bookingMode: "instant",
    cancellationPolicy: "standard",
    spacePriceCents: HOURLY,
    serviceFeeCents: SERVICE_FEE_EXCL,
    quotedTotalCents: EXCL_TOTAL,
    currency: "php",
    paymentId: `pay_${id}`,
    paymentMethod: "gcash",
    expiresAt: null,
  });
  return { startsAt, endsAt };
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      refundCents: booking.refundCents,
      retainedSpaceCents: booking.retainedSpaceCents,
      spacePriceCents: booking.spacePriceCents,
      quotedTotalCents: booking.quotedTotalCents,
      declaredPax: booking.declaredPax,
      openCapacity: booking.openCapacity,
      cancelledBy: booking.cancelledBy,
      declineReason: booking.declineReason,
      startsAt: booking.startsAt,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

async function readBlocks(listingId: string) {
  return testDb.db
    .select()
    .from(availabilityBlock)
    .where(eq(availabilityBlock.listingId, listingId));
}

/** The DEBIT rows for a booking — kind-scoped, so a coexisting payout row can never stand in for one. */
async function readDebits(bookingId: string) {
  return testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(eq(hostPayoutLedger.bookingId, bookingId), eq(hostPayoutLedger.kind, "host_cancel_fee")),
    );
}

/** The read model's own answer for a drop-in date — the shape a booker's calendar renders from. */
async function readSpots(day: LocalDate): Promise<{ remaining: number; cap: number; state: string }> {
  const availability = await getAvailability(testDb.db, L_DROPIN, day);
  expect(availability.occupancyMode).toBe("open_capacity");
  expect(availability.openCapacity).not.toBeNull();
  return {
    remaining: availability.openCapacity!.remaining,
    cap: availability.openCapacity!.cap,
    state: availability.openCapacity!.state,
  };
}

type AuditEntry = { action: string; outcome: string; meta?: Record<string, unknown> };
/** Only the shape this file reads — `vi.spyOn`'s own return type is generic and infers `any` args. */
type ConsoleSpy = { mock: { calls: unknown[][] } };

/**
 * The audit trail is a structured `console.info("[audit]", <json>)` line (src/lib/audit.ts) rather than a
 * table, so the fork's meta flag is asserted by capturing that channel. Returns the entries for one action.
 */
function auditEntriesFor(spy: ConsoleSpy, action: string): AuditEntry[] {
  return spy.mock.calls
    .filter((c: unknown[]) => c[0] === "[audit]")
    .map((c: unknown[]) => JSON.parse(String(c[1])) as AuditEntry)
    .filter((e: AuditEntry) => e.action === action);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "OCC Host",
    firstName: "Hana",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "OCC Booker",
    firstName: "Bea",
    intent: "book",
  });
  await signUp(testAuth, {
    email: OTHER_BOOKER_EMAIL,
    password: PASSWORD,
    name: "OCC Other Booker",
    firstName: "Ola",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((r) => r.email === HOST_EMAIL)!.id;
  bookerId = ids.find((r) => r.email === BOOKER_EMAIL)!.id;
  otherBookerId = ids.find((r) => r.email === OTHER_BOOKER_EMAIL)!.id;

  await testDb.db.insert(hostPayout).values({
    userId: hostId,
    paymongoAccountId: "wal_occ_1",
    activationStatus: "activated",
    payoutsEnabled: true,
    onboardingComplete: true,
  });

  await testDb.db.insert(listing).values([
    {
      id: L_DROPIN,
      hostId,
      title: "Drop-in floor",
      status: "published",
      occupancyMode: "open_capacity",
      bookingMode: "instant", // OC-10 — open capacity is instant-only
      cancellationPolicy: "standard", // the D-67 tier the seeded rows snapshot
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
      // ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE (the 09-07 lesson). A drop-in listing may legitimately
      // still carry hourly/day rates: 09-06 requires a per-head price but never CLEARS the exclusive
      // columns, and OC-17 lets a host switch an already-priced exclusive listing to drop-in. A fixture
      // with null rates would make "open listing ⇒ null rates" look true and let a fork that keyed off a
      // price rather than off `open_capacity` pass here.
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
    {
      id: L_EXCL,
      hostId,
      title: "Whole court",
      status: "published",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      unitCount: 1,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
  ]);

  // L_DROPIN is open EVERY weekday, so each case can own its own date without a "closed that day" surprise.
  // `loadOpenDayWindow` needs these rows: without them the read model returns the "Closed" empty state and
  // case 3 would assert against a null payload rather than against the counter.
  await testDb.db.insert(operatingHours).values(
    Array.from({ length: 7 }, (_, dow) => ({
      id: `oh_occ_${dow}`,
      listingId: L_DROPIN,
      dayOfWeek: dow,
      openTime: "06:00:00",
      closeTime: "22:00:00",
    })),
  );

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // The same surface tests/booking/cancellation.test.ts mocks. The D-72 QRPh exports the action also
  // imports (createRefundTransfer / listReceivingInstitutions / INSTAPAY_CEILING_CENTS) are deliberately
  // ABSENT: every fixture here pays by `gcash`, an API-refundable rail, so that branch is unreachable —
  // and leaving them undefined means a refactor that routed a drop-in refund down the QRPh seam would
  // crash loudly here rather than pass against a stub.
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({
    inngest: {
      send: inngestSend,
      createFunction: (opts: { id: string }) => ({ id: opts.id }),
    },
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ cancelBookingAsHost, cancelBookingAsBooker } = await import("@/app/actions/cancel-booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  mockPayMongo.createRefund.mockClear();
  mockPayMongo.createRefund.mockResolvedValue({ id: "ref_occ_1", status: "pending" });
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// OC-16 — the anti-resell auto-block is SKIPPED for a drop-in booking, and ONLY for a drop-in booking
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — OC-16: the D-70 auto-block fork", () => {
  it("(1) a host cancel on a DROP-IN booking writes NO availability_block, and everything else still fires", async () => {
    const seeded = await seedDropIn("bk_occ_noblock", D_NOBLOCK, 2, bookerId);

    const auditSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    let res: Awaited<ReturnType<CancelActions["cancelBookingAsHost"]>>;
    let entries: ReturnType<typeof auditEntriesFor>;
    try {
      await login(HOST_EMAIL);
      res = await cancelBookingAsHost("bk_occ_noblock", "maintenance");
      entries = auditEntriesFor(auditSpy, "host_cancel_booking");
    } finally {
      auditSpy.mockRestore();
    }

    // ── THE ASSERTION THIS FILE EXISTS FOR ────────────────────────────────────────────────────────────
    // The block's window would be [opening, closing) on the SENTINEL unit 1 that every open booking on
    // this date shares, so a single row here reads as "Fully booked" for every other pass-holder.
    expect(await readBlocks(L_DROPIN)).toHaveLength(0);

    // ── …and the three consequences that are NOT forked all still happened. ───────────────────────────
    expect(res).toEqual({ ok: true, refundCents: seeded.quotedTotalCents });
    const row = await readRow("bk_occ_noblock");
    expect(row.status).toBe("cancelled");
    expect(row.cancelledBy).toBe("host");
    expect(row.declineReason).toBe("maintenance");
    // D-70: the FULL charge comes back, service fee included — the one path where the platform absorbs it.
    expect(row.refundCents).toBe(seeded.quotedTotalCents);
    expect(row.refundCents).not.toBe(seeded.spacePriceCents);
    // retained = 0 is what makes the 07-04 sweep exclude this booking from payout.
    expect(row.retainedSpaceCents).toBe(0);
    // The money was genuinely dispatched, for the full amount — not merely recorded.
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: seeded.quotedTotalCents, paymentId: "pay_bk_occ_noblock" }),
    );
    // The D-71 host-cancel fee is UNCHANGED by the fork — a drop-in cancellation is just as billable
    // (09-RESEARCH assumption A5). ₱700 booking > ₱300 flat fee, so the cap does not bind.
    const [debit] = await readDebits("bk_occ_noblock");
    expect(debit.netCents).toBe(-HOST_CANCEL_FEE_CENTS);
    // Both sides are still told.
    expect(inngestSend.mock.calls.map((c) => c[0].data.recipientId).sort()).toEqual(
      [bookerId, hostId].sort(),
    );

    // ── And the trail SAYS why no block exists, so an operator never has to guess between "policy" and
    // "the insert failed" (threat T-09-32). The needs_attention `host_cancel_autoblock_failed` row is the
    // other answer to that question, and it must not have been written either.
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("ok");
    expect(entries[0].meta?.autoBlocked).toBe(false);
    expect(auditEntriesFor(auditSpy, "host_cancel_autoblock_failed")).toHaveLength(0);
  });

  it("(2) a host cancel on an EXCLUSIVE booking STILL writes the sentinel block (the D-70 regression guard)", async () => {
    // Without this case the fork could be widened to skip the block for everyone and case (1) would stay
    // green — the anti-resell mechanism would be gone and nothing would say so.
    const win = await seedExclusive("bk_occ_excl", 6 * HOUR_MS);

    const auditSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    let entries: ReturnType<typeof auditEntriesFor>;
    try {
      await login(HOST_EMAIL);
      const res = await cancelBookingAsHost("bk_occ_excl", "double_booked");
      expect(res).toEqual({ ok: true, refundCents: EXCL_TOTAL });
      entries = auditEntriesFor(auditSpy, "host_cancel_booking");
    } finally {
      auditSpy.mockRestore();
    }

    const blocks = await readBlocks(L_EXCL);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].reason).toBe(HOST_CANCEL_BLOCK_REASON);
    expect(blocks[0].unit).toBe(1);
    expect(blocks[0].startsAt.getTime()).toBe(win.startsAt.getTime());
    expect(blocks[0].endsAt.getTime()).toBe(win.endsAt.getTime());

    // The trail records the OTHER value of the same flag — the two cancels are distinguishable in the log.
    expect(entries).toHaveLength(1);
    expect(entries[0].meta?.autoBlocked).toBe(true);
  });

  it("(3) the date stays OPEN for every other pass-holder, and the freed head returns to the pool", async () => {
    // Pitfall 5 in the form a booker would experience it. Two independent bookers each hold one pass on the
    // same date (cap 4). The host cancels ONE of them.
    //
    // ⚠️ WHICH HALF OF THIS CASE ACTUALLY BITES — stated plainly, because a test whose headline assertion
    // cannot fail is worse than no test. 09-RESEARCH Pitfall 5 predicts that the block "zeroes the date in
    // the read model". Measured against the SHIPPED 09-04 open branch, it does not: `getOpenDay` projects
    // `cap − openTakenSql(...)` and never joins `availability_block` at all, so the spots-left half below
    // stays green even with the fork deleted (verified by executing that mutation). It is kept as the
    // CONTRACT statement and as a forward guard for any future consumer that does subtract blocks.
    //
    // The half that DOES go red under the mutation is the block-count assertion — and the damage it names is
    // real and durable rather than hypothetical: `removeBlock` REFUSES to delete a `host_cancellation` block
    // (blocks.ts SYSTEM_BLOCK_REASON, T-07-62), so every drop-in host cancel would leave a permanent,
    // host-undeletable whole-day row on the sentinel unit 1 — accreting one per cancelled pass, visible on
    // /host/listings/[id]/availability forever, and booker-facing the moment OC-17 lets the host switch the
    // listing back to exclusive, where the read model DOES subtract blocks. Assert both; believe the second.
    await seedDropIn("bk_occ_shared_a", D_SHARED, 1, bookerId);
    await seedDropIn("bk_occ_shared_b", D_SHARED, 1, otherBookerId);

    // The OC-11 threshold is anchored here rather than assumed, so a change to it fails on THIS line with
    // an obvious message instead of on the state literals below with a cryptic one.
    expect(lowStockThreshold(CAP)).toBe(2);

    const before = await readSpots(D_SHARED);
    expect(before.cap).toBe(CAP);
    expect(before.remaining).toBe(2); // 4 − (1 + 1) — the fixture is genuinely occupied
    expect(before.state).toBe("low"); // 2 remaining, threshold 2 — scarce, but still selling

    await login(HOST_EMAIL);
    const res = await cancelBookingAsHost("bk_occ_shared_a", "space_unavailable");
    expect(res.ok).toBe(true);

    const after = await readSpots(D_SHARED);
    // The CONTRACT half (see the note above): a host cancellation must never make a date read full for the
    // bookers who still hold passes on it.
    expect(after.state).not.toBe("full");
    // The date does not merely stay sellable — it visibly RELAXES, low → open, because the freed head
    // pushes `remaining` back above the scarcity threshold.
    expect(after.state).toBe("open");
    expect(after.remaining).toBe(3); // the cancelled head is back — 2 → 3, with no release code anywhere
    expect(after.cap).toBe(CAP);

    // The OTHER booker's pass is byte-for-byte untouched — a cancellation is not a date-wide event.
    const survivor = await readRow("bk_occ_shared_b");
    expect(survivor.status).toBe("confirmed");
    expect(survivor.refundCents).toBeNull();
    expect(survivor.cancelledBy).toBeNull();

    // THE ASSERTION THAT BITES: no whole-day sentinel row was left behind on this listing — so there is
    // nothing for `removeBlock` to refuse, nothing on the host's availability page, and nothing waiting to
    // close the date if the listing is ever switched back to exclusive.
    expect(await readBlocks(L_DROPIN)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// OC-15 — a booker cancel releases the heads, with no release code at all
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsBooker — OC-15: the seat release is a property of the SUM", () => {
  it("(4) cancelling a 2-head pass returns exactly 2 heads, and they are immediately re-claimable", async () => {
    await seedDropIn("bk_occ_free", D_FREE, 2, bookerId);

    const before = await readSpots(D_FREE);
    expect(before.remaining).toBe(2); // 4 − 2

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_occ_free");
    expect(res.ok).toBe(true);

    const after = await readSpots(D_FREE);
    expect(after.remaining).toBe(before.remaining + 2); // EXACTLY the cancelled heads, never more
    expect(after.remaining).toBe(CAP);

    // …and the heads are genuinely SELLABLE again, not merely counted differently: a fresh claim by a
    // DIFFERENT booker takes exactly them. This is what makes "no release code needed" a fact about the
    // counter rather than a fact about the read model.
    const claim = await createOpenCapacityHold(testDb.db, {
      listingId: L_DROPIN,
      bookerId: otherBookerId,
      dayOpenUtc: openInstant(D_FREE),
      dayCloseUtc: closeInstant(D_FREE),
      ...dayBounds(D_FREE),
      requestedHeads: 2,
    });
    expect("ok" in claim).toBe(true);
    if ("ok" in claim) {
      expect(claim.granted).toBe(2); // a partial grant here would mean the seats never came back
      expect(claim.requested).toBe(2);
    }
    expect((await readSpots(D_FREE)).remaining).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// OC-15 — the Phase-7 ladder is reused VERBATIM, anchored on the venue's opening instant (OC-03)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsBooker — OC-15: no drop-in-specific refund rule exists", () => {
  it("(5) a standard-tier pass cancelled well before opening refunds the full SPACE price, fee retained", async () => {
    const seeded = await seedDropIn("bk_occ_ladder", D_LADDER, 2, bookerId);

    // Prove the fixture genuinely sits above the ladder's top rung, against the DB clock the action uses —
    // otherwise this case could pass on an arithmetic coincidence rather than on the rung it names.
    const now = await readDbNow(testDb.db);
    const hoursToOpening = (seeded.startsAt.getTime() - now.getTime()) / HOUR_MS;
    expect(hoursToOpening).toBeGreaterThan(LADDER.standard[0].minHours);

    // The SECOND OPINION: the same pure quote an EXCLUSIVE booking with this `starts_at` would get. It is
    // computed from the shipped LADDER, so a rung edit moves the expectation with the code.
    const expected = quoteRefund({
      tier: "standard",
      spacePriceCents: seeded.spacePriceCents,
      serviceFeeCents: seeded.quotedTotalCents - seeded.spacePriceCents,
      startsAt: seeded.startsAt,
      now,
    });
    expect(expected.refundBps).toBe(10000);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_occ_ladder");

    expect(res).toEqual({ ok: true, refundCents: expected.totalRefundCents });
    // 100% of the SPACE price — and NOT the all-in total. D-74's non-refundable service fee applies to a
    // drop-in pass exactly as it does to an hourly booking; a drop-in-specific rule would show up here.
    expect(res.ok && res.refundCents).toBe(seeded.spacePriceCents);
    expect(res.ok && res.refundCents).not.toBe(seeded.quotedTotalCents);

    const row = await readRow("bk_occ_ladder");
    expect(row.status).toBe("cancelled");
    expect(row.cancelledBy).toBe("booker");
    expect(row.refundCents).toBe(seeded.spacePriceCents);
    expect(row.retainedSpaceCents).toBe(0); // a full refund retains nothing for the host
    expect(row.declaredPax).toBe(2); // the head count is NOT rewritten by a cancellation
    expect(row.openCapacity).toBe(true);

    expect(mockPayMongo.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: seeded.spacePriceCents }),
    );
    // A booker cancel is not a host cancel: no block, and no D-71 debit.
    expect(await readDebits("bk_occ_ladder")).toHaveLength(0);
    const [{ n }] = (await testDb.db.execute(
      sql`SELECT count(*)::int AS n FROM availability_block WHERE listing_id = ${L_DROPIN}`,
    )) as unknown as { n: number }[];
    expect(n).toBe(0);
  });
});
