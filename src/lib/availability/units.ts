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
//
// ── D-94 (Phase 7): ONE INVARIANT, ENFORCED EVERYWHERE ───────────────────────────────────────────────
// NO HOLD EVER OUTLIVES ITS OWN SESSION. `expires_at = LEAST(now() + window, starts_at)` on ALL THREE
// hold-write sites: the request SLA and the instant-book hold (both below) and the approval payment
// window (src/app/actions/host-requests.ts). A hold that outlives its session is, in effect, a slot sold
// twice — the calendar keeps showing it held while the session it holds is already running or over.
//
// THE DATABASE CLOCK `now()` IS THE SOLE EXPIRY AUTHORITY. This file deliberately contains ZERO JS clock
// reads — expiry is a SQL expression evaluated by Postgres, in the same transaction as the rows it is
// compared against. A JS clock read is skewed relative to those rows, and it would be captured ONCE
// before the SAVEPOINT retry loop rather than re-evaluated per attempt. Do not reintroduce one; the
// absence of a JS clock read here is asserted by grep in 07-05's acceptance criteria.
//
// D-96 mode-scoped lead-time guards live here too, enforced SERVER-SIDE against now() in the same
// transaction. The SlotPicker's unselectable `too_soon` chips (D-98/D-100) are a COURTESY, never the
// gate — this check runs unconditionally at submit (Security V4).
//
// ── Phase 9 (D-123): THIS FILE NOW CARRIES TWO ARBITERS, NOT ONE ─────────────────────────────────────
// EXCLUSIVE rows (everything above) are arbitrated by the booking_no_overlap GiST EXCLUDE — a DECLARATIVE
// guarantee the database enforces whether or not the app remembers to ask. OPEN-CAPACITY rows
// (createOpenCapacityHold, at the bottom of this file) are arbitrated by a per-(listing, date) admissions
// counter serialized by a TRANSACTION-SCOPED ADVISORY LOCK, because a sum-of-heads cap is not expressible
// as an exclusion constraint (drizzle/0022 therefore removes open rows from the EXCLUDE entirely).
//
// That difference is the thing to remember: the counter's guarantee is PROCEDURAL. It holds only while the
// claim actually takes the lock before it counts. Deleting one line silently converts the counter into the
// count-then-insert race CLAUDE.md forbids, and nothing in the schema would object. This is the Phase-8
// Layer-2 scar (tests/group/seat-claim-race.test.ts): tests/availability/open-capacity-race.test.ts drives
// the REAL createOpenCapacityHold over two connections and goes RED when the lock line is removed.

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { booking, listing } from "@/lib/db/schema";
import { isPgError } from "@/lib/pg";
import { MAX_MONEY_CENTS, quoteOpenCapacity, quoteWindow } from "@/lib/booking/pricing";
import { computeServiceFee } from "@/lib/payments/service-fee";
import {
  APPROVAL_SLA_HOURS,
  MIN_APPROVE_WINDOW_HOURS,
  MIN_LEAD_INSTANT_MINUTES,
  MIN_LEAD_REQUEST_HOURS,
} from "@/lib/payments/config";
import { openTakenSql, PAST_DATE_MESSAGE, SOLD_OUT_MESSAGE } from "./open-capacity";
// CR-02, on a SECOND import statement so the line above stays byte-identical: it is the shared-predicate
// import the Pitfall-4 diff gates read, and a closed date is a different fact from an occupied one.
import { BLOCKED_DATE_MESSAGE, openBlockedSql } from "./open-capacity";
import { BOOKING_HORIZON_DAYS } from "./slots";
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
    // DORMANT path (no live caller — createPendingHold is the real booking mutation). Widened to the full
    // 06-01 occupying set {pending,confirmed,requested,approved} for defense-in-depth/consistency so this
    // probe can never under-report occupancy if ever revived; not load-bearing (the EXCLUDE arbitrates).
    const occupied = await dbConn.execute(sql`
      SELECT DISTINCT unit FROM booking
      WHERE listing_id = ${listingId}
        AND status IN ('pending','confirmed','requested','approved')
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
  /**
   * The slot-holding status to mint (D-63). Defaults to `'pending'` (the 15-min instant hold) so the
   * existing instant call site is unchanged; the 06-04 request branch passes `'requested'` to mint a
   * request-to-book hold WITHOUT forking the SAVEPOINT/40P01-retry/idempotency transaction.
   */
  holdStatus?: "pending" | "requested";
  /**
   * Hold TTL in milliseconds — the window BEFORE the D-94 session-start cap and the D-96 split are
   * applied. Defaults per mode: HOLD_TTL_MS (15 min) for an instant hold, APPROVAL_SLA_HOURS for a
   * request (so a caller that omits it can never accidentally mint a 15-minute approval SLA).
   */
  ttlMs?: number;
  /**
   * D-61 creation-time booking-mode SNAPSHOT (display/audit only — lifecycle correctness rests on
   * `status`, not this column). Persisted into booking.bookingMode when provided; the instant path
   * leaves it NULL as before.
   */
  bookingMode?: "instant" | "request";
  /**
   * D-108 organizer-declared attendee headcount, captured at placeHold. Drives the pax surcharge ONLY
   * when the listing's extra_head_fee > 0 — the fee + `included` are read SERVER-SIDE from the listing row
   * inside the tx (never trusted from the client). Persisted onto the booking row ONLY when the fee > 0; a
   * flat listing has no surcharge machinery and leaves booking.declared_pax NULL (D-108). Absent ⇒ the
   * quote is byte-identical to today.
   */
  declaredPax?: number;
};

/**
 * A placed (or idempotently-replayed) hold, or a clean user-facing conflict message (mapBookingError).
 *
 * `expiresAt` is the DB-COMPUTED expiry (Pitfall 8). Since D-94 the value is a SQL expression evaluated
 * by Postgres, so it is NOT known client-side at insert time — it is read back via `.returning()` (fresh
 * insert) or re-selected (idempotent replay) and handed to the caller for the countdown UI. It is
 * `null` ONLY on the replay of an already-`confirmed` booking, which has no live hold expiry at all —
 * typed honestly so a consumer cannot render `new Date(null)` as a silent Invalid Date.
 */
export type HoldSuccess = {
  ok: true;
  id: string;
  unit: number;
  replayed: boolean;
  expiresAt: Date | null;
  /**
   * The D-74 FROZEN TRIPLE, read back off the row so a REPLAY returns exactly what a fresh insert
   * returned (07-RESEARCH Finding 2). Three values, not one:
   *   spacePriceCents  — the listing-priced portion. The PAYOUT basis (payout-sweep grosses on this).
   *   serviceFeeCents  — platform revenue, NON-REFUNDABLE. Never enters a payout.
   *   quotedTotalCents — space + fee. The CHARGE basis: what PayMongo charges, what a refund references.
   * Nullable only for a replayed pre-Phase-7 row whose split was never frozen.
   */
  spacePriceCents: number | null;
  serviceFeeCents: number | null;
  quotedTotalCents: number | null;
};
export type HoldResult = HoldSuccess | { error: string };

// Only the raw `.execute(sql)` surface is needed by the probe/idempotency helpers; both the top-level
// DbConn and the transaction handle satisfy it, so they run inside or outside a tx unchanged.
type SqlExecutor = Pick<DbConn, "execute">;

/**
 * The booker's own ACTIVE hold (an unexpired pending|requested|approved hold | confirmed) for this exact
 * window OR idempotency key, if any. The PRIMARY idempotency guard (D-42): re-entering checkout for a
 * window you already hold — or a concurrent same-key submit whose winner has committed — returns the SAME
 * booking, never a false "just taken". Uses the SAME widened lazy-expiry occupancy predicate + SQL now()
 * (DB clock) as the read model and the booking_no_overlap EXCLUDE (D-63: requested/approved occupy).
 *
 * Selects `expires_at` too (Pitfall 8): the idempotent-replay paths must return the SAME real expiry a
 * fresh insert returns, or the countdown silently breaks on exactly the re-entering-checkout case the
 * replay exists to serve. NULL only for a `confirmed` row (no live hold expiry).
 *
 * Selects the D-74 FROZEN TRIPLE for the same reason: a replay must hand the caller the price split that
 * was frozen at the ORIGINAL creation, never a fresh recompute. Recomputing on replay would silently
 * re-price a booking whose listing rate (or SERVICE_FEE_BPS) moved in between — precisely the drift D-49's
 * freeze exists to prevent, and it would show a re-entering booker a different total than they were quoted.
 */
async function findOwnActiveHold(
  tx: SqlExecutor,
  args: { listingId: string; bookerId: string; startIso: string; endIso: string; idempotencyKey: string | null },
): Promise<{
  id: string;
  unit: number;
  expiresAt: Date | null;
  spacePriceCents: number | null;
  serviceFeeCents: number | null;
  quotedTotalCents: number | null;
} | null> {
  const rows = (await tx.execute(sql`
    SELECT id, unit, expires_at, space_price_cents, service_fee_cents, quoted_total_cents FROM booking
    WHERE listing_id = ${args.listingId}
      AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
      AND (
        ${args.idempotencyKey != null ? sql`idempotency_key = ${args.idempotencyKey}` : sql`false`}
        OR (booker_id = ${args.bookerId} AND starts_at = ${args.startIso} AND ends_at = ${args.endIso})
      )
    ORDER BY created_at ASC
    LIMIT 1
  `)) as unknown as {
    id: string;
    unit: number;
    expires_at: Date | string | null;
    space_price_cents: number | null;
    service_fee_cents: number | null;
    quoted_total_cents: number | null;
  }[];
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    unit: r.unit,
    // `expires_at` is the ONLY timestamptz here; the three money columns are int4 and arrive as JS numbers,
    // so they need no boundary hydration (07-06's to_char rule applies to timestamps, not integers).
    expiresAt: r.expires_at == null ? null : new Date(r.expires_at),
    spacePriceCents: r.space_price_cents,
    serviceFeeCents: r.service_fee_cents,
    quotedTotalCents: r.quoted_total_cents,
  };
}

/**
 * Advisory find-free probe: the lowest unit in [1, unitCount] with no occupying row overlapping the
 * window. Uses the SAME widened lazy-expiry predicate ({pending,requested,approved} unexpired | confirmed)
 * + half-open '[)' bound as the read model and the EXCLUDE constraint (D-63), so (after the in-tx sweep)
 * it never picks a slot the constraint would clearly reject. Returns null when every unit is occupied.
 * The DB — not this probe — is the final authority.
 */
async function pickLowestFreeUnit(
  tx: SqlExecutor,
  args: { listingId: string; startIso: string; endIso: string; unitCount: number },
): Promise<number | null> {
  const occupied = (await tx.execute(sql`
    SELECT DISTINCT unit FROM booking
    WHERE listing_id = ${args.listingId}
      AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
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
  const holdStatus = input.holdStatus ?? "pending"; // D-63: default keeps the instant hold unchanged
  // Default per mode so an omitted ttlMs can never mint a 15-minute approval SLA (D-95: the request
  // window IS APPROVAL_SLA_HOURS). Converted to whole MINUTES for make_interval — the SQL expression is
  // the authority now, so this is only ever the pre-cap window WIDTH, never an absolute instant.
  const ttlMs = input.ttlMs ?? (holdStatus === "requested" ? APPROVAL_SLA_HOURS * 60 * 60 * 1000 : HOLD_TTL_MS);
  const ttlMinutes = Math.max(1, Math.round(ttlMs / 60_000));
  const bookingMode = input.bookingMode ?? null; // D-61 snapshot (NULL for the legacy instant path)

  // ── D-94 expiry, computed by POSTGRES (never the JS clock) and capped at the session start ──────────
  // `starts_at` here is a value being INSERTED, not a column being read, so it is parameterised as
  // ${startIso}::timestamptz rather than named as a column. ISO STRINGS are bound into raw `sql`
  // templates (postgres.js throws ERR_INVALID_ARG_TYPE on a JS Date in a raw template; the JS `Date`
  // stays only for the drizzle timestamptz insert) — the established Phase-3 convention.
  //
  // INSTANT path: LEAST(now() + ttl, starts_at). A 15-minute hold placed 5 minutes before the session
  // expires when the session starts, not 10 minutes into it.
  //
  // REQUEST path: the D-96 PROPORTIONAL SPLIT, so a cap-shortened SLA never eats the booker's whole
  // window. Host SLA = min(ttl, half the time to start), floored at MIN_APPROVE_WINDOW_HOURS (D-93),
  // then capped at starts_at (D-94).
  //   Worked check — a request 4h out: (4h)/2 = 2h; LEAST(24h, 2h) = 2h; GREATEST(1h, 2h) = 2h.
  //   Host SLA = now+2h and the booker gets the remaining 2h — NOT host 3h59m and booker one minute.
  // The outer LEAST(..., starts_at) is belt-and-braces (half the time to start can never exceed the
  // time to start); it stays as the structural guarantee that D-94's one invariant holds at this site.
  const expiresAtSql =
    holdStatus === "requested"
      ? sql`LEAST(
          now() + GREATEST(
            make_interval(hours => ${MIN_APPROVE_WINDOW_HOURS}::int),
            LEAST(
              make_interval(mins => ${ttlMinutes}::int),
              (${startIso}::timestamptz - now()) / 2
            )
          ),
          ${startIso}::timestamptz
        )`
      : sql`LEAST(
          now() + make_interval(mins => ${ttlMinutes}::int),
          ${startIso}::timestamptz
        )`;

  // D-93/D-96 lead-time guard, MODE-SCOPED. Request-to-book needs TWO humans in sequence (host approves,
  // then booker pays) so it needs hours. Instant-book is ONE person and ONE checkout, so it gets a
  // checkout-sized minutes guard — deliberately small so same-day instant-book stays available.
  const leadIntervalSql =
    holdStatus === "requested"
      ? sql`make_interval(hours => ${MIN_LEAD_REQUEST_HOURS}::int)`
      : sql`make_interval(mins => ${MIN_LEAD_INSTANT_MINUTES}::int)`;
  const leadError =
    holdStatus === "requested"
      ? "That start time is too soon to request — this host needs a few hours' notice. Pick a later time."
      : "That start time is too soon to book. Pick a time at least half an hour out.";
  const idArgs = { listingId: input.listingId, bookerId: input.bookerId, startIso, endIso, idempotencyKey };

  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<HoldResult> => {
        // Server-authoritative listing facts (unitCount + rates) — never trust a client-supplied price.
        //
        // The D-93/D-96 lead-time guard rides ALONG on this SAME round trip as a computed column. That is
        // deliberate: this transaction races other bookers on the booking_no_overlap EXCLUDE, and every
        // ADDED statement between the own-hold pre-check and the insert widens the window in which the
        // D-42 own-duplicate conflation has to be untangled. Evaluating the guard here costs nothing, and
        // it is still the DB clock, still in-transaction, and still ahead of every write.
        //
        // The D-67 cancellation tier rides along on this SAME read for the same reason, and one more: it is
        // read INSIDE the transaction that inserts the booking, so the snapshot is transactionally
        // consistent with the hold. Sourcing it from an out-of-transaction read in the caller would leave a
        // window in which a host retiers between the read and the insert, freezing a tier that was never
        // simultaneously true of the listing.
        const listingRows = await tx
          .select({
            unitCount: listing.unitCount,
            hourlyRateCents: listing.hourlyRateCents,
            dayRateCents: listing.dayRateCents,
            cancellationPolicy: listing.cancellationPolicy,
            // D-108 group-pricing facts, read INSIDE the tx alongside the rates (never a client-supplied
            // price). Nullable on a flat listing → coalesced by quoteWindow; a NULL fee means no surcharge.
            included: listing.included,
            extraHeadFee: listing.extraHeadFee,
            // CR-03 / D-111: the headcount CAP, read in the SAME transaction as the rates so the clamp is
            // transactionally consistent with the price it bounds. The client never supplies a bound.
            maxOccupancy: listing.maxOccupancy,
            leadOk: sql<boolean>`(${startIso}::timestamptz >= now() + ${leadIntervalSql})`,
          })
          .from(listing)
          .where(eq(listing.id, input.listingId));
        if (listingRows.length === 0) throw new NoUnitAvailableError(); // unknown listing → nothing to hold
        const { unitCount, hourlyRateCents, dayRateCents, included, extraHeadFee, maxOccupancy, leadOk } =
          listingRows[0];
        const listingCancellationPolicy = listingRows[0].cancellationPolicy;

        // D-93/D-96 lead-time guard, enforced SERVER-SIDE against now(). The SlotPicker's unselectable
        // `too_soon` chips (D-98/D-100) are a COURTESY, never the gate — this runs unconditionally at
        // submit (Security V4 / T-07-22), so a crafted POST of a disabled slot is refused right here,
        // before any write. Returned through the EXISTING HoldResult error channel — no new branch for
        // callers, no new failure shape.
        if (!leadOk) return { error: leadError };

        // (1) Own-hold idempotency pre-check (primary, D-42) — replay an existing active hold.
        const existing = await findOwnActiveHold(tx, idArgs);
        if (existing) return { ok: true, ...existing, replayed: true };

        // (2) In-tx stale-hold sweep (D-48b): flip EVERY overlapping EXPIRED slot-holding hold
        // (pending | requested | approved) out of the occupying set so the EXCLUDE constraint sees the
        // freed slot in THIS transaction (a lazy read alone can't free it — the DB EXCLUDE counts a lapsed
        // requested/approved row until it's flipped). The terminal status MIRRORS the 06-06 SLA cron's
        // mapping (Warning-1 reconciliation): a lapsed `requested` → `declined` (the cron's decline
        // target), a lapsed `pending`/`approved` → `cancelled`. Casting the CASE to booking_status because
        // an all-literal CASE resolves to `text`, which cannot assign to the enum column. Fire NO email
        // in-tx — a Resend call inside this SAVEPOINT/rollback/retry tx is unsafe; the cron is the SOLE
        // booker-email authority, and the email dropped on this rare in-tx-reclaim edge is an accepted
        // bounded race (Assumption A6, 06-RESEARCH).
        await tx.execute(sql`
          UPDATE booking
          SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END)::booking_status,
              expires_at = NULL
          WHERE listing_id = ${input.listingId}
            AND status IN ('pending','requested','approved') AND expires_at <= now()
            AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')`);

        // (3) Server-frozen price quote (D-45/D-46) + the D-74 service fee composed AT THE CALLER. The TTL
        // is NOT computed here any more — `expiresAtSql` (D-94) is evaluated by Postgres inside the insert,
        // and is therefore RE-EVALUATED on each SAVEPOINT attempt rather than captured once before the loop.
        //
        // D-108: the pax surcharge is re-derived here from the listing's OWN included/extra_head_fee (read
        // above, server-side) and the organizer's declaredPax — the client sends no price. With extra_head_fee
        // absent/0 the quote is byte-identical to today (backward-compat). Per A1 the surcharge folds into
        // quote.totalCents, which is frozen as spacePriceCents below — so it becomes the payout gross basis AND
        // the service-fee basis (computeServiceFee(quote.totalCents)) automatically, and quoted == space + fee
        // still holds by construction. The Phase-5 hold-until-session rail is untouched (D-107).
        //
        // CR-03: the headcount is CLAMPED here, before it can reach the quote. The cap is the LISTING's own
        // maxOccupancy (read above, in this same tx) — the stepper's `max` and the schema's `.max(10_000)` are
        // a courtesy and a shape ceiling respectively, never the gate (Security V4 / T-08-30). A clamped value
        // is a SUCCESS, not a refusal: the booker gets the price for the headcount the listing can hold.
        //
        // ⚠️ The null-maxOccupancy fallback is 1, and it is DELIBERATELY DIFFERENT from `updateDeclaredPax`'s
        // fallback (`src/app/actions/booking.ts:376`, which falls back to the client's own value). Do NOT
        // "harmonise" the two: this is the CREATION path reachable by a crafted POST, so a listing with no
        // capacity recorded must fail CLOSED to a surcharge-free headcount of 1 rather than trust the
        // submitted number. The re-price path is already owner-gated on an existing hold.
        const paxCap = maxOccupancy != null && maxOccupancy > 0 ? maxOccupancy : 1;
        const declaredPax =
          input.declaredPax == null ? undefined : Math.min(Math.max(1, input.declaredPax), paxCap);
        const quote = quoteWindow({
          startUtc: startsAt,
          endUtc: endsAt,
          fullDay,
          hourlyRateCents,
          dayRateCents,
          included: included ?? undefined,
          extraHeadFee: extraHeadFee ?? undefined,
          declaredPax,
        });
        // D-108: record declaredPax ONLY when the listing actually charges per head (extra_head_fee > 0). On a
        // flat listing there is no surcharge machinery and no declaredPax to persist — the column stays NULL.
        // The CLAMPED value is what persists (CR-03) — booking.declared_pax can never exceed the listing's cap.
        const declaredPaxToPersist = (extraHeadFee ?? 0) > 0 ? (declaredPax ?? null) : null;
        // Finding 2 — THREE frozen values, not one. `quotedTotalCents` stays "the amount actually charged"
        // (ALL-IN: what PayMongo charges and what a refund references). `spacePriceCents` is the PAYOUT
        // basis; `serviceFeeCents` is NON-REFUNDABLE platform revenue (D-74). Paying out 90% of the all-in
        // total would hand the host 90% of the platform's OWN service fee, inverting the purpose of D-74.
        //
        // Composed HERE and not inside quoteWindow: quoteWindow is a pure function over the listing's rates
        // and must NOT learn about platform fees. Composing at the caller preserves the Phase-4 pure-pricing
        // seam and keeps its tests valid. `allInCents` is an ADDITION of the two frozen values, never a
        // second rounding, so `quoted == space + fee` holds exactly at every price point.
        const fee = computeServiceFee(quote.totalCents);

        /**
         * EVERY "units exhausted" exit routes through here — the D-42 trap, in its last remaining form.
         *
         * Step (1)'s own-hold pre-check and the find-free probe are DIFFERENT statements, and under
         * READ COMMITTED each takes a fresh snapshot. So a concurrent submit of YOUR OWN idempotency key
         * or window can commit in between: step (1) saw nothing, and now the only unit reads as occupied
         * — by your own booking. Throwing NoUnitAvailableError there would map to "That time was just
         * taken", which is precisely the false conflict D-42 exists to prevent, and it is a LIE: you got
         * the slot. The 23P01/23505 handlers below already re-check own-hold for the same reason; this
         * closes the one path that reaches exhaustion WITHOUT ever attempting an insert.
         *
         * A genuine loser (a DIFFERENT booker, no matching key/window) still finds nothing here and gets
         * the honest "just taken" — the exclusion constraint remains the sole arbiter of the double-book.
         */
        const exhausted = async (): Promise<HoldResult> => {
          const mine = await findOwnActiveHold(tx, idArgs);
          if (mine) return { ok: true, ...mine, replayed: true };
          throw new NoUnitAvailableError();
        };

        // (4) Per-unit SAVEPOINT insert loop — the constraint is the sole arbiter of the double-book.
        for (let attempt = 0; attempt < unitCount; attempt++) {
          const unit = await pickLowestFreeUnit(tx, { listingId: input.listingId, startIso, endIso, unitCount });
          if (unit == null) return await exhausted();
          const id = randomUUID();
          try {
            // Read the DB-computed expiry straight back out of the insert (Pitfall 8) — with a SQL
            // expression the value is unknowable client-side, and a missing countdown would NOT fail tsc.
            const frozen = await tx.transaction(async (sp) => {
              // ← SAVEPOINT: a 23P01 here rolls back ONLY this attempt, leaving the outer tx usable.
              const inserted = await sp
                .insert(booking)
                .values({
                  id,
                  listingId: input.listingId,
                  bookerId: input.bookerId,
                  unit,
                  startsAt,
                  endsAt,
                  status: holdStatus, // D-63: 'pending' (instant, default) or 'requested' (request-to-book)
                  bookingMode, // D-61 creation-time snapshot (NULL for the legacy instant path)
                  // WR-06 (07-17) — the creation-time PRICING-MODE snapshot: the SAME flag quoteWindow just
                  // froze the price with, persisted so price-determining consumers (re-request) can read the
                  // mode instead of re-deriving it against the listing's CURRENT rates (which a host edit
                  // makes lie). Every future hold — instant, request, re-request — freezes it here.
                  fullDay,
                  expiresAt: expiresAtSql, // D-94: LEAST(now() + window, starts_at), computed by Postgres
                  // D-74 frozen triple. quoted == space + fee, EXACTLY, by construction (addition, not a
                  // second rounding). Nothing downstream may re-derive any of the three from the others.
                  spacePriceCents: quote.totalCents,
                  serviceFeeCents: fee.serviceFeeCents,
                  quotedTotalCents: fee.allInCents,
                  currency: quote.currency,
                  // D-67 creation-time cancellation-tier SNAPSHOT, exactly like bookingMode (D-61). Captured
                  // here so a later listing retier NEVER rewrites the refund terms of an in-flight booking.
                  // The refund calculator reads THIS column, never the listing's current value (T-07-43).
                  cancellationPolicy: listingCancellationPolicy,
                  // D-108: the declared headcount that priced this booking — persisted ONLY when the listing
                  // charges per head (else NULL). Frozen alongside the price so a later listing edit can't lie.
                  declaredPax: declaredPaxToPersist,
                  idempotencyKey,
                })
                .returning({
                  expiresAt: booking.expiresAt,
                  spacePriceCents: booking.spacePriceCents,
                  serviceFeeCents: booking.serviceFeeCents,
                  quotedTotalCents: booking.quotedTotalCents,
                });
              return inserted[0] ?? null;
            });
            // Read the frozen values straight back OUT of the insert rather than echoing the locals: the
            // caller must see what was PERSISTED, which is the same guarantee the replay path gives.
            return {
              ok: true,
              id,
              unit,
              replayed: false,
              expiresAt: frozen?.expiresAt ?? null,
              spacePriceCents: frozen?.spacePriceCents ?? null,
              serviceFeeCents: frozen?.serviceFeeCents ?? null,
              quotedTotalCents: frozen?.quotedTotalCents ?? null,
            }; // won — the constraint accepted it
          } catch (e) {
            // 23505 (unique_violation on booking_idem_uq): a concurrent same-key insert won; the winner
            // is committed → return it (YOUR OWN duplicate, never "just taken" — D-42).
            if (isPgError(e, "23505")) {
              const dup = await findOwnActiveHold(tx, idArgs);
              if (dup) return { ok: true, ...dup, replayed: true };
              throw e;
            }
            // 23P01 (exclusion_violation): someone holds THIS unit's range. But it may be your OWN
            // concurrent duplicate that raced in on the exclusion index (booking_no_overlap was created
            // before booking_idem_uq, so its constraint fires first) — the winner is committed, so
            // re-check own-hold before ruling the slot taken (the D-42 trap). Else it is genuinely
            // someone else → roll back the savepoint and try the next free unit.
            if (isPgError(e, "23P01")) {
              const mine = await findOwnActiveHold(tx, idArgs);
              if (mine) return { ok: true, ...mine, replayed: true };
              continue; // rolled back to the savepoint; the outer tx is intact → next free unit
            }
            throw e; // 40P01 (whole-tx abort) / anything else → propagate to the outer retry / mapper
          }
        }
        return await exhausted(); // every unit lost — own-hold re-checked before ruling it "just taken"
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

// ── Phase 9 (OPEN-03 / D-123): the OPEN-CAPACITY admissions claim ────────────────────────────────────
// A drop-in pass sells ADMISSIONS on a date, not exclusive use of a window (OC-02/OC-03), so the cap is a
// SUM of heads and the arbiter is the advisory-lock counter described in this file's header — never the
// EXCLUDE (drizzle/0022 removed open rows from it, which is exactly what lets many bookers hold the same
// date/unit/window simultaneously).
//
// The claim happens at HOLD time, not pay time (09-RESEARCH Pattern 2). That is what leaves the entire
// PayMongo single-payer rail untouched (OC-09) and makes the OC-07 partial fill a PRE-MONEY interaction:
// the booker learns "only 2 of the 4 you asked for are left" before a peso is quoted, and the frozen price
// below is for the GRANTED heads only.

/** A placed (or replayed) open-capacity hold. Extends the exclusive HoldSuccess so every downstream
 *  consumer of the frozen triple / expiry works unchanged. */
export type OpenHoldSuccess = HoldSuccess & {
  /** heads actually claimed — min(requested, remaining) (OC-07). ALWAYS reported, never a silent partial. */
  granted: number;
  /** what the booker asked for, echoed back so the caller can detect a reduction without re-deriving it. */
  requested: number;
};
/** `soldOut` distinguishes OC-13's race-loss from a generic conflict, so the action can return a distinct
 *  reason and the CTA can refresh the calendar (09-UI-SPEC § 3). */
export type OpenHoldResult = OpenHoldSuccess | { error: string; soldOut?: true };

export type CreateOpenCapacityHoldInput = {
  listingId: string;
  bookerId: string;
  /** OC-03: the venue's opening/closing instants on the PICKED DATE (loadOpenDayWindow). PERSISTED as
   *  starts_at/ends_at so the Phase-7 refund ladder, the payout sweep, reminders and expiry all apply
   *  unchanged — an open booking is an ordinary booking row with one extra flag.
   *
   *  This pair is WHAT THE PASS COVERS. It is derived from the listing's CURRENT operating hours, so it
   *  MOVES when a host edits them — which is correct, and is exactly why it must not also be the counter. */
  dayOpenUtc: Date | string;
  dayCloseUtc: Date | string;
  /** The venue-local calendar day and its `YYYY-MM-DD` key (venueDayBoundsUtc). This triple is WHAT THE PASS
   *  COUNTS AGAINST — the lock key, the expiry sweep's scope, the replay scope and the heads SUM — and it is
   *  NEVER written to a column. Fixed by the calendar, so a host cannot move it (CR-03). Keeping the two
   *  pairs apart is the whole fix: an hours edit changes what a pass covers, never which passes count. */
  dayStartUtc: Date | string;
  dayEndUtc: Date | string;
  dateKey: string;
  /** OC-06 heads on one payment. Shape-validated by the caller; the REAL bound is the listing's cap, read
   *  INSIDE this transaction (Security V4 — never a client-supplied bound). */
  requestedHeads: number;
  idempotencyKey?: string | null;
};

/**
 * The booker's OWN active open hold for this listing + date (D-42 idempotency), or null. Mirrors
 * findOwnActiveHold, with two deliberate differences: the occupying set drops requested/approved (open
 * capacity is INSTANT-ONLY, OC-10) and the window match is the VENUE-LOCAL DAY alone — a date IS the window,
 * so there is nothing else to compare. Returns the row's frozen triple + granted heads so a replay hands back
 * exactly what the original insert froze, never a fresh recompute (the D-49 drift rule).
 *
 * The day match is the half-open range rather than an equality against the venue's re-derived opening
 * instant (CR-03): after a host edits operating hours a booker's own live hold sits on the OLD instant, and
 * an equality would miss it — the replay would silently become a SECOND claim by the same person.
 *
 * ⚠️ THIS PREDICATE IS NOT FINISHED, and the rest of it is deliberately out of scope here: the
 * `status = 'confirmed'` branch (CR-06) and the UNSCOPED `idempotency_key` branch (WR-01) are 09-23's.
 */
async function findOwnOpenHold(
  tx: SqlExecutor,
  args: {
    listingId: string;
    bookerId: string;
    dayStartIso: string;
    dayEndIso: string;
    idempotencyKey: string | null;
  },
): Promise<{
  id: string;
  unit: number;
  expiresAt: Date | null;
  spacePriceCents: number | null;
  serviceFeeCents: number | null;
  quotedTotalCents: number | null;
  granted: number;
} | null> {
  const rows = (await tx.execute(sql`
    SELECT id, unit, expires_at, space_price_cents, service_fee_cents, quoted_total_cents, declared_pax
    FROM booking
    WHERE listing_id = ${args.listingId}
      AND open_capacity = true
      AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
      AND (
        ${args.idempotencyKey != null ? sql`idempotency_key = ${args.idempotencyKey}` : sql`false`}
        OR (booker_id = ${args.bookerId}
            AND starts_at >= ${args.dayStartIso}::timestamptz
            AND starts_at < ${args.dayEndIso}::timestamptz)
      )
    ORDER BY created_at ASC
    LIMIT 1
  `)) as unknown as {
    id: string;
    unit: number;
    expires_at: Date | string | null;
    space_price_cents: number | null;
    service_fee_cents: number | null;
    quoted_total_cents: number | null;
    declared_pax: number | null;
  }[];
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    unit: r.unit,
    expiresAt: r.expires_at == null ? null : new Date(r.expires_at),
    spacePriceCents: r.space_price_cents,
    serviceFeeCents: r.service_fee_cents,
    quotedTotalCents: r.quoted_total_cents,
    // An open row ALWAYS carries declared_pax (that is what the counter sums); the coalesce is type honesty
    // for the nullable column, not a real branch.
    granted: r.declared_pax ?? 1,
  };
}

/**
 * Claim `requestedHeads` admissions on one (listing, date) and mint ONE ordinary booking row for them
 * (D-123). Grants min(requested, remaining) and REPORTS the granted count (OC-07) — never a silent partial;
 * refuses at 0 remaining with the OC-13 sold-out copy. Bind `db` (the transactional client), NOT an
 * auto-commit connection: the advisory lock is transaction-scoped, so without a real transaction it would
 * release immediately and guarantee nothing.
 */
export async function createOpenCapacityHold(
  db: DbConn,
  input: CreateOpenCapacityHoldInput,
): Promise<OpenHoldResult> {
  const dayOpen = new Date(input.dayOpenUtc); // Date for the drizzle timestamptz insert
  const dayClose = new Date(input.dayCloseUtc);
  const openIso = dayOpen.toISOString(); // ISO strings for the raw sql binds (postgres.js casts)
  const closeIso = dayClose.toISOString();
  // THE COUNTER'S IDENTITY (CR-03), kept in locals distinct from the pair above so the two can never be
  // confused at a call site: the open/close instants say what the pass COVERS, these say what it COUNTS
  // AGAINST. Neither dayStartIso/dayEndIso nor dateKey is ever written to a column.
  const dayStartIso = new Date(input.dayStartUtc).toISOString();
  const dayEndIso = new Date(input.dayEndUtc).toISOString();
  const dateKey = input.dateKey;
  const idempotencyKey = input.idempotencyKey ?? null;

  // ── The D-94 invariant, with the cap moved from starts_at to ENDS_AT — a DELIBERATE divergence ───────
  // "No hold ever outlives its own SESSION" still holds; what changed is where the session ends. A drop-in
  // pass's starts_at is the venue's OPENING instant, so createPendingHold's LEAST(now() + ttl, starts_at)
  // would be ALREADY IN THE PAST for any same-day claim made after opening — the hold would lapse the
  // instant it was minted and the booker could never reach checkout (a silent showstopper, not a slow bug).
  // The session a pass buys runs until CLOSING, so ends_at is the correct cap: the invariant is preserved,
  // not weakened. Computed by POSTGRES (the file's zero-JS-clock rule), re-evaluated per tx attempt.
  const openExpiresAtSql = sql`LEAST(
    now() + make_interval(mins => ${HOLD_TTL_MINUTES}::int),
    ${closeIso}::timestamptz
  )`;

  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<OpenHoldResult> => {
        // (1) TAKE THE LOCK — the FIRST statement in the transaction, spanning sweep → SUM → INSERT.
        //
        // Transaction-scoped, so it auto-releases at COMMIT *and* ROLLBACK (09-RESEARCH Pitfall 6): a
        // crashed or rolled-back claim can never wedge a date. The session-scoped `pg_advisory_lock` is
        // deliberately NOT used, and the lock must be taken on THIS connection — acquiring it elsewhere
        // leaves the SUM→insert unprotected, which is the whole failure mode.
        //
        // `hashtextextended` is IMMUTABLE and returns the bigint the lock takes. Keying on
        // `listing_id || ':' || <venue-local YYYY-MM-DD>` means only same-date claimers contend — that
        // answers D-112's "a per-parent-row lock is too coarse" WITHOUT inventing a physical capacity row to
        // lock. A hash collision can only ever OVER-serialize two unrelated (listing, date) pairs, never
        // under-serialize them, so it is correctness-safe by construction.
        //
        // ⚠️ THE KEY'S SECOND TERM IS THE CALENDAR DATE, NOT THE VENUE'S OPENING INSTANT — that was CR-03.
        // The opening instant is re-derived from the listing's CURRENT operating hours, so a host shifting
        // Monday's opening 06:00 → 07:00 produced a DIFFERENT key: two disjoint lock domains for one date,
        // each blind to the other's rows, and the second could sell a whole extra cap with no constraint
        // violation and no error. A stable date key means only the venue's own calendar can change what
        // contends. Never re-point this at anything a host can edit.
        //
        // ⚠️ NO EXTERNAL I/O MAY OCCUR BETWEEN THIS LINE AND COMMIT — no fetch, no email, no job emit. Every
        // statement below is local SQL, and the notification (if any) is emitted post-commit by the caller.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(
          hashtextextended(${input.listingId}::text || ':' || ${dateKey}::text, 0))`);

        // (2) Own-hold idempotency pre-check (D-42), INSIDE the lock. The plan sketched this ahead of the
        // lock; it runs after it so the "lock first" rule above is literal and a replay observes the same
        // serialized view as a fresh claim. A double-click therefore returns the SAME booking with the SAME
        // granted heads instead of claiming a second set of seats (threat T-09-08).
        const existing = await findOwnOpenHold(tx, {
          listingId: input.listingId,
          bookerId: input.bookerId,
          dayStartIso,
          dayEndIso,
          idempotencyKey,
        });
        if (existing) return { ok: true, ...existing, replayed: true, requested: input.requestedHeads };

        // (3) In-tx lazy-expiry sweep, scoped to this listing + VENUE-LOCAL DAY — the same range the SUM
        // below counts, never the opening instant (CR-03). A lapsed open hold must leave the counted set
        // inside THIS transaction or its heads stay claimed for the SUM; a hold minted under the OLD
        // operating hours would otherwise be invisible to a claim made under the NEW ones and stay claimed
        // FOREVER, since nothing else ever writes at expiry (D-48a). The terminal status is always
        // `cancelled` — there is no requested→declined branch, because open capacity is instant-only
        // (OC-10). No email crosses this boundary (see the lock's I/O rule).
        await tx.execute(sql`
          UPDATE booking SET status = 'cancelled', expires_at = NULL
          WHERE listing_id = ${input.listingId} AND open_capacity = true
            AND status = 'pending' AND expires_at <= now()
            AND starts_at >= ${dayStartIso}::timestamptz
            AND starts_at < ${dayEndIso}::timestamptz`);

        // (4) Read the cap + per-head rate + cancellation tier and SUM the occupied heads UNDER THE LOCK,
        // in ONE statement. Both date guards are evaluated against the DB clock in the SAME transaction as
        // the rows they gate (zero JS clock). The heads SUM comes from the SHARED openTakenSql fragment —
        // never re-inlined here, so the counter and the read model cannot drift (Pitfall 4) — over the
        // venue-local DAY, so it counts every pass sold for this date whatever hours were in force when it
        // was sold. `day_open_ok` and `horizon_ok` deliberately keep using the CLOSING and OPENING instants:
        // they are about what a pass COVERS, and a venue-local day starting at midnight is not the same fact
        // as a pass window being open. Do not re-point them at the day bounds.
        const rows = (await tx.execute(sql`
          SELECT l.max_occupancy AS cap,
                 l.per_head_price_cents AS per_head,
                 l.cancellation_policy AS cancellation_policy,
                 ${openTakenSql(input.listingId, dayStartIso, dayEndIso)} AS taken,
                 NOT ${openBlockedSql(input.listingId, dayStartIso, dayEndIso)} AS not_blocked,
                 (${closeIso}::timestamptz > now()) AS day_open_ok,
                 (${openIso}::timestamptz < now() + make_interval(days => ${BOOKING_HORIZON_DAYS}::int)) AS horizon_ok
          FROM listing l WHERE l.id = ${input.listingId}
        `)) as unknown as {
          cap: number | null;
          per_head: number | null;
          cancellation_policy: "flexible" | "standard" | "strict" | null;
          taken: number;
          not_blocked: boolean;
          day_open_ok: boolean;
          horizon_ok: boolean;
        }[];
        if (rows.length === 0) throw new NoUnitAvailableError(); // unknown listing → nothing to claim
        const { cap, per_head: perHead, cancellation_policy: listingCancellationPolicy, taken } = rows[0];

        // (5) Refuse a date whose pass window has already closed, or one beyond the booking horizon. The
        // calendar disables those dates, but a picker is a COURTESY and never the gate (Security V4) — a
        // crafted date is refused right here, before any write. Not a race loss, so no `soldOut` flag.
        if (!rows[0].day_open_ok || !rows[0].horizon_ok) return { error: PAST_DATE_MESSAGE };

        // …and refuse a date the HOST has closed (CR-02). Same reasoning, same place, and the placement is
        // the whole point: the block test rode in on the statement above, so it was evaluated INSIDE this
        // transaction and UNDER the advisory lock, against the same shared predicate `getOpenDay` uses. A
        // check in the picker, or a second statement outside the lock, would leave a crafted date payload
        // free to buy a pass for a day the host shut (T-09-64). Bare `{ error }`, no `soldOut`: nothing was
        // sold, so this is not a race and the CTA must not invite a retry on the same date.
        if (!rows[0].not_blocked) return { error: BLOCKED_DATE_MESSAGE };

        // …and refuse a listing whose PRICE PER PERSON is missing or non-positive (CR-04). THE RULE, named
        // once for both money columns this statement reads: EVERY money input the claim takes from the
        // listing row is a FAIL-CLOSED REFUSAL, never a raised error. `mapBookingError` maps only
        // NoUnitAvailableError / 23P01 / 40P01 and re-raises everything else, so anything raised in here IS
        // a 500 on the money path — a Next.js error digest on a booker's payment click (T-09-69/T-09-70).
        // A null cap already obeys this rule at step (6); a null rate now obeys it here, one step earlier,
        // because it must be settled BEFORE quoteOpenCapacity is reached.
        //
        // quoteOpenCapacity's own guard is deliberately LEFT ALONE. It is correct for a pure function
        // holding an invariant, and every other caller still needs it; the fix is that the CLAIM must never
        // hand it a null, not that the invariant should be softened.
        //
        // `<= 0` and not merely `== null`: draftSchema admits 0 on purpose (the instant a host has typed "0"
        // on the way to "350" must still autosave), so a listing switched to drop-in mid-keystroke can carry
        // a persisted zero — and freezing a ₱0 charge sells a pass for nothing.
        //
        // Bare `{ error }` with NO `soldOut` flag, the PAST_DATE_MESSAGE shape: nothing was sold, so this is
        // not a race loss and the CTA must not offer the refresh-and-retry affordance OC-13 gives a real
        // one. It reuses the existing literal rather than inventing a fifth sentence, exactly as the
        // null-cap path does — a booker cannot act on "this listing has no price" and should not be shown a
        // host's configuration mistake as if it were theirs to fix.
        if (perHead == null || perHead <= 0) return { error: SOLD_OUT_MESSAGE };

        // (6) The grant (OC-07). `remaining` is the LISTING's own cap minus the DB's own SUM, both read in
        // this transaction under the lock — a client number can only ever request LESS (threat T-09-05).
        //
        // A listing with NO recorded capacity fails CLOSED to zero admissions (the same fail-closed rule as
        // createPendingHold's paxCap fallback): a mis-configured open listing must never sell an unbounded
        // number of passes. The 09-06 publish gate makes max_occupancy present for every open listing —
        // and, since CR-04, so does the edit path (saveListingStep's published-row guard). This is the cap
        // half of the money rule stated at the rate refusal above: BOTH columns this statement reads are
        // fail-closed refusals rather than raised errors, and neither may reach the quote unsettled.
        //
        // OC-18: there is deliberately NO separate per-booker head cap in v1 — a booker may take up to
        // whatever is remaining, bounded only by the day's cap, and offer-the-partial is how "not enough
        // left" is handled. Do not add a per-booking bound here; it is a recorded fast-follow, not scope.
        const remaining = (cap ?? 0) - taken;
        if (remaining <= 0) return { error: SOLD_OUT_MESSAGE, soldOut: true };
        // Floored to a positive integer so a crafted non-integer / non-positive body cannot reach the quote
        // as a throw; `remaining` is already ≥ 1 here, so the floor can never grant more than is left.
        const granted = Math.max(1, Math.floor(Math.min(input.requestedHeads, remaining)));

        // …and the LAST money input to settle before the quote: the PRODUCT (WR-04). Everything above
        // bounds one number; this bounds what two of them multiply to. The three money columns are int4, so
        // a product past MAX_MONEY_CENTS is a Postgres 22003 raised by the INSERT — neither 23P01 nor 40P01,
        // therefore re-raised by mapBookingError as a raw 500 on the money path, which is the same T-09-69
        // failure the rate refusal above exists to prevent, reached by arithmetic instead of by a NULL.
        //
        // THIS LAYER IS FOR LEGACY ROWS, and saying so is the point: publishSchema/draftSchema now cap the
        // host's own inputs (MAX_OPEN_CAPACITY × MAX_PER_HEAD_PRICE_CENTS, proven below int4 where they are
        // declared), so no listing priced AFTER those ceilings landed can reach this branch. A listing
        // priced BEFORE them can, and no schema change reprices an existing row — so without this, the
        // ceilings would protect only listings that never needed protecting. Both figures are checked: the
        // space price and the D-74 all-in, because the fee rides ON TOP and quoted_total_cents is int4 too.
        //
        // Same calm refusal as the rate check — bare `{ error }`, no `soldOut` flag: nothing was sold.
        const spaceCents = perHead * granted;
        if (
          !Number.isSafeInteger(spaceCents) ||
          spaceCents > MAX_MONEY_CENTS ||
          computeServiceFee(spaceCents).allInCents > MAX_MONEY_CENTS
        ) {
          return { error: SOLD_OUT_MESSAGE };
        }

        // (7) Freeze the money for the GRANTED heads (OC-08 linear per-head, no duration term) and compose
        // the D-74 service fee AT THE CALLER, exactly as the exclusive path does — quoteOpenCapacity stays
        // pure over the listing's own rate. quoted == space + fee by construction (addition, not a second
        // rounding), so the Phase-5/7 charge, refund and payout math applies to an open row unchanged.
        const quote = quoteOpenCapacity({ perHeadPriceCents: perHead, heads: granted });
        const fee = computeServiceFee(quote.totalCents);
        const id = randomUUID();

        const inserted = await tx
          .insert(booking)
          .values({
            id,
            listingId: input.listingId,
            bookerId: input.bookerId,
            // A SENTINEL, not an assignment: the COUNTER governs open capacity, not the unit. Open listings
            // are single-unit (publish-enforced unitCount = 1, 09-06) and every open row on a date
            // deliberately shares unit 1 — which is exactly why drizzle/0022 removed open rows from
            // booking_no_overlap, whose (listing, unit, range) key they would otherwise all collide on.
            unit: 1,
            status: "pending",
            bookingMode: "instant", // OC-10 creation-time snapshot (D-61) — open capacity is instant-only
            openCapacity: true, // D-123: this row is arbitrated by the counter, not the EXCLUDE
            // A drop-in pass is NOT a full-day rental: the price does not come from the day rate and the
            // display branch keys on booking.open_capacity, never on this flag (09-08 when-label.ts).
            fullDay: false,
            startsAt: dayOpen, // OC-03 — the venue's opening instant on the picked date
            endsAt: dayClose, // …and its closing instant. One date = one pass.
            // ALWAYS set, even when granted === 1. This DELIBERATELY diverges from D-108's
            // `declaredPaxToPersist` fee>0 rule above: the counter's SUM is over declared_pax, so an open
            // row missing it would occupy a seat the read model cannot see. Do not reuse that conditional.
            declaredPax: granted,
            expiresAt: openExpiresAtSql, // LEAST(now() + TTL, ends_at) — see the divergence note above
            spacePriceCents: quote.totalCents,
            serviceFeeCents: fee.serviceFeeCents,
            quotedTotalCents: fee.allInCents,
            currency: quote.currency,
            // D-67 creation-time tier snapshot, so OC-15's refund ladder applies to a pass unchanged.
            cancellationPolicy: listingCancellationPolicy,
            idempotencyKey,
          })
          .returning({
            expiresAt: booking.expiresAt,
            spacePriceCents: booking.spacePriceCents,
            serviceFeeCents: booking.serviceFeeCents,
            quotedTotalCents: booking.quotedTotalCents,
          });
        const frozen = inserted[0] ?? null;

        return {
          ok: true,
          id,
          unit: 1,
          granted,
          requested: input.requestedHeads,
          replayed: false,
          // Read the frozen values straight back OUT of the insert rather than echoing the locals — the
          // caller must see what was PERSISTED, the same guarantee the replay path gives.
          expiresAt: frozen?.expiresAt ?? null,
          spacePriceCents: frozen?.spacePriceCents ?? null,
          serviceFeeCents: frozen?.serviceFeeCents ?? null,
          quotedTotalCents: frozen?.quotedTotalCents ?? null,
        };
      });
    } catch (e) {
      // 40P01 aborts the whole tx and postgres.js does not auto-retry — re-run the whole claim.
      if (isPgError(e, "40P01") && txAttempt < MAX_TX_RETRIES - 1) continue;
      return mapBookingError(e); // NoUnitAvailableError | 23P01 | 40P01 → "just taken"; else re-throw
    }
  }
}
