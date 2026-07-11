---
phase: 03-availability-the-double-booking-guarantee
plan: 04
subsystem: ui
tags: [react, rhf, zod, shadcn, react-day-picker, date-fns, tzdate, idor, ownership, availability, host-editor]

# Dependency graph
requires:
  - phase: 03-availability-the-double-booking-guarantee (Plan 01)
    provides: "operating_hours + availability_block tables; listing.unitCount/timezone; shadcn calendar/toggle/toggle-group/scroll-area; @date-fns/tz"
  - phase: 03-availability-the-double-booking-guarantee (Plan 03)
    provides: "shared Zod weeklyHoursSchema/blockSchema (:ss-tolerant round-trip); saveOperatingHours/addBlock/removeBlock server actions (session + assertOwnership IDOR + safeParse)"
  - phase: 02-listings-host-onboarding (Plan 03)
    provides: "src/app/(host)/host/listings/[id]/edit/page.tsx (load-gate-seed RSC template) + edit/wizard.tsx (RHF+Zod+shadcn Form+sonner client-form pattern) cloned here"
provides:
  - "src/components/availability/weekly-hours-editor.tsx — client RHF+Zod weekly-hours editor (multiple windows/day, add/remove, neutral Save hours, tz note)"
  - "src/components/availability/blocks-editor.tsx — client blocks list + AddBlockDialog (calendar + whole-day/partial + whole-listing/unit) + reversible neutral Remove block"
  - "src/app/(host)/host/listings/[id]/availability/page.tsx — gated host RSC (session + canHost + IDOR notFound) that seeds both editors with HH:mm-normalized hours"
affects: [03-05-booker-availability-calendar, Phase-4-booking-core]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Host client editor = clone edit/wizard.tsx: useForm(zodResolver(sharedSchema)) → server action re-validates (client never authoritative)"
    - "useFieldArray for D-25 multiple windows/day, grouped/rendered per weekday from the flat windows[] the replace-the-set save expects"
    - "DB `time` 'HH:mm:ss' normalized to 'HH:mm' via .slice(0,5) in the RSC before seeding the form (closes the 03-04 round-trip seam)"
    - "Reversible/neutral removals (secondary button + light confirm dialog) — no --destructive anywhere in this phase's UI"
    - "shadcn calendar timeZone prop + date-fns format({ in: tz(timezone) }) renders/selects venue-local dates independent of browser tz"

key-files:
  created:
    - src/components/availability/weekly-hours-editor.tsx
    - src/components/availability/blocks-editor.tsx
    - src/app/(host)/host/listings/[id]/availability/page.tsx
  modified: []

key-decisions:
  - "WeeklyHoursEditor keeps the flat `windows[]` (grouped by weekday for display via useFieldArray) so form.getValues() maps directly to saveOperatingHours' replace-the-set contract — no per-day sub-forms."
  - "The venue tz note text is emitted as a JS template literal (not JSX text) so the apostrophe in \"your space's local time\" is a real apostrophe (matches the UI-SPEC copy + the acceptance grep) without tripping react/no-unescaped-entities."
  - "AddBlockDialog validates 'no date picked' with the friendly 'Choose a date to block.' copy manually (the calendar always yields a valid YYYY-MM-DD, so the only date failure is absence) rather than surfacing blockSchema's raw-format message."
  - "Block list + AddBlockDialog re-seed via router.refresh() after add/remove (the server action already revalidatePath's); the RSC re-runs and passes fresh initialBlocks — no client cache of the list."
  - "cityLabel = listing.city ?? the IANA tz's city segment; gmtLabel via Intl.DateTimeFormat shortOffset (Asia/Manila → GMT+8) — no new data, derived at render."

patterns-established:
  - "Two-editor host availability page: WeeklyHoursEditor (recurring hours) + BlocksEditor (close-only overrides), both seeded by one gated RSC"
  - "IDOR defense-in-depth on host sub-pages: the (host) layout gates canHost, and the page STILL re-checks row.hostId === session.user.id → notFound() (existence not leaked)"

requirements-completed: []  # AVAIL-01/02 host editor UI is BUILT here but stays Pending until the human-verify checkpoint is approved AND the Phase-3 transition flips REQUIREMENTS.md (matches 03-01/02/03 convention)

