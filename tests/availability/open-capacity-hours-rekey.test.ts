// CR-03 — an OPERATING-HOURS EDIT may never change which drop-in passes count toward a date's cap.
//
// WHAT THIS FILE GUARDS. A drop-in pass is bought for a DATE, but every instant it is made of is derived
// from the host's operating hours. An hours edit is therefore the ONE input that can move a pass's
// relationship to the counter — and before this was closed it moved the counter's IDENTITY. The counted set
// was `starts_at` equal to the venue's opening instant, RE-DERIVED at request time from the listing's
// CURRENT hours, and the admissions advisory lock was keyed on that same re-derived value. Shifting a
// weekday's opening 06:00 → 07:00 therefore:
//   - emptied the counted set (the sold rows still carry the 06:00 instant),
//   - split one date into TWO disjoint lock domains, each blind to the other's rows,
//   - and let a SECOND FULL CAP be sold, with no constraint violation and no error, while the month grid
//     compared each `starts_at` group against `cap` separately and so never showed the date as full.
//
// The fix anchors the counter on the VENUE-LOCAL CALENDAR DAY over the STORED `booking.starts_at`, and keys
// the lock on `listing_id || ':' || YYYY-MM-DD`. An hours edit then changes what a pass COVERS and never
// which passes COUNT. This file drives that seam: an hours edit FOLLOWED BY a claim, not an admissions claim
// in isolation — a green suite is not coverage of a path no test drives.
//
// THE EDIT IS DRIVEN THROUGH THE DB, not through `saveOperatingHours`: that action is session- and
// owner-gated (it would need a mocked auth session to reach), and this file's subject is the COUNTER, not
// the action's gates. `shiftOpeningTime` below reproduces the action's "replace the set" semantics for one
// weekday exactly (delete every row for the weekday, insert the new one, in that order — see
// src/app/actions/operating-hours.ts). LAYER 2 — refusing the edit itself while live passes exist, with a
// "you can change these after {date}" notice — is 09-19's; this file asserts the counter survives an edit
// that DOES land, which is what makes layer 1 stand alone.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 rule). The shipped claim
// refuses a date whose pass window has already closed and one beyond the 90-day horizon, so a hardcoded
// calendar date would quietly turn every claim here into a PAST_DATE refusal the moment the calendar passed
// it — and the whole file would go green by vacuum.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION A — EXECUTED, not merely described. The COUNTER'S ANCHOR was reverted in all three files that
// carry it, back to the venue's re-derived opening instant:
//   - src/lib/availability/open-capacity.ts — `openTakenSql` back to an equality on `starts_at` instead of
//     the half-open venue-local day range;
//   - src/lib/availability/read-model.ts   — `getOpenDay` passing that opening instant;
//   - src/lib/availability/units.ts        — the advisory lock keyed on the opening instant again, the
//     lazy-expiry sweep scoped to it, and the heads SUM called with it.
// Observed output, VERBATIM:
//
//   ❯ tests/availability/open-capacity-hours-rekey.test.ts (5 tests | 3 failed) 1140ms
//        × 1 · an hours edit cannot make sold admissions stop counting 170ms
//        × 3 · an hours edit changes what a pass COVERS, never which passes COUNT 17ms
//        × 5 · search agrees with the day panel after an hours edit 53ms
//
//    FAIL  tests/availability/open-capacity-hours-rekey.test.ts > CR-03 — an operating-hours edit may never
//    change which drop-in passes count > 1 · an hours edit cannot make sold admissions stop counting
//   AssertionError: expected 4 to be 3 // Object.is equality
//
//   - Expected
//   + Received
//
//   - 3
//   + 4
//
//    ❯ tests/availability/open-capacity-hours-rekey.test.ts:342:19
//       340|     //     names the overbook itself and not a proxy for it.
//       341|     const heads = await headsOnDay(TARGET);
//       342|     expect(heads).toBe(CAP);
//          |                   ^
//
// FOUR PAID ADMISSIONS ON A THREE-PERSON DAY. Case 3 fell out with it (`expected 3 to be 2` — the extra row
// survives the cancellation) and case 5 too (`to not include 'l_oc_rekey'` — search advertised the saturated
// date). Case 2 stayed GREEN under this mutation and case 4 as well; that is not a coverage gap, it is the
// finding having TWO independent halves — see MUTATION B. Restored → 5/5 green → `git diff --exit-code src/`
// printed nothing.
//
// MUTATION B — the `read-model.ts:441` half, mutated SEPARATELY because mutation A cannot reach it: the
// month query carries its own aggregate, so reverting only its grouping back to the stored instant leaves
// the claim and the day panel correct while the CALENDAR still advertises the saturated date. Case 2 went
// RED (`expected [ … ] to include` the target date — the grid listed only the neighbouring date it had a
// single group for), and it took `open-capacity-readmodel.test.ts` cases 9 and 11 with it. Full verbatim
// output is in 09-18-SUMMARY.md rather than here: those messages quote calendar dates, and this file's
// acceptance tripwire forbids a calendar literal anywhere in it (the 09-03 clock-relative rule). Restored →
// green → `git diff --exit-code src/` printed nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, operatingHours } from "@/lib/db/schema";
import { getAvailability, getOpenMonthAvailability } from "@/lib/availability/read-model";
import { createOpenCapacityHold, type OpenHoldResult } from "@/lib/availability/units";
import { loadOpenDayWindow, SOLD_OUT_MESSAGE } from "@/lib/availability/open-capacity";
import { searchListings } from "@/lib/search/query";
import { searchParamsSchema } from "@/lib/validation/booking";

