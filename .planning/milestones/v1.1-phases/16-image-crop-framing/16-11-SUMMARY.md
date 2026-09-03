---
phase: 16-image-crop-framing
plan: 11
subsystem: ui
tags: [avatar, crop, profile, extraction, live-regions, design-gate, copy-contract, jsdom]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    plan: 10
    provides: "`src/components/profile/avatar-field.tsx` — the client composite this plan mounts, and its two-prop surface (`avatarUrl`, `displayName`)"
  - phase: 16-image-crop-framing
    plan: 02
    provides: "`src/lib/avatar.ts` — every `AVATAR_*` literal the new copy gate asserts against"
  - phase: 16-image-crop-framing
    plan: 07
    provides: "`AVATAR_MAX_BYTES`, and (via 16-10) `AVATAR_TOO_LARGE_MESSAGE` / `AVATAR_UPLOAD_FAILED_MESSAGE` as named exports"
  - phase: 15-auth-ui
    plan: 08
    provides: "`profile-form.tsx`'s two-`PanelCard` shape and the truthful-save machine this plan restyled AROUND rather than through (14-CONTEXT D-150)"
provides:
  - "`/profile` renders `<AvatarField />` — the field 16-10 built now has exactly one importer, and the crop flow is reachable by a person for the first time"
  - "`profile-form.tsx` is 50 lines shorter and byte-unchanged everywhere that matters: the save machine, both panels, the submit, the two regions below them and the no-`name`/unregistered-input comment"
  - "The live-region inventory reflects where the alert actually lives — one row deleted, one re-keyed alert#2 -> alert#1, `LIVE_REGION_FILES` unmoved at 28"
  - "`tests/design/profile-pass.test.tsx` walks FOUR files; the file-input and `Upload avatar` assertions are re-scoped to `avatar-field.tsx` BY NAME, plus a new assertion that the form carries no second picker"
  - "`tests/design/avatar-copy.test.tsx` — 9 cases, the exported-literal copy contract, with Δ14's two retirements asserted over every string literal under `src/`"

affects:
  - "16-12 adds CROP-03's removal control to `avatar-field.tsx`; the `REMOVAL_WORDS` assertion and case 8's destructive ban are untouched here and are its two reds"
  - "16-13 owns the real-browser stage assertions jsdom cannot make; CROP-01 is not closed until 16-15"
  - "16-14 owns `deferred-items.md` D1, the zoom slider's missing accessible name — nothing in this plan asserts that control is fine"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A comment that recorded a decision is REWRITTEN when half of it is discharged, never deleted — the replacement names which half landed, which plan owns the other, and keeps the original reason verbatim"
    - "A design gate re-scoped by an extraction names the NEW file rather than widening to 'somewhere in the tree', and the original site gains an explicit emptiness assertion so the move is a move rather than a duplication"
    - "A vacuity floor moves with the file it describes; a floor left sitting on its own measured count has silently become a census"
    - "A copy contract needs BOTH links or it is one link: the export pinned against a literal in the test file catches the contract moving, and the render compared to the export catches the component leaving the contract behind — each is blind to the other's mutation, measured"
    - "A retirement is a claim about a tree, not about a render, and it is asserted at the STRING-LITERAL level so the prose explaining the retirement is not reported as the survival"

key-files:
  created:
    - tests/design/avatar-copy.test.tsx
  modified:
    - src/app/(app)/profile/profile-form.tsx
    - src/lib/design/live-regions.ts
    - tests/design/profile-pass.test.tsx

key-decisions:
  - "The seam comment at `:119-122` was rewritten rather than deleted. It recorded ONE decision covering two requirements; CROP-01 has landed and CROP-03 has not, so the replacement says exactly that and names plan 16-12. Deleting it would have lost the reason a destructive control is still absent — which is the argument case 8 of `profile-pass.test.tsx` exists to keep true."
  - "The `fileInputs` / `Upload avatar` assertions were re-scoped to `avatar-field.tsx` BY NAME and a NEW assertion added that `profile-form.tsx` has none. A search over `src/` would have been the easy re-scope and would have stayed green the day a second picker appeared in a third file (T-16-39)."
  - "`PINNED_COPY[FORM]`'s five avatar sentences were each given a destination rather than dropped: two are still literals and moved to a `PINNED_COPY[FIELD]` entry, three are now imported constants and are pinned in `avatar-copy.test.tsx` against the export AND a real render. The note recording where each went is written AROUND the retired busy label rather than quoting it, so the note is not the last copy of the string the phase is retiring."
  - "`profile-avatar-error` was DELETED from `live-regions.ts` rather than retired or renamed. The gate's own message says 'never delete the row to make this green' — correctly, for a region that vanished. This one did not vanish; it moved, and 16-10 already declared it on its new file as `avatar-field-refusal`. The section comment records that reasoning in the module's own voice."
  - "`avatar-copy.test.tsx` never opens the crop dialog, and says so. Every sentence it drives is a pre-dialog refusal or a resting label, so none of the jsdom scaffolding the dialog needs is installed — and there is therefore nothing in this file that could be mistaken for a stage assertion."
  - "The `Saving…` pair pin was replaced by a route-scoped claim after watching it fail against SIX homes. The busy word is a repo-wide pending idiom, not a two-party contract; pinning the pair would have been this file claiming a vocabulary it does not own and would have reddened on the next unrelated form."

