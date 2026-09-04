---
type: quick
slug: frp-lock-coral-court-as-the-single-product-theme
completed: 2026-08-23
decision: D-138
duration: ~55m
tasks: 3
commits:
  - b17265b  docs(quick-260823-frp): record D-138 where future phases will meet it
  - d3ed8c4  refactor(quick-260823-frp): drop the second theme from the baseline matrix
  - 77997dd  refactor(quick-260823-frp): fix the token-contract probe at four surfaces
files_modified:
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
  - src/lib/design/visual-baselines.ts
  - e2e/visual/surfaces.spec.ts
  - e2e/visual/theme-swap.spec.ts
  - e2e/helpers/visual-drive.ts
  - e2e/visual/surfaces.spec.ts-snapshots/ (24 PNG deletions)
---

# Coral is the theme. Grove is a probe. — Summary

D-138 is recorded in the two documents that govern future phases, the baseline matrix
drops from 95 rows to 51 court-only rows (24 grove PNGs deleted), and the surviving
token-contract probe is fixed at four surfaces that will not grow per phase.

## What changed

**The decision, written where Phase 17 will meet it.** `.planning/PROJECT.md` carries
D-138 as a new row after D-137, with Phase 10's **D-06** qualified as phase-scoped
(`10-CONTEXT.md:53`) every time it is named — PROJECT.md's own series runs down into the
low numbers, so a bare "D-06" reads as a row that does not exist. D-133 and D-135 keep
their original text; each gains a superseding clause in its **Outcome** cell only.
`.planning/ROADMAP.md` has no decisions table, so D-133/D-135 were annotated in place and
nothing was deleted: Phase 17's SC3 and the `GATE-A11Y` / `GATE-VRT` rows now describe a
single-theme audit, the Phase 17 size note records that both halves of its open question
are settled, the two THEME-02/03 invariants are marked *held and now spent*, and a new
roadmap-level invariant freezes `/dev/theme` at its 14 sections.

**The tax, removed.** 44 `theme: "grove"` rows left `VISUAL_BASELINES` and 24
`*-grove-visual-linux.png` baselines left the snapshot directory. No surface was
grove-only, so all 28 surfaces are still baselined at every width they had. The compile
gate was renamed `BaselineCountIsNinetyFive` → `BaselineCountIsFiftyOne` **in the same
edit as the rows**, which is what the file's own OBSERVED RED block demands.

**The probe, scoped.** `THEME_SWAP_SURFACES` stopped being derived (documents minus
exclusions — the thing that grew 5 → 12 → 24) and became an explicit
`as const satisfies readonly DocumentSurfaceId[]` allow-list of four plain navigations:
`search-results`, `auth-login`, `terms`, `root-not-found`. A third compile gate,
`ThemeContractSurfaceCountIsFour`, was added and **watched fail**.

## OBSERVED RED — the new compile gate, recorded verbatim

A type-level gate is the easiest kind to write in a shape that can never fail, so the
plan required this be forced rather than assumed. A fifth id was appended to
`THEME_SWAP_SURFACES`: `privacy` — the *plausible* version of the mistake, a real
unblocked document surface that genuinely re-skins and that was in the derived set until
this change.

Command: `npx tsc --noEmit`. The whole of stdout was one line:

```
src/lib/design/visual-baselines.ts(1514,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```

`EXIT=2`. Line 1513 is `export type ThemeContractSurfaceCountIsFour = Assert<` and 1514 is
its constraint, so the error is the gate and not a neighbour. Removing the fifth id
returned `npx tsc --noEmit` to **exit 0**.

The probe was run **twice**: the first run reported line 1507, then the docblock recording
it grew and moved the alias. The second run against the final text reported 1514, which is
the number now written into the file — a recorded line that points at the wrong line is the
same stale-reference failure this task exists to remove.

Its honest weakness is recorded next to it: the error names the **alias's own line**, not
the id that was appended. That is why the membership argument is spelled out in prose at
`THEME_SWAP_SURFACES` and why `theme-swap.spec.ts` pins the MEMBERS as well as the count.

## Verification