let testDb: TestDb;

const HOST = "oc_rekey_host";
const B1 = "oc_rekey_booker_1";
const B2 = "oc_rekey_booker_2";
const B3 = "oc_rekey_booker_3";
const B4 = "oc_rekey_booker_4";
const B5 = "oc_rekey_booker_5";

const LISTING = "l_oc_rekey";
const CONTROL = "l_oc_rekey_control"; // an untouched listing, so case 5 is not a blanket drop

const CAP = 3;
const PER_HEAD_CENTS = 35_000;

const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8; // UTC+8 all year, no DST — every instant below is plain UTC arithmetic
const HOUR_MS = 3_600_000;

const OPEN_HOUR_BEFORE = 6; // 06:00 venue-local — the hours the three passes are SOLD under
const OPEN_HOUR_AFTER = 7; // 07:00 venue-local — the host's edit
const CLOSE_HOUR = 22;

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

/** An instant's VENUE-LOCAL calendar date, by plain +08 shift — no timezone library, so nothing here can
 *  inherit a bug from the one the code under test uses. */
function venueLocalDate(at: Date): LocalDate {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_HOURS * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}
/** A venue-local calendar date `n` days out — clock-relative on purpose (see the header). */
function daysOut(n: number): LocalDate {
  return venueLocalDate(new Date(Date.now() + n * 24 * HOUR_MS));
}
/** A venue-local wall-clock hour on a venue-local date, as the real UTC instant it names. */
function venueInstant(d: LocalDate, hour: number): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, 0, 0));
}
/** The venue-local weekday. Noon UTC is 20:00 Manila on the SAME calendar date. */
function dowOf(d: LocalDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12, 0, 0)).getUTCDay();
}
function ymd(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}
/**
 * THE COUNTER'S IDENTITY for a venue-local date — `[midnight, next midnight)` plus the `YYYY-MM-DD` key.
 * Derived by the same plain +08 arithmetic as everything else here: an INDEPENDENT second opinion on the
 * shipped `venueDayBoundsUtc`, never a re-run of it.
 */
function dayBounds(d: LocalDate): { dayStartUtc: Date; dayEndUtc: Date; dateKey: string } {
  const dayStartUtc = venueInstant(d, 0);
  return {
    dayStartUtc,
    dayEndUtc: new Date(dayStartUtc.getTime() + 24 * HOUR_MS),
    dateKey: ymd(d),
  };
}

// ~a week out: comfortably future, comfortably inside the 90-day horizon, and far enough from today that a
// run at any hour cannot slide the target onto the current date.
const TARGET = daysOut(7); // the date the hours edit attacks
const NEXT = daysOut(8); // case 4 — a DIFFERENT venue-local day must be unaffected
const FREE = daysOut(9); // case 5's control date — never claimed against
const MONTH = { year: TARGET.year, month: TARGET.month };

// The window the three passes are SOLD under, captured as constants so case 3 can assert the stored rows are
// byte-unchanged by the edit WITHOUT re-reading them before it (which would only prove the read, not the row).
const SOLD_OPEN_UTC = venueInstant(TARGET, OPEN_HOUR_BEFORE);
const SOLD_CLOSE_UTC = venueInstant(TARGET, CLOSE_HOUR);
const EDITED_OPEN_UTC = venueInstant(TARGET, OPEN_HOUR_AFTER);

const NOW = new Date(); // fixed for the run, so display state is deterministic within it

