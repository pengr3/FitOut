// OPEN-02 / OPEN-03 — `placeOpenHold`, the drop-in booking mutation, driven END TO END through the REAL
// server action against a real Postgres (the pax-reprice.test.ts vi.doMock harness).
//
// WHAT THIS FILE IS REALLY GUARDING — the CROSS-MODE hole (threat T-09-23). drizzle/0022 narrowed
// `booking_no_overlap` to `... AND open_capacity = false`, so an open-capacity date is arbitrated by the
// admissions counter and by NOTHING ELSE. If an exclusive-shaped payload could reach `createPendingHold`
// on a drop-in listing, the row it minted would be adjudicated by neither the EXCLUDE (which no longer
// sees open rows) nor the counter (that path never takes the advisory lock) — an unbounded overbook on the
// money path. So the mode refusals are asserted BOTH WAYS, and each one is proven by reading the booking
// table back and finding NO ROW — never by matching a sentence.
//
// The other four facts pinned here:
//   - the head count is GRANTED by the claim, not requested by the client: a partial fill persists the
//     granted number and carries `requested` forward as a display-only URL param (OC-07 / T-09-24);
//   - a race loss is a distinct `sold-out` reason carrying the single SOLD_OUT_MESSAGE literal (OC-13);
//   - the entry window and every money figure come from the LISTING (OC-03 / OC-08) — the action supplies
//     a date and a head request and nothing else;
//   - D-126: `updateDeclaredPax` refuses an open booking OUTRIGHT and writes nothing, while the exclusive
//     D-108 surcharge path it shares a function with is untouched.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 lesson). The shipped claim
// refuses a date whose pass window has already closed and one beyond the 90-day horizon, so a hardcoded
// date would quietly turn every case into a PAST_DATE refusal the moment the calendar passed it — and the
// happy paths would go green by vacuum. Case 7 is the deliberate inverse: a date genuinely in the past.
//
// Money discipline: every expectation is derived from `computeServiceFee` over the LISTING's own per-head
// price — never a hand-written total, so a fee-rate change moves the test with the code.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THREE MUTATIONS, ALL EXECUTED 2026-07-30 (09-07). A mutation that is described but never run is a
// comment; these are the observed failures, verbatim. Each targets ONE line-group in the PRODUCTION file
// src/app/actions/booking.ts, and each was restored (`git diff --exit-code` clean) before this file shipped.
//
//   MUTATION A — delete placeHold's `if (lr.occupancyMode === "open_capacity")` refusal
//     → case 4b RED: `RedirectError: NEXT_REDIRECT:/listings/L_oc_open/book?hold=00f896d3-…`
//       i.e. an exclusive-shaped payload MINTED a hold on a drop-in listing — a row the EXCLUDE no longer
//       sees and the admissions counter never counted.
//   MUTATION B — delete placeOpenHold's `if (lr.occupancyMode !== "open_capacity")` refusal
//     → case 4a RED: `RedirectError: NEXT_REDIRECT:/listings/L_oc_excl_mode/book?hold=932da718-…`
//       i.e. a date payload MINTED an `open_capacity = true` row on an EXCLUSIVE listing, which
//       drizzle/0022 excludes from booking_no_overlap — the court becomes sellable twice.
//   MUTATION C — delete updateDeclaredPax's `if (row.openCapacity)` refusal (D-126)
//     → case 8 RED: `AssertionError: expected 4 to be 2` — declared_pax raised to the listing cap on a
//       hold the claim granted 2 heads, with the price re-frozen to match. The overbook itself, named.
//
// ⚠️ BOTH "adversarial fixture" notes in the seed below are what make A and C measure the REAL failure
// rather than an incidental crash. Read them before simplifying the fixtures.
//
// THIS FILE OWNS `placeOpenHold`'s OWN REFUSAL ANCHORS (D-227), never `placeHold`'s:
//   `L_OPEN_NOHOURS`         — case (6b), the FOURTH term (v1.0 audit finding #4).
//   `L_OPEN_PENDING_REVIEW`  — case (6c), the FIFTH and SIXTH terms (phase 18, LVER-01 / D-224).
// The two mutations live in `src/`, not here: `placeOpenHold` is a deliberate RE-STATEMENT of
// `placeHold`'s gate rather than a call into a shared helper, so a defect in THIS copy is invisible to
// every anchor in tests/booking/state-machine.test.ts and to the SQL parity test. Neither anchor may
// ever be merged with its exclusive-path sibling, and neither identifier appears in the other's file.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONFIRM-THEN-FIX, BRANCH A (quick task 260810-sti, Task 1) — the OPEN-CAPACITY half of audit finding
// #4 (case 6b, fixture L_OPEN_NOHOURS). Written FIRST against byte-unchanged `src/` and it FAILED:
//
//   ❯ tests/booking/open-capacity-hold.test.ts (12 tests | 1 failed) 4680ms
//     × (6b) a published, payout-activated DROP-IN listing with NO operating hours is refused by placeOpenHold's OWN re-stated gate 140ms
//
//   AssertionError: expected { ok: false, reason: 'invalid', …(1) } to deeply equal { ok: false, …(2) }
//   - Expected
//   + Received
//     {
//   -   "error": "This space isn't accepting bookings right now.",
//   +   "error": "This space isn't open that day. Pick another date.",
//       "ok": false,
//   -   "reason": "not-bookable",
//   +   "reason": "invalid",
//     }
//    ❯ tests/booking/open-capacity-hold.test.ts:551:17
//
// ⚠️ REPORTED AS OBSERVED, NOT AS PREDICTED — AND THE DIFFERENCE IS THE INTERESTING PART. The plan
// predicted this case would MINT A HOLD, the way the exclusive twin did. It did not: `placeOpenHold`
// happened to be saved by a LATER gate. Step (7) derives the day's entry window from the listing's own
// operating hours and returns null when there are none, so the drop-in path already refused — three
// gates too late, with the wrong reason and with copy that lies. "Pick another date" is a dead end on a
// listing that has NO dates at all, and it is what every drop-in booker used to be told.
//
// THE FIXTURE IS NOT AT FAULT, and the received copy is what proves it. The plan's done-criterion says
// an `invalid` here means the fixture has the wrong occupancy mode — but a mode mismatch is refused at
// gate (6) with OPEN_ON_EXCLUSIVE ("This space is booked by the hour — pick a time to book."). What came
// back is gate (7)'s CLOSED_THAT_DAY, so gates 1-6 all PASSED: the fixture really is a published,
// verified, payout-activated `open_capacity` listing, and bookability (gate 5) really did let it
// through. The two `invalid` sources are distinguishable by their sentence, which is why this case
// asserts the exact error string rather than just the reason code.
//
// So the anchor is real and it measures the intended thing — the refusal must move from gate 7 to gate
// 5 — but the pre-fix hole on THIS path was a wrong-and-misleading refusal, not an unbounded mint.
// Recorded here rather than smoothed over.
//
// MUTATION M1, EXECUTED 2026-08-10 (260810-sti, Task 3) — src/lib/bookability.ts: DELETE
// `listing.hasOperatingHours &&` from the return. Restored by editing the term back.
//   → case (6b) RED:
//     AssertionError: expected { ok: false, reason: 'invalid', …(1) } to deeply equal { ok: false, …(2) }
//     - Expected
//     + Received
//       {
//     -   "error": "This space isn't accepting bookings right now.",
//     +   "error": "This space isn't open that day. Pick another date.",
//         "ok": false,
//     -   "reason": "not-bookable",
//     +   "reason": "invalid",
//       }
//      ❯ tests/booking/open-capacity-hold.test.ts:588:17
//
//   → THE FINDING CONDITION IS SATISFIED, and this is the whole reason case (6b) exists. One deletion
//     in bookability.ts reddened THIS case AND `L_nohours` in tests/booking/state-machine.test.ts. Had
//     this one stayed GREEN while the exclusive one went red, placeOpenHold's re-stated clause would
//     not have been wired to the shared predicate — a defect to fix, not a pass to accept. It is wired.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, booking, operatingHours } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { SOLD_OUT_MESSAGE, PAST_DATE_MESSAGE } from "@/lib/availability/open-capacity";
import type { RateLimitResult } from "@/lib/rate-limit";

