---
phase: 02-listings-host-onboarding
plan: 02
subsystem: ui-foundation-and-security
tags: [shadcn, tailwind-v4, design-tokens, dnd-kit, next-cloudinary, rate-limit, audit, wr-06, security, tdd, paymongo]

# Dependency graph
requires:
  - phase: 01-auth-accounts
    provides: "capability-activate server actions (activateHosting/activateBooking) + input:false escalation guard + CapabilityResult; Better-Auth rateLimit 5/60s convention (src/lib/auth.ts) mirrored here"
  - phase: 02-listings-host-onboarding (Plan 01)
    provides: "listing data model + host_payout.payoutsEnabled gate flag + deriveBookable (the canHost/payout flow WR-06 protects before Plan 06 wires it)"
provides:
  - "FitOut Coral (--brand/--brand-foreground) + semantic --success tokens in :root + .dark + @theme inline (Tailwind exposes bg-brand/text-brand-foreground/bg-success)"
  - "15 official-registry shadcn components (select, command, popover, checkbox, switch, radio-group, badge, tabs, sonner, skeleton, alert, progress, separator, tooltip, aspect-ratio) + input-group (command dep)"
  - "Phase-2 runtime deps: next-cloudinary + @dnd-kit/core|sortable|utilities (photos/reorder in Plan 04)"
  - "reusable per-identity fixed-window limiter src/lib/rate-limit.ts (rateLimit + requireWithinRateLimit)"
  - "append-only audit sink src/lib/audit.ts (recordAudit; structured [audit] log line)"
  - "WR-06 CLOSED: activateHosting/activateBooking are rate-limited (5/60s per user id) + audited on allow/deny"
  - "PAYMONGO_SECRET_KEY/PUBLIC_KEY/WEBHOOK_SECRET documented (server-only) in .env.example (D-20; no Stripe, no country env)"
affects: [03-listing-wizard, 04-photos-cloudinary, 05-public-listing-page, 06-paymongo-gate]

# Tech tracking
tech-stack:
  added: [next-cloudinary, "@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities", sonner, next-themes (transitive via sonner), "15 shadcn official components"]
  patterns:
    - "Design tokens registered via @theme inline (--color-brand: var(--brand)) — same mechanism as existing --color-destructive; no tailwind.config.*"
    - "Reusable per-identity fixed-window rate limiter (module-level Map, keyed on authenticated user id — never IP) for privileged server actions"
    - "Append-only audit sink with a stable {actorId, action, outcome, meta} shape (v1 console line; durable table = future hardening)"
    - "Security tests drive the REAL exported server action with mocked edges (next/headers + auth.api.getSession + db) — the WR-07 gap-closer"

key-files:
  created:
    - src/lib/rate-limit.ts
    - src/lib/audit.ts
    - tests/security/rate-limit.test.ts
    - tests/security/audit.test.ts
    - src/components/ui/select.tsx
    - src/components/ui/command.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/switch.tsx
    - src/components/ui/radio-group.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/sonner.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/alert.tsx
    - src/components/ui/progress.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/tooltip.tsx
    - src/components/ui/aspect-ratio.tsx
    - src/components/ui/input-group.tsx
  modified:
    - package.json
    - package-lock.json
    - src/app/globals.css
    - src/app/actions/capability.ts
    - .env.example

key-decisions:
  - "PayMongo has NO npm SDK (D-20) — no payments package installed; the client is a thin fetch wrapper built in Plan 06. Only the three PAYMONGO_* env vars are documented here."
  - "audit.ts is a v1 console sink + rate-limit.ts is an in-memory Map — deliberate 'do not over-build' choices with documented future-hardening (durable audit table / distributed store); both fully satisfy WR-06 (bounded + observable)"
  - "audit.test.ts drives the REAL activateHosting/activateBooking (mocked session/db) instead of reproducing db.update — closes the WR-06/WR-07 'test the action, not Drizzle' gap"
  - "hosting + booking share one rate-limit budget (key = activate:{userId}), per the plan's literal wrap"

patterns-established:
  - "@theme inline token registration for new brand/semantic colors (bg-brand/bg-success)"
  - "rateLimit + recordAudit as the shared privileged-action hardening pair (reused by Plan 04 sign endpoint + Plan 06 onboarding)"

requirements-completed: [LIST-01]

# Metrics
duration: ~13min
completed: 2026-07-09
---

# Phase 2 Plan 02: Shared UI + Security Foundation Summary

