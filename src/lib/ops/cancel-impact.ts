import "server-only";

// ENF-03 — THE FIGURES THE OPS CONSOLE SHOWS BEFORE ANYBODY'S MONEY MOVES, plus the ONE expression that
// decides what an ops-forced cancellation refunds (D-209 / D-236).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE POLICY EXPRESSION AND THE IMPACT READ LIVE IN THE SAME MODULE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Two things need to answer "what does this cancellation refund?": the DIALOG that shows an operator a
// peso figure before they commit, and the ACTION that moves the money afterwards. 18-UI-SPEC states the
// requirement in one sentence — "the operator is told, in plain words and real numbers, BEFORE they
// commit" — and a dialog that computes the number a second way is a dialog that can disagree with the
// server that will move it. That is PROJECT D-130 / GATE-05's whole shape.
//
// 18-04's finding, carried forward, is the other half: THE COMPILER CENSUS COUNTS CALLERS, NOT
// RESTATEMENTS. So both readers CALL `opsRefundBasisCents` below; neither restates the ternary. That
// keeps the constant read at exactly ONE site, which is what D-236 asks for, and it is why this file —
// not the server action — holds the read.
//
// ⚠ DEVIATION FROM 18-08-PLAN, RECORDED: the plan named `src/app/actions/cancel-booking.ts` as the
// single read site. It cannot be, and the reason is structural rather than stylistic: that module
// carries `"use server"`, so every export from it is a POST-reachable server action and a shared pure
// helper cannot live there. Putting the read in the action anyway would force `loadOpsCancelImpact` to
// restate the ternary — two copies of a money policy, in two files, with no compiler tying them
// together, which is precisely the shape D-253 has just finished recording as a known structural gap on
// the payout freeze. One expression, two callers, one constant read. `cancelBookingAsOps` documents the
// same conflict at its call site and points here.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// EVERY MONEY FIELD LEAVES HERE AS A FINISHED STRING
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `formatMoney` runs server-side and the returned type has NO numeric money field, so the console
// performs zero arithmetic on money — the client cannot divide by 100, cannot sum, and cannot round.
// The absence of a number in the type is the enforcement; a comment asking politely is not.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-241 — THE ROW THAT SAYS WHAT THIS CONSOLE CANNOT DO
// ════════════════════════════════════════════════════════════════════════════════════════════════
// A confirmed booking whose payout has ALREADY LEFT FitOut is not cancellable here: undoing it would
// require a clawback from a host wallet FitOut cannot reach. D-241 is explicit that such a booking is
// surfaced WITH ITS REASON and never silently skipped, so `notCancellableCount` is a first-class field
// of this read rather than a difference the caller could compute by subtraction and forget to render.

import { sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";
import { DISPLAY_CURRENCY, formatMoney } from "@/lib/money";
import { OPS_CANCEL_REFUNDS_SERVICE_FEE } from "@/lib/payments/fees";

/** The two money columns any refund basis can be drawn from, exactly as they are FROZEN on the row. */
export type RefundBasisRow = {
  spacePriceCents: number | null;
  quotedTotalCents: number | null;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * THE SINGLE READ SITE OF `OPS_CANCEL_REFUNDS_SERVICE_FEE`, AND THE D-236 SETTLEMENT IN FULL.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * WHAT THE PM SETTLED (D-236, 2026-09-01): an ops-forced cancellation refunds the booker THE FULL
 * BOOKING AMOUNT — the space price AND the D-74 service fee. FitOut RETAINS NOTHING and absorbs the
 * gateway cost of the reversal itself, the host is paid nothing, and no host-cancel fee is charged.
 * That is what `true` implements, and it is what ships.
 *
 * WHY — THE SHIPPED CODE ALREADY SAID SO, FOUR HUNDRED LINES AWAY. `cancelBookingAsHost`
 * (src/app/actions/cancel-booking.ts:1134-1137) refunds the FULL charge — space price AND the D-74
 * service fee — and argues the point itself, verbatim:
 *
 *   "The refund is the FULL charge — space price AND the D-74 service fee. This is the ONE case where
 *    the non-refundable fee IS returned: the booker did nothing wrong, so the platform, not the booker,
 *    absorbs the gateway cost of the reversal. Read off the frozen row, never recomputed."
 *
 * An ops-forced cancellation happens because FitOut has CONFIRMED THE LISTING IS FAKE. That is a
 * strictly STRONGER instance of "the booker did nothing wrong" than a host who merely flaked — the
 * booker was not let down, they were defrauded, on a marketplace that took their money and its own cut.
 * Under `false`, FitOut was therefore LESS generous to the defrauded booker than to the inconvenienced
 * one, and the two paths stated opposite principles about the same fee, four hundred lines apart. THE
 * PM ACCEPTED EXACTLY THAT ARGUMENT. The two paths now agree.
 *
 * WHAT IT USED TO BE, AND WHY — RECORDED, NOT DELETED. D-209 (PM-4, answered 2026-09-01, in their own
 * words) read the other way: *"booker 100% refund, but not the service fee / platform fee"* — the space
 * price back, the D-74 fee retained — and `false` shipped from plan 18-08 on that answer. The conflict
 * above was found AFTERWARDS, while scouting: the question put to them did not mention this precedent,
 * which was an omission in how the question was framed, not in their answer. A money call is theirs,
 * and it is not resolved by an engineer noticing a better argument after the fact. So it was
 * implemented exactly as stated, isolated behind ONE constant, with the argument written down beside
 * the line that flips it, and the phase summary LED with it (18-PM-DECISIONS.md § CONFLICT). The PM
 * re-decided the same day with the full picture in view (18-14-SUMMARY.md § The five checkpoint
 * decisions, row **a**), and plan 18.1-01 flipped the line. **D-236 supersedes D-209.**
 *
 * ⚠ DO NOT "UN-FIX" THIS BACK TO D-209'S WORDING. Flipping
 * `OPS_CANCEL_REFUNDS_SERVICE_FEE` to `false` in src/lib/payments/fees.ts is a genuine one-line change
 * and changes both callers at once — `tests/payments/ops-cancel.test.ts` runs this expression under
 * BOTH values so that claim stays measured rather than promised. But the decision to make it is the
 * PM's, and as of 2026-09-01 they have made it the other way.
 *
 * The figures are read off the FROZEN row and never recomputed — integer centavos throughout, and a
 * historical amount is never rewritten.
 */
export function opsRefundBasisCents(row: RefundBasisRow): number {
  return OPS_CANCEL_REFUNDS_SERVICE_FEE
    ? (row.quotedTotalCents ?? 0)
    : (row.spacePriceCents ?? row.quotedTotalCents ?? 0);
}

/**
 * The impact block 18-UI-SPEC renders, one field per `<dt>`/`<dd>` pair, in that order.
 *
 * Rendered UNCONDITIONALLY for every listing rejection, whatever the operator has chosen — which is
 * what makes choosing reveal nothing, and is why no live region is needed on that dialog.
 */
export type OpsCancelImpact = {
  /** "Bookings already made" — confirmed bookings this console CAN cancel (the D-241 predicate). */
  cancellableCount: number;
  /**
   * THE IDS `cancellableCount` COUNTS, FROM THE SAME PREDICATE IN THE SAME STATEMENT.
   *
   * ⚠ ADDED BY PLAN 18-10, AND IT IS THE ONLY THING THAT MAKES THE ESCALATION MOVE MONEY.
   * `cancelBookingAsOps` cancels ONE booking; one operator decision therefore fans out over every
   * booking on the listing — which is exactly why 18-08 gave that action the 30/60s ops budget
   * rather than this file's 5/60s money budget. The console had no way to name those bookings: this
   * read returned counts and finished strings only, so a confirm button labelled with a count had
   * nothing to call. Without these ids the escalation radio would collect a choice and discard it,
   * which is the "control that appears to work" 18-UI-SPEC forbids by name.
   *
   * THEY COME OUT OF THE SAME AGGREGATE, under the same `NOT payout_left` filter, so the number the
   * operator reads and the set the console acts on cannot be two different answers. A second query
   * for the ids would be the restatement 18-04's finding warns about, one query later.
   *
   * The server is still the authority: every id is re-parsed, re-scoped to `listingId` in the
   * action's own `WHERE`, and re-checked against the payout guard. This list is a SNAPSHOT.
   */
  cancellableBookingIds: readonly string[];
  /** "Money that would go back" — a finished string, the sum of the per-booking refund basis. */
  refundTotal: string;
  /**
   * "FitOut keeps" — the remainder of what the bookers actually paid. Under the SHIPPED D-236 basis
   * (`OPS_CANCEL_REFUNDS_SERVICE_FEE = true`, settled 2026-09-01) that remainder is always `₱0.00`;
   * it becomes the service-fee portion of the same bookings only if the constant is flipped back.
   */
  retainedTotal: string;
  /**
   * "The host is paid" — a FIXED SENTENCE, never a computed figure.
   *
   * The host being paid nothing is enforced by `retained_space_cents = 0` on the flipped row plus
   * `queryDuePayouts`'s existing `COALESCE(retained_space_cents, 0) > 0` predicate (18-07), not by any
   * arithmetic here. A number would imply this read had a say in it; it does not.
   */
  hostPaid: "Nothing";
  /** D-241 — "Can't be undone here". Confirmed bookings whose payout has already left FitOut. */
  notCancellableCount: number;
  /** The REASON that row carries. D-241: surfaced with its reason, never a silent no-op. */
  notCancellableReason: string;
};

/** The sentence the `Can't be undone here` row states. One definition, so the count and the why cannot drift. */
export const PAYOUT_ALREADY_LEFT_REASON = "their payout has already left FitOut";

type ImpactAggregate = {
  listingId?: string;
  cancellableCount: number;
  cancellableBookingIds: string[] | null;
  notCancellableCount: number;
  spaceCents: number;
  totalCents: number;
  currency: string | null;
};

function impactFromAggregate(agg: ImpactAggregate | undefined): OpsCancelImpact {
  const cancellableCount = agg?.cancellableCount ?? 0;
  const notCancellableCount = agg?.notCancellableCount ?? 0;
  const totalCents = agg?.totalCents ?? 0;
  const currency = agg?.currency ?? DISPLAY_CURRENCY;
  const refundCents = opsRefundBasisCents({
    spacePriceCents: agg?.spaceCents ?? 0,
    quotedTotalCents: totalCents,
  });

  return {
    cancellableCount,
    cancellableBookingIds: agg?.cancellableBookingIds ?? [],
    refundTotal: formatMoney(refundCents, currency),
    retainedTotal: formatMoney(Math.max(0, totalCents - refundCents), currency),
    hostPaid: "Nothing",
    notCancellableCount,
    notCancellableReason: PAYOUT_ALREADY_LEFT_REASON,
  };
}

/**
 * loadOpsCancelImpact — everything the confirm dialog renders, computed in ONE statement against the
 * live rows, with an injected `DbConn` so a test can drive it on an isolated schema (the
 * `src/lib/ops/alerts.ts` idiom).
 *
 * ⚠ THE PREDICATE IS THE SAME ONE THE ACTION FLIPS ON, and it has to be: a count the operator reads and
 * a count the action acts on that disagree would make the dialog a lie in exactly the direction nobody
 * checks. `cancellableCount` is `status = 'confirmed'` AND no `host_payout_ledger` row for the booking
 * in `processing` or `paid`; `notCancellableCount` is the same set with that condition inverted.
 *
 * ⚠ THE `starts_at > now()` GUARD IS ABSENT, DELIBERATELY (D-241). A space confirmed fake is fake
 * whether or not the clock has started, and counting only future sessions would under-state the impact
 * of the very cancellations most worth making.
 *
 * SUMMED IN SQL, CHOSEN IN JS, ONCE. The two candidate bases are aggregated separately and the policy
 * expression is applied to the SUMS — which is exact, because the basis picks the same column for every
 * row, so the sum of the per-booking bases IS the basis of the sums. That keeps `opsRefundBasisCents`
 * called exactly once here, on integer centavos, with no per-row fetch to bound.
 */
export async function loadOpsCancelImpact(
  dbConn: DbConn,
  listingId: string,
): Promise<OpsCancelImpact> {
  const [agg] = (await dbConn.execute(sql`
    WITH scoped AS (
      SELECT
        b.id AS booking_id,
        -- The FROZEN split, with the same per-row fallbacks the action's basis expression applies, so
        -- the aggregate below cannot drift from what a single cancellation would refund.
        COALESCE(b.space_price_cents, b.quoted_total_cents, 0) AS space_cents,
        COALESCE(b.quoted_total_cents, 0) AS total_cents,
        b.currency AS currency,
        EXISTS (
          SELECT 1 FROM host_payout_ledger p
          WHERE p.booking_id = b.id
            AND p.kind = 'payout'
            AND p.state IN ('processing', 'paid')
        ) AS payout_left
      FROM booking b
      WHERE b.listing_id = ${listingId}
        AND b.status = 'confirmed'
    )
    SELECT
      COUNT(*) FILTER (WHERE NOT payout_left)::int AS "cancellableCount",
      -- The SAME filter as the count beside it, one line apart, so the two cannot answer differently.
      -- A JSON aggregate over an empty filtered set is NULL rather than an empty array, hence the
      -- COALESCE; the ORDER BY makes the list deterministic, so a test can assert it and an
      -- operator's fan-out runs in the same order twice. (No backticks in this template — one
      -- terminates it, which is the TS1005 plan 18-08 already paid for four times.)
      COALESCE(
        json_agg(booking_id ORDER BY booking_id) FILTER (WHERE NOT payout_left),
        '[]'::json
      ) AS "cancellableBookingIds",
      COUNT(*) FILTER (WHERE payout_left)::int AS "notCancellableCount",
      COALESCE(SUM(space_cents) FILTER (WHERE NOT payout_left), 0)::int AS "spaceCents",
      COALESCE(SUM(total_cents) FILTER (WHERE NOT payout_left), 0)::int AS "totalCents",
      MIN(currency) AS "currency"
    FROM scoped
  `)) as unknown as ImpactAggregate[];

  return impactFromAggregate(agg);
}

/**
 * Loads the already-finished cancellation impact for every known listing in one statement.
 * The page can then shape its rows synchronously without performing a per-row database read.
 */
export async function loadOpsCancelImpacts(
  dbConn: DbConn,
  listingIds: readonly string[],
): Promise<Map<string, OpsCancelImpact>> {
  const impacts = new Map<string, OpsCancelImpact>();
  if (listingIds.length === 0) return impacts;

  const ids = sql.join(
    listingIds.map((listingId) => sql`${listingId}`),
    sql`, `,
  );
  const rows = (await dbConn.execute(sql`
    WITH scoped AS (
      SELECT
        b.listing_id AS "listingId",
        b.id AS booking_id,
        COALESCE(b.space_price_cents, b.quoted_total_cents, 0) AS space_cents,
        COALESCE(b.quoted_total_cents, 0) AS total_cents,
        b.currency AS currency,
        EXISTS (
          SELECT 1 FROM host_payout_ledger p
          WHERE p.booking_id = b.id
            AND p.kind = 'payout'
            AND p.state IN ('processing', 'paid')
        ) AS payout_left
      FROM booking b
      WHERE b.listing_id IN (${ids})
        AND b.status = 'confirmed'
    )
    SELECT
      "listingId",
      COUNT(*) FILTER (WHERE NOT payout_left)::int AS "cancellableCount",
      COALESCE(
        json_agg(booking_id ORDER BY booking_id) FILTER (WHERE NOT payout_left),
        '[]'::json
      ) AS "cancellableBookingIds",
      COUNT(*) FILTER (WHERE payout_left)::int AS "notCancellableCount",
      COALESCE(SUM(space_cents) FILTER (WHERE NOT payout_left), 0)::int AS "spaceCents",
      COALESCE(SUM(total_cents) FILTER (WHERE NOT payout_left), 0)::int AS "totalCents",
      MIN(currency) AS "currency"
    FROM scoped
    GROUP BY "listingId"
  `)) as unknown as ImpactAggregate[];

  const byId = new Map(rows.map((row) => [row.listingId, row]));
  for (const listingId of listingIds) impacts.set(listingId, impactFromAggregate(byId.get(listingId)));
  return impacts;
}
