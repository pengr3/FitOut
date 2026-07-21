// The SINGLE place the QRPh refundability question is answered (07-RESEARCH § Gating Verdict).
//
// VERDICT as of 2026-07-21: QRPh is NOT API-refundable — PayMongo's help centre states "In general, QR Ph
// payments have no refunds through PayMongo", corroborated independently by the Phase-5 research pass and
// by the shipped webhook branch. Every primary doc page now 404s, so the verdict is MEDIUM-HIGH, not HIGH.
//
// If the documented test-mode probe (Plan 16, Task 1) REFUTES that premise, this becomes `() => true` and
// the ENTIRE D-72 workstream — bank-details form, instapay transfer path, PH Data Privacy Act exposure,
// payout-redirection threat, failed-transfer recovery UX — is deleted with zero rework, because it is the
// only branch point. Do NOT inline this predicate anywhere.
//
// Pure/isomorphic: no "use client"/"use server" directive — the webhook route, the cancel server action and
// the refund-preview RSC all import it.

/** Payment rails PayMongo can API-refund (Pitfall 1). QRPh + UBP Online Banking are NOT refundable via the
 *  API — the gone-slot backstop must operator-alert those, never call createRefund (it would 4xx). */
export const REFUNDABLE_RAILS: ReadonlySet<string> = new Set([
  "card",
  "gcash",
  "grab_pay",
  "paymaya",
]);

/** Can PayMongo refund this rail through the API? Fails CLOSED: an absent/unknown rail is treated as
 *  non-refundable, so an unrecognised payment method routes to the operator-alert path rather than to a
 *  call that would 4xx and leave a booker's money in limbo. */
export function isApiRefundable(rail: string | null | undefined): boolean {
  return rail != null && REFUNDABLE_RAILS.has(rail);
}
