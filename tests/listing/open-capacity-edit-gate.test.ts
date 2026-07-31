// CR-04 / WR-04 — a bad money input on the drop-in path must produce a CALM REFUSAL, never a raw 500.
//
// WHY THIS FILE EXISTS. `publishSchema`'s open branch requires a per-person price, a positive daily cap,
// instant booking and a single space. `saveListingStep` writes `occupancy_mode` and every other field
// straight to the LIVE row and never re-runs that gate for a `published` listing — the only edit-path
// re-gate that exists is the HG-01 surcharge-reachability check, added by 08-22 for exactly this class of
// bug and never extended to the fields Phase 9 added. The wizard makes the bypass the NORMAL path, not an
// edge case: its `STEPS` put `occupancy` before `pricing`, and `saveAndContinue` persists the whole form on
// every step. A host picking "Drop-in passes" and clicking Save and continue therefore leaves a published,
// bookable listing in `open_capacity` with no price per person — and the next booker's click reaches
// `quoteOpenCapacity({ perHeadPriceCents: null })`, which raises. `mapBookingError` maps only
// `NoUnitAvailableError` / 23P01 / 40P01 and re-raises everything else, so that exception escapes
// `placeOpenHold` as an unhandled server-action error: the T-03-500 outcome its own docblock promises
// cannot happen.
//
// THE SEAM, NAMED. Both halves of this file sit where a DATE-SHAPED drop-in booking meets machinery written
// for hours-and-minutes reservations: an edit gate that predates the mode, and a shape ceiling that claims
// to bound a money product it never touches. So the cases are deliberately written ACROSS the handoff —
// case 1 drives the host action and then reads the LISTING row back out of Postgres, and case 5 drives the
// booker action and then reads the BOOKING table back. A refusal that returns the right words and writes the
// row anyway is the failure this file is built to catch.
//
// ⚠️ DO NOT INFER THE MODE FROM A NULL RATE. A drop-in listing may legitimately still carry
// `hourly_rate_cents` / `day_rate_cents` — 09-06 requires a price per person but never CLEARS the exclusive
// columns, and OC-17 permits the switch — so several fixtures below deliberately keep those columns
// populated. A fork keyed off a null rate rather than off the PERSISTED `occupancy_mode` fails here.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 rule): the claim refuses a
// past date and one beyond the 90-day horizon, so a hardcoded date would quietly turn case 5's claim into a
// past-date refusal the moment the calendar passed it — green for the wrong reason, which is worse than red.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TASK-1 CONFIRMATION RUN — **BRANCH A: CR-04 REPRODUCES.** 1 August 2026, `npx vitest run
// tests/listing/open-capacity-edit-gate.test.ts` against UNCHANGED `src/` (`git status --short -- src/`
// empty, `git diff --exit-code src/` clean, HEAD = b735914). CR-04 arrived in `09-REVIEW.md` marked
// "reported, NOT independently verified"; this run is the independent verification — a failing test, not a
// re-reading of the reviewer's prose. Output VERBATIM:
//
//    ❯ tests/listing/open-capacity-edit-gate.test.ts (2 tests | 2 failed) 3044ms
//         × 1 · the wizard's own sparse autosave is refused, and the persisted row is untouched 132ms
//         × 5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking 140ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/listing/open-capacity-edit-gate.test.ts > CR-04 — a published listing may not enter
//    drop-in mode without what publish requires > 1 · the wizard's own sparse autosave is refused, and the
//    persisted row is untouched
//   AssertionError: expected true to be false // Object.is equality
//
//   - Expected
//   + Received
//
//   - false
//   + true
//
//    ❯ tests/listing/open-capacity-edit-gate.test.ts:308:20
//       306|     const res = await saveListingStep(L_PUB_EXCL, { occupancyMode: "op…
//       307|
//       308|     expect(res.ok).toBe(false);
//          |                    ^
//       309|     if (res.ok) return;
//       310|     expect(res.fieldErrors?.perHeadPriceCents).toContain(PER_HEAD_PRIC…
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯
//
//    FAIL  … > 5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking
//   Error: Listing has no per-head price for an open-capacity booking
//    ❯ quoteOpenCapacity src/lib/booking/pricing.ts:165:11
//       163| export function quoteOpenCapacity(input: OpenCapacityQuoteInput): Open…
//       164|   if (input.perHeadPriceCents == null) {
//       165|     throw new Error("Listing has no per-head price for an open-capacit…
//          |           ^
//       166|   }
//       167|   if (!Number.isInteger(input.heads) || input.heads < 1) {
//    ❯ src/lib/availability/units.ts:894:23
//    ❯ scope node_modules/postgres/src/index.js:260:18
//    ❯ sql.begin node_modules/postgres/src/index.js:243:14
//    ❯ createOpenCapacityHold src/lib/availability/units.ts:779:14
//    ❯ placeOpenHold src/app/actions/booking.ts:441:15
//    ❯ tests/listing/open-capacity-edit-gate.test.ts:336:17
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯
//
//    Test Files  1 failed (1)
//         Tests  2 failed (2)
//    Duration  5.07s
//
// (Two `[Better Auth]: Social provider google is missing clientId or clientSecret` stderr lines precede
// this block on EVERY DB-backed file in the suite — the harness's standing warning, not part of the
// finding. They are omitted here for one concrete reason: each carries a machine-printed ISO timestamp,
// which would put a calendar-literal-shaped string into a file whose own acceptance criterion forbids one.
// Nothing in the FAILURE output is elided. See 09-21-SUMMARY.md § Deviations.)
//
// READ THE TWO FAILURES AS ONE SENTENCE. `expected true to be false` — the host action ACCEPTED the switch:
// a published, bookable listing went to drop-in mode with no price per person, exactly as the reviewer
// described and by the wizard's own normal route. And then `Error: Listing has no per-head price for an
// open-capacity booking`, raised at `pricing.ts:165` and unwound all the way out through
// `createOpenCapacityHold` → `placeOpenHold` → the caller, WITHOUT being caught anywhere: that stack IS the
// finding. In production the caller is a booker's *Book this space* click, and the exception surfaces as a
// Next.js error digest on the money path. The two halves are the same defect at its two ends — the gate
// that let the row into the state, and the claim that had no answer once it was there.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TASK-2 MUTATION — EXECUTED, not merely described. The fail-closed rate refusal was deleted from
// `createOpenCapacityHold` (units.ts step 5), leaving the `saveListingStep` gate FULLY in place — i.e. the
// half of the fix that stops NEW rows entering the bad state, without the half that survives the rows
// already in it. Observed output, VERBATIM:
//
//    ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//
//     FAIL  … > 5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking
//    Error: Listing has no per-head price for an open-capacity booking
//     ❯ quoteOpenCapacity src/lib/booking/pricing.ts:165:11
//        163| export function quoteOpenCapacity(input: OpenCapacityQuoteInput): Open…
//        164|   if (input.perHeadPriceCents == null) {
//        165|     throw new Error("Listing has no per-head price for an open-capacit…
//           |           ^
//        166|   }
//        167|   if (!Number.isInteger(input.heads) || input.heads < 1) {
//     ❯ src/lib/availability/units.ts:920:23
//     ❯ scope node_modules/postgres/src/index.js:260:18
//     ❯ sql.begin node_modules/postgres/src/index.js:243:14
//     ❯ createOpenCapacityHold src/lib/availability/units.ts:779:14
//     ❯ placeOpenHold src/app/actions/booking.ts:441:15
//     ❯ tests/listing/open-capacity-edit-gate.test.ts:544:17
//
//    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
//
//     Test Files  1 failed (1)
//          Tests  1 failed | 4 passed (5)
//
// It reproduces the Task-1 confirming failure EXACTLY — same sentence, same raising site, same unwinding
// out through `placeOpenHold`. Note WHICH cases stayed green under it: 1, 2, 3 and 4 all pass, because the
// action-level gate was untouched. **An action-level fix alone therefore looks like four-fifths of a
// success**, and the only case that can tell you otherwise is the one whose fixture was written DIRECTLY to
// the table. That is the whole reason case 5 does not go through `saveListingStep`: a gate can only ever
// govern rows created after it, and the listing that mattered was already in the bad state when it shipped.
//
// Restored → 5/5 green → `git diff --exit-code src/lib/availability/units.ts` printed nothing.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TASK-3 MUTATION — also EXECUTED. WR-04 arrived as a WARNING about a comment, so the question worth
// answering was whether the mechanism it describes is real or merely arithmetically conceivable. The
// runtime product guard was deleted from `createOpenCapacityHold` (units.ts step 6→7 boundary), leaving the
// new host-input ceilings in place — i.e. the exact position a listing priced BEFORE those ceilings is in.
// Case 7 went RED. Observed, VERBATIM apart from the bound-parameter dump noted below:
//
//     FAIL  … > 7 · a legacy stadium row is refused calmly instead of raising a 22003, and mints NO booking
//    Error: Failed query: insert into "booking" (…) values (…) returning …
//     ❯ src/lib/availability/units.ts:940:26
//        938|         const id = randomUUID();
//        939|
//        940|         const inserted = await tx
//           |                          ^
//        941|           .insert(booking)
//        942|           .values({
//     ❯ createOpenCapacityHold src/lib/availability/units.ts:779:14
//     ❯ placeOpenHold src/app/actions/booking.ts:441:15
//     ❯ tests/listing/open-capacity-edit-gate.test.ts:711:17
//
//    Caused by: PostgresError: value "3150000000" is out of range for type integer
//    { severity: 'ERROR', code: '22003', routine: 'pg_strtoint32_safe' }
//
//     Test Files  1 failed (1)
//          Tests  1 failed | 6 passed (7)
//
// THE REVIEWER'S PREDICTION, OBSERVED. `space_price_cents` 3,000,000,000 and `quoted_total_cents`
// 3,150,000,000 — the all-in figure, fee included, is the parameter that actually blew up — and the 22003
// unwinds out through `createOpenCapacityHold` and `placeOpenHold` uncaught, because 22003 is neither 23P01
// nor 40P01 and `mapBookingError` re-raises everything else. So WR-04 is not only a comment that overstated
// a protection: the protection it described was genuinely absent, and its absence is reachable.
//
// (Elided from the block above: the `params:`/`parameters:` dumps postgres.js prints, which echo this
// file's own clock-relative fixture instants back as ISO strings — recording them would put
// calendar-literal-shaped text in a file whose acceptance criterion forbids it. The full untouched dump is
// in 09-21-SUMMARY.md, which carries no such constraint. Nothing describing the FAILURE is elided.)
//
// Restored → 7/7 green → `git diff --exit-code src/lib/availability/units.ts` against the restored form
// shows only this plan's two intended additions.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, hostPayout, operatingHours } from "@/lib/db/schema";
import {
  PER_HEAD_PRICE_REQUIRED_MESSAGE,
  DROP_IN_INSTANT_ONLY_MESSAGE,
  DROP_IN_SINGLE_SPACE_MESSAGE,
  DROP_IN_CAP_TOO_HIGH_MESSAGE,
  PER_HEAD_PRICE_TOO_HIGH_MESSAGE,
  MAX_OPEN_CAPACITY,
  MAX_PER_HEAD_PRICE_CENTS,
  draftSchema,
  publishSchema,
} from "@/lib/validation/listing";
import { MAX_MONEY_CENTS } from "@/lib/booking/pricing";
import type { RateLimitResult } from "@/lib/rate-limit";

