---
phase: 10-design-system-foundation-theme-runtime
plan: 15
subsystem: design-system
tags: [codegen, design-tokens, drift-check, favicon, theme-runtime, scaffold-residue, DS-12, DS-14]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "the two `[data-theme]` blocks the generator reads, and the derived `--brand` values (`#da2d34` / `#13807c`) this plan reproduces independently"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 05
    provides: "the mounted theme runtime `FaviconSwap` reads, and `tests/design/scaffold-residue.test.ts` — the file this plan EXTENDS rather than duplicates"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 12
    provides: "the `@tailwindcss/postcss` path-keyed cache finding (ruled out here) and the narrowed content root"
provides:
  - "`scripts/generate-design-tokens.mjs` — the repo's first codegen: one parser, three committed artifacts, no command-line input"
  - "`src/lib/design/tokens.generated.ts` — 23 colour tokens per theme as oklch + 8-bit hex; the ONLY sanctioned duplicate of a token value"
  - "`tests/design/token-drift.test.ts` — D-18's regen-diff gate, standing in for the CI this repository does not have"
  - "`public/icon-court.svg` / `public/icon-grove.svg` — themed letterform favicons generated from the same source"
  - "`src/components/theme/favicon-swap.tsx` — the SOLE owner of the tab icon link; two rejected shapes measured and recorded"
  - "**DS-12 CLOSED** — the shipped `BRAND_CORAL = \"#E8484E\"` drift at `listing-map.tsx:22` is gone and no hex literal survives in that file"
  - "**DS-14 CLOSED** — both clauses: 10-05's metadata plus this plan's six deletions"
  - "A measured finding for anyone touching document metadata: a `<link>` React owns cannot be re-pointed, in EITHER direction"
affects: [10-16, 10-17, 11, 17]

# Tech tracking
tech-stack:
  added: []   # culori was already a devDependency (10-03); this plan is its first use outside a test
  patterns:
    - "A generated artifact that is byte-compared must be pinned to LF in `.gitattributes`. `text=auto` plus `core.autocrlf` hands a fresh Windows clone CRLF, and the drift check then goes red for a reason that is not drift."
    - "Codegen exports PURE render functions and keeps every write inside `main()`, so the drift test can render into memory and is structurally unable to repair the file it checks."
    - "An entry-point guard can be written without reading the process argument vector: `import.meta.main`, with an explicit throw on the older node that does not expose it — a silent exit-0 that writes nothing is the failure mode worth being loud about."
    - "A `<link>` React owns cannot be re-pointed at a different file. Mutating it makes React re-create its own node; rendering it and changing the href makes React hoist a SECOND one. Either way the page ships two icon declarations and the browser picks."
    - "When a criterion counts a string and the code the string named is deliberately gone, say so in the SUMMARY. The criterion passes on its comment; that is not the same as passing."

key-files:
  created:
    - scripts/generate-design-tokens.mjs
    - src/lib/design/tokens.generated.ts
    - public/icon-court.svg
    - public/icon-grove.svg
    - tests/design/token-drift.test.ts
    - src/components/theme/favicon-swap.tsx
  modified:
    - package.json                              # the design:tokens script
    - .gitattributes                            # LF pin for the three generated artifacts
    - src/components/listing/listing-map.tsx    # DS-12 — the drift closed
    - src/app/layout.tsx                        # FaviconSwap mount; NO metadata icons entry (measured)
    - src/app/globals.css                       # one stale sentence about public/
    - tests/design/scaffold-residue.test.ts     # 8 -> 19 assertions; DS-14 covered whole
  deleted:
    - src/app/favicon.ico
    - public/file.svg
    - public/globe.svg
    - public/next.svg
    - public/vercel.svg
    - public/window.svg