| Check | Result |
|---|---|
| `grep -c 'theme: "grove"' src/lib/design/visual-baselines.ts` | **0** |
| `grep -c 'theme: "court"' src/lib/design/visual-baselines.ts` | **51** |
| `ls e2e/visual/surfaces.spec.ts-snapshots/ \| wc -l` | **30** |
| `ls e2e/visual/surfaces.spec.ts-snapshots/ \| grep -c grove` | **0** |
| Every id in `SURFACE_IDS` still has ≥1 baseline row | **28/28, none missing** |
| `npx tsc --noEmit` | **exit 0** |
| `npm run test:design` | **48 files, 816 passed, 3 skipped** |
| `npx vitest run` | **168 files passed / 2 skipped; 1699 passed / 5 skipped; 0 failures** |
| `npm run lint` | **0 errors, 24 warnings — none in a touched file** |
| `git status` | clean; exactly **24** PNG deletions, all grove, all under the snapshots dir |
| `globals.css`, `components/theme/**`, `app/dev/theme/**`, `contrast-pairs.ts`, `tests/design/**` | **untouched** (`git diff --name-only df62a77 HEAD --` on those paths is empty) |

Measured counts were re-confirmed against HEAD before editing and every one matched the
plan: 44 grove rows, 51 court rows, 54 PNGs of which 24 grove. Nothing had to be adapted.

Task 1's `grep -c "both.\{0,3\} themes" .planning/ROADMAP.md` leaves **two** hits, both
read individually rather than trusted by count:

- **line 71** — Phase 10's completed SC4 (every colour pair clears WCAG AA under both
  themes). Correct: the two-theme contrast table is explicitly retained by D-138.
- **line 538** — the new `GATE-VRT` row, describing the probe as rendering four surfaces
  *in both themes*. Correct, and it is the plan's own prescribed wording: the probe is the
  half D-138 keeps. A count-only gate would flag this hit; reading it clears it.

The three commands the plan forbids were not run: no `--project=visual`, no
`--update-snapshots`, no visual suite anywhere. The 30 court baselines on disk are
byte-identical to HEAD — nothing here alters a rendered court pixel, so no re-mint is owed.

## Deviations from plan

All are stale-reason corrections created by this change. This repository's stated rule —
"a stated reason that has quietly become false is worse than no reason" — is the plan's own
argument for six of its steps; these are the same class, found in places the plan did not
enumerate. No behaviour changed in any of them.

**1. [Rule 1 — stale reason] The alias rename orphaned two references in `visual-baselines.ts`'s file header.**
- **Found during:** Task 2.
- **Issue:** The header named `BaselineCountIsFiftyThree` — already stale at HEAD, where the
  alias read `BaselineCountIsNinetyFive` — and stated "ONE OF THE 53 ROWS IS STILL BLOCKED …
  a complete run commits 52 PNGs". After the rename it pointed at a symbol that does not exist.
- **Fix:** Header now names `BaselineCountIsFiftyOne` and states 21 of 51 blocked / 30 PNGs.
  Also updated "the two counts" → "the three counts" for the new alias.
- **Commit:** d3ed8c4, 77997dd.

**2. [Rule 1 — stale reason] Twenty-five per-section row counts and two block headers inside `VISUAL_BASELINES`.**
- **Found during:** Task 2.
- **Issue:** Section comments carry counts (`/terms and /privacy — 12`), and the PHASE 12 /
  PHASE 13 block headers state row totals and argue from the court/grove *pair*. Halving the
  rows falsified all of them.
- **Fix:** Every section count recomputed (17 + 13 + 21 = 51, matching the restated
  arithmetic block). The PHASE 12 header's identical-content argument is not deleted but
  **relocated**: it now explains why the contract set is four plain navigations, and records
  that the drive serialization is about two runs of one row agreeing across time — which one
  theme needs exactly as much as two did.
- **Commit:** d3ed8c4.

**3. [Rule 1 — stale reason] `receipt-print`'s surviving court row claimed the theme-swap smoke covers it.**
- **Found during:** Task 3.
- **Issue:** Its `why` read "The theme-swap smoke still applies (D-135)". Under D-138 the smoke
  compares four surfaces and `receipt-print` is not one — a court row asserting coverage it no
  longer has.
- **Fix:** Rewritten to keep the durable observation (print is where a fill-based theme signal
  disappears and only type scale and radius carry it) and to state plainly that the surface is
  NOT in the contract set.
