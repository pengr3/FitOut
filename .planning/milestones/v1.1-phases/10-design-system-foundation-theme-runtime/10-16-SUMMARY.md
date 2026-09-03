---
phase: 10-design-system-foundation-theme-runtime
plan: 16
subsystem: design-system
tags: [design-system, theme-runtime, THEME-04, dev-surface, tailwind-merge, jsdom, nested-themes]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 02
    provides: "`compileGlobalsCss()` / `declarationsFor()` / `readThemeTokens()`, and the recorded THEME-04 SPIKE verdict this plan's assertion layer branches on"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "the two unlayered `[data-theme]` blocks the nesting proof reads"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "`@theme inline`'s named type / elevation / radius steps — the contract this page renders"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 12
    provides: "`tests/design/elevation-z.test.ts` and its asserted zero for `shadow-sticky`, which this plan was named in advance to move"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 15
    provides: "`src/lib/design/tokens.generated.ts` — the header strip's live `--brand` readout"
provides:
  - "`/dev/theme` — the one real screen this phase ships: two themes side by side in NESTED `[data-theme]` subtrees, on real booking components, gated out of production"
  - "THEME-04 CLOSED — `tests/design/theme-nesting.test.ts` (12 assertions, compiled-CSS primary) + `tests/design/theme-nesting-render.test.tsx` (4 assertions, the jsdom layer the spike permits)"
  - "A repo-wide `cn()` defect fixed: tailwind-merge classified all four named type roles as COLOURS and silently deleted them from any merge"
  - "Measured evidence, from a real Chromium, that a nested subtree re-skins colour, geometry, type AND elevation"
affects: [10-17, 11, 17]

# Tech tracking
tech-stack:
  added: []   # no dependency installed
  patterns:
    - "A total `Record` over a CVA's own variant union as the preview's enumeration source: a variant added upstream without a row is a compile error, not a silently missing column"
    - "Type-only fixture imports (`import type` + `ComponentProps<typeof X>`): fixture drift is a compile error while the fixture module stays pure data with no runtime edge to the component tree"
    - "A design-surface route lives at the app root, outside every route group, because a group layout's session redirect makes it unreachable to screenshot gates"
    - "Theme-prefixed DOM ids in any component rendered once per theme pane — two panes means two of every id"
    - "When a gate's assertion is named in advance by the plan that wrote it, MOVE it in the consuming plan's own commit rather than routing around it"

key-files:
  created:
    - src/app/dev/theme/page.tsx
    - src/app/dev/theme/fixtures.ts
    - src/app/dev/theme/slot-picker-preview.tsx
    - tests/design/theme-nesting.test.ts
    - tests/design/theme-nesting-render.test.tsx
  modified:
    - src/lib/utils.ts                          # the cn() type-role registration
    - tests/design/type-scale.test.ts           # +6 assertions closing a listed blind spot
    - tests/design/elevation-z.test.ts          # shadow-sticky's zero becomes a one-entry inventory
    - .planning/phases/10-.../deferred-items.md # D-6 fifth reproduction, D-9 opened

