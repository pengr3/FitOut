---
phase: 14-host-tooling
plan: 03
subsystem: ui
tags: [react, jsdom, vitest, testing-library, aria-live, radix-dialog, design-system, host-surfaces]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`patterns/row-card.tsx` (the slot contract, and its optional `href`) and `patterns/responsive-dialog.tsx` — RESP-01's ONE overlay primitive, whose below-`sm:` bottom-sheet presentation is why the decline confirm was worth moving"
  - phase: 13-confirmation-bookings-trust
    provides: "`request-countdown.tsx`'s `finalHourEmphasis` — the opt-in-prop precedent this plan copies verbatim — plus `tests/design/phase13-surface-gates.test.ts`'s per-file alarm-token pin and `src/lib/design/live-regions.ts`'s declared region set, both of which constrained the implementation"
  - phase: 08-group-bookings
    provides: "`share-link-box.tsx`'s named-status-region rule (the name is a LABEL, not a second copy of the sentence) and `tests/group/state08-alerts.test.tsx`'s one-region/zero-toasts assertion shape"
provides:
  - "`RequestCountdown`'s `emphasis` prop — an opt-in two-line lead layout, with both booker call sites byte-identical and ONE digits node, ONE glyph and ONE timer element shared by both arms"
  - "A terminal, deadline-led request row: countdown in the `status` slot, money demoted into the description list, both actions touch-sized on BOTH surfaces the cluster renders on"
  - "The decline confirm ported onto `ResponsiveDialog` — the FIRST host-side adopter, and the first with zero imports from the vendored dialog module"
  - "A single named in-row refusal region carrying the server action's own sentence, replacing two `toast.error` calls"
  - "`tests/host/request-row.test.tsx` + `tests/host/request-refusal.test.tsx` — D-144, D-146's order half, and the refusal contract as executable rendered facts"
