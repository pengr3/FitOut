---
phase: 15-auth-profile-transactional-email
plan: 09
subsystem: ui
tags: [accessibility, live-regions, design-system, ast, jsdom, auth, gates]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-07's four converted `(auth)` pages and the two live regions it REMOVED; plan 15-08's `/profile` panels and its `Save state` name"
  - phase: 14-host-tooling
    provides: "`live-regions.ts` at twenty-one files with an empty exclusion list, and the count-moves-with-its-rows procedure"
  - phase: 13-confirmation-bookings-trust
    provides: "`cancel-page-shell.test.tsx` — the four-link chain, the `(path, text)` scanner signature and the disarmed-tripwire idiom"
  - phase: 11-shell-and-navigation
    provides: "`PanelCard`, `BRAND_CLASS` and `selector-contract.ts`'s closed `SELECTOR_IDS` union"
provides:
  - "`LIVE_REGION_FILES` 21 → 26 — the account surfaces join the audited set, with the membership rule widened rather than an exclusion discharged"
  - "seven declared rows saying what a screen reader hears, when, and which numbered rule justifies the shape"
  - "two new `AUTHOR_NAMED_REGIONS` rows; the five refusal regions stay content-named on purpose"
  - "`tests/design/auth-composition.test.tsx` — the AUTHUI-01/03 gate, build-blocking, reading page → pattern (AST) → attribute (DOM) → contract (union)"
  - "the eight auth `title`/`description` literals pinned byte-for-byte, so a copy change must move a test file"
