---
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
plan: 08
subsystem: host-verification-roadmap-ui
tags: [nextjs, react, tailwind, playwright, responsive-design, tdd]
requires:
  - phase: 21-05
    provides: PanelCard roadmap presentation and the court/grove responsive state matrix
  - phase: 21-07
    provides: bounded payout recovery and retry behavior inside the roadmap
provides:
  - Intrinsic-height roadmap content beneath the separately rendered PanelCard title
  - Numeric vertical-containment evidence for every roadmap body, CTA, and compact receipt
  - Court/grove coverage at 320px and 1280px across every existing roadmap and receipt state
affects: [phase-21-verification, host-dashboard, verification-roadmap, browser-evidence]
actuals:
  tokens: 2858
  tasks: 2
  commits: 3
plan_head_before: b2edd4da4a5f36916535087936f8aec6a1efac0f
tech-stack:
  added: []
  patterns:
    - Scoped Playwright geometry checks compare body and action rectangles with their owning clipped PanelCard
    - Context-rich failures identify theme, snapshot, width, panel, descendant kind, and numeric bounds
key-files:
  created:
    - .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-08-TASK-1-RED-EVIDENCE.json
    - .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-08-TASK-2-RED-EVIDENCE.json
  modified:
    - src/components/host/verification-roadmap.tsx
    - e2e/host-dashboard.spec.ts
key-decisions:
  - "Removed only the inner roadmap stack's redundant h-full; the outer list-item and PanelCard stretch chain remains the equal-height authority."
  - "Vertical acceptance measures both descendant rectangles and scrollHeight/clientHeight because overflow-hidden can make clipped content appear absent rather than overflowing."
  - "The reusable geometry helper stays scoped to the roadmap or receipt section so unrelated dashboard PanelCards cannot dilute or confuse a failure."
patterns-established:
  - "Clipped-card containment: assert numeric descendant bounds and internal scroll extent, not visibility alone."
requirements-completed: [HVER-09, HVER-10, HVER-14]
coverage:
  - id: D1
    description: "Every roadmap body and advancing action stays vertically inside its owning PanelCard while the responsive equal-height stretch chain remains intact."
    requirement: HVER-10
    verification:
      - kind: e2e
        ref: "e2e/host-dashboard.spec.ts#court/grove roadmap and receipt state matrix"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ready and mixed-portfolio states still replace the four-card roadmap with one compact receipt whose body remains inside its PanelCard."
    requirement: HVER-09
    verification:
      - kind: e2e
        ref: "e2e/host-dashboard.spec.ts#ready and mixed-portfolio receipt loops"
        status: pass
    human_judgment: false
  - id: D3
    description: "The stale-pending Finish the check action remains reachable, 44px tall, keyboard-focusable, and vertically contained at both acceptance widths and themes."
    requirement: HVER-14
    verification:
      - kind: e2e
        ref: "e2e/host-dashboard.spec.ts#stale-pending roadmap snapshot"
        status: pass
    human_judgment: false
duration: 24min
completed: 2026-09-10
status: complete
---

# Phase 21 Plan 08: Roadmap Card Vertical Containment Summary

**The host verification roadmap now sizes intrinsically beneath each PanelCard title, with Chromium proving that every body, action, and ready receipt stays inside its clipped card across both themes and acceptance widths.**

## Performance

- **Duration:** 24 minutes
- **Started:** 2026-09-10T03:44:33Z
- **Completed:** 2026-09-10T04:08:47Z
- **Tasks:** 2
- **Files modified:** 4 implementation, browser-test, and RED-evidence files

## Accomplishments

- Removed only the inner roadmap stack's `h-full`, allowing the PanelCard title, gap, body, and CTA to contribute to intrinsic height together while preserving the outer equal-height grid stretch.
- Added numeric bounds and scroll-extent assertions for every roadmap body and action across zero-listing, waiting, stale-pending, rejected-long-reason, and grandfathered states.
- Extended the same scoped helper to ready and mixed-portfolio receipts, preserving D-05's roadmap/receipt exclusivity while directly proving receipt body containment.
- Kept all existing one-column/2×2, desktop peer-height, horizontal-overflow, 44px target, keyboard-focus, state-order, one-action, and owed-hook assertions intact.

## Task Commits

1. **Task 1 RED: failing roadmap containment regression** — `3677901` (test)
2. **Task 1 GREEN: intrinsic roadmap card height** — `2a75ad4` (feat)
3. **Task 2: mutation-validated full state/theme/width containment matrix** — `e8a00df` (test)

## Files Created/Modified

- `src/components/host/verification-roadmap.tsx` — Removes the redundant inner full-height claim without changing the outer stretch, wrapping, or CTA layout contract.
- `e2e/host-dashboard.spec.ts` — Measures every scoped PanelCard body/action rectangle and scroll extent with contextual diagnostics across roadmap and receipt states.
- `21-08-TASK-1-RED-EVIDENCE.json` — Records the shipped 320px court overrun before the production correction.
- `21-08-TASK-2-RED-EVIDENCE.json` — Records both theme tests failing when the diagnosed bad class was intentionally restored, then reverted.

