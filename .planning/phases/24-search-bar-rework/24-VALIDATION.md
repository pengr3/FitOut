---
phase: "24"
slug: "search-bar-rework"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-14"
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 + Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` |
| **Quick run command** | `npm test -- tests/validation/booking-schemas.test.ts tests/search/progressive-search.test.tsx` |
| **Full suite command** | `npm test && npm run test:design && npm run lint && npm run build && npm run test:e2e` |
| **Estimated runtime** | focused checks under 30 seconds; full suite several minutes |

---

## Sampling Rate

- **After every task commit:** Run the task's focused Vitest or Playwright command from the map below.
- **After every plan wave:** Run `npm test` plus `npm run test:e2e -- e2e/progressive-search.spec.ts` for UI waves.
- **Before `$gsd-verify-work`:** Run `npm test && npm run test:design && npm run lint && npm run build && npm run test:e2e`; the full suite must be green.
- **Max feedback latency:** 30 seconds for task-level focused checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-W0-01 | TBD | 0 | D-01–D-04 | T-24-01 | URL values remain server-validated and the activity value is a closed catalogue option | component/schema | `npm test -- tests/search/progressive-search.test.tsx tests/validation/booking-schemas.test.ts` | ❌ W0 component; ✅ schema extension | ⬜ pending |
| 24-W0-02 | TBD | 0 | D-05 | T-24-02 | Geolocation runs only after explicit user action and failure remains recoverable | component/E2E | `npm run test:e2e -- e2e/progressive-search.spec.ts` | ❌ W0 | ⬜ pending |
| 24-W0-03 | TBD | 0 | D-06–D-07 | T-24-03 | Bounded integer party size is enforced server-side and parameterized SQL excludes null/undersized listings | integration | `npm test -- tests/search/party-size-filter.test.ts` | ❌ W0 | ⬜ pending |
| 24-W0-04 | TBD | 0 | D-08 | — | Populated and empty results expose the same direct-edit chips and no legacy relaxation controls | component | `npm test -- tests/search/search-results-states.test.tsx` | ✅ rewrite | ⬜ pending |
| 24-W0-05 | TBD | 0 | D-01–D-08 | T-24-01 / T-24-02 | Keyboard, focus, reduced-motion, axe, mobile, reload, and result-state journeys remain observable | E2E/design | `npm run test:e2e -- e2e/progressive-search.spec.ts && npm run test:design` | ❌ W0 journey; ✅ harness | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/search/progressive-search.test.tsx` — state transitions, retained answers, exact catalogue, group validation, focus, and URL output for D-01–D-04.
- [ ] `tests/search/party-size-filter.test.ts` — `max_occupancy` null, below, equality, above-boundary, and both occupancy-mode semantics for D-06–D-07.
- [ ] `e2e/progressive-search.spec.ts` — desktop and 375px journey, Back/Edit/Cancel, geolocation, reload/share URL, and populated/empty result chips for D-01–D-08.
- [ ] Extend `tests/validation/booking-schemas.test.ts` — party-size coercion, integer bounds, malformed input, optional browse behavior, and display-label length.
- [ ] Rewrite `tests/search/search-results-states.test.tsx` — shared chips in populated and empty states, with legacy relaxation controls absent.
- [ ] Replace or retire `e2e/zero-result-relax.spec.ts`; update old selectors and query fixtures found in the research census.
- [ ] Add visual baselines for the idle pill, each progressive step, populated results, calm empty results, and 375px layout; retire obsolete relaxation baselines.
- [ ] Restore Docker daemon access before DB-backed tests; no new test framework installation is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Transition rhythm and perceived continuity across the three questions | D-01–D-03 | Motion quality and visual calm require human judgment beyond reduced-motion and screenshot assertions | Complete the desktop and 375px flows with normal motion, use Back and Edit at each stage, and confirm the controls transition without layout jumps or disorienting focus movement. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for focused checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