affects: [15-11-visual-baselines, 16-crop-avatar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A four-link chain in one file — AST for what a page composes, jsdom for what the pattern renders, and the closed selector union for what that attribute may be. A source scan alone proves only the first link"
    - "Committing a green-but-unprobed gate with its mutation walk recorded as PENDING in its own header, so a run that dies mid-walk cannot leave a header claiming reds nobody watched"
    - "A glob written inside a block comment closes the comment. `*/` in a docblock produced 39 parse errors across 80 lines and named none of them"

key-files:
  created:
    - "tests/design/auth-composition.test.tsx"
  modified:
    - "src/lib/design/live-regions.ts"
    - "tests/design/live-regions.test.tsx"

key-decisions:
  - "The five files were OUT OF SCOPE, not excluded — so nothing was discharged. 15-09 widens `live-regions.ts`'s membership rule to the account surfaces; `LIVE_REGION_EXCLUSIONS` was empty before and after"
  - "`tests/design/live-regions.test.tsx` moved too, against the plan's one-file scope: its own docblock is the standing instruction that both pins move in one commit, and a widened set with a stale literal fails that gate by design"
  - "Two of the seven regions are author-named and five are not. Every refusal carries a SERVER sentence, and a label announced instead of it costs the reason"
  - "The gate bans `SiteChrome`, not `PublicHeader`: there is no component by the plan's name in this tree, and a gate banning a name nothing exports is green forever"
  - "The JSX guard-the-guard floor is per-file and measured, not a blanket number — one blanket floor reported two correct pages as unparsed on the first run"

patterns-established:
  - "When a mutation's red is predicted rather than observed, the prediction is usually wrong in the same way: a second `expect` in the same `it()` did not pass, it never ran"

requirements-completed: []
requirements-advanced: [AUTHUI-01, AUTHUI-03]

# Metrics
duration: 21min
completed: 2026-08-24
---

# Phase 15 Plan 09: The Live-Region Inventory and the Composition Gate Summary

**The seven live regions on the four auth screens and the profile form stop being markup and become
contracts — each with the sentence a screen reader hears, the moment it hears it, and the numbered
rule that justifies its shape — and "one composition, four screens" becomes a command that exits
non-zero when it stops being true.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-24T22:29:46+08:00 (from the 15-04 close)
- **Completed:** 2026-08-24T22:50:24+08:00
- **Tasks:** 2 of 2
- **Files created:** 1 · **modified:** 2

## Accomplishments

- **The inventory reaches the account surfaces, and it got there by widening a RULE rather than
  discharging a debt.** These five files were named OUT OF SCOPE by `live-regions.ts`'s own rename
  note — *"what is left outside it is the auth/profile forms…"* — which is a different thing from an
  exclusion: nobody had ever decided about them, so there was nothing to discharge.
  `LIVE_REGION_EXCLUSIONS` was `[]` before this plan and is `[]` after it.
- **The count moved after its red was watched, not before.** One error, and the fact that it was one
  rather than two is the reading (below).
- **The two deliberate REMOVALS are recorded where somebody would look for them,** so a reader
  hunting `ResetNotice` finds out why it is absent instead of concluding the inventory missed it.
- **"One composition, four screens" is now falsifiable inside `npm run build`.** Four routes, one
  file, four links: AST → jsdom → selector union, plus the copy.
- **Every assertion in the new gate has been watched failing.** Six mutations, each applied alone,
  each run, each reverted with `git diff --exit-code src/` confirmed clean before the next started.
- **One of those six proved the two gates are not redundant** — the same defect, caught from opposite
  directions, and only because Task 1 had put the file in the declared set an hour earlier.

## Task Commits

1. **Task 1: the seven account-surface live regions join the declared inventory** — `ba392e9` (feat)
2. *(durability checkpoint)* — `02fcc73` (docs, interim summary)
3. **Task 2: the AUTHUI-01/03 composition gate, committed green-but-unprobed** — `e9d0155` (test)
4. **M1 recorded — the aliased raw container** — `45e2228` (test)
5. **M2 recorded — the silent default heading level** — `44695fd` (test)
6. **M3 recorded — the second accent-filled control** — `78f4f33` (test)
7. **M3's note corrected — the touch assertion never ran, it did not pass** — `1a8e7f0` (fix)
8. **M4 recorded — a one-character copy drift** — `d13fec2` (test)
9. **M5 recorded — the doubled document landmark** — `ba1e50b` (test)
10. **M6 recorded and the walk closed** — `e8ab7f5` (test)

## Task 1 — the red, observed before the number moved

Five files written into `LIVE_REGION_FILES`, seven rows into `LIVE_REGIONS`, the alias still reading
`extends 21`. `npx tsc --noEmit` run bare, exit code 2, and this is the whole of stdout:

```
src/lib/design/live-regions.ts(1627,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```

**One error, not two, and the difference from the module's OBSERVED RED (b) is the whole reading.**
Red (b) — a path *deleted* from the set — produced a companion TS2820 at the orphaned row, because a
row naming a file the union no longer contains cannot type. **Widening produces no companion**: every
new row names a path that is now in the union, so the only thing that fails is the count. That is the
assertion doing exactly the job it was written for. Without it, five files and seven rows would have
compiled silently and the audited set would have grown by a quarter with nothing in the diff saying so
out loud. `21` → `26`, alias renamed → exit 0. The red is quoted verbatim in the alias's own docblock
as OBSERVED RED (c), dated and attributed to this plan.

## The seven rows

| id | file | kind | at | named by |
|---|---|---|---|---|
| `login-form-error` | `(auth)/login/page.tsx` | alert | 1 | its content |
| `signup-form-error` | `(auth)/signup/page.tsx` | alert | 1 | its content |
| `forgot-request-result` | `(auth)/forgot-password/page.tsx` | status | 1 | `aria-label="Reset request result"` |
| `reset-form-error` | `(auth)/reset-password/page.tsx` | alert | 1 | its content |
| `profile-avatar-error` | `(app)/profile/profile-form.tsx` | alert | 1 | its content |
| `profile-form-error` | `(app)/profile/profile-form.tsx` | alert | 2 | its content |
| `profile-save-result` | `(app)/profile/profile-form.tsx` | status | 1 | `aria-label="Save state"` |

**The ordinals were read off the converted source, not assumed.** `profile-form.tsx` holds three
regions in two kinds: the avatar refusal at :152 is `alert#1` (it sits in the public panel, above the
fields), the form-level refusal at :273 is `alert#2`, and the save line at :290 is the file's only
`status`. Plan 15-08 moved the avatar block *inside* the form element but did not move it relative to
the refusal below it, so `alert#1` is the ordinal it has always had. SCAN 2 passing is the proof: it
compares the declared key set against the regions actually present, so a wrong ordinal would have
surfaced as one declared-but-absent row and one present-but-undeclared region.

**Two are author-named and five are not, and that split is the load-bearing part.** Each of the five
alerts carries a SERVER sentence rendered verbatim — the anti-enumeration refusal, the signup action's
reason, the invalid-link sentence with its recovery, the upload constraint, the save refusal. On the
VoiceOver/Safari pairing a *named* live region can be announced by its name instead of its content, so
naming any of them would trade a specific reason for three generic words. The two that ARE named have
nothing to be named by: the forgot page's result replaces the form (there is nothing on the page to
take a name from until a submit lands), and the profile save line is mounted only while `saved` is
true. Both got `AUTHOR_NAMED_REGIONS` rows — the list is nine → eleven — and SCAN 3 asserts it in both
directions, so neither the exception nor the ban can be bypassed.

