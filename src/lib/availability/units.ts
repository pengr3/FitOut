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

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { booking, listing } from "@/lib/db/schema";
import { isPgError } from "@/lib/pg";
import { quoteWindow } from "@/lib/booking/pricing";
import { computeServiceFee } from "@/lib/payments/service-fee";
import {
  APPROVAL_SLA_HOURS,
  MIN_APPROVE_WINDOW_HOURS,
  MIN_LEAD_INSTANT_MINUTES,
  MIN_LEAD_REQUEST_HOURS,
} from "@/lib/payments/config";
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
