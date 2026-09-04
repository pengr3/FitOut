---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 03
subsystem: ui
tags: [tailwind, tailwind-merge, shadcn, flexbox, accessibility, icon-only, hsurf-01, layout-guards]

# Dependency graph
requires:
  - phase: 19-host-listing-surfaces-gates-that-actually-run
    provides: "19-02's e2e/host-listing-grid.spec.ts — the two HSURF-01 guards, watched RED at three bands with numbers, plus seedHostGridFixture"
  - phase: 17-a11y-and-overflow-audit
    provides: "WR-04's measured tailwind-merge deletion and tests/design/clearance-merge-order.test.ts, the gate this plan's D-06 check mirrors"
provides:
  - "The HSURF-01 fix: CardFooter's call-site class becomes `gap-2 mt-auto flex-wrap`, the Delete trigger goes icon-only with an `sr-only` accessible name, and `Trash2 as Trash2Icon` joins the lucide-react import — all at the ONE call site, both vendored primitives untouched"
  - "tests/design/listing-card-merge-order.test.ts — a build-blocking D-06 gate that merges the REAL CardFooter base with the REAL call-site string through the REAL cn and asserts p-4/gap-2/mt-auto/flex-wrap all survive"
  - "evidence/guards-post-fix.txt — both guards GREEN at 320x800, 700x900 and 1280x900, exit 0, 3 passed"
  - "The post-fix numbers: gap below footer 0.000px everywhere; footer scrollWidth == clientWidth exactly (288/288, 322/322, 315/315) with an empty offenders list"
affects: [19-05, 19-07, ui, testing]

actuals:
  tokens: 11400
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A layout class lands on a `className` prop at the call site, never in a vendored `ui/*` primitive — and the proof is a `git diff --stat` on both primitives producing no output, asserted as a task criterion (D-04/D-129)"
    - "New utility tokens are APPENDED to an existing call-site string, never prepended, and a build-blocking design test merges the real strings through the real `cn` to prove none was deleted (D-06 / WR-04)"
    - "An icon-only destructive control keeps its accessible name as an `sr-only` span and stays double-gated behind its ConfirmDialog — icon-only is safe from mis-taps only BECAUSE the confirmation is untouched (D-07)"
    - "A source-reading design gate carries HARD vacuity assertions: an empty regex read must fail, because two empty strings satisfy every claim about their merge"

key-files:
  created:
    - tests/design/listing-card-merge-order.test.ts
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt
  modified:
    - src/components/listing/listing-card.tsx

key-decisions:
  - "D-05's `mt-auto` on CardFooter is the fix that landed, and the alternative (`flex-1` on CardContent) was never reached: the first run of the guards after the edit was green at all three bands with a gap of 0.000px, so there was nothing for assumption A1's fallback to settle."
  - "The Delete trigger ships the `photo-lightbox.tsx:370-373` idiom ALONE — an `aria-hidden` icon plus an `sr-only` span — and NOT the additional `aria-label` the research offered as an equal option. One name-bearing mechanism is legible; two are a thing a future reader has to reconcile, and the span survives a future `asChild` change inside ConfirmDialog's cloned trigger."
  - "`flex-wrap` and the icon-only Delete are BOTH kept even though the measurement shows either alone would clear guard B at `sm` and `lg`. At 320px the footer wraps to two lines (97px tall against 61px elsewhere) and needs the wrap; at `sm`/`lg` the icon-only Delete alone brings 332 under the client width and the footer stays one line. Removing either re-opens a band."
  - "`e2e/tmp-hsurf01-numbers.spec.ts` was written to READ the post-fix numbers the summary owes, then deleted before the final commit. The guards are pass/fail and print nothing when green; changing them to log would have edited the instrument, which is the failure mode this plan's ordering exists to prevent. Spec count is back at 38."
  - "The `>Unlist<` acceptance grep was NOT satisfied by reformatting the Unlist button. It returns 0 at HEAD too — the label is a multi-line JSX child — and both the plan and 19-UI-SPEC's Surface Contract B say the change to that element is NOTHING. The criterion's intent is verified by an equivalent grep instead; see Deviations."

requirements-completed: [HSURF-01]