**The two removals are recorded where somebody would look for them.** The new file block carries plan
15-07's deletions — `ResetNotice` on login and the reset page's missing-token notice — with the rule
stated rather than re-derived: *a live region announces a CHANGE; a freshly navigated page is not a
change, it is a page.* That is the third and fourth instance of the same defect in this repository
(13-14 removed six, 14-14 found a seventh).

**Neither measured `aria-live` number moved, and the module says why rather than re-measuring.** All
seven new regions are bare `role="alert"` / `role="status"` on a `<p>`; not one carries the attribute.
So the AST walk still finds seven files and ten elements and the text grep still finds thirteen. This
is the one case where carrying a number forward is honest — the reason is stated and checkable in five
files.

## Task 2 — the gate, and the six reds it has been watched producing

`tests/design/auth-composition.test.tsx`, 877 lines, 13 cases, `// @vitest-environment jsdom`.

**The chain, and why a source scan alone would not have been one.** Cases (3)–(6) prove by AST that
each page composes exactly one `PanelCard`, zero raw containers (aliased imports resolved through
`propertyName ?? name`, so `import { Card as PanelCard }` is still a raw container), one
`titleAs="h1"`, exactly one `variant="brand"` control carrying `size="touch"`, and the pinned copy.
Cases (10)–(11) then RENDER `PanelCard` and read `data-testid` off the produced DOM, and pin that
value against `SELECTOR_IDS`. Without the render half the whole file would stay green the day the
pattern lost its hook — `cancel-page-shell.test.tsx:42-47`'s argument, on the same kind of surface.

**The mutation walk.** Six probes, each alone, each reverted, `git diff --exit-code src/` clean
between each. Full verbatim reds are in the file's own header; in one line each:

| | mutation | result |
|---|---|---|
| M1 | `import { Card as PanelCard } from "@/components/ui/card"` on the forgot page | 2 failed / 11 passed |
| M2 | `titleAs="h1"` deleted from signup | 1 failed / 12 passed |
| M3 | `variant="outline"` → `"brand"` on login's Google button | 1 failed / 12 passed |
| M4 | `title="Welcome back"` → `"Welcome back!"` | 1 failed / 12 passed |
| M5 | the layout's column `<div>` promoted to a second landmark | 1 failed / 12 passed |
| M6 | `role="status"` restored on `ResetNotice` | 1 failed / 12 passed **here** and 1 failed / 25 passed in `live-regions.test.tsx` |

**Three findings came out of the walk that were not predictable from the code.**

1. **M1 fired TWO cases, and the second is an echo rather than a second defect.** The copy check reads
   `title` off *pattern* containers only, so when the pattern binding stops being one, the eight pinned
   literals stop being FOUND rather than stopping being EQUAL. The file now says to read (3) first when
   both fire.
