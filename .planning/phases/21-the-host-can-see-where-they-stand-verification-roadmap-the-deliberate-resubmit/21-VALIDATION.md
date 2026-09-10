---
phase: "21"
slug: "the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-09"
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 for unit, integration, and component tests; Playwright 1.60.0 for route journeys |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` |
| **Quick run command** | `npm.cmd test -- <one changed test file>` |
| **Focused phase suite** | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts tests/host/verification-roadmap.test.tsx tests/host/verification-surface.test.ts tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx tests/listing/photos.test.ts` |
| **Full suite command** | `npm.cmd test` |
| **Estimated runtime** | ~60 seconds focused; full suite measured during execution |

---

## Sampling Rate

- **After every task commit:** Run the task's narrow changed-test command; include `tests/listing/material-edit.test.ts` when an action result shape changes.
- **After every plan wave:** Run the focused phase suite plus `npm.cmd run test:design`.
- **Before `$gsd-verify-work`:** Run full Vitest, the design suite, targeted host-dashboard/listing-grid/wizard Playwright specs, TypeScript, and the production build.
- **Max feedback latency:** 60 seconds for the normal task-level loop.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 21-01 | 1 | HVER-09, HVER-10 | T-21-01, T-21-04, T-21-05 | Zero-listing dashboard renders the server-derived four-step roadmap, one advancing control, and no duplicate legacy signals | component | `npm.cmd test -- tests/host/verification-roadmap.test.tsx tests/host/agenda-states.test.tsx` | ✅ | ✅ green |
| 21-01-02 | 21-01 | 1 | HVER-11, HVER-12, HVER-13, HVER-14 | T-21-01, T-21-02, T-21-03 | Exhaustive state, adjacency, clock-boundary, and first-bookable authority remain server-derived | unit/structural | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts tests/host/verification-roadmap.test.tsx tests/host/verification-surface.test.ts tests/inngest/didit-reconcile.test.ts` | ✅ | ✅ green |
| 21-02-01 | 21-02 | 1 | LVER-07 | T-21-06, T-21-07, T-21-08, T-21-09 | Owner/deleted scope, host-safe projection, and resolved review lifecycle are exercised through the real DB and card | integration/component | `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 21-02-02 | 21-02 | 1 | LVER-07 | T-21-06, T-21-07, T-21-08, T-21-09 | Deterministic five-plus-one bounds, partial rows, dialog focus, wrapping, and scrolling are covered | integration/component/browser | `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` plus `npm.cmd exec playwright -- test e2e/host-listing-grid.spec.ts --project=chromium --reporter=list` | ✅ | ✅ green |
| 21-03-01 | 21-03 | 2 | LVER-06, LVER-08 | T-21-10, T-21-12, T-21-13 | Rejected-only entry explains the canonical seven material fields before navigation and performs no mutation | component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 21-03-02 | 21-03 | 2 | LVER-06, LVER-08 | T-21-10, T-21-11, T-21-13 | Owner/deleted-scoped server context, not URL input, controls the persistent wizard notice | unit/structural | `npm.cmd test -- tests/listing/wizard-save-state.test.tsx tests/listing/material-edit.test.ts` | ✅ | ✅ green |
| 21-03-03 | 21-03 | 2 | LVER-06, LVER-08 | T-21-10, T-21-13 | Deliberate entry, focus restoration, long-copy wrapping, and direct-entry truth hold in component and browser paths | component/browser | `npm.cmd test -- tests/listing/listing-card.test.tsx tests/listing/wizard-save-state.test.tsx` plus `npm.cmd exec playwright -- test e2e/host-listing-grid.spec.ts --project=chromium --reporter=list` | ✅ | ✅ green |
| 21-04-01 | 21-04 | 3 | LVER-09 | T-21-14, T-21-15, T-21-16, T-21-17 | Field-save receipt is latched only from a server-confirmed guarded transition | integration/component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx` | ✅ | ✅ green |
| 21-04-02 | 21-04 | 3 | LVER-09 | T-21-14, T-21-15, T-21-16, T-21-17 | Photo add/remove returns guarded authority while reorder, false, and error paths remain silent | integration/component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx tests/listing/photos.test.ts` | ✅ | ✅ green |
| 21-04-03 | 21-04 | 3 | LVER-06, LVER-07, LVER-08, LVER-09 | T-21-14, T-21-15, T-21-16, T-21-17 | Rejected entry, one focused receipt, durable pending history, and responsive geometry hold end to end | browser/invariant | `npm.cmd exec playwright -- test e2e/host-listing-grid.spec.ts --project=chromium --reporter=list` plus frozen-source and zero-scope guards | ✅ | ✅ green |
| 21-05-01 | 21-05 | 2 | HVER-09, HVER-10, HVER-14 | T-21-20, T-21-21, T-21-22, T-21-23 | One semantic responsive tree preserves state and action ownership through existing design ledgers | component/design | `npm.cmd test -- tests/host/verification-roadmap.test.tsx tests/host/verification-roadmap-state.test.ts` plus `npm.cmd exec vitest -- run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts tests/design/loading-coverage.test.ts tests/design/one-tree.test.ts` | ✅ | ✅ green |
| 21-05-02 | 21-05 | 2 | HVER-09, HVER-10, HVER-14 | T-21-20, T-21-21, T-21-22, T-21-23 | Both themes and acceptance widths preserve stale rescue, focus, state/action singularity, and receipt exclusivity | browser | `npm.cmd exec playwright -- test e2e/host-dashboard.spec.ts --project=chromium --reporter=list` | ✅ | ✅ green |
| 21-06-01 | 21-06 | 4 | LVER-06 | T-21-06-01, T-21-06-02, T-21-06-03, T-21-06-04 | Newest null/blank rejection remains authoritative over an older non-empty reason in the real DB | integration | `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 21-06-02 | 21-06 | 4 | LVER-06 | T-21-06-01, T-21-06-03 | The visible Fix and resubmit dialog never promotes historical text into current guidance | component | `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 21-07-01 | 21-07 | 4 | HVER-10 | T-21-07-01, T-21-07-02, T-21-07-03 | Rejected payout promises become bounded inline feedback and never navigate | component | `npm.cmd test -- tests/host/verification-roadmap.test.tsx tests/host/verification-roadmap-state.test.ts` | ✅ | ✅ green |
| 21-07-02 | 21-07 | 4 | HVER-10 | T-21-07-02, T-21-07-04 | Retry clears stale feedback and replaces it with the current authoritative refusal, one call per click | component | `npm.cmd test -- tests/host/verification-roadmap.test.tsx tests/host/verification-roadmap-state.test.ts` | ✅ | ✅ green |
| 21-08-01 | 21-08 | 5 | HVER-09, HVER-10, HVER-14 | T-21-08-01, T-21-08-02, T-21-08-03 | Real Chromium geometry proves roadmap body and CTA containment after the intrinsic-height correction | browser/component | `npm.cmd exec playwright -- test e2e/host-dashboard.spec.ts --project=chromium --grep "court · the roadmap and receipt state matrix" --reporter=list` plus `npm.cmd test -- tests/host/verification-roadmap.test.tsx` | ✅ | ✅ green |
| 21-08-02 | 21-08 | 5 | HVER-09, HVER-10, HVER-14 | T-21-08-01, T-21-08-02, T-21-08-03 | Both themes, both widths, all roadmap states, and ready/mixed receipts have numeric vertical-containment coverage | browser | `npm.cmd exec playwright -- test e2e/host-dashboard.spec.ts --project=chromium --grep "the roadmap and receipt state matrix reflows at 320px/1280px without overflow" --reporter=list` | ✅ | ✅ green |