coverage:
  - id: D1
    description: "The footer band sits flush with the card's bottom edge at every band — the two defects' first half, fixed by `mt-auto` at the call site with Card and CardContent byte-unchanged"
    requirement: "HSURF-01"
    verification:
      - kind: e2e
        ref: "e2e/host-listing-grid.spec.ts#guard A clause 2 @ 320x800 / 700x900 / 1280x900 → gap 0.000px on every card (pre-fix 108.0 / 108.02 / 46.27)"
        status: pass
      - kind: command
        ref: "grep -c 'className=\"gap-2 mt-auto flex-wrap\"' src/components/listing/listing-card.tsx → 1"
        status: pass
      - kind: command
        ref: "grep -c 'className=\"gap-0 pt-0\"' → 1 and grep -c 'className=\"space-y-1 py-4\"' → 1 — both untouched call sites"
        status: pass
      - kind: command
        ref: "grep -cE 'className=\"[^\"]*h-full[^\"]*\"' src/components/listing/listing-card.tsx → 0 — no full-height no-op was added (D-05)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every action control is fully visible and pressable inside its own card at every band — the second defect, fixed by `flex-wrap` on the footer plus D-07's icon-only Delete"
    requirement: "HSURF-01"
    verification:
      - kind: e2e
        ref: "e2e/host-listing-grid.spec.ts#guard B @ three bands → scrollWidth == clientWidth (288/288, 322/322, 315/315), offenders [] (pre-fix scrollWidth 332, offender div.ml-auto flex gap-2)"
        status: pass
      - kind: e2e
        ref: "e2e/overflow-320.spec.ts --project=chromium → 104 passed, 7 skipped, exit 0 — including the /host/listings row's 24px expectTargets scan"
        status: pass
      - kind: command
        ref: "grep -c 'size=\"icon-sm\"' → 1 (size-7 = 28px, above the reviewed 24px bar; no 44px requirement imported)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Neither vendored shadcn primitive was forked, and neither guard spec was edited to reach green"
    requirement: "HSURF-01"
    verification:
      - kind: command
        ref: "git diff HEAD --stat -- src/components/ui/card.tsx src/components/ui/button.tsx → no output"
        status: pass
      - kind: command
        ref: "git diff HEAD --stat -- e2e/host-listing-grid.spec.ts e2e/overflow-320.spec.ts → no output"
        status: pass
      - kind: command
        ref: "ls e2e/*.spec.ts | wc -l → 38 (the temporary measurement spec was deleted)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A standing build-blocking check proves the appended classes all survive tailwind-merge, and the whole design suite is green against the edited card (assumption A8)"
    requirement: "HSURF-01"
    verification:
      - kind: unit
        ref: "tests/design/listing-card-merge-order.test.ts → 5 passed (4 rule + vacuity, incl. the hoist counterfactual)"
        status: pass
      - kind: unit
        ref: "npm run test:design → 74 files, 1336 passed, 3 skipped, exit 0 — status-vocab and card-pattern-coverage did NOT redden"
        status: pass
      - kind: command
        ref: "npx tsc --noEmit → exit 0; npx vitest run tests/listing/listing-card.test.tsx → 15 passed"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Delete control is still named \"Delete\" to assistive technology after going icon-only, behind an unchanged confirmation dialog"
    requirement: "HSURF-01"
    verification:
      - kind: command
        ref: "grep -c 'sr-only' → 3 with the span's text content `Delete`; grep -c 'confirmLabel=\"Delete listing\"' → 1; grep -c 'confirmVariant=\"destructive\"' → 1"
        status: pass
    human_judgment: true
    rationale: "The plan HELD OUT `getByRole(\"button\", { name: \"Delete\" })` resolving on /host/listings as a verification backstop and forbids this plan from writing it (T-19-11). Structural evidence — the `sr-only` span exists, carries the text, and no `aria-label` competes with it — is not the same claim as the browser's accessible-name computation resolving. Verification must run that query; its absence at verify time is `insufficient_spec`, never a silent pass."

# Metrics
duration: 15 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 03: The HSURF-01 Call-Site Fix Summary

**`gap-2 mt-auto flex-wrap` on `CardFooter` plus an icon-only `Delete` carrying an `sr-only` name took 19-02's two watched-red guards to green at all three bands — 108.0/108.02/46.27px of dead card below the footer collapsed to 0.000px everywhere, and a constant footer `scrollWidth` of 332 against 288/322/315 became an exact `scrollWidth == clientWidth` with an empty offenders list — with both vendored `ui/*` primitives byte-unchanged.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-04T01:50:38Z
- **Completed:** 2026-09-04T02:05:00Z
- **Tasks:** 3
- **Files created/modified:** 2 source (1 modified, 1 created) + 1 evidence capture

## The numbers, pre-fix against post-fix (required by the plan's `<output>`)