patterns-established:
  - "Two probes, one per link, chosen so each is INVISIBLE to the other — the finding is not that both go red, it is that neither goes red on the other's mutation, which is what makes both assertions load-bearing rather than one of them decoration"
  - "When an acceptance grep and the tree disagree, measure and record the real number with its reason; three of this plan's greps were unsatisfiable as written and all three are transcribed below rather than engineered around"

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: ~40min
completed: 2026-08-25
---

# Phase 16 Plan 11: Mount the Avatar Field Summary

**`/profile` renders the crop flow for the first time — `AvatarField` went from zero importers to one, the form around it did not move, and the three gates that went red because of it were each watched failing before they were touched.**

## Performance

- **Duration:** ~40 min (2026-08-25T12:33Z → 13:12Z)
- **Tasks:** 3 of 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- **The known stub 16-10 declared is closed.** Its SUMMARY recorded, correctly, that `grep -rn "avatar-field" src/` found no importer and that a user saw no behaviour change on `/profile`. There is one importer now, and picking a photo opens the framing dialog instead of uploading it.
- **The diff proves the form did not move.** 17 insertions and 67 deletions in `profile-form.tsx`, in six hunks of three kinds — imports, the block, and the two comments that described the block. `setSaved(true)` appears once, `Saving…` once, `Save profile` once, and `useRef` / `uploadAvatarAction` / `AvatarImage` zero times.
- **Four distinct reds, transcribed separately.** One was hidden behind another inside the same `it()` and had to be measured on its own — the exact failure mode the plan warned that "a single 'tests failed' line hides three of them" would produce.
- **A fifth red was budgeted and did not fire, which is a result.** The rendered `getByLabelText("Upload avatar")` in case (12) survived the extraction untouched: `AvatarField` mounts inside `ProfileForm` under the design config with the same single `next/navigation` stub and nothing else. Not one line of that case's setup moved, and the case's own comment now records why.
- **`avatar-copy.test.tsx` has two links and each was proved blind to the other's mutation.** Changing one character of `AVATAR_HELPER` reddens the byte pin and leaves the render comparison perfectly green — because the render reads the same constant it is compared to. Inlining a drifted sentence in the component does the opposite. A file with either half alone would report a clean contract while the page said something nobody approved.
- **Δ14's two retirements are asserted over the whole tree.** `Uploading…` and the shipped `JPG or PNG` helper are absent from every string literal in all 345 `.ts`/`.tsx` files under `src/` — walked by AST, so the paragraph explaining the retirement is not reported as the survival.

## Task Commits

Tasks 1 and 2 land in ONE commit, as Task 2's acceptance criteria require:

1. **Task 1: Replace the avatar block with one element** — `e739e39` (feat)
2. **Task 2: Re-key the live regions and move three profile-pass assertions** — `e739e39` (feat)
3. **Task 3: `tests/design/avatar-copy.test.tsx`** — `0104720` (test)

**Plan metadata:** this file (docs: complete plan).

## Files Created/Modified

- `src/app/(app)/profile/profile-form.tsx` (modified, +17/−67) — the avatar row is one `<AvatarField avatarUrl={avatarUrl} displayName={displayName} />`. Removed with it: `useRef`, the `uploadAvatarAction` import, the `Avatar`/`AvatarFallback`/`AvatarImage` import, three pieces of state (`avatarUrl`, `avatarError`, `avatarBusy`), the `onAvatarChange` handler and the `initials` derivation. `useState` stays and the save machine uses it.
- `src/lib/design/live-regions.ts` (modified, +18/−29) — `profile-avatar-error` deleted from `LIVE_REGION_IDS` and `LIVE_REGIONS`; `profile-form-error` re-keyed `at: 2` → `at: 1` with a `why` paragraph recording that its ordinal moved because a sibling left the file; the file's section comment rewritten from "THREE REGIONS" to "TWO REGIONS" with the reason the row was deleted rather than retired.
- `tests/design/profile-pass.test.tsx` (modified, +127/−21) — `FIELD` added and walked; `PINNED_COPY[FORM]` loses five avatar sentences and `PINNED_COPY[FIELD]` gains the two that are still literals; case (10)'s two assertions re-scoped and a third added; both vacuity floors for `FORM` re-measured and moved; the header's mechanism, the removal-prose paragraph and case (12) updated.
- `tests/design/avatar-copy.test.tsx` (created, 607 lines) — 9 cases: a guard-the-guard with a positive control, the export byte pins, the rendered helper, the two control labels, the four refusals driven through their real guards, Δ14's two retirements over the tree, the `Saving…` identity driven through a real pending submit, and the three reused-verbatim sentences' one-home-each check.

