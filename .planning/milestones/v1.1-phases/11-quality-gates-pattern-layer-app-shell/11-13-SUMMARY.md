---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 13
subsystem: design-system
tags: [ds-11, patterns-layer, adoption, panel-card, sticky-offset, coverage-gate, ac25, ast-scan]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-08's `patterns/panel-card.tsx` (the container this plan adopts, with the `sticky` prop that encodes the 80px offset); plan 11-10's `tests/design/sticky-offset.test.ts` (the AST paired scan whose pinned count this plan moves) and its 64px `HEADER_HEIGHT`; plan 11-02's `selector-contract.ts`, whose three container ids key this plan's gate; plan 11-11's MEASURED refusals for `listing-card.tsx` and `notification-item.tsx`; plan 11-06's `price-total` hook and its parity spec"
  - phase: 10-design-system-token-layer
    provides: "the three-step elevation scale (a panel is flat at rest) and `contrast-pairs.ts`'s declared `muted-foreground on muted` pairing, which is what makes `tone=\"muted\"` a zero-new-pairing change"
provides:
  - "Five surfaces plus the checkout rail rendering through `PanelCard`: both sticky rails, the payout summary, the invite shell and the hours-missing notice"
  - "The sticky offset with exactly ONE home in the codebase — `sticky-offset.test.ts`'s pinned count went 3 → 1, the direction plan 11-10 predicted by name"
  - "`tests/design/card-pattern-coverage.test.ts` — AC#25 as a both-directions AST gate: a forward inventory of the twelve declared card surfaces, and an inverse allow-list that turns a fourth container shape into a named failure"
  - "The recorded finding that `price-breakdown.tsx` has no container of its own, and that the container the UI-SPEC means is `reserve-view.tsx`'s checkout rail"
  - "A named, reproducible React hydration error on `/listings/[id]` — the first direct evidence for the `[11-03]`/`[11-11]` duplicate-node hypothesis"