affects: [14-04, 14-06, 14-07, 14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A shared component gains a LAYOUT variant by hoisting every element a design gate counts — the digits, the glyph, the timer — and branching only on the container that wraps them"
    - "A live-region gate that reads SOURCE makes 'only one arm ever renders' irrelevant: two `role=` elements in one file are two declared regions, whichever one mounts"
    - "A refusal that leaves the surface on screen belongs ON the surface; a refusal that revalidates the surface away has nowhere but a toast to go — and the two are decided per PATH, not per component"
    - "One outcome, one announcement: the region and the toast it replaces are deleted and added in the same edit, and the toast spy at zero calls is the assertion that says so"

key-files:
  created:
    - tests/host/request-row.test.tsx
    - tests/host/request-refusal.test.tsx
    - .planning/phases/14-host-tooling/deferred-items.md
  modified:
    - src/components/booking/request-countdown.tsx
    - src/components/host/request-row.tsx

key-decisions:
  - "The countdown's digits, clock glyph AND `role=\"timer\"` element are all hoisted into consts and shared by both layout arms — the timer for a reason found by a red gate, not predicted: `live-regions.test.tsx` reads the source, so a second `role=\"timer\"` written into the lead arm is an undeclared live region even though the two can never mount together"
  - "D-146's DOM-order half is asserted as 'the deadline shares the row's first line with the title, and both precede the money', not as 'the deadline precedes the title' — `RowCard`'s `status` slot renders after the title column by construction, and the UI-SPEC's own falsifiable is `<=` on that pair for exactly that reason"
  - "The decline overlay's `Keep it` closes through the CONTROLLED open state rather than a vendored `DialogClose`, so the file reaches the overlay through the one pattern and imports nothing from `ui/dialog` — which is what the acceptance criterion measures"
  - "`ROW_VALUE_CLASS` is one constant and the money class is DERIVED from it, so 'the money and the guest name render at the same type role' is true by construction rather than by two similar strings staying similar"
  - "14-CONTEXT D-145's stated precedent is FALSE and is corrected in the file's own header: `host-cancel-dialog.tsx:30-37` imports the vendored dialog directly, so `request-row.tsx` is the first host-side `ResponsiveDialog` adopter. `host-cancel-dialog.tsx` was NOT converted — it was not named for conversion"
  - "The refusal region mounts conditionally, following `share-link-box.tsx`'s shipped precedent, because the plan and the UI-SPEC both require zero regions on the success path"

patterns-established:
  - "Hoist-what-the-gate-counts: when a component grows a second layout, every element a per-file inventory counts becomes a const used by both arms"
  - "A per-path report decision: the same server result reports differently depending on whether the surface survives the outcome"
  - "A new gate is not trusted until it has been watched rejecting the shape it forbids — both new files were driven red by a deliberate regression and the messages recorded"

requirements-completed: [HFLOW-01]

# Metrics
duration: 20min
completed: 2026-08-23
---

# Phase 14 Plan 03: The Request Row Leads With Its Deadline Summary

**The shared SLA countdown grew an opt-in two-line lead layout without moving a pixel or a token on the two
booker surfaces it already serves; the host request row became terminal, put its deadline first and its money
last, moved its decline confirm onto the app's one overlay primitive, and stopped reporting a refusal in a
toast that is gone on refresh.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T09:01Z (baseline `tsc` + design suite 09:02)
- **Completed:** 2026-08-23T09:21Z
- **Tasks:** 3 (4 commits — one auto-fix)
- **Files modified:** 4 (2 modified, 2 created) — 846 insertions, 103 deletions

## Accomplishments

- **The countdown leads on one surface and is byte-identical on the other two.** `emphasis` defaults to the
  inline value, so `tests/booking/request-countdown.test.tsx` passes **unmodified** and neither booker call
  site was opened. The lead arm renders the prefix at the label role above the digits at the heading role —
  the largest type in the row, which is how D-146's "loudest" is carried by scale rather than by a hue.
- **The alarm token is still on exactly ONE line of the file**, comment-stripped, which is the landmine the
  phase named by name. `tests/design/phase13-surface-gates.test.ts` passes with **zero edits** to its
  inventory.
- **A second gate caught something nobody predicted, and the fix was better than the amendment.** Adding a
  second `role="timer"` to the lead arm made `live-regions.test.tsx` report an undeclared region — the gate
  reads SOURCE, so "only one arm ever mounts" is not a defence. Hoisting the timer element (the same
  discipline the digits already had) removed the second region instead of declaring it.
- **The row is terminal, and that is now a DECISION with a test behind it.** D-144 closes Phase 11's open
  question; `tests/host/request-row.test.tsx` fails on a re-added destination, with a message that says why
  a triage queue does not browse.
- **The money moved out of the headline position and cannot be promoted back by accident.** It left
  `trailing` for the description list at the *same declared constant* as the guest name — and the row's only
  heading-role text is asserted to be the deadline.
- **Both refusal toasts are gone; both success toasts remain.** The refusal now renders as one named in-row
  `role="status"` carrying the server action's own sentence verbatim. `grep -c 'toast.error'` → **0**;
  `grep -c 'toast.success'` → **2**.
- **Zero server-side change.** `git diff src/app/actions/` is empty across all four commits, and
  `host-requests.test.ts` + `request-lifecycle.test.ts` pass **unedited** (GATE-NOREG 3). Zero migrations,
  zero packages.

## Task Commits

1. **Task 1: RequestCountdown gains an opt-in lead emphasis** — `f5b0fab` (feat)
2. **Auto-fix (Rule 3, blocking): hoist the timer node so the lead arm declares no second live region** — `83b52a9` (fix)
3. **Task 2: The request row becomes terminal, confirms its decline, and reports a refusal in place** — `93b543c` (feat)
4. **Task 3: Terminality, hierarchy and refusal as rendered facts** — `3b1d943` (test)

## Files Created/Modified

- `src/components/booking/request-countdown.tsx` — `+146/-15` net across two commits. Adds the `emphasis`
  prop with a docblock in `finalHourEmphasis`'s shape, `LEAD_LABEL_CLASS`, and four hoisted nodes
  (`digits`, `glyph`, `ticking`, `announcement`) shared by both layout arms. A new header section states the
  one-node constraint and the two gates that enforce it.
- `src/components/host/request-row.tsx` — `+276/-86`, now 305 lines. No `href`, no `media`, no `trailing`;
  countdown + D-99 reason in `status`; `<dl>` carrying guest and guest-pays at one declared value class;
  `ResponsiveDialog` decline; `REFUSAL_REGION_NAME` + one conditional `role="status"`; both controls
  `size="touch"`. The header records all four changes with the decision that forced each, and corrects
  14-CONTEXT D-145's false precedent claim.
- `tests/host/request-row.test.tsx` **(created, 260 lines)** — 8 cases in three describes plus a
  guard-the-guard block that proves the interactive selector can find an anchor and that the row rendered
  real content.
- `tests/host/request-refusal.test.tsx` **(created, 267 lines)** — 11 cases: both refusal paths, the shared
  region, the accessible name, the two success paths, and a guard-the-guard block that proves the toast spy
  is callable (a permanently-zero spy would make every zero-call assertion vacuous).
- `.planning/phases/14-host-tooling/deferred-items.md` **(created)** — one entry, `[14-03]`, addressed to
  14-06.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npm run test:design` (baseline) | 49 files / 827 passed / 3 skipped / **0 failed** |
| `npx vitest run tests/booking/request-countdown.test.tsx` (test file UNEDITED) | 1 file / **8 passed** |
| `git diff --stat tests/booking/request-countdown.test.tsx` | **empty** — the booker's coverage is provably unchanged |
| `git diff --stat tests/design/phase13-surface-gates.test.ts` | **empty** — the file stays pinned at one |
| `grep -v '^\s*[/*]' src/components/booking/request-countdown.tsx \| grep -c 'destructive'` | **1** |
| `npx vitest run tests/booking/host-booking-row.test.tsx` (UNEDITED — Pitfall 5) | passed, within the 3-file run below |
| `npx vitest run …/host-booking-row …/host-requests …/request-lifecycle` (all UNEDITED) | 3 files / **31 passed** |
| `grep -c 'toast.error' src/components/host/request-row.tsx` | **0** |
| `grep -c 'toast.success' src/components/host/request-row.tsx` | **2** |
| `grep -n 'href' src/components/host/request-row.tsx` | 2 hits, **both in comments** — no href reaches the container |
| `grep -n 'from "@/components/ui/dialog"' src/components/host/request-row.tsx` | **nothing** |
| `grep -n 'ResponsiveDialog' src/components/host/request-row.tsx` | the import (`:70`) and the call (`:215`) |
| `npx vitest run tests/host/request-row.test.tsx tests/host/request-refusal.test.tsx` | **19 passed** |
| `npx vitest run tests/host` | 3 files / **22 passed**, zero failures |
| `npx vitest run tests/host tests/booking` | 58 files / **669 passed**, zero failures |
| `npm run test:design` (final) | **49 files / 827 passed / 3 skipped / 0 failed** — baseline exactly unmoved |
| `npx tsc --noEmit` (final) | exit **0** |
| `npx eslint` on all four touched files | exit **0** |
| `git diff --stat drizzle/` | **empty** — zero migrations (PROJECT D-136) |
| `git diff src/app/actions/` | **empty** — server semantics untouched (D-130) |
| `git diff --stat package.json package-lock.json` | **empty** — no package installed |
| `git diff --diff-filter=D` per commit | no deletions in any of the four commits |

**No Playwright invocation was made** — this plan's `<verification>` says so explicitly. `e2e/availability.spec.ts:261`,
the pre-existing standing red, was neither touched nor claimed.

### Both new gates have been observed failing

Task 3's acceptance criterion. Each regression was applied, run, recorded, and reverted with
`git checkout -- src/components/host/request-row.tsx`.

**(a) Terminality — an `href` re-added to the row container.** Two cases went red:

```
FAIL  tests/host/request-row.test.tsx > D-144 — the request row is terminal, and the inbox browses
      nowhere > renders zero anchors and zero link-role elements inside the row

AssertionError: an anchor is inside the request row. D-144 keeps `RowCard`'s optional `href` UNUSED
here: a triage queue that browses is no longer a triage queue, and a second place carrying
approve/decline is a second place that has to be kept in agreement with this one.:
expected …(1) to have a length of +0 but got 1

FAIL  … > has exactly TWO interactive descendants, and they are Approve and Decline

AssertionError: the row grew an interactive descendant beyond its two actions:
expected [ 'a:Sunset Court', …(2) ] to have a length of 2 but got 3
```

The second message names the offending node (`a:Sunset Court`), which is what makes it actionable rather
than a bare count.

**(b) The refusal contract — ONE `toast.error` re-added on the approve path.** Two cases went red:

```
FAIL  tests/host/request-refusal.test.tsx > a refused APPROVE renders one named in-row region and no
      toast > dispatches ZERO error toasts — the region REPLACED the toast, it did not join it

AssertionError: a refusal announced twice — once in the row and once in a toast. One outcome, one
announcement (GATE-03 rule 6); the toast is the half that is gone on refresh.:
expected "vi.fn()" to not be called at all, but actually been called 1 times
Received: 1st vi.fn() call: [ "This request is no longer pending." ]

FAIL  … > BOTH refusal paths share ONE region — a second refusal does not render a second line

AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Received: 1st vi.fn() call: [ "We couldn't find that request, or it isn't yours to manage." ]
```

The failure prints the sentence that was double-announced, so the reader sees WHICH refusal leaked without
opening the component.

## Decisions Made

**1. The `role="timer"` element is hoisted, not declared twice — and that was found by a gate, not predicted.**
The plan's one named implementation constraint was "ONE digits element, branch on the layout container".
Following it exactly still turned `tests/design/live-regions.test.tsx` red, because writing a second
`role="timer"` into the lead arm creates a second declared live region in the SOURCE, which is what that gate
reads:

```
PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
src/components/booking/request-countdown.tsx:271 — timer#2 on <span> (role="timer")
```

Two remedies existed. Amending `live-regions.ts` to declare `timer#2` would have added an inventory row for a
region that can never be on screen beside `timer#1` — a row whose `why` would have had to say "it is the same
region, drawn twice". Hoisting the timer element removes the second region instead. The generalised rule is
now in the file's header and in this summary's patterns: **hoist what the gate counts.** The same reasoning
applied to the glyph and to the sr-only threshold region, both of which are also single nodes now.

**2. D-146's DOM-order half is asserted as "shares the first line", not "precedes the title".**
The plan's Task 3 asks the new test to assert that the countdown digits precede the space title *and* the
money figure in DOM order. Those two cannot both be true with the countdown in `RowCard`'s `status` slot,
which Task 2 and 14-UI-SPEC § The mobile card both require: `row-card.tsx:178-210` renders the title column
BEFORE the status column, always, for all four adopters.

The UI-SPEC settles it. Its own falsifiable for this pair is `boundingBox().y` **`<=`** the space title's and
strictly `<` the money figure's — the `<=` is there precisely because the status slot puts the deadline and
the title on ONE line. So the row is right and the plan's phrasing was one word too strong. The test asserts
what is true and load-bearing: the deadline and the title share the row's first line (their nearest common
ancestor does not contain the money figure), and both strictly precede the money in DOM order. A future edit
that demotes the countdown below the body still fails. Recorded as a deviation below.

