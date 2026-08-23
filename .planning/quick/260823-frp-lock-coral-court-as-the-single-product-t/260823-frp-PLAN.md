---
type: quick
slug: frp-lock-coral-court-as-the-single-product-theme
created: 2026-08-23
decision: D-138
files_modified:
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
  - src/lib/design/visual-baselines.ts
  - e2e/visual/surfaces.spec.ts
  - e2e/visual/theme-swap.spec.ts
  - e2e/visual/surfaces.spec.ts-snapshots/ (24 PNG deletions)
must_haves:
  truths:
    - "PROJECT.md carries D-138: court is the single product theme, grove is a token-contract probe."
    - "ROADMAP's Phase 17 scope, GATE-A11Y and GATE-VRT describe a single-theme audit, and the prose that argued for a two-theme sweep is annotated as superseded rather than deleted."
    - "`VISUAL_BASELINES` declares 51 court rows and no grove row; 30 baseline PNGs remain on disk."
    - "`e2e/visual/theme-swap.spec.ts` still exists and still compares court against grove, on a fixed set of four surfaces that does not grow per phase."
    - "The grove `[data-theme]` block, the THEMES tuple, the `?theme=` path, `/dev/theme` and every court token value are untouched."
  artifacts:
    - path: "src/lib/design/visual-baselines.ts"
      provides: "51-row court-only matrix + the fixed four-surface theme contract set"
      contains: "BaselineCountIsFiftyOne"
    - path: "e2e/visual/theme-swap.spec.ts"
      provides: "the surviving token-contract probe, scoped and capped"
  key_links:
    - from: "src/lib/design/visual-baselines.ts"
      to: "e2e/visual/theme-swap.spec.ts"
      via: "THEME_SWAP_SURFACES pinned against EXPECTED_COMPARED"
      pattern: "EXPECTED_COMPARED"
---

# Coral is the theme. Grove is a probe.

## Why

**This is a PM decision already taken. Nothing below re-opens it.** The work is mechanical: carry the
decision into the two documents that govern future phases, then stop paying for it in the
verification layer.

The decision: **`court` (coral) is FitOut's single product theme.** `grove` is demoted from
"candidate brand direction" to **token-contract probe** — it exists only to make a hard-coded colour
fail a test, and is never a shippable brand direction.

**It costs nothing today, because no user can reach grove and none ever could.**
`src/components/theme/theme-provider.tsx:58-66` mounts `next-themes` with `enableSystem={false}` and
`defaultTheme` fixed to `court`, and no runtime switcher ships (Phase 10's **D-06**,
`.planning/phases/10-design-system-foundation-theme-runtime/10-CONTEXT.md:53`). Grove is reachable
only via `?theme=` outside production or a Playwright `localStorage` seed. So there is **zero
user-facing dual-theme work to cancel** — the whole two-theme cost sits in the verification layer.

**Where the cost actually is.** `e2e/visual/surfaces.spec.ts-snapshots/` holds **54** committed
baselines: **24 grove, 30 court** (three of the court ones are the court-only `/dev/theme` rows).
Every UI change re-shoots both sets, in a dispatch job on a pinned Linux image. That is the single
largest recurring tax in the milestone, and it buys a proof a much smaller sample already gives.

**What must survive, and why.** `e2e/visual/theme-swap.spec.ts` is the **only** automated detector of
a hard-coded colour anywhere in the repository. Its own header states the case (lines 18-27): the
leak gate cannot see a file outside its scanned tree, `theme-tokens.test.ts` proves the two blocks
declare the same names, `contrast.test.ts` proves the declared pairs are legible — none of them can
see a *surface* built with a colour the theme cannot reach. Rendering the page twice and diffing the
bytes is the only instrument that notices. It also takes **no stored baseline**, so it costs nothing
per UI change. It stays.

## Hard constraints — do not do any of these

These are load-bearing for the probe that survives. A change here is a plan violation, not a judgement call.

- **Do NOT** delete or edit the `[data-theme="grove"]` block in `src/app/globals.css`.
- **Do NOT** remove `src/components/theme/theme-provider.tsx`, the `THEMES` tuple, or the `?theme=`
  override path (`src/components/theme/theme-query-param.tsx`).
- **Do NOT** delete the `/dev/theme` route or any of its existing sections.
- **Do NOT** change any `court` token value. Coral stays exactly as derived
  (`--brand: oklch(0.58 0.208 25)`, 4.57:1 against `--brand-foreground`).
