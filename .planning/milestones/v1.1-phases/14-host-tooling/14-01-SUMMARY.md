---
phase: 14-host-tooling
plan: 01
subsystem: ui
tags: [design-system, tailwind, typescript-compiler-api, vitest, ast-gate, host-surfaces]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`PageHeader`, `RowListSkeleton`, `EmptyState`, `PanelCard`, `src/lib/design/measurements.ts` and the skeleton/loading literal gates that make a declared constant the only legal box"
  - phase: 13-confirmation-bookings-trust
    provides: "`BOOKING_SHELL` — the promoted-layout-string precedent this plan copies twice — and `tests/design/price-surface.test.ts`, the AST copy-freeze gate `earnings-freeze` is built on"
provides:
  - "`HOST_LIST_SHELL` and `HOST_PANEL_SHELL` — the two host page containers, one owner each, imported by a page AND its own loading plate"
  - "`HOURS_STRIP_TRACK`, `STEP_MARKER_BOX`, `WIZARD_CHECKLIST_COL`, `WIZARD_CHECKLIST_GRID` — the phase's three declared box exceptions plus the grid track that owns the checklist column's width"
  - "`RowSkeletonHeight` + `RowListSkeleton`'s optional `height` — a second declared bar height is now expressible without a literal entering a skeleton file"
  - "`tests/design/earnings-freeze.test.ts` — an AST string-literal freeze over `/host/earnings` and every `payout-*` component, with structural (not textual) exclusions for styling positions and module specifiers"
  - "HFLOW-05 spent: `/host/earnings` and its plate read one shell constant and one header pattern, provably without moving a string"