**3. The overlay's `Keep it` closes through the controlled state, not `DialogClose`.**
The shipped confirm used `<DialogClose asChild>`. Importing it would have satisfied the copy requirement and
broken the acceptance criterion that this file imports nothing from `@/components/ui/dialog` — and the
criterion is the better rule: `ResponsiveDialog` deliberately does not re-export the vendored parts, because
an adopter that reaches around the pattern for one primitive is an adopter that can reach around it for the
presentation too. The overlay is already controlled (`open` / `onOpenChange`), so `onClick={() =>
setDeclineOpen(false)}` is the same behaviour with no second import.

**4. `onCloseAutoFocus` is left undefined, and the file says why.**
`responsive-dialog.tsx:180-201` records the measured Radix defect the prop exists for — an adopter whose
trigger UNMOUNTS while the overlay is open loses the browser's focus restore. This trigger is stable
(the Decline button is always rendered), so Radix's own behaviour is correct here and overriding it would be
a claim with no basis. Stated at the call site rather than left as an absence.

**5. The description list's value class is one constant with the money class derived from it.**
D-146's third falsifiable is an EQUALITY between two elements. Two hand-typed class strings are two chances
to break it silently, and the break would look like a formatting change in review. `ROW_MONEY_CLASS` is a
template over `ROW_VALUE_CLASS`, so the money can gain `tabular-nums` and can never gain a type role of its
own. The test reads the role off both rendered nodes and compares them, so the constant and the render are
checked against each other rather than the constant being trusted.

