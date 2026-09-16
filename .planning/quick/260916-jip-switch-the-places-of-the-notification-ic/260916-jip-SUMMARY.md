---
phase: quick-260916-jip
plan: "01"
subsystem: ui
tags: [nextjs, react, site-header, accessibility, playwright]
requires: []
provides:
  - "Notification controls precede rightmost navigation-menu triggers in all signed-in headers."
  - "Focused browser coverage describes rendered and compact keyboard order."
affects: [site-chrome, navigation-menu, notifications]
actuals:
  tokens: 1532
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - "Header action ordering is verified through accessible controls and bounding boxes."
key-files:
  created: []
  modified:
    - src/components/site/public-header.tsx
    - src/app/(app)/layout.tsx
    - src/app/(host)/host/layout.tsx
    - e2e/mode-switch.spec.ts
key-decisions:
  - "Retained every existing session, capability, Suspense, and component boundary; only sibling order changed."
requirements-completed: [QUICK-260916-JIP]
coverage:
  - id: D1
    description: "Signed-in public, booker, and host headers place notifications before the rightmost navigation menu."
    requirement: QUICK-260916-JIP
    verification:
      - kind: other
        ref: "npm exec eslint -- scoped source and e2e files"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium"
        status: unknown
    human_judgment: true
    rationale: "The required Playwright run could not start because port 3000 was already occupied and this project deliberately forbids server reuse."
duration: 4min
completed: 2026-09-16
status: complete
---

# Quick 260916-jip: Header Notification/Menu Order Summary

**All signed-in headers now render notifications immediately before the rightmost navigation-menu trigger, with focused browser coverage for visual and compact keyboard order.**

## Accomplishments

- Reordered the public signed-in action fragment without altering session reads, capabilities, or the async boundary.
- Reordered the authenticated-booker and host action fragments while retaining their bell fallbacks, guards, surface props, host nav, and footer.
- Added a reusable `site-header` assertion that uses accessible controls and rendered horizontal positions; it is exercised on public, `/profile`, and `/host` flows.
- Updated compact keyboard coverage to require wordmark -> notifications -> navigation menu, while preserving existing menu focus and keyboard-flow assertions.

## Task Commits

1. **Task 1: Prove and correct the signed-in public-header control order** — `3f7d7f3` (`feat`)
2. **Task 2: Apply the same order to authenticated-booker and host headers** — `8dfd769` (`feat`)

## Files Modified

- `src/components/site/public-header.tsx` — notification sibling precedes the existing menu trigger.
- `src/app/(app)/layout.tsx` — booker notification `Suspense` sibling precedes the existing menu trigger.
- `src/app/(host)/host/layout.tsx` — host notification `Suspense` sibling precedes the existing menu trigger.
- `e2e/mode-switch.spec.ts` — rendered-order helper plus public, booker, host, and compact-keyboard coverage.

## Verification

- Passed: `npm exec eslint -- "src/components/site/public-header.tsx" "e2e/mode-switch.spec.ts"`
