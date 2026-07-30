---
phase: 09-open-capacity-bookings
plan: 11
subsystem: ui
tags: [react, tailwind, shadcn, jsdom, vitest, accessibility, scarcity, drop-in]

# Dependency graph
requires:
  - phase: 09-02
    provides: "`SpotsState` (`open | low | full`) and the server-side `spotsState`/`lowStockThreshold` pair the chip must never re-implement"
  - phase: 09-04
    provides: "`getAvailability`'s open branch, which carries the server-derived `state` + `remaining` the chip renders"
  - phase: 09-07
    provides: "`placeOpenHold` — the hold that fixes the head count (D-126), which is why the pass count must be chosen pre-hold"
provides:
  - "`SpotsLeftChip` — the three-state, server-driven scarcity chip (never re-derives the threshold, never red, never interactive)"
  - "`DropInBadge` — plain secondary `Drop-in` text for the search card, listing page and reserve summary"
  - "`StepperControl` — the presentational ±1 headcount control extracted verbatim from `PaxStepper`, now carrying the zero-arithmetic grep gate"
  - "`PassStepper` — the OC-06 pre-hold, controlled pass-count binding (no server action, bounded by the date's `remaining` as a courtesy)"
  - "`PaxStepper` as a pure server-bound binding, rendering byte-identically to the pre-split component"
