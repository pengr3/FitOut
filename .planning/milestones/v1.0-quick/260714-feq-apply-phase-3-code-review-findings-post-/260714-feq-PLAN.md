---
quick_id: 260714-feq
slug: apply-phase-3-code-review-findings-post-
title: Apply Phase-3 code-review findings (post-phase hardening)
date: 2026-07-14
type: quick
branch: dev
source_review: .planning/phases/03-availability-the-double-booking-guarantee/03-REVIEW.md
autonomous: true
---

# Quick Task 260714-feq: Apply Phase-3 Code-Review Findings (Post-Phase Hardening)

## Objective

Phase 3 is CLOSED and verified. This is post-phase hardening: apply the **actionable** findings
from `03-REVIEW.md` on branch `dev`. The double-booking invariant is sound and must stay sound —
**do not** change the `booking_no_overlap` semantics, the half-open `'[)'` range, or the
`('pending','confirmed')` occupying-status set anywhere.

**Curation (approved by the user):** fix WR-01, WR-02, WR-04 and IN-01, IN-02, IN-03, IN-05, IN-06.
**Defer** WR-03 (document-only — do NOT add savepoint code). **Skip** IN-04 (test-only local-dev creds).

Read `03-REVIEW.md` for each finding's full rationale, exact file:line, and suggested code before editing.

## Constraints

- **Worktrees are OFF** — you run on the main working tree. `node_modules` is present; the Postgres
  container `fitout-db-1` is up on `localhost:5432` (db/user/pw = `fitout`). Use
  `DATABASE_URL=postgresql://fitout:fitout@localhost:5432/fitout` when running vitest if it isn't picked up.
- Preserve every public contract: `getDayAvailability`/`getAvailability` return the same `DayAvailability`
  shape; `SlotSelectionValue`/`onSelectionChange` unchanged; `formatMoney(cents, currency)` behavior identical.
- Commit each task atomically (code only — the orchestrator commits PLAN/SUMMARY/STATE). Do NOT touch ROADMAP.md.

## Tasks

### Task 1 — WR-01 + WR-02: server-side authorization + input validation (Warnings)

**Files:** `src/app/actions/availability.ts`, `src/app/actions/blocks.ts`, `src/lib/availability/read-model.ts`

- **WR-01** (`src/app/actions/availability.ts`): `getDayAvailability` is a public `"use server"` action.
  1. Validate `dayLocal` at runtime with a Zod schema — `year` int 2000–2100, `month` int 1–12, `day` int 1–31 — and parse before use (server-action arg types are NOT enforced at runtime; a `NaN`/`"abc"` currently reaches `new Date(NaN).toISOString()` → unhandled 500).
  2. Re-enforce the page's published gate the action currently bypasses: look up the listing by id with `isNull(listing.deletedAt)`, and if the row is missing or `status !== 'published'`, return an empty `DayAvailability` (`{ timezone: "UTC", unitCount: 0, hasHours: false, slots: [] }`) instead of delegating to `getAvailability`. Match the exact fix in 03-REVIEW.md WR-01. Reuse the existing `db`/`listing` imports; add `and`, `eq`, `isNull` from `drizzle-orm` and `z` from `zod` if not already imported.
- **WR-02** (`src/app/actions/blocks.ts` `addBlock` + `src/lib/availability/read-model.ts`):
  - In `addBlock`, after loading the owned listing row, reject an out-of-range unit: `if (b.unit != null && b.unit > owned.unitCount) return { ok: false, error: "That unit doesn't exist for this listing." };` (mirror the exact `{ ok, error }` shape `addBlock` already returns).
  - Defensive clamp in `read-model.ts`: only fold a block/booking unit into the `taken` set when `unit >= 1 && unit <= unitCount`, so a stale phantom unit can never under-report `freeUnits`. Do NOT change how real units are counted.

**Verify:** `npx tsc --noEmit` clean; a malformed `dayLocal` no longer 500s (returns empty availability); a `unit > unitCount` block is rejected server-side.
**Done:** commit `fix(03-hardening): authorize+validate public getDayAvailability; bound block unit server-side (WR-01, WR-02)`

### Task 2 — WR-04 + IN-06: host availability page UI (Warning + Info)

**Files:** `src/app/(host)/host/listings/[id]/availability/page.tsx`, `src/components/availability/weekly-hours-editor.tsx`, `src/components/availability/blocks-editor.tsx`

- **WR-04**: both `WeeklyHoursEditor` and `BlocksEditor` mount their own `<Toaster />`, so every host toast renders twice. Mount `<Toaster />` **exactly once** at the shared ancestor (`availability/page.tsx`) and remove it from both editor components. Keep the `sonner` import only where still used.
- **IN-06**: `WeeklyHoursEditor` declares a `timezone` prop it never uses (the tz note is built from `cityLabel`/`gmtLabel`). Drop the `timezone` prop from its props type AND remove the corresponding argument at the `page.tsx` call site.

