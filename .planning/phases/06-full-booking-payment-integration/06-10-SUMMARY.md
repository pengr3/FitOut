---
phase: 06-full-booking-payment-integration
plan: 10
subsystem: payments
tags: [paymongo, webhook, hmac, signature, booking-confirm, gap-closure]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    provides: "06-05 single-writer confirm authority (D-57) — the checkout_session.payment.paid webhook that flips booking→confirmed for both instant and pay-on-approval"
provides:
  - "parseSignature accepts real PayMongo te-XOR-li single-mode signatures (D-57 confirm authority re-enabled on real payments)"
  - "Single-mode webhook signer (mockPayMongo.signWebhook mode=test|live) reproducing PayMongo's real signature shape"
  - "Regression coverage proving a real te-only / li-only signature confirms a booking and a both-empty header still 400s"
affects: [06-verification-re-uat, phase-07-bookings-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PayMongo signs ONE mode per delivery (te in TEST, li in LIVE — never both); the parser tolerates one empty part, verifySignature length-skips it"
    - "Test fixtures must reproduce the REAL single-mode signature shape, not a synthetic both-populated header"

key-files:
  created: []
  modified:
    - src/app/api/paymongo/webhook/route.ts
    - tests/helpers/mocks.ts
    - tests/paymongo/webhook-payment-paid.test.ts

key-decisions:
  - "Widen parseSignature's guard to `if (!parts.t || (!parts.te && !parts.li)) return null;` and tolerate an absent part as empty string — the minimal one-predicate fix; verifySignature already length-skips an empty candidate so no verify change was needed"
  - "Extend the EXISTING signer with a mode param rather than adding a second signer — keeps the ~12 both-mode callers byte-for-byte unaffected while closing the fixture gap at its source"

patterns-established:
  - "Single-mode PayMongo signature shape (te-XOR-li) is now a first-class test fixture, so a regression to the both-required predicate is caught"

requirements-completed: [PAY-05, BOOK-06, BOOK-04, BOOK-05, HOST-01]  # BOOK-05 + HOST-01 appended 2026-08-01 by the v1.0 milestone audit — both were live-verified in the 06-09 UAT and closed by the 2026-07-20 re-UAT that this plan gated on, but were never recorded here, so they read as unclosed in the 3-source cross-reference

# Metrics
duration: ~12min
completed: 2026-07-20
---

# Phase 6 Plan 10: G-06-01 Webhook Signature Parser (te-XOR-li) Summary

**Widened `parseSignature` to accept real PayMongo single-mode signatures (te in TEST, li in LIVE — never both), re-enabling the D-57 single-writer booking-confirm authority that every real payment was silently 400-ing before it could confirm.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-20T16:43Z (after plan-doc commit 87f042f)
- **Completed:** 2026-07-20T16:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Closed **G-06-01 (CRITICAL)**: `parseSignature` no longer rejects every real PayMongo signature. The guard changed from "any of t/te/li empty → null" to "missing `t` OR BOTH te and li empty → null", with an absent part tolerated as `""`. This re-enables PAY-05 (payment confirm), BOOK-06 (confirmed email), and BOOK-04's confirm on real payments.
- Closed the **fixture gap** at its source: `mockPayMongo.signWebhook` gained a `mode: "both" | "test" | "live"` param that reproduces PayMongo's real single-mode shape (`te=<sig>,li=` for test; `te=,li=<sig>` for live). Default `"both"` is unchanged, so the ~12 existing callers are untouched.
- Added three regression cases proving: a real TEST-shape (te only) signature confirms a `pending` booking and fires BOOK-06; a LIVE-shape mirror (li only) confirms an `approved` pay-on-approval booking and fires BOOK-06; a both-empty header still returns 400 with no state change (T-06-SPOOF).
- `verifySignature`, `handleGoneSlot` (D-58), `handleRefund`, the `paymongo_event` dedupe, and the confirm UPDATE `IN ('pending','approved')` are byte-for-byte unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen parseSignature to accept te-XOR-li real PayMongo signatures** - `39985d3` (fix)
2. **Task 2: Add real single-mode-signature regression tests (close the fixture gap)** - `06f31e3` (test)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified
- `src/app/api/paymongo/webhook/route.ts` - Widened `parseSignature` guard to `if (!parts.t || (!parts.te && !parts.li)) return null;` and tolerant return `{ t: parts.t, te: parts.te ?? "", li: parts.li ?? "" }`; rewrote the doc-comment to state the te-XOR-li reality. Parser-only change; verify/gone-slot/refund/dedupe/confirm-WHERE untouched.
- `tests/helpers/mocks.ts` - `signWebhook` gained a `mode` param emitting the real single-mode shapes; doc-comment updated.
- `tests/paymongo/webhook-payment-paid.test.ts` - New describe with Case A (te-only confirm + BOOK-06), Case B (li-only confirm + BOOK-06), Case C (both-empty → 400, no state change).

## Decisions Made
- **Minimal one-predicate fix over a verify-loop change.** `verifySignature` already iterates `[sig.te, sig.li]` behind a `candBuf.length === expectedBuf.length` guard, so an empty candidate (0 bytes) can never length-match the 64-char HMAC hex. Tolerating one empty part therefore required no verify change — the fix stays surgical to the parser.
- **Extend the existing signer, not add a second.** A `mode` param with a `"both"` default keeps every existing caller unaffected while making the real single-mode shape a first-class fixture, so the bug can't regress silently.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx eslint` reports 5 pre-existing `no-unused-vars` warnings on underscore-prefixed params in `tests/helpers/mocks.ts` (lines 95/176/187/191/192 — none in the code this plan touched). These are out of scope (SCOPE BOUNDARY: not caused by this task's changes) and were left untouched. 0 errors on all three changed files.

