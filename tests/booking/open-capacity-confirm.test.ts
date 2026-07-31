// CR-01 (09-REVIEW, orchestrator-verified) — a drop-in pass for TODAY can be HELD but could never be PAID
// FOR. `confirmBooking`'s D-94 checkout-initiation guard refused any booking whose `starts_at` had passed,
// and a drop-in pass's `starts_at` IS the venue's OPENING instant (OC-03). So from the moment a venue opened,
// every same-day pass hit `HoldExpiredState` seconds after its hold was minted — forever — while the claim
// (`day_open_ok = dayClose > now()`) and the read model (`bookable = dayCloseUtc > now`) both kept
// advertising the day as buyable. Each retry silently occupied a spot for the hold TTL.
//
// WHY THIS FILE HAS TO EXIST, AND WHY IT IS DB-BACKED. CR-01 survived 1035 passing tests, a green build,
// a 21/21 Playwright run and a 9/9 human walkthrough. Both proof layers were blind to the SAME path for
// different reasons: `e2e/open-capacity.spec.ts` books only `offset >= 3` days out (its month-alignment
// loop forces it), and the 09-16 walkthrough ran at 01:31 Makati — BEFORE the fixture listing's 06:00
// opening. Neither ever placed a booking in the window where the bug lives. A green suite is not coverage
// of a path no test drives, so this file drives the REAL `confirmBooking` against real Postgres with a real
// `createOpenCapacityHold`-minted row whose `starts_at` is genuinely in the past.
//
// ⚠️ THE FIXTURE IS DETERMINISTIC AT ANY HOUR OF THE DAY, and that is load-bearing. Two rules together:
//   - `openTime` = the venue-local wall clock TWO HOURS AGO, floored to the hour, never earlier than
//     00:00:00 — so the venue has ALREADY OPENED whenever this file runs (at venue-local 01:31, the hour
//     that hid the bug from nine human steps, it resolves to 00:00:00, still strictly in the past);
//   - `closeTime` = 23:59:00 — so the pass window is unconditionally still open at run time, and
//     `openDayWindow`'s `rollsPastMidnight` branch is never taken.
// Every date is CLOCK-RELATIVE; there is not one calendar literal in this file (the 09-03 lesson).
//
// THE THREE CASES:
//   1. a same-day pass bought AFTER the venue has opened reaches checkout      ← the headline, mutated below
//   2. an exclusive booking is still refused once its own session has started  ← D-94 regression guard,
//      so the fork can never be "fixed" by deleting the guard (T-09-51)
//   3. a drop-in pass for a day that has already closed is refused, IN PASS WORDS, never session words
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION, EXECUTED 2026-07-31 (09-17). A mutation that is described but never executed is a comment, not
// a proof. Reverted the fork in the PRODUCTION file src/app/actions/booking.ts — restored the single
// comparison `bk.startsAt.getTime() <= nowFromDb.getTime()` and the single exclusive sentence — then ran
// `npx vitest run tests/booking/open-capacity-confirm.test.ts`. Observed output, VERBATIM:
//
//    ❯ tests/booking/open-capacity-confirm.test.ts (3 tests | 2 failed) 2692ms
//        × (1) a same-day pass bought AFTER the venue has opened reaches checkout 53ms
//        × (3) a drop-in pass for a day that has already CLOSED is refused, in pass words 12ms
//
//    FAIL  tests/booking/open-capacity-confirm.test.ts > CR-01 — a drop-in pass for TODAY is payable for
//    the whole day it is valid for > (1) a same-day pass bought AFTER the venue has opened reaches checkout
//   AssertionError: expected 'This session has already started, so …' to be null
//
//   - Expected:
//   null
//
//   + Received:
//   "This session has already started, so it can't be paid for now. Check availability again."
//
//    ❯ tests/booking/open-capacity-confirm.test.ts:407:43
//       405|     // with the fork reverted it is the assertion that fails, and its …
//       406|     // booker would have read on the reserve page — not a generic "exp…
//       407|     expect(outcome.result?.error ?? null).toBeNull();
//          |                                           ^
//
//    FAIL  tests/booking/open-capacity-confirm.test.ts > CR-01 — a drop-in pass for TODAY is payable for
//    the whole day it is valid for > (3) a drop-in pass for a day that has already CLOSED is refused, in
//    pass words
//   AssertionError: expected { ok: false, reason: 'expired', …(1) } to deeply equal { ok: false, reason:
//   'expired', …(1) }
//
//   - Expected
//   + Received
//
//     {
//   -   "error": "This day's passes are no longer available. Check availability again.",
//   +   "error": "This session has already started, so it can't be paid for now. Check availability again.",
//       "ok": false,
//       "reason": "expired",
//     }
//
//    Test Files  1 failed (1)
//         Tests  2 failed | 1 passed (3)
//
// Case 2 stayed GREEN, as predicted — the exclusive path is unchanged by the mutation, which is exactly what
// makes it the guard against "fixing" CR-01 by deleting the cutoff.
//
// ⚠️ CASE 3 WENT RED TOO, and the 09-17 plan predicted it would stay GREEN ("a closed day fails either
// comparison"). Both are true, and the plan's reasoning was about the REFUSAL, which does indeed survive the
// mutation. Case 3 asserts the refusal AND its WORDING, so the mutation — which deletes the drop-in sentence
// along with the fork — moves it. This is a STRONGER result than the plan asked for: the pass-vs-session
// copy fork (NT-01) is itself mutation-covered rather than merely asserted. Recorded rather than weakened;
// deleting the wording assertion to match the prediction would have thrown away real coverage.
//
// The fork was restored and `git diff --exit-code src/` printed nothing before this file shipped.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Harness cloned from tests/booking/confirm-double-submit.test.ts: real Postgres via `setupTestDb`,
// `@/lib/paymongo` swapped for `mockPayMongo` so no live session is minted, a stubbed `rateLimit`, a mocked
// session identity, the RedirectError idiom, and read-the-row-back assertions.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking, operatingHours } from "@/lib/db/schema";
import { createOpenCapacityHold } from "@/lib/availability/units";
import type { ConfirmResult } from "@/app/actions/booking";
import type { RateLimitResult } from "@/lib/rate-limit";

