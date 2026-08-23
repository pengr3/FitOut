// The host dashboard agenda's DAY BOUNDARY, against real Postgres (HFLOW-03 · 14-CONTEXT D-140/141/142).
//
// WHY THIS FILE EXISTS, AND WHAT SILENT FAILURE IT CATCHES.
//
// A host whose venues span two timezones has TWO "todays". At 00:30 in Manila it is still yesterday
// afternoon in Los Angeles, so one instant resolves to two different calendar dates depending on which
// venue you ask. A "today" predicate that compares dates in UTC — or in the server's locale, or against a
// date computed once in JavaScript — gets one of those venues wrong. It does so:
//
//   * silently — no error, no empty page, just a session missing from the agenda or a finished one still
//     sitting on it;
//   * for SOME hosts only — the ones whose venue zone is far from the server's;
//   * for PART of the day only — the hours between the two venues' midnights.
//
// That is a defect nobody reports and nobody reviews their way to. It is also the exact failure D-141 was
// written to forbid ("the day-boundary question is a planning question, and the answer must be written down
// and tested"). So the answer is written down in `queryHostAgenda`'s docblock, and this file is the
// executable half of it.
//
// ⚠️ EVERY FIXTURE INSTANT IS CLOCK-RELATIVE, never a calendar literal — the 09-03 rule, inherited from
// tests/availability/hours-lock.test.ts:19-22, and doubly load-bearing here. A hardcoded date would pin the
// two-zone case to whatever DST offsets happened to hold the day it was typed, and the whole file would go
// green by vacuum the moment the calendar moved past it. Every instant below is derived by asking POSTGRES
// for an offset from a named venue's own local midnight, so the fixture is reconstructed on every run, in
// the zone that owns it, by the same engine that will evaluate the predicate.
//
// DISCIPLINE, from the same analog: THE PERSISTED ROWS ARE ASSERTED FIRST AND THE QUERY RESULT SECOND. A
// fixture that failed to straddle midnight would let a UTC comparison pass as a venue-local one, so case 1
// proves the two venues really are on different local days BEFORE it asks what the agenda returns.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION — EXECUTED, not merely described. The venue-local comparison in
// src/lib/booking/bookings-query.ts was replaced with the wrong rule the whole file exists to reject —
// both sides projected into UTC instead of into the joined listing's own timezone:
//
//     AND (b.starts_at AT TIME ZONE 'UTC')::date = (${nowIso}::timestamptz AT TIME ZONE 'UTC')::date
//
// Observed output, VERBATIM — the OBSERVED set, not the predicted one (09-18's lesson):
//
//    ❯ tests/booking/agenda-query.test.ts (15 tests | 2 failed) 815ms
//         × 1 · a far-east venue whose local day has already rolled over is NOT on today's agenda, and a
//           far-west venue's session at the very same instant IS 13ms
//         × 4 · cancelled and declined are absent; pending, requested, approved and confirmed are present 5ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/booking/agenda-query.test.ts > D-141 — "today" is the VENUE's local day, not the server's
//    > 1 · a far-east venue whose local day has already rolled over is NOT on today's agenda, and a
//    far-west venue's session at the very same instant IS
//   AssertionError: expected [ 'ag_bk_east', 'ag_bk_west' ] to deeply equal [ 'ag_bk_west' ]
//
//   - Expected
//   + Received
//
//     [
//   +   "ag_bk_east",
//       "ag_bk_west",
//     ]
//
//    FAIL  … > 4 · cancelled and declined are absent; pending, requested, approved and confirmed are present
//   AssertionError: expected [ 'ag_bk_approved', 'ag_bk_confirmed' ] to deeply equal [ 'ag_bk_pending', …(3) ]
//
//   - Expected
//   + Received
//
//     [
//   -   "ag_bk_pending",
//   -   "ag_bk_requested",
//       "ag_bk_approved",
//       "ag_bk_confirmed",
//     ]
//
// THE FAR-EAST SESSION THAT FINISHED LAST NIGHT IS BACK ON TODAY'S AGENDA. A Manila host opening /host at
// 00:30 would be shown a session that ended two hours ago as though someone were about to walk in.
//
// TWO cases went red where the plan predicted one, and the second is the finding. Case 4's six sessions are
// seeded at Manila 06:00–11:00, which is 22:00–03:00 UTC — so under the UTC rule the day boundary falls
// THROUGH THE MIDDLE OF ONE VENUE'S BUSINESS DAY and the two earliest sessions drop off the agenda
// entirely. That is the same defect as case 1 wearing different clothes, and it means the wrong rule does
// not merely mis-order a two-timezone edge case: it silently truncates the morning of an ordinary
// single-venue host in any zone east of UTC. Nothing about that surface would look broken.
//
// Restored → 15/15 green → `git diff --exit-code src/` printed nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import {
  queryHostAgenda,
  readDbNow,
  isoUtc,
  type BookingListRow,
} from "@/lib/booking/bookings-query";

