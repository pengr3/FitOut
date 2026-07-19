---
phase: 6
slug: full-booking-payment-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-20
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `06-RESEARCH.md` § Validation Architecture. Task IDs are reconciled against the PLAN.md files during planning; requirement-level observation points below are stable.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (integration, isolated-schema DB harness) + Playwright 1.60.0 (E2E, present) |
| **Config file** | `vitest.config.*` (present); DB harness `tests/helpers/db.ts` (`setupTestDb`/`makeRacingClients`); mocks `tests/helpers/mocks.ts` (`mockPayMongo`, `mockResend`) |
| **Quick run command** | `npx vitest run tests/booking tests/paymongo tests/payments` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~30 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/booking tests/paymongo tests/payments`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds
- **Non-negotiable correctness gate:** the concurrent-double-book race on a `requested`/`approved` slot MUST fail the conflicting insert before the phase can pass.

---

## Per-Task Verification Map

> Requirement-level observation points from `06-RESEARCH.md` § Phase Requirements → Test Map. `Task ID` filled in during planning; each PLAN task must carry an `<automated>` verify that maps to one of these commands (or a Wave-0 stub below).

| Task ID | Requirement | Secure Behavior (observation point) | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-------------------------------------|-----------|-------------------|-------------|--------|
| TBD | BOOK-05 / BOOK-03 | Concurrent double-book on a `requested` slot fails (EXCLUDE widened) | integration (race, `makeRacingClients`) | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | BOOK-05 / BOOK-03 | Concurrent double-book on an `approved` slot fails | integration | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | BOOK-04 / BOOK-05 | `placeHold` forks: request → `requested` (no checkout, "received" redirect); instant → `pending` unchanged | integration | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | HOST-01 | Approve is atomic + SLA-guarded (0 rows on a lapsed `requested`) | integration | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | HOST-01 / Security V4 | Owner-gate: a different host/booker cannot approve/decline host-A's request (no state change, identical calm denial) | integration | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | BOOK-05 | SLA auto-decline: `requested` past `expires_at` → `declined` + slot freed + booker email | integration (DB-clock manip) | `npx vitest run tests/booking/request-expiry.test.ts` | ❌ W0 | ⬜ pending |
| TBD | PAY-05 | Payment-window auto-release: `approved` past `expires_at` → `cancelled` + slot freed | integration | `npx vitest run tests/booking/request-expiry.test.ts` | ❌ W0 | ⬜ pending |
| TBD | PAY-05 / BOOK-06 | Webhook confirms the right request row: `payment.paid` w/ ref=`approved` id → `confirmed` | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | PAY-05 | Pay-after-release race: `payment.paid` for a released/`cancelled` request → `handleGoneSlot` refund/alert (D-58) | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | BOOK-06 | Confirmed email fires from the webhook on a successful confirm (instant + approval) | integration (`mockResend.sent()`) | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | BOOK-06 | Lifecycle emails fire at each trigger (received, approved-pay-link, declined) | integration (`mockResend`) | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | BOOK-04 | D-62 default: `createDraftListing` → `bookingMode='instant'` | unit/integration | `npx vitest run tests/listing` | ⚠️ extend | ⬜ pending |
| TBD | D-61 | Mode-flip independence: flipping `listing.bookingMode` does not alter an in-flight `requested`/`approved` row | integration | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | HOST-01 | `/host/requests` owner-scope: host A sees only A's requests | integration | `npx vitest run tests/booking/request-lifecycle.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/booking/request-lifecycle.test.ts` — the `placeHold` fork, approve/decline atomicity + SLA guard, owner-gate, concurrent double-book on `requested`/`approved`, mode-flip independence, `/host/requests` owner-scope, lifecycle-email assertions. Clone the harness from `tests/booking/state-machine.test.ts` (real actions via `vi.doMock`, `mockPayMongo`, `mockResend`, redirect-capture).
- [ ] `tests/booking/request-expiry.test.ts` — SLA auto-decline + payment-window auto-release sweep (DB-clock manipulation via `UPDATE ... expires_at = now() - interval`), mirroring `tests/payments/payout-sweep.test.ts`.
- [ ] Extend `tests/paymongo/webhook-payment-paid.test.ts` — `approved`→`confirmed`; pay-after-release → `handleGoneSlot`; confirmed-email fires.
- [ ] Extend `tests/listing/*` — D-62 default flip.
- [ ] No framework install needed — Vitest + the DB harness + `mockPayMongo`/`mockResend` already cover everything.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end pay-on-approval against PayMongo test mode (hosted checkout redirect + real `payment.paid` webhook) | PAY-05 / BOOK-06 | Hosted off-site checkout + live webhook delivery cannot be fully driven in the integration harness (mocked PayMongo covers the server contract, not the redirect round-trip) | Create a request-mode listing → request a slot → approve from `/host/requests` → follow the "pay now" email link → complete PayMongo test checkout → confirm booking flips to `confirmed` and confirmation email arrives (dev log or Resend) |
| `/host/requests` expiry countdown renders venue-local and updates | HOST-01 | Client-side `setInterval` countdown + timezone display is visual | Open `/host/requests` with a pending request; verify the countdown ticks and the deadline is shown in venue-local time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
