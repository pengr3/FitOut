---
phase: 09-open-capacity-bookings
plan: 10
subsystem: listings
tags: [host-wizard, open-capacity, drop-in, occupancy-mode, publish-checklist, mode-lock, copy, react, react-hook-form, jsdom]

# Dependency graph
requires:
  - phase: 02-listing-creation-management
    provides: "the D-01 wizard (STEPS, the RHF single-form autosave, the publish checklist, the booking-mode RadioGroup card pattern), saveListingStep / publishListing"
  - phase: 07-bookings-management-cancellation-notifications
    provides: "the D-77 no-pre-selection cancellation-tier precedent, composeDeadlineLabel (venue-local single-instant rendering)"
  - phase: 09-open-capacity-bookings
    provides: "09-06 publishSchema's mode fork + OCCUPANCY_MODE_VALUES / MODE_LOCKED_MESSAGE / DROP_IN_INSTANT_ONLY_MESSAGE + getModeLockState; 09-01 listing.per_head_price_cents"
provides:
  - "the wizard's `occupancy` step — two equal-weight explanatory mode cards, plain language, neutral selection, no pre-selection on a new listing (OC-08, UI-SPEC O1)"
  - "a mode-forked pricing step: Price per person + People per day for drop-in, hourly/day/group pricing for whole space"
  - "a mode-forked publish checklist (Drop-in cap + Price per person vs Capacity + both rates) — the display half of 07-15's two-places rule"
  - "the booking-mode step removed from the WALKED step list in drop-in mode, with its removal explained once on review (OC-10)"
  - "ModeLockNotice — the OC-17 lock with a reason, an unlock instant and a route out (UI-SPEC O7)"
  - "server-computed mode-lock state + a venue-local unlock label on the listing edit page"
  - "the § 1g host availability-editor note for drop-in listings"