let testDb: TestDb;

/** A far-east zone with no DST, and a far-west zone that has it — the pair D-141 names. */
const EAST_ZONE = "Asia/Manila";
const WEST_ZONE = "America/Los_Angeles";

const BOOKER = "ag_booker";

// One host per case, each with its own listings, so every assertion can be an EXACT SET rather than a
// membership probe. A shared host would make case 1's "the agenda contains exactly this" untestable the
// moment case 2 seeded another session on the same local day, and a membership probe is a strictly weaker
// claim than a set equality — it cannot notice a row that should not be there.
const HOST_ZONE = "ag_host_zone"; // case 1 — the two-zone straddling-midnight falsifying fixture
const HOST_DAY = "ag_host_day"; // case 2 — the same-zone control
const HOST_MIDNIGHT = "ag_host_midnight"; // case 3 — starts_at, not ends_at
const HOST_STATUS = "ag_host_status"; // case 4 — the status set
const HOST_INERT = "ag_host_inert"; // case 4 — a future session that is only cancelled
const HOST_NEXT = "ag_host_next"; // case 5 — D-142's next bucket
const HOST_EMPTY = "ag_host_empty"; // case 5 — a host with a listing and no bookings

const L_EAST = "ag_l_east";
const L_WEST = "ag_l_west";
const L_DAY = "ag_l_day";
const L_MIDNIGHT = "ag_l_midnight";
const L_STATUS = "ag_l_status";
const L_INERT = "ag_l_inert";
const L_NEXT = "ag_l_next";
const L_EMPTY = "ag_l_empty";

const B_EAST = "ag_bk_east";
const B_WEST = "ag_bk_west";
const B_EARLY = "ag_bk_early";
const B_LATE = "ag_bk_late";
const B_YESTERDAY = "ag_bk_yesterday";
const B_TOMORROW = "ag_bk_tomorrow";
const B_STRADDLE = "ag_bk_straddle";
const B_INERT = "ag_bk_inert";
const B_SOON = "ag_bk_soon";
const B_LATER = "ag_bk_later";

// Clocks and instants, all resolved from the DB in beforeAll (see venueInstant).
let CLOCK_EAST_JUST_PAST_MIDNIGHT: Date;
let SHARED_SESSION_INSTANT: Date;
let CLOCK_EAST_MIDDAY: Date;
let CLOCK_EAST_MIDDAY_TOMORROW: Date;

const ids = (rows: BookingListRow[]) => rows.map((r) => r.id);

/**
 * THE fixture primitive: an absolute instant expressed as an offset from a NAMED VENUE'S OWN local
 * midnight, computed by Postgres.
 *
 * `date_trunc('day', now() AT TIME ZONE $zone)` is that venue's midnight today as a naive local timestamp;
 * adding an interval walks local wall-clock time; the trailing `AT TIME ZONE $zone` turns the wall time back
 * into the instant it names. So `venueInstant(EAST_ZONE, '-2 hours')` is "22:00 yesterday in Manila",
 * whatever today's date and whatever this machine's locale — which is the only way to write a midnight-
 * straddling fixture that is still a midnight-straddling fixture tomorrow.
 *
 * The ISO hydration reuses `isoUtc`, the module's single timestamp-boundary mask, so the test cannot drift
 * from the code on the one conversion both depend on.
 */
async function venueInstant(zone: string, offsetFromLocalMidnight: string): Promise<Date> {
  const [row] = (await testDb.db.execute(sql`
    SELECT ${isoUtc("i")} AS "iso"
    FROM (
      SELECT (date_trunc('day', now() AT TIME ZONE ${zone}::text) + ${offsetFromLocalMidnight}::interval)
             AT TIME ZONE ${zone}::text AS i
    ) s
  `)) as unknown as { iso: string }[];
  return new Date(row.iso);
}

