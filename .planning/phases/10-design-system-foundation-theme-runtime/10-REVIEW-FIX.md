---
phase: 10-design-system-foundation-theme-runtime
fixed_at: 2026-08-12
review_path: .planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md
iteration: 3
supersedes: "the second fix pass's report (git show ec2af05:.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW-FIX.md)"
fix_range: ff896a9..20df90c
findings_in_scope: 16
fixed: 14
no_change_needed: 2
skipped: 0
status: all_addressed
---

# Phase 10 — Code Review Fix Report (iteration 3)

**Fixed at:** 2026-08-12
**Source review:** `.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md`
**Iteration:** 3
**Commits:** `ff896a9..20df90c`, fourteen of them, one per finding

**This file replaces the SECOND fix pass's report.** That report is preserved in git at `ec2af05` and
readable with
`git show ec2af05:.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW-FIX.md`.
It covered CR-01..CR-03 and WR-01..WR-12, which were resolved in `40d7cbe..ce155fe` and are **not**
revisited here. This pass covers the 16 Info findings, IN-01..IN-16, which both prior passes left
untouched.

**Summary**

- Findings in scope: **16** (IN-01..IN-16)
- Fixed: **14**
- Already resolved / moot, no change needed: **2** (IN-04, IN-16)
- Skipped: **0**

---

## Verification

Run in the main repo, where dependencies are present.

| Command | Baseline (`ec2af05`) | Final (`20df90c`) |
|---|---|---|
| `npm run test:design` | 21 files / 441 tests passed | **21 files / 449 tests passed** |
| `npx tsc --noEmit` | clean (exit 0) | **clean (exit 0)** |
| `npm run lint` | 0 errors, 9 warnings | **0 errors, 9 warnings** (the same 9, itemised and compared) |
| `git status --porcelain` | `?? scope.tmp.txt` | **`?? scope.tmp.txt`** |

The suite grew by 8 tests. **No pre-existing assertion was weakened, deleted or re-pinned to a looser
number.** The only assertions removed anywhere are IN-15's two subsumed ones, and their removal was
justified by showing they can never fail independently and then showing the surviving assertion still
catches the regression they existed for.

**`npm test` (the main unit suite) was NOT run — it requires a provisioned Postgres this environment
does not have.** Non-design suites therefore remain unexercised by this pass, as by both previous
passes and by the review. The one non-design file this pass edited
(`tests/booking/booking-status.test.ts`, a pure no-IO unit file) **was** executed, through a
throwaway DB-free Vitest config: 26/26 before and after, and its red state was observed too.

**Every probe was reverted.** All scratch files lived in an untracked `.probe/` directory which has
been deleted; it was never committed (`git log --all -- .probe` is empty).

### Deviation from the agent's default isolation

This pass ran in the **main working tree**, not a dedicated git worktree, on the orchestrator's
explicit instruction ("dependencies are installed; verify in the main repo"). A fresh worktree has no
`node_modules`, and this pass depended on running Vitest, ESLint, `tsc`, Tailwind's compiler and a
real Chromium — none of which would work there. Recorded because it is a deliberate departure.

---

## The method this pass was held to

The review's through-line is that a previous pass **wrote comments claiming a gate closed an escape
without ever running the escape**. So for every finding that is a claim about behaviour:

1. Locate the finding by its described CONTENT — every line number in the Info set is stale, nine
   commits having rewritten those files.
2. Construct the case in the real tree.
3. Run it. **Observe the wrong behaviour.**
4. Fix.
5. Run the same case again. **Observe the right behaviour**, and check the message names the file.
6. Revert the probe.

For the prose findings (IN-01, IN-03) the bar was that the corrected sentence is *true*, checked
against the code or recomputed arithmetic — not merely plausible.

**Five of the sixteen findings turned out to be partly or wholly wrong, and that only surfaced
because each was run rather than applied.** Those are called out below; they are the most important
part of this report.

---

## Where the review was wrong

Recorded first, because a fix report that silently "fixes" a misdiagnosis is the same defect class
the review exists to correct.

- **IN-08's literal example is not an escape.** The finding says `findDesignLeaks("text-[14PX]")`
  returns `[]` and asks for one `i` flag. Compiled against the installed Tailwind with
  `source(none)`, `text-[14PX]` emits `color: 14PX` — Tailwind's data-type inference is
  case-sensitive, so the bare uppercase unit is read as a colour and never bypasses the type scale.
  The **hinted** twin `text-[length:14PX]` *does* emit `font-size: 14PX`, and that is the real
  escape. A blanket `i` flag would also have made the gate report `TEXT-[14px]`, `bg-ZINC-50` and
  `bg-WHITE`, none of which is a Tailwind class — inventing violations. Fixed precisely instead.