2. **Two `expect`s in one `it()` are ORDERED, not independent** — the first throws and the second says
   nothing at all. This bit twice in one walk: case (3)'s "exactly one PanelCard" loop never ran under
   M1, and case (5)'s 44px floor never ran under M3. The first draft of M3's note asserted that the
   touch check *"stayed green because the mutated button already carries `size=\"touch\"`"* — which was
   a guess, and false: the Google button carries no `size="touch"` at all (the page has exactly one, on
   the submit at :216), so that array *would* have reported it. Corrected in its own commit, `1a8e7f0`.
3. **M6 is the one result worth measuring twice, and it validates Task 1 retroactively.**
   `live-regions.test.tsx` was structurally BLIND to `login/page.tsx` until Task 1 declared it; with the
   file in the set, SCAN 2 reports the same defect from the other direction, naming the file, the line,
   the key and the whole source-order sequence. **The two readings are not redundant.** The inventory
   can only ever say *"this region has no row"* — a statement about regions that EXIST — so a region
   correctly removed leaves nothing for it to check, and it would be equally happy if somebody wrote a
   row for the restored one. The composition gate says the thing an inventory structurally cannot:
   *this element must have NO region, whatever anybody is willing to write a row for.*

**A green-but-unprobed gate was committed on purpose,** with its mutation walk written into its own
header as `NOT YET RUN — ZERO OBSERVED` (`e9d0155`). The API has killed two executors in this phase;
a run that died between writing the gate and testing it would otherwise have left behind a header
claiming reds nobody watched. The marker was replaced only after all six were observed, and the commit
that carried it is named in the file so the history reads as a decision rather than an artefact.

## Files Created/Modified

- `src/lib/design/live-regions.ts` — five paths in a new banner block carrying the two removals and
  the widened membership rule; seven `LIVE_REGIONS` rows; seven `LIVE_REGION_IDS`; two
  `AUTHOR_NAMED_REGIONS` rows; `DeclaredFileCountIsTwentyOne` → `…IsTwentySix` with OBSERVED RED (c)
  quoted verbatim; five prose counts re-stated (21 → 26 in three places, region ids 27 → 34,
  author-named 9 → 11). `LIVE_REGION_EXCLUSIONS` untouched at `[]`.
- `tests/design/live-regions.test.tsx` — `DECLARED_FILE_COUNT` 21 → 26 and both alias references
  renamed, with the reason for the widening written into the docblock. See Deviation 1.
- `tests/design/auth-composition.test.tsx` — **new.** 13 cases: two guard-the-guard, four per-page AST
  assertions, three shell assertions over `(auth)/layout.tsx`, two DOM/contract cases, one live-region
  demotion case and one positive-control fixture never written to disk.

## Decisions Made

- **The gate bans `SiteChrome`, not `PublicHeader`.** The plan names a component that does not exist
  in this tree; the public composition is `SiteChrome` called with `brand`/`brandHref`/`actions`. A
  gate that banned a name nothing exports would be green forever. The scan sorts bindings from the
  chrome module by their EXPORTED name: `BRAND_CLASS` is a string the wordmark reads, everything else
  is a component this surface must not render.
- **The wordmark is identified by the constant it reads, not by its text or its position.** Reading
  `FitOut` out of the children would match copy in three other places on these screens; reading the
  class constant finds the one element whose type is shared with the app chrome, which is the property
  D-162 actually bought. The same case asserts it links `/` and carries no selector hook (T-15-19).
- **The JSX guard-the-guard floor is per-file and measured.** The four pages differ by nearly 3× (login
  28, signup 35, forgot 13, reset 19; layout 5), so one blanket floor of 20 reported two perfectly
  correct pages as unparsed on the first run. Floors sit a few elements below each measured count — a
  vacuity guard, deliberately not an element census that would go red on innocuous markup.
