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
import { TZDate } from "@date-fns/tz";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { listing, operatingHours } from "@/lib/db/schema";
import { MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS } from "@/lib/payments/config";
import {
  slotsForWindow,
  venueDayOfWeek,
  slotStartsInFuture,
  isWithinHorizon,
} from "./slots";

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

export type DayAvailability = {
  timezone: string;
  unitCount: number;
  hasHours: boolean;
  /** D-100: which mode's minimum notice applies — also what the picker's `too_soon` copy keys off. */
  bookingMode: "instant" | "request";
  slots: AvailabilitySlot[];
};

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
    })
    .from(listing)
    .where(eq(listing.id, listingId));

  if (listingRows.length === 0) {
    // Defensive: unknown listing → empty calendar (no crash). Callers normally pre-load the listing.
    return { timezone: "UTC", unitCount: 0, hasHours: false, bookingMode: "instant", slots: [] };
  }
  const { unitCount, timezone: tz, bookingMode } = listingRows[0];
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
  return { timezone: tz, unitCount, hasHours, bookingMode, slots };
}