- **IN-16 is moot; both its claims are false.** `lucide-react` adds `aria-hidden="true"` itself
  (`dist/cjs/lucide-react.js:92`: `...!children && !hasA11yProp(rest) && { "aria-hidden": "true" }`).
  Rendered, `<XIcon />` produces `<svg class="lucide lucide-x" aria-hidden="true">` — byte-identical
  to the explicit form. The supporting claim that it is "unlike every other lucide glyph in the tree"
  is also wrong: `calendar.tsx`, `checkbox.tsx`, `command.tsx`, `dropdown-menu.tsx`, `select.tsx` and
  `sonner.tsx` all omit it, as do several app components.

- **IN-14's suggested fix would have caused a regression, and it under-reported the blast radius.**
  The review proposes the shadcn definite-height idiom. Measured in Chromium, `h-96` with 2 rows
  forces a 384px box padded with empty space, where the shipped `max-h` intent keeps it at 80px. Also
  the finding names only `notification-bell.tsx`; **both** ScrollArea call sites in the repo use the
  max-height idiom, so `slot-picker.tsx`'s time-slot grid had the identical bug.

- **IN-11's stated complaint was already resolved.** It says the surface-blindness is "no longer
  stated anywhere now that the alpha-blind bullet is wrong (WR-04)". WR-04's fix in the previous pass
  rewrote that bullet and states it precisely. The blindness itself is real, and is now pinned.

- **IN-13 names two files; only one was affected.** `status-vocab.test.ts`'s half was already closed
  by CR-01's `classSetsForElements`, which unions template parts. Verified by running a
  template-split retired pairing through it — still caught.

And one place the review **under**-reported:

- **IN-03's sentence carries a second false claim the review did not catch.** Beyond the stale "error
  ring", the same sentence calls §6 "the only place on the page where the destructive token appears
  at rest". It is one of three.

---

## Fixed Issues

### IN-01 — the recomputed solid brand contrast

**File:** `src/components/availability/slot-picker.tsx` · **Commit:** `ff896a9`

Recomputed from the shipped tokens with `contrast.test.ts`'s own arithmetic (8-bit hex, WCAG 2.x
luminance) rather than copying the review's figure, since the review notes the error propagated from
an earlier document: **court 4.5664, grove 4.5721**. Both are 4.57; the recorded "4.53" is wrong.

It matters because the phase's bar is `TEXT_BAR + AA_EPSILON` = **4.55**, so as written the note
claimed the CR-03 fix landed *below* the phase's own threshold on grove while the `CONTRAST_PAIRS`
row for the same pairing is green — a comment contradicting the gate beside it. The note's other
numbers (3.38 / 3.51) reproduce exactly and were left alone.

### IN-02 — the dead invalid-ring zeroing in the input group

**File:** `src/components/ui/input-group.tsx` · **Commit:** `f275816`

`aria-invalid:ring-0` on `InputGroupInput`/`InputGroupTextarea` cancelled a ring that CR-01 deleted
from every primitive. Verified dead on two axes: a repo-wide grep for `aria-invalid:ring-` returns
only these two lines plus a comment; and run through the real `cn()`/twMerge path against `Input`'s
base string, removing it changes the merged output by exactly that one class.

The same probe confirmed the **`focus-visible:ring-0` neighbour is load-bearing and stays** — it
displaces the base's `focus-visible:ring-2`, absent from the merged result in both directions,
because the group paints focus on the wrapper.

### IN-03 — the `/dev/theme` form-row note, both halves false

**File:** `src/app/dev/theme/fixtures.ts` · **Commit:** `977fdea`

The note promised "the destructive border treatment **and the error ring** on a REAL control". CR-01
removed that ring.

Checked what the fixture actually renders rather than trusting the review's assumption: the invalid
control is the rate `<Input>`, and the Checkbox beside it is `defaultChecked` but **not**
`aria-invalid` — so WR-01's checked+invalid border does not apply here and nothing on the page
exercises it. Said so, since it is the natural next question.

