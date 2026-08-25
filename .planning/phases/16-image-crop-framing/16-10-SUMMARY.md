---
phase: 16-image-crop-framing
plan: 10
subsystem: ui
tags: [avatar, crop, file-input, guard-chain, object-url, live-regions, jsdom, a11y]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    plan: 02
    provides: "`src/lib/avatar.ts` — the four refusal sentences, `AVATAR_HELPER`, the two control labels and `AVATAR_MIN_SOURCE_PX`; directive-free so a client component and a server module can both read it"
  - phase: 16-image-crop-framing
    plan: 07
    provides: "`avatarFileSchema` narrowed to JPEG/PNG/WebP and `AVATAR_MAX_BYTES` — the SERVER side of the two checks this field also makes on the client"
  - phase: 16-image-crop-framing
    plan: 08
    provides: "`measureImage` and `revokeAvatarObjectUrl` from `src/lib/avatar-canvas.ts` — the decode/measure guard and the URL's release"
  - phase: 16-image-crop-framing
    plan: 09
    provides: "`ImageCropDialog` and its prop surface — `objectUrl`, `onConfirm(Blob)`, `onEncodeFailed`, `saving`, `error`, `returnFocusRef`"
  - phase: 999.2-profile-picture-and-listing-photo-crop-ui
    provides: "§ 2e's fixed guard order, § 1b's `fd.set(\"avatar\", blob, \"avatar.jpg\")` save path, and rules F2/F4/F5/F6/F8/F9 — inherited by reference"
provides:
  - "`src/components/profile/avatar-field.tsx` — the client composite that owns the picker, the four pre-dialog guards, the staged `{file, objectUrl}`, the crop dialog and `uploadAvatarAction`"
  - "Rule F4 as executable fact: no network call happens between picking a file and pressing the confirm — asserted as a transition, not a snapshot"
  - "D-174's input reset in a `finally` on every handled change, so cancel-then-re-pick-the-same-photo is no longer silently dead"
  - "`avatar-field-refusal` — the field's one declared live region; `LIVE_REGION_FILES` 27 -> 28 with both pins moved"
  - "`tests/profile/avatar-field.test.tsx` — 17 jsdom cases over the state machine AROUND the cropper, and an explicit refusal to pretend jsdom has layout"
  - "`AVATAR_TOO_LARGE_MESSAGE` and `AVATAR_UPLOAD_FAILED_MESSAGE` — the two shipped sentences given one home each, values byte-unchanged"
