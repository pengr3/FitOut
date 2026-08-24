# Phase 15 — Deferred Items

Out-of-scope discoveries logged rather than fixed. Each names the file, what is wrong, and why it
was left alone.

---

## [15-11] `visual-baselines.ts`'s head paragraph is stale by two phases

**File:** `src/lib/design/visual-baselines.ts:36-40`

The scoping-rule section reads:

> TWENTY-ONE OF THE 51 ROWS ARE BLOCKED (`global-error` for a structural reason that has nothing to
> do with data, and twenty Phase-13 rows on a credential boundary and a missing fixture), so a
> complete run commits 30 PNGs; anyone reading "51 baselines" as "51 files" is wrong by exactly
> those twenty-one, which is why the count is stated here and pinned in `surfaces.spec.ts`.

Three of those numbers have been wrong since plan 13-15 moved the inventory to 66, and plan 15-11
moved it again. Current truth: **74 declared, 38 blocked, 36 shootable.**

**Why deferred:** pre-existing drift from 13-15/14-16, not caused by plan 15-11's change; that
plan's action says *"Touch nothing else in the file"*; and the file's **canonical** arithmetic lives
in the `BaselineCountIsSeventyFour` docblock, which plan 15-11 did update in full (including the
36-shot / two-replacements split). No gate reads this paragraph — it is a comment.

**What fixing it looks like:** replace the three numbers and the parenthetical breakdown, and add
the Phase-14 and Phase-15 contributions. One paragraph, no code.

---

## [15-11] `EXPECTED_BLOCKED`'s neighbouring prose still says "ONE ENTRY AS OF PLAN 12-14"

**File:** `e2e/visual/surfaces.spec.ts` — the docblock immediately above `EXPECTED_BLOCKED`

The list has held 21 entries since plan 13-15 and 22 since 15-11. The paragraph's *argument* (a
surface joining the blocked list must do so deliberately; a surface leaving it is coverage won) is
still correct and still load-bearing — only its count is stale.

**Why deferred:** pre-existing, a comment, and the block-level notes that 13-15, 14-16 and 15-11
each added directly above their own entries already state the real per-phase counts.
