---
phase: 15-auth-profile-transactional-email
plan: 09
subsystem: ui
tags: [accessibility, live-regions, design-system, ast, jsdom, auth, gates]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-07's four converted `(auth)` pages and the two regions it REMOVED; plan 15-08's `/profile` panels and its `Save state` name"
  - phase: 14-host-tooling
    provides: "`live-regions.ts` at twenty-one files with an empty exclusion list, and the count-moves-with-its-rows procedure"
  - phase: 11-shell-and-navigation
    provides: "`PanelCard` and `selector-contract.ts`'s closed `SELECTOR_IDS` union"
provides:
  - "`LIVE_REGION_FILES` 21 → 26 — the account surfaces join the audited set, with the membership rule widened rather than an exclusion discharged"
  - "seven declared rows saying what a screen reader hears, when, and which numbered rule justifies the shape"
  - "two new `AUTHOR_NAMED_REGIONS` rows; the five refusal regions stay content-named on purpose"
  - "`tests/design/auth-composition.test.tsx` — the AUTHUI-01/03 gate: page → pattern (AST) → attribute (DOM) → contract (union)"
affects: [15-11-visual-baselines, 16-crop-avatar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A four-link chain in one file — AST for what a page composes, jsdom for what the pattern renders, and the closed selector union for what that attribute is allowed to be. A source scan alone can prove the first link only"
    - "A glob written inside a block comment closes the comment. `(auth)/*/page.tsx` in a docblock produced 39 parse errors across 80 lines and named none of them"

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

requirements-completed: []
requirements-advanced: [AUTHUI-01, AUTHUI-03]

# Metrics
duration: in-progress
completed: 2026-08-24
---

# Phase 15 Plan 09: The Live-Region Inventory and the Composition Gate Summary

**The seven live regions on the four auth screens and the profile form stop being markup and become
contracts — each with the sentence a screen reader hears, the moment it hears it, and the numbered
rule that justifies its shape — and "one composition, four screens" becomes a command that exits
non-zero when it stops being true.**

> ⚠ INTERIM — written after Task 1 and refined in place. Task 2 is in progress.

## Task Commits

1. **Task 1: the seven account-surface live regions join the declared inventory** — `ba392e9` (feat)

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
compiled silently and the audited set would have grown by a quarter with nothing in the diff saying so.

`21` → `26`, alias renamed → exit 0. The red is quoted verbatim in the alias's own docblock as
OBSERVED RED (c), dated and attributed.

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
the refusal below it, so `alert#1` is the ordinal it has always had. `SCAN 2` passing is the proof:
it compares the declared key set against the regions actually present, so a wrong ordinal would have
been reported as one declared-but-absent row and one present-but-undeclared region.

**Two are author-named and five are not, and that split is the load-bearing part.** Every one of the
five alerts carries a SERVER sentence rendered verbatim — the anti-enumeration refusal, the signup
action's reason, the invalid-link sentence with its recovery, the upload constraint, the save
refusal. On the VoiceOver/Safari pairing a *named* live region can be announced by its name instead
of its content, so naming any of them would trade a specific reason for three generic words. The two
that are named have nothing to be named by: the forgot page's result replaces the form (nothing is on
the page to take a name from until a submit lands) and the profile save line is mounted only while
`saved` is true. Both got `AUTHOR_NAMED_REGIONS` rows; `SCAN 3` asserts that list in both directions,
so neither the exception nor the ban can be bypassed.

**The two removals are recorded where somebody would look for them.** The new file block carries
plan 15-07's deletions — `ResetNotice` on login and the reset page's missing-token notice — with the
rule stated rather than re-derived: *a live region announces a CHANGE; a freshly navigated page is not
a change, it is a page.* That is the third and fourth instance of the same defect in this repository
(13-14 removed six, 14-14 found a seventh). A reader looking for those two regions now finds out why
they are absent instead of concluding the inventory missed them.

