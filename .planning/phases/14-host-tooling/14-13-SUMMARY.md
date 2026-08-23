---
phase: 14-host-tooling
plan: 13
subsystem: availability
tags: [host-surfaces, design-system, empty-state, panel-card, responsive-dialog, inventories, spec-correction]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "`HOST_PANEL_SHELL` (plan 14-01) — the declared host panel container, imported by a route AND its plate; and 14-12's amended card inventory (`EXPECTED_SURFACES` 15, `adopted` 13, `ALLOWED_RAW_CARD` 10) which this plan's numbers build on"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`patterns/empty-state.tsx` (the discriminated union whose `actions` is REQUIRED so a caller with nothing to offer says so), `patterns/panel-card.tsx`, `patterns/page-header.tsx`, `patterns/responsive-dialog.tsx` (RESP-01, the app's ONE overlay primitive), and the second of the two `ALLOWED_RAW_CARD` exemptions `11-13-SUMMARY.md:234-235` held open for this phase"
  - phase: 03-availability-and-hours
    provides: "`blocks-editor.tsx`'s block CRUD, its reason mapper and the shared `blockSchema` — all untouched here (D-130 / T-14-13-CRUD)"
provides:
  - "`blocks-editor.tsx` composing the three declared patterns and rendering no raw box and no vendored overlay: the empty list is `EmptyState`, the date list is `PanelCard`, and BOTH confirms are `ResponsiveDialog`"
  - "`ALLOWED_RAW_CARD` with its Phase-14 block EMPTY — both availability editors are out, D-155 spent in full (11 → 10 → 9 rows)"
  - "the availability route's page AND plate on one shell constant and one header pattern, with the two bare advisories on the declared advisory surface"
  - "`11-UI-SPEC.md`'s `ResultCard` replaces-list corrected, and the 11-11 deferred fork closed by option (a) where it was raised"
affects: [14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An allow-list row and the conversion it exempted land in ONE commit, and the deletion is watched going red against a reintroduced raw box — 13-08's finding applied for the second and last time in this phase, closing the block rather than shrinking it"
    - "A pattern with no `className` prop absorbs a hand-rolled box's padding, so the list inside it gives its edge rhythm back (`first:pt-0 last:pb-0`) instead of paying the box padding twice — the same arithmetic `panel-card.tsx`'s own header records for the row card"
    - "An advisory that ends in a LINK cannot ride `PanelCard`'s `description` prop (typed `string`) and renders through `children` instead — the two advisories on one page compose the same pattern through different slots, and the split is forced by the type rather than chosen"
    - "A vendored close primitive is replaced by a control calling the SAME state handler the overlay's own dismissals run, so a form that reset on close still resets — a bare `setOpen(false)` would have silently dropped that"
    - "A spec CORRECTION is recorded beside the line it corrects and marked closed at the deferred item that raised it, so the next reader finds a decision in both places rather than an open question in one"

key-files:
  created:
    - .planning/phases/14-host-tooling/14-13-SUMMARY.md
  modified:
    - src/components/availability/blocks-editor.tsx
    - src/app/(host)/host/listings/[id]/availability/page.tsx
    - src/app/(host)/host/listings/[id]/availability/loading.tsx
    - tests/design/card-pattern-coverage.test.ts
    - tests/design/empty-state-adoption.test.ts
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/11-UI-SPEC.md
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "BOTH overlays in `blocks-editor.tsx` were ported, not just the add-block one. The plan's action names the add-block overlay; its acceptance criterion requires ZERO imports from the vendored dialog module, and the remove-block confirm imported the same eight bindings. Porting one and leaving the other would have satisfied the sentence and failed the check — and would have left a host confirming a removal on a phone with the centred dialog the primitive exists to replace"
  - "Neither overlay supplies a distinct close-control name. That prop exists for a route where two overlays are reachable AT ONCE (the booker's lightbox beside the booking sheet); these two are mutually exclusive by construction, because the open one traps focus and the other's trigger cannot be pressed. Adding a name would also be adding copy the contract does not list"
  - "The add-block overlay loses its own max-width class. `ResponsiveDialog` deliberately takes no `className` — that is the DS-11/RESP-01 contract, not an omission — so the overlay renders at the primitive's width. Content and copy are byte-for-byte; only the box is the pattern's"
  - "The blocked-dates empty state is `titleAs=\"h3\"` and `tone` neutral. The page already heads the region with its own second-level heading, and an unblocked calendar is the normal state of a working listing — dressing it as an achievement would be as wrong as dressing it as a failure (the positive set stays at the request inbox)"
  - "The plate adopted `PageHeader` too, though the plan's criteria only require the shell constant there. Its own header said it rendered a hand-rolled heading BECAUSE the page's was one step larger than the pattern's contract; this plan moved the page onto the pattern, so that reason was spent in the same commit and leaving it would have made the fallback the only place on the route drawing a title the page does not"

requirements-completed: []   # HFLOW-04 is shared across six plans — two still carry it
requirements-advanced: [HFLOW-04]   # the availability page, the blocks editor, the shell and the heading

metrics:
  duration: ~15 minutes
  completed: 2026-08-23
---

# Phase 14 Plan 13: The Availability Route's Design-System Pass Summary

**Both availability editors are out of the raw-card allow-list and its Phase-14 block is now empty; the
route draws one shell, one header, one overlay primitive and three containers; and the one line in the
pattern layer's spec that was measurably wrong about the host listing tile is corrected rather than obeyed.**

## Performance

- **Duration:** ~15 min (started 2026-08-23T13:48Z, completed 2026-08-23T14:04Z)
- **Tasks:** 3
- **Files modified:** 7 (0 created besides this summary) — 407 insertions, 267 deletions

## Task Commits

1. **Task 1: The blocks editor adopts the empty state, the panel and the one overlay primitive** — `878971e` (refactor)
2. **Task 2: The availability page's shell, header and two advisories** — `e9fc034` (refactor)
3. **Task 3: Correct the pattern layer's replaces-list rather than obey it** — `8cfd4e4` (docs)

## What Was Built

**`blocks-editor.tsx` renders no raw box and no vendored overlay.** Three shapes moved and nothing else
in the file did:

- The **no-blocked-dates box → `EmptyState`**, with the shipped sentence word for word, a calendar-off
  glyph, `titleAs="h3"` under the page's own second-level heading, and `actions={null}` — the `Add block`
  control is already adjacent and above, and a second copy inside the panel is one affordance rendered
  twice. This IS a genuine empty **list**, which is the distinction the hours editor's guidance box did
  not satisfy: there the seven day rows always render, so that box stayed a muted panel.
- The **block list → `PanelCard`**, with the dividing rule kept on the LIST inside the panel (the pattern
  takes no class name, and the rule between date rows is a property of the rows). Not N row cards: a
  dense date list is one panel's contents. The list's edge rhythm is given back (`first:pt-0 last:pb-0`)
  so the panel's own padding is the outer bound rather than being paid twice.
- **Both confirms → `ResponsiveDialog`.** The add-block overlay and the remove-block confirm compose the
  same vendored dialog the file used directly; what the primitive adds is the below-`sm:` bottom-sheet
  presentation, which is the whole reason a host confirming on a phone can reach the footer.

**The availability route wears the shared shell and header.** `HOST_PANEL_SHELL` is read by the page AND
its plate, with the section rhythm left at the call site (the constant's docblock is explicit that vertical
rhythm between a container's children is not a measurement of the container). The hand-rolled `<h1>` and
lede become `PageHeader` with the two shipped strings — the heading moves one step down the type scale in
doing so, onto the step every other host page's title already renders at.

**Both bare advisories now sit on the declared advisory surface** at the muted tone, copy byte-identical:
the drop-in note through `PanelCard`'s `description` prop (which renders exactly the muted paragraph it
had), and the hours-lock notice through `children`, because it ends in a link and `description` is typed
as a string. The lock sentence is still ASSEMBLED from `HOURS_LOCKED_MESSAGE` and this listing's own lock
state — the count of that identifier in the page is **unchanged at 2** across this plan, and no weekday,
date or duration was typed into the advisory element.

**The `Toaster` stayed exactly where it was** — one mounted element, on the same node, at the shared
ancestor. Both section headings and both sections are untouched and unreordered.

### The numbers this plan moved, old → new

| Inventory | Before | After | Why |
|---|---|---|---|
| `card-pattern-coverage.test.ts` → `EXPECTED_SURFACES` | 15 | **16** | `blocks-editor.tsx` made the allow-list → inventory move |
| `card-pattern-coverage.test.ts` → `adopted` | 13 | **14** | The same file; `refused` unchanged at **2** |
| `ALLOWED_RAW_CARD` rows | 10 | **9** | The blocks editor's row DELETED in the same commit (D-155) |
| `empty-state-adoption.test.ts` → `EXPECTED_ADOPTER_FILES` | 14 | **15** | The no-blocked-dates conversion |
| `empty-state-adoption.test.ts` → `EXPECTED_EMPTY_STATE_SITES` | 17 | **18** | One call site, in the same commit as the row |

**D-155 is spent in full.** The allow-list's Phase-14 block is now empty and kept as a comment explaining
why — an empty section that says why it is empty is what stops the next Phase-14 surface quietly
re-opening it. The 14-12 row's closing sentence (*"`blocks-editor.tsx` beside it keeps its exemption until
the plan that owns it"*) was corrected in the same commit; leaving it would have been the inventory
describing a list it no longer has.

**The host listing tile KEEPS its `ALLOWED_RAW_CARD` row, with its measured reason unchanged.** That row
is not spent by this phase, and its `"refused"` row in the same file is unchanged too — the gate already
described the tile correctly in both directions, and only the 11-UI-SPEC sentence was wrong.

## The deferred fork is closed, in writing, in both places

`11/deferred-items.md`'s `[11-11]` item left Phase 14 a choice: **(a)** drop `listing-card.tsx` from
`ResultCard`'s *Replaces* list, or **(b)** make the host tile one whole-card anchor and move its controls
off the card. **Option (a) is taken**, which is what 14-CONTEXT § Claude's Discretion and 14-UI-SPEC Open
Question 7 both already recorded.

**The reason:** it is a **management** tile whose footer carries four controls, and `ResultCard` wraps the
whole tile in one anchor. Fed that markup, the HTML adoption-agency algorithm shatters the single anchor
into six and leaves the whole-card link with zero children — plan 11-11 measured that with a real parser
rather than arguing it. A tile that is one whole-card anchor cannot hold interactive children without
nested-interactive accessibility problems.

**This is a SPEC CORRECTION, not a container swap.** `git diff src/components/listing/listing-card.tsx`
is **empty** across all three commits; its local confirm overlay was not converted (it was not named for
conversion in this phase); **no fourth container was added** — DS-11 still says three. The correction is
written beside the line it corrects, and the deferred item that raised it is marked closed, so a later
phase finds a decision in both places rather than an open question in one.

## The amendments were watched failing

Rule 1 of this phase: an inventory amendment nobody has seen go red is a number somebody typed. All four
pinned counts and the deleted allow-list row were probed.

**(1) `EXPECTED_SURFACES` put back to 15:**
```
AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three `Replaces`
lists describe. …: expected 16 to be 15
Tests  1 failed | 10 passed (11)
```

**(2) `adopted` put back to 13:**
```
AssertionError: expected [ { …(4) }, { …(4) }, { …(4) }, …(11) ] to have a length of 13 but got 14
Tests  1 failed | 10 passed (11)
```

**(3) A raw box reintroduced into the converted file, with its allow-list row now gone** — the one that
matters for D-155, because it proves the deletion is load-bearing in the direction 13-08 warned about:
```
AssertionError: a `<Card>` is rendered outside `src/components/patterns/**` by a file that is not on
ALLOWED_RAW_CARD. … Unlisted raw `<Card>` call sites:
src/components/availability/blocks-editor.tsx:154
Tests  1 failed | 10 passed (11)
```

**(4) Both empty-state counts put back to 14 / 17:**
```
AssertionError: the tree's total <EmptyState> call-site count moved. Expected 17 across 14 surfaces.:
expected 18 to be 17
AssertionError: expected 15 to be 14
Tests  2 failed | 31 passed (33)
```

**(5) The empty-state composition removed from the converted file** — the forward half, which an absence
assertion cannot see:
```
AssertionError: an adopter's <EmptyState> call-site count moved:
src/components/availability/blocks-editor.tsx: declared 1, measured 0
AssertionError: the tree's total <EmptyState> call-site count moved. Expected 18 across 15 surfaces.:
expected 17 to be 18
Tests  2 failed | 31 passed (33)
```

Every probe was reverted and the tree re-verified green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The remove-block confirm was ported too, not only the
add-block overlay**

- **Found during:** Task 1.
- **Issue:** The action sentence names the add-block overlay; the acceptance criterion requires
  `grep -c 'from "@/components/ui/dialog"'` to return **0**. `RemoveBlockButton` imported the same eight
  vendored bindings, so porting one and leaving the other would have satisfied the sentence and failed
  the check — and would have left the *removal* confirm, which a host reaches from every block row, on
  the centred dialog the primitive exists to replace at small widths (T-14-13-UNREACHABLE names the
  reachability of a confirm as a functional failure, not a styling one).
- **Fix:** both overlays compose `ResponsiveDialog`. Copy is byte-for-byte in both; `onCloseAutoFocus` is
  left undefined in both, which the pattern's own prop docs name as correct for a stable trigger.
- **Files modified:** `src/components/availability/blocks-editor.tsx`
- **Commit:** `878971e`

**2. [Rule 2 - Missing critical functionality] The vendored close primitive's replacement closes through
the SAME handler, not a bare state setter**

- **Found during:** Task 1, replacing the two dismiss buttons.
- **Issue:** `ResponsiveDialog` exposes no close primitive, so the two dismiss buttons became ordinary
  buttons. The obvious spelling — `onClick={() => setOpen(false)}` — is a behaviour regression on the
  add-block overlay: the shipped `onOpenChange` also **resets the form**, so a host who filled the
  calendar, pressed Cancel, and reopened would have found their half-finished block still there.
- **Fix:** the add-block overlay's open handler is a named function and the Cancel button calls it, so
  every close path — overlay click, Escape, the vendored close button, and Cancel — runs the same reset.
  The remove-block confirm has no form and closes through its own setter, which is all it ever did.
- **Files modified:** `src/components/availability/blocks-editor.tsx`
- **Commit:** `878971e`

**3. [Rule 2 - Missing critical functionality] The plate adopted `PageHeader`, and the 11-11 deferred item
was marked closed**

- **Found during:** Tasks 2 and 3.
- **Issue (a):** `availability/loading.tsx`'s header stated that it rendered its own `<h1>` *because* the
  page's heading was one step larger than the pattern's contract. Task 2 moved the page onto the pattern,
  which spent that reason in the same commit — leaving the hand-rolled heading would have made the plate
  the only place on this route drawing a title the page does not, which is the exact defect a plate
  exists to prevent (14-01's rule). The plan's criteria for the plate name only the shell constant.
- **Issue (b):** Task 3's `<files>` names only `11-UI-SPEC.md`, and its action offers "the same edit or
  this plan's SUMMARY" for recording the closure. But the fork is raised in
  `11/deferred-items.md`, and a reader who goes there would still have found an open question — the same
  stale-record failure mode this whole plan is about.
- **Fix:** the plate composes `PageHeader` with the same two strings; the deferred item carries a
  `✅ CLOSED by 14-13` section with the reason, the empty `git diff` on the tile, and the "no fourth
  container" clause.
- **Files modified:** `src/app/(host)/host/listings/[id]/availability/loading.tsx`,
  `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md`
- **Commits:** `e9fc034`, `8cfd4e4`

### Everything else executed as written

No architectural changes, **no package installs** (T-14-13-SC: zero — `package.json`, `package-lock.json`
and `components.json` are byte-untouched), no schema migrations, no authentication gates, no checkpoints.
`/host/earnings` and every `payout-*` file were left unopened (the earnings freeze). The block CRUD, the
reason mapper, the date/time derivation and the `role="alert"` validation message were not changed — that
message's census and pin are 14-14's.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` | **49 files / 827 passed / 3 skipped / 0 failed** — the baseline exactly, before and after |
| `npm run test:design -- card-pattern-coverage empty-state-adoption sheet-absent leak` | 4 files / 87 passed |
| `npm run test:design -- card-pattern-coverage loading-coverage type-scale` | 3 files / 65 passed — `loading-coverage` still pins 29 / 21 with **zero edits** to its file |
| `npx vitest run tests/availability` | **21 files / 229 passed** — unmoved from the 14-12 baseline |
| `npx vitest run tests/availability tests/listing` | **39 files / 414 passed / 0 failed** |
| `npx tsc --noEmit` | exit **0** (before and after every task) |
| `npx eslint` on all five touched source/test files | exit 0 |
| `git diff --stat drizzle/` over all three commits | **empty** — zero migrations (PROJECT D-136) |
| `git diff components.json / package.json / package-lock.json` | **empty** |
| `git diff tests/design/sheet-absent.test.ts` | **empty** — it stays green with its file unedited; no sheet block fetched |
| `git diff src/components/listing/listing-card.tsx` | **empty** |
| `git diff --diff-filter=D HEAD~3 HEAD` | **empty** — no file deleted by any of the three commits |
| `grep -c 'from "@/components/ui/card"\|from "@/components/ui/dialog"' blocks-editor.tsx` | **0** |
| allow-list rows naming either availability editor | **0** (`ALLOWED_RAW_CARD` is 9 rows, Phase-14 block empty) |
| `grep -n 'listing-card' card-pattern-coverage.test.ts` | still shows the tile's allow-list row and its `"refused"` row, both with reasons unchanged |
| `grep -c 'HOURS_LOCKED'` on the page | **2**, identical to `git show HEAD~3:` |
| Playwright | **not invoked** — this plan's verification section makes it optional, and no spec was needed |

**Three acceptance criteria have a literal reading no source file can satisfy, and the substantive half of
each holds** — the twelfth, thirteenth and fourteenth instance of this repository's grep-versus-comment
collision, reported rather than quietly re-read:

- `grep -c 'HOST_PANEL_SHELL'` returns **2** in each of the page and the plate, not 1: an identifier
  necessarily appears on its own import line as well as at its use. There is exactly **one usage** in
  each, and a grep for the old hand-typed shell string returns **0** in both.
- `grep -c '<h1'` returns **1** in each file, and in both cases the hit is **prose**: the page's comment
  explaining that the title block is now the pattern, and the plate's explaining why it stopped rendering
  its own. No hand-rolled top-level heading ELEMENT remains in either file.
- `grep -c 'Toaster'` returns **3** on the page — the import, the WR-04 comment, and the element. It
  returned 3 before this plan too (`git show HEAD~3:` agrees), and there is exactly one rendered
  `<Toaster />`, on the same node as before.

## Threat Model Disposition

| Threat ID | Disposition | How it was discharged |
|---|---|---|
| T-14-13-ALLOWLIST | mitigated | The row was deleted in the same commit as the swap; both counts re-measured; the deletion observed going red against a reintroduced raw box; a grep proves neither availability editor remains in the list |
| T-14-13-UNREACHABLE | mitigated | BOTH confirms ported to the shared primitive (see deviation 1), which owns the small-viewport presentation; `sheet-absent` green with its file unedited and `components.json` untouched |
| T-14-13-FALSEALARM | mitigated | The shared empty state with `actions={null}`, no retry, neutral tone; adopter and call-site counts moved as part of the work and were watched failing in both directions |
| T-14-13-LOCKCOPY | mitigated | Still composed from the shared constant — identifier count unchanged at 2, and no weekday, date or duration typed into the advisory. `tests/availability` re-ran the lock coverage green (GATE-NOREG 7) |
| T-14-13-CRUD | mitigated | The CRUD paths, the reason mapper and the validation message were not opened; `tests/availability` passes **unedited** at 229 |
| T-14-13-TILE | accepted | Deliberately unchanged; the spec was corrected instead. `git diff` on the tile is empty and its two gate rows are unchanged |
| T-14-13-SC | mitigated | **Zero packages installed.** `package.json`, `package-lock.json` and `components.json` byte-untouched |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. The
page's session + `canHost` re-check and its owner-scoped listing read were not opened by this restyle. No
`## Threat Flags` section is owed.

**No stubs.** Every value the converted surfaces render comes from the props and server reads that already
fed them; there is no hardcoded empty array, placeholder sentence or unwired prop in any touched file.

## For the Next Plan

- **`HFLOW-04` stays open, and deliberately.** It is shared across **six** plans (14-04, 14-07, 14-12,
  14-13, 14-15, 14-16) and **two still carry it**: 14-15 owns the host loading plates' measured skeleton
  heights and 14-16 owns the phase-close gates. 14-07 established the rule this follows — a requirement is
  ticked by the plan that closes its LAST clause, not by each plan that advances it — so
  `requirements-completed` is empty here and `requirements-advanced: [HFLOW-04]` records the half spent.
  `REQUIREMENTS.md` line 81 and its traceability row at line 223 are deliberately left unticked/`Pending`.
- **`blocks-editor.tsx:319`'s `role="alert"` validation message is still 14-14's.** It was read and left
  exactly as it is; its census and its pin belong to that plan.
- **The add-block overlay now renders at the primitive's width**, not its own. If 14-16's 320px sweep or
  the manual pass finds the calendar cramped inside it, the fix is a declared measurement or a change to
  the primitive — not a class reached in at this call site, which `ResponsiveDialog` deliberately does not
  accept.
- **Copy-to-all is still Phase 19** (PROJECT D-136). Nothing here added an editing power; the block row's
  action area is unchanged and still able to hold a per-day control.

**Two standing cautions, re-confirmed here and unchanged:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings. Not
   touched.
2. `e2e/availability.spec.ts:261` is still the pre-existing standing red. Not caused here, not claimed
   here, and no Playwright spec was run by this plan.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All eight claimed files exist on disk and all three claimed commits resolve in `git log`
(`878971e`, `e9fc034`, `8cfd4e4`). No file was deleted by any of the three
(`git diff --diff-filter=D HEAD~3 HEAD` is empty). No missing items.
