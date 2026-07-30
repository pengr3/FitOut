---
phase: 09-open-capacity-bookings
plan: 12
subsystem: ui
tags: [react, react-day-picker, nextjs, jsdom, vitest, availability, booking, drop-in]

# Dependency graph
requires:
  - phase: 09-04
    provides: "getAvailability's open fork ({remaining, cap, state, dayOpenUtc/dayCloseUtc, openTime/closeTime, bookable}) and the public getOpenMonthAvailability action"
  - phase: 09-07
    provides: "placeOpenHold({listingId, date, requestedPasses}) + the `sold-out` PlaceHoldResult reason + SOLD_OUT_MESSAGE"
  - phase: 09-11
    provides: "the CONTROLLED PassStepper, SpotsLeftChip and DropInBadge presentational primitives"
  - phase: 09-05
    provides: "allInRateParts' /person branch (the fork this plan finally reaches from the listing page)"
provides:
  - "DatePassPicker — the booker-facing drop-in surface: month grid + a single day panel, with no hour picker of any kind"
  - "AvailabilityCalendar forks on the persisted occupancyMode; the exclusive hourly surface is proven byte-identical"
  - "OpenSelectionValue + openSelection/setOpenSelection on the lifted booking-selection context"
  - "RailPassSummary — the open rail branch: date · pass count · EXACT all-in estimate at the server-threaded fee rate"
  - "BookCta open branch: placeOpenHold, the sold-out notice path, and the ?date=&passes=&resume=1 sign-in resume"
  - "the listing page's drop-in rail: /person rate, 'Up to N people a day', the Drop-in badge on the Availability heading"
