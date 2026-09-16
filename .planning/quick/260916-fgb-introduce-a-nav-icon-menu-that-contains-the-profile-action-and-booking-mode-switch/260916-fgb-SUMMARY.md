---
quick_id: 260916-fgb
slug: introduce-a-nav-icon-menu-that-contains-the-profile-action-and-booking-mode-switch
status: complete
completed: 2026-09-16
commits:
  - ac1d373
  - 6164867
---

# Quick 260916-fgb Summary

Replaced the separate signed-in profile link and booking/hosting switch with one reusable accessible navigation menu.

## Delivered

- Added `NavIconMenu`, an icon-only `Navigation menu` trigger with an in-app `/profile` link and Radix context submenu.
- Preserved capability activation, pending protection, failure alerts, client navigation, and server-side host route gating.
- Wired the shared menu into host, public-booking, and authenticated-booker header compositions.
- Removed the obsolete standalone `ModeSwitch` and `ProfileLink` export.
- Extended the focused Playwright coverage for host-to-booking and booker-to-hosting flows; the direct `/host` rejection test remains unchanged.

## Verification

- Passed: `node node_modules/eslint/bin/eslint.js src/components/nav-icon-menu.tsx src/components/site/public-header.tsx 'src/app/(app)/layout.tsx' e2e/mode-switch.spec.ts`
- Passed: `node node_modules/typescript/bin/tsc --noEmit`
- Not run: `npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium` could not invoke npm because its configured CLI module is missing.
- Not run: repository-local Playwright CLI correctly refused to start because port 3000 is occupied by PID 12892; the suite deliberately disallows reusing an existing server, so that process was left untouched.

## Follow-ups

Logout remains owned by `260916-fgc`; the broader navigation-menu visual standards audit remains owned by `260916-fgd`.
