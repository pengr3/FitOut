---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 09
subsystem: design-system
tags: [state-02, state-04, resp-01, patterns-layer, overlay, z-scale, discriminated-union, error-leak, registry-safety, absence-gate]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-07's `patterns/` membership rules and the `role=\"status\"` nameFrom:author finding; plan 11-08's `PanelCard` `py-0` composition and its two moved elevation/z inventories; plan 11-02's `selector-contract.ts`, which declares all three ids this plan owns, and its undeclared-id ban; plan 11-01's design suite inside `npm run build`"
  - phase: 10-design-system-token-layer
    provides: "`ui/dialog.tsx`'s `className` composition surface and its `z-(--z-dialog)` overlay/content pair, `status-tones.ts`'s four-tone closed union, `contrast-pairs.ts`'s `EXCLUDED_PAIRS`-with-reasons idiom, the four-step z scale and `elevation-z.test.ts`'s per-file inventories, `helpers/strip-comments.ts`"
provides:
  - "`src/components/patterns/empty-state.tsx` — STATE-04's single shell, with `tone`/`icon` as a discriminated union so `tone=\"positive\"` owns its glyph by TYPE"
  - "`src/components/patterns/error-state.tsx` — STATE-02's two-action surface; T-11-ERRLEAK mitigated by the ABSENCE of an `error` prop, and `routeOut` required so a one-button error surface will not compile"
  - "`src/components/patterns/responsive-dialog.tsx` — RESP-01's one mobile-overlay primitive, composed over `ui/dialog` with `max-sm:`-only classes"
  - "`tests/design/sheet-absent.test.ts` — the permanent gate over three absences: the uninstalled `sheet` block, `--z-sheet`'s zero call sites in both signs, and the bare viewport-height unit"
  - "The measured fact that AC#28 as originally written was RED against the class it mandates, with the demonstration committed as a runnable assertion"
