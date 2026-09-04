---
plan_id: 260714-feq
title: Apply Phase-3 code-review findings (post-phase hardening)
type: quick
status: complete
completed: 2026-07-14
branch: dev
source_review: .planning/phases/03-availability-the-double-booking-guarantee/03-REVIEW.md
tasks: 4
tasks_complete: 4
commits:
  - task: 1
    findings: [WR-01, WR-02]
    hash: 7ab4532
    files:
      - src/app/actions/availability.ts
      - src/app/actions/blocks.ts
      - src/lib/availability/read-model.ts
  - task: 2
    findings: [WR-04, IN-06]
    hash: a527d50
    files:
      - src/app/(host)/host/listings/[id]/availability/page.tsx
      - src/components/availability/weekly-hours-editor.tsx
      - src/components/availability/blocks-editor.tsx
  - task: 3
    findings: [IN-01, IN-02, IN-03]
    hash: c875d72
    files:
      - src/lib/money.ts
      - src/components/availability/availability-calendar.tsx
      - src/app/listings/[id]/page.tsx
      - src/components/listing/listing-card.tsx
      - src/lib/validation/booking.ts
  - task: 4
    findings: [IN-05, WR-03]
    hash: 8667ecb
    files:
      - e2e/availability.spec.ts
      - src/lib/availability/units.ts
---

# Quick Task 260714-feq: Apply Phase-3 Code-Review Findings (Post-Phase Hardening) Summary

**One-liner:** Closed 8 actionable Phase-3 review findings + 1 document-only finding on `dev` without touching the double-booking invariant — authorized/validated the one public availability action, bounded block `unit` server-side + defensively in the read model, de-duplicated the host `Toaster`, extracted a single `formatMoney`, added a client fetch-error path, hardened the E2E day locator against `showOutsideDays` duplicates, and documented `createBooking`'s auto-commit contract for Phase 4. The `booking_no_overlap` constraint, the half-open `'[)'` range, and the `('pending','confirmed')` occupying set are untouched everywhere.

## What Each Finding's Fix Did

### Task 1 — WR-01 + WR-02 (commit `7ab4532`)

