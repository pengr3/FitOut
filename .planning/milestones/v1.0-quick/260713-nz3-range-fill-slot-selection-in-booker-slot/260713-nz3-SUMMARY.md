---
task: 260713-nz3
type: quick
subsystem: availability / booker
status: complete
requirements: [AVAIL-04, AVAIL-05, SC#2, D-23]
tags: [slot-picker, range-fill, gesture, a11y, e2e, advisory-ui]
dependency_graph:
  requires: [03-02 getAvailability read model, 03-05 booker calendar]
  provides: ["range-fill SlotPicker gesture (sketch 001 variant A)"]
  affects: [src/components/availability/slot-picker.tsx]
tech_stack:
  patterns: ["pure DOM-free reducer core + thin Radix shell", "controlled ToggleGroup driven by a committed run"]
key_files:
  created:
    - src/components/availability/slot-selection.ts
    - tests/availability/slot-selection.test.ts
  modified:
    - src/components/availability/slot-picker.tsx
    - e2e/availability.spec.ts
decisions:
  - "Anchor is a coral RING + augmented aria-label + aria-live helper, NOT a pressed toggle (Radix ToggleGroup kept for free keyboard nav)."
  - "Gap-hint reason word is 'unavailable' — the read model exposes no booked-vs-blocked distinction (that would be a server change, out of scope)."
metrics:
  tasks: 3
  commits: 4
  files_changed: 4
  completed: 2026-07-13
---

# Quick Task 260713-nz3: Range-fill Slot Selection in the Booker SlotPicker — Summary

Replaced the booker SlotPicker's shipped "click each hour, adjacent clicks extend" interaction with the
approved **range-fill** model (sketch 001 variant A): click a START hour (coral-ring anchor, selection
pending/null), then an END hour to fill the CONTIGUOUS available run between them in either direction;
crossing a busy hour TRUNCATES the run at the last available hour before the gap and shows a soft,
non-error hint naming the blocking hour. The gesture logic is extracted into a pure, DOM-free core so it
is deterministically unit-tested; the picker is a thin Radix shell. Advisory-only — no DB/schema/server
changes (the `booking_no_overlap` EXCLUDE constraint remains the sole booking authority).

## What was built

- **`src/components/availability/slot-selection.ts` (new, pure core).** A DOM/React/Radix-free reducer
  that ports the sketch's `rangefill` state machine verbatim in behavior: `resolveClick` (anchor → fill →
  truncate → re-anchor), `resolveFullDay` (D-23 toggle + mutual clear), `selectionValue` (the UNCHANGED
  `{startUtc,endUtc,fullDay}|null` lift, null while pending), plus `contiguousEnd` / `firstGap` /
  `isAvailable` / `EMPTY_SELECTION`. Imports ONLY the `AvailabilitySlot` **type**, so it runs in node.
- **`tests/availability/slot-selection.test.ts` (new, 20 tests, TDD).** Hermetic coverage of the riskiest
  rule (gap truncation, both directions) plus adjacent/non-adjacent clean fill, same-anchor 1-hour block,
  re-anchor after a completed run (in-run and out-of-run), full-day mutual-clear, null-on-pending lift,
  and the defensive unavailable-index no-op. Fixture mirrors the E2E seed (06:00–21:00; 08:00 + 10:00
  unavailable).
- **`src/components/availability/slot-picker.tsx` (rewritten interaction).** Consumes the core via a single
  `SelectionState` reducer. Controlled `ToggleGroup` value = the committed run's `startUtc`s; the pending
  anchor renders as a coral `border-brand ring-2 ring-brand/50` ring (not filled). `onValueChange` derives
  the single changed hour as `added ?? removed` → `startToIndex` → `resolveClick` → `setSel` +
  `onSelectionChange(selectionValue(...))`. Two inline, mutually-exclusive, never-red affordances below the
  grid: a pending "Start selected — pick an end hour." helper (`aria-live`) and a soft brand-tint gap hint
  (`role="status"`, `InfoIcon`). Unavailable-chip tooltip/line-through, venue-tz 12h labels, the multi-unit
  `{freeUnits} of {unitCount} free` sublabel, and the `disabled` read-only path are all untouched.
- **`e2e/availability.spec.ts` (updated).** See "E2E scenarios" below.

## A11y decision

Kept the Radix **`ToggleGroup type="multiple"`** rather than re-implementing the sketch's raw `<button>`
grid — this preserves the single tab stop + arrow-key roving + Space/Enter activation + `aria-disabled` on
unavailable chips + 44px hit areas with the least churn. The committed run's chips carry
`aria-pressed=true` (honest — they ARE selected). The transient START **anchor is intentionally NOT a
pressed toggle**: it is a coral ring + an augmented `aria-label` ("… — start selected, pick an end hour")
+ an `aria-live` helper, so screen-reader users hear the pending state and the truncation hint. Documented
in the file's header comment.

## Gap-hint vocabulary note

