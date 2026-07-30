---
phase: 09-open-capacity-bookings
plan: 13
subsystem: ui
tags: [drop-in, open-capacity, price-breakdown, partial-grant, reserve-page, oc-07, oc-08, d-49, d-126, rsc]

requires:
  - phase: 09-07
    provides: placeOpenHold (mints the hold, reports the GRANTED count, appends a display-only `&requested=N`) and the D-126 refusal in updateDeclaredPax
  - phase: 09-11
    provides: PassStepper / StepperControl / SpotsLeftChip / DropInBadge and the three-file zero-arithmetic grep gate
  - phase: 09-08
    provides: composeWhenLabel's drop-in branch (`{date} · Drop-in pass, any time {open} – {close} ({City} time)`) and composeDateLabel
  - phase: 09-09
    provides: the `booking.open_capacity` projection already on the reserve page
provides:
  - "PriceBreakdown reads `₱350.00/person × 3 passes` behind two OPTIONAL props, with every exclusive call site byte-identical"
  - "PartialGrantNotice — the OC-07 reduction alert: persistent, polite live region, both server-computed figures, `Nothing has been charged yet.`, `Pick another date` escape route"
  - "The reserve page's drop-in fork: day-and-pass summary, Drop-in badge, per-person run line, NO stepper (D-126), NO D-108 surcharge line"
  - "A hostile `?requested=` is integer-checked, gated and clamped to [granted+1, cap] and drives ONLY a display estimate"
  - "composeDateLabel(instant, timezone, city?) — the venue-time suffix, single-sourced"
affects: [09-14, 09-15, 09-16, phase-10]

tech-stack:
  added: []
  patterns:
    - "Optional-props extension on a UAT-passed money surface (the D-108 device) instead of a discriminated union — 09-UI-SPEC Open Q10"
    - "RSC page tests: await the async page to a tree, render it, and serve its reads from a table-keyed db.select() stub"
    - "Byte-identity probes over a forked shipped surface (09-11/09-12 discipline), executed with a mutation and deleted"

key-files:
  created:
    - src/components/booking/partial-grant-notice.tsx
    - tests/booking/price-breakdown-open.test.tsx
    - tests/booking/partial-grant-notice.test.tsx
  modified:
    - src/components/booking/price-breakdown.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/lib/booking/when-label.ts

key-decisions:
  - "The OC-07 alert lives INSIDE the reserve page's `summary` node, not beside ReserveView — ReserveView drops `summary` on expiry, so a lapsed hold can never render 'your booking is set to N passes' next to 'Your hold expired'"
  - "The plan's prescribed clamp `Math.min(Math.max(raw, granted+1), cap)` is unconditionally >= granted+1, so as written it fired the notice for EVERY integer including `?requested=1`; the meaningfulness gate (`raw > granted`) was separated from the clamp"
  - "The requested ceiling is floored at granted+1 (`Math.max(maxOccupancy ?? 0, granted+1)`) so a host editing max_occupancy DOWN during a live hold cannot silence a genuine reduction"
  - "`showSurcharge` and `chargesPerHead` both gained a `!bk.openCapacity` term: a drop-in listing can still carry leftover `included`/`extra_head_fee` columns (09-07), and without the term the page would disclose an Extra-guests line for centavos not in the frozen price and mount a stepper every press of which fails (D-126)"
  - "`Pick another date` is a plain link, not a release action — the hold lapses on its own TTL and OC-15 returns its passes automatically (proven in 09-09); a side effect on a GET navigation would be the wrong shape"
  - "A null per-head price suppresses the whole notice rather than rendering a ₱0.00 estimate — unreachable on a published open listing (09-06's gate), and silence beats a false figure"

patterns-established:
  - "Money figures reach an alert PRE-FORMATTED: PartialGrantNotice imports no money helper at all, and a grep asserts it"
  - "Any acceptance grep of the form `\\* ` bans every JSX block comment in the file — structural notes move to `//` comments above the return"

requirements-completed: [OPEN-02]

duration: 42min
completed: 2026-07-30
---

# Phase 9 Plan 13: Drop-in money surface + the OC-07 reduction alert — Summary

**The reserve page now states a DAY and a pass count with a `₱350.00/person × 3 passes` run line, and a partial grant is announced above the confirm with both money figures and "Nothing has been charged yet." — non-dismissable, never destructive, and provably ahead of the coral CTA in the tab order, while all five exclusive reserve-page frames render byte-for-byte what they did before.**