key-decisions:
  - "The plan's favicon shape was measured against a PRODUCTION build and ships two conflicting icon links. Both plan-sanctioned shapes leak; the fix is single ownership, which costs a measured 252ms of generic glyph on a cold load and buys an unambiguous tab identity."
  - "`grep -c \"icons\" src/app/layout.tsx >= 1` now passes on a COMMENT that argues against the entry rather than on the entry. Recorded rather than quietly enjoyed — the criterion's intent (no icon-less first paint) is served by a different mechanism, and the letter of it is satisfied by prose."
  - "Only tokens whose declared value is a single `oklch()` call are generated. That is what keeps type, radius and the elevation shorthands (which CONTAIN a colour) out of a module whose type promises a hex for every entry."
  - "Keys are sorted by UTF-16 code unit, never `localeCompare`. A byte-comparison across machines cannot depend on ICU."
  - "DS-12 and DS-14 both marked Complete. Unlike DS-02/DS-03/DS-13, neither has a clause owned by a later plan."

patterns-established:
  - "Measure the framework, do not reason about it. Three shapes of the favicon problem were built and probed against `npm start` before one was chosen; the two rejected ones are recorded IN THE COMPONENT, because the next reader's instinct is to re-add the metadata entry."
  - "Mutation-check by restoring from a copy, not from git, when the file under test carries uncommitted work."

requirements-completed: [DS-12, DS-14]

# Metrics
duration: 48min
completed: 2026-08-12
---

# Phase 10 Plan 15: Generated Token Module, Themed Favicons and the Scaffold Deletions Summary

**The one value in this repository that was allowed to be written twice is now generated from the stylesheet and byte-compared on every test run — and the browser tab stops being the last place the old brand survives**

## Performance

- **Duration:** ~48 min
- **Started:** 2026-08-11T20:06Z
- **Completed:** 2026-08-11T20:54Z
- **Tasks:** 3 (all `auto`, no checkpoints) + 1 deviation-driven commit
- **Files:** 6 created, 6 modified, **6 deleted**

## Accomplishments

- **The drift DS-12 exists to close was real, shipped, and is now gone.** `listing-map.tsx:22` carried
  `const BRAND_CORAL = "#E8484E"` annotated *"matches the UI-SPEC accent"*. It had not matched
  `--brand` since 10-03 re-derived that token for contrast: the stylesheet paints `#da2d34`, the map
  painted `#E8484E`, and **nothing in the repository could tell**. Both colour sources in that file
  now read `THEME_TOKENS.court`, and `grep -Ec '#[0-9a-fA-F]{3,8}\b'` over the whole file returns
  **0** — including its comments.
- **The generator reproduced 10-03's derivation independently, to the byte.** Court `--brand` formats
  to **`#da2d34`** and grove's to **`#13807c`** — the exact values `contrast.test.ts` pins with
  *hand-rolled* WCAG maths and its own culori call. Two code paths, written five plans apart, agreeing
  on the hex is the cross-check that a byte-comparison of a file against itself can never provide.
  `--ring` landing on `#555555` is a second, incidental agreement: `focus-recipe.test.ts`'s header had
  already computed that value by hand when arguing about the half-alpha ring.
- **D-18's "CI check" exists, in the only place it can.** There is no `.github/workflows` in this
  repository, so `tests/design/token-drift.test.ts` IS the regen-diff gate — 7 assertions, wired into
  `test:design`, which 10-17 wires into `build`. **Watched red on a one-character edit** (court
  `--brand` hex `#da2d34` → `#da2d35`): **1 failed / 6 passed**, the diff naming the line; regenerated
  → **7 passed**. That blast radius is the right one — the icon assertions and the guard-the-guard
  stayed green, so the failure points at the artifact that moved.
- **The generator is deterministic and idempotent, and both were verified rather than asserted.** A
  second `npm run design:tokens` prints `wrote 0/3 file(s).` and leaves `git status --porcelain`
  empty. No timestamp, no hostname, no locale-aware sort.
- **The browser tab is FitOut's, and it re-skins.** Verified against a **production build**: one icon
  link, `/icon-court.svg` on a cold load, `/icon-grove.svg` when the theme is seeded, and still
  exactly one after two client-side navigations and a hard reload. `/favicon.ico` returns **404**.