The same sentence also claimed §6 was the only resting destructive on the page. It is one of three:
`BUTTON_HIERARCHY` renders a solid `destructive` Button, and `PAYOUT_STATE_FIXTURES` renders `failed`
as the destructive Alert. Every other component the page imports was checked — the only other
destructive utilities in reach are gated behind `aria-invalid` on Checkbox and Select, neither of
which is invalid here.

### IN-05 — the `@theme inline` slice, and a silently-dropped role

**File:** `tests/design/type-scale.test.ts` · **Commit:** `837e6d9`

Two holes, both reproduced first.

**The slice ran to end of file** while its comment described it as reading "the `@theme inline`
block". Planting `--text-ghost: var(--fs-ghost)` sixty lines *below* the block's closing brace
produced six failures on a declaration outside the block. The per-theme blocks below do declare
`--text-xs`/`--text-sm`/…; they escape only because they point at fixed rem values, which is luck.
Now depth-counted to the matching brace, skipping comments — and the skip is load-bearing, not
decoration: probed against a synthetic block with a `}` inside prose, the un-skipped matcher
truncates and silently drops a role. Extraction now covers exactly lines 34–139.

**`--text-caption: var(--fs-caption-sm)` was dropped in silence** — 38/38 green. That is the one
direction this derivation must never fail in: the utility is emitted, but the role never reaches the
equality assertion, so `utils.ts` is never told it is a font-size role, so tailwind-merge treats it
as a colour and deletes it — verbatim the defect the header says the derivation exists to make loud.
Mismatches are now collected and asserted empty; re-run with the same probe, 1 failed quoting the
declaration.

### IN-06 — the arbitrary opacity spelling

**File:** `tests/design/brand-recipe.test.ts` · **Commit:** `331f437`

Re-derived against the post-WR-07/08/09 tree as instructed: **the gap survives the rewrite.** Both
scans still read `\/\d+`.

Isolated on the real tree, same dilution, two spellings: `bg-accent/35` → 1 failed naming the file;
`bg-accent/[0.35]` → **442/442 green**. (The first attempt used `bg-brand`, which a separate
"no `bg-brand` in any form" gate catches for unrelated reasons, so the isolating case had to be a
non-brand token.) `pair-drift.test.ts` has always known the spelling exists — it keys the arbitrary
form `NaN` — so one of three gates understood it and two were blind.

Both scans now accept a bracketed modifier, keeping the bracket verbatim in the inventory key so a
new spelling arrives as a NEW key rather than folding into an entry measured for the other form.
Re-ran both escapes after the fix: red, naming file and shape.

### IN-07 — the leak rule id's arity

**File:** `eslint.config.mjs` · **Commit:** `6a710e0`

Both malformed shapes run against the installed ESLint 9.39.4:
`"@fitout/design/no-raw-design-value"` → *could not find plugin "@fitout/design"*;
`"no-raw-design-value"` → `TypeError: Could not find "no-raw-design-value" in plugin "@"` plus a
stack trace. Neither message mentions the split, so both send the reader to the plugin registration
rather than the constant. After the guard, both fail naming the arity, the value and the file to
edit.

### IN-08 — uppercase CSS units in two leak patterns

**Files:** `config/design-leak-patterns.mjs`, `tests/design/leak.test.ts` · **Commit:** `14fa3d1`

See "Where the review was wrong" for why this is not the one `i` flag the finding asks for. Only the
**unit** is loosened, because CSS units are ASCII case-insensitive while Tailwind class names and
data-type hints are not.

Swept the same defect in `raw-hex` rather than leaving its twin open — its anchor is built from CSS
units and keywords, so `1PX SOLID #CCC` was unmatched. Checked through a real CSS parser's computed
style rather than read off the spec: it computes to `1px solid rgb(204, 204, 204)`, identical to the
lowercase form. Verified end-to-end through **both** halves of D-16: planted in `booking-row.tsx`,
`npx eslint` reports `text-[length:14PX]` and `SOLID #CCC`.

### IN-09 — first-match-only in both consumers

**Files:** `eslint.config.mjs`, `tests/design/leak.test.ts` · **Commit:** `158bec9`

`bg-white text-black` on `booking-row.tsx` before: **1 error** from ESLint, **1 finding** from Vitest.
After, with a third leak added: **3 and 3**. Two *different* patterns in one literal already worked —
the loop is over patterns — it was two hits of the *same* pattern that vanished.

