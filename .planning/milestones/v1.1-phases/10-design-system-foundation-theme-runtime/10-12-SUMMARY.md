---
phase: 10-design-system-foundation-theme-runtime
plan: 12
subsystem: design-system
tags: [design-system, elevation, shadows, source-scan, tailwind-v4, content-scan, DS-03]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "the three named `--shadow-*` steps behind per-theme `--elevation-*` vars, and `tests/design/elevation-z.test.ts` itself"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 11
    provides: "the comment-stripping source-scan pattern (line-oriented) and the control-on-the-control rule"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 07
    provides: "the walker and the Windows path-normalisation idiom the scan reuses"
provides:
  - "DS-03's shadow clause, closed: all 14 shadow call sites map to a named step, and zero default `shadow-*` utilities remain anywhere in `src/`"
  - "`tests/design/elevation-z.test.ts` extended 13 → 31 assertions: a comment-aware source scan with per-file floor counts, plus the first sound COMPILED-OUTPUT assertion in this phase"
  - "**Deferred item D-1 CLOSED** — Tailwind's content root narrowed from the repository to `src/`. 15,053 bytes / 11.2% of the shipped CSS removed, 119 dead selectors, zero real utilities lost"
  - "Compiled-output assertions are now SOUND in this repo for the first time — a capability 10-13 through 10-17 inherit"
  - "`tests/design/helpers/compile-css.ts` — a real cache-collision bug fixed: every `compileGlobalsCssWith()` after the first was silently a no-op"
affects: [10-13, 10-14, 10-16, 10-17, 11]

# Tech tracking
tech-stack:
  added: []   # no dependency installed; 9 class swaps, one directive, three test files
  patterns:
    - "Narrow Tailwind's content root to `src/`. Its automatic detection roots at the REPOSITORY, and the design gate's walker roots at `src/` — two scanners, two roots, and only one of them had ever been reasoned about."
    - "A CSS block comment cannot contain a markdown glob: `**/*.md` embeds a star-slash that terminates the comment and the stylesheet then fails to parse."
    - "`@tailwindcss/postcss` caches its design system keyed on the INPUT FILE PATH — programmatic compiles of one file with different safelists must pass distinct `from` paths or every call after the first returns the first one's output."
    - "Count call sites with a `(?<![\\w-])` lookbehind so `@theme` token DECLARATIONS are not counted as uses of themselves."
    - "When prose stops emitting utilities, assertions that were passing on prose go red. Two did. Neither was a regression; both were tests reading the wrong artifact."

key-files:
  created: []
  modified:
    - src/app/(host)/host/bookings/page.tsx          # Task 1
    - src/components/booking/bookings-tabs.tsx       # Task 1
    - src/components/search/search-bar.tsx           # Task 1
    - src/components/ui/tabs.tsx                     # Task 1
    - src/components/search/search-result-card.tsx   # Task 2
    - src/components/ui/dropdown-menu.tsx            # Task 2 (2 sites)
    - src/components/ui/popover.tsx                  # Task 2
    - src/components/ui/select.tsx                   # Task 2
    - tests/design/elevation-z.test.ts               # Task 3 + D-1 (+18 assertions)
    - src/app/globals.css                            # D-1 — the content root
    - tests/design/helpers/compile-css.ts            # D-1 — the cache-collision fix
    - tests/design/font-cycle.test.ts                # D-1 — three assertions rewritten
    - .planning/phases/10-.../deferred-items.md      # D-1 marked CLOSED with the measurement

key-decisions:
  - "D-1 was FIXED here rather than deferred again. Two prior plans named 10-12 as owner, no later plan owned it, the fix is one directive, and this plan made it acute — migrating the 14 shadow call sites orphaned all five default shadow rules, which kept shipping from prose anyway."
  - "The plan's raw-grep acceptance criteria were all off by the globals.css declarations and comments (shadow-raised 5 not 4, shadow-overlay 6 not 5, shadow-none 7 not 5, shadow-sticky 1 not 0). The code counts are exactly as planned. Eleventh occurrence of the grep-versus-comment collision this phase, and the first where the TOKEN CONTRACT ITSELF was the false positive."
  - "The `dark:` occurrence pin is 54, not the plan's 56. D-2 in deferred-items already recorded the drop to 54 after 10-07 removed two dark-mode twins. Verified unchanged by this plan rather than adjusted to fit."
  - "DS-03 deliberately left `Pending`. Its z-index clause is plan 10-13's `part 2`, which claims the same ID — the same two-plan split 10-04 predicted and 10-11 executed for DS-02."

