---
phase: 12-booker-path-search-listing-checkout
plan: 06
subsystem: design-system
tags: [a11y, aria-live, gate-03, typed-inventory, ast-scan, jsdom, dom-accessibility-api, compile-gate]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 03
    provides: "hold-countdown.tsx brought to the announce-once model (role=timer + aria-live=off, a latched sr-only threshold region that drops its aria-live on expiry), measured as toBe(1) in jsdom and Chromium. This plan declares that shape rather than re-deciding it."
  - phase: 12-booker-path-search-listing-checkout
    plan: 05
    provides: "the rail's real PriceBreakdown and the fee popover's focus trap — the surfaces the declared set had to be measured against as they now ship"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "selector-contract.ts (the const-tuple + TOTAL-Record shape and its TS2741 red), visual-baselines.ts (the type-level count assertion), skeleton-a11y.test.tsx (the nameFrom:author measurement), sheet-absent.test.ts (guard-the-guard + Windows path normalisation), helpers/strip-comments.ts"
provides:
  - "BOOKER_PATH_LIVE_REGION_FILES — GATE-03's audited set, declared literally, with its exclusions and their owning phases as data"
  - "LIVE_REGIONS — a TOTAL Record over 13 declared regions; a missing row is a COMPILE error"
  - "DeclaredFileCountIsNine — a type-level count whose ALIAS NAME carries the number, so widening the set forces a rename"
  - "tests/design/live-regions.test.tsx — three source scans plus the render fixture that MEASURES why a loading region needs an aria-label"
  - "Zero aria-live=assertive anywhere under src/components/"
  - "The kind→naming-mechanism mapping, asserted both ways, so a skeleton cannot be relabelled to dodge its label"