let testDb: TestDb;
let testAuth: TestAuth;
type ListingActions = typeof import("@/app/actions/listing");
type BookingActions = typeof import("@/app/actions/booking");
let saveListingStep: ListingActions["saveListingStep"];
let placeOpenHold: BookingActions["placeOpenHold"];

const HOST_EMAIL = "ocedit_host@example.com";
const BOOKER_EMAIL = "ocedit_booker@example.com";
const PASSWORD = "averylongpassword";

let HOST_ID = "";

// One listing per concern, so one case's persisted state can never decide another case's expectation.
const L_PUB_EXCL = "l_ocedit_pub_excl"; // case 1 — the wizard's own bypass, on a published listing
const L_PUB_OK = "l_ocedit_pub_ok"; // case 2 — the SAME switch, done properly, must still go through
const L_PUB_REQUEST = "l_ocedit_pub_request"; // case 3a — approval-mode listing
const L_PUB_MULTI = "l_ocedit_pub_multi"; // case 3b — multi-unit listing
const L_DRAFT = "l_ocedit_draft"; // case 4 — a draft mid-wizard stays permissive
const L_LEGACY = "l_ocedit_legacy"; // case 5 — the row that is ALREADY in the bypass state
const L_STADIUM = "l_ocedit_stadium"; // case 7 — a cap and a price that PREDATE the WR-04 ceilings

