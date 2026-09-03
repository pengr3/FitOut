---
phase: 10-design-system-foundation-theme-runtime
plan: 02
subsystem: testing
tags: [design-system, leak-gate, tokens, postcss, tailwind-v4, jsdom, spike]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate that tests/design/infra.test.ts runs under"
provides:
  - "`config/design-leak-patterns.mjs` — THE leak-pattern list (D-16): 5 stateless patterns + LEAK_SCAN_GLOBS + LEAK_SCAN_PREFIXES + LEAK_DISABLE_RULE_ID + findDesignLeaks()"
  - "`config/design-tokens-source.mjs` — THE globals.css token parser: parseThemeTokens / parseGlobalTokens / readThemeTokens / readGlobalTokens / THEME_NAMES / GLOBALS_CSS_PATH"
  - "`tests/design/helpers/compile-css.ts` — compileGlobalsCss() (postcss + @tailwindcss/postcss, cached, ~470ms, no DB), declarationsFor(), customPropertyValue(), and the single re-export site for token data"
  - "THEME-04 SPIKE VERDICT (closes RESEARCH Open Question 5 / assumption A7): **jsdom RESOLVES nested custom properties** — with two measured hard limits that keep the compiled-CSS check mandatory"
  - "`tests/design/infra.test.ts` — 27 assertions proving both what the patterns flag and what they exempt"
affects: [10-03, 10-11, 10-14, 10-16, 10-17, quality-gates, theme-runtime]

# Tech tracking
tech-stack:
  added: []   # postcss + @tailwindcss/postcss already present; jsdom already present. No installs.
  patterns:
    - "Shared-primitive-in-plain-ESM: a rule list with two consumers in two module systems lives in `config/*.mjs`, outside the tree it polices"
    - "Colour-context-anchored regex: ban a shape by its syntactic neighbourhood (`=`, quote, `(`, `:`, `,`) rather than by the shape alone, so prose survives"
    - "Assert-both-directions fixtures: every rule proves a true positive AND its known false positives"
    - "Spike verdict recorded in the consuming file's header under a greppable marker, so the next plan reads it from code rather than from a doc"

key-files:
  created:
    - config/design-leak-patterns.mjs
    - config/design-tokens-source.mjs
    - tests/design/helpers/compile-css.ts
    - tests/design/infra.test.ts
  modified:
    - tests/design/infra.test.ts   # Task 2 added the compile-CSS assertions to the file Task 1 created

key-decisions:
  - "THEME-04 SPIKE VERDICT: `jsdom RESOLVES nested custom properties` (jsdom 29.1.1) — A7 was wrong. BUT jsdom returns the literal string `var(--brand)` for background-color (no var() substitution) and computes `\"\"` for any declaration whose only home is `@layer`. Tailwind v4 emits everything inside @layer, so a jsdom assertion over COMPILED CSS is vacuous. Plan 10-16: compiled-CSS check stays mandatory; a jsdom nested assertion is PERMITTED only over raw [data-theme] blocks read straight from globals.css, asserting getPropertyValue('--token') directly."
  - "Both shared modules are `config/*.mjs` — not TypeScript. eslint.config.mjs cannot import .ts, and a module holding the hex/palette regexes would flag itself if it sat under the scanned tree (L15)."
  - "raw-hex is colour-context anchored (`(?:^\\s*|[=\"'(:,]\\s*)#…`) rather than escape-hatched. Anchoring makes `see #3388 for details` clean by construction; an escape hatch would have made every prose hex a per-site opt-out."
  - "parseThemeTokens returns {} for an absent theme (total, pure) while readThemeTokens/readGlobalTokens THROW on an absent block — the file-reading path is where an empty result is always a bug, and returning {} there is how a downstream gate passes vacuously (T-10-06)."
  - "postcss is imported directly though it is not a direct devDependency: it is a hard dependency of @tailwindcss/postcss and cannot be absent while Tailwind v4 is installed. No package was installed by this plan."

patterns-established:
  - "One list, two module systems: the `config/*.mjs` shared-primitive shape is now the repo's answer whenever ESLint and Vitest must agree"
  - "A spike's verdict lives in the header of the file that consumes it, under a greppable marker, with the exact snippet and the measured limits — not in a planning doc"