**6. `host-cancel-dialog.tsx` was read and deliberately NOT converted.**
The read confirmed the correction this plan was told to make: it imports the vendored dialog directly at
`:30-37`, so 14-CONTEXT D-145's claim that `ResponsiveDialog` is "already used by the host cancel dialog" is
false and `request-row.tsx` is the first host-side adopter. Converting the second overlay on the strength of
a corrected footnote is scope this plan did not budget; deferred item `13-08` still records the pair.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The lead arm's second `role="timer"` was an undeclared live region**
- **Found during:** Task 2's full design-suite run (the per-file gates run in Task 1 do not include it)
- **Issue:** `tests/design/live-regions.test.tsx` went red: `request-countdown.tsx:271 — timer#2 on <span>
  (role="timer")`, present but undeclared. The gate reads source, not renders, so "only one arm can mount"
  is not a defence.
- **Fix:** hoisted the timer element into a `ticking` const shared by both layout arms, exactly as the digits
  already were. The glyph and the sr-only threshold region were hoisted in the same edit for the same reason.
- **Files modified:** `src/components/booking/request-countdown.tsx`
- **Commit:** `83b52a9`
- **Result:** design suite back to 49 files / 827 passed / 0 failed — the baseline, unmoved.

### Plan-internal contradiction, resolved in favour of the approved UI-SPEC

