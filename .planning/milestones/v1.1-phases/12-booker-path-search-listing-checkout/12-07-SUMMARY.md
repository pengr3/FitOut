---
phase: 12-booker-path-search-listing-checkout
plan: 07
subsystem: ui
tags: [gallery, lightbox, dialog, radix, a11y, focus-restore, rsc-boundary, jsdom, playwright, bflow-03]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 01
    provides: "MOSAIC_ASPECT — the gallery mosaic's outer box, declared before any surface consumed it. This plan is its first consumer, on both the real mosaic and the route skeleton."
  - phase: 12-booker-path-search-listing-checkout
    plan: 05
    provides: "the rail's fee popover focus trap — the one-focus-trap rule this plan had to compose rather than duplicate"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "selector-contract.ts (the const-tuple + TOTAL-Record compile gate and its bidirectional scan), patterns/responsive-dialog.tsx (the required-title discipline, the CONDITIONAL aria-describedby spread, the max-sm:-only sizing style), ui/dialog.tsx, sheet-absent.test.ts, brand-recipe.test.ts's diluted-composite inventory"
provides:
  - "A six-shape photo mosaic with named fallbacks at 1/2/3/4 photos, declared as DATA (MOSAIC_SHAPES) so a template is assertable per count"
  - "templateSlots() — the assertion that can see an empty cell, which a DOM cell count structurally cannot"
  - "photo-lightbox.tsx — a full-screen client dialog island, opened on the tapped photo, keyboard-pageable, with a required accessible name and a distinct close name"
  - "The RSC/client split as a shipped shape: server mosaic + client triggers taking server-rendered <img> as children, with zero hooks in the mosaic"
  - "A working focus RESTORE for a Radix dialog opened programmatically — the thing Radix does NOT give you and appears to"
  - "e2e/photo-lightbox.spec.ts — 14 cases, both themes, including the background-inert measurement and a hydration-guarded key-leak negative"
  - "The `photo-lightbox` selector row, and `foreground/90` recorded in the diluted-composite inventory"
