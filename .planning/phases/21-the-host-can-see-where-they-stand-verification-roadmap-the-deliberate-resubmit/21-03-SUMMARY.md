---
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
plan: 03
subsystem: listing-re-review
tags: [nextjs, react, postgres, drizzle, radix-ui, playwright, tdd]
requires:
  - phase: 21-02
    provides: owner-scoped current review state, host-readable rejection reason, and listing-card dialog patterns
  - phase: 18-host-listing-review
    provides: persisted listing review lifecycle and byte-frozen material-change mechanism
provides:
  - Tuple-backed seven-field material-change copy authority
  - Rejected-only no-mutation Fix and resubmit dialog with one forward edit route
  - Owner-scoped server-derived rejected context that persists through direct wizard entry and refresh
  - Component and browser proof for responsive, focus-safe, mutation-free deliberate resubmission
affects: [21-04, 21-05, host-listings, listing-review]
tech-stack:
  added: []
  patterns:
    - Total Record keyed by the canonical material-field tuple
    - Server-finished narrow rejection context passed into a persistent client notice
    - Controlled explanation dialog with safe initial focus and ordinary Next navigation
    - RED evidence committed before each GREEN implementation
key-files:
  created:
    - src/lib/listing/re-review-copy.ts
  modified:
    - src/components/listing/listing-card.tsx
    - src/app/(host)/host/listings/[id]/edit/page.tsx
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - tests/listing/material-edit.test.ts
    - tests/listing/listing-card.test.tsx
    - tests/listing/wizard-save-state.test.tsx
    - e2e/host-listing-grid.spec.ts
key-decisions:
  - "Only a published listing whose current review state is rejected replaces Edit; every other listing/review combination preserves the shipped Edit affordance."
  - "The edit page derives current rejection context inside its existing owner/deleted-scoped database read; URL input never authorizes the notice."
  - "Material-change labels have one total tuple-backed authority, and both surfaces map that tuple rather than owning a second field list."
requirements-completed: [LVER-06, LVER-08]
metrics:
  duration: 60m
  completed: 2026-09-09
status: complete
actuals:
  tokens: 9107
  tasks: 3
  commits: 6
plan_head_before: da2232c4dab8e7d2f2f225febc7b6b762959fb53
---

# Phase 21 Plan 03: Deliberate Rejected-Listing Resubmit Summary

**Rejected hosts now receive a tuple-complete, mutation-free explanation before editing and the same authoritative reason/rule throughout direct entry, refresh, and wizard navigation.**

## Performance

- **Duration:** 60 minutes
- **Started:** 2026-09-09T08:17:18Z
- **Completed:** 2026-09-09T09:17:03Z
- **Tasks:** 3
- **Files modified:** 11 implementation, test, browser, and RED-evidence files

## Accomplishments

- Added one total `Record<MaterialField, string>` for the exact seven UI labels and a tuple-derived material-change sentence, leaving `re-review.ts` byte-identical.
- Replaced Edit only for published/currently rejected cards with a controlled `Fix and resubmit` explanation that performs no fetch or mutation, focuses the safe action first, and exposes one ordinary forward link.
- Strengthened the edit page read with owner and non-deleted SQL predicates and a latest-rejected subquery joined into the same round trip, then passed only state and host-readable reason into the wizard.
- Kept the neutral rejection notice mounted across wizard sections and failure paths while omitting only an absent reason and accepting no query-string authority.
- Proved long title/reason/label wrapping, 16px dialog insets, internal scrolling, 28px wrapping controls, focus restoration, row immutability, direct entry, refresh, forged-query resistance, both themes, and 320px/1280px widths.

## Task Commits

Each behavior-adding task followed RED → GREEN and was committed atomically:

1. **Task 1: Replace rejected Edit with a no-mutation explanation dialog and tuple-backed forward route**
   - `1b2d0f8` — RED: rejected card still exposed the ordinary Edit anchor
   - `6f9c48d` — GREEN: tuple-backed copy authority and rejected-only explanation dialog
2. **Task 2: Derive persistent rejected context on the server and keep its notice through the wizard**
   - `433ff84` — RED: wizard ignored server rejection context and rendered no notice
   - `8951d23` — GREEN: owner-scoped server context and persistent neutral wizard notice