const hhmmss = (h: number) => `${String(h).padStart(2, "0")}:00:00`;

/**
 * The COMMITTED head count for a venue-local DAY, over the occupying set (confirmed, or pending and not yet
 * lapsed). Deliberately re-typed here rather than importing `openTakenSql`: an assertion must not inherit a
 * bug from the very fragment under test — and it must read the venue-local DAY RANGE, because a helper keyed
 * on the opening instant would reproduce the exact bug it is measuring and cheerfully report 3 while the
 * table holds 4. THIS IS THE DATABASE TRUTH every case asserts first.
 */
async function headsOnDay(day: LocalDate, listingId: string = LISTING): Promise<number> {
  const { dayStartUtc, dayEndUtc } = dayBounds(day);
  const rows = (await testDb.db.execute(sql`
    SELECT COALESCE(SUM(b.declared_pax), 0)::int AS heads
    FROM booking b
    WHERE b.listing_id = ${listingId}
      AND b.open_capacity = true
      AND b.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
      AND b.starts_at < ${dayEndUtc.toISOString()}::timestamptz
      AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > now()))
  `)) as unknown as { heads: number }[];
  return Number(rows[0]?.heads ?? 0);
}

/**
 * ONE admissions claim, driven exactly as `placeOpenHold` drives it: RE-DERIVE the day window from the
 * listing's CURRENT operating hours (step 7), then hand it to the REAL claim (step 8). Re-deriving per claim
 * is what makes the hours edit reach the code under test at all — a test that hoisted the window into a
 * constant would never cross the seam this file exists for.
 */
async function claim(bookerId: string, day: LocalDate, heads: number): Promise<OpenHoldResult> {
  const win = await loadOpenDayWindow(testDb.db, LISTING, day);
  if (!win) throw new Error(`fixture broken: the venue is closed on ${ymd(day)}`);
  return createOpenCapacityHold(testDb.db, {
    listingId: LISTING,
    bookerId,
    dayOpenUtc: win.dayOpenUtc,
    dayCloseUtc: win.dayCloseUtc,
    dayStartUtc: win.dayStartUtc,
    dayEndUtc: win.dayEndUtc,
    dateKey: win.dateKey,
    requestedHeads: heads,
    idempotencyKey: null,
  });
}

/**
 * The host's edit. Mirrors `saveOperatingHours`'s replace-the-set semantics for ONE weekday: delete every
 * window the listing has for that weekday, then insert the new one. The action does this listing-wide inside
 * a transaction; scoping to the weekday keeps the other six days (and therefore cases 4 and 5) untouched,
 * which is the only difference and is not one the counter can observe.
 */
async function shiftOpeningTime(day: LocalDate, openHour: number): Promise<void> {
  const dow = dowOf(day);
  await testDb.db.execute(
    sql`DELETE FROM operating_hours WHERE listing_id = ${LISTING} AND day_of_week = ${dow}`,
  );
  await testDb.db.insert(operatingHours).values({
    id: randomUUID(),
    listingId: LISTING,
    dayOfWeek: dow,
    openTime: hhmmss(openHour),
    closeTime: hhmmss(CLOSE_HOUR),
  });
}

const isOk = (r: OpenHoldResult): r is Extract<OpenHoldResult, { ok: true }> => "ok" in r;

/** Read one booking row's stored window back — the only thing an hours edit is allowed to leave alone. */
async function windowOf(id: string): Promise<{ startsAt: string; endsAt: string }> {
  const rows = (await testDb.db.execute(sql`
    SELECT starts_at, ends_at FROM booking WHERE id = ${id}
  `)) as unknown as { starts_at: string | Date; ends_at: string | Date }[];
  return {
    startsAt: new Date(rows[0].starts_at).toISOString(),
    endsAt: new Date(rows[0].ends_at).toISOString(),
  };
}

function openListing(id: string) {
  return {
    id,
    hostId: HOST,
    title: id,
    status: "published" as const,
    reviewState: "approved" as const,
    publishedAt: new Date(),
    primarySpaceType: "gym_fitness_floor" as const,
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    currency: "php" as const,
    occupancyMode: "open_capacity" as const,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const, // D-67 tier the claim snapshots
    maxOccupancy: CAP,
    unitCount: 1, // 09-06 publish gate
    perHeadPriceCents: PER_HEAD_CENTS,
    // The exclusive rate columns are DELIBERATELY kept: 09-06 requires a per-head price but never clears
    // them, and OC-17 permits the mode switch. Every assertion here can therefore only pass by keying on the
    // persisted occupancy_mode, never on the accident of a NULL column (.continue-here.md anti-pattern 2).
    hourlyRateCents: 90_000,
    dayRateCents: 400_000,
    timezone: TIMEZONE,
  };
}