/** The venue-local calendar date of a PERSISTED booking's start, read back from the row itself. */
async function persistedVenueLocalDate(bookingId: string): Promise<string> {
  const [row] = (await testDb.db.execute(sql`
    SELECT to_char((b.starts_at AT TIME ZONE l.timezone)::date, 'YYYY-MM-DD') AS "localDate"
    FROM booking b
    INNER JOIN listing l ON l.id = b.listing_id
    WHERE b.id = ${bookingId}
  `)) as unknown as { localDate: string }[];
  return row.localDate;
}

/** The venue-local calendar date a given clock instant falls on, in a given zone. */
async function clockVenueLocalDate(zone: string, at: Date): Promise<string> {
  const [row] = (await testDb.db.execute(sql`
    SELECT to_char((${at.toISOString()}::timestamptz AT TIME ZONE ${zone}::text)::date, 'YYYY-MM-DD')
      AS "localDate"
  `)) as unknown as { localDate: string }[];
  return row.localDate;
}

/** The PERSISTED start instant, so "these two bookings share one instant" is a claim about the rows. */
async function persistedStartIso(bookingId: string): Promise<string> {
  const [row] = (await testDb.db.execute(sql`
    SELECT ${isoUtc("b.starts_at")} AS "iso" FROM booking b WHERE b.id = ${bookingId}
  `)) as unknown as { iso: string }[];
  return row.iso;
}

type SeedStatus = "pending" | "requested" | "approved" | "confirmed" | "cancelled" | "declined";

async function seedBooking(opts: {
  id: string;
  listingId: string;
  startsAt: Date;
  endsAt: Date;
  status?: SeedStatus;
}): Promise<void> {
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: opts.listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt: opts.startsAt,
    endsAt: opts.endsAt,
    status: opts.status ?? "confirmed",
    quotedTotalCents: 5000,
    currency: "php",
  });
}

