// CR-06 + WR-01 — the drop-in REPLAY PREDICATE (`findOwnOpenHold`), driven END TO END through the REAL
// `placeOpenHold` server action against a real Postgres (the open-capacity-hold.test.ts harness).
//
// WHAT THIS FILE IS REALLY GUARDING — the D-42 idempotency machinery at the DROP-IN seam. On the exclusive
// path a booker's "own active hold" is matched on the exact `(starts_at, ends_at)` window, so booking a
// different slot is a different booking. On the OPEN path a DATE **is** the window: there is exactly one
// `(starts_at, ends_at)` pair per date, so every predicate that keys on it collapses every purchase a
// booker ever makes for that date into the first one. Two defects live in that single `WHERE` clause:
//
//   CR-06 — the own-hold arm accepted `status = 'confirmed'`. A booker who bought and PAID for 2 passes on
//           Saturday and came back for 2 more was replayed onto the booking they already had: no new hold,
//           no new row, no message of any kind, and the reserve page's `status === 'confirmed'` short-circuit
//           bounced them to `/bookings/{old id}`. The app's own copy for exactly this situation is
//           `PASSES_FIXED_MESSAGE = "To add more passes, book them separately."` — following that instruction
//           is what triggered the silent no-op. OC-18 says there is deliberately NO per-booker head cap, so
//           this was idempotency machinery enforcing a policy nobody chose. Revenue lost, attendance
//           under-counted.
//   WR-01 — the KEY arm was `idempotency_key = ${key}` with no `booker_id`. `openHoldSchema` accepts a
//           client-supplied key up to 200 chars and `booking_idem_uq` is a GLOBAL partial-unique index, so
//           keys were not namespaced per user. Mallory posting Alice's key got `{ ok: true, replayed: true }`
//           carrying ALICE's booking id and a redirect to it — an existence oracle — while her own purchase
//           was silently swallowed. `findOwnActiveHold` (the exclusive twin) had the identical shape.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 lesson, restated by 09-18).
// The shipped claim refuses a date whose pass window has closed and one beyond the 90-day horizon, so a
// hardcoded date would quietly turn every case below into a PAST_DATE refusal the moment the calendar
// passed it — and every happy path would then go green by vacuum.
//
// ⚠️ THE HEAD-SUM HELPER IS DELIBERATELY RE-TYPED rather than importing `openTakenSql` (the 09-18 rule): a
// helper written in the bug's own dialect reproduces the bug it is measuring. `headsFor` reads the
// VENUE-LOCAL DAY RANGE with plain +08 arithmetic — an independent second opinion, never a re-run of the
// TZDate math under test.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TASK 1 — THE INDEPENDENT CONFIRMATION (this plan is CONFIRM-THEN-FIX). Both cases below were written and
// run FIRST, on 1 August 2026, against UNCHANGED `src/` (`git status --short -- src/` empty).
//
//   CR-06 → BRANCH A, REPRODUCED.   WR-01 → BRANCH A, REPRODUCED.
//
// `npx vitest run tests/booking/open-capacity-replay.test.ts` → exit 1. Observed, VERBATIM:
//
//    ❯ tests/booking/open-capacity-replay.test.ts (2 tests | 2 failed) 3158ms
//        × 1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06) 187ms
//        × 2 · one caller's idempotency key can never return another caller's booking (WR-01) 218ms
//
//    FAIL  … > 1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06)
//   AssertionError: expected 2 to be 4 // Object.is equality
//
//   - Expected
//   + Received
//
//   - 4
//   + 2
//
//    ❯ tests/booking/open-capacity-replay.test.ts:310:58
//       308|     // booker asked for two more passes, was redirected to the booking…
//       309|     // counter never saw them.
//       310|     expect(await headsFor(L_OPEN, aliceId, D_CONFIRMED)).toBe(4);
//          |                                                          ^
//
//    FAIL  … > 2 · one caller's idempotency key can never return another caller's booking (WR-01)
//   AssertionError: expected '/listings/L_oc_replay/book?hold=590ce…' not to contain '590ce17f-74ac-43e0-999f-a466090a19c7'
//
//   Expected: "590ce17f-74ac-43e0-999f-a466090a19c7"
//   Received: "/listings/L_oc_replay/book?hold=590ce17f-74ac-43e0-999f-a466090a19c7"
//
//    ❯ tests/booking/open-capacity-replay.test.ts:357:28
//
//    Test Files  1 failed (1)
//         Tests  2 failed (2)
//
// `expected 2 to be 4` — a booker who paid for two passes and came back for two more, and the venue is
// admitting TWO of them. And Mallory's redirect literally spelling Alice's booking id. The runner's two
// Better Auth "missing clientId" stderr warnings and its ISO-timestamped log prefixes are the ONLY lines
// omitted, and only because this file's own acceptance tripwire forbids a calendar-shaped literal anywhere
// in it (the 09-03 clock-relative rule); nothing assertion-bearing was dropped. The full run, including
// those lines, is quoted in 09-23-SUMMARY.md. The `:310` / `:357` line numbers are the RUN's own — this
// header has since grown by the block you are reading, so they no longer point at those assertions.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking, hostPayout, operatingHours } from "@/lib/db/schema";
import type { RateLimitResult } from "@/lib/rate-limit";

