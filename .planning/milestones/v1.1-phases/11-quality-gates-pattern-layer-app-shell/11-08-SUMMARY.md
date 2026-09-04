---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 08
subsystem: design-system
tags: [ds-11, patterns-layer, cards, container-queries, ds-05, focus, elevation-inventory, geometry, server-components]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-07's `src/lib/design/measurements.ts` (`RESULT_CARD_MEDIA`, `ROW_CARD_THUMB`, `ROW_CARD_HEIGHT`) and the `patterns/` membership rules; plan 11-02's `selector-contract.ts`, which declares all four ids this plan is the `owner` of; plan 11-01's design suite inside `npm run build`"
  - phase: 10-design-system-token-layer
    provides: "`ui/card.tsx`'s composition surface, the DS-05 canonical focus recipe, the three-step elevation scale + four-step z scale and their per-file inventories in `tests/design/elevation-z.test.ts`"
provides:
  - "`src/components/patterns/result-card.tsx` — DS-11's marketplace tile: whole-card `<Link>`, container-query internals, mandatory `tabular-nums` price"
  - "`src/components/patterns/row-card.tsx` — DS-11's list row: overlay-pseudo-element navigation, lifted `actions` siblings, and the declared DS-05 ring-offset exception carrying its measured 7.46 / 7.36"
  - "`src/components/patterns/panel-card.tsx` — DS-11's boxed panel: title/description/footer/sticky/tone, flat at rest, `lg:top-20` encoded in the prop"
  - "`src/components/patterns/page-header.tsx` — `h1` + lede + wrapping actions, the shape inlined in ~10 pages"
  - "The measured fact that `ROW_CARD_HEIGHT` was 32px short of every shipped row, and the `py-0` composition that makes it true"