Pre-fix column: `evidence/guards-pre-fix.txt` (plan 19-02). Post-fix column: `evidence/guards-post-fix.txt`
for the pass/fail result, and a throwaway measurement harness (see Decisions) for the values, because a
green guard asserts and prints nothing.

### Guard A clause 2 — dead card below the footer (`cardBottom − footerBottom`, tolerance 1px)

| Band | Card | Pre-fix | Post-fix | |
|---|---|---|---|---|
| `320 × 800` | 0 / 1 / 2 | 0px (**green before the fix too**) | **0.000px** | one column — see below |
| `700 × 900` | card 0 | **108.0px** RED | **0.000px** | |
| `700 × 900` | cards 1, 2 | 0px | **0.000px** | |
| `1280 × 900` | card 0 | **108.02px** RED | **0.000px** | |
| `1280 × 900` | card 1 | 0px (the tallest — the one the others stretch to) | **0.000px** | |
| `1280 × 900` | card 2 | **46.27px** RED | **0.000px** | |

⚠ **The 320px green is not a fixed defect, before or after.** In a one-column grid every row holds a
single item, the row's height IS that item's height, and `stretch` has nothing to stretch. 19-02's
summary said so before its run did, and it is restated here so a future reader does not read that cell
as evidence. The bands that carry the claim are `sm` and `lg`.

**Post-fix card heights confirm the mechanism rather than a coincidence.** At `1280 × 900` all three
cards report a height of exactly 481.00 with a 61.00px footer and a 0.000px gap — the free space that
used to land *below* the footer is now absorbed *above* it. At `700 × 900` the first visual row is
486.50 / 486.50 and the second-row card is 440.25, which is the row-grouping working: bottoms are
compared within a row, never across.

### Guard B — the footer's own content box (`scrollWidth` ≤ `clientWidth`, no tolerance)

| Band | Pre-fix `scrollWidth` / `clientWidth` | Pre-fix offenders | Post-fix `scrollWidth` / `clientWidth` | Post-fix offenders |
|---|---|---|---|---|
| `320 × 800` | **332 / 288** RED (overrun 44px) | `["div.ml-auto flex gap-2"]` | **288 / 288** | `[]` |
| `700 × 900` | **332 / 322** RED (overrun 10px) | `["div.ml-auto flex gap-2"]` | **322 / 322** | `[]` |
| `1280 × 900` | **332 / 315** RED (overrun 17px) | `["div.ml-auto flex gap-2"]` | **315 / 315** | `[]` |

Only card 1 — the PUBLISHED listing, the only one with four controls — failed pre-fix. Post-fix **all
three** footers at **all three** bands report `scrollWidth` exactly equal to `clientWidth`.

### What each of the two edits actually bought, measured separately

The footer heights separate them, and it is worth reading off because it says why both were kept:

| Band | Post-fix footer height, card 1 (published, 4 controls) | Reading |
|---|---|---|
| `320 × 800` | **97px** | The cluster WRAPPED to a second line. `flex-wrap` is doing the work here. |
| `700 × 900` | **61px** | One line. The icon-only `Delete` alone brought the intrinsic 332 under the 322 client width. |
| `1280 × 900` | **61px** | One line, same reason. |

**Neither edit is redundant.** Drop `flex-wrap` and 320px goes red again (the cluster has nowhere to
go); drop the icon-only `Delete` and `sm`/`lg` wrap unnecessarily or, with the pre-fix intrinsic width,
overrun. The plan's claim that these are two fixes for two defects survives contact with the numbers.

## Which of D-05's two permitted fixes landed, and why (required by the plan's `<output>`)

**`mt-auto` on `CardFooter` — the recommended one — and the alternative was never reached.** The first
run of the guards after the edit reported `3 passed` with a gap of 0.000px on every card at every band,
so assumption A1 (that `mt-auto` might not produce the intended rendering) was settled in the
affirmative on the first measurement. `flex-1` on `CardContent` was not tried, not needed, and is not
in the tree.

Why it was the right one to try first, restated from the plan so the reason survives with the outcome:
`mt-auto` changes one property on one element, it is inert on the `hasActions === false` branch where
no footer renders at all, and it cannot participate in the flex-basis distribution that `AspectRatio`
(a sibling flex item with default `flex-shrink: 1`) takes part in. `flex-1` on `CardContent` would have
changed that element's used height AND its basis, and its failure mode is subtle where this one's is
visible.

