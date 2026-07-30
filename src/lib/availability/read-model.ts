// The single server-authoritative availability read model (AVAIL-03, RESEARCH Pattern 3). Like
// src/lib/bookability.ts and src/lib/listing-public.ts, this is the ONE place a day's bookable state
// is derived — the client never supplies what's available (threat T-03-TAMPER-SLOT). It computes, on
// the fly, per-slot free-unit counts from: operating hours − availability blocks − occupying bookings.
//
// Split (RESEARCH Pattern 3): SQL fetches the raw rows (hours for the venue-local day-of-week; blocks
// and occupying bookings overlapping the day), TS composes the slot grid via slots.ts. The overlap
// filter uses the IDENTICAL tstzrange('[)') half-open bound as the booking_no_overlap EXCLUDE
// constraint (Pitfall 5 / threat T-03-RANGE-MISMATCH) so the calendar can never show a slot the DB
// would reject, nor hide a bookable back-to-back hour.

import { and, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
// `tz` is aliased because getAvailability already binds a local `tz` to the venue timezone STRING; two
// different things called `tz` in one module is exactly the kind of quiet mixup this file exists to avoid.
import { TZDate, tz as venueTz } from "@date-fns/tz";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { listing, operatingHours } from "@/lib/db/schema";
import { MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS } from "@/lib/payments/config";
import {
  slotsForWindow,
  venueDayOfWeek,
  slotStartsInFuture,
  isWithinHorizon,
} from "./slots";
// Phase 9 (OC-13). These are IMPORTED, never re-typed: the open branch below must count the same rows the
// admissions claim counts, and the only way to guarantee that structurally is to share the fragment.
import {
  OPEN_OCCUPYING_STATUS_SQL,
  loadOpenDayWindow,
  openTakenSql,
  spotsState,
  type SpotsState,
} from "./open-capacity";

// Accept either the prod schema-typed db (Plan 05 RSC) or the isolated-schema test db. Both are
// assignable to a Record<string, unknown> schema; only the (unused here) relational `.query` builder
// depends on the schema generic — `.select`/`.execute` are shared.
export type DbConn = PostgresJsDatabase<Record<string, unknown>>;

/**
 * A slot's DISPLAY state. `too_soon` (D-98/D-100) is the fourth member: the slot is genuinely free, but
 * its start is inside the listing's mode-scoped minimum notice window, so it cannot be held yet.
 *
 * `too_soon` is a READ-MODEL DISPLAY STATE ONLY (T-07-26). It is not a booking status, it appears in no
 * occupancy predicate, and the booking_no_overlap EXCLUDE and both lazy-expiry sweeps are untouched by
 * it. The authoritative refusal lives server-side in createPendingHold; this state only lets the picker
 * say so before the booker clicks.
 *
 * Adding a member here intentionally breaks every exhaustive switch over SlotState until it is handled.
 * That is desirable — do NOT silence it with a `default` case.
 */
export type SlotState = "available" | "unavailable" | "past" | "beyond_horizon" | "too_soon";

export type AvailabilitySlot = {
  startUtc: string;
  endUtc: string;
  state: SlotState;
  freeUnits: number;
  unitCount: number;
};

/**
 * Phase-9 open-capacity projection for ONE venue-local date (OC-02: a date is one pass, so there is exactly
 * one of these per day and `slots` is empty).
 *
 * `state` is decided HERE, server-side, from the shared scarcity threshold that open-capacity.ts owns — the
 * client MUST NOT re-derive it. That threshold's ceiling is a NON-PUBLIC server constant, so it is not
 * inlined into the browser bundle and a client-side default would silently disagree with the server exactly
 * as the D-75 serviceFeeBps trap does (availability-calendar.tsx:235-242). Same reasoning that put
 * `bookingMode` on this payload under D-100, and the same contract headcount-meter.tsx:48-53 states for
 * `full`: only the claim's own basis may decide it.
 */
export type OpenCapacityDay = {
  /** cap − the occupying head sum. Clamped at 0 — never negative, even if a cap edit shrank below live heads. */
  remaining: number;
  /** listing.max_occupancy — the daily admissions cap (D-124 / OC-04). */
  cap: number;
  state: SpotsState;
  /** listing.per_head_price_cents (D-125). Null only for a mis-published listing; the publish gate requires it. */
  perHeadPriceCents: number | null;
  /** OC-03: the pass's ENTRY WINDOW as ISO instants — never a reservation. No consumer may render these as
   *  "your 6:00 AM – 10:00 PM booking" (09-UI-SPEC O2); that is the CR-01 repeat 09-08 forked the label to
   *  prevent. They are here because they are what a hold persists as starts_at / ends_at. */
  dayOpenUtc: string;
  dayCloseUtc: string;
  /** venue-local "HH:mm:ss" ends, for the "Open 6:00 AM – 10:00 PM · {City} time" line. */
  openTime: string;
  closeTime: string;
  /** false when the pass window has already closed or the date lies beyond BOOKING_HORIZON_DAYS. The CTA
   *  stays disabled; createOpenCapacityHold refuses the same two cases server-side (PAST_DATE_MESSAGE), so
   *  this is a courtesy and never the gate (Security V4). */
  bookable: boolean;
};

export type DayAvailability = {
  timezone: string;
  unitCount: number;
  hasHours: boolean;
  /** D-100: which mode's minimum notice applies — also what the picker's `too_soon` copy keys off. */
  bookingMode: "instant" | "request";
  slots: AvailabilitySlot[];
  /** Phase-9 (OC-01). Which arbiter governs this listing: the GiST EXCLUDE ('exclusive') or the D-123
   *  advisory-lock admissions counter ('open_capacity'). Every consumer forks on THIS — the listing row's
   *  persisted mode — never on a client flag. */
  occupancyMode: "exclusive" | "open_capacity";
  /** Present ONLY for an open-capacity listing on a date the venue is open. Null for every exclusive
   *  listing (so all shipped consumers are byte-unchanged) and null when the venue is closed that weekday. */
  openCapacity: OpenCapacityDay | null;
};

/** The fully-booked date set for one venue-local month (OC-11), for the calendar's `disabled` matcher. */
export type OpenMonthAvailability = {
  cap: number;
  /** venue-local "YYYY-MM-DD" dates in the queried month with remaining <= 0. Everything not listed is
   *  selectable. The month grid is deliberately BINARY (09-UI-SPEC Open Q3) — 42 counts competing with 42
   *  date numerals is illegible at 320px, so exact counts live only in the day panel and the search card. */
  fullDates: string[];
};

const EMPTY_MONTH: OpenMonthAvailability = { cap: 0, fullDates: [] };

/**
 * D-96/D-100 minimum notice before a slot's start, in ms, for a listing's booking mode. ONE mechanism,
 * two thresholds: request-to-book needs TWO humans in sequence (host approves, then booker pays) so it
 * needs hours; instant-book is one person and one checkout, so it gets a checkout-sized guard.
 *
 * This MIRRORS the authoritative guard in createPendingHold, which is enforced against the DB clock in
 * the booking transaction. This copy exists so the picker can grey the chip out first — it is a
 * courtesy, never the gate (Security V4).
 */
export function leadTimeMsFor(mode: "instant" | "request"): number {
  return mode === "request"
    ? MIN_LEAD_REQUEST_HOURS * 60 * 60 * 1000
    : MIN_LEAD_INSTANT_MINUTES * 60 * 1000;
}

// Raw overlapping row (unit + [startsAt, endsAt)) as returned by the postgres.js driver: snake_case
// keys, timestamptz decoded to Date. Used for the in-TS '[)' overlap test per slot.
type RangeRow = { unit: number | null; starts_at: string | Date; ends_at: string | Date };

/** venue-local `HH:mm:ss` (Postgres time) → integer hour. On-the-hour windows only (D-22 / A2). */
function parseHour(t: string): number {
  return parseInt(t.slice(0, 2), 10);
}

/**
 * Compute a listing's availability for a single venue-local calendar day. `dayLocal.month` is
 * 1-based (calendar-natural); it is converted to 0-based for slots.ts / TZDate. All slot instants are
 * server-derived in the venue tz — the client is never trusted for availability. Returns per-slot
 * free-unit counts and states (available / unavailable / past / beyond_horizon).
 */
export async function getAvailability(
  dbConn: DbConn,
  listingId: string,
  dayLocal: { year: number; month: number; day: number },
  now: Date = new Date(),
): Promise<DayAvailability> {
  const { year, month, day } = dayLocal;
  const m0 = month - 1; // 0-based month for slots.ts / TZDate (JS Date convention)

  const listingRows = await dbConn
    .select({
      unitCount: listing.unitCount,
      timezone: listing.timezone,
      // D-100: the mode selects WHICH minimum-notice threshold applies to this listing's slots.
      bookingMode: listing.bookingMode,
      // Phase-9 (OC-01/D-124/D-125): the persisted arbiter + the two fields only the open branch reads.
      occupancyMode: listing.occupancyMode,
      maxOccupancy: listing.maxOccupancy,
      perHeadPriceCents: listing.perHeadPriceCents,
    })
    .from(listing)
    .where(eq(listing.id, listingId));

  if (listingRows.length === 0) {
    // Defensive: unknown listing → empty calendar (no crash). Callers normally pre-load the listing.
    // `exclusive` matches the listing table's own column default, so this fallback and a real row for a
    // pre-Phase-9 listing describe the same thing.
    return {
      timezone: "UTC",
      unitCount: 0,
      hasHours: false,
      bookingMode: "instant",
      slots: [],
      occupancyMode: "exclusive",
      openCapacity: null,
    };
  }
  const lr = listingRows[0];

  // ── PHASE-9 FORK (OC-01). Which ARBITER governs the listing decides the whole SHAPE of the answer: an
  // exclusive listing is adjudicated by the booking_no_overlap EXCLUDE and answers with an hour grid; an
  // open-capacity listing is adjudicated by the D-123 admissions counter and answers with spots-left for
  // the DATE. Everything below this branch is the untouched exclusive path.
  if (lr.occupancyMode === "open_capacity") {
    return getOpenDay(dbConn, listingId, dayLocal, lr, now);
  }

  const { unitCount, timezone: tz, bookingMode } = lr;
  // D-98/D-100: the earliest start this listing will accept. Compared against the SAME `now` that drives
  // `past`/`beyond_horizon`, so all three display states share one clock and can never disagree.
  const earliestStartMs = now.getTime() + leadTimeMsFor(bookingMode);

  // Venue-local day window [00:00 today, 00:00 next day) as UTC instants (normalize via the epoch —
  // TZDate.toISOString() renders the offset-local form). day+1 rolls month/year over via Date math.
  const dayStartUtc = new Date(new TZDate(year, m0, day, 0, 0, 0, tz).getTime());
  const dayEndUtc = new Date(new TZDate(year, m0, day + 1, 0, 0, 0, tz).getTime());
  const dayStartIso = dayStartUtc.toISOString();
  const dayEndIso = dayEndUtc.toISOString();
  const dow = venueDayOfWeek(year, m0, day, tz);

  const [hoursRows, blockResult, bookingResult] = await Promise.all([
    dbConn
      .select({ openTime: operatingHours.openTime, closeTime: operatingHours.closeTime })
      .from(operatingHours)
      .where(and(eq(operatingHours.listingId, listingId), eq(operatingHours.dayOfWeek, dow)))
      .orderBy(operatingHours.openTime),
    // Blocks overlapping the day. Same '[)' half-open bound as the EXCLUDE constraint (Pitfall 5).
    dbConn.execute(sql`
      SELECT unit, starts_at, ends_at FROM availability_block
      WHERE listing_id = ${listingId}
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${dayStartIso}, ${dayEndIso}, '[)')
    `),
    // Occupying bookings: confirmed, OR a slot-holding hold (pending | requested | approved) not yet
    // expired (D-48a lazy expiry — a hold past its expires_at reads as FREE, no background worker). The
    // request-to-book states requested/approved OCCUPY exactly like pending (D-63) — this predicate MUST
    // mirror 06-01's widened booking_no_overlap EXCLUDE occupying set {pending,confirmed,requested,
    // approved} (0012), or a request-held slot would read as free here and the calendar/search (Stage-2
    // reuses this read model) would collide a booker into a held slot. Uses SQL now() (the DB transaction
    // clock, one source — NOT the injectable `now` param, which stays for slot past/horizon state only;
    // Pitfall 7). '[)' bound + listing scope stay IDENTICAL to the EXCLUDE (0005/0012);
    // cancelled/declined/completed never occupy.
    dbConn.execute(sql`
      SELECT unit, starts_at, ends_at FROM booking
      WHERE listing_id = ${listingId}
        AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${dayStartIso}, ${dayEndIso}, '[)')
    `),
  ]);

  const blocks = (blockResult as unknown as RangeRow[]).map((r) => ({
    unit: r.unit,
    startMs: new Date(r.starts_at).getTime(),
    endMs: new Date(r.ends_at).getTime(),
  }));
  const bookings = (bookingResult as unknown as RangeRow[]).map((r) => ({
    unit: r.unit,
    startMs: new Date(r.starts_at).getTime(),
    endMs: new Date(r.ends_at).getTime(),
  }));

  const hasHours = hoursRows.length > 0;
  const slots: AvailabilitySlot[] = [];

  // WR-02 defensive clamp: only a REAL unit in [1, unitCount] can occupy inventory. A stale/phantom
  // unit (e.g. a block whose listing later shrank unitCount, or a crafted out-of-range block) must
  // never inflate taken.size and under-report freeUnits — real units are still counted exactly as before.
  const inRange = (u: number | null): u is number => u != null && u >= 1 && u <= unitCount;

  for (const win of hoursRows) {
    const openHour = parseHour(win.openTime);
    const closeHour = parseHour(win.closeTime);
    for (const s of slotsForWindow(year, m0, day, openHour, closeHour, tz)) {
      const sStart = new Date(s.startUtc).getTime();
      const sEnd = new Date(s.endUtc).getTime();
      // Half-open '[)' overlap, identical to the constraint: [aStart,aEnd) ∩ [sStart,sEnd) ≠ ∅.
      const overlaps = (aStart: number, aEnd: number) => aStart < sEnd && sStart < aEnd;

      let freeUnits: number;
      const wholeBlocked = blocks.some((b) => b.unit == null && overlaps(b.startMs, b.endMs));
      if (wholeBlocked) {
        freeUnits = 0; // a whole-listing block zeroes every unit (RESEARCH Pattern 3)
      } else {
        const taken = new Set<number>();
        for (const b of blocks) if (inRange(b.unit) && overlaps(b.startMs, b.endMs)) taken.add(b.unit);
        for (const bk of bookings)
          if (inRange(bk.unit) && overlaps(bk.startMs, bk.endMs)) taken.add(bk.unit);
        freeUnits = Math.max(0, unitCount - taken.size);
      }

      // Display-state precedence. `too_soon` sits AFTER the freeUnits check on purpose: occupancy is the
      // stronger, more informative fact about a slot someone else already holds, and keeping it ahead
      // means `too_soon` describes exactly one thing — a slot that is genuinely free but inside the
      // listing's minimum notice window (D-98/D-100).
      let state: SlotState;
      if (!isWithinHorizon(s.startUtc, now)) state = "beyond_horizon";
      else if (!slotStartsInFuture(s.startUtc, now)) state = "past";
      else if (freeUnits < 1) state = "unavailable";
      else if (sStart < earliestStartMs) state = "too_soon";
      else state = "available";

      slots.push({ startUtc: s.startUtc, endUtc: s.endUtc, state, freeUnits, unitCount });
    }
  }

  slots.sort((a, b) => (a.startUtc < b.startUtc ? -1 : a.startUtc > b.startUtc ? 1 : 0));
  // `openCapacity: null` on every exclusive payload is what keeps the OC-01 change a FORK and not a
  // replacement — every shipped consumer of DayAvailability reads exactly what it read before.
  return {
    timezone: tz,
    unitCount,
    hasHours,
    bookingMode,
    slots,
    occupancyMode: "exclusive",
    openCapacity: null,
  };
}

/**
 * The open-capacity branch of getAvailability (OC-13). A date IS one pass (OC-02), so there is no hour grid
 * to compose: the projection is `cap − occupying heads` for the whole venue-local day, plus the entry window
 * and the server-derived scarcity state.
 *
 * ⚠️ PITFALL-4 INVARIANT, in the open dialect. This projection and `createOpenCapacityHold` count the SAME
 * rows because they call the SAME `openTakenSql`. Do NOT inline a second predicate here, and do NOT
 * "optimise" the sum into a stored counter: lazy expiry (D-48a) has no writer at the moment a hold lapses,
 * so any stored count drifts by construction (09-RESEARCH Pitfall 3) — which is also precisely why OC-15's
 * "cancelling frees the spot" needs no release code at all. A projection that disagrees with the arbiter is
 * experienced by the booker as "Just sold out" on a date the calendar had just called open.
 */
async function getOpenDay(
  dbConn: DbConn,
  listingId: string,
  dayLocal: { year: number; month: number; day: number },
  lr: {
    unitCount: number;
    timezone: string;
    bookingMode: "instant" | "request";
    maxOccupancy: number | null;
    perHeadPriceCents: number | null;
  },
  now: Date,
): Promise<DayAvailability> {
  const base = {
    timezone: lr.timezone,
    unitCount: lr.unitCount,
    bookingMode: lr.bookingMode,
    slots: [] as AvailabilitySlot[],
    occupancyMode: "open_capacity" as const,
  };

  // The OC-03 window (and the OC-02 split-shift envelope rule) lives in ONE place — loadOpenDayWindow — for
  // the same reason the predicate does. null here means the venue is CLOSED that weekday (the listing is
  // known to exist; we just read its row): hasHours:false + openCapacity:null is the "Closed on {day}" empty
  // state, and `occupancyMode` still rides along so the UI knows which surface to render on a closed date.
  const dayWindow = await loadOpenDayWindow(dbConn, listingId, dayLocal);
  if (dayWindow === null) return { ...base, hasHours: false, openCapacity: null };

  const { dayOpenUtc, dayCloseUtc, openTime, closeTime } = dayWindow;
  const dayOpenIso = dayOpenUtc.toISOString();

  // THE occupying count — one statement, the shared fragment, no inlined predicate (see the invariant above).
  const takenRows = (await dbConn.execute(
    sql`SELECT ${openTakenSql(listingId, dayOpenIso)} AS taken`,
  )) as unknown as { taken: number }[];
  const taken = Number(takenRows[0]?.taken ?? 0);

  // A NULL max_occupancy FAILS CLOSED to zero admissions — the identical choice createOpenCapacityHold
  // makes, so the calendar can never advertise a spot the claim would then refuse.
  const cap = lr.maxOccupancy ?? 0;
  const remaining = Math.max(0, cap - taken);

  // THE CLOCK SPLIT, restating the rule stated at the exclusive predicate above (Pitfall 7): OCCUPANCY is
  // counted against SQL now() inside openTakenSql — the DB transaction clock, one source, shared with the
  // claim — while `bookable` is a DISPLAY state and therefore uses the injectable `now`, exactly as
  // `past`/`beyond_horizon` do. The two must never be swapped.
  const bookable = dayCloseUtc.getTime() > now.getTime() && isWithinHorizon(dayOpenIso, now);

  return {
    ...base,
    hasHours: true,
    openCapacity: {
      remaining,
      cap,
      state: spotsState(remaining, cap),
      perHeadPriceCents: lr.perHeadPriceCents,
      dayOpenUtc: dayOpenIso,
      dayCloseUtc: dayCloseUtc.toISOString(),
      openTime,
      closeTime,
      bookable,
    },
  };
}

/**
 * The set of venue-local dates in ONE month that are already fully booked, for an open-capacity listing
 * (OPEN-04 / OC-11). Feeds the calendar's `disabled` matcher so a full date is PROGRAMMATICALLY disabled
 * rather than merely greyed. Returns the empty map for an unknown listing and for any EXCLUSIVE listing —
 * an exclusive month grid is driven by the hour grid, not by an admissions count.
 */
export async function getOpenMonthAvailability(
  dbConn: DbConn,
  listingId: string,
  monthLocal: { year: number; month: number },
): Promise<OpenMonthAvailability> {
  const listingRows = await dbConn
    .select({
      timezone: listing.timezone,
      maxOccupancy: listing.maxOccupancy,
      occupancyMode: listing.occupancyMode,
    })
    .from(listing)
    .where(eq(listing.id, listingId));
  if (listingRows.length === 0) return EMPTY_MONTH;
  const { timezone, maxOccupancy, occupancyMode: mode } = listingRows[0];
  if (mode !== "open_capacity") return EMPTY_MONTH;
  const cap = maxOccupancy ?? 0; // NULL cap fails closed, as in getOpenDay

  const m0 = monthLocal.month - 1; // 0-based month for TZDate (JS Date convention)
  // Venue-local month bounds normalized through the epoch exactly as the day window is, and WIDENED one day
  // on each side: a venue's opening instant can land in the previous UTC day (06:00 Asia/Manila is 22:00Z
  // the day before), so an un-widened UTC range would silently drop the month's first date. TZDate day 0 is
  // the last day of the previous month and day 2 of month+1 clears the last date; the extra days are
  // filtered back out by the venue-local month prefix below.
  const fromIso = new Date(
    new TZDate(monthLocal.year, m0, 0, 0, 0, 0, timezone).getTime(),
  ).toISOString();
  const toIso = new Date(
    new TZDate(monthLocal.year, m0 + 1, 2, 0, 0, 0, timezone).getTime(),
  ).toISOString();

  // ONE grouped query per month, never 31 round trips. Only the STATUS half of the occupying set is
  // shareable here — a per-date aggregate necessarily has a different shape from openTakenSql's single-date
  // scalar — so that half is IMPORTED rather than retyped, for exactly the Pitfall-4 reason: WHICH rows
  // occupy a spot must be decided in one place, or the grid disables a date the counter would happily sell.
  const takenRows = (await dbConn.execute(sql`
    SELECT b.starts_at AS day_open, SUM(b.declared_pax)::int AS taken
    FROM booking b
    WHERE b.listing_id = ${listingId}
      AND b.open_capacity = true
      AND b.starts_at >= ${fromIso}::timestamptz
      AND b.starts_at < ${toIso}::timestamptz
      AND ${OPEN_OCCUPYING_STATUS_SQL}
    GROUP BY b.starts_at
  `)) as unknown as { day_open: string | Date; taken: number }[];

  const monthPrefix = `${monthLocal.year}-${String(monthLocal.month).padStart(2, "0")}-`;
  const full = takenRows
    .filter((r) => Number(r.taken) >= cap)
    // The opening INSTANT maps back to its venue-local calendar date — never the server's or viewer's
    // (D-105): the whole point of the map is which date cell to disable in the venue's own calendar.
    .map((r) => format(new Date(r.day_open), "yyyy-MM-dd", { in: venueTz(timezone) }))
    .filter((d) => d.startsWith(monthPrefix));
  return { cap, fullDates: [...new Set(full)].sort() };
}
