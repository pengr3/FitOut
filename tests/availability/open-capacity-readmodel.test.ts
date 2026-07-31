// Integration test for the OPEN-CAPACITY branch of the availability read model (OPEN-04 / OC-13).
//
// Clones the read-model.test.ts harness shape (setupTestDb → migrated isolated schema → seed → assert) and
// proves, against a real Postgres, that a drop-in listing answers with SPOTS LEFT FOR A DATE rather than a
// free/taken hour grid, and that the number it reports is the number the claim will honour:
//   - empty date                  → remaining = cap, state "open", slots [], the OC-03 entry window in UTC
//   - confirmed + LIVE pending    → both occupy; remaining drops by the SUM of their heads
//   - the pending lapses          → its heads come back with NO worker and NO release code (D-48a / Pitfall 3)
//   - the confirmed is cancelled  → its heads come back the same way (OC-15 needs no code at all)
//   - the low-stock boundary      → remaining 5/4 on cap 10 are "low", remaining 6 is "open" (09-UI-SPEC)
//   - remaining 0                 → state "full"
//   - a weekday with no hours     → hasHours false, openCapacity null, occupancyMode STILL "open_capacity"
//   - an EXCLUSIVE listing        → occupancyMode "exclusive", openCapacity null, a real hour grid (OC-01
//                                   is a FORK, not a replacement)
//   - getOpenMonthAvailability    → exactly the fully-booked venue-local dates of the QUERIED month, incl.
//                                   the 1st (whose opening instant falls in the previous UTC month) and
//                                   excl. a full date belonging to the previous month
//   - two DIFFERENT starts_at     → ONE month entry for the venue-local date they share (CR-03, case 11).
//     on one venue-local date       Grouping on the stored instant produced one group PER opening time, each
//                                   compared against `cap` separately, so an hours-edited date never read full.
//   - the read model vs the CLAIM → after createOpenCapacityHold grants heads, the projection reports
//                                   cap − granted. THIS is the Pitfall-4 assertion: if the projection's
//                                   predicate ever drifts from the counter's, this case is where it shows.
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 lesson). The shipped claim
// refuses a date whose pass window has already closed and one beyond the 90-day horizon, so a hardcoded
// 2026 date would quietly turn case 10 into a PAST_DATE refusal the moment the calendar passed it — and the
// whole file would go green by vacuum.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, operatingHours } from "@/lib/db/schema";
import { getAvailability, getOpenMonthAvailability } from "@/lib/availability/read-model";
import { createOpenCapacityHold } from "@/lib/availability/units";

let testDb: TestDb;

const HOST = "oc_rm_host";
const BOOKER_A = "oc_rm_booker_a";
const BOOKER_B = "oc_rm_booker_b";
const CLAIMER = "oc_rm_claimer";

const CAP = 10;
const PER_HEAD_CENTS = 35000;

// Asia/Manila is UTC+8 all year (no DST), which is why every expected instant below can be derived with
// plain UTC arithmetic — a genuinely INDEPENDENT second opinion, not a re-run of the TZDate math under test.
const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET_HOURS = 8;
const OPEN_HOUR = 6; // 06:00 venue-local
const CLOSE_HOUR = 22; // 22:00 venue-local

type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED (getAvailability's rule)

/** The venue's OPENING instant on a venue-local date: 06:00 +08 == 22:00Z the PREVIOUS day. `hour` is the
 *  venue-local opening WALL CLOCK and defaults to the fixture's 06:00 — case 11 overrides it to seed the
 *  second opening time an hours edit produces, on the SAME venue-local date. */
function openInstant(d: LocalDate, hour: number = OPEN_HOUR): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, 0, 0));
}
/** The venue's CLOSING instant on a venue-local date: 22:00 +08 == 14:00Z the same day. */
function closeInstant(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, CLOSE_HOUR - MANILA_OFFSET_HOURS, 0, 0));
}
/** The venue-local weekday of a date. Noon UTC is 20:00 Manila on the SAME calendar date, so this needs no
 *  timezone library and cannot inherit a bug from the one the read model uses. */
function dowOf(d: LocalDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12, 0, 0)).getUTCDay();
}
function toLocalDate(d: Date): LocalDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
function ymd(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}
/** The CR-03 counter identity for a venue-local date: `[midnight, next midnight)` + the `YYYY-MM-DD` key.
 *  Same plain +08 arithmetic as the two instant helpers above — an independent second opinion on
 *  `venueDayBoundsUtc`, not a re-run of it. Never persisted: it is what a pass COUNTS AGAINST. */