requirements-completed: []  # DS-13 / DS-06 / THEME-04 are each claimed by 3-4 plans in this phase; this plan ships the primitives, not the gates. See Deviations.

# Metrics
duration: 15min
completed: 2026-08-11
---

# Phase 10 Plan 02: Shared Design Primitives Summary

**One leak-pattern list and one `globals.css` parser, both in plain ESM outside the tree they police, plus a programmatic Tailwind compile — and the THEME-04 spike came back the opposite way from the assumption it tested**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-11T22:33Z
- **Completed:** 2026-08-11T22:48Z
- **Tasks:** 2 (both `auto`, no checkpoints)
- **Files:** 4 created (1 of them touched again in Task 2)

## Accomplishments

- **There is now exactly one leak-pattern list in the repository** (D-16), in plain ESM at `config/design-leak-patterns.mjs`, importable by both `eslint.config.mjs` (which cannot import `.ts`) and the Vitest gate. It bans five classes: raw hex, colour functions, arbitrary `text-[NNpx]`, numbered Tailwind palette classes and `white`/`black` classes — the last two being D-15's recorded widening of DS-13. Every pattern is declared without the `g` flag, and a test asserts that, because a `g`-flagged shared RegExp alternates true/false across `.test()` calls via `lastIndex`.
- **Both known false positives are dead by construction, not by exemption.** `see #3388 for details` does not flag because the hex pattern requires a colour context (`^`, `=`, a quote, `(`, `:` or `,` immediately before the `#`). `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` does not flag because the colour-function pattern requires the trailing `(`, which `in_oklch,` does not have. Both are asserted, one fixture per assertion.
- **There is no vendored exemption** (D-17): `LEAK_SCAN_GLOBS` is `["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"]`, unqualified, and a test asserts no glob carves `ui/` back out.
- **`globals.css` can be compiled and parsed from a test with no database, in ~470 ms.** The compiled output is 42 KB and contains `.bg-background`; `customPropertyValue(css, "--brand")` reads back `oklch(...)` from it.
- **THEME-04's assertion layer is now a measured finding rather than an open question** — and it went the *opposite* way from assumption A7. See the section below; it is the deliverable a later plan branches on.

## THEME-04 Spike Verdict (RESEARCH Open Question 5 / assumption A7)

**Recorded verbatim in `tests/design/helpers/compile-css.ts` under the `THEME-04 SPIKE` marker.**

> ### VERDICT: `jsdom RESOLVES nested custom properties`

Run 2026-08-11 against **jsdom 29.1.1** / Node v24.13.0, in a throwaway scratch script (not committed). Stylesheet `:root,[data-theme="court"]{--brand:red}` + `[data-theme="grove"]{--brand:green}`, with a `<div data-theme="grove">` nested inside a `<body data-theme="court">`:

| Element | `getComputedStyle(el).getPropertyValue("--brand")` |
|---|---|
| `documentElement` | `"red"` — the `:root` half of the selector list matched |
| `body[data-theme=court]` | `"red"` — the outer value is not clobbered |
| the nested `[data-theme=grove]` host | `"green"` |
| a child *inside* the grove host | `"green"` — inheritance works too |

**This overturns A7** ("jsdom cannot resolve custom-property cascades through `getComputedStyle`, so THEME-04 needs Playwright"), which the research explicitly flagged as unverified and asked Wave 0 to check.

**Two hard limits found in the same spike — both measured, both decisive:**

1. **jsdom does not substitute `var()`.** With `.bg-brand{background-color:var(--brand)}` in the same stylesheet, `getPropertyValue("background-color")` returns the literal string `"var(--brand)"` for *both* the court element and the nested grove element. jsdom can say which value a custom property *holds*; it can never say what colour an element *paints*.
2. **jsdom ignores `@layer` entirely.** A declaration whose only home is `@layer utilities { … }` computes to `""`, and loses outright to a bare `:root` rule when both exist. **Tailwind v4 emits every utility and every theme variable inside `@layer`**, so a jsdom assertion run against the *compiled* stylesheet sees nothing at all — a permanently vacuous pass.

**Consequence for plan 10-16 (unambiguous, and written into the code):**