**WR-01 — authorize + validate public `getDayAvailability`** (`src/app/actions/availability.ts`)
- Added a `dayLocalSchema` (Zod): `year` int 2000–2100, `month` int 1–12, `day` int 1–31. The action arg is now typed `unknown` and validated before use, so a crafted `{ year: "abc" }`/`NaN` can no longer flow into `new Date(NaN).toISOString()` (the previous unhandled 500 path).
- Re-enforced the public page's gate the action bypassed: it now looks up the listing by id with `isNull(listing.deletedAt)` and returns an empty `DayAvailability` unless `status === 'published'`. A leaked draft/unlisted id can no longer reveal a hidden schedule (timezone, unit count, hours, busy windows).
- Shape preserved: on any reject it returns the exact empty shape `{ timezone: "UTC", unitCount: 0, hasHours: false, slots: [] }` (identical to the read model's unknown-listing return). Header SECURITY comment updated to describe the new gate + validation.

**WR-02 — bound block `unit` server-side + defensive read-model clamp** (`src/app/actions/blocks.ts`, `src/lib/availability/read-model.ts`)
- `addBlock`: after parsing, rejects an out-of-range unit with the existing `{ ok, error }` shape — `if (b.unit != null && b.unit > owned.unitCount) return { ok: false, error: "That unit doesn't exist for this listing." }` — using the already-loaded owned row. `blockSchema.unit` has no upper bound, so a crafted `unit: 999` on an 8-unit listing was previously persisted verbatim.
- `read-model.ts`: added `const inRange = (u): u is number => u != null && u >= 1 && u <= unitCount` and fold a block/booking unit into the `taken` set only when `inRange(u)`. A stale/phantom unit can no longer inflate `taken.size` and under-report `freeUnits` (the concrete failure: a `unit:2` block on a `unitCount:1` listing rendering the slot unavailable while unit 1 is free). Real units are counted exactly as before — no change to how legitimate units occupy inventory.

### Task 2 — WR-04 + IN-06 (commit `a527d50`)

**WR-04 — single `<Toaster />`** (`availability/page.tsx`, `weekly-hours-editor.tsx`, `blocks-editor.tsx`)
- Both editors previously mounted their own `<Toaster />`; because Sonner's `toast()` writes to one global store every mounted `Toaster` renders, a single host toast rendered twice on this page. Mounted `<Toaster />` exactly once at the shared ancestor (`availability/page.tsx`, an RSC — `Toaster` is a `"use client"` component so this is valid) and removed it from both editors. Kept `import { toast } from "sonner"` in each editor (still used for `toast.success/error`); removed only the now-unused `import { Toaster } from "@/components/ui/sonner"`.

**IN-06 — drop unused `timezone` prop** (`weekly-hours-editor.tsx`, `availability/page.tsx`)
- `WeeklyHoursEditor` declared a `timezone` prop it never destructured or used (the tz note is built from `cityLabel`/`gmtLabel`). Removed it from the props type and removed the `timezone={row.timezone}` argument at the `page.tsx` call site. `BlocksEditor` keeps its `timezone` prop (it genuinely uses it).

### Task 3 — IN-01 + IN-02 + IN-03 (commit `c875d72`)

**IN-02 — one shared `formatMoney`** (new `src/lib/money.ts` + 3 call sites)
- Confirmed the three copies (`listing-card.tsx:48`, `availability-calendar.tsx:65`, `listings/[id]/page.tsx:64`) were **byte-identical** (same `Intl.NumberFormat` options, same fraction/rounding, same `catch` fallback) before extracting. Created `src/lib/money.ts` (a pure/isomorphic module — no `"use client"`/`"use server"`, importable by both Server and Client Components) exporting the identical function, imported it in all three, and deleted the three local copies plus their "keep in sync" comments. Verified `grep -rn "function formatMoney" src` now matches only `src/lib/money.ts`. Behavior is unchanged.

**IN-03 — `handleDaySelect` error path** (`availability-calendar.tsx`)
- Added an `error` state, a `catch` on the `getDayAvailability` call that sets `dayAvail = null` and `error = true` (and `setError(false)` at the start of each fetch), and a new inline `role="alert"` "Couldn't load this day — pick the day again to retry" branch rendered before the existing empty states. A rejected fetch can no longer silently leave the previous day's slots on screen (stale-but-plausible). `SlotSelectionValue`/`onSelectionChange` and the `DayAvailability` shape are unchanged.

**IN-01 — mark Phase-4 scaffolding** (`src/lib/validation/booking.ts`)
- Added the marker `// Unused until Phase 4 — client selection lift is validated server-side in the booking flow` above `slotSelectionSchema` so a dead-code sweep won't delete it. Not deleted, not rewired.

### Task 4 — IN-05 + WR-03 (commit `8667ecb`)

**IN-05 — robust E2E day locator** (`e2e/availability.spec.ts`)
- `selectTargetDay` previously used `getByRole("button", { name: targetDayLabel }).first()`. With `showOutsideDays` (default `true`) a boundary-adjacent day can render both in-month and as an adjacent-month "outside" cell under the same `aria-label`, so `.first()` could click the outside/disabled occurrence. Verified against the installed **react-day-picker v10.0.1**: the outside day's `<td>` carries `data-outside="true"` (`day.outside || undefined`) and the day button is nested inside that `<td>`. Scoped the locator to the enabled, in-month cell: `.and(page.locator("td:not([data-outside='true']) button")).and(page.locator("button:not([disabled])"))`. Robust regardless of where the target date sits in the month; all 4 specs still green (every spec exercises `selectTargetDay`).

**WR-03 — document `createBooking` auto-commit contract (DOCUMENT-ONLY)** (`src/lib/availability/units.ts`)
- Added an explicit `⚠️ AUTO-COMMIT CONTRACT` block to the `createBooking` JSDoc: `dbConn` MUST be an auto-commit connection; naively wrapping the retry loop in an outer `db.transaction(...)` breaks two distinct ways — `23P01` aborts the whole outer tx → next probe throws `25P02` → raw 500 (needs a per-attempt SAVEPOINT), and `40P01` (deadlock) aborts the entire tx and cannot be rescued by a savepoint (needs an outer-transaction retry). Because the two remedies differ, a partial (savepoint-only) fix would be subtly wrong for `40P01`, so the transactional design is deferred wholesale to Phase 4. **No change to the retry logic** — comment only, exactly as scoped.

## Verification Results (Final)

All four PLAN "Final verification" gates were run on `dev` after the last commit:

| # | Command | Result |
|---|---------|--------|
| 1 | `npx tsc --noEmit` | **clean** (exit 0) |
| 2 | `npx eslint` on all 13 touched files | **clean** (exit 0, 0 errors / 0 warnings) |
| 3 | `DATABASE_URL=…@localhost:5432/fitout npx vitest run tests/availability` | **8 files / 82 tests passed**, 0 failed (14.35s) |
| 4 | `npx playwright test e2e/availability.spec.ts` | **4 passed**, 0 failed (21.1s) |

The double-booking invariant was not touched: no change to the `booking_no_overlap` constraint, the half-open `'[)'` `tstzrange`, or the `('pending','confirmed')` occupying-status set in any of the three sites (constraint SQL, read model, unit-assignment probe).

## Deviations from Plan

**1. [WR-01] `safeParse` + empty-return instead of the review snippet's literal `.parse()`**
- **Finding:** WR-01 (Task 1).
- **What the plan said:** step 1 "validate `dayLocal` … and parse before use"; the review's code sample uses `dayLocalSchema.parse(dayLocal)`. The plan's **Verify** line, however, requires "a malformed `dayLocal` no longer 500s (returns empty availability)".
- **Decision:** used `dayLocalSchema.safeParse(...)` and returned the empty `DayAvailability` on failure (rather than `.parse()`, which throws a `ZodError` and would still surface an error to the caller). This makes the plan's own Verify criterion literally true (no 500 path at all), mirrors the read model's existing "unknown listing → empty shape" idiom, and preserves the `DayAvailability` public contract. Net effect is strictly more defensive than the review snippet; the validation rules (year/month/day bounds) are exactly as specified.

**2. [IN-03] inline error, not a toast**
- **Finding:** IN-03 (Task 3). The plan allowed "toast or inline".
- **Decision:** used an inline `role="alert"` block, not `toast()`, because the public listing page (`listings/[id]/page.tsx`) mounts **no** `<Toaster />` — a toast would never render there. Inline surfacing + clearing `dayAvail` satisfies the fix ("surface an error and clear/flag stale availability") on the surface where the calendar actually lives.

No other deviations — the remaining findings were applied as written.

## Explicitly Out of Scope (as planned)

- **WR-03 code fix** — deferred to Phase 4; only the auto-commit contract comment was added here (a partial savepoint fix is wrong for the `40P01` deadlock case).
- **IN-04** — hardcoded `postgresql://fitout:fitout@localhost:5432/fitout` fallback in `tests/helpers/db.ts` + `e2e/availability.spec.ts` is an intentional local-dev default in test-only code; left as-is (skipped entirely).

## Pre-existing / Unrelated (not touched)

- The known `tests/auth/secret-config.test.ts` flake (passes in isolation, per STATE.md) was **not exercised**: verification was scoped to `tests/availability` exactly as the plan's Final verification specifies. No auth code was touched.
- No pre-existing eslint warnings surfaced in the 13 touched files (all clean). Untouched files were not lint-swept (out of scope).
- Ambient `.planning/config.json` modification and the `.planning/quick/260714-feq-…/` directory were left unstaged — docs artifacts are the orchestrator's to commit (per task constraints). None of the 4 code commits contain any file deletions (verified via `--diff-filter=D`).

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced. `src/lib/validation/booking.ts`'s `slotSelectionSchema` remains intentional Phase-4 scaffolding (now marked, per IN-01) — it is not a stub blocking this task's goal.

## Self-Check: PASSED

- Created file exists: `FOUND: src/lib/money.ts`
- Commits exist: `FOUND: 7ab4532`, `FOUND: a527d50`, `FOUND: c875d72`, `FOUND: 8667ecb`
- 4 atomic code-only commits with the exact PLAN "Done:" messages; tsc clean; eslint clean on touched files; vitest availability 82/82; availability E2E 4/4.