key-decisions:
  - "tailwind-merge classifies `text-display|heading|body|label` as text COLOURS — its font-size matcher rejects them and its colour matcher accepts anything — so `cn(\"text-label\", \"text-muted-foreground\")` returned only the colour. Every named type role was being silently DELETED by the repo's own class merge. Fixed by registering the four under Tailwind's `--text-*` theme namespace; asserted, and watched red."
  - "The preview enumerates button variants through a total `Record` over the CVA's union rather than writing `variant=\"brand\"` at the call site. Recorded rather than quietly enjoyed: it also keeps `brand-recipe.test.ts`'s repo-wide adoption pin a statement about PRODUCT CTAs."
  - "Section 5 renders `SearchResultCard`, not `ListingCard`. The host tile documents at length that it deliberately carries no spots chip; using it would have meant hand-placing a booker signal on a management card, in the one place a reviewer reads as sanctioned."
  - "The selected hour run is produced by two real clicks one frame apart, not by a new prop on `SlotPicker`. Adding a controlled-selection prop to a shipped booking component so a preview could pre-tint three chips is changing product code to suit a preview."
  - "`shadow-sticky`'s asserted ZERO call sites became a one-entry inventory naming this route, and its compiled-output ABSENCE became a presence resolving through `var(--elevation-sticky)`. 10-12 wrote that zero, named this ladder as its exerciser and flagged the change in advance."
  - "The jsdom layer was ADDED, because 10-02's spike verdict reads `jsdom RESOLVES nested custom properties`. Both of the verdict's conditions are honoured: raw `[data-theme]` blocks lifted verbatim by a CSS parse, and `getPropertyValue` on the token rather than a resolved colour."

patterns-established:
  - "A gate whose blind spot is written in its own header is a gate that can have that blind spot closed. `type-scale.test.ts` listed `cn()`/tailwind-merge precedence as NOT COVERED; the first heavy consumer of the roles found the defect that listing predicted."
  - "Watch the gate go red AND read what stayed green. Deleting `inline` left every `[data-theme]`-shaped assertion passing against a build where nested theming was completely dead — Pitfall 3 demonstrated rather than described."

requirements-completed: [THEME-04]

# Metrics
duration: 45min
completed: 2026-08-12
---

# Phase 10 Plan 16: `/dev/theme` — Two Themes, Nested, on Real Screens Summary

**The phase's one real screen ships, THEME-04 is proved where the bug is actually legible rather than where it is convenient — and building the first heavy consumer of the named type roles found that the repo's own `cn()` had been silently deleting every one of them**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-12T04:55Z
- **Completed:** 2026-08-12T05:40Z
- **Tasks:** 3 (all `auto`, no checkpoints) + 1 deviation-driven commit
- **Files:** 5 created, 4 modified

## Accomplishments

- **`/dev/theme` renders two themes side by side in NESTED subtrees, on real booking components, and 404s in production.** Nine sections per pane, in the order the UI-SPEC states — type ladder, buttons, status vocabulary, the availability surface, the result card, a form row, elevation, radius, and swatches dead last. One `ThemePane` function called twice, fed identical fixture props, so a difference between the columns can only have come from the theme.
- **THEME-04's visual claim was verified in a real Chromium, not inferred.** Same markup, same fixtures, two nested `[data-theme]` divs:

  | | court pane | grove pane |
  |---|---|---|
  | pane background | `lab(100 0 0)` (white) | `lab(98.68 -1.997 -0.415)` (tinted) |
  | brand button fill | `lab(49.17 65.89 41.55)` — **coral** | `lab(48.18 -30.43 -6.04)` — **teal** |
  | pane radius (`rounded-xl`) | 14px | 28px |
  | display role | 28px / 600 | 34px / 700 |
  | heading role | 20px / 600 / -0.2px | 24px / 700 / normal |
  | radius ladder (7 steps) | 6 · 8 · 10 · 14 · 18 · 22 · 26px | 12 · 16 · 20 · 28 · 36 · 44 · 52px |
  | `shadow-raised` | `lab(0 0 0/0.05) 0 1px 2px` | `lab(4.59 -4.29 -0.97/0.1) 0 2px 6px -1px` |

  Colour, geometry, type AND elevation all re-bind at the nested host. The document root stayed on court throughout, which is the state a broken build also gets right — see the observed-red section.
