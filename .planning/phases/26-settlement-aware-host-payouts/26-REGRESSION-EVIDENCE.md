---
phase: 26-settlement-aware-host-payouts
checked_at: 2026-09-29
scope: payments-paymongo-host-ops
status: passed
---

# Phase 26 local regression evidence

The validation contract's full relevant command ran against the guarded `fitout_test` database:

`node node_modules/vitest/vitest.mjs run tests/payments tests/paymongo tests/host tests/ops`

**Final result:** 63 files passed, 2 skipped; 758 tests passed, 5 skipped; exit 0 in 74.63 seconds. The test database leak report found no writes outside per-file schema isolation. The project TypeScript check passed. ESLint reported no errors in the changed regression fixtures; five existing unused-parameter warnings remain in `tests/helpers/mocks.ts` outside the changed transfer mock.

The first broad run exposed ten failures in four older test files. Commit `ed67d950` updated their fixtures to current behavior: create returns Processing until terminal reconciliation; Friday selection requires correlated deposited proof; a pending transfer mock carries the exact reference, amount and currency; and the institution-directory interceptor uses the current Wallet route and `provider_code` shape. Those four files then passed 40/40, followed by the full green run above.

The local test and browser runs do not exercise an actual PayMongo account, deployed scheduler, or production database. Publication and live money operations are deferred independently of this technical result.
