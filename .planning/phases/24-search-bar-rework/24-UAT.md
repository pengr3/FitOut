---
status: complete
phase: 24-search-bar-rework
source: [24-VERIFICATION.md]
started: 2026-09-15T09:52:05Z
updated: 2026-09-16T10:33:41+08:00
---

## Current Test

[testing complete]

## Tests

### 1. Corrected desktop pill centering
expected: At 1280px, inspect the idle pill, open the journey, then Cancel to / and inspect it again. The 48rem pill is centered before and after Cancel, the Popover stays anchored, and results do not shift.
result: pass

### 2. Retained mobile presentation
expected: At 375px, open the pill and complete activity → location → party, including Back and Cancel. One full-screen sheet appears, no desktop Popover appears, and the lower actions remain reachable and non-overlapping.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-24-2
  truth: "At 1280px and 375px, use the idle pill and a result-chip edit; complete solo/group flows, Back, and Cancel under normal and reduced motion. The 48rem desktop hierarchy feels balanced, the party step is not sparse, and motion/continuity feel calm with no page push or duplicate tree."
  status: resolved
  resolved_by: 24-18-PLAN.md
  resolved_at: 2026-09-15
  reason: "User reported: 1280px - search-pill is not centered. on the page it is aligned left, kindly align it center. 375px - no issues pass"
  severity: major
  test: 2
  root_cause: "The idle trigger uses the shared Button base recipe, which is inline-flex. At desktop, sm:mx-auto emits correctly but its auto horizontal margins compute to 0px on the inline-level element, leaving the 48rem pill at the public content edge."
  artifacts:
    - path: "src/components/search/search-experience.tsx"
      issue: "Applies sm:mx-auto sm:max-w-3xl to the idle pill without a block/flex-level display context."
    - path: "src/components/ui/button.tsx"
      issue: "Shared Button base recipe applies inline-flex."
    - path: "e2e/progressive-search.spec.ts"
      issue: "The desktop geometry test omits the pill x-coordinate centering assertion."
  missing:
    - "Make the desktop idle pill block-level or center it through a wrapping layout."
    - "Add a rendered 1280px x-coordinate centering regression assertion."
  debug_session: ".planning/debug/g-24-2-desktop-pill-centering.md"
