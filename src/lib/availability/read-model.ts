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

export type SlotState = "available" | "unavailable" | "past" | "beyond_horizon";

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
  slots: AvailabilitySlot[];
};

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
    .select({ unitCount: listing.unitCount, timezone: listing.timezone })
    .from(listing)
    .where(eq(listing.id, listingId));

  if (listingRows.length === 0) {
    // Defensive: unknown listing → empty calendar (no crash). Callers normally pre-load the listing.
    return { timezone: "UTC", unitCount: 0, hasHours: false, slots: [] };
  }
  const { unitCount, timezone: tz } = listingRows[0];

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
    // Occupying bookings (pending/confirmed — matches the 0005 partial WHERE EXACTLY; cancelled/
    // declined/completed never occupy). Same '[)' bound.
    dbConn.execute(sql`
      SELECT unit, starts_at, ends_at FROM booking
      WHERE listing_id = ${listingId}
        AND status IN ('pending','confirmed')
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

      let state: SlotState;
      if (!isWithinHorizon(s.startUtc, now)) state = "beyond_horizon";
      else if (!slotStartsInFuture(s.startUtc, now)) state = "past";
      else if (freeUnits < 1) state = "unavailable";
      else state = "available";

      slots.push({ startUtc: s.startUtc, endUtc: s.endUtc, state, freeUnits, unitCount });
    }
  }

  slots.sort((a, b) => (a.startUtc < b.startUtc ? -1 : a.startUtc > b.startUtc ? 1 : 0));
  return { timezone: tz, unitCount, hasHours, slots };
}
