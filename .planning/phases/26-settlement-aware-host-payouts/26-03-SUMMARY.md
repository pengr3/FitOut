---
phase: 26-settlement-aware-host-payouts
plan: 03
subsystem: payments
tags: [paymongo, transfers, reconciliation, inngest, postgres, tdd]
requires:
  - phase: 26-02
    provides: Friday cohort, Wallet gate, and durable pre-POST payout claim
provides:
  - Reference lookup for an uncertain host transfer without a duplicate POST
  - Exact transfer GET before terminal ledger changes
  - Durable, deduplicated payout recovery exceptions in the ops digest queue
affects: [26-04, 26-06, 26-09]
plan_head_before: d11a04f69d6296b7033f49ac980859f5d586a79e
actuals:
  tokens: 8883
  tasks: 2
  commits: 4
commits: 4
tech-stack:
  added: []
  patterns: [bounded provider reference scan, exact transfer GET, guarded ledger transition, fail-closed unknown outcome]
key-files:
  created: [.planning/phases/26-settlement-aware-host-payouts/26-03-red-task1.json, .planning/phases/26-settlement-aware-host-payouts/26-03-red-task2.json]
  modified: [src/inngest/functions/payout-sweep.ts, src/inngest/functions/payout-reconcile.ts, src/lib/paymongo.ts, tests/payments/payout-sweep.test.ts, tests/payments/payout-reconcile.test.ts]
key-decisions:
  - "Empty or inaccessible provider reference reads cannot prove absence; preserve HOLD and create an owned exception."
  - "Recognize only documented transfer terminal statuses succeeded and failed; require exact GET identity before Paid or Failed."
  - "Do not automatically resend a failed claim without a durable per-attempt marker; the existing single transfer ID cannot distinguish a lost retry response."
requirements-completed: [HPAY-04]
coverage:
  - id: uncertain-transfer-recovery
    description: Lost create responses and expired idempotency keys do not authorize a second POST
    requirement: HPAY-04
    verification:
      - kind: integration
        ref: tests/payments/payout-sweep.test.ts
        status: pass
    human_judgment: true
    rationale: Account-specific reference-filter capability and response shape remain unverified under the Phase 25.1 release HOLD.
  - id: exact-terminal-readback
    description: Held and processing transfers become Paid or Failed only after exact provider GET
    requirement: HPAY-04
    verification:
      - kind: integration
        ref: tests/payments/payout-reconcile.test.ts
        status: pass
    human_judgment: true
    rationale: Fixture responses prove local guards but not live account transfer read entitlement or terminal status observations.
duration: 21min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 03: Uncertain Transfer Recovery Summary

Lost create responses now remain durable claims. A unique exact booking-reference lookup can recover a transfer ID, and a separate exact provider GET is required before terminal Paid or Failed. Ambiguous, absent, inaccessible, or mismatched evidence stays nonterminal and enters the existing unresolved ops alert queue.

## Performance

- **Started:** 2026-09-29T08:13:00Z
- **Completed:** 2026-09-29T08:34:00Z
- **Tasks:** 2
- **Production/test commits:** 4
- **Files changed:** 7

## Accomplishments

- Added a bounded, paginated `GET /v2/transfers` read for the deterministic `host-payout-{bookingId}` reference. A missing or failed read does not authorize another POST, even after the provider key's roughly 24-hour lifetime.
- Reconciled held claims without a saved transfer ID. The reconciler checks one exact reference, frozen transfer amount, and currency, then requires matching transfer GET status before a guarded ledger transition.
- Narrowed terminal status recognition to PayMongo's documented `succeeded` and `failed`; unknown statuses remain processing. A later returned settlement creates a recovery exception without rewriting transfer history.
- Recorded unresolved cases as deduplicated `needs_attention` audit rows so the existing monitored ops digest can assign ownership. Audit metadata contains only booking ID and fixed reason code.

## Task Commits

1. **Task 1 RED:** `3d5fa58e` — accepted timeout, expired key, ambiguous lookup, and crash claim cases.
2. **Task 1 GREEN:** `1954008a` — bounded reference read and no blind resend.
3. **Task 2 RED:** `a54ad8d4` — held discovery and exact terminal ID cases.
4. **Task 2 GREEN:** `55baf0a8` — terminal GET guards, durable exceptions, and settlement-reversal handling.

## Verification

- Five focused payment files: **99/99 tests passed** in isolated `fitout_test`; leak report clean.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- Focused ESLint over three production and two test files: passed.
- Both intentional RED assertions failed before implementation and passed `gsd_run check tdd-red-evidence`.
- No live provider request or real transfer was made.

## TDD Gate Compliance

Task 1 RED observed `held` where the accepted-timeout case required recovered `processing`. Task 2 RED observed `paid` from a GET carrying the wrong transfer ID. Both RED evidence records passed the runtime gate before their GREEN implementation commits. Refactor was unnecessary.

## Decisions Made

- The provider guide documents reference-number lookup, while the endpoint reference omits that query parameter. This account's read access and actual response shape remain unverified. Every incompatible response holds the claim and creates an exception.
- A provider list entry alone never marks Paid. Terminal updates require GET by the exact transfer ID, and every SQL update is scoped by booking ID, payout kind, prior processing state, and transfer ID.
- A terminal-failed claim is retained for operator review. The current ledger stores one transfer ID and no durable retry-attempt identity; automatically resending it could lose the new response and make subsequent reference reads ambiguous. The existing Friday retry selector may surface that row, but `payOne` does not POST it automatically. This narrows Task 1's "permit retry only for a definitive no-transfer/terminal-failed outcome" action: no automatic retry is enabled, even after terminal failure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Durable exception ownership**
- **Found during:** Task 2.
- **Issue:** Console-only uncertainty warnings would not enter the monitored money-alert queue.
- **Fix:** Added deduplicated `needs_attention` audit entries with fixed reason codes.
- **Files modified:** `src/inngest/functions/payout-reconcile.ts`, `src/inngest/functions/payout-sweep.ts`.
- **Verification:** Repeated ambiguous-claim integration case creates one unresolved row.
- **Committed in:** `55baf0a8`.

## Deferred Issues

- Automatic retry after a definitively failed transfer needs a durable per-attempt identity. The single `transfer_id` field and stable booking reference cannot safely describe a second in-flight attempt after a crash. The safe result is an owned HOLD. The operator path is the unresolved `host_payout_recovery` / `needs_attention` audit queue, sent by the existing `ops-alert-digest` to the configured money-operations address. The operator must inspect the exact provider transfer and approve a durable retry-attempt design before any new POST. Later work must design and prove that marker before enabling automatic resend.
- Live account entitlement, reference filtering, pagination shape, and status values remain under Phase 25.1's release HOLD. Fixtures do not clear that gate.

## Release Boundary

No production key, provider read, transfer POST, migration, or release decision was used. Account-specific mapping and joint product, PayMongo-account, and money-operations approval remain required before live movement.

## Self-Check: PASSED

All plan-created evidence and implementation files exist, and all four task commits resolve. The focused tests, TypeScript, and ESLint gates passed.