const HOST_EMAIL = "replay_host@example.com";
const ALICE_EMAIL = "replay_alice@example.com";
const MALLORY_EMAIL = "replay_mallory@example.com";
const PASSWORD = "averylongpassword";

/** Comfortably above the 4 heads case 1 asserts, so nothing below can pass (or fail) for want of capacity. */
const CAP = 8;
const PER_HEAD_CENTS = 35000; // ₱350.00 per pass

const L_OPEN = "L_oc_replay";

// Asia/Manila is UTC+8 all year (no DST), so every instant below is plain UTC arithmetic — a genuinely
// INDEPENDENT second opinion on the venue-local day, never a re-run of the code under test.
const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8;
const OPEN_HOUR = 6; // 06:00 venue-local
const CLOSE_HOUR = 22; // 22:00 venue-local
const HOUR_MS = 3_600_000;

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

function toLocalDate(d: Date): LocalDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
/** A venue-local calendar date `n` days from now — clock-relative on purpose (see the header). */
function daysOut(n: number): LocalDate {
  return toLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
function ymd(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}
/** Venue-local MIDNIGHT as UTC: 00:00 +08 == 16:00Z the PREVIOUS day. Date.UTC normalises the rollover. */
function dayStartUtc(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, -MANILA_OFFSET_HOURS, 0, 0));
}
/** …and the next venue-local midnight — the half-open upper bound the counter uses. */
function dayEndUtc(d: LocalDate): Date {
  return new Date(dayStartUtc(d).getTime() + 24 * HOUR_MS);
}

// next/navigation.redirect throws by design, so a SUCCESSFUL placeOpenHold is observed as a thrown target.
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}
async function expectRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectError) return e.url;
    throw e;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}
function holdIdIn(url: string): string {
  return new URL(url, "http://t").searchParams.get("hold")!;
}

// The mocked next/headers reads this at CALL time, so login() can swap (or clear) the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
let testAuth: TestAuth;
type BookingActions = typeof import("@/app/actions/booking");
let placeOpenHold: BookingActions["placeOpenHold"];

let hostId: string;
let aliceId: string;
let malloryId: string;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/**
 * The ONE assertion that names the harm in CR-06: how many admissions this booker actually holds for this
 * listing on this VENUE-LOCAL DAY. Summed over `declared_pax` (the column the counter sums) across the
 * half-open day range, with the shipped occupying-status rule re-typed by hand. A booker who bought 2 and
 * came back for 2 more must total 4; the defect made it 2.
 */
