---
phase: 16-image-crop-framing
plan: 14
subsystem: ui
tags: [avatar, crop, cascade, exif, canvas, axe, a11y, playwright, react-easy-crop, gate-states]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    plan: 09
    provides: "`src/components/profile/image-crop-dialog.tsx` — the stage, the classes slot and the `cropAreaClassName` site that named this plan"
  - phase: 16-image-crop-framing
    plan: 13
    provides: "`e2e/avatar-crop.spec.ts` and `e2e/helpers/avatar-session.ts` — the only place the crop stage exists for a test, plus three measured findings this plan did not have to re-derive"
  - phase: 16-image-crop-framing
    plan: 08
    provides: "`src/lib/avatar-canvas.ts` — the encoder whose output these proofs sample"
  - phase: 16-image-crop-framing
    plan: 04
    provides: "the eleven committed fixtures; three of them (`exif-orientation-6.jpg`, `transparent.png`, `animated.png`) were consumed by nothing until now"
provides:
  - "Delta-6's mask ring and scrim, SHIPPED by the route a browser said would work — the class route was applied, measured losing on all three properties, and replaced by an inline style over two declared tokens"
  - "The byte-honesty proofs: preview-vs-saved-bytes equality on an EXIF-Orientation-6 source, the white matte on screen and in the file, the still first frame, and 400x400 from a 300px source — all sampled from the multipart body that left the browser"
  - "GATE-STATES discharged as a rendering assertion (a11y tree + non-zero box) and its two deliberate absences asserted with their reason"
  - "GATE-A11Y: the repo's FIRST axe pass, injected from the already-resolved `node_modules/axe-core` with `package.json` untouched — 23 rules pass / 0 violations on the crop dialog, 21 / 0 on the removal confirm"
  - "Three product defects found by those assertions and fixed: the stage measured itself 5% small inside the overlay's entry animation (IC-02 divergence), the stage's name sat on a role-less div (axe SERIOUS), and the zoom thumb had no name at all (D1)"
