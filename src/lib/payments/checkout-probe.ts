import "server-only";

// The ONE owner of the D-84 live probe — the booker-facing read of a hosted Checkout Session.
//
// ── WHY A PROBE EXISTS AT ALL, AND WHY IT IS NOT AN OPTIMISATION ─────────────────────────────────────
// There is NO row-level signal separating a REVERSED booking from a SWEPT UNPAID HOLD. Both land
// `status='cancelled'`, `cancelled_by=NULL`, `payment_id=NULL`, and both may carry a non-null
// `checkout_session_id` — the in-transaction stale-hold sweep writes exactly that shape
// (`src/lib/availability/units.ts:484-490`). `booking.payment_method` is NULL on every reversed row by
// construction, so the RAIL is not in the database either, and neither is the paid-at instant (D-85:
// there is no `paid_at`, no `updatedAt`, and `paymongo_event` cannot be joined to a booking).
//
// So without this call, three facts are simply unavailable, and D-60's `?paid=1` decay makes the
// reversed state unreachable on a refresh — the money truth would disappear with the query param.
// D-80 forbids a column, and it is not needed: the provider already holds all three.
//
// ── THE TWO PROPERTIES THIS MODULE EXISTS TO GUARANTEE ───────────────────────────────────────────────
//
//   1. IT IS BOUNDED (T-13-03-PROBEDOS). Every call carries CHECKOUT_PROBE_TIMEOUT_MS. A degraded
//      provider cannot hold open a page whose entire job is to explain a payment failure.
//   2. IT RESOLVES, ALWAYS (T-13-03-PROBELEAK). Every failure — a null id, no secret, a network error,
//      a non-2xx, the deadline firing, an unrecognised body — comes back as `null`, and the caller
//      falls back to D-84's rail-free copy. D-84's closing warning is the whole reason:
//      *"Do not let a third-party call fail the page: this surface exists to explain a failure."*
//
// THE CAUGHT ERROR IS DISCARDED WHOLE — not chained, not `cause`-attached, not logged, not rendered.
// This is the argument `expireCheckoutSession`'s inner catch already makes at `paymongo.ts:299-307`
// (T-05-15 / T-08-44): PayMongo's prose must not gain a new route into a booker response or an audit
// row. Here it is stronger still, because the caller is a page RENDER a booker can trigger at will.
// Resist the reflex to add a logging call "just for debugging": that IS the new route, and the token
// is deliberately not spelled here so a future whole-source grep for it cannot be tripped by the
// sentence forbidding it (13-PATTERNS § H, and the same discipline `price-breakdown.tsx:28-33` keeps).
//
// ── D-35's CI SECRET BOUNDARY ────────────────────────────────────────────────────────────────────────
// The PayMongo test key is absent in CI BY DESIGN. Because this wrapper answers `null` with no request
// when no secret is configured, every later spec over these surfaces stays inside that boundary and
// exercises the fallback branch rather than needing `sk_test_`. A spec that needs the secret has left
// the boundary and must be split — do not "fix" that by granting the CI job a key.

import { getCheckoutSession, type CheckoutSessionState } from "@/lib/paymongo";

/**
 * The deadline every booker-facing probe runs under — declared here so no call site picks its own.
 *
 * WHY 3000, IN BOTH DIRECTIONS:
 *   - FLOOR. `src/lib/payments/config.ts` records the MEASURED normal cost of TWO PayMongo round trips
 *     plus two local UPDATEs at ~2s, so a single GET is around a second. 3s is roughly 3x that, which
 *     is enough headroom that a healthy provider's answer is not routinely discarded — and discarding
 *     it silently is the failure mode, because the page still renders, just with less specific copy.
 *   - CEILING. This is a BLOCKING server render, and the asymmetry is what sets the bound: the cost of
 *     giving up early is the rail-free sentence, which is DESIGNED copy (D-84) rather than a
 *     degradation, while the cost of waiting is a booker staring at nothing on the one page that was
 *     supposed to explain what happened to their money. When the two costs are that lopsided, the
 *     shorter bound wins.
 *
 * A named residual, accepted: on a slow-but-healthy provider this trades exact per-rail copy for the
 * all-rails sentence. That is the correct trade here and the wrong one on the money path, which is
 * exactly why `getCheckoutSession`'s deadline is opt-in and this is the only module that opts in.
 */
