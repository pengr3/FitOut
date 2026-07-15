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
import { eq, sql } from "drizzle-orm";
import { booking, listing } from "@/lib/db/schema";
import { isPgError } from "@/lib/pg";
import { quoteWindow } from "@/lib/booking/pricing";
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
 *
 * ⚠️ AUTO-COMMIT CONTRACT (WR-03 — MUST be honored; the retry loop is auto-commit-only as written):
 * `dbConn` MUST be an auto-commit connection so each INSERT attempt is its OWN transaction — which is
 * exactly how it is called today (tests pass the raw db; Phase 4 must not regress this). The loop has
 * NO per-attempt SAVEPOINT, so naively wrapping it in an outer `db.transaction(tx => createBooking(tx,
 * …))` breaks it two distinct ways, and a PARTIAL fix is wrong — hence the whole transactional design
 * is deferred to Phase 4:
 *   - 23P01 (exclusion_violation): the first losing INSERT aborts the WHOLE outer tx; the next
 *     iteration's find-free SELECT then throws 25P02 ("current transaction is aborted"), which is
 *     neither 23P01 nor 40P01 → it re-throws → raw 500, and SC#4's clean "just taken" copy is lost.
 *     Fix (Phase 4): give each attempt its own SAVEPOINT (a Drizzle nested `transaction`) so only the
 *     failed attempt rolls back and the outer tx stays usable.
 *   - 40P01 (deadlock_detected): Postgres aborts the ENTIRE transaction on deadlock — a savepoint can
 *     NOT rescue it. This needs an OUTER-transaction retry (redo the whole booking tx from the top),
 *     not just a savepoint. Because the 23P01 and 40P01 remedies differ, a savepoint-only change would
 *     be subtly wrong for 40P01 — so do NOT touch the retry logic here; design both in Phase 4.
 * Until then: call this ONLY on an auto-commit `dbConn`.
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

// ── WR-03 pending-hold transaction (Phase 4) ────────────────────────────────────────────────────────
// createPendingHold finally honors the AUTO-COMMIT CONTRACT to-do list above: a REAL db.transaction with
// (1) an own-hold idempotency pre-check, (2) an in-tx stale-hold sweep, (3) a server-frozen price quote,
// and (4) a per-unit-attempt SAVEPOINT loop — wrapped by an OUTER retry for 40P01. The two remedies are
// DISTINCT (verified from installed source, 04-RESEARCH.md Pattern 2):
//   - 23P01 (exclusion_violation): a per-unit `tx.transaction` SAVEPOINT rolls back ONLY the losing
//     attempt (postgres.js issues ROLLBACK TO + re-throws; the outer tx stays usable) so the loop can try
//     the next free unit — never 25P02 "current transaction is aborted".
//   - 40P01 (deadlock_detected): aborts the ENTIRE tx; a SAVEPOINT cannot rescue it. postgres.js begin()
//     does NOT auto-retry, so the OUTER for-loop re-runs the whole db.transaction (bounded).
// Correctness rests ENTIRELY on the booking_no_overlap EXCLUDE constraint — the find-free probe is
// advisory. The load-bearing D-42 distinction: 23P01 = SOMEONE ELSE took it → "just taken"; an own-hold
// hit or 23505 (unique_violation on booking_idem_uq) = YOUR OWN duplicate → return the existing booking.

/** Hold TTL (D-47): 15 minutes, platform-wide and config-tunable. */
export const HOLD_TTL_MINUTES = 15;
const HOLD_TTL_MS = HOLD_TTL_MINUTES * 60 * 1000;

/** Max whole-transaction retries for a 40P01 deadlock (postgres.js begin() does not auto-retry). */
const MAX_TX_RETRIES = 3;

export type CreatePendingHoldInput = {
  listingId: string;
  bookerId: string;
  startsAt: Date | string;
  endsAt: Date | string;
  /** full-day selection → the flat day rate (else hourly × hours). Defaults to false. */
  fullDay?: boolean;
  /** optional client double-click token — the booking_idem_uq partial-unique backstop (D-42). */
  idempotencyKey?: string | null;
};

