---
phase: 7
slug: bookings-management-cancellation-notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `07-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (unit + integration) · Playwright 1.60.0 (E2E) |
| **Config file** | `vitest.config.ts` (node env, `tests/**/*.test.ts`) · `playwright.config.ts` (`e2e/**`) |
| **Quick run command** | `npx tsc --noEmit && npx vitest run tests/payments tests/booking` |
| **Full suite command** | `npm test` then `npm run test:e2e` |
| **Integration harness** | `tests/helpers/db.ts` — isolated per-test schemas with all migrations replayed (this is what makes the concurrency tests real) |
| **Estimated runtime** | ~90 seconds (Vitest full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npx vitest run tests/payments tests/booking`
- **After every plan wave:** Run `npm test` (full Vitest suite)
- **Before `/gsd-verify-work`:** `npm test` green **and** `npm run test:e2e` green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> Task IDs are filled in by `/gsd-plan-phase` once PLAN.md files exist. The rows below
> are the requirement-level behaviors every plan must map at least one task onto.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | PAY-06 | — | Ladder returns correct rung per tier × hours-to-start | unit | `npx vitest run tests/payments/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | `refund + retained == spacePrice` exactly, every bps, no lost centavo | unit (property) | `npx vitest run tests/payments/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | T-tamper | Service fee never refunded (`serviceFeeRefundCents === 0`) | unit | `npx vitest run tests/payments/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | `computeServiceFee` integer/rounding guards, throws on bad input | unit | `npx vitest run tests/payments/service-fee.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | **Cancelled-with-retention booking IS swept; gross == retained** | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | **Host-cancelled (retained=0) booking produces ZERO ledger rows** | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | **Payout gross == `space_price`, NOT `quoted_total`** (fee not paid out) | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | Concurrent cancel + payout-sweep → exactly one ledger row, correct gross | integration (racing clients) | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | T-replay | Partial refund POSTs correct amount w/ `Idempotency-Key`; 2nd call → no 2nd refund | unit (mocked fetch) | `npx vitest run tests/paymongo/refund.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | Host-cancel fee capped at booking value at write time | unit | `npx vitest run tests/payments/host-cancel.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | Netting never drives a transfer below zero; zero-amount transfer never fires | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PAY-06 | — | Debit row does NOT trip the reconcile stuck-`held` alert | integration | `npx vitest run tests/payments/payout-reconcile.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 | T-tier-downgrade | Tier snapshot immutable: retier listing → in-flight booking's refund unchanged | integration | `npx vitest run tests/booking/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 | — | Preview amount == amount actually refunded (same DB clock) | integration | `npx vitest run tests/booking/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 | — | Cancel after `startsAt` is refused | integration | `npx vitest run tests/booking/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 | V4 | Cancel is owner-gated; cross-user and missing return the identical denial | integration | `npx vitest run tests/security/` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 | — | E2E: cancel → see exact refund → confirm → status + amount correct | e2e | `npx playwright test e2e/cancel.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 (D-94) | — | `expires_at == LEAST(now()+window, starts_at)` at **0/1/2/4/25** hours to start | integration | `npx vitest run tests/availability/expiry-cap.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 (D-94) | — | `placeHold` uses DB `now()` — hold survives a skewed JS clock | integration | `npx vitest run tests/availability/expiry-cap.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 (D-96) | — | Proportional split: request 4h out → host 2h, booker 2h | integration | `npx vitest run tests/availability/expiry-cap.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 (D-93) | — | Approve refused below `MIN_APPROVE_WINDOW_HOURS`; 0 rows → calm `NOT_PENDING` | integration | `npx vitest run tests/booking/host-requests.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | TBD | BOOK-07 (D-96) | V4 | Lead-time guards mode-scoped: 2h request / 30min instant; server rejects at submit | integration | `npx vitest run tests/booking/host-requests.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | **D-57 regression** | — | **Webhook still confirms on `status='pending'` ALONE — no `starts_at` guard added** | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | TBD | **D-21 regression** | — | Cancelled slot immediately rebookable; GiST EXCLUDE predicate unchanged | integration | `npx vitest run tests/availability/` | ⚠️ extend | ⬜ pending |
| TBD | TBD | TBD | MANAGE-03 | — | `inngest.send` failure does NOT fail the cancel action | unit | `npx vitest run tests/booking/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MANAGE-03 | — | One event → notification row AND email; email-step retry does not duplicate the row | integration | `npx vitest run tests/notifications/notify.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MANAGE-03 (D-90) | — | `onFailure` writes `recordAudit` `needs_attention` on final exhaustion | unit | `npx vitest run tests/notifications/notify.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MANAGE-03 (D-87) | — | Double-tap: two concurrent cron passes → exactly ONE reminder per kind | integration (racing clients) | `npx vitest run tests/notifications/reminders.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MANAGE-03 (D-87) | — | Capped SLA making a reminder unreachable sends nothing (no crash) | integration | `npx vitest run tests/notifications/reminders.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MANAGE-01/02, HOST-02 | V4 | Booker sees only own bookings; host sees only own listings' bookings | integration | `npx vitest run tests/security/` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MANAGE-02 | — | `completed` derived: confirmed + past `ends_at` renders Completed, DB unchanged | integration | `npx vitest run tests/booking/views.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Framework install:** none — Vitest, Playwright, and the isolated-schema harness (`tests/helpers/db.ts`) all exist.

New test files:

- [ ] `tests/payments/cancellation.test.ts` — refund ladder, rounding, fee-never-refunded (PAY-06, BOOK-07)
- [ ] `tests/payments/service-fee.test.ts` — `computeServiceFee` (D-74/D-76)
- [ ] `tests/payments/host-cancel.test.ts` — fee cap, signed debit row (D-70/D-71)
- [ ] `tests/booking/cancellation.test.ts` — snapshot immutability, preview↔action agreement, post-start refusal (BOOK-07)
- [ ] `tests/booking/views.test.ts` — derived `completed`, Upcoming/Past tab partitioning (MANAGE-01/02, HOST-02)
- [ ] `tests/availability/expiry-cap.test.ts` — boundary matrix + proportional split (D-94/D-96)
- [ ] `tests/notifications/notify.test.ts` — fan-out, step memoization, `onFailure` (MANAGE-03, D-90/D-91)
- [ ] `tests/notifications/reminders.test.ts` — at-most-once under concurrency (D-87)
- [ ] `e2e/cancel.spec.ts` — booker cancel journey (SC#2)

Extensions to existing files:

- [ ] `tests/payments/payout-sweep.test.ts` — retention sweep, fee-exclusion, cancel×sweep race, netting floor
- [ ] `tests/payments/payout-reconcile.test.ts` — debit row must not trip the stuck-`held` alert
- [ ] `tests/paymongo/refund.test.ts` — partial-amount refund + idempotency
- [ ] `tests/paymongo/webhook-payment-paid.test.ts` — **guard test**: no `starts_at` condition may be added (D-57 regression)
- [ ] `tests/booking/host-requests.test.ts` — approve-window guard, mode-scoped lead time

> **The concurrency tests are the phase's real gate.** "Concurrent cancel + payout sweep" and
> "double-tap under cron retry" are the two failures that lose or duplicate real money, and
> neither is reachable by a unit test. Reuse the racing-client harness that proved the
> double-booking guarantee — do not mock.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QRPh refund path (whichever of `createRefund` / D-72 InstaPay transfer ships) | PAY-06 | Requires PayMongo test-mode credentials and a live QRPh payment; the settling probe in 07-RESEARCH.md § Gating Verdict must run against the real API | Run the documented test-mode probe; poll the refund to a **terminal** status (HTTP 200 alone is insufficient — an async `failed` looks healthy in code while stranding the booker's money) |
| Real email delivery + rendering (Resend) | MANAGE-03 | Third-party delivery and HTML rendering across clients cannot be asserted in-process | Trigger each of the lifecycle events in dev, confirm receipt and that no payload string renders unescaped |
| Inngest run history / retry observability (D-90) | MANAGE-03 | Dashboard-level observation of retry + exhaustion | Force a send failure, confirm Inngest run history shows retries and a `needs_attention` audit row lands |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