*Task IDs and plan/wave assignments are finalized when the planner emits PLAN.md files. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky.*

---

## Wave 0 Requirements

- [x] `tests/host/verification-roadmap-state.test.ts` — exhaustive authority-state/portfolio truth table, including the first-bookable mixed portfolio and exact 30-minute pending boundary.
- [x] `tests/host/verification-roadmap.test.tsx` — semantic cards and receipt, action counts, owed hook, grandfathered silence, and no percentage/countdown/queue-position copy.
- [x] `tests/listing/review-history.test.ts` — owner scope, deleted-parent exclusion, deterministic newest-first ordering, maximum five displayed cycles, and an older-data sentinel.
- [x] Extend `tests/listing/listing-card.test.tsx` — rejected-only fix dialog, material-field list, history dialog, reasons as text, and no staff identity.
- [x] Extend `tests/listing/material-edit.test.ts` — field and photo action results expose `flipped: true` only when the guarded transition moves.
- [x] Extend `tests/listing/wizard-save-state.test.tsx` — latched in-page receipt, non-material false path, photo callback, no URL-authorized receipt, and save-as-draft navigation behavior.
- [x] Extend `e2e/host-dashboard.spec.ts` — four-card/receipt routes and 320px no-overflow behavior.
- [x] Extend `e2e/host-listing-grid.spec.ts` — fix dialog, review history, and full resubmit receipt journey.
- [x] Add a byte-identity guard or explicit diff check for `src/lib/listing/re-review.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calm pending-state visual hierarchy and clearly distinct named states | HVER-09, HVER-12 | Visual tone is not fully established by semantic assertions | Inspect all host verification states at desktop and 320px; confirm pending is calm, actionable failures are bordered and headed, and `grandfathered` emits no host-facing state card. |
| Material-edit warning is understandable before navigation | LVER-06, LVER-08 | Copy comprehension needs human judgment | Open a rejected listing, choose **Fix and resubmit**, and confirm the dialog plainly explains that any of the seven material fields returns the listing to review before entering the wizard. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers every planned reference
- [x] No watch-mode flags
- [x] Feedback latency < 60s for the task-level loop
- [x] `nyquist_compliant: true` set in frontmatter after validation

**Approval:** complete — all 18 tasks across all eight Phase 21 plans and all ten requirement IDs map to real passing tests. The latest full Vitest run passed 234 files with 2 skipped (2,948 tests passed, 5 skipped); Plan 21-08's focused Chromium matrix passed 2/2, its component suite passed 7/7, and the production build passed with the documented local `OPS_APP_URL`.

---

## Validation Audit 2026-09-09

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

## Validation Audit 2026-09-10

| Metric | Count |
|--------|-------|
| Stale task-map gaps found | 6 |
| Resolved from existing automated coverage | 6 |
| New tests required | 0 |
| Escalated | 0 |

Plans 21-06, 21-07, and 21-08 were reconciled into the map after their completed gap-closure work. A fresh consolidated Vitest selection covering all Phase 21 unit, integration, and component files passed **169/169** on 2026-09-10. Existing mutation-validated RED evidence and the recorded clean Playwright/build runs were retained; no redundant test was created.