// ── The SHIPPED copy, asserted as constants so a wording change is a deliberate act, not a silent one ──
/** The EXCLUSIVE sentence, preserved byte-for-byte by the fork (NT-01: after CR-01 it is reachable only by
 *  an exclusive booking, which is the only booking it was ever true of). */
const SESSION_STARTED =
  "This session has already started, so it can't be paid for now. Check availability again.";
/** The DROP-IN sentence the fork adds. A pass has no "session that started" — the DAY closed. */
const PASSES_GONE = "This day's passes are no longer available. Check availability again.";
/** The mock's constant hosted-checkout origin (tests/helpers/mocks.ts). */
const CHECKOUT_ORIGIN = "https://checkout.paymongo.test/";

const HOST = "occ_host";
const BOOKER = "occ_booker";

const L_OPEN_TODAY = "L_occ_open_today"; // drop-in, open since before now, closing at 23:59 local
const L_EXCL = "L_occ_excl"; // exclusive — the D-94 regression guard
const L_OPEN_CLOSED = "L_occ_open_closed"; // drop-in whose day has already closed

const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — so every instant below is plain UTC arithmetic
const HOUR_MS = 3_600_000;

const CAP = 3;
const PER_HEAD_CENTS = 35_000; // ₱350.00 per pass
const HOURLY = 50_000; // the exclusive fixture's ₱500/hr
const DAY_RATE = 300_000;

type LocalDate = { year: number; month: number; day: number };

/** The venue-local wall clock for an instant, as plain shifted-UTC fields. */
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