// ── The SHIPPED copy, asserted as constants so a wording change is a deliberate act, not a silent one ──
const OPEN_ON_EXCLUSIVE = "This space is booked by the hour — pick a time to book.";
const EXCLUSIVE_ON_OPEN = "This space sells day passes — pick a day to book.";
const CLOSED_THAT_DAY = "This space isn't open that day. Pick another date.";
/** The gate-5 (bookability) refusal — the SAME sentence placeHold returns, by re-statement. */
const NOT_BOOKABLE = "This space isn't accepting bookings right now.";
const NEEDS_SIGN_IN = "Sign in to book this space.";
const NEEDS_BOOKING_ON = "Turn on booking to reserve this space.";
/** 09-UI-SPEC § 6 / D-126 — the one sentence a drop-in booker sees on the re-price path. */
const PASSES_FIXED = "To add more passes, book them separately.";

const HOST_EMAIL = "oc_host@example.com";
const BOOKER_EMAIL = "oc_booker@example.com";
const PASSWORD = "averylongpassword";

const RIVAL = "oc_rival"; // a plain-inserted occupant, never a session — only its rows matter
const CAP = 4;
const PER_HEAD_CENTS = 35000; // ₱350.00 per pass
const HOURLY = 50000; // the exclusive fixtures' ₱500/hr
const DAY_RATE = 300000;
const FEE_PER_HEAD = 1500; // D-108 extra-head fee on the exclusive surcharged listing
const EXCL_MAX_OCCUPANCY = 8;