**`src/components/profile/avatar-field.tsx` and `src/components/profile/image-crop-dialog.tsx` are byte-unchanged** — `git diff --exit-code` over both exits 0, including after the two mutation probes were reverted.

**`tests/design/live-regions.test.tsx` was NOT modified, and that is the answer rather than an omission.** Three consecutive plans (15-09, 16-09, 16-10) hit the module's second count pin, and 16-10's SUMMARY recommended this plan declare it up front. It did not need it: this plan deletes one row and re-keys another WITHIN a file that keeps two regions, so `LIVE_REGION_FILES` stays at 28, `DECLARED_FILE_COUNT` stays at 28, and the second pin has nothing to follow. The standing rule is about the COUNT moving, not about the module being touched.

## Verification

Every command run ALONE — never two vitest processes at once, and never a vitest process beside a build.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (the 4 files this plan touched) | exit 0, no output |
| `npx vitest run tests/profile/` | **3 files / 32 passed**, exit 0 |
| `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | **26 passed**, exit 0 |
| `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts` | **13 passed**, exit 0 |
| `npx vitest run tests/design/avatar-copy.test.tsx --config vitest.design.config.ts` | **9 passed**, exit 0 |
| `npm run test:design` | **59 files / 1135 passed / 3 skipped**, exit 0 |
| `npm test` | **184 files passed / 2 skipped (186); 2089 passed / 5 skipped (2094)**, exit 0 |
| `npm run build` | exit 0 |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | **60 passed / 15 skipped**, exit 0 |
| `git diff --exit-code src/components/profile/avatar-field.tsx src/components/profile/image-crop-dialog.tsx` | exit 0 |

**The deltas against the post-wave-4 baseline, both accounted for:**

- `npm run test:design`: 58 → **59** files and 1126 → **1135** passing (+1 file, +9 tests — exactly `avatar-copy.test.tsx`'s nine cases). `live-regions.test.tsx` is still 26 and `profile-pass.test.tsx` is still 13: this plan moved what those cases READ, not how many there are.
- `npm test`: **184 files / 2089 passed, unmoved** — and that is correct rather than a missing delta. `avatar-copy.test.tsx` lives under `tests/design/**`, which `vitest.config.ts` excludes; the main config never collects it. The extraction added no main-config test and removed none.

`npm test` also printed the standing `[test-db] LEAKED WRITES` banner — 2 `public.audit` rows (`guest-email`, `notify`) escaping through the app's module-level db singleton. Pre-existing, contained by design, documented by the harness itself. Not this plan's, not touched.

**Every acceptance grep, run against the committed tree.** Three of them disagree with the plan's stated expectation; each is transcribed with its real value and its reason rather than engineered around.

| Grep | Plan expected | Actual | Note |
|---|---|---|---|
| hunk kinds in `profile-form.tsx` | 3 | **3 kinds in 6 hunks** | imports · the block (props, state, handler, JSX) · the two comments that described the block |
| `useState` in `profile-form.tsx` | "unchanged" | **6 → 3** | ⚠ unsatisfiable as written — see deviation 5 |
| `useRef\|uploadAvatarAction\|AvatarImage` | 0 | **0** | |
| `Saving…` | 1 | **1** | |
| `Save profile` | 1 | **1** | |
| `setSaved(true)` | 1 | **1** | |
| `AvatarField` in `profile-form.tsx` | ≥1 (`contains`) | **3** | header, import, call site |
| `profile-avatar-error` in `live-regions.ts` | 1 | **0** | ⚠ see deviation 3 |
| `DeclaredFileCountIsTwentyEight` | 1 | **1** | the count did NOT move |
| `avatar-field` in `live-regions.ts` | — | 11 | |
| `Uploading…` in `profile-pass.test.tsx` | 0 | **0** | |
| `JPG, PNG, or WebP, up to 5 MB. Optional.` in `profile-pass.test.tsx` | ≥1 | **0** | ⚠ see deviation 2 |
| `REMOVAL_WORDS` in `profile-pass.test.tsx` | unchanged | **4 → 4** | that assertion did not move |
| `avatar-field` in `profile-pass.test.tsx` (artifact `contains`) | ≥1 | **6** | |
| `AVATAR_HELPER` in `avatar-copy.test.tsx` (artifact `contains`) | ≥1 | **10** | |
| `toContain(` in `avatar-copy.test.tsx` | 0 | **0** | |
| `JPG or PNG, up to 5 MB. Optional.` under `src/` | 0 | **0 files** | |
| `Uploading…` under `src/` | 0 | **0 files** | |

## The watched reds, transcribed verbatim

### (1) The declared-but-absent live region

`npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` after Task 1's extraction, before `live-regions.ts` was touched — exit 1, **1 failed / 25 passed**:

```
 FAIL  tests/design/live-regions.test.tsx > SCAN 2 — every region has a row, and every row has a
 region > reports declared-but-absent and present-but-undeclared together
AssertionError: GATE-03's inventory disagrees with the tree.
  DECLARED BUT ABSENT (a row whose region is gone — usually the other half of a rename):
  profile-form-error — declared at src/app/(app)/profile/profile-form.tsx#alert#2
  src/app/(app)/profile/profile-form.tsx renders, in source order:
    :223 alert#1 <p> → profile-avatar-error
    :239 status#1 <p> → profile-save-result
```

**The most useful line is the one that did NOT fail.** The gate resolved the surviving `role="alert"` — the SAVE refusal — to the row named `profile-avatar-error`, and reported no present-but-undeclared region at all. That is `at` being an ordinal rather than a line number, seen from the inside: the remaining alert is `alert#1` and there is a row for `alert#1`, so the scan matched them and complained only about the row with no partner. A gate keyed on line numbers would have reported two mismatches and named neither correctly.

### (2) The `fileInputs` assertion emptying

`npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts` in the same state — exit 1, **2 failed / 11 passed**. First:

```
 FAIL  … > (10) the avatar block keeps its upload and has gained no removal control
AssertionError: the profile form no longer carries a hidden file input. That control IS the avatar
upload mechanism (D-09) — an absence here is a capability lost in a restyle, which is the failure
direction a ban-only gate would never notice.: expected [] to have a length of 1 but got +0
```

### (3) The `Upload avatar` `ariaLabels` assertion emptying — HIDDEN BEHIND (2)

This is the third red, and it never appeared in any run: it sits second inside case (10)'s `it()`, and two assertions in one `it()` are ordered rather than independent — the reading this file's own M1 ③ and M2 already record. It was therefore measured directly, by scanning both files with the file's real scanner and printing the result:

```
formAria       : [{ "what": "Save state", "line": 239 }]
formFileInputs : []
fieldAria      : [{ "what": "Upload avatar", "line": 268 }]
fieldFileInputs: [{ "what": "<input type=\"file\">", "line": 268 }]
```

`Upload avatar` is gone from `FORM` entirely and present exactly once in `FIELD`. Had case (10) been "fixed" by only re-scoping the first assertion, the second would have stayed pointed at an empty list and stayed green forever.

### (4) The `PINNED_COPY` mismatch

The second failure of that same run:

```
 FAIL  … > (11) every shipped profile sentence is present byte-for-byte
AssertionError: src/app/(app)/profile/profile-form.tsx no longer carries a sentence 15-UI-SPEC pins
byte-for-byte. … expected [ Array(5) ] to deeply equal []
+ [
+   "Your avatar",
+   "Upload avatar",
+   "Upload photo",
+   "Uploading…",
+   "JPG or PNG, up to 5 MB. Optional.",
+ ]
```

**Five, not the four the plan predicted.** The plan's § M11 table lists `"Upload photo"`, `"Uploading…"`, `"JPG or PNG…"` and `"Your avatar"`; `"Upload avatar"` is pinned in `PINNED_COPY[FORM]` as well as being asserted as an `ariaLabels` value in case (10), so it reddens in two places at once. Each of the five is accounted for in the note that replaced them.

### (5) The red that was budgeted and did not fire

The plan budgeted a possible red on `:1145-1156` — the RENDERED `getByLabelText("Upload avatar")` — and instructed that if the extraction broke the render, the TEST's setup be fixed rather than the component. It did not break: case (12) was among the **11 passed** in the run above, with `AvatarField` mounting inside `ProfileForm` under `vitest.design.config.ts` on the strength of the one `next/navigation` stub that was already there. The crop dialog is mounted only while a file is staged, so `react-easy-crop` is imported and never rendered. Nothing was changed; the case gained a comment recording the measurement.

### (6) `avatar-copy.test.tsx` probe P1 — the contract moves, the render does not notice

`AVATAR_HELPER`'s final full stop changed to an exclamation mark in `src/lib/avatar.ts`, nothing else touched — exit 1, **1 failed / 8 passed**:

```
 FAIL  … > (1) every avatar sentence is the byte string 16-UI-SPEC pins
AssertionError: expected 'JPG, PNG, or WebP, up to 5 MB. Option…' to be
'JPG, PNG, or WebP, up to 5 MB. Option…' // Object.is equality
Expected: "JPG, PNG, or WebP, up to 5 MB. Optional."
Received: "JPG, PNG, or WebP, up to 5 MB. Optional!"
```

Case (2), the render comparison, stayed **green** — it reads the same constant the component renders, so it agrees with itself no matter what that constant says. That is the whole argument for the byte pin existing.

### (7) `avatar-copy.test.tsx` probe P2 — the component leaves the contract behind

`{AVATAR_HELPER}` in `avatar-field.tsx` replaced by an inlined sentence one space away from it — exit 1, **1 failed / 8 passed**:

```
 FAIL  … > (2) the helper the field renders is the exported helper
AssertionError: expected 'JPG, PNG, or WebP, up to 5MB. Optiona…' to be
'JPG, PNG, or WebP, up to 5 MB. Option…' // Object.is equality
Expected: "JPG, PNG, or WebP, up to 5 MB. Optional."
Received: "JPG, PNG, or WebP, up to 5MB. Optional."
```

Case (1) stayed green. Neither probe reddens the other's assertion, which is what makes both load-bearing. Both mutations were reverted with `git checkout -- <one file>`; `git diff --exit-code src/` exits 0.

### (8) The `Saving…` pair pin, watched failing against the tree

Written as a two-home claim and run — exit 1, **1 failed / 8 passed**:

```
AssertionError: expected [ …(6) ] to deeply equal [ …(2) ]
  [
    "src/app/(app)/profile/profile-form.tsx",
+   "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
+   "src/components/availability/blocks-editor.tsx",
+   "src/components/availability/weekly-hours-editor.tsx",
+   "src/components/group/rsvp-form.tsx",
    "src/lib/avatar.ts",
  ]
```

See deviation 4.

## Decisions Made

See `key-decisions` in the frontmatter. The two worth restating in prose:

1. **A comment is deleted only when the decision it recorded is dead.** `profile-form.tsx:119-122` recorded one decision that covered two requirements. CROP-01 has landed and CROP-03 has not, so the replacement says which half is discharged, names plan 16-12 as the owner of the other half, and keeps the original sentence — *a destructive affordance shipped ahead of the action behind it is a button that lies* — verbatim. That sentence is the argument case 8 of `profile-pass.test.tsx` enforces; deleting it would have left an enforced ban with no written reason.
2. **Re-scoping a gate is where a gate quietly becomes vacuous, so the re-scope names the file.** The cheap version of this change is `fileInputs.length === 1` over `src/`. It is one word shorter and it stops being an assertion about `/profile` at all. The version shipped names `avatar-field.tsx`, and the original site gains its own assertion that it now has zero — so the extraction is provably a move rather than a duplication (T-16-39).

## Deviations from Plan

### 1. [Rule 3 - Blocking] Both vacuity floors for `FORM` were re-measured and moved, and two floors were added for `FIELD`

- **Found during:** Task 2
- **Issue:** The extraction took 8 JSX elements and 19 authored strings out of `profile-form.tsx`, measured 53 → **45** and 59 → **40**. `TEXT_FLOOR[FORM]` was 40 — so the count landed on EXACTLY its own floor, which is precisely the "element census" `profile-pass.test.tsx`'s own docblock refuses (*"Setting it AT the measured count would make it an element census that reddens on any innocuous markup addition"*). It would have passed this run and reddened on the next innocuous deletion while saying nothing about vacuity. `JSX_FLOOR[FORM]` at 40 against 45 was tight for the same reason. Adding `FIELD` to the walked set also requires both floors, because a path with no floor entry falls through to `Number.MAX_SAFE_INTEGER` and reddens immediately by design.
- **Fix:** `JSX_FLOOR[FORM]` 40 → 33 and `TEXT_FLOOR[FORM]` 40 → 30, both re-set below the new counts in the same ~70% proportion the originals were set below theirs. `JSX_FLOOR[FIELD]` 7 and `TEXT_FLOOR[FIELD]` 12, measured 10 and 18. Both docblocks record the re-measurement, the date, and why the form's floor moved.
- **Files modified:** `tests/design/profile-pass.test.tsx`
- **Verification:** 13 passed; `npm run test:design` 59 files / 1135 passed.
- **Committed in:** `e739e39`
- **Assessment: justified, and unavoidable.** A floor is a vacuity guard, not an inventory; leaving it at a number the file can no longer clear would convert it into the thing its own docblock forbids.

### 2. [Decision] `PINNED_COPY[FORM]`'s "replace with the WebP helper" instruction is not satisfiable in this gate, and the pin moved instead

- **Found during:** Task 2
- **Issue:** The plan instructs: *REPLACE `"JPG or PNG, up to 5 MB. Optional."` with `"JPG, PNG, or WebP, up to 5 MB. Optional."`*. `PINNED_COPY` asserts that a sentence is PRESENT as a string literal in a scanned file. The new helper is not a literal in any scanned file and never will be — `avatar-field.tsx` renders `{AVATAR_HELPER}` from `@/lib/avatar`, which is the whole point of rule F2. Adding it to `PINNED_COPY[FIELD]` would have reddened immediately. The same is true of `"Upload photo"`, which is now `AVATAR_UPLOAD_LABEL`.
- **Fix:** The two sentences that ARE still literals (`"Your avatar"`, `"Upload avatar"`) moved to a `PINNED_COPY[FIELD]` entry. The three that became constants are pinned in `tests/design/avatar-copy.test.tsx` instead — where each is asserted with `toBe` against a literal written out in the test file AND against a real render, which is strictly stronger than an AST presence check. A comment in `PINNED_COPY[FORM]` enumerates all five and names where each went, so no pin was dropped (T-16-40).
- **Files modified:** `tests/design/profile-pass.test.tsx`, `tests/design/avatar-copy.test.tsx`
- **Measured consequence:** `grep -c "JPG, PNG, or WebP, up to 5 MB. Optional." tests/design/profile-pass.test.tsx` returns **0**, not the ≥1 the plan's acceptance criteria expect. It returns **1** in `avatar-copy.test.tsx`, and the retired string returns **0 files** under `src/`.
- **Committed in:** `e739e39` / `0104720`
- **Assessment: justified.** The criterion was written before it was known that the helper would never be a literal in a scanned file. Satisfying it literally would have required either a red assertion or a comment contrived to make a grep count — which is the prose-versus-grep collision this tree has paid for a dozen times.

### 3. [Decision] `grep -c "profile-avatar-error"` returns 0, not the 1 the plan expects

- **Found during:** Task 2
- **Issue:** The criterion reads *"returns `1` — the `avatar-field.tsx` row only; the `profile-form.tsx` one is gone (rename the id if it collides)"*, which assumes the surviving row reuses the id. It does not: plan 16-10 named it **`avatar-field-refusal`**. There is no collision to rename around, and the id `profile-avatar-error` leaves the module entirely.
- **Fix:** The row and its `LIVE_REGION_IDS` entry deleted; the id is NOT mentioned in prose. Naming it in the section comment would have made the grep return 1 for a reason that has nothing to do with the criterion's intent, which is the collision the repo's own gotchas warn about. The history is recorded in the rewritten section comment without quoting the id, and here.
- **Files modified:** `src/lib/design/live-regions.ts`
- **Verification:** `grep -c "profile-avatar-error"` → 0 across the whole repo; `live-regions.test.tsx` 26 passed.
- **Committed in:** `e739e39`
- **Assessment: justified.** 0 is the correct answer to the question the criterion was trying to ask.

### 4. [Rule 1 - Bug in my own first draft] The `Saving…` pair pin was wrong and was replaced by a route-scoped claim

- **Found during:** Task 3
- **Issue:** The plan asks that `AVATAR_CROP_CONFIRM_BUSY` be shown byte-identical to the `Saving…` the profile submit renders. The first draft also pinned its literal HOMES as exactly `{profile-form.tsx, lib/avatar.ts}`. Watched failing against **six** — the word is also authored by `wizard.tsx`, `blocks-editor.tsx`, `weekly-hours-editor.tsx` and `rsvp-form.tsx`. It is a repo-wide pending idiom on save-shaped controls, not a two-party contract.
- **Fix:** The pair pin replaced by the claim Δ14 actually makes — the crop confirm reuses the word THIS ROUTE already renders — asserted as (a) a real pending submit driven against a never-settling action, read off the rendered button, and (b) `profile-form.tsx` authoring the literal exactly once. The red and the reasoning are transcribed in the file's own header.
- **Files modified:** `tests/design/avatar-copy.test.tsx`
- **Committed in:** `0104720`
- **Assessment: correct handling.** A pair pin would have been this file claiming ownership of a vocabulary it does not own and would have reddened on the next unrelated form — a gate somebody would then edit rather than read.

### 5. [Rule 2 - Documentation accuracy] `profile-form.tsx`'s header sentence about the avatar control was rewritten

- **Found during:** Task 1
- **Issue:** The header said *"The avatar control posts a FormData to uploadAvatarAction; both type and size are re-checked server-side (T-04-04)"*. After the extraction the file contains no such call, so a reader following that sentence into a grep finds nothing. This file's entire identity is "read the header before editing"; a header describing machinery the file no longer holds is the specific failure that identity exists to prevent.
- **Fix:** The sentence now names `<AvatarField />` and its file, states that the server-side re-check is unchanged, and restates the property `:99-103` records — that the field registers no RHF value and carries no `name`. It deliberately does not spell `uploadAvatarAction`, so the acceptance grep for the removed imports stays honest at 0.
- **Files modified:** `src/app/(app)/profile/profile-form.tsx`
- **Committed in:** `e739e39`
- **Assessment: justified, and it is the same KIND of hunk as the seam-comment rewrite the plan asks for** — a comment that described the departed block. The diff is 6 hunks of 3 kinds: imports, the block (props, state, handler, JSX), and the two comments that described the block. There is no reformat, no lint autofix and no "while I'm here".

### 6. [Recorded, not fixed] The acceptance criterion "`grep -c "useState"` is unchanged" is unsatisfiable as written

- **Found during:** Task 1
- **Issue:** Three of the file's five `useState` calls belonged to the avatar block (`avatarUrl`, `avatarError`, `avatarBusy`). The count is 6 → **3** (one import + `saved` + `formError`).
- **Fix:** None needed. The criterion's intent — that `useState` was not removed alongside `useRef`, and that the save machine still uses it — holds and is asserted from the other side by `grep -c "setSaved(true)"` → 1 and by `tests/profile/` and case (9) of `profile-pass.test.tsx` both passing.
- **Assessment: the criterion, not the tree, is what was wrong.** Recorded so a reader comparing the SUMMARY to the plan is not left wondering.

### 7. [Rule 3 - Scope] Two line-number references drifted and were deliberately NOT chased

- **Found during:** Task 1
- **Issue:** `avatar-field.tsx:26` points at `profile-form.tsx:99-103` for the no-`name`/unregistered-input reason; that comment is now at `:76-80`. `profile-pass.test.tsx`'s `REMOVAL_WORDS` docblock points at `profile-form.tsx:120-122` for the seam comment, now `:99-106`.
- **Fix:** Neither touched. The plan's verification requires `git diff --exit-code src/components/profile/avatar-field.tsx` to exit 0, and the `REMOVAL_WORDS` block is explicitly plan 16-12's to move. Both references still resolve to the right FILE and the right paragraph; only the numbers drifted, and the substance of each is unchanged.
- **Assessment: correct handling.** 16-12 edits both the seam comment's neighbourhood and `avatar-field.tsx`, and can refresh them for free.

---

**Total deviations:** 7 (1 Rule-1, 1 Rule-2, 2 Rule-3, 3 recorded decisions). **No Rule 4 events; nothing was fixed that this plan did not cause.**

**Impact on plan:** `files_modified` was accurate at 4 of 4 — the plan declared `profile-form.tsx`, `live-regions.ts`, `profile-pass.test.tsx` and `avatar-copy.test.tsx`, and those are exactly the four files touched. That is the first plan in this phase with no undeclared file, and the reason is legible: 16-10's SUMMARY recommended adding `tests/design/live-regions.test.tsx` up front, the recommendation was checked rather than assumed, and it turned out not to be needed because the declared-file COUNT did not move.

## Issues Encountered

**(a) Two assertions in one `it()` hide each other, for the third time in this file's history.** Case (10)'s `Upload avatar` red never appeared in any run because the `fileInputs` assertion above it threw first — the same reading `profile-pass.test.tsx`'s own M1 ③ and M2 already record about `titleAs` and the hand-typed shell. **Resolved** by measuring the second assertion's inputs directly with the file's real scanner and transcribing the result, rather than reporting one red and calling it two.

**(b) A vacuity floor landed exactly on its own count.** `TEXT_FLOOR[FORM]` was 40 and the post-extraction corpus measured 40. Green, and one deletion away from a red that would have taught nobody anything. **Resolved** by re-measuring and re-setting both `FORM` floors in the proportion the originals used. Worth naming because it is invisible in a green run: nothing distinguishes "the floor is comfortably below the count" from "the floor is the count" except reading the two numbers.

**(c) The plan's copy criteria assumed the phase's strings would still be literals somewhere scanned.** They are not, and cannot be without breaking rule F2 — which is the whole reason `avatar-copy.test.tsx` exists. **Resolved** by moving each affected pin to the file whose mechanism can hold it, and enumerating the destinations in a comment where the pins used to be.

## Known Stubs

**None.** This plan closes the one 16-10 declared: `AvatarField` had no importer and `/profile` still rendered the shipped block; it now renders the field. No hardcoded empty collections, no placeholder copy, no unwired props — every string the surface renders is an imported literal asserted against its export by a real render, and every callback is wired to a real implementation.

`Remove photo` and `removeAvatarAction` remain absent by design (CROP-03, plan 16-12). An absent control is not a stub; a control shipped ahead of its action would have been, and case 8 of `profile-pass.test.tsx` is the gate that keeps it that way.

## Requirements

**CROP-01 is `requirements-advanced`, not `requirements-completed`, and this time the reason is not "nothing imports it".**

CROP-01 reads: *"A user can frame and zoom their avatar before it uploads, and the server's blind face-gravity re-crop no longer re-frames what the user just chose."* Both clauses are now reachable on the running app — the mount makes the framing flow real, and `src/lib/cloudinary.ts` has carried `gravity: "center"` since D-171. But **plans 16-13, 16-14 and 16-15 all carry CROP-01 in their own `requirements` frontmatter**, and the substance behind that is real rather than bookkeeping: jsdom has no crop stage, so *"can frame and zoom"* is not yet proved by anything — no drag, no pinch, no wheel, no mask, no pixel. 16-13 is the Playwright spec that can see it, 16-14 settles the mask's styling route and the preview's byte-honesty by measurement, and **16-15 is the plan that closes it last**.

`.planning/REQUIREMENTS.md` is therefore unchanged by this plan: `[ ] CROP-01 … Pending` stands, and the traceability row stays `| CROP-01 | Phase 16 | Pending |`. Same convention 16-02, 16-07, 16-08, 16-09 and 16-10 used, on a differently-honest ground.

## Threat Flags

None. No new endpoint, auth path, file-access pattern or schema change. The plan's own register is honoured and each mitigation is checkable:

- **T-16-37** (the truthful-save machine) — the diff is three hunk kinds, `setSaved(true)` and both submit literals grep to 1, `tests/profile/` is 32 passed, case (9)'s timer ban and `Save state` name assertion are green, and `npm run build` exits 0.
- **T-16-38** (RHF values reaching `updateProfile`) — the file input still carries no `name` and is still unregistered; the comment recording why was CHECKED rather than assumed, found intact at `profile-form.tsx:76-80`, and is now also restated in the file's header and cross-referenced from `avatar-field.tsx:23-26`.
- **T-16-39** (a design gate re-scoped into vacuity) — the two assertions name `avatar-field.tsx` explicitly, the original site gained an explicit zero assertion, and no pin was dropped: all five removed sentences are enumerated with their destinations.
- **T-16-40** (a copy contract silently retired) — both Δ14 retirements are asserted over every string literal in 345 files under `src/`, with a positive control proving the walk can find a sentence at all.

## Self-Check: PASSED

- `tests/design/avatar-copy.test.tsx` — FOUND (607 lines)
- `src/app/(app)/profile/profile-form.tsx` — FOUND, and it imports `AvatarField` (3 occurrences)
- `src/lib/design/live-regions.ts` — FOUND, `profile-avatar-error` absent (0), count alias unmoved (1)
- `tests/design/profile-pass.test.tsx` — FOUND, `avatar-field` present (6), `REMOVAL_WORDS` unmoved (4)
- `.planning/phases/16-image-crop-framing/16-11-SUMMARY.md` — FOUND (this file)
- commit `e739e39` — FOUND in `git log`
- commit `0104720` — FOUND in `git log`
- `git show e739e39 --diff-filter=D --name-only` — no deletions; `git show 0104720` adds one file and deletes none
- `git diff --exit-code src/` — clean; both mutation probes reverted, `avatar-field.tsx` and `image-crop-dialog.tsx` byte-identical to `7eda958`
- `.planning/STATE.md` and `.planning/ROADMAP.md` — NOT modified by this agent, by instruction. The orchestrator is the single writer for both. `.planning/REQUIREMENTS.md` also unmodified — see Requirements above.