// ── The clock-relative fixture windows (see the ANY HOUR note in the header) ────────────────────────────
const NOW_LOCAL = venueLocal(new Date());
/** Two hours ago, floored to the hour, clamped at venue midnight — ALREADY OPEN at every hour of the day. */
const OPEN_HOUR = Math.max(0, NOW_LOCAL.hour - 2);
const TODAY_OPEN_UTC = venueInstant(NOW_LOCAL, OPEN_HOUR, 0);
const TODAY_CLOSE_UTC = venueInstant(NOW_LOCAL, 23, 59);

// The already-closed day for case 3. The plan's illustrative "00:00:00–00:01:00 TODAY" is the one shape
// that is NOT deterministic at any hour — a run between venue-local 00:00 and 00:01 would find that window
// still OPEN and the case would assert the wrong branch. YESTERDAY's full 00:00–23:59 window has closed at
// every instant of today, which is the property case 3 actually needs (deviation recorded in 09-17-SUMMARY).
const YESTERDAY_LOCAL = venueLocal(new Date(Date.now() - 24 * HOUR_MS));
const CLOSED_OPEN_UTC = venueInstant(YESTERDAY_LOCAL, 0, 0);
const CLOSED_CLOSE_UTC = venueInstant(YESTERDAY_LOCAL, 23, 59);

// --- Redirect capture (the confirm-double-submit.test.ts idiom) ------------------------------------------
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}

/**
 * Drive `confirmBooking` and capture EITHER outcome — the redirect it throws on success, or the result it
 * returns on refusal. Deliberately NOT a bare `expectRedirect`: that helper's throw message ("expected the
 * action to redirect") does not name the defect, and case 1's whole value is that its failure quotes the
 * sentence the booker would have read.
 */
type ConfirmOutcome = { redirectUrl: string | null; result: ConfirmResult | null };
async function runConfirm(holdId: string): Promise<ConfirmOutcome> {
  try {
    return { redirectUrl: null, result: await confirmBooking(holdId) };
  } catch (e) {
    if (e instanceof RedirectError) return { redirectUrl: e.url, result: null };
    throw e;
  }
}

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

/** The mocked session identity — set per test to drive the owner gate. */
const session: { userId: string | null } = { userId: null };

/** The limiter is stubbed so several seeded confirm calls don't exhaust the real module-level Map. */
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
type BookingActions = typeof import("@/app/actions/booking");
let confirmBooking: BookingActions["confirmBooking"];

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/**
 * A drop-in listing shaped exactly like one the 09-06 publish gate would accept.
 *
 * ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE: it also carries `hourlyRateCents` / `dayRateCents`. A drop-in
 * listing may legitimately still hold the exclusive rate columns (OC-17 lets a host switch an already-priced
 * listing to drop-in and nothing wipes them). Keeping them here is what makes the fork provable: it can only
 * pass by keying on the PERSISTED `open_capacity` column, never by inferring the mode from a null rate
 * (T-09-52 / .continue-here.md anti-pattern 2).
 */
function openListing(id: string) {
  return {
    id,
    hostId: HOST,
    title: `Drop-in floor ${id}`,
    status: "published" as const,
    occupancyMode: "open_capacity" as const,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const,
    maxOccupancy: CAP,
    unitCount: 1,
    perHeadPriceCents: PER_HEAD_CENTS,
    timezone: TIMEZONE,
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    currency: "php",
  };
}

/** The persisted truth — every assertion below reads THIS, not the action's return value alone. */
async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      openCapacity: booking.openCapacity,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      declaredPax: booking.declaredPax,
      checkoutSessionId: booking.checkoutSessionId,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/**
 * Insert a `pending` hold DIRECTLY, bypassing the claim. Both cases that need one are minting a row the
 * shipped claim would (correctly) refuse: an exclusive session already under way, and a drop-in day that has
 * closed — that refusal is `PAST_DATE_MESSAGE` and is already covered by open-capacity-hold.test.ts case 7.
 * What is under test here is the CHECKOUT step, so the row has to exist to reach it.
 */