/** `venueInstant` + a duration, for the common "one-hour session starting at local HH:00" fixture. */
async function hourSession(zone: string, offsetFromLocalMidnight: string, hours = 1) {
  const startsAt = await venueInstant(zone, offsetFromLocalMidnight);
  const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
  return { startsAt, endsAt };
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: BOOKER, name: "Agenda Booker", email: "ag_booker@example.com", firstName: "Bea", emailVerified: true },
    { id: HOST_ZONE, name: "Zone Host", email: "ag_zone@example.com", firstName: "Zoe", emailVerified: true },
    { id: HOST_DAY, name: "Day Host", email: "ag_day@example.com", firstName: "Dee", emailVerified: true },
    { id: HOST_MIDNIGHT, name: "Midnight Host", email: "ag_mid@example.com", firstName: "Mia", emailVerified: true },
    { id: HOST_STATUS, name: "Status Host", email: "ag_status@example.com", firstName: "Sam", emailVerified: true },
    { id: HOST_INERT, name: "Inert Host", email: "ag_inert@example.com", firstName: "Ivy", emailVerified: true },
    { id: HOST_NEXT, name: "Next Host", email: "ag_next@example.com", firstName: "Noa", emailVerified: true },
    { id: HOST_EMPTY, name: "Empty Host", email: "ag_empty@example.com", firstName: "Eli", emailVerified: true },
  ]);

  const space = (id: string, hostId: string, timezone: string, city: string) => ({
    id,
    hostId,
    title: `${city} Space`,
    status: "published" as const,
    unitCount: 1,
    timezone,
    city,
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });

  await testDb.db.insert(listing).values([
    space(L_EAST, HOST_ZONE, EAST_ZONE, "Makati"),
    space(L_WEST, HOST_ZONE, WEST_ZONE, "Los Angeles"),
    space(L_DAY, HOST_DAY, EAST_ZONE, "Cebu"),
    space(L_MIDNIGHT, HOST_MIDNIGHT, EAST_ZONE, "Davao"),
    space(L_STATUS, HOST_STATUS, EAST_ZONE, "Pasig"),
    space(L_INERT, HOST_INERT, EAST_ZONE, "Taguig"),
    space(L_NEXT, HOST_NEXT, EAST_ZONE, "Quezon City"),
    space(L_EMPTY, HOST_EMPTY, EAST_ZONE, "Iloilo"),
  ]);

  // ── Case 1 · the two-zone straddling-midnight fixture ────────────────────────────────────────────
  //
  // One instant, two venues. The clock sits ONE HOUR PAST midnight in the far-east zone, and the session
  // sits TWO HOURS BEFORE it — i.e. late yesterday evening in the east. Three hours apart, with the east
  // venue's midnight in between and both instants comfortably inside a single far-west local day (that
  // window lands mid-morning in Los Angeles under either PST or PDT, nowhere near its own midnight).
  //
  // Consequently: east says "yesterday", west says "today", from the SAME instant. The far-west session is
  // seeded on the far-west listing at that same instant, so nothing but the venue's own zone can separate
  // the two rows — not the time, not the host, not the status.
  CLOCK_EAST_JUST_PAST_MIDNIGHT = await venueInstant(EAST_ZONE, "1 hour");
  SHARED_SESSION_INSTANT = await venueInstant(EAST_ZONE, "-2 hours");
  const sharedEnd = new Date(SHARED_SESSION_INSTANT.getTime() + 60 * 60 * 1000);
  await seedBooking({ id: B_EAST, listingId: L_EAST, startsAt: SHARED_SESSION_INSTANT, endsAt: sharedEnd });
  await seedBooking({ id: B_WEST, listingId: L_WEST, startsAt: SHARED_SESSION_INSTANT, endsAt: sharedEnd });

  // ── Case 2 · the same-zone control ───────────────────────────────────────────────────────────────
  CLOCK_EAST_MIDDAY = await venueInstant(EAST_ZONE, "12 hours");
  CLOCK_EAST_MIDDAY_TOMORROW = await venueInstant(EAST_ZONE, "1 day 12 hours");
  await seedBooking({ id: B_EARLY, listingId: L_DAY, ...(await hourSession(EAST_ZONE, "8 hours")) });
  await seedBooking({ id: B_LATE, listingId: L_DAY, ...(await hourSession(EAST_ZONE, "20 hours")) });
  await seedBooking({ id: B_YESTERDAY, listingId: L_DAY, ...(await hourSession(EAST_ZONE, "-4 hours")) });
  await seedBooking({ id: B_TOMORROW, listingId: L_DAY, ...(await hourSession(EAST_ZONE, "1 day 8 hours")) });

  // ── Case 3 · starts_at, not ends_at ──────────────────────────────────────────────────────────────
  // 23:00 today → 01:00 tomorrow, venue-local. Its window straddles the venue's own midnight, so the two
  // candidate rules disagree about it by construction.
  await seedBooking({
    id: B_STRADDLE,
    listingId: L_MIDNIGHT,
    ...(await hourSession(EAST_ZONE, "23 hours", 2)),
  });

  // ── Case 4 · the status set ──────────────────────────────────────────────────────────────────────
  // Six sessions on one venue-local day, one per status, on distinct non-overlapping hours so the four
  // OCCUPYING statuses (pending/requested/approved/confirmed) do not collide on booking_no_overlap.
  const statusFixture: Array<{ status: SeedStatus; hour: number }> = [
    { status: "pending", hour: 6 },
    { status: "requested", hour: 7 },
    { status: "approved", hour: 8 },
    { status: "confirmed", hour: 9 },
    { status: "cancelled", hour: 10 },
    { status: "declined", hour: 11 },
  ];
  for (const { status, hour } of statusFixture) {
    await seedBooking({
      id: `ag_bk_${status}`,
      listingId: L_STATUS,
      status,
      ...(await hourSession(EAST_ZONE, `${hour} hours`)),
    });
  }

  // A host whose ONLY future session is cancelled — the next bucket's half of the status claim.
  await seedBooking({
    id: B_INERT,
    listingId: L_INERT,
    status: "cancelled",
    ...(await hourSession(EAST_ZONE, "3 days 9 hours")),
  });

  // ── Case 5 · D-142's next bucket ─────────────────────────────────────────────────────────────────
  await seedBooking({ id: B_SOON, listingId: L_NEXT, ...(await hourSession(EAST_ZONE, "3 days 9 hours")) });
  await seedBooking({ id: B_LATER, listingId: L_NEXT, ...(await hourSession(EAST_ZONE, "5 days 9 hours")) });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe('D-141 — "today" is the VENUE\'s local day, not the server\'s', () => {
  it("1b · the two venues disagree about the day, which is the whole point", async () => {
    // THE FIXTURE IS ASSERTED FIRST. If these four facts did not hold, a UTC comparison would pass case 1
    // as though it were a venue-local one, and the file would prove nothing.
    const eastLocalDate = await persistedVenueLocalDate(B_EAST);
    const westLocalDate = await persistedVenueLocalDate(B_WEST);
    const eastToday = await clockVenueLocalDate(EAST_ZONE, CLOCK_EAST_JUST_PAST_MIDNIGHT);
    const westToday = await clockVenueLocalDate(WEST_ZONE, CLOCK_EAST_JUST_PAST_MIDNIGHT);

    // (i) The two bookings really are at ONE instant — the zone is the only thing separating them.
    expect(await persistedStartIso(B_EAST)).toBe(await persistedStartIso(B_WEST));
    // (ii) The far-east venue has already rolled over: its session is on the PREVIOUS local day.
    expect(eastLocalDate).not.toBe(eastToday);
    // (iii) The far-west venue has not: its session is on the CURRENT local day.
    expect(westLocalDate).toBe(westToday);
    // (iv) And the two venues' "today" are genuinely different dates from the same instant.
    expect(eastToday).not.toBe(westToday);
  });

  it("1 · a far-east venue whose local day has already rolled over is NOT on today's agenda, and a far-west venue's session at the very same instant IS", async () => {
    const agenda = await queryHostAgenda(testDb.db, {
      hostId: HOST_ZONE,
      now: CLOCK_EAST_JUST_PAST_MIDNIGHT,
    });

    expect(ids(agenda.today)).toEqual([B_WEST]);
    expect(ids(agenda.today)).not.toContain(B_EAST);
  });
});

