// HFLOW-03 / 14-CONTEXT D-140 — the words for the dashboard's FIRST signal row: requests waiting on the
// host's yes.
//
// WHY THE COPY LIVES IN A MODULE AND NOT INLINE IN `(host)/host/page.tsx`.
//
// The pending-request count has THREE consumers and one predicate — the `(host)` layout's streamed nav
// badge, this signal row, and the `/host/requests` inbox itself. Keeping the NUMBER identical across the
// three is a query problem and is already solved. Keeping what the product SAYS about that number
// identical is a copy problem, and a sentence typed into a page file is exactly how the three drift: the
// badge starts calling them requests, the row starts calling them bookings, and the inbox lede keeps a
// deadline figure that policy moved a year ago. `src/lib/listing/hours-signal.ts` established the answer
// for the third signal row on this same block — the state, the reason and the way out live beside the
// authority that produces the number — and this module is that shape for the first.
//
// THE SLA FIGURE IS INTERPOLATED, NEVER TYPED. `APPROVAL_SLA_HOURS` is environment-tunable
// (`src/lib/payments/config.ts`), so a number written into a sentence here would be a promise the system
// stops keeping the moment policy changes, with nothing going red. Its own declaration says the same
// thing from the other side: *never hardcode the figure at a call site — import this NAME*. This file
// contains no digit at all, and that is checkable rather than merely intended.
//
// ⚠ THE REASON CLAUSE DESCRIBES THE FLAT SLA, WHICH IS THE HONEST THING TO SAY AT BLOCK SCALE. A specific
// request's deadline may be CAP-SHORTENED when the session itself starts sooner than the SLA window
// (D-96), which is why `request-countdown-reason.tsx` exists and why every per-row deadline is composed
// from that row's own `expires_at` rather than from this constant. A signal row is not about one request;
// it names the policy, and the row a host clicks through to carries the truth about its own clock.
//
// NON-CLIENT MODULE — no directive prologue and no client-only import, for the reason
// `src/components/host/payout-status.ts` records at length: a "use client" module's exports become client
// references when a Server Component imports them and cannot be invoked server-side, which crashed /host
// in UAT once already. Both surfaces that will read these strings are Server Components.

import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";

/**
 * The STATE, in the host's words, with the one-versus-several fork resolved here rather than at a call
 * site.
 *
 * The fork lives in this module — unlike `hours-signal.ts`, whose call site assembles its own because the
 * singular arm NAMES the affected listing and the module has no listing to name. Signal 1's fork is
 * nothing but the count, so there is no argument for making a surface re-derive it, and every surface that
 * did would be a surface that could get the plural wrong on its own.
 *
 * Sentence case, calm, no exclamation mark: a queue with work in it is a normal state of a working
 * marketplace, not an alarm. "Your yes" rather than "your approval" — the copywriting contract's voice,
 * and the same phrase the inbox's own lede opens with.
 */
export function requestsWaitingState(pendingRequests: number): string {
  return pendingRequests === 1
    ? "1 request is waiting on your yes."
    : `${pendingRequests} requests are waiting on your yes.`;
}

/**
 * WHY it matters, and what happens if the host does nothing.
 *
 * Rule O7: a signal names the state, the reason AND the way out. The reason here is a mechanism with a
 * deadline, and the deadline is the shared constant — interpolated, never typed. The second clause is the
 * part that makes this calm rather than threatening: nothing breaks when a request expires, the slot
 * simply frees itself.
 */
export const REQUESTS_WAITING_REASON =
  `They expire ${APPROVAL_SLA_HOURS} hours after they're made, and the slot frees automatically.`;

/** The WAY OUT — the link label into the inbox that owns the decision. */
export const REQUESTS_WAITING_CTA = "Review requests";

/**
 * The state and the reason as ONE string.
 *
 * Assembled here, in JavaScript, rather than interleaved as JSX text: SWC's whitespace transform drops the
 * leading space of text that follows an expression container, which is the defect
 * `(host)/host/page.tsx:75` records by name. Doing it once in the module also means the two clauses cannot
 * be rendered in the wrong order or with the wrong separator by a second surface.
 */
export function composeRequestsWaitingSentence(pendingRequests: number): string {
  return `${requestsWaitingState(pendingRequests)} ${REQUESTS_WAITING_REASON}`;
}