const CAP = 3;
const PER_HEAD_CENTS = 35_000; // ₱350.00 per person

// Case 7's legacy numbers, both past the ceilings this plan introduces — 12,000 admissions a day at ₱3,000
// each. The reviewer's own scenario, and the product is what matters: 10,000 granted heads × ₱3,000 is
// 3,000,000,000 centavos, comfortably past int4. Asserted against MAX_MONEY_CENTS below rather than
// restated, so the fixture cannot quietly stop overflowing if the ceiling ever moves.
const STADIUM_CAP = 12_000;
const STADIUM_PER_HEAD_CENTS = 300_000;
const STADIUM_REQUEST = 10_000; // the shape ceiling in openHoldSchema — the most a request may ask for
const HOURLY = 90_000;
const DAY_RATE = 400_000;
const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — every instant below is plain UTC arithmetic
const OPEN_HOUR = 6;
const CLOSE_HOUR = 22;
const HOUR_MS = 3_600_000;

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

function toLocalDate(d: Date): LocalDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
/** A venue-local calendar date `n` days out — clock-relative on purpose (see the header). */
function daysOut(n: number): LocalDate {
  return toLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
function ymd(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}
/** The CR-03 counter identity for a venue-local date: `[midnight, next midnight)`. Plain +08 arithmetic, so
 *  it is an INDEPENDENT second opinion on `venueDayBoundsUtc` rather than a re-run of it. */
function dayBounds(d: LocalDate): { dayStartUtc: Date; dayEndUtc: Date } {
  const dayStartUtc = new Date(Date.UTC(d.year, d.month - 1, d.day, -MANILA_OFFSET_HOURS, 0, 0));
  return { dayStartUtc, dayEndUtc: new Date(dayStartUtc.getTime() + 24 * HOUR_MS) };
}

const D_LEGACY = daysOut(30); // case 5 — the date the mis-configured listing is claimed for
const D_STADIUM = daysOut(31); // case 7 — its own date, so case 5's refusal cannot pre-fill anything

// The mocked next/headers reads this at CALL time, so login() can swap between the host and the booker.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

// next/navigation.redirect raises by design, so a SUCCESSFUL placeOpenHold is observed as a thrown target —
// which is exactly what case 5 must NOT see.
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}

