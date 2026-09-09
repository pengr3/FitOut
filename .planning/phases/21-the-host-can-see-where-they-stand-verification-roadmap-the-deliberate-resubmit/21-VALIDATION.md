---
phase: "21"
slug: "the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit"
status: complete
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
| **Focused phase suite** | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts tests/host/verification-roadmap.test.tsx tests/host/verification-surface.test.ts tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx` |
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
| 21-W0-01 | 21-01 | 1 | HVER-09, HVER-10 | — | Host state remains server-derived | component | `npm.cmd test -- tests/host/verification-roadmap.test.tsx` | ✅ | ✅ green |
| 21-W0-02 | 21-01 | 1 | HVER-11, HVER-12, HVER-13, HVER-14 | — | Each roadmap step reads its own authority; grandfathered stays silent; cause and retry instant reuse guarded server values | unit/structural | `npm.cmd test -- tests/host/verification-roadmap-state.test.ts tests/host/verification-surface.test.ts` | ✅ | ✅ green |
| 21-05-01 | 21-05 | 2 | HVER-09, HVER-10 | — | One semantic responsive tree preserves state and action ownership through existing design ledgers | design | `npm.cmd exec vitest -- run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts tests/design/loading-coverage.test.ts tests/design/one-tree.test.ts` | ✅ | ✅ green |
| 21-05-02 | 21-05 | 2 | HVER-09, HVER-10, HVER-14 | — | Both themes and acceptance widths preserve the shipped stale rescue and singular state/action contract | browser | `npm.cmd exec playwright -- test e2e/host-dashboard.spec.ts --project=chromium --reporter=list` | ✅ | ✅ green |
| 21-03-01 | 21-03 | 2 | LVER-06, LVER-08 | T-21-01 | Rejected-only edit route is owner-bound and discloses material fields before navigation | component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 21-W0-05 | 21-02 | 1 | LVER-07 | T-21-02 | History is owner-scoped, excludes deleted-parent and staff identity, and is bounded | integration/component | `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` | ✅ | ✅ green |
| 21-04-01 | 21-04 | 3 | LVER-09 | T-21-03 | Field-save receipt is latched only from a server-confirmed guarded transition | integration/component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx` | ✅ | ✅ green |
| 21-04-02 | 21-04 | 3 | LVER-09 | T-21-03 | Photo add/remove returns guarded authority while reorder, false, and error paths remain silent | integration/component | `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/wizard-save-state.test.tsx tests/listing/photos.test.ts` | ✅ | ✅ green |
| 21-04-03 | 21-04 | 3 | LVER-06, LVER-07, LVER-08, LVER-09 | T-21-01, T-21-02, T-21-03 | Rejected entry, one focused receipt, durable pending history, long text, and 320px/1280px court/grove geometry hold end to end | browser/invariant | `npm.cmd exec playwright -- test e2e/host-listing-grid.spec.ts --project=chromium --reporter=list` plus frozen-source and zero-scope guards | ✅ | ✅ green |

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

**Approval:** complete — all ten Phase 21 requirement IDs map to real passing tests, the full Vitest and design suites passed, and the listing-grid browser journey passed in Chromium.