- **The eight copy literals live in the test.** T-15-31: two of the four ledes are anti-enumeration
  surfaces where wording is a security property, and a helpful rewrite ("We couldn't find that email")
  is a real and attractive change. A gate that only fired on big edits would not be on that path.
- **Requirements advanced, not completed.** AUTHUI-01 and AUTHUI-03 both span plan 15-11's visual
  baselines and 320px measurements; this plan closes the structural half of AUTHUI-01 and gate 1's
  source half of AUTHUI-03. Neither checkbox is ticked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The declared count is pinned in TWO files, so Task 1 could not touch one**

- **Found during:** Task 1, before the first run
- **Issue:** The plan's acceptance criterion is `git diff --name-only` listing only
  `src/lib/design/live-regions.ts`. But `tests/design/live-regions.test.tsx:258` carried
  `const DECLARED_FILE_COUNT = 21` and asserts `SCAN_FILES.length === DECLARED_FILE_COUNT`, with its
  own docblock reading: *"pinned in TWO places — `DeclaredFileCountIsTwentyOne` … fails the build, and
  this fails the gate with a message. Plans 12-12, 12-13, 13-14 and 14-14 each moved BOTH, in the same
  commit as the components they add. A set that widened in one place and not the other is exactly the
  drift T-12-06-SETDRIFT names."* The module's own alias docblock says the same: widening *"costs a
  rename, a row and a second literal in `tests/design/live-regions.test.tsx`"*. Leaving the literal at
  21 fails the gate the same plan requires to pass.
- **Fix:** Moved both in one commit, which is the procedure both files record. `DECLARED_FILE_COUNT`
  21 → 26, both alias references renamed, and the reason written into the docblock so the next reader
  does not re-derive it.
- **Files modified:** `tests/design/live-regions.test.tsx`
- **Commit:** `ba392e9`
- **Unmet acceptance criterion, stated plainly:** `git diff --name-only` lists **three** files for this
  plan, not the two `files_modified` names. Every other criterion passes.

**2. [Rule 1 - Bug] A glob inside a block comment closes the block comment**

- **Found during:** Task 1, immediately after moving the count
- **Issue:** The alias docblock gained the phrase `` `(auth)/*/page.tsx` `` naming the four added
  screens. `*/` inside `/** … */` **terminates the comment**. `npx tsc --noEmit` produced **39 errors
  across ~80 lines** — TS1005, TS1128, TS1443, TS1161 — none of which named the cause:

  ```
  src/lib/design/live-regions.ts(1625,74): error TS1005: ';' expected.
  src/lib/design/live-regions.ts(1625,81): error TS1128: Declaration or statement expected.
  src/lib/design/live-regions.ts(1625,95): error TS1443: Module declaration names may only use ' or " quoted strings.
  … 36 more, ending at (1704,63) TS1161: Unterminated regular expression literal.
  ```

  A new instance of the phase's recurring collision — a comment that quotes the thing it explains
  breaking the mechanism that reads it (15-06 ×4, 15-07 ×3, 15-08 ×1) — arriving through the lexer
  rather than through a grep.