- **Six files deleted, each re-verified unreferenced immediately before removal** — `src/app/favicon.ico`
  and the five create-next-app SVGs. The only `next.svg` hit anywhere in the tree is
  `ui/calendar.tsx:35`'s `rdp-button_next>svg` selector, confirmed a substring false positive exactly
  as the plan predicted.
- **318/318 design tests green** (was 300), **with `DATABASE_URL` pointed at a dead port**, 16 files,
  ~5.0s. Full DB suite **1197 passed / 4 skipped**, unchanged. `tsc --noEmit` exit 0, `npm run build`
  exit 0, `npm run lint` **0 errors / 9 warnings** — byte-identical to the phase baseline.

## The plan's favicon shape ships two icons, and only a real browser could say so

This is the finding worth the plan's whole runtime.

The plan specifies an `icons` entry in the metadata export (so the tab is right before hydration)
**plus** a `useEffect` that finds the existing `<link rel="icon">` and re-points its `href`. Built
exactly as written, it passes `tsc`, passes lint, passes every committed assertion, and puts the
correct `<link rel="icon" href="/icon-court.svg">` in the server HTML. A real-browser probe — the
practice 10-05 established for exactly this reason — showed a different story:

| Shape | grove result | |
|---|---|---|
| metadata entry + effect mutates React's element | `["/icon-grove.svg", "/icon-court.svg"]` | **stale one LAST** |
| no metadata entry + component renders `<link>` for React to hoist | `["/icon-court.svg", "/icon-grove.svg"]` | stale one first, permanent |
| no metadata entry + effect owns a plain element | `["/icon-grove.svg"]` | **one, in every state** |

All three were built and measured against `npm start`, not the dev server, so none of it is a Fast
Refresh artifact. The timeline for the first shape is the legible one: at **t+200ms** there is exactly
one link and it is correct; the stale court link appears **later**. The mechanism is the same in both
failing shapes and it generalises past favicons — **a `<link>` React owns cannot be re-pointed at a
different file.** Mutate it and React can no longer match the node it rendered, so it makes another.
Render it and change the href and React hoists a second one, because hoisted metadata links are keyed
by href and the first is never removed.

Two `rel="icon"` declarations is not untidiness. Which one a browser honours is unspecified — in
practice the last wins, but that is convention, not contract — so a page shipping both hands its tab
identity to the user agent. **That is the exact ambiguity the plan gives as its reason for deleting
`favicon.ico`**, reintroduced through the head, and in the first shape it resolves the wrong way: the
tab shows court while the app renders grove, which is D-19's requirement failing silently.

So the icon has one owner. The cost is measured and stated rather than waved away: **252ms** from
navigation commit to the link appearing, during which a cold load shows the browser's generic
document glyph. A quarter-second of a generic glyph is the cheaper side of the trade against every
page permanently declaring two identities.

Both rejected shapes are recorded **in the component's header**, because the next reader's instinct —
correctly, on any other codebase — is to add the metadata entry back. `scaffold-residue.test.ts`
encodes it as a regression guard, watched red on a reinstated entry.

## Task Commits

1. **Task 1: The generator, the committed module and the two icon SVGs** — `7ea67ee` (feat)
2. **Task 2: The regen-diff guard and the one non-CSS consumer** — `46251f0` (test)
3. **Task 3: The themed favicon swap and the scaffold deletions** — `5468db6` (feat)
4. **Deviation: one owner for the tab icon** — `71db2d9` (fix)

**Plan metadata:** see the `docs(10-15)` commit that carries this file.

## Files Created/Modified

- **`scripts/generate-design-tokens.mjs` — created.** The repo's first codegen, shaped on
  `patch-kysely-adapter.mjs`: no shebang, module-level `resolve(process.cwd(), "<literal>")` paths,
  `main()` at the bottom, an `n/total` summary. `renderTokensModule` and `renderIconSvg` are pure and
  exported; every write is inside `main()`, so the drift test can render into memory and is
  structurally unable to repair the file it checks. The entry-point guard is `import.meta.main` —
  argv-free by construction (T-10-03) — with an explicit throw on an older node rather than the silent
  exit-0-writing-nothing that would leave a stale module and a drift test passing against it.
