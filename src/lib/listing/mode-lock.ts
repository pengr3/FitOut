// OC-17 — the occupancy-mode lock.
//
// A host may change HOW their space is sold only while nothing is still to come. Switching mode under a live
// booking would strand that booking between two arbiters: an exclusive booking on a listing whose inventory
// is now counted as shared admissions, or an open admission on a listing whose `booking_no_overlap` EXCLUDE
// now governs the whole day. 09-01 narrowed that EXCLUDE to `... AND open_capacity = false` precisely so the
// two row shapes can coexist in the table — which means NOTHING at the DB layer stops a listing from carrying
// both shapes. The guard lives entirely up here, and this module is it.
//
// ONE authority, TWO consumers: the wizard RENDERS this (the § 1f lock alert — the disabled card, the "{N}
// bookings still ahead", the "you can switch after {date}") and `saveListingStep` ENFORCES it. The render is
// a courtesy; the action is the gate (Security V4 / threat T-09-19), exactly as D-77 established for the
// cancellation tier.
//
// Pure server-side module, no "use server" directive — a server action, an RSC and a test all import it.

import { sql } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";

export type ModeLockState = {
  /** true when ≥1 booking is still upcoming or in progress. */
  locked: boolean;
  /** how many bookings are still ahead — the alert says "{N} booking{s} … still ahead" (09-UI-SPEC O7). */
  lockedByCount: number;
  /** the LAST of those bookings' `ends_at`, so the alert can say WHEN the lock lifts. Null when unlocked. */
  unlocksAt: Date | null;
};

// `string | Date` mirrors read-model.ts's RangeRow: the postgres.js driver hands back a Date for
// timestamptz, but the raw-SQL boundary is untyped, so both shapes are accepted and normalised below.
type LockRow = { n: number; unlocks_at: string | Date | null };

/**
 * Count the bookings that still stand in the way of a mode change, in ONE query.
 *
 * The predicate is the shipped occupying set (read-model.ts:147-152 — confirmed, or a pending/requested/
 * approved hold not yet expired) plus a future bound:
 *
 *   - `ends_at > now()` is what makes "upcoming OR ACTIVE" true. A session that has already finished cannot
 *     be stranded by a mode change — its money is settled and its slot is history — so a host is never
 *     frozen out by their own back catalogue. An in-progress session (started, not yet ended) DOES still
 *     lock, which is the "or active" half of OC-17.
 *   - A LAPSED hold does not lock. Same lazy-expiry rule as everywhere else (D-48a): `expires_at > now()`
 *     inside the status test, no background worker, no release code.
 *   - `cancelled` / `declined` / `completed` never occupy, so they never lock — which is exactly why OC-17's
 *     "way out" (cancel the upcoming bookings) actually works: the lock lifts as a CONSEQUENCE of the
 *     cancellation, with nothing here to update.
 *
 * The DB clock is the ONLY clock — SQL `now()`, one source, no injectable `now` parameter and no JS wall
 * clock anywhere in this module (Pitfall 7). A server whose clock drifts must not be able to unlock a
 * listing early. (Deliberately phrased WITHOUT naming the JS constructors, so the grep tripwire that asserts
 * they never appear here stays usable.) The one `new Date(...)` below is a PARSE of a value the DB returned,
 * not a reading of the current time.
 */
export async function getModeLockState(
  dbConn: DbConn,
  listingId: string,
): Promise<ModeLockState> {
  const result = await dbConn.execute(sql`
    SELECT count(*)::int AS n, MAX(ends_at) AS unlocks_at
    FROM booking
    WHERE listing_id = ${listingId}
      AND ends_at > now()
      AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
  `);
  const row = (result as unknown as LockRow[])[0];
  const lockedByCount = row?.n ?? 0;
  const rawUnlocksAt = row?.unlocks_at ?? null;
  return {
    locked: lockedByCount > 0,
    lockedByCount,
    // MAX(ends_at) is NULL exactly when the count is 0, so `unlocksAt` and `locked` can never disagree.
    unlocksAt: rawUnlocksAt == null ? null : new Date(rawUnlocksAt),
  };
}