## Performance

- **Duration:** ~42 min
- **Started:** 2026-07-30T21:34Z
- **Completed:** 2026-07-30T22:03Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- **OC-07 ships as the spec's "must not get wrong" interaction.** `PartialGrantNotice` is a neutral shadcn `alert` with a polite live region, an `Info` glyph, no close control and no state that can hide it. It states the granted count, the frozen new total, the display-only old estimate and the literal sentence `Nothing has been charged yet.`, then offers one neutral `outline` escape route. It imports no money helper of any kind — asserted by grep.
- **The reduction is reachable BEFORE the money.** The alert is the first child of the reserve page's `summary` node; `ReserveView` renders the summary column ahead of the action column, so `alert.compareDocumentPosition(confirm) & DOCUMENT_POSITION_FOLLOWING` is truthy — asserted, and turned RED by moving the alert below `ReserveView` (executed, restored).
- **A tampered `?requested=` cannot move the charge or render an absurd figure.** `?requested=99999` on a 4-cap listing renders the estimate for **4** and never the string `99999`, while `You'll pay …` still names the frozen quote for the ONE granted pass. Junk (`abc`, `1.5`, `-5`, `""`, `0`, `1e`, `Infinity`, `NaN`) renders no notice and does not throw.
- **`PriceBreakdown` reads per person and still sums nothing.** Two optional props, the run label forked FIRST on `passes != null`, and a deliberately incoherent frame (per-head × count ≠ either figure on screen) proves the SERVER's numbers are what render.
- **The exclusive surface was PROVEN unchanged, not declared so.** Two throwaway probes rendered the pre-fork components beside the current ones and compared sha256 over the serialized DOM: 4 breakdown frames and 5 whole-page frames, all equal; one class change turned all of them RED. Probes deleted.
- **Two real defects the plan did not name were closed** (see Deviations): a drop-in booking would have shown a D-108 "Extra guests" line and mounted a dead head-count stepper, both driven by leftover exclusive columns that 09-06 never clears.

## Task Commits

1. **Task 1: PriceBreakdown reads per person** — `0557e35` (feat)
2. **Task 2: PartialGrantNotice** — `b1c35a5` (feat)
3. **Task 3: the reserve page's drop-in fork** — `605f8f0` (feat)

## Files Created/Modified

- `src/components/booking/partial-grant-notice.tsx` (new, 106 lines) — the OC-07 alert. Every figure is a pre-formatted server prop; the body is assembled with each text run in its own expression container so SWC's JSX whitespace transform cannot glue words together.
- `src/components/booking/price-breakdown.tsx` — `perHeadPriceCents?: number | null` + `passes?: number | null`; the run label forks to `{₱rate}/person × {N} pass(es)` before the fullDay/hourly resolution.
- `src/app/listings/[id]/book/page.tsx` — the drop-in summary block, the alert mount + both server-computed figures, the `?requested=` clamp, the two mode gates, and the per-person breakdown props.
- `src/lib/booking/when-label.ts` — `composeDateLabel` gains an OPTIONAL `city`, so the alert title can name the zone (rule O10) without a fourth copy of the suffix rule. 09-09's call site is byte-unchanged (two args).
- `tests/booking/price-breakdown-open.test.tsx` (new, 5 cases).
- `tests/booking/partial-grant-notice.test.tsx` (new, 13 cases — 5 component + 8 reserve-page).

## Decisions Made

See `key-decisions` in the frontmatter. The two with the widest blast radius:

1. **The alert lives inside `summary`, not beside `ReserveView`.** "Top of the reserve page" (§ 3) is satisfied either way, but only one of them disappears when the hold lapses. A booker reading "Your hold expired" must not simultaneously be told their booking is set to N passes.
2. **Both mode gates key on `booking.open_capacity`, never on the listing's columns.** 09-07 established that a drop-in listing can still carry `hourly_rate_cents`, `day_rate_cents`, `included` and `extra_head_fee` — 09-06 requires a per-head price to publish but never clears the exclusive ones, and OC-17 permits the switch. The test fixture deliberately keeps all four, so the fork can only pass by reading the mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A drop-in booking would have disclosed a D-108 "Extra guests" surcharge line**

