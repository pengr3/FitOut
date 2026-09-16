---
phase: quick-260916-kfp
plan: "01"
subsystem: ui
tags: [nextjs, react, navigation, mobile, accessibility, playwright]
requires: []
provides:
  - "A single direct opposite-context action in the navigation menu."
  - "375px keyboard and viewport-bound coverage for the menu."
requirements-completed: [QUICK-260916-KFP]
status: complete
---

# Quick 260916-kfp: Direct Mobile Context Switch

The navigation menu no longer opens a cascading `Switch context` submenu. It now shows the one meaningful destination directly: booking context shows the existing hosting activation/action, while hosting context shows the existing booking action.

## Changes

- Removed the submenu components and retained each existing activation, navigation, pending, and error path.
- Preserved capability-aware labels: a capability already held reads `Switch to …`; an activation-required destination reads `Start …`.
- Updated mode-switch flows to choose their direct menu item.
- Changed the compact keyboard check to 375px, verifies the obsolete submenu item is absent, and checks the menu stays within the viewport.

## Verification

- Passed: `npm exec eslint -- "src/components/nav-icon-menu.tsx" "e2e/mode-switch.spec.ts"`
- Blocked without intervention: `npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium` could not start because port 3000 was already occupied and this project deliberately sets `reuseExistingServer: false`.

## Commit

- `730756c` — `feat(quick-260916-kfp): simplify mobile context switch`