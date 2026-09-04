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
import { makeVerifiedHost } from "../helpers/seed";
import {
  user,
  listing,
  booking,
  availabilityBlock,
  hostPayoutLedger,
  operatingHours,
} from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { getAvailability } from "@/lib/availability/read-model";
import { createOpenCapacityHold } from "@/lib/availability/units";
import { lowStockThreshold } from "@/lib/availability/open-capacity";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { LADDER, quoteRefund } from "@/lib/payments/cancellation";
import { HOST_CANCEL_FEE_CENTS } from "@/lib/payments/fees";
import type { RateLimitResult } from "@/lib/rate-limit";

/** The sentinel `availability_block.reason` cancelBookingAsHost writes — asserted as a literal so a
 *  rename is a deliberate act. Mirrors the constant the action keeps private. */
const HOST_CANCEL_BLOCK_REASON = "host_cancellation";

// ── The SHIPPED refusals (NT-01), asserted as literals so a wording change is a deliberate act ──────────
/** The EXCLUSIVE sentence, preserved byte-for-byte by the WR-05 fork — it is true of an exclusive booking
 *  and only of one. Asserted verbatim by case (7). */
const PAST_START_MESSAGE =
  "This session has already started, so it can't be cancelled here. Message the host if something's wrong.";
/** The DROP-IN sentence the fork adds. A pass-holder never had a session that started; their DAY ended. */
const PASSES_ENDED_MESSAGE =
  "This day's passes have already ended, so they can't be cancelled here. Message the host if something's wrong.";

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
const L_TODAY = "L_occ_today"; // open_capacity, a day that OPENED EARLIER TODAY and closes at 23:59 (WR-05)
const L_ENDED = "L_occ_ended"; // open_capacity, a day whose pass window has ALREADY CLOSED

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

// ── WR-05 fixtures: the LIVE pass window and the CLOSED one (cases 6, 8, 9) ─────────────────────────────
// Both are clock-relative like everything else in this file, and both are DETERMINISTIC AT ANY HOUR — the
// 09-17 rule, restated because it is what makes case 6 provable rather than lucky.

