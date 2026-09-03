---
quick_id: 260724-lmy
slug: close-phase-7-build-guard-and-lint-hygie
type: quick
gap_closure: true
status: complete
completed: 2026-07-24
subsystem: build-tooling / payments-plumbing / listing-wizard
tags: [next-build, next-phase, fail-closed-guard, eslint, react-hooks, debounce]
key-files:
  modified:
    - src/lib/paymongo.ts
    - src/app/api/inngest/route.ts
    - eslint.config.mjs
    - src/components/listing/address-autocomplete.tsx
commits:
  - 4a97771 fix(260724-lmy): exempt production build phase from fail-closed env guards
  - 463d131 chore(260724-lmy): ignore stale worktrees and nested .next in eslint
  - 98b49ab fix(260724-lmy): resolve react-hooks/set-state-in-effect in address autocomplete
---

# Quick 260724-lmy: Close Phase-7 build-guard + lint hygiene debt

Plain `npm run build` now passes with no env workaround (the two fail-closed money/security guards are exempted for the `phase-production-build` phase only, so they still fire on a real production boot), bare `npm run lint` is scoped to real source, and the one real `react-hooks/set-state-in-effect` error in the Phase-4 address autocomplete is fixed — all with the full vitest suite still green.

## What was done

### Task 1 — exempt the production BUILD phase from the two fail-closed guards (`4a97771`)
Added `process.env.NEXT_PHASE !== "phase-production-build"` to BOTH guard conditions:
- `src/lib/paymongo.ts:39-47` — the `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` platform-wallet guard.
- `src/app/api/inngest/route.ts:26` — the `INNGEST_SIGNING_KEY` serve-endpoint guard.

Each now reads `NODE_ENV === "production" && NEXT_PHASE !== "phase-production-build" && (<missing secret>)`. Throw messages unchanged. `NEXT_PHASE` is `"phase-production-build"` ONLY during `next build`'s data-collection pass, never at runtime serving (unset or `"phase-production-server"`), so the guards remain fail-closed on a real production boot — only the build's collection pass is exempted. This finally implements what `paymongo.ts`'s own comment already claimed ("Dev/test/build tolerate placeholders so … `next build` still pass").

Grep confirmation:
```
src/lib/paymongo.ts:41:  process.env.NEXT_PHASE !== "phase-production-build" &&
src/app/api/inngest/route.ts:30:  process.env.NEXT_PHASE !== "phase-production-build" &&
```

### Task 2 — make bare `npm run lint` usable (`463d131`)
Added `".claude/worktrees/**"` and `"**/.next/**"` to the `globalIgnores([...])` list in `eslint.config.mjs`. The default `.next/**` matches only the ROOT `.next`; a stale git worktree's nested `.claude/worktrees/<name>/.next` full of generated Turbopack JS was flooding lint with thousands of errors. Lint now scans project source + tests + e2e only.

### Task 3 — fix the one real `react-hooks` error in the address autocomplete (`98b49ab`)
Exact rule id + message from `npx eslint`:
```
react-hooks/set-state-in-effect
Error: Calling setState synchronously within an effect can trigger cascading renders
```
The debounce `useEffect` cleared results + stopped the spinner synchronously for a `<3`-char query, and also started `setLoading(true)`/`setError(null)` synchronously for a `>=3`-char query — the rule surfaces these one at a time, so removing the short-query clear exposed the loading-start next. Real restructure (no blanket disable):
- Derive the short-query empty/idle state at render — `isQueryTooShort`, `visibleResults = isQueryTooShort ? [] : results`, `showLoading = !isQueryTooShort && loading` — instead of pushing it into state inside the effect.
- Moved loading/error initialization into a `handleQueryChange` input event handler (setState in event handlers is allowed), wired via `CommandInput onValueChange={handleQueryChange}`.
- The effect body now performs zero synchronous setState; every remaining transition lives inside the async 250ms debounce callback.