- **`src/lib/design/tokens.generated.ts` — created, committed.** 23 colour tokens per theme. A key is
  included only when its declared value is a **single `oklch()` call and nothing else**, which is what
  keeps `--radius`, the 16 type values and the elevation shorthands (a shadow that *contains* a colour)
  out of a `Record` whose type promises a hex for every entry. The header explains why a duplicate is
  allowed to exist at all, and why generated-and-committed beats both build-time-and-gitignored and
  hand-written-plus-an-equality-test.
- **`public/icon-court.svg` / `public/icon-grove.svg` — created.** 32×32, a rounded square in the
  theme's `--brand` with an **outlined** F path in `--brand-foreground` — the one pairing both themes
  derive to 4.57:1, so the mark is legible in both by construction. The leading comment records that
  the outline is forced rather than stylistic (an SVG favicon renders in an isolated document that
  loads no webfonts, so a typeface attribute would silently not be honoured) and that D-127 holds: no
  typeface has been chosen and this is a placeholder, not a logo.
- **`tests/design/token-drift.test.ts` — created.** 7 assertions. Byte equality with no normalisation,
  the banner check separated out (a file that had lost its banner would still match itself), and
  guard-the-guard that an empty render cannot match an empty file: >500 chars, ≥20 keys per theme
  parsed **out of the emitted text**, and the two themes required to render *different* icons carrying
  two colours each. Its header records the observed red/green numbers and states plainly that
  **10-12's postcss path-keyed cache is unreachable here** — nothing in this file compiles through
  Tailwind.
- **`src/components/theme/favicon-swap.tsx` — created.** See the section above. Allowlist membership
  via `.includes()`, then the value is used as a **key** into a two-row table of literal paths;
  nothing derived from it is interpolated (T-10-04).
- **`src/components/listing/listing-map.tsx` — modified.** `BRAND_CORAL` and the `#fff` inner disc
  both replaced. The `coralPin()` structure, the `L.divIcon` call, the `className` wrapper and the
  `<path>` teardrop are untouched — only the two colour sources changed. Court is pinned deliberately
  (D-06: no runtime switcher), and the comment says so and names this as a place that must follow if
  one is ever added.
- **`src/app/layout.tsx` — modified.** `FaviconSwap` imported and mounted beside `ThemeQueryParam`.
  The metadata comment now explains the **deliberately absent** icons entry with the measurement.
- **`.gitattributes` — modified.** LF pinned for the three generated artifacts. See deviation 1.
- **`src/app/globals.css` — modified.** One sentence in the content-root comment said `public/` holds
  five SVGs; after this plan it holds two generated icons. A comment that describes the tree is a
  claim, and this plan falsified it.
- **`tests/design/scaffold-residue.test.ts` — modified, 8 → 19 assertions.** Extended, not duplicated,
  exactly as its own header and 10-05's handoff required. Six deletion assertions, two icon
  assertions that read the expected hex **from `THEME_TOKENS`** rather than pinning a literal (so a
  legitimate re-derivation moves both sides and only a real divergence goes red), the mount check, the
  single-owner regression guard, and a guard-the-guard proving `REPO_ROOT` resolves — because six of
  the new assertions are negatives over `existsSync` and every one of them passes trivially against a
  wrong root.

## Decisions Made

- **Single ownership of the icon link**, with both rejected shapes measured and recorded. See the
  dedicated section.
- **`grep -c "icons" src/app/layout.tsx >= 1` now passes on a comment, not on code**, and that is
  stated here rather than quietly enjoyed. The criterion's *intent* — no icon-less first paint — is
  served by a different mechanism at a measured 252ms cost. Its *letter* is satisfied by prose that
  argues against the very entry it was counting. This is the fifteenth appearance of this phase's
  grep-versus-comment collision and the first where the comment satisfies a criterion the code
  deliberately no longer does; that asymmetry is why it is called out rather than filed as routine.