const fakeRateLimit = (): RateLimitResult => ({ ok: true });

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/**
 * THE PERSISTED ROW, read straight back out of Postgres. Every case asserts on THIS, not merely on the
 * action's return value: a guard that returns the right sentence and lets the write land is the failure mode
 * (the 09-20 lesson — the calendar is a courtesy, the stored row is the fact).
 */
async function readListingRow(id: string) {
  const rows = (await testDb.db.execute(sql`
    SELECT status::text AS status,
           occupancy_mode::text AS occupancy_mode,
           per_head_price_cents,
           booking_mode::text AS booking_mode,
           unit_count,
           max_occupancy
    FROM listing WHERE id = ${id}
  `)) as unknown as {
    status: string;
    occupancy_mode: string;
    per_head_price_cents: number | null;
    booking_mode: string;
    unit_count: number;
    max_occupancy: number | null;
  }[];
  return rows[0];
}

/** EVERY booking row on one (listing, venue-local day), whatever its status — the "nothing was written"
 *  probe the money-path cases rest on. */
async function bookingsOn(listingId: string, day: LocalDate) {
  const b = dayBounds(day);
  return (await testDb.db.execute(sql`
    SELECT id, status::text AS status, declared_pax, space_price_cents, quoted_total_cents
    FROM booking
    WHERE listing_id = ${listingId}
      AND starts_at >= ${b.dayStartUtc.toISOString()}::timestamptz
      AND starts_at <  ${b.dayEndUtc.toISOString()}::timestamptz
    ORDER BY id
  `)) as unknown as {
    id: string;
    status: string;
    declared_pax: number | null;
    space_price_cents: number | null;
    quoted_total_cents: number | null;
  }[];
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  const signedUp = (await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "Edit Gate Host",
    firstName: "Edit",
    intent: "host",
  })) as { user: { id: string } };
  HOST_ID = signedUp.user.id;
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "Edit Gate Booker",
    firstName: "Booker",
    intent: "book",
  });

  // deriveBookable needs a VERIFIED host with ACTIVATED payouts, or case 5 would refuse with `not-bookable`
  // and prove nothing at all about the money path.
  await testDb.db.execute(sql`UPDATE "user" SET email_verified = true WHERE id = ${HOST_ID}`);
  await testDb.db.insert(hostPayout).values({
    userId: HOST_ID,
    paymongoAccountId: "wal_ocedit_1",
    activationStatus: "activated",
    payoutsEnabled: true,
    onboardingComplete: true,
  });

  await testDb.db.insert(listing).values([
    {
      // Case 1 — a PUBLISHED, bookable, whole-space listing with a completely clear calendar, so the OC-17
      // mode lock cannot fire and the ONLY thing that can refuse the switch is the gate under test.
      id: L_PUB_EXCL,
      hostId: HOST_ID,
      title: "Whole gym floor",
      status: "published",
      publishedAt: new Date(),
      primarySpaceType: "gym_fitness_floor",
      city: "Makati",
      currency: "php",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: 10,
      unitCount: 1,
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      timezone: TIMEZONE,
    },
    {
      // Case 2 — identical to case 1's fixture in every respect. The ONLY difference is what the autosave
      // carries. This is the control that keeps the guard honest: it must block the invalid TRANSITION, not
      // the feature, or the wizard's drop-in flow would be unreachable for every published listing.
      id: L_PUB_OK,
      hostId: HOST_ID,
      title: "Whole gym floor, convertible",
      status: "published",
      publishedAt: new Date(),
      primarySpaceType: "gym_fitness_floor",
      city: "Makati",
      currency: "php",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: 10,
      unitCount: 1,
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      timezone: TIMEZONE,
    },
    {
      // Case 3a — approval mode (OC-10). It already carries a price per person and a cap, so the ONLY rule
      // it can fail is the instant-booking one; that is what makes the asserted sentence attributable.
      id: L_PUB_REQUEST,
      hostId: HOST_ID,
      title: "Approval-only studio",
      status: "published",
      publishedAt: new Date(),
      primarySpaceType: "yoga_studio",
      city: "Makati",
      currency: "php",
      occupancyMode: "exclusive",
      bookingMode: "request",
      cancellationPolicy: "standard",
      maxOccupancy: 10,
      unitCount: 1,
      perHeadPriceCents: PER_HEAD_CENTS,
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      timezone: TIMEZONE,
    },
    {
      // Case 3b — three bookable units (D-21). Same construction: priced, capped and instant, so the single-
      // space rule is the only one left to fail.
      id: L_PUB_MULTI,
      hostId: HOST_ID,
      title: "Three courts",
      status: "published",
      publishedAt: new Date(),
      primarySpaceType: "multi_sport_court",
      city: "Makati",
      currency: "php",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: 10,
      unitCount: 3,
      perHeadPriceCents: PER_HEAD_CENTS,
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      timezone: TIMEZONE,
    },
    {
      // Case 4 — a DRAFT mid-wizard. Nothing about it is bookable, and publishListing is still its gate.
      id: L_DRAFT,
      hostId: HOST_ID,
      title: "Half-finished draft",
      status: "draft",
      city: "Makati",
      currency: "php",
      occupancyMode: "exclusive",
      bookingMode: "instant",
      unitCount: 1,
      timezone: TIMEZONE,
    },
    {
      // Case 5 — the row ALREADY in the bypass state, written directly to the table so the case survives
      // whatever the action-level gate does: published + drop-in + NO price per person. This is both what
      // the wizard produces today and what every listing switched before the gate existed looks like.
      id: L_LEGACY,
      hostId: HOST_ID,
      title: "Drop-in floor, unpriced",
      status: "published",
      publishedAt: new Date(),
      primarySpaceType: "gym_fitness_floor",
      city: "Makati",
      currency: "php",
      occupancyMode: "open_capacity",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: CAP,
      unitCount: 1,
      perHeadPriceCents: null, // ← THE DEFECT, persisted
      // ⚠️ DELIBERATELY ADVERSARIAL, DO NOT REMOVE. The exclusive rate columns survive the switch, so a
      // fail-closed check keyed off "has no rate at all" would pass this fixture and sell a pass at the
      // hourly rate. Only a check on `per_head_price_cents` itself can refuse it.
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
      timezone: TIMEZONE,
    },
    {
      // Case 7 — a listing priced BEFORE the WR-04 ceilings existed, written directly to the table for
      // exactly that reason: no schema change reprices an existing row, so this shape survives the
      // ceilings and is the only shape the runtime product guard is there for.
      id: L_STADIUM,
      hostId: HOST_ID,
      title: "Stadium open session",
      status: "published",
      publishedAt: new Date(),
      primarySpaceType: "multi_purpose_event",
      city: "Makati",
      currency: "php",
      occupancyMode: "open_capacity",
      bookingMode: "instant",
      cancellationPolicy: "standard",
      maxOccupancy: STADIUM_CAP,
      unitCount: 1,
      perHeadPriceCents: STADIUM_PER_HEAD_CENTS,
      timezone: TIMEZONE,
    },
  ]);

  // Open EVERY weekday, so each case owns its own date with no "closed that day" surprise.
  await testDb.db.insert(operatingHours).values(
    [L_PUB_EXCL, L_LEGACY, L_STADIUM].flatMap((listingId) =>
      Array.from({ length: 7 }, (_, dow) => ({
        id: `oh_${listingId}_${dow}`,
        listingId,
        dayOfWeek: dow,
        openTime: `${String(OPEN_HOUR).padStart(2, "0")}:00:00`,
        closeTime: `${String(CLOSE_HOUR).padStart(2, "0")}:00:00`,
      })),
    ),
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
  ({ saveListingStep } = await import("@/app/actions/listing"));
  ({ placeOpenHold } = await import("@/app/actions/booking"));

  await testDb.db.select().from(user).limit(1); // keep the `user` import load-bearing for the schema graph
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

describe("CR-04 — a published listing may not enter drop-in mode without what publish requires", () => {
  it("1 · the wizard's own sparse autosave is refused, and the persisted row is untouched", async () => {
    await login(HOST_EMAIL);

    // The row is genuinely in the pre-state FIRST, so the case cannot pass because the fixture was already
    // where we want it to end up.
    const before = await readListingRow(L_PUB_EXCL);
    expect(before.status).toBe("published");
    expect(before.occupancy_mode).toBe("exclusive");
    expect(before.per_head_price_cents).toBeNull();

    // EXACTLY what the wizard's occupancy step sends: the mode, and nothing else. The price lives on the
    // NEXT screen, which is the whole reason this window exists.
    const res = await saveListingStep(L_PUB_EXCL, { occupancyMode: "open_capacity" });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.fieldErrors?.perHeadPriceCents).toContain(PER_HEAD_PRICE_REQUIRED_MESSAGE);

    // ── DATABASE TRUTH. The harm is not a missing sentence — it is a live, bookable listing sitting in
    //    drop-in mode with no price, so the row read-back is what fails first.
    const after = await readListingRow(L_PUB_EXCL);
    expect(after.occupancy_mode).toBe("exclusive");
    expect(after.per_head_price_cents).toBeNull();
    expect(after.status).toBe("published");
  });

  it("2 · the SAME autosave carrying a price per person goes through, and the row changes", async () => {
    await login(HOST_EMAIL);

    // The guard blocks an invalid TRANSITION, never the feature. If this case ever goes red, drop-in mode
    // has become unreachable for every published listing — which is a worse bug than the one being fixed.
    const res = await saveListingStep(L_PUB_OK, {
      occupancyMode: "open_capacity",
      perHeadPriceCents: PER_HEAD_CENTS,
    });
    expect(res.ok).toBe(true);

    const after = await readListingRow(L_PUB_OK);
    expect(after.occupancy_mode).toBe("open_capacity");
    expect(after.per_head_price_cents).toBe(PER_HEAD_CENTS);
    expect(after.booking_mode).toBe("instant");
    expect(after.unit_count).toBe(1);
  });

  it("3 · approval mode and multi-unit are each refused with their OWN sentence", async () => {
    await login(HOST_EMAIL);

    // (3a) OC-10 — approval on a shared daily counter has no lifecycle to run.
    const request = await saveListingStep(L_PUB_REQUEST, { occupancyMode: "open_capacity" });
    expect(request.ok).toBe(false);
    if (request.ok) return;
    expect(request.fieldErrors?.bookingMode).toContain(DROP_IN_INSTANT_ONLY_MESSAGE);
    // Its price per person is already set, so the price rule is NOT what refused it — the sentence is
    // attributable to the rule it names.
    expect(request.fieldErrors?.perHeadPriceCents).toBeUndefined();
    expect((await readListingRow(L_PUB_REQUEST)).occupancy_mode).toBe("exclusive");

    // (3b) 09-RESEARCH A4/Q3 — the claim inserts the sentinel unit 1, so N units' worth of inventory would
    // be sold against one unit's counter.
    const multi = await saveListingStep(L_PUB_MULTI, { occupancyMode: "open_capacity" });
    expect(multi.ok).toBe(false);
    if (multi.ok) return;
    expect(multi.fieldErrors?.unitCount).toContain(DROP_IN_SINGLE_SPACE_MESSAGE);
    expect(multi.fieldErrors?.perHeadPriceCents).toBeUndefined();
    expect((await readListingRow(L_PUB_MULTI)).occupancy_mode).toBe("exclusive");
  });

  it("4 · a DRAFT may still be saved into drop-in mode with no price — publish is still its gate", async () => {
    await login(HOST_EMAIL);

    // THE PERMISSIVENESS CASE, and it is not a courtesy: the wizard's occupancy step comes BEFORE its
    // pricing step, so this exact state is what a host in the middle of building a listing is standing in.
    // A guard applied to every row rather than to published rows would freeze the wizard at step 5.
    const res = await saveListingStep(L_DRAFT, { occupancyMode: "open_capacity" });
    expect(res.ok).toBe(true);

    const after = await readListingRow(L_DRAFT);
    expect(after.status).toBe("draft");
    expect(after.occupancy_mode).toBe("open_capacity");
    expect(after.per_head_price_cents).toBeNull();
  });
});