**Installed the Phase-2 deps (next-cloudinary + @dnd-kit/*), added the FitOut Coral + success design tokens (light/dark/@theme inline), installed all 15 UI-SPEC official shadcn components, and CLOSED the Phase-1 deferred WR-06 by building a reusable per-identity rate limiter + audit sink and wrapping the capability-activate server actions — security carry-forward gate satisfied before Plan 06 wires PayMongo payouts to canHost.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-07-09T07:33:53Z
- **Completed:** 2026-07-09T07:46:18Z
- **Tasks:** 2 (Task 2 was TDD: RED → GREEN, no REFACTOR needed)
- **Files changed:** 25 (20 created, 5 modified)

## Accomplishments

- Installed the Phase-2 runtime deps `next-cloudinary` + `@dnd-kit/core|sortable|utilities` (D-04/D-18). Confirmed **no** PayMongo SDK is added (D-20 — there is none; the client is a Plan-06 fetch wrapper).
- Added **FitOut Coral** (`--brand`/`--brand-foreground`) and semantic **`--success`** tokens to `:root` + `.dark` and registered them in `@theme inline` (`--color-brand`/`--color-success`) so Tailwind exposes `bg-brand`, `text-brand-foreground`, `bg-success`. Left `--radius` and `--primary` untouched (UI-SPEC).
- Installed all **15 official-registry** shadcn components (plus `input-group`, a transitive dependency of `command`). No third-party registry used (`components.json` `registries: {}`).
- Documented `PAYMONGO_SECRET_KEY` / `PAYMONGO_PUBLIC_KEY` / `PAYMONGO_WEBHOOK_SECRET` (server-only, D-20) in `.env.example` — no Stripe vars, no country env.
- **Closed WR-06:** built `src/lib/rate-limit.ts` (reusable per-identity fixed-window limiter, 5/60s) + `src/lib/audit.ts` (append-only `recordAudit` sink) and wrapped both `activateHosting`/`activateBooking` — rate-limited per authenticated user id, audited on allow AND deny — keeping the `input:false` discipline, `CapabilityResult`, and D-03 coexistence unchanged.

## Task Commits

Each task committed atomically (TDD RED/GREEN split for Task 2):

1. **Task 1: deps + design tokens + 15 shadcn components + PayMongo env** — `526a727` (chore)
2. **Task 2 (RED): failing WR-06 rate-limit + audit tests** — `6564e28` (test)
3. **Task 2 (GREEN): rate-limit.ts + audit.ts + capability.ts wrap** — `6a16141` (feat)

## Files Created/Modified

- `src/lib/rate-limit.ts` (created) — `rateLimit(key, {window,max})` fixed-window limiter over a module-level `Map`, returns `{ok:true}` or `{ok:false, retryAfter}`; `requireWithinRateLimit` ergonomic wrapper. Documents the in-memory/single-instance v1 tradeoff + distributed-store future hardening.
- `src/lib/audit.ts` (created) — `recordAudit({actorId, action, outcome, meta?})` append-only sink; v1 emits one structured `console.info("[audit]", <json>)` line with an ISO timestamp. Stable shape for a future durable table.
- `src/app/actions/capability.ts` (modified) — both actions now call `rateLimit("activate:"+userId, {window:60,max:5})` before the privileged flip; deny → `recordAudit(...denied, reason:rate_limit)` + user-facing "Too many attempts" ; success → `recordAudit(...ok)`. Header refreshed (WR-06 closed) and stale **Stripe → PayMongo** wording corrected (D-20).
- `tests/security/rate-limit.test.ts` (created) — budget-then-reject, per-identity isolation, window-reset (fake timers + `setSystemTime`), structured `requireWithinRateLimit` result.
- `tests/security/audit.test.ts` (created) — drives the REAL `activateHosting`/`activateBooking` with mocked `next/headers` + `auth.api.getSession` + `db`; asserts an `[audit]` entry (actorId+action+outcome:ok) on success and NOTHING privileged (no audit, no db write) on an unauthenticated call.
- `src/components/ui/*.tsx` (16 created) — 15 UI-SPEC components + `input-group` (command dep).
- `package.json` / `package-lock.json` (modified) — next-cloudinary, @dnd-kit/*, sonner, next-themes.
- `src/app/globals.css` (modified) — brand/success tokens (`:root` + `.dark`) + `@theme inline` color mappings.
- `.env.example` (modified) — documented PayMongo server-only env contract.

## Decisions Made

- **No PayMongo npm SDK (D-20):** verified by the presence of the three `PAYMONGO_*` env vars + the Plan-06 client-wrapper plan, NOT by a package.json entry. No Stripe SDK reintroduced.
- **v1 rate-limit is in-memory; v1 audit is a console line:** both are deliberate "do not over-build" choices (single-region launch) with documented future hardening. They fully satisfy WR-06's requirement that privileged escalations be **bounded + observable** — they are not stubs.
- **Test the action, not Drizzle:** `audit.test.ts` invokes the shipped server actions (mocked edges), directly closing the WR-06/WR-07 finding that prior capability tests reproduced a bare `db.update`.
- **Shared activate budget:** hosting + booking share `activate:{userId}` per the plan's literal instruction.

## Deviations from Plan

### Auto-fixed / adjustments

**1. [Rule 1 - Doc correctness] `.env.example` comment wording to satisfy the exact acceptance count**
- **Found during:** Task 1 (env acceptance check `grep -c "PAYMONGO_*" .env.example → 3`).
- **Issue:** My first draft documented each var by name in the comments (matching the existing Cloudinary block style), which made `grep -c` return 6, not the specified 3.
- **Fix:** Reworded the comments to describe the keys by role ("the secret key", "the public key", "the webhook secret") so each exact token appears exactly once (on its declaration line). Documentation preserved; acceptance count is now exactly 3.
- **Files modified:** `.env.example`
- **Committed in:** `526a727`

**2. [Rule 1 - Stale doc] Stripe → PayMongo in `capability.ts` header/docstrings**
- **Found during:** Task 2 (updating the WR-06 header comment, as the plan directs).
- **Issue:** The Phase-1 header/docstrings still said "Stripe Connect payout onboarding" — contradicts D-20 (payments switched to PayMongo) and the standing "do not reintroduce Stripe" constraint.
- **Fix:** Updated the two comment references to "PayMongo … onboarding (Plan 06)". Comment-only; no behavior change.
- **Files modified:** `src/app/actions/capability.ts`
- **Committed in:** `6a16141`

**3. [Environmental note, not a deviation] shadcn CLI printed a Connect Timeout after writing all files**
- **Found during:** Task 1 (shadcn add).
- **Detail:** The CLI created all 16 files and installed npm deps (sonner, next-themes), then a final registry re-fetch (`.../radix-nova/sonner.json`) timed out. All 15 required component files landed complete (verified on disk + `tsc` + `next build`); no re-run was needed.

**Total:** 2 minor doc adjustments (both Rule 1), 1 environmental note. No architectural changes, no scope creep. Plan intent achieved exactly.

## Known Stubs

None that block the plan's goal. The in-memory rate limiter and console-line audit sink are **intentional, documented v1 implementations** (the plan explicitly prescribes them), each with a future-hardening note (distributed store / durable audit table). The 15 shadcn components are reusable primitives wired by Plans 03–06 (their consumers), not application stubs. The empty `PAYMONGO_*` values in `.env.example` are correct-by-design placeholders for an example env file.

## Test Results

- `npx tsc --noEmit` → **exit 0** (after each task).
- `npx vitest run tests/security/rate-limit.test.ts tests/security/audit.test.ts` → **2 files, 7 tests, all pass** (RED: 2 fail + 1 pass before impl → GREEN: 7/7).
- **Full suite** `npx vitest run` → **22 passed | 5 skipped (27 files); 89 passed | 31 todo (120 tests); 0 failures** — +2 files / +7 tests over the 02-01 baseline (20/82), no Phase-1 regressions (existing capability + auth + profile + listing tests unaffected).
- **Production build** `npm run build` → **exit 0** ("Compiled successfully in 5.8s"; TypeScript check passed; 10 static pages generated). Confirms new deps resolve, all 15 components compile, and the brand/success Tailwind tokens compile cleanly. (Pre-existing warnings only: middleware→proxy deprecation [intentionally kept, 01-03]; Google OAuth creds absent in dev.)

## Acceptance Criteria

**Task 1:** next-cloudinary `^6.17.5` + @dnd-kit/sortable `^10.0.0` present · brand/success token grep = 5 (≥3) · all 15 components on disk · PAYMONGO grep = 3 · tsc exit 0. ✅
**Task 2:** `rate-limit.ts` exports `rateLimit` · `audit.ts` exports `recordAudit` · capability.ts rateLimit|recordAudit occurrences = 8 (≥4) · security vitest exit 0 · tsc exit 0. ✅

## Issues Encountered

- **shadcn registry timeout (non-blocking):** see Deviation 3 — cosmetic; all artifacts landed and were verified via disk + tsc + build.

## User Setup Required

None for this plan. The `PAYMONGO_*` values in `.env.local` are only needed when Plan 06 builds the PayMongo client; the PayMongo Platforms/Linked-Accounts beta enablement remains a tracked real-world lead-time action for Plan 06 (per STATE.md), not required here.

## Next Phase Readiness

- **Wave 2/3 unblocked:** the shared design tokens + 15 components + dnd-kit/next-cloudinary deps are on disk; Plan 03 (wizard) can compose select/command/checkbox/switch/radio-group/progress/sonner, Plan 04 (photos) has aspect-ratio + dnd-kit + next-cloudinary, Plan 05 (public page) has badge/separator/skeleton/tooltip + the coral CTA token.
- **Security gate satisfied:** `rateLimit` + `recordAudit` are ready for reuse by Plan 04's Cloudinary sign endpoint and Plan 06's onboarding action; WR-06 is closed BEFORE payouts wire to `canHost`.
- **PayMongo env contract documented** for Plan 06's fail-closed `src/lib/paymongo.ts`.

---
*Phase: 02-listings-host-onboarding*
*Completed: 2026-07-09*

## Self-Check: PASSED
- All key created files verified on disk (src/lib/rate-limit.ts, src/lib/audit.ts, tests/security/{rate-limit,audit}.test.ts, all 15 shadcn components, modified capability.ts/.env.example/globals.css).
- All 3 task commits verified in git history (526a727, 6564e28, 6a16141).
- tsc exit 0; targeted security tests 7/7; full suite 89 pass / 31 todo / 0 fail; production build exit 0.