export const CHECKOUT_PROBE_TIMEOUT_MS = 3_000;

/**
 * Read the provider's view of a booking's checkout session, or `null` if anything at all goes wrong.
 *
 * `null` means ONE thing to every caller: *we did not learn the rail*. It never means "the rail is not
 * refundable" and it never licenses a payment date — D-85 labels the fallback line "Booked" against
 * `booking.createdAt` and never "Date paid".
 */
export async function probeCheckoutSession(
  checkoutSessionId: string | null,
): Promise<CheckoutSessionState | null> {
  if (!checkoutSessionId) return null;
  // No secret ⇒ no request. paymongoFetch would otherwise send an empty Basic credential and collect a
  // 401, paying a round trip on a render path to learn nothing (and see D-35 in the header).
  if (!process.env.PAYMONGO_SECRET_KEY) return null;

  try {
    const state = await getCheckoutSession(checkoutSessionId, {
      timeoutMs: CHECKOUT_PROBE_TIMEOUT_MS,
    });
    // A body we do not recognise is indistinguishable from not having asked. Returning a half-built
    // state whose id is undefined would let a surface believe it probed successfully.
    if (typeof state.id !== "string" || state.id.length === 0) return null;
    return state;
  } catch {
    // DELIBERATELY EMPTY — see the header. The error is the provider's prose and it stops here.
    return null;
  }
}

/**
 * The four readings 13-RESEARCH Example 3's table specifies, plus the honest fifth.
 *
 * Named once so the reversed, pending and receipt surfaces do not each re-derive the discriminator and
 * drift apart — the same one-owner rule `src/lib/site.ts` and `src/lib/payments/refund-rail.ts` follow.
 */
export type PaymentStateReading =
  /** `pending` + a still-payable session: the booker can finish paying in place (D-70). */
  | "not-completed"
  /** `pending` + a retired session: the existing expired-hold landing. */
  | "hold-expired"
  /** `cancelled` + a session the provider says was PAID: money moved, and this is the reversed state. */
  | "reversed"
  /** `cancelled` + a session that was never paid: an ordinary swept hold. NOT reversed, no money moved. */
  | "unpaid-hold-swept"
  /** The probe fell back, or the pair is one the table does not name. Use rail-free, cause-free copy. */
  | "indeterminate";

/**
 * Read the payment state from the booking's own status plus the provider's session status.
 *
 * ⚠ Deliberately NOT an enumerated reject-list, for the reason `expireCheckoutSession`'s fall-through
 * records at `paymongo.ts:318-324`: an allow-list of the four named pairs can never go stale, whereas a
 * reject-list silently absorbs every session status PayMongo adds later into one of the four readings.
 * Anything unrecognised — including a `null` session — reads as `indeterminate`, and `indeterminate` is
 * a real answer with its own copy, not a placeholder to paper over.
 */
export function readPaymentState(
  bookingStatus: string,
  session: CheckoutSessionState | null,
): PaymentStateReading {
  if (session === null) return "indeterminate";

  // Strict equality on the RAW strings, the `expireCheckoutSession` discipline: no trimming, no
  // lower-casing, no `includes`. Any normalisation would widen these four pairs by an unknown amount.
  if (bookingStatus === "pending" && session.status === "active") return "not-completed";
  if (bookingStatus === "pending" && session.status === "expired") return "hold-expired";
  if (bookingStatus === "cancelled" && session.status === "paid") return "reversed";
  if (bookingStatus === "cancelled" && session.status === "expired") return "unpaid-hold-swept";

  return "indeterminate";
}