describe("D-141 — the same-zone control", () => {
  it("2 · earlier today and later today are both on the agenda; yesterday and tomorrow are not", async () => {
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_DAY, now: CLOCK_EAST_MIDDAY });

    // Soonest first — the SQL ORDER BY, not a re-sort here.
    expect(ids(agenda.today)).toEqual([B_EARLY, B_LATE]);
    expect(ids(agenda.today)).not.toContain(B_YESTERDAY);
    expect(ids(agenda.today)).not.toContain(B_TOMORROW);
  });

  it("2b · the projection is the shipped host row shape, untrimmed", async () => {
    // `composeWhenLabelShort` takes fullDay and openCapacity as REQUIRED fields so tsc enumerates every
    // projection; asserting the hydrated row here catches the case where the columns are present in the
    // type but were never selected — which tsc cannot see through the `as unknown as` boundary.
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_DAY, now: CLOCK_EAST_MIDDAY });
    const row = agenda.today[0];

    expect(row.startsAt).toBeInstanceOf(Date);
    expect(row.endsAt).toBeInstanceOf(Date);
    expect(row.timezone).toBe(EAST_ZONE);
    expect(row.city).toBe("Cebu");
    expect(row.listingId).toBe(L_DAY);
    expect(row.listingTitle).toBe("Cebu Space");
    expect(row.bookerFirstName).toBe("Bea");
    expect(row.quotedTotalCents).toBe(5000);
    expect(row.currency).toBe("php");
    expect(row.openCapacity).toBe(false);
    expect(row.fullDay).toBeNull();
    expect(row.status).toBe("confirmed");
    // The payout LEFT JOIN is present and correctly scoped: no payout row exists, so this is null rather
    // than absent (T-07-33 — an unscoped join would surface a debit row here).
    expect(row.payoutState ?? null).toBeNull();
  });

  it("2c · the day is the VENUE's, so tomorrow's agenda is tomorrow's rows", async () => {
    const agenda = await queryHostAgenda(testDb.db, {
      hostId: HOST_DAY,
      now: CLOCK_EAST_MIDDAY_TOMORROW,
    });

    expect(ids(agenda.today)).toEqual([B_TOMORROW]);
  });
});

describe("D-141 — starts_at, not ends_at, decides the day", () => {
  it("3 · a session that begins before venue-local midnight belongs to the day it BEGINS", async () => {
    const onTheDayItStarts = await queryHostAgenda(testDb.db, {
      hostId: HOST_MIDNIGHT,
      now: CLOCK_EAST_MIDDAY,
    });
    expect(ids(onTheDayItStarts.today)).toEqual([B_STRADDLE]);
  });

  it("3b · …and not to the day it ENDS, even though its window runs into it", async () => {
    const onTheDayItEnds = await queryHostAgenda(testDb.db, {
      hostId: HOST_MIDNIGHT,
      now: CLOCK_EAST_MIDDAY_TOMORROW,
    });
    // The window really does reach into tomorrow — `hours-lock.ts:60-63`'s rule is what excludes it, not
    // an accident of the fixture.
    const straddle = await persistedVenueLocalDate(B_STRADDLE);
    const tomorrow = await clockVenueLocalDate(EAST_ZONE, CLOCK_EAST_MIDDAY_TOMORROW);
    expect(straddle).not.toBe(tomorrow);
    expect(ids(onTheDayItEnds.today)).toEqual([]);
  });
});

