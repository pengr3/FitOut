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

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, hostPayout, operatingHours } from "@/lib/db/schema";
import { PER_HEAD_PRICE_REQUIRED_MESSAGE } from "@/lib/validation/listing";
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
const L_LEGACY = "l_ocedit_legacy"; // case 5 — the row that is ALREADY in the bypass state

const CAP = 3;
const PER_HEAD_CENTS = 35_000; // ₱350.00 per person
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
  ]);

  // Open EVERY weekday, so each case owns its own date with no "closed that day" surprise.
  await testDb.db.insert(operatingHours).values(
    [L_PUB_EXCL, L_LEGACY].flatMap((listingId) =>
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
