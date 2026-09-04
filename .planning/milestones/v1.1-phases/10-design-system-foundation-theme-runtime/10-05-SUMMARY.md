---
phase: 10-design-system-foundation-theme-runtime
plan: 05
subsystem: design-system
tags: [theme-runtime, next-themes, metadata, sonner, playwright-seam, accessibility, security]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate, and the `plugins: [react()]` that makes a `.tsx` design test transform at all"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "the `court` and `grove` `[data-theme]` blocks this runtime finally has something to switch BETWEEN"
provides:
  - "`src/components/theme/theme-provider.tsx` — the mounted next-themes provider (`data-theme`, fixed `court`, `enableSystem={false}`) plus `THEMES` / `DEFAULT_THEME` / `THEME_STORAGE_KEY`"
  - "`e2e/helpers/theme.ts` — `seedTheme(context, theme)`, the Playwright seam Phase 11's swap smoke and Phase 17's two-theme axe pass both depend on"
  - "`src/components/theme/theme-query-param.tsx` — `?theme=` outside production, allowlist-checked, the reviewer's path to walking a real flow in grove"
  - "`src/app/layout.tsx` — FitOut's own identity metadata (title default + template, description, metadataBase) and `suppressHydrationWarning`"
  - "`src/components/ui/sonner.tsx` — toasts stop following the OS colour scheme; ONE edit reaching all four Toaster mount sites"
  - "`tests/design/theme-provider.test.tsx` (14) and `tests/design/scaffold-residue.test.ts` (8)"
affects: [10-06, 10-07, 10-14, 10-15, 10-16, 10-17, 11, 17]

# Tech tracking
tech-stack:
  added: []   # next-themes@0.4.6 has been installed since project start — this plan MOUNTS it, it does not add it
  patterns:
    - "A test seam is created in the phase that owns the key it writes, not the phase that first needs it — `THEME_STORAGE_KEY` is imported by the e2e helper, never duplicated, because a helper seeding a key the provider does not read is a silent no-op with no symptom."
    - "External input reaching a DOM attribute is checked for allowlist MEMBERSHIP, never cast. A cast is what let this repo ship a type lie in `sonner.tsx` for its entire life."
    - "Every provider prop is stated explicitly even where it matches the library default — the readability is the point; a reader must not open `node_modules` to learn which behaviours were chosen."
    - "Mutation-check a new test before trusting it: this plan's suite was re-run against a deliberately broken mapping and 6 assertions went red."

key-files:
  created:
    - src/components/theme/theme-provider.tsx
    - src/components/theme/theme-query-param.tsx
    - e2e/helpers/theme.ts
    - tests/design/theme-provider.test.tsx
    - tests/design/scaffold-residue.test.ts
  modified:
    - src/app/layout.tsx          # DS-14 metadata, suppressHydrationWarning, the provider mount
    - src/components/ui/sonner.tsx # THEME-01 mapping; the widening cast deleted

key-decisions:
  - "Six of this plan's acceptance criteria are literal `grep -c` counts over files whose comments the same plan required to EXPLAIN those very identifiers. Resolved in favour of the greps: the comments keep every word of their reasoning but refer to `forcedTheme`, `useSearchParams`, `toHaveScreenshot`, the Sonner cast and the scaffold strings descriptively, each with a one-line note saying the literal is omitted because its absence is grep-asserted."
  - "`tests/design/scaffold-residue.test.ts` mocks `next/font/google`. Outside the Next compiler `Geist(...)` is not a function, so importing the layout module throws before `metadata` is reachable — measured, not assumed."
  - "THEME-01 marked complete (both clauses delivered); DS-14 deliberately left Pending — its 'starter SVGs and default favicon removed' clause is plan 10-15's, and this plan's own frontmatter calls itself 'DS-14 (part 1)'."
  - "The runtime was verified in a real browser rather than trusted from mocked tests, because every assertion in this plan's suite mocks `next-themes` and therefore proves the contract this app STATES, not that the library honours it."