affects: [16-11 mounts this field and moves the profile-avatar-error row out of profile-form.tsx, 16-12 adds CROP-03's removal control to this same file, 16-13 owns the Playwright stage assertions this spec deliberately refuses]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A guard chain that refuses BEFORE any overlay mounts, with one refusal slot for every guard — a surface that can only ever have refused one thing renders one region, never four"
    - "The object URL's owner is the file that mints it, released on all three exits (refuse-after-mint, cancel, success) and never from an effect cleanup, because React remounts effects in development and would revoke the URL the open dialog is showing"
    - "A dialog is MOUNTED only while its input is staged, which makes cancel structurally a no-op rather than a cleanup — there is no cropper state to reset because there is no cropper"
    - "A shipped literal that gains a second consumer is NAMED where it already lives, not re-typed at the new call site; a `\"use server\"` module cannot be the shared home, so the directive-free validation module is"
    - "A jsdom spec states what it refuses to stub and why, beside the stubs it does supply, so the boundary between supplied and refused is readable rather than archaeological"

key-files:
  created:
    - src/components/profile/avatar-field.tsx
    - tests/profile/avatar-field.test.tsx
  modified:
    - src/lib/design/live-regions.ts
    - tests/design/live-regions.test.tsx
    - src/lib/validation/profile.ts
    - src/app/actions/avatar.ts

key-decisions:
  - "ONE refusal slot, not four, and it is spent in exactly one place at a time: on the page while no file is staged, inside the dialog while one is. `refusal && !staged` gates the page element and the same string is passed to the dialog as `error`, so the two are never mounted together (GATE-03 rule 6)"
  - "A local encode failure and a refused upload map to the SAME sentence. `onEncodeFailed` sets `AVATAR_UPLOAD_FAILED_MESSAGE`, which is the string the action itself returns — to the person, bytes that could not be made and bytes that would not upload are one outcome with one recovery"
  - "The two shipped sentences moved to named exports in `src/lib/validation/profile.ts` rather than being re-typed in the client. `src/app/actions/avatar.ts` is a `\"use server\"` module and may export nothing but async functions, so it cannot be the shared home; `src/lib/avatar.ts` was ruled out because 16-UI-SPEC pins both strings as SHIPPED and re-declaring them beside the phase's new copy would make them look authored"
  - "The object URL is minted only AFTER the type and size guards pass, so the two refusals that cost nothing to detect also cost no allocation to recover from"
  - "The spec asserts value ASSIGNMENTS through a setter rather than reading `input.value`, because jsdom reports `\"\"` whether or not anything reset it — see Issues (a). The obvious assertion would have stayed green with D-174 deleted"
  - "`getBoundingClientRect` is not stubbed and `react-easy-crop` is not mocked. Both refusals are permanent and stated in the spec's header; geometry, gesture and pixels are plan 16-13's Playwright"

patterns-established:
  - "Watched-red probes have teeth or they are decoration: deleting D-174's one line reddens 3 cases and moving the upload into the change handler reddens 2 — both transcribed below from a real run"
  - "A live region in a file the declared set does not contain is INVISIBLE to the gate; the path goes into `LIVE_REGION_FILES` alone first and the red is watched then. Second use of OBSERVED RED (d)'s note, now recorded as (e)"

requirements-completed: []
requirements-advanced: [CROP-01]

# Metrics
duration: 42min implementation + 25min close-out
completed: 2026-08-25
---

# Phase 16 Plan 10: The Avatar Field Summary

**The whole avatar interaction now lives in one client composite — pick, guard, stage, frame, confirm — and the complaint that created this phase is a failing test: nothing reaches the network between choosing a photo and pressing `Save photo`.**

## Performance

- **Duration:** ~42 min implementation (18:07 -> 18:49 +08), ~25 min close-out (20:16 -> 20:41 +08)
- **Started:** 2026-08-25T10:07Z (first commit after wave-3 tracking at `0707e27`)
- **Completed:** 2026-08-25T12:41Z (close-out; the interruption gap 10:49 -> 12:16 is idle, not work)
- **Tasks:** 3 of 3
- **Files modified:** 7 (2 created, 4 modified, 1 planning doc created)

## Interruption and close-out

**This plan was executed by two agents.** The first was interrupted by the user AFTER committing all three tasks (`38328cb`, `7eda958`) but BEFORE running the final gates or writing this file. No code was left uncommitted: `git status --porcelain` showed nothing of this plan's in the tree, and it still shows nothing now.

The close-out agent wrote no product code. It ran every gate alone, re-derived both of Task 3's watched reds from the committed tree (the first agent recorded that it watched them but never wrote the failures down — a SUMMARY-only artifact, and the SUMMARY is what was lost), and wrote this file. The two probe mutations were made to `src/components/profile/avatar-field.tsx`, observed, and reverted with `git checkout -- <that one file>`; the file is byte-identical to `38328cb` and the spec is green again at 17/17.

## Accomplishments

- **The headline behaviour is now a transition assertion, not a hope.** `uploadAvatarAction` is asserted not-called after the change event and called-exactly-once after the confirm, on the same mounted field, in one test — because a snapshot of "called once at the end" passes just as happily for the shipped component that uploaded on `change` and never uploaded again.
- **Four guards, in the order § 2e fixes, all of them before any overlay exists.** Type, size, decode, dimensions — each refusing with the imported sentence that names what to pick instead, each opening nothing. A shorter side in [200, 399] is deliberately NOT a refusal: the dialog opens with its zoom row disabled and its reason underneath, and the person decides.
- **D-174 is a `finally`, so no future branch can forget it** — and the spec proves the line is load-bearing by asserting the assignments rather than the property, which is the only formulation jsdom cannot fake.
- **The object URL has exactly one owner.** This file mints it and releases it on all three exits; `ImageCropDialog` neither mints nor revokes, deliberately (T-16-35).
- **The live-region gate was watched failing before the inventory moved, for the second time in this phase** — and this time OBSERVED RED (d)'s note was USED rather than rediscovered, which is the first evidence that writing that note down paid for itself.
- **The spec says out loud what it cannot catch.** In jsdom the crop stage does not exist in the DOM; the header states that, names the probe that measured it, and refuses the two stubs that would have manufactured a passing stage test.

## Task Commits

Tasks 1 and 2 land in ONE commit, as Task 2's acceptance criteria require ("Task 1's component and this row are in ONE commit"):

1. **Task 1: The AvatarField composite** — `38328cb` (feat)
2. **Task 2: Declare the field's refusal alert, 27 -> 28, watched red first** — `38328cb` (feat)
3. **Task 3: `tests/profile/avatar-field.test.tsx` — the jsdom half of CROP-01** — `7eda958` (test)

**Plan metadata:** this file (docs: complete plan).

_Task 3 carries `tdd="true"`. It is a test-authoring task against a component that already existed by the plan's own sequencing, so the RED/GREEN cycle was run as two mutation probes on the committed component rather than as separate `test` -> `feat` commits — see TDD Gate Compliance below._

## Files Created/Modified

- `src/components/profile/avatar-field.tsx` (created, 318 lines) — the composite. `"use client"`, no form state, no RHF registration, no `name` on the input, no removal control, no authored string.
- `tests/profile/avatar-field.test.tsx` (created, 544 lines) — 17 cases in 6 describes: F4's transition, the four refusals, F8's disabled row PAIRED with an enabled large-source sibling, F5's still-open dialog, D-174's three paths, GATE-03 rule 6's region count, and the two copy cases.
- `src/lib/design/live-regions.ts` (modified) — `avatar-field.tsx` added to `LIVE_REGION_FILES`; `avatar-field-refusal` added to `LIVE_REGION_IDS` and `LIVE_REGIONS` (`kind: "alert"`, `at: 1`); the count alias renamed with `extends 27` -> `extends 28`; OBSERVED RED (e) recorded in its docblock; the pass-through note at 27 rewritten now that it is closed.
- `tests/design/live-regions.test.tsx` (modified) — `DECLARED_FILE_COUNT` 27 -> 28, the second pin the module's own docblock mandates. See deviation 1.
- `src/lib/validation/profile.ts` (modified) — `AVATAR_TOO_LARGE_MESSAGE` and `AVATAR_UPLOAD_FAILED_MESSAGE` exported, both values byte-unchanged. See deviation 2.
- `src/app/actions/avatar.ts` (modified) — the inline failure literal replaced by the import of the sentence that moved. Behaviour byte-identical. See deviation 2.
- `.planning/phases/16-image-crop-framing/deferred-items.md` (created) — D1, the zoom slider's missing accessible name. See deviation 3.

**`src/app/(app)/profile/profile-form.tsx` is byte-unchanged** — `git diff --exit-code` exits 0 and its last touch is still `0b8bad9` (plan 15-08). The extraction is 16-11's.

## Verification

Every command run ALONE — never two vitest processes at once, because `tests/global-setup.ts` truncates every `public` base table on start and the second run wipes the first's fixtures mid-flight.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (the 6 files the two commits touched) | exit 0, no output |
| `npx vitest run tests/profile/avatar-field.test.tsx` | **1 file / 17 passed**, exit 0 |
| `npm run test:design` | **58 files / 1126 passed / 3 skipped**, exit 0 |
| `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | **26 passed**, exit 0 |
| `npm test` | **184 files passed / 2 skipped (186); 2089 passed / 5 skipped (2094)**, exit 0 |
| `npm run build` | exit 0 |
| `git diff --exit-code "src/app/(app)/profile/profile-form.tsx"` | exit 0 |

**The two deltas against the post-wave-3 baseline, both accounted for:**

- `npm test`: 183 -> **184** passing files (+1: `tests/profile/avatar-field.test.tsx`) and 2072 -> **2089** passing tests (+17, exactly this spec's 17 cases). Nothing else moved.
- `npm run test:design`: **58 files / 1126 passed, unmoved** — and that is the correct answer, not a missing delta. The 27 -> 28 move changes the DATA the scan reads, not the number of cases: `live-regions.test.tsx` has a fixed 26 cases that walk the set, so a wider set makes each case do more work and none of them multiply. It was 26 after plan 16-09 and it is 26 now.

`npm test` also printed the standing `[test-db] LEAKED WRITES` banner — 2 `public.audit` rows (`guest-email`, `notify`) escaping through the app's module-level db singleton. Pre-existing and contained by design; the harness documents it itself. Not this plan's, not touched.

**Every acceptance grep, run against the committed tree:**

| Grep | Required | Actual |
|---|---|---|
| `e.target.value = ""` in the component | >= 1, inside a `finally` | 1, and it is the only statement in the `finally` at `:196-200` |
| `accept="image/jpeg,image/png,image/webp"` | 1 | 1 |
| `Uploading` | 0 | 0 |
| `text-xs` | 0 | 0 |
| `text-label` | >= 2 | 2 |
| `size="touch"` | >= 1 | 1 |
| `size="sm"` | 0 | 0 |
| `variant="destructive"\|AVATAR_REMOVE` | 0 | 0 |
| `aria-label="Upload avatar"` | 1 | 1 |
| `measureImage` | >= 1 | 2 |
| `AVATAR_MIN_SOURCE_PX` (artifact `contains`) | >= 1 | 3 |
| component line count (artifact `min_lines: 120`) | >= 120 | 318 |
| `DeclaredFileCountIsTwentyEight` in `live-regions.ts` | 1 | 1 |
| `TwentySeven` in `live-regions.ts` | 0 | 0 |
| `avatar-field` in `live-regions.ts` | >= 2 | 9 |
| `getBoundingClientRect` in the spec | 0 outside prose | 3, all three in comments (`:24`, `:54`, `:230`) — none in code |
| `AVATAR_POSITION_LABEL` in the spec | 0 | 0 |
| `from "@/lib/avatar"` in the spec | >= 1 | 1 |
| `uploadAvatarAction` in the spec (artifact `contains`) | >= 1 | 3 |

## The watched reds, transcribed verbatim

The first agent recorded in its commit message that both were watched failing; the transcriptions themselves were lost with the SUMMARY it never wrote. **They were therefore re-derived at close-out from the committed tree**, by making the same two mutations the acceptance criteria name, running the spec, and reverting the single file. What follows is real output from those runs, not a reconstruction.

### (1) D-174 — delete the reset line, three cases go red

Mutation: `e.target.value = "";` removed from the `finally` in `onAvatarChange`, nothing else touched. `npx vitest run tests/profile/avatar-field.test.tsx -t "D-174"` — exit 1, **3 failed / 14 skipped**:

```
 FAIL  tests/profile/avatar-field.test.tsx > D-174 — every handled change resets the input, on every path > resets after an ACCEPTED pick
AssertionError: expected [] to deeply equal [ '' ]
 ❯ tests/profile/avatar-field.test.tsx:469:36

 FAIL  … > resets after a REFUSED pick
AssertionError: expected [] to deeply equal [ '' ]
 ❯ tests/profile/avatar-field.test.tsx:478:36

 FAIL  … > resets after a pick that was accepted and then CANCELLED, and the re-pick is handled
AssertionError: expected [] to deeply equal [ '', '' ]
 ❯ tests/profile/avatar-field.test.tsx:502:36
```

The empty-array-vs-`[""]` shape is the whole point of issue (a) below: the spec records the assignments the component made, so the deleted line shows up as an assignment that never happened. Reading `input.value` would have printed `""` in both states and stayed green.

### (2) Rule F4 — move the upload into the change handler, two cases go red

Mutation: `await uploadAvatarAction(fd)` with the picked `File` inserted immediately before `setStaged(...)`, i.e. the shipped bug reinstated. `npx vitest run tests/profile/avatar-field.test.tsx -t "rule F4"` — exit 1, **2 failed / 14 skipped**:

```
 FAIL  … > calls the action ZERO times on pick and EXACTLY once after the confirm
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Received:
  1st vi.fn() call:
    Array [ FormData {} ]
Number of calls: 1
 ❯ tests/profile/avatar-field.test.tsx:281:28

 FAIL  … > sends the CONFIRMED blob under a filename, never the file that was picked
AssertionError: expected 5 to be 7 // Object.is equality
 ❯ tests/profile/avatar-field.test.tsx:306:33
```

The second failure is the more interesting one: `expected 5 to be 7` is the SOURCE file's byte length arriving where the CROPPED blob's was asserted. That case catches the speculative upload even in the shape where the count still came out right.

### (3) Task 2's red, as the first agent recorded it in `live-regions.ts` (OBSERVED RED (e))

Transcribed there permanently rather than only here, and re-read from the committed source:

> `src/components/profile/avatar-field.tsx` was created with its `role="alert"` and the suite was run FIRST, before this module was touched at all: `1 passed (1) / 26 passed (26)`. […] The path then went into `LIVE_REGION_FILES` ALONE, no row, alias left reading `extends 27`. `npx tsc --noEmit`, run bare — exit code 2, ONE error, the whole of stdout:
>
> ```
> src/lib/design/live-regions.ts(1742,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
> ```
>
> `tests/design/live-regions.test.tsx` failed twice in that same state — the count guard ("the declared set is 28 files, not 27"), and SCAN 2 reporting `avatar-field.tsx:296 — alert#1 on <p> (role="alert")` as PRESENT BUT UNDECLARED. Then the row, `27` → `28`, the rename, and the second pin in the test → exit 0, 26 tests passed.

Note the green first run: a `role="alert"` in an undeclared file is invisible to this gate, so the plan's literal instruction ("run it and observe it red") only produces a red in the intermediate state. That is (d)'s finding from 16-09, applied rather than re-derived — the note paid for itself one plan after it was written.

## Decisions Made

See `key-decisions` in the frontmatter. The two worth restating in prose:

1. **One region, one source, whichever half failed.** The dialog reports a local encode failure UP through `onEncodeFailed`; the field maps it to the same sentence the action returns. There is no second string and no second region for "the bytes could not be made".
2. **The client guards are not the trust boundary, and the component says so at the top.** `avatarFileSchema` re-validates type and size on every call and the 400x400 `c_fill` transform bounds the stored dimensions. The header states plainly that nobody may "remove the duplicate check", because there is no duplicate — there is one check on each side of a boundary (T-16-33).

## Deviations from Plan

### 1. [Rule 3 - Blocking] `tests/design/live-regions.test.tsx` was modified though the plan does not list it

- **Found during:** Task 2
- **Issue:** `DECLARED_FILE_COUNT` at `tests/design/live-regions.test.tsx:272` is the SECOND pin for the declared-file count, mandated by `live-regions.ts`'s own docblock. Moving only the type alias leaves the gate red with "the declared set is 28 files, not 27", which reddens `npm run test:design` and therefore `npm run build`.
- **Fix:** 27 -> 28, plus the surrounding prose that enumerates which plans moved both pins.
- **Files modified:** `tests/design/live-regions.test.tsx`
- **Verification:** `npm run test:design` 58 files / 1126 passed; `npm run build` exit 0.
- **Committed in:** `38328cb`
- **Assessment: justified, and it is the third consecutive plan to hit it** (15-09, 16-09, now 16-10), all three with the identical rationale. This is no longer a per-plan surprise; it is a standing property of the module that the planner should encode. **Recommendation for 16-11, which also declares `src/lib/design/live-regions.ts` and will move the `profile-avatar-error` row: add `tests/design/live-regions.test.tsx` to its `files_modified` up front.**

### 2. [Rule 3 - Blocking] `src/lib/validation/profile.ts` and `src/app/actions/avatar.ts` were modified though the plan does not list them

- **Found during:** Task 1
- **Issue:** The plan's own `<interfaces>` requires two SHIPPED sentences to be reused verbatim by the client — `Image must be 5 MB or smaller.` (guard 2) and `Could not upload your photo. Please try again.` (the save failure, also reused for a local encode failure). Both were inline string literals with no export, so "reused verbatim" was not reachable without either exporting them or re-typing them. Re-typing violates rule F2 (two copies of a string are two strings).
- **Fix:** Both exported as named constants from `src/lib/validation/profile.ts`, values byte-unchanged; the save sentence moved there from the action, which now imports it. The action is a `"use server"` module and may export nothing but async functions, so it could not itself be the shared home; `src/lib/avatar.ts` was ruled out because 16-UI-SPEC pins both strings as SHIPPED and re-declaring them beside the phase's new copy would read as authored. Each string still has exactly one home.
- **Files modified:** `src/lib/validation/profile.ts`, `src/app/actions/avatar.ts`
- **Verification:** `npx vitest run tests/profile/avatar.test.ts` runs inside the green `npm test` (2089 passed); the refine's message and the action's `error` are byte-identical to before.
- **Committed in:** `38328cb`
- **Assessment: justified.** The alternative was forbidden by the plan's own copy rule. Note that both files are plan **16-07**'s declared files (wave 2, already complete) and `src/app/actions/avatar.ts` is also plan **16-12**'s (wave 6) — 16-12 will edit an action whose failure return is now an import rather than a literal, which is a one-line difference in what it reads.

### 3. [Rule 3 - Scope] `deferred-items.md` was created

- **Found during:** Task 3
- **Issue:** The spec's a11y probing measured that the crop dialog's zoom slider has NO accessible name: Radix puts `role="slider"` on the THUMB, and the dialog's `aria-label` lands on the Root, which renders a role-less `<span>`. `queryAllByRole("slider", { name: "Zoom" }).length` is 0 against a real render.
- **Fix:** Not fixed — logged. `image-crop-dialog.tsx` is plan 16-09's file and not in this plan's scope, and the fix requires a design call about WHERE the name goes.
- **Files modified:** `.planning/phases/16-image-crop-framing/deferred-items.md` (created)
- **Committed in:** `7eda958`
- **Assessment: correct handling.** This is the executor scope rule working as intended. **It is also a real WCAG 2.2 SC 4.1.2 failure on a shipped control, and 16-UI-SPEC § Surface contracts 2 specifies the name that is missing — plan 16-13 or 16-14 should own it.**

---

**Total deviations:** 3 (3 Rule-3 blocking/scope). **No Rule 1 or Rule 4 events; nothing was fixed that this plan did not cause.**

**Impact on plan:** All three are justified. **The `files_modified` accuracy cost was nil in practice for this wave** — 16-10 is the only plan in wave 4 (waves 3, 4 and 5 each hold exactly one plan), so there was no sibling to collide with and intra-wave conflict detection had nothing to detect. The declared list was nonetheless 3 files against 6 source/test files actually touched, a 100% undercount, and two of the three misses were predictable at plan time: the second count pin is a documented standing rule, and the copy-reuse requirement was written into the plan's own `<interfaces>` without an export existing to satisfy it.

## Issues Encountered

**(a) `input.value` reads `""` in jsdom whether or not anything reset it.** jsdom derives that property from an internal file list, and `fireEvent.change(input, { target: { files } })` defines an own `files` property that shadows the prototype getter without touching that list — measured: `""` before the change and `""` after, with the handler confirmed to have run. `expect(input.value).toBe("")` would therefore assert nothing and stay green with D-174 deleted. **Resolved** by recording the ASSIGNMENTS through a setter installed on the element, each paired with proof the change was handled. Watched red (1) above is what that formulation buys.

**(b) jsdom THROWS where every browser no-ops, and it unmounted the whole dialog.** jsdom's style parser raises `SyntaxError: ")" is expected` on `calc(NaN% + 0px)`; the CSSOM specification requires setting an unparsable value to be a no-op. Radix's slider emits exactly that value whenever `min === max`, which is the zoom row's RESTING state for every source smaller than the output size — so without a fix the dialog unmounted mid-render and the field could not be tested at all. **Resolved** by wrapping the setters for the four physical offsets (`left`/`right`/`top`/`bottom` — the whole set Radix writes a thumb position to) to swallow the throw. This is conformance, not convenience, and it is the narrowest patch that restores it.

**(c) "Disabled" is also the zoom row's fail-closed default.** `maxZoom` initialises to 1 rather than to the ceiling, so a lone assertion that a small source disables the row would be asserting the default and would pass against a component that never computed anything. **Resolved** by driving the media load in every such case and pairing it with a sibling case that drives a LARGE source through the identical path and asserts the row is live and unannotated.

**(d) The run was interrupted before its gates.** See Interruption and close-out. No work was lost; the missing artefacts were the gate numbers and the red transcriptions, and both have been produced from the committed tree rather than recalled.

## Known Stubs

**One, and it is the plan's declared boundary rather than a stub in the pejorative sense.**

- **`AvatarField` is not mounted anywhere yet.** `grep -rn "avatar-field" src/` finds no importer: `/profile` still renders the shipped block inside `profile-form.tsx:119-157`. **Plan 16-11 does the extraction**, and this plan states in its objective that it deliberately does not touch `profile-form.tsx`. Until then a user sees no behaviour change on `/profile` — which is precisely why **CROP-01 is recorded as `requirements-advanced`, not `requirements-completed`**, and why `.planning/REQUIREMENTS.md` still reads `[ ] CROP-01 … Pending` (unchanged by this plan, same convention plan 16-09 used).
- No hardcoded empty collections, no placeholder copy, no unwired props: every string the field renders is an imported literal and every callback is wired to a real implementation.

`Remove photo` and `removeAvatarAction` are absent by design (CROP-03, plan 16-12) — an absent control is not a stub; a control shipped ahead of its action would have been.

## TDD Gate Compliance

Task 3 is marked `tdd="true"` and the git log shows `feat(16-10)` (`38328cb`) BEFORE `test(16-10)` (`7eda958`), which is the inverse of the RED-then-GREEN commit order.

**This is the plan's own sequencing, not a skipped gate.** The plan orders the composite as Task 1 and its spec as Task 3, and the spec's acceptance criteria define the RED differently — not "write a failing test first" but **"remove the behaviour, watch the test fail, restore it"**, twice, for D-174 and for F4. Both mutations were performed and both reds are transcribed above with real output; every one of the spec's 17 cases was written against the `<behavior>` block rather than against the implementation. The gate's intent — that the tests have teeth — is satisfied and now demonstrated on the record. The literal `test` -> `feat` commit sequence is not, and cannot be for a plan shaped this way.

## Threat Flags

None. No new endpoint, auth path, file-access pattern or schema change: the client composite calls one existing server action, and the two edits outside it name existing strings without changing a value. The plan's own register is honoured — T-16-33 (guards are UX, not the boundary) is stated in the component header, T-16-34 (`measureImage` rejects before any dialog mounts) is guard 3, T-16-35 (the URL is revoked on all three exits) is the staged-file lifecycle, and T-16-36 (no destructive affordance ahead of its action) is the absent removal control.

## Self-Check: PASSED

- `src/components/profile/avatar-field.tsx` — FOUND (318 lines)
- `tests/profile/avatar-field.test.tsx` — FOUND (544 lines)
- `.planning/phases/16-image-crop-framing/deferred-items.md` — FOUND (42 lines)
- `.planning/phases/16-image-crop-framing/16-10-SUMMARY.md` — FOUND (this file)
- commit `38328cb` — FOUND in `git log`
- commit `7eda958` — FOUND in `git log`
- `git status --porcelain` — carries only the pre-existing `.planning/config.json` modification and the untracked directories that predate this phase; nothing of this plan's is uncommitted, and the probe mutations were reverted (`git diff HEAD -- src/components/profile/avatar-field.tsx` is empty).
- `.planning/STATE.md` and `.planning/ROADMAP.md` — NOT modified by this agent, by instruction. The orchestrator is the single writer for both.
