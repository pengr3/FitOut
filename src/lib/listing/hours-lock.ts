// CR-03 layer 2 — the OPERATING-HOURS lock.
//
// OC-17 says a host may change HOW their space is sold only while nothing is still to come. This is that
// rule one level down: they may change WHEN the space is open only for the weekdays nothing is still to come
// on. 09-18 (layer 1) already made an hours edit non-catastrophic — the admissions counter is anchored on the
// venue-local calendar day over the STORED `booking.starts_at`, so an edit can no longer empty the counted
// set or make a second full cap sellable. What it deliberately did NOT do is stop the edit STRANDING passes
// already sold, and that is the harm this module exists to prevent:
//
//   A drop-in pass persists concrete `starts_at`/`ends_at` at hold time (OC-03), and those instants are what
//   the Phase-7 refund ladder, the payout sweep (`ends_at + delay`), the reminders and expiry all key on.
//   Move Monday's opening 06:00 → 07:00 and every pass already sold for a future Monday now claims an entry
//   window the venue will not honour, with a refund deadline computed off an opening time that no longer
//   exists. DELETING a weekday's hours is worse: `loadOpenDayWindow` returns null, the day panel renders
//   "Closed on {day}", and the sold passes go invisible in every read model while still occupying admissions.
//
// WHY THE GUARD LIVES IN THE ACTION AND NOT IN THE DB. There is no constraint that could express it:
// `operating_hours` rows carry a weekday, not a date, and the passes they would strand live in a different
// table keyed on absolute instants. A trigger would have to re-derive the venue-local weekday of every
// upcoming open booking on every hours write — the same computation as below, in a place a test cannot drive
// and a host-facing sentence cannot be returned from. So it is up here, in one authority, exactly as
// `mode-lock.ts` is for OC-17.
//
// Pure server-side module, no "use server" directive — a server action, an RSC and a test all import it.

import { sql } from "drizzle-orm";
import { OPEN_OCCUPYING_STATUS_SQL } from "@/lib/availability/open-capacity";
import type { DbConn } from "@/lib/availability/read-model";

export type OpenHoursLockState = {
  /**
   * The venue-local weekdays frozen by a live drop-in pass, sorted ascending. `0=Sun..6=Sat` — the SAME
   * convention as `operating_hours.day_of_week` (schema.ts:606, the JS `Date.getDay` convention) and the
   * same one `venueDayOfWeek` returns (slots.ts:54-56) and Postgres's day-of-week field yields. All three
   * agree; do NOT "correct" this to the ISO 1=Mon..7=Sun variant — that would shift every lock by one day
   * and freeze the wrong rows in the editor.
   *
   * EMPTY BY CONSTRUCTION FOR AN EXCLUSIVE LISTING: the query filters on `open_capacity = true`, which no
   * exclusive booking carries, so this can never be non-empty for a listing Phase 3 shipped. A caller is
   * therefore safe without a mode branch — but it should still branch on the PERSISTED `occupancy_mode`
   * anyway, to skip the query entirely on the exclusive path rather than pay for a guaranteed-empty result.
   */
  lockedWeekdays: number[];
  /** How many passes are still to come across those weekdays — the advisory says "{N} pass{es} …". */
  lockedByCount: number;
  /** The LAST of those passes' `ends_at`, so the refusal can say WHEN the lock lifts. Null when unlocked. */
  unlocksAt: Date | null;
};

// `string | Date` mirrors mode-lock.ts's LockRow and read-model.ts's RangeRow: the postgres.js driver hands
// back a Date for timestamptz, but the raw-SQL boundary is untyped, so both shapes are accepted and
// normalised below.
type HoursLockRow = { dow: number; n: number; unlocks_at: string | Date | null };

/**
 * Which venue-local weekdays are frozen by live drop-in passes, in ONE query.
 *
 * Three rules, each load-bearing:
 *
 *   - **`starts_at`, not `ends_at`, decides the weekday.** A split-shift or overnight venue's closing instant
 *     can land on the NEXT calendar day, and a pass belongs to the day it was BOUGHT for — the same day the
 *     admissions counter counts it against (09-18). Keying the freeze off the closing instant would freeze
 *     Tuesday because of a Monday pass and leave Monday itself editable.
 *
 *   - **`ends_at > now()` is what makes it "upcoming OR active".** A pass whose day is over cannot be
 *     stranded by an hours edit — its money is settled and its entry window is history — so a host is never
 *     frozen out by their own back catalogue. An in-progress day DOES still lock. Same rule as mode-lock.ts.
 *     A LAPSED hold does not lock either (lazy expiry, D-48a — it is not in the occupying set below).
 *
 *   - **The DB clock is the ONLY clock** — SQL `now()`, one source, no injectable `now` parameter and no JS
 *     wall clock anywhere in this module (Pitfall 7). A server whose clock drifts must not be able to unfreeze
 *     a weekday early. (Deliberately phrased WITHOUT naming the JS constructors, exactly as mode-lock.ts:51-53
 *     does, so the grep tripwire that asserts they never appear here stays usable.) The one parse below reads
 *     a value the DB returned; it does not read the current time.
 *
 * The occupying predicate is IMPORTED, never retyped — open capacity is instant-only (OC-10), so its set is
 * deliberately narrower than the exclusive one and two copies drifting is the T-03-RANGE-MISMATCH class of
 * bug. It requires the booking table aliased `b`; `listing l` is joined for the venue timezone the weekday is
 * computed in (never the server's).
 */
export async function getOpenHoursLockState(
  dbConn: DbConn,
  listingId: string,
): Promise<OpenHoursLockState> {
  const result = await dbConn.execute(sql`
    SELECT EXTRACT(DOW FROM (b.starts_at AT TIME ZONE l.timezone))::int AS dow,
           count(*)::int AS n,
           MAX(b.ends_at) AS unlocks_at
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    WHERE b.listing_id = ${listingId}
      AND b.open_capacity = true
      AND b.ends_at > now()
      AND ${OPEN_OCCUPYING_STATUS_SQL}
    GROUP BY 1
    ORDER BY 1
  `);
  const rows = result as unknown as HoursLockRow[];

  let lockedByCount = 0;
  let unlocksAtMs: number | null = null;
  const lockedWeekdays: number[] = [];
  for (const row of rows) {
    lockedWeekdays.push(Number(row.dow));
    lockedByCount += Number(row.n ?? 0);
    if (row.unlocks_at != null) {
      const ms = new Date(row.unlocks_at).getTime();
      if (unlocksAtMs == null || ms > unlocksAtMs) unlocksAtMs = ms;
    }
  }

  return {
    // Already ascending from the query's ORDER BY; sorted again so the contract holds on the value, not on a
    // clause a later edit could drop.
    lockedWeekdays: lockedWeekdays.sort((a, b) => a - b),
    lockedByCount,
    // MAX(ends_at) is NULL exactly when there are no rows, so `unlocksAt` and `lockedWeekdays` can never
    // disagree about whether anything is locked.
    unlocksAt: unlocksAtMs == null ? null : new Date(unlocksAtMs),
  };
}