**Verify:** `npx tsc --noEmit` + `npx eslint` clean on the three files; host page renders one Toaster.
**Done:** commit `fix(03-hardening): single Toaster on host availability page; drop unused timezone prop (WR-04, IN-06)`

### Task 3 — IN-01 + IN-02 + IN-03: client robustness + DRY (Info)

**Files:** new `src/lib/money.ts`; `src/components/availability/availability-calendar.tsx`; `src/app/listings/[id]/page.tsx`; `src/components/listing/listing-card.tsx`; `src/lib/validation/booking.ts`

- **IN-02**: The three `formatMoney(cents, currency)` copies (listing-card.tsx:48, availability-calendar.tsx:65, listings/[id]/page.tsx:64) are functionally identical. Extract ONE `formatMoney(cents: number, currency: string): string` into `src/lib/money.ts` and import it in all three call sites; delete the three local copies and their "keep in sync" comments. **Confirm behavior is byte-identical first** (same `Intl.NumberFormat` options, same fraction/rounding). If any copy differs subtly, keep the shared one behaviorally identical to the page/card copy and note the diff in the SUMMARY.
- **IN-03**: `handleDaySelect` in `availability-calendar.tsx` uses `try { … } finally { setLoading(false) }` with no `catch`, so a `getDayAvailability` rejection silently leaves the previous day's slots on screen. Add a `catch` that surfaces an error (toast or inline) and clears/flags `dayAvail` so the UI shows the empty/"No availability yet" state rather than a stale-but-plausible grid.
- **IN-01**: `slotSelectionSchema` / `SlotSelection` in `src/lib/validation/booking.ts` are intentional Phase-4 scaffolding but currently unreferenced. Add a `// Unused until Phase 4 — client selection lift is validated server-side in the booking flow` marker so a dead-code sweep won't delete it. Do NOT delete it.

**Verify:** `npx tsc --noEmit` + `npx eslint` clean on touched files; no remaining local `formatMoney` copies (`grep -rn "function formatMoney" src` → only `src/lib/money.ts`).
**Done:** commit `refactor(03-hardening): shared formatMoney; handleDaySelect error path; mark Phase-4 scaffolding (IN-01, IN-02, IN-03)`

### Task 4 — IN-05 + WR-03: test robustness + Phase-4 contract note (Info + deferred Warning)

**Files:** `e2e/availability.spec.ts`; `src/lib/availability/units.ts`

- **IN-05**: `selectTargetDay` uses `page.getByRole("button", { name: targetDayLabel }).first()`. With `showOutsideDays` defaulting to `true`, a boundary-adjacent day can appear twice (outside-month + in-month) with the same `aria-label`, so `.first()` may click the disabled outside cell. Scope the locator to the active month grid / the enabled cell (e.g. filter out `[disabled]` / `[aria-disabled]`, or scope to the in-month day) so it is robust regardless of the target date's position in the month.
- **WR-03 (DOCUMENT ONLY — do NOT add savepoint code):** `createBooking` in `units.ts` retries on 23P01/40P01 with no per-attempt savepoint. That is correct in the current auto-commit usage but will break the moment Phase 4 wraps it in `db.transaction(...)` (first conflict → aborted tx → next probe throws 25P02 → raw 500). Add a clear header/inline comment on `createBooking` documenting the **auto-commit contract**: this function MUST be called on an auto-commit connection; wrapping it in an outer transaction requires a per-attempt SAVEPOINT for 23P01 AND an outer-transaction retry for 40P01 (deadlock aborts the whole tx) — to be designed in Phase 4. Do NOT change the retry logic now (a partial savepoint fix would be subtly wrong for the 40P01 case).

**Verify:** `npx playwright test e2e/availability.spec.ts` → all specs green; `npx tsc --noEmit` clean.
**Done:** commit `test(03-hardening): robust availability E2E day locator; document createBooking auto-commit contract (IN-05, WR-03)`

## Explicitly out of scope

- **WR-03 code fix** — deferred to Phase 4 (doc-only guard here).
- **IN-04** — hardcoded `postgresql://fitout:fitout@localhost:5432/fitout` fallback in `tests/helpers/db.ts` + `e2e/availability.spec.ts` is a well-known local-dev default in test-only code; not a real exposure. Left as-is.

## Final verification (run all before writing SUMMARY)

1. `npx tsc --noEmit` — clean.
2. `npx eslint` on every touched file — clean (pre-existing unrelated warnings in untouched files are OK).
3. `DATABASE_URL=postgresql://fitout:fitout@localhost:5432/fitout npx vitest run tests/availability` — all green (regression on the availability suite).
4. `npx playwright test e2e/availability.spec.ts` — all specs green (proves IN-05 + no availability regressions).

Record exact pass counts in the SUMMARY.
