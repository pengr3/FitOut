# Phase 26 — Failed-transfer retry gap

**Status: HOLD for automatic resend.** The first transfer can be dispatched and reconciled. An accepted create whose response is lost stays held for reference read-back. A provider-confirmed terminal failure stays failed and enters the money-operations exception queue. Neither case sends a second transfer.

## Why the current row cannot represent a retry

`host_payout_ledger` has one payout row per booking, one `transfer_id`, and frozen money fields. The provider create uses one booking-wide reference and idempotency key. Reusing those values for a second POST would make a lost second response indistinguishable from the first transfer after the provider key expires. Clearing or replacing `transfer_id` would erase the first attempt's recovery identity. A terminal failure proves only the first transfer's outcome; it does not make a second send recoverable.

The sweep now selects only bookings without a payout claim. A failed row remains visible in the exception/reconciliation paths, and a direct `payOne` replay reads the existing reference without sending another POST. `tests/payments/payout-sweep.test.ts` pins this behavior for a backed-off, provider-confirmed failed transfer.

## Required attempt model before enabling resend

1. Add a durable, one-to-many transfer-attempt record keyed by booking and attempt number. Persist a unique provider reference and idempotency key, amount, currency, creation time, state, and optional provider transfer ID **before** each POST. Keep the frozen commission, net amount, and recovered debit in the existing ledger row.
2. Backfill or explicitly grandfather existing claims as attempt 1. A held legacy claim without a transfer ID remains uncertain until an exact provider read resolves it; an empty or inaccessible reference list is not proof that no transfer exists.
3. Under the Wallet-scoped transaction lock, verify that every prior attempt has an exact terminal failed GET, no attempt is unresolved, and the booking still passes settlement, Friday cohort, host, destination, Wallet balance, and fee checks. Atomically reserve funds and insert exactly one next attempt. Contending workers must observe that same attempt, not create another.
4. POST using that attempt's distinct reference and key. On crash, timeout, malformed response, or ambiguous lookup, preserve the attempt as unresolved and stop automatic resend. Reconcile by its own reference or transfer ID. Only an exact terminal provider result can mark that attempt paid or failed and update the booking ledger.
5. Test a crash at every boundary: before intent commit, after intent commit/before POST, accepted POST/lost response, after response/before ID persistence, concurrent Friday workers, key expiry, ambiguous reference results, and conflicting provider status. Assert one successful transfer at most and unchanged frozen money fields.

This requires a new reviewed migration and changes the Phase 26 one-migration design decision (`0033` is the sole planned migration). It also needs account-specific proof that reference lookup and terminal status reads work in the intended PayMongo environment. Do not add a second transfer path by reusing the audit table or the ledger's single transfer ID as an implicit attempt journal.

## Current verification

- 2026-09-29: `payout-sweep.test.ts` passed 41/41 against isolated `fitout_test`; TypeScript and scoped ESLint passed.
- 2026-09-29: full relevant payment, PayMongo, host, and ops suite passed: 63 files, 758 tests, 2 files and 5 tests skipped; isolated database reported no escaped writes. No provider transfer or production migration was run for this gap review.