- **Found during:** Task 3
- **Issue:** `paxSurcharge({included, extraHeadFee, declaredPax})` is recomputed on this page from LIVE listing columns. An open listing that still carries `included: 1, extra_head_fee: 10000` (legal per 09-06/OC-17) with `declared_pax: 3` produces a 2-head, ₱200.00 surcharge — centavos that are **not** in the frozen price, since `quoteOpenCapacity` freezes `perHead × heads` with no surcharge term. The page would have disclosed them AND dropped the run line to a "base" that is not what was charged.
- **Fix:** `showSurcharge` gained a leading `!bk.openCapacity` term, with the reasoning recorded inline.
- **Files modified:** `src/app/listings/[id]/book/page.tsx`
- **Verification:** case (12) asserts no `Extra guests` text on a 3-pass drop-in booking whose listing carries the surcharge columns; deleting the term turns it RED (`expected <span …> to be null` — executed, restored).
- **Committed in:** `605f8f0`

**2. [Rule 2 - Missing critical functionality] A drop-in booking would have mounted a head-count stepper that can never succeed (D-126 / T-09-25)**

- **Found during:** Task 3
- **Issue:** The plan says "do NOT mount `PaxStepper`", but the shipped mount gate is `(lst.extraHeadFee ?? 0) > 0` — a property of the LISTING. On the same legal drop-in listing above, the stepper mounts, and every press calls `updateDeclaredPax`, which 09-07 makes refuse every open row outright. A visible control whose only outcome is a refusal is worse than its absence.
- **Fix:** `chargesPerHead` gained the same `!bk.openCapacity` term, with a comment naming D-126 and why the absence is a decision.
- **Files modified:** `src/app/listings/[id]/book/page.tsx`
- **Verification:** case (11) asserts `How many people are coming?`, `How many passes?`, both stepper aria-labels and `#declared-pax` are all absent; deleting the term turns it RED (`expected <label …> to be null` — executed, restored). Case (13) proves the exclusive stepper still mounts off the same columns.
- **Committed in:** `605f8f0`

**3. [Rule 1 - Bug] The plan's prescribed `requested` clamp fired the notice on every integer, including `?requested=1`**