The `g` flag goes on a local clone, never on the shared pattern: the list's header records that its
entries are `g`-less because a `g`-flagged RegExp carries `lastIndex` between calls, and
`findDesignLeaks` still calls `.test()` on the original stateless object.

### IN-10 — the dead `edge` role

**File:** `tests/design/pair-drift.test.ts` · **Commit:** `23fff60`

Neither deleted nor switched on. A border or ring colour against the fill behind it is a real
non-text pairing — `border-destructive/40` on `--card` at 2.13:1 is one, and WR-07 had to give it an
`EXCLUDED_PAIRS` row — so consuming the role mints pairings that each need measuring and then
declaring or exempting. The size of that was **measured, not guessed**: wiring `edge` into the
foreground side produces **ten** undeclared pairings immediately. Writing ten exemptions nobody
measured is precisely the failure this review exists to correct.

So it is recorded as a deliberate gap and pinned: the test asserts edges *are* classified, that they
produce no pairing, and that an edge beside a real fg/bg pair does not suppress it. Verified a real
pin — wiring edges up turns it red.

### IN-11 — pair-drift's surface-blindness

**File:** `tests/design/pair-drift.test.ts` · **Commit:** `e13dbaa`

Confirmed still open, and confirmed already documented — see "Where the review was wrong".

The blindness is real: the two `destructive/destructive` rows differ only in `alpha.over`, carry the
same `0.1`, and mint an identical key. It is also genuinely unfixable here, and closing it would make
the gate worse — the scan reads a class *string*, and `bg-destructive/10` carries no information
about what is behind it, so putting `over` in the key would leave every declared alpha row
unmatchable and turn this gate into a false-positive generator.

What was missing was not prose but a **pin**. The new test asserts the collapse, asserts the inventory
really measures more than one surface, and instructs the reader to delete it and the header bullet
together if the key ever becomes surface-aware. Verified: making `pairKey` surface-aware turns it red.

`tsc` — not Vitest — caught that the rows needed the `ContrastPair[]` cast, which is the hazard the
file's own comment records: Vitest transpiles without typechecking.

### IN-12 — the rounded opacity key

**File:** `tests/design/pair-drift.test.ts` · **Commit:** `d80b306`

Run with a probe row declaring `alpha.value: 0.125`:

```
bg-muted/12  -> keys @12%, row keys @13%  -> reported "not in CONTRAST_PAIRS" although the row exists
bg-muted/13  -> keys @13%, row keys @13%  -> PASSES. A 13% tint waved through on a 12.5% measurement.
```

The second is WR-05's defect class exactly. `contrast.test.ts` stayed green throughout — it measured
the row it was given, and the row was fine; the fault is entirely in the lookup.

Two changes, because not rounding alone is not enough: the percent is normalised with `toFixed` (still
absorbing the float error that makes `0.1 * 100` come out `10.000000000000002`), **and** a fractional
row is now loud at declaration time, since `classifyUtility` reads `/^\d+$/` and so can never produce
a fraction — such a row is unreachable by construction. Re-ran with the probe: the guard names the row
and `/13` is correctly reported as undeclared.

### IN-13 — template chunks in the focus walker

**File:** `tests/design/focus-recipe.test.ts` · **Commit:** `17011b2`

A complete, correct recipe split by an interpolation was reported as an uncoloured offset — verified
on `booking-row.tsx`, one failure naming file and line. False-positive direction, so nothing shipped
wrong, but a gate that cries wolf on a legal shape is how a gate ends up disabled.

Joining is **per-template, not per-element**, and that distinction is the safety property: the static
parts of one template always render together and unconditionally, so this cannot mint a false
exemption the way merging `cn()`'s conditional arguments could. Two separate literals remain two
chunks, so WR-02's sibling-vouching property is untouched. Parts join with a space so `` `bg-${x}-500` ``
cannot fuse into a token nobody wrote. Confirmed the gate did not go blind: the same template with the
offset colour genuinely absent is still reported.

### IN-14 — ScrollArea's max-height cap

**File:** `src/components/ui/scroll-area.tsx` · **Commit:** `b357f53`

**Reproduced in a real browser, which the review could not do** — Playwright with a chromium cache is
installed here, so this stopped being theoretical.