const L_OPEN = "L_oc_open"; // the drop-in listing under test (hours every weekday)
const L_CLOSED = "L_oc_closed"; // a drop-in listing open on ONE weekday only
const L_OPEN_NOHOURS = "L_oc_open_nohours"; // drop-in, fully payable, ZERO hours (the 260810-sti anchor)
// Drop-in, fully payable, a full week of hours — and AWAITING OPS REVIEW. `placeOpenHold`'s OWN anchor
// for the fifth and sixth terms (phase 18, D-227): a SEPARATE fixture from the exclusive path's, which
// lives in tests/booking/state-machine.test.ts, because the two gates are separately-maintained
// re-statements and neither may be inferred from the other's greenness. The two anchor ids are
// deliberately disjoint and neither identifier appears in the other's file.
const L_OPEN_PENDING_REVIEW = "L_oc_open_pending_review";
const L_EXCL_MODE = "L_oc_excl_mode"; // exclusive; must stay row-free (the T-09-23 proof)
const L_EXCL_PAX = "L_oc_excl_pax"; // exclusive + per-head surcharge (the untouched D-108 path)

// Asia/Manila is UTC+8 all year (no DST), so every expected instant below is plain UTC arithmetic — a
// genuinely INDEPENDENT second opinion, never a re-run of the TZDate math under test.
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
/** The venue's OPENING instant on a venue-local date: 06:00 +08 == 22:00Z the PREVIOUS day. */
function openInstant(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, OPEN_HOUR - MANILA_OFFSET_HOURS, 0, 0));
}
/** The venue's CLOSING instant: 22:00 +08 == 14:00Z the SAME day. */
function closeInstant(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, CLOSE_HOUR - MANILA_OFFSET_HOURS, 0, 0));
}
/** Venue-local weekday. Noon UTC is 20:00 Manila on the SAME calendar date, so this needs no timezone
 *  library and cannot inherit a bug from the one the action uses. */
function dowOf(d: LocalDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12, 0, 0)).getUTCDay();
}

// One date per case, so one case's committed heads can never pre-fill the cap another case needs.
const D_HAPPY = daysOut(30);
const D_PARTIAL = daysOut(31);
const D_SOLDOUT = daysOut(32);
const D_MODE = daysOut(33);
const D_AUTH = daysOut(34);
const D_PAST = daysOut(-7); // genuinely past — same weekday as D_HAPPY, so hours exist and the CLAIM refuses
const D_CLOSED = daysOut(31); // a different weekday from L_CLOSED's single open day (+31d ⇒ +3 weekdays)
const D_NOHOURS = daysOut(35); // a perfectly ordinary future date — the LISTING is what is wrong, not the day
const D_PENDING_REVIEW = daysOut(36); // likewise ordinary: the listing is open that day and still refuses

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

// The mocked next/headers reads this at CALL time, so login() can swap (or clear) the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

// The limiter is stubbed so the updateDeclaredPax cases don't consume the real module-level budget.
// (pax-reprice.test.ts owns the assertions about the budget's KEY and NUMBERS — this file only needs it
// out of the way.)
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
let testAuth: TestAuth;
type BookingActions = typeof import("@/app/actions/booking");
let placeOpenHold: BookingActions["placeOpenHold"];
let placeHold: BookingActions["placeHold"];
let updateDeclaredPax: BookingActions["updateDeclaredPax"];

let hostId: string;
let bookerId: string;
/** The case-1 drop-in hold, re-used by the D-126 case below (the row the claim actually granted). */
let happyHoldId = "";
const HAPPY_PASSES = 2;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** Occupy `heads` on a date with a CONFIRMED drop-in row belonging to someone else. Raw SQL on purpose:
 *  the counter must be proven against rows in the shape production writes them. */
async function occupy(id: string, listingId: string, day: LocalDate, heads: number): Promise<void> {
  await testDb.db.execute(sql`
    INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status,
                         open_capacity, declared_pax, expires_at)
    VALUES (${id}, ${listingId}, 1, ${RIVAL},
            ${openInstant(day).toISOString()}::timestamptz,
            ${closeInstant(day).toISOString()}::timestamptz,
            'confirmed', true, ${heads}, NULL)`);
}