function dayBounds(d: LocalDate): { dayStartUtc: Date; dayEndUtc: Date; dateKey: string } {
  const dayStartUtc = new Date(Date.UTC(d.year, d.month - 1, d.day, -MANILA_OFFSET_HOURS, 0, 0));
  return {
    dayStartUtc,
    dayEndUtc: new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000),
    dateKey: ymd(d),
  };
}

// ~30 days out: comfortably inside the 90-day horizon, comfortably in the future.
const ANCHOR = toLocalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
// The next calendar day — a DIFFERENT weekday, for which the open listing has no operating_hours row.
const ANCHOR_NEXT = toLocalDate(new Date(openInstant(ANCHOR).getTime() + 36 * 60 * 60 * 1000));
// A separate date for the claim-agreement case, so its in-transaction expiry sweep can never touch the
// rows the earlier cases rely on.
const CLAIM_DAY = toLocalDate(new Date(Date.now() + 35 * 24 * 60 * 60 * 1000));

// The queried month for the month map, and four dates inside/around it. Day 1 is deliberate: its opening
// instant lands in the PREVIOUS UTC month, which is exactly what the query's widened bounds exist for.
const MONTH = { year: ANCHOR.year, month: ANCHOR.month };
const M_FULL_FIRST: LocalDate = { ...MONTH, day: 1 };
const M_FULL_MID: LocalDate = { ...MONTH, day: 10 };
const M_PARTIAL: LocalDate = { ...MONTH, day: 11 };
// The last day of the PREVIOUS venue-local month — fully booked, and it must NOT appear in this month's map.
const M_PREV_MONTH_FULL: LocalDate = toLocalDate(
  new Date(Date.UTC(MONTH.year, MONTH.month - 1, 1, 12, 0, 0) - 24 * 60 * 60 * 1000),
);

// A FIXED injected `now`, captured once at module load. Fixed for the whole run (so `bookable`, `past` and
// `beyond_horizon` are deterministic within it) while still tracking the real clock across runs, which is
// what keeps the clock-relative fixture dates above honest.
const NOW = new Date();

const L_OPEN = "l_oc_rm_open"; // cases 1-7
const L_EXCL = "l_oc_rm_excl"; // case 8
const L_MONTH = "l_oc_rm_month"; // case 9
const L_CLAIM = "l_oc_rm_claim"; // case 10
// Case 11 gets its OWN listing rather than reusing L_MONTH: case 9 asserts L_MONTH's fullDates EXACTLY, and
// a shared fixture would make one case's rows silently decide the other's expectation.
const L_REKEY = "l_oc_rm_rekey"; // case 11

// Live vs lapsed vs never-expiring, expressed against the DB CLOCK — the same clock openTakenSql's
// `expires_at > now()` reads. A JS timestamp here would be testing the test's clock, not the read model's.
const LIVE = sql`now() + interval '10 minutes'`;
const STALE = sql`now() - interval '1 minute'`;
const NO_EXPIRY = sql`NULL`;

/**
 * Insert ONE open-capacity booking row with every field the counter reads set EXPLICITLY — open_capacity,
 * declared_pax, status and expires_at. Raw SQL on purpose: the read model must be proven against rows that
 * exist in the shape production writes them, not against whatever an ORM default would have supplied.
 */
async function insertOpenBooking(args: {
  id: string;
  listingId: string;
  bookerId: string;
  day: LocalDate;
  heads: number;
  status: "pending" | "confirmed" | "cancelled";
  expires: typeof LIVE;
  /** venue-local opening wall clock; defaults to the fixture's 06:00 (see openInstant). Case 11 only. */
  openHour?: number;
}): Promise<void> {
  await testDb.db.execute(sql`
    INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status,
                         open_capacity, declared_pax, expires_at)
    VALUES (${args.id}, ${args.listingId}, 1, ${args.bookerId},
            ${openInstant(args.day, args.openHour).toISOString()}::timestamptz,
            ${closeInstant(args.day).toISOString()}::timestamptz,
            ${args.status}, true, ${args.heads}, ${args.expires})
  `);
}

/** Wipe a listing's bookings so a case starts from a known, empty date. */
async function clearBookings(listingId: string): Promise<void> {
  await testDb.db.execute(sql`DELETE FROM booking WHERE listing_id = ${listingId}`);
}

/** Occupy exactly `heads` on ANCHOR for L_OPEN via one confirmed row, from an empty start. */
async function occupy(heads: number): Promise<void> {
  await clearBookings(L_OPEN);
  await insertOpenBooking({
    id: `bk_occupy_${heads}`,
    listingId: L_OPEN,
    bookerId: BOOKER_A,
    day: ANCHOR,
    heads,
    status: "confirmed",
    expires: NO_EXPIRY,
  });
}