affects: [09-13, 09-14, 09-15, 09-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fork-after-hooks: a mode fork placed after the hook block keeps hook order stable (rules-of-hooks) while leaving the shipped path byte-unchanged"
    - "Type-only back-import: the forked child imports its parent's types with `import type`, so the runtime dependency stays one-directional"
    - "Callback seam over context reach-in: DatePassPicker writes the lifted selection through an onSelectionChange prop, mirroring SlotPicker"
    - "react-day-picker `disabled` matcher + a matching custom modifier drive a11y state and paint from ONE array"

key-files:
  created:
    - src/components/availability/date-pass-picker.tsx
    - tests/availability/date-pass-picker.test.tsx
  modified:
    - src/components/availability/availability-calendar.tsx
    - src/components/booking/book-cta.tsx
    - src/app/listings/[id]/page.tsx

key-decisions:
  - "The mode fork sits AFTER AvailabilityCalendar's hook block, not at the first line: an early return before the hooks is a rules-of-hooks lint error, and renaming the shipped component to dodge it would have touched the exclusive surface for no behavioural gain"
  - "DatePassPicker receives onSelectionChange as a prop rather than calling useBookingSelection itself — no runtime import cycle, and the picker renders standalone in a test"
  - "The empty-selection CTA hint stays in book-cta.tsx and forks there ('Pick a day above to book.' / 'Pick a time above to book.'); the plan's grep targeted page.tsx, where that copy has never lived"
  - "A new 'Closed for today' day-panel state was added for a date whose closing instant has passed — reachable on any evening browse, and otherwise a silently dead CTA"
  - "A failed month read leaves that month's dates SELECTABLE (fail-open): the claim is the only gate, so a stale full date costs a calm refusal, while failing closed would hide genuinely open dates"

patterns-established:
  - "Byte-identity of a forked surface is MEASURED by rendering the pre-fork component beside the current one at several prop frames, not asserted from a diff"
  - "A payload contract is asserted as a KEY SET (Object.keys().sort()), not by field presence, so a smuggled field fails the test"

requirements-completed: []  # OPEN-02 / OPEN-04 ADVANCED, not closed — see "Requirements" below
requirements-advanced: [OPEN-02, OPEN-04]

# Metrics
duration: 35min
completed: 2026-07-30
---

# Phase 9 Plan 12: The Drop-In Booker Surface Summary

**A drop-in listing now asks "which day?" instead of "which hours?" — a month grid with programmatically disabled full dates, a single day panel, a pre-hold pass stepper, an exact all-in rail estimate, and a Book CTA that sends `{listingId, date, requestedPasses}` and nothing window-shaped — while the exclusive hourly calendar renders byte-for-byte what it rendered before, proven at three prop frames.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-30T12:55Z
- **Completed:** 2026-07-30T13:30Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- **The hour chips are gone, and their absence is enforced.** `date-pass-picker.tsx` mounts no hour-chip component, no chip grid and no whole-day shortcut; the grep gates on that absence are green *and* the comments were reworded so they cannot defeat themselves. A rendered assertion backs the greps: no button in the tree is named like a bare time, and no `data-slot="toggle-group"` exists.
- **A fully booked date is programmatically disabled, not merely greyed.** The full-date set rides in the SAME array as the horizon bounds — `disabled={[{before}, {after}, ...fullMatchers]}` — plus a `modifiers={{ full }}` twin so the a11y state and the paint come from one source. The button carries `disabled` (or `aria-disabled` when it is the roving focus target), a `line-through` numeral and `aria-label="{date} — fully booked"`. **Deleting `...fullMatchers` turns case (3) RED** (`expected false to be true`); restored.
- **The exclusive hourly calendar is byte-identical, MEASURED not asserted.** A throwaway probe rendered the pre-fork component (`git show HEAD~3`) beside the current one at three prop frames with identical props and compared `innerHTML`: **`slots` 100,045 bytes / sha256 `681aa08a…4c61`, `no-hours` 88,736 bytes / `3b62fc0f…9b99`, `none-open` 88,741 bytes / `ff413bd5…50e21` — all three exactly equal.** Changing a single class on the exclusive day heading turned all three RED; restored, `git diff --exit-code` = 0. The probe files were deleted after the run.
- **Booking a drop-in listing sends a date and a head count and nothing else.** Case (6) asserts the *key set* of the object handed to `placeOpenHold` — `["date","listingId","requestedPasses"]` — so an extra field fails even if the required ones are right. **Adding a `startUtc` to the open payload turns it RED** (`expected {…(3)} to deeply equal {…(2)}`); restored.
- **A lost race is calm and server-worded.** `sold-out` joins `taken` in the SHIPPED notice branch (neutral `role="status"`, muted, never red) and in the `router.refresh()` condition. The sentence is never retyped in the component — `grep -c "Just sold out" book-cta.tsx` = 0. **Deleting `|| result.reason === "sold-out"` from the refresh turns case (7) RED** (`expected "vi.fn()" to be called 1 times, but got 0 times`); restored.
- **The date-change reset is enforced where it actually lives.** 09-11 made `PassStepper` deliberately controlled because only the consumer can reset the count to 1 and re-bound the max on a date change. The rail owns `{date, passes}`, and **deleting `setPasses(1)` turns case (4) RED** (`expected '3' to be '1'`); restored.
- **The 09-05-flagged listing-page gap is closed.** `allInRateParts` is now fed the mode and `per_head_price_cents` from the LISTING ROW (`pub` carries neither), so a drop-in listing advertises `₱…/person` instead of a leftover hourly rate — with the shipped `Service fee included` qualifier intact.

## Task Commits

1. **Task 1: DatePassPicker — month grid + day panel** — `17c5b7e` (feat)
2. **Task 2: the open rail — per-person price, pass count, exact estimate** — `9f7cd82` (feat)
3. **Task 3: BookCta open branch + sold-out + the picker test** — `19315ef` (feat)

## Files Created/Modified

- `src/components/availability/date-pass-picker.tsx` **(created, 354 lines)** — the drop-in surface. Framing line + the unchanged `aria-describedby`-linked tz note, the shipped `Calendar` reused verbatim (same `timeZone`, `startMonth`/`endMonth`, `BOOKING_HORIZON_DAYS`, coral `data-[selected-single=true]` override), a per-visited-month full-date map fed by `getOpenMonthAvailability`, and a single day panel with six states. Owns `{date, passes}`; resets to 1 on a date change; clears the lifted selection on loading/error/sold-out/closed.
- `tests/availability/date-pass-picker.test.tsx` **(created, 9 cases)** — jsdom, mocking the two availability actions, `next/navigation` and `@/app/actions/capability`. Drives the REAL fork (`AvailabilityCalendar occupancyMode="open_capacity"` inside `BookingSelectionProvider`, with the real `BookCta`), so the wiring under test is the shipped wiring. Fixtures are clock-relative.
- `src/components/availability/availability-calendar.tsx` — exports `DayLocal` + `OpenSelectionValue`; the context gains `openSelection`/`setOpenSelection`; `AvailabilityCalendar` gains `occupancyMode` + `initialFullDates` and returns `DatePassPicker` for a drop-in listing; new `RailPassSummary`. Exclusive path unchanged.
- `src/components/booking/book-cta.tsx` — one control, two payload shapes behind a discriminated `CtaSelection`; `placeOpenHold` on the open branch; `sold-out` folded into the shipped notice + refresh path; the D-41 resume forked to `?date=&passes=&resume=1`; the empty hint forked to `Pick a day above to book.`
- `src/app/listings/[id]/page.tsx` — `isOpenCapacity` from the listing row drives: the `DropInBadge` on the `Availability` heading, `allInRateParts`' new inputs, `Up to {N} people a day`, `RailPassSummary` vs `RailSelectionSummary`, the server-seeded `initialFullDates`, and the mode-matched sign-in resume (validated with the very `openHoldSchema` `placeOpenHold` enforces).

## Decisions Made

1. **The fork sits after the hook block, not at the first line.** The plan said "at the top of the component body". An early return before `useBookingSelection()` is a hard `react-hooks/rules-of-hooks` lint error, and the alternative (renaming the shipped component and adding a dispatcher) would have edited the exclusive surface's declaration for no behavioural gain. Placing the fork immediately after the memos keeps hook order identical on every render and keeps the diff purely additive. The exclusive day state those hooks hold is unused on the open branch — commented as such.
2. **`DatePassPicker` takes `onSelectionChange` as a prop.** Calling `useBookingSelection()` inside it would create a runtime import cycle (`availability-calendar` → `date-pass-picker` → `availability-calendar`). The prop mirrors how `SlotPicker` already receives `onSelectionChange={setSelection}` one screen down, keeps the two modules acyclic (the only back-reference is `import type`, which is erased), and lets the picker render standalone.
3. **A sixth day-panel state, `Closed for today`, was added.** `openCapacity.bookable` is false once the venue's closing instant for that date has passed — reachable on any evening browse of "today", which the month grid still allows. Without a panel for it, a booker would see `Spots available` with a permanently disabled CTA and no explanation. The copy follows the locked O5 grammar (statement + `Try another day.`).
4. **A failed month read fails OPEN.** Those dates stay selectable. The claim is the only gate (Security V4), so at worst a booker picks a date that has since sold out and gets the calm OC-13 refusal; failing closed would hide dates that are genuinely open, which is the worse error in a marketplace.
5. **The capacity line is written out per branch** (`Up to 1 person a day` / `Up to {N} people a day`) rather than assembled from a `" a day"` suffix. Booker-facing copy that only exists as a concatenation cannot be read or reviewed in one place — and it keeps the plan's `grep -c "people a day"` gate meaningful rather than vacuous.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The prescribed fork position is a lint error**
- **Found during:** Task 1
- **Issue:** `if (occupancyMode === "open_capacity") return <DatePassPicker …/>` at the very top of the component body is an early return before `useBookingSelection()` / `useState` / `useMemo` — `react-hooks/rules-of-hooks` reports it as an error, and this repo requires 0 lint errors.
- **Fix:** The fork was placed immediately after the hook block (still before `handleDaySelect` and the entire exclusive render), with a comment stating why. Behaviour is identical; hook order is stable.
- **Files modified:** `src/components/availability/availability-calendar.tsx`
- **Verification:** `npm run lint` 0 errors; the byte-identity probe shows the exclusive render is unchanged.
- **Committed in:** `17c5b7e`

**2. [Rule 2 - Missing critical] No day-panel state for a date whose window has closed**
- **Found during:** Task 1
- **Issue:** The plan's six-state table has no row for `openCapacity.bookable === false`. That state is reachable every evening (the grid allows "today"; the server's own verdict says the pass window is over), and would have rendered the available panel with a CTA that never enables — a dead end with no reason given.
- **Fix:** Added a seventh branch using the shipped dashed shell: `Closed for today` · `Today's passes are no longer available. Try another day.` No stepper is offered and no selection is written.
- **Files modified:** `src/components/availability/date-pass-picker.tsx`
- **Verification:** Rendered branch; `oc.bookable` gates both the panel and the lifted selection.
- **Committed in:** `17c5b7e`