- **Only single-`oklch()` values are generated.** Anything else has no hex, and a `TokenValue` whose
  `hex` field was a lie would be a plausible-looking one propagated into a favicon and a map pin.
- **Keys sorted by UTF-16 code unit, never `localeCompare`.** A byte-comparison that has to hold on
  every machine cannot depend on ICU collation.
- **DS-12 and DS-14 both marked Complete.** Unlike DS-02, DS-03 and DS-13 — each of which was left
  Pending because a later plan claimed the same ID — neither of these has an outstanding clause.
  DS-12's requirement text names `email` and `global-error` as future consumers; `src/lib/email.ts`
  contains zero hex literals and `src/app/global-error.tsx` does not exist (it is STATE-02, Phase 11),
  so the module is *shaped* for them and wires the one consumer that exists, which is the whole of the
  requirement that is reachable today.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] The byte-equality drift check was platform-fragile: generated artifacts needed an LF pin**

- **Found during:** Task 1, before the first commit
- **Issue:** `.gitattributes` declares `* text=auto` and this machine has `core.autocrlf=true`. The
  generator writes LF; git stores LF; but a **fresh clone or any checkout round-trip rewrites the
  working tree to CRLF**. `token-drift.test.ts` compares bytes with no normalisation — deliberately —
  so the plan's central deliverable would have gone red on a fresh Windows clone for a reason that has
  nothing to do with drift. Confirmed empirically that the repo already carries a mix: `package.json`
  and `src/app/layout.tsx` are CRLF in the working tree, `config/design-tokens-source.mjs` is LF.
- **Fix:** `eol=lf` pinned for `src/lib/design/tokens.generated.ts`, `public/icon-court.svg` and
  `public/icon-grove.svg`, with the reasoning at the entries so the next author does not "simplify"
  them away.
- **Files modified:** `.gitattributes`
- **Verification:** `git check-attr text eol` reports `text: set / eol: lf` for all three. Direct
  evidence the pin bites: `git add` printed *"LF will be replaced by CRLF"* for the unpinned
  `scripts/generate-design-tokens.mjs` and printed **nothing** for the three pinned artifacts.
- **Committed in:** `7ea67ee`

**2. [Rule 1 - Bug] The plan's favicon shape ships TWO icon links, with the stale one last**

- **Found during:** Task 3 verification, in a real-browser probe after every committed assertion was
  already green
- **Issue:** Measured against a production build. The full analysis, the three shapes and the
  timeline are in the dedicated section above. Short form: a `<link>` React owns cannot be re-pointed,
  so the metadata-entry-plus-effect shape leaves the page declaring both `/icon-grove.svg` and
  `/icon-court.svg` with the stale one last — and browsers commonly honour the last, so the tab shows
  court while the app renders grove. That is D-19 failing silently, through exactly the ambiguity the
  plan cites as its reason for deleting `favicon.ico`.
- **Fix:** One owner. The metadata `icons` entry is removed and `FaviconSwap` installs a plain element
  nothing else manages. Both rejected shapes, their measured outputs and the 252ms cost are recorded
  in the component header; `layout.tsx`'s metadata comment points at it.
- **Files modified:** `src/app/layout.tsx`, `src/components/theme/favicon-swap.tsx`,
  `tests/design/scaffold-residue.test.ts`
- **Verification:** production probe — exactly one link in every state measured (court cold, grove
  seeded, after two navigations, after a reload). The new regression assertion was watched go red on a
  reinstated metadata entry: **1 failed / 18 passed**; removed → **19 passed**.
- **Committed in:** `71db2d9`

**3. [Rule 3 - Blocking] A "no typeface attribute" assertion tripped on the comment explaining why there is no typeface attribute**