describe("CR-04 — the claim itself fails CLOSED on a listing already in the bypass state", () => {
  it("5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking", async () => {
    await login(BOOKER_EMAIL);

    // The fixture is the defect, persisted — independent of whatever the action-level gate now does.
    const row = await readListingRow(L_LEGACY);
    expect(row.status).toBe("published");
    expect(row.occupancy_mode).toBe("open_capacity");
    expect(row.per_head_price_cents).toBeNull();

    // ── THE WHOLE POINT: this must RETURN. `mapBookingError` maps only NoUnitAvailableError / 23P01 /
    //    40P01 and re-raises everything else, so an invariant error raised inside the claim escapes the
    //    server action as an unhandled failure — a Next.js error digest on a booker's payment click
    //    (T-09-69 / T-09-70). A plain await is deliberate: if the action raises, THIS LINE is where the
    //    run goes red, and the raised sentence is the finding.
    const res = await placeOpenHold({
      listingId: L_LEGACY,
      date: ymd(D_LEGACY),
      requestedPasses: 1,
    });

    // DATABASE FIRST: a refusal is only real if nothing was written.
    expect(await bookingsOn(L_LEGACY, D_LEGACY)).toHaveLength(0);

    // …and only then, that the booker was actually refused, calmly, through a shipped branch.
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
    expect(res.error.length).toBeGreaterThan(0);
    expect(res.reason).toBe("taken");
  });
});

