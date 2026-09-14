---
phase: 23-the-support-path-becomes-reachable
plan: 03
subsystem: production-control-plane/support-delivery/ops
tags: [vercel, resend, neon, preview, ops, production]
requires:
  - phase: 23-the-support-path-becomes-reachable
    provides: canonical and Preview-safe origin and email contracts
provides:
  - redacted production topology, mail, callback, and host-isolation evidence
  - a completed controlled staff-invitation acceptance proof
  - isolated Preview database and credential-free payment fail-closed behavior
affects: [STATE-05, TRUST-01, production-operations]
actuals:
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - defer payout-wallet validation until a payout or refund is actually requested
    - isolate Preview in a schema-only database branch with Preview-scoped configuration
key-files:
  created:
    - .planning/phases/23-the-support-path-becomes-reachable/23-EVIDENCE.md
    - .planning/phases/23-the-support-path-becomes-reachable/23-03-CLOSEOUT.md
  modified:
    - src/lib/paymongo.ts
    - src/app/api/paymongo/webhook/route.ts
    - tests/paymongo/preview-environment.test.ts
key-decisions:
  - Production financial operations remain fail closed, but missing payout-wallet configuration no longer prevents unrelated Operations actions from loading.
  - Preview receives a generated hostname, schema-only database, and Preview-scoped authentication rather than a production alias, database, or secret.
requirements-completed: [STATE-05, TRUST-01]
completed: 2026-09-14T02:00:00Z
status: complete
---

# Phase 23 Plan 03: Controlled Production Closeout Summary

Production topology, transactional-mail reachability, provider inventory, host isolation, and the
controlled Operations invitation journey are complete. The corresponding ledger is redacted: it
contains no credentials, recipient data, message identifiers, DNS values, or bearer invitation URLs.

## Accomplishments

- Kept the public apex, redirect-only `www`, and isolated Operations host on their intended production boundaries.
- Verified the transactional sender and completed the controlled reset/reply proof.
- Recorded the authenticated provider-callback inventory without mutating absent configurations.
- Created an isolated, schema-only Preview database branch with Preview-only runtime configuration; no production alias, database access, or credential was copied.
- Fixed the Operations runtime blocker by deferring payout-wallet validation to payout/refund execution. Payment actions still fail closed before an external request when wallet configuration is absent.
- Sent, delivered, accepted, and consumed an owner-authorized staff invitation. The resulting account was verified as active Operations staff with no pending invitation remaining.

## Verification

- Focused payment and Preview regression suites passed: 39 tests.
- Full source suite passed: 239 files (2 skipped), 2,967 tests (5 skipped).
- Production Operations confirmed the invitation lifecycle and active-staff state after acceptance.
- The redacted evidence and validation records now mark every Phase 23 live check complete.

## Commits

1. `4af66ec` — retain password-reset email delivery.
2. `b576b09` — isolate credential-free Preview deployments.
3. `34fcb70` — defer payout-wallet validation until a financial transfer is requested.

## Deviations

The plan’s disposable-invitation wording was fulfilled with an owner-authorized staff account after
explicit approval. No invitation token, recipient, account password, or mailbox artifact is stored
in this summary or the evidence ledger.

## Next Phase Readiness

Phase 23 is complete. The public support path and Operations onboarding now have automated and
redacted live-production proof.

*Plan: 23-the-support-path-becomes-reachable/23-03 | Status: complete*