- The **compiled-CSS check stays MANDATORY** and is the primary assertion: every `@theme inline` entry's utility must emit `var(--token)` and never `var(--color-token)`. Limit 1 means no jsdom assertion can substitute for it, because the indirection bug lives in exactly the `var()` reference jsdom refuses to follow.
- The `/dev/theme` human look remains the cover for the visual claim.
- A **jsdom nested-subtree assertion is now PERMITTED** as a supplementary check — the verdict says it would genuinely work — **only if** it (a) injects the raw `[data-theme]` blocks read out of `globals.css` (never the compiled output) and (b) asserts on `getPropertyValue("--token")` directly (never on a resolved colour). If 10-16 cannot honour both constraints, it must skip the jsdom layer rather than weaken the assertion.

## Task Commits

1. **Task 1: The two shared config modules and their self-test** — `ea9ab5a` (feat)
2. **Task 2: The compile-CSS helper and the THEME-04 spike verdict** — `42c84a4` (feat)

**Plan metadata:** see the `docs(10-02)` commit that carries this file.

## Files Created/Modified

- **`config/design-leak-patterns.mjs` — created.** 5 `{ id, label, pattern, why }` entries (`raw-hex`, `color-function`, `arbitrary-text-px`, `palette-class`, `white-black-class`), plus `LEAK_SCAN_GLOBS`, `LEAK_SCAN_PREFIXES` (`["src/app/", "src/components/"]`, for the Vitest walker), `LEAK_DISABLE_RULE_ID` (`"fitout/no-raw-design-value"`) and a shared `findDesignLeaks(text)` so "what counts as a hit" is single-sourced too. A ~30-line header cites D-15 (why the ban is wider than DS-13), D-16 (one list, two consumers, and why it cannot be TypeScript) and D-17 (why `src/components/ui/**` is in scope). `arbitrary-text-px`'s `why` field names all four tolerated vendored `text-[0.8rem]` sites — `ui/button.tsx:27`, `ui/calendar.tsx:93`, `ui/calendar.tsx:102`, `ui/toggle.tsx:20` — as known debt rather than a silent miss.
- **`config/design-tokens-source.mjs` — created.** `THEME_NAMES`, `GLOBALS_CSS_PATH` (hard-coded `resolve(process.cwd(), "src/app/globals.css")`), `parseThemeTokens(cssText)`, `parseGlobalTokens(cssText)`, `readThemeTokens()`, `readGlobalTokens()`. A real brace-depth walker, not a regex over the whole file: top-level rules only, comments stripped first so they cannot unbalance a brace, and declarations read only from a body's depth-0 segments so a nested `@layer base { body { --x: y } }` cannot leak in. Theme blocks match on `[data-theme="…"]` (quote style tolerated), so `:root,\n[data-theme="court"]` is found as court while a plain `:root` is not a theme block at all — which is what keeps D-05's global-only tokens (z-index, motion) invisible to THEME-02's key-set equality test. `.dark` is unreachable from both parsers.
- **`tests/design/helpers/compile-css.ts` — created.** `compileGlobalsCss()` (postcss + `@tailwindcss/postcss`, `from: GLOBALS_CSS_PATH` so the three `@import`s resolve, cached in a module-level promise), `declarationsFor(css, selector)` and `customPropertyValue(css, name)` — both returning `null`, never an empty string, when absent. Re-exports the token parser so every design test has one import site. Header carries the THEME-04 spike verdict and the repo's `NOT COVERED — real blind spots` section (this proves what the compiler emits, not what a browser paints; the emitted-utility set is a function of what `src/**` currently references; no visual baseline may be captured this phase because GATE-01 is Phase 11 and DS-01 invalidates anything shot before it).
- **`tests/design/infra.test.ts` — created (Task 1), extended (Task 2).** 27 assertions in 6 `describe` blocks: list shape (ids, no `g` flag, non-empty `why`, D-17 scope, `config/` not self-scanned, shared rule id), 6 true positives, the 2 verified false positives, 3 deliberate non-matches, 8 parser assertions against a synthetic stylesheet with the shape plan 10-03 will create, and 2 compile-CSS assertions. Its own `NOT COVERED` header says plainly that this proves the *patterns*, not that any gate applies them to the right files.

## Decisions Made