- **THEME-04 is CLOSED with 16 assertions across two files, and the primary layer is the compiled stylesheet** — the only artifact where a dropped `inline` is legible. Three utilities are asserted to emit `var(--background)` / `var(--brand)` / `var(--radius)`, the whole 130KB output is asserted to contain **zero** `var(--color-` references, both theme blocks are asserted unlayered / source-ordered / unprefixed, and the page is asserted to carry exactly one themed element per theme on ordinary `<div>`s rather than on the document root.
- **The gate was watched red, and what stayed GREEN is the more useful half.** With `inline` deleted: `EXIT=1`, **5 failed / 11 passed**, the alias count reporting **201**. Every structural assertion — both theme selectors, both nested panes — and **all four jsdom cases** passed against a build in which nested theming was completely dead. That is RESEARCH Pitfall 3 as a measurement rather than a warning, and it is recorded in both test headers.
- **A repo-wide `cn()` defect was found and fixed** (see the section below). It is the plan's most consequential finding and it has nothing to do with `/dev/theme` except that this page was the first thing to use three of the four type roles.
- **The elevation gate moved rather than being routed around.** 10-12 left `shadow-sticky` with zero call sites, asserted the zero so nobody would invent a home for it, and named this ladder as the exerciser that would one day move the number. It did, in this plan's own commit.
- **Design gate 340/340** (was 324 at the start of this plan, 318 at 10-15's close), DB-free, ~6.1s. Full DB suite **1197 passed / 4 skipped**, unchanged. `tsc --noEmit` exit 0, `npm run build` exit 0, `npm run lint` **0 errors / 9 warnings** — byte-identical to the phase baseline.

## The finding: `cn()` was deleting every named type role

**Measured while writing section 1, which is the first surface in the repo to use `text-heading`, `text-body` or `text-label` at all.**

tailwind-merge resolves a `text-*` utility by trying the font-size group first — t-shirt sizes and arbitrary lengths — and falling through to the text-COLOUR group, whose matcher accepts anything. `display`, `heading`, `body` and `label` match none of the size shapes. Probed against the version in this tree:

```
twMerge("text-label", "text-muted-foreground")   →  "text-muted-foreground"
twMerge("text-display text-muted-foreground")    →  "text-muted-foreground"
```

**The role is deleted, and nothing anywhere reports it.** `tsc` passes, the leak gate passes, `type-scale.test.ts`'s source scan passes (the class NAME is correct — it just never survives to the DOM), and the element renders at the inherited size. It is the same defect class as the slash-modifier trap `globals.css` warns about at length, with a sharper edge: `text-display/tight` at least keeps the size.

**This was a predicted defect.** `type-scale.test.ts`'s own `NOT COVERED` header, written by 10-11, lists "It cannot see `cn()`/tailwind-merge precedence at a call site" as a blind spot. The first plan to lean on the roles found exactly what that line predicted.

**The fix is a registration, not an exemption.** `src/lib/utils.ts` now builds its merger with `extendTailwindMerge({ extend: { theme: { text: [...] } } })`, putting the four names in Tailwind's own `--text-*` namespace — which is precisely where `globals.css` declares them. Six assertions were added to `type-scale.test.ts` (29 → 35) and watched red at **5 failed / 30 passed** with the registration emptied. The colour control stayed green, which is what distinguishes a size registration from a blanket `text-*` exemption:

| | before | after |
|---|---|---|
| `cn("text-label", "text-muted-foreground")` | `text-muted-foreground` | **both** |
| `cn("text-sm", "text-display")` | both (no conflict seen) | **`text-display`** |
| `cn("text-foreground", "text-muted-foreground")` | `text-muted-foreground` | `text-muted-foreground` |

**Nothing shipped moved.** All 12 `sm:text-display` call sites are plain className strings that never reach a merge, and the full DB suite plus 17 passing E2E specs are unchanged. But every future call site that composes a role with a colour — which is the ordinary shape for a labelled heading — would have lost the role.

## Task Commits

1. **Deviation (blocking): teach `cn()` the four named type roles** — `6f8bc26` (fix)
2. **Task 1: the route shell, the header strip and sections 1–4** — `ea189a9` (feat)
3. **Task 2: sections 5–9, swatches last, and the elevation gate moves with it** — `94cf090` (feat)
4. **Task 3: the THEME-04 proof** — `2832c24` (test)

**Plan metadata:** see the `docs(10-16)` commit that carries this file.

## Files Created/Modified

- **`src/app/dev/theme/page.tsx` — created.** A Server Component at exactly that path: a single route, not a `(dev)` group (D-09). A ~45-line header states why it sits at the app root — `(app)/layout.tsx` redirects a null session to `/login`, which would make the preview unreachable to a signed-out reviewer AND to Phase 11's and Phase 17's screenshots — and forbids moving it under a group or adding a redirect, in the `invite/[token]/page.tsx` style. First line of the body: the build-time environment comparison handing off to `notFound()`, bare, no message. `metadata` carries `robots: { index: false, follow: false }`. Header strip outside both panes in the root theme, carrying the two contracted copy strings verbatim, the AA legend and each theme's live `--brand` hex read from `THEME_TOKENS`. Body: `lg:grid-cols-2`, stacking court-first below, each pane `bg-background text-foreground` with `min-w-0` so the columns can shrink to the 320px floor.
- **`src/app/dev/theme/fixtures.ts` — created.** Every export typed with `ComponentProps<typeof X>`; **every import is `import type`**, so the fixture module has no runtime edge to the component tree it describes and cannot drag a client bundle in. Dates are frozen literals — a preview whose Completed badge depends on when it is opened renders differently in CI than on the machine that wrote it. Copy is borrowed from shipped surfaces rather than invented, because the point of the type ladder is real strings at real lengths.
- **`src/app/dev/theme/slot-picker-preview.tsx` — created.** The one client boundary, and the only reason it exists is structural: `SlotPicker` takes an `onSelectionChange` callback and a Server Component cannot hand a function to a client component. It also drives the selected run with two real clicks one frame apart — see Deviations for why one tick is not enough and why a new prop was rejected.
- **`tests/design/theme-nesting.test.ts` — created, 12 assertions.** The mandatory compiled-CSS layer plus the authored-selector and page-structure layers, and a guard-the-guard block (the compile is >10,000 chars and contains a `[data-theme` selector; the three source files are non-empty) because two of the assertions are zero-occurrence claims that an empty read satisfies perfectly.
- **`tests/design/theme-nesting-render.test.tsx` — created, 4 assertions.** The jsdom layer 10-02's verdict permits. It lifts the two `[data-theme]` rules verbatim out of `globals.css` with a **CSS parse** rather than a text slice (this file is full of long comments that name selectors), injects them into a bare document, and asserts `getPropertyValue` on the token at four depths — outer host, outer child, nested host, nested child — plus radius, display size and elevation, plus the document root reading court. Its header says plainly that it stayed green against a build where nested theming was dead.
- **`src/lib/utils.ts` — modified.** See the finding above. The docstring carries the two measured before/after strings so nobody "simplifies" it back to a bare `twMerge`.
- **`tests/design/type-scale.test.ts` — modified,** 29 → 35 assertions, and the NOT COVERED header updated to say that one specific case of the listed blind spot is now closed rather than merely listed.
- **`tests/design/elevation-z.test.ts` — modified.** `RAISED_INVENTORY` and `OVERLAY_INVENTORY` each gain the route; a new `SHADOW_STICKY_INVENTORY` pins the third step to one file; the named-site total moves 9 → 12; the compiled-output assertion flips from absent to present-and-resolving-through-`var(--elevation-sticky)`. Every change carries the reason at the assertion, including that the half of 10-12's zero that mattered — *no product surface uses this step* — is still what the map says.

## Decisions Made

- **The `cn()` registration** — the plan's load-bearing decision; see the dedicated section.
- **Enumerate the button variants; do not write `variant="brand"` in the preview.** A total `Record<ButtonVariant, string>` makes a new CVA variant a compile error here, which a plain array would not. It also keeps `brand-recipe.test.ts`'s "coral appears on exactly the 20 buttons someone asked for it" a statement about product CTAs — a dev preview demonstrating all seven variants is not a twenty-first CTA, and inflating the pin to 21 would blunt it for every future plan. **Recorded rather than quietly enjoyed**, in the fixture module's own docstring.
- **`SearchResultCard`, not `ListingCard`, for section 5.** The host tile's header states that it deliberately carries no spots chip; rendering it would have required hand-placing a booker signal on a management card. The search card renders the soft-accent chip itself, from the same read-model shape the real grid passes.
- **`coverPhotoUrl: null`, so the card paints its own token-coloured placeholder.** The alternatives were an external URL (the page must render on a fresh clone with no network) or an inline SVG data URI, which can only carry a frozen colour — a raw-value leak in the newest file of the phase whose whole subject is that frozen colours cannot be themed.
- **The soft-accent tone is shown through `SpotsLeftChip`, not composed from its class recipe.** Neither status badge reaches that tone; hand-writing the three classes would have made this page a second declaration of the vocabulary instead of a view onto it.
- **Form control ids are theme-prefixed.** Both panes render section 6, so an unprefixed id duplicates every label association in the second pane — which is also what Phase 17's axe pass would report, on a route it is meant to be auditing. Verified: zero duplicate ids in the rendered document.
- **The route's utilities ship to production and that cost is measured, not waved away** — +1,103 bytes / +0.93%. Logged as **D-9**; the two ways to remove it (excluding the directory from the content root, or a hand-maintained safelist) are respectively "the preview renders unstyled" and "a second list that drifts", and both are worse.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `cn()` silently deleted every named type role**

- **Found during:** Task 1, writing section 1 — the first surface in the repo to use three of the four roles.
- **Issue:** tailwind-merge classifies `text-display|heading|body|label` as text COLOURS, so composing a role with a colour utility through `cn()` returned only the colour. The plan's own instruction ("Compose every className with `cn()`") could not be followed without deleting the roles it was rendering.
- **Fix:** `extendTailwindMerge({ extend: { theme: { text: ["display","heading","body","label"] } } })` in `src/lib/utils.ts`, plus 6 assertions in `tests/design/type-scale.test.ts` and a NOT COVERED header correction.
- **Files modified:** `src/lib/utils.ts`, `tests/design/type-scale.test.ts`
- **Verification:** 35/35 green; watched red at 5 failed / 30 passed with the registration emptied, with the colour control staying green; full DB suite 1197 unchanged; 17 E2E specs unchanged.
- **Committed in:** `6f8bc26`

**2. [Rule 3 - Blocking] A fourth file was needed: the client boundary for `SlotPicker`**

- **Found during:** Task 1.
- **Issue:** The plan names two files. `SlotPicker` requires an `onSelectionChange` callback, and a Server Component cannot pass a function to a client component — while `page.tsx` must stay a Server Component because it exports `metadata` and the production guard must be a build-time constant the bundler can prune.
- **Fix:** `src/app/dev/theme/slot-picker-preview.tsx`, a `"use client"` module that does nothing but supply the callback and drive the preselected run. Its header states the single reason it exists so it is not later folded into the page.
- **Files modified:** `src/app/dev/theme/slot-picker-preview.tsx` (new)
- **Verification:** `npm run build` exit 0; the availability pane renders with 3 selected and 2 struck-through chips in both panes.
- **Committed in:** `ea189a9`

**3. [Rule 3 - Blocking] The plan's "one selected contiguous run" is not expressible as a prop**

- **Found during:** Task 1.
- **Issue:** `SlotPicker` owns its selection state deliberately — the whole gesture lives in its own reducer and the server read model is the authority for what is bookable — and it exposes no controlled-selection prop. There is no way to hand it a preselected run.
- **Fix:** The preview does what a reviewer would do and clicks two chips, **one animation frame apart**. The frame is required, not defensive: the picker's handler closes over the current selection, so two clicks inside one tick are both read against the EMPTY state and the second re-anchors instead of completing the run — producing one tinted chip rather than three, with nothing to indicate anything went wrong. Every step is optional-chained, so a markup change degrades to an unselected picker rather than a broken page. Adding an `initialSelection` prop to a shipped booking component was rejected: that is changing product code to suit a preview.
- **Files modified:** `src/app/dev/theme/slot-picker-preview.tsx`
- **Verification:** Real Chromium — 3 chips at `data-state="on"` per pane, filled with that pane's own brand.
- **Committed in:** `ea189a9`

**4. [Rule 3 - Blocking] `STICKY_INVENTORY` already exists in `elevation-z.test.ts`**

- **Found during:** Task 2, on the first run after the elevation gate edit — a **transform** failure, not an assertion failure: `Identifier 'STICKY_INVENTORY' has already been declared`, 0 tests collected from the file.
- **Issue:** That file carries BOTH halves of DS-03, and the z-index half (10-13) already owns `STICKY_INVENTORY` for the `z-(--z-sticky)` call sites. The two clauses share the word "sticky" and share nothing else.
- **Fix:** `SHADOW_STICKY_INVENTORY`, with the collision recorded at the declaration.
- **Files modified:** `tests/design/elevation-z.test.ts`
- **Verification:** 340/340.
- **Committed in:** `94cf090`

**5. [Rule 1 - Bug] The plan's `shadow-sticky` compiled assertion named the wrong variable**

- **Found during:** Task 2 verification.
- **Issue:** Writing the replacement assertion, the obvious form is `var(--shadow-sticky)`. The emitted rule is `--tw-shadow: var(--elevation-sticky)` — because `@theme inline` *substitutes* the theme entry's value into the utility instead of emitting a variable of its own. The wrong spelling would have been a red test for a correct contract.
- **Fix:** Asserted `var(--elevation-sticky)`, matching the sibling forced-compile assertions 10-04 wrote, with the `inline` mechanism named at the assertion.
- **Files modified:** `tests/design/elevation-z.test.ts`
- **Verification:** 340/340.
- **Committed in:** `94cf090`

**6. [Rule 1 - Bug] jsdom re-serialises the alpha slash in a multi-token custom property**

- **Found during:** Task 3, first run of the render test.
- **Issue:** The authored `oklch(0.17 0.02 190 / 0.1)` reads back from `getComputedStyle` as `oklch(0.17 0.02 190/0.1)`. A byte comparison failed on a value that was correct.
- **Fix:** That ONE assertion compares whitespace-squashed, with the measurement in the comment. The two single-token values beside it stay byte-for-byte precisely because they can be.
- **Files modified:** `tests/design/theme-nesting-render.test.tsx`
- **Verification:** 16/16 across the two theme-nesting files.
- **Committed in:** `2832c24`

---

**Total deviations:** 6 (3 × Rule 1, 3 × Rule 3). No Rule 4 checkpoint was needed.
**Impact on plan:** Every artifact the plan specifies exists and every acceptance criterion holds. One file was added beyond the plan's list (the client boundary), for a reason the plan's own constraints force. One instruction — "compose every className with `cn()`" — could not be followed literally until the `cn()` defect was fixed, which is how that defect was found.

## Deferred Issues

- **D-9 opened:** `/dev/theme`'s utilities ship to production, where the route 404s. Measured on clean rebuilds of both sides: **118,732 → 119,835 bytes (+1,103, +0.93%)**. Accepted with both alternatives priced; suggested owner 10-17 or Phase 17.
- **D-6 updated (fifth identical reproduction):** `npm run test:e2e` — 17 passed / 1 failed / 5 did not run, the same spec, locator and error as 10-08, 10-13, 10-14 and 10-15. Causality deliberately not re-derived. The relevant check for this plan was not the failure but the 17 passes: they render shipped surfaces through the modified `cn()` in a real browser.
- **Not new:** D-3, D-4, D-5, D-7, D-8 remain open and untouched.

## Issues Encountered

- **The most valuable finding was not about themes.** Three of the four type roles had no call site anywhere in the repo, so nothing had ever composed one through `cn()`. The design gate could not see it (a source scan reads class names, not merge results), the type-checker could not see it, and the leak gate could not see it. It was found by building the first thing that used them — which is a fair summary of why success criterion 3 asks for real screens.
- **The grep-versus-comment collision was avoided by construction, again.** The page's header comment deliberately does not quote `data-theme="court"`, the environment comparison or `notFound()`, because the plan's acceptance criteria count those exact strings and would otherwise have read the explanation as a second occurrence. Section 7's ladder keeps its three class names on three separate lines and out of every comment, so the raw grep and the gate's comment-stripped scan agree at 3.
- **A name collision inside one test file is a new form of the same hazard.** `elevation-z.test.ts` carries two clauses that share a vocabulary word; the collision failed loudly at transform time (0 tests collected), which is the good outcome, but a differently-named constant would have made two unrelated inventories look interchangeable.
- **`state.record-metric` and `state.update-progress` behaved as the toolchain notes describe** — the metrics row, Current Position and Decisions were hand-written.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design` (whole gate) | exit **0** — 18 files, **340 passed** (was 324 at plan start, 318 at 10-15's close), ~6.1s, no database |
| `npm run test:design -- theme-nesting` | exit **0** — **16 passed** (12 + 4) |
| Observed RED: `inline` deleted from the `@theme` block | **EXIT=1**, **5 failed / 11 passed**, alias count **201** — and every structural + all four jsdom assertions stayed GREEN |
| Observed GREEN after restore | exit **0**, 16 passed; `git diff src/app/globals.css` empty |
| Observed RED: type-role registration emptied | **5 failed / 30 passed**; the colour control stayed green |
| `npm run build` | exit **0** — `/dev/theme` listed as `○ (Static)` |
| **Production 404:** `npm run build && npm start`, `GET /dev/theme` | **404**, Next's built-in not-found page (`/login` returned 200 in the same run) |
| `npx tsc --noEmit` | exit **0** |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, unchanged from baseline |
| Full DB suite (`npm test`) | **1197 passed / 4 skipped**, unchanged |
| `npm run test:e2e` | 17 passed / 1 failed / 5 did not run — D-6 item 1, fifth byte-identical reproduction |
| Real Chromium: nested pane brand | court `lab(49.17 65.89 41.55)` · grove `lab(48.18 -30.43 -6.04)` |
| Real Chromium: nested pane radius / display | 14px / 28px-600 vs 28px / 34px-700 |
| Real Chromium: radius ladder | court 6–26px · grove 12–52px (7 steps each) |
| Real Chromium: elevation ladder | court pure-black at 1/8/-1px · grove ink-tinted at 2/16/-2px |
| Real Chromium: sections per pane | **9 / 9** |
| Real Chromium: duplicate DOM ids | **0** |
| Real Chromium: 320 / 375 / 1024px | `scrollWidth == clientWidth` at all three, zero overflowing elements, court first, stacked below 1024 |
| Slot picker state per pane | 3 chips `data-state="on"` (brand-filled), 2 struck-through |
| AC: `process.env.NODE_ENV === "production"` in page | **1** |
| AC: `notFound()` in page | **1** |
| AC: `data-theme="court"` / `data-theme="grove"` in page | **1 / 1** |
| AC: `ComponentProps` in fixtures | **9** (≥4 required) |
| AC: `@/lib/db\|fetch(` in page / fixtures / preview | **0 / 0 / 0** |
| AC: `shadow-(raised\|overlay\|sticky)` lines in page | **3** |
| AC: `aria-invalid` in page | **1** |
| AC: leak-pattern scan over all three new source files | exit **0**, printed nothing |
| AC: `var(--color-` in `theme-nesting.test.ts` | **2** (≥1 required) |
| AC: `:root\[data-theme\|html\[data-theme` in `globals.css` | **0** |
| AC: `toHaveScreenshot` anywhere in `tests/` or `e2e/` | **none**; no `*-snapshots` directory exists |
| CSS cost of the route (clean rebuilds, both sides) | 118,732 → **119,835** bytes (+1,103, **+0.93%**) |
| `git diff --diff-filter=D` on all 4 commits | no file deletions |
| `git status --short` after each commit | clean |

## Known Stubs

**One, and it is a preview affordance rather than a product path.** `slot-picker-preview.tsx` produces the selected hour run by clicking two chips after mount, located by `[data-slot="toggle-group"]` and `button:not([disabled])`. If that markup ever changes, every step is optional-chained and the pane renders an **unselected** picker — the page still works, the accent simply does not appear on that one section until someone clicks. It is recorded here rather than left to be discovered, and it is verified working in a real browser (3 chips at `data-state="on"` in both panes).

Nothing else on the page is a stub: every section renders a real component fed by a typed fixture, and the two ladders and the swatch row enumerate the tokens `globals.css` actually declares.

## Threat Flags

None. This plan adds one route that reads no data and one repo-wide class-merge registration; no network endpoint, no auth path, no file access pattern, no schema change. `drizzle/` untouched at `0025` (GATE-06).

Threat register dispositions honoured:

- **T-10-01** (a route that exists is reachable unless something stops it) — mitigated as specified: the build-time environment comparison inside the page component, never an operator-settable variable, plus `robots: { index: false, follow: false }`. **Verified against a real production build**: `GET /dev/theme` → 404 while `/login` → 200 in the same run.
- **T-10-32** (fixture data is visible to whoever reaches the route) — mitigated: every value is a static literal, every fixture import is `import type`, and `grep -c "@/lib/db\|fetch("` returns 0 for all three new source files. The page cannot leak a real booking, host or payout even if the guard were bypassed.
- **T-10-33** (a THEME-04 verification that only toggles the root attribute would pass against a broken build) — mitigated, and then **demonstrated**: the compiled output is asserted to contain zero `var(--color-` references, the executor watched that assertion report 201 with `inline` removed, and recorded that every root-shaped and `[data-theme]`-shaped assertion stayed green in the same run.

## Next Phase Readiness

- **10-17 (the build gate + ESLint wiring)** inherits three things. (1) `/dev/theme` exists and is the surface its human look is meant to be performed on; the page renders with no database and no seed. (2) `test:design` is still DB-free and fast — 340 assertions in ~6.1s. (3) **D-9** is on the record: the preview's utilities are +0.93% of the shipped stylesheet, and 10-17 is the plan most likely to look at the bundle.
- **Phase 11 (GATE-01 / theme-swap smoke)** can screenshot this route signed-out, on a fresh clone, with no Docker. It is deliberately outside `(app)`, its metadata is noindex, and it carries **no** `toHaveScreenshot` — baselines are Phase 11's to take, after DS-01.
- **Phase 17 (a11y audit)** gets a route with zero duplicate ids, real labels bound to real controls, one deliberately `aria-invalid` field with an `aria-describedby` error, and both themes on one page — which is exactly the two-theme axe pass it needs, in one navigation.
- **Anyone adding a fifth type role** must add it to `src/lib/utils.ts`'s registration as well as to `globals.css`, or `cn()` will delete it again. The requirement is stated in that file's docstring and asserted in `type-scale.test.ts`.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 5 claimed artifacts verified on disk plus this file, and all 4 commits verified in `git log`
(`6f8bc26`, `ea189a9`, `94cf090`, `2832c24`). `deferred-items.md` re-read: **D-9 is present** with the
byte measurement and both rejected alternatives, and the **D-6 fifth reproduction** is recorded.