The viewport's `size-full` is `height: 100%`, and a percentage height resolves against the containing
block's *height*; a `max-height` does not make that definite, so it falls back to `auto` and the
viewport grows to full content height. The viewport carries `overflow: scroll`, so when it is exactly
as tall as its content there is nothing to scroll — the cap clamps the Root while content spills past
it (Radix's Root is only `position: relative`; it does not even clip).

Measured in Chromium, `max-h-96` with 20 rows:

| | root | viewport | scrollable |
|---|---|---|---|
| shipped | 384px | **800px** | **false** — overflows by 416px |
| fixed | 384px | 384px | **true** |

Fixed in the **primitive**, because both call sites use the max-height idiom and both were broken.
`max-h-[inherit]` rather than the review's `h-96`, for the regression reason in the section above;
`rounded-[inherit]` was already on the same element, so the idiom is this file's own. Also verified a
Root with no cap inherits `none` and is unchanged, and a definite height still works.

**Not covered by any gate** — layout is the class of thing the design suite explicitly cannot see.

### IN-15 — the subsumed tone assertions

**File:** `tests/booking/booking-status.test.ts` · **Commit:** `20df90c`

Demonstrated rather than argued: mutating `approved`'s tone to `"attention"` fails
`toBe("neutral")` and leaves `not.toBe("positive")` green, so the negative assertion is never the one
that catches anything.

Coverage is unchanged and that was checked too — with the pair reduced to one assertion, mutating
`approved` to `"positive"` (the actual regression these lines exist to prevent) still fails both
sites, now with a message carrying the intent the deleted line held.

---

## Findings that needed no change

### IN-04 — the badge link-hover claim — **MOOT**

The claim lives only in the **superseded first-pass report**, a historical git object at `2ae81de`.
The current report (at `ec2af05`, which this file replaces) does not mention `badge.tsx` at all
(`grep` for "badge" returns nothing), and the claim was not echoed into any source comment —
`badge.tsx`'s prose describes the fix and its arithmetic without asserting it changed a rendered
surface.

The underlying fact is correct and was verified: there are **zero** `<Badge variant="destructive">`
call sites and **zero** `<Badge asChild>`, and no dynamic `variant` can resolve to `destructive` —
`booking-status-badge` and `payout-state-badge` produce only `secondary`/`outline` (`failed` routes
to an Alert, not a Badge), and `listing-card`'s is typed `"default" | "secondary"`. The destructive
link-hover is unreachable today.

Nothing to change: rewriting history is not an option, and the document carrying the false claim has
already been replaced.

### IN-16 — the dialog `XIcon`'s `aria-hidden` — **MOOT**

`lucide-react` supplies it. See "Where the review was wrong" for the source line and the rendered
output. Impact is nil — as the finding itself allows — and the inconsistency it reports does not
exist.

One genuine observation while checking: the element is formatted as a dangling
`<XIcon` / `/>` pair, which looks like edit residue. It is **not** this phase's: `git show` puts it
in the original shadcn scaffold at `f84dd12` (phase 1), and phase 10's only change to `dialog.tsx`
was the overlay token. Left alone and recorded rather than tidied.

---

## Known gaps this pass did NOT close

Listed so this report is not read as claiming more than it did.

- **`pair-drift`'s surface-blindness remains** and is inherent — now pinned rather than only
  described (IN-11).
- **`pair-drift`'s `edge` role remains unconsumed**, deliberately, with the ten-pairing cost measured
  and the gap pinned (IN-10).
- **`pair-drift` still cannot see a `cn()`-split pairing**, and the `cva` base/variant split remains
  open in `status-vocab.test.ts` — both carried forward from the previous pass, untouched here.
- **Twenty-one diluted composites are still `recorded` rather than `declared`/`exempt`.** Measuring
  and classifying each is a design pass. IN-06 widened what the inventory can *see*; it did not
  classify anything.
- **`text-[length:1.5REM]` compiles to a real `font-size` and is still unmatched**, because the
  pattern is px-only by resolved decision (UI-SPEC Q2). Recorded in the pattern's comment rather than
  silently missed.
- **Non-design suites remain unexercised.** `npm test` needs a provisioned Postgres. Only
  `tests/booking/booking-status.test.ts` was run out-of-band; every other suite outside
  `tests/design/**` has not been run by this pass, either previous pass, or the review.
- **Layout is still ungated.** IN-14 was a real rendered defect that 449 design tests could not see,
  and nothing added here changes that — it was caught with an ad-hoc Playwright probe, not a gate.
  A rendered-DOM pass (the phase's own Phase 17 note) is where that coverage belongs.

---

_Fixed: 2026-08-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3 · supersedes the report at `ec2af05`_
