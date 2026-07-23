// The SINGLE place the QRPh refundability question is answered (07-RESEARCH § Gating Verdict).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// VERDICT: `confirmed` — QRPh is NOT API-refundable. SETTLED BY OBSERVED API BEHAVIOUR on 2026-07-23
// (Plan 16 Task 1 probe, TEST mode — the paid payment's raw body shows `livemode:false`), not by
// documentation. D-58 stands; the D-72 collect-and-never-store branch is BUILT (createRefundTransfer in
// src/lib/paymongo.ts + the destination form).
//
// THE OBSERVED EVIDENCE, VERBATIM:
//   - QRPh-only checkout session `cs_809b1190ba4c3d44b7a77cdc` (₱100.00 = 10000 centavos) was paid by a
//     human on the hosted page; captured payment `pay_ru6sXqhRJto1NW3T83cqak4q`, `source.type: "qrph"`.
//   - `POST /v1/refunds` with `Idempotency-Key: qrph-refund-probe-1`, body
//     `{"data":{"attributes":{"amount":10000,"payment_id":"pay_ru6sXqhRJto1NW3T83cqak4q","reason":"others"}}}`
//     → HTTP 400, raw body:
//     `{"errors":[{"code":"parameter_invalid","detail":"Refunds are not allowed for payments with source
//     type qrph.","source":{"pointer":"payment_id","attribute":"payment_id"}}]}`
//   - Outcome-matrix row 1 (a sync 4xx naming the rail as not refundable) → `confirmed`. No refund
//     resource was created, so terminal-status polling does not apply — that requirement guards the
//     HTTP-200 branch, where an async `failed` would look healthy while stranding the booker's money.
//
// A3 (stable Idempotency-Key + rotating reference_number on /v2/batch_transfers): BLOCKED, not settled.
// Probed in the same 2026-07-23 test session:
//   - `GET /v2/wallets?status=activated` → HTTP 200 with ZERO wallets — Platforms / Linked Accounts is
//     not enabled on this test account.
//   - `GET /v2/transfers/receiving_institutions?provider=instapay` → HTTP 404, raw body
//     `{"errors":[{"code":"not_found","detail":"failed to get transfer: resource not found"}]}` — the
//     router resolved `receiving_institutions` as a transfer-id lookup, i.e. the Money Movement endpoints
//     are ABSENT until PayMongo enables the feature on the account.
// Consequence: the refund-transfer path keeps the documented design exactly (stable `Idempotency-Key`,
// per-attempt rotating `reference_number` — PayMongo's own retry guidance), and A3 is flagged for
// re-verification in manual UAT once Money Movement is enabled. Do NOT record an a3-ok/a3-rejected result
// that was never observed.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// This module remains the ONLY branch point for refund dispatch. Do NOT inline this predicate anywhere.
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