- **The spike verdict and its two limits** (see the dedicated section — the load-bearing decision of this plan).
- **`raw-hex` is anchored, not escape-hatched.** The research offered `#(?:…){3,8}\b` plus an `eslint-disable` escape hatch. Anchoring on colour context instead makes prose clean by construction and leaves no per-site opt-out to be abused later. Both real hits (`listing-map.tsx:22`, `:34`) still flag.
- **`parseThemeTokens` is total; `readThemeTokens` throws.** A pure parser handed CSS with no grove block returns `{}` so a caller can assert the absence. The file-reading path throws, because by the time anything reads the live stylesheet a missing block is always a bug and `{}` there is how a gate goes green on nothing (T-10-06).
- **`findDesignLeaks()` was added to the module** beyond the plan's named exports, so the ESLint rule and the Vitest walker share the *iteration* as well as the list. Two consumers looping the array themselves is two chances to skip an entry.
- **No package was installed.** `postcss` (8.5.15) and `jsdom` (29.1.1) are already resolved in the tree; `postcss` is a hard dependency of `@tailwindcss/postcss` and cannot be absent while Tailwind v4 is. The reason for importing a transitive dependency is written into the helper's header so a future reader does not "fix" it into a second CSS pipeline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's file list and Task 2's acceptance criteria disagree about where the compile assertion lives**

- **Found during:** Task 1 (writing `tests/design/infra.test.ts`)
- **Issue:** Task 2's acceptance criteria explicitly permits (and prefers) proving `compileGlobalsCss()` "inline inside `tests/design/infra.test.ts` and keep the assertion" — but `tests/design/infra.test.ts` is Task 1's file, and Task 2's `<files>` names only `compile-css.ts`. Writing the compile assertion during Task 1 would have made Task 1's commit red, because `compile-css.ts` did not exist yet; per-task atomic commits require each commit to be independently green.
- **Fix:** Task 1 shipped `infra.test.ts` with 25 assertions and no compile import (green, 320 ms). Task 2 added the import and 2 compile assertions to the same file (green, 971 ms). `infra.test.ts` therefore appears in both commits — created in `ea9ab5a`, extended in `42c84a4`.
- **Files modified:** `tests/design/infra.test.ts` (as planned, just across two commits)
- **Verification:** `npm run test:design -- infra` exits 0 at both commits.
- **Committed in:** `ea9ab5a`, `42c84a4`

**2. [Rule 3 - Blocking] `requirements.mark-complete DS-13 DS-06 THEME-04` deliberately not run**

- **Found during:** State updates
- **Issue:** The plan frontmatter claims `requirements: [DS-13, DS-06, THEME-04]`, but each ID is claimed by three or four plans in this phase (`DS-13` → 10-01/02/14/17; `THEME-04` → 10-02/03/16; `DS-06` → 10-01/02/03/14). DS-13's text is "an automated leak test **fails the build**" — this plan ships the pattern list, not the tree walker (10-14) and not the build wiring (10-17). DS-06 is the contrast test, not shipped here at all. THEME-04's subject — a nested `[data-theme]` subtree — does not exist until 10-03 declares the theme blocks, and its assertion is 10-16. Ticking any of the three now would put a false `Complete` in the traceability table for the rest of the phase.
- **Fix:** Skipped `requirements.mark-complete`, matching plan 10-01's identical resolution. `requirements-completed: []` with the reason inline.
- **Files modified:** none (a deliberate omission)
- **Verification:** `grep -n "DS-06\|DS-13\|THEME-04" .planning/REQUIREMENTS.md` still shows all three `Pending`, which is the accurate state.
- **Committed in:** n/a

**3. [Rule 2 - Missing critical functionality] `parseGlobalTokens` and `findDesignLeaks` added beyond the named exports**

- **Found during:** Tasks 1 and 2
- **Issue:** The plan's frontmatter export list names `readGlobalTokens` but not a pure twin, while the task body requires the self-test to assert "`readGlobalTokens`' equivalent must return only `--z-dialog`" against an *inline CSS fixture string* — impossible against a function that reads a hard-coded file path. Separately, having each of the two consumers loop `DESIGN_LEAK_PATTERNS` itself is two independent chances to skip an entry.
- **Fix:** Added `parseGlobalTokens(cssText)` (pure) with `readGlobalTokens()` delegating to it — the same split the plan already prescribes for `parseThemeTokens`/`readThemeTokens` — and `findDesignLeaks(text)` so the iteration is shared too. Both are additive; every export the plan named exists with the prescribed signature.
- **Files modified:** `config/design-tokens-source.mjs`, `config/design-leak-patterns.mjs`
- **Verification:** `npm run test:design` 29/29; `npx tsc --noEmit` exit 0.
- **Committed in:** `ea9ab5a`