/** The venue-local wall clock for an instant, as plain shifted-UTC fields (no DST in Asia/Manila). */
function venueLocal(at: Date): LocalDate & { hour: number; dow: number } {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_HOURS * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    dow: shifted.getUTCDay(),
  };
}
/** A venue-local wall clock (date + h:m) as the real UTC instant it names. */
function venueInstant(d: LocalDate, hour: number, minute = 0): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, minute, 0));
}
const hhmmss = (h: number, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

const NOW_LOCAL = venueLocal(new Date());
/** Two hours ago, floored to the hour, clamped at venue midnight — ALREADY OPEN at every hour of the day
 *  (at venue-local 01:31, the hour that hid CR-01 from nine human steps, it resolves to 00:00:00). */
const TODAY_OPEN_HOUR = Math.max(0, NOW_LOCAL.hour - 2);
const TODAY_OPEN_UTC = venueInstant(NOW_LOCAL, TODAY_OPEN_HOUR, 0);
/** 23:59 local — so the pass window is unconditionally still LIVE at run time. */
const TODAY_CLOSE_UTC = venueInstant(NOW_LOCAL, 23, 59);

// ⚠️ THE "FULLY ENDED DAY" IS YESTERDAY, NOT AN EARLIER WINDOW TODAY — a deliberate deviation from the
// plan's wording, for the reason 09-17 recorded when it hit the identical shape: a window that both opened
// and closed EARLIER TODAY does not exist at every hour (a run between venue-local 00:00 and 00:0N would
// find it still open, and the case would assert the wrong branch). Yesterday's full 00:00–23:59 window has
// closed at every instant of today, which is the property cases 8 and 9 actually need.
const YESTERDAY_LOCAL = venueLocal(new Date(Date.now() - 24 * HOUR_MS));
const ENDED_OPEN_UTC = venueInstant(YESTERDAY_LOCAL, 0, 0);
const ENDED_CLOSE_UTC = venueInstant(YESTERDAY_LOCAL, 23, 59);

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

/**
 * A CONFIRMED drop-in booking at EXPLICIT instants on an EXPLICIT listing — the WR-05 cases need windows the
 * 06:00–22:00 fixture above cannot express (one live right now, one already closed). Same row SHAPE as
 * `seedDropIn`; only the listing and the two instants are caller-supplied.
 */
async function seedDropInAt(args: {
  id: string;
  listingId: string;
  startsAt: Date;
  endsAt: Date;
  heads: number;
  owner: string;
}): Promise<{ spacePriceCents: number; quotedTotalCents: number }> {
  const spacePriceCents = PER_HEAD_CENTS * args.heads;
  const fee = computeServiceFee(spacePriceCents);
  await testDb.db.insert(booking).values({
    id: args.id,
    listingId: args.listingId,
    unit: 1,
    bookerId: args.owner,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    status: "confirmed",
    bookingMode: "instant",
    openCapacity: true,
    fullDay: false,
    declaredPax: args.heads,
    cancellationPolicy: "standard",
    spacePriceCents,
    serviceFeeCents: fee.serviceFeeCents,
    quotedTotalCents: fee.allInCents,
    currency: "php",
    paymentId: `pay_${args.id}`,
    paymentMethod: "gcash",
    expiresAt: null,
  });
  return { spacePriceCents, quotedTotalCents: fee.allInCents };
}

/**
 * Flip a claim-minted `pending` hold to `confirmed`, exactly as the PayMongo webhook does (D-57 — payment is
 * the sole confirm authority, so this is the only honest way to reach `confirmed` without a live rail). Used
 * by case 6, which needs a row minted by the REAL claim rather than hand-inserted.
 */
async function confirmClaimedRow(id: string): Promise<void> {
  await testDb.db.execute(sql`
    UPDATE booking
    SET status = 'confirmed', expires_at = NULL,
        payment_id = ${`pay_${id}`}, payment_method = 'gcash'
    WHERE id = ${id}`);
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
      // WR-05 — the other end of the pass window. Cases 6/8 read it back so "the window really was live /
      // really had closed" is a fact about the PERSISTED row, never about the fixture's own arithmetic.
      endsAt: booking.endsAt,
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
async function readSpots(
  day: LocalDate,
  listingId: string = L_DROPIN,
): Promise<{ remaining: number; cap: number; state: string }> {
  const availability = await getAvailability(testDb.db, listingId, day);
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

  // Payout wallet + the ops-APPROVED host_verification row (phase 18, D-224) — deriveBookable's sixth
  // term, without which every claim below would refuse `not-bookable`.
  await makeVerifiedHost(testDb.db, hostId, { insertUser: false, paymongoAccountId: "wal_occ_1" });

  await testDb.db.insert(listing).values([
    {
      id: L_DROPIN,
      hostId,
      title: "Drop-in floor",
      status: "published",
      reviewState: "approved",
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
      reviewState: "approved",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      unitCount: 1,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
    // The two WR-05 listings. Each owns its own dates so no case above can pre-fill its cap, and each keeps
    // the deliberately adversarial hourly/day rates for the reason spelled out on L_DROPIN.
    {
      id: L_TODAY,
      hostId,
      title: "Drop-in floor (today)",
      status: "published",
      reviewState: "approved",
      occupancyMode: "open_capacity",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
    {
      id: L_ENDED,
      hostId,
      title: "Drop-in floor (closed day)",
      status: "published",
      reviewState: "approved",
      occupancyMode: "open_capacity",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    },
  ]);

  // L_DROPIN is open EVERY weekday, so each case can own its own date without a "closed that day" surprise.
  // `loadOpenDayWindow` needs these rows: without them the read model returns the "Closed" empty state and
  // case 3 would assert against a null payload rather than against the counter.
  await testDb.db.insert(operatingHours).values([
    ...Array.from({ length: 7 }, (_, dow) => ({
      id: `oh_occ_${dow}`,
      listingId: L_DROPIN,
      dayOfWeek: dow,
      openTime: "06:00:00",
      closeTime: "22:00:00",
    })),
    // The LIVE window: opened earlier today, closes at 23:59. `createOpenCapacityHold` takes the window as
    // an argument, but `getAvailability` re-derives it from THIS row — so case 6's spots-left assertions
    // read the same day the claim wrote into.
    {
      id: "oh_occ_today",
      listingId: L_TODAY,
      dayOfWeek: NOW_LOCAL.dow,
      openTime: hhmmss(TODAY_OPEN_HOUR),
      closeTime: "23:59:00",
    },
    // The CLOSED window: yesterday, all day.
    {
      id: "oh_occ_ended",
      listingId: L_ENDED,
      dayOfWeek: YESTERDAY_LOCAL.dow,
      openTime: "00:00:00",
      closeTime: "23:59:00",
    },
  ]);

  // Fixture preconditions as THROWS rather than expects: if these windows were mis-computed, case 6 would
  // pass vacuously (a future `starts_at` satisfies the OLD guard too) and prove nothing whatsoever.
  const nowMs = Date.now();
  if (!(TODAY_OPEN_UTC.getTime() < nowMs)) {
    throw new Error(`fixture broken: the venue has not opened yet (${TODAY_OPEN_UTC.toISOString()})`);
  }
  if (!(TODAY_CLOSE_UTC.getTime() > nowMs)) {
    throw new Error(`fixture broken: the pass window already closed (${TODAY_CLOSE_UTC.toISOString()})`);
  }
  if (!(ENDED_CLOSE_UTC.getTime() < nowMs)) {
    throw new Error(`fixture broken: the "ended" day is still open (${ENDED_CLOSE_UTC.toISOString()})`);
  }

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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// WR-05 / NT-01 — the cancellation WINDOW is forked on the persisted mode, and so are the refusals
//
// THE DEFECT, stated as a booker experiences it: `cancelBookingAsBooker`'s flip was scoped
// `AND starts_at > now()`, and a drop-in pass's `starts_at` IS the venue's OPENING instant (OC-03). So from
// the moment a venue opened, the entire day a pass was valid for was a day on which it could be neither
// cancelled nor refunded — a purchase final the second it was made, with nothing on the reserve page saying
// so. 09-17 removed the mask (CR-01 meant a same-day pass could not be BOUGHT at all); these cases are the
// gate that keeps it closed.
//
// WHAT MAKES THESE CASES BITE RATHER THAN NARRATE (.continue-here.md, seam-blind test design): every one of
// them reads the BOOKING TABLE back. Case 6 asserts the PERSISTED status, the zero refund and the returned
// spot — never a returned sentence — because a fix that refused politely and left the row confirmed would
// satisfy any assertion made against the action's return value alone.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION, EXECUTED 2026-08-01 (09-25). A mutation that is described but never executed is a comment, not
// a proof. Reverted the fork in the PRODUCTION file src/app/actions/cancel-booking.ts — restored the bare
// `AND starts_at > now()` in cancelBookingAsBooker's flip, leaving everything else in place — then ran
// `npx vitest run tests/booking/open-capacity-cancel.test.ts`. Observed output, VERBATIM:
//
//    ❯ tests/booking/open-capacity-cancel.test.ts (9 tests | 1 failed) 3461ms
//        × (6) a drop-in pass can be cancelled while the venue is open 129ms
//
//    FAIL  tests/booking/open-capacity-cancel.test.ts > cancelBookingAsBooker — WR-05: a live drop-in pass
//    is still cancellable > (6) a drop-in pass can be cancelled while the venue is open
//   AssertionError: expected 'confirmed' to be 'cancelled' // Object.is equality
//
//   Expected: "cancelled"
//   Received: "confirmed"
//
//    ❯ tests/booking/open-capacity-cancel.test.ts:891:24
//       889|     // spot, which names the defect exactly. A `res.ok` assertion woul…
//       890|     const row = await readRow(claim.id);
//       891|     expect(row.status).toBe("cancelled");
//          |                        ^
//       892|     expect(row.cancelledBy).toBe("booker");
//
//    Test Files  1 failed (1)
//         Tests  1 failed | 8 passed (9)
//
// That is the defect in one line: a pass the booker ASKED to cancel is still `confirmed`, still occupying a
// spot, and still unrefunded — with the action having returned no error the booker could act on.
//
// Cases 7, 8 and 9 stayed GREEN under the mutation, and each for a reason worth stating:
//   - (7) drives the EXCLUSIVE path, which the mutation restores to its shipped form — which is exactly what
//     makes it the guard against "fixing" WR-05 by widening the cutoff for everyone;
//   - (8) and (9) drive a day that has ALREADY CLOSED, so both cutoffs refuse it and only the WORDING is at
//     stake — and the mutation left the copy fork and the audit predicate intact.
//
// ⚠️ ONE UNPLANNED ARTIFACT, RECORDED RATHER THAN DISCARDED. Under the mutation the audit line printed
// `"reason":"not_active"` for case 6's refusal, because `explainNoRows` was still forked while the flip was
// not: the two halves disagreed about which instant closes the window, so the trail described a live pass as
// a booking that no longer existed. The halves are one change and must move together; a partial revert is
// observable in the audit trail before it is observable anywhere else.
//
// The fork was restored and `git diff --exit-code src/` printed nothing before this file shipped.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsBooker — WR-05: a live drop-in pass is still cancellable", () => {
  it("(6) a drop-in pass can be cancelled while the venue is open", async () => {
    // Minted by the REAL claim for TODAY, on a listing that opened earlier today — so the row is genuinely
    // drop-in-shaped (open_capacity, unit 1, declared_pax, the venue's own instants, a frozen price triple
    // and the D-67 tier snapshot) rather than an approximation of one. Confirmed the way payment confirms it.
    const claim = await createOpenCapacityHold(testDb.db, {
      listingId: L_TODAY,
      bookerId,
      dayOpenUtc: TODAY_OPEN_UTC,
      dayCloseUtc: TODAY_CLOSE_UTC,
      ...dayBounds(NOW_LOCAL),
      requestedHeads: 2,
    });
    if ("error" in claim) throw new Error(`the same-day claim was refused: ${claim.error}`);
    await confirmClaimedRow(claim.id);
    const spacePriceCents = claim.spacePriceCents ?? 0;
    expect(spacePriceCents).toBe(PER_HEAD_CENTS * 2);

    // The window really is LIVE, measured on the PERSISTED row: opened in the past, closing in the future.
    // Without this the case could go green against a pass that never entered the window where WR-05 lived.
    const seededRow = await readRow(claim.id);
    expect(seededRow.openCapacity).toBe(true);
    expect(seededRow.startsAt.getTime()).toBeLessThan(Date.now());
    expect(seededRow.endsAt.getTime()).toBeGreaterThan(Date.now());

    const before = await readSpots(NOW_LOCAL, L_TODAY);
    expect(before.remaining).toBe(CAP - 2); // the fixture is genuinely occupied

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker(claim.id);

    // ── THE ASSERTION ORDER IS LOAD-BEARING. The DATABASE comes first, because that is what the booker
    // actually gets: with the fork reverted this line fails with the pass still live and still occupying a
    // spot, which names the defect exactly. A `res.ok` assertion would only say "the action said no".
    const row = await readRow(claim.id);
    expect(row.status).toBe("cancelled");
    expect(row.cancelledBy).toBe("booker");

    // The money is EXACTLY what the shipped ladder already awards past every rung: nothing back, the full
    // space price retained for the host. No refund rule was added, moved or invented by this fork — the 0%
    // rung is the existing behaviour of a negative `hoursToStart`.
    expect(row.refundCents).toBe(0);
    expect(row.retainedSpaceCents).toBe(spacePriceCents);
    expect(row.retainedSpaceCents).toBe(row.spacePriceCents);
    expect(res).toEqual({ ok: true, refundCents: 0 });
    // …and nothing was dispatched to PayMongo: a ₱0 refund is not a money event.
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();

    // THE POINT OF ALLOWING IT AT ALL: the spot goes back into the pool, so a booker who cannot come frees a
    // head that would otherwise be a paid no-show. No release code exists — `remaining` is a live SUM.
    const after = await readSpots(NOW_LOCAL, L_TODAY);
    expect(after.remaining).toBe(before.remaining + 2); // EXACTLY the cancelled heads, never more
    expect(after.remaining).toBe(CAP);

    // A booker cancel is not a host cancel: no anti-resell block anywhere on this listing.
    expect(await readBlocks(L_TODAY)).toHaveLength(0);
  });

  it("(7) an exclusive booking is still uncancellable once its session has started", async () => {
    // THE D-94 REGRESSION GUARD. `ends_at` is deliberately in the FUTURE (the session is in progress right
    // now), so the sloppy way to "fix" WR-05 — widening the cutoff to `ends_at` for EVERY mode — turns this
    // case RED instead of silently weakening D-94 on the exclusive path (T-09-51).
    await seedExclusive("bk_occ_started", -30 * 60 * 1000);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_occ_started");

    // The PERSISTED row first: the booking is untouched, not merely "the action returned an error".
    const row = await readRow("bk_occ_started");
    expect(row.status).toBe("confirmed");
    expect(row.refundCents).toBeNull();
    expect(row.cancelledBy).toBeNull();

    // …and the exclusive sentence is byte-identical to the shipped one. It is TRUE of this booking, which is
    // exactly why the fork adds a second constant instead of rewording this one.
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toBe(PAST_START_MESSAGE);
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });

  it("(8) a drop-in pass for a day that has fully ended cannot be cancelled, and says so in pass words", async () => {
    const seeded = await seedDropInAt({
      id: "bk_occ_ended",
      listingId: L_ENDED,
      startsAt: ENDED_OPEN_UTC,
      endsAt: ENDED_CLOSE_UTC,
      heads: 1,
      owner: bookerId,
    });

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_occ_ended");

    // Untouched — the window guard genuinely refused, it did not merely word a refusal differently.
    const row = await readRow("bk_occ_ended");
    expect(row.status).toBe("confirmed");
    expect(row.refundCents).toBeNull();
    expect(row.retainedSpaceCents).toBeNull();
    expect(row.endsAt.getTime()).toBeLessThan(Date.now());
    expect(row.spacePriceCents).toBe(seeded.spacePriceCents);

    // NT-01 — a pass-holder never had a session that started. The DAY's passes ended.
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toBe(PASSES_ENDED_MESSAGE);
    expect(res.ok === false && res.error).not.toBe(PAST_START_MESSAGE);
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });

  it("(9) the audit trail still records past_start for a drop-in past-window refusal", async () => {
    // T-09-92. The two denial sites used to compare against `PAST_START` BY IDENTITY; a second constant
    // makes that test silently false for every drop-in refusal, reclassifying it as `not_active` — which
    // would stop the trail distinguishing "the window had closed" from "the booking was already gone". This
    // case pins the predicate that replaced the identity comparison.
    await seedDropInAt({
      id: "bk_occ_ended_audit",
      listingId: L_ENDED,
      startsAt: ENDED_OPEN_UTC,
      endsAt: ENDED_CLOSE_UTC,
      heads: 1,
      owner: bookerId,
    });

    const auditSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    let entries: ReturnType<typeof auditEntriesFor>;
    let res: Awaited<ReturnType<CancelActions["cancelBookingAsBooker"]>>;
    try {
      await login(BOOKER_EMAIL);
      res = await cancelBookingAsBooker("bk_occ_ended_audit");
      entries = auditEntriesFor(auditSpy, "cancel_booking");
    } finally {
      auditSpy.mockRestore();
    }

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toBe(PASSES_ENDED_MESSAGE);

    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe("denied");
    expect(entries[0].meta?.reason).toBe("past_start");
    expect(entries[0].meta?.reason).not.toBe("not_active");
  });
});
