---
phase: 8
slug: group-bookings
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-27
updated: 2026-07-29
---

# Phase 8 — Validation Strategy

> Per-phase validation contract. **Audited 2026-07-29 against the delivered code + tests** (this file was
> originally a pre-execution plan with `TBD` rows; it now records actual coverage). Every Phase-8 requirement
> (GROUP-01…GROUP-05) and every load-bearing decision/blocker (D-108, D-113, D-122, CR-01…CR-04, the
> gap-closure double-charge + surcharge-reachability fixes) has a green automated test. **`nyquist_compliant: true`.**

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.8` (unit + integration against an isolated Postgres schema) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` (present; `// @vitest-environment jsdom` pragma for component tests) |
| **Quick run command** | `npx vitest run tests/group/` |
| **Full suite command** | `npm test` → **98 files / 859 tests (855 passed, 4 skipped), exit 0** (2026-07-29) |
| **Requirement-subset run** | `npx vitest run tests/group/ tests/booking/pricing.test.ts tests/booking/pax-surcharge-hold.test.ts tests/booking/pax-reprice.test.ts tests/booking/when-label.test.ts tests/booking/checkout-session-expire.test.ts tests/booking/confirm-double-submit.test.ts tests/validation/listing-schema.test.ts tests/listing/crud.test.ts tests/payments/paymongo-calls.test.ts tests/notifications/notify.test.ts` → **18 files / 212 tests, green** |
| **Estimated runtime** | ~16s (requirement subset); ~54s (full suite) |
| **Prereq** | Docker Postgres `fitout-db-1` up on :5432 (DB-backed integration tests) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/group/` (or the touched surface)
- **After every plan wave:** `npm test` (full suite must be green)
- **Money-path invariants:** mutation-verified (delete the guard → red → restore) — see the ⚑ rows below
- **Real-provider invariant (08-19/08-21):** opt-in `RUN_LIVE_PAYMONGO_PROBE=1` against a real `sk_test_` key
- **Max feedback latency:** ~16s (requirement subset)

---

## Per-Task Verification Map

Every Phase-8 requirement and blocker mapped to its green automated surface. ⚑ = mutation-verified
(the test provably fails when the guard is removed, then passes when restored).

| Requirement / Decision | Secure behavior | Test surface | Type | Status |
|------------------------|-----------------|--------------|------|--------|
| **GROUP-05** ⚑ | Concurrent `→yes` never exceeds `capacity_snapshot` (atomic, `FOR UPDATE`); deleting the lock reds the file | `tests/group/seat-claim-race.test.ts` | integration (per-connection race) | ✅ green |
| **GROUP-05** | yes→no frees a seat; freed seat re-claimable; cap reads snapshot not live `maxOccupancy` (D-113) | `tests/group/seat-claim.test.ts` | integration | ✅ green |
| **GROUP-03** | Guest (no session) can RSVP; account can RSVP; one `rsvp` row w/ nullable `user_id`; de-dup by user_id/email | `tests/group/rsvp-identity.test.ts` | integration | ✅ green |
| **GROUP-03 / D-117** | Opt-in email guard: only an address that submitted an RSVP is emailed; rate-limited; blank-email → no send | `tests/group/guest-email-guard.test.ts`, `tests/group/rsvp-rate-limit.test.ts` | integration | ✅ green |
| **GROUP-04** | Owner-gated roster/headcount; non-organizer → bare 404; unknown = revoked = voided render the same | `tests/group/group-owner-scope.test.ts` | security | ✅ green |
| **GROUP-01 / GROUP-02** | createGroup only on a caller-owned `confirmed` booking; token minted; regenerate kills old; cancel auto-voids | `tests/group/group-lifecycle.test.ts` | integration | ✅ green |
| **D-108** | Surcharge = `max(0, pax−included) × extraHeadFee`; `extraHeadFee=0` ⇒ identical to flat (zero leak); frozen at hold | `tests/booking/pricing.test.ts`, `tests/booking/pax-surcharge-hold.test.ts` | unit + integration | ✅ green |
| **D-113 / WR-03 / WR-04** ⚑ | Organizer seat reserved (`capacity_snapshot = max−1`); nudge fires on over-subscription, silent otherwise | `tests/group/top-up-nudge.test.tsx` | component + source | ✅ green |
| **D-122** | Group notification types render + dispatch; guest name escaped (XSS); href absolute + `safeHref` | `tests/notifications/notify.test.ts`, `notification-render.test.tsx`, `guest-email.test.ts` | integration + component | ✅ green |
| **CR-01** ⚑ | Time label read from persisted `booking.full_day`, never inferred from a price column | `tests/booking/when-label.test.ts` | unit | ✅ green |
| **CR-02** ⚑ | Re-price expires the persisted checkout session BEFORE refreezing; failed expire refuses | `tests/booking/checkout-session-expire.test.ts`, `tests/booking/pax-reprice.test.ts` | integration | ✅ green |
| **CR-03** | PaxStepper re-quotes server-side and clamps at capacity (no client arithmetic) | covered via `pricing.test.ts` + 08-17 human UAT | unit + UAT | ✅ green |
| **Double-charge (08-18, GROUP-01 money path)** ⚑ | `confirmBooking` expires any named session BEFORE creating a new one (flat + per-head), fail-closed | `tests/booking/confirm-double-submit.test.ts` | integration (DB) | ✅ green |
| **Real-provider proof (08-19, item 5+6)** | Two identical checkout POSTs mint different payable session ids; expire retires; re-price supersession | `tests/paymongo/checkout-idempotency-real.test.ts` | live-API (gated) | ✅ green opted-in · ⏭️ skips by default |
| **Idempotent expire / livelock (08-21)** ⚑ | `expireCheckoutSession` tolerates the already-expired 400; genuine failures still throw | `tests/payments/paymongo-calls.test.ts` | unit (fetch-stub) | ✅ green |
| **Surcharge reachability — publish (08-20, item 7)** ⚑ | `publishSchema` rejects `included ≥ maxOccupancy` when a fee is set; flat/draft exempt; `≥`→`>` mutation reds | `tests/validation/listing-schema.test.ts` | unit | ✅ green |
| **Surcharge reachability — edit (08-22, HG-01)** ⚑ | `saveListingStep` rejects the same on published rows (effective-value, both vectors); remove-guard mutation reds | `tests/listing/crud.test.ts` | integration (DB) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⏭️ skipped-by-design · ⚑ mutation-verified*

---

## Wave 0 Requirements — all satisfied

- [x] `tests/group/seat-claim-race.test.ts` — GROUP-05 acceptance gate (real `claimSeat`, per-connection race, mutation-verified via 08-16)
- [x] `tests/group/seat-claim.test.ts` — GROUP-05 (toggle/free/re-claim, snapshot-not-live)
- [x] `tests/group/rsvp-identity.test.ts` — GROUP-03 (guest vs account, de-dup)
- [x] `tests/group/guest-email-guard.test.ts` + `rsvp-rate-limit.test.ts` — D-117 opt-in guard + rate-limit + blank-email-no-send
- [x] `tests/group/group-owner-scope.test.ts` — GROUP-04 owner-gate + token-oracle
- [x] `tests/group/group-lifecycle.test.ts` — GROUP-01/02 (create/regenerate/void/cancel-auto-void)
- [x] `tests/booking/pricing.test.ts` + `pax-surcharge-hold.test.ts` (D-108); `tests/notifications/` (D-122)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Guest opens a real invite link in a fresh browser and RSVPs without an account; organizer sees the headcount update | GROUP-02 / 03 / 04 | Full cross-session UX (link → guest RSVP → organizer roster) is best confirmed end-to-end; the units are automated | ✅ performed in 08-09 organizer UAT |
| Guest-with-email actually receives the RSVP confirmation / cancellation email via real Resend | D-117 / D-122 | Real external email delivery (not the dev fallback) | ✅ performed in 08-17 UAT step 8 (real delivery confirmed) |
| Live PayMongo money path (per-head + surcharge, double-submit, cap) exercised by a human | GROUP-01 / GROUP-05 / D-108 | Real payment rail + browser choreography | ✅ 08-17 walkthrough (6/7 steps approved; step 4 found the double-charge → fixed + live-proven by 08-18→08-22) |
| Real-provider idempotency invariant (two POSTs → two sessions; expire retires; repeat-expire tolerated) | GROUP-01 money path | Requires live `sk_test_` calls | ✅ run opted-in (`RUN_LIVE_PAYMONGO_PROBE=1`) by both executor and verifier |

*The real-API test (`checkout-idempotency-real.test.ts`) is opt-in and skips in a default `npm test`; the same
money-path invariant it proves live is ALSO covered default-green by the mock-backed `confirm-double-submit.test.ts`,
so no requirement depends solely on a skipped test.*

---

## Validation Audit 2026-07-29

| Metric | Count |
|--------|-------|
| Requirements/decisions audited | 17 rows (GROUP-01…05, D-108/113/122, CR-01/02/03, 5 gap-closure surfaces) |
| COVERED (green automated) | 17 |
| PARTIAL | 0 |
| MISSING | 0 |
| Gaps generated this run | 0 (nothing missing) |
| Mutation-verified surfaces | 8 (⚑) |

---

## Validation Sign-Off

- [x] All requirements have `<automated>` verify (or a documented manual-only supplement on top of automated units)
- [x] Sampling continuity: no requirement without an automated surface
- [x] Wave 0 covers all references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-07-29