---

**Total deviations:** 3 (2 × Rule 3 plan-conflict resolutions, 1 × Rule 2 additive)
**Impact on plan:** No scope creep. Every artifact and every named export the plan specified exists; the additions are the two functions the plan's own acceptance text implies.

## Issues Encountered

- **The spike's headline result contradicts the research's assumption**, which made the *shape* of the finding more important than the yes/no answer. A bare "jsdom resolves it" would have licensed plan 10-16 to assert in jsdom against the compiled stylesheet — which measurement shows would be a permanently vacuous pass, because jsdom drops `@layer` and Tailwind v4 emits everything inside `@layer`. Both limits were probed explicitly and written into the verdict rather than left implied.
- **The scratch spike script could not `import "jsdom"` from the scratch directory** (Node resolves from the script's own location, not cwd). Worked around with `createRequire(<repo>/package.json)`. Scratch-only; nothing committed.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- infra` (after Task 1) | exit 0 — **25 passed**, 320 ms |
| `npm run test:design -- infra` (after Task 2) | exit 0 — **27 passed**, 971 ms |
| `npm run test:design` (whole gate) | exit 0 — 2 files, **29 passed**, 985 ms |
| AC: five exact pattern ids | exit **0** |
| AC: `raw-hex` rejects `see #3388 for details`, accepts `fill="#fff"` | exit **0** |
| AC: `color-function` rejects the `color-mix(in_oklch,…)` string | exit **0** |
| AC: `LEAK_SCAN_GLOBS` includes `src/components/` (D-17) | exit **0** |
| AC: `LEAK_SCAN_PREFIXES` contains no `config/` entry | exit **0** |
| `grep -c "THEME-04 SPIKE" tests/design/helpers/compile-css.ts` | **1** |
| `grep -cE "jsdom (RESOLVES\|DOES NOT RESOLVE) nested custom properties" …` | **1** |
| `grep -c "NOT COVERED" tests/design/helpers/compile-css.ts` | **1** |
| compiled `globals.css` length / content | **> 10000 chars**, contains `.bg-background` (asserted in `infra.test.ts`) |
| `npx tsc --noEmit` | exit **0** |
| `npx eslint config/ tests/design/…` | exit **0** |
| `npm run lint` (whole repo) | exit **0** — **0 errors / 9 warnings**, byte-identical to the recorded baseline |
| `git diff --diff-filter=D` on both commits | no deletions |
| `git status --short` after both commits | clean except `.planning/config.json` (orchestrator-owned) |

## Known Stubs

None. Every assertion in `tests/design/infra.test.ts` runs real patterns against real fixture text or the real compiled stylesheet; nothing is mocked and nothing returns a placeholder.

## Next Phase Readiness

- **Plan 10-03** can declare the `[data-theme="court"]` / `[data-theme="grove"]` blocks and assert them immediately: `parseThemeTokens` is proven against exactly that shape, and `readThemeTokens()` will throw loudly if a block is missing rather than passing on `{}`.
- **Plan 10-14** (the tree walker) has `LEAK_SCAN_PREFIXES` and `findDesignLeaks()` ready; it must supply its own positive control that the walker reaches real files, which this plan explicitly does not prove.
- **Plan 10-16** (THEME-04) has its verdict, both limits, and an unambiguous instruction — including the two constraints any jsdom layer must honour.
- **Plan 10-17** (ESLint wiring) can `import` the list directly from `eslint.config.mjs`; `LEAK_DISABLE_RULE_ID` and `LEAK_SCAN_GLOBS` are shaped for a flat-config `files:` entry.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 5 claimed artifacts verified on disk (`config/design-leak-patterns.mjs`, `config/design-tokens-source.mjs`, `tests/design/helpers/compile-css.ts`, `tests/design/infra.test.ts`, this SUMMARY) and all 3 commits verified in `git log` (`ea9ab5a`, `42c84a4`, `617ee6e`).