const claimIds: string[] = []; // the three passes sold BEFORE the edit, in claim order

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    {
      id: HOST,
      name: "Rekey Host",
      email: `${HOST}@example.com`,
      firstName: "Rekey",
      emailVerified: true,
      canHost: true,
    },
    ...[B1, B2, B3, B4, B5].map((id) => ({
      id,
      name: `Rekey ${id}`,
      email: `${id}@example.com`,
      firstName: "Rekey",
      emailVerified: true,
      canBook: true,
    })),
  ]);
  // Search's bookability gate — the PayMongo payouts_enabled flag AND, since phase 18 (D-224), an
  // ops-APPROVED host_verification row. Without BOTH, Stage-1 drops both listings and case 5 would pass
  // for the wrong reason.
  await makeVerifiedHost(testDb.db, HOST, { insertUser: false });

  await testDb.db.insert(listing).values([openListing(LISTING), openListing(CONTROL)]);

  // Hours on EVERY weekday, so TARGET, NEXT and FREE are all genuinely open days and the only thing that
  // changes mid-file is the one weekday the host edits.
  await testDb.db.insert(operatingHours).values(
    [LISTING, CONTROL].flatMap((listingId) =>
      Array.from({ length: 7 }, (_, dow) => ({
        id: randomUUID(),
        listingId,
        dayOfWeek: dow,
        openTime: hhmmss(OPEN_HOUR_BEFORE),
        closeTime: hhmmss(CLOSE_HOUR),
      })),
    ),
  );
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("CR-03 — an operating-hours edit may never change which drop-in passes count", () => {
  it("1 · an hours edit cannot make sold admissions stop counting", async () => {
    // Three DIFFERENT bookers, one head each, under the venue's 06:00 hours: the date is saturated. Distinct
    // identities on purpose — one shared booker would make the second and third claims D-42 REPLAYS of the
    // first and the cap would never actually be filled.
    for (const booker of [B1, B2, B3]) {
      const res = await claim(booker, TARGET, 1);
      if (!isOk(res)) throw new Error(`fixture broken: a pre-edit claim was refused: ${res.error}`);
      expect(res.granted).toBe(1);
      claimIds.push(res.id);
    }
    expect(await headsOnDay(TARGET)).toBe(CAP);

    // ── THE EDIT. A routine host change (a new class schedule), landing on a date that is already sold out.
    await shiftOpeningTime(TARGET, OPEN_HOUR_AFTER);
    // It really did take effect — otherwise every assertion below would hold vacuously.
    const win = await loadOpenDayWindow(testDb.db, LISTING, TARGET);
    expect(win?.dayOpenUtc.toISOString()).toBe(EDITED_OPEN_UTC.toISOString());

    // ── The fourth claim, made under the NEW hours.
    const fourth = await claim(B4, TARGET, 1);

    // (1) DATABASE TRUTH FIRST (.continue-here.md anti-pattern 5): the SUMMED heads over the occupying set
    //     for this VENUE-LOCAL DATE. With the counter keyed on the re-derived opening instant, the fourth
    //     claim sees an empty counted set, takes a DIFFERENT advisory lock, and commits — selling a whole
    //     extra cap on top of a sold-out day. Asserted ahead of the returned value so the failure message
    //     names the overbook itself and not a proxy for it.
    const heads = await headsOnDay(TARGET);
    expect(heads).toBe(CAP);

    // (2) …and only then, the sentence the booker actually reads.
    expect(fourth).toMatchObject({ error: SOLD_OUT_MESSAGE, soldOut: true });

    // (3) …and the day panel agrees with both.
    const oc = (await getAvailability(testDb.db, LISTING, TARGET, NOW)).openCapacity;
    expect(oc?.remaining).toBe(0);
    expect(oc?.state).toBe("full");
    expect(oc?.cap).toBe(CAP);
    // The window it reports is the NEW one — what a pass covers moved, exactly as the host intended.
    expect(oc?.dayOpenUtc).toBe(EDITED_OPEN_UTC.toISOString());
  });

  it("2 · the month grid shows the date full after an hours edit", async () => {
    // The `read-model.ts:441` half of CR-03. Grouping on the stored instant produced one group per opening
    // time, each compared against `cap` SEPARATELY — so a date carrying two groups never reached the cap in
    // either and stayed selectable in the calendar the booker is looking at.
    const month = await getOpenMonthAvailability(testDb.db, LISTING, MONTH);
    expect(month.cap).toBe(CAP);
    expect(month.fullDates).toContain(ymd(TARGET));
    // The neighbouring dates are untouched, so this is not a blanket "everything is full".
    expect(month.fullDates).not.toContain(ymd(NEXT));
    expect(month.fullDates).not.toContain(ymd(FREE));
  });

  it("3 · an hours edit changes what a pass COVERS, never which passes COUNT", async () => {
    // (a) The three sold rows are byte-unchanged by the edit: an hours edit rewrites operating_hours, never
    //     a booking. Compared against constants captured before the fixture ran, not a re-read.
    for (const id of claimIds) {
      const w = await windowOf(id);
      expect(w.startsAt).toBe(SOLD_OPEN_UTC.toISOString());
      expect(w.endsAt).toBe(SOLD_CLOSE_UTC.toISOString());
    }

    // (b) Cancelling one frees exactly its head — the live SUM has no stored counter to drift (Pitfall 3).
    await testDb.db.execute(sql`UPDATE booking SET status = 'cancelled', expires_at = NULL
                                WHERE id = ${claimIds[0]}`);
    expect(await headsOnDay(TARGET)).toBe(CAP - 1);
    expect((await getAvailability(testDb.db, LISTING, TARGET, NOW)).openCapacity?.remaining).toBe(1);

    // (c) The freed head is re-sold under the NEW hours. This pins the INTENDED semantics rather than merely
    //     the absence of the bug: the new row's stored window is the 07:00 one, the two surviving 06:00 rows
    //     still count, and the three of them together fill the date again.
    const fresh = await claim(B4, TARGET, 1);
    if (!isOk(fresh)) throw new Error(`the re-sale of the freed head was refused: ${fresh.error}`);
    const w = await windowOf(fresh.id);
    expect(w.startsAt).toBe(EDITED_OPEN_UTC.toISOString());
    expect(w.startsAt).not.toBe(SOLD_OPEN_UTC.toISOString());
    expect(await headsOnDay(TARGET)).toBe(CAP);

    // Two distinct opening instants now occupy ONE date — the shape the whole finding is about.
    const distinct = (await testDb.db.execute(sql`
      SELECT DISTINCT starts_at FROM booking
      WHERE listing_id = ${LISTING} AND status <> 'cancelled'
        AND starts_at >= ${dayBounds(TARGET).dayStartUtc.toISOString()}::timestamptz
        AND starts_at < ${dayBounds(TARGET).dayEndUtc.toISOString()}::timestamptz
    `)) as unknown as unknown[];
    expect(distinct).toHaveLength(2);
  });

  it("4 · a different date is unaffected — the anchor was narrowed, not widened", async () => {
    // The counter was moved from an instant to a venue-local DAY. A day is wider than an instant, so the
    // failure mode to rule out is over-reach: if the range had been widened past midnight (or the lock key
    // coarsened to the listing), the following date would have inherited the target's saturation.
    const res = await claim(B5, NEXT, CAP);
    if (!isOk(res)) throw new Error(`the following date was wrongly refused: ${res.error}`);
    expect(res.granted).toBe(CAP); // the FULL cap, on a date whose neighbour is sold out

    expect(await headsOnDay(NEXT)).toBe(CAP);
    expect(await headsOnDay(TARGET)).toBe(CAP); // …and the target did not absorb them
    const oc = (await getAvailability(testDb.db, LISTING, FREE, NOW)).openCapacity;
    expect(oc?.remaining).toBe(CAP); // a third date is still wholly free
  });

  it("5 · search agrees with the day panel after an hours edit", async () => {
    // The booker-visible restatement of case 1: Stage-2 search reads `getAvailability`, so a counter that
    // stopped counting would have put the saturated date back on the results page — the listing advertised
    // as available on a day it cannot admit anyone to.
    const on = async (day: LocalDate) =>
      (await searchListings(testDb.db, searchParamsSchema.parse({ date: ymd(day) }), NOW)).results.map(
        (r) => r.id,
      );

    const saturated = await on(TARGET);
    expect(saturated).not.toContain(LISTING);
    // The control listing — same host, same hours, no claims — survives the same query, so this is a
    // date-scoped drop and not a blanket one.
    expect(saturated).toContain(CONTROL);

    // …and the same listing is still findable on a date that genuinely has spots.
    expect(await on(FREE)).toContain(LISTING);
  });
});