Behavior preserved: the 250ms debounce, the AbortController abort-on-change, the immediate spinner on a `>=3`-char query, and a short query still shows no suggestions and no spinner. No dedicated unit test targets this component; the full suite stayed green.

## Verification

### Plain `npm run build` (NO env prefixes, `.env.local` lacks all three secrets) → exit 0
```
✓ Compiled successfully in 14.9s
  Running TypeScript ...
  Finished TypeScript in 17.1s ...
✓ Generating static pages using 7 workers (21/21) in 1160ms

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/[...all]
├ ƒ /api/cloudinary/sign
├ ƒ /api/inngest
├ ƒ /api/paymongo/webhook
├ ƒ /bookings
├ ƒ /bookings/[id]
├ ƒ /bookings/[id]/cancel
├ ○ /forgot-password
├ ƒ /host
├ ƒ /host/bookings
├ ƒ /host/bookings/[id]
├ ƒ /host/earnings
├ ƒ /host/listings
├ ƒ /host/listings/[id]/availability
├ ƒ /host/listings/[id]/edit
├ ƒ /host/listings/new
├ ƒ /host/payouts/refresh
├ ƒ /host/payouts/return
├ ƒ /host/requests
├ ƒ /listings/[id]
├ ƒ /listings/[id]/book
├ ○ /login
├ ƒ /profile
├ ○ /reset-password
└ ○ /signup

ƒ Proxy (Middleware)
```
`/api/inngest` and `/api/paymongo/webhook` — the two routes that previously tripped the guards — are present, and the build exits 0. Previously this required `PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npm run build`.

### `npm run lint` → exit 0, 0 errors
```
✖ 7 problems (0 errors, 7 warnings)
```
0 errors. The 7 warnings are all pre-existing and in files this task did not touch: `react-hooks/incompatible-library` on React Hook Form's `watch()` in `host/listings/[id]/edit/wizard.tsx` (lines 56, 242), and 5 `_`-prefixed unused-arg warnings in `tests/helpers/mocks.ts`. The worktree/`.next` generated-JS flood is gone. `src/components/listing/address-autocomplete.tsx` lints at exit 0 with 0 problems.

### `npx vitest run` → full suite green, exit 0
```
Test Files  83 passed (83)
     Tests  693 passed (693)
```

### Exact react-hooks rule fixed
`react-hooks/set-state-in-effect` ("Calling setState synchronously within an effect can trigger cascading renders").

## Deviations from Plan

None — the plan executed exactly as written. Task 3's plan noted the short-query synchronous clear as the trigger; once that was derived at render, the same rule flagged the fetch-path `setLoading(true)`/`setError(null)`, so the fix went one step further (moving loading/error init into the input event handler) to leave the effect body fully free of synchronous setState. This is the plan's preferred "real fix / restructure" path, not a deviation — no `eslint-disable` was used.

## Notes for the next agent

- **Runtime fail-closed behavior is preserved, not weakened.** The guards still throw when `NODE_ENV === "production"` and `NEXT_PHASE` is unset (real boot) or `"phase-production-server"`. Only the `phase-production-build` collection pass is exempted. Do not drop the `NODE_ENV === "production"` clause.
- The Phase-7 `deferred-items.md` entries for the "`npm run build` env-placeholder" issue (observed 4+ times) and the "pre-existing lint findings" (worktree/`.next` flood + `address-autocomplete:110`) are now fully addressed by these three commits. `deferred-items.md` itself was intentionally left untouched (out of this task's file scope).

## Self-Check: PASSED
- src/lib/paymongo.ts — FOUND (NEXT_PHASE clause at line 41)
- src/app/api/inngest/route.ts — FOUND (NEXT_PHASE clause at line 30)
- eslint.config.mjs — FOUND (worktree + nested .next ignores)
- src/components/listing/address-autocomplete.tsx — FOUND (react-hooks fix, lints at exit 0)
- commit 4a97771 — FOUND
- commit 463d131 — FOUND
- commit 98b49ab — FOUND