The hint copy is `"{hour} is unavailable — pick a later start for a block after it."` The reason word is
**"unavailable"** (not "booked"/"blocked") because the shipped read model only exposes
`available | unavailable | past | beyond_horizon` — it has no booked-vs-blocked distinction, and adding one
would be a server/read-model change (out of scope for this advisory-only UX task). The hint is styled with
a brand-tint background + info icon and is **never** `text-destructive`/red (occupancy is a normal state).

## Contract preserved (availability-calendar.tsx NOT touched)

The lifted `SlotSelectionValue = {startUtc,endUtc,fullDay}` type is now defined in `slot-selection.ts` and
**re-exported** from `slot-picker.tsx` (`export type { SlotSelectionValue }`), so
`availability-calendar.tsx`'s `import { SlotPicker, type SlotSelectionValue }` stays valid. Verified via git:
that file's most recent commit is `5c0589c` (Plan 03-05) — none of this task's four commits touch it.
`RailSelectionSummary` keeps working: a pending anchor lifts `null`, so no stale rail summary is shown.

## E2E scenarios added

1. **Adjacent fill + full-day mutual-clear** (extended the existing bookable test): 6:00 AM → 7:00 AM fills
   to a 6:00 AM – 8:00 AM run with both endpoints `aria-pressed=true`; then "Book full day" shows
   `Full day`, and a subsequent hour click clears it back to a fresh pending anchor (`/pick an end hour/`).
2. **Non-adjacent clean fill + 3rd-click re-anchor**: 5:00 PM → 8:00 PM yields a 5:00 PM – 9:00 PM run with
   interior 6/7 PM chips pressed (proves the fill); a 3rd click (12:00 PM) clears the old summary and shows
   the pending helper; completing it gives a fresh 12:00 PM – 2:00 PM run.
3. **Gap truncation + soft hint**: 7:00 AM → 9:00 AM (08:00 booked) truncates to 7:00 AM – 8:00 AM, shows
   `/8:00 AM is unavailable/` + `/pick a later start/`, and leaves 9:00 AM `aria-pressed=false`.

The existing tz-note, unselectable booked/blocked hours, and not-payable read-only assertions are unchanged
and still pass (4/4 specs green).

## Deviations from plan

**One in-scope environment provisioning step** (Rule 3, blocking): the Playwright Chromium binary was not
installed (`chrome-headless-shell.exe` missing after a Playwright update). Ran `npx playwright install
chromium` — this downloads the browser managed by the already-present `@playwright/test` devDependency
(NOT a new npm package), so it is not the excluded package-manager-install case. After install, all 4 specs
pass. Otherwise the plan executed exactly as written.

## Verification results

- `npx vitest run tests/availability/slot-selection.test.ts` — 20/20 GREEN.
- `npx playwright test e2e/availability.spec.ts` — 4/4 GREEN.
- `npx tsc --noEmit` — clean (exit 0).
- `npx eslint` on the 4 touched files — clean (exit 0).
- `npx next build` — compiles + typechecks the SlotPicker; full build proven green when a throwaway
  `PAYMONGO_SECRET_KEY` satisfies the unrelated boot guard (see Pre-existing notes).
- `npx vitest run` (full suite) — **219/220 pass**; the 1 failure is a pre-existing flake (see below).

## Pre-existing issues (NOT introduced by this task, out of scope — not fixed)

- **`tests/auth/secret-config.test.ts`** timed out (5000ms) under the full parallel run (aggregate
  `import 154s` on this machine) but **passes 3/3 in isolation** in ~4s. A resource-contention import-time
  flake in the Better Auth boot-config test, unrelated to the SlotPicker.
- **`npx eslint .`** reports 1 error + 4 warnings, all in untouched files: a
  `react-hooks/set-state-in-effect` error in `src/components/listing/address-autocomplete.tsx` and unused-var
  warnings in `tests/helpers/mocks.ts`. None are in this task's files.
- **`npx next build`** without env fails at page-data collection for `/host/payouts/refresh` because
  `PAYMONGO_SECRET_KEY` is unset in this environment (a deliberate production boot guard) — unrelated to the
  SlotPicker; the build otherwise compiles and typechecks the availability code cleanly.

## Follow-up

**Re-run Plan 03-05's human-verify checkpoint against the new gesture** — the booker slot interaction has
changed from consecutive-click to range-fill, so the earlier UAT walkthrough should be repeated to confirm
the anchor ring, the fill/truncation hint, and the full-day mutual-clear read well in the browser.

## Self-Check: PASSED

- Files exist: `slot-selection.ts`, `slot-picker.tsx`, `slot-selection.test.ts`, `availability.spec.ts` — all FOUND.
- Commits exist: `15be15f` (test RED), `35664cb` (feat core GREEN), `8ea61be` (feat picker), `83708f0` (test E2E) — all FOUND.
- `availability-calendar.tsx` last commit `5c0589c` (03-05) — confirmed untouched (contract preserved).