async function seedHold(args: {
  listingId: string;
  startsAt: Date;
  endsAt: Date;
  openCapacity: boolean;
  declaredPax?: number | null;
}): Promise<string> {
  const id = uid("bk_occ");
  const fee = 2_000;
  await testDb.db.execute(sql`
    INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
                         open_capacity, full_day, declared_pax, expires_at,
                         space_price_cents, service_fee_cents, quoted_total_cents, currency)
    VALUES (${id}, ${args.listingId}, 1, ${BOOKER},
            ${args.startsAt.toISOString()}::timestamptz,
            ${args.endsAt.toISOString()}::timestamptz,
            'pending', 'instant',
            ${args.openCapacity}, false, ${args.declaredPax ?? null},
            now() + make_interval(mins => 15),
            ${PER_HEAD_CENTS}, ${fee}, ${PER_HEAD_CENTS + fee}, 'php')`);
  return id;
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "OCC Host", email: "occ_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "OCC Booker", email: "occ_booker@example.com", firstName: "Booker" },
  ]);

  await testDb.db.insert(listing).values([
    openListing(L_OPEN_TODAY),
    openListing(L_OPEN_CLOSED),
    {
      id: L_EXCL,
      hostId: HOST,
      title: "Whole court",
      status: "published" as const,
      occupancyMode: "exclusive" as const,
      bookingMode: "instant" as const,
      cancellationPolicy: "standard" as const,
      unitCount: 1,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      maxOccupancy: 8,
      currency: "php",
    },
  ]);

  // Operating hours are seeded for realism/consistency with the read model — `createOpenCapacityHold` takes
  // the window as an argument and `confirmBooking` never reads this table, but a drop-in listing without
  // hours is not a shape production can produce.
  await testDb.db.insert(operatingHours).values([
    {
      id: "oh_occ_today",
      listingId: L_OPEN_TODAY,
      dayOfWeek: NOW_LOCAL.dow,
      openTime: hhmmss(OPEN_HOUR),
      closeTime: "23:59:00",
    },
    {
      id: "oh_occ_closed",
      listingId: L_OPEN_CLOSED,
      dayOfWeek: YESTERDAY_LOCAL.dow,
      openTime: "00:00:00",
      closeTime: "23:59:00",
    },
  ]);

  // Fixture preconditions, as THROWS rather than expects: if the venue window were mis-computed, case 1
  // would pass vacuously (a future `starts_at` satisfies the OLD guard too) and prove nothing at all.
  const now = Date.now();
  if (!(TODAY_OPEN_UTC.getTime() < now)) {
    throw new Error(`fixture broken: the venue has not opened yet (${TODAY_OPEN_UTC.toISOString()})`);
  }
  if (!(TODAY_CLOSE_UTC.getTime() > now)) {
    throw new Error(`fixture broken: the pass window has already closed (${TODAY_CLOSE_UTC.toISOString()})`);
  }
  if (!(CLOSED_CLOSE_UTC.getTime() < now)) {
    throw new Error(`fixture broken: the "closed" day is still open (${CLOSED_CLOSE_UTC.toISOString()})`);
  }

  vi.doMock("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: async () => (session.userId ? { user: { id: session.userId } } : null),
      },
    },
  }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    expireCheckoutSession: mockPayMongo.expireCheckoutSession,
    createRefund: mockPayMongo.createRefund,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
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
  ({ confirmBooking } = await import("@/app/actions/booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

let infoSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  session.userId = BOOKER;
  // recordAudit's v1 sink is a structured console.info line (src/lib/audit.ts) — silenced, not asserted here.
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  infoSpy.mockRestore();
});