patterns-established:
  - "A design gate may now assert what the shipped stylesheet does NOT contain. Every such assertion must carry a control proving the content scan still reaches `src/`, because a root narrowed one level too far makes every absence assertion pass perfectly against an app shipping no CSS at all."
  - "Floor counts on both sides of a migration: N named sites AND M untouched survivors, each pinned per file. A zero-violations gate is blindest to a DELETE, and a delete passes it perfectly."

requirements-completed: []   # DS-03's z-index clause is 10-13's; see Decisions

# Metrics
duration: 35min
completed: 2026-08-12
---

# Phase 10 Plan 12: Shadow Call Sites → Named Elevation Steps Summary

**No surface in this app pins a shadow to a value a theme cannot reach — and the stylesheet that ships to users now contains only what the app actually uses, which is the first time in this phase that a compiled-output assertion has meant anything at all**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-12T02:24Z
- **Completed:** 2026-08-12T02:59Z
- **Tasks:** 3 (all `auto`, no checkpoints) + 1 deviation-driven commit
- **Files:** 0 created, 13 modified

## Accomplishments

- **All 14 shadow call sites are migrated, and the inventory matched the plan exactly** — 4 raised (`shadow-xs` ×1 + `shadow-sm` ×3), 5 overlay (`shadow-md` ×4 + `shadow-lg` ×1), 5 `shadow-none` untouched, across 10 files. Five distinct shipped values collapse into three, so some surfaces gain or lose depth; that is the three-step scale working, not a regression (T-10-47).
- **The point of the migration, restated because it is easy to read as cosmetic:** Tailwind's default `shadow-md` compiles to a *literal*, not a `var()`. A theme block redeclaring `--shadow-md` does nothing. Every one of those 14 surfaces was frozen against every theme forever, and grove's "pronounced elevation" (D-02) could not reach them. They now resolve through `--elevation-*` and re-skin per theme.
- **`shadow-sticky` was deliberately left with zero call sites, and that zero is asserted.** It is reserved for bottom-anchored bars; no such surface exists in the shipped tree, and inventing one to give the token a home would be worse than the zero. `/dev/theme`'s ladder (10-16) exercises it. Recorded so it is not later filed as an unused-token bug.
- **The gate is 31 assertions (was 13) and was watched go red at 5 failed / 26 passed** on a `shadow-md` reinstated at `popover.tsx` — the source scan, the vocabulary check, the *count*, the per-file overlay inventory, and the new compiled-output assertion, all firing. Every token assertion stayed green: the correct blast radius, and the argument for the section in one line — a token contract cannot tell you whether anything obeys it. Reverted → 31 passed.
- **The count assertions are what make a DELETE fail as loudly as a WRONG NAME.** A "migration" that deleted all 14 shadows would satisfy every zero-violations assertion perfectly. The gate pins 9 named sites and 5 surviving `shadow-none`, each per file, so the failure diff names the surface that moved.
- **Deferred item D-1 is CLOSED, and the measurement is the headline: 134,132 → 119,079 bytes, −15,053 (−11.2%), 119 dead selectors removed, 0 added.** See the dedicated section below.
- **270/270 design tests green** (was 251), DB-free, ~4.4s. Full DB suite **1197 passed / 4 skipped**, unchanged. `tsc --noEmit` exit 0, `npm run build` exit 0, lint 0 errors / 9 warnings — unchanged from the phase baseline.

## D-1: the phase's oldest deferred item, closed — and what closing it exposed

Two prior plans nominated 10-12 as D-1's owner, no later plan owned it, and **this plan made it
acute**: the moment the 14 call sites stopped saying `shadow-md`, all five default shadow rules were
orphaned — and kept shipping anyway, emitted from `globals.css`'s own explanatory comment and from the
phase's plan documents. Tailwind's automatic source detection roots at the **repository**; the design
gate's walker roots at `src/`. Two scanners, two roots, and only one of them had ever been reasoned
about.

