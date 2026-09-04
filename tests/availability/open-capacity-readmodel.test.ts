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
//   - a SPLIT SHIFT past midnight → the pass covers the WHOLE envelope (12) and a SAME-DAY claim on it
//                                   mints a PAYABLE hold rather than one born expired (13) — WR-02.
//   - an unusable scarcity ceiling→ a mistyped OPEN_LOW_STOCK_MAX falls back to the documented default
//                                   instead of switching the "low" state off everywhere (14, WR-03).
//   - a NULL max_occupancy        → the month grid and the day panel FAIL CLOSED THE SAME WAY, asserted
//                                   together in ONE case (15, NT-02); a positive cap is untouched (16).
//
// ⚠️ EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal (the 09-03 lesson). The shipped claim
// refuses a date whose pass window has already closed and one beyond the 90-day horizon, so a hardcoded
// 2026 date would quietly turn case 10 into a PAST_DATE refusal the moment the calendar passed it — and the
// whole file would go green by vacuum.
//
// ── RECORDED MUTATION OUTPUT — see the block above case 12. ──────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, operatingHours } from "@/lib/db/schema";
import { getAvailability, getOpenMonthAvailability } from "@/lib/availability/read-model";
import { loadOpenDayWindow } from "@/lib/availability/open-capacity";
import { createOpenCapacityHold } from "@/lib/availability/units";

let testDb: TestDb;

const HOST = "oc_rm_host";
const BOOKER_A = "oc_rm_booker_a";
const BOOKER_B = "oc_rm_booker_b";
const CLAIMER = "oc_rm_claimer";
const SPLIT_CLAIMER = "oc_rm_split_claimer";

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
/** A venue-local wall-clock HOUR on a venue-local date → the UTC instant. Same plain +08 arithmetic as the
 *  two helpers above, so it stays an INDEPENDENT second opinion on the TZDate math under test rather than a
 *  re-run of it. Used by the split-shift case, whose hours are not the fixture's 06:00/22:00 pair. */
function localInstant(d: LocalDate, hour: number): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - MANILA_OFFSET_HOURS, 0, 0));
}
/** The NEXT venue-local calendar date (month/year roll over via Date math). */
function nextDate(d: LocalDate): LocalDate {
  return toLocalDate(new Date(Date.UTC(d.year, d.month - 1, d.day + 1, 12, 0, 0)));
}
/** The venue-local calendar date a UTC instant falls on. */
function venueDateOf(at: Date): LocalDate {
  return toLocalDate(new Date(at.getTime() + MANILA_OFFSET_HOURS * 60 * 60 * 1000));
}
/** Every venue-local `YYYY-MM-DD` in a month — what a listing with NO usable capacity must withdraw from
 *  sale (NT-02). The day count is a pure Gregorian fact (day 0 of the next month), so it needs no timezone. */
function allDatesOfMonth(m: { year: number; month: number }): string[] {
  const days = new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => ymd({ ...m, day: i + 1 }));
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
const L_SPLIT = "l_oc_rm_split"; // case 12 (a)+(b) — the split shift on a FUTURE date
const L_SPLIT_TODAY = "l_oc_rm_split_today"; // case 12 (c) — the same split shift on TODAY, for the claim
const L_ZEROCAP = "l_oc_rm_zerocap"; // cases 14 — max_occupancy NULL