affects: [16-15 e2e triage, 16-16 the CROP-04 hardware walk, Phase 17's court-only axe sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Choosing a styling route by `getComputedStyle` in a real browser and asserting the RESULT rather than the mechanism, so the assertion survives the route being changed later"
    - "Capturing the bytes that LEAVE the browser by parsing the server action's multipart body in `page.route`, instead of exposing a Blob on `window` from product code"
    - "Tamper-and-continue: rewriting four characters of the captured part's declared media type so the REAL server refuses it in Zod — a genuine failure response, no forgery, and no orphaned Cloudinary asset"
    - "Proving a rendered sentence is the server's own by fetching the refusal, keeping its body, replaying it, and asserting the announced text appears in it — verbatim without the spec owning a copy of the copy"
    - "Injecting `axe-core` from `node_modules` via `addScriptTag` — an audit with an empty `package.json` diff, guarded by an existence check and a non-vacuity floor on the passing-rule count"
    - "Probing a timing-shaped claim across four dwell times before pinning it, so 'the first frame' is invariant to elapsed time rather than lucky with it"

key-files:
  created:
    - .planning/phases/16-image-crop-framing/16-14-SUMMARY.md
  modified:
    - src/components/profile/image-crop-dialog.tsx
    - src/components/ui/slider.tsx
    - e2e/avatar-crop.spec.ts
    - tests/profile/avatar-field.test.tsx
    - scripts/generate-image-fixtures.mjs
    - e2e/fixtures/animated.png
    - e2e/fixtures/README.md
    - .planning/phases/16-image-crop-framing/deferred-items.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The CLASS ROUTE LOST, measured: with `border-2 border-background` and the ink token's 55% modifier on `cropAreaClassName`, Chromium computed `border-width: 1px`, `border-color: 255,255,255 at 0.5 alpha`, `color: 0,0,0 at 0.5 alpha` — all three the library's own unlayered values. The INLINE-STYLE route ships and `EXPECTED_DILUTED_TOKENS` stays at 20 keys."
  - "The crop stage measured itself 182.4px inside a 288px container — exactly 192 x 0.95 — because `react-easy-crop` sizes from a bounding rect and `DialogContent` opens with `zoom-in-95`. The mask covered 95% of the displayed photo while `croppedAreaPixels` reported 100% of it, so the saved avatar carried a ring the person never saw. Fixed with one `computeSizes()` call after the animation settles."
  - "The stage's `aria-label` sat on a role-less `<div tabindex=\"0\">` — axe `aria-prohibited-attr`, impact SERIOUS. `role=\"group\"` is the smallest fix; `role=\"application\"` was rejected for dropping AT out of browse mode."
  - "`animated.png` was generated at 160x160, below `AVATAR_MIN_SOURCE_PX`, so guard 4 refused it before the dialog opened and the fixture could not be used by anything. Regenerated at 320x320 from the generator."
  - "The plan's named watched-red for the 400x400 group does NOT move the dimensions: a destination rectangle taken from `area` still emits a 400x400 canvas, with the photo in one corner. The corners are what pin it, and the dimension assertion alone would have been vacuous."
  - "`16-14-PLAN.md` puts the EXIF-6 corner block in the bottom-left. It is top-right, as `e2e/fixtures/README.md` records and as this run re-measured; the plan text repeats `16-04-PLAN.md`'s error."
  - "axe runs from the transitively-resolved `axe-core` in `node_modules` rather than a new devDependency: this phase's one argued dependency exception is spent on `react-easy-crop` (D-167) and Phase 11 shipped an empty `package.json` diff as an acceptance criterion."
  - "Two vendor colour strings and one vendor prop name are DESCRIBED rather than spelled inside `image-crop-dialog.tsx`, because the leak gate and this plan's own acceptance greps both count them — the recurring self-collision this tree has hit twelve-plus times."

patterns-established:
  - "Route-agnostic computed-style assertions: pin the value the contract asks for, resolve the expected colour from the theme in the same document, and accept both interpolation-space spellings so the mechanism can change without the test changing"
  - "An interception that captures, then deliberately fails, the request it captured — proof about outbound bytes at zero side-effect cost"

requirements-completed: [CROP-01]

# Metrics
duration: ~3h
completed: 2026-08-26
---

# Phase 16 Plan 14: The Preview IS the Contract — Summary

**The mask's styling route was decided by a browser rather than by a guess (the class route lost on all three properties), and the four byte-honesty proofs that close CROP-01 found a real 5% divergence between what the crop circle showed and what the encoder saved — the stage had been measuring itself inside the dialog's entry animation, permanently, on every open.**

## Performance

- **Duration:** ~3 h
- **Started:** 2026-08-25T23:00Z
- **Completed:** 2026-08-26T00:00Z
- **Tasks:** 3/3, plus one orchestrator-assigned fix and three deviations
- **Files:** 1 created, 9 modified (2 of them `.planning/`)
- **This spec:** **31 cases · 1.6 min** (`--project=chromium`, 4 workers, run alone) — up from 16-13's 20 / 56.3 s

## Task Commits

| # | What | Commit | Type |
|---|---|---|---|
| 0 | **D1 (orchestrator-assigned)** — the zoom slider's thumb gets an accessible name | `8634bb1` | fix |
| 1 | **Task 1** — the cascade measured, the winning route shipped, the inventory left where the measurement put it | `0b4f8c3` | feat |
| — | *(deviation)* `animated.png` regenerated at 320x320 so it clears the source floor | `408f6dc` | chore |
| — | *(deviation)* the stage re-measures after the overlay's entry animation | `7dca510` | fix |
| 2 | **Task 2** — the byte-honesty proofs | `1300a78` | test |
| — | *(deviation)* the crop stage gets a role that can carry its name | `eb12fab` | fix |
| 3 | **Task 3** — GATE-STATES as a rendering assertion, GATE-A11Y on the open dialog | `2cff8dc` | test |

## THE ROUTE: the inline style, because the class route was measured losing

**The three observed computed values, verbatim, taken with `border-2 border-background` and the ink
token's 55% opacity modifier applied to `classes.cropAreaClassName` — i.e. with the plan's preferred
route really on the element:**

| property | expected (Delta-6) | **OBSERVED with the class route** | verdict |
|---|---|---|---|
| `border-width` | `2px` | **`1px`** | the library's |
| `border-color` | the `--background` token | **`rgba(255, 255, 255, 0.5)`** | the library's |
| `color` | the ink token at 55% | **`rgba(0, 0, 0, 0.5)`** | the library's |

**All three properties stayed the vendor's, so the INLINE-STYLE route shipped and the diluted-token
inventory did not move.** `react-easy-crop` injects its stylesheet UNLAYERED into `document.head` at
mount while Tailwind v4 utilities live inside a cascade layer; both rules flatten to specificity
(0,1,0), so the layer decides and the layer says the library wins. 16-RESEARCH § A5 predicted exactly
this and 16-13 measured the same defeat from the other side (`ring-*` is dead on this element because
the library's own `box-shadow` already occupies that property). An inline style beats every stylesheet
rule, layered or not — so `style={{ cropAreaStyle: … }}` over `var(--background)` and a `color-mix()`
of the ink token is the only one of § A5's three routes that both works and stays inside the design
contract. `EXPECTED_DILUTED_TOKENS` stays at **20** keys because this route produces no Tailwind
opacity-modifier class and therefore no diluted-token site; the gate is bidirectional, so adding a row
for it would have reddened `brand-recipe.test.ts` rather than completed it.

**After the route landed, the same route-agnostic assertion reads:**

| property | **OBSERVED with the inline route** |
|---|---|
| `border-width` | **`2px`** |
| `border-color` | **`lab(100 0 0)`** — identical to a probe resolving `var(--background)` in the same document |
| `color` | **`oklch(0.145 0.0000036961 none / 0.55)`** — identical to a probe resolving the ink token at 55% |

The assertion pins those RESULTS and resolves both expected colours from the theme rather than from
literals, so it stays green if the cascade ever flips and the class route starts winning.

### The iff criterion, both counts pasted

| grep | result |
|---|---|
| `grep -c "foreground/55" tests/design/brand-recipe.test.ts` | **0** |
| `grep -c "text-foreground/55" src/components/profile/image-crop-dialog.tsx` | **0** |

Both `0`, as the inline route requires. **The undeclared-site red was NOT watched, and it was not
supposed to be:** that branch belonged to the class route, which the browser rejected before any
inventory edit was made. The plan's order — measure first, edit the inventory last — is what kept
that from being a wasted red.

⚠ **A wording collision was avoided deliberately and is recorded as a decision.** Both greps above
count a literal that this plan's own explanatory prose wanted to quote — the twelve-plus-instance
failure mode this tree keeps hitting. So `image-crop-dialog.tsx` DESCRIBES the two vendor colours and
the forbidden style-injection prop instead of spelling them (the leak gate bans the eight-bit colour
function under `src/components/**`, and the plan's acceptance greps require zero occurrences of the
prop name), and this SUMMARY carries the verbatim strings instead. Same precedent as
`src/lib/avatar-canvas.ts`'s header and 16-13's vendor-test-id paragraph.

## THE BYTE-HONESTY PROOFS: measured values, not "matched"

### The EXIF-Orientation-6 round trip

The framing was panned to `restrictPosition`'s vertical clamp first — at zoom 1 the crop square is the
source's shorter side (320) centred in a 320x480 portrait, so the default framing spans source rows
80..400 and excludes the fixture's marker entirely. The crop rectangle's origin is then **derived**
from the observed geometry and asserted to be source `(0, 0)` rather than assumed.

| relative offset | where | **PREVIEW sampled** | **SAVED BYTES sampled** |
|---|---|---|---|
| (0.9, 0.1) → preview (288, 32), output (360, 40) | inside the orientation marker | **`254, 0, 0` α255** | **`254, 0, 0` α255** |
| (0.1, 0.9) → preview (32, 288), output (40, 360) | flat body, far from every edge | **`255, 255, 255` α255** | **`255, 255, 255` α255** |

**The corner half, which is the unambiguous one:** the saved square's **top-right** is red and the
other three corners are white. ⚠ **`16-14-PLAN.md` (around line 220) asserts the BOTTOM-LEFT and is
wrong**, repeating `16-04-PLAN.md`'s error — Orientation 6 means *rotate the stored raster 90°
clockwise to display*, and that carries a stored top-left corner to the displayed **top-right**. The
fixture README already records this as measured by two independent decoders; this run re-measured it.
Had the orientation been ignored the source would be 480x320 landscape, the marker would sit at raw
x ∈ [0, 64), a centred crop would exclude it altogether, and all four corners would be white — so the
assertion distinguishes the two decodes in both aspect and corner.

### The white matte, seen before it was stored

| reading | **OBSERVED** |
|---|---|
| the rendered STAGE, sampled at its centre through the fixture's transparent region | **`255, 255, 255` α255** |
| the saved JPEG, same region | **`255, 255, 255` α255** |
| the saved JPEG at the fixture's one OPAQUE block (non-vacuity) | **`254, 0, 0` α255** |

The on-screen value is read by screenshotting the stage element and decoding it in the page. Court's
`--background` is `oklch(1 0 0)` and `avatar-canvas.ts`'s matte literal is `#ffffff`, which is what
makes IC-02 exact in the shipped theme rather than merely close — and the two whites are compared
directly, because "both are whitish" is not the sentence IC-02 makes.

### The still first frame, probed before it was pinned

Sampled at three points of the output: **`254, 0, 0`** at all three — one flat frame, and it is frame
ONE (the fixture cycles pure red → pure blue every 0.5 s).

**Pinning "frame one" looks like a clock reading, so it was probed rather than assumed.** The confirm
was delayed by **0 ms, 700 ms, 1200 ms and 2600 ms** — more than two full loops of the animation — and
the stored pixel read `254, 0, 0` every time. `drawImage` yields the first frame whatever the element
is presenting, so the assertion is invariant to elapsed time. This repository has shipped two
time-bomb assertions seeded from a clock; the probe is what makes this not a third.

### Always 400x400, and always the one format

| reading | **OBSERVED** |
|---|---|
| decoded output dimensions from a 300x300 source | **400 x 400** |
| declared media type on the wire | **`image/jpeg`** |
| the part's own `Content-Disposition` | **`form-data; name="_1_avatar"; filename="avatar.jpg"`** |
| first three bytes | **`0xFF 0xD8 0xFF`** (a real JPEG SOI) |
| encoded size | **1699 bytes** |
| all five sampled points (centre + four corners) | flat green, `0, 255, 1` at the centre |

**Nothing here asserts anything about the bytes Cloudinary stores**, and a comment beside the group
says why: the upload carries an incoming transformation, an incoming transformation re-encodes, and
§ C12 measures the 400x400 `c_fill` as the geometric identity on a 400x400 input while the stored file
is a different JPEG. `grep -c "storedBytes\|byte-identical" e2e/avatar-crop.spec.ts` returns **0**.

## GATE-STATES and GATE-A11Y, discharged by things a browser observed

### The error state

All four clauses hold: the dialog stays **open**, the refusal is in the a11y tree as the field's one
`role="alert"`, its box measures **non-zero**, and the framing is **intact** — the zoom the person set
and the crop position they panned to are both unchanged across the failed save, and both were moved
first so neither half is vacuous.

**The "verbatim" half is proved without this spec owning a copy of the sentence.** The interception
fetches the real refusal, keeps its body, replays it unchanged, and the announced text is asserted to
appear in the server action's own response. A re-typed literal would have gone green the day the
sentence changed; this cannot.

### The two deliberate absences

Asserted DURING the pending window, which is the only moment either could plausibly appear: **no
skeleton, no progressbar, nothing labelled or reading `Loading`** inside the dialog. The reason is in
the assertion's own message — the four guards and the decode both complete BEFORE the component
mounts, so the stage never renders without its measured image and there is no moment for a loading
state to describe; and "no image" is not a state this dialog can be in, because unstaging is
unmounting. The loading state that DOES exist is asserted positively: `Saving…` on the disabled
confirm, with a non-zero box, and it goes away when the request settles.

### The axe pass, court only (D-138) — the repo's first

| surface | **rules passed** | **violations** | incomplete | theme |
|---|---|---|---|---|
| `/profile` with the crop dialog open | **23** | **0** | 1 | `court` |
| `/profile` with the removal confirm open | **21** | **0** | 2 | `court` |

Non-vacuity is asserted before the zero: an axe that loaded, audited nothing and returned an empty
violations list reports exactly the same green as a clean surface, so the passing-rule count carries
its own floor. Two contexts are excluded and both are the dev server's own furniture, named rather
than filtered silently: `nextjs-portal` and `next-route-announcer`. `incomplete` is recorded but not
gated on — those are axe's "needs review" items, and turning them into a gate is Phase 17's call.

### Keyboard operability — measured stop counts and the order walked

| overlay | **stops** | order walked |
|---|---|---|
| the crop dialog | **5** | `Zoom` → `Cancel` → `Save photo` → `Close` → `Photo position…` (the stage) |
| the removal confirm | **3** | `Close` → `Remove photo` → `Keep photo` |

Every stop paints an indicator, and — the part that makes it an indicator rather than decoration —
paints something it does NOT paint when another control has focus. The crop dialog's walk starts from
the stage, which already holds focus at open, and closes the loop back onto it.

**D-168's binding mitigation holds in a real browser:** the removal confirm opens with
**`Keep photo`** focused, measured as `button[button]:Keep photo`, not the destructive action Radix
would otherwise choose.

## Deviations from Plan

### 1. [Rule 1 — Bug] The crop stage measured itself inside the dialog's entry animation, and the saved square was not the square on screen

- **Found during:** Task 2(a), by the assertion the plan asked for
- **Measured in Chromium, with the stage settled for a further 1.5 s:**

| reading | value |
|---|---|
| the stage wrapper, layout AND painted | **288 x 288** |
| the media element, laid out by CSS | **192 x 288** |
| the crop area the library wrote | **182.4 x 182.4** — `192 × 0.95`, exactly |

- **Diagnosis, not a re-tune.** `react-easy-crop` sizes itself from
  `containerRef.getBoundingClientRect()` — a TRANSFORMED rect — and `ui/dialog.tsx` opens
  `DialogContent` with a `zoom-in-95` keyframe. The image is an object URL the caller has already
  decoded, so it loads a frame or two after mount, squarely inside that 100 ms window. Every size the
  library derives is 5% short. **And it never recovers:** `computeSizes` re-runs on a window resize,
  on its container's `ResizeObserver` (whose first callback it skips) and on a `rotation` / `aspect` /
  `objectFit` / `cropSize` prop change — a CSS transform is none of those, the container's content box
  never moves, so nothing fires.
- **⚠ Why it is a correctness bug and not a cosmetic one.** The media element is laid out by the
  library's own stylesheet at the full 192 x 288 while the mask over it is 182.4. The person sees a
  circle covering **95% of the photo's width**; `croppedAreaPixels`, computed against the library's
  shrunken `mediaSize`, reports **100%** of it. The saved avatar carried a ~5% ring of the photograph
  that was never inside the circle. That is precisely the divergence IC-02 exists to forbid — *the
  preview IS the contract* — and it was live on every open, at every viewport, for every source.
- **Fix:** one `computeSizes()` call on the library's own published class API
  (`index.d.ts:154`), once `document.getAnimations()` has settled, after one `requestAnimationFrame`
  so the entry animation exists to be awaited. Called with no argument on purpose — the
  `isResizeTriggered` form debounces the crop-data emit, and the point is that `onCropComplete`
  re-fires with the corrected rectangle before anyone can press the confirm.
- **Three alternatives rejected, each measured or reasoned at the constant:** dispatching a window
  `resize` (**measured not to work** — that listener is attached only when `ResizeObserver` is
  undefined, and every browser in the matrix has one); remounting via a changed `key` (works, and
  drops focus off the stage, which holds it at open); deferring the cropper's mount (a blank moment,
  a contradicted GATE-STATES answer, and open-time focus moves to `Cancel`). Editing the shared
  overlay's animation would change six adopters to fix one.
- **Files:** `src/components/profile/image-crop-dialog.tsx` · **Commit:** `7dca510` (proof in `1300a78`)

### 2. [Rule 2 — a11y correctness] The crop stage's accessible name was on an element that cannot carry one

- **Found during:** Task 3(c), by this plan's own axe pass
- **Measured:** `aria-prohibited-attr`, impact **SERIOUS**, 1 node, `.reactEasyCrop_CropArea` —
  *"Elements must only use permitted ARIA attributes."*
- **Diagnosis.** The library renders the crop area as a bare `<div tabindex="0">`, and ARIA forbids
  `aria-label` on an element whose implicit role is generic. The name is discarded, so a screen-reader
  user lands on an **unlabelled focus stop in the middle of the one control this dialog exists for**.
  Playwright's `getByLabel` computes a name anyway — which is exactly why nothing caught it until a
  real auditor ran: every test in this phase could address an element the accessibility tree could not.
- **Fix:** `role="group"` through `cropperProps`. Smallest role that supports an author-supplied name,
  changes no interaction semantics, leaves the library's arrow-key handling reachable.
  `role="application"` was rejected — it drops assistive technology out of browse mode for everything
  inside it, a large behavioural change to buy a naming fix.
- **Files:** `src/components/profile/image-crop-dialog.tsx` · **Commit:** `eb12fab`

### 3. [Rule 3 — Blocking] `animated.png` was generated below the floor the shipped flow enforces

- **Found during:** Task 2(c), watched red
- **The red, transcribed:**
  ```
  Locator: getByLabel('Photo position. Use the arrow keys to move your photo.')
  Expected: visible
  Error: element(s) not found
  ```
- **Issue:** the fixture was 160x160. `AVATAR_MIN_SOURCE_PX` is 200, so guard 4 refuses it *before the
  crop dialog opens* — `/profile` renders `AVATAR_TOO_SMALL_MESSAGE`, there is no stage, no confirm and
  no produced Blob. The one behaviour the fixture exists to prove was unreachable through the shipped
  flow, and asserting it anywhere else would be asserting about a `drawImage` call this repository does
  not make.
- **Fix:** regenerated at 320x320 **from the generator**, which is the authority; the committed bytes
  and `tests/design/image-fixtures.test.ts`'s in-memory re-render agree. The fixture README's row and
  the reasoning are updated with it.
- **Files:** `scripts/generate-image-fixtures.mjs`, `e2e/fixtures/animated.png`,
  `e2e/fixtures/README.md` · **Commit:** `408f6dc`

### 4. [Contract] The plan's named watched-red for the 400x400 group does not move the dimensions

- **Found during:** Task 2(d)
- **Issue:** the plan asks for the destination rectangle to be changed to `area.width`/`area.height`
  and for the 400x400 assertion to fail on it. Applied for real: **it did not fail.** The canvas is
  still sized `AVATAR_OUTPUT_PX` square, so `toBlob` still emits 400x400 — what changes is that the
  photo is painted into the top-left 300x300 and the rest stays the white matte. **A 400x400 avatar
  with the person's face in one corner passes every assertion about its size.**
- **The assertion was strengthened rather than the finding absorbed.** Four corner samples were added
  beside the centre; `small-300.png` is flat green edge to edge, so a correct output is green at every
  corner. Watched red on exactly the plan's edit:
  ```
  Error: the saved square samples 255,255,255 a255 at (390, 10). `small-300.png` is flat green edge
  to edge and the crop covers all of it, so a WHITE reading here is the matte showing through …
  ```
  Restored; `git diff --exit-code src/lib/avatar-canvas.ts` exits **0**.
- **Files:** `e2e/avatar-crop.spec.ts` · **Commit:** `1300a78`

### 5. [Instrument correction] The focus walk was racing the button's own colour transition

- **Found during:** Task 3(c)
- **Issue:** the removal confirm's `Close` reported an **identical** `oklab(… / 0.309085)` box-shadow
  focused and unfocused, and the difference check called a real indicator "decoration". `ui/button.tsx`
  carries `transition-[color,box-shadow]`, so a ring read immediately after a Tab is mid-fade — and the
  unfocused snapshot a moment later catches the *previous* control's outgoing fade at a similar alpha.
  A margin that is a race rather than a tolerance, exactly the class 16-13 found for `boundingBox()`.
- **Fix:** `settleAnimations()` before every focus probe in the overlay walk.
- **Files:** `e2e/avatar-crop.spec.ts` · **Commit:** `2cff8dc`

## Orchestrator-Assigned Work (outside the plan's task list)

### D1 — the zoom slider ships with no accessible name · `8634bb1`

**Watched red first**, in `tests/profile/avatar-field.test.tsx` (jsdom), which is where plan 16-10
measured the absence:

```
TestingLibraryElementError: Unable to find an accessible element with the role "slider"
and name "Zoom"
```

with the dumped thumb showing `role="slider"`, `aria-valuenow`, `data-disabled` — and no `aria-label`
or `aria-labelledby` at all.

**The fix, in `src/components/ui/slider.tsx`:** a single-thumb slider's `aria-label` is forwarded to
the **thumb** (the element carrying `role="slider"`) and dropped from the Root. Both halves matter —
leaving it on the Root would keep an `aria-label` on a `<span>` with no role, which is prohibited by
ARIA and is a real `aria-prohibited-attr` finding, not a tidiness point. **Multi-thumb sliders are
deliberately untouched:** there Radix's own `getLabel` names each thumb by index, and copying one
caller-supplied name onto every thumb would replace two distinct names with one ambiguous one. This
repo has exactly one slider call site and it is single-value.

**The assertion lives where the absence was measured**, so it cannot drift back silently. And 16-13's
request was honoured: `sliderOf` in `e2e/avatar-crop.spec.ts` is now
`getByRole("slider", { name: AVATAR_ZOOM_LABEL })`. The `dialog` scope is kept but is no longer
load-bearing — it just keeps the failure message about the dialog's contents.

**D1's sibling is NOT fixed and is logged as D7:** the thumb still exposes no `aria-disabled`, so the
disabled assertions read `data-disabled` and the tab order. That is the "Value" clause on a control
that is already out of the tab order, and the fix is a policy call the orchestrator did not assign.

## Verification

| Gate | Result |
|---|---|
| `npx playwright test e2e/avatar-crop.spec.ts --project=chromium` | **0** — **31 passed** (1.6 min) |
| `npx vitest run tests/design/brand-recipe.test.ts --config vitest.design.config.ts` | **0** — 25 passed |
| `npm run test:design` | **0** — 59 files / **1137 passed** / 3 skipped — **identical to 16-13's post-state** |
| `npm test` | **0** — 185 files / **2102 passed** / 5 skipped — **identical to 16-13's post-state** |
| `npm run build` | **0** |
| `npm run lint` | **0 errors** (25 pre-existing warnings, all `no-unused-vars` in unrelated test files) |
| `npx tsc --noEmit` | **0** |
| `git diff --exit-code src/lib/design/accent-uses.ts` | **0** — `AccentUseCountIsTen` untouched (Delta-9) |
| `git diff --exit-code src/lib/avatar-canvas.ts` | **0** — the watched-red edit restored byte-for-byte |
| `git diff --stat package.json package-lock.json` | **empty** — the axe pass adds no dependency |

### Acceptance greps

| grep | expected | **actual** |
|---|---|---|
| `grep -c "foreground/55" tests/design/brand-recipe.test.ts` | — | **0** |
| `grep -c "text-foreground/55" src/components/profile/image-crop-dialog.tsx` | equal to the above | **0** ✓ |
| `grep -rc "disableAutomaticStylesInjection\|react-easy-crop.css" src/` | `0` | **0** |
| `grep -cE "\b(rgba?\|hsla?\|oklch\|oklab\|lab\|lch)\(" src/components/profile/image-crop-dialog.tsx` | `0` | **0** |
| `grep -c "storedBytes\|byte-identical" e2e/avatar-crop.spec.ts` | `0` | **0** |

### The e2e scope, stated plainly

**The phase gate was NOT read off a full `chromium` run**, per the orchestrator's instruction and
`deferred-items.md` D6 (three reproducible pre-existing failures plus D2's contention set, none of
them Phase 16's). The named regression set that WAS run, each alone at 1 worker:

| spec | why it is in the set | result |
|---|---|---|
| `e2e/avatar-crop.spec.ts` | this plan's own | **31 passed** |
| `e2e/overflow-320.spec.ts` | carries the `/profile` rows, including the dialog-open state | **60 passed / 15 skipped** |
| `e2e/auth-keyboard.spec.ts` | shares `helpers/focus.ts`, which this plan now imports four more symbols from | **7 passed** |
| `e2e/price-parity.spec.ts` | GATE-NOREG names it | **1 passed** — flaked once, see below |

`price-parity.spec.ts` failed once with `strict mode violation: locator('#search-category') resolved
to 2 elements` and passed on an immediate identical re-run. **Not this plan's, proved two ways:**
`git diff --name-only 8634bb1~1 HEAD` lists eight files, none reachable from `/`; and
`src/components/search/search-bar.tsx` — the only place that id is rendered — was last touched by
`cafc5bb` on **2026-08-19**, in Phase 12. The cause is already recorded in this tree at
`src/lib/design/visual-baselines.ts:429`: *"`/` streams, and its own `loading.tsx` renders a second
`SearchBar` … `#search-category` appears twice while the boundary resolves."* **Logged as D8.**

## Requirements

**CROP-01 is CLOSED.** Its text is *"A user can frame and zoom their avatar before it uploads, and the
server's blind face-gravity re-crop no longer re-frames what the user just chose."*

- **Clause 2** was code-complete at plan 16-12 (`gravity: "face"` → `gravity: "center"`, D-171).
- **Clause 1's rendering half** was closed by plan 16-13 in a real browser: the stage renders, measures
  its derived box at three viewports, refuses four bad files against a real decoder, bounds its zoom
  per image and pans by keyboard with the clamp intact.
- **Clause 1's "before it uploads" half is this plan**, and it is now proved on the bytes that leave
  the browser rather than on an intermediate: the preview and the saved square sample identically at
  matched offsets of an EXIF-Orientation-6 source, the marker lands in the corner the corrected
  orientation puts it in, transparency stores the same white the person saw on the stage before
  confirming, an animated source stores one still frame, and a 300px source stores a 400x400 JPEG that
  fills its square.

**And the claim is now true rather than merely asserted, which it was not when this plan started.**
The preview and the stored bytes really were two different rectangles — the mask covered 95% of the
displayed photo while the encoder was handed 100% of it — and that is fixed here (deviation 1). Ticking
CROP-01 without that fix would have been the same mistake 16-13 declined to make, one layer down.

Pointer drag-pan and pinch-zoom remain **CROP-04**'s hardware walk (D-175), which CROP-01's own record
already says is not its clause.

`.planning/REQUIREMENTS.md` updated: the checkbox is ticked, **the traceability table row is
hand-corrected to `Complete`** (the SDK verb moves the checkbox and leaves the row stale), and the
multi-plan status note is rewritten to record the closure and its evidence.

## Known Stubs

None. No hardcoded empty value, no placeholder sentence and no unwired data source was introduced;
every literal rendered by the changed component is still an import from `@/lib/avatar`.

## Threat Flags

None. The changed surface adds no endpoint, no auth path, no file-access pattern and no schema field.
The one new outbound behaviour is confined to `e2e/` — an interception that rewrites a request it is
about to fail on purpose — and it exists only inside the test process.

Two entries in the plan's register are worth marking as discharged rather than assumed:
**T-16-51** (a mask that looks styled but is not) was the reason the route was chosen by
`getComputedStyle`, and the assertion pins the result rather than the mechanism.
**T-16-53** (the stored avatar not being what the user approved) turned out to be a LIVE finding, not
a hypothetical — see deviation 1.

## For the Next Plan

**16-15 inherits:**

1. **D8 (new)** — `price-parity.spec.ts` races `/`'s streaming search bar; two live elements share
   `#search-category` while the Suspense boundary resolves. Triage it with **D6** and **D2**; all three
   are the same shape (a false red on a green tree) and all three are pre-existing.
2. **D3 still open** — at exactly 400px the disabled zoom row gives a reason that is not true. It is a
   copy decision and this plan did not take it.
3. **D7 (new)** — the zoom thumb exposes no `aria-disabled`. Minor, and it needs a policy call about
   whether a disabled slider should stay in the tab order at all.
4. **The axe pass now exists and costs nothing.** `runAxe` in `e2e/avatar-crop.spec.ts` injects the
   already-resolved `axe-core` with an empty `package.json` diff, guards its own source path and
   asserts its own non-vacuity. Phase 17's court-only sweep can lift it as-is. ⚠ Its one fragility is
   named in the code: `axe-core` reaches this repo TRANSITIVELY through `eslint-config-next`, and if
   that path ever changes the fix is a one-line `devDependencies` entry — not deleting the audit.

**16-16's hardware walk gains nothing new from this plan**, but deviation 1 is worth carrying to it:
the stage was 5% smaller than its box on every open until now, so any pre-16-14 impression of how much
photo the circle shows is stale.

## Self-Check: PASSED

**Files claimed created — present:**
- `.planning/phases/16-image-crop-framing/16-14-SUMMARY.md` — FOUND (this file)

**Files claimed modified — all present and changed in this plan's range:**
- `src/components/profile/image-crop-dialog.tsx` — FOUND
- `src/components/ui/slider.tsx` — FOUND
- `e2e/avatar-crop.spec.ts` — FOUND
- `tests/profile/avatar-field.test.tsx` — FOUND
- `scripts/generate-image-fixtures.mjs` — FOUND
- `e2e/fixtures/animated.png` — FOUND (320x320, 1824 B)
- `e2e/fixtures/README.md` — FOUND
- `.planning/phases/16-image-crop-framing/deferred-items.md` — FOUND
- `.planning/REQUIREMENTS.md` — FOUND

**`must_haves` contract:**
- `e2e/avatar-crop.spec.ts` contains `getComputedStyle` — ✓
- `tests/design/brand-recipe.test.ts` provides `EXPECTED_DILUTED_TOKENS` — ✓, **left at 20 per the
  measurement**, which is the branch the plan's artifact row allows
- key_link `image-crop-dialog.tsx` → `brand-recipe.test.ts` via the scrim's shape and its inventory
  row landing together **or neither doing** — ✓, neither did

**Commits verified present in `git log`:** `8634bb1`, `0b4f8c3`, `408f6dc`, `7dca510`, `1300a78`,
`eb12fab`, `2cff8dc` — all FOUND.

**Orchestrator tracking boundary respected:** `.planning/STATE.md` and `.planning/ROADMAP.md` are
**not** in this plan's diff, and no `state.*` / `roadmap.*` / `phase.complete` / `record-metric` /
`add-decision` / `record-session` SDK write verb was invoked. `.planning/REQUIREMENTS.md` WAS edited —
by hand, for CROP-01 only, as the orchestrator explicitly assigned.

**Prohibited operations:** no `git stash` (or any subcommand) was run at any point. The one time work
had to be set aside — the watched red on `src/lib/avatar-canvas.ts` — it was done with a `cp` backup
to the scratchpad and verified restored with `git diff --exit-code`.

---

*Phase: 16-image-crop-framing · Plan 14 · completed 2026-08-26*