The fix is one directive — `@import "tailwindcss" source("../")` — and it went in with a paragraph
explaining why, because the next reader's instinct will be to delete it.

**Measured on a clean `rm -rf .next && npm run build`, both sides:**

| | before | after |
|---|---|---|
| shipped CSS | 134,132 bytes | **119,079 bytes** (−15,053, **−11.2%**) |
| distinct selectors | 1,233 | **1,114** (−119, **0 added**) |
| `.shadow-xs/sm/md/lg/2xl` | 5 rules | **0** |
| `.bg-brand\/90` / `.outline-ring\/50` / `.focus-visible\:ring-ring\/50` | present | **0** |

**Nothing real was lost, and that was verified rather than assumed.** A strict standalone-class-token
scan of all `src/**/*.tsx` found **0 of the 119** removed selectors used anywhere; then the eight
highest-risk entries were checked by hand and their genuine prefixed forms confirmed still emitted
(`sticky` → `lg:sticky`, `ring-3` → `aria-invalid:ring-3`, `animate-in` → `data-open:animate-in`,
`ring-offset-background` → `focus-visible:ring-offset-background`, `@container` →
`@container/card-header`, `hover:bg-primary/80` → `[a]:hover:bg-primary/80`, `bg-white` →
`dark:bg-white`, and `focus-visible:ring-3` → genuinely unused). The removed list reads as exactly
what it is: `text-[NNpx]`, `text-[Nrem]`, `bg-[--x]`, `bg-[color-mix(in_oklch,...)]`,
`text-display/7`, and the bare numbers `247031` / `2596` / `706708` — byte counts quoted in documents.

**The bytes are the least interesting part. Removing the prose exposed two live defects that had been
masked by it, both of which had been making tests pass for the wrong reason all phase:**

1. **`@tailwindcss/postcss` caches its compiled design system keyed on the INPUT FILE PATH.** Every
   compile in `helpers/compile-css.ts` passed `from: GLOBALS_CSS_PATH`, so the first compile in a
   test file won and every later one silently returned the first one's candidate set — the appended
   `@source inline(…)` was accepted and **ignored**. Reproduced directly: with a shared path, a
   compile safelisting `shadow-md` emitted no `.shadow-md` rule at all; with distinct paths it emits
   one. This means `elevation-z.test.ts`'s "the default shadows are still literal" control — written
   by 10-04, the *inverse control for the whole premise of named steps* — had never been proving what
   it claimed. It was passing because a markdown file said `shadow-md`.
2. **Three DS-01 assertions in `font-cycle.test.ts` read `.font-sans` and `.font-mono` rules that no
   file in `src/` uses.** `font-sans` reaches the app through `@apply font-sans` in `@layer base`,
   which *inlines* the declaration and never needs the utility to be generated. DS-01 was never
   broken — `html{font-family:var(--font-geist-sans)}` is in the shipped bundle before and after —
   the assertions were reading the wrong artifact. They now read the `html` rule itself (which is
   what actually carries DS-01 to every screen) and `.font-heading` (which has two real call sites,
   so it needs no safelist and proves the D-20 alias end-to-end), plus an explicit safelisted "IF it
   were used" claim carrying its own positive control.

**What it unlocks.** Compiled-output assertions are **sound in this repo for the first time**. DS-03
immediately takes the strongest form available to it — *no default shadow rule exists in the emitted
stylesheet, from any source* — which is a materially bigger claim than "no component references one".
Plans 10-13 through 10-17 inherit that capability; 10-07 and 10-11 both had to route around its
absence.

**And the guard that assertion needs is the one worth copying.** An absence assertion over compiled
output passes *perfectly* if the content root is narrowed one level too far and the app ships no CSS
at all. So the block also asserts that `.shadow-raised` and `.shadow-overlay` are still emitted
**unforced and unsafelisted** — they exist only because the scan still reaches `src/` — and that
`.shadow-sticky` is absent because nothing uses it. Three declared steps, two shipped, and the
difference is exactly the one with no call site.

## Task Commits