**2. Task 3's DOM-order assertion was narrowed by one clause**
- **Plan text:** *"The countdown digits element precedes the space title and the money figure in DOM order."*
- **Why it cannot hold:** Task 2 and 14-UI-SPEC § The mobile card both put the countdown in `RowCard`'s
  `status` slot, and `row-card.tsx:178-210` renders the title column before the status column for every
  adopter. Satisfying the plan's phrasing would have required either abandoning the `status` slot (putting
  the deadline BELOW the title, which fails the UI-SPEC's `boundingBox().y <=` falsifiable outright) or
  editing `row-card.tsx`, which is not in `files_modified` and is shared by four adopters.
- **What was implemented instead:** the deadline and the title share the row's first line — asserted
  structurally, as "their nearest common ancestor does not contain the money figure" — and both strictly
  precede the money figure in DOM order. The UI-SPEC's `<=` on the title pair exists for exactly this
  arrangement, so the narrowed assertion is the one the design contract actually makes.
- **What is NOT lost:** a future edit that moves the countdown out of the first line, or that promotes the
  money above it, still fails. The test file's header states in as many words that the strict computed-size
  comparison is `e2e/host-inbox-hierarchy.spec.ts`'s (owned by 14-06) and that a class name is not a font
  size.

**Total deviations:** 1 auto-fixed (0 Rule 1, 0 Rule 2, 1 Rule 3, 0 Rule 4) + 1 plan-internal contradiction
resolved and documented.
**Impact on plan:** none to its objective. Zero scope absorbed — no new component, no new package, no
migration, no server-side edit, no third surface opened.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-03-SEMANTICS | **mitigated** | Neither action file opened. `git diff src/app/actions/` **empty**; `host-requests.test.ts` + `request-lifecycle.test.ts` pass **unedited** (31 passed with `host-booking-row`). The refusal test additionally asserts `approveRequest`/`declineRequest` are called once, with the request id and nothing else |
| T-14-03-LOSTREFUSAL | **mitigated** | Both `toast.error` calls deleted (`grep -c` → 0); one in-row `role="status"` carries the server's sentence verbatim, asserted with `toBe` on two DIFFERENT server strings so a client-side constant cannot pass |
| T-14-03-DOUBLEANNOUNCE | **mitigated** | One region per outcome, counted with `toHaveLength(1)` — never "at least one". The toast spy is asserted at zero calls on every refusal path, and the guard-the-guard case proves the spy is callable |
| T-14-03-COUPLING | **mitigated** | `bookings/page.tsx:265-271` was read and NOT edited; `tests/booking/host-booking-row.test.tsx` passes **unedited**, including its positive control that a `requested` row still renders both controls. The two-surface render is recorded in the component header beside the touch-sizing change |
| T-14-03-UNREACHABLE | **mitigated** | The overlay is now `ResponsiveDialog`, which owns the below-`sm:` bottom-sheet presentation. `tests/design/sheet-absent.test.ts` green with **zero edits**; no `sheet` block fetched |
| T-14-03-MONEY | **mitigated** | The frozen `totalLabel` is rendered as-is; zero arithmetic added. `price-surface.test.ts` re-run green in the full design suite |
| T-14-03-SC | **mitigated** | **No package installed.** `package.json` and `package-lock.json` untouched. `dom-accessibility-api` was deliberately NOT imported — the accessible name is computed through `@testing-library`'s `{ name }` option, which is this repository's stated rule (`tests/design/live-regions.test.tsx:25`) |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. No
`## Threat Flags` section is owed.