**No full-height utility was added to `Card`.** `grep -cE 'className="[^"]*h-full[^"]*"'` returns **0**.
The card boxes already stretch because the grid wrapper declares no `align-items` — that is D-05's
measured no-op, and the gate is scoped to the inside of a `className` string precisely so the docblocks
may argue about the utility by name without invalidating their own check.

## Confirmations the plan's `<output>` asks for, stated plainly

- **Both vendored primitives show no diff.** `git diff HEAD --stat -- src/components/ui/card.tsx
  src/components/ui/button.tsx` → **no output**. T-19-10 mitigated as specified. `npx shadcn add` was
  not run against either.
- **`e2e/overflow-320.spec.ts` is green and byte-unchanged.** `--project=chromium` → **104 passed, 7
  skipped, exit 0**, including the `/host/listings` row's `touch: []` declaration and its 24px
  `expectTargets` scan. `git diff HEAD --stat` on it (and on `host-listing-grid.spec.ts`) → **no
  output**. No assertion was edited to reach green; T-19-13 mitigated.
- **`npm run test:design` → exit 0. 74 files, 1336 passed, 3 skipped.** **Assumption A8 is settled
  NEGATIVE:** `tests/design/status-vocab.test.ts` did **not** redden from an `sr-only` "Delete", and
  `tests/design/card-pattern-coverage.test.ts`'s two `listing-card.tsx` entries behaved as the
  allow-list *status* the research read them to be, not as class pins.
- **Spec count is 38**, unchanged by this plan (`ls e2e/*.spec.ts | wc -l`). Phase 19 ends at 39;
  `19-06` adds `host-route-reachability.spec.ts`.

## Task Commits

1. **Task 1 — the call-site edit** — `48c7480` (`fix`) — 72 insertions, 4 deletions in
   `src/components/listing/listing-card.tsx`
2. **Task 2 — the standing merge-order check** — `aa48a6c` (`test`) — 147 insertions, new file
   `tests/design/listing-card-merge-order.test.ts`
3. **Task 3 — both guards green, plus the 320px regression check** — `1c920e2` (`test`) — new file
   `evidence/guards-post-fix.txt`

## Files Created/Modified

- `src/components/listing/listing-card.tsx` — three edits, all at the call site: the footer class
  becomes `gap-2 mt-auto flex-wrap` (appended, never prepended); the `Delete` trigger becomes
  `size="icon-sm"` with an `aria-hidden` `Trash2Icon` and an `sr-only` span carrying the name, keeping
  `variant="ghost"` and `className="text-destructive"`; the `lucide-react` import gains
  `Trash2 as Trash2Icon`. Each carries a docblock with its argument and what pins it.
- `tests/design/listing-card-merge-order.test.ts` — the D-06 standing gate. Reads `CardFooter`'s base
  out of `ui/card.tsx` and the call-site string out of `listing-card.tsx`, merges them through the real
  `cn`, and asserts `p-4`, `gap-2`, `mt-auto` and `flex-wrap` all survive. Two HARD vacuity gates (an
  empty regex read fails rather than passing over two empty strings) and a counterfactual test that
  proves the gate WOULD redden on the hoist WR-04 measured.
- `.planning/…/evidence/guards-post-fix.txt` — the verbatim `--reporter=list` capture, exit 0.

## Decisions Made

- **`mt-auto`, not `flex-1`** — see above; settled by the first measurement, not by argument.
- **The `sr-only` span alone, no `aria-label`.** The research offered both and said either is correct.
  The `photo-lightbox.tsx:370-373` idiom was chosen: one name-bearing mechanism rather than two to
  reconcile, and DOM text survives Radix cloning the trigger and any future `asChild` change.
- **A throwaway spec produced the post-fix numbers.** `e2e/host-listing-grid.spec.ts` prints nothing
  when green, and editing it to log would have touched the instrument this plan's whole ordering exists
  to keep untouched. `e2e/tmp-hsurf01-numbers.spec.ts` was created, run once, read, and **deleted**
  before the final commit — it never entered git, and `ls e2e/*.spec.ts | wc -l` is back at **38**.
- **`evidence/guards-post-fix.txt` was kept VERBATIM**, hydration noise included, rather than filtered
  to satisfy a mechanical string check. See Deviations.

## Deviations from Plan

### Documented, not auto-fixed

**1. [Plan-authoring defect] Task 1's `grep -c '>Unlist<'` acceptance criterion is unsatisfiable
without editing an element the plan and the UI-SPEC both say to leave alone**