affects: [14-02, 14-03, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A page container is a declared constant imported by the route AND its `loading.tsx`, so a plate cannot draw a different box than the page it stands in for"
    - "A skeleton's variable box arrives as a prop TYPED to the declared set, never as a `string`"
    - "A copy-freeze gate excludes styling positions STRUCTURALLY (className attribute / `*ClassName` property / style position inside a `cn()`-family call), so the token pass is permitted and a sentence still cannot move"

key-files:
  created:
    - tests/design/earnings-freeze.test.ts
  modified:
    - src/lib/design/measurements.ts
    - src/components/patterns/row-list-skeleton.tsx
    - src/app/(host)/host/earnings/page.tsx
    - src/app/(host)/host/earnings/loading.tsx

key-decisions:
  - "`RowListSkeleton`'s height prop is typed as `RowSkeletonHeight`, a union of declared row heights that has exactly ONE member today — an undeclared value is a compile error, and widening the set is a two-line edit in `measurements.ts` where the heights are derived"
  - "`WIZARD_CHECKLIST_GRID` owns the 288px number and `WIZARD_CHECKLIST_COL` is derived from it, because the track is what positions the column"
  - "The freeze gate's exclusions are syntactic positions, not text patterns — so a class name migrating into rendered copy is an ADDED literal and a sentence demoted into a styling position is a REMOVED one"
  - "The freeze gate does NOT strip comments and does not need to: an AST walk cannot see a comment. Stated explicitly, along with the consequence that comments on this surface remain governed by review"
  - "`HOST_PANEL_SHELL`'s docblock records that `/host` renders differently under it — the one host page that loses its outlier vertical rhythm — rather than copying `BOOKING_SHELL`'s zero-pixel claim it cannot make"

patterns-established:
  - "Declared-ahead constants: the shells and box exceptions land in their own commit BEFORE any restyle, so a zero-pixel collapse can never be confused with the rewrites that follow it"
  - "A freeze gate discovers its file set from disk and checks it against a declaration, closing the 'move the copy to a new file' evasion"
  - "A gate is not a gate until it has been observed failing: the one-character probe and its exact message are recorded in the summary"

requirements-completed: [HFLOW-05]

# Metrics
duration: 25min
completed: 2026-08-23
---

# Phase 14 Plan 01: Host Measurements, the Earnings Freeze, and HFLOW-05 Summary

**Six declared host measurements with their derivations, a row skeleton that can be told a declared height, and an AST string-literal freeze that proves `/host/earnings`'s restyle moved tokens and not one word about money.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-23T16:11Z (approx — baseline design run started 16:12:09)
- **Completed:** 2026-08-23T16:33Z
- **Tasks:** 3
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments

- **One owner for the host containers.** `HOST_LIST_SHELL` collapses six hand-typed copies of one string across `/host/requests`, `/host/bookings`, `/host/earnings` and their three loading plates; `HOST_PANEL_SHELL` declares the eight-site, three-spelling panel container. Every value is byte-identical to what ships, so adoption is verifiable by `git diff` alone — which matters on a machine where `--project=visual` does not exist.
- **The phase's three box exceptions are written down with their arithmetic**, not their taste: the week-strip track (160 ÷ 24 = 6.67px per hour, against 2.67 and 2.0 for the two shorter ladder steps), the wizard step marker (24px, now load-bearing as the WCAG 2.5.8 AA target-size bar `e2e/overflow-320.spec.ts` asserts), and the checklist column/track pair (672px of form column at exactly 1024px).
- **`RowListSkeleton` can now carry a second declared height** without a literal box class ever entering a skeleton file, and the prop's type — not a convention — is what rejects an undeclared value.
- **HFLOW-05 is spent and machine-proved.** `/host/earnings` and its plate read one shell constant and one header pattern; `tests/design/earnings-freeze.test.ts` passes with its inventory **unedited**, which is the requirement's entire claim expressed as a command.
- **The `payout-summary.tsx` landmine is defused in writing.** The gate's header records that `type-scale.test.ts` pins that file at two display-role headings and that the UI-SPEC's "Display: nowhere on host surfaces" sentence is measurably false — so the next reader does not "fix" it and break the gate and the requirement in one edit.

## Task Commits

1. **Task 1: Six declared measurements, and a skeleton that can carry a second height** — `2a02a0a` (feat)
2. **Task 2: The earnings string-literal freeze, authored green against the shipped tree** — `c03600b` (test)
3. **Task 3: The earnings token pass — shell, PageHeader, type roles, and nothing else (D-156)** — `34e6c0b` (refactor)

## Files Created/Modified

- `tests/design/earnings-freeze.test.ts` **(created, 529 lines)** — walks the TypeScript AST of every file under `src/app/(host)/host/earnings/` and every `src/components/host/payout-*`, collecting string literals, template spans and JSX text, and compares the sorted/deduped per-file sets against a pinned inventory. Three shipped assertions plus eight guard-the-guard fixtures.
- `src/lib/design/measurements.ts` — six new exports (19 → 25 `export const`) plus the `RowSkeletonHeight` type alias, each with a derivation docblock. A Phase-14 section header states why the shells land before any restyle.
- `src/components/patterns/row-list-skeleton.tsx` — optional `height` prop defaulting to `ROW_CARD_HEIGHT`; every existing caller renders byte-identically.
- `src/app/(host)/host/earnings/page.tsx` — shell constant, `PageHeader`, one type-role swap. Nothing else.
- `src/app/(host)/host/earnings/loading.tsx` — the same shell constant; its header comment corrected where it had gone stale.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` (baseline, before any edit) | 48 files / 816 passed / 3 skipped / **0 failed** |
| `npm run test:design` (after Task 1) | 48 files / 816 passed / 3 skipped / 0 failed — **baseline unmoved**, as required |
| `npm run test:design` (final) | **49 files / 827 passed / 3 skipped / 0 failed** (+1 file, +11 tests — all from `earnings-freeze`) |
| `npx tsc --noEmit` | exit **0** |
| `npx vitest run tests/payments` | 15 files / **216 passed**, zero edits to those tests |
| `npx vitest run tests/host` | 1 file / **3 passed** |
| `npx eslint` on all five touched files | exit **0** |
| `git diff --stat drizzle/` over all three commits | **empty** — zero migrations (PROJECT D-136) |
| `git diff --stat tests/design/type-scale.test.ts` | **empty** — landmine 5 not stepped on |
| `git diff src/components/host/` | **empty** — no payout component opened |
| `grep -c 'export const' src/lib/design/measurements.ts` | 25, **exactly six higher** than the 19 before Task 1 |
| Docblock proof (scripted AST-free line walk) | all six new exports **and** the type alias carry a docblock with a derivation |
| `git diff --diff-filter=D` per commit | no deletions in any of the three commits |

**No Playwright invocation was needed or made.** `e2e/availability.spec.ts:261` — the pre-existing standing red — was neither touched nor claimed.

### The gate has been observed failing

Task 2's acceptance criterion. `title="No earnings yet"` → `title="No earnings Yet"` (one character) in `src/app/(host)/host/earnings/page.tsx`, then `npm run test:design -- earnings-freeze`:

```
FAIL  tests/design/earnings-freeze.test.ts > HFLOW-05 / D-156 — the earnings surface is
      frozen except for its tokens > changes not one string a host reads or a branch turns on

AssertionError: the earnings surface's copy or semantics moved. HFLOW-05 is a TOKEN PASS
(14-CONTEXT D-156): the container, the page header and the type roles may change and NOTHING
else may. These figures have never moved real money — PayMongo /v2 payout rails are
sales-gated — so a rewrite here is work that gets redone, and a softened word about money is a
disclosure change wearing a polish costume. If the change is genuinely intended, it belongs in
a plan that says so, and the inventory in this file moves in that plan's commit.:
expected [ …(2) ] to deeply equal []

+ [
+   "src/app/(host)/host/earnings/page.tsx: ADDED \"No earnings Yet\"",
+   "src/app/(host)/host/earnings/page.tsx: REMOVED \"No earnings yet\"",
+ ]
```

Reverted with `git checkout -- src/app/(host)/host/earnings/page.tsx`; re-run green (11 passed). The failure names the literal in **both** directions, which is what makes the message actionable rather than a bare count.

## Decisions Made

**1. `RowSkeletonHeight` is a one-member union today, and the docblock says so.**
The plan asked for the prop to be typed so only a `measurements.ts` export can satisfy it "if that is expressible". It is — as a union of declared string-literal types — but exactly one row height has been derived and written down so far, so exactly one value is legal right now. The alternatives were worse: a `string` prop admits any number typed at a call site (the drift the module exists to prevent), and a self-referential namespace import to auto-derive the union would create a module cycle and pull in every non-height constant. Widening is a two-line edit **in `measurements.ts`**, which is the point — the legal set is decided where the heights are derived, not at whichever `loading.tsx` wanted a taller bar. M2's `HOST_REQUEST_ROW_HEIGHT` / `HOST_BOOKING_ROW_HEIGHT` are the expected first widening.

**2. The type has a hole, and the docblock names it and the gate that closes it.**
These are string *literal* types, so a hand-typed value equal to a declared one still typechecks — the compiler cannot tell a constant from its own text. That residual case is closed by `tests/design/loading-coverage.test.ts` ("lets no `loading.tsx` write a box measurement of its own") and by `skeleton-measurements.test.ts` inside the pattern files. Stated rather than implied.

**3. The freeze gate's exclusions are syntactic positions, never text patterns.**
A gate that pinned *every* string literal would pin HFLOW-05's own work — the shell string, the heading classes and the type-role swap are all string literals. Two positions are excluded: styling positions (a `className` JSX attribute, an object property whose name ends in `className`, and a style position inside a `cn()`-family call) and module specifiers. Because the line is positional, it holds in both directions: a class name that migrates into rendered copy is an **ADDED** literal, and a sentence demoted into a styling position is a **REMOVED** one. A textual "skip anything class-shaped" rule would have waved both through — and would have gone blind the day a status value and a utility shared a spelling.

**4. A comparison operand inside a `cn()` call stays frozen.**
`cn("font-semibold tabular-nums", refunded && "text-muted-foreground line-through")` is real code on this surface, and `state === "refunded"` appears inside a `cn()` argument on the page. A naive "strings inside `cn()`" rule would have unfrozen `"refunded"` — a discriminant this page branches money display on. The descent recurses only through pass-through shapes (parentheses, JSX expression containers, both ternary arms, the operands of `&&`/`||`/`??`, array elements, template spans, nested style calls) and stops at a comparison, so the discriminant stays pinned while the class beside it is excluded. There is a guard-the-guard fixture for exactly this.

**5. The gate does not strip comments, and says why.**
Three sibling gates import `stripComments`; this one deliberately does not. An AST walk asks for nodes by kind and a comment is trivia attached to a token, so the stripper would be a no-op that implied a protection that is not there. The consequence is stated in the header: **comments on this surface are not frozen** and remain governed by review. That division is correct — a comment is what a developer reads; what a host reads is what D-156 froze.

**6. `HOST_PANEL_SHELL` does not copy `BOOKING_SHELL`'s zero-pixel claim.**
`/host` moves from a 48px vertical rhythm to the 32px one the other three panel routes already share. `BOOKING_SHELL` was able to say "nothing about the rendering changes"; this constant cannot, so its docblock says the opposite honestly and names which side moved. It also records that the availability route's child-spacing utility is deliberately *not* folded in — vertical rhythm between a container's children is not a measurement of the container.

**7. `WIZARD_CHECKLIST_GRID` owns the number; `WIZARD_CHECKLIST_COL` is derived from it.**
The UI-SPEC left "which of the two shapes" to planning and required only that there be one owner. The track is what positions the column, so the track is the authority. Both are separate exports because two *different* elements render them — the grid parent and the side column — and a constant only one element uses is not a constant that keeps two in agreement. The docblock records the measured tooling limitation: `tests/design/helpers/compile-css.ts`'s safelist character check rejects a comma, so `compileGlobalsCssWith` throws on this class and any gate over it must be a **source** assertion, never a compiled-CSS one.

## Deviations from Plan

None — plan executed exactly as written. Three disclosures that are *not* deviations but are worth naming so a reviewer is not surprised:

**(a) Explanatory comments were added at the two changed regions of the earnings surface.**
Task 3's acceptance criterion reads "changes only on lines carrying the shell string, the heading element, its import, or a type-role class." The diff adds six comment lines above the page's container and four above the plate's. These are documentation of the changed lines, in the house style this repo enforces everywhere else, and the freeze gate proves mechanically that they are not copy (comments are invisible to an AST walk). Disclosed rather than absorbed silently.

**(b) One stale comment in `earnings/loading.tsx` was corrected.**
Its header read *"`Earnings` is a bare `text-xl` h1"* — a statement about the page that Task 3 made false in the same commit. Left alone it would have been a comment describing an arrangement that no longer exists, on the one file whose whole job is to match that arrangement. Corrected in the same edit.

**(c) `grep -c 'HOST_LIST_SHELL'` returns 2 per file, not 1.**
The criterion says "one hit in each file". The two hits per file are the import line and the single usage; there is exactly one *usage* in each. Reported rather than quietly re-read.

**Total deviations:** 0 auto-fixed (0 Rule 1, 0 Rule 2, 0 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no new number, no new payout claim, no restructure, no migration, no package installed.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-01-COPYDRIFT | **mitigated** | `tests/design/earnings-freeze.test.ts` green on its first run against the shipped tree, and observed failing on a deliberate one-character change (message recorded above) |
| T-14-01-FALSEMONEY | **mitigated** | `git diff src/components/host/` is empty. `PayoutSummary` and `PayoutRow` were never opened; zero arithmetic added anywhere |
| T-14-01-AUTHZ | **accepted, re-proved** | The page's session + `canHost` re-check and the owner-scoped `WHERE` were not touched. `npx vitest run tests/payments` — 216 passed |
| T-14-01-LITERAL | **mitigated** | The new height prop takes a declared constant and is typed to reject anything else; `skeleton-measurements.test.ts` re-run green in Task 1 |
| T-14-01-SC | **mitigated** | **No package was installed.** No `npm install`, no `npx shadcn add`. `package.json` and `package-lock.json` are untouched |

No new threat surface was introduced: no network endpoint, no auth path, no file access pattern, no schema change. No `## Threat Flags` section is owed.

## Declared but not yet consumed

Not stubs — declared-ahead by design, and this is the plan's stated purpose ("every later plan in this phase imports those two constants, so they land first"). Recorded so a reader running a dead-code scan is not surprised:

| Constant | First expected consumer |
|---|---|
| `HOST_PANEL_SHELL` | `/host` + plate, the availability route + plate, the wizard's `edit`/`new` routes + plates (HFLOW-02 / HFLOW-03 / HFLOW-04 plans) |
| `HOURS_STRIP_TRACK` | the week-at-a-glance strip (D-152) |
| `STEP_MARKER_BOX` | the wizard step rail (D-148) |
| `WIZARD_CHECKLIST_COL` / `WIZARD_CHECKLIST_GRID` | the persistent publish checklist (D-149) |
| `RowListSkeleton`'s `height` prop | the host loading plates, once M1/M2's row heights are re-measured against the rendered routes |

`HOST_LIST_SHELL` is consumed **now**, in two files, which is what made the constant safe to prove in the same plan that declared it.

## Issues Encountered

**The freeze gate's exclusion boundary had to be designed, not copied.** `price-surface.test.ts` is the structural analog but it scans for *forbidden phrases*, not for a frozen inventory, so it has no notion of a permitted change. The first naive design — pin every string literal — would have gone red the instant Task 3 replaced the shell string, i.e. it would have forbidden the requirement it was written to prove. Resolved by excluding two syntactic positions and arguing the line in the header; the guard-the-guard fixture "says nothing about a container, a heading class or a type role changing" is the assertion that the boundary is in the right place.

**Generating the inventory without forking the scanner.** The pinned set was produced by a throwaway generator mirroring the gate's logic. Rather than trust that mirror, the cross-check is the gate itself: it was run against the untouched tree and passed on the first invocation, which can only happen if the generator and the shipped scanner agree exactly. The generator was not committed.

## User Setup Required

None — no external service configuration, no environment variable, no package install.

## Next Phase Readiness

**Ready.** Wave 1's output is on disk and green:

- The two shell constants and the four box constants are declared with their derivations, so every downstream plan imports rather than re-derives. 14-PATTERNS § 10's docblock shape was followed for all six.
- `RowListSkeleton`'s height prop exists; the plans that adopt it must first widen `RowSkeletonHeight` in `measurements.ts` with the measured constant, and must **re-measure against the rendered route** — 14-RESEARCH's M1/M2 publish ±8px error bars on the reconstructed host-row cases (b), (b′) and (c).
- `earnings-freeze` is now part of the 49-file design suite. Any later plan that opens `/host/earnings` or a `payout-*` component for a legitimate reason must move the inventory **in that plan's commit, with that plan's argument** — never as a green-the-build edit.

**Two standing cautions for the plans that follow, both re-confirmed here:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings, and the UI-SPEC's "Display: nowhere on host surfaces" sentence is still measurably false. Neither is to be "fixed".
2. `WIZARD_CHECKLIST_GRID` cannot be asserted against the compiled stylesheet — the safelist helper throws on the comma. Any gate over it must assert the class string in source and must not report itself as having verified CSS.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All four claimed commits resolve in `git log` (`2a02a0a`, `c03600b`, `34e6c0b`, `dff1f77`), and all
six claimed files exist on disk. No missing items.