// ── WR-02 fixture: the split shift whose evening session rolls past midnight. ────────────────────────────
// `MIN(open_time)` / `MAX(close_time)` compare WALL CLOCKS, and '12:00:00' sorts AFTER '02:00:00', so the
// SQL envelope collapsed to 06:00–12:00: the evening session vanished from the pass entirely.
const SPLIT_MORNING = { openTime: "06:00:00", closeTime: "12:00:00" };
const SPLIT_EVENING = { openTime: "18:00:00", closeTime: "02:00:00" }; // closes on the NEXT calendar day
// ~45 days out — inside the 90-day horizon and a different date from every other fixture's.
const SPLIT_DAY = toLocalDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000));
// 15:00 venue-local on that date: AFTER the truncated envelope's noon, BEFORE the real 02:00 close. This is
// the injected display clock, so it is deterministic at whatever hour the suite happens to run.
const SPLIT_AFTERNOON = localInstant(SPLIT_DAY, 15);
// The claim half must be TODAY. `expires_at = LEAST(now() + TTL, ends_at)` only mints a dead hold when
// `ends_at` is behind the REAL clock, and on a future date even the truncated noon is still ahead of it —
// which is precisely why a window-only assertion would have missed the unpayable-hold half of WR-02.
const SPLIT_TODAY = venueDateOf(NOW);

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
    [HOST, BOOKER_A, BOOKER_B, CLAIMER, SPLIT_CLAIMER].map((id) => ({
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
    openListing(L_SPLIT, CAP),
    openListing(L_SPLIT_TODAY, CAP),
    // The NT-02 fixture: a drop-in listing whose daily admissions cap is NULL — the shape a mis-configured
    // or mid-edit listing genuinely has, since the wizard's occupancy step can land before its cap is set.
    { ...openListing(L_ZEROCAP, CAP), maxOccupancy: null },
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
    // TWO rows on ONE weekday — legal by design (D-25), and the shape WR-02 collapses. Seeded in
    // close-time-descending order so the case cannot pass merely because the driver happened to return the
    // overnight row last.
    { id: "oh_oc_split_pm", listingId: L_SPLIT, dayOfWeek: dowOf(SPLIT_DAY), ...SPLIT_MORNING },
    { id: "oh_oc_split_am", listingId: L_SPLIT, dayOfWeek: dowOf(SPLIT_DAY), ...SPLIT_EVENING },
    {
      id: "oh_oc_split_today_pm",
      listingId: L_SPLIT_TODAY,
      dayOfWeek: dowOf(SPLIT_TODAY),
      ...SPLIT_MORNING,
    },
    {
      id: "oh_oc_split_today_am",
      listingId: L_SPLIT_TODAY,
      dayOfWeek: dowOf(SPLIT_TODAY),
      ...SPLIT_EVENING,
    },
    // The NULL-cap listing is OPEN on the sampled date's weekday: the whole point of NT-02 is that the day
    // panel has real hours, computes remaining = 0 and says "Fully booked" — while the month grid, seeing no
    // booking rows at all, left the very same date selectable.
    {
      id: "oh_oc_zerocap",
      listingId: L_ZEROCAP,
      dayOfWeek: dowOf(ANCHOR),
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

  // ══ RECORDED MUTATION OUTPUT — cases 12-15 against the PRE-FIX source (branch A) ═══════════════════════
  //
  // These four cases were written FIRST and run against unchanged `src/`. The pre-fix source IS the state
  // the plan's mandated WR-02 mutation asks for ("restore the SQL min()/max() envelope"), so this run is
  // that mutation, recorded verbatim rather than re-staged after the fact. Case 16 — the positive-cap
  // control — stayed GREEN throughout, which is what makes case 15's red attributable to the cap branch
  // rather than to the month grid breaking outright.
  //
  //   Tests  4 failed | 12 passed (16)
  //
  // [1/4] 12. covers the WHOLE envelope of a split shift that rolls past midnight (WR-02)
  //   AssertionError: expected '2026-09-14T04:00:00.000Z' to be '2026-09-14T18:00:00.000Z' // Object.is equality
  //   Expected: "2026-09-14T18:00:00.000Z"
  //   Received: "2026-09-14T04:00:00.000Z"
  //   ❯ tests/availability/open-capacity-readmodel.test.ts:597:44
  //     → the truncated envelope, exactly: 04:00Z is venue-local NOON on the picked date, where the
  //       venue-local 02:00 of the NEXT day (18:00Z) was expected. The evening session is simply gone.
  //
  // [2/4] 13. mints a PAYABLE hold on a same-day split shift — not one born expired (WR-02)
  //   AssertionError: expected '2026-08-01T04:00:00.000Z' to be '2026-08-01T18:00:00.000Z' // Object.is equality
  //   Expected: "2026-08-01T18:00:00.000Z"
  //   Received: "2026-08-01T04:00:00.000Z"
  //   ❯ tests/availability/open-capacity-readmodel.test.ts:653:53
  //     → THE PERSISTED `ends_at` of a real hold minted by the real claim: venue-local noon, on a day the
  //       venue is open until 2 AM. Note WHICH assertion went red and which did not. `still_live` PASSED
  //       under the defect, because this run happened at ~03:00 venue-local and `LEAST(now() + 15min,
  //       today-noon)` is still in the future at 3 AM. The dead-hold symptom is HOUR-DEPENDENT; the
  //       truncated `ends_at` that causes it is not. A case asserting only the expiry would therefore have
  //       gone GREEN over a live defect for the first half of every day — which is exactly why this case
  //       asserts the persisted envelope as well as the persisted expiry.
  //
  // [3/4] 14. falls back to the documented ceiling when OPEN_LOW_STOCK_MAX is unusable (WR-03)
  //   AssertionError: expected 'open' to be 'low' // Object.is equality
  //   Expected: "low"
  //   Received: "open"
  //   ❯ tests/availability/open-capacity-readmodel.test.ts:674:34
  //     → 3 of 10 spots left reported as "open". `Number("five")` is NaN, `remaining <= NaN` is false, so
  //       the urgency band can never be entered and the figure is never disclosed on ANY listing.
  //
  // [4/4] 15. offers NO date at all when the cap is unusable — grid and panel agree (NT-02)
  //   AssertionError: expected [] to deeply equal [ '2026-08-01', '2026-08-02', …(29) ]
  //   - Expected
  //   + Received
  //   - [
  //   -   "2026-08-01",
  //   -   "2026-08-02",
  //   -   "2026-08-03",
  //   -   …(the month's remaining 27 dates, 27 identically-shaped lines, elided here for length; the full
  //   -     untouched dump is in 09-24-SUMMARY.md. Nothing describing the failure is elided.)
  //   -   "2026-08-31",
  //   - ]
  //   + []
  //   ❯ tests/availability/open-capacity-readmodel.test.ts:699:29
  //     → the grid offered EVERY date of the month on a listing whose day panel refuses all of them. The
  //       empty set is not "nothing is full", it is "nothing was asked" — no booking rows, so no group rows,
  //       so no date could ever reach `taken >= cap`.
  // ══════════════════════════════════════════════════════════════════════════════════════════════════════
  it("12. covers the WHOLE envelope of a split shift that rolls past midnight (WR-02)", async () => {
    // (a) THE WINDOW. Two operating-hours rows on one weekday — 06:00–12:00 and 18:00–02:00 — is a legal
    // split shift (D-25). Reducing them with `MIN(open_time)` / `MAX(close_time)` compares WALL CLOCKS, and
    // no wall clock can order 02:00 AFTER 12:00, so the envelope collapsed to 06:00–12:00 and the evening
    // session simply disappeared from the pass. The envelope has to be reduced over real INSTANTS.
    const win = await loadOpenDayWindow(testDb.db, L_SPLIT, SPLIT_DAY);
    expect(win).not.toBeNull();
    expect(win?.dayOpenUtc.toISOString()).toBe(localInstant(SPLIT_DAY, 6).toISOString());
    // The assertion a wall-clock MAX cannot satisfy: the closing instant belongs to the NEXT calendar day.
    expect(win?.dayCloseUtc.toISOString()).toBe(localInstant(nextDate(SPLIT_DAY), 2).toISOString());
    // The "Open 6:00 AM – 2:00 AM" line must describe the envelope the pass actually covers, so the display
    // strings come from the rows that WON the reduction — the earliest opener and the latest closer.
    expect(win?.openTime).toBe("06:00:00");
    expect(win?.closeTime).toBe("02:00:00");
    // …and the CR-03 counter anchor is NOT dragged along by the overnight envelope (09-18): an overnight
    // day still counts against the venue-local date it OPENED on, so the lock key and the counted range are
    // exactly one calendar day. A reader who "fixed" this to follow the envelope would re-open CR-03.
    expect(win?.dateKey).toBe(ymd(SPLIT_DAY));
    expect(win!.dayStartUtc.toISOString()).toBe(dayBounds(SPLIT_DAY).dayStartUtc.toISOString());
    expect(win!.dayEndUtc.getTime() - win!.dayStartUtc.getTime()).toBe(24 * 60 * 60 * 1000);

    // (b) THE DAY PANEL at 15:00 venue-local — between the two shifts, and PAST the truncated noon. The
    // display clock is injected, so this half is deterministic at whatever hour the suite runs.
    const avail = await getAvailability(testDb.db, L_SPLIT, SPLIT_DAY, SPLIT_AFTERNOON);
    expect(avail.hasHours).toBe(true);
    expect(avail.openCapacity?.bookable).toBe(true);
    expect(avail.openCapacity?.closeTime).toBe("02:00:00");
    expect(avail.openCapacity?.dayCloseUtc).toBe(localInstant(nextDate(SPLIT_DAY), 2).toISOString());
    expect(avail.openCapacity?.remaining).toBe(CAP);
  });

  it("13. mints a PAYABLE hold on a same-day split shift — not one born expired (WR-02)", async () => {
    // THE UNPAYABLE-HOLD HALF, in its own case so its failure is attributable rather than hidden behind
    // case 12's first assertion. This is why WR-02 is the CR-01 shape reached by another route:
    // `expires_at = LEAST(now() + TTL, ends_at)`, so a truncated envelope on a SAME-DAY claim mints a hold
    // that is born already expired and can never reach checkout.
    //
    // TODAY, not a future date: on a future date even the truncated noon is still ahead of the real clock,
    // so the dead hold cannot form and a future-dated case would go green over a live defect.
    //
    // The claim re-derives its window through the REAL loadOpenDayWindow, exactly as placeOpenHold does, so
    // a truncated envelope flows all the way into the persisted row rather than stopping at the projection.
    const todayWin = await loadOpenDayWindow(testDb.db, L_SPLIT_TODAY, SPLIT_TODAY);
    expect(todayWin).not.toBeNull();
    const claim = await createOpenCapacityHold(testDb.db, {
      listingId: L_SPLIT_TODAY,
      bookerId: SPLIT_CLAIMER,
      dayOpenUtc: todayWin!.dayOpenUtc,
      dayCloseUtc: todayWin!.dayCloseUtc,
      dayStartUtc: todayWin!.dayStartUtc,
      dayEndUtc: todayWin!.dayEndUtc,
      dateKey: todayWin!.dateKey,
      requestedHeads: 1,
      idempotencyKey: null,
    });
    expect("ok" in claim).toBe(true);

    // PERSISTED STATE, read back and compared against the DB's OWN clock — the clock that wrote the row.
    // A JS comparison here would be testing the test's clock, not the hold's.
    const held = (await testDb.db.execute(sql`
      SELECT ends_at, (expires_at > now()) AS still_live
      FROM booking WHERE id = ${"ok" in claim ? claim.id : ""}
    `)) as unknown as { ends_at: string | Date; still_live: boolean }[];
    expect(held).toHaveLength(1);
    expect(held[0].still_live).toBe(true); // a hold born already expired IS the finding
    expect(new Date(held[0].ends_at).toISOString()).toBe(
      localInstant(nextDate(SPLIT_TODAY), 2).toISOString(),
    );
  });

  it("14. falls back to the documented ceiling when OPEN_LOW_STOCK_MAX is unusable (WR-03)", async () => {
    // `Number("five")` is NaN; `Math.min(x, NaN)` is NaN; `remaining <= NaN` is ALWAYS false. So one typo in
    // a server-only env var made spotsState skip "low" on EVERY listing and the exact figure was never
    // disclosed anywhere — the OPEN-04 scarcity signal silently off, with nothing to see in the UI.
    //
    // Driven through the PUBLIC functions and the shipped read model rather than by reading the constant:
    // the constant is not what a booker sees, and a test that asserts on it would still pass if the
    // fallback never reached spotsState. Module re-import under stubEnv is the repo's existing idiom for a
    // server-only constant (tests/auth/secret-config.test.ts, tests/auth/email-dev-fallback.test.ts).
    vi.stubEnv("OPEN_LOW_STOCK_MAX", "five");
    vi.resetModules();
    const { spotsState } = await import("@/lib/availability/open-capacity");
    const { getAvailability: freshGetAvailability } = await import("@/lib/availability/read-model");
    try {
      // The ACCEPTED-DESIGN formula is untouched: clamp(floor(10 / 2), 1, 5) = 5 once the default ceiling
      // is restored, so 3 left on a cap of 10 is inside the urgency band and 8 is above it.
      expect(spotsState(3, CAP)).toBe("low");
      expect(spotsState(8, CAP)).toBe("open");

      await occupy(7); // 10 − 7 = 3 left
      expect((await freshGetAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity?.state).toBe(
        "low",
      );
      await occupy(2); // 8 left — the band must stay silent
      expect((await freshGetAvailability(testDb.db, L_OPEN, ANCHOR, NOW)).openCapacity?.state).toBe(
        "open",
      );
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("15. offers NO date at all when the cap is unusable — grid and panel agree (NT-02)", async () => {
    // THE INVARIANT, asserted as an AGREEMENT rather than as two separate facts: the month grid and the day
    // panel must fail closed THE SAME WAY. getOpenDay has always computed remaining = 0 for a NULL cap (the
    // identical choice createOpenCapacityHold makes), but getOpenMonthAvailability marked a date full only
    // when `taken >= cap` — and with cap 0 a date carrying NO bookings produces no row at all, so every date
    // stayed selectable. Checking either projection ALONE passes; only comparing them catches this.
    const month = await getOpenMonthAvailability(testDb.db, L_ZEROCAP, MONTH);
    expect(month.cap).toBe(0);
    expect(month.fullDates).toEqual(allDatesOfMonth(MONTH));

    // The SAMPLED date, taken from the very set the grid just reported, put to the panel the booker would
    // land on after clicking it. The two answers are compared in ONE case, on ONE date, deliberately.
    expect(month.fullDates).toContain(ymd(ANCHOR));
    const day = await getAvailability(testDb.db, L_ZEROCAP, ANCHOR, NOW);
    expect(day.hasHours).toBe(true); // the venue IS open — this is a capacity fact, not an hours fact
    expect(day.openCapacity?.remaining).toBe(0);
    expect(day.openCapacity?.state).toBe("full");
    // …and `bookable` is deliberately NOT asserted false here. It is the server's PAST-DATE / HORIZON
    // verdict about the window, not a verdict about capacity — a genuinely saturated date carries
    // `bookable: true` too (case 6), and the CTA is gated by BOTH: date-pass-picker.tsx:216 requires
    // `oc.bookable && oc.state !== "full"`. Asserting it false would demand that the two facts be merged,
    // which is the opposite of what this phase keeps learning.
    expect(day.openCapacity?.cap).toBe(0);
  });

  it("16. leaves a listing with a POSITIVE cap untouched — only saturated dates are withdrawn", async () => {
    // The control for case 15: failing closed on an unusable cap must not turn into failing closed on a
    // healthy one. L_MONTH's rows are case 9's, so this re-asserts the exact same expectation from the
    // other side of the new branch.
    const month = await getOpenMonthAvailability(testDb.db, L_MONTH, MONTH);
    expect(month.cap).toBe(CAP);
    expect(month.fullDates).toEqual([ymd(M_FULL_FIRST), ymd(M_FULL_MID)]);
    expect(month.fullDates).not.toEqual(allDatesOfMonth(MONTH));
  });
});