affects: [11-10, 11-12, 11-13, 11-14, 11-15, 11-16, 11-18, 11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A pattern whose props are NOT independent expresses that as a discriminated union with `never`, so the illegal combination is a compile error rather than a silently-ignored prop"
    - "A security property encoded as the ABSENCE of a prop — the leak is prevented in the type, and the end-to-end proof is handed to a named later plan rather than claimed here"
    - "`max-sm:`-only overrides when the requirement is 'the other breakpoint is byte-unchanged' — zero classes applying above the breakpoint makes that sentence literally true instead of a claim about two lists staying in sync"
    - "A gate that records the correction of its own criterion as a RUNNABLE assertion (`\"max-h-[85dvh]\".includes(\"vh]\") === true`), so the fix is a fact rather than a comment"
    - "A zero asserted with its reason in TWO places — the inventory that counts it and the stylesheet where the next reader will be standing"

key-files:
  created:
    - src/components/patterns/empty-state.tsx
    - src/components/patterns/error-state.tsx
    - src/components/patterns/responsive-dialog.tsx
    - tests/design/sheet-absent.test.ts
  modified:
    - src/app/globals.css
    - tests/design/elevation-z.test.ts

key-decisions:
  - "`tone` and `icon` on `EmptyState` are a DISCRIMINATED UNION, not two flat props — `tone=\"positive\"` owns `CheckCircle2` and `icon?: never` makes the combination a compile error, because the alternative was a required prop the component silently ignores"
  - "The sheet presentation is spelled `max-sm:` throughout rather than unprefixed-plus-`sm:`-restorations, so ZERO classes from the file apply at 640px and up"
  - "`ErrorState` hardcodes the label \"Try again\" and nothing else — `onRetry` is a callback rather than a slot, so the component owns the button; a `retryLabel` prop whose only legal value is that string would widen the contract while looking like a narrowing"
  - "No `aria-label` on `ErrorState`'s `role=\"alert\"` — the opposite call from 11-07's skeleton shells, and for a stated reason: `alert` announces its CONTENTS, `status` is nameFrom:author"
  - "No pinned count in `elevation-z.test.ts` moved; two now-FALSE comments in it did, because a stated reason that has quietly become false is worse than no reason"
  - "STATE-02, STATE-04 and RESP-01 all stay Pending — three patterns, zero adopters, and every one of the three requirements is worded 'every route group' / 'every list surface' / 'adopted for filters, breakdowns, the booking rail and navigation'"

patterns-established:
  - "Before trusting a plan-prescribed probe, run it and record whether it can go red; when it cannot, verify the real property over the AST and record BOTH results"
  - "A file that must explain a banned class names it DESCRIPTIVELY, and says in the comment why it is named that way — the fifth application of `booking-row.tsx:112`'s precedent in this phase"

requirements-completed: []

# Metrics
duration: 33min
completed: 2026-08-13
---

# Phase 11 Plan 09: The State Panels, the Overlay Primitive and the Asserted Zero Summary

**Three prop-complete patterns whose contracts are types rather than conventions — a positive empty state that cannot be handed the wrong glyph, an error surface that cannot be handed a message to leak, and one overlay primitive whose existence leaves `--z-sheet` at zero — plus the gate that makes that zero a contract and, in passing, the correction of a criterion that would have failed on correct code.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-08-13T12:59:00Z
- **Completed:** 2026-08-13T13:33:00Z
- **Tasks:** 3
- **Files modified:** 4 created, 2 modified

## Accomplishments

- **The three patterns exist, prop-complete, adopted by nobody.** `EmptyState` (icon · title · titleAs · body · actions · tone), `ErrorState` (title · body · digest · onRetry · routeOut), `ResponsiveDialog` (open · onOpenChange · trigger · title · hideTitle · description · children · footer). Nothing was deferred to "when a surface needs it".
- **Two of the three contracts are enforced by the TYPE CHECKER, and both were watched failing.** Omitting `routeOut` → `error TS2741: Property 'routeOut' is missing in type '{ title: string; body: string; onRetry: () => void; }' but required in type 'ErrorStateProps'`. Passing an icon with `tone="positive"` → `error TS2322 … Types of property 'icon' are incompatible. Type 'ForwardRefExoticComponent<…>' is not assignable to type 'undefined'`. A one-button error surface and a green-check-with-the-wrong-glyph are both `tsc` failures now, not review comments.
- **The `sheet` block is not installed and never can be quietly.** `tests/design/sheet-absent.test.ts` is 18 assertions over three absences, watched red four ways. The `FEATURES.md` F1 / `ARCHITECTURE.md` §6.3 contradiction and its roadmap tiebreak travel **inside the failure message**, because the person who just ran `npx shadcn add sheet` is exactly the person who has not read the three documents.
- **`--z-sheet`'s zero survived the arrival of the thing it was reserved for**, which is the fact worth writing down. The tree now has a mobile overlay; it renders at `--z-dialog` in both presentations; the step still has zero call sites in both signs. The reason is recorded in `globals.css` beside the declaration, in the gate that counts it, in `responsive-dialog.tsx`'s header, and in the two `elevation-z.test.ts` comments that had quietly become false.
- **AC#28 was corrected and the correction is a runnable assertion rather than a paragraph.** `expect("max-h-[85dvh]".includes("vh]")).toBe(true)` is committed: the criterion's original substring form and the class the same criterion mandates contradicted each other, so the only way to make it green was to ship the unit that clips the sheet's footer on iOS.
- **Zero vendored files edited, zero packages added, zero migrations.** `git diff --stat HEAD~3 HEAD -- src/components/ui/ package.json components.json` is empty; `ls drizzle/*.sql | tail -1` is still `0025_audit_resolved_by.sql`.

## Task Commits

1. **Task 1: EmptyState and ErrorState** — `8f442a5` (feat)
2. **Task 2: ResponsiveDialog — one dialog, two presentations** — `ee02921` (feat)
3. **Task 3: Assert the `--z-sheet` zero, with its reason** — `e448282` (test)

## Files Created/Modified

**Created**

- `src/components/patterns/empty-state.tsx` — shell A's on-ladder geometry (`rounded-xl border border-dashed p-8 text-center`, 32px = the 8th step) with shell B's heading element, reconciled by `titleAs`. Both icon hues are read from `STATUS_TONE_RECIPES` **by name** rather than restated, so the panel is a fifth consumer of the status vocabulary instead of a fifth place that agrees with it by coincidence. Carries the `border-dashed` decorative-exclusion argument in full, so plan 11-16's scoped assertion has a written home.
- `src/components/patterns/error-state.tsx` — the layer's second declared client component, with the `error.tsx`-boundary reason on line 3. Icon `text-destructive` (5.76 / 5.56 ✓ declared), `text-heading` title, `max-w-prose` body, `Try again` + `routeOut`, and the digest line at `text-label text-muted-foreground tabular-nums` prefixed "Reference".
- `src/components/patterns/responsive-dialog.tsx` — twelve `max-sm:` classes on `DialogContent`, one `max-sm:rounded-b-none` on `DialogFooter`, and nothing else. Records the F1/§6.3 contradiction, the roadmap tiebreak, the `--z-sheet` consequence, and both scope exclusions (drag-to-dismiss, grab handle).
- `tests/design/sheet-absent.test.ts` — 18 assertions: three guard-the-guard clauses asserted FIRST (including a permanent vacuity control that scans a directory that does not exist), AC#26 ×3, AC#27 ×5, AC#27's both-directions self-tests ×3, AC#28 ×2 and AC#28's self-tests ×2.

**Modified**

- `src/app/globals.css` — a comment block immediately above `--z-sheet: 20;` recording why the step is empty and why it is kept. Placed on its own lines, not trailing: `elevation-z.test.ts`'s stripper is line-oriented and only blanks a comment that OPENS its line, so a trailing comment mentioning a z utility would have been counted as a call site.
- `tests/design/elevation-z.test.ts` — **comment-only.** Two statements that had become false are rewritten (table below). No pinned count moved.

### Pinned counts, old → new

| Map / assertion | Old | New | Why |
|---|---|---|---|
| `OVERLAY_INVENTORY`, `RAISED_INVENTORY`, `SHADOW_STICKY_INVENTORY`, named total | 13 | **13** | Unchanged — `responsive-dialog.tsx` uses no `shadow-` utility. Verified over the AST (`shadow-` in class strings: `[]`), not by grep. |
| `STICKY_INVENTORY` / `DIALOG_INVENTORY` / mapped total | 12 / 9 / 21 | **12 / 9 / 21** | Unchanged — this plan's three components carry **zero** z utilities between them. The overlay inherits `z-(--z-dialog)` from the vendored `DialogContent`, which is already in `DIALOG_INVENTORY` at 2. |
| `Z_SHEET` / `Z_TOAST` call sites | 0 / 0 | **0 / 0** | Unchanged, and that is the plan's point. |

**Two comments moved, and they are the reason this file is in `files_modified` at all:**

| Location | Was | Now |
|---|---|---|
| Header NOT COVERED bullet | *"`--z-sheet` is reserved for a genuine mobile overlay/sheet, **which the tree does not yet have**"* | Records that the tree now HAS one, that it renders at `--z-dialog` in both presentations, and that the step is kept for a layer Phase 12 may need |
| `it("leaves --z-sheet and --z-toast declared-but-unused…")` | *"reserved for a genuine mobile overlay/sheet, which the tree does not have"* | The same correction, plus a pointer to `sheet-absent.test.ts` for the full argument and an explicit note that the reason moved while the numbers did not |

## Decisions Made

- **`tone` and `icon` on `EmptyState` are a discriminated union, not two independent props.** The UI-SPEC states `tone="positive"` as a fact about the rendered glyph — *"the icon becomes `CheckCircle2` at `text-success`"*. With a flat `icon: LucideIcon` the component would have to silently IGNORE that required prop whenever the tone is positive, and a caller passing `XCircle` with `tone="positive"` would get a green check with no warning. `{ tone?: "neutral"; icon: LucideIcon } | { tone: "positive"; icon?: never }` makes the combination a compile error instead — the same move `status-tones.ts` makes with its total `Record` over a closed union. If a later phase genuinely needs a positive empty state with a different glyph, the honest change is to widen the union with the new pairing and record why.
- **The sheet presentation is `max-sm:`, not unprefixed-plus-restorations.** Both spellings render the same thing today; they differ in what they can be wrong about tomorrow. With `max-sm:`, **zero classes from the file apply at 640px and up**, so "the vendored centred dialog renders byte-unchanged at `sm:` and up" is literally true and stays true no matter what is added to the mobile list. With the restore-at-`sm:` spelling the same sentence is a claim about two lists staying in sync, and one mobile class added without its restoration silently changes the desktop dialog in every adopter at once. Verified in the rendered class list and in the compiled stylesheet — all twelve rules emit inside `@media (width < 40rem)`, after the base utilities they override.
- **`ErrorState` hardcodes exactly one string, and it is a control label.** The plan says "do not hardcode" three sentences: two of them (`"Something didn't load"`, the body) are props, supplied by plan 11-18's five boundaries, and neither appears in the file. The third, `"Try again"`, is rendered here because `onRetry` is a **callback rather than a slot** — the component owns the button, so it owns the label. It is the same two words on all five boundaries, it is bound by the copywriting contract, and a `retryLabel` prop whose only legal value is that string would be a widening of the contract dressed as a narrowing of the file. Verified: every string literal in both new pattern files with four or more words is a class string.
- **No `aria-label` on `ErrorState`'s `role="alert"`, and that is the opposite call from 11-07's skeletons on purpose.** `role="status"` is `nameFrom: author`, so the three skeleton shells need an `aria-label` to have any accessible name at all — 11-07 measured that and watched it fail. `alert` announces its **contents** when the region appears, and its accessible name is not what a screen reader reads out; the panel is addressed by its declared `data-testid` rather than by role-plus-name, which is the reason `selector-contract.ts` gives for the id existing. Adding a label here would have added a name nobody hears, on the reasoning that the other file has one.
- **The `aria-describedby` opt-out is spread conditionally, not written as a ternary.** Radix wires `aria-describedby` to a generated id unconditionally and warns when no `Description` renders under it; the documented opt-out is an explicit `aria-describedby={undefined}`. JSX keeps a key whose value is `undefined`, so `aria-describedby={cond ? undefined : undefined}` — the shape the first draft had — would strip the wiring in **both** branches and silently unlink every description the pattern ever renders. Measured: with a description, `aria-describedby` resolves to a real element in the DOM; without one, the attribute is absent and the console is silent (0 warnings, 0 errors).
- **STATE-02, STATE-04 and RESP-01 all stay Pending in REQUIREMENTS.md.** STATE-02 is *"every route group has an error boundary…"* (plan 11-18 owns the five boundaries); STATE-04 is *"every list surface has a designed empty state"* (eight shipped blocks, converted by the adoption plans); RESP-01 is *"…adopted for filters, breakdowns, the booking rail and navigation"* (Phase 12 and 11-10's host drawer). This plan ships the three shapes and **zero adopters**, exactly the position 11-07 and 11-08 left STATE-01 and DS-11 in.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's own Task-2 probe went RED against a correct implementation — the file's explanation was the violation**

- **Found during:** Task 2 (running the prescribed `<verify><automated>` command)
- **Issue:** `node -e "…if(/\[\d+vh\]/.test(s)){console.error('bare vh unit');process.exit(1)}…"` exited 1 with `bare vh unit` on a file whose implementation was already correct. The header comment explaining *why* the legacy unit clips an iOS sheet quoted the class it was warning about, and AC#28 scans this file's **source**. The two halves of the task — "write the reason in a comment" and "the source must not match this regex" — could not both hold as drafted.
- **Fix:** The repo's standing precedent from `booking-row.tsx:112`, now applied for the fifth time in this phase (`panel-card.tsx` was the fourth): name the banned thing DESCRIPTIVELY — *"the SAME 85% cap written in that unit"* — and say in the comment why it is named that way, with a pointer to the criterion that scans the file. Nothing is lost: the reader still gets the unit, the failure mode, the affected browser and the consequence.
- **Files modified:** `src/components/patterns/responsive-dialog.tsx`
- **Verification:** probe re-run → `ok`, exit 0. `grep -n "vh\]"` on the file now returns exactly one line, and it is `max-sm:max-h-[85dvh]`.
- **Committed in:** `ee02921`

**2. [Rule 1 - Bug] `aria-describedby={description ? undefined : undefined}` — a ternary that is `undefined` in both branches**

- **Found during:** Task 2 (writing the Radix description opt-out)
- **Issue:** Written as a conditional attribute, the opt-out fires unconditionally. JSX materialises the key with an `undefined` value, Radix spreads caller props after its own attributes, and the generated `aria-describedby` is therefore overridden to nothing — so every `description` this pattern ever renders would have been present in the DOM and unlinked from the dialog. Silent, and invisible to `tsc`, to lint and to every gate in the suite.
- **Fix:** A conditionally-spread object (`description ? {} : { "aria-describedby": undefined }`), with the JSX-keeps-undefined-keys hazard written out beside it.
- **Files modified:** `src/components/patterns/responsive-dialog.tsx`
- **Verification:** jsdom render, both branches. With a description → `aria-describedby="radix-_r_2_"` and `document.getElementById(...)` resolves `true`; without → attribute absent (`null`); console warn + error count `0` across both.
- **Committed in:** `ee02921`

**3. [Rule 2 - Missing Critical] Three more acceptance criteria are unsatisfiable by grep on a clean tree**

- **Found during:** Tasks 1 and 2 (running the acceptance criteria as written)
- **Issue:** The same shape 11-07 (findings 3, 4) and 11-08 (finding 4) recorded, three more times, on the **correct** files. `grep -c "error.message\|error.stack" error-state.tsx` → **1** (the header explains that a boundary wanting to render that would have to add a prop first). `grep -c "use client" empty-state.tsx` → **2** and on `error-state.tsx` → **1** — so the grep gives the Server Component the HIGHER number and cannot distinguish the two files at all. `grep -Eic "grab|onDrag|onPointerDown|draggable|vaul" responsive-dialog.tsx` → **3**, all from the paragraph recording that those things are excluded.
- **Fix:** Verified the real properties over the TypeScript AST — directive prologue (not "a string containing `use client`"), declared property signatures (not "a line matching `error.`"), JSX attribute names (not "a word matching `onDrag`"), import specifiers, and string literals / template chunks for class strings. A synthetic offender was run through the identical probe as a positive control and every single check fired.
- **Files modified:** none — all three files were already correct
- **Verification:** recorded verbatim in the Verification Run table below.
- **Committed in:** n/a (a measurement, no code change)

**4. [Rule 1 - Bug] Two statements in `elevation-z.test.ts` became false the moment Task 2 landed**

- **Found during:** Task 3
- **Issue:** The plan asks to update *"any pinned totals … that this plan's new files move"*. None moved — this plan's three components carry zero `z-` and zero `shadow-` utilities, verified over the AST. But the file states **twice**, once in its NOT COVERED footer and once in the assertion's own docstring, that `--z-sheet` is *"reserved for a genuine mobile overlay/sheet, **which the tree does not have**"*. That sentence was true when 10-13 wrote it and is false as of `ee02921`. A NOT COVERED note that has quietly become false is worse than no note: it is a stated reason a reader will trust.
- **Fix:** Both rewritten to record the correction — the tree now HAS a mobile overlay, it renders at `--z-dialog` in both presentations, and the step's zero **survived the arrival of the thing it was reserved for**, which is the fact worth writing down. Each notes that the reason moved while the numbers did not, and points at `sheet-absent.test.ts` for the full argument.
- **Files modified:** `tests/design/elevation-z.test.ts`
- **Verification:** comment-only, and both scans in that file strip comments before counting — 53 passed before and after, every inventory byte-identical.
- **Committed in:** `e448282`

**5. [Rule 2 - Missing Critical] A fourth AC#26 assertion the plan did not ask for: the dependency route into the same defect**

- **Found during:** Task 3
- **Issue:** AC#26 as specified asserts `src/components/ui/sheet.tsx` is absent. That is one of two ways the second overlay mechanism arrives. The other — `vaul`, the drag-to-dismiss library the UI-SPEC explicitly excludes — arrives as a **dependency** and never creates a file called `sheet.tsx`, so the specified assertion is green while T-11-FOCUSTRAP is violated. The plan's own acceptance criterion for it (`git diff --stat package.json` is empty) is a point-in-time check that only the plan which ran it ever sees.
- **Fix:** A third AC#26 assertion parses `package.json` and requires `vaul`, `react-spring-bottom-sheet` and `@use-gesture/react` to be absent from both dependency maps, with the scope reason in the failure message.
- **Files modified:** `tests/design/sheet-absent.test.ts`
- **Verification:** part of the 18 green; the list is asserted as an equality against `[]` so an added entry names itself.
- **Committed in:** `e448282`

**6. [Rule 3 - Blocking] The `globals.css` reason had to be a leading comment, not a trailing one**

- **Found during:** Task 3
- **Issue:** The plan says *"Add one line … beside the `--z-sheet` declaration"*, which reads as a trailing comment on `--z-sheet: 20;`. `elevation-z.test.ts` carries its **own** line-oriented stripper (deliberately, and its docstring says why: a `/\*…\*/` regex eats 86 lines of real markup in `profile-form.tsx`), and that stripper only blanks a comment which OPENS its line. A trailing comment mentioning any z utility would have survived into the "code" the z scan counts and broken the vocabulary assertion against a correct tree.
- **Fix:** A block comment on its own lines immediately above the declaration — "beside" in the sense that matters, and safe for every stripper in the suite. The gate asserts the line survives (`expect(css).toContain("ZERO CALL SITES")`) so it cannot be tidied away.
- **Files modified:** `src/app/globals.css`
- **Verification:** `elevation-z.test.ts` 53 passed with the edit in tree; the z vocabulary assertion (which would be the one to fire) is green.
- **Committed in:** `e448282`

---

**Total deviations:** 6 (2 real bugs in this plan's own drafts, 2 missing-critical additions, 1 plan-vs-tree correction, 1 blocking placement constraint)
**Impact on plan:** No scope creep, no package installed, no vendored primitive edited, no registry block fetched, no migration. Deviations 1 and 2 are the ones that mattered: the first is the phase's recurring finding arriving a fifth time, and the second would have shipped three future overlays with unlinked descriptions and nothing in the suite to notice.

## Issues Encountered

- **`grep -c` disagrees with the tree on every criterion this plan was given.** Recorded as deviation 3 with the numbers, because the greps are in the plan text and a later reader running them will get non-zero counts on correct files.
- **The plan's `<verification>` block carries `ls drizzle/ | tail -1`**, which returns `meta`. Used `ls drizzle/*.sql | tail -1` → `drizzle/0025_audit_resolved_by.sql` (11-02's recorded correction, now cited by four consecutive plans). **GATE-06 intact.**
- **The design-suite baseline was measured, not assumed:** 27 files / 496 tests before this plan (matching 11-08's recorded close), 28 / 514 after. **+1 file and +18 tests exactly** — the new gate and nothing else, which is what makes "no other gate moved" checkable rather than asserted.
- **A jsdom probe needs `// @vitest-environment jsdom` on line 1.** The first render probe failed with `ReferenceError: document is not defined`; `vitest.design.config.ts` is deliberately DB-free and node-environment by default, and `skeleton-a11y.test.tsx` carries the pragma for the same reason.
- **Plan 11-08's `deferred-items.md` finding is untouched and still live.** The 112px-vs-80px row discrepancy on three shipped routes belongs to the adoption plans; nothing here adopts anything.
- **Nothing else.** No config touched, no vendored primitive forked, `vitest.design.config.ts` unmodified, `components.json` unmodified.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (after each task) |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `npm run test:design` | **28 files / 514 tests passed** (was 27 / 496 — +1 file, +18 tests, exactly the new gate) |
| `npx vitest run … sheet-absent.test.ts elevation-z.test.ts` | 71 passed (18 + 53; elevation-z unchanged at 53) |
| `npx vitest run … selector-contract status-vocab leak` | 53 passed |
| `npm run build` | exit 0, three times (after Tasks 1, 2 and 3) |
| `git diff --stat HEAD~3 HEAD -- src/components/ui/ package.json components.json` | empty — T-11-FORK and T-11-SC both hold |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `git diff --diff-filter=D` on all three commits | empty — no commit deleted a tracked file |
| **Watched red — `routeOut` omitted** | `error TS2741: Property 'routeOut' is missing in type '{ title: string; body: string; onRetry: () => void; }' but required in type 'ErrorStateProps'.` |
| **Watched red — `tone="positive"` + `icon`** | `error TS2322 … Types of property 'icon' are incompatible. Type 'ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>' is not assignable to type 'undefined'.` |
| **Watched red (a) — `ui/sheet.tsx` created** | 1 failed / 17 passed, message naming F1, §6.3 and the roadmap tiebreak. Deleted → 18 passed |
| **Watched red (b) — `z-(--z-sheet)` added to `empty-state.tsx`** | 1 failed / 17 passed, `+ "src/components/patterns/empty-state.tsx:140 — z-(--z-sheet)"`. Reverted → 18 passed |
| **Watched red (c) — `85dvh` → `85vh`** | 2 failed / 16 passed — BOTH halves of AC#28 fired. Reverted → 18 passed |
| **Watched red (d) — `SRC_DIR` → `src-nope`** | 3 failed / 15 passed. **Both zero-call-site assertions and the empty-inventory assertion PASSED** over a tree the scanner never opened |
| **Watched red (e) — the plan's own `vh` probe** | `bare vh unit`, exit 1, against a correct implementation. Fixed by naming the unit descriptively → `ok` |
| AST: directive prologue | `empty-state` `[]` · `error-state` `["use client"]` · `responsive-dialog` `["use client"]` — raw `grep -c "use client"` says `2, 1, …` |
| AST: `data-testid` JSX attributes | `["empty-state"]`, `["error-state"]`, `["responsive-dialog"]` — one each |
| AST: declared prop names, `error-state.tsx` | `["title","body","digest","onRetry","routeOut"]` — no `error`, no `message`, no `stack` |
| AST: domain imports, all three | `[]` × 3; `responsive-dialog.tsx` imports exactly `"react"` and `"@/components/ui/dialog"` |
| AST: drag/pointer JSX attrs + `vaul` import, `responsive-dialog.tsx` | `[]` and `[]` — raw grep says `3` |
| AST: `z-` / `shadow-` utilities in class strings, `responsive-dialog.tsx` | `[]` / `[]` — which is why no `elevation-z` inventory moved |
| AST: `bg-success` in class strings, `empty-state.tsx` | `[]` |
| AST: string literals ≥ 4 words, both pattern files | all 8 are class strings — no product sentence in either file |
| Probe positive control (synthetic offender) | every check fired: prologue, `vaul` import, `onPointerDown`/`draggable`/`onTouchStart`, 2 testids, `bg-success`, `error`/`message`/`stack` props, `[85vh]`, `z-(--z-sheet)`, `shadow-md` |
| jsdom render — `EmptyState` | default → `<h2 class="mt-3 text-body font-semibold text-foreground">`; `titleAs="h3"` → `<h3>` with the identical class; **no `<p>` ever holds the title** |
| jsdom render — tone parity | shell class, `h2` class and body `p` class **byte-identical** across `neutral` and `positive`; only the glyph changes (`lucide-search-x … text-muted-foreground` → `lucide-circle-check … text-success`) |
| jsdom render — `ErrorState` | two actions rendered; digest line present only when `digest` is passed; `role="alert"` on the shell |
| jsdom render — `ResponsiveDialog` | every one of the 12 sheet classes carries `max-sm:`; the vendored base string is intact; close button present (`["Apply","Close"]`); `hideTitle` → `sr-only` header with the title text still in the DOM |
| jsdom render — Radix description wiring | with description → `aria-describedby="radix-_r_2_"`, target element exists `true`; without → `null`; **0 console warnings / errors** |
| Compiled stylesheet | all 12 `max-sm:` rules emitted inside `@media (width < 40rem)` at offsets 85041–86322, i.e. **after** the base utilities they override (`.rounded-xl` at 24363) and **before** the `sm:` block at 86322 |
| Compiled stylesheet — `z-(--z-sheet)` | still emitted by nothing; `--z-sheet: 20` still declared in `:root` |

## Known Stubs

None. All three components are complete as declared — every prop is implemented and nothing is a placeholder.

One state worth naming so it is not mistaken for coverage: **no surface composes any of these three yet.** They are declared, typed, gated and unrendered — the same shape 11-07's three skeletons and 11-08's four cards are in. Concretely:

- The eight shipped empty blocks still render their two drifted shells, one of them still with a `<p>` where a heading belongs. `search-results.tsx:169` still ships the one-button error surface the UI-SPEC calls a failure of the contract.
- `ErrorState`'s security property is proven **in the type only**. No boundary exists to render it, so the end-to-end claim — a boundary handed `new Error("SENTINEL_LEAK_PROBE")` produces a DOM containing that string zero times — is untested and belongs to plan `11-18`. The absence of an `error` prop is a strong precondition, not the proof.
- Nothing has rendered `ResponsiveDialog` in a browser at any width. Everything asserted about it here is markup, class strings and emitted CSS; the sheet has never anchored to a real bottom edge, and its focus trap and `Escape` behaviour are inherited-by-composition rather than observed.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. Every registered threat is disposed as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-11-ERRLEAK | mitigate | `error-state.tsx` declares exactly five props and none of them is `error`, `message` or `stack` — verified over the AST, not by grep (which returns 1). The type is the mitigation; `11-18`'s `SENTINEL_LEAK_PROBE` is the proof, and this summary says so rather than claiming the property is closed |
| T-11-FOCUSTRAP | mitigate | One primitive composed over `ui/dialog`; `ui/sheet.tsx` asserted absent AND the primitive asserted present, plus the dependency route (`vaul` and two gesture libraries) closed permanently. Watched red |
| T-11-DEADZERO | mitigate | `Z_SHEET_INVENTORY = {}` with its reason in its own docblock, both consumption forms counted as independent inventories, the token asserted still declared at 20, and the reason asserted still present in `globals.css`. Watched red with file and line |
| T-11-CRITFAIL | mitigate | AC#28 corrected to a bounded regex, and the correction committed as a RUNNABLE assertion rather than a paragraph — `"max-h-[85dvh]".includes("vh]")` is asserted `true` in the gate, so the criterion that would have failed on correct code is a recorded fact |
| T-11-SC | mitigate | Zero packages; `git diff --stat package.json components.json src/components/ui/` empty across all three commits; no registry block fetched; and the ban is now permanent rather than point-in-time |

## Next Phase Readiness

- **Plan 11-18 is the one that closes STATE-02, and it inherits a precondition rather than a proof.** It owns the five boundaries (`app/`, `(app)/`, `(host)/host/`, `(auth)/`, `(legal)/`), the five route-out targets, `global-error.tsx`, and the `SENTINEL_LEAK_PROBE` assertion. Two facts to carry across: `ErrorState` renders the "Try again" label itself, so the boundary supplies only `title`, `body`, `digest` and `routeOut`; and `next@16.2.7`'s `ErrorInfo` is `{ error, reset, unstable_retry }` — verified in the installed `.d.ts`, not the docs — so the boundary wires `onRetry={reset}` and the `// TODO(next@16.3): retry()` marker sits beside the prop.
- **Plan 11-10 is the first adopter of `ResponsiveDialog`.** The host nav drawer wants `hideTitle` (a visible "Menu" line above a nav list is redundant chrome, and the accessible name still reaches assistive technology) and `trigger` (the shipped `aria-label="Menu"` button, preserved verbatim by the copywriting contract). Do not add a `side` prop: this is a BOTTOM sheet, and a left/right drawer is a second presentation nobody has asked for.
- **Every adoption plan converting an empty block should read the union before writing the call site.** `tone="positive"` takes NO `icon` — `/host/requests` is the only surface the conversion inventory marks positive, and it writes `<EmptyState tone="positive" title="You're all caught up" body={…} actions={…} />`. Every other conversion passes an icon and no tone. A caller that passes both gets `TS2322`, which is the point.
- **Plan 11-16's `border-dashed` assertion has two stated homes now.** `empty-state.tsx` and `error-state.tsx` both carry the decorative-exclusion argument, and the second points at the first rather than restating it. If the scoped assertion is written as a per-file inventory, these are the two rows.
- **Plan 11-21 owns everything this plan could not touch.** The sheet at 375px and the centred dialog at 640px are two baselines of one component; the 320px `scrollWidth <= clientWidth` check applies to the sheet as much as to any page; and the reduced-motion claim (both animations neutralised by the global reset) is a human check with the OS setting on, which `motion-budget.test.ts` explicitly declines to make.
- **Plan 11-22's forward direction gained three ids.** `src/` now carries **10 of `selector-contract.ts`'s 17** — `skeleton-card-grid`, `skeleton-row-list`, `skeleton-panel`, `result-card`, `row-card`, `panel-card`, `page-header`, `empty-state`, `error-state`, `responsive-dialog`. The remaining 7 name plans 11-06 (`price-total`), 11-10 (four `site-*`), 11-14 (`site-footer`) and 11-15 (`legal-placeholder-notice`) as their owners.
- **A caution for whoever next touches `sheet-absent.test.ts`.** Its three guard-the-guard clauses are asserted FIRST and one of them scans a directory that does not exist. That is not dead weight: probe (d) measured that with the scanner blinded, both zero-call-site assertions and the empty-inventory assertion report a perfectly clean result. Deleting the file floor turns this whole gate into a rubber stamp in a single, plausible-looking commit.

## Self-Check: PASSED

All four created files exist on disk (`src/components/patterns/{empty-state,error-state,responsive-dialog}.tsx`, `tests/design/sheet-absent.test.ts`). All three commits (`8f442a5`, `ee02921`, `e448282`) resolve in `git log`. No commit deleted a tracked file — `git diff --diff-filter=D --name-only` is empty for all three.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