- **Found during:** Task 3, first run of the extended suite — 2 failed / 16 passed
- **Issue:** The icon assertion checks the mark carries no `font-family`. The generated SVG's own
  leading comment *explains at length* that a typeface attribute would silently not be honoured in a
  favicon's isolated rendering context — so the file contains the string while the drawing does not.
  The phase's recurring grep-versus-comment collision, arriving for the fourteenth time and, for the
  first time, inside a test written in the same task rather than in a plan criterion.
- **Fix:** The XML comment is stripped and the assertion made against the **markup**, which is both
  the honest claim and the one that lets the artifact keep explaining itself. The separately
  grep-asserted element is still named descriptively rather than spelled, since that criterion reads
  the raw file.
- **Files modified:** `tests/design/scaffold-residue.test.ts`
- **Verification:** 19/19 green; the stripper is exercised by both icons.
- **Committed in:** `5468db6` (the fix), refined in `71db2d9`

**4. [Rule 1 - Bug] One stale sentence in `globals.css`**

- **Found during:** Task 3, after the deletions
- **Issue:** The content-root comment justifies narrowing Tailwind's scan to `src/` partly by saying
  *"`public/` holds five SVGs and no markup"*. This plan deleted all five and added two.
- **Fix:** Reworded to describe the tree as it now is. The argument is unchanged — `public/` still
  holds no markup.
- **Files modified:** `src/app/globals.css`
- **Verification:** design gate 318/318 including `elevation-z.test.ts`'s compiled-output assertions,
  which read that stylesheet; `npm run build` exit 0.
- **Committed in:** `5468db6`

---

**Total deviations:** 4 (2 × Rule 1, 1 × Rule 2, 1 × Rule 3). No Rule 4 checkpoint was needed.
**Impact on plan:** Every artifact the plan names exists, every `must_haves` truth holds, and every
acceptance criterion passes — with one honestly qualified: `grep -c "icons" src/app/layout.tsx` is
satisfied by the comment that explains the entry's deliberate absence, not by the entry. The plan's
*intent* for that entry (no icon-less first paint) is traded for an unambiguous tab identity at a
measured 252ms cost, because the entry was measured to break the requirement it was meant to support.

## Deferred Issues

**None new.** Nothing was left half-done and nothing out of scope was touched.

One item is worth carrying rather than deferring: the **252ms icon-less window** on a cold load. It is
an accepted, documented cost of single ownership, not a bug. If it ever needs closing, the shape that
would work is a server-rendered themed icon — which requires the theme to be known on the server, and
today it is not (next-themes resolves it in the browser, D-07). That is a Phase 11 shell concern if it
is anyone's.

## Issues Encountered

- **The most valuable finding was invisible to every layer of testing this phase has built.** `tsc`,
  lint, 318 design assertions and a build all passed on a component that put two conflicting icon
  declarations in every page's head. Only a real browser could see it, and only because 10-05
  established the practice of probing the runtime rather than trusting mocked tests. The lesson
  generalises past favicons: **assertions about what a file CONTAINS cannot see what a framework DOES
  with it at runtime.**
- **I lost uncommitted work to `git checkout -- <file>` during a mutation check.** The mutation was
  applied with `sed` to `src/app/layout.tsx` and reverted with `git checkout --`, which restored the
  file to HEAD — taking the task's three uncommitted edits with it. Re-applied, no harm done, but the
  rule is worth writing down: **when the file under test carries uncommitted work, mutation-check by
  restoring from a copy, not from git.** Every later mutation in this plan used a backup copy.
- **The grep-versus-comment collision hit twice more** (fourteenth and fifteenth occurrences),
  including the first case where a comment satisfies a criterion the code deliberately no longer
  satisfies. Both are documented above.