affects: [11-14, 11-15, 11-16, 11-19, 11-20, 11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A coverage gate is written in BOTH directions or not at all: a forward inventory is satisfied by a tree where every named surface adopted AND somebody added a thirteenth container yesterday"
    - "A measured refusal is encoded as a row with a status, not as an omission — so a future adoption reds the gate and forces the reason to be read before it is deleted"
    - "When a spec names a file as owning a container it has never had, the module that actually renders the box is the surface — and both files get told, in the commit that decides it"
    - "A component is CONTENT; the panel is the surface it is rendered onto. Boxing content inside its own file when its only call site already boxes it nests two cards and pays the padding twice"

key-files:
  created:
    - tests/design/card-pattern-coverage.test.ts
  modified:
    - src/app/listings/[id]/(detail)/page.tsx
    - src/components/booking/reserve-view.tsx
    - src/components/booking/price-breakdown.tsx
    - src/components/host/payout-summary.tsx
    - src/app/(public)/invite/[token]/page.tsx
    - src/app/(host)/host/page.tsx
    - tests/design/sticky-offset.test.ts
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md

key-decisions:
  - "`price-breakdown.tsx` was NOT wrapped in a `PanelCard`, and the reason is structural: its root is a bare `<div className=\"space-y-3\">` and always has been, and its ONE call site already renders it inside the checkout rail. The spec's \"price-breakdown.tsx's container\" is `reserve-view.tsx:73`, which is what was converted"
  - "`reserve-view.tsx` was converted although the plan does not list it — without it the plan's own `lg:sticky` acceptance criterion is unsatisfiable, and plan 11-10's pinned count predicted the 3 → 1 by name"
  - "`payout-summary.tsx`'s labels stayed `<p>` rather than moving onto `PanelCard`'s `title` prop, which renders an `<h2 className=\"text-heading\">` — a semantic and type-ramp change, not a container swap, on a surface HFLOW-05 deliberately leaves alone"
  - "The two 11-11 refusals are encoded in the gate as `status: \"refused\"` rows asserted NOT to import their pattern, rather than deleted from the inventory — the exception carries its measurement"
  - "`ALLOWED_RAW_CARD` is 15 files / 22 call sites, each attributed to the phase whose ROADMAP scope note claims the surface. It is a list of files, not of call sites, on purpose"
  - "Only ONE of the two hours-missing sites is a panel; `listing-card.tsx:210` is an inline meta line inside a tile's CardContent and was left alone — a card inside a card is not what DS-11's clause means"
  - "ZERO `border-dashed` sites were converted. All 24 in the tree are untouched and remain plan 11-16's to count"

patterns-established:
  - "A plan-prescribed grep AC tripped by a file's own explanation is answered by BOTH naming the class descriptively (the `booking-row.tsx:112` precedent) and measuring the real property over the AST with a positive AND a negative control — tenth occurrence in Phase 11"
  - "A pinned count's PREDICTION is kept in the file when it comes true, not deleted — a number whose history is erased is a number nobody can argue with"

requirements-completed: []

# Metrics
duration: 47min
completed: 2026-08-14
---

# Phase 11 Plan 13: PanelCard Adoption and the Card-Surface Coverage Gate Summary

**Six boxes now come from one pattern, the 80px sticky offset has exactly one home in the codebase, and "every card surface uses one of three" stopped being a sentence somebody has to believe.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-08-14T01:33:00Z
- **Completed:** 2026-08-14T02:20:00Z
- **Tasks:** 3
- **Files modified:** 8 (5 source, 2 test, 1 planning doc) + 1 test file created

## Accomplishments

- **Both shipped sticky rails are `<PanelCard sticky>`, and `sticky-offset.test.ts`'s pinned count went 3 → 1** — the exact direction plan 11-10 wrote into that file when it pinned 3 ("*a count that stayed at 3 afterwards would mean the rails kept their own offsets alongside the prop*"). The prediction is recorded as satisfied rather than deleted.
- **Four more surfaces boxed by the pattern:** the payout summary (two panels), the invite shell, and the hours-missing notice as `tone="muted"`. Ten of the UI-SPEC's twelve named card surfaces now compose a declared container.
- **AC#25 is a test.** `tests/design/card-pattern-coverage.test.ts` is 11 assertions over the TypeScript AST, in both directions, watched red four ways. The inverse half is the one that does the work: probe (b) added a hand-rolled `<Card>` in a new file and the FORWARD half stayed perfectly green while the inverse half named the file and line.
- **The `price-breakdown.tsx` container question was answered by reading the tree rather than the spec** — and both files now say so, at the two places somebody would go looking.
- **Zero packages, zero vendored edits, zero migrations.** `git diff --stat 2fe2ddd HEAD -- src/components/ui/ package.json components.json package-lock.json` is empty; `ls drizzle/*.sql | tail -1` is still `0025_audit_resolved_by.sql`.

## Task Commits

1. **Task 1: PanelCard adoption — the listing rail, the price breakdown's container, the payout summary** — `7f91177` (refactor)
2. **Task 2: PanelCard adoption — the invite card and the hours-missing notice** — `d92b5b6` (refactor)
3. **Task 3: The card-surface coverage gate (AC#25)** — `7737f85` (test)
4. **Task 1 follow-up: descriptive naming for the removed sticky classes** — `c92286e` (docs)

## Files Created/Modified

**Created**

- `tests/design/card-pattern-coverage.test.ts` — 11 assertions, +11 tests on the design gate. Forward inventory (`CARD_SURFACES`, 12 rows), inverse allow-list (`ALLOWED_RAW_CARD`, 15 files), four guard-the-guard assertions asserted FIRST, a positive control, and four both-directions self-tests over fixtures never written to disk.

**Source**

- `src/app/listings/[id]/(detail)/page.tsx` — the booking rail is `<PanelCard sticky>`; the raw class pair is gone and the children are byte-identical.
- `src/components/booking/reserve-view.tsx` — the checkout rail is `<PanelCard sticky>`; the file now records that it is the price breakdown's container and why.
- `src/components/booking/price-breakdown.tsx` — **no container added**, and a header block saying so, with the double-box arithmetic. This is the file's whole change.
- `src/components/host/payout-summary.tsx` — two `PanelCard`s; labels stay `<p>`, `space-y-1` preserved as an explicit wrapper.
- `src/app/(public)/invite/[token]/page.tsx` — `InviteCard`'s box is `PanelCard`; `space-y-6` preserved as an explicit wrapper. `metadata`, `INACTIVE_TITLE` and `INACTIVE_BODY` byte-unchanged.
- `src/app/(host)/host/page.tsx` — the hours-missing notice is `<PanelCard tone="muted">`, keeping `data-hours-missing` on the `<p>`.

**Tests**

- `tests/design/sticky-offset.test.ts` — `EXPECTED_STICKY_SITES` 3 → 1, its docblock rewritten to record what the three were and where each went, one assertion title corrected, and a fourth watched-red probe (d) added and run.

**Planning**

- `deferred-items.md` — one `[11-13]` entry: the named React hydration error on `/listings/[id]`.

### Pinned inventories, old → new

| Map | Assertion | Old → New | Why |
|---|---|---|---|
| `EXPECTED_STICKY_SITES` | `has exactly N lg:sticky sites` + the positive half | `3` → `1` | Both shipped rails moved onto the `sticky` prop. Predicted by name in the same file by plan 11-10. |

No other pinned inventory moved. `elevation-z.test.ts` was re-run and is unchanged: none of the six converted boxes carried a `shadow-` or a `z-` utility, and `PanelCard` adds neither (a panel is flat at rest).

## Decisions Made

- **`price-breakdown.tsx` has no container of its own, and adding one would have been a defect.** The plan's `must_haves` asks that file to provide "the price breakdown's container as `PanelCard`". It cannot: its root is `<div className="space-y-3">` and always has been, and `<PriceBreakdown>` has **exactly one call site** (`listings/[id]/book/page.tsx:406`), which renders it into `reserve-view.tsx`'s rail. Wrapping it there would have put a second `bg-card ring-1 rounded-xl` inside the one that already wraps it and paid the block padding twice — the same trap `deferred-items.md` measured at 112px vs 80px on the row cards. So **the container the UI-SPEC means is `reserve-view.tsx:73`**, and that is what was converted. Both files now carry the reasoning: `price-breakdown.tsx`'s header says *do not "finish the adoption" by adding a Card here*, and `reserve-view.tsx` says *this is `PriceBreakdown`'s container, and that is why this file is in plan 11-13 at all*.

- **`reserve-view.tsx` was converted although the plan does not list it, and the plan's own criterion is what forced it.** The acceptance criterion is that `lg:sticky` occurs once, inside `panel-card.tsx`. The second shipped occurrence was the checkout rail. Independently, `sticky-offset.test.ts`'s docblock — written by plan 11-10 — names both rails and states the expected direction as `3 → 1`. Leaving the checkout rail would have left the plan unsatisfiable and the prediction false.

- **`payout-summary.tsx`'s labels did not move onto `title`.** `PanelCard`'s `title` renders `<h2 className="text-heading">`. Using it would have made each figure a document heading and changed its type ramp — a semantic and visual change on a surface HFLOW-05 explicitly leaves as a token pass, because those numbers have never been real. The pair also keeps its own `space-y-1`: the pattern's content rhythm is `space-y-4`, and a 16px gap between a label and the number it labels reads as two facts instead of one.

- **The two refusals are ROWS in the gate, not omissions from it.** `listing-card.tsx` and `notification-item.tsx` carry `status: "refused"` plus the short form of 11-11's parser measurement, and are asserted **NOT** to import their pattern. If a future phase legitimately makes one adoptable, the gate goes red and somebody has to come and read the reason before deleting it. That cost is the point: 11-11 spent real time proving the adoption-agency algorithm shatters that anchor into six, and a gate that simply omitted the file would have let the next plan re-run the experiment.

- **`ALLOWED_RAW_CARD` is 15 files with a reason each, enumerated by an AST scan rather than by reading the spec.** 22 call sites in four groups: the four auth shells (Phase 15), the booking-detail family and the four calm payment states (Phase 13, whose criterion 4 requires those states to become *visibly different from each other* — a shared container is plausibly the wrong answer for them), the two availability editors (Phase 14 / HFLOW-04), and `listing-card.tsx` (the measured refusal, listed from the other direction). It is a list of **files**, not of call sites: pinning per-file counts would go red on every unrelated edit to `bookings/[id]/page.tsx`, and a gate that cries wolf is one people stop reading. The count still travels in the failure message.

- **Only one hours-missing notice is a panel.** An AST scan for the three `HOURS_MISSING_*` constants finds exactly two render sites. The host dashboard's is a standalone advisory and became `tone="muted"`. `listing-card.tsx:210` is an inline meta line inside a tile's `CardContent` — a card inside a card is not what "every card surface uses one of three" means, and it was left alone.

- **`tone="muted"` and not the alarm tone, deliberately.** DS-10 reserves that one for a genuine failure needing a human; a published listing with no weekly hours is a normal, self-service, fixable state — the same argument the file's shipped comment already makes about not using an alert variant. `muted-foreground on muted` is a pairing `contrast-pairs.ts` already declares and measures, so this adds zero new tones and zero new pairings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's `lg:sticky` criterion is unsatisfiable without converting `reserve-view.tsx`, which `files_modified` does not list**

- **Found during:** Task 1
- **Issue:** The criterion is `grep -rc "lg:sticky" src/app src/components` → 1, inside `panel-card.tsx`. The tree held two shipped rails. `sticky-offset.test.ts`'s own docblock names both and predicts `3 → 1` after this plan.
- **Fix:** Converted the checkout rail to `<PanelCard sticky>` in the same commit as the listing rail, with the reasoning recorded in the file.
- **Files modified:** `src/components/booking/reserve-view.tsx`
- **Verification:** `EXPECTED_STICKY_SITES` red observed first (see the Verification Run table), then 11 passed.
- **Committed in:** `7f91177`

**2. [Rule 1 - Bug] The plan's artifact spec would have double-boxed the price breakdown**

- **Found during:** Task 1
- **Issue:** `must_haves.artifacts` asks `price-breakdown.tsx` to provide "the price breakdown's container as `PanelCard`". That file has no container, and its only call site already boxes it.
- **Fix:** Converted the real container (`reserve-view.tsx`) and left `price-breakdown.tsx` a bare div, with a header block recording the measurement so the next reader does not "finish the job".
- **Files modified:** `src/components/booking/price-breakdown.tsx` (comment only), `src/components/booking/reserve-view.tsx`
- **Verification:** `grep -c 'data-testid="price-total"'` still `1`; `e2e/price-parity.spec.ts` passes — the DOM total still equals the DB total.
- **Committed in:** `7f91177`

**3. [Rule 3 - Blocking] `sticky-offset.test.ts`'s pinned count and one assertion title had to move**

- **Found during:** Task 1
- **Issue:** The count is pinned separately from the rule, deliberately, so a conversion reds it. Its "reached the three files that actually own a sticky site" title also became false.
- **Fix:** Count `3 → 1` with a rewritten docblock recording what the three were and where each went; the title corrected to *"the one file that owns a sticky site AND the two rails that gave theirs up"* — the two rails stay named on purpose, because they are precisely where a regression would land. A fourth watched-red probe (d) was added and run.
- **Files modified:** `tests/design/sticky-offset.test.ts`
- **Verification:** reds observed verbatim before the pin moved; probe (d) run and recorded.
- **Committed in:** `7f91177`

**4. [Rule 1 - Bug] The plan's `attention` grep criterion went red on a correct file — twice**

- **Found during:** Task 2
- **Issue:** `grep -c "attention\|destructive" src/app/(host)/host/page.tsx` reads `1` at baseline (the shipped *never an alert-colour variant* sentence). A comment explaining which tone was refused took it to 2. A first fix that named the tone descriptively but **quoted the shipped sentence it was paraphrasing** left it at 2 for the other half of the pattern.
- **Fix:** Both halves named descriptively; the two-pass history is written into the comment so the next reader does not repeat it. Count back to the baseline of 1.
- **Files modified:** `src/app/(host)/host/page.tsx`
- **Verification:** `1` before, `2` after the first draft, `2` after the first fix, `1` after the second — measured at each step.
- **Committed in:** `d92b5b6`

**5. [Rule 1 - Bug] The `lg:sticky` criterion is itself tripped by prose — the tenth occurrence in Phase 11**

- **Found during:** final verification
- **Issue:** After the conversion, `grep -rc "lg:sticky" src/app src/components --include=*.tsx` read **4 across 3 files** — every hit a comment, including the two this plan had just written to explain the removal.
- **Fix:** Both new comments reworded to the `booking/booking-row.tsx:112` / `panel-card.tsx:103-106` precedent (name the class descriptively). `panel-card.tsx`'s own rule statement was left alone: it is the one file that owns the class, and asking it not to name the rule would be absurd. Naive grep now reads **2, both in `panel-card.tsx`** (its rule statement + the one class string).
- **The real property, measured over the AST with both controls:**
  - class-string sites: `1` — `src/components/patterns/panel-card.tsx:107`
  - positive control (synthetic `<div className="lg:sticky lg:top-8" />`): **fired** — `fake.tsx:1`
  - negative control (the identical class named in a comment only): `[]`
- **Files modified:** `src/app/listings/[id]/(detail)/page.tsx`, `src/components/booking/reserve-view.tsx`
- **Committed in:** `c92286e`

### Plan-directed but out of `files_modified`

**6. Three files edited that `files_modified` does not list**

- `src/components/booking/reserve-view.tsx` — deviations 1 and 2; the plan's own criterion is unsatisfiable without it.
- `tests/design/sticky-offset.test.ts` — deviation 3; `npm run build` runs `npm run test:design`, so this could not have been deferred.
- `deferred-items.md` — the hydration finding below.

### Found and logged, not fixed

**7. [SCOPE BOUNDARY] `/listings/[id]` throws a named React hydration error on every dev-mode load — pre-existing**

- **Found during:** Task 1 verification, in the Playwright `[WebServer]` log.
- **What it is:** `Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client.` The client puts the `Not bookable yet` tooltip trigger where the server put the rail's closing reassurance `<p>` — the rail's child list is offset by one.
- **Why it matters beyond this page:** *"this tree will be regenerated on the client"* is exactly the mechanism `[11-03]` and `[11-11](a)` hypothesised for their `resolved to 2 elements` failures without being able to name a mismatch. Here the mismatch is named, on a third page, with a one-command reproduction and no date arithmetic.
- **Proven NOT caused by this plan:** `(detail)/page.tsx` alone was reverted with `git checkout -- …` and the spec re-run against the otherwise-unchanged tree. `grep -c "Hydration failed"` = **1**, identical to the run with the `PanelCard` conversion in place. The plan's version was restored and re-verified.
- **Written up in `deferred-items.md` as `[11-13]`.**

---

**Total deviations:** 7 (2 correctness fixes to the plan's own artifact spec, 1 pinned-test update, 2 plan-vs-tree grep corrections, 1 scope note, 1 logged pre-existing defect)
**Impact on plan:** No package installed, no vendored primitive edited, no registry block fetched, no migration added. The material outcome is that the UI-SPEC's `PanelCard` *Replaces* list needed one correction (`price-breakdown.tsx` → `reserve-view.tsx`), and it is now on the record in both files and in the gate.

## `border-dashed` — for plan 11-16

**This plan converted ZERO `border-dashed` sites.** The `border-dashed` block on `(host)/host/page.tsx:149` is the *"No listings yet"* empty state, a **sibling** of the hours-missing notice rather than its wrapper, and it was not touched. All **24** occurrences across **12** files are exactly where 11-16 will find them:

`(app)/bookings/page.tsx` 2 · `(host)/host/bookings/page.tsx` 1 · `(host)/host/earnings/page.tsx` 1 · `(host)/host/listings/page.tsx` 1 · `(host)/host/page.tsx` 1 · `(host)/host/requests/page.tsx` 1 · `availability/availability-calendar.tsx` 3 · `availability/date-pass-picker.tsx` 4 · `listing/photo-uploader.tsx` 1 · `patterns/empty-state.tsx` 4 · `patterns/error-state.tsx` 2 · `search/search-results.tsx` 3.

## `ALLOWED_RAW_CARD` — the 15 entries, with their owning phase

| File | Sites | Owner | Reason (short) |
|---|---|---|---|
| `(auth)/login/page.tsx` | 1 | Phase 15 | The auth form shell; the UI-SPEC lists none of the four under a `Replaces` line |
| `(auth)/signup/page.tsx` | 1 | Phase 15 | Same shell + the intent radio group |
| `(auth)/forgot-password/page.tsx` | 1 | Phase 15 | Same shell, one field wide |
| `(auth)/reset-password/page.tsx` | 1 | Phase 15 | Same shell; the token-bearing URL |
| `(app)/bookings/[id]/page.tsx` | 5 | Phase 13 | The surface criteria 2 and 4 rewrite end to end |
| `(app)/bookings/[id]/cancel/page.tsx` | 2 | Phase 13 | The refund-ladder box (TRUST-04 / STATE-05) |
| `(app)/bookings/[id]/group/page.tsx` | 1 | Phase 13 | Group surfaces are folded into that phase by name |
| `group/attendee-roster.tsx` | 1 | Phase 13 | Also a `RowCard` candidate — guessing which is how a pattern gets adopted wrongly |
| `booking/expired-approval-state.tsx` | 1 | Phase 13 | Criterion 4 requires these states to become visibly *different* |
| `booking/payment-reversed-state.tsx` | 1 | Phase 13 | Must make an explicit money statement |
| `booking/pending-payment-state.tsx` | 1 | Phase 13 | Must offer no error affordance while the webhook is authority |
| `booking/hold-expired-state.tsx` | 1 | Phase 12/13 | Reached from checkout AND the reversed state — it straddles |
| `availability/weekly-hours-editor.tsx` | 2 | Phase 14 | HFLOW-04 adds a week-at-a-glance preview — structural |
| `availability/blocks-editor.tsx` | 2 | Phase 14 | Same surface, same phase |
| `listing/listing-card.tsx` | 1 | Phase 11 | The measured refusal, from the other direction |

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (after every file) |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `npm run test:design` | **31 files / 553 tests passed** (was 30 / 542 — +1 file, +11 tests, exactly the new gate) |
| `npm test` | **1216 passed / 4 skipped (1220)** — the phase baseline, to the test |
| `npm run build` | exit 0, **four times** (after Task 1, Task 2, Task 3, and the follow-up) |
| `npx playwright test price-parity + public-listing` | **4 passed** — the DOM total still equals the DB total, the rail still renders, both 404 gates hold |
| `npx playwright test open-capacity` | 1 failed / 5 did not run — `:376`, `Monday, Aug 17`, the known D-6 item 1 that 11-12 confirmed against the pre-plan tree. Unchanged |
| `npx playwright test mode-switch` | **2 passed** — the host dashboard renders and its server gate holds after the notice conversion |
| `git diff --stat 2fe2ddd HEAD -- src/components/ui/ package.json components.json package-lock.json` | **empty** — T-11-FORK and T-11-SC both hold |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `grep -c 'data-testid="price-total"' price-breakdown.tsx` | `1` — T-11-PRICE, the hook survived |
| `grep -c "shadow-" host/payout-summary.tsx` | `0` — flat at rest |
| `grep -c "attention\|destructive" (host)/host/page.tsx` | `1` — the baseline; no new occurrence |
| invite page: `robots`/`referrer`/`INACTIVE_*` | all four literals present and byte-unchanged; the only diff lines naming them are new comments |
| `<Card` in the invite page | `0` |
| AST: `lg:sticky` class-string sites | `1` — `panel-card.tsx:107`. Naive grep reads `2`, both prose+class in that one file |
| AST probe positive control (synthetic offender) | **fired** — `fake.tsx:1` → the probe is not vacuous |
| AST probe negative control (prose only) | `[]` → comments are invisible to it |
| DOM (jsdom): hours notice | `panels: 1` · `bg-muted` present and `bg-card` merged away · `data-hours-missing="3"` on a `P` · `nested panels: 0` |
| DOM (jsdom): invite shell | `panels: 1` · content class `space-y-4 p-4 sm:p-6` · `space-y-6 wrappers: 1` · **`h2 count: 0`** (the `title` prop correctly unused) |
| Watched red: `EXPECTED_STICKY_SITES` | `Sites found: src/components/patterns/panel-card.tsx:107: expected 1 to be 3` + `expected [ 80 ] to deeply equal [ 80, 80, 80 ]` → 2 failed / 9 passed → fixed → 11 passed |
| Watched red: sticky probe (d), a re-hard-coded rail | 3 failed / 8 passed — the count (`expected 2 to be 1`, naming `reserve-view.tsx:86`), the rule (`resolves to 32px, below the 80px floor`) and the positive half. Reverted → 11 passed |
| Watched red: coverage probe (a), adopter reverted | **3 failed / 8 passed** — forward, inverse and the positive control all fire on ONE edit |
| Watched red: coverage probe (b), a fourth shape | **1 failed / 10 passed** — inverse names the file:line; **forward stayed green**, which is the argument for having an inverse half |
| Watched red: coverage probe (c), inventory emptied | **2 failed / 9 passed — BOTH REAL ASSERTIONS PASSED.** Only guard-the-guard (`expected +0 to be 12`) and the positive control (`expected [] to have a length of 10 but got +0`) fired |
| Watched red: coverage probe (d), scanner blinded | **5 failed / 6 passed** — walk floor, the by-name reach, the allow-list existence check, the forward half (all 12), and the positive half. **The inverse half passed on nothing**, exactly as an absence assertion over an empty scan must |
| `selector-contract.ts` ids present in `src/` | **15 of 17**, unchanged by this plan (measured at `2fe2ddd` and at `c92286e`) — `panel-card` was already carried by the pattern itself |

## Known Stubs

None. No hardcoded empty value, no placeholder copy, no unwired component. Every prop passed to `PanelCard` is a real value from the surface's existing data, and every one of the six converted boxes renders the same children it rendered before.

Three states worth naming so they are not mistaken for coverage:

- **DS-11 stays Pending in REQUIREMENTS.md.** Its text is *"Three named card patterns exist … **and** every card surface in the app uses one of them"*. Ten of the twelve named surfaces now compose one; the other two provably cannot, and that is a **UI-SPEC correction** somebody still has to make. Marking the requirement complete against a spec that names two impossible adopters would be false — same precedent as 11-07, 11-08 and 11-11.
- **Nothing here proves a pixel.** The rails' padding changed (`Card py-4` + `CardContent py-6` = 40px block → the pattern's `p-4 sm:p-6`), and the payout/invite rhythms were preserved by explicit wrappers rather than measured in a browser. Plan 11-21's ±2px Playwright pass in both themes is the first thing that will see any of it.
- **The gate proves the container, not the rendering.** It cannot tell you a `PanelCard` was handed a `title` that should have been a `description`, and it says nothing about surfaces Phases 12–15 add. Both are written into its NOT COVERED footer.

## Threat Flags

None. No network endpoint, no auth path, no file access, no schema change. Every registered threat is disposed as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-11-PRICE | mitigate, and measured twice | `data-testid="price-total"` count = `1`; `e2e/price-parity.spec.ts` passes on the final tree. The hook did **not** move — the container that changed is the rail around the breakdown, not the breakdown |
| T-11-REFERER | mitigate | `robots: { index: false, follow: false }` and `referrer: "no-referrer"` byte-unchanged; the only diff lines naming them are the new comment recording that plan 11-20 must carry both across. `INACTIVE_TITLE`/`INACTIVE_BODY` likewise untouched — plan 11-19 still owns the hoist |
| T-11-STICKYTUCK | mitigate | The offset moved from two raw class strings into `PanelCard`'s boolean. AST: exactly **1** `lg:sticky` class-string site in `src/**`, inside the pattern. Re-hard-coding a rail was watched red three ways in one edit |
| T-11-FOURTH | mitigate | The inverse assertion, watched red on a real new file. A fourth container shape is now `1 failed` naming the path and line, with a 15-entry reasoned allow-list as the only escape and a `> 40` character floor on every reason |
| T-11-SC | mitigate | Zero packages, zero registry blocks, `git diff --stat` on `src/components/ui/`, `package.json`, `components.json` and `package-lock.json` empty across all four commits |

## Next Phase Readiness

- **Plan 11-16 owns 24 `border-dashed` sites across 12 files and this plan converted none of them.** The full census is in the table above so 11-16 does not have to re-derive it — and note that `(host)/host/page.tsx` still holds one, in the *"No listings yet"* empty state that sits beside the notice this plan converted.
- **Plan 11-19 and plan 11-20 have clean hand-offs on the invite route.** `INACTIVE_TITLE`/`INACTIVE_BODY` are byte-unchanged and still module-private; the static `metadata` export is byte-unchanged with both security fields. The new comment in that file names both plans and what each must preserve.
- **Plan 11-21 has three things worth photographing.** Both rails at `lg:` after a scroll (the offset is now the pattern's, and `sticky-offset.test.ts` explicitly cannot prove the rendered geometry); the payout summary's two panels, whose block padding went from 40px to `p-4 sm:p-6`; and the host dashboard's hours notice, which went from a bare paragraph to a filled muted box.
- **Plan 11-22's forward direction is unchanged in count.** `src/` carries 15 of `selector-contract.ts`'s 17 — `site-footer` (11-14) and `legal-placeholder-notice` (11-15) are the two outstanding, and each names its owning plan in the contract.
- **Whoever owns the UI-SPEC now has THREE corrections, not two.** 11-11 raised `listing-card.tsx` and `notification-item.tsx`; this plan adds that `PanelCard`'s *Replaces* line should read `booking/reserve-view.tsx`'s rail rather than *"`booking/price-breakdown.tsx`'s container"*, because that file has never had one.
- **Phases 12–15 will each extend `CARD_SURFACES` and shrink `ALLOWED_RAW_CARD`.** That is the gate working, not the gate being wrong — its NOT COVERED footer says so explicitly. Phase 13 inherits nine of the fifteen allow-list entries; Phase 12 gets the checkout rail this plan converted, and it now composes a pattern rather than a hand-rolled box.
- **The cheapest reproduction of Phase 11's duplicate-node mystery is now `npx playwright test e2e/public-listing.spec.ts` and one grep.** No date arithmetic, no flake, and a named React error rather than an inferred one. `npm run build && npm start` remains the discriminator.

## Self-Check: PASSED

All 9 files (8 modified, 1 created) exist on disk. All four commits (`7f91177`, `d92b5b6`, `7737f85`, `c92286e`) resolve in `git log`. No commit deleted a tracked file (`git diff --diff-filter=D` empty for each). The one temporary file this plan created outside git (`gsd1113-enum-raw-card.tmp.mjs`, distinctively named at the repo root) was removed by exact path, and `git status --short` shows nothing but the pre-existing `.planning/config.json` modification that predates this plan.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-14*