3. **Task 3: Prove the deliberate entry and persistent notice at both widths and themes**
   - `af6d19d` — RED: long persisted reason lacked the selectable-text contract
   - `812610b` — GREEN: selectable long reason, live-query correction, and responsive browser proof

## Files Created/Modified

- `src/lib/listing/re-review-copy.ts` — Total label record, tuple-derived rule composer, and narrow serializable rejection context.
- `src/components/listing/listing-card.tsx` — Rejected-only controlled dialog with semantic seven-item explanation, optional reason, safe dismissal, and sole forward edit link.
- `src/app/(host)/host/listings/[id]/edit/page.tsx` — Single owner/deleted-scoped query carrying the latest current rejection reason into the wizard.
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — Persistent neutral rejected-state notice with wrapping/selectable host text.
- `tests/listing/material-edit.test.ts` — Tuple/key equality, exact order, copy, and edit-page query contract coverage.
- `tests/listing/listing-card.test.tsx` — State matrix, no-fetch/no-mutation, focus, dismissal, optional-reason, and forward-link coverage.
- `tests/listing/wizard-save-state.test.tsx` — Direct-entry, forged-query, missing/long reason, section persistence, and save-refusal coverage.
- `e2e/host-listing-grid.spec.ts` — Real persisted rejection journey across court/grove and 320px/1280px browser layouts.
- `21-03-TASK-1-RED-EVIDENCE.json`, `21-03-TASK-2-RED-EVIDENCE.json`, `21-03-TASK-3-RED-EVIDENCE.json` — Validated intentional RED snapshots.

## Decisions Made

- Listing status and current review state are both required for the replacement affordance, preventing a stale rejected review from relabeling a draft or unlisted card.
- The latest rejected reason is joined as a typed Drizzle subquery in the existing edit-page read; this preserves one round trip and keeps authorization predicates in SQL.
- Stored reasons render once as ordinary selectable React text. No markup path, staff identifier, internal code, fallback reason, support clause, or appeal path exists.
- The dialog remains explanation-only: opening, Escape, overlay, close icon, and safe action cannot enqueue or mutate anything; `Continue to edit` is the only forward action.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restricted replacement to published rejected listings**
- **Found during:** Task 1 focused verification
- **Issue:** The first condition keyed only on review state, so a draft carrying stale rejected context could lose its ordinary Edit affordance.
- **Fix:** Required both `status === "published"` and `reviewState === "rejected"`; the full named state/status matrix is pinned by tests.
- **Files modified:** `src/components/listing/listing-card.tsx`, `tests/listing/listing-card.test.tsx`
- **Commit:** `6f9c48d`

**2. [Rule 1 - Bug] Kept Task 2 assertions compatible with the installed Vitest stack**
- **Found during:** Task 2 RED/GREEN verification
- **Issue:** Initial test assertions used jest-dom matchers that this repository does not install.
- **Fix:** Rewrote them with core Chai/DOM assertions without weakening behavior coverage.
- **Files modified:** `tests/listing/wizard-save-state.test.tsx`
- **Commit:** `8951d23`

**3. [Rule 1 - Bug] Replaced a null live projection with a typed joined subquery**
- **Found during:** Task 3 live-browser verification
- **Issue:** The initial raw correlated projection returned a null reason in the live route despite the current rejected row.
- **Fix:** Joined a deterministic latest-rejected Drizzle subquery into the same owner-scoped read and retained the single-round-trip contract.
- **Files modified:** `src/app/(host)/host/listings/[id]/edit/page.tsx`
- **Commit:** `812610b`

**4. [Rule 3 - Blocking] Raised the browser fixture hook's first-compile budget**
- **Found during:** Task 3 browser verification
- **Issue:** Fully parallel workers each performed first compilation under Playwright's default 30-second hook timeout.
- **Fix:** Applied the suite's existing 240-second budget to `beforeAll` itself.
- **Files modified:** `e2e/host-listing-grid.spec.ts`
- **Commit:** `812610b`

