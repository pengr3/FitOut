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
// TASK 2 — FOUR MUTATIONS, ALL EXECUTED 1 August 2026, all restored (`git diff --exit-code src/` clean).
// The fix has TWO halves and they had to be mutated SEPARATELY, because either one alone is enough to keep
// case 2 green — which is a finding, not a formality (see MUTATION 2a).
//
//   MUTATION 1 — restore `status = 'confirmed'` to the TOKENLESS arm of findOwnOpenHold.
//     → case 1 RED, verbatim:
//
//        FAIL  … > 1 · a booker who already PAID for passes on a date can buy more for the same date (CR-06)
//       AssertionError: expected 2 to be 4 // Object.is equality
//
//       - Expected
//       + Received
//
//       - 4
//       + 2
//
//        Test Files  1 failed (1)
//             Tests  1 failed | 6 passed (7)
//
//       Cases 3-6 stayed GREEN under it, which is the point of the pair: the confirmed-pass match is the
//       ONLY thing that arm loses, and the D-42 double-submit replay is not collateral.
//
//   MUTATION 2a — delete `AND booker_id = …` from the KEY arm of findOwnOpenHold (the plan's prescribed
//     WR-01 mutation), leaving the booker-namespaced STORED key in place.
//     → ALL 7 GREEN. Recorded because it is the honest observed result and it is informative: the
//       predicate scope is defence in depth, not the load-bearing half. Alice's key is STORED as
//       `<len>:<alice id>:shared-token-alice` and Mallory looks up `<len>:<mallory id>:…`, so the two can
//       never name one row whatever the predicate says. A mutation that cannot go red is a gate that is
//       not measuring anything, so the assertion is measured by 2b and 2c below instead.
//
//   MUTATION 2b — revert `scopedIdempotencyKey` to the identity (the raw client key), keeping the
//     predicate scope. This is the shape the reviewer's literal fix would have shipped.
//     → cases 2 AND 7 RED with the driver's own error (full text in 09-23-SUMMARY.md — it quotes
//       parameter values that include calendar-shaped instants, which this file's tripwire forbids):
//
//       Caused by: PostgresError: duplicate key value violates unique constraint "booking_idem_uq"
//       Serialized Error: { … code: '23505',
//         detail: 'Key (idempotency_key)=(shared-token-alice) already exists.' … }
//
//       i.e. scoping the predicate WITHOUT namespacing the stored value trades WR-01's information
//       disclosure for a raw 500 on the money path (T-09-80 / the CR-04 class), on BOTH the open and the
//       exclusive claim. That is why the fix has two halves.
//
//   MUTATION 2c — BOTH halves reverted: the true pre-fix key arm.
//     → case 2 RED with exactly the Task-1 shape, verbatim:
//
//        FAIL  … > 2 · one caller's idempotency key can never return another caller's booking (WR-01)
//       AssertionError: expected '/listings/L_oc_replay/book?hold=40069…' not to contain '40069e9f-62ad-4c1c-9453-b6d9ae3d3858'
//
//       Expected: "40069e9f-62ad-4c1c-9453-b6d9ae3d3858"
//       Received: "/listings/L_oc_replay/book?hold=40069e9f-62ad-4c1c-9453-b6d9ae3d3858"
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, booking, operatingHours } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
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
const D_DOUBLE = daysOut(33); // case 3 — the tokened double-submit
const D_TOKENLESS = daysOut(34); // case 4 — the tokenless double-submit
const D_LAPSED = daysOut(35); // case 5 — a dead hold must not block its own owner
const D_LAPSED_KEY = daysOut(36); // case 6 — the design-decision case (no 23505 may escape)