- **Found during:** Task 3
- **Issue:** The plan's own code is `Math.min(Math.max(rawRequested, granted + 1), cap)` followed by `showPartial = … requested > granted`. The lower clamp forces `requested >= granted + 1` **unconditionally**, so `requested > granted` is then true for any integer — directly contradicting the plan's own test "`?requested=1` and `declared_pax=1` → no notice renders".
- **Fix:** The meaningfulness gate was separated from the clamp: `Number.isInteger(raw) && raw > granted ? Math.min(Math.max(raw, granted + 1), ceiling) : null`. The clamp is retained (the acceptance grep counts it, and it is the belt to the gate's braces). The ceiling is additionally floored at `granted + 1` so a host editing `max_occupancy` down mid-hold cannot collapse the range and silence a real reduction.
- **Files modified:** `src/app/listings/[id]/book/page.tsx`
- **Verification:** cases (8), (9) and (10); removing the clamp turns (10) RED (`expected 'Only 1 left for Friday, Aug 8 (Makati…' to contain 'You picked 4 passes'` — executed, restored).
- **Committed in:** `605f8f0`

**4. [Rule 3 - Blocking] `composeDateLabel` could not produce the tz-named title the alert's contract requires**

- **Found during:** Task 3
- **Issue:** The plan's `dateLabel` prop is specified as "venue-local, tz named (D-105)", and rule O10 requires the zone to be named — but 09-09's `composeDateLabel` deliberately returns no city suffix, and hand-rolling `` `${label} (${city} time)` `` on the page is precisely the fourth copy `when-label.ts` exists to prevent.
- **Fix:** `composeDateLabel(instant, timezone, city?)` — an OPTIONAL third arg appending the same suffix `compose` uses. 09-09's two-arg call site is byte-unchanged (the D-108 optional-prop device again).
- **Files modified:** `src/lib/booking/when-label.ts` (not in the plan's `files_modified`)
- **Verification:** `npx tsc --noEmit` 0; `tests/booking/when-label.test.ts` unchanged and green; case (6) asserts `Only 1 left for Friday, Aug 8 (Makati time)`.
- **Committed in:** `605f8f0`

---

**Total deviations:** 4 auto-fixed (2× Rule 1, 1× Rule 2, 1× Rule 3)
**Impact on plan:** All four are correctness/trust fixes on a money surface. Two of them (1 and 2) exist only because a drop-in listing can legally retain exclusive pricing columns — the exact trap 09-07's summary flagged as "THE ONE THING TO REMEMBER". No scope creep: nothing outside the plan's stated surfaces was touched.

## Issues Encountered

**Two more self-defeating / unsatisfiable acceptance greps (the 13th and 14th this phase).**

| Prescribed grep | Prescribed result | Actual | Resolution |
|---|---|---|---|
| `grep -c "PartialGrantNotice" "src/app/listings/[id]/book/page.tsx"` == 1 | 1 | **2** | A named import always adds a line — the same finding as 09-02's `openTakenSql`, 09-06's `getModeLockState` and 09-07's `reason: "sold-out"`. The load-bearing form is `grep -c "<PartialGrantNotice"` == **1** (the single mount), verified. |
| `grep -c "formatMoney\|computeServiceFee\|\* " partial-grant-notice.tsx` == 0 | 0 | **1** initially | `\* ` matches the opening of **every JSX block comment** (`{/* …`). The gate is satisfiable but bans JSX comments outright in that file, so the two structural notes moved to `//` comments above the `return`. Now **0**. Worth knowing before anyone adds a `{/* … */}` there. |

Also, `grep -c 'role="status"'` returned 2 on the first draft because the component's own comment quoted the attribute — the recurring "a comment that trips its own tripwire" pattern, 8th occurrence this phase. Comment reworded; the literal now appears exactly once, in the markup.

**A plan test expectation that was wrong.** The prescribed junk list for case (9) is fine, but `3e2` (which I had added) is **not** junk — `Number("3e2") === 300`, an integer, correctly clamped to the cap. It was moved out of the junk list and the clamping behaviour is covered by case (10) instead. Documented in the test.

**Grep findings recorded, as the plan asks:**

| Grep | Result |
|---|---|
| `grep -c "/person × " price-breakdown.tsx` | **1** |
| `grep -c "perHeadPriceCents?: number \| null" price-breakdown.tsx` | **1** |
| `grep -c "passes \* \|passes\*\|× passes" price-breakdown.tsx` | **0** |
| shipped tripwire `grep -rci "Taxes and fees" src/` | **0** files matching (unchanged) |
| shipped tripwire `grep -rc "no added fees\|no hidden fees\|final price" src/` | **0** files matching (unchanged) |
| `grep -c "Nothing has been charged yet." partial-grant-notice.tsx` | **1** |
| `grep -c "destructive\|line-through" partial-grant-notice.tsx` | **0** |
| `grep -c 'role="status"' partial-grant-notice.tsx` | **1** |
| `grep -c "Pick another date" partial-grant-notice.tsx` | **1** |
| `grep -c "PaxStepper" book/page.tsx` | **2** — UNCHANGED from the pre-task baseline of 2 (import + mount), and the open branch does not mount it |
| `grep -c "Math.min(Math.max(" book/page.tsx` | **1** |
| `grep -c "D-126" book/page.tsx` | **1** |
| `grep -c "hours\|duration" book/page.tsx` | **5** (baseline 4 + one new comment at :332). Occurrences: :171 and :332 comments, :180 `windowHours`, :348 the EXCLUSIVE run-length line, :407 the `hours` prop. **The open branch (:335-341) contains none** — read and recorded; case (12) additionally asserts no `/\d+ hours?/` in the rendered drop-in page. |

## Byte-identity evidence (the "prove it, don't assert it" criterion)

Both probes rendered the pre-fork module (`git show HEAD:…`) beside the current one under identical props and hashed the serialized DOM. **Deleted after the run**; `git status --short -- src/ tests/` is clean of them.

**PriceBreakdown (Task 1) — 4 exclusive frames, all equal:**

| Frame | Bytes | sha256 (both sides) |
|---|---|---|
| hourly, no surcharge, with fee | 853 | `b33c3058a00acd49…d48e` |
| full day | 855 | `47cc333f7608a3fc…0b5b` |
| hourly + D-108 surcharge + runPrice base | 1032 | `8de11af103e14376…5232` |
| legacy pre-D-74 row (no fee line) | 691 | `82738a337b978f20…1102` |

Mutation: `/hr ×` → `/hr x` turned 3 of 4 RED; restored.

**Reserve page (Task 3) — 5 exclusive frames, all equal (clock frozen so `HoldCountdown` digits are deterministic):**

| Frame | Bytes | sha256 (both sides) |
|---|---|---|
| hourly + D-108 surcharge + stepper | 11005 | `5c950602eabd2ff3…8eb4` |
| hourly, flat listing (no stepper, no surcharge) | 4986 | `f4f3fd121fe1772d…2ebe3` |
| full day | 4967 | `49e457dd4f2ab8d7…6938` |
| legacy pre-0016 row (null fullDay, null split) | 3973 | `2d52c9904776722c…9d3` |
| approved request (pay-on-approval reuse) | 4986 | `f4f3fd121fe1772d…2ebe3` |

Mutation: `p-4` → `p-5` on the exclusive summary block turned all 5 RED; restored (`git diff` clean).

## Mutations executed and restored

| # | Mutation | Result |
|---|---|---|
| M1 | drop `!bk.openCapacity` from `showSurcharge` | case (12) RED — `Extra guests` line appears on a drop-in booking |
| M2 | drop `!bk.openCapacity` from `chargesPerHead` | case (11) RED — the head-count stepper mounts on a drop-in booking |
| M3 | replace the clamp with the raw value | case (10) RED — `You picked 99999 passes` and an absurd estimate |
| M4 | move the alert below `ReserveView` | case (6) RED — `expected +0 to be truthy` (no longer precedes the confirm) |
| M5 | `/hr ×` → `/hr x` in the breakdown | 3 of 4 identity frames RED |
| M6 | `p-4` → `p-5` on the exclusive summary block | all 5 page identity frames RED |

All six restored; the suite is green and `git diff` shows no residue.

## Verification

| Gate | Result |
|---|---|
| `npm test` | **1027 passed / 4 skipped** (112 files + 1 skipped) — up from the 1009 baseline (+18) |
| `npx tsc --noEmit` | **0** |
| `npm run lint` | **0 errors / 7 baseline warnings** (unchanged) |
| `npm run build` | **exit 0** — `✓ Compiled successfully in 11.8s`, 21 static pages |
| `npx vitest run tests/booking` | 28 files / 286 tests, exit 0 |

## Known Stubs

None. No placeholder copy, no hardcoded empty data, no unwired component.

## Threat Flags

None. This plan adds no endpoint, no auth path and no schema change. The one attacker-controlled input (`?requested=`) is already in the plan's register as T-09-24 and is mitigated as specified: integer-checked, gated, clamped, and used only to compose a display estimate — case (10) asserts the clamped value drives the rendered figure while the charge stays the frozen `quoted_total_cents`.

Threat register dispositions, all `mitigate`, all covered:

| ID | Covered by |
|---|---|
| T-09-24 | clamp + cases (8)(9)(10); M3 |
| T-09-43 | the non-dismissable alert + DOM-order assertion in case (6); M4 |
| T-09-25 | no stepper for an open booking, case (11); M2 (server-side refusal already shipped in 09-07) |
| T-09-44 | `PartialGrantNotice` imports no money helper (grep 0); `PriceBreakdown` multiplies nothing (grep 0); case (5) renders an incoherent per-head frame and still shows the server's figures |

## Next Phase Readiness

**For 09-14 (search → listing link):** unchanged from 09-12's note — `search-result-card.tsx` still forwards `start`/`end` on open cards and must drop to `?date=` only, and `?date=` must seed the picker.

**For 09-15/09-16 (copy forks):** 09-UI-SPEC § 5b's remaining drop-in copy is still owed — the cancel review context line, the "before the space opens" tier rationale and the generic policy disclosure. This plan touched none of it; the reserve page's `CancellationPolicyDisclosure` call is unchanged and already receives `openCapacity`.

**Two things a later plan should know:**

1. **`src/app/listings/[id]/page.tsx:164` is still open.** 09-05 flagged that it passes `pub`, which carries no `occupancyMode`, so the listing page can still show an hourly rate for a drop-in listing. 09-12 did not close it and this plan's scope was the reserve page, not the listing page. The `allInRateParts` open branch already exists — it is a call-site fix.
2. **`PartialGrantNotice` suppresses itself when `listing.per_head_price_cents` is NULL.** Unreachable on a published open listing (09-06's publish gate), but if a future plan ever allows a drop-in listing to exist without a per-head price, the reduction would go unannounced rather than render a ₱0.00 estimate. That direction was chosen deliberately; it is the safe one, but it is a real branch.

## Self-Check: PASSED

All 6 claimed files exist on disk; all 3 task commits (`0557e35`, `b1c35a5`, `605f8f0`) resolve in `git log`; no probe artifact remains under `src/` or `tests/`.

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