- **Do NOT** touch `tests/design/theme-tokens.test.ts`, the grove rows in `tests/design/contrast.test.ts`,
  or `src/lib/design/contrast-pairs.ts`. These are millisecond vitest checks and are precisely what
  stops a token being declared in one block only. They are the cheap half of the probe.
- **Do NOT** run the full Playwright visual suite. Baselines are regenerable only in the pinned Linux
  image (D-27/D-29) and this machine is Windows; `playwright.config.ts` does not even construct the
  `visual` project here.

---

## Task 1: record the decision where future phases will meet it

**Files:** `.planning/PROJECT.md`, `.planning/ROADMAP.md`

### 1a — `.planning/PROJECT.md`, Key Decisions table (starts line 116)

The highest decision in the table is **D-137**; the next free number is **D-138**. Append this row in
the table's existing three-column shape (`Decision | Rationale | Outcome`):

> | **D-138 — `court` (coral) is FitOut's SINGLE product theme; `grove` is demoted from candidate brand direction to token-contract PROBE.** Grove is never shippable and is never presented as a brand option. It exists only so a hard-coded colour fails a test, and the proof it carries is now three cheap things: the 24-name key-set parity check (`tests/design/theme-tokens.test.ts`), the two-theme contrast table (`contrast-pairs.ts` + `contrast.test.ts`), and ONE fixed contract spec (`e2e/visual/theme-swap.spec.ts`) that renders four representative surfaces in both themes and requires the frames to differ. **Supersedes the two-theme posture of D-133 and the "two-theme screenshots of a surface" half of D-135 / GATE-VRT.** | It costs nothing today and ends a recurring tax. Phase 10's **D-06** (`10-CONTEXT.md:53` — a PHASE-scoped decision, not a row in this table) already means no user can reach grove: the provider mounts with `enableSystem: false` and `defaultTheme: "court"` and no runtime switcher ships, so grove is reachable only via `?theme=` outside production or a Playwright `localStorage` seed. The entire two-theme cost therefore sat in the verification layer, where it was real — 24 of 54 committed baseline PNGs were grove, and every UI change re-shot both sets in the pinned image. **D-128**'s one token contract is what grove actually enforces, and that enforcement does not need every surface: it needs a fixed sample large enough to move colour, type scale, radius and elevation. | **Adopted — PM decision, 2026-08-23** |

Two precision requirements on that row, both because a stale or ambiguous reference is worse than none:

1. **D-06 must be qualified as phase-scoped every time it is named in PROJECT.md.** PROJECT.md's own
   series runs down into the low numbers (`D-20`, `D-21` are rows in this very table). An unqualified
   "D-06" in this file reads as a row that does not exist. Spell it as *Phase 10's D-06
   (`10-CONTEXT.md:53`)*.
2. Do **not** edit the D-133 or D-135 rows' text. Add a short superseding clause to each row's
   **Outcome** cell only — `**Superseded in part by D-138 (2026-08-23)**` for D-133 (the theme count
   is still two; what changed is what the second one *is*), and for D-135 name specifically that its
   VR-fail-open half stands untouched and only its two-theme-screenshot half moves. D-135's fail-open
   fix is Phase 11's shipped work and nothing here weakens it.

### 1b — `.planning/ROADMAP.md`

ROADMAP carries **no decisions table** — D-133 and D-135 appear as prose. Annotate in place; delete
nothing. **Anchor every edit on the quoted text, not on the line number** — the numbers below are from
HEAD and shift as you edit.