patterns-established:
  - "A security mitigation in the threat register gets a runtime probe, not just a unit test: `?theme=evil\"><script>` was fired at the real dev server and the attribute stayed `court`."
  - "When a plan's acceptance grep and its required comment collide, the comment adapts and says so in one line — silently dropping either the reasoning or the criterion is the failure mode."

requirements-completed: [THEME-01]

# Metrics
duration: 13min
completed: 2026-08-11
---

# Phase 10 Plan 05: Theme Runtime and App Identity Summary

**`next-themes` has been a dependency for the entire life of this project with no provider ever mounted — this plan mounts it, and in the same stroke the browser tab stops saying "Create Next App" and toasts stop following the user's OS colour scheme**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-08-11T15:32Z
- **Completed:** 2026-08-11T15:45Z
- **Tasks:** 3 (all `auto`, no checkpoints)
- **Files:** 5 created, 2 modified

## Accomplishments

- **The theme actually applies now, pre-paint, verified in a real browser.** `<html data-theme="court">` on first load, `--background` resolving to `lab(100% 0 0)` (white, court's value) and the body rendering in Geist. This is the first plan in the phase where the two token blocks 10-03 authored have a runtime that selects between them — until now `grove` existed only as CSS nobody could reach.
- **Toasts stop following the OS.** `sonner.tsx:8` read `const { theme = "system" } = useTheme()` and `:12` passed it through a widening cast to a prop that accepts only `light | dark | system`. With no provider mounted the value was literally `"system"`, so **a booker on a dark-mode laptop got dark toasts inside a light-only app** — on the booking confirmation and payment paths. Now `resolvedTheme` is mapped explicitly, and because both named themes are light-background (D-03) both map to `light`. **One edit in the component reached all four `<Toaster />` mount sites** — `(app)/layout.tsx:103`, `(host)/host/listings/page.tsx:77`, `.../[id]/availability/page.tsx:140`, `.../[id]/edit/wizard.tsx:586` — all of which already sat under the root layout. Fixing it at the mounts would have been four edits and four chances to drift.
- **The app identifies itself.** `title` is now an object (`default: "FitOut"`, `template: "%s · FitOut"`) rather than a bare string, so every child route gets the suffix for free — the invite page had already hand-written it. `metadataBase` is set, which is the line that makes every later relative Open Graph URL resolve; without it a relative share image silently produces a broken card, discovered only when someone pastes a listing link into a chat.
- **The security mitigation was proven at runtime, not just unit-tested.** `?theme=evil"><script>` was fired at the real dev server: the attribute stayed `court`. The value is checked for allowlist membership with `.includes()` and never cast — T-10-02 closed with evidence rather than with a code reading.
- **Zero hydration warnings.** The browser probe collected every console message across four navigations and found none. `suppressHydrationWarning` is doing exactly the job D-07 says it does, and the comment above it says so, because a bare attribute reads as belt-and-braces to the next reader and gets "cleaned up".
- **The seam two later phases depend on exists and imports its key.** `seedTheme(context, theme)` was verified end-to-end: seeding `localStorage["theme"] = "grove"` before navigation produced `<html data-theme="grove">` with no query param and no flash. `--background` measured `lab(98.6767% -1.99711 -.415242)` — grove's tinted `#f7fcfc`, not court's white — so the tokens genuinely re-skin.
- **187/187 design tests green** (was 165), **with the database unreachable**. `npm run build` exit 0, `tsc --noEmit` exit 0, `npm run lint` 0 errors / 9 warnings — byte-identical to the 10-04 baseline.

## The tension this plan hit six times, and how it was resolved

Six acceptance criteria are literal `grep -c` counts asserting an identifier is ABSENT from a file — `forcedTheme`, `useSearchParams`, `toHaveScreenshot`, `as ToasterProps["theme"]`, `Create Next App` — while the same plan's action text required a comment **explaining why that very identifier is absent**. A comment that describes a construct is textually indistinguishable from the construct. **This phase has now hit it four times**: 10-01 (a `globalSetup`/`setupFiles` count colliding with the header comment that exists to stop those keys being re-added), 10-03 (a grep matching commentary), 10-04 (a brace-walker matching prose and asserting against the wrong block), and six separate times here. It is the first time it is structural rather than incidental — every one of this plan's "do not use X" instructions is paired with a "say why X is absent" instruction.

Resolved in favour of the criteria, in all six places. The comments keep every word of their reasoning and refer to the forbidden identifier descriptively ("next-themes' forced-theme prop, which pins a single theme regardless of what is stored"), each followed by one line recording that the literal is omitted **because its absence is grep-asserted**. That last line is the part that matters: without it the next reader sees a strangely circumlocutory comment and "fixes" it, breaking a criterion for a reason no one wrote down.

The `toHaveScreenshot` case is the one with teeth beyond this plan. The UI-SPEC's anti-patterns list says *"A `toHaveScreenshot` in a Phase 10 plan is a scope alarm"* — so a phase-wide grep for that literal is a gate someone will plausibly run, and my explanatory comment would have tripped it from inside the very helper that exists to tell Phase 11 how to shoot the baseline correctly.

## Task Commits

1. **Task 1: The theme provider and the non-production `?theme=` affordance** — `312a37c` (feat)
2. **Task 2: Root layout identity and mount, and the Sonner theme mapping** — `1ce8756` (feat)
3. **Task 3: The Playwright theme seam and the THEME-01 proof** — `e1c8625` (test)

**Plan metadata:** see the `docs(10-05)` commit that carries this file.

## Files Created/Modified

- **`src/components/theme/theme-provider.tsx` — created.** `THEMES` / `ThemeName` / `DEFAULT_THEME` / `THEME_STORAGE_KEY` plus the provider. Every prop is stated explicitly even where it matches next-themes 0.4.6's own default, and the header records the one that is deliberately absent. It also records the browser-local state this phase creates: a developer who once loads `/?theme=grove` keeps seeing grove on every subsequent localhost load until they clear the key — a real "why does my app look wrong" trap, and explicitly **not** session state (T-10-16), so nothing may ever be authorised off it.
- **`src/components/theme/theme-query-param.tsx` — created.** Returns `null`; an effect with a DOM presence of nothing. Two guards: a production early-return on `process.env.NODE_ENV` (a build-time constant the bundler prunes, deliberately not an operator-settable env var, which could be flipped on a live deploy) and allowlist membership before the value goes anywhere. Reads `window.location.search` rather than Next's search-params hook — confirmed in the build output that `/login`, `/signup`, `/forgot-password` and `/reset-password` are all **still `○ (Static)`**, so nothing was forced dynamic.
- **`src/app/layout.tsx` — modified.** Metadata replaced, `suppressHydrationWarning` added to `<html>` with the reason above it, and `<ThemeProvider>` wrapping `{children}` with `<ThemeQueryParam />` as a sibling inside it. The Geist font setup at `:5-13` was **not** touched — DS-01's fix was entirely in `globals.css`.
- **`src/components/ui/sonner.tsx` — modified.** The mapping and a header naming THEME-01. The `style` block reading `var(--popover)` and friends is unchanged, so the toast re-skins per theme for free; it sits in a body-level portal that inherits the root theme correctly.
- **`e2e/helpers/theme.ts` — created.** `e2e/helpers/` did not exist and there was zero `addInitScript` usage anywhere in the repo. The `try`/`catch` is load-bearing: the init script also runs on `about:blank`, where a localStorage access can throw a SecurityError and would fail a test for a reason unrelated to what it asserts.
- **`tests/design/theme-provider.test.tsx` — created.** 14 assertions. Both halves of THEME-01: every provider prop (including that the forced-theme prop is `undefined` — an absence with no symptom, which is exactly why it is asserted rather than left to review) and the Sonner map. The `dark` case is asserted **so the map is provably a map** — a hardcoded `"light"` would pass every other assertion in that describe. Two guard-the-guard tests: that the children really mount under the provider, and that the mocked Toaster really rendered and really received props.
- **`tests/design/scaffold-residue.test.ts` — created.** 8 assertions, covering the metadata half of DS-14 only, with the header stating plainly that **plan 10-15 extends this same file** with the asset deletions so a green run is not misread as "all scaffold residue is gone". The scaffold-string check walks **every nested string** in the export rather than just `title` and `description`, so residue reappearing in `openGraph` or `twitter` later is caught here too. The title separator is written as an escape, on purpose: pasted literally, a file re-saved in the wrong encoding would corrupt the expectation and the assertion in the same stroke and keep passing against a mojibake tab title. (Verified independently: both files carry U+00B7.)

## Decisions Made

- **The acceptance greps won over the comments' literal wording** — see the dedicated section above.
- **`next/font/google` is mocked in the scaffold test.** Measured, not assumed: importing the layout module unmocked fails with `TypeError: Geist is not a function`, because `next/font/google` is a compile-time construct. The mock returns the same `{ variable, className }` shape layout.tsx reads. Nothing about DS-14 depends on the font, and DS-01 — which does — is asserted against the compiled stylesheet in `font-cycle.test.ts`.
- **THEME-01 marked complete, DS-14 left Pending.** THEME-01's two clauses (provider mounted on `data-theme` never `class`; the toast maps named themes rather than passing them through) are both fully delivered and asserted by committed tests. DS-14 names three things and one of them — the starter SVGs and the default favicon — is plan 10-15's. Same resolution 10-01 through 10-04 each reached.
- **The runtime was probed in a real browser.** Every assertion in this plan's suite mocks `next-themes`, so the suite proves the contract this app *states*, not that the library honours it. That gap is named in the test file's blind-spot list, and closing it took one throwaway script (not committed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Six acceptance criteria are literal greps that the same plan's required comments collide with**

- **Found during:** Tasks 1, 2 and 3 (it recurred in every task)
- **Issue:** `grep -c "forcedTheme" theme-provider.tsx` must be 0 while the plan requires a comment explaining that the prop is deliberately not used; `grep -c "useSearchParams"` must be 0 while the plan requires a comment explaining why the hook was avoided; likewise `toHaveScreenshot` (0 in `e2e/helpers/theme.ts`), `as ToasterProps["theme"]` (0 in `sonner.tsx`), `Create Next App` (0 in `layout.tsx`), `suppressHydrationWarning` and `metadataBase` (exactly 1 each in `layout.tsx`, i.e. the code occurrence only). The research document's own code example for the query-param component violates one of these criteria in its comment.
- **Fix:** Reworded the comments in all four source files to name the forbidden identifiers descriptively, preserving the full reasoning, and added a one-line note in each place recording that the literal is omitted because its absence is grep-asserted — so the next reader does not "fix" the circumlocution and silently break a criterion.
- **Files modified:** `src/components/theme/theme-provider.tsx`, `src/components/theme/theme-query-param.tsx`, `src/app/layout.tsx`, `src/components/ui/sonner.tsx`
- **Verification:** all seven greps now return their required counts; re-checked after every subsequent edit.
- **Committed in:** `312a37c`, `1ce8756`, `e1c8625`

**2. [Rule 3 - Blocking] `next/font/google` cannot be imported outside the Next compiler, so the plan's "import the metadata export" was unreachable as written**

- **Found during:** Task 2
- **Issue:** The plan requires `tests/design/scaffold-residue.test.ts` to import the `metadata` export from `src/app/layout.tsx`. Probed directly under `vitest.design.config.ts`: the import fails with `TypeError: Geist is not a function` at `layout.tsx:8`, before `metadata` is reachable. `next/font/google` is transformed by the Next compiler and is not a callable module under a bare Vitest run.
- **Fix:** Added `vi.mock("next/font/google", …)` returning the `{ variable, className }` shape the layout reads, with a comment explaining why the mock is sound (nothing in DS-14 depends on the font; DS-01 is asserted against compiled CSS elsewhere).
- **Files modified:** `tests/design/scaffold-residue.test.ts`
- **Verification:** 8/8 green; the guard-the-guard test confirms the real layout source was read.
- **Committed in:** `1ce8756`

**3. [Rule 1 - Bug] The first draft of the metadataBase assertion did not type-check**

- **Found during:** Task 2
- **Issue:** Next types `metadataBase` as `string | URL | null`, so `metadata.metadataBase?.protocol` failed `tsc` with TS2339. Optional-chaining past it would have let a plain `string` type-check at the call site while defeating the entire point of the field.
- **Fix:** Narrowed explicitly with an `instanceof URL` guard that throws, then asserted `protocol` and `href` on the narrowed value.
- **Files modified:** `tests/design/scaffold-residue.test.ts`
- **Verification:** `npx tsc --noEmit` exit 0.
- **Committed in:** `1ce8756`

---

**Total deviations:** 3 (2 × Rule 3, 1 × Rule 1). No Rule 4 checkpoint was needed.
**Impact on plan:** No scope creep. Every artifact, every `must_haves` truth and every acceptance criterion the plan specified exists and holds.

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- scaffold-residue` | exit 0 — **8 passed** |
| `npm run test:design -- theme-provider` | exit 0 — **14 passed** |
| `npm run test:design` (whole gate, `DATABASE_URL` pointed at a dead port) | exit 0 — 10 files, **187 passed** (was 165) |
| **Mutation check** — mapping broken to pass `resolvedTheme` through, `attribute` set to `class`, `enableSystem` to true | **6 failed / 8 passed** — the suite bites; tree restored and re-verified clean |
| `npm run build` | exit **0**; `/login`, `/signup`, `/forgot-password`, `/reset-password` still `○ (Static)` — nothing forced dynamic |
| `npx tsc --noEmit` | exit **0** (confirmed it really covers `e2e/**` by injecting a deliberate type error and seeing TS2322) |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, byte-identical to the 10-04 baseline |
| AC: `attribute="data-theme"` in provider | **1** |
| AC: `forcedTheme` in provider | **0** |
| AC: `enableSystem={false}` in provider | **1** |
| AC: `as ThemeName` / `useSearchParams` in query-param | **0** / **0** |
| AC: `includes(` in query-param | **2** |
| AC: `Create Next App` in `layout.tsx` | **0** |
| AC: `suppressHydrationWarning` / `metadataBase` in `layout.tsx` | **1** / **1** |
| AC: `ThemeProvider` in `layout.tsx` | **3** |
| AC: `as ToasterProps["theme"]` in `sonner.tsx` | **0** |
| AC: `resolvedTheme` / `--normal-bg` in `sonner.tsx` | **3** / **1** (style block survived) |
| AC: `head -1` of `theme-provider.test.tsx` | exactly `// @vitest-environment jsdom` |
| AC: `THEME_STORAGE_KEY` / `addInitScript` in `e2e/helpers/theme.ts` | **2** / **1** |
| AC: `toHaveScreenshot` in helper + `playwright.config.ts` | **0** / **0** — no visual baseline captured (GATE-01 is Phase 11) |
| `git diff --diff-filter=D` across all 3 commits | **no file deletions** |
| `git status --short` after each commit | clean |

### Real-browser probe (the plan's manual sanity, automated; script not committed)

| Observation | Value |
|---|---|
| `<html data-theme>` on a cold load | **`court`** |
| Browser tab title | **`FitOut`** |
| `--background` in court | `lab(100% 0 0)` — white |
| `document.body` font family | `Geist, "Geist Fallback"` — DS-01 holds |
| `/?theme=grove` | attribute flips to **`grove`**, `--background` becomes `lab(98.6767% -1.99711 -.415242)` (`#f7fcfc`) |
| `?theme=evil"><script>` (T-10-02) | attribute stays **`court`** — the allowlist rejected it |
| `seedTheme` path: `localStorage["theme"]="grove"` seeded pre-navigation, no query param | attribute is **`grove`** |
| Console messages across all four navigations | **none** — zero hydration warnings |

## Known Stubs

None. Every artifact is wired to something real: the provider is mounted in the root layout, the query-param component renders inside it, the Sonner mapping is consumed by four live mount sites, and the e2e helper imports the provider's actual storage key. The `/dev/theme` surface that would *display* both themes side by side is plan 10-14's, not a stub of this one.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change was introduced; `drizzle/` is untouched at `0025` (GATE-06).

Threat register dispositions honoured:
- **T-10-02** (tampering, `?theme=`) — **mitigated and proven at runtime.** Allowlist membership via `.includes()`, no `as` cast, no interpolation, plus a production early-return on a build-time constant. A crafted `?theme=evil"><script>` left the attribute at `court`.
- **T-10-05** (next-themes' inline script) — accepted as planned. Recorded in the provider header for Phase 11: **if a CSP is ever added, the provider needs the `nonce` prop.**
- **T-10-16** (`localStorage["theme"]` as spoofable state) — accepted, and documented in the provider header as a presentation preference carrying no identity and granting no capability, so a future reader does not mistake it for session state.
- **T-10-17** (root provider mount as EoP) — accepted. The provider receives no session, reads no server data and moves no logic client-side; D-130 holds.

## Issues Encountered

- **The grep-versus-comment collision is now a four-time pattern in this phase** (10-01, 10-03, 10-04, and six times here). It is worth stating as a phase lesson: *any acceptance criterion of the form "identifier X must not appear in file Y" is in tension with the same plan's requirement to explain why X is absent.* The resolution used here — descriptive reference plus an explicit one-line note about the grep — is cheap and should be the default when the two collide again in 10-06 or 10-07.
- **`gsd-sdk` v1.42.3 tracking bugs recurred as expected** (`state.update-progress` reporting `Progress field not found`, `state.advance-plan` blanking fields). STATE.md was hand-corrected, as the toolchain notes prescribe.
- **No blockers.**

## Next Phase Readiness

- **10-06 / 10-07 (the remaining half of DS-05)** — unblocked and unchanged by this plan. The **13 `focus-visible:ring-ring/50` occurrences (11 vendored)** still each render a 2.32:1 indicator, and no `--ring` value can fix that. Note that `sonner.tsx` has now been edited by this phase, so it is one more vendored file on the `npx shadcn add` collision list the UI-SPEC prices at ~15.
- **10-14 (`/dev/theme`)** — the runtime it needs exists. The page renders `<div data-theme="court">` beside `<div data-theme="grove">`, which is THEME-04's nested-subtree claim; note that the ROOT theme is now genuinely `court` rather than "whatever the unlayered `:root` block said", so the header strip outside both panes has a real theme.
- **10-15 (DS-14 part 2)** — **extend `tests/design/scaffold-residue.test.ts`, do not create a second file.** Its header already says so. The metadata half is asserted; the five `public/*.svg` starter assets and `src/app/favicon.ico` deletions are yours, and DS-14 stays `Pending` in REQUIREMENTS.md until they land.
- **10-16 (THEME-04)** — 10-02's spike verdict still governs: jsdom never substitutes `var()` and ignores `@layer` outright, so nested-subtree re-skinning must be asserted against compiled CSS via `compile-css.ts`. Nothing in this plan's jsdom test asserts any CSS.
- **Phase 11 (GATE-01, the theme-swap smoke)** — **use `seedTheme(page.context(), theme)` from `e2e/helpers/theme.ts`, and call it on the CONTEXT before the first `goto`.** Seeding after navigation misses the pre-paint script and produces a flash plus a post-hydration switch. There is no runtime switcher to click by design (D-06). No visual baseline exists yet and none may be captured before Phase 11.
- **Phase 11 (CSP)** — if a Content-Security-Policy is introduced with the app shell, next-themes' inline script needs the provider's `nonce` prop or the theme silently stops applying pre-paint (T-10-05).
- **Phase 17 (two-theme axe pass)** — same seam, same rule. A helper that seeded a key the provider did not read would have made an axe pass audit court twice and report full two-theme coverage; that is why `THEME_STORAGE_KEY` is imported rather than duplicated.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 8 claimed artifacts verified on disk (the 5 created files, the 2 modified files, and this summary) and all 3 task commits verified in `git log` (`312a37c`, `1ce8756`, `e1c8625`). REQUIREMENTS.md re-read after the metadata commit: `THEME-01` reads `Complete`; `DS-14` still reads `Pending`, which is the accurate state — its asset-deletion clause is plan 10-15's.