affects: [12-09, 12-10, 12-11, 12-12, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A declared audit SET plus its exclusions as sibling consts, so a universally-quantified requirement becomes falsifiable"
    - "A type-level count whose alias NAME carries the number — widening it cannot be done without renaming the thing that asserts it"
    - "kind DECIDES a required attribute rather than a per-row field declaring it, so the obligation cannot be dodged by relabelling"
    - "One .tsx design test carrying both a node:fs/AST source scan and a jsdom render fixture, because a source scan cannot compute an accessible name and a render test cannot read the tree it audits"
    - "An ordinal key names a POSITION, not an element: report the whole file sequence when a set comparison fails"

key-files:
  created:
    - "src/lib/design/live-regions.ts"
    - "tests/design/live-regions.test.tsx"
  modified:
    - "src/components/booking/hold-expired-state.tsx"
    - "src/components/availability/availability-calendar.tsx"
    - "src/components/availability/date-pass-picker.tsx"
    - "src/components/availability/slot-picker.tsx"
    - "src/components/booking/hold-countdown.tsx"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "12-UI-SPEC's falsifiable claim #3 — every role=status resolves to a non-empty accessible name — is FALSE as a blanket universal of the tree the same document says to KEEP. `status` is nameFrom:author, so six shipped content-bearing regions compute \"\" correctly. The checkable property is narrower: a region whose content is DECORATIVE BY CONSTRUCTION must be author-named."
  - "`kind` decides the naming mechanism instead of a per-row `nameFrom` field. aria-busy=\"true\" classifies as `loading` FIRST, so a skeleton relabelled as a plain `status` keys as loading#N and is reported by the set comparison — the label requirement has no back door."
  - "hold-countdown.tsx's sr-only span gets a named fifth kind (`threshold`) and MUST NOT gain a role: role=status is a PERMANENT implicit polite region, which would keep it live after the expiry drops its aria-live and make HoldExpiredState a second region for one event"
  - "The region key is {file}#{kind}#{at} with the ordinal WITHIN a kind, not across the file — a new alert then leaves two status rows keyed exactly as they were"
  - "date-pass-picker's loading sentence is `Loading availability for {day}`, deliberately NOT the calendar's `Loading times for {day}` — a day pass has no times and announcing them promises a control the surface never renders"
  - "The 33-character exclusion reason found by the gate's own first run was fixed by writing three real sentences, never by lowering the floor"

patterns-established:
  - "Declare the SET a universally-quantified requirement ranges over, in code, with the exclusions carrying their owning phase — the two halves scan identically and only one is a decision"
  - "When a plan's acceptance criterion contradicts its own KEEP list, narrow the criterion to where it is TRUE and record the narrowing at the gate, rather than editing correct product markup to make a gate green"
  - "A failure message for an ordinal-keyed set must print the whole sequence: the reported line is the displaced element, not the inserted one"

requirements-completed: [GATE-03]

# Metrics
duration: 48min
completed: 2026-08-18
---

# Phase 12 Plan 06: The Declared Set, Four Corrected Regions, and the Gate That Makes Both Binding — Summary

**GATE-03 now has a set it is a claim about — nine booker-path files and eleven named exclusions in a type-checked module — four regions that announced to nobody or interrupted have been corrected, and a DB-free gate inside `next build` makes adding a live region without a stated reason a compile error and a red test, with the one rule that turns an `aria-label` into an accessible name re-measured rather than repeated.**

## Performance

- **Duration:** ~48m
- **Started:** 2026-08-18T06:47Z
- **Completed:** 2026-08-18T07:36Z
- **Tasks:** 3
- **Files:** 2 created, 5 modified (source/test)

## Task Commits

1. **Task 1: The typed live-region inventory and its declared set** — `c801829` (feat)
2. **Task 2: The four corrections the audit demands** — `f6a22a4` (fix)
3. **Task 3: The gate — three scans and the accessible-name mechanism** — `c10e6c0` (test)

## Accomplishments

- **"Every" has a referent now.** `BOOKER_PATH_LIVE_REGION_FILES` is nine paths as a const tuple; `LIVE_REGION_EXCLUSIONS` is eleven paths — ten Phase-13 surfaces (`/bookings/**` ×3, the four `booking/*-state`/`request-countdown` files, the three `group/*` files) plus Phase 14's `address-autocomplete.tsx` — each with a `why` that names its owning phase and its reason. The two lists **partition** `src/`'s entire `aria-live` inventory: `grep -rln aria-live src/ --include=*.tsx` returns exactly 18 files, and 9 + 9 = 18 (`search-results.tsx` appears in that grep on the strength of a comment and is declared for its `role="alert"`).
- **A missing row is a compile error, watched.** `LIVE_REGIONS` is a `Record<LiveRegionId, LiveRegionRow>` over 13 ids. Deleting the `hold-countdown-threshold` row → `npx tsc --noEmit` exit 2, one TS2741 naming the id. Verbatim in the module header.
- **A shrinking set is a compile error too, and it cannot be silenced cheaply.** Removing `spots-left-chip.tsx` from the tuple produces **two** errors: TS2820 on the row that named it (with a "Did you mean" suggestion) and TS2344 on `DeclaredFileCountIsNine`. Deleting the path *and* its rows still fails at the count — so the only way to shrink the gate's reach is to edit an alias whose entire content is the number somebody is lowering.
- **Four regions corrected, each with its rule number at the change site.** `hold-expired-state.tsx` drops the interrupting politeness level (rule 7); `availability-calendar.tsx` and `date-pass-picker.tsx` loading regions become `role="status" aria-busy="true"` with an `aria-label` **and** an `sr-only` child from one binding, with every placeholder bar `aria-hidden="true"` (rules 4+5); `slot-picker.tsx`'s pending helper gains `role="status"` (rule 5).
- **`grep -rn 'aria-live="assertive"' src/components/` returns NOTHING AT ALL** — stronger than the acceptance criterion, which only asked it of the declared set. The only remaining occurrences in `src/` are the two in `src/lib/design/live-regions.ts` itself, which is outside the DS-13 leak-gate tree precisely so it can name the banned value as data.
- **The rule that makes a name a name was measured, not repeated.** `tests/design/live-regions.test.tsx`'s render half renders `<div role="status"><span class="sr-only">…</span></div>` and computes the accessible name `""`; the same div plus `aria-label` computes the label; and a `<button>` with identical content computes its name from that content — the control that makes the first two a fact about `nameFrom` rather than about the tool. Reached through `@testing-library`'s `{ name }` option; `dom-accessibility-api` is **not imported** anywhere in this repository (T-12-06-SC: `git diff --stat package.json` empty).
- **`npm run test:design` went 40 → 41 files, 720 → 740 tests.** Exactly one more file, exactly as the criterion asks. `vitest.design.config.ts` still has no `globalSetup` and no `setupFiles`.

## The measured findings

### 1. The plan's own acceptance criteria contradicted its own KEEP list, twice

Task 2 says *"`book-cta.tsx`, `reserve-actions.tsx`, `spots-left-chip.tsx` and `search-results.tsx` are correct today and are KEPT — say so in their rows rather than editing them."* Two of its acceptance criteria then say:

> - Every `aria-live` attribute remaining on the declared set sits on an element that also carries a `role`
> - Every `role="status"` on the declared set carries an `aria-label` or `aria-labelledby`

Both are **false of the tree the plan says to keep**, and neither is a near-miss.

**(a) Six `role="status"` regions carry no `aria-label`, correctly.** `reserve-actions.tsx`, `book-cta.tsx`, `spots-left-chip.tsx`, `hold-expired-state.tsx` and both of `slot-picker.tsx`'s regions render their message as text. `status` is `nameFrom: author`, so each computes an accessible name of `""` — and that is right: the **content** is what a screen reader speaks when a live region updates, and the name is a different mechanism. Adding an `aria-label` to `<p role="status">Someone else is confirming…</p>` would name a region whose text already says everything, and on the VoiceOver/Safari pairing a named live region can be announced **by its name instead of its content** — i.e. the sentence the booker needs would be replaced by a label nobody wrote for them. Editing six correct product regions to make a gate green is the rubber-stamp reflex this milestone exists to remove, arriving through the gate meant to prevent it.

**(b) One `aria-live` carries no role, and it must not.** `hold-countdown.tsx`'s sr-only span is `<span className="sr-only" aria-live={expired ? undefined : "polite"}>`. Adding `role="status"` — the shipped idiom everywhere else on this path — would **destroy** the property GATE-03 is named for. `role="status"` is a *permanent implicit* `aria-live="polite"`, so the region would stay live after the attribute is dropped on expiry, and `HoldExpiredState` would become the second region announcing one event (rule 6) — exactly the double-announcement 12-03 deleted the expiry arm to prevent, and exactly what its `toBe(1)` measures.

**The resolution, and it is a narrowing rather than a relaxation.** The property that is load-bearing and completely checkable is:

> A live region whose content is **decorative by construction** must be named by its author.

That is precisely `kind: "loading"` — its children are `aria-hidden` placeholder bars, so with no `aria-label` it announces the empty string, which is the defect `search-results.tsx:204-207` already records having fixed once. So the module declares a mapping from `kind` to required shape, and the gate asserts it **in both directions**:

| kind | role | aria-live | aria-busy | name from |
|---|---|---|---|---|
| `loading` | `status` | (implicit polite) | `"true"` | **REQUIRED `aria-label`** |
| `status` | `status` | absent or `polite` | absent | its own text |
| `alert` | `alert` | absent | absent | its own text |
| `timer` | `timer` | `"off"` | absent | its own text (it never announces) |
| `threshold` | **none** | conditional polite | absent | its own text |

`kind` **decides** the naming mechanism rather than a per-row `nameFrom` field a row could set to whatever passes — and the classifier reads `aria-busy` **first**, so a skeleton relabelled as a plain `status` keys as `#loading#N`, fails the set comparison in both directions, and is reported. The label requirement has no back door.

### 2. An ordinal names a POSITION, not an element — and the failure accuses the innocent one

Probe (b) inserted `<div role="status">Probe</div>` between `slot-picker.tsx`'s two existing `status` regions. The gate went red with one violation — and the line number in it belonged to the **gap hint**, not the probe:

```
  PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
  src/components/availability/slot-picker.tsx:290 — status#3 on <div> (role="status")
  src/components/availability/slot-picker.tsx renders, in source order:
    :281 status#1 <p> → slot-picker-pending-helper
    :286 status#2 <div> → slot-picker-gap-hint
    :290 status#3 <div> → NO ROW
```

Line 286 is the **probe**, which took `slot-picker-gap-hint`'s key by sitting at that ordinal; line 290 is the real gap hint, displaced and reported as having no row. A developer following the line number lands on correct markup.

**The whole-file sequence block in the message did not exist before this probe and exists because of it.** Inserting a *different* kind cannot displace anything — probed with `<div role="alert">` in the same position, the report names the insertion itself at `:286 — alert#1` — which is why the ordinal is per-kind rather than per-file. The residual is stated in the module's NOT COVERED footer: two same-kind regions **swapping places** are invisible to the key comparison.

### 3. The gate's first run, against a tree nobody had mutated, was red

The exclusion-reason floor fired on `"Phase 13's RSVP form (BFLOW-08)."` — 33 characters, a tag rather than a reason:

```
AssertionError: an excluded file's `why` does not name the phase that owns it. "Phase 13 owns these" is
the whole content of an exclusion; without it the list is a set of files somebody chose not to check.
+ [ "src/components/group/rsvp-form.tsx" ]
```

Fixed by writing the three `group/*` rows a real sentence each, **not** by lowering the floor. It is recorded because it is the exact failure mode the module is about: the row existed, it looked complete in review, and it said nothing a reader could check.

### 4. Guard-the-guard: SCAN 1 and SCAN 3 were both GREEN over a file the walker never opened

Probe (d) re-pointed one declared path at `hold-expired-state-nope.tsx`. Four assertions fired — the existence guard, the no-padding guard, the set comparison and the row-file check — and **SCAN 1 and SCAN 3 stayed green**, reporting a perfectly clean result indistinguishable from a real one, forever. Third time this repository has measured that shape (`sheet-absent.test.ts` probe (d), `selector-contract.test.ts`), and the reason the guards run first.

### 5. `e2e/availability.spec.ts:261` has stopped being a flake — and it is not this plan's

The full `--project=chromium` run is 76 passed / 4 failed. Three failures are logged flakes or logged pre-existing reds. The fourth, *"published-but-not-payable listing: calendar renders read-only"*, failed on **three consecutive isolated invocations** of its own file — it no longer needs company.

It was **checked, not argued**: the plan's five component edits were reverted with `git checkout c801829 -- <the five files>`, leaving only the new inventory module (which no route imports), and the spec failed identically — same locator, same 5s timeout. The five files were restored with `git checkout HEAD --`. The dev-server log carries a React hydration mismatch at `(detail)/page.tsx:692` on the paragraph whose text is chosen by `bookable`, which is the shape that would leave the `Not bookable yet` CTA off the hydrated tree. Logged to `deferred-items.md` beside 12-02's `notFound()`-status entry on the same route — plausibly one investigation, Rule 4 either way.

## Watched reds (all run, all reverted, tree clean after each)

| # | Gate | Mutation | Observed |
|---|---|---|---|
| A | `LIVE_REGIONS` compile gate | `hold-countdown-threshold` row deleted | `tsc --noEmit` exit 2, **one** TS2741 naming the id |
| B | `DeclaredFileCountIsNine` | `spots-left-chip.tsx` dropped from the tuple | exit 2, **two** errors: TS2820 on the orphaned row + TS2344 on the count |
| 0 | exclusion-reason floor | **none — fired unmutated** | 1 failed / 19 passed, naming `rsvp-form.tsx` |
| a | SCAN 1 + shape | `aria-live="assertive"` restored on `hold-expired-state.tsx` | **3 failed / 17 passed** — text scan, AST scan, and the per-kind shape check |
| b | SCAN 2 | `<div role="status">` inserted between two same-kind regions | 1 failed / 19 passed; the sequence block is what makes it readable (finding 2) |
| b2 | SCAN 2 | `<div role="alert">` in the same position | 1 failed / 19 passed, naming the insertion itself |
| c | SCAN 3 | `aria-label` removed from the calendar's day skeleton | 1 failed / 19 passed, naming file, line, key and the mechanism |
| d | vacuity | one declared path re-pointed at a non-existent file | 4 failed / 16 passed — **SCAN 1 and SCAN 3 both stayed green** |

**A, verbatim and unwrapped:**

```
src/lib/design/live-regions.ts(400,14): error TS2741: Property '"hold-countdown-threshold"' is missing in
type '{ "calendar-day-loading": { file: "src/components/availability/availability-calendar.tsx"; kind:
"loading"; at: number; announces: string; why: string; }; "calendar-day-error": { file:
"src/components/availability/availability-calendar.tsx"; kind: "alert"; at: number; announces: string; why:
string; }; ... 9 more .....' but required in type 'Record<"calendar-day-loading" | "calendar-day-error" |
"date-pass-day-loading" | "date-pass-day-error" | "slot-picker-pending-helper" | "slot-picker-gap-hint" |
"spots-left-chip" | ... 5 more ... | "search-results-fetch-error", LiveRegionRow>'.
```

**a, all three received arrays:**

```
+ [ "src/components/booking/hold-expired-state.tsx:37 — aria-live=\"assertive\"" ]
+ [ "src/components/booking/hold-expired-state.tsx:37 (status#1) aria-live=\"assertive\"" ]
+ [ "src/components/booking/hold-expired-state.tsx:37 (status#1) is role=\"status\" with aria-live=\"assertive\"" ]
```

**c, verbatim — the probe that matters most, because the failure LOOKS correct in review:**

```
+ [ "src/components/availability/availability-calendar.tsx:408 (loading#1) has no aria-label or
     aria-labelledby. Its children are aria-hidden placeholders, so with no author-supplied name it
     announces the empty string. role=\"status\" is nameFrom:author — see the render fixture below." ]
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two of Task 2's acceptance criteria are false of the tree Task 2 says to KEEP**

- **Found during:** Task 1 (enumerating the regions), confirmed at Task 3 (writing the scans).
- **Issue:** Full analysis in finding 1. As blanket universals, *"every `role="status"` carries an `aria-label`"* and *"every `aria-live` sits on an element that also carries a `role`"* would have required editing six shipped content-bearing regions and adding a role to `hold-countdown.tsx`'s threshold span — the second of which measurably breaks GATE-03's own announce-once property.
- **Fix:** The inventory carries a `kind` per region, `kind` decides the required naming mechanism, and the scans assert that mapping in both directions plus a per-kind attribute-shape check. `AUTHOR_NAMED_KINDS` is exported so the test reads the rule rather than restating it. The narrowing, the VoiceOver hazard and the role-would-break-it mechanism are all written into `live-regions.ts`'s header, at the gate, where the next person to "simplify" it will be.
- **What is STRONGER than the criterion as written:** the gate also FORBIDS an `aria-label` on a content-named region, so the two mechanisms cannot be silently mixed; and `aria-busy` classifies as `loading` first, so the label obligation cannot be dodged by relabelling.
- **What is WEAKER:** six `role="status"` regions still compute `""`. Stated plainly in the module header and in the test's NOT COVERED footer.
- **Files:** `src/lib/design/live-regions.ts`, `tests/design/live-regions.test.tsx`
- **Committed in:** `c801829`, `c10e6c0`

**2. [Rule 1 - Bug] `hold-countdown.tsx` carried a sentence that quoted the attribute this plan removed**

- **Found during:** Task 2.
- **Issue:** its header read *"`HoldExpiredState`, whose `role="status" aria-live="assertive"` region announces the expiry"* and went on to reason about "the assertive region interrupts, the polite one queues". After the correction that sentence describes markup that no longer exists — on the one file the plan calls THE MODEL, which is the file a future reader will trust most.
- **Fix:** the sentence is corrected descriptively (the repo's standing "name the thing, do not spell it" rule) and a paragraph records that the level was removed by this plan and that the argument for deleting the expiry arm never depended on it. No behaviour change; `hold-countdown.tsx`'s markup is byte-unchanged.
- **Files:** `src/components/booking/hold-countdown.tsx`
- **Committed in:** `f6a22a4`

**3. [Rule 2 - Missing correctness] `date-pass-picker.tsx` would have announced times that never arrive**

- **Found during:** Task 2.
- **Issue:** the plan says *"the same treatment as the calendar"*, and the Copywriting Contract's only loading sentence is `Loading times for {day}`. A drop-in listing sells a DAY PASS — the file's own header forbids it from ever rendering an hour picker — so announcing "Loading times" would send a screen-reader user looking for a control this surface never renders.
- **Fix:** `Loading availability for {day}`. Same *shape* (one binding feeding both `aria-label` and the `sr-only` child), different sentence, with the reason at the binding and in the row's `why`. The calendar's string is byte-identical to the contract's `Loading times for {day}` form.
- **Files:** `src/components/availability/date-pass-picker.tsx`
- **Committed in:** `f6a22a4`

**4. [Rule 1 - Bug] The gate's own first run found a declared exclusion whose reason was a tag**

- **Found during:** Task 3, first execution, on an unmutated tree. See finding 3.
- **Fix:** the three `group/*` exclusion rows were given real sentences naming what they announce and why the boundary falls where it does. The floor was not lowered.
- **Files:** `src/lib/design/live-regions.ts`
- **Committed in:** `c10e6c0`

### Scope adjustments recorded rather than absorbed

- **A fifth `kind` exists.** The plan names four (`status` / `alert` / `timer` / `loading`). `threshold` is added for the one role-less region, asserted to be exactly one, with the mechanism written down — because folding it into `status` would either force a role onto it (breaking the countdown) or make the "every region has a role" rule unstateable.
- **Each row carries an `at` ordinal**, which the plan's field list (`{ file, kind, announces, why }`) does not name. `slot-picker.tsx` renders two `role="status"` regions and a key must distinguish them; the alternative — adding a discriminating attribute to product markup — would put a test concern into the DOM.
- **The declared file count is pinned in TWO places**, the type alias and the test, so 12-12 and 12-13 each move both. Stated in the test's failure message.
- **`hold-countdown.tsx` is outside `files_modified`** and was touched for deviation 2 (a comment only). `deferred-items.md` was appended to for finding 5.
- **The region COUNT is deliberately not pinned by a type assertion**, unlike the file count: SCAN 2's set equality compares the inventory against the *tree*, which is strictly stronger than agreeing with a literal. The reason is in the module.

**Total deviations:** 4 auto-fixed (two Rule 1, one Rule 2, one Rule 3). **Impact on scope:** one comment-only edit outside `files_modified`; one new `kind`; one new row field. No new dependency, no migration, no change to booking/payment/capacity/availability logic, no product copy removed.

## Issues Encountered

- **`e2e/availability.spec.ts:261` is a STANDING RED, proven pre-existing** — finding 5, logged to `deferred-items.md`.
- **`e2e/public-listing.spec.ts`'s draft-404 case is RED and was red at `6272c8f`** — logged by 12-02, unchanged here.
- **`e2e/shell.spec.ts:289` (booker·court) and `e2e/price-one-fact.spec.ts:426` failed in the full-suite invocation and passed in targeted runs** — the cross-file DB-contention flakes 12-03 and 12-05 both logged. Targeted: `open-capacity + shell + search-and-book` **28 passed**; `price-one-fact + hold-countdown + price-parity` **8 passed**.
- **`src/lib/design/measurements.ts` shows as modified in `git status` with an empty `git diff`** — a line-ending artefact predating this plan. Not staged, not touched.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-06-A11YSILENT | mitigated | SCAN 3's `loading` clause plus the render fixture that measures WHY it asks for the attribute; both loading regions gained an `aria-label` AND an `sr-only` child from one binding, with every bar `aria-hidden`. Watched red (c) |
| T-12-06-A11YINTERRUPT | mitigated | SCAN 1, asserted from the comment-stripped text AND from the AST (so a computed value cannot slip past a regex), plus the per-kind shape check. Watched red (a) turns all three red. `grep -rn 'aria-live="assertive"' src/components/` returns nothing |
| T-12-06-SETDRIFT | mitigated | `DeclaredFileCountIsNine` under `tsc --noEmit` plus a second pin in the test with a message; watched red (B) shows a dropped path costs two errors and cannot be silenced by deleting its rows |
| T-12-06-REGIONGHOST | mitigated | SCAN 2's set equality, reporting both directions plus the full source-order sequence of any disagreeing file. Watched reds (b) and (b2) |
| T-12-06-VACUOUS | mitigated | Guards run FIRST: every declared path exists and is non-empty, the count is 9, no declared file is padding, exclusions name their phase, and a non-existent path is reported. Watched red (d) — and it measured that SCAN 1 and SCAN 3 both stay green without them |
| T-12-06-SC | mitigated | `git diff --stat package.json` **empty**; `dom-accessibility-api` reached through `@testing-library`'s `{ name }` and imported nowhere in the repo |

## Known Stubs

None. This plan renders no data: the inventory is a declaration, the gate reads source and two synthetic fixtures, and the four component corrections change ARIA attributes and add two `sr-only` sentences derived from the already-rendered `dayLabel`.

## Threat Flags

None. No new network endpoint, no new auth path, no file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire in `tests/design/infra.test.ts` green inside `npm run build`).

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — **41** design test files, **740 passed / 3 skipped**, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` (whole suite) | **1235 passed / 4 skipped, 137 files** |
| `npx vitest run tests/availability tests/booking` | **508 passed / 53 files** |
| `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx` | **20 passed** |
| `npx vitest run --config vitest.design.config.ts tests/design/skeleton-a11y.test.tsx` | **10 passed** |
| `npx playwright test e2e/price-one-fact.spec.ts e2e/hold-countdown.spec.ts e2e/price-parity.spec.ts --project=chromium` | **8 passed** — includes GATE-03's announce-once `toBe(1)` |
| `npx playwright test e2e/open-capacity.spec.ts e2e/shell.spec.ts e2e/search-and-book.spec.ts --project=chromium` | **28 passed** — includes the `HoldExpiredState` case and the whole `DatePassPicker` surface |
| `npx playwright test --project=chromium` (full) | 76 passed / 4 failed / 8 skipped / 4 did not run — all four accounted for above |
| `grep -rn 'aria-live="assertive"' src/components/` | **no matches** |
| `grep -rln aria-live src/ --include=*.tsx` | **18** files = 9 declared + 9 excluded (the 11 exclusions include 2 with no `aria-live` text) |
| `git diff --stat package.json` | empty |
| `grep -n "globalSetup\|setupFiles" vitest.design.config.ts` (comments excluded) | **no matches** |
| `ls drizzle/*.sql \| sort \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |

## Next Phase Readiness

- **12-12 (`relax-band.tsx`)** — add the path to `BOOKER_PATH_LIVE_REGION_FILES`, its row(s) to `LIVE_REGIONS`, and **rename** `DeclaredFileCountIsNine` → `…IsTen` in the same commit, plus the `DECLARED_FILE_COUNT` literal in `tests/design/live-regions.test.tsx`. Both are deliberate friction; the test's failure message says so. The band is rule 1 (`role="status"`, one announcement on arrival) and rule 6 binds it against the empty state.
- **12-13 (`collision-notice.tsx`)** — same three edits, count → eleven. Rule 6's other half — that `book-cta.tsx`'s notice and the collision notice are never both mounted — is a claim about a document and belongs in `e2e/collision-in-place.spec.ts`; `book-cta-notice`'s row already names it as the owner.
- **12-09 (`SLOT_CHIP_BOX`)** — the calendar day skeleton's bar classes were deliberately left as literals with a comment saying 12-09 owns them. The wrapper is now `role="status" aria-busy="true" aria-label` with an `sr-only` child; keep all four and keep every bar `aria-hidden`, or SCAN 3 goes red.
- **12-10 (the sheet)** — a second `PriceBreakdown` in a sheet mounts no new live region today. If it adds one, the gate will demand a row.
- **Anyone adding a live region to the booker path** — the build fails until it has a row stating what the user hears, when, and which of the seven rules its shape satisfies. Do not delete a row to make the gate green; the failure message says that too.
- **Anyone tempted to "simplify" a loading region by dropping its redundant `aria-label`** — the render fixture in `tests/design/live-regions.test.tsx` is the measurement that says it is not redundant, and it is in the same file as the scan that demands it.

**No blockers.**

## Self-Check: PASSED

- Files: `12-06-SUMMARY.md`, `src/lib/design/live-regions.ts`, `tests/design/live-regions.test.tsx`, `src/components/booking/hold-expired-state.tsx`, `src/components/availability/availability-calendar.tsx`, `src/components/availability/date-pass-picker.tsx`, `src/components/availability/slot-picker.tsx`, `src/components/booking/hold-countdown.tsx` — **8/8 FOUND**
- Commits: `c801829`, `f6a22a4`, `c10e6c0` — **3/3 FOUND**
- Artifact `contains` checks: `BOOKER_PATH_LIVE_REGION_FILES` in `live-regions.ts` ✓ · `LIVE_REGIONS` read by `live-regions.test.tsx` ✓ · `// @vitest-environment jsdom` on line 1 of the test ✓ · `hold-expired` row present and recording the politeness flip + the focus move ✓
- Key links: `tests/design/live-regions.test.tsx` → `src/lib/design/live-regions.ts` via `LIVE_REGIONS` (a region without a row fails SCAN 2 — watched red b) ✓ · `hold-expired-state.tsx` → `live-regions.ts` via the `hold-expired-state` row ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
