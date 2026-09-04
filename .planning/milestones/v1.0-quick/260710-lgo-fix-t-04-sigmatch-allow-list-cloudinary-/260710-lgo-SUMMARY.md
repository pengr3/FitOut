---
phase: 260710-lgo
plan: 01
type: quick
subsystem: listings / host-onboarding — Cloudinary signed upload
tags: [security, cloudinary, T-04-SIGMATCH, allow-list, tampering]
requires:
  - src/app/api/cloudinary/sign/route.ts (POST sign endpoint, path 5a)
  - src/lib/cloudinary.ts (signUploadParams — generic signer, unchanged)
provides:
  - Path-5a fixed key allow-list guard (ALLOWED_SIGN_KEYS) — 400 before signing on any extra key
  - Path-5a test coverage (tampering 400, clean 200, folder-scope 403)
affects:
  - Phase 02 security posture — closes T-04-SIGMATCH
tech-stack:
  added: []
  patterns:
    - "Trust boundary owns the allow-list: the route (not the signer lib) enforces which upload params may be signed — single source of truth adjacent to the folder-scope 403."
key-files:
  created: []
  modified:
    - src/app/api/cloudinary/sign/route.ts
    - tests/listing/cloudinary-sign.test.ts
decisions:
  - "Enforcement point is the ROUTE, not signUploadParams. The route is the trust boundary that receives the untrusted body, already owns the folder-scope 403 and HTTP 400 semantics; signUploadParams stays a generic signer so two allow-lists can't drift."
metrics:
  duration: ~6 min
  tasks: 2
  files: 2
  completed: 2026-07-10
---

# Phase 260710-lgo: Fix T-04-SIGMATCH — allow-list Cloudinary sign params Summary

Closed the Cloudinary sign-endpoint tampering gap by enforcing a fixed `{ folder, source, timestamp }` key allow-list on `paramsToSign` at the route trust boundary, so path 5a can never mint a signature for an injected Cloudinary upload key.

## What Changed

**The gap:** `POST /api/cloudinary/sign` path 5a (the live `<CldUploadWidget>` flow) signed the ENTIRE client-supplied `paramsToSign` object, validating only `folder`. Any authenticated host could inject arbitrary Cloudinary upload keys (`public_id`, `notification_url`, `eager`, `overwrite`, `tags`, `context`, `moderation`, …) and receive a valid signature — and this real production path had zero param-tampering test coverage.

**The fix (single enforcement point — the route):**
- Added module-scope `const ALLOWED_SIGN_KEYS = new Set(["folder", "source", "timestamp"])`.
- In path 5a, before the folder-scope 403 and before `signUploadParams`, reject any body carrying a key outside the allow-list with **HTTP 400** — `signUploadParams` is never reached.
- Existing folder-scope 403 + session (401) / ownership (403) / rate-limit (429) gates unchanged; path 5b (`{ listingId }` JSON body) untouched.
- Updated the SIGNED-PARAM MATCH bullet in the route header doc comment.
- `src/lib/cloudinary.ts` deliberately left unchanged — `signUploadParams` stays a generic signer (its JSDoc already states callers MUST validate/scope before calling), avoiding two allow-lists that could drift out of sync.

## Tests Added (path 5a — `tests/listing/cloudinary-sign.test.ts`)

New `signParamsRequest(listingId, paramsToSign)` helper (listingId in the `?listingId=` query, body = `{ paramsToSign }`), plus three tests:
- **(a)** Unexpected key (`public_id`, and `notification_url`) → **400**, `signSpy` NOT called, body does not contain `mock-signature`. (This is the RED that proved the vulnerability against the unpatched route.)
- **(b)** Clean `{ folder, source, timestamp }` for the owned listing → **200**, `signature === "mock-signature"`, signed keys are exactly `["folder", "source", "timestamp"]` scoped to the listing folder.
- **(c)** Only allow-listed keys but a mismatched folder → **403**, `signSpy` NOT called (allow-list runs first but does not swallow the folder-scope 403).

The existing path-5b tests and the `beforeAll`/`afterAll` mock wiring were not modified.

## TDD Gate Compliance

- **RED:** `test(260710-lgo): …` commit `3165eea` — test (a) failed (200 vs expected 400) against the unpatched route, proving the tampering gap; (b), (c), and all path-5b tests passed.
- **GREEN:** `fix(260710-lgo): …` commit `d1fb76b` — full `cloudinary-sign.test.ts` green (9/9).
- REFACTOR: none needed.

## Verification

- `npx vitest run tests/listing/cloudinary-sign.test.ts` → **9 passed (9)**.
- `npx tsc --noEmit` → **clean (exit 0)**.
- Grep sanity: `ALLOWED_SIGN_KEYS` defined (route.ts:35) and referenced in path 5a before `signUploadParams` (route.ts:95).
- No change to `src/lib/cloudinary.ts` (single enforcement point at the route, by design).

## Deviations from Plan

None — plan executed exactly as written (Task 1 RED, Task 2 GREEN).

## Follow-up

Re-run the security auditor for Phase 02 so **T-04-SIGMATCH** can be flipped to `closed` and Phase 02 security moved to `threats_open: 0` in `.planning/phases/02-listings-host-onboarding/02-SECURITY.md`. The declared mitigation ("signed param set == client param set `{folder, source, timestamp}`; no extra params either side") is now enforced and proven by the path-5a tests.

## Commits

- `3165eea` — test(260710-lgo): add failing path-5a test for paramsToSign key allow-list (T-04-SIGMATCH RED)
- `d1fb76b` — fix(260710-lgo): allow-list paramsToSign keys before signing (T-04-SIGMATCH GREEN)

## Self-Check: PASSED

- FOUND: src/app/api/cloudinary/sign/route.ts (ALLOWED_SIGN_KEYS at line 35, used at line 95)
- FOUND: tests/listing/cloudinary-sign.test.ts (signParamsRequest helper + 3 path-5a tests)
- FOUND: commit 3165eea (RED)
- FOUND: commit d1fb76b (GREEN)
