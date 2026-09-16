---
quick_id: 260916-fgc
phase: quick-260916-fgc
plan: 01
status: complete
completed: 2026-09-16
commits:
  - a18a8df
---

# Quick 260916-fgc: Navigation-menu logout summary

The shared navigation menu now ends the current browser's Better Auth session, then routes to `/login` only after the client reports success.

## Delivered

- Added a destructive, accessible `Sign out` menu item after profile and context controls.
- Used the existing `authClient.signOut` browser client; no server auth instance, session-list API, route guard, or cross-device-session behavior changed.
- Kept the menu open while the request is pending, disabled duplicate selections, and retained the generic in-menu alert after a failed request.
- Added a browser case that signs up a booker, signs out through the menu, checks `/api/auth/get-session` is null, and verifies `/profile` redirects to `/login`.

## Verification

- `npm run lint` — blocked by the local PowerShell npm shim, which cannot locate `npm-cli.js`.
- `npm.cmd run lint` — passed.
- `npx.cmd tsc --noEmit` — passed.
- `npm.cmd run test:e2e -- e2e/mode-switch.spec.ts --project=chromium` — blocked before execution because the project deliberately refuses to reuse the already-running server on `http://localhost:3000`. The shared server was left untouched.

## Notes

The visual standards review remains in scope for quick item `260916-fgd`.