- **Fix:** The phrase is spelled descriptively ("the four route-group auth pages and the profile
  form") with an in-line sentence saying why the glob is not written out; the literal paths stay at
  `LIVE_REGION_FILES` where they are code rather than prose. `booking-row.tsx:112`'s precedent.
- **Files modified:** `src/lib/design/live-regions.ts`
- **Commit:** `ba392e9` (fixed before the commit landed; the broken state was never committed)

**3. [Rule 1 - Bug] A predicted red that was wrong, corrected in its own commit**

- **Found during:** the M3 write-up
- **Issue:** M3's first note claimed the touch-size assertion *"stayed green, because the mutated
  button already carried `size=\"touch\"`"*. False on both halves: the `Continue with Google` button
  carries no `size="touch"` (login has exactly one, at :216), and the assertion did not pass — it
  never ran, because the count `expect` above it threw first.
- **Fix:** Note rewritten to state what actually happened, and to record that the same reading had
  already been forced by M1 about case (3)'s loop. This is precisely why the walk is watched rather
  than predicted, so the correction is kept in the file rather than silently overwritten.
- **Files modified:** `tests/design/auth-composition.test.tsx`
- **Commit:** `1a8e7f0`

**4. [Rule 3 - Blocking] The plan's `PublicHeader` does not exist in this tree**

- **Found during:** Task 2, reading `(auth)/layout.tsx`
- **Issue:** The plan asks the gate to assert *"zero `PublicHeader` references"*. `grep -c PublicHeader`
  over the layout returns 0 — and would return 0 over any tree, because no component by that name is
  exported anywhere in `src/`. The public composition is `SiteChrome`. An assertion against the plan's
  spelling would have been vacuously green forever, which is the exact defect this phase exists to
  remove.
- **Fix:** The gate bans any JSX element whose binding was imported from `@/components/patterns/site-chrome`
  *except* `BRAND_CLASS`, which is a string rather than a component. Alias-proof, and it catches the
  next chrome export too. Recorded in the file at the constant.
- **Files modified:** `tests/design/auth-composition.test.tsx`
- **Commit:** `e9d0155`

**5. [Rule 1 - Criterion correction] One blanket JSX floor cannot cover four pages**

- **Found during:** Task 2, first run
- **Issue:** The guard-the-guard floor was a single `> 20` for all four pages, and went red against a
  correct tree: `forgot-password/page.tsx — 13 JSX elements`, `reset-password/page.tsx — 19`. The four
  screens genuinely differ by nearly 3×.
- **Fix:** A measured per-file floor map (layout 5 · login 20 · signup 20 · forgot 10 · reset 15,
  against measured counts of 5 / 28 / 35 / 13 / 19), with an explicit note that this is a vacuity
  guard and not an element census. A file with no floor at all now fails loudly rather than being
  silently exempted.
- **Files modified:** `tests/design/auth-composition.test.tsx`
- **Commit:** `e9d0155`

---

**Total deviations:** 5 auto-fixed (2 × Rule 3 blocking, 3 × Rule 1). No Rule 4 situation arose; no
architectural change was needed. **No product source behaviour changed in this plan at all** — the
only `src/` file touched is a declarations module, and `git diff --exit-code src/` is clean after the
full mutation walk.

## Deferred / Out of Scope (logged, not fixed)

- **`loading-coverage.test.ts`'s count-pin `it()` title is still false** (reads "28 pages, 20
  qualifying, 8 not, 20 loading files" beside constants of 29 / 21 / 8). Flagged by 15-08, not in this
  plan's file scope either. Now carrying two plans' provenance.
- **`(auth)/error.tsx`'s two false header claims** remain ownerless — flagged by 15-06, re-flagged by
  15-07 and 15-08. This plan reads that file's route group but not that file. Four plans' provenance.
- **The `(auth)` error boundary is not in the composition gate's set.** It is the fifth document under
  the layout the gate audits, and the layout's own header says the boundary is where forgetting the
  landmark is least visible — so the landmark assertion covers it transitively, but nothing asserts
  what that boundary itself composes. Left for whichever plan next owns that file.

## Issues Encountered

None that were regressions. `npm run build` completed clean, so the new gate is genuinely
build-blocking rather than merely present. `npm test` was deliberately NOT run: nothing outside
`src/lib/design/` and `tests/design/` was touched, the main config excludes `tests/design/**`, and
this box has a measured back-to-back build-then-test interaction that produces bogus failures.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (run bare — the pipe-to-`tail` exit-code trap avoided) | exit 0 |
| `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | exit 0 — **26 passed** |
| `npx vitest run tests/design/auth-composition.test.tsx --config vitest.design.config.ts` | exit 0 — **13 passed** |
| `npm run test:design` | exit 0 — **53 files / 895 passed / 3 skipped** (was 52 / 882 / 3) |
| `npm run build` | exit 0 — no boot guard fired; the gate runs inside the build |
| `git diff --exit-code src/` after both walks | exit 0 |
| `git diff --name-only 809e1e2..HEAD` | the three files above plus this summary — nothing else |
| Working tree | the three pre-existing unrelated entries only, untouched |

**Acceptance greps.** `live-regions.ts`: `DeclaredFileCountIsTwentySix` **1** · `…IsTwentyOne` **0** ·
`extends 26` **1** · `LIVE_REGION_EXCLUSIONS … = []` **1**. `aria-live="assertive"` **0** on every one
of the five Phase-15 surfaces. `auth-composition.test.tsx`: line 1 is the jsdom pragma ·
`grep -c 'aria-live'` **0** (the attribute is spelled through a join, including inside the fixture) ·
`scanModule(path: string, text: string)` **1** · 877 lines (plan floor 180) · six mutations recorded
with their RED quoted verbatim (plan floor four).

## Known Stubs

None. No placeholder value, empty-array data source, mock or "coming soon" copy was introduced. The
one fixture in the new gate is a deliberate positive control, is asserted to be caught rather than to
pass, and is never written to disk.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or schema change. The plan's five
registered threats are all held as written:

| Threat | How it was held |
|---|---|
| T-15-26 (a refusal missed, or a page heard as a change) | Seven rows with the sentence and the moment stated; the two demotions recorded with the rule and asserted by case (12); `LIVE_REGION_EXCLUSIONS` still `[]` |
| T-15-07 (a vacuous gate over an empty parse) | Guard-the-guard asserted FIRST over all five files (bytes + measured per-file JSX floors); a positive-control fixture; six mutations with RED quoted |
| T-15-19 (an undeclared or duplicated testid) | The rendered attribute is read off the DOM and pinned against `SELECTOR_IDS`; the auth wordmark is asserted to carry no hook, and the fixture proves that check fires |
| T-15-31 (a copy change slipping through) | The eight literals are in the gate; M4 mutated one by a single character and was watched red |
| T-15-SC (package installs) | Zero installs. No `package.json` change |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 15-11 (baselines) inherits a surface whose structure is now pinned but whose pixels are not.**
  Nothing in this plan moved a rendered byte: no markup, no class, no copy. Any baseline taken after
  `c22e506` (15-08's close) is still current.
- **Plan 15-11 also inherits AUTHUI-03's remaining gates.** This plan closes gate 1's SOURCE half
  (`size="touch"` present on the one accent control per screen); the 320px `scrollWidth <= clientWidth`
  measurement and the ≥24px/≥44px rendered floors are still owed.
- **Phase 16 (CROP-01/CROP-03) inherits two declared profile regions it must not disturb.**
  `profile-avatar-error` is `alert#1` *by source position*; adding a removal affordance above the
  upload control would displace that ordinal, and `live-regions.test.tsx`'s SCAN 2 is what would
  report it — as one declared-but-absent row and one present-but-undeclared region, not as a
  self-evident message. The row says so at the line.
- **AUTHUI-01's remaining clause is visual.** The structural claim — one main landmark, the wordmark
  above one card, exactly one `h1`, exactly one accent-filled control, one pinned copy table — is now
  build-blocking. The checkbox stays open for 15-11.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*

## Self-Check: PASSED

All three code files and this summary exist on disk; all ten commits (`ba392e9`, `02fcc73`, `e9d0155`,
`45e2228`, `44695fd`, `78f4f33`, `1a8e7f0`, `d13fec2`, `ba1e50b`, `e8ab7f5`) are reachable in
`git log`. `git diff --name-only 809e1e2..HEAD` lists exactly `src/lib/design/live-regions.ts`,
`tests/design/live-regions.test.tsx`, `tests/design/auth-composition.test.tsx` and this summary —
nothing else was touched, and the three pre-existing unrelated working-tree entries are untouched.