## Known Stubs

None. Every element this plan renders is wired to real data or to a server result:

- `emphasis="lead"` has exactly one caller, and it is `RequestRow`.
- The refusal region renders only from a server action's own `error` string — there is no placeholder
  sentence anywhere in the file.
- The two success toasts are unchanged and still carry the real `APPROVAL_PAYMENT_WINDOW_HOURS` and the real
  booker label.

## Issues Encountered

**The plan's own two halves disagreed about DOM order, and only reading `row-card.tsx` settled it.**
Task 2 required the `status` slot; Task 3 required the countdown to precede the title in DOM order. The
pattern renders the title column first, unconditionally, for all four of its adopters — so the two
requirements are not simultaneously satisfiable and no amount of care in the row file would have made them
so. Resolved by reading the UI-SPEC's falsifiable rather than its prose table: `<=` on the title pair is the
approved contract, and `<=` is what a same-line arrangement produces. Recorded above as deviation 2 rather
than silently narrowed.

**A gate the plan did not name was the one that fired.** The plan named `phase13-surface-gates`,
`sheet-absent`, `empty-state-adoption` and `price-surface`. The gate that actually went red was
`live-regions` — and it went red on the file the plan called "byte-identical for both booker call sites",
which it still is at RENDER time. The lesson is recorded in the component header: on a per-file inventory
gate, source and render are different questions, and the inventory asks the source one.

**The 320px consequence of the `status` slot is real and is logged, not fixed.** `RowCard`'s status column is
`shrink-0`, and the D-99 reason line is a full sentence that now lives in it. See
`.planning/phases/14-host-tooling/deferred-items.md` `[14-03]`, addressed to **14-06**, which owns both
`/host/requests/page.tsx` and the Playwright spec where the measurement runs. Fixing it here would have meant
either editing `row-card.tsx` (four adopters, not in `files_modified`) or minting an undeclared box.

## User Setup Required

None — no external service configuration, no environment variable, no package install.

## Next Phase Readiness

**Ready.** What the downstream plans inherit:

- **14-06 (the inbox page + `e2e/host-inbox-hierarchy.spec.ts`)** gets a row that already satisfies the
  order and role halves of D-146; its spec owns the computed-`font-size` comparison and the 320/768/1280
  measurement. It also owns the desktop table's `Expires · Guest · Space · When · Guest pays · Actions`
  reorder — untouched here, since `requests/page.tsx` is not in this plan's scope — and the
  `deferred-items.md` `[14-03]` entry.
- **Any plan that gives `RequestCountdown` a third layout** must hoist whatever new element it introduces if
  a per-file gate counts that element. The header states the rule and names both gates.
- **Any plan that opens `request-row.tsx`** should know the file now imports nothing from `ui/dialog` and
  that `tests/host/request-row.test.tsx` will fail on a re-added `href`, an extra interactive descendant, or
  a second heading-role text node in the row.

**Two standing cautions, re-confirmed here and unchanged:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings. Not
   touched, not to be "fixed".
2. `e2e/availability.spec.ts:261` is still the pre-existing standing red. Not caused here, not claimed here.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*