# Metrics
duration: 13min
completed: 2026-07-11
---

# Phase 3 Plan 04: Host Availability Editor UI Summary

**The host-facing availability surface: a RHF+Zod `WeeklyHoursEditor` (D-25 multiple open–close windows per weekday), a `BlocksEditor` + `AddBlockDialog` (D-24 close-only overrides — whole-day/partial, whole-listing/one-unit, reversible neutral remove), and the ownership-gated RSC page that normalizes DB `HH:mm:ss` hours to `HH:mm` before seeding the form — wired to the Plan-03 saveOperatingHours/addBlock/removeBlock actions.**

> **STATUS: AWAITING HUMAN-VERIFY CHECKPOINT (Task 3, gate="blocking").** All three build tasks are implemented, committed, and pass tsc + eslint + `npm run build` + the schema/action tests the UI depends on. The plan is `autonomous: false`; the human-verify checkpoint has **not** been self-approved. STATE.md / ROADMAP.md are intentionally **not** yet flipped to complete — that happens only after approval.

## Performance

- **Duration:** ~13 min (build tasks; excludes the pending human verification)
- **Started:** 2026-07-11T05:04:24Z
- **Tasks:** 3 (2 fully autonomous + 1 build-then-human-verify checkpoint)
- **Files created:** 3

## Accomplishments

- **`WeeklyHoursEditor` (`weekly-hours-editor.tsx`):** `"use client"` RHF form on `zodResolver(weeklyHoursSchema)`; seven weekday rows, each listing its windows with on-the-hour open/close `Select`s (00:00..23:00) + a neutral `×` remove (`aria-label="Remove hours"`); "Add hours" appends a window (D-25); a day with zero windows shows "Closed". Neutral **Save hours** (no `bg-brand`), the venue tz note, inline close>open/overlap validation, empty state "Set your weekly hours", ≥44px touch targets, single `<Toaster/>`. Submit → `saveOperatingHours(listingId, values)` → toast + server-field-error surfacing.
- **`BlocksEditor` + `AddBlockDialog` (`blocks-editor.tsx`):** block list rendered in venue tz (date · All-day/range · Whole space/Unit N · reason), each with a **reversible neutral** Remove block confirm ("Remove this block? Those times will open for booking again."). `AddBlockDialog` composes shadcn `calendar` (venue `timeZone`) → whole-day/partial `radio-group` (partial reveals start/end Selects) → whole-listing/one-unit selector **shown only when `unitCount > 1`** → optional reason → **Save block** → `addBlock`. All removals NEUTRAL — **no `destructive` anywhere**.
- **Host RSC page (`availability/page.tsx`):** clones edit/page.tsx — `getSession` → `redirect("/login")` → `redirect("/")` if `!canHost` → load owner's non-deleted listing → `notFound()` on `row.hostId !== session.user.id` (IDOR, existence not leaked) → `Promise.all` fetch hours + blocks → seed both editors. **BLOCKER fix:** DB `time` `HH:mm:ss` normalized to `HH:mm` via `.slice(0, 5)` before seeding `initialWindows`, so untouched DB-origin windows re-save cleanly after a reload.
- **Green gates:** `npx tsc --noEmit` clean; `eslint` clean on all three files; `npm run build` succeeds (route `/host/listings/[id]/availability` registered as dynamic); `vitest run tests/availability/hours-validation.test.ts` (18) + `tests/availability/blocks.test.ts` (11) green — the shared schema + actions the editors bind to are proven.

## Task Commits

Each task was committed atomically:

1. **Task 1: WeeklyHoursEditor** — `b92acda` (feat)
2. **Task 2: BlocksEditor + AddBlockDialog** — `41357fc` (feat)
3. **Task 3: Host availability RSC page (build portion of the human-verify checkpoint)** — `3a4f8dc` (feat)

**Plan metadata:** pending — STATE.md/ROADMAP.md flip + final docs commit happen AFTER the human-verify checkpoint is approved.

## Files Created/Modified