describe("D-140 — the agenda's status set is the upcoming tab's own", () => {
  it("4 · cancelled and declined are absent; pending, requested, approved and confirmed are present", async () => {
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_STATUS, now: CLOCK_EAST_MIDDAY });

    // Ordered by start, so the hour each status was seeded at fixes the expected order exactly.
    expect(ids(agenda.today)).toEqual([
      "ag_bk_pending",
      "ag_bk_requested",
      "ag_bk_approved",
      "ag_bk_confirmed",
    ]);
    expect(ids(agenda.today)).not.toContain("ag_bk_cancelled");
    expect(ids(agenda.today)).not.toContain("ag_bk_declined");
  });

  it("4b · the NEXT bucket carries the identical status set — a cancelled future session is not 'next'", async () => {
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_INERT, now: CLOCK_EAST_MIDDAY });

    // If the two buckets had been given different status halves, this cancelled row would be the one
    // surviving in the half that forgot — which is precisely how a row falls through both.
    expect(ids(agenda.today)).toEqual([]);
    expect(agenda.next).toBeNull();
  });

  it("4c · no row is ever in both buckets", async () => {
    for (const hostId of [HOST_ZONE, HOST_DAY, HOST_MIDNIGHT, HOST_STATUS, HOST_NEXT]) {
      const agenda = await queryHostAgenda(testDb.db, { hostId, now: CLOCK_EAST_MIDDAY });
      if (agenda.next) expect(ids(agenda.today)).not.toContain(agenda.next.id);
    }
  });
});

describe("D-142 — a quiet day shows the next upcoming session, never a dead screen", () => {
  it("5 · with nothing today, exactly one next row returns and it is the soonest", async () => {
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_NEXT, now: CLOCK_EAST_MIDDAY });

    expect(ids(agenda.today)).toEqual([]);
    expect(agenda.next?.id).toBe(B_SOON);
    expect(agenda.next?.startsAt).toBeInstanceOf(Date);
    // The soonest, not merely one of them.
    expect(agenda.next?.id).not.toBe(B_LATER);
  });

  it("5b · with no upcoming sessions at all the call still succeeds and both buckets are empty", async () => {
    // This case threads the REAL clock — `readDbNow`, exactly as the page will — so the wiring D-141
    // prescribes is exercised end to end at least once and not only through synthetic instants.
    const now = await readDbNow(testDb.db);
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_EMPTY, now });

    expect(agenda.today).toEqual([]);
    expect(agenda.next).toBeNull();
  });

  it("5c · with sessions today, the next row is not returned at all, so it cannot be double-counted", async () => {
    // HOST_DAY has a session LATER today (B_LATE), which satisfies `starts_at > now` and is therefore what
    // the raw next bucket contains. Rendering it beside the agenda would announce one session twice.
    const agenda = await queryHostAgenda(testDb.db, { hostId: HOST_DAY, now: CLOCK_EAST_MIDDAY });

    expect(ids(agenda.today)).toContain(B_LATE);
    expect(agenda.next).toBeNull();
  });

  it("5d · a host with no listings gets empty buckets and no error", async () => {
    const agenda = await queryHostAgenda(testDb.db, {
      hostId: "ag_nobody",
      now: CLOCK_EAST_MIDDAY,
    });

    expect(agenda.today).toEqual([]);
    expect(agenda.next).toBeNull();
  });
});

describe("D-142 — both buckets arrive in ONE round trip", () => {
  it("6 · a full agenda read issues exactly one statement", async () => {
    // Asserted as a SHAPE, not a timing: a timing assertion on a local Postgres is a flake generator, and
    // "fast" was never the claim. The claim is that D-142's fallback costs zero extra reads, and the only
    // honest way to state that is to count the statements.
    let executeCalls = 0;
    type ExecuteFn = TestDb["db"]["execute"];
    const countingDb = new Proxy(testDb.db, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (prop !== "execute") return value;
        const execute = value as ExecuteFn;
        return ((...args: Parameters<ExecuteFn>) => {
          executeCalls += 1;
          return execute.apply(target, args);
        }) as ExecuteFn;
      },
    });

    // HOST_DAY has rows in BOTH candidate buckets, so this is the expensive case, not the empty one.
    const agenda = await queryHostAgenda(countingDb, { hostId: HOST_DAY, now: CLOCK_EAST_MIDDAY });

    expect(executeCalls).toBe(1);
    expect(ids(agenda.today)).toEqual([B_EARLY, B_LATE]);
  });
});