| Where (HEAD line) | Text to find | What to do |
|---|---|---|
| 141 | *"**THEME-02/03 ship HERE, not in the audit.** … (D-133; 4-of-4 researcher convergence)"* | Append, in italics: the invariant **held** — grove shipped in Phase 10 and that is what made the token contract checkable at all. D-138 (2026-08-23) changes grove's STATUS *after* that, not what this completed phase did. |
| 143 | *"the theme count is two (D-133)"* | Append, in italics: D-133's count still stands at two — **D-138 changes what the second one IS, not how many there are.** |
| 483 (Phase 17 SC3) | *"an automated axe pass green in **both** themes, the full baseline set regenerated in the pinned image"* | Rewrite to a single-theme audit: the axe pass is green in the product theme (`court`), and the **court** baseline set is regenerated in the pinned image. Add the citation: *(D-138 — single-theme axe pass, single-theme baselines; the token contract is proved by the fixed four-surface probe, not by a second full sweep.)* Leave the rest of the criterion (keyboard, focus, leak tests → blocking) untouched. |
| 489 (Phase 17 "Size note") | the whole note | It currently poses "if the second theme really did ship" as an open question and argues the phase could become a rewrite. Both halves are now settled: the second theme **did** ship and the gates **could** fail from Phase 11 onward, so this is an audit. Restate it that way and add that D-138 halves it again — court-only axe pass, court-only sweep, and a fixed four-surface contract spec in place of a second full sweep. Do not delete the audit-vs-rewrite argument; it is the reason the ordering invariants exist. |
| 534 (`GATE-A11Y` row) | *"WCAG AA contrast, in **both** themes"* | → keyboard operability + visible focus + WCAG AA contrast **in the single product theme (`court`)**. State that grove's declared pairs remain in `contrast.test.ts` as the token-contract check — the axe *pass* is court-only, the contrast *table* is not. Source column → `D-131 + D-138`. |
| 536 (`GATE-VRT` row) | *"plus a theme-swap smoke: two-theme screenshots of a surface that are **identical** mean that surface ignored the tokens"* | Baselines are **court only**, still generated only in the pinned Linux image. Reword the proof so it is **the fixed contract spec** rather than "two-theme screenshots of a surface": `e2e/visual/theme-swap.spec.ts` renders a **fixed set of four** representative surfaces in both themes and requires the frames to differ; identical frames mean that surface ignored the tokens. Add: **the set is fixed by D-138 and does not grow per phase.** Source column → `D-131 + D-135 + D-138`. |
| 551 (ordering invariant 2) | *"**THEME-02/03 (the second theme) ship in the SAME phase as the first.** — 4 of 4 researchers"* | Keep the invariant and its provenance; append that it **held and is now spent**: grove shipped in Phase 10, which is what made the contract checkable. Under D-138 no later phase owes grove a baseline, an axe pass or a surface. |

Then **add one bullet to `## Roadmap-level invariants`** (the section that already holds D-130, D-127,
D-129), recording the `/dev/theme` convention:

> - **`/dev/theme` is frozen at its 14 sections (D-138).** It is a comparison harness, not a
>   documentation surface, and **no phase adds a new section to it.** Its three court baselines pin
>   the pattern layer; the four-surface contract set in `e2e/visual/theme-swap.spec.ts` is likewise
>   fixed. A phase that believes it needs a fifth contract surface is making a claim that the four
>   cannot reach a token family — that is an amendment to D-138 argued in prose, never a row appended.

**Verify (Task 1):**

- `grep -n "D-138" .planning/PROJECT.md .planning/ROADMAP.md` — present in both.
- `grep -c "both.\{0,3\} themes" .planning/ROADMAP.md` — every surviving hit is inside Phase 10's or
  Phase 11's completed record, never inside Phase 17 or the gates table. Read each hit; do not trust
  the count alone.
- D-133 and D-135's original text is intact in PROJECT.md (`git diff` shows added clauses only, no
  deletions inside those two rows).

---

## Task 2: drop grove from the baseline matrix

**Files:** `src/lib/design/visual-baselines.ts`, `e2e/visual/surfaces.spec.ts`,
`e2e/visual/surfaces.spec.ts-snapshots/` (deletions)

**Read first:** `src/lib/design/visual-baselines.ts:40-66` (why the compile gates exist rather than
tests) and `:1740-1800` (the arithmetic block and the two aliases). The counts in this file are
compile-checked on every machine precisely because the `visual` Playwright project is not constructed
off Linux — the numbers below are all load-bearing.

**Measured at HEAD, so you are not deriving them from scratch:** `VISUAL_BASELINES` holds **95** rows —
**51 court, 44 grove**. **No surface is grove-only**, so dropping every grove row leaves every one of
the 28 surfaces still baselined. 24 grove PNGs are on disk (`*-grove-visual-linux.png`); the other 20
grove rows belong to blocked surfaces and shoot nothing. Re-confirm these before editing; if any
number disagrees, stop and report rather than adjusting the plan's arithmetic to match.

