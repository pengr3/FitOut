---
quick_id: 260914-f5o
status: complete
commit: 95363f5
---

## Completed

- Removed the `FitOut Ops` destination from the shared public footer and its now-unused ops-origin import.
- Updated the affected cross-host browser check to assert the footer link is absent while retaining direct ops-login cookie-isolation coverage.

## Verification

- `git diff --check` passed.
- Confirmed the footer no longer references `absoluteOpsUrl` or `FitOut Ops`.
- Automated formatting, type, and Playwright checks were not run: invoking pnpm against this npm-managed installation attempted unavailable registry access after relocating package-manager metadata. No tracked project files were changed by that attempt.
