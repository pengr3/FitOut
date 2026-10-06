# Controlled API payout test — 2026-10-06

## Scope

One booking: `911c28f2-328c-42cc-8f79-98181b0c399e`. Host principal: ₱17.10. Frozen GCash destination ends in 9701. Expected available Wallet funding is at least ₱27.10, which covers the principal and an expected ₱10 fee. This is **not** a provider-enforced fee cap. The Friday `payout-sweep` remains paused and `PAYOUT_DISPATCH_MODE` remains `hold`.

The PayMongo Dashboard draft must remain unsent. The existing `prepared` attempt and `held` ledger claim are reused. The staff-only FitOut Ops action reserves that attempt in the database before sending one `/v2/batch_transfers` request. A repeat action reads back the reserved attempt; it never posts another transfer. The provider request also has a booking-stable idempotency key.

## Deployment gates

1. Apply `0035_controlled_api_payout.sql` before deploying code that reads its columns.
2. On `fitout-ops` **Production** only, set `PAYOUT_API_TEST_BOOKING_ID` to the exact booking ID above and `PAYOUT_API_TEST_EXPECTED_MAX_DEBIT_CENTS` to `2710`. Retain the existing `PAYOUT_MANUAL_TEST_*` values, Wallet/account mapping, live PayMongo key, and recipient readback token. Never put values or full account numbers in a ticket, chat, or log.
3. Deploy the code, then visit the staff page and refresh. Confirm the claim is `prepared`, the frozen destination ends in 9701, the source Wallet ends in 0099, the settlement and host gates pass, and the freshly read available Wallet balance is at least ₱27.10. The server rechecks these inside the reservation transaction. A provider inventory error or any matching prior transfer blocks POST.
4. If the Wallet is below ₱27.10, fund it through the normal account process and refresh. Do not alter the system clock or Friday schedule.

## After the one POST

- `api_reserved` with no transfer ID, a lost response, unknown status, or a readback mismatch means **uncertain**. Keep the claim held; use the staff readback action and PayMongo support as needed. Never use the Dashboard draft or another POST to investigate.
- `pending` means the same claim is `processing`. Use **Read back API transfer** on the staff page until it is terminal. This one-off claim is intentionally excluded from the ordinary `fitout-web` reconciler because that deployment does not have the source Wallet account mapping; the staff Ops readback owns this test's terminal reconciliation.
- `succeeded` with verified source, recipient, reference, amount and fee marks the same claim `paid`. If the fee exceeds ₱10, record the `api_fee_over_budget` exception **and still mark paid** so the host is not sent twice.
- `failed` marks this attempt and claim failed and creates an operator exception. A later attempt requires a separate reviewed recovery design; this action cannot send again.

## Validation status

Focused request/readback and preflight tests cover changed destination, stale settlement, low balance, repeat trigger, lost response, and provider fees of ₱0, ₱10 and more than ₱10. The migration was rehearsed on an isolated Neon branch; the original `prepared` claim remained intact. PayMongo test mode currently lists **zero activated Wallets** for the available test key, so a provider sandbox transfer cannot yet be completed. A live send must stay gated until the production preflight passes and the Wallet is funded.

This test does not authorize the Friday sweep. Automated fee control and scheduled end-to-end verification remain Phase 26 exit gaps.