1. **Delete every `theme: "grove"` row from `VISUAL_BASELINES`.** 44 rows. Where a surface's grove row
   carried a `why` that documented something the court row does not (several say "second theme at
   desktop" — those carry nothing), no rescue is needed; where one carries a real observation (e.g.
   `collision-notice`'s grove row notes the tone comes from `status-tones.ts` rather than a literal),
   fold that sentence into the surviving court row's `why` rather than losing it.
2. **Move the compile gate.** `BaselineCountIsNinetyFive` (line 1784) → **`BaselineCountIsFiftyOne`**,
   constraint `extends 51`. The alias name carries the number **on purpose** and this file has an
   OBSERVED RED entry for exactly the stale-name failure (`:1770-1783`) — rename in the same edit as
   the rows, never after.
3. **Restate the arithmetic prose above that alias** (the `27 + 26 + 42 = 95` block). It becomes the
   court-only totals summing to 51, and the two "a complete run commits 54 PNGs" claims — one in that
   block, one in the `NOT COVERED` bullet that begins *"FORTY-ONE OF THE 95 ARE BLOCKED"* — become
   **21 of the 51 rows blocked, so a complete run commits 30 PNGs.** Add one sentence naming D-138 as
   why the second theme's rows are gone, so a reader meeting a 51 that used to be 95 finds the reason
   at the number rather than in a commit message.
4. **`e2e/visual/surfaces.spec.ts`:** `EXPECTED_BASELINE_COUNT` (line 204) `95` → `51`, and its
   docstring's "three UI-SPECs declare 95 baselines" restated. `EXPECTED_BLOCKED` is a set of
   *surfaces*, not rows — it does **not** change.
5. **Keep the in-test theme assertion working.** Lines 351-357 assert `<html>` really carries
   `row.theme`. Do **not** weaken, condition or delete it: its whole point is that a seeding
   regression (renamed storage key, a `forcedTheme` prop, a provider that stopped mounting) would
   otherwise re-shoot every baseline under the wrong theme with nothing noticing. It is *more*
   load-bearing now, not less, because the court/grove pair is no longer there to disagree. Its
   failure message names grove ("Every \"grove\" baseline in this file…") — rewrite the message to the
   court-only claim so it does not send a reader after a file that no longer exists.
6. **Fix the two stale claims the drop creates** in `surfaces.spec.ts` — this repository's own rule is
   that a stated reason that has quietly become false is worse than no reason:
   - The serial describe title (line 398) and the `SERIAL_SURFACES` comment above it say
     `collision-notice`'s **two** rows share one booking window. One row remains. Restate the title
     and the reason; **leave `SERIAL_SURFACES` in `e2e/helpers/visual-drive.ts` alone** — the
     registration machinery is still correct with one row and the slot-allocation argument still
     binds the `"swap"` lane.
   - The `finally`-cleanup rationale (lines 371-376) argues the cleanup exists so court's inserted
     conflict is gone before **grove's** drive runs. **Keep the `finally`** — a failed drive must not
     leave a conflict row behind for the next run or for the contract spec's own lane — and rewrite
     the reason to say that instead.
7. **Delete the 24 grove baselines:**
   `git rm e2e/visual/surfaces.spec.ts-snapshots/*-grove-visual-linux.png` (24 files). Confirm 30
   remain and that none of them matches `grove`.

**Verify (Task 2):**

- `grep -c 'theme: "grove"' src/lib/design/visual-baselines.ts` → **0**. (Do not write that exact
  literal into any comment you add, or this gate stops meaning anything.)
- `grep -c 'theme: "court"' src/lib/design/visual-baselines.ts` → **51**.
- `ls e2e/visual/surfaces.spec.ts-snapshots/ | wc -l` → **30**; `| grep -c grove` → **0**.
- Every surface still has at least one row: no id in `SURFACE_IDS` is absent from `VISUAL_BASELINES`.
  A surface that silently lost its last row is a baseline that stopped existing — the exact failure
  this module is built around.
- `npx tsc --noEmit` exit **0**. This is what proves the edited Playwright specs still typecheck:
  `tsconfig.json` includes `**/*.ts` and excludes only `node_modules`, so `e2e/**` is in the program.
  It is also what fires `BaselineCountIsFiftyOne`. **If it reports errors in files you did not touch,
  clear stale `.next/dev/types` and re-run before believing them** — `.next/dev/types/**/*.ts` is in
  the include list and goes stale on this box.

---

## Task 3: scope the surviving probe to a fixed four

**Files:** `src/lib/design/visual-baselines.ts`, `e2e/visual/theme-swap.spec.ts`

**Read first:** `e2e/visual/theme-swap.spec.ts:18-108` (what this catches that nothing else does; the
three ways it could pass while proving nothing) and `src/lib/design/visual-baselines.ts:1680-1704`
(`THEME_SWAP_EXCLUSIONS` and its one entry).

Today `THEME_SWAP_SURFACES` (`visual-baselines.ts:1811`) is **derived** — every document surface minus
the exclusions — so the compared set grew 5 → 12 → 24 as the inventory grew, and four of the 24 mint
database rows. That growth is the thing being stopped: a set that grows with the inventory re-charges
every phase for a proof a fixed sample already gives.

**The fixed set is these four, all plain navigations — no drive, no minted row, no fixture date:**

| Surface | URL | Token families it moves |
|---|---|---|
| `search-results` | `/?lat=14.5547&lng=121.0244` | colour (result-card badges, price, brand chrome), type scale (title + price), radius (cards, badges), elevation (the result grid's cards) |
| `auth-login` | `/login` | colour (brand button + link), type scale (heading, labels), radius (inputs, buttons), elevation (the auth card, header) |
| `terms` | `/terms` | type scale (the long-form ladder — the widest type range on any surface), radius + elevation (the legal notice panel), colour (prose + notice tone) |
| `root-not-found` | `/this-path-matches-no-route-and-must-never-become-one` | the empty/error tone family, brand link, chrome — the state patterns no other surface in this set renders |

Why not the obvious candidates: **`/dev/theme` is deliberately excluded** — it renders court and grove
side by side in nested `[data-theme]` panes regardless of what is seeded, so the seeded theme paints
only the header strip and page background. A hard-coded colour inside a pattern component would show
identically in *both* panes and this probe would never see it. It is the wrong instrument for this
question despite being the surface with the most components. **`listing-detail` / `listing-lightbox` /
`listing-sheet` are excluded** because their URLs embed the fixture's `2026-09-16` collision day, which
`visual-baselines.ts`'s own NOT COVERED section records as having a shelf life — a permanent fixed set
must not carry a dated time bomb. **`checkout` and `collision-notice` are excluded** because they mint
database rows, and the probe runs each surface twice.

1. **`visual-baselines.ts` — replace the derivation with the allow-list.** `THEME_SWAP_SURFACES`
   becomes an explicit literal of the four ids, written as
   `as const satisfies readonly DocumentSurfaceId[]`. **Do not annotate it `: readonly DocumentSurfaceId[]`** —
   that widens `.length` to `number` and the count gate in step 2 silently stops working. The
   `satisfies` clause is what keeps an image id from compiling.
2. **Add a compile gate beside the existing two:** `ThemeContractSurfaceCountIsFour`, in the
   `Assert<…>` idiom already in the file. The spec's runtime pins never fire on a developer machine
   (the `visual` project is not constructed off Linux) — a type-level count is the only half of this
   that runs here, which is the argument the file's own header already makes for the other two.
3. **Keep `THEME_SWAP_EXCLUSIONS`, its single `global-error` entry and `ThemeSwapExclusionCountIsOne`
   — and rewrite the doc comment above it.** Its stated role ("documents minus these") is no longer
   the membership mechanism, and leaving that claim standing is the stale-reason failure. State what
   it is now: the recorded argument that `global-error` renders its own document and cannot be
   themed, retained because deleting an argument is not the same as it becoming false, plus the
   belt-and-braces guarantee (asserted at runtime in the spec) that it is not in the compared set.
4. **`theme-swap.spec.ts` — the pins.** `EXPECTED_COMPARED_SURFACES` (line 132) `24` → `4`;
   `EXPECTED_COMPARED` (lines 135-169) → the four ids in the same order as the source list.
   **Keep both pins.** They are two literals in two files: an edit to the source list without the
   matching edit here fails loudly, which is the entire point. This is *not* the vacuity trap 2 warns
   about — that trap is a count computed by the code under test agreeing with itself.
5. **`theme-swap.spec.ts` — the header.** Add the "deliberately fixed" statement at the top, and
   rewrite the two blocks the change falsifies:
   - The `EXPECTED_COMPARED_SURFACES` docstring's *"FIVE BECAME TWELVE … AND TWELVE BECAME
     TWENTY-FOUR … adding product surfaces to the inventory adds them to THIS smoke automatically"*
     is now the opposite of true. Replace it with: the set is an allow-list of four fixed by **D-138**
     and **does not grow per phase**; a fifth is not a row to append but a claim that the four cannot
     reach a token family, which amends D-138.
   - The `NOT COVERED` bullet added in plan 12-14 (lines 101-108) — *"Four of the twelve compared
     surfaces are STATES … two of those mint database rows"* — is no longer true of this set and the
     vacuity it warns about is gone. Say that plainly rather than deleting the paragraph, and add the
     caveat that replaces it: **`search-results` depends on the seeded fixture listings**
     (`VRT_ORIGIN`), and if the fixture is not seeded the reachability hook fails loudly rather than
     comparing two empty grids.
   - Also correct the count in the `EXPECTED_COMPARED_SURFACES` docstring's opening line ("thirteen
     document surfaces minus the one exclusion") — it was already stale at 24 and must not be left
     stale at 4.
6. **Change nothing else in this spec.** Keep the positive control that `<html>` resolved to
   `["court", "grove"]` before any byte comparison, the byte-length sanity checks, the equality
   assertion and its diagnosis message, the fresh-context-per-theme argument, and the exclusion
   checks. Keep `swapWidthFor` in `visual-drive.ts` untouched even though `listing-sheet`'s 375px
   branch is no longer reached — it is generic and correct.

**Verify (Task 3):**

- `npx tsc --noEmit` exit **0**, and the new alias is real: temporarily add a fifth id to the list,
  confirm exit **2** with `TS2344` naming `ThemeContractSurfaceCountIsFour`, restore, confirm exit 0.
  **Record the failure verbatim in the summary** — a type-level gate is the easiest kind to write in a
  shape that can never fail, and this file has three OBSERVED RED entries saying exactly that.
- `grep -n "court" e2e/visual/theme-swap.spec.ts` still shows the `["court", "grove"]` positive
  control and the byte-equality assertion — the probe still compares two themes.

---

## Verify (whole change)

Run from the repo root on this Windows box. None of it requires Playwright's `visual` project.

- `npm run test:design` — the design suite (`vitest.design.config.ts`). Must stay green, with
  **`tests/design/theme-tokens.test.ts`** (24-name key-set parity), **`tests/design/contrast.test.ts`**
  (both themes' declared pairs), `theme-nesting.test.ts`, `theme-provider.test.tsx`,
  `pair-drift.test.ts`, `token-drift.test.ts`, `gitignore-baselines.test.ts` and
  `phase13-surface-gates.test.ts` all passing. These are the checks D-138 keeps, so a red here is the
  decision being implemented wrongly, not a flake.
- `npx vitest run` — full suite green; record files/tests/failures.
- `npx tsc --noEmit` — exit 0. This is the compile-check that the edited Playwright specs are still
  valid (`e2e/**` is inside the tsconfig program) and the only thing that fires the three count
  aliases on this machine. If unrelated files error, clear stale `.next/dev/types` and re-run first.
- `npm run lint` — no new errors (12 known warnings at HEAD).
- `git status` — exactly 24 PNG deletions under `e2e/visual/surfaces.spec.ts-snapshots/`, and no
  change to `src/app/globals.css`, `src/components/theme/**`, `src/app/dev/theme/**`,
  `src/lib/design/contrast-pairs.ts` or `tests/design/`.

**Do NOT run** `npx playwright test --project=visual` (it is not constructed off Linux) and do not run
the visual suite with `--update-snapshots` anywhere. The court baselines on disk stay exactly as they
are: nothing in this change alters a rendered court pixel, so no re-mint is owed and a dispatch would
only risk minting from a different tree.

## Out of scope

- **The grove CSS block, the theme provider, the `THEMES` tuple, the `?theme=` path and `/dev/theme`.**
  All four are load-bearing for the probe that survives. Removing any of them is how this change turns
  from "stop paying a verification tax" into "delete the only detector of a hard-coded colour".
- **The court token values.** Coral is settled and derived; this change does not touch a single value.
- **`tests/design/theme-tokens.test.ts`, `tests/design/contrast.test.ts`, `src/lib/design/contrast-pairs.ts`.**
  Explicitly retained by D-138.
- **`e2e/helpers/visual-drive.ts`** beyond leaving it alone — `SERIAL_SURFACES`, the slot-allocation
  table and `swapWidthFor` all stay. Their arguments still hold and unwinding them is a separate
  question nobody has asked.
- **Executing Phase 17.** This change only edits what Phase 17 will be *asked* to do. No axe pass, no
  responsive sweep, no baseline regeneration happens here.