**3. [Rule 3 - Blocking] `setState`-in-effect lint error in the reworked resume**
- **Found during:** Task 3
- **Issue:** Splitting the D-41 resume effect into two branches (window / open) tripped `react-hooks` "Calling setState synchronously within an effect can trigger cascading renders" on the second `void submit(...)` — an error, not a warning.
- **Fix:** The two resume shapes are normalized into ONE `CtaSelection` by a `useMemo` before the effect, restoring the shipped effect's exact single-call shape (guard → set ref → one `void submit(...)`). The memo is reused by `handleActivate`, which also removed a duplicated ternary.
- **Files modified:** `src/components/booking/book-cta.tsx`
- **Verification:** `npm run lint` 0 errors / 7 baseline warnings; all 9 picker cases still green.
- **Committed in:** `19315ef`

**4. [Rule 2 - Missing critical] Mode-matched resume gating**
- **Found during:** Task 3
- **Issue:** The plan forked the resume shape but not its gating. A `?start=&end=&resume=1` URL on a drop-in listing would auto-fire `placeHold`, which refuses cross-mode — surfacing a refusal notice the booker did nothing to earn on page load.
- **Fix:** Exactly one resume shape survives, chosen by the persisted mode (`resumeWindowForMode`, and the open parse is gated on `isOpenCapacity`). The open pair is validated with the SAME `openHoldSchema` `placeOpenHold` enforces, so the page can never hand the CTA a pair the action would reject.
- **Files modified:** `src/app/listings/[id]/page.tsx`
- **Verification:** `npx tsc --noEmit` 0; full suite green.
- **Committed in:** `19315ef`

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 missing-critical)
**Impact on plan:** All four were required for the plan's own gates (0 lint errors) or for a coherent booker experience. No scope creep — nothing was built that the plan did not ask for.