## Verification
- `npx tsc --noEmit` → exit 0
- `npx eslint src/app/api/paymongo/webhook/route.ts tests/paymongo/webhook-payment-paid.test.ts tests/helpers/mocks.ts` → 0 errors (5 pre-existing warnings, out of scope)
- `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` → 15 passed (12 existing + 3 new)
- `npx vitest run tests/paymongo tests/booking tests/payments` → 18 files / 134 tests passed, no regressions
- Acceptance greps confirmed: `!parts.te && !parts.li` (route.ts:96), verifySignature loop `[sig.te, sig.li]` + `candBuf.length === expectedBuf.length` guard (108/110) unchanged, confirm UPDATE `IN ('pending','approved')` (381) unchanged.

## User Setup Required

None - no external service configuration required by this plan.

**Re-UAT precondition (G-06-02 — non-code, informational):** Before re-running the 06-09 live UAT against real PayMongo test mode, register the PayMongo webhook at the FULL path `https://<tunnel>/api/paymongo/webhook` — NOT the ngrok/tunnel root (in the failed UAT the root registration made events hit the home page and never reach the handler). Reference: `paymongo-local-webhook-uat.md` in memory.

## Next Phase Readiness
- G-06-01 is closed in code and proven by regression tests. The remaining step to fully clear the phase's gap is a **re-run of the 06-09 human-verify UAT** with the G-06-02 URL corrected (full `/api/paymongo/webhook` path) — a dashboard/tunnel config task, not a code defect.
- D-57 confirm authority and D-58 gone-slot backstop semantics are intact; no new threat surface introduced (parser fix + test-only edits, no package installs — T-06-SC accept).

## Self-Check: PASSED

- All modified files present: `src/app/api/paymongo/webhook/route.ts`, `tests/helpers/mocks.ts`, `tests/paymongo/webhook-payment-paid.test.ts`, and this SUMMARY.
- Both task commits present in history: `39985d3` (Task 1 fix), `06f31e3` (Task 2 test).

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
