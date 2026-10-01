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

## Full project check and Phase 26 follow-up — 2026-09-29

The one-shot full project `vitest run` finished in 346.59 seconds: 245 files and 3,081 tests passed, 2 files and 5 tests skipped, 4 files and 6 tests failed. One failure was `tests/booking/service-fee-hold.test.ts`: its earlier fixture expected a payout without a deposited settlement observation and expected Paid immediately after dispatch. The fixture now provides booking-matched deposited proof, the Friday cohort time, and a funded Wallet, and expects Processing. Its focused rerun passed 11/11. The other five failures were in auth public-origin callers, availability slot-picker end-boundary, and listing publish-schema tests outside the Phase 26 payout slice.

The full run also detected two `public.audit` writes (`guest-email`, `notify`) outside per-file schema isolation in the dedicated test database. This is contained to `fitout_test` but remains a full-suite isolation finding. No full-suite PASS is claimed.

The full design suite reported 19 failures in 12 files before payout-specific follow-up. The payout status, alarm-role, muted-surface, and loading-route findings were addressed; the loading census still reports unrelated box dimensions in the public home fallback. Other design failures involve search, email, listing, ops-panel, and source inventory work outside this payout slice. A focused rerun passed 105/105 design tests across five relevant files.

The focused Phase 26 booking, sweep, reconciliation, earnings and attention rerun passed 95/95 tests across five files, with no escaped writes. TypeScript and scoped ESLint passed. Repository-wide ESLint exited 0 with 33 warnings and no errors. See `26-VALIDATION.md` for the gate status; the full project and design suites need fresh passing runs after the remaining shared-checkout failures are resolved.

The host's in-window timing sentence now says Friday payout **checks** are in progress. It no longer implies that a terminal failed transfer is automatically resent. The earnings projection and its source-freeze gate passed focused reruns (26 and 11 tests respectively).