affects: [12-09, 12-10, 12-11, 12-12, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A component's layout variants declared as a DATA table the gate reads, instead of branches the gate has to infer"
    - "Deriving a geometric invariant from the declared class strings (cols x rows minus the hero's span) so a browser-less test can assert a browser-only property"
    - "A literal expectation table in the TEST, never the component's own predicate helper — asserting markup against the helper that produced it is a tautology"
    - "A client island that renders the TRIGGERS and receives server-rendered children, so an interactive layer costs the server component no hooks"
    - "An absence assertion on a hydrated page must first prove hydration, or it measures the pre-hydration gap"

key-files:
  created:
    - "src/components/listing/photo-lightbox.tsx"
    - "tests/listing/photo-gallery.test.tsx"
    - "e2e/photo-lightbox.spec.ts"
  modified:
    - "src/components/listing/photo-gallery.tsx"
    - "src/app/listings/[id]/(detail)/loading.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/brand-recipe.test.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "The wide button predicate is N > 5, not N >= 5: at exactly five the wide mosaic already shows every photo, so `Show all 5 photos` would be a lie. The plan's shape table says `5+` and its acceptance criterion says `> 5`; the criterion wins because it is the one that is true of the rendered surface, and N=5 is in the seven counts precisely to pin it."
  - "ONE button element with a conditional `sm:hidden`, not a mobile button and a desktop button — two controls with one accessible name is a Playwright strict-mode ambiguity and a duplicate entry in a screen reader's element list, for a purely presentational difference."
  - "`<AspectRatio ratio={16 / 9}>` is dropped in favour of the MOSAIC_ASPECT class. Keeping both would have rebuilt measurements.ts's own named hazard — two spellings of one number in two languages — on the one route whose skeleton now reads the constant. It also removes a client dependency the file's `server-safe` claim did not survive."
  - "The alt strings are built on the server and passed to the island as props rather than shared through an import. The import would be a cycle one way, and a Server Component calling a function exported from a client module the other."
  - "Paging WRAPS rather than clamping, and the reason is focus, not navigation: a control that becomes disabled while focused drops focus to <body> inside a trap."
  - "`foreground/90` is `recorded` in the diluted-composite inventory, matching the two existing scrim rows — a surface carrying no text and no boundary has nothing for a ratio to be about, and the `bg-background` chrome plate is what makes 'carries no text' structural rather than a promise."

patterns-established:
  - "When a jsdom assertion cannot see the defect it is named for, derive the invariant from the declared strings instead of weakening the claim — and record the probe that showed the obvious spelling was green"
  - "A gate whose expectation comes from the implementation's own helper is a tautology; hold the literal table in the test and assert the helper AGAINST it, once"
  - "Do not spell out a string a plan's acceptance grep counts, including inside the sentence quoting that grep"

requirements-completed: [BFLOW-03]

# Metrics
duration: 118min
completed: 2026-08-18
---

# Phase 12 Plan 07: Six Mosaic Shapes, One Full-Screen Lightbox, and the Focus Restore Radix Only Looks Like It Gives You — Summary

**BFLOW-03 ships as a six-shape mosaic whose fallbacks are declared as data and pinned at the seven photo counts the seed listings actually produce, plus a full-screen dialog that opens on the photo the booker tapped — and the e2e gate written to prove it caught a real accessibility defect on its first run: a Radix dialog opened without a `DialogTrigger` restores focus to nothing at all, because the primitive suppresses the browser's native restore in order to focus a trigger that does not exist.**

## Performance

- **Duration:** ~118 min
- **Tasks:** 3
- **Files:** 3 created, 5 modified

## Task Commits

1. **Task 1: The six mosaic shapes, and the test that pins them** — `bbf0c5e` (feat)
2. **Task 2: The full-screen lightbox island** — `d6229fc` (feat)
3. **Task 3: The lightbox's behaviour gate** — `8696afb` (test)

## Accomplishments

- **Six named shapes, and the fallbacks are the normal case.** `MOSAIC_SHAPES` maps a photo count to a template (`empty` / `hero` / `pair` / `hero-stack-2` / `hero-stack-3` / `hero-quad`). Every count sits inside ONE `MOSAIC_ASPECT` box, including zero — so the plate's height never depends on how many photos a host uploaded, and `(detail)/loading.tsx` reserves it from the same string.
- **`loading.tsx`'s recorded residual is closed, and closed for its own stated reasons.** It said the gallery could not be reproduced because `measurements.ts` had no 16:9 constant and the gallery had three resolved heights. 12-01 supplied the constant; this plan collapsed the three heights to one. Both halves of the excuse are gone, so the plate is real rather than deferred again.
- **The alt copy change landed with nothing left behind.** `— cover photo` and the old `— photo {i}` form appear nowhere in `src/`. **Zero tests pinned the old strings** — measured across `tests/` and `e2e/` before editing, not assumed — so the "move every test that pins the old form in this commit" instruction had an empty answer, which is recorded here because an empty answer and an unchecked one look identical in a diff.
- **The mosaic stayed a Server Component while every photo became a trigger.** `photo-gallery.tsx` has zero hooks and zero client-boundary directives; `PhotoLightboxTrigger` takes each cell's server-rendered `<img>` as a child. The plate, the six templates and every alt string still render on the server for the OG and no-JS paths.
- **The lightbox composes the one overlay mechanism.** `ui/sheet.tsx` still does not exist, `Z_SHEET_INVENTORY` is still asserted empty, and the dialog renders at `--z-dialog`. `git diff --stat package.json` is **empty** — no gesture library, no new dependency.
- **14 e2e cases green in both themes**, including the two the requirement is really about: clicking mosaic cell 3 opens on `3 / 8` (not on the cover), and arrow paging reaches photos 6, 7 and 8, which have no mosaic cell at all.
- **`npx vitest run` 1258 passed / 4 skipped across 138 files; `npm run test:design` 41 files, 740 passed; `npm run build` and `npx tsc --noEmit` both exit 0.**

## The measured findings

### 1. Radix does NOT restore focus for a dialog you open yourself, and it fails silently

`e2e/photo-lightbox.spec.ts` case (c) went red on its first run against an implementation whose header confidently listed focus restore among the things Radix owned:

```
Error: focus did not come back to the photo that opened the lightbox
expect(locator).toBeFocused() failed
Locator:  getByRole('button', { name: 'E2E Lightbox Gym fa9427d1 — photo 3 of 8', exact: true })
Expected: focused
Received: inactive
```

**The mechanism.** Radix's *modal* dialog content sets `onCloseAutoFocus` to `event.preventDefault()` followed by `context.triggerRef.current?.focus()`. It deliberately suppresses the browser's own focus restore in order to place focus on **its** trigger — and `triggerRef` is populated only by `<DialogTrigger>`. This dialog has no `DialogTrigger` and structurally cannot have one: up to five mosaic cells plus a button all open ONE dialog at different indices, which is the entire reason `openAt(index)` exists. So the optional call no-ops on `null`, Radix's `preventDefault()` stands, and **focus lands on `<body>`** — from where the next Tab restarts the page from the top, on a booker-facing route.

This is the worst shape of accessibility defect: the primitive is doing something deliberate and correct-looking, the composition is idiomatic, and nothing warns. `patterns/responsive-dialog.tsx` never met it because every one of its adopters opens through `DialogTrigger asChild`.

**The fix adds the one reference Radix had no way to obtain** — each trigger hands its own `event.currentTarget` to `openAt`, and `onCloseAutoFocus` focuses it — and does not re-implement anything: Radix still owns the trap, the timing and the unmount. When no opener was recorded the handler returns without calling `preventDefault()`, leaving Radix's behaviour untouched, because taking over that decision unconditionally would be a claim this file has no basis for.

The header paragraph that said restore was inherited is **corrected in place**, not deleted — the repo's standing rule that a stated reason which has quietly become false is worse than no reason (11-09 finding 4, 12-06 deviation 2).

### 2. Two of this plan's own gates were VACUOUS as specified, and both were caught by probing rather than by reasoning

**(a) "The rendered cell count equals the photo count" cannot see an empty cell.** The plan asks for this at N = 3 and N = 4, and it is the natural spelling. It is also green against the defect: the component slices the photo array, so three photos produce three `<li>`s no matter how many slots the CSS template declares. The hole lives in the TEMPLATE, and jsdom compiles no CSS. Probed by widening the three-photo shape to the five-up template — the DOM assertion stayed green while the mosaic it describes had a hole in it.

The replacement is arithmetic over the declared class strings: `templateSlots()` reads the column count, the row count and the hero's row span and computes how many photos the shape has ROOM for (`1 + cols*rows - rowSpan`), then asserts it equals what the shape RENDERS. Under the same mutation:

```
AssertionError: `hero-stack-2` (sm:grid-cols-[2fr_1fr_1fr] sm:grid-rows-2 / sm:row-span-2) has room for
5 photos and renders 3. A surplus slot is an EMPTY CELL — the muted rectangle a booker reads as a failed
image. A deficit spills into an implicit row and the mosaic grows past MOSAIC_ASPECT. This is the
assertion a DOM cell count cannot make: the component slices the photo array, so the <li> count follows
the photos no matter what the template declares.: expected 5 to be 3
```

Its own parser is guarded first, on four fixtures that are never rendered — arithmetic over strings that silently parses to zero reports a clean sweep forever.

**(b) The button-predicate render assertion was a tautology.** It read `showAllPhotosVisibility(n)` — the component's own helper — and compared the markup to it. Flipping `>` to `>=` inside the helper moved both sides together: **every rendered assertion stayed green** while the five-photo mosaic grew a button offering to show all five of five. Only the hardcoded table caught it. The expectations now live in a literal `EXPECTED_BUTTON` table in the test, and the helper is asserted against that table exactly once. Under the same mutation, two assertions fire and the render one names the count and the direction:

```
AssertionError: at 5 photos the wide mosaic shows 5 of 5, so the button should be HIDDEN from `sm:` up.
: expected false to be true
```

### 3. The key-leak negative case took two corrections, and the second one is the general lesson

The plan asks for: *"attach the arrow handler to `window` → case (b) still passes but a new negative case (arrows pressed with the dialog CLOSED do not change the mosaic) fails."*

**That case cannot fail.** The mosaic does not reflect `activeIndex` in either implementation, and `openAt(i)` sets the index explicitly on every open, so a leaked index is overwritten before anything can observe it. The window listener really does mutate state while closed; that state is unobservable from outside.

What IS observable is what the leak does to the rest of the page: a `window` keydown handler calls `preventDefault()` on **every** arrow press on the route, with no dialog open, on a page that also renders a month grid and a scrollable document. So case (b2) dispatches a cancelable `ArrowRight` on `document.body` and asserts it comes back unprevented.

**And the first version of THAT was green against the mutation too.** `openListing()` then dispatch: 4 passed, against a `window` listener that was demonstrably live — case (b) was paging on it in the same run. The dispatch was racing **hydration**: straight after `goto` the island's JavaScript has not run, so nothing is listening and the event returns unprevented regardless of where the handler was written. Opening and closing the dialog first is the guard, because both halves require the island to be live. With it:

```
Error: an ArrowRight dispatched on the closed listing page came back defaultPrevented, which means
something is listening for arrow keys above the dialog content. The lightbox's handler belongs on the
dialog CONTENT, which is not mounted while it is closed (T-12-07-KEYLEAK).
Expected: false
Received: true
```

**The general lesson, third time this repo has recorded the shape:** an absence assertion on a hydrated page must first prove the page is hydrated, or it measures the gap before hydration instead of the property.

### 4. The plan's own `grep` acceptance criterion is broken by a comment explaining it — twice

Task 1's criterion is `grep -c '"use client"' src/components/listing/photo-gallery.tsx` returning **0**. The first draft of the header scored **3**: it named the directive three times, including once to say the file must not have one. The correction that replaced those three with prose still scored **1** — because the corrected sentence **quoted the grep command itself**.

This is the sixth instance of the shape in this repository (`booking-row.tsx:112`, `responsive-dialog.tsx`'s viewport-height note, 11-07's two, 11-08's three) and the first where the check is a plan's own grep rather than a test — which is why it could only be found by *running the criterion*, not by a red suite. The rule is written into the file at the place a future editor will meet it.

### 5. An open Radix dialog removes the background from the accessibility tree — measured accidentally, kept deliberately

Case (c)'s vacuity guard was first written as `expect(cell(page, 3)).not.toBeFocused()`, to prove focus had actually left before asserting it came back. It failed with **"element(s) not found"** rather than "is focused": an open modal marks everything outside its portal `aria-hidden`, so the mosaic trigger is not in the accessibility tree at all.

That is correct behaviour and it is the *other* half of T-12-07-FOCUSTRAP — an overlay that leaves the page behind it reachable is a keyboard trap in reverse — so the failure was turned into an assertion (`toHaveCount(0)` on the trigger while open) rather than worked around, and the vacuity guard now reads focus containment through the hook instead.

## Watched reds (all run, all reverted, tree clean after each)

| # | Gate | Mutation | Observed |
|---|---|---|---|
| A | `templateSlots` | three-photo shape given the five-up template | 1 failed / 22 passed, naming the shape, its room and its renders |
| A0 | *the DOM cell count, before A existed* | the same mutation | **GREEN** — the finding that produced A (finding 2a) |
| B | `EXPECTED_BUTTON` | `photoCount > MOSAIC_MAX_CELLS` → `>=` | 2 failed / 21 passed; before the literal table, **only 1** fired and no rendered assertion did |
| C | selector-contract, bidirectional | `photo-lightbox` → `photo-lightbox-box` | **3 failed / 4 passed** — the ban, the forward direction and the complement, the last naming both halves of the rename |
| D | selector-contract, compile gate | the `photo-lightbox` row deleted | `tsc --noEmit` exit 2, one TS2741 naming the id |
| E | e2e case (e) | `Close photos` → the vendored `Close` | 1 failed, printing the expected name and `Received: 0` |
| F | e2e case (b2) | arrow handler moved to a `window` listener | 1 failed on `defaultPrevented` — **and green before the hydration guard** (finding 3) |

**C, verbatim:**

```
AssertionError: the ids declared and the ids rendered are not the same set. Declared-but-absent:
[photo-lightbox]. Rendered-but-undeclared: [photo-lightbox-box]. One of each is almost always ONE
RENAME, and the fix is a single edit rather than the two unrelated ones the other assertions' messages
suggest in isolation.
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing correctness] Focus never returned to the trigger — Radix does not do it for a programmatically-opened dialog**

- **Found during:** Task 3, first run of case (c). Full analysis in finding 1.
- **Issue:** Escape closed the lightbox and focus went to `<body>`. The plan's own text ("Radix owns focus trap, focus restore, Escape, scroll lock and the portal") is true of dialogs opened through `DialogTrigger` and false of this one, which cannot use one.
- **Fix:** each trigger passes its own DOM node to `openAt`; `onCloseAutoFocus` restores it and returns without `preventDefault()` when there is no recorded opener. Nothing Radix provides is re-implemented.
- **Files:** `src/components/listing/photo-lightbox.tsx`
- **Committed in:** `8696afb`

**2. [Rule 1 - Bug] The header claimed Radix owned focus restore, on the file where that claim is load-bearing**

- **Found during:** Task 3, immediately after fix 1.
- **Issue:** the surviving sentence would have told the next reader that restore is inherited — the exact belief that produced the defect.
- **Fix:** corrected in place with the mechanism, not deleted. The list of what Radix owns now reads trap / Escape / scroll lock / background-inert / portal, and restore is called out as the one that looks inherited and is not.
- **Files:** `src/components/listing/photo-lightbox.tsx`
- **Committed in:** `8696afb`

**3. [Rule 3 - Blocking] `bg-foreground/90` is a diluted composite nothing had measured, and it turned `npm run build` red**

- **Found during:** Task 2, first `npm run build` after the island landed.
- **Issue:** `tests/design/brand-recipe.test.ts`'s WR-07 inventory pins **every** diluted composite in the tree; the scrim colour 12-UI-SPEC prescribes was not in it. The gate's own instruction is *"the fix is to measure it and add it with its status, not to add the key"*.
- **Fix:** a `foreground/90` row, `recorded`, matching the two existing scrim rows — a surface carrying no text and no boundary has nothing for a contrast ratio to be about. The row states that the "carries no text" claim is **structural** (all chrome sits on a `bg-background` plate) and that it is not blanket permission for the token.
- **What was NOT done:** reusing the already-declared `bg-foreground/80` to dodge the gate. Changing a prescribed design value to make a test green is the rubber-stamp reflex arriving through the gate meant to prevent it.
- **Files:** `tests/design/brand-recipe.test.ts`
- **Committed in:** `d6229fc`

### Scope adjustments recorded rather than absorbed

- **`<AspectRatio>` is dropped from `photo-gallery.tsx`.** The plan says it survives. It is replaced by the `MOSAIC_ASPECT` class because keeping both would rebuild `measurements.ts`'s own named hazard ("two spellings of one number in two languages") on the one route whose skeleton now reads the constant — the skeleton and the plate would agree by coincidence. It also removes a client dependency: `ui/aspect-ratio.tsx` carries the client-boundary directive, so the file's shipped "server-safe" claim was true of the file and not of its import graph. The PROPERTY the plan asked to preserve — the grid never reflows — is preserved by construction.
- **`tests/design/brand-recipe.test.ts` is outside `files_modified`** and was edited for deviation 3.
- **`src/app/listings/[id]/(detail)/page.tsx` is inside `files_modified` and was NOT edited.** It already passes `photos` and `title`; the island is wired inside `photo-gallery.tsx`, so the route needed no change. Recorded because an unedited declared file looks like an omission.
- **`photo-gallery.tsx` exports four helpers** (`mosaicShape`, `showAllPhotosVisibility`, `photoAlt`, `MOSAIC_SHAPES` + `MOSAIC_MAX_CELLS`) the plan does not name. They exist so the gate reads the declared template rather than restating it, and so the alt form has one definition feeding both surfaces.
- **Case (b2) and the background-inert assertion are net-new cases** not in the plan's a–f list, both for reasons measured rather than chosen (findings 3 and 5).

**Total deviations:** 3 auto-fixed (one Rule 1, one Rule 2, one Rule 3). **No new dependency, no migration, no change to booking/payment/capacity/availability logic.**

## Issues Encountered

- **`npx playwright test --project=chromium` (full): 88 passed / 5 failed / 8 skipped / 5 did not run.** All five accounted for, none caused by this plan:
  - `availability.spec.ts:261` and `public-listing.spec.ts:254` — the two **logged standing reds** (12-02, 12-06). Re-measured in isolation together: 4 passed / 2 failed, same two. Note that `public-listing.spec.ts`'s *"a published listing is viewable by an anonymous visitor"* case — which renders the new mosaic on a three-photo listing — **passes**, which is the positive control saying the draft-404 red is not the gallery's.
  - `shell.spec.ts:442`, `shell.spec.ts:558` and `search-and-book.spec.ts:307` — the **cross-file DB-contention flakes** 12-03, 12-05 and 12-06 all logged. `npx playwright test e2e/open-capacity.spec.ts e2e/shell.spec.ts e2e/search-and-book.spec.ts --project=chromium` → **28 passed**, byte-identical to the number 12-06 recorded for the same trio. `shell.spec.ts:442` alone → 2 passed. Postgres was at 9 connections throughout.
- **`npx tsc --noEmit` reported six syntax errors in `.next/dev/types/routes.d.ts`** while Playwright's dev server was running — a generated file truncated mid-write by concurrent compiles, containing visibly duplicated fragments. Not application code. Resolved by killing the dev server (port 3000 left clear, as required) and deleting `.next/dev/types`; `tsc` and `npm run build` then both exit 0.
- **`src/lib/design/measurements.ts` shows as modified in `git status` with an empty diff** — the line-ending artefact 12-06 recorded. Not staged, not touched.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-07-PHOTOSRC | accepted, unchanged | The lightbox renders the same stored Cloudinary `secure_url`s the mosaic already rendered — no new upload, signing, transform surface or origin |
| T-12-07-FOCUSTRAP | mitigated, and the mitigation was REPAIRED rather than inherited | Radix owns the trap; case (c) asserts focus returns to the opening trigger BY ACCESSIBLE NAME and that the background leaves the accessibility tree while open. The restore itself had to be supplied — finding 1 |
| T-12-07-NONAME | mitigated | An `sr-only` `DialogTitle`, asserted through `getByRole("dialog", { name })` resolving `.toBe(1)`; the close control is `Close photos` and the vendored `Close` is asserted ABSENT (which also catches `showCloseButton` being left on). Watched red E |
| T-12-07-KEYLEAK | mitigated | The handler is on the dialog content; `grep` for a window listener in the island returns nothing; case (b2) measures that a closed page does not intercept arrows. Watched red F — after two corrections that made it able to fail |
| T-12-07-HOOKGHOST | mitigated | The `photo-lightbox` row and its string literal landed in the same commit; watched reds C (3 assertions) and D (compile) |
| T-12-07-BOUNDARY | mitigated | `grep -c` for the client directive in `photo-gallery.tsx` returns **0** and it imports no React hook; the island is a sibling and the triggers take server-rendered children |
| T-12-07-SC | mitigated | `git diff --stat package.json` **empty**; `src/components/ui/sheet.tsx` absent; `sheet-absent.test.ts`'s gesture-library scan green; `Z_SHEET_INVENTORY` still empty |

## Known Stubs

None. Every surface this plan ships renders real data: the mosaic renders the listing's own photos at whatever count the host uploaded (including the zero case, which is a real state and not a placeholder), and the lightbox pages the same array. No hardcoded empty values, no "coming soon" text, no component receiving mock data.

## Threat Flags

None. No new network endpoint, no new auth path, no new file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire in `tests/design/infra.test.ts` green inside `npm run build`).

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 41 design test files, 740 passed / 3 skipped, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` (whole suite) | **1258 passed / 4 skipped, 138 files** |
| `npx vitest run tests/listing` | **130 passed / 13 files** |
| `npx vitest run tests/listing/photo-gallery.test.tsx` | **23 passed** |
| `npx vitest run --config vitest.design.config.ts` selector-contract + sheet-absent + elevation-z + focus-recipe | **102 passed** |
| `npx playwright test e2e/photo-lightbox.spec.ts --project=chromium` | **14 passed** (7 cases × court + grove) |
| `npx playwright test --project=chromium` (full) | 88 passed / 5 failed / 8 skipped / 5 did not run — all five accounted for above |
| `npx playwright test e2e/open-capacity.spec.ts e2e/shell.spec.ts e2e/search-and-book.spec.ts` | **28 passed** — matches 12-06's recorded figure exactly |
| `grep -c '"use client"' src/components/listing/photo-gallery.tsx` | **0** |
| `data-testid="photo-lightbox"` occurrences in `src/` | **1**, a string literal |
| `grep` for a window/document keydown listener in `photo-lightbox.tsx` | **no matches** |
| `src/components/ui/sheet.tsx` | **absent** |
| `git diff --stat package.json` | **empty** |
| `ls drizzle/*.sql` | 26 files, last `0025_audit_resolved_by.sql` |
| `grep -n "globalSetup\|setupFiles" vitest.design.config.ts` (comments excluded) | **no matches** |
| port 3000 after the run | **clear** |

## Next Phase Readiness

- **12-10 (the booking sheet)** — the second overlay on this route arrives as a `ResponsiveDialog`, and the two hooks are now what tell them apart. Case (d) asserts the lightbox is NOT `[data-testid="responsive-dialog"]`; the sheet's close control must be named **`Close booking`**, because case (e) already asserts the string `Close` is absent from the lightbox and the whole point of both names is that a screen reader's element list can distinguish them. If the sheet is opened programmatically rather than through `DialogTrigger`, **it will hit finding 1** — read that section before debugging.
- **12-11 (`e2e/mobile-booker-path.spec.ts`)** — owns the two gaps logged to `deferred-items.md`: the button's `sm:hidden` half is asserted as a class and never as rendered visibility, and the mosaic's geometry is measured by nothing. One `toBeVisible()` at 375px and one `toBeHidden()` at 1280px close the first; a `boundingBox()` against the skeleton closes the second.
- **Anyone adding a diluted composite** — `tests/design/brand-recipe.test.ts`'s inventory must gain a row with its measured status, and `recorded` is only correct for a surface that carries no text and no boundary. The `foreground/90` row says so at the row.
- **Anyone adding a `data-testid`** — the row and the string literal land in the same commit or the build fails three ways (watched red C) and `tsc` fails a fourth (D).
- **The three visual baselines that include `/listings/[id]`** are now stale — the gallery's rendered shape changed on every listing with more than one photo. **Not minted locally**: `updateSnapshots: "none"` is unconditional and the `visual` project is not created off Linux (D-28/D-29). Regenerate in the pinned Linux dispatch job.

**No blockers.**

## Self-Check: PASSED

- Files: `12-07-SUMMARY.md`, `src/components/listing/photo-lightbox.tsx`, `src/components/listing/photo-gallery.tsx`, `src/app/listings/[id]/(detail)/loading.tsx`, `src/lib/design/selector-contract.ts`, `tests/listing/photo-gallery.test.tsx`, `tests/design/brand-recipe.test.ts`, `e2e/photo-lightbox.spec.ts`, `deferred-items.md` — **9/9 FOUND**
- Commits: `bbf0c5e`, `d6229fc`, `8696afb` — **3/3 FOUND**
- Artifact `contains` checks: `photo-lightbox` string literal in `photo-lightbox.tsx` ✓ · `// @vitest-environment jsdom` on line 1 of `photo-gallery.test.tsx` ✓ · seven counts (0,1,2,3,4,5,8) covered ✓ · `PhotoLightbox` imported by `photo-gallery.tsx` ✓ · `MOSAIC_ASPECT` imported by `(detail)/loading.tsx` ✓
- Key links: `photo-gallery.tsx` → `photo-lightbox.tsx` via the sibling island holding open state and the active index ✓ · `(detail)/loading.tsx` → `measurements.ts` via `MOSAIC_ASPECT` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