affects: [09-11, 09-12, 09-14, 09-16, host-listing-editor, publish-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Walked-step list: the wizard renders `steps`, a mode-derived subset of `STEPS`, and every index (render guard, checklist link, progress, 'Step X of Y') resolves through it by KEY — no numeric step literal survives in the file"
    - "Copy keyed by enum value: mode card copy is a `Record<OccupancyModeValue, …>` rendered by mapping the exported `OCCUPANCY_MODE_VALUES`, so a future third mode is a compile error at the card list rather than a silently missing card"
    - "Discriminated-union display props: `ModeLockDisplay` makes the count and the unlock label mandatory in the locked branch, so a lock that says only 'you can't' cannot typecheck (the type-level form of copy rule O7)"
    - "Evidence-based 'was this ever chosen': a NOT NULL DEFAULT column cannot record a click, so the wizard asks whether the ROW carries evidence of a human decision instead of adding a column"
    - "One-string sentence assembly for any copy that interpolates a value, so SWC's JSX whitespace transform cannot drop a space (the cancellation-fee-notice defect)"

key-files:
  created:
    - src/components/host/mode-lock-notice.tsx
    - tests/listing/wizard-occupancy.test.tsx
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/app/(host)/host/listings/[id]/edit/page.tsx
    - src/app/(host)/host/listings/[id]/availability/page.tsx

key-decisions:
  - "A brand-new draft shows NO mode card selected, derived from row EVIDENCE rather than a new column: `occupancy_mode` is NOT NULL DEFAULT `exclusive`, so a fresh draft already reads exclusive without anyone deciding. Accepted residual: a host who picks Whole space and abandons the draft before entering any price sees it unselected on return — the safe direction to be wrong in."
  - "The review step's instant-only explanation renders the SHARED `DROP_IN_INSTANT_ONLY_MESSAGE` constant instead of a retyped literal, so the sentence a host reads and the sentence publishSchema refuses with cannot drift. This trades the plan's source grep for a rendered-output assertion."
  - "Every render guard migrated from `step === N` to `currentKey === \"key\"` — beyond the plan's checklist-only mandate — because the walked list is mode-dependent, so an index guard would render the wrong screen with a green typecheck."
  - "The `People per day` field binds the SAME RHF name as the details step's `Max occupancy` (D-124): one value, two views, no second piece of state."
  - "09-06's deferred Zod-message issue is left as-is: the wizard never surfaces publishListing's fieldErrors inline, so DROP_IN_CAP_REQUIRED_MESSAGE reaches no host today — the checklist row `Drop-in cap` is what they read."

metrics:
  duration-minutes: 42
  tasks-completed: 3
  files-changed: 5
  completed: 2026-07-30
---

# Phase 9 Plan 10: Host Wizard Occupancy Fork Summary

A host can now actually choose how their space is sold: a dedicated wizard step with two equal-weight
explanatory cards, a pricing step that asks only the questions the chosen mode poses, a booking-mode step
that disappears for drop-in listings and says so on review, a publish checklist that names what *that*
mode's gate really requires, and an OC-17 lock that states why, until when, and how to lift it sooner.

## What Shipped

### The occupancy step (Task 2)

`STEPS` gains `{ key: "occupancy", title: "How do people use your space?" }` immediately before `pricing`.
The whole-space flow is now `type → details → location → photos → occupancy → pricing → booking →
cancellation → review` (9 steps).

The two cards clone the shipped booking-mode `RadioGroup` markup byte-for-byte — same `label` wrapper, same
`cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4", selected && "border-primary")`, same
`RadioGroupItem className="mt-1"` — with the UI-SPEC § 1b copy verbatim, a `DoorClosed` / `Users` glyph
each, and a muted worked-example line. **The coral count in `wizard.tsx` is unchanged at 3**: neither card
introduces brand colour, because coral would advertise a recommendation the product deliberately does not
make (09-CONTEXT: the same space type goes both ways).

Card copy is a `Record<OccupancyModeValue, …>` rendered by mapping the exported `OCCUPANCY_MODE_VALUES`, so
the union is never retyped and a third mode would be a compile error here rather than a missing card.

### No pre-selection — and the wrinkle the plan could not have known

The plan defines a NEW listing as "one whose stored `occupancyMode` the wizard has never written". **That
distinction is not directly observable:** unlike `cancellation_policy` (nullable, the D-77 precedent this
rule is modelled on), `listing.occupancy_mode` is `NOT NULL DEFAULT 'exclusive'`, so `createDraftListing`
produces a row that already reads `exclusive` without anyone having decided anything.

Rather than add a column to record a click, `hasChosenMode(listing)` asks whether the row carries **evidence
of a decision**:

1. the stored mode is the non-default one — that value can only have come from a deliberate write; or
2. the listing is no longer a `draft` — it passed the publish gate, which validates the listing *against*
   its mode, so showing it unselected would misstate how the space is sold today; or
3. it already carries pricing only one mode uses (`hourlyRateCents` / `dayRateCents` / `perHeadPriceCents`)
   — the host has been through the mode-forked pricing step, which sits immediately after this one.

Only when none holds does the RHF default become `undefined` and both cards render unselected.

**Accepted residual, documented in the code:** a host who picks `Whole space` and abandons the draft *before*
entering any price sees the card unselected on return. That is the safe direction to be wrong in — the
alternative is pre-selecting a whole-space listing for someone who never read the screen, which is exactly
the mis-selling the step exists to prevent. A **locked** listing always has bookings, hence is published,
hence satisfies (2) — so the lock can never render with nothing selected.

### The OC-17 lock (Task 2)

`src/components/host/mode-lock-notice.tsx` — a neutral `alert` (default variant; the destructive variant
appears nowhere in this phase), `Lock` glyph, rendered **above** the cards so the reason is read first.

Both data props are **required**, and the wizard's prop is a discriminated union:

```ts
export type ModeLockDisplay =
  | { locked: false }
  | { locked: true; lockedByCount: number; unlocksAtLabel: string };
```

so there is no shape of this type that renders "you can't change this" with no count and no date. That is
copy rule O7 expressed in the type system rather than in a review comment.

`edit/page.tsx` joins `getModeLockState(db, id)` into its existing `Promise.all` and composes the unlock
instant with the shipped `composeDeadlineLabel(unlocksAt, row.timezone, row.city)` → `Fri, Aug 8, 10:00 PM
(Makati time)`. **The component formats nothing** (D-105): a client-side `format()` would render the host's
own browser clock, a different instant from the one the lock actually lifts at.

When locked, the stored mode's card stays selected; the other gets `aria-disabled="true"`,
`pointer-events-none`, `opacity-60`, a `Lock` glyph **and the visible word `Locked`** (never opacity-only),
and its `RadioGroupItem` is `disabled` so the keyboard cannot reach it either. The `RadioGroup` carries
`aria-describedby={MODE_LOCK_NOTICE_ID}`, so the reason is announced rather than merely visible.

Both the render lock and `saveListingStep`'s server-side refusal (09-06) are commented as **two halves of
one guard** — a stale tab never sees the disabled card at all (T-09-19).

### Mode-forked pricing, review and checklist (Task 3)

| | drop-in (`open_capacity`) | whole space (`exclusive`) |
|---|---|---|
| Pricing step | `Price per person` (currency-prefixed, cloned from the shipped rate field) + `People per day` | **unchanged** — `Hourly rate`, `Day rate`, `Group pricing` block |
| Walked steps | 8 — `booking` removed (OC-10) | 9 |
| Review | summary line + the instant-only explanation | unchanged |
| Checklist | Title · Description · Space type · Address · **Drop-in cap** · **Price per person** · 3+ photos · Cancellation policy | Title · Description · Space type · Address · **Capacity** · **Hourly rate** · **Day rate** · 3+ photos · Cancellation policy |

`People per day` binds the **same RHF name** as the details step's `Max occupancy` — one value, two views,
never a second piece of state (D-124). The details step's helper is mode-aware too, so the number is
introduced as "your drop-in cap" the first time the host meets it.

The booking-mode step is removed from the list the wizard **walks**, not merely skipped, so `Step X of Y`
and the progress bar stay truthful. Its removal is explained once, on review:

> Drop-in passes are always instant — people book without waiting for your approval.

alongside `Drop-in passes · ₱350.00 per person · up to 30 people a day · Instant book`. Both render whether
or not the listing is publish-eligible — a listing that is ready to publish needs the explanation just as
much as one that is not.

### The index migration (Task 1, done in isolation first)

The publish checklist carried bare numeric link targets. Inserting a step would have silently repointed
every row after it — click "Hourly rate", land on photos. Task 1 migrated them to `stepIndex("<key>")` as a
pure refactor with **zero behaviour change** (`tests/listing` 67/67, byte-identical rendered output), so the
diff that inserts the step could not hide a renumbering bug.

Task 2 then extended the same discipline to the render guards (`step === 4` → `currentKey === "pricing"`),
which the plan did not explicitly require but which is **load-bearing**: in drop-in mode index 6 is
`cancellation`, not `booking`, so index-keyed guards would render the wrong screen with a green typecheck.
Task 3 moved `stepIndex` (and `CANCELLATION_STEP`, name preserved) into the component so they resolve
against the **walked** list. `grep -c 'STEPS.length'` is now **0**.

### Host availability editor (Task 3)

One muted line, open mode only, under the existing subtitle. The editor is otherwise untouched.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run tests/listing` | 10 files / **77 passed** (was 9 / 67) |
| `npm test` (full suite) | **968 passed / 4 skipped**, 106 files (was 958 / 4) |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors / 7 baseline warnings (unchanged) |
| `npm run build` | exit 0 |

### Mutation proof — both executed RED, both restored

`tests/listing/wizard-occupancy.test.tsx` is 10 jsdom cases. Two mutations were run against shipped code:

1. **Stop removing the booking step** (`const steps = STEPS`) → case 3 RED:
   `Unable to find an element with the text: Step 1 of 8`.
2. **Drop the non-colour lock affordances** (delete `aria-disabled` and the `Locked` glyph/word) → case 8
   RED: `AssertionError: expected null to be 'true'`.

Both restored; suite back to 10/10 and `tsc` clean.

**The open fixture deliberately keeps its hourly and day rates** — 09-07's lesson: a drop-in listing *can*
still carry them, because 09-06 requires a price per person but never clears the exclusive columns and
OC-17 permits the switch. A fork keyed on "the rates happen to be null" would pass against a null-rate
fixture and then render an hourly-rate field on a real converted listing. With the rates populated, cases 1
and 6 can only pass if the fork keys on the **mode**.

Case 10 carries its own positive control: a brand-new draft must have **no** radio `aria-checked="true"`,
*and* an existing published listing must have exactly one — without the second half, the first would also
pass if no card could ever select.

## Deviations from Plan

### Auto-fixed / decided

**1. [Rule 3 - Blocking] `occupancy_mode` is NOT NULL, so "the wizard has never written it" is unobservable**
- **Found during:** Task 2
- **Issue:** The plan (and UI-SPEC § 1b) define no-pre-selection in terms of an unwritten stored mode, which
  works for the nullable `cancellation_policy` it is modelled on but not for a `NOT NULL DEFAULT 'exclusive'`
  column — every fresh draft already reads `exclusive`.
- **Fix:** `hasChosenMode(listing)` derives the answer from row evidence (non-default mode ∨ not a draft ∨
  mode-specific pricing present). No migration, no new column, no change outside the plan's file list.
- **Files:** `wizard.tsx`
- **Commit:** 706b880

**2. [Decision] The instant-only line is the shared constant, not a retyped literal**
- The plan's acceptance grep expects `Drop-in passes are always instant` **in `wizard.tsx`** (would be 1).
  It is **0**: the wizard imports `DROP_IN_INSTANT_ONLY_MESSAGE`, which 09-06 created expressly so "the
  publish gate, the wizard checklist and the tests can never drift into three slightly different sentences",
  and where the literal still appears exactly once. The grep's *purpose* — the removal is explained in those
  exact words — is met more strongly: the sentence cannot drift, and case 5 asserts it verbatim in rendered
  output. Substitute grep: `grep -c 'DROP_IN_INSTANT_ONLY_MESSAGE' wizard.tsx` → 2 (import + use).

**3. [Rule 2 - Missing critical] Render guards migrated to step keys**
- The plan's Task 1 scoped the index migration to the checklist. The JSX still selected screens by numeric
  index, which is the same defect with a worse blast radius once the walked list became mode-dependent
  (index 6 is `booking` in one mode and `cancellation` in the other). All render guards, the `h1`, the
  stepper, the progress bar and the nav now resolve through the walked list by key.
- **Commits:** 706b880, 1bf505e

**4. [Rule 3] Two self-defeating acceptance greps in the new component** — the seventh occurrence of this
pattern in Phase 9. `mode-lock-notice.tsx`'s header quoted the link label (making `View your bookings`
count 2, not 1) and named the alarm alert variant while explaining it is never used (making `destructive`
count 1, not 0). Both comments reworded; the markup was already correct, so the tripwires stay usable.

**5. [Unsatisfiable grep, same class as 09-02/09-06/09-07/09-08]**
`grep -c "getModeLockState" edit/page.tsx` is specified as 1 but counts **2** — a named import always adds a
line. Count call sites instead: `grep -c "getModeLockState(" edit/page.tsx` → **1**.

**6. [Rule 3] `ResizeObserver` is undefined in jsdom** — Radix's radio indicator measures itself with one.
Stubbed **in the test file**, not in `tests/setup.ts`, to keep the blast radius local; the measurement plays
no part in anything asserted (all copy, ARIA state and field presence).

**7. [Addition] `perHeadPriceCents` reached neither `toPayload` nor `defaultValues`**
- The field was in `draftSchema` and written by `saveListingStep` (09-06), but the wizard never sent or
  seeded it, so a `Price per person` input would have autosaved nothing. Added alongside `occupancyMode`.
  Same for the `occupancyMode` payload key — without it the host's choice would never persist.

**8. [Addition] Defensive step clamp** — `Math.min(step, steps.length - 1)`. Today the mode can only change
*on* the occupancy step, whose index is identical in both walked lists, so the list cannot shrink out from
under a later step. A white screen is an expensive way to discover a future edit broke that property.

## Deferred Issues

**09-06's Zod `superRefine` gap is left exactly as it was, deliberately.** A *missing* drop-in cap surfaces
Zod's generic `invalid_type` message rather than `DROP_IN_CAP_REQUIRED_MESSAGE`, and the plan offered this
plan the choice of fixing it. It is **inert on this surface**: `handlePublish` surfaces only
`res.error` as a toast and never renders `publishListing`'s `fieldErrors` inline, so that message reaches no
host today. What the host actually reads is the checklist row — now correctly labelled **`Drop-in cap`**,
with a Fix link to the pricing step. Changing the Zod wording would alter nothing visible. 09-06's two clean
fixes (object-level-optional + per-mode requirement, or copy substitution in `publishListing`) remain open
for whichever plan first renders field errors inline.

## Known Stubs

None. Every control added is wired end to end: the mode card writes `occupancyMode` through `toPayload` →
`saveListingStep` → the column; `Price per person` writes `perHeadPriceCents` the same way; the lock is
computed from the live booking set by `getModeLockState`, not from a placeholder; and the checklist rows
read live RHF values.

## Threat Flags

None. Every surface touched is inside the plan's own register — T-09-19 (the locked control is presentation
only; `saveListingStep` re-reads the persisted mode and the live lock state), T-09-35 (the checklist is a
courtesy; `publishListing` re-parses the PERSISTED row through the mode-forked `publishSchema` — this plan
changes only which rows are DISPLAYED), T-09-36 (its own step, two equal-weight cards, no pre-selection, the
cap rendered again under the label it performs), T-09-37 (accepted — the lock names a count and an instant,
never a guest). No new network endpoint, auth path, file access or schema change; zero migrations.

## Requirement Status

`OPEN-01` ("Host can set a listing to open-capacity mode with a per-head price and a capacity cap") is now
marked **Complete**. 09-06 shipped the server half — the gate, the copy constants, the lock — and left the
requirement Pending because no host could reach a control. This plan is that control: the mode is chosen on
its own screen, the per-person price and the daily cap are entered on the pricing step, and both are
persisted through the existing autosave.

## Self-Check: PASSED

- `src/components/host/mode-lock-notice.tsx` — FOUND
- `tests/listing/wizard-occupancy.test.tsx` — FOUND
- `76ea317` (task 1), `706b880` (task 2), `1bf505e` (task 3) — all FOUND in `git log`
