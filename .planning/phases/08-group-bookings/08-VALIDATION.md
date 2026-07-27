---
phase: 8
slug: group-bookings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-27
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `08-RESEARCH.md` § Validation Architecture. Per-task rows are
> filled in by the planner once task IDs are minted in the PLAN.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.8` (unit + integration against an isolated schema) + Playwright `^1.60.0` (e2e) |
| **Config file** | `vitest.config.ts` (present; `// @vitest-environment jsdom` pragma for component tests) |
| **Quick run command** | `npx vitest run tests/group/` |
| **Full suite command** | `npm test` (Phase 7 baseline: 78 files / 655 tests, exit 0) |
| **Estimated runtime** | ~30–60 seconds (quick subset); full suite longer |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/group/`
- **After every plan wave:** Run `npm test` (full suite must be green)
- **Before `/gsd:verify-work`:** Full suite green **AND** the GROUP-05 race test mutation-verified (delete `FOR UPDATE` → red → restore)
- **Max feedback latency:** ~60 seconds (quick subset)

---

## Per-Task Verification Map

> Task IDs (`08-PP-TT`) are assigned by the planner in the PLAN.md files. The
> executor fills each row's Status as tests go green. Requirement → test-surface
> mapping below is authoritative (from RESEARCH.md § Validation Architecture).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | GROUP-05 | T-08 cap-overflow | Concurrent `→yes` never exceeds `capacity_snapshot` (atomic, no overflow) | integration (two-connection race) | `npx vitest run tests/group/seat-claim-race.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | GROUP-05 | — | yes→no frees a seat; freed seat re-claimable; partial RSVP leaves booking valid (D-113); cap reads snapshot not live `maxOccupancy` | integration | `npx vitest run tests/group/seat-claim.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | GROUP-03 | — | Guest (no session) can RSVP; account can RSVP; one `rsvp` row w/ nullable `user_id`; de-dup by user_id/email | integration | `npx vitest run tests/group/rsvp-identity.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | GROUP-03 / D-117 | T-08 spam-cannon | Opt-in email guard: only an address that submitted an RSVP is emailed; rate-limited; blank-email guest gets NO send | integration | `npx vitest run tests/group/guest-email-guard.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | GROUP-04 | T-08 IDOR / token-oracle | Owner-gated roster/headcount; non-organizer → bare 404; unknown=revoked=voided render the same | security | `npx vitest run tests/group/group-owner-scope.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | GROUP-01 / GROUP-02 | T-08 spoof-create | createGroup only on a `confirmed` booking owned by caller; token minted; regenerate kills old token; cancel auto-voids | integration | `npx vitest run tests/group/group-lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | D-108 | T-08 client-price | Surcharge = `max(0, pax−included) × extraHeadFee`; `extraHeadFee=0` ⇒ identical to today (zero leak) | unit | `npx vitest run tests/booking/pricing.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | — | D-122 | T-08 stored-XSS | Four-file group notification types render + dispatch; guest name escaped; href absolute + `safeHref` | integration + component | `npx vitest run tests/notifications/` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/group/seat-claim-race.test.ts` — GROUP-05 (the acceptance gate; clone `tests/availability/exclusion-race.test.ts`, but each racer runs a FULL transaction via `client.begin`)
- [ ] `tests/group/seat-claim.test.ts` — GROUP-05 (toggle/free/re-claim, snapshot-not-live)
- [ ] `tests/group/rsvp-identity.test.ts` — GROUP-03 (guest vs account, de-dup by user_id / normalized email)
- [ ] `tests/group/guest-email-guard.test.ts` — D-117 opt-in guard + rate-limit + blank-email-no-send
- [ ] `tests/group/group-owner-scope.test.ts` — GROUP-04 owner-gate + token-oracle (clone `bookings-owner-scope.test.ts`)
- [ ] `tests/group/group-lifecycle.test.ts` — GROUP-01/02/D-121 (create/regenerate/void/cancel-auto-void)
- [ ] Extend `tests/booking/pricing.test.ts` (D-108) and `tests/notifications/notify.test.ts` + `notification-render.test.tsx` (D-122)
- [ ] Shared fixtures: reuse `tests/helpers/db.ts` (`setupTestDb` / `makeRacingClients`) and `tests/helpers/mocks.ts` (`mockResend`) — no new harness needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guest opens a real invite link in a fresh browser and RSVPs without an account; organizer sees the headcount update | GROUP-02 / GROUP-03 / GROUP-04 | Full cross-session UX (link → guest RSVP → organizer roster) is best confirmed end-to-end; automated coverage proves the units | Create a group on a confirmed booking, copy the invite link, open in a private window, RSVP as a name-only guest and as a guest-with-email, confirm the organizer roster + headcount reflect it |
| Guest-with-email actually receives the RSVP confirmation / cancellation email | D-117 / D-122 | Real Resend delivery (not the dev fallback) is an external side-effect | Provide an email on RSVP; cancel the parent booking; confirm the cancellation notice arrives; confirm a blank-email guest receives nothing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
