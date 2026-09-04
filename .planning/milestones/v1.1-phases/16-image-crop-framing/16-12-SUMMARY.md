---
phase: 16-image-crop-framing
plan: 12
subsystem: profile
tags: [cloudinary, server-action, destructive-action, radix, focus-management, live-regions, design-gate, vitest]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    provides: "16-03's `onOpenAutoFocus` on `ResponsiveDialogProps` — and the MEASURED fact that without it Radix focuses `Remove photo` in Δ5b's footer order"
  - phase: 16-image-crop-framing
    provides: "16-07's `src/lib/cloudinary.ts` + `src/app/actions/avatar.ts` (centre gravity, the retained 400×400 fail-closed normaliser)"
  - phase: 16-image-crop-framing
    provides: "16-10's `avatar-field.tsx` (picker, four guards, staged file, crop dialog) and 16-11's mounting of it on `/profile`"
provides:
  - "`destroyAvatar(publicId)` in `src/lib/cloudinary.ts` — the twin of `destroyListingPhoto`, same CDN invalidation"
  - "`removeAvatarAction(): Promise<AvatarRemoveResult>` — session-gated, null-first, destroy best-effort, idempotent"
  - "the `Remove photo` control and its `ResponsiveDialog` confirm in `avatar-field.tsx`, with focus on `Keep photo` by mechanism"
  - "`tests/profile/avatar-remove.test.ts` — six cases against a live `fitout_test`, including a STRUCTURAL ordering assertion"
  - "the app's FIRST `variant=\"destructive\"` Button, and it is inside a confirmation"