1. **Task 1: The 4 raised surfaces** — `5221317` (refactor)
2. **Task 2: The 5 overlay surfaces** — `5db67d3` (refactor)
3. **Task 3: The DS-03 shadow gate** — `7a97233` (test)
4. **Deviation: D-1, the content-scan root** — `bf5584d` (fix)

**Plan metadata:** see the `docs(10-12)` commit that carries this file.

## Files Created/Modified

- **The 4 raised sites (Task 1).** The host bookings listing-filter `<select>` (`shadow-xs`), the
  bookings-tabs active trigger, the search-bar form surface, and the vendored `tabs.tsx`
  default-variant active trigger. At `tabs.tsx:66` a single line carries both `shadow-sm` and
  `shadow-none`; only the former changed, and the gate asserts both counts on that file independently
  so a scan matching once per line cannot report 8 named sites and 4 survivors while looking tidy.
- **The 5 overlay sites (Task 2).** The search-result-card hover lift (`group-hover:shadow-md`),
  dropdown-menu content *and* sub-content (the latter is the lone `shadow-lg`, the fifth distinct
  value), popover content, and select content. Four are vendored — they join the fork surface D-17
  already accepts (T-10-46), recorded here so a future `npx shadcn add` knows what it re-collides
  with.
- **`tests/design/elevation-z.test.ts` — 13 → 31 assertions.** A 216-file walk of `src/` (>200 floor)
  with the `focus-recipe.test.ts` walker and its Windows path normalisation; the line-oriented comment
  stripper with its `image/*` fixture control; zero default `shadow-*`; a vocabulary check that also
  catches arbitrary values and colour utilities; per-file inventories for raised (4), overlay (5) and
  the untouched `shadow-none` (5); the co-located-pair assertion; the compiled-output block; and two
  controls on the controls. The header carries the observed-red numbers, the D-1 history, and an
  honest blind-spot list — including that z-index is 10-13's and deliberately absent here.
- **`src/app/globals.css` — the content root**, with the reasoning at the directive.
- **`tests/design/helpers/compile-css.ts`** — `compileAttributedTo()`, and both compile paths routed
  through it. The docstring records the measurement, not just the rule.
- **`tests/design/font-cycle.test.ts`** — three assertions rewritten onto load-bearing artifacts, with
  a header explaining why they moved so nobody "restores" them.

## Decisions Made

- **Fix D-1 rather than defer it a fourth time.** See the section above.
- **DS-03 left `Pending`.** Its z-index clause is 10-13's declared `part 2`, claiming the same ID.
  Marking it here would be the inaccuracy 10-04's deviation 2 established the practice against.
- **`shadow-sticky` gets no invented home**, and the zero is asserted rather than left implicit.
- **Count call sites with a `(?<![\w-])` lookbehind.** `--shadow-raised:` is the *contract*, not a use
  of it; without the lookbehind every inventory is off by one and a raw `grep -c` returns 5 for 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Every one of the plan's raw-grep acceptance criteria was wrong against the tree — all from the same cause**

- **Found during:** Tasks 1 and 2 acceptance verification
- **Issue:** The plan's criteria are raw greps over `src/app src/components`, which includes
  `globals.css`. Measured: `shadow-raised` returns **5** (plan says 4), `shadow-overlay` **6** (says
  5), `shadow-none` **7** (says 5), `shadow-sticky` **1** (says 0), and the "no `shadow-(xs|sm)`
  remains" check is tripped by `globals.css:88`. Every discrepancy is the three `--shadow-*` **token
  declarations** plus the block comment that explains why the defaults are banned.
- **Fix:** Verified the real **code** counts instead, restricted to `.ts`/`.tsx`: raised 4, overlay 5,
  none 5, sticky 0, zero defaults — exactly the plan's intent. The gate encodes the code counts via
  the comment stripper and the lookbehind, so the stylesheet may keep explaining itself.
- **Files modified:** none (verification method only)
- **Verification:** 14 code sites enumerated by file and line; `tests/design/elevation-z.test.ts`
  asserts all of it and carries the control proving the stripper is not a no-op.
- **Committed in:** `5221317`, `5db67d3`, `7a97233`

**2. [Rule 1 - Bug] The `dark:` occurrence pin is 54, not the plan's 56**