## Acceptance Gates — results, including the three that were unsatisfiable as written

Every gate the plan prescribed was run. **Three could not hold as written**, for the reason this phase has now hit twelve times; in each case the load-bearing form was verified instead and the code was NOT reshaped to satisfy a broken gate.

| Gate | Result |
|---|---|
| `SlotPicker` in picker == 0 | **0** ✓ (after rewording two comments that named it) |
| `Book full day\|fullDay` in picker == 0 | **0** ✓ (after rewording one comment) |
| `getOpenMonthAvailability` in picker ≥ 1 | **2** ✓ |
| waitlist/notify-me in picker == 0 | **0** ✓ — note the plan's `grep -ci "waitlist\|notify me..."` uses an unescaped `\|` in a BRE and can never fail; the ERE form (`grep -ciE`) was run instead, and it initially found 1 (a comment), now 0 |
| `disabled` ≥ 1 / `line-through` ≥ 1 in picker | **6 / 1** ✓ |
| six copy strings present verbatim | all ≥ 1 ✓ (apostrophe-bearing copy is written as `{"…"}` string expressions, so `react/no-unescaped-entities` passes AND the greps match — `&apos;` would have defeated them) |
| `occupancyMode === "open_capacity"` in calendar == 1 | **1** ✓ |
| removed exclusive lines (`SlotPicker\|CalendarDayButton\|handleDaySelect`) == 0 | **0** ✓ |
| `people a day` in page == 1 | **1** ✓ |
| `serviceFeeBps` in calendar increases ≥ 1 | 3 → **6** ✓ |
| `RailPassSummary` in calendar ≥ 1 | **5** ✓ |
| `"sold-out"` in book-cta == 1 | **1** ✓ |
| `Just sold out` in book-cta == 0 | **0** ✓ |
| `passes:` in book-cta ≥ 1 | **3** ✓ |
| ≥ 7 picker cases / `tests/availability tests/booking` green | **9 cases**, 41 files / 412 tests ✓ |
| **`SERVICE_FEE_BPS` in calendar == 0** | **2 — unsatisfiable as written.** Both occurrences are in the *shipped* `RailSelectionSummary` docblock (lines 303-304), present before this plan and unchanged by it (baseline count: 2). The load-bearing form — **zero CODE references: no import, no fallback expression** — was verified and holds. The new `RailPassSummary` docblock states the same rule while naming the constant's module instead of the constant, so the count did not rise. |
| **`placeOpenHold` in book-cta == 1** | **4 — unsatisfiable by construction.** A threaded prop necessarily appears in the props type, the destructure, the call and the `useCallback` dep list. The load-bearing form — `placeOpenHold` is invoked on, and only on, the open branch of the submit — was verified by reading and by test case (6). |
| **`Pick a day/time above to book.` in `page.tsx` == 1 each** | **0 / 0 — mis-targeted.** That copy has *never* lived in `page.tsx` (baseline: `page.tsx` 0, `book-cta.tsx` 1), so "still prints 1" could not have been true before this plan either. Retargeted to the file that owns it: **`book-cta.tsx` = 1 / 1**, both branches present. Moving copy into the page to satisfy the grep would have forced the page to render two `BookCta` call sites — strictly worse. |

## Requirements

The plan's frontmatter claims `requirements: [OPEN-02, OPEN-04]`, but **neither checkbox was ticked**, deliberately:

- **OPEN-02** ends "…**each paying for their own head(s)** via the existing rail". This plan gets a booker as far as a real pending hold; the paying half is the per-person reserve page + the OC-07 partial-grant alert, which is **09-13**.
- **OPEN-04** is "Availability **and search** show remaining capacity". The availability half is now mounted; the search-card half is **09-14** (`search-result-card.tsx` still forwards `start`/`end` on an open card's link).

`REQUIREMENTS.md`'s traceability rows were updated to record what 09-12 contributed and which plan owns the remainder. Ticking a requirement whose stated behaviour a user cannot yet perform would make the traceability table lie at exactly the moment it matters.

## Issues Encountered

- **A mutation-restore wiped uncommitted work.** `git checkout -- src/components/booking/book-cta.tsx` was used to undo a deliberate mutation, but Task 3 had not been committed yet, so it reverted the whole rewrite to the shipped version. The file was rewritten from context and re-verified (tsc, lint, 9/9 cases, mutation D re-run). Subsequent mutations used a file copy in scratch rather than `git checkout`. **Lesson for later plans: never use `git checkout --` to undo a mutation on a file with uncommitted work — copy the file aside first.**
- `vi.fn()` without a type parameter is not assignable to the CTA's `PlaceHoldFn` prop (green in vitest, red in `tsc`) — a live instance of the platform note that a green `npm test` is not a green `tsc`. Fixed with `vi.fn<(input: unknown) => Promise<PlaceHoldResult>>()`, which also removed an unused-param lint warning and kept the count at the baseline 7.

## Known Stubs

None. Every surface this plan renders is wired to a server-computed value: the day payload and the month full-date set come from 09-04's read model, the scarcity `state` is passed straight through from the server, the rate is composed by `allInRateParts`, and the estimate uses the server-threaded fee rate.

## Known Limitations (deliberate, documented)

1. **A `router.refresh()` does not re-seed the picker's day panel.** `dayAvail`/`fullByMonth` are seeded from props on mount only, so after a sold-out refresh the panel for the date that just sold out is briefly stale until the booker picks another date — which the notice explicitly tells them to do. **This is the shipped exclusive calendar's behaviour too** (`useState(initialDay)`), so it is a consistency, not a regression. Left alone rather than half-fixed: re-seeding the month map alone would render a *selected but disabled* date beside a stale panel, which is worse.
2. **`?date=` does not seed the picked date.** 09-UI-SPEC § 4 has search cards link open listings with `?date=` only; this plan reads `date` only as part of the `resume=1` pair (where the CTA auto-submits anyway). Seeding the initial date from `?date=` — with the horizon/past guards and the month/day server seeds that would have to move with it — belongs with **09-14**, which owns the search-card link.
3. **"No availability yet" vs "Closed on {day}".** The read model's open branch reports "the venue is closed this weekday" as `hasHours: false`, and does not distinguish it from "the host has set no hours at all". The picker therefore renders `Closed on {day}` whenever an open payload has no window, and the shipped `No availability yet` shell when the payload is not an open one (unknown/unpublished listing). Both states are reachable and both are true; a host with no hours anywhere reads `Closed on {day}` for every date rather than the more informative "hasn't set their hours yet". Fixing it properly needs a `hasAnyHours` signal on the read model — not worth an extra public-page query here.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change was introduced — this plan renders and submits through surfaces 09-04 and 09-07 already built and gated.

Threat-register dispositions honoured:
- **T-09-26 (smuggled window)** — the open branch's payload is asserted as an exact key set in test (6); a smuggled `startUtc` fails it.
- **T-09-13 (client-derived scarcity)** — the picker passes the server's `state` straight into `SpotsLeftChip` and computes no threshold; the full-date set is server-computed.
- **T-09-40 (client-side money)** — `RailPassSummary` uses `computeServiceFee` with the server-threaded `serviceFeeBps`; zero code references to the server default; the picker computes no money at all.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

- **09-13 (reserve page)** inherits a working hold path: `placeOpenHold` is now reachable from the UI, and a partial grant already appends the display-only `&requested=N` that 09-13's `PartialGrantNotice` consumes.
- **09-14 (search card)** should note limitation 2 above: an open card's link should carry `?date=` only, and this page does not yet seed the picked date from it.
- **09-15/09-16** still owe 09-UI-SPEC § 5b's remaining drop-in copy forks.
- Repo state: **1009 passed / 4 skipped** (was 1000/4 — the 9 new picker cases), `npx tsc --noEmit` 0, `npm run lint` 0 errors / 7 baseline warnings, `npm run build` exit 0.

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*

## Self-Check: PASSED

- All 5 code/test files listed above exist on disk (`date-pass-picker.tsx` 354 lines).
- All 3 task commits exist in git history: `17c5b7e`, `9f7cd82`, `19315ef`.
- Both throwaway byte-probe files were deleted after the measurement (`git status --short -- src/ tests/` clean).