affects: [16-13 the real-browser pass, 16.1 the orphan audit, AUTHUI-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "null-first-destroy-second: the row is made truthful before the external asset is touched, and the external call's failure never changes the action's result"
    - "structural-ordering-assertion: read the database from INSIDE the mocked downstream call, because an end state cannot tell two orders apart"
    - "one-region-two-parents: a live region written ONCE and given two possible parents, so a declared single-region file stays single"

key-files:
  created:
    - tests/profile/avatar-remove.test.ts
  modified:
    - src/lib/cloudinary.ts
    - src/app/actions/avatar.ts
    - src/components/profile/avatar-field.tsx
    - src/lib/design/live-regions.ts
    - tests/profile/avatar-field.test.tsx
    - tests/design/avatar-copy.test.tsx
    - tests/design/profile-pass.test.tsx

key-decisions:
  - "The predicted red did NOT fire in `profile-pass.test.tsx` and DID fire in `avatar-copy.test.tsx` case (3). Plan 16-11 re-scoped the removal-word assertion to `FORM` (profile-form.tsx); the control landed in the FIELD, so the form-scoped claim stayed correctly green. The declaration the file's own warning asked for was therefore made where the red actually was."
  - "The five removal literals are pinned in `avatar-copy.test.tsx`, NOT in `profile-pass.test.tsx`'s `PINNED_COPY`. `avatar-field.tsx` AUTHORS none of them (they are imported constants), and PINNED_COPY compares against the literals a file authors — pinning them there would have asserted that sentences which are not in the file are missing from it."
  - "The field's refusal region is written ONCE and given two possible parents rather than written twice. `live-regions.ts` declares this file as carrying one alert region and the gate keys regions by ordinal over the SOURCE, so a second element would be an undeclared `alert#2` regardless of whether the two could mount together."
  - "The prose in `destroyListingPhoto`'s docblock was reworded to name the CDN-invalidation option descriptively. It quoted the token, so the file's count was already 2 (one comment, one call) before this plan and adding the avatar call would have made it 3 — the acceptance criterion's `2` means two CALL SITES."
  - "`grep -c \"onCloseAutoFocus\" src/components/profile/avatar-field.tsx` is **0**, not the `1` the plan predicted. 16-10 moved the crop dialog into its own file, so that token never lived here; the invariant the criterion protected (the removal confirm does not take Radix's close-time restore over) is satisfied more strongly by 0 than by 1."
  - "`removeAvatarAction` takes NO arguments. That is the strongest available spelling of T-16-41: there is no client-supplied id to validate because there is no parameter to supply one through."
  - "The row write is wrapped and IS reported as a failure; only the destroy is silent. The one thing a person needs to hear about is a row that still points at a photo."

patterns-established:
  - "An ORDER is not observable in an end state. To assert one, observe from inside the second step — here, the mocked `destroy` reads the user row and the assertion is that the columns were ALREADY null at that instant. Watched red by swapping the two blocks."
  - "A best-effort call that swallows its own failure is invisible: the tolerance case asserts the call was ATTEMPTED (`destroySpy.mock.calls.length` incremented) as well as absorbed, because `{ ok: true }` is equally true of an action that stopped calling Cloudinary at all."
  - "For a destructive action, a negative case asserts the CALL COUNT rather than the result. `{ ok: false }` from the session gate is a value a dozen other bugs would also return; 'it destroyed nothing' is the claim worth making."

requirements-completed: [CROP-03]
requirements-advanced: [AUTHUI-02]

# Metrics
duration: 47min
completed: 2026-08-25
---

# Phase 16 Plan 12: Avatar Removal (CROP-03) Summary

**The phase's only destructive action ships with the action underneath it: both columns are nulled before Cloudinary is touched, a Cloudinary outage cannot turn a successful removal into a lie, and the confirm opens with focus on `Keep photo` by mechanism rather than by DOM-order luck — because 16-03 measured that without the mechanism Radix focuses `Remove photo`.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-08-25T21:16Z
- **Completed:** 2026-08-25T22:03Z
- **Tasks:** 3 of 3
- **Files modified:** 8 (7 modified, 1 created)

## Accomplishments

- **`removeAvatarAction` exists and is null-first.** The stored `avatarPublicId` is read off the session's user, BOTH columns are nulled through `auth.api.updateUser` (Better Auth owns the row — not a Drizzle write), and only then is the Cloudinary asset destroyed. The destroy is wrapped, logged with both ids, and **cannot change the action's result**. Both of `uploader.destroy`'s failure shapes are handled: it *resolves* `{ result: "not found" }` for a missing id and *rejects* only on network/auth failure, so the `if` and the `catch` are two halves of one guard.
- **Removal is idempotent.** No stored id means the columns are nulled anyway and Cloudinary is not called at all. A second press of the confirm, or a row whose url and id ever disagreed, both land on the same truthful state.
- **The confirm is a `ResponsiveDialog` and `alert-dialog` was not added.** `ls src/components/ui | wc -l` is still **32**; `ls src/components/ui/alert-dialog.tsx` still fails.
- **Focus lands on `Keep photo`, by mechanism, and it was watched red.** With the handler removed, Radix focused **`Remove photo`** — reproducing 16-03's measurement on the real component rather than on a harness.
- **The app's first `variant="destructive"` Button** — exactly one, on the confirm verb, inside the overlay. `grep -rc 'variant="destructive"' src/app/` is 0 everywhere; the only other hits in `src/` are two `<Alert>`s and vendored `data-[variant=destructive]` class strings.
- **The field's refusal region is still exactly ONE element.** It is written once and placed by the render — page, crop dialog, or removal confirm — which is what keeps `live-regions.ts`'s single-row declaration for this file true. That row's prose was updated in the same commit to say what it now announces.
- **CROP-03 is Complete in `REQUIREMENTS.md`**, checkbox and traceability row both hand-fixed.

## Task Commits

Tasks 1, 2 and 3 are in **one commit**, as Task 3's acceptance criteria require — *"the assertion moves with the code that made it move."* This is a deliberate departure from the default per-task commit protocol, directed by the plan itself.

1. **Tasks 1 + 2 + 3** — `b0cb0e2` (feat)

## The three watched reds

### Probe A — D-169's ordering (Task 1)

The destroy block was moved ABOVE the null-out and the spec re-run:

```
FAIL  tests/profile/avatar-remove.test.ts > removeAvatarAction — the happy path and D-169's
      ordering (CROP-03) > has ALREADY nulled the columns at the moment the destroy runs
AssertionError: expected 'https://res.cloudinary.com/mock/image…' to be null
- Expected: null
+ Received: "https://res.cloudinary.com/mock/image/upload/EEIrIoqC0jTIap2Cb73PJpHrEj5XlWA2.jpg"
 ❯ tests/profile/avatar-remove.test.ts:197:41
Test Files  1 failed (1) · Tests  1 failed | 5 passed (6)
```

Reverted from a byte copy taken before the probe (`IDENTICAL TO PRE-PROBE`). **The reading that matters:** the four other cases stayed GREEN under the swapped order. An end-state assertion proves nothing about an order; only the observation taken from inside the destroy does.

### Probe B — the tolerance guard (Task 1)

The `try/catch` around the destroy was removed, leaving an un-guarded `await`:

```
FAIL  tests/profile/avatar-remove.test.ts > removeAvatarAction — a Cloudinary failure never
      changes the result (D-169, T-16-43) > returns ok and leaves the columns null when the
      destroy REJECTS
Error: cloudinary is unreachable
 ❯ tests/profile/avatar-remove.test.ts:209:38
Test Files  1 failed (1) · Tests  1 failed | 5 passed (6)
```

That is the outage reaching the caller — on a profile whose avatar is already gone. Reverted; byte-compared.

### Probe C — D-168's mitigation (Task 2)

The open-time focus handler was removed from the confirm:

```
FAIL  tests/profile/avatar-field.test.tsx > CROP-03 — D-168's mitigation, by mechanism (T-16-45)
      > lands focus on Keep photo when the confirm opens
AssertionError: expected 'Remove photo' to be 'Keep photo' // Object.is equality
```

**`Remove photo`. The destructive button.** Measured on the real component, in Δ5b's real footer order, and it agrees exactly with what 16-03 measured on its harness. Reverted; byte-compared (`IDENTICAL TO PRE-PROBE`); the field spec is back to 24 passed.

## Task 3 — the predicted red did not fire where the plan predicted it

The plan asked me to observe `profile-pass.test.tsx` redden on its own prediction and transcribe it. **It did not redden. It is fully green, 13 passed, and that is correct.** Here is the warning it carries, verbatim, as the plan requires:

> *"the profile form ships a control whose name reads as a removal. AUTHUI-02's last clause (\"and avatar removal is possible\") is assigned to Phase 16 CROP-03 by REQUIREMENTS.md's own conflict note, so on this tree the correct state is that no such affordance exists. ⚠ WHEN CROP-03 LANDS THIS IS THE ASSERTION THAT REDDENS, AND THAT IS THE POINT — the plan adding the control must move this file and declare the new name here."*

**Why it could not fire.** The prediction was written in Phase 15, when the avatar block lived in `profile-form.tsx`. **Plan 16-11 lifted the block out into `avatar-field.tsx` and re-scoped this assertion to `FORM`.** It now reads `form.scan.texts`, i.e. the literals `profile-form.tsx` authors — and CROP-03's control landed in the FIELD. Two further reasons it was unreachable even in principle: `avatar-field.tsx` authors none of the removal sentences (each is an imported constant, invisible to an AST literal scan), and case (12)'s render passes `avatarUrl={null}`, on which no removal control is offered at all.

**The red arrived instead in `tests/design/avatar-copy.test.tsx` case (3)**, on a control COUNT, and that file's own message named this plan:

```
FAIL  tests/design/avatar-copy.test.tsx > the avatar copy contract — the exported literal, the
      rendered sentence, and Δ14 > (3) the primary control reads Upload with no photo and Change
      with one
AssertionError: expected 2 to be 1 // Object.is equality
- Expected: 1   + Received: 2
 ❯ tests/design/avatar-copy.test.tsx:426:27
Test Files  1 failed | 58 passed (59) · Tests  1 failed | 1134 passed | 3 skipped (1138)
```

Its first half's message had said, in as many words: *"the avatar field renders more than one control. CROP-03's removal button is plan 16-12's and does not exist yet; a second control here now would be an affordance ahead of its action."*

**So I did what the plan asked, in the file that asked it.** In all three places, the assertion **moved** rather than loosening:

| Where | Was | Is now |
|---|---|---|
| `avatar-copy.test.tsx` (3) | both halves assert ONE control | `toEqual([Upload photo])` without a photo, `toEqual([Change photo, Remove photo])` with one — named, ordered, counted |
| `avatar-copy.test.tsx` (1) | no removal copy | the six removal sentences pinned byte-for-byte, plus `Removing…` character-counted for its single U+2026, plus the claim that the trigger and the confirm verb are the same sentence |
| `avatar-copy.test.tsx` (3b/3c) | — | new: the confirm's four sentences read off the DOM, and the busy label read while held in flight |
| `profile-pass.test.tsx` (10) | ⚠ predicts a red | the scan is unchanged and still green; the message now says why a removal named in the FORM would be a second, unconfirmed way to destroy one photo |
| `profile-pass.test.tsx` (12) | `expect(removalNames).toEqual([])` on a photoless render | that half kept (it is now the *no photo → no control* claim) **plus** a second render WITH a photo asserting `toEqual(["Remove photo"])` |
| `REMOVAL_WORDS` docblock | ⚠ predicts a red | records that the prediction was overtaken by 16-11's re-scope, and where the declaration was actually made |

**Case (8) is untouched and was green throughout.** `git diff -U0 tests/design/profile-pass.test.tsx` produced hunks at old lines 477, 482, 1112, 1115, 1159, 1163, 1260 and 1261 — none inside case (8)'s 1059–1088 range. It never went red, because the confirm was composed in `avatar-field.tsx` exactly so that it could not.

## Files Created/Modified

- **`src/lib/cloudinary.ts`** — `destroyAvatar` appended below the existing block. Its docblock states why the CDN invalidation matters MORE here than for a listing photo: `overwrite: true` keeps the avatar's delivery URL stable across replacements, so a cached edge copy is not merely stale, it is the removed photo still being served from the address the profile used to point at. `destroyListingPhoto`'s docblock was reworded (see Deviations).
- **`src/app/actions/avatar.ts`** — `+1` `export type` and `+1` `export async function`, nothing else. `grep -cE "^export (const|let|var|class|enum)|export \*|export \{[^}]*\} from"` → **0**.
- **`src/components/profile/avatar-field.tsx`** — the trigger, the confirm, the pending guard, the re-entrancy guard, the focus handler, and the refusal region rewritten as one element with two parents. The header's *"renders NO removal control"* bullet is **discharged, not deleted**: it now records that CROP-03 arrived and names the three load-bearing properties.
- **`src/lib/design/live-regions.ts`** — prose only. No new row, no new id, `DECLARED_FILE_COUNT` still 28. The `avatar-field-refusal` row now says it announces six things rather than five, and the section comment records why the element is written once and placed twice.
- **`tests/profile/avatar-remove.test.ts`** (new, 258 lines) — six cases, harness = the union of `avatar.test.ts`'s and `photos.test.ts`'s.
- **`tests/profile/avatar-field.test.tsx`** — +7 cases (17 → 24).
- **`tests/design/avatar-copy.test.tsx`** — +2 cases (9 → 11), case (3) moved, case (1) extended.
- **`tests/design/profile-pass.test.tsx`** — 13 cases, unchanged count; two messages rewritten and one positive render added.

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0** (run five times across the plan) |
| `npx vitest run tests/profile/avatar-remove.test.ts` | **0** — 6 passed |
| `npx vitest run tests/use-server-exports.test.ts` | **0** |
| `npx vitest run tests/profile/` | **0** — 4 files, **45 passed** (was 32) |
| `npm test` | **0** — 185 files / **2102 passed** / 5 skipped (was 184 / 2089 / 5; +13 = 6 + 7) |
| `npm run test:design` | **0** — 59 files / **1137 passed** / 3 skipped (was 59 / 1135 / 3; +2) |
| `npm run build` | **0** (`lint && test:design && next build`) — the module EVALUATES, which the export-shape test cannot prove |
| `npx playwright test e2e/overflow-320.spec.ts -g "profile"` | **0** — `/profile` at 320px, court **and** grove, no sideways scroll with the second 44px control |
| `grep -c "invalidate: true" src/lib/cloudinary.ts` | **2** — listing + avatar, both CALL SITES |
| `grep -c "await destroyAvatar" src/app/actions/avatar.ts` | **1**, inside a `try` |
| `grep -c 'variant="destructive"' src/components/profile/avatar-field.tsx` | **1** |
| `grep -rc 'variant="destructive"' src/app/` | **0** on every file |
| `grep -c "onOpenAutoFocus" …/avatar-field.tsx` | **1** (the attribute; not named in prose) |
| `grep -c "onCloseAutoFocus" …/avatar-field.tsx` | **0** — see Deviations |
| `grep -c "alert-dialog\|AlertDialog" …/avatar-field.tsx` | **0** |
| `ls src/components/ui \| wc -l` | **32** · `ls src/components/ui/alert-dialog.tsx` fails |
| `git diff --exit-code src/app/(app)/profile/profile-form.tsx` | **0** — untouched |
| `git diff -U0 tests/design/profile-pass.test.tsx` | no hunk inside case (8) |

## Threat Model — dispositions discharged

| Threat ID | Disposition | How it was discharged |
|---|---|---|
| T-16-41 (Elevation — acting on another user's row) | mitigate | `auth.api.getSession({ headers })` gates it; the write goes through Better Auth's session-scoped `updateUser`. **The action takes no arguments**, so there is no client-supplied id to mis-trust. The session-gate case asserts the destroy call COUNT did not move, not merely that the result was falsy. |
| T-16-42 (Repudiation — a live row pointing at a destroyed asset) | mitigate | Null-first ordering, asserted STRUCTURALLY by reading the row from inside the mocked `destroy`, and watched red with the two blocks swapped. The four other cases stayed green under the swap, which is the argument for the structural shape. |
| T-16-43 (DoS — an outage turning a success into a failure) | mitigate | The destroy is wrapped, logged and never changes the result; `mockRejectedValueOnce` covers the rejecting shape and `mockResolvedValueOnce({ result: "not found" })` covers the resolving one. Watched red with the guard removed. Each case also asserts the call was ATTEMPTED. |
| T-16-44 (Repudiation — orphaned assets) | accept | Knowingly tolerated by D-169, logged with `userId` and `publicId` on both the non-ok and the rejecting branch, and named in `destroyAvatar`'s docblock as Phase 16.1's orphan-audit scope. |
| T-16-45 (Spoofing — focus on the destructive action) | mitigate | The handler `preventDefault()`s and focuses `Keep photo` by ref; asserted by ACCESSIBLE NAME with `toBe`, and watched red — Radix chose `Remove photo`. |
| T-16-46 (DoS — a value exported from a `"use server"` module) | mitigate | Only `export type AvatarRemoveResult` and `export async function removeAvatarAction` were added. `tests/use-server-exports.test.ts` green, the illegal-shape grep returns 0, and **`npm run build` proves the module evaluates** — which the export-shape test explicitly cannot. |

## Requirements

**CROP-03 — COMPLETE.** Its full text is one clause, *"A user can remove their avatar,"* and it carries no hardware or real-browser qualifier (contrast CROP-04, which says so explicitly). 16-03 recorded it as *advanced* on the grounds that `removeAvatarAction` did not exist and neither did the confirm overlay; both exist now, in one commit, with the row nulled, the asset destroyed, the circle back to initials and six integration cases against a live database. `REQUIREMENTS.md:100`'s checkbox and its traceability row at `:233` were **both** hand-edited — the SDK verb ticks only the first and leaves the second stale.

**AUTHUI-02 — unblocked, deliberately NOT ticked here.** Its remaining clause *"and avatar removal is possible"* is exactly CROP-03 and is now delivered; its design-system half shipped in Phase 15 and `tests/design/profile-pass.test.tsx` (its named gate) is green at 13 cases. The fact is recorded under the conflict note at `REQUIREMENTS.md:274` rather than acted on, because a **Phase-15** requirement's status is that phase's to declare and this is a Phase-16 plan. Nothing else is outstanding against it; ticking it is a one-line change for the phase-closing pass.

## Deviations from Plan

### 1. [Rule 3 — blocking] The predicted red was in a different file, so Task 3 moved two test files instead of one

- **Found during:** Task 3, on the first full `npm run test:design`
- **Issue:** `profile-pass.test.tsx` stayed green (correctly — 16-11 re-scoped its removal assertion to `profile-form.tsx`, and the control landed in `avatar-field.tsx`). The build-blocking red was `avatar-copy.test.tsx` case (3), which is not in the plan's `files_modified`.
- **Fix:** did what the plan's instruction asks — *move the assertion rather than delete it* — in the file that actually reddened, and separately retired the stale prediction in `profile-pass.test.tsx` so it no longer promises a red that can never come.
- **Files modified:** `tests/design/avatar-copy.test.tsx` (added), `tests/design/profile-pass.test.tsx` (as planned)
- **Commit:** `b0cb0e2`

### 2. [Rule 3 — blocking] The five removal literals could not be pinned where the plan said to pin them

- **Issue:** the plan asks for them in `profile-pass.test.tsx`'s `PINNED_COPY`, scoped to `avatar-field.tsx`. `PINNED_COPY` asserts that a file's authored STRING LITERALS contain each pinned sentence — and `avatar-field.tsx` authors none of them (rule F2: every sentence is an imported constant). Adding them there would have reddened case (11) with six false "missing" reports.
- **Fix:** pinned in `avatar-copy.test.tsx` case (1) instead, which is that file's exact job — the export pinned against a literal written out in full (link 1), then read off the DOM (link 2), then compared with `toBe` (link 3). Added `Removing…`'s character count and U+2026 check, mirroring how the crop confirm's twin is pinned four lines away.

### 3. [Rule 2 — missing critical functionality] `live-regions.ts`'s row for this file was about to become untrue

- **Issue:** the `avatar-field-refusal` row's `announces` enumerated four refusals and a save failure. The removal failure is a sixth thing announced from that same slot, and this inventory's entire value is that its prose is true.
- **Fix:** prose-only edit — no new row, no new id, `DECLARED_FILE_COUNT` unchanged at 28. Also recorded there that the element is written once and given two parents, so the next person adding a failure path does not reach for a second element and quietly create an undeclared `alert#2`.
- **Files modified:** `src/lib/design/live-regions.ts`

### 4. [Rule 3 — blocking] `destroyListingPhoto`'s docblock quoted the token this plan's criterion counts

- **Issue:** `grep -c "invalidate: true" src/lib/cloudinary.ts` was **already 2** before this plan — one comment, one call — so adding the avatar call would have produced 3 against a criterion whose stated meaning is "listing + avatar", i.e. two CALL SITES.
- **Fix:** reworded the shipped comment to name the option descriptively and wrote the new docblock the same way, with a note in the file saying why. This is the twelve-plus-time collision the repo already has a resolution for (`responsive-dialog.tsx:113-117`, and 16-03's own decision).

### 5. Measured correction to two of the plan's acceptance numbers

- **`grep -c "onCloseAutoFocus" src/components/profile/avatar-field.tsx` is 0, not 1.** The plan expected the crop dialog's occurrence to be in this file; plan 16-10 put the crop dialog in `image-crop-dialog.tsx`, so the token has never been here. The invariant the criterion protects — *the removal confirm does not take Radix's close-time restore over* — holds more strongly at 0 than at 1. The reasoning is in the file, with the hook named descriptively so the count stays honest.
- **`grep -rn 'variant="destructive"' src/` returns more than the plan's "only two `<Alert>` hits":** there are also three vendored `data-[variant=destructive]` class strings in `dropdown-menu.tsx` and `select.tsx`. Those are Tailwind data-attribute selectors, not props. The claim that survives — and the one the criteria actually check — is that this is the app's first destructive **Button**, and there is exactly one of it.

### 6. Tasks 1–3 in one commit

Directed by Task 3's own acceptance criteria (*"the assertion moves with the code that made it move"*), which override the default per-task commit protocol for this plan. Noted so it does not read as drift.

## Deferred Issues

**`e2e/overflow-320.spec.ts`'s Phase-13 confirmed-detail row is flaky under two workers.** The full-file run failed `AC#30 / AC#22 … › the confirmed detail, no query · court` on `expectTargets`'s own zero-controls floor; re-run alone it passes in both themes in ~1.3s. Nothing in this plan touches a booking-detail surface, and the `/profile` rows of the same spec pass in both themes. Logged as **D2** in `.planning/phases/16-image-crop-framing/deferred-items.md`; **not fixed** (scope boundary).

**The zoom slider's missing accessible name (D1) was not touched, in either direction.** It remains a real WCAG 2.2 SC 4.1.2 failure owned by `image-crop-dialog.tsx` and assigned to 16-14. No gate this plan edited asserts anything about that control.

## Known Stubs

None. Every control this plan added is wired to a real action against a real row; nothing renders placeholder text or an empty hardcoded value.

## Notes for Next Phase

- **16-13 (the real-browser pass) owns the two things jsdom cannot see:** that the overlay's own close control and an overlay click are both inert while `Removing…`. The single `onOpenChange` guard is what makes all three affordances inert, and the jsdom spec can only drive one of them (`Keep photo`) — the refusal is written into the spec's header rather than left implicit.
- **The confirm is the FIRST and only consumer of `onOpenAutoFocus`.** `tests/design/responsive-dialog-autofocus.test.tsx`'s adopter census still passes: `avatar-field.tsx` is not one of the five censused files. If it ever needs to be, that spec's failure message says to record the decision rather than edit the list.
- **Phase 16.1's orphan audit now has a second producer.** Both branches of the tolerated destroy log `[avatar:destroy] …` with `userId` and `publicId`, so the sweep has the two fields it needs. `overwrite: true` means an orphan can only ever be `fitout/avatars/<userId>`.
- **VRT:** `profile` is an existing `SURFACE_IDS` entry and its baselines are invalidated by the second control in the avatar row. `playwright.config.ts` constructs the `visual` project only on Linux, so that regeneration cannot happen on this box — it belongs with the phase's other baseline work.

## Self-Check: PASSED

- `src/lib/cloudinary.ts` — FOUND (modified, `destroyAvatar` present)
- `src/app/actions/avatar.ts` — FOUND (modified, `export async function removeAvatarAction` present)
- `src/components/profile/avatar-field.tsx` — FOUND (modified)
- `src/lib/design/live-regions.ts` — FOUND (modified, prose only)
- `tests/profile/avatar-remove.test.ts` — FOUND (created)
- `tests/profile/avatar-field.test.tsx` — FOUND (modified)
- `tests/design/avatar-copy.test.tsx` — FOUND (modified)
- `tests/design/profile-pass.test.tsx` — FOUND (modified)
- Commit `b0cb0e2` — FOUND in `git log`
- `.planning/STATE.md` and `.planning/ROADMAP.md` — NOT modified by this plan (orchestrator owns them)