/** Every booking row on one listing — the "no row was written" probe the mode refusals rest on. */
async function rowsFor(listingId: string): Promise<number> {
  const [{ n }] = (await testDb.client`
    SELECT count(*)::int AS n FROM booking WHERE listing_id = ${listingId}`) as unknown as { n: number }[];
  return n;
}

/** Booking rows on one (listing, date) — scoped by the OC-03 opening instant, which IS the date. */
async function rowsOn(listingId: string, day: LocalDate): Promise<number> {
  const [{ n }] = (await testDb.client`
    SELECT count(*)::int AS n FROM booking
    WHERE listing_id = ${listingId} AND starts_at = ${openInstant(day).toISOString()}::timestamptz`) as unknown as {
    n: number;
  }[];
  return n;
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      unit: booking.unit,
      bookingMode: booking.bookingMode,
      openCapacity: booking.openCapacity,
      fullDay: booking.fullDay,
      declaredPax: booking.declaredPax,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
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

  // The HOST signs up with intent "host" → canHost, and canBook FALSE. That makes it the natural fixture
  // for the capability gate (case 5b) as well as the listings' owner.
  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "OC Host",
    firstName: "OCHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "OC Booker",
    firstName: "Cassie",
    intent: "book",
  });
  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  bookerId = ids.find((u) => u.email === BOOKER_EMAIL)!.id;

  // deriveBookable needs a VERIFIED host with ACTIVATED payouts and an ops-APPROVED host_verification row
  // (phase 18, D-224 — the SIXTH term), on an ops-APPROVED listing (the FIFTH), or every case below would
  // refuse with `not-bookable` and prove nothing about occupancy modes.
  await testDb.db.update(user).set({ emailVerified: true }).where(eq(user.id, hostId));
  await makeVerifiedHost(testDb.db, hostId, { insertUser: false });
  // A plain occupant row for the partial/sold-out fixtures. Never signs in.
  await testDb.db.insert(user).values({
    id: RIVAL,
    name: "OC Rival",
    email: "oc_rival@example.com",
    firstName: "Rival",
  });

  // Shaped exactly like a listing the 09-06 publish gate would accept: unitCount 1, a per-head price, an
  // explicit cancellation tier the claim snapshots (D-67), and a positive cap. `maxOccupancy` IS the cap
  // the claim reads INSIDE its transaction — a client number can only ever request LESS.
  const openListing = (id: string) => ({
    id,
    hostId,
    title: "Drop-in floor",
    status: "published" as const,
    // The FIFTH deriveBookable term (phase 18, D-224). `review_state` DEFAULTS to 'pending', so without
    // this every case here refuses `not-bookable` — which is what L_OPEN_PENDING_REVIEW proves on purpose.
    reviewState: "approved" as const,
    occupancyMode: "open_capacity" as const,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const,
    maxOccupancy: CAP,
    unitCount: 1,
    perHeadPriceCents: PER_HEAD_CENTS,
    timezone: TIMEZONE,
    city: "Makati",
    // ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE. A drop-in listing may legitimately still carry hourly/day
    // rates — OC-17 lets a host switch an already-priced exclusive listing to drop-in while no live booking
    // exists, and the old rate columns are not wiped. Leaving them here is what makes case 4b's mutation
    // proof real: with the mode refusal deleted, `createPendingHold` SUCCEEDS and mints an uncounted row on
    // this listing (measured), instead of crashing on a missing rate and passing for the wrong reason.
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    // Same reasoning for the D-108 surcharge columns, which case 8's mutation needs: with them present,
    // deleting the D-126 guard makes `updateDeclaredPax` RE-PRICE the drop-in hold and raise declared_pax
    // to the listing cap (measured) — a genuine overbook past the granted count plus a price change.
    // Without them it would merely report a silent `{ok:true}`, understating the threat.
    included: 1,
    extraHeadFee: FEE_PER_HEAD,
  });
  await testDb.db.insert(listing).values([
    openListing(L_OPEN),
    openListing(L_CLOSED),
    // Built by the SAME `openListing` factory as the two above, so it carries a real `maxOccupancy` and a
    // real `perHeadPriceCents` — the file's DELIBERATELY ADVERSARIAL idiom. A fixture with a NULL cap
    // would fail closed inside the claim and pass case (6b) for the wrong reason; this one would
    // genuinely mint a priced hold if the bookability gate were absent. Its ONLY defect is hours.
    openListing(L_OPEN_NOHOURS),
    // Built by the SAME `openListing` factory, so it is byte-identical to L_OPEN in every respect that
    // could refuse a sale — real cap, real per-head price, hours seeded below — and then flipped on the
    // one field under test. It would genuinely mint a priced drop-in hold if the fifth term were missing.
    { ...openListing(L_OPEN_PENDING_REVIEW), reviewState: "pending" as const },
    {
      id: L_EXCL_MODE,
      hostId,
      title: "Whole court",
      status: "published" as const,
      reviewState: "approved" as const,
      // The pre-Phase-9 shape, spelled out rather than left to the column default: this fixture's whole
      // job is to prove a date-shaped payload cannot mint a row on an hourly listing.
      occupancyMode: "exclusive" as const,
      bookingMode: "instant" as const,
      unitCount: 1,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      // ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE — the mirror of the note above. A host may switch a
      // drop-in listing BACK to exclusive (OC-17), leaving the cap and the per-head price behind. Without
      // them the claim would fail closed on a NULL cap and case 4a would pass for the wrong reason; with
      // them, deleting the refusal genuinely mints an `open_capacity = true` row on an EXCLUSIVE listing
      // (measured) — a row drizzle/0022 excludes from booking_no_overlap, so the court is sellable twice.
      maxOccupancy: CAP,
      perHeadPriceCents: PER_HEAD_CENTS,
    },
    {
      id: L_EXCL_PAX,
      hostId,
      title: "Whole studio",
      status: "published" as const,
      reviewState: "approved" as const,
      occupancyMode: "exclusive" as const,
      bookingMode: "instant" as const,
      unitCount: 1,
      timezone: TIMEZONE,
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      included: 1,
      extraHeadFee: FEE_PER_HEAD,
      maxOccupancy: EXCL_MAX_OCCUPANCY,
    },
  ]);

  // L_OPEN is open EVERY weekday (so each case can own its own date); L_CLOSED is open on exactly one.
  //
  // ⚠️ L_OPEN_NOHOURS IS DELIBERATELY ABSENT FROM THIS BLOCK AND MUST STAY ABSENT. Every other listing
  // here has hours because every other case needs the venue to be open; that one has none because zero
  // hours IS its fixture. Adding a row for it would silently turn case (6b) green for the wrong reason.
  await testDb.db.insert(operatingHours).values([
    ...Array.from({ length: 7 }, (_, dow) => ({
      id: `oh_open_${dow}`,
      listingId: L_OPEN,
      dayOfWeek: dow,
      openTime: "06:00:00",
      closeTime: "22:00:00",
    })),
    // L_OPEN_PENDING_REVIEW gets a FULL WEEK, deliberately: this fixture must fail on its review state
    // and on nothing else. Withhold hours and it would refuse for the FOURTH term's reason instead, and
    // the case would pass while proving nothing about ops review.
    ...Array.from({ length: 7 }, (_, dow) => ({
      id: `oh_pending_review_${dow}`,
      listingId: L_OPEN_PENDING_REVIEW,
      dayOfWeek: dow,
      openTime: "06:00:00",
      closeTime: "22:00:00",
    })),
    {
      id: "oh_closed_one",
      listingId: L_CLOSED,
      dayOfWeek: dowOf(D_HAPPY),
      openTime: "06:00:00",
      closeTime: "22:00:00",
    },
    {
      id: "oh_excl_mode",
      listingId: L_EXCL_MODE,
      dayOfWeek: dowOf(D_MODE),
      openTime: "06:00:00",
      closeTime: "22:00:00",
    },
  ]);

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
  ({ placeOpenHold, placeHold, updateDeclaredPax } = await import("@/app/actions/booking"));
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