- **Found during:** Task 1's acceptance-criteria gate.
- **Issue:** The criterion reads "`grep -c '>Unlist<' src/components/listing/listing-card.tsx` returns
  1 — Unlist kept its visible label." **It returns 0 at HEAD as well** (measured before any edit): the
  label is a multi-line JSX text child —
  `<Button variant="ghost" size="sm">` / `Unlist` / `</Button>` — so the substring `>Unlist<` has never
  existed in this file. The only way to make the literal grep return 1 is to collapse that element onto
  one line, and both the plan (⚠ "Unlist at `:451` keeps its label … the `div.ml-auto` at `:449` is
  unchanged") and `19-UI-SPEC` Surface Contract B (Unlist `Button` → change: **NOTHING**) forbid
  touching it. This repo ships no Prettier or Biome config, so nothing would have reformatted it back.
- **Resolution:** The element was left byte-unchanged and the criterion's INTENT was verified by an
  equivalent, formatting-independent check:
  `grep -cE '^\s*Unlist$'` → **1**, the surrounding `ConfirmDialog` trigger is intact with
  `confirmLabel="Unlist space"` / `confirmVariant="secondary"`, and `git diff` shows no hunk touching
  lines `449–463`. The rendered visible label is unchanged.
- **Files modified:** none (this deviation is the decision NOT to modify one).
- **Verification:** as above, plus `npx vitest run tests/listing/listing-card.test.tsx` → 15 passed.
- **Commit:** `48c7480` (the task the criterion belongs to).
- **⚠ Carry-forward:** if a future plan restates this criterion, write it as `grep -cE '^\s*Unlist$'`
  or as a rendered-output assertion. A grep that assumes a formatting the file has never had reports a
  fix as broken.

**2. [Evidence integrity] Task 3's `fails_when` string check has a false positive against pre-existing
WebServer stderr, and the capture was NOT doctored to clear it**

- **Found during:** Task 3's `<verify>`.
- **Issue:** The `fails_when` reads "Exit code is non-zero, **or `guards-post-fix.txt` contains the
  string `failed`**". The capture contains exactly one occurrence, at line 9:
  `Uncaught Error: Hydration failed because the server rendered HTML didn't match the client` — the
  **pre-existing** `NavDrawer` / `ResponsiveDialog` hydration mismatch in the site nav that plan 19-02
  already logged to `deferred-items.md` as D1, printed on the dev server's stdout and forwarded by
  Playwright's `[WebServer]` prefix. It is not a Playwright result.
- **Resolution:** The capture was left **verbatim**. Filtering the WebServer stream out of an evidence
  file to make a grep clear it is doctoring evidence, and this phase's whole ordering is built on
  captures being trustworthy. The substantive condition is met and is stated here so the discrepancy is
  legible rather than discovered: **exit code 0**, the final line reads `3 passed (24.6s)`, all three
  result lines begin `ok`, and there is no `✘`/`failed` test line anywhere in the file.
- **Files modified:** none.
- **Verification:** `grep -c 'failed'` → 1, and `grep -n 'failed'` shows the single hit is the
  hydration warning; `grep -cE '^\s+ok '` → 3.
- **Commit:** `1c920e2`.

### Auto-fixed Issues

None. No bug, no missing critical functionality and no blocker was encountered. The three edits landed
as specified and the first guard run after them was green.

---

**Total deviations:** 0 auto-fixed, **2 documented** (1 unsatisfiable acceptance criterion, 1
false-positive evidence check).
**Impact:** No assertion was weakened, no tolerance widened, and no forbidden element was edited to
reach a green. Both deviations are the decision NOT to change something in order to satisfy a check
whose literal form is wrong — which is the direction this phase's constraints point.

## Issues Encountered

- **The guards print nothing when green**, which the plan's `<output>` requirement for a pre/post
  numbers table does not anticipate. Handled by a deleted throwaway spec (see Decisions). A future
  plan wanting numbers from a passing guard should say where they come from.
- **The `NavDrawer` hydration mismatch (19-02's deferred D1) is still present** and appears in both the
  guard capture and the `overflow-320` run. Out of scope by the scope boundary: this plan changed one
  component under `listing/`, and the trace names `site-chrome.tsx` / `responsive-dialog.tsx` under
  `HostLayout`. It affects no measurement here — the grid is server-rendered, both guards read geometry
  after the `<h1>` is visible, and guard B reported identical widths across every card and band.

## Threat Flags

None. This plan introduces no network endpoint, no auth path and no schema change.

- **T-19-10 (fork of a vendored primitive) — mitigated.** `git diff HEAD --stat` on `ui/card.tsx` and
  `ui/button.tsx` → no output.
- **T-19-11 (accessible name lost with the label) — mitigated as far as this plan may go.** The
  `sr-only` span exists and carries `Delete`; the resolving `getByRole` query is HELD OUT for
  verification by design and is recorded as `human_judgment: true` in the coverage block above.
- **T-19-12 (destructive action without confirmation) — mitigated.** The `ConfirmDialog` is unchanged:
  `confirmLabel="Delete listing"`, `confirmVariant="destructive"`, title "Delete this listing?".
- **T-19-13 (importing a 44px bar) — mitigated.** `size="icon-sm"` = `size-7` = 28px ≥ the reviewed
  24px scan; `e2e/overflow-320.spec.ts` is byte-unchanged and green.
- **T-19-14 (class deletion under tailwind-merge) — mitigated.** Classes appended, and
  `tests/design/listing-card-merge-order.test.ts` is build-blocking.
- **T-19-SC (package installs) — not engaged. ZERO packages installed.**
  `git diff --name-only 48c7480~1..HEAD -- package.json package-lock.json` reports 0 files.
  `lucide-react` was already imported at `listing-card.tsx:38`; `sr-only`, `mt-auto` and `flex-wrap`
  are stock Tailwind utilities.

## Known Stubs

None. All three edits are complete as specified, and nothing was left placeholder-shaped.

## User Setup Required

None.

## Next Phase Readiness

**HSURF-01's fix is landed and proven by the instrument written to fail against it.** Ready for the
next wave.

Carry-forward for whoever picks this up:

- **The held-out backstop is still owed at verify time:** `getByRole("button", { name: "Delete" })`
  must resolve on `/host/listings`. This plan deliberately did not write it (T-19-11). Its absence at
  verification is `insufficient_spec`, never a silent pass.
- **Do not "tidy" the footer's class string.** `gap-2 mt-auto flex-wrap` is order-sensitive by
  mechanism, not by taste; `tests/design/listing-card-merge-order.test.ts` is build-blocking and will
  say so, and the docblock at the site carries the WR-04 precedent.
- **Both edits are load-bearing at different bands.** `flex-wrap` carries 320px (the footer wraps to
  97px there); the icon-only `Delete` carries `sm` and `lg` (one 61px line). Removing either re-opens a
  band that currently reads as comfortably green.
- **The `NavDrawer` hydration mismatch is unowned** and now observed on three separate runs. Still in
  `deferred-items.md`.
- **19-05 should still read 19-02's "Incidental finding"** before writing its probe protocol. Nothing
  in this plan touched it; `/host/listings` served correctly throughout, against the `.next` 19-02
  cleared.
- **Spec count is 38**, unchanged here, 39 at phase end.

## Self-Check: PASSED

Files claimed, verified present on disk:

- `FOUND: src/components/listing/listing-card.tsx`
- `FOUND: tests/design/listing-card-merge-order.test.ts`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt`

Commits claimed, verified present in `git log --oneline --all`:

- `FOUND: 48c7480` (Task 1)
- `FOUND: aa48a6c` (Task 2)
- `FOUND: 1c920e2` (Task 3)

Plan-level `<verification>` re-run at close-out:

1. `npx tsc --noEmit` → exit **0** — PASS
2. `npm run test:design` → exit **0**, 74 files / 1336 passed — PASS
3. Both guards green at three bands, captured in `evidence/guards-post-fix.txt` (`3 passed`, exit 0) — PASS
4. `npx playwright test e2e/overflow-320.spec.ts --project=chromium` → **104 passed, 7 skipped**, exit 0 — PASS
5. `git diff HEAD --stat -- src/components/ui/card.tsx src/components/ui/button.tsx` → no output — PASS

Plan `<success_criteria>`:

- Every card in a row ends at the same bottom edge with the footer flush to it, at all three bands —
  PASS (gap 0.000px on every card; guard A clause 1 green)
- Every action control is fully visible and pressable inside its own card at all three bands — PASS
  (`scrollWidth == clientWidth` exactly, offenders `[]`; `overflow-320`'s 24px scan green)
- Delete is icon-only and still named "Delete" to assistive technology, behind its unchanged
  confirmation dialog — PASS structurally; the browser-resolved name is the HELD-OUT backstop
- Neither vendored primitive was edited; no full-height no-op was added — PASS (no diff; `h-full` in a
  class attribute → 0)

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*