/** A placed (or idempotently-replayed) hold, or a clean user-facing conflict message (mapBookingError). */
export type HoldSuccess = { ok: true; id: string; unit: number; replayed: boolean };
export type HoldResult = HoldSuccess | { error: string };

// Only the raw `.execute(sql)` surface is needed by the probe/idempotency helpers; both the top-level
// DbConn and the transaction handle satisfy it, so they run inside or outside a tx unchanged.
type SqlExecutor = Pick<DbConn, "execute">;

/**
 * The booker's own ACTIVE hold (pending-unexpired | confirmed) for this exact window OR idempotency key,
 * if any. The PRIMARY idempotency guard (D-42): re-entering checkout for a window you already hold — or a
 * concurrent same-key submit whose winner has committed — returns the SAME booking, never a false "just
 * taken". Uses the lazy-expiry predicate + SQL now() (DB clock) identical to the read model.
 */
async function findOwnActiveHold(
  tx: SqlExecutor,
  args: { listingId: string; bookerId: string; startIso: string; endIso: string; idempotencyKey: string | null },
): Promise<{ id: string; unit: number } | null> {
  const rows = (await tx.execute(sql`
    SELECT id, unit FROM booking
    WHERE listing_id = ${args.listingId}
      AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
      AND (
        ${args.idempotencyKey != null ? sql`idempotency_key = ${args.idempotencyKey}` : sql`false`}
        OR (booker_id = ${args.bookerId} AND starts_at = ${args.startIso} AND ends_at = ${args.endIso})
      )
    ORDER BY created_at ASC
    LIMIT 1
  `)) as unknown as { id: string; unit: number }[];
  return rows.length > 0 ? { id: rows[0].id, unit: rows[0].unit } : null;
}

/**
 * Advisory find-free probe: the lowest unit in [1, unitCount] with no occupying row overlapping the
 * window. Uses the SAME lazy-expiry predicate + half-open '[)' bound as the read model and the EXCLUDE
 * constraint, so (after the in-tx sweep) it never picks a slot the constraint would clearly reject.
 * Returns null when every unit is occupied. The DB — not this probe — is the final authority.
 */
async function pickLowestFreeUnit(
  tx: SqlExecutor,
  args: { listingId: string; startIso: string; endIso: string; unitCount: number },
): Promise<number | null> {
  const occupied = (await tx.execute(sql`
    SELECT DISTINCT unit FROM booking
    WHERE listing_id = ${args.listingId}
      AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
      AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${args.startIso}, ${args.endIso}, '[)')
  `)) as unknown as { unit: number }[];
  const taken = new Set(occupied.map((r) => r.unit));
  for (let u = 1; u <= args.unitCount; u++) if (!taken.has(u)) return u;
  return null;
}

/**
 * Place a PENDING hold on the lowest free unit for [startsAt, endsAt) — the entering-checkout mutation
 * (SC#3, D-39). Returns the placed (or idempotently-replayed) booking, or a clean "just taken" message.
 * Bind `db` (the transactional client), NOT an auto-commit connection — the whole point is a real tx.
 */