describe("placeOpenHold — the drop-in booking mutation (OPEN-02 / OC-02 / OC-06)", () => {
  it("(1) mints ONE ordinary booking row for the picked date, priced per GRANTED head", async () => {
    await login(BOOKER_EMAIL);
    const url = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_HAPPY), requestedPasses: HAPPY_PASSES }),
    );

    // A full grant carries NO `requested` param — the reduction notice must not render when nothing was
    // reduced (09-UI-SPEC § 3).
    expect(url).toMatch(new RegExp(`^/listings/${L_OPEN}/book\\?hold=`));
    expect(url).not.toContain("requested=");
    happyHoldId = new URL(url, "http://t").searchParams.get("hold")!;

    // Exactly one row on that date, and it is an ORDINARY booking row with one extra flag.
    expect(await rowsOn(L_OPEN, D_HAPPY)).toBe(1);
    const row = await readRow(happyHoldId);
    expect(row.status).toBe("pending");
    expect(row.openCapacity).toBe(true); // D-123: arbitrated by the counter, not the EXCLUDE
    expect(row.declaredPax).toBe(HAPPY_PASSES);
    expect(row.unit).toBe(1); // the sentinel every open row on a date shares
    expect(row.bookingMode).toBe("instant"); // OC-10 creation-time snapshot
    expect(row.fullDay).toBe(false); // a pass is not a full-day RENTAL (09-08 when-label fork)

    // OC-03: the window is the VENUE's opening/closing instants for that date — derived server-side from
    // the listing's own operating hours, never from anything the client sent.
    expect(row.startsAt.toISOString()).toBe(openInstant(D_HAPPY).toISOString());
    expect(row.endsAt.toISOString()).toBe(closeInstant(D_HAPPY).toISOString());

    // OC-08: linear per-head, no duration term, and quoted == space + fee by construction.
    const fee = computeServiceFee(PER_HEAD_CENTS * HAPPY_PASSES);
    expect(row.spacePriceCents).toBe(PER_HEAD_CENTS * HAPPY_PASSES);
    expect(row.serviceFeeCents).toBe(fee.serviceFeeCents);
    expect(row.quotedTotalCents).toBe(fee.allInCents);
  });

  it("(2) grants only what is LEFT and carries the requested count forward for the OC-07 notice", async () => {
    await occupy("bk_oc_partial_fill", L_OPEN, D_PARTIAL, 3); // 3 of 4 heads already gone

    await login(BOOKER_EMAIL);
    const url = await expectRedirect(
      placeOpenHold({ listingId: L_OPEN, date: ymd(D_PARTIAL), requestedPasses: 3 }),
    );

    // The reduction is REPORTED, never silent: `requested` rides the URL so the reserve page can render
    // "you asked for 3, only 1 was left". It is display-only — the CHARGE is the frozen row below.
    expect(url).toContain("requested=3");
    const id = new URL(url, "http://t").searchParams.get("hold")!;
    const row = await readRow(id);
    expect(row.declaredPax).toBe(1);
    // The money followed the GRANT, not the request (T-09-24): 1 pass, never 3.
    expect(row.spacePriceCents).toBe(PER_HEAD_CENTS * 1);
    expect(row.quotedTotalCents).toBe(computeServiceFee(PER_HEAD_CENTS).allInCents);
    expect(await rowsOn(L_OPEN, D_PARTIAL)).toBe(2); // the occupant + this one
  });

  it("(3) refuses a FULL date with the OC-13 sold-out reason and writes nothing", async () => {
    await occupy("bk_oc_sold_out", L_OPEN, D_SOLDOUT, CAP); // every head taken

    await login(BOOKER_EMAIL);
    const res = await placeOpenHold({ listingId: L_OPEN, date: ymd(D_SOLDOUT), requestedPasses: 1 });

    // Its OWN reason, not `taken`: the CTA renders the drop-in copy and refreshes the calendar.
    expect(res).toEqual({ ok: false, reason: "sold-out", error: SOLD_OUT_MESSAGE });
    expect(await rowsOn(L_OPEN, D_SOLDOUT)).toBe(1); // only the occupant — no hold was minted
  });

  it("(4a) T-09-23: a DATE payload cannot mint a row on an EXCLUSIVE listing", async () => {
    const before = await rowsFor(L_EXCL_MODE);
    await login(BOOKER_EMAIL);
    const res = await placeOpenHold({ listingId: L_EXCL_MODE, date: ymd(D_MODE), requestedPasses: 2 });

    expect(res).toEqual({ ok: false, reason: "invalid", error: OPEN_ON_EXCLUSIVE });
    // THE ASSERTION THAT MATTERS: no row. A copy check alone would pass even if the refusal ran AFTER the
    // claim. Minting the venue's whole operating day as an exclusive booking would sell out a court for
    // the price of one drop-in pass.
    expect(await rowsFor(L_EXCL_MODE)).toBe(before);
    expect(await rowsFor(L_EXCL_MODE)).toBe(0);
  });

  it("(4b) T-09-23: an exclusive WINDOW payload cannot mint a row on a DROP-IN listing", async () => {
    const before = await rowsFor(L_OPEN);
    await login(BOOKER_EMAIL);
    const startUtc = openInstant(D_MODE).toISOString();
    const endUtc = new Date(openInstant(D_MODE).getTime() + HOUR_MS).toISOString();
    const res = await placeHold({ listingId: L_OPEN, startUtc, endUtc, fullDay: false });

    expect(res).toEqual({ ok: false, reason: "invalid", error: EXCLUSIVE_ON_OPEN });
    // THE LOAD-BEARING HALF. Such a row would be arbitrated by NOTHING: the EXCLUDE stopped seeing open
    // rows in drizzle/0022, and `createPendingHold` never takes the admissions lock. If this count ever
    // moves, the counter has been bypassed — do not "fix" the expectation.
    expect(await rowsFor(L_OPEN)).toBe(before);
    expect(await rowsOn(L_OPEN, D_MODE)).toBe(0);
  });

  it("(5a) an unauthenticated caller gets the calm sign-in result and writes nothing", async () => {
    sessionHeaders.cookie = ""; // no session at all
    const res = await placeOpenHold({ listingId: L_OPEN, date: ymd(D_AUTH), requestedPasses: 1 });

    expect(res).toEqual({ ok: false, reason: "sign-in", error: NEEDS_SIGN_IN });
    expect(await rowsOn(L_OPEN, D_AUTH)).toBe(0);
  });

  it("(5b) canBook is re-read from the USER ROW — a host-only account cannot book (T-04-BOOKCAP)", async () => {
    await login(HOST_EMAIL); // signed up with intent "host" ⇒ canHost true, canBook FALSE
    const res = await placeOpenHold({ listingId: L_OPEN, date: ymd(D_AUTH), requestedPasses: 1 });

    expect(res).toEqual({ ok: false, reason: "activate-booking", error: NEEDS_BOOKING_ON });
    expect(await rowsOn(L_OPEN, D_AUTH)).toBe(0);
  });

  it("(6) refuses a weekday the venue is CLOSED — there is no pass to sell (never a guessed window)", async () => {
    await login(BOOKER_EMAIL);
    const res = await placeOpenHold({ listingId: L_CLOSED, date: ymd(D_CLOSED), requestedPasses: 1 });

    expect(res).toEqual({ ok: false, reason: "invalid", error: CLOSED_THAT_DAY });
    expect(await rowsFor(L_CLOSED)).toBe(0);
  });

  it("(6b) a published, payout-activated DROP-IN listing with NO operating hours is refused by placeOpenHold's OWN re-stated gate", async () => {
    // T-STI-02, and it DUPLICATES state-machine.test.ts's L_nohours intent ON PURPOSE rather than
    // inheriting it. `placeOpenHold`'s bookability block is written "deliberately by RE-STATEMENT rather
    // than extraction" (booking.ts:351-354) — it is independently duplicated security code on the money
    // path. A typo, a wrong table alias, a wrong field name or a missing `=== true` coercion in that
    // duplicate would compile, pass tsc, pass the exclusive anchor and pass the whole suite while leaving
    // a real drop-in booking hole open. An untested duplicate of a security check is WORSE than no
    // duplicate, because it reads as covered. Mutation M1 is the measurement: one deletion in
    // bookability.ts must redden this case AND the exclusive one.
    //
    // WHICH GATE ANSWERS IS THE ASSERTION. placeOpenHold's docblock puts BOOKABILITY at step 5, ahead of
    // the occupancy-mode refusal (6) and the operating-hours WINDOW derivation (7). Both 6 and 7 return
    // `invalid`, so a `not-bookable` here is what proves the new term landed in gate 5. In particular
    // this must NOT come back as case (6)'s `CLOSED_THAT_DAY` — "pick another date" is a lie on a listing
    // that has no dates at all, and it is exactly what the booker used to be told.
    await login(BOOKER_EMAIL);
    const res = await placeOpenHold({ listingId: L_OPEN_NOHOURS, date: ymd(D_NOHOURS), requestedPasses: 1 });

    expect(res).toEqual({ ok: false, reason: "not-bookable", error: NOT_BOOKABLE });
    // THE ASSERTION THAT MATTERS, mirroring case 4a: no row. A copy check alone would pass even if the
    // refusal ran AFTER the claim had already granted and priced heads.
    expect(await rowsOn(L_OPEN_NOHOURS, D_NOHOURS)).toBe(0);
    expect(await rowsFor(L_OPEN_NOHOURS)).toBe(0);
  });

  it("(6c) refuses a drop-in listing AWAITING OPS REVIEW server-side, and mints NO row (L_OPEN_PENDING_REVIEW)", async () => {
    // `placeOpenHold`'s OWN anchor for the FIFTH and SIXTH terms (phase 18, LVER-01 / D-227), and it is
    // deliberately a SEPARATE fixture from the exclusive path's, which lives in its own file
    // (tests/booking/state-machine.test.ts) under its own id.
    //
    // WHY NOT SHARE ONE ANCHOR. The two gates are RE-STATEMENTS, not two calls into one helper
    // (booking.ts:351-354 says why), so they can drift apart in ways nothing else in the suite can see:
    // a wrong table alias, a wrong field name, or a missing `?? "unverified"` in THIS copy would compile,
    // pass `tsc`, pass the SQL twin's parity test, pass the exclusive path's anchor and pass the suite —
    // while leaving an unreviewed listing sellable by the drop-in pass. An untested duplicate of a
    // security check is worse than no duplicate, because it reads as covered.
    //
    // WHICH GATE ANSWERS IS THE ASSERTION, same as (6b): bookability is step 5, ahead of the
    // occupancy-mode refusal (6) and the window derivation (7), and both of those return `invalid`. A
    // `not-bookable` is therefore what proves the new term landed in gate 5 rather than the listing
    // being turned away later for some unrelated reason.
    await login(BOOKER_EMAIL);
    const res = await placeOpenHold({
      listingId: L_OPEN_PENDING_REVIEW,
      date: ymd(D_PENDING_REVIEW),
      requestedPasses: 1,
    });

    expect(res).toEqual({ ok: false, reason: "not-bookable", error: NOT_BOOKABLE });
    // THE ASSERTION THAT MATTERS: no row. A returned sentence alone would pass even if the refusal ran
    // AFTER the admissions claim had already granted and priced heads on an unreviewed listing.
    expect(await rowsOn(L_OPEN_PENDING_REVIEW, D_PENDING_REVIEW)).toBe(0);
    expect(await rowsFor(L_OPEN_PENDING_REVIEW)).toBe(0);
  });

  it("(7) refuses a PAST date server-side — the calendar is a courtesy, never the gate (Security V4)", async () => {
    await login(BOOKER_EMAIL);
    const res = await placeOpenHold({ listingId: L_OPEN, date: ymd(D_PAST), requestedPasses: 1 });

    // Not a race loss, so it is NOT `sold-out` — the claim's own DB-clock guard refused it.
    expect(res).toEqual({ ok: false, reason: "taken", error: PAST_DATE_MESSAGE });
    expect(await rowsOn(L_OPEN, D_PAST)).toBe(0);
  });
});