- `src/components/availability/weekly-hours-editor.tsx` — client weekly-hours editor (multiple windows/day, add/remove, neutral Save, tz note)
- `src/components/availability/blocks-editor.tsx` — client blocks list + AddBlockDialog (calendar/whole-day/partial/unit) + reversible neutral remove
- `src/app/(host)/host/listings/[id]/availability/page.tsx` — gated host RSC (session + canHost + IDOR notFound) seeding both editors with HH:mm-normalized hours

## Decisions Made

- **Flat `windows[]` (grouped per weekday for display via `useFieldArray`)** so `form.getValues()` maps 1:1 to `saveOperatingHours`' replace-the-set contract.
- **tz note as a JS template literal** so the real apostrophe in "your space's local time" matches the UI-SPEC copy + grep without a `react/no-unescaped-entities` violation.
- **"Choose a date to block." validated manually** in AddBlockDialog (the calendar always yields a valid `YYYY-MM-DD`); the raw blockSchema date-format message is never shown.
- **`router.refresh()` re-seeds the block list** after add/remove (the actions already `revalidatePath`), so the list stays server-authoritative with no client cache.
- **`cityLabel`/`gmtLabel` derived at render** (`listing.city ?? tz segment`; `Intl` shortOffset → GMT+8) — no schema change.

## Deviations from Plan

None — plan executed exactly as written. All acceptance-criteria greps for all three tasks match, `tsc`/`eslint`/`npm run build` and both dependency tests are green, and no auto-fix (Rule 1/2/3) or architectural (Rule 4) deviation was required.

Minor implementation notes (within-plan, not deviations): (a) the WeeklyHoursEditor keeps `timezone` in its props type for a consistent editor contract but derives the tz note from `cityLabel`/`gmtLabel`, so `timezone` is intentionally un-destructured; (b) the three non-`FormField` label groups in AddBlockDialog (date, whole-day/partial, unit) use plain `Label`/`div` instead of `FormItem`/`FormLabel` to avoid `useFormField` running without a `FormField` name; (c) `useWatch` is used (not `form.watch`) to keep the React Compiler lint clean.

## Issues Encountered

None. Git's LF→CRLF warnings on commit are the expected Windows line-ending normalization (non-blocking).

## User Setup Required

None — no external service configuration required. Verification is a human walkthrough of the running dev server (see the checkpoint items below).

## Threat Model Coverage

- **T-03-IDOR-HOURS** (EoP) — the page re-checks `row.hostId !== session.user.id → notFound()` on top of the (host) layout canHost gate and the Plan-03 action-level `assertOwnership`; another host's listing 404s (existence not leaked).
- **T-03-CLIENTTRUST** (Tampering) — the editors' `zodResolver(weeklyHoursSchema|blockSchema)` is UX only; `saveOperatingHours`/`addBlock` re-validate with the SAME schema server-side (Plan 03).
- **T-03-DESTRUCTIVE-UX** (safety) — all removals are reversible + neutral with a confirm dialog; no `--destructive` styling exists in this phase's UI (grep-verified in blocks-editor.tsx).

## Pending Human-Verify Checkpoint (Task 3 — gate="blocking")

Not self-approved. The reviewer should run the dev server and confirm the items in the "Awaiting" section of the CHECKPOINT REACHED message. On approval: flip AVAIL-01/AVAIL-02 handling per the Phase-3 transition, update STATE.md + ROADMAP.md, and add the plan-metadata docs commit.

## Next Phase Readiness

- **Ready for 03-05 (booker availability calendar):** the shadcn `calendar` + `@date-fns/tz` display pattern is now exercised here (venue-tz date select/format); 03-05 reuses it plus the 03-02 `getAvailability` read model.
- **Blocker:** none for the build; the plan remains open until the human-verify checkpoint is approved.

## Self-Check: PASSED

- All 3 created files present on disk (`weekly-hours-editor.tsx`, `blocks-editor.tsx`, `availability/page.tsx`).
- All 3 task commits found in git log (`b92acda`, `41357fc`, `3a4f8dc`).
- `tsc --noEmit` clean; eslint clean on all three files; `npm run build` succeeds; `hours-validation.test.ts` 18/18 + `blocks.test.ts` 11/11 green.

---
*Phase: 03-availability-the-double-booking-guarantee*
*Completed (build): 2026-07-11 — human-verify checkpoint pending*