async function headsFor(listingId: string, bookerId: string, day: LocalDate): Promise<number> {
  const [{ n }] = (await testDb.client`
    SELECT COALESCE(SUM(declared_pax), 0)::int AS n FROM booking
    WHERE listing_id = ${listingId}
      AND booker_id = ${bookerId}
      AND open_capacity = true
      AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
      AND starts_at >= ${dayStartUtc(day).toISOString()}::timestamptz
      AND starts_at < ${dayEndUtc(day).toISOString()}::timestamptz`) as unknown as { n: number }[];
  return n;
}

/** Every booking id this booker holds on one (listing, venue-local day), oldest first. */
async function idsFor(listingId: string, bookerId: string, day: LocalDate): Promise<string[]> {
  const rows = (await testDb.client`
    SELECT id FROM booking
    WHERE listing_id = ${listingId}
      AND booker_id = ${bookerId}
      AND starts_at >= ${dayStartUtc(day).toISOString()}::timestamptz
      AND starts_at < ${dayEndUtc(day).toISOString()}::timestamptz
    ORDER BY created_at ASC`) as unknown as { id: string }[];
  return rows.map((r) => r.id);
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      bookerId: booking.bookerId,
      status: booking.status,
      declaredPax: booking.declaredPax,
      openCapacity: booking.openCapacity,
      expiresAt: booking.expiresAt,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

// ── The fixture dates. One per case, so one case's committed heads can never pre-fill another's cap ──
const D_CONFIRMED = daysOut(30); // case 1 — CR-06
const D_KEY_ALICE = daysOut(31); // case 2 — WR-01, Alice's date
const D_KEY_MALLORY = daysOut(32); // case 2 — Mallory's date, DIFFERENT on purpose (see the case)

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "Replay Host",
    firstName: "RHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: ALICE_EMAIL,
    password: PASSWORD,
    name: "Replay Alice",
    firstName: "Alice",
    intent: "book",
  });
  await signUp(testAuth, {
    email: MALLORY_EMAIL,
    password: PASSWORD,
    name: "Replay Mallory",
    firstName: "Mallory",
    intent: "book",
  });
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  aliceId = ids.find((u) => u.email === ALICE_EMAIL)!.id;
  malloryId = ids.find((u) => u.email === MALLORY_EMAIL)!.id;

  // deriveBookable needs a VERIFIED host with ACTIVATED payouts, or every case would refuse with
  // `not-bookable` and prove nothing about the replay predicate.
  await testDb.db.update(user).set({ emailVerified: true }).where(eq(user.id, hostId));
  await testDb.db.insert(hostPayout).values({
    userId: hostId,
    payoutsEnabled: true,
    activationStatus: "activated",
    onboardingComplete: true,
  });

  // Shaped exactly like a listing the 09-06 publish gate would accept.
  await testDb.db.insert(listing).values({
    id: L_OPEN,
    hostId,
    title: "Drop-in replay floor",
    status: "published" as const,
    occupancyMode: "open_capacity" as const,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const,
    maxOccupancy: CAP,
    unitCount: 1,
    perHeadPriceCents: PER_HEAD_CENTS,
    timezone: TIMEZONE,
    city: "Makati",
  });

  // Open EVERY weekday, so each case can own its own clock-relative date.
  await testDb.db.insert(operatingHours).values(
    Array.from({ length: 7 }, (_, dow) => ({
      id: `oh_replay_${dow}`,
      listingId: L_OPEN,
      dayOfWeek: dow,
      openTime: `${String(OPEN_HOUR).padStart(2, "0")}:00:00`,
      closeTime: `${String(CLOSE_HOUR).padStart(2, "0")}:00:00`,
    })),
  );

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  // No case here reaches checkout, but the module graph must never be able to touch the network.
  vi.doMock("@/lib/paymongo", () => ({
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    expireCheckoutSession: mockPayMongo.expireCheckoutSession,
    createRefund: mockPayMongo.createRefund,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  }));
  vi.resetModules();
  ({ placeOpenHold } = await import("@/app/actions/booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

describe("findOwnOpenHold — the drop-in replay predicate (CR-06 / WR-01)", () => {
  it("1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06)", async () => {
    await login(ALICE_EMAIL);

    // The first purchase, through the REAL action, then paid for: `confirmBooking` flips the row to
    // `confirmed` and clears the hold expiry, so this is the shape a paid pass actually has on disk.
    const firstUrl = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_CONFIRMED), requestedPasses: 2 }),
    );
    const firstId = holdIdIn(firstUrl);
    await testDb.db.execute(sql`
      UPDATE booking SET status = 'confirmed', expires_at = NULL WHERE id = ${firstId}`);
    expect((await readRow(firstId)).status).toBe("confirmed"); // the precondition, not a vacuum

    // Two friends decide to come. Same booker, same date, two more passes — the journey
    // PASSES_FIXED_MESSAGE ("To add more passes, book them separately.") explicitly tells them to take.
    const secondUrl = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_CONFIRMED), requestedPasses: 2 }),
    );

    // THE DATABASE TRUTH FIRST, in the form that names the harm: the venue is admitting FOUR of this
    // booker's heads that day. Under the defect the second purchase is swallowed and this reads 2 — the
    // booker asked for two more passes, was redirected to the booking they already had, and the venue's
    // counter never saw them.
    expect(await headsFor(L_OPEN, aliceId, D_CONFIRMED)).toBe(4);

    // …and only then the mechanism: two DISTINCT rows, and the redirect naming the NEW one.
    const ids = await idsFor(L_OPEN, aliceId, D_CONFIRMED);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    const secondId = holdIdIn(secondUrl);
    expect(secondId).not.toBe(firstId);
    expect(ids).toContain(secondId);

    // The new row is a live pending hold for the heads that were asked for, and the paid one is untouched.
    const fresh = await readRow(secondId);
    expect(fresh.status).toBe("pending");
    expect(fresh.declaredPax).toBe(2);
    expect(fresh.openCapacity).toBe(true);
    expect((await readRow(firstId)).declaredPax).toBe(2);
  });

  it("2 · one caller's idempotency key can never return another caller's booking (WR-01)", async () => {
    // Alice's genuine purchase, carrying a client-supplied token.
    const SHARED_KEY = "shared-token-alice";
    await login(ALICE_EMAIL);
    const aliceUrl = await expectRedirect(
      placeOpenHold({
        listingId: L_OPEN,
        date: ymd(D_KEY_ALICE),
        requestedPasses: 1,
        idempotencyKey: SHARED_KEY,
      }),
    );
    const aliceBookingId = holdIdIn(aliceUrl);

    // Mallory posts the SAME key. A DIFFERENT date on purpose: it strips the own-window arm out of the
    // picture entirely, so the only predicate that can possibly match is the KEY arm — which is exactly
    // the clause WR-01 names.
    await login(MALLORY_EMAIL);
    const malloryUrl = await expectRedirect(
      placeOpenHold({
        listingId: L_OPEN,
        date: ymd(D_KEY_MALLORY),
        requestedPasses: 1,
        idempotencyKey: SHARED_KEY,
      }),
    );

    // FIRST: the disclosure itself. Under the defect this redirect carries ALICE's booking id — a
    // confirmed-existence oracle for a row Mallory has no relationship to.
    expect(malloryUrl).not.toContain(aliceBookingId);
    const malloryBookingId = holdIdIn(malloryUrl);
    expect(malloryBookingId).not.toBe(aliceBookingId);

    // …and Mallory's own purchase is a REAL purchase of her own, not a silently swallowed one.
    const mine = await readRow(malloryBookingId);
    expect(mine.bookerId).toBe(malloryId);
    expect(mine.status).toBe("pending");
    expect(mine.declaredPax).toBe(1);
    expect(await headsFor(L_OPEN, malloryId, D_KEY_MALLORY)).toBe(1);

    // Alice's row is untouched — no status change, no head change, still hers.
    const hers = await readRow(aliceBookingId);
    expect(hers.bookerId).toBe(aliceId);
    expect(hers.status).toBe("pending");
    expect(hers.declaredPax).toBe(1);
    expect(await headsFor(L_OPEN, aliceId, D_KEY_ALICE)).toBe(1);
  });
});