function openListing(id: string, cap: number) {
  return {
    id,
    hostId: HOST,
    title: "Drop-in floor",
    status: "published" as const,
    occupancyMode: "open_capacity" as const,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const, // D-67 tier the claim snapshots
    maxOccupancy: cap,
    unitCount: 1, // 09-06 publish gate
    perHeadPriceCents: PER_HEAD_CENTS,
    timezone: TIMEZONE,
  };
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values(
    [HOST, BOOKER_A, BOOKER_B, CLAIMER].map((id) => ({
      id,
      name: `OC ${id}`,
      email: `${id}@example.com`,
      firstName: "OC",
      emailVerified: true,
    })),
  );

  await testDb.db.insert(listing).values([
    openListing(L_OPEN, CAP),
    openListing(L_MONTH, CAP),
    openListing(L_CLAIM, CAP),
    openListing(L_REKEY, CAP),
    {
      id: L_EXCL,
      hostId: HOST,
      title: "Whole court",
      status: "published" as const,
      // The pre-Phase-9 shape, spelled out rather than left to the column default: this fixture's whole job
      // is to prove the exclusive payload did not move.
      occupancyMode: "exclusive" as const,
      unitCount: 2,
      timezone: TIMEZONE,
    },
  ]);

  // Hours ONLY on each fixture date's own weekday, so ANCHOR_NEXT is a genuinely closed day for L_OPEN.
  await testDb.db.insert(operatingHours).values([
    {
      id: "oh_oc_open",
      listingId: L_OPEN,
      dayOfWeek: dowOf(ANCHOR),
      openTime: "06:00:00",
      closeTime: "22:00:00",
    },
    {
      id: "oh_oc_excl",
      listingId: L_EXCL,
      dayOfWeek: dowOf(ANCHOR),
      openTime: "06:00:00",
      closeTime: "09:00:00",
    },
    {
      id: "oh_oc_claim",
      listingId: L_CLAIM,
      dayOfWeek: dowOf(CLAIM_DAY),
      openTime: "06:00:00",
      closeTime: "22:00:00",
    },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("open-capacity read model — spots left for a DATE (OPEN-04 / OC-13)", () => {
  it("1. reports the whole cap on an empty date, with no hour grid and the OC-03 entry window", async () => {
    const avail = await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW);

    expect(avail.occupancyMode).toBe("open_capacity");
    // OC-02: a date is ONE pass, so there is no free/taken grid to render at all.
    expect(avail.slots).toEqual([]);
    expect(avail.hasHours).toBe(true);

    const oc = avail.openCapacity;
    expect(oc).not.toBeNull();
    expect(oc?.remaining).toBe(10);
    expect(oc?.cap).toBe(10);
    expect(oc?.state).toBe("open");
    expect(oc?.perHeadPriceCents).toBe(PER_HEAD_CENTS);
    expect(oc?.bookable).toBe(true);
    // The venue's 06:00 and 22:00 as UTC instants — 22:00Z the previous day and 14:00Z the same day.
    expect(oc?.dayOpenUtc).toBe(openInstant(ANCHOR).toISOString());
    expect(oc?.dayCloseUtc).toBe(closeInstant(ANCHOR).toISOString());
    expect(oc?.openTime).toBe("06:00:00");
    expect(oc?.closeTime).toBe("22:00:00");
  });

  it("2. counts a CONFIRMED row and a LIVE PENDING hold against the cap", async () => {
    await insertOpenBooking({
      id: "bk_conf_3",
      listingId: L_OPEN,
      bookerId: BOOKER_A,
      day: ANCHOR,
      heads: 3,
      status: "confirmed",
      expires: NO_EXPIRY,
    });
    await insertOpenBooking({
      id: "bk_pend_2",
      listingId: L_OPEN,
      bookerId: BOOKER_B,
      day: ANCHOR,
      heads: 2,
      status: "pending",
      expires: LIVE,
    });

    const oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(5); // 10 − (3 + 2): the SUM of heads, not a count of rows
    // 5 of a 10-cap is exactly the threshold, so this is the INCLUSIVE edge of the urgency band. The plan
    // predicted "open" here; the 09-UI-SPEC table (clamp(floor(10/2), 1, 5) = 5, urgency at "≤ 5 left") and
    // case 5's own boundary rows both say "low", and the shipped spotsState agrees. See the SUMMARY.
    expect(oc?.state).toBe("low");
  });

  it("3. gives the heads back the moment a PENDING hold lapses — no worker, no release code", async () => {
    // D-48a lazy expiry: nothing writes at the moment of expiry. The hold simply stops matching
    // `expires_at > now()` inside the SHARED occupying predicate (09-RESEARCH Pitfall 3), which is also why
    // this number can never be cached in a stored counter.
    await testDb.db.execute(sql`UPDATE booking SET expires_at = now() - interval '1 minute'
                                WHERE id = 'bk_pend_2'`);

    const oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(7); // the confirmed 3 still occupies; the lapsed 2 no longer does
    expect(oc?.state).toBe("open");
  });

  it("4. gives the heads back when a booking is CANCELLED (OC-15 needs no release code)", async () => {
    await testDb.db.execute(sql`UPDATE booking SET status = 'cancelled', expires_at = NULL
                                WHERE id = 'bk_conf_3'`);

    const oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(10);
    expect(oc?.state).toBe("open");
  });

  it("5. pins the low-stock boundary: remaining 4 and 5 are 'low', remaining 6 is 'open'", async () => {
    // threshold = clamp(floor(cap / 2), 1, 5) = 5 for cap 10, so urgency fires at "≤ 5 left" and NOT at 6.
    await occupy(6);
    let oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(4);
    expect(oc?.state).toBe("low");

    await occupy(5); // the inclusive edge of the band
    oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(5);
    expect(oc?.state).toBe("low");

    await occupy(4); // one head short of the band — urgency must stay silent
    oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(6);
    expect(oc?.state).toBe("open");
  });

  it("6. reports 'full' with remaining clamped at 0 when every admission is taken", async () => {
    await occupy(CAP);

    const oc = (await getAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity;
    expect(oc?.remaining).toBe(0);
    expect(oc?.state).toBe("full");
    expect(oc?.cap).toBe(10);
  });

  it("7. returns hasHours:false + openCapacity:null on a CLOSED weekday, still naming the mode", async () => {
    const avail = await getAvailability(testDb.db, L_OPEN, ANCHOR_NEXT, NOW);

    expect(avail.hasHours).toBe(false);
    expect(avail.openCapacity).toBeNull();
    // The UI must still know WHICH surface it is rendering on a closed date, or it falls back to an
    // exclusive empty state on a drop-in listing.
    expect(avail.occupancyMode).toBe("open_capacity");
    expect(avail.slots).toEqual([]);
  });

  it("8. leaves an EXCLUSIVE listing's payload untouched — a real hour grid, no open payload", async () => {
    const avail = await getAvailability(testDb.db, L_EXCL, ANCHOR, NOW);

    expect(avail.occupancyMode).toBe("exclusive");
    expect(avail.openCapacity).toBeNull();
    expect(avail.hasHours).toBe(true);
    expect(avail.slots).toHaveLength(3); // 06:00-09:00, three on-the-hour slots
    expect(avail.slots.every((s) => s.state === "available")).toBe(true);
    expect(avail.unitCount).toBe(2);
  });

  it("9. getOpenMonthAvailability returns exactly the QUERIED month's fully-booked dates", async () => {
    // Day 1 is fully booked and its opening instant falls in the PREVIOUS UTC month — the case the query's
    // widened bounds exist for. The previous month's last day is also fully booked and must NOT leak in.
    await insertOpenBooking({
      id: "bk_m_first",
      listingId: L_MONTH,
      bookerId: BOOKER_A,
      day: M_FULL_FIRST,
      heads: CAP,
      status: "confirmed",
      expires: NO_EXPIRY,
    });
    await insertOpenBooking({
      id: "bk_m_mid_a",
      listingId: L_MONTH,
      bookerId: BOOKER_A,
      day: M_FULL_MID,
      heads: 6,
      status: "confirmed",
      expires: NO_EXPIRY,
    });
    await insertOpenBooking({
      id: "bk_m_mid_b",
      listingId: L_MONTH,
      bookerId: BOOKER_B,
      day: M_FULL_MID,
      heads: 4, // two rows summing to the cap — the map is a SUM of heads, not a count of bookings
      // LIVE PENDING, not confirmed, on purpose: a month query that counted only confirmed rows would drop
      // this date from the map and let the calendar sell a date the counter has already filled.
      status: "pending",
      expires: LIVE,
    });
    await insertOpenBooking({
      id: "bk_m_partial",
      listingId: L_MONTH,
      bookerId: BOOKER_A,
      day: M_PARTIAL,
      heads: 3,
      status: "confirmed",
      expires: NO_EXPIRY,
    });
    await insertOpenBooking({
      id: "bk_m_partial_stale",
      listingId: L_MONTH,
      bookerId: BOOKER_B,
      day: M_PARTIAL,
      heads: 7, // would tip this date to exactly the cap IF a lapsed hold were still counted…
      status: "pending",
      expires: STALE, // …which D-48a says it is not. The date must stay selectable.
    });
    await insertOpenBooking({
      id: "bk_m_prev",
      listingId: L_MONTH,
      bookerId: BOOKER_A,
      day: M_PREV_MONTH_FULL,
      heads: CAP,
      status: "confirmed",
      expires: NO_EXPIRY,
    });

    const month = await getOpenMonthAvailability(testDb.db, L_MONTH, MONTH);

    expect(month.cap).toBe(10);
    expect(month.fullDates).toEqual([ymd(M_FULL_FIRST), ymd(M_FULL_MID)]);
    expect(month.fullDates).not.toContain(ymd(M_PARTIAL));
    expect(month.fullDates).not.toContain(ymd(M_PREV_MONTH_FULL));

    // An EXCLUSIVE listing has no admissions count to report — its month grid is driven by the hour grid.
    expect(await getOpenMonthAvailability(testDb.db, L_EXCL, MONTH)).toEqual({ cap: 0, fullDates: [] });
  });

  it("10. agrees with the CLAIM: after a real hold grants heads, remaining is cap − granted", async () => {
    // THE PITFALL-4 ASSERTION. The projection and createOpenCapacityHold count the same rows only because
    // they call the same openTakenSql. If a second predicate is ever inlined into either one, this is the
    // case that goes red — the calendar advertising a spot the counter refuses is the booker-visible
    // symptom, and it is a correctness failure, not a display bug.
    const before = await getAvailability(testDb.db, L_CLAIM, CLAIM_DAY, NOW);
    expect(before.openCapacity?.remaining).toBe(CAP);

    const result = await createOpenCapacityHold(testDb.db, {
      listingId: L_CLAIM,
      bookerId: CLAIMER,
      dayOpenUtc: openInstant(CLAIM_DAY),
      dayCloseUtc: closeInstant(CLAIM_DAY),
      ...dayBounds(CLAIM_DAY),
      requestedHeads: 4,
      idempotencyKey: null,
    });
    expect("ok" in result).toBe(true);
    const granted = "ok" in result ? result.granted : 0;
    expect(granted).toBe(4);

    const after = await getAvailability(testDb.db, L_CLAIM, CLAIM_DAY, NOW);
    expect(after.openCapacity?.remaining).toBe(CAP - granted);
    expect(after.openCapacity?.state).toBe("open"); // 6 left on cap 10 is above the threshold
  });

  it("11. sums two DIFFERENT starts_at values on ONE venue-local date into a single entry (CR-03)", async () => {
    // The `read-model.ts` half of CR-03. An operating-hours edit leaves already-sold passes on the OLD
    // opening instant while new ones are minted on the NEW one, so one venue-local date legitimately holds
    // rows with two different `starts_at`. Grouping on the stored instant produced TWO groups, each compared
    // against `cap` SEPARATELY — 4 and 6 on a cap of 10, neither reaching it — so the date never appeared
    // full and the calendar happily kept selling it. Grouping on the venue-local date makes `taken >= cap`
    // mean what it says.
    await insertOpenBooking({
      id: "bk_rekey_open6",
      listingId: L_REKEY,
      bookerId: BOOKER_A,
      day: M_FULL_MID,
      heads: 4,
      status: "confirmed",
      expires: NO_EXPIRY,
    });
    await insertOpenBooking({
      id: "bk_rekey_open7",
      listingId: L_REKEY,
      bookerId: BOOKER_B,
      day: M_FULL_MID,
      heads: 6, // 4 + 6 = 10 = CAP, but ONLY if the two instants are counted as one date
      status: "confirmed",
      expires: NO_EXPIRY,
      openHour: 7, // the venue-local 07:00 opening an hours edit produces
    });

    // The fixture's own precondition, asserted rather than assumed: two DISTINCT stored instants. Without
    // this the case could pass vacuously if openInstant ever stopped honouring its hour argument.
    const rows = (await testDb.db.execute(sql`
      SELECT DISTINCT starts_at FROM booking WHERE listing_id = ${L_REKEY}
    `)) as unknown as { starts_at: string | Date }[];
    expect(rows).toHaveLength(2);

    const month = await getOpenMonthAvailability(testDb.db, L_REKEY, MONTH);
    expect(month.cap).toBe(CAP);
    expect(month.fullDates).toEqual([ymd(M_FULL_MID)]);
  });
});