export async function createPendingHold(db: DbConn, input: CreatePendingHoldInput): Promise<HoldResult> {
  const startsAt = new Date(input.startsAt); // Date for the drizzle timestamptz insert
  const endsAt = new Date(input.endsAt);
  const startIso = startsAt.toISOString(); // ISO strings for the raw sql range/instant binds (Pitfall 3)
  const endIso = endsAt.toISOString();
  const fullDay = input.fullDay ?? false;
  const idempotencyKey = input.idempotencyKey ?? null;
  const idArgs = { listingId: input.listingId, bookerId: input.bookerId, startIso, endIso, idempotencyKey };

  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<HoldResult> => {
        // Server-authoritative listing facts (unitCount + rates) — never trust a client-supplied price.
        const listingRows = await tx
          .select({
            unitCount: listing.unitCount,
            hourlyRateCents: listing.hourlyRateCents,
            dayRateCents: listing.dayRateCents,
          })
          .from(listing)
          .where(eq(listing.id, input.listingId));
        if (listingRows.length === 0) throw new NoUnitAvailableError(); // unknown listing → nothing to hold
        const { unitCount, hourlyRateCents, dayRateCents } = listingRows[0];

        // (1) Own-hold idempotency pre-check (primary, D-42) — replay an existing active hold.
        const existing = await findOwnActiveHold(tx, idArgs);
        if (existing) return { ok: true, id: existing.id, unit: existing.unit, replayed: true };

        // (2) In-tx stale-hold sweep (D-48b): flip overlapping EXPIRED pending holds to cancelled so the
        // EXCLUDE constraint sees the freed slot in THIS transaction (lazy reads alone can't free it).
        await tx.execute(sql`
          UPDATE booking SET status = 'cancelled'
          WHERE listing_id = ${input.listingId} AND status = 'pending' AND expires_at <= now()
            AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')`);

        // (3) Server-frozen price quote (D-45/D-46) + 15-min TTL (D-47).
        const quote = quoteWindow({ startUtc: startsAt, endUtc: endsAt, fullDay, hourlyRateCents, dayRateCents });
        const expiresAt = new Date(Date.now() + HOLD_TTL_MS);

        // (4) Per-unit SAVEPOINT insert loop — the constraint is the sole arbiter of the double-book.
        for (let attempt = 0; attempt < unitCount; attempt++) {
          const unit = await pickLowestFreeUnit(tx, { listingId: input.listingId, startIso, endIso, unitCount });
          if (unit == null) throw new NoUnitAvailableError();
          const id = randomUUID();
          try {
            await tx.transaction(async (sp) => {
              // ← SAVEPOINT: a 23P01 here rolls back ONLY this attempt, leaving the outer tx usable.
              await sp.insert(booking).values({
                id,
                listingId: input.listingId,
                bookerId: input.bookerId,
                unit,
                startsAt,
                endsAt,
                status: "pending",
                expiresAt,
                quotedTotalCents: quote.totalCents,
                currency: quote.currency,
                idempotencyKey,
              });
            });
            return { ok: true, id, unit, replayed: false }; // won the slot — the constraint accepted it
          } catch (e) {
            // 23505 (unique_violation on booking_idem_uq): a concurrent same-key insert won; the winner
            // is committed → return it (YOUR OWN duplicate, never "just taken" — D-42).
            if (isPgError(e, "23505")) {
              const dup = await findOwnActiveHold(tx, idArgs);
              if (dup) return { ok: true, id: dup.id, unit: dup.unit, replayed: true };
              throw e;
            }
            // 23P01 (exclusion_violation): someone holds THIS unit's range. But it may be your OWN
            // concurrent duplicate that raced in on the exclusion index (booking_no_overlap was created
            // before booking_idem_uq, so its constraint fires first) — the winner is committed, so
            // re-check own-hold before ruling the slot taken (the D-42 trap). Else it is genuinely
            // someone else → roll back the savepoint and try the next free unit.
            if (isPgError(e, "23P01")) {
              const mine = await findOwnActiveHold(tx, idArgs);
              if (mine) return { ok: true, id: mine.id, unit: mine.unit, replayed: true };
              continue; // rolled back to the savepoint; the outer tx is intact → next free unit
            }
            throw e; // 40P01 (whole-tx abort) / anything else → propagate to the outer retry / mapper
          }
        }
        throw new NoUnitAvailableError();
      });
    } catch (e) {
      // 40P01 aborts the whole tx and postgres.js does not auto-retry — re-run the whole booking tx.
      if (isPgError(e, "40P01") && txAttempt < MAX_TX_RETRIES - 1) continue;
      return mapBookingError(e); // NoUnitAvailableError | 23P01 | 40P01 → "just taken"; else re-throw
    }
  }
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