- **Found during:** Task 1 acceptance verification
- **Issue:** The plan requires `grep -rho "dark:" src/components/ui/ | wc -l` to still return **56**.
  It returns **54**, and it returned 54 before this plan touched anything — deferred item D-2 already
  recorded the drop when 10-07 removed two dark-mode twins.
- **Fix:** Re-pinned to the true pre-plan baseline and proved this plan did not move it (`tabs.tsx`
  holds 7 `dark:` occurrences at HEAD and 7 after the edit). Not "adjusted to fit" — measured against
  `git show HEAD:` before the claim.
- **Files modified:** none
- **Verification:** 54 before, 54 after; `tabs.tsx` 7 → 7.
- **Committed in:** `5221317`

**3. [Rule 2 - Missing] Deferred item D-1 fixed: the content root narrowed to `src/`**

- **Found during:** Task 3 verification, on the clean rebuild
- **Issue:** Migrating the 14 call sites orphaned all five default `shadow-*` rules, which kept
  shipping anyway. Two prior plans named 10-12 as D-1's owner and no later plan owns it (10-13…10-17
  contain no `@source` work), so deferring again would have dropped it.
- **Fix:** `@import "tailwindcss" source("../")` with the reasoning recorded at the directive, plus
  the compiled-output assertions the narrowing makes sound and the control that catches over-narrowing.
- **Files modified:** `src/app/globals.css`, `tests/design/elevation-z.test.ts`
- **Verification:** 134,132 → 119,079 bytes; 119 selectors removed / 0 added; 0 of the 119 used in
  `src/`; full DB suite unchanged at 1197.
- **Committed in:** `bf5584d`

**4. [Rule 1 - Bug] A CSS block comment cannot contain a markdown glob**

- **Found during:** the first D-1 build, which **failed**
- **Issue:** The comment explaining the narrowing wrote the glob for `.planning` markdown. That string
  embeds a star-slash, which **terminates the CSS block comment** — CSS comments do not nest — and the
  rest of the line parsed as CSS: `globals.css:5:37: Unknown word`, build exit non-zero.
- **Fix:** Rephrased to describe the path without the glob, and the hazard is recorded *in the comment
  itself* so the next author does not re-introduce the obvious phrasing.
- **Files modified:** `src/app/globals.css`
- **Verification:** `npm run build` exit 0.
- **Committed in:** `bf5584d`

**5. [Rule 1 - Bug] `@tailwindcss/postcss` caches its design system by input path, making every safelist after the first a silent no-op**

- **Found during:** the first run of the new compiled-output assertions — 2 red, one of them a
  **pre-existing 10-04 control**
- **Issue:** All programmatic compiles passed `from: GLOBALS_CSS_PATH`, so Tailwind returned the first
  compile's candidate set for every later one and `@source inline(…)` was ignored. Latent since 10-04
  and invisible while prose emitted the classes anyway.
- **Fix:** `compileAttributedTo()` gives each distinct input its own filename inside the same directory
  — imports and the content root resolve identically, and nothing is written to disk.
- **Files modified:** `tests/design/helpers/compile-css.ts`
- **Verification:** with distinct paths, safelisting `shadow-md` emits `.shadow-md` and the plain
  compile does not; all 14 design files green.
- **Committed in:** `bf5584d`

**6. [Rule 1 - Bug] Three DS-01 assertions were reading utility rules the app does not use**

- **Found during:** the full design gate after the narrowing — 3 red in `font-cycle.test.ts`
- **Issue:** They asserted the presence of `.font-sans` and the `--font-sans` / `--font-heading`
  `:root` variables. Nothing in `src/` uses `font-sans` or `font-mono` as a class; `font-sans` reaches
  the app via `@apply`, which inlines the declaration. The rules existed only because prose emitted
  them. **DS-01 itself was never broken** — verified in the shipped bundle both before and after.
- **Fix:** Rewritten onto the artifacts that carry DS-01: the compiled `html { font-family }` rule and
  `.font-heading` (2 real call sites, no safelist needed), plus a safelisted conditional claim with a
  `font-figure` positive control.
- **Files modified:** `tests/design/font-cycle.test.ts`
- **Verification:** 8/8 green; `html{font-family:var(--font-geist-sans)}` and
  `.font-heading{font-family:var(--font-geist-sans)}` both present in the shipped bundle.