describe("updateDeclaredPax vs open capacity (D-126 / T-09-25)", () => {
  it("(8) REFUSES an open-capacity hold and leaves declared_pax exactly as the claim granted it", async () => {
    // The case-1 hold: HAPPY_PASSES heads, granted under the advisory lock against that date's live SUM.
    expect(happyHoldId).not.toBe("");
    const before = await readRow(happyHoldId);
    expect(before.openCapacity).toBe(true);

    await login(BOOKER_EMAIL);
    const res = await updateDeclaredPax(happyHoldId, CAP);
    const after = await readRow(happyHoldId);

    // DATABASE TRUTH FIRST (the 09-03/09-04 discipline): the refusal wrote NOTHING. Deleting the D-126
    // guard makes this read the listing CAP instead of the granted count — a head count raised past what
    // the claim granted, and a re-frozen price, both through one server action (T-09-25). Asserting it
    // ahead of the returned shape means the failure message names the overbook, not a copy mismatch.
    expect(after.declaredPax).toBe(HAPPY_PASSES);
    expect(after.spacePriceCents).toBe(before.spacePriceCents);
    expect(after.quotedTotalCents).toBe(before.quotedTotalCents);
    // …and the booker is told, calmly, what to do instead — never a silent `{ok:true}`.
    expect(res).toEqual({ ok: false, error: PASSES_FIXED });
  });

  it("(9) the EXCLUSIVE D-108 surcharge re-price still succeeds — the shared action was not broken", async () => {
    const startsAt = new Date(Date.now() + 3 * HOUR_MS);
    const endsAt = new Date(startsAt.getTime() + 2 * HOUR_MS);
    const hold = await createPendingHold(testDb.db, {
      listingId: L_EXCL_PAX,
      bookerId,
      startsAt,
      endsAt,
      fullDay: false,
      idempotencyKey: null,
      declaredPax: 1,
    });
    if ("error" in hold) throw new Error(`hold refused: ${hold.error}`);

    await login(BOOKER_EMAIL);
    expect(await updateDeclaredPax(hold.id, 4)).toEqual({ ok: true });

    const after = await readRow(hold.id);
    const space = HOURLY * 2 + (4 - 1) * FEE_PER_HEAD;
    expect(after.openCapacity).toBe(false); // an exclusive row, and the guard let it through
    expect(after.declaredPax).toBe(4);
    expect(after.spacePriceCents).toBe(space);
    expect(after.quotedTotalCents).toBe(computeServiceFee(space).allInCents);
  });
});