affects: [11-09, 11-10, 11-11, 11-12, 11-13, 11-14, 11-15, 11-16, 11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Container queries for a component's INTERNALS, viewport breakpoints for the GRID that lays it out — the card renders at three widths on one viewport"
    - "A numeric prop DERIVED from the class constant that expresses the same measurement, so two spellings of one number cannot drift"
    - "A pinned per-file inventory is updated in the commit that moves it, with the reason and the expected future direction recorded in the map's own docblock (the 10-16 precedent)"
    - "Name a banned class DESCRIPTIVELY in prose rather than quoting it, when a source scan counts that string (`booking-row.tsx:112`'s precedent)"

key-files:
  created:
    - src/components/patterns/result-card.tsx
    - src/components/patterns/row-card.tsx
    - src/components/patterns/panel-card.tsx
    - src/components/patterns/page-header.tsx
  modified:
    - tests/design/elevation-z.test.ts
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "`ROW_CARD_HEIGHT` was FALSE of every shipped row — measured at 112px in Chromium, not the declared 80px — because this tree's `ui/card.tsx` carries `py-4` on `Card` itself; `RowCard` and `PanelCard` compose `py-0` so the constant describes what actually renders"
  - "`<AspectRatio ratio>` is PARSED from `RESULT_CARD_MEDIA` rather than written beside it, closing by construction the drift `measurements.ts` names in its own NOT COVERED footer"
  - "`mediaFallback` is a REQUIRED prop on `ResultCard` (11-07's `label` precedent) — an optional one would need a default, and a default here is product copy in `patterns/`"
  - "`actions` on `RowCard` are lifted with `z-(--z-sticky)`, not merely rendered as siblings: an un-lifted sibling is painted over by the link's positioned `::after` and every action click lands on the overlay"
  - "Two pinned elevation/z inventories moved in this plan's own commits, each with its expected future direction recorded — both rows die when the adoption plans swap the shipped analogs"
  - "DS-11 stays Pending: its second clause is 'every card surface in the app uses one of them', and this plan ships zero adopters"

patterns-established:
  - "A pattern's geometry claim is MEASURED in a browser before it is written in a comment — jsdom cannot see layout (D-131), and a false header comment is a defect (11-PATTERNS § 10)"
  - "A pattern that must explain a banned string in prose verifies the real property over the AST, and records the raw-grep number beside it so the next reader does not trust the grep"

requirements-completed: []

# Metrics
duration: 26min
completed: 2026-08-13
---

# Phase 11 Plan 08: The Three Card Patterns and the Page Header Summary

**Four prop-complete Server Components open the layer Phases 12–15 adopt rather than extend — and building them measured that `ROW_CARD_HEIGHT` was false of every shipped row by 32px, which is the layout shift the row skeleton was built to prevent, caused by the skeleton.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-08-13T12:30:00Z
- **Completed:** 2026-08-13T12:56:00Z
- **Tasks:** 3
- **Files modified:** 4 created, 2 modified

## Accomplishments

- **All four patterns exist, prop-complete, adopted by nobody.** Every prop the UI-SPEC declares is present; nothing was deferred to "when a surface needs it". `ResultCard` (href · media · mediaFallback · title · meta · price · badges), `RowCard` (href · media · title · meta · status · trailing · actions), `PanelCard` (title · description · footer · sticky · tone · children), `PageHeader` (title · lede · actions).
- **None of them is a fork.** `git status --short src/components/ui/` is empty across all three commits — the three card patterns compose `Card` / `CardContent` / `CardFooter` through `className` and nothing else, so Phase 10's ~15-file shadcn collision surface did not grow. `page-header.tsx` imports no card because it is not one (it is a "Supporting pattern" in the UI-SPEC, not one of the three).
- **All four are Server Components with zero domain imports**, verified over the AST rather than by grep — see the findings below, because the grep says the opposite.
- **Plan 11-02's four declared ids now exist.** `result-card`, `row-card`, `panel-card`, `page-header` each appear exactly once as a JSX attribute. Combined with 11-07's three, `src/` now carries 7 of the inventory's 17, all declared, all owned by the plan that shipped them.
- **The `RESULT_CARD_MEDIA` link is mechanical, not nominal.** `measurements.ts`'s own NOT COVERED footer says `RESULT_CARD_MEDIA` and `AspectRatio ratio={4 / 3}` are *"two spellings of one number in two languages"* and hands the comparison to plan 11-21. There is only one spelling now: the tile parses the ratio out of the constant and throws at build if it ever stops being an `aspect-[w/h]` class.

## Task Commits

1. **Task 1: ResultCard — the marketplace tile** — `2abb5d7` (feat)
2. **Task 2: RowCard — the list row, with its declared DS-05 exception** — `8949c7b` (feat)
3. **Task 3: PanelCard and PageHeader** — `f957352` (feat)

## Files Created/Modified

**Created**

- `src/components/patterns/result-card.tsx` — the DS-05 focus recipe copied byte-for-byte from `search-result-card.tsx:174` **with its comment**, the shipped hover preserved (`group-hover:bg-muted/40 group-hover:shadow-overlay transition-shadow`), badges inline on the type line, price last and always `tabular-nums`, `@container` internals.
- `src/components/patterns/row-card.tsx` — the overlay-pseudo-element link copied byte-for-byte from `booking-row.tsx:79`, the missing `ring-offset` recorded as the declared exception with its 7.46 / 7.36 measurement, `actions` as lifted siblings, `py-0` so the row measures 80px.
- `src/components/patterns/panel-card.tsx` — flat at rest with no `shadow-` utility in any class string, `lg:top-20` in the prop, `tone="muted"` reusing two already-declared pairings, `CardFooter`'s shipped `border-t bg-muted/50` composed rather than restated.
- `src/components/patterns/page-header.tsx` — `h1` + `max-w-prose` lede + wrapping actions cluster; no `truncate` and no `line-clamp` anywhere, which is the pattern's actual contract.

**Modified**

- `tests/design/elevation-z.test.ts` — two pinned inventories moved (table below), each with its reason and expected future direction in the map's own docblock.
- `.planning/phases/…/deferred-items.md` — the 112px-vs-80px row finding, measured, handed to the adoption plans.

### Pinned inventories, old → new

| Map | Row added | Count | Old → New | Why |
|---|---|---|---|---|
| `OVERLAY_INVENTORY` | `patterns/result-card.tsx: 1` | named elevation sites | `12` → `13` | The tile preserves the shipped `group-hover:shadow-overlay` the UI-SPEC marks "shipped, preserved" |
| `STICKY_INVENTORY` | `patterns/row-card.tsx: 1` | sticky / mapped total | `11`/`20` → `12`/`21` | `actions` must clear the title link's `after:inset-0` overlay — the identical fix `booking-row.tsx:109-117` already carries |

Both additions are TEMPORARY by construction and both docblocks say so: the pattern and its shipped analog legitimately carry the step at once only until adoption, after which the analog's row disappears and the totals fall back to 12 and 11. Each moved in the commit that caused it (the 10-16 precedent, quoted in both notes).

## Decisions Made

- **`ROW_CARD_HEIGHT` did not describe any row in the app, and the fix is a composition rather than a new constant.** `measurements.ts` derives 80px as *"a `Card` is `p-4` (16 top + 16 bottom) around a 48px thumbnail"*. That derivation is right about the box and wrong about which element owns the padding in **this** tree: `ui/card.tsx:15` carries `py-4` on **`Card` itself** and only `px-4` on `CardContent`, so a row that also asks `CardContent` for `p-4` — which both shipped rows do — pays the block padding twice. **Measured in Chromium 1223** against the compiled stylesheet at 640px, with class strings produced by the repo's own `cn()` so the fixture could not disagree with the component about which utility survives a merge: `<Card className="relative">` → **112px**, `<Card className="relative py-0">` → **80px**. `RowCard` carries `py-0`, so the pattern measures the number `RowListSkeleton` shimmers. `PanelCard` carries the same `py-0` for the same reason on its own padding claim (`p-4 sm:p-6`, otherwise 32px/40px). The shipped routes are NOT touched — see Deferred Issues.
- **The media ratio is derived, not duplicated.** `MEDIA_RATIO` parses `RESULT_CARD_MEDIA` (`aspect-[4/3]` → `4 / 3`) at module scope and **throws** if the constant ever takes a form it cannot read. The throw is deliberate: the honest outcomes when the constant changes shape are "teach the derivation" or "record why the two spellings may differ", never "silently fall back to 4/3", which reintroduces exactly the drift the derivation removes. It surfaces at `next build`, naming the constant and its current value.
- **`mediaFallback` is required; `RowCard` has no such prop.** Required on the tile for 11-07's `label` reason — the fallback is a sentence, `patterns/` owns no sentences, and an optional slot would need a default. Deliberately absent on the row: at 48px there is no room for a sentence, and a caller that wants a placeholder passes it *as* `media`. One slot, no branch.
- **`actions` are lifted, not merely sibling.** Nesting a button inside the anchor is invalid HTML and swallows the click — that is the half the plan states. The other half is subtler and equally broken: the link's `::after` is a *positioned* descendant, so it paints above a later sibling that is merely in flow, and every action click lands on the overlay. `booking-row.tsx:109-117` records the same fix in the same words, which is where the `z-(--z-sticky)` step comes from.
- **Container queries for the tile's internals, viewport breakpoints for the grid.** `@container` on the card root; `@max-[20rem]:py-3` and `@sm:px-6 @sm:py-5` inside. The card renders at ~330px (3-up grid), ~288px (320px floor) and a third-width ("You might also like") — a `sm:` inside the card asks how wide the *window* is and gets all three wrong at once, and the widest and narrowest instances can be on screen together. Verified in the emitted stylesheet rather than assumed: `@container (min-width:24rem)` and `@container not (min-width:20rem)` blocks exist, carry the right declarations, and are ordered **after** the base `.px-4`/`.py-4` rules so they win at their widths.
- **The wrong sticky offset is named descriptively, not quoted.** The UI-SPEC calls the `lg:sticky` rule *"falsifiable as a source scan"*. `booking-row.tsx:112` already set the precedent (*"Named descriptively rather than quoted, because the DS-03 gate counts that string"*), so `panel-card.tsx` says "both offset by 32px, the 8th spacing step" instead of spelling the class. That keeps the explanation intact **and** keeps a future scan honest — see finding 3.
- **DS-11 stays Pending in REQUIREMENTS.md.** Its text is *"Three named card patterns exist … **and** every card surface in the app uses one of them"*. This plan closes the first clause and ships zero adopters. Same precedent as 11-07 leaving STATE-01 and DS-11 Pending, and 11-02 leaving GATE-04 Pending with clauses outstanding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ROW_CARD_HEIGHT` was false of every row in the app; `RowCard` and `PanelCard` compose `py-0`**

- **Found during:** Task 2 (writing the comment the plan asked for)
- **Issue:** The plan requires a comment stating that the row's resting height is `ROW_CARD_HEIGHT`, "so `RowListSkeleton` and this component are provably reading the same number rather than agreeing by coincidence". Written as prescribed (`<Card className="relative">` + `<CardContent className="space-y-3 p-4">`) the row renders **112px**, not 80px, because `ui/card.tsx` puts `py-4` on `Card` and `px-4` on `CardContent`. The comment would have been a false header comment (11-PATTERNS § 10), and the "provably" would have been a word.
- **Fix:** Measured both shapes in Chromium against the compiled stylesheet before writing anything, then composed `py-0` on the Card so `CardContent`'s `p-4` is the row's only block padding and the rendered height **is** 80px. The measurement, both numbers, and the reason the derivation in `measurements.ts` is right-about-the-box-and-wrong-about-the-element are in the component. `PanelCard` carries the same `py-0` so its `p-4 sm:p-6` is real too.
- **Files modified:** `src/components/patterns/row-card.tsx`, `src/components/patterns/panel-card.tsx`
- **Verification:** `shipped {"height":112}` / `py0 {"height":80}` — the fixture's class strings are produced by the repo's own `cn()`, which matters: a hand-written `py-4 … py-0` list measures 112px too, because tailwind-merge (not CSS order) is what removes the loser.
- **Committed in:** `8949c7b`, `f957352`

**2. [Rule 3 - Blocking] Two pinned elevation/z inventories had to move, and both were watched going red first**

- **Found during:** Tasks 1 and 2
- **Issue:** `tests/design/elevation-z.test.ts` pins the named-shadow and z-step call sites as **exact per-file maps plus exact totals**. The tile's `group-hover:shadow-overlay` (UI-SPEC: "shipped, preserved") and the row's `z-(--z-sticky)` action lift are both required by the plan, so both gates went red on a correct tree.
- **Fix:** Updated `OVERLAY_INVENTORY` (12 → 13 named sites) and `STICKY_INVENTORY` (11 → 12 sticky, 20 → 21 mapped), each in the commit that caused it, each with a docblock recording *why* the row is there and *that it is temporary* — the rows die when the adoption plans swap `search-result-card.tsx`, `booking-row.tsx` and `host-booking-row.tsx`. This is the mechanism the file itself documents at `SHADOW_STICKY_INVENTORY` ("MOVED BY PLAN 10-16, deliberately and in that plan's own commit").
- **Files modified:** `tests/design/elevation-z.test.ts`
- **Verification:** Both reds observed verbatim before the edit — `expected 13 to be 12` with the map diff naming `+ "src/components/patterns/result-card.tsx": 1`, and `expected { …(6) } to deeply equal { …(5) }` naming `+ "src/components/patterns/row-card.tsx": 1`. 53 passed after each fix. The gate is therefore demonstrably not vacuous on this tree.
- **Committed in:** `2abb5d7`, `8949c7b`

**3. [Rule 1 - Bug] Task 3's `grep -c "lg:top-8" … returns 0` is unsatisfiable alongside Task 3's own action text**

- **Found during:** Task 3
- **Issue:** The `<action>` requires the comment to say *"the shipped `lg:top-8` (32px) would tuck the rail under the header"*; the `<acceptance_criteria>` requires `grep -c "lg:top-8" src/components/patterns/panel-card.tsx` to return **0**. Writing the sentence makes the grep return 1. The two cannot both hold. This is the fourth instance in Phase 11 of a plan-prescribed check that a file's own explanation trips.
- **Fix:** Followed the repo's existing precedent at `booking-row.tsx:112` — name the wrong offset descriptively ("both offset by 32px, the 8th spacing step") rather than quoting the class, and say in the comment *why* it is named that way. Nothing is lost: the reader gets the arithmetic, the two shipped sites by path, and the general rule. The AC is satisfied literally (`lg:top-20` → 1, `lg:top-8` → 0), and a future source scan for the wrong offset — which the UI-SPEC promises as "falsifiable as a source scan" — is not tripped by the file explaining it.
- **Files modified:** `src/components/patterns/panel-card.tsx`
- **Verification:** `grep -c "lg:top-20"` → `1`; `grep -c "lg:top-8"` → `0`.
- **Committed in:** `f957352`

**4. [Rule 1 - Bug] Three more acceptance criteria are unsatisfiable by grep on a clean tree**

- **Found during:** Tasks 1–3 (running the acceptance criteria as written)
- **Issue:** Same shape as 11-07's findings 3 and 4, three more times. On the four **correct** files: `grep "use client" result-card.tsx` → **1** (the header explains why the file is a Server Component and has to quote the directive it does not use); `grep "ring-offset" row-card.tsx` → **4** (the declared DS-05 exception is *about* `ring-offset`); `grep "shadow-" panel-card.tsx` → **3** (the "elevation: none at rest" paragraph names the two steps it is refusing).
- **Fix:** Verified the real properties over the TypeScript AST instead — directive prologue (not "a string containing `use client`"), string literals and template chunks (not raw text), and JSX attributes (not text matches). Results: zero directive prologues in all four files, zero `ring-offset` in any class string in `row-card.tsx`, zero `shadow-` in any class string in `panel-card.tsx`, zero domain imports in all four, exactly one `data-testid` JSX attribute each, and the overlay-link string **byte-identical** to `booking-row.tsx:79`'s. A synthetic offender was run through the same probe as a positive control and every check fired, so the four PASSes are not a walker that inspected nothing.
- **Files modified:** none — all four files were already correct
- **Verification:** recorded verbatim in the Verification Run table below.
- **Committed in:** n/a (a measurement, no code change)

### Plan-directed but out of `files_modified`

**5. `tests/design/elevation-z.test.ts` and `deferred-items.md` edited although neither is in `files_modified`**

- The elevation edits are finding 2 and could not be avoided: the plan's own `<verification>` block requires `npm run build` to exit 0, and `npm run build` runs `npm run test:design`.
- `deferred-items.md` carries finding 1's out-of-scope half. `row-card.tsx`'s comment points at it, so the file had to exist for that pointer to be true.

---

**Total deviations:** 5 (1 bug with a real product consequence, 1 blocking gate update, 2 plan-vs-tree corrections, 1 out-of-scope-file edit)
**Impact on plan:** No scope creep, no package installed (`git diff --stat package.json` empty), no vendored primitive edited, no registry block fetched. Finding 1 is the one that mattered: it turned a comment the plan asked for into a measured fact, and surfaced a live 32px-per-row shift on three shipped routes.

## Issues Encountered

- **The plan's `<verification>` block still carries `ls drizzle/ | tail -1`**, which returns `meta`. Used `ls drizzle/*.sql | tail -1` → `drizzle/0025_audit_resolved_by.sql` (plan 11-02's recorded correction). **GATE-06 intact — no migration added.**
- **`npm run build` deletes `.next/static/` on each run**, so a stylesheet path captured from one build is gone by the next. The Chromium measurement was re-run against `.next/dev/static/chunks/src_app_globals_css_*.single.css`, which carries the same compiled utilities; both stylesheets were checked to contain the same `.py-4` / `.p-4` / `.size-12` declarations before the measurement was trusted.
- **A hand-written class list is NOT a valid fixture for a merge question.** The first measurement reported 112px for *both* shapes, because the fixture wrote `py-4 … py-0` and CSS order made `py-4` win. The component never sees that string — `cn()` deletes the loser before it reaches the DOM. The fixture was rebuilt on the repo's real `cn()` (clsx + the same `extendTailwindMerge` registration) and the two shapes then separated correctly. Recorded because the wrong answer looked entirely plausible.
- **Plan 11-04 committed to `.github/workflows/ci.yml` concurrently** (`3f41286`, interleaved between this plan's commits). That file was never staged or touched here; every commit staged files by name.
- **Nothing else.** No package installed, no config touched, no vendored primitive forked, `vitest.design.config.ts` unmodified.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (after each task) |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `npm run test:design` | **27 files / 496 tests passed** — unchanged, as expected: this plan adds components, not gates |
| `npm run build` | exit 0, three times (after Tasks 1, 2 and 3) |
| `git status --short src/components/ui/` | empty — T-11-FORK holds, zero vendored files edited |
| `git diff --stat package.json` | empty — T-11-SC, zero packages |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `grep -c "lg:top-20" panel-card.tsx` / `"lg:top-8"` | `1` / `0` |
| AST: directive prologue, all 4 files | `[]`, `[]`, `[]`, `[]` — raw grep for `use client` says `1, 0, 0, 0` |
| AST: domain imports (`@/lib/{booking,payments,listing,group,search,availability}`), all 4 | `[]` × 4 |
| AST: `data-testid` JSX attributes, all 4 | `["result-card"]`, `["row-card"]`, `["panel-card"]`, `["page-header"]` |
| AST: `ring-offset` in `row-card.tsx` class strings | `[]` — raw grep says `4` |
| AST: `shadow-` in `panel-card.tsx` class strings | `[]` — raw grep says `3` |
| AST: overlay-link string vs `booking-row.tsx:79` | byte-identical `true` |
| AST: `actions` inside the `<Link>` subtree | `false` — they are siblings |
| Probe positive control (synthetic offender) | every check fired: prologue `["use client"]`, domain import, 2 testids, `shadow-md` |
| Chromium 1223, compiled stylesheet, 640px | shipped row shell **112px** · `py-0` row shell **80px** |
| Emitted CSS: `@container (min-width:24rem)` / `not (min-width:20rem)` | both present, correct declarations, ordered after the base `.px-4`/`.py-4` |
| Watched red: `OVERLAY_INVENTORY` | `expected 13 to be 12` + map diff naming `result-card.tsx` → fixed → 53 passed |
| Watched red: `STICKY_INVENTORY` | `expected { …(6) } to deeply equal { …(5) }` naming `row-card.tsx` → fixed → 53 passed |

## Known Stubs

None. All four components are complete as declared — every prop in the UI-SPEC's four tables is implemented, and nothing is a placeholder.

One state worth naming so it is not mistaken for coverage: **no surface composes any of these four yet.** They are declared, typed, gated and unrendered — the same shape 11-02's 17 ids and 11-07's three skeletons are in, and for the same reason (the adopting plans are 11-09 onwards, and Phase 12 is sequenced first among {12,13,14,15} precisely so a wrong pattern is cheap to learn). Concretely: DS-11's second clause is untouched, the two elevation/z inventory rows added here are duplicates-until-adoption, and nothing has yet exercised the container queries at a real width — plan 11-21's Playwright pass is the first thing that will.

## Deferred Issues

- **Every shipped row card renders 112px while its skeleton shimmers 80px**, on `(app)/bookings`, `(host)/host/bookings` and `(host)/host/requests`. Measured, written up with both numbers and the `cn()` fixture caveat, and logged to `deferred-items.md` under `[11-08]`. **Not fixed here on purpose:** changing a shipped row's height is a visible change that belongs in the commit that swaps the route onto the pattern, and this plan adopts nothing. It is a pure win at adoption — rows shrink to the number the skeleton already draws — but re-measure, because `RowCard`'s `actions` slot adds a row and 80px is the resting height only.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. Every registered threat is disposed as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-11-CLIENTCREEP | mitigate | Four Server Components, zero directive prologues and zero domain imports, verified over the AST per file and by `npm run build`'s boundary enforcement. `ui/aspect-ratio.tsx` is a client component and rendering one from a server component moves the boundary for the Radix box only — stated in `result-card.tsx`'s header so it is not mistaken for a leak |
| T-11-FORK | mitigate | `git status --short src/components/ui/` empty across all three commits; the three card patterns reach `Card`/`CardContent`/`CardFooter` through `className` alone |
| T-11-FOCUSLOSS | mitigate | `ResultCard`'s recipe is byte-identical to `search-result-card.tsx:174` including `focus-visible:ring-offset-background`, comment carried across; `RowCard`'s offset-less overlay form is byte-identical to `booking-row.tsx:79` and carries its 7.46 / 7.36 justification. `focus-recipe.test.ts` green with both files in tree |
| T-11-STICKYTUCK | mitigate | `lg:top-20` is encoded in `PanelCard`'s `sticky` prop with its 64 + 16 derivation, and the general rule is stated once in that file |
| T-11-SC | mitigate | Zero packages; `git diff --stat package.json` empty; `components.json` untouched |
| T-11-GEODRIFT | *found and mitigated for the pattern layer* | Not registered against this plan, but finding 1 is exactly it: a declared measurement that no rendered surface matched. The pattern now matches it; the shipped surfaces are handed to the adoption plans in writing |

## Next Phase Readiness

- **Plan 11-09 is unblocked and should read `panel-card.tsx` first.** `empty-state` and `error-state` are state panels; `PanelCard` is the box they sit in or beside, and its `tone="muted"` is the treatment 11-15's legal placeholder notice needs. The `py-0` composition is the thing to copy, not the thing to re-derive.
- **Plan 11-10 owns the number `PanelCard` already encodes.** The header is `h-14 sm:h-16`; `lg:top-20` assumes 64px + 16px. If the shell's height ever moves, `panel-card.tsx`'s comment is where the dependency is written down, and it is the only place in `src/` that states the rule.
- **Plan 11-12 (and every adoption plan) inherits two temporary inventory rows.** `OVERLAY_INVENTORY`'s `result-card.tsx` row and `STICKY_INVENTORY`'s `row-card.tsx` row are *additions* only while the shipped analogs still exist. Swapping `search-result-card.tsx` onto `ResultCard` should DELETE its inventory row and drop the named total back to 12; swapping the two booking rows onto `RowCard` drops sticky back to 11. Both docblocks say so, so the adoption plan does not have to rediscover it.
- **Plan 11-21 has the first thing worth photographing.** Nothing in this plan proves a pixel: the container queries are verified as *emitted CSS in the right order*, not as a rendered card at three widths, and the 80px row is measured in a synthetic fixture rather than in the app. The ±2px comparison in both themes is what closes that.
- **Plan 11-22's forward direction gained four ids.** `src/` now carries 7 of `selector-contract.ts`'s 17 (`skeleton-card-grid`, `skeleton-row-list`, `skeleton-panel`, `result-card`, `row-card`, `panel-card`, `page-header`). The remaining 10 name plans 11-06, 11-09, 11-10, 11-14 and 11-15 as their owners.
- **A caution for the first adopter of `ResultCard`.** The price renders **last**, after every `meta` line — the UI-SPEC's prop order, not `search-result-card.tsx`'s render order, where distance and availability sit *below* the price. Adoption is therefore a visible reordering on the search grid, not a pure swap. Decide it deliberately; do not discover it in a screenshot diff.

## Self-Check: PASSED

All four created files exist on disk. All three commits (`2abb5d7`, `8949c7b`, `f957352`) resolve in `git log`. No commit deleted a tracked file (`git diff --diff-filter=D` empty for all three).

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