- **`npm run test:e2e` is 17 passed / 1 failed — the same pre-existing signal, now for the fourth
  consecutive plan.** `open-capacity.spec.ts:376`, D-6 item 1. Run twice here (before and after Task
  3) with a byte-identical result, and `public-listing.spec.ts` — the spec that renders the Leaflet
  map whose pin this plan rewires — was run standalone and passes **3/3**.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run design:tokens` | exit 0 — `[generate-design-tokens] wrote 3/3 file(s).` |
| `npm run design:tokens` a second time | `wrote 0/3 file(s).`; `git status --porcelain` **empty** |
| `npm run test:design -- token-drift` | exit 0 — **7 passed** |
| **Mutation check** — court `--brand` hex changed by one character | **1 failed / 6 passed**, diff names the line; regenerated → **7 passed** |
| `npm run test:design -- scaffold-residue` | exit 0 — **19 passed** (was 8) |
| **Mutation check** — `public/next.svg` restored + `<FaviconSwap />` removed | **2 failed / 16 passed**, each naming its cause |
| **Mutation check** — metadata `icons` entry reinstated | **1 failed / 18 passed**; removed → **19 passed** |
| `npm run test:design` (whole gate, `DATABASE_URL` on a dead port) | exit 0 — 16 files, **318 passed** (was 300), ~5.0s |
| `npm run db:up && npm run db:test:setup && npm test` | exit 0 — **1197 passed / 4 skipped**, unchanged |
| `npm run test:e2e` (run twice, before and after Task 3) | **17 passed / 1 failed** both times — D-6 item 1, pre-existing |
| `npx playwright test e2e/public-listing.spec.ts` (the Leaflet map) | **3 passed** |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, unchanged from baseline |
| Court / grove `--brand` hex | **`#da2d34`** / **`#13807c`** — reproduce 10-03's pinned values exactly |
| Colour tokens generated per theme | **23** (≥20 floor) |
| AC: `argv` in the generator | **0** |
| AC: `head -1` of the generated module contains `DO NOT EDIT` | **1** |
| AC: typeset-glyph element in either icon | **0 / 0** |
| AC: `da2d34` in `icon-court.svg` | **1** |
| AC: `#E8484E` / any hex in `listing-map.tsx` | **0** / **0** |
| AC: `tokens.generated` in `listing-map.tsx` | **1** |
| AC: `src/app/global-error.tsx` | absent (not created, as required) |
| AC: `as ThemeName` in `favicon-swap.tsx` | **0** |
| AC: `FaviconSwap` / `icons` in `layout.tsx` | **3** / **1** (the latter on a comment — see Decisions) |
| AC: `ls` the six deleted paths | fails for **all six** |
| AC: `ls public/icon-{court,grove}.svg` | succeeds for **both** |
| `git check-attr text eol` on the three generated files | `text: set` / `eol: lf` |
| `git diff --diff-filter=D` per commit | 6 deletions in `5468db6` only — **all intentional and enumerated**; none in the other three |
| `git status --short` after each commit | clean |

### Real-browser probe (production build, `npm start`; scripts not committed)

| Observation | Value |
|---|---|
| Icon links, court cold load | **1** — `/icon-court.svg` |
| Icon links, grove seeded via `localStorage` | **1** — `/icon-grove.svg` |
| After two client-side navigations, then a hard reload | **1**, still `/icon-grove.svg` |
| `/icon-grove.svg` | **200**, 1501 bytes |
| `/favicon.ico` | **404** — the deletion is real at runtime |
| Icon-less window from navigation commit | **252 ms** |
| REJECTED shape A (metadata entry + effect mutation) | **2 links**, `["/icon-grove.svg", "/icon-court.svg"]` — stale LAST |
| REJECTED shape B (component renders the `<link>`) | **2 links**, `["/icon-court.svg", "/icon-grove.svg"]` — permanent, stable at two |

## Known Stubs

None. Every artifact is wired to something real: the generator has a committed npm script and three
committed outputs, the token module has a live consumer rendering on the public listing page, both
icons are served and one is in the document head at all times, and the drift test runs in the gate
that 10-17 wires into `build`. The generated module deliberately carries tokens with no consumer yet
(`--success`, `--destructive` and the rest) — that is a *contract*, not a stub: DS-12's requirement
names `email` and `global-error` as future consumers, `src/lib/email.ts` has no hex to migrate and
`global-error` does not exist yet (STATE-02, Phase 11).

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change; `drizzle/` untouched at
`0025` (GATE-06). The six deletions are static scaffold assets.