**`LIVE_REGION_EXCLUSIONS` is still `[]`, and nothing was discharged to get here.** These five files
were named OUT OF SCOPE by the module's own rename note — *"what is left outside it is the auth/profile
forms…"* — which is a different thing from an exclusion. Nobody had ever decided about them, so there
was no decision to discharge. The membership rule is what widened, and it now reads: *every file in
`src/` that renders a live region on a journey this repository has audited — the demand-side journey,
the supply-side host tooling, and the account surfaces a person passes through to reach either.*

**Neither measured `aria-live` number moved, and the module says why rather than re-measuring.** All
seven new regions are bare `role="alert"` / `role="status"` on a `<p>`; not one carries the attribute.
So the AST walk still finds seven files and ten elements and the text grep still finds thirteen. This
is the one case where carrying a number forward is honest — the reason is stated and checkable in five
files.

## Verification Results (Task 1)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (run bare — the pipe-to-`tail` exit-code trap avoided) | exit 0 |
| `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | exit 0 — **26 passed** |
| `npm run test:design` | exit 0 — 52 files / **882 passed** / 3 skipped (the 15-04 baseline exactly) |

Acceptance greps: `DeclaredFileCountIsTwentySix` **1** · `DeclaredFileCountIsTwentyOne` **0** ·
`extends 26` **1** · `LIVE_REGION_EXCLUSIONS … = []` **1** · `aria-live="assertive"` **0** on every
one of the five Phase-15 surfaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The declared count is pinned in TWO files, so Task 1 could not touch one**

- **Found during:** Task 1, before the first run
- **Issue:** The plan's acceptance criterion is `git diff --name-only` listing only
  `src/lib/design/live-regions.ts`. But `tests/design/live-regions.test.tsx:258` carries
  `const DECLARED_FILE_COUNT = 21` and asserts `SCAN_FILES.length === DECLARED_FILE_COUNT`, with its
  own docblock reading: *"pinned in TWO places — `DeclaredFileCountIsTwentyOne` … fails the build, and
  this fails the gate with a message. Plans 12-12, 12-13, 13-14 and 14-14 each moved BOTH, in the same
  commit as the components they add. A set that widened in one place and not the other is exactly the
  drift T-12-06-SETDRIFT names."* The module's own alias docblock says the same: widening *"costs a
  rename, a row and a second literal in `tests/design/live-regions.test.tsx`"*. Leaving the literal at
  21 fails the gate the same plan requires to pass.
- **Fix:** Moved both in the one commit, which is the procedure both files record. `DECLARED_FILE_COUNT`
  21 → 26, both `DeclaredFileCountIsTwentyOne` references renamed, and the reason written into the
  docblock so the next reader does not re-derive it.
- **Files modified:** `tests/design/live-regions.test.tsx`
- **Commit:** `ba392e9`
- **Unmet acceptance criterion, stated plainly:** `git diff --name-only` lists **two** files for Task 1,
  not the one the plan names. Every other criterion in that task passes.

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

  This is a new instance of the phase's recurring collision — a comment that quotes the thing it
  explains breaking the mechanism that reads it (15-06 ×4, 15-07 ×3, 15-08 ×1) — arriving through the
  lexer rather than through a grep.
- **Fix:** The phrase is spelled descriptively ("the four route-group auth pages and the profile form")
  with an in-line sentence saying why the glob is not written out, and the literal paths stay at
  `LIVE_REGION_FILES` where they are code rather than prose. `booking-row.tsx:112`'s precedent.
- **Files modified:** `src/lib/design/live-regions.ts`
- **Commit:** `ba392e9` (fixed before the commit landed — the broken state was never committed)

---

## Known Stubs

None so far. No placeholder value, empty-array data source, mock or "coming soon" copy was introduced.

## Threat Flags

None so far — no new network endpoint, auth path, file access pattern or schema change.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24 (in progress)*
