---
status: diagnosed
phase: 24-search-bar-rework
source: [24-VERIFICATION.md]
started: 2026-09-15T06:44:56Z
updated: 2026-09-15T07:28:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Visual continuity and motion
expected: The desktop Popover is attached and unclipped, the mobile sheet is flush to the viewport, and normal/reduced-motion interactions remain calm with no page push, duplicate tree, or disorienting focus movement.
result: issue
reported: "On desktop, the open search panel occupies only about one third of the screen; the search bar feels overly wide; and Step 3 of 3 has too much empty space for its content. At 375px, Cancel and the close button overlap; move Back and Cancel actions to the lower screen area."
severity: cosmetic

## Summary

total: 1
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-24-1
  truth: "The desktop Popover is attached and unclipped, the mobile sheet is flush to the viewport, and normal/reduced-motion interactions remain calm with no page push, duplicate tree, or disorienting focus movement."
  status: failed
  reason: "User reported: On desktop, the open search panel occupies only about one third of the screen; the search bar feels overly wide; and Step 3 of 3 has too much empty space for its content. At 375px, Cancel and the close button overlap; move Back and Cancel actions to the lower screen area."
  severity: cosmetic
  test: 1
  root_cause: "The active desktop Popover is fixed at 30rem while the idle pill expands to the full page container; the short party-size step inherits the broadly padded shell. On mobile, the Dialog default top-right close control competes with the coordinator's top-right Cancel control because there is no dedicated mobile action footer."
  artifacts:
    - path: "src/components/search/progressive-search-overlay.tsx"
      issue: "Fixed desktop Popover width and retained Dialog close control do not establish an intentional responsive size/action hierarchy."
    - path: "src/components/search/search-experience.tsx"
      issue: "The idle pill is full width and Back/Cancel are rendered in the top action row for every viewport."
    - path: "src/components/search/party-step.tsx"
      issue: "Short final-step content inherits the broad shared container chrome without a compact presentation."
    - path: "src/components/ui/dialog.tsx"
      issue: "Dialog supplies a default absolute top-right Close control that duplicates mobile cancellation."
  missing:
    - "Define a deliberate desktop width relationship between the idle pill and its anchored Popover."
    - "Make the short party-size step visually compact without weakening focus, motion, or accessibility contracts."
    - "Use one non-overlapping mobile exit path and a lower-screen Back/Cancel action region."
  debug_session: ".planning/debug/phase24-search-visual-ux.md"