// ── The EXCLUSIVE control (case 7). Windows are plain UTC instants: `createPendingHold` takes them
// directly and matches an own-hold on the exact pair, which is why CR-06 never reached that path. Four
// NON-overlapping windows, because a single-unit listing is arbitrated by booking_no_overlap. ──────────
const L_EXCL = "L_oc_replay_excl";
const HOURLY_CENTS = 50000;
function exclWindow(dayOffset: number, startHourUtc: number): { startsAt: Date; endsAt: Date } {
  const base = new Date(Date.now() + dayOffset * 24 * HOUR_MS);
  const startsAt = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), startHourUtc, 0, 0),
  );
  return { startsAt, endsAt: new Date(startsAt.getTime() + HOUR_MS) };
}

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

  // deriveBookable needs a host with a VERIFIED email, ACTIVATED payouts and an ops-APPROVED
  // host_verification row (phase 18, D-224), on an ops-APPROVED listing, or every case would refuse with
  // `not-bookable` and prove nothing about the replay predicate.
  await testDb.db.update(user).set({ emailVerified: true }).where(eq(user.id, hostId));
  await makeVerifiedHost(testDb.db, hostId, { insertUser: false });

  // Shaped exactly like a listing the 09-06 publish gate would accept.
  await testDb.db.insert(listing).values([
    {
      id: L_OPEN,
      hostId,
      title: "Drop-in replay floor",
      status: "published" as const,
      reviewState: "approved" as const,
      occupancyMode: "open_capacity" as const,
      bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
      cancellationPolicy: "standard" as const,
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
    },
    {
      // The EXCLUSIVE control (case 7). The pre-Phase-9 shape, spelled out rather than left to the column
      // default: this fixture's job is to prove the exclusive path changed in exactly ONE respect.
      id: L_EXCL,
      hostId,
      title: "Whole court",
      status: "published" as const,
      reviewState: "approved" as const,
      occupancyMode: "exclusive" as const,
      bookingMode: "instant" as const,
      cancellationPolicy: "standard" as const,
      unitCount: 1,
      hourlyRateCents: HOURLY_CENTS,
      timezone: TIMEZONE,
      city: "Makati",
    },
  ]);

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

  it("3 · a genuine double-submit carrying ONE token still replays into ONE booking (D-42)", async () => {
    // The guarantee CR-06's fix must not cost. Narrowing the tokenless arm to a live hold is only safe if
    // the double-click it used to absorb is still absorbed — here, by the token BookCta now mints per
    // selection, which is stable across repeated clicks on the same date and pass count.
    const KEY = "double-submit-token";
    await login(ALICE_EMAIL);
    const first = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_DOUBLE), requestedPasses: 2, idempotencyKey: KEY }),
    );
    const second = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_DOUBLE), requestedPasses: 2, idempotencyKey: KEY }),
    );

    expect(holdIdIn(second)).toBe(holdIdIn(first));
    // The seats were claimed ONCE. This is the assertion that would catch a "replay" that quietly minted a
    // second row — the id could still match while the counter had moved.
    expect(await headsFor(L_OPEN, aliceId, D_DOUBLE)).toBe(2);
    expect(await idsFor(L_OPEN, aliceId, D_DOUBLE)).toHaveLength(1);
  });

  it("4 · a double-submit with NO token still replays while the hold is live (D-42)", async () => {
    // The shipped tokenless protection, preserved: an old client (or a resume round-trip that lost the
    // token) must still not claim a second set of seats inside the TTL. The tokenless arm keeps matching a
    // LIVE `pending` hold — only `status = 'confirmed'` was dropped from it.
    await login(ALICE_EMAIL);
    const first = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_TOKENLESS), requestedPasses: 2 }),
    );
    const second = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_TOKENLESS), requestedPasses: 2 }),
    );

    expect(holdIdIn(second)).toBe(holdIdIn(first));
    expect(await headsFor(L_OPEN, aliceId, D_TOKENLESS)).toBe(2);
    expect(await idsFor(L_OPEN, aliceId, D_TOKENLESS)).toHaveLength(1);
  });

  it("5 · a LAPSED tokenless hold does not replay — a booker is never stuck behind their own dead hold", async () => {
    await login(ALICE_EMAIL);
    const first = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_LAPSED), requestedPasses: 2 }),
    );
    const firstId = holdIdIn(first);

    // Drive the hold past its TTL against the DB clock (never the JS one — the claim reads now() in SQL).
    await testDb.db.execute(sql`
      UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = ${firstId}`);

    const second = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_LAPSED), requestedPasses: 2 }),
    );
    const secondId = holdIdIn(second);
    expect(secondId).not.toBe(firstId);

    // The claim's in-tx sweep freed the dead hold's heads, so the booker holds 2 — not 4, and not 0.
    expect((await readRow(firstId)).status).toBe("cancelled");
    expect(await headsFor(L_OPEN, aliceId, D_LAPSED)).toBe(2);
    expect(await idsFor(L_OPEN, aliceId, D_LAPSED)).toHaveLength(2);
  });

  it("6 · a key naming a LAPSED or CANCELLED row replays — it never falls through into a 23505", async () => {
    // THE DESIGN-DECISION CASE. `booking_idem_uq` is a GLOBAL partial-unique index, so a key whose row
    // exists can never be re-inserted. If the key arm ever grew a status filter (the "obvious cleanup"),
    // the claim would sail past the pre-check, reach the INSERT and raise a 23505 — which mapBookingError
    // re-throws as a raw 500 on the money path. Every call below asserts through `expectRedirect`, so a
    // unique violation escaping the claim fails this case with the driver's own error rather than silently.
    const KEY = "lapsed-token";
    await login(ALICE_EMAIL);
    const first = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_LAPSED_KEY), requestedPasses: 1, idempotencyKey: KEY }),
    );
    const firstId = holdIdIn(first);

    // (a) the row is LAPSED but still `pending`.
    await testDb.db.execute(sql`
      UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = ${firstId}`);
    const afterLapse = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_LAPSED_KEY), requestedPasses: 1, idempotencyKey: KEY }),
    );
    expect(holdIdIn(afterLapse)).toBe(firstId);

    // (b) …and now the row is terminally CANCELLED, the furthest a status can get from "active". The
    // replay is HONEST rather than convenient: the reserve page renders HoldExpiredState for exactly this,
    // which is strictly better than a Next.js error digest on a booker's payment click.
    await testDb.db.execute(sql`
      UPDATE booking SET status = 'cancelled', expires_at = NULL WHERE id = ${firstId}`);
    const afterCancel = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_LAPSED_KEY), requestedPasses: 1, idempotencyKey: KEY }),
    );
    expect(holdIdIn(afterCancel)).toBe(firstId);

    // Three calls, ONE row: nothing was re-inserted behind the replay.
    expect(await idsFor(L_OPEN, aliceId, D_LAPSED_KEY)).toHaveLength(1);
  });

  it("7 · the EXCLUSIVE path changed in exactly one respect — its key arm is now booker-scoped", async () => {
    // (a) two DIFFERENT windows are still two DIFFERENT bookings. CR-06 never reached this path — an
    // exclusive own-hold is matched on the exact (starts_at, ends_at) pair — and this case exists so a
    // future edit cannot quietly generalise the open path's day-range narrowing onto it.
    const w1 = exclWindow(40, 10);
    const w2 = exclWindow(40, 12);
    const r1 = await createPendingHold(testDb.db, { listingId: L_EXCL, bookerId: aliceId, ...w1 });
    const r2 = await createPendingHold(testDb.db, { listingId: L_EXCL, bookerId: aliceId, ...w2 });
    expect("ok" in r1 && r1.ok).toBe(true);
    expect("ok" in r2 && r2.ok).toBe(true);
    if (!("id" in r1) || !("id" in r2)) throw new Error("both exclusive holds must succeed");
    expect(r2.id).not.toBe(r1.id);
    expect(r2.replayed).toBe(false);

    // (b) WR-01 on the exclusive twin: Mallory posting Alice's key gets HER OWN booking for HER OWN
    // window — never Alice's id, and never a unique violation on the global index either (the claim
    // returning `{error}` instead of throwing is not enough here; it must be a real hold).
    const KEY = "shared-token-exclusive";
    const w3 = exclWindow(41, 10);
    const w4 = exclWindow(41, 12);
    const alice = await createPendingHold(testDb.db, {
      listingId: L_EXCL,
      bookerId: aliceId,
      ...w3,
      idempotencyKey: KEY,
    });
    const mallory = await createPendingHold(testDb.db, {
      listingId: L_EXCL,
      bookerId: malloryId,
      ...w4,
      idempotencyKey: KEY,
    });
    if (!("id" in alice) || !("id" in mallory)) throw new Error("both exclusive holds must succeed");
    expect(mallory.id).not.toBe(alice.id);
    expect(mallory.replayed).toBe(false);
    expect((await readRow(mallory.id)).bookerId).toBe(malloryId);
    expect((await readRow(alice.id)).bookerId).toBe(aliceId);

    // …and Alice re-submitting her OWN key still replays onto her OWN booking (D-42 intact).
    const aliceAgain = await createPendingHold(testDb.db, {
      listingId: L_EXCL,
      bookerId: aliceId,
      ...w3,
      idempotencyKey: KEY,
    });
    if (!("id" in aliceAgain)) throw new Error("the exclusive replay must succeed");
    expect(aliceAgain.id).toBe(alice.id);
    expect(aliceAgain.replayed).toBe(true);
  });
});