affects: [09-12, 09-13, 09-14, 09-15, 09-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-decided display state passed straight through to a presentational component (HeadcountMeter `full` → SpotsLeftChip `state`)"
    - "A shipped grep gate MOVES with the markup it guards and is re-asserted on every file in the split"
    - "Byte-identity of a UAT-passed surface proven by capturing rendered `innerHTML` across boundary prop frames before and after a refactor"
    - "Painted-class assertions ignore variant-prefixed Tailwind utilities, so an inert `aria-invalid:` variant on a shadcn primitive cannot make a colour gate unpassable"

key-files:
  created:
    - src/components/availability/spots-left-chip.tsx
    - src/components/listing/drop-in-badge.tsx
    - src/components/booking/stepper-control.tsx
    - src/components/booking/pass-stepper.tsx
    - tests/availability/spots-left-chip.test.tsx
    - tests/booking/pass-stepper.test.tsx
  modified:
    - src/components/booking/pax-stepper.tsx

key-decisions:
  - "The chip renders all three states at 14/600 (`h-7 … text-sm font-semibold`) so its size never changes with a date's scarcity; UI-SPEC gives `Badge variant=\"secondary\"` for open/full and 14/600 in the Typography table, and the badge default (12px, h-5) would have made the low state visibly larger than the other two."
  - "`SpotsLeftChip` and `DropInBadge` both take an optional `className` on their outer element — backward-compatible with the prescribed signatures, and it saves the three downstream surfaces from wrapping the chip in a placement div."
  - "The low state uses `Badge variant=\"outline\"` as its base (not `secondary`) before the brand-tint overrides, so `data-variant` names what the chip actually is and tailwind-merge has one fewer background to drop."
  - "The `low` copy is one text node — `<span className=\"tabular-nums\">Only {remaining} left</span>` — rather than a separately wrapped numeral, keeping the literal `Only {remaining} left` greppable on one line while still setting tabular figures on the digit."
  - "Clamping lives in the bindings, never in `StepperControl`: only a binding knows whether its ceiling is a listing's own `maxOccupancy` or a date's live `remaining`, and only the server's own re-clamp is ever authoritative."
  - "`PaxStepper` passes its helper as a composed template string (`This includes you. Up to ${maxOccupancy}.`); React renders adjacent text nodes identically to the previous three-child form, which the byte-identity capture confirmed."
  - "`PassStepper` keeps the shipped no-op guard (`if (clamped === value) return;`) so an arrow key at either bound is silent rather than chatty — mutation-proven to be the assertion that bites."

patterns-established:
  - "Scarcity state is a fact about the CLAIM: the browser receives it, never computes it (T-09-13, continuing D-100 / D-75)"
  - "A copy literal appears exactly ONCE per component file, in the markup — headers describe the rule instead of restating the string, so grepping a wording stays a usable drift tripwire"
  - "Colour gates assert over unprefixed (painted) Tailwind utilities plus an explicit check that the variant-prefixed ones are inert"

# Copied from the plan's own `requirements` field. NOTE: neither is CLOSED by this plan — it ships the
# presentational primitives only, and no booker-facing surface mounts them until 09-12/09-13/09-14.
# REQUIREMENTS.md therefore records both as "In progress", not Complete. Do not check the boxes on this.
requirements-completed: [OPEN-04, OPEN-02]

# Metrics
duration: 28min
completed: 2026-07-30
---

# Phase 9 Plan 11: Drop-in display primitives + the PaxStepper split Summary

**Three server-driven scarcity states, a plain `Drop-in` badge, and `PaxStepper` split into a presentational control plus two bindings — with the shipped reserve-page rendering proven byte-identical (17,541 bytes, matching sha256) across three prop frames.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-07-30T20:19:00Z
- **Completed:** 2026-07-30T20:47:00Z
- **Tasks:** 2
- **Files created/modified:** 7 (6 created, 1 modified)

## Accomplishments

- **`SpotsLeftChip` renders what the server decided and cannot hold a second opinion.** `state` arrives as a prop; the file imports no threshold helper, no low-stock ceiling, and compares `remaining` to no literal of any kind (T-09-13). The number appears in the `low` state only — the `open` state's rendered text contains **no digit at all**, asserted with a `/\d/` regex against `container.textContent`, which is O4 as an executable rule rather than a comment.
- **Each state has a non-colour signal.** `open` = the word "available" + `UsersRound`; `low` = the exact numeral + the soft accent tint reused verbatim from the SlotPicker gap hint (`slot-picker.tsx:245-247`, hence no new token); `full` = a different glyph (`CalendarX2`) + muted words. Nothing red, nothing focusable, nothing clickable, and **OC-14 means `full` offers no back-in-stock affordance** — v1 has no such mechanism, and advertising one would be a lie.
- **`PaxStepper`'s markup was extracted, not rewritten, and the extraction is proven.** Three prop frames (the min bound `declaredPax=1`, a mid value `2`, and the max bound `12`) were rendered to `innerHTML` before the split and again after: **17,541 bytes, sha256 `632e9bea…20c3`, `cmp` exit 0.** This was a UAT-passed money surface (08-17 step 2); the split changed nothing a booker sees.
- **The zero-arithmetic grep gate moved with the markup.** It now spans three files and `pax-stepper.tsx`'s own header says so explicitly, because a gate left behind on a file that no longer holds the markup is not a gate. `grep -c "formatMoney\|quotedTotalCents\|₱"` returns 0 on all three, and case (9) of the new test proves the *rendered output* of both bindings contains no currency glyph and no decimal money pattern (T-09-38).
- **`PassStepper` exists and is structurally incapable of re-pricing.** It is controlled (the rail owns `{date, passes}` so a date change can reset the count to 1), calls no server action, and is bounded by the picked date's `remaining` as a **courtesy only** — documented in the component itself, because the server re-clamps inside the claim transaction against the live admissions SUM (T-09-05). OC-18 is recorded there too: `remaining` is the only bound, so one booker may legitimately take a whole day.
- **Two mutations executed RED and restored.**

## Task Commits

1. **Task 1: SpotsLeftChip + DropInBadge** — `da3fc1a` (feat)
2. **Task 2: split PaxStepper into a presentational control + two bindings** — `fb5ebc7` (refactor)

**Plan metadata:** see the final `docs(09-11)` commit.

## Files Created/Modified

- `src/components/availability/spots-left-chip.tsx` *(created)* — the three-state scarcity chip. Takes `{state, remaining, className?}`; wraps a `Badge` in a `role="status"` container.
- `src/components/listing/drop-in-badge.tsx` *(created)* — `<Badge variant="secondary">Drop-in</Badge>`, one optional `className`. Never accent.
- `src/components/booking/stepper-control.tsx` *(created)* — the shipped ±1 markup verbatim (`h-11 w-40` shell, two `size-9` hit areas, read-only `text-center tabular-nums` input, ArrowUp/ArrowDown, muted helper `<p>`), with only the strings as props. Carries the ZERO-ARITHMETIC CONTRACT header and the grep gate.
- `src/components/booking/pass-stepper.tsx` *(created)* — the OC-06 pre-hold binding.
- `src/components/booking/pax-stepper.tsx` *(modified)* — now the server-bound binding only: `useOptimistic` + `useTransition` + `updateDeclaredPax` + `toast.error` + `router.refresh()` + the `Math.min(Math.max(1, next), maxOccupancy)` clamp, all unchanged, composing `StepperControl`.
- `tests/availability/spots-left-chip.test.tsx` *(created)* — 8 jsdom cases.
- `tests/booking/pass-stepper.test.tsx` *(created)* — 12 jsdom cases (9 for the new binding, 3 for the shipped one).

## Decisions Made

See `key-decisions` in the frontmatter. The two worth restating:

1. **All three chip states render at the same 14/600 Label scale.** UI-SPEC's state table says `Badge variant="secondary"` for `open`/`full` and specifies 14/600 for the chip in § Typography; taken literally, `open`/`full` would inherit the badge default (12px, `h-5`) and be visibly smaller than the `low` state — i.e. the chip would grow as a date sold out, which is exactly the size-based urgency § Typography forbids ("no new Display-scale figure"; urgency is carried by wording and tint, not size). A shared `CHIP_BASE` pins all three.

2. **Clamping stays in the bindings.** `StepperControl` emits the raw next value and only disables at `min`/`max`. `PaxStepper` clamps against the listing's `maxOccupancy`; `PassStepper` clamps against the date's `remaining`. Neither bound is a gate — both headers say so — and putting the clamp in the shared control would have implied the ceiling means one thing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two of the plan's own acceptance greps were unsatisfiable against its own prescribed comment text — the eighth occurrence in this phase**

- **Found during:** Task 1
- **Issue:** The plan's action text tells the chip's header to name `lowStockThreshold(cap)` and `OPEN_LOW_STOCK_MAX` while its acceptance criterion is `grep -ci "…OPEN_LOW_STOCK_MAX\|lowStockThreshold" == 0`. Writing the prescribed comment makes the prescribed gate fail. Separately, the copy-count gates (`grep -c "Fully booked" == 1`, `"Spots available" == 1`) were defeated by a header block that quoted the three strings as a table.
- **Fix:** The header now states the rule without naming the symbols ("must never import the server's low-stock ceiling or the threshold helper that reads it"), and the copy block describes each state's wording instead of restating it, with an explicit note saying *why* — so grepping this file for a state's wording stays a usable drift tripwire for the three surfaces that will mount the chip. **No behaviour or copy was changed to satisfy a grep**; only comment prose moved.
- **Files modified:** `src/components/availability/spots-left-chip.tsx`, `src/components/listing/drop-in-badge.tsx`
- **Verification:** all Task-1 greps now return their specified values (see Verification below).
- **Committed in:** `da3fc1a`

**2. [Rule 1 - Bug] The `full`-state waitlist grep can never fail as written**

- **Found during:** Task 1
- **Issue:** `grep -ci "waitlist|notify me|get alerted"` uses an unescaped `|` in a basic regular expression, so it searches for the literal string `waitlist|notify me|get alerted` and returns `0` for every file in the repo — the OC-14 gate had no teeth.
- **Fix:** Verified against the **intended** form, `grep -ci "waitlist\|notify me\|get alerted"`, which returns `0`; the source avoids all three literals, and case (6) of the test additionally asserts the rendered text of every state matches none of `/waitlist|notify|alert me|let me know/i` **and** that nothing interactive is rendered at all. The corrected grep is recorded here so a later plan does not inherit the broken one.
- **Files modified:** `tests/availability/spots-left-chip.test.tsx`
- **Committed in:** `da3fc1a`

**3. [Rule 2 - Missing Critical] The prescribed "no destructive class in the rendered markup" test would have been unpassable for any shadcn `Badge`**

- **Found during:** Task 1
- **Issue:** The shipped `badgeVariants` base string contains `aria-invalid:border-destructive`, `aria-invalid:ring-destructive/20` and `dark:aria-invalid:ring-destructive/40`. A naive `expect(container.innerHTML).not.toContain("destructive")` fails on **every** Badge in the repo, including a perfectly calm one — a gate that cannot pass is not a gate, and "delete the assertion" would have thrown away the O5 colour rule with it.
- **Fix:** The assertion is over the classes that actually **paint**: `paintedClasses()` collects `classList` entries with no variant prefix (a Tailwind utility applies unconditionally only when unprefixed), then asserts none matches `/destructive|-red-|-amber-|-orange-|-yellow-/`. A separate assertion proves the skipped variants really are inert (`[aria-invalid]` and `[data-variant="destructive"]` are both absent). The reasoning is written into the helper's docstring.
- **Files modified:** `tests/availability/spots-left-chip.test.tsx`
- **Committed in:** `da3fc1a`

**4. [Rule 2 - Missing Critical] The plan asserted byte-identity but specified no way to prove it**

- **Found during:** Task 2
- **Issue:** "The reserve page's rendered output must not change by a single character" was stated as a requirement with only string-equality tests behind it. String tests would not have caught a changed class, a lost `readOnly`, a dropped `max` attribute, or a different DOM shape — precisely the things an extraction breaks.
- **Fix:** A throwaway capture harness rendered `PaxStepper` at three prop frames (`declaredPax` = 1 / 2 / 12 against `maxOccupancy=12`, i.e. both bounds and the middle) and wrote `container.innerHTML` to disk **before** the split; the identical harness ran after. `cmp` exit 0, 17,541 bytes, sha256 `632e9bea89cb2ae7f6e673c068197ba37f2bf739a43469b4b807cfbb7de620c3` on both. The harness was deleted (a 17 kB byte digest is not a maintainable gate); what survives permanently is cases (10)–(12), which pin the four shipped strings, the `#declared-pax` id, the `h-11 w-40` shell, both `size-9` hit areas, the read-only `text-center tabular-nums` input with `max="12"`, and the disabled state at both ends.
- **Files modified:** `tests/booking/pass-stepper.test.tsx`
- **Committed in:** `fb5ebc7`

**5. [Rule 2 - Missing Critical] Optional `className` added to both new display components**

- **Found during:** Task 1
- **Issue:** The plan fixes `SpotsLeftChip`'s signature at `{state, remaining}`. The chip is specified to appear on three different surfaces (day panel, search card, reserve summary), each with different placement needs, which would have forced three wrapper divs downstream.
- **Fix:** Added `className?: string` on the outer element of both components. Backward-compatible with the prescribed signature — every prescribed call site still typechecks unchanged.
- **Files modified:** `src/components/availability/spots-left-chip.tsx`, `src/components/listing/drop-in-badge.tsx`
- **Committed in:** `da3fc1a`

---

**Total deviations:** 5 auto-fixed (2 broken/self-defeating acceptance gates, 2 missing verification or gate rigour, 1 downstream-ergonomics prop)
**Impact on plan:** No scope creep. Every deviation either restored a gate the plan had accidentally disarmed or added the proof the plan asserted without specifying. No prescribed copy, treatment or behaviour was changed to satisfy a grep.

## Mutation Testing (both executed, both RED, both restored)

| Mutation | File | Result | Restored |
|---|---|---|---|
| Replace `PassStepper`'s clamp + no-op guard with a bare `onChange(next)` | `pass-stepper.tsx` | Case (7) RED — `expected "vi.fn()" to not be called at all, but actually been called 1 times` (ArrowUp at `value === max` asked for a pass that does not exist) | ✅ `diff` clean |
| Delete one of the two shipped `size-9` hit areas | `stepper-control.tsx` | Case (11) RED — `expected …(1) to have a length of 2 but got 1` (the shipped 36 px tap target vanished from a UAT-passed surface) | ✅ `diff` clean |

## Issues Encountered

**The `low`-state copy and the `tabular-nums` requirement pull against the greppability of the string.** Wrapping the numeral in its own span for tabular figures would split `Only {remaining} left` across three source lines and break `grep -c "Only {remaining} left"`. Resolved by setting `tabular-nums` on the whole sentence span — the digit is the only thing in it that varies in width, so the effect is identical and the literal stays on one line.

**`PaxStepper`'s helper changed from three JSX children to one template string.** This was the only real byte-identity risk in the split: React renders adjacent text children as separate DOM text nodes, which `innerHTML` serialises concatenated, so `"This includes you. Up to " + "12" + "."` and `"This includes you. Up to 12."` produce identical markup. Confirmed empirically by the capture rather than reasoned about — it is exactly the kind of assumption that should not be trusted on a money surface.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run tests/availability/spots-left-chip.test.tsx` | 8 passed |
| `npx vitest run tests/booking/pass-stepper.test.tsx` | 12 passed |
| `npx vitest run tests/booking tests/group tests/availability/spots-left-chip.test.tsx` | 35 files / 356 passed |
| `npm test` | **988 passed / 4 skipped** (108 files, was 968/4) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors / 7 baseline warnings |
| `npm run build` | exit 0 |
| PaxStepper rendered markup, pre- vs post-split | `cmp` exit 0 — 17,541 bytes, sha256 identical |

**Acceptance greps (all as specified):**

```
spots-left-chip.tsx   "Fully booked"=1  "Spots available"=1  "Only {remaining} left"=1
                      destructive|red-|amber|OPEN_LOW_STOCK_MAX|lowStockThreshold (-i)=0
                      onClick|<button|tabIndex=0   role="status"=1
                      waitlist|notify me|get alerted (-i, corrected regex)=0
drop-in-badge.tsx     "Drop-in"=1   "brand"=0
stepper-control.tsx   "export function StepperControl"=1   "h-11 w-40"=1   "size-9"=2
pax-stepper.tsx       "StepperControl"=2  "How many people are coming?"=1
                      "Add a guest"=1  "This includes you. Up to"=1
pass-stepper.tsx      "StepperControl"=2  "How many passes?"=1  "Add a pass"=1
                      "updateDeclaredPax"=0
zero-arithmetic gate  formatMoney|quotedTotalCents|₱ = 0 on ALL THREE stepper files
```

> Note on the two `== 1` greps that read `2`: `grep -c "StepperControl"` counts **2** on both bindings, because a named import always contributes its own line in addition to the JSX use. The plan specified `≥ 1` for these, so they hold as written — but this is the same shape as the `openTakenSql`/`getModeLockState`/`MODE_LOCKED_MESSAGE` counts from 09-02, 09-06 and 09-08. **The load-bearing form is `StepperControl(` — or, in JSX, `<StepperControl`, which counts exactly 1 per binding.**

## Known Stubs

None. Both new components are fully wired to their prop contracts; the surfaces that will mount them (`DatePassPicker`, the search card, the reserve summary, the listing rail) are owned by 09-12 / 09-13 / 09-14 and are not part of this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **09-12 / 09-13 / 09-14 can mount all four primitives today.** `SpotsLeftChip` takes `{state, remaining}` straight off 09-04's `openCapacity` payload with no transformation; `PassStepper` takes `{value, max, onChange}` where `max` is that payload's `remaining`.
- **The rail must own the `{date, passes}` selection state.** `PassStepper` is deliberately controlled so that changing the picked date can reset the count to 1 and re-bound the max (UI-SPEC § 2c, mirroring `availability-calendar.tsx:127`). A consumer that lets the stepper own its own state would silently break that reset — the component cannot enforce it from the inside.
- **The chip is `role="status"` on its own container.** If a consumer mounts several chips on one screen (e.g. a search grid), each will announce independently; § Spots-left limits the chip to three surfaces and `full` never appears on a search card, so this is within contract — but it is worth remembering before adding a fourth mount point.
- **Anyone touching `stepper-control.tsx` is touching the reserve page.** The byte-identity proof is a point-in-time fact, not a standing gate. Cases (10)–(12) of `tests/booking/pass-stepper.test.tsx` are what stand guard; if they go red, the money walkthrough (08-17 step 2) needs re-running before shipping.

## Self-Check: PASSED

All 7 source/test files verified present on disk; both task commits (`da3fc1a`, `fb5ebc7`) verified in `git log`; the throwaway capture harness verified deleted; `<StepperControl` verified at exactly 1 JSX call site per binding.

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
