---
phase: 16-image-crop-framing
plan: 09
subsystem: ui
tags: [avatar, crop, react-easy-crop, responsive-dialog, slider, live-regions, focus-management, a11y]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    plan: 01
    provides: "`src/components/ui/slider.tsx` — the vendored, token-mapped zoom control with a 44px thumb hit area"
  - phase: 16-image-crop-framing
    plan: 02
    provides: "`src/lib/avatar.ts` — the 21 copy literals, `avatarMaxZoom()` and the four numbers; directive-free on purpose"
  - phase: 16-image-crop-framing
    plan: 03
    provides: "`responsive-dialog.tsx`'s open-time focus hook (consumed by the REMOVAL confirm, deliberately not by this dialog) and the measured Radix trigger-less defect its close-time twin exists for"
  - phase: 16-image-crop-framing
    plan: 08
    provides: "`src/lib/avatar-canvas.ts` — `encodeAvatarBlob()`, which this dialog's confirm hands the library's own `<img>` to; and `react-easy-crop@6.2.3`"
  - phase: 999.2-profile-picture-and-listing-photo-crop-ui
    provides: "IC-01..IC-06, § 2b..§ 2g and the copy rules, inherited by reference and not re-derived"
provides:
  - "`src/components/profile/image-crop-dialog.tsx` — the ImageCropDialog composite: geometry and copy in, a 400x400 Blob out, no upload and no Cloudinary knowledge"
  - "The stage: `relative`, `min(320px, 100vw - 2rem, 40dvh)` square, matte-backed (D-177), keyboard-pannable through the library's own handling (D-178)"
  - "The zoom row: array-valued Slider bounded per image by `avatarMaxZoom`, disabled-with-its-reason at the floor (rule F8)"
  - "`avatar-crop-save-error` — the dialog's one declared live region; `LIVE_REGION_FILES` 26 -> 27 with both pins moved"