## Decisions Made

- Kept the production correction to one utility removal; `PanelCard`, `Card`, the list item's `h-full`, its child stretch selector, `min-w-0`, `break-words`, `[overflow-wrap:anywhere]`, and `mt-auto` remain unchanged.
- Treated `scrollHeight > clientHeight + 1` as a failure independently of descendant rectangles, because the shared `overflow-hidden` can conceal the visual symptom.
- Scoped receipt measurements through the authoritative `Ready to take bookings` section rather than querying every dashboard card globally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used a manually managed Next.js server for a clean browser-gate exit**

- **Found during:** Task 1 and Task 2 browser verification
- **Issue:** The exact Playwright commands collected and completed their selected tests, but Playwright's Windows-managed Next.js descendants remained open after the result and prevented the command process from exiting.
- **Fix:** Terminated only the confirmed completed FitOut test trees, then reran the final two-test matrix against a manually managed local Next.js server with a temporary uncommitted Playwright config that disabled only `webServer` startup.
- **Files modified:** None retained
- **Verification:** The manual-server matrix exited 0 with both court and grove tests passing in 40.3 seconds.
- **Committed in:** No retained file change

---

**Total deviations:** 1 auto-fixed (1 blocking Windows test-runner lifecycle issue).
**Impact on plan:** No product, test assertion, shared configuration, or acceptance scope changed; the fallback supplied a clean exit for the same two browser tests.

## TDD Gate Compliance

| Task | RED evidence | RED commit | GREEN result | Status |
|------|--------------|------------|--------------|--------|
| 1 | `21-08-TASK-1-RED-EVIDENCE.json` — court zero-listing at 320px showed a 26px action/card and scroll-height overrun | `3677901` | `2a75ad4`; focused court matrix and 7/7 component tests passed | PASS |
| 2 | `21-08-TASK-2-RED-EVIDENCE.json` — intentionally restoring `h-full` failed both court and grove with numeric geometry | `e8a00df` | Bad-class mutation restored; final two-theme matrix passed 2/2 | PASS |

Both evidence records returned `RED_EVIDENCE_OK` before their corresponding GREEN acceptance runs. Task 2 is test-only because Task 1's production correction already supplied the behavior; the uncommitted bad-class mutation proved the expanded matrix fails in both themes.

## Verification

- Pre-fix focused court command — **1 test collected and failed intentionally** at `court · zero-listing · 320px`: the action bottom was 1200px against a 1174px card bottom, and each card had a 26px scroll-height overrun.
- Post-fix focused court command — **1/1 passed**, including both widths and all existing court roadmap/receipt states; the managed Next.js teardown then required process-tree cleanup.
- Exact shared-title full matrix — **2/2 tests reported passed** (`court`, `grove`), covering 320px/1280px; zero-listing, waiting, stale-pending, rejected-long-reason, grandfathered, ready, and mixed-portfolio; the same managed teardown issue followed.
- `npx.cmd playwright test ... --config=playwright.21-08-manual.config.ts ...` — **2 passed in 40.3s, exit 0** against a manually managed server; the temporary config was removed afterward.
- `npm.cmd test -- tests/host/verification-roadmap.test.tsx` — **7/7 passed**.
- `npm.cmd exec eslint -- src/components/host/verification-roadmap.tsx e2e/host-dashboard.spec.ts` — **passed with no findings**.
- Both TDD evidence records returned `RED_EVIDENCE_OK`.
- `git diff --check b2edd4da..HEAD` — **passed**.
- Scope inspection confirmed no change to `PanelCard`, `Card`, package manifests, lockfile, schema, migrations, routes, dashboard reads, roadmap state derivation, or action authority.

## Known Stubs

None. No placeholder data, empty UI source, skipped test, TODO, or FIXME was introduced.

## Issues Encountered

- The first RED-evidence validation rejected a prose-only output excerpt as zero-test discovery. The record was corrected to include the observed test count, failing title, pass count, and fail count; validation then returned `RED_EVIDENCE_OK` before GREEN work proceeded.
- Playwright's managed Windows server descendants did not terminate after completed assertions. The final manually managed run exited normally with the same two selected tests green.

## Authentication Gates

None.

## User Setup Required

None. No dependency, environment variable, schema, migration, route, or external-service configuration changed.

## Next Phase Readiness

- G-21-1 is closed with reproducible RED/GREEN geometry and a complete two-theme, two-width browser matrix.
- All eight Phase 21 plans now have complete summaries; the phase is ready for re-verification.

## Self-Check: PASSED

- Both modified source/test files and both RED-evidence files exist.
- Task commits `3677901`, `2a75ad4`, and `e8a00df` exist in history after plan base `b2edd4da4a5f36916535087936f8aec6a1efac0f`.
- The measured plan ledger reports three task commits before summary creation.
- No deletion, dependency, schema, route, shared-primitive, or authority-surface drift was found.

---
*Phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit*
*Completed: 2026-09-10*
