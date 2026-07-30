---
phase: 9
slug: open-capacity-bookings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-30
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `09-RESEARCH.md` §Validation Architecture. The SC#3 concurrent-overbook
> race is the non-negotiable acceptance gate (the Phase-3 SC#4 analog).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (integration via isolated Postgres schemas) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` + `tests/helpers/db.ts` (`makeRacingClients`) — all present |
| **Quick run command** | `npx vitest run tests/availability/open-capacity-race.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~quick <15s / full per existing suite |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/availability/open-capacity-race.test.ts`
- **After every plan wave:** Run `npx vitest run tests/availability tests/validation tests/paymongo`
- **Before `/gsd-verify-work`:** Full suite (`npx vitest run`) must be green
- **Max feedback latency:** ~15 seconds (quick), full suite before phase gate

---

## Per-Task Verification Map

> Task IDs are assigned during planning; the planner/nyquist-auditor refines this map
> against the final PLAN.md task breakdown. Rows below are seeded per requirement from
> the research test map so Wave 0 coverage is fixed before task IDs exist.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | OPEN-03 | T-09-RACE | (cap+1)-th concurrent single-head claim rejected; committed SUM(heads) never exceeds cap | integration (genuine race) | `npx vitest run tests/availability/open-capacity-race.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | OPEN-03 | T-09-RACE | concurrent MULTI-head claims never overshoot cap; partial-fill grants exactly `remaining` | integration (race) | `npx vitest run tests/availability/open-capacity-race.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | OPEN-03 | T-09-RELEASE | released seat re-bookable (cancel → remaining increments → new claim succeeds) | integration | `npx vitest run tests/availability/open-capacity-race.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | OPEN-03 | T-09-EXCLUDE | second same-date open booking is NOT rejected by the narrowed EXCLUDE (Pitfall 1) | integration | `npx vitest run tests/availability/open-capacity-exclude.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | OPEN-04 | T-09-READMODEL | `remaining = cap − SUM(occupying heads)`; search keeps date iff ≥1 spot left | integration | `npx vitest run tests/availability/open-capacity-readmodel.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | OPEN-01 | T-09-TAMPER | publish gate: open mode requires per-head price + cap, forbids hourly/day, forces instant, unitCount=1 | unit | `npx vitest run tests/validation/listing.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | — | OPEN-02 | — | one booking row per payment; confirm webhook flips pending→confirmed unchanged | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend | ⬜ pending |
| TBD | TBD | — | OPEN-04 | — | E2E: two bookers share a date, spots-left decrements, sold-out at cap | e2e | Playwright spec (TBD) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/availability/open-capacity-race.test.ts` — the SC#3 acceptance gate (OPEN-03), red-first. Model on `tests/group/seat-claim-race.test.ts` Layer 2 + `tests/availability/exclusion-race.test.ts`. Use `makeRacingClients` (independent connections, never one `max:1` client). Drive the **real** `createOpenCapacityHold`. Mutation gate: deleting the `pg_advisory_xact_lock` line in `src/lib/availability/units.ts` must turn the real-claim cases RED (SUM > cap).
- [ ] `tests/availability/open-capacity-exclude.test.ts` — Pitfall 1 same-date multi-booking passes under the narrowed EXCLUDE (OPEN-03).
- [ ] `tests/availability/open-capacity-readmodel.test.ts` — spots-left projection `{ remaining, cap }` (OPEN-04).
- [ ] Extend `tests/validation/listing.test.ts` — mode-forked publish gate (OPEN-01).
- [ ] Extend `tests/paymongo/webhook-payment-paid.test.ts` — open booking confirm (OPEN-02).
- [ ] Playwright E2E — two-booker shared-date decrement + sold-out (OPEN-04).
- Framework install: **none** (Vitest + Playwright + `makeRacingClients` all present).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real PayMongo hosted-checkout charge for an open-capacity booking | OPEN-02 | Live sandbox payment confirm authority is exercised against sk_test_ (rail unchanged; already UAT-covered by Phase 6/8) | Book an open listing end-to-end in test mode; confirm the `checkout_session.payment.paid` webhook flips the single open booking `pending→confirmed`. |

*All correctness-critical (no-overbook / spots-left / publish-gate) behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s (quick), full suite before phase gate
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