Threat register dispositions honoured:

- **T-10-03** (tampering, the codegen's write paths) — **mitigated.** Every read and write path is a
  module-level `resolve(process.cwd(), "<literal>")` constant; the script takes no parameters from the
  command line, reads none from the environment, and derives no destination from a caller. The
  entry-point guard is `import.meta.main` specifically so the process argument vector is never read —
  `grep -c "argv"` returns **0**, asserted.
- **T-10-30** (repudiation, a generated file that lies about its source) — **mitigated, and watched.**
  Byte equality with no normalisation, guard-the-guard rejecting a vacuous render, and the gate
  observed red on a one-character edit before the task closed. The LF pin (deviation 1) is part of
  this mitigation: an unpinned artifact makes the check platform-dependent, which is a gate that
  fails for the wrong reason and then gets weakened.
- **T-10-04** (tampering, the icon href) — **mitigated.** Allowlist membership via `.includes()`, no
  cast, and the value is used as a **key** into a two-row table of literal paths rather than
  interpolated into one. `grep -c "as ThemeName"` returns **0**.
- **T-10-31** (information disclosure, the deleted assets) — **accepted as planned.** All six are
  create-next-app scaffold files containing no project data, and each was re-verified unreferenced
  immediately before deletion rather than trusting the plan's earlier grep.

## Next Phase Readiness

- **10-16 (THEME-04 / `/dev/theme`)** — unblocked and helped. `THEME_TOKENS` gives the dev page a
  ready-made, drift-checked inventory of both themes' colours with hexes, if it wants to render
  swatches without re-parsing CSS. Note that a `/dev/theme` page under `src/app/**` **will** move
  `elevation-z.test.ts`'s `shadow-sticky` zero-call-site assertion, as 10-12 already flagged.
- **10-17 (the build gate + DS-13's leak scan)** — **`src/lib/design/**` must be excluded from the raw-
  value scan, and the exclusion needs a comment naming DS-12.** `tokens.generated.ts` contains 46 hex
  literals by design; they are legal precisely because they are generated and byte-checked. Scanning
  that directory would force either a red gate or a weakened one. Also: `test:design` is still DB-free
  and fast (**318 in ~5.0s**) and now carries the regen-diff gate, which is the specific reason D-18
  needs `test:design` in `build` rather than merely in `test`.
- **Phase 11 (GATE-01)** — the tab icon is now part of the shell's visual identity and it re-skins, so
  a theme-swap smoke has one more observable. **Do not screenshot the first ~250ms of a cold load** if
  the tab chrome is in frame: the icon genuinely is not there yet, by design, and that is documented
  rather than a flake.
- **Phase 11 (STATE-02, `global-error.tsx`)** — when it lands, import `THEME_TOKENS` rather than
  inlining hex. That page renders outside the stylesheet, which is one of the two reasons this module
  exists; it was deliberately NOT created here.
- **Anyone touching document metadata, in any phase** — read `favicon-swap.tsx`'s header first. A
  `<link>` React owns cannot be re-pointed, in either direction, and the failure is invisible to the
  type checker, the linter, the build and every committed assertion.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 12 claimed artifacts verified on disk (6 created, 6 modified) plus this file, all 6 claimed
deletions verified absent, and all 4 task commits verified in `git log` (`7ea67ee`, `46251f0`,
`5468db6`, `71db2d9`). `REQUIREMENTS.md` re-read after the metadata commit: **DS-12** and **DS-14**
both read `Complete` in the checklist and the traceability table — accurate, because neither has a
clause claimed by a later plan, which is what kept DS-02, DS-03 and DS-13 `Pending` at their own
plans' close. `deferred-items.md` re-read: unchanged, no new item. `ROADMAP.md` Phase 10 progress
reads **15/17, In Progress**. STATE.md's frontmatter, Current Position, metrics row and Decisions were
hand-written, as the toolchain notes prescribe.