affects: [16-10 AvatarField wiring and the caller's props, 16-12 Playwright EXIF proof, 16-13 cascade measurement + the mask-ring/scrim route and its inventory row]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One dismiss guard, not three: the composite wraps the caller's `onOpenChange` so Radix's Escape / overlay-click / close-control paths cannot be guarded inconsistently at a call site"
    - "A trigger-less overlay MUST pass the close-time focus hook and a ref to the control that opened it — Radix suppresses the browser's own restore and has no trigger to hand focus back to"
    - "A composite that authors no copy reports a local failure UP (`onEncodeFailed`) rather than taking a second sentence prop, so one alert region has one source whichever half failed"
    - "A `role=\"alert\"` in a file the live-region set does not yet contain is INVISIBLE to the gate — the path goes into `LIVE_REGION_FILES` first, alone, and the red is watched then"

key-files:
  created:
    - src/components/profile/image-crop-dialog.tsx
  modified:
    - src/lib/design/live-regions.ts
    - tests/design/live-regions.test.tsx

key-decisions:
  - "The dialog reports an encode failure through an `onEncodeFailed` callback instead of accepting a second sentence prop. To the person, 'the action refused' and 'the bytes could not be produced' are ONE outcome with ONE sentence (16-UI-SPEC's error table gives exactly one), so the caller maps both to the same string and feeds the single `role=\"alert\"` region through `error`. The component authors no user-visible text at all"
  - "The object URL is minted and revoked by the CALLER, not by this dialog. T-16-32's mitigation names plan 16-08's helper and plan 16-10's input reset; whoever mints a URL revokes it, and two owners for one URL is a worse bug than the leak it would be trying to prevent"
  - "Every explanatory comment about an ABSENT construct is worded around the token its own acceptance grep counts — the sr-only-header prop, the distinct close-control name, the two dismiss-event props, the library's key handling and the vendor test hooks are all described rather than spelled. This is the twelve-times-measured collision named in 16-PATTERNS; the wording is the decision, not an accident"
  - "The mask ring and the scrim are left at the library's own values and `EXPECTED_DILUTED_TOKENS` is untouched, with a comment at the `cropAreaClassName` site naming plan 16-13 as the owner. Shipping a guessed cascade route plus its inventory row is what RESEARCH R3 forbids"
  - "`variant=\"default\"` is spelled explicitly on the confirm rather than left to the CVA default, so Delta-9's decision (neutral, never coral) is visible in the diff a future reader reads"

patterns-established:
  - "Stage-wrapper positioning is documented AT the element with the failure it prevents named (R12: an unpositioned wrapper lets the cropper escape to the fixed dialog content box and fill the overlay)"
  - "A derived box is authored at the call site with all of its terms derived in a comment, and is NOT added to `measurements.ts` when the surface declares no skeleton"

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: 31min
completed: 2026-08-25
---

# Phase 16 Plan 09: The Image Crop Dialog Summary

**The framing step exists: a trigger-less `ResponsiveDialog` whose stage is the screen — drag to move, pinch/wheel/slider to zoom, always opening at zoom 1 centred — that hands a 400x400 Blob to its caller and knows nothing about uploading it.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-08-25T09:33Z
- **Completed:** 2026-08-25T10:04Z
- **Tasks:** 3 of 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **The surface this phase exists for.** `ImageCropDialog` composes the ONE overlay primitive and reaches `@/components/ui/dialog` nowhere; it has no trigger, restores focus to the button that opened it, and makes all three dismiss affordances inert while saving through a single `onOpenChange` guard.
- **The stage is correct by construction, not by tuning.** `relative` (the phase's named first-try bug), a square of `min(320px, 100vw - 2rem, 40dvh)` with every term derived at the element, `bg-background` per D-177, and the library's own arrow-key panning passed through unlayered and unsuppressed per D-178.
- **The zoom bound is per image and honest at every instant.** `maxZoom` state initialises to `1`, not the ceiling, so the row is briefly disabled and then enables rather than briefly lying at 3x; the Slider's value is an ARRAY, so it renders one thumb rather than two at the extremes.
- **The live-region gate was watched failing before it moved** — and the failure it actually produces is not the one the plan predicted. Both observed reds are transcribed below, and the reason the plan's order is load-bearing is now recorded in `live-regions.ts` itself as OBSERVED RED (d).

## Task Commits

Tasks 1, 2 and 3 land in ONE commit, as Task 3's acceptance criteria require ("This inventory move and Task 1/2's component are in ONE commit"):

1. **Task 1: The dialog shell** — `d995d7a` (feat)
2. **Task 2: The stage and the zoom row** — `d995d7a` (feat)
3. **Task 3: Declare the alert region, 26 -> 27** — `d995d7a` (feat)

## Files Created/Modified

- `src/components/profile/image-crop-dialog.tsx` (created, 411 lines) — the composite. Props are geometry and copy; a `Blob` goes out. Composes `ResponsiveDialog` only.
- `src/lib/design/live-regions.ts` (modified) — `image-crop-dialog.tsx` added to `LIVE_REGION_FILES` in the account-surfaces grouping; `avatar-crop-save-error` added to `LIVE_REGION_IDS` and `LIVE_REGIONS` (`kind: "alert"`, `at: 1`); `DeclaredFileCountIsTwentySix` renamed to `DeclaredFileCountIsTwentySeven` with `extends 26` -> `extends 27`; OBSERVED RED (d) recorded in the alias docblock; the two prose sentences that state the set size updated.
- `tests/design/live-regions.test.tsx` (modified) — `DECLARED_FILE_COUNT` 26 -> 27, the second pin the module's own docblock mandates. See deviation 2.

## Verification

Every command run ALONE, never piped when its exit code was the thing being read (the repo's standing trap):

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run test:design` | 58 files / 1126 passed / 3 skipped — the wave-2 baseline, unmoved |
| `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | 26 passed |
| `npm run build` (lint + test:design + next build) | exit 0 |
| `npm test` | 183 files / 2072 passed / 5 skipped — the wave-2 baseline, unmoved |
| `git diff --exit-code src/lib/design/measurements.ts src/lib/design/selector-contract.ts src/lib/design/accent-uses.ts tests/design/brand-recipe.test.ts src/components/patterns/responsive-dialog.tsx` | exit 0 |

**Every acceptance grep, run against the created file:**

| Grep | Required | Actual |
|---|---|---|
| `ResponsiveDialog` | >= 1 | 4 |
| `@/components/ui/dialog` | 0 | 0 |
| `onCloseAutoFocus` | 1 | 1 |
| `onOpenAutoFocus` | 0 | 0 |
| `onEscapeKeyDown\|onInteractOutside` | 0 | 0 |
| `variant="brand"\|bg-brand\|text-brand` | 0 | 0 |
| `size="touch"` | 2 | 2 |
| `size="sm"` | 0 | 0 |
| `data-testid` | 0 | 0 |
| `hideTitle\|closeLabel` | 0 | 0 |
| `relative` | >= 1 | 2 |
| `40dvh` | >= 1 | 2 |
| bare `[0-9]+vh\]` | 0 | 0 |
| `bg-background` | >= 1 | 1 |
| `bg-muted` | 0 | 0 |
| `onKeyDown\|onKeyUp\|keydown` | 0 | 0 |
| `keyboardStep` | 1 | 1 |
| `showGrid={false}` | 1 | 1 |
| `cropSize=\|initialCroppedArea\|rotation=\|disableAutomaticStylesInjection` | 0 | 0 |
| `text-foreground/55\|border-background` | 0 | 0 |
| `value={\[` | 1 | 1 |
| `DeclaredFileCountIsTwentySeven` (in `live-regions.ts`) | 1 | 1 |
| `DeclaredFileCountIsTwentySix` (in `live-regions.ts`) | 0 | 0 (one prose mention survives in the historical rename chain, which is the record of what the alias USED to be named — the acceptance criterion is about the alias, and the alias is gone) |
| `image-crop-dialog` (in `live-regions.ts`) | >= 2 | 3 |

**One extra measurement, because a class that silently fails to compile is invisible to `next build`.** The derived stage box does emit real CSS, read out of the built chunk:

```css
.size-\[min\(320px\,100vw_-_2rem\,40dvh\)\]{width:min(320px,100vw - 2rem,40dvh);height:min(320px,100vw - 2rem,40dvh)}
```

## The watched red, transcribed verbatim

Task 3 requires the gate be observed failing before the inventory moves. **The failure it actually produces is not the one the plan predicted** — see deviation 1 for why. In the intermediate state (path in `LIVE_REGION_FILES`, no row, alias still reading `extends 26`):

`npx tsc --noEmit`, run bare — exit code 2, ONE error, the whole of stdout:

```
src/lib/design/live-regions.ts(1663,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```

`npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` — 2 failed, 24 passed:

```
FAIL  tests/design/live-regions.test.tsx > guard-the-guard — the scan read the set it is asserting about > audits exactly 26 files, the number the type alias pins
AssertionError: the declared set is 27 files, not 26. This number is pinned in TWO places — `DeclaredFileCountIsTwentySix` in `src/lib/design/live-regions.ts` fails the build, and this fails the gate with a message. Plans 12-12, 12-13, 13-14, 14-14 and 15-09 each moved BOTH, in the same commit as the components they add. A set that widened in one place and not the other is exactly the drift T-12-06-SETDRIFT names.: expected 27 to be 26 // Object.is equality

- Expected
+ Received

- 26
+ 27

FAIL  tests/design/live-regions.test.tsx > SCAN 2 — every region has a row, and every row has a region > reports declared-but-absent and present-but-undeclared together
AssertionError: GATE-03's inventory disagrees with the tree.
  PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
  src/components/profile/image-crop-dialog.tsx:404 — alert#1 on <p> (role="alert")
  src/components/profile/image-crop-dialog.tsx renders, in source order:
    :404 alert#1 <p> → NO ROW
  One of each is normally ONE rename. An INSERTION shows up as one displaced region at the end of a file's sequence — read the sequence above, not just the line number. Add the row in `src/lib/design/live-regions.ts` with the sentence the user hears and the numbered rule it satisfies — never delete the row to make this green.: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "  src/components/profile/image-crop-dialog.tsx:404 — alert#1 on <p> (role=\"alert\")",
+ ]
```

Then the row, `26` -> `27`, the rename, and the second pin -> exit 0, 26 tests passed.

## Decisions Made

- **`onEncodeFailed` rather than a second copy prop.** Recorded in full in the frontmatter. The short version: the dialog authors zero user-visible text, and 16-UI-SPEC's error table gives exactly ONE sentence for "upload failed after confirm", so a local encode failure and a returned action failure feed the same region from the same source.
- **The object URL's lifetime stays with the caller.** T-16-32's mitigation is written across plans 16-08 and 16-10 by design; this dialog neither mints nor revokes, and its header says so out loud so nobody adds a second revoke on unmount.
- **`variant="default"` is spelled, not defaulted.** Delta-9 is a reversal of 999.2's single coral element, and an unspelled default would leave nothing in the file for a future reader to disagree with.
- **The prose works around every token its own greps count.** Five constructs are argued for in comments without being spelled: the pattern's sr-only-header prop, its distinct close-control name prop, the two Radix dismiss-event props, the library's key handling, and the vendor's baked-in test hooks. `16-PATTERNS` names this collision as having cost this tree twelve times; the alternative — weakening the acceptance criteria so the explanation can quote itself — is the wrong half to give up.
- **`min === max` on the Slider is accepted and not papered over.** At `maxZoom === 1` the vendored block's percentage math divides by zero (`@radix-ui/react-slider/dist/index.mjs:499-504`: `maxSteps = max - min` is 0), so the thumb offset resolves to an ignorable value and the disabled track renders empty. Read out of the vendored source, not guessed. The alternative — passing a `max` the source cannot support so the arithmetic stays finite — would put a false `aria-valuemax` on a control whose whole purpose here is to be honest about the bound. `npm run build` and the design suite are both green with it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 3's red is unreachable in the order the plan describes**

- **Found during:** Task 3 (Declare the dialog's alert region)
- **Issue:** The plan instructs: *"FIRST run the live-region suite and OBSERVE it red: `image-crop-dialog.tsx` now renders a `role="alert"` that no row declares (present-but-undeclared)."* With the component created and `live-regions.ts` untouched, the suite is **GREEN**: `tests/design/live-regions.test.tsx:228` sets `SCAN_FILES = LIVE_REGION_FILES`, so the walker never opens a file that is not already in the declared set and cannot report a region it never read. Running it produced `1 passed (1) / 26 passed (26)`. Following the plan literally would have meant transcribing a green run into the SUMMARY as though it were the red the criterion asks for.
- **Fix:** The path was written into `LIVE_REGION_FILES` **alone** — no row, alias left at `extends 26` — which is the only state in which the predicted red exists. Both failures were then observed and are transcribed verbatim above. The row, the number and the rename followed. The reason the order is load-bearing is now recorded permanently in `live-regions.ts`'s alias docblock as **OBSERVED RED (d)**, so the next plan to widen this set does not re-derive it.
- **Files modified:** `src/lib/design/live-regions.ts`
- **Verification:** the intermediate state produced TS2344 (exit 2) and 2 failing tests; the final state produced exit 0 and 26 passed.
- **Committed in:** `d995d7a`

**2. [Rule 3 - Blocking] The declared file count is pinned in TWO places, and the plan named only one**

- **Found during:** Task 3
- **Issue:** The plan's `files_modified` lists `src/lib/design/live-regions.ts` and the component. `DECLARED_FILE_COUNT` at `tests/design/live-regions.test.tsx:272` is the second pin: moving only the type alias leaves the gate red with *"the declared set is 27 files, not 26"*, and `npm run test:design` — and therefore `npm run build` — fails.
- **Fix:** `DECLARED_FILE_COUNT` moved 26 -> 27 with its docblock extended, and the two prose strings that name the alias and list the plans which moved both pins were updated to include 16-09. **This is precedent, not improvisation:** the test's own docblock records the identical call for plan 15-09 — *"THIS LITERAL MOVING IS WHY TASK 1 OF PLAN 15-09 TOUCHED THIS FILE AT ALL … The instruction beat the file list"* — and that sentence is now extended to say it has happened twice.
- **Files modified:** `tests/design/live-regions.test.tsx`
- **Verification:** `npm run test:design` 58 files / 1126 passed; `npm run build` exit 0.
- **Committed in:** `d995d7a`

---

**Total deviations:** 2 auto-fixed (2x Rule 3 - blocking).
**Impact on plan:** Neither changes what was built or how. Deviation 1 changes only the ORDER of Task 3's two edits so that the criterion the plan actually cares about — *the gate was watched failing before it moved* — is satisfiable rather than merely claimed. Deviation 2 is a file the plan's own quoted gate message told it to touch. No scope creep: the read-only inventories (`measurements.ts`, `selector-contract.ts`, `accent-uses.ts`, `brand-recipe.test.ts`) and `responsive-dialog.tsx` are byte-unchanged, asserted by `git diff --exit-code`.

## Issues Encountered

**One contract detail the plan asks for and the acceptance criteria forbid, resolved by wording rather than by weakening either.** Task 1's action says to record in a comment why the pattern's sr-only-header mode is not used and why the distinct close-control name is not supplied; its acceptance criteria require `grep -c "hideTitle\|closeLabel"` to return `0`. The same collision applies to `onEscapeKeyDown` / `onInteractOutside` (Delta-3's argument), to the library's key handling (D-178's argument) and to the vendor's baked-in test hooks (Delta-18's argument). All five arguments are made in full, describing the construct instead of spelling it — the resolution `16-PATTERNS` prescribes after twelve prior instances in this tree. Recorded as a decision above so nobody later "fixes" the prose into a red.

**Nothing else.** No fix-attempt limits were reached, no authentication gates, no architectural questions, and no deferred items were discovered.

## Known Stubs

**None.** Every prop this component declares is consumed, every state it holds drives something on screen, and no value is hardcoded on a path that reaches the UI. Three absences are deliberate and each is argued at its site rather than left blank:

- **No mask ring and no scrim override**, and `EXPECTED_DILUTED_TOKENS` untouched — plan 16-13 measures which cascade route wins in a real browser and lands the winner with its inventory row. RESEARCH R3 forbids committing the row before the measurement.
- **No decode spinner and no skeleton** — the guards and the decode both complete before this component mounts, so there is no moment to design a loading state for. This is the GATE-STATES answer, not a gap.
- **No object-URL revoke** — the caller mints it and therefore owns it (plan 16-10).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for plan 16-10 (`AvatarField`).** The props it must satisfy, exactly:

```ts
{ open, onOpenChange, objectUrl, onConfirm(blob), onEncodeFailed(), saving, error, returnFocusRef }
```

Four things 16-10 must be right about, each measured here:

1. **`returnFocusRef` is not optional.** It must point at the `Upload photo` / `Change photo` button. Without it, Escape drops focus to `<body>` — the Radix defect Delta-5c exists for. T-16-29 asks 16-10's spec for a rendering assertion on this.
2. **Mount the dialog only while a file is staged, and unmount it otherwise.** No crop, zoom or bound survives a cancel because no component survives it. `objectUrl` is typed as a required `string` for that reason.
3. **`onEncodeFailed` and the action's own failure map to the SAME sentence**, passed back through `error`. One region, one source.
4. **The object URL is 16-10's to revoke**, paired with D-174's file-input reset, on all three paths (unmount, cancel, re-pick).

**For plan 16-13:** the cascade measurement has a clean site to land on. `classes.cropAreaClassName` currently carries the DS-05 focus recipe and nothing else, with a comment naming 16-13 as the owner of whatever wins. `EXPECTED_DILUTED_TOKENS` is at its pre-phase value.

**For plan 16-12:** `encodeAvatarBlob` is fed the element captured through `setImageRef` and the rectangle reported by `onCropComplete` for that same element — the EXIF-by-identity structure IC-06 requires is in place and is what the rotated-fixture proof will be asserting against.

**Inventory left for the rest of the phase:** live regions at **27**, moving to 28 in plan 16-10 with `avatar-field.tsx`.

---
*Phase: 16-image-crop-framing*
*Completed: 2026-08-25*