describe("CR-01 — a drop-in pass for TODAY is payable for the whole day it is valid for", () => {
  it("(1) a same-day pass bought AFTER the venue has opened reaches checkout", async () => {
    // Minted by the REAL claim, for TODAY's venue-local date, with the venue already open — so the row is
    // genuinely drop-in-shaped: open_capacity = true, unit = 1, declared_pax = 2, starts_at in the PAST
    // (the opening instant), ends_at in the FUTURE (closing), and a frozen price triple.
    const claim = await createOpenCapacityHold(testDb.db, {
      listingId: L_OPEN_TODAY,
      bookerId: BOOKER,
      dayOpenUtc: TODAY_OPEN_UTC,
      dayCloseUtc: TODAY_CLOSE_UTC,
      requestedHeads: 2,
    });
    if ("error" in claim) throw new Error(`the same-day claim was refused: ${claim.error}`);

    const outcome = await runConfirm(claim.id);

    // THE ASSERTION ORDER IS LOAD-BEARING (.continue-here.md anti-pattern 5). This one comes FIRST because
    // with the fork reverted it is the assertion that fails, and its message quotes the exact sentence a
    // booker would have read on the reserve page — not a generic "expected the action to redirect".
    expect(outcome.result?.error ?? null).toBeNull();

    // Then the money path actually opened: an off-site hosted checkout, not a swallowed refusal.
    expect(outcome.redirectUrl).toContain(CHECKOUT_ORIGIN);

    // Then the PERSISTED truth: the session was named on the row, and the booking is still `pending` —
    // payment, not this action, is the confirm authority (D-57).
    const row = await readRow(claim.id);
    expect(row.checkoutSessionId).not.toBeNull();
    expect(row.status).toBe("pending");

    // …and the row really was the drop-in shape, past its own `starts_at`. Without this the case could go
    // green against a booking that never entered the window where CR-01 lived.
    expect(row.openCapacity).toBe(true);
    expect(row.declaredPax).toBe(2);
    expect(row.startsAt.getTime()).toBeLessThan(Date.now());
    expect(row.endsAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("(2) an exclusive booking is still refused once its own session has started (D-94 regression guard)", async () => {
    // In progress RIGHT NOW: started an hour ago, ends in an hour. `ends_at` is deliberately in the FUTURE,
    // so a fork that widened the cutoff to `ends_at` for EVERY mode — the sloppy way to "fix" CR-01 — turns
    // this case RED instead of silently weakening D-94 on the exclusive path (T-09-51).
    const id = await seedHold({
      listingId: L_EXCL,
      startsAt: new Date(Date.now() - HOUR_MS),
      endsAt: new Date(Date.now() + HOUR_MS),
      openCapacity: false,
    });

    const outcome = await runConfirm(id);

    expect(outcome.redirectUrl).toBeNull();
    expect(outcome.result).toEqual({ ok: false, reason: "expired", error: SESSION_STARTED });

    // No session was minted for it — the refusal is real, not cosmetic.
    expect((await readRow(id)).checkoutSessionId).toBeNull();
  });

  it("(3) a drop-in pass for a day that has already CLOSED is refused, in pass words", async () => {
    const id = await seedHold({
      listingId: L_OPEN_CLOSED,
      startsAt: CLOSED_OPEN_UTC,
      endsAt: CLOSED_CLOSE_UTC,
      openCapacity: true,
      declaredPax: 1,
    });

    const outcome = await runConfirm(id);

    expect(outcome.redirectUrl).toBeNull();
    // The reason is unchanged (`ReserveView.handleResult`'s shipped branch is untouched); only the WORDS
    // fork. A pass has no session that "already started" — NT-01, the booking.ts half.
    expect(outcome.result).toEqual({ ok: false, reason: "expired", error: PASSES_GONE });
    expect(outcome.result?.error).not.toBe(SESSION_STARTED);

    expect((await readRow(id)).checkoutSessionId).toBeNull();
  });
});
