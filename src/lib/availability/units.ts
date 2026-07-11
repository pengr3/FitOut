// Unit auto-assignment under concurrency (RESEARCH Pattern 2) — the code path Phase 4 will call to
// actually insert a booking. KEY PRINCIPLE: correctness rests on the booking_no_overlap EXCLUDE
// constraint (Plan 01), NOT on the find-free SELECT. The SELECT is only an optimization to pick a
// likely-free unit; two concurrent callers can still pick the same unit, and the DB — not app code —
// rejects the loser. There is deliberately NO app-level "query-then-insert" conflict guard (that is
// the exact race CLAUDE.md forbids); instead we retry the next free unit on a DB rejection, bounded by
// unitCount.
//
// 03-01 concurrency finding: a genuine two-connection race can surface 40P01 (deadlock_detected) as
// well as 23P01 (exclusion_violation). BOTH are DB-atomic rejections that prevent the double-book, so
// both drive a retry here and both map to the clean "just taken" message — never a raw 500.

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { booking } from "@/lib/db/schema";
import { isPgError } from "@/lib/pg";
import type { DbConn } from "./read-model";

/** Thrown when every unit is occupied for the requested window (units exhausted). */
export class NoUnitAvailableError extends Error {
  constructor(message = "No unit available for the requested window") {
    super(message);
    this.name = "NoUnitAvailableError";
  }
}

export type CreateBookingInput = {
  listingId: string;
  bookerId: string;
  startsAt: Date | string;
  endsAt: Date | string;
  unitCount: number;
  status?: "pending" | "confirmed";
};

/**
 * Auto-assign the lowest free unit for [startsAt, endsAt) and insert the booking, retrying the next
 * free unit on a DB conflict (23P01 / 40P01) up to `unitCount` attempts. Returns the assigned unit.
 * Throws NoUnitAvailableError when all units are taken. Any other error propagates (a real 500).
 */
export async function createBooking(dbConn: DbConn, input: CreateBookingInput): Promise<number> {
  const { listingId, bookerId, unitCount } = input;
  const status = input.status ?? "confirmed";
  const startsAt = new Date(input.startsAt); // Date for the drizzle insert (timestamptz column)
  const endsAt = new Date(input.endsAt);
  const startIso = startsAt.toISOString(); // ISO string for the raw sql range bind (postgres.js casts)
  const endIso = endsAt.toISOString();

  for (let attempt = 0; attempt < unitCount; attempt++) {
    // Advisory find-free probe — same '[)' half-open overlap + occupying-status set as the constraint.
    const occupied = await dbConn.execute(sql`
      SELECT DISTINCT unit FROM booking
      WHERE listing_id = ${listingId}
        AND status IN ('pending','confirmed')
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')
    `);
    const taken = new Set((occupied as unknown as { unit: number }[]).map((r) => r.unit));

    let unit: number | null = null;
    for (let u = 1; u <= unitCount; u++) {
      if (!taken.has(u)) {
        unit = u; // lowest free unit
        break;
      }
    }
    if (unit == null) throw new NoUnitAvailableError();

    try {
      await dbConn
        .insert(booking)
        .values({ id: randomUUID(), listingId, bookerId, unit, startsAt, endsAt, status });
      return unit; // won the slot — the constraint accepted the insert
    } catch (e) {
      // Lost the race for THIS unit at the DB. 23P01 (exclusion_violation) or 40P01 (deadlock_detected,
      // genuine concurrent insert — 03-01 finding): both are DB-atomic rejections → recompute & retry.
      if (isPgError(e, "23P01") || isPgError(e, "40P01")) continue;
      throw e; // anything else is a real error
    }
  }
  throw new NoUnitAvailableError();
}

/**
 * Map a booking failure to a clean, user-facing result (SC#4). Exhausted units (NoUnitAvailableError)
 * and a raw DB conflict (23P01 exclusion_violation OR 40P01 deadlock_detected — defense in depth for a
 * caller that inserts directly) all surface the SAME friendly copy — never a raw 500. Unknown errors
 * re-throw so genuine failures are not swallowed (threat T-03-500).
 */
export function mapBookingError(e: unknown): { error: string } {
  if (e instanceof NoUnitAvailableError || isPgError(e, "23P01") || isPgError(e, "40P01")) {
    return { error: "That time was just taken. Pick another slot." };
  }
  throw e;
}