**5. [Rule 3 - Blocking] Used the installed Playwright executable**
- **Found during:** Task 3 browser verification
- **Issue:** This machine's `npx` launcher points to a missing `npx-cli.js`.
- **Fix:** Ran the same checked-in Playwright binary through `npm.cmd exec playwright -- test ...`; no package was installed or substituted.
- **Files modified:** None

**6. [Rule 3 - Blocking] Removed stale generated Next development route types**
- **Found during:** Overall production build
- **Issue:** `.next/dev/types/validator.ts` retained encoded development routes that conflicted with the clean production route union.
- **Fix:** Removed only `.next/dev` and reran the required build successfully; no tracked source file was removed.
- **Files modified:** None (generated output only)

## TDD Gate Compliance

| Task | RED evidence | RED commit | GREEN commit | Result |
|------|--------------|------------|--------------|--------|
| 1 | `21-03-TASK-1-RED-EVIDENCE.json` — rejected card retained ordinary Edit | `1b2d0f8` | `6f9c48d` | PASS |
| 2 | `21-03-TASK-2-RED-EVIDENCE.json` — authoritative notice absent | `433ff84` | `8951d23` | PASS |
| 3 | `21-03-TASK-3-RED-EVIDENCE.json` — persisted reason not selectable | `af6d19d` | `812610b` | PASS |

All three evidence files returned `RED_EVIDENCE_OK` from `gsd-tools check tdd-red-evidence` before their production edits.

## Verification

- `npm.cmd test -- tests/listing/material-edit.test.ts tests/listing/listing-card.test.tsx tests/listing/wizard-save-state.test.tsx` — **85 passed**.
- `npm.cmd run test:design` — **1,464 passed, 3 skipped** across 83 files; exit 0.
- `npm.cmd exec playwright -- test e2e/host-listing-grid.spec.ts --project=chromium --reporter=list` — all **5 browser scenarios** reported successful assertion results across the established grid proof and the new four-viewport rejected-entry journey; the Windows process required interruption after results because its spawned dev-server descendants remained open.
- `OPS_APP_URL=http://ops.localhost:3000 npm.cmd exec next build` — **passed** after generated-dev cleanup, including production compilation, TypeScript validation, page-data collection, and 35 static pages.
- `git diff --exit-code da2232c4 -- src/lib/listing/re-review.ts` — **passed**; the byte-frozen mechanism file is unchanged.
- Added-line scans found no placeholder/TODO/FIXME stub, new live region, support/contact clause, standalone submission, appeal/dispute/contest wording, or softened sell-state path.

## Deferred Issues

- The plan's literal `npm.cmd run typecheck` command cannot run because `package.json` has no `typecheck` script. The clean Next production build completed its TypeScript phase successfully. Direct `tsc --noEmit` continues to report only pre-existing test-harness diagnostics in three out-of-scope files; details are in `deferred-items.md` and `.planning/WINDOWS.md`.
- Playwright's Windows-managed Next descendants do not exit after reporting the five assertion results. Targeted and full-file runs prove the new journey, and the four pre-existing scenarios passed in the preceding full run; the runner-lifecycle issue is recorded in `deferred-items.md` and `.planning/WINDOWS.md`.

## Known Stubs

None. No placeholder data, empty UI source, skipped test, TODO, or FIXME was introduced.

## Issues Encountered

- Google Font access is blocked in the default sandbox. The authorized rerun fetched the existing Geist assets and completed the production build; no font or dependency configuration changed.
- Playwright's dev server emitted the same offline-font fallback warnings during browser runs; they did not affect layout or assertions.

## User Setup Required

None. No dependency, schema, migration, environment variable, external-service credential, or deployment setting changed.

## Next Phase Readiness

- LVER-06 and LVER-08 are implemented with explicit flagged-assumption coverage for the rejected-only replacement, exact tuple equality/order, explanation-before-navigation, and first-press immutability boundaries.
- Later phase closure can reuse the server-finished context and total material-copy authority without adding an unchanged-listing submit, appeal, or support surface.

## Self-Check: PASSED

All twelve claimed implementation/test/evidence/summary files and all six task commit hashes were found on disk/history. Documentation diffs also pass `git diff --check`.

---
*Phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit*
*Completed: 2026-09-09*