describe("WR-04 — the money ceilings that are real, and the legacy row they exist for", () => {
  it("6 · both schemas refuse a price per person and a capacity above the ceilings", async () => {
    // The DRAFT schema matters as much as the publish one: the wizard autosaves onto a LIVE row, so a bound
    // applied only at publish would leave an already-published listing free to grow a stadium cap on its
    // very next Save and continue. Each refusal carries its OWN sentence, so a host is told which number is
    // the problem rather than that "input was invalid".
    const draftPrice = draftSchema.safeParse({ perHeadPriceCents: MAX_PER_HEAD_PRICE_CENTS + 1 });
    expect(draftPrice.success).toBe(false);
    if (draftPrice.success) return;
    expect(draftPrice.error.flatten().fieldErrors.perHeadPriceCents).toContain(
      PER_HEAD_PRICE_TOO_HIGH_MESSAGE,
    );

    const draftCap = draftSchema.safeParse({ maxOccupancy: MAX_OPEN_CAPACITY + 1 });
    expect(draftCap.success).toBe(false);
    if (draftCap.success) return;
    expect(draftCap.error.flatten().fieldErrors.maxOccupancy).toContain(DROP_IN_CAP_TOO_HIGH_MESSAGE);

    // …and the same two numbers at the publish gate, read from a complete, otherwise-valid drop-in listing,
    // so nothing else in the payload can be what refused it.
    const publishable = {
      title: "Stadium open session",
      description: "A very large room",
      primarySpaceType: "multi_purpose_event" as const,
      addressLine1: "1 Big Street",
      city: "Makati",
      region: "NCR",
      country: "PH",
      lat: 14.55,
      lng: 121.02,
      bookingMode: "instant" as const,
      cancellationPolicy: "standard" as const,
      occupancyMode: "open_capacity" as const,
      unitCount: 1,
      maxOccupancy: 100,
      perHeadPriceCents: PER_HEAD_CENTS,
    };
    // The baseline publishes, so each refusal below is attributable to the ONE number that changed.
    expect(publishSchema.safeParse(publishable).success).toBe(true);

    const pubPrice = publishSchema.safeParse({
      ...publishable,
      perHeadPriceCents: MAX_PER_HEAD_PRICE_CENTS + 1,
    });
    expect(pubPrice.success).toBe(false);
    if (pubPrice.success) return;
    expect(pubPrice.error.flatten().fieldErrors.perHeadPriceCents).toContain(
      PER_HEAD_PRICE_TOO_HIGH_MESSAGE,
    );

    const pubCap = publishSchema.safeParse({ ...publishable, maxOccupancy: MAX_OPEN_CAPACITY + 1 });
    expect(pubCap.success).toBe(false);
    if (pubCap.success) return;
    expect(pubCap.error.flatten().fieldErrors.maxOccupancy).toContain(DROP_IN_CAP_TOO_HIGH_MESSAGE);

    // THE ARITHMETIC THE DOCBLOCKS NOW CLAIM, asserted rather than asserted-about: the largest product the
    // two ceilings jointly permit, with the D-74 service fee riding on top, is inside int4.
    expect(MAX_OPEN_CAPACITY * MAX_PER_HEAD_PRICE_CENTS).toBeLessThan(MAX_MONEY_CENTS);
  });

  it("7 · a legacy stadium row is refused calmly instead of raising a 22003, and mints NO booking", async () => {
    await login(BOOKER_EMAIL);

    // The fixture predates the ceilings and is therefore untouched by them — which is the argument for the
    // runtime guard existing at all.
    const row = await readListingRow(L_STADIUM);
    expect(row.max_occupancy).toBe(STADIUM_CAP);
    expect(row.per_head_price_cents).toBe(STADIUM_PER_HEAD_CENTS);
    // The claim would grant min(request, remaining) heads, and THAT product is past what the money columns
    // can hold — the precondition for the whole case, stated as a fact rather than trusted.
    expect(STADIUM_REQUEST * STADIUM_PER_HEAD_CENTS).toBeGreaterThan(MAX_MONEY_CENTS);

    // Again a plain await: a Postgres 22003 raised by the INSERT is neither 23P01 nor 40P01, so
    // mapBookingError re-raises it and the booker gets a digest instead of a sentence.
    const res = await placeOpenHold({
      listingId: L_STADIUM,
      date: ymd(D_STADIUM),
      requestedPasses: STADIUM_REQUEST,
    });

    expect(await bookingsOn(L_STADIUM, D_STADIUM)).toHaveLength(0);
    expect(res.ok).toBe(false);
    expect(res.error.length).toBeGreaterThan(0);
    expect(res.reason).toBe("taken");
  });
});