- **Commit:** d3ed8c4.

**4. [Rule 1 — stale reason] `SERIAL_SURFACES`' doc comment in `e2e/helpers/visual-drive.ts`.**
- **Found during:** Task 2.
- **Issue:** It read "`collision-notice`'s two rows share one window … court's conflict has to be
  gone before **grove's** drive loads." One row remains and there is no grove drive.
- **Deliberate partial override of the plan**, which listed this file as out of scope. The plan's
  instruction is that `SERIAL_SURFACES`, the slot-allocation table and `swapWidthFor` **stay** —
  none of them was touched. Only the comment changed, and the correction preserves the argument
  rather than unwinding it: the claim was never "these two rows race", it was "this surface
  mutates a window the fixture owns", which is true of one row and of any width added later.
  `git diff` on this file is comment-only.
- **Commit:** d3ed8c4.

**5. [Rule 1 — stale reason] Six in-body comments in `theme-swap.spec.ts` that argued from a set of 24.**
- **Found during:** Task 3.
- **Issue:** The `describe` title claimed "every baselined surface"; the `"swap"` lane, the
  `finally` cleanup, the capture-mode branch and the timeout comment all argued from driven
  surfaces that are no longer compared; the ONE-WIDTH bullet pointed at `listing-sheet`'s 375px
  branch as live; and the "bytes differ is the weakest statement" bullet pointed at a committed
  court/grove baseline pair as its strong version — a pair that no longer exists.
- **Fix:** Each rewritten to say what is true now, with the superseded reason kept on the record.
  **The code they annotate is unchanged** — the plan's step 6 list (positive control, byte-length
  checks, equality assertion and its diagnosis, fresh-context-per-theme, exclusion checks,
  `swapWidthFor`) is intact.
- **Commit:** 77997dd.

## What this change costs, stated rather than left to be discovered

Recorded in three places in the code (`visual-baselines.ts` NOT COVERED, `surfaces.spec.ts`
NOT COVERED, `theme-swap.spec.ts` NOT COVERED) so a future reader meets it at the gate:

- **Twenty-three document surfaces now have no two-theme check at all.** A hard-coded colour on
  one of them is caught by the DS-13 leak gate if the file is inside its scanned tree and by
  **nothing** if it is not. That is the trade D-138 accepted.
- **"The bytes differ" no longer has a strong version behind it.** The committed baseline pair a
  human once read is gone, so the four surfaces' one-pixel claim is the whole automated statement.
  They were chosen to move colour, type scale, radius and elevation between them.
- **`search-results` depends on the seeded fixture** (`VRT_ORIGIN`). Unseeded, the reachability
  hook fails loudly rather than comparing two empty grids — the same vacuity in a new place.

## Known stubs

None. Two code paths are deliberately **unreached rather than stubbed**, both argued at the site:
`swapWidthFor`'s 375px branch (`listing-sheet` is not in the contract four) and `drive.cleanup`
in `theme-swap.spec.ts` (the four are plain navigations with no cleanup). Both are generic,
correct, and become live the moment a driven surface is argued into the set — which is why
removing them would cost more than keeping them.

## Not done, by instruction

No Playwright `visual` project run, no `--update-snapshots`, no baseline regeneration. Nothing
in this change alters a rendered court pixel, so no re-mint is owed and a dispatch would only
risk minting from a different tree. Phase 17 itself is untouched — this changed only what it
will be *asked* to do.

## Self-Check: PASSED

- `.planning/quick/260823-frp-lock-coral-court-as-the-single-product-t/260823-frp-SUMMARY.md` — created
- `src/lib/design/visual-baselines.ts` contains `BaselineCountIsFiftyOne` — FOUND
- `src/lib/design/visual-baselines.ts` contains `ThemeContractSurfaceCountIsFour` — FOUND
- `e2e/visual/theme-swap.spec.ts` contains `EXPECTED_COMPARED` — FOUND (4 occurrences)
- `e2e/visual/theme-swap.spec.ts` still asserts `["court", "grove"]` and `court.buffer.equals(grove.buffer)` — FOUND
- Commits `b17265b`, `d3ed8c4`, `77997dd` — all FOUND in `git log`