- **Committed in:** `bf5584d`

---

**Total deviations:** 6 (5 × Rule 1, 1 × Rule 2). No Rule 4 checkpoint was needed.
**Impact on plan:** All 14 sites migrated exactly as specified and every acceptance criterion holds on
its intent. Four criteria were satisfied by measuring code rather than raw text, because the literal
form counted the token contract as a use of itself. The one scope addition — D-1 — was explicitly
assigned to this plan by two prior plans and owned by no later one.

## Deferred Issues

**None new**, and one closed: **D-1 is marked RESOLVED** in
`.planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md`, with the byte
measurement, the no-loss verification, both exposed defects, and a correction to the original item
(it claimed `bg-zinc-50` exists nowhere in `src/`; it is on two real surfaces —
`src/app/(auth)/layout.tsx:15` and `src/app/(host)/host/layout.tsx:84` — and is a raw-value leak for
10-17's DS-13 gate to judge, not a phantom). The three later D-1 UPDATE sections are marked superseded.

One observation for **Phase 11's GATE-01**, flagged rather than deferred: five shipped shadow values
collapse to three, so depth visibly changes on nine surfaces. The largest single delta is
`dropdown-menu`'s sub-content, which drops from `shadow-lg` to the same overlay step as its parent
menu — deliberate (a sub-menu is not a higher layer than the menu that owns it), but it is the one
place where two previously distinct depths become identical and are seen side by side.

## Issues Encountered

- **The grep-versus-comment collision hit for the eleventh time, in a genuinely new form.** Ten prior
  occurrences were a *comment* naming a banned string. This one is the **token contract itself**:
  `--shadow-raised:` contains `shadow-raised`, so the declaration that makes the step exist is counted
  as a use of it. Same one-line tell as always — *if a criterion counts a string, nothing inside its
  scope may contain that string* — but the offending artifact was the thing being tested, not prose
  about it. The `(?<![\w-])` lookbehind is the fix and it is documented at the regex.
- **The CSS-comment-terminator failure (deviation 4) is the same class one layer down.** A comment
  explaining a glob cannot contain the glob. It failed loudly at build time, which is the good
  outcome.
- **The most valuable finding was not planned and is not about shadows.** Removing the prose made two
  tests go red that had been green for the whole phase — one of them a *control*, whose entire job was
  to prove another assertion meant something. That is the concrete form of D-1's second consequence,
  and it argues that the narrowing was worth more than its 11.2%.
- **`state.record-metric` rejected its own documented argument order** and `state.update-progress`
  reported `Progress field not found` — the known `gsd-sdk` v1.42.3 behaviour. STATE.md's frontmatter,
  Current Position, the metrics row and Decisions were hand-written per the toolchain notes.
  `roadmap.update-plan-progress 10` worked.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- elevation-z` | exit 0 — **31 passed** (was 13) |
| Observed RED: `shadow-md` reinstated at `popover.tsx:33` | exit non-zero — **5 failed / 26 passed**, each failure naming the surface |
| Observed GREEN after revert | exit 0 — **31 passed** |
| `npm run test:design` (whole gate) | exit 0 — 14 files, **270 passed** (was 251), ~4.4s, no database |
| `npm run db:up && npm run db:test:setup && npm test` | exit 0 — **1197 passed / 4 skipped**, unchanged |
| Code sites: `shadow-raised` / `shadow-overlay` / `shadow-none` / `shadow-sticky` | **4 / 5 / 5 / 0** (14 total, 10 files) |
| Default `shadow-(xs\|sm\|md\|lg\|xl\|2xl)` in code | **0** (only `globals.css`'s comment, stripped) |
| `grep -c "shadow-none" src/components/ui/tabs.tsx` | **1** — the co-located none survived |
| Vendored `dark:` occurrence total | **54** before and after (see deviation 2) |
| `grep -c "toBeGreaterThan(200)" tests/design/elevation-z.test.ts` | **1** (≥1 required) |
| `grep -c "input-group" tests/design/elevation-z.test.ts` | **5** (≥1 required) |
| Scan reach | **216** files walked; **151** in the DS-03 subtree; `input-group.tsx` reached by name |
| Clean-rebuild CSS bytes | **134,132 → 119,079** (−15,053, −11.2%) |
| Compiled selectors | **1,233 → 1,114** (−119, **0 added**) |
| Removed selectors used anywhere in `src/**/*.tsx` | **0 of 119**, two independent checks |
| `.shadow-xs/sm/md/lg/2xl` in the shipped bundle | **5 rules → 0** |
| `html{font-family:var(--font-geist-sans)}` in shipped bundle | present before **and** after (DS-01 intact) |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** — "✓ Compiled successfully in 29.5s" |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, unchanged from baseline |
| `git diff --diff-filter=D` on all 4 commits | no file deletions |
| `git status --short` after each commit | clean |

## Known Stubs

None. Every edit is a real class swap on a real rendered surface, every assertion runs against the
live source tree or its real compiled output, and nothing is mocked or placeholder. `shadow-sticky`
having zero call sites is **not** a stub: it is a reserved step with an asserted zero and a named
future exerciser (`/dev/theme`, plan 10-16), and the gate says so explicitly rather than implying
coverage it does not have.

## Threat Flags

None. This plan changes 9 class strings, one CSS directive and three test files. No network endpoint,
auth path, file access pattern or schema change; `drizzle/` untouched at `0025` (GATE-06).

Threat register dispositions honoured: **T-10-45** (a zero-violations assertion passes against a
scanner that visited nothing, and a delete-instead-of-rename passes too) — mitigated four ways: exact
floor counts on both sides pinned per file, a >200-file reach floor, `input-group.tsx` named as the
positive-control file, and the gate observed red before the task closed. **T-10-46** (vendored edit
surface) — accepted as planned; `dropdown-menu`, `popover`, `select` and `tabs` are recorded as fork
surface. **T-10-47** (visible depth changes) — accepted and recorded as the intended outcome, with the
sub-content case called out for Phase 11 rather than left to be discovered as a regression.

## Next Phase Readiness

- **10-13 (DS-03 part 2, z-index)** — inherits three things. (1) `elevation-z.test.ts` is the same file
  it extends; the shadow section is self-contained and the header states that z-index is deliberately
  absent. (2) The `(?<![\w-])` lookbehind rule: `--z-dialog:` is a declaration, not a call site, and
  the same off-by-one is waiting. (3) The consumption form is not guessable and fails **silently** —
  `z-dialog` compiles to nothing; write `z-(--z-dialog)`. **10-13 also owns marking DS-03 complete.**
- **10-13 through 10-17** — **compiled-output assertions are now sound.** Before this plan the only
  safe posture was a source scan or a forced safelist; a claim about the bundle could be satisfied or
  broken by a markdown file. Any such assertion must still carry the control that the scan reaches
  `src/`.
- **10-17 (the build gate)** — `test:design` remains DB-free and fast (~4.4s for 270). Its DS-13 leak
  gate should note that `bg-zinc-50` is a **real** raw-value leak on two layouts, not the phantom D-1
  originally described it as.
- **10-16 (`/dev/theme`)** — the elevation ladder is the only planned exerciser of `shadow-sticky`;
  the gate asserts zero call sites in `src/`, so a `/dev/theme` page under `src/app/**` **will** move
  that assertion. It is expected to be updated in the same commit, deliberately.
- **Phase 11 (GATE-01)** — baselines must be shot after this plan: nine surfaces changed depth, and
  the two previously distinct dropdown layers now render identically.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 13 modified files verified on disk plus this file, and all 4 commits verified in `git log`
(`5221317`, `5db67d3`, `7a97233`, `bf5584d`). `REQUIREMENTS.md` re-read: **DS-03 still reads
`Pending`** in both the checklist and the traceability table, which is the accurate state — its
z-index clause is plan 10-13's declared `part 2` and 10-13 claims the same ID. `deferred-items.md`
re-read: **D-1 reads CLOSED** with the byte measurement and the no-loss verification, and the three
later D-1 UPDATE headings are marked superseded. `ROADMAP.md` Phase 10 progress reads **12/17, In
Progress**. STATE.md frontmatter, Current Position, the metrics row and the new Decisions entries were
hand-written, as the toolchain notes prescribe after `state.record-metric` rejected its own positional
arguments.
