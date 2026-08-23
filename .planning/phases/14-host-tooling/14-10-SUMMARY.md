---
phase: 14-host-tooling
plan: 10
subsystem: ui
tags: [react, jsdom, vitest, testing-library, playwright, design-system, host-surfaces, radix-collapsible]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "14-01's `HOST_PANEL_SHELL`, `WIZARD_CHECKLIST_COL` and `WIZARD_CHECKLIST_GRID` — the container and the one-owner column/track pair, all three consumed here for the first time"
  - phase: 14-host-tooling
    provides: "14-09's `goToStep` (the one place the wizard's step moves and the one place an arrival is recorded) and the exported `STEPS` / `StepKey`"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`PanelCard`'s own `sticky` prop (the offset has one owner) and `selector-contract.ts`'s bidirectional declared-hook gate"
  - phase: 10-design-system
    provides: "DS-10's one surviving filled success pairing, and the four committed inventories that pinned it by file path"
provides:
  - "`src/components/host/publish-checklist.tsx` — the rows, the done marker and the fix affordance as ONE component with three placements"
  - "the checklist is PERSISTENT: readable from the first step at every width, and no longer an end-of-flow reveal (D-149)"
  - "EXACTLY ONE checklist container per document, at every step, in both occupancy modes — measured in Chromium at 320 / 768 / 1280 and asserted in jsdom at every step"
  - "the four path-pinned inventories re-pointed at the new file in the same commit as the move, each with its reason (landmine 2 discharged)"
  - "the wizard shell widened at the large breakpoint only, with the column and its track read from the one owner"
  - "`publish-checklist` — the declared hook the container count is scoped on"
  - "`tests/listing/publish-checklist.test.tsx` — six cases, two of them observed rejecting the shape they forbid"
affects: [14-11, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A rule stated as a COUNT OVER THE DOCUMENT cannot be satisfied by a `hidden`/`block` variant pair: `[data-testid]` resolves against display-none nodes exactly as it resolves against painted ones, so two responsive twins are two instances at every width"
    - "When a committed inventory addresses a component BY FILE PATH, the move and the amendment are one commit — and each amendment carries its reason, including the one that turns out not to move"
    - "An inventory amendment that was never watched red is an inventory amendment that might be pinning nothing: every one of the four was probed"
    - "A test helper that says `open` must ASK whether it is already open — a persistent placement survives a step change, so an unconditional toggle closes what the previous step opened"

key-files:
  created:
    - src/components/host/publish-checklist.tsx
    - tests/listing/publish-checklist.test.tsx
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/app/(host)/host/listings/[id]/edit/page.tsx
    - src/app/(host)/host/listings/[id]/edit/loading.tsx
    - src/lib/design/selector-contract.ts
    - src/lib/design/contrast-pairs.ts
    - src/lib/design/status-tones.ts
    - tests/design/status-vocab.test.ts
    - tests/design/empty-state-adoption.test.ts

key-decisions:
  - "ONE NODE, NOT TWO: the persistent placement is CHOSEN by a scripted media query, not drawn twice and hidden by CSS. 14-UI-SPEC's own falsifiable claim is `querySelectorAll('[data-testid=\"publish-checklist\"]').length === 1` at 320 / 768 / 1280, and a variant pair reads as two at all three widths — the rule would have been unassertable in the only place it is a real claim"
  - "The review placement wraps BOTH branches — the unmet rows AND the everything-looks-ready sentence — so the one-instance count is unconditional. Leaving the ready branch outside would make the count read ZERO on exactly the listings that are finished, and the rule would hold only for drafts"
  - "The rail and the step question became ONE grid item spanning both columns, so the aside top-aligns with the FORM rather than with the rail. The UI-SPEC sketch nests the rail inside the form column; that shape needs the checklist to be a sibling of the form INSIDE that column, which is the two-node design the count forbids"
  - "The review step's fix links now route through `goToStep`, which 14-09 predicted and left open. It stopped being cosmetic in this plan: a fix link reachable from step 0 can jump FORWARD, and a forward jump that does not record its arrival leaves that step's rail marker permanently inert"
  - "`POSITIVE_CALL_SITES` was examined and left unchanged, and the non-edit is recorded IN the inventory. 14-RESEARCH budgeted it as one of the four movers on the reading that the marker is a `positive` call site; it is not — that set is keyed on the recipe's ICON hue and the marker carries the FILLED pairing"

patterns-established:
  - "A measurement obligation is allowed to falsify its own PREMISE: M5 asked whether the address step's two-column fields survive 672px, and the address step has no two-column fields"
  - "The gate's fork is read out of the schema by removing one field at a time from a payload it accepts, rather than by retyping which fields each mode needs"

requirements-completed: []

# Metrics
duration: 38min
completed: 2026-08-23
---

# Phase 14 Plan 10: The Persistent Publish Checklist Summary

**The publish checklist stops being an end-of-flow surprise — one component, three placements, exactly one instance per document at every step and every width — and the four committed inventories that addressed its done marker by the string `wizard.tsx` moved with it, in the same commit, each carrying its reason.**

## Performance

- **Duration:** ~38 min
- **Started:** 2026-08-23T20:14Z (baseline design run started 20:14:03)
- **Completed:** 2026-08-23T20:52Z
- **Tasks:** 3
- **Files modified:** 11 (2 created, 9 modified)

## Accomplishments

- **Landmine 2 discharged, and all four amendments were watched red first.** The done marker now lives in `src/components/host/publish-checklist.tsx`. `status-vocab`'s legal filled-pairing site, `empty-state-adoption`'s one legal `bg-success` key and `contrast-pairs`' declaring note all point at the new file; `POSITIVE_CALL_SITES` was examined, found not to be a mover, and the finding was written into the inventory rather than left as an empty diff. A **fifth** prose site (`status-tones.ts:19`) was found by sweep and followed the marker too.
- **The checklist is persistent and there is exactly one of it.** Measured in Chromium at **320 / 768 / 1280**: `containers = 1` at all three, with the disclosure trigger present and `aria-expanded="false"` at the two narrow widths and the panel heading present at the wide one. Asserted in jsdom at **every** step of **both** flows (nine and eight), review step included.
- **Landmine 3 untouched.** `tests/design/brand-recipe.test.ts` is **byte-unedited** and green; the wizard's accent count did not move because no accent was added, removed or re-branched.
- **D-151 held without opening its file.** `tests/listing/wizard-occupancy.test.tsx` and `tests/listing/wizard-rail.test.tsx` both pass **unedited** — `git diff --stat` over the whole plan is empty for both.
- **M5's open measurement taken, and its premise corrected.** At exactly 1024px: form column **672px**, aside **288px**, gutter **32px** — the spec's arithmetic to the pixel. The address step has **no** two-column fields; the wizard's only two-column field group is the details step's amenity grid, which computes **332px + 332px** inside 672 with zero wrapping. **No re-derivation of a Wave-1 constant was needed.**
- **Two probes observed red and reverted**, plus four inventory probes, plus one probe that proved a note is machine-visible prose.
- **Zero packages installed. Zero migrations. Zero registry blocks fetched.** `git diff components.json` and `git diff --stat drizzle/` are both empty.

## Task Commits

1. **Task 1: Lift the checklist, and move the four inventories that address it by file path** — `0e4a543` (refactor)
2. **Task 2: Three placements, exactly one instance, and a shell that widens where the panel appears** — `6f849bd` (feat)
3. **Task 3: Exactly one per document, at every step, in both modes** — `525f2fe` (test)

## Files Created/Modified

- **`src/components/host/publish-checklist.tsx` (created, 347 lines)** — the lifted rows, the done marker, the fix affordance; `ChecklistContainer` (the single element carrying the declared hook); the three placements; `usePublishChecklistPlacement`; the copy constants and the trigger-label composer.
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — the review step's markup replaced by the shared component; the row array typed by the shared type and otherwise untouched; the render root became a fragment of three grid items; the aside and its suppression; the fix links routed through `goToStep`.
- `src/app/(host)/host/listings/[id]/edit/page.tsx` — `HOST_PANEL_SHELL` + the large-breakpoint widening, and the two-column grid from `WIZARD_CHECKLIST_GRID`.
- `src/app/(host)/host/listings/[id]/edit/loading.tsx` — the same container expression, so the plate and the page cannot disagree about width.
- `src/lib/design/selector-contract.ts` — `publish-checklist` declared with its row, in the same commit as its literal.
- `src/lib/design/contrast-pairs.ts` — **one string**: the success note's prose. The declared pair list and the excluded-pair shape are unchanged (`git diff` is a single `note:` line).
- `src/lib/design/status-tones.ts` — the fifth prose site, re-pointed.
- `tests/design/status-vocab.test.ts` — `LEGAL_FILLED_PAIRING_SITE` re-pointed with its argument; `POSITIVE_CALL_SITES`' docblock records the examined non-edit; one stale `it()` title corrected.
- `tests/design/empty-state-adoption.test.ts` — `ALLOWED_BG_SUCCESS`'s single key re-pointed, with a longer reason than the one it replaces.
- **`tests/listing/publish-checklist.test.tsx` (created, 545 lines)** — six cases.
- `.planning/phases/14-host-tooling/deferred-items.md` — two new entries.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` (baseline, before any edit) | 49 files / 827 passed / 3 skipped / **0 failed** |
| `npm run test:design` (final) | 49 files / **827 passed** / 3 skipped / 0 failed — **baseline unmoved** |
| `npx tsc --noEmit` (baseline, after each task, final) | exit **0** every time |
| `npx vitest run tests/listing` (baseline) | 16 files / 163 passed |
| `npx vitest run tests/listing` (final) | **17 files / 169 passed**, zero failures — +1 file, +6 tests, all from `publish-checklist` |
| `npx vitest run tests/{listing,host,booking,availability,security}` | **105 files / 1162 passed** (baseline 104 / 1156 — the delta is exactly the new file) |
| `npx eslint` on every touched file | exit **0** (one pre-existing `form.watch()` React-Compiler warning in `wizard.tsx`, untouched) |
| `git diff --stat tests/design/brand-recipe.test.ts` | **empty** — landmine 3 |
| `git diff --stat tests/listing/wizard-occupancy.test.tsx` · `wizard-rail.test.tsx` | **empty, both** — D-151's coverage and 14-09's rail file unedited |
| `git diff --stat drizzle/` · `git diff components.json` | **empty, both** — zero migrations, zero registry blocks |
| `git diff HEAD~3 HEAD -- src/app/(host)/host/earnings/ src/components/host/host-agenda.tsx` | **empty** — the `earnings-freeze` gate was never approached |
| `git diff --diff-filter=D` per commit | no deletions in any of the three commits |
| `grep -c 'bg-success' src/components/host/publish-checklist.tsx` | **1** |
| `grep -rn` for the raw grid track outside `measurements.ts` | **no hits**; `lg:w-72` likewise |
| `grep -c 'WIZARD_CHECKLIST_COL\|WIZARD_CHECKLIST_GRID'` on `page.tsx` / `wizard.tsx` | **4 / 2** — both constants used, neither value typed |
| `head -1 tests/listing/publish-checklist.test.tsx` | `// @vitest-environment jsdom` |

**Playwright: one invocation, one throwaway spec, deleted after the reading.** `npx playwright test e2e/tmp-m5-measure.spec.ts --project=chromium` — 1 passed. No committed spec was run and `e2e/availability.spec.ts:261` (the pre-existing standing red) was neither touched nor claimed. `--project=visual` does not exist on this box.

### The M5 measurement, taken

Chromium, viewport **exactly 1024×900**, against a **seeded draft listing** owned by a freshly signed-up host (seeded and torn down in the same drive; nothing persisted).

| Reading | Value |
|---|---|
| shell width | **1024px** |
| form column | **672px** |
| aside (checklist column) | **288px** |
| gutter between them | **32px** |
| document `scrollWidth` / `clientWidth` | 1024 / 1024 — **zero horizontal overflow** |

That is 1024 − 32 (container padding) − 288 (column) − 32 (gap) = **672**, the spec's arithmetic to the pixel, confirmed at the boundary itself rather than above it.

**The open half of M5 — and its premise was wrong.** The obligation reads *"whether the address step's two-column fields survive 672px"*. **The address step has no two-column fields.** Measured on the rendered address step: every `div.grid` inside the form computes a single `672px` track, and the only input is 672px wide. The wizard's **one** two-column field group is the **details** step's amenity grid, and that is what was measured instead:

```
amenity grid at 672px:  grid-template-columns = "332px 332px"
                        13 cells, each 332px wide, tallest cell 46px
                        longest label "Air conditioning / heating" — no cell wrapped
                        (the wrap probe flags any cell above 52px; max observed 46)
```

332 + 8 (gap) + 332 = 672. Every cell is a single line and clears the 44px touch box. **The two-column fields survive 672px, so no re-derivation of `WIZARD_CHECKLIST_COL` was needed and no Wave-1 constant moved.**

**The one-instance rule, measured in a real browser at the three declared widths:**

| Width | containers | disclosure trigger | panel heading | overflow |
|---|---|---|---|---|
| 320px | **1** | present, `aria-expanded="false"` | absent | 320 / 320 |
| 768px | **1** | present, `aria-expanded="false"` | absent | 768 / 768 |
| 1280px | **1** | absent | present | 1280 / 1280 |

This is the half jsdom cannot decide, and it is the half that would have been **2 at every width** under a `hidden`/`block` variant pair.

### The gates have been observed failing

**Probe 1 — `LEGAL_FILLED_PAIRING_SITE` reverted to the wizard path.**

```
FAIL  keeps exactly ONE filled --success surface in the app …
AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ]
-   "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
+   "src/components/host/publish-checklist.tsx",
```

Worth recording: the sibling assertion at `:501` (`scan.scanned` contains the site) stayed **green** under this probe, because the wizard file is still a real scanned file. That assertion pins the SCAN, not the location, and it would not have caught the move on its own.

**Probe 2 — the component ADDED to `POSITIVE_CALL_SITES`,** to test the claim that it is correctly not a member. Three assertions rejected it, which is the useful outcome:

```
FAIL  names the success hue in exactly the five declared files, and nowhere else
      expected [ …(5) ] to deeply equal [ …(6) ]   (- "src/components/host/publish-checklist.tsx")
FAIL  each of the four carries the positive recipe BY VALUE, on ONE element (WR-09)
      …/publish-checklist.tsx does not carry bg-muted and text-foreground on the same element
FAIL  reads the four pinned call sites from stripped code …
      …/publish-checklist.tsx does not carry text-success in stripped code
```

The set is genuinely closed at five, and the marker is genuinely not an icon-hue call site — it carries the FILLED pairing. That is the whole content of amendment 2.

**Probe 3 — `ALLOWED_BG_SUCCESS`'s key reverted to the wizard path.**

```
FAIL  leaves `bg-success` to the ONE glyph-only marker Phase 10 pinned
Unlisted bg-success call sites: src/components/host/publish-checklist.tsx:194
```

**Probe 4 — the fourth amendment is prose with no gate over it, so what was probed is that the prose is MACHINE-VISIBLE.** `BG_SUCCESS_SCOPE` was temporarily widened to include `src/lib/`:

```
Unlisted bg-success call sites: src/lib/design/contrast-pairs.ts:250
```

The note is a real string literal the scan can see, still at line 250, which is exactly why the file's own header excludes `src/lib/**` from the ban — and exactly why a note that goes stale is a rule with no written reason rather than a harmless comment.

**Probe A — the persistent placement rendered on the review step too** (the plan's own acceptance criterion). Reverted; re-run green.

```
FAIL  (1) renders exactly ONE checklist per document at every step of the whole-space flow
AssertionError: at step 9 of 9 ("Review and publish") the document holds 2 checklist containers.
Exactly one is the rule: two is two places a host can read a different answer to "am I ready to
publish", and the suppression that prevents it on the review step is one boolean deep.
  expected […] to have a length of 1 but got 2

FAIL  (2) …  AssertionError: drop-in step 8 of 8: … expected 1, got 2
```

Both modes rejected it independently, which matters: a suppression that was correct in one mode and not the other would still be a defect.

**Probe B — the persistent placement filtering its own rows** (`rows.filter(r => !r.done)`). Reverted; re-run green.

```
FAIL  (3) the persistent placement and the review placement name the SAME rows, in both modes
AssertionError: exclusive: at step 1 the persistent placement names a different SET of rows from
the review placement. Both are handed the same array, so this can only be a placement that filters
or adds rows of its own.: expected [ 'Verified email' ] to deeply equal [ '3+ photos', 'Address', …(8) ]
```

## Decisions Made

**1. ONE node, chosen — not two nodes, drawn and hidden.**
This is the load-bearing decision of the plan and it is the one place the implementation departs from the UI-SPEC's sketch. That sketch shows a `collapsible checklist` inside the form column *"BELOW lg only"* and an `<aside>` *"lg AND UP only"* — two elements, switched by a variant pair. Its own falsifiable claim two sections later is `document.querySelectorAll('[data-testid="publish-checklist"]').length === 1` **at 320 / 768 / 1280**, and the two are not compatible: `querySelectorAll` resolves against `display: none` nodes exactly as it resolves against painted ones, so the variant pair reads as **2 at every width**. The rule would have been true only of what a human can see, and untestable in the only environment where it is a real claim.

So the wizard renders exactly one placement, and `usePublishChecklistPlacement` picks which. The fallback — on the server, and on the first client render before the effect — is the **collapsible**, because it is correct at every width; the panel chosen wrongly would put a fixed-width column beside a form with no room for it. The cost, recorded rather than discovered: one frame of the collapsed trigger on a wide screen before the panel replaces it.

Two things fall out of this that are worth naming. First, **it is what keeps `wizard-occupancy.test.tsx` green unedited**: jsdom has no `matchMedia` (measured — `typeof window.matchMedia` is `"undefined"` here), so the collapsible ships, it defaults closed, and closed means the rows are **not in the document**. A variant pair with both halves mounted would have put a checklist row labelled `Price per person` on the same document as the pricing step's own `Price per person` field label, and `getByText` throws on two matches — cases (1) and (2) of a file this plan is forbidden to touch. Second, it is why the panel placement's markup is asserted by rendering the component **directly** rather than by stubbing a viewport: a stubbed `matchMedia` asserts that the stub works.

**2. The review placement holds BOTH branches, so the count is unconditional.**
The shipped review step forks: eligible → *"Everything looks ready…"*, not eligible → the lede plus the rows. Only the second half is a checklist in the narrow sense, and lifting only that half would make the container count read **zero** on exactly the listings that are finished. The rule would then hold for drafts and need a fixture caveat everywhere else. The container is the readiness REGION, and *"everything looks ready"* is a readiness answer, so both branches live inside it and the count is unconditional at every step for every listing.

**3. The rail and the step question span both columns.**
The UI-SPEC sketch nests them inside the form column with the aside beside them. That shape requires the checklist to be a sibling of the form **inside** that column at one width and a sibling of the column at another — which is the two-node design decision 1 rules out. Making the rail-and-title block one grid item spanning both columns puts the aside top-aligned with the **form** instead of with the rail; it is sticky, so it follows the form down regardless. Below the large breakpoint the three items stack in source order and the placement is exactly what the spec asks for: rail, `<h1>`, collapsed checklist, form.

**4. The review step's fix links moved onto `goToStep`, and it stopped being cosmetic.**
14-09's Decision 4 left these on the bare setter, noted that every target was already visited by construction, and named this plan as the one that could fold them in. D-149 changes the premise: a fix link is now reachable from **step 0**, so it can jump **forward**. On the bare setter, jumping forward to the details step would render it without recording the arrival, and that step's rail marker would stay inert for the rest of the session. This is also the affordance the `[14-09]` deferred item predicted would eventually make an index-keyed visited set observably wrong — it has now landed, one plan later, exactly as that entry said it would.

**5. The trigger label carries the figure; the panel gets the title prop and the collapsible does not.**
The disclosure's own label is *"9 of 10 ready to publish"*, which is the whole reason the small-screen placement can default closed: the state is legible without opening it. Passing `PanelCard` its `title` in that placement as well would print two headings for one region on the narrowest screen in the product — the one viewport where the argument for defaulting closed was vertical space in the first place.

**6. The declared hook is a literal, and it is written once.**
`selector-contract.ts`'s gate reads `data-testid` attributes off the source AST, so `data-testid={PUBLISH_CHECKLIST_TESTID}` is not a rendered id as far as it can tell. **Observed, not assumed** — the file shipped with the constant form first and the contract went red with `Rendered-but-undeclared` inverted (`- "publish-checklist"` missing from the rendered set). The three placements now share one `ChecklistContainer` component, so there is one literal and the three cannot disagree about what "one checklist" is.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] Task 1 also edited `wizard.tsx` and `selector-contract.ts`, which its `<files>` did not list.**
- **Found during:** Task 1, before the first commit.
- **Issue:** Two of the four amendments cannot be true unless the markup leaves `wizard.tsx` in the same commit — `status-vocab`'s `retiredPairingSites` is a set-equality over **one** file, so a component holding the pairing while the wizard still holds it is **two** files and red. And `selector-contract.ts` is bidirectional: the moment the new literal shipped, `publish-checklist` was rendered-but-undeclared.
- **Fix:** the review step was wired to the shared component and the selector row was added, both in `0e4a543`. This is 14-09's disclosure (a) in a different costume — the plan's task split is by concern, and a gate that reasons over the whole tree does not respect it.
- **Commit:** `0e4a543`

**2. [Rule 1 — Bug] `status-tones.ts:19` said the pairing ships in the wizard's completed-step marker, which this plan made false.**
- **Found during:** Task 1, sweeping every prose site that names the marker by location.
- **Issue:** a **fifth** site, not in the plan's four and not in 14-RESEARCH § G5. No gate reads it, which is precisely why it needed a sweep rather than a test run.
- **Fix:** re-pointed at the component, with the note that the pairing and its measurement did not move — only the address did.
- **Commit:** `0e4a543`

**3. [Rule 1 — Bug] The edit route's loading plate would have handed the arriving wizard a 256px width jump.**
- **Found during:** Task 2.
- **Issue:** the plate's own comment claims *"Container is page.tsx's own, verbatim"*. Widening the page at the large breakpoint made that false, and the plate would have drawn `max-w-3xl` for the skeleton and then handed over a `max-w-5xl` page — the exact layout shift a skeleton exists to prevent.
- **Fix:** the plate reads the same constant and the same widening, so the sentence is now mechanical rather than a promise. `loading-coverage` still pins **29 / 21 / 8** with no edit to its file.
- **Commit:** `6f849bd`

### Disclosures that are not deviations

**(a) `grep -c 'HOST_PANEL_SHELL' page.tsx` returns 2, not the criterion's 1.** The import line and the call site. The criterion's intent — the container comes from the constant and is not typed — holds; the number does not, because `grep -c` counts the import too.

**(b) M5's premise was falsified rather than confirmed.** See the measurement section. The address step has no two-column fields; the amenity grid on the details step was measured in its place. Recorded here because "the fields survive" and "there are no such fields" are different findings and only one of them is what the plan expected.

**(c) `POSITIVE_CALL_SITES` did not move, and the non-edit is the amendment.** 14-RESEARCH § G5 budgeted it as one of the four movers. It is not one, for a mechanical reason (that set is keyed on the recipe's icon hue; the marker carries the filled pairing), and probe 2 above is the evidence. The finding is written into the inventory's own docblock, because "we checked and it does not move" is not reconstructible from a diff that shows nothing.

**(d) The collapsible defaults closed and its rows are therefore ABSENT from the DOM, not hidden.** This is what keeps `wizard-occupancy.test.tsx` cases (1) and (2) green unedited — see Decision 1. It is also a real product property (a closed disclosure costs one row of vertical space, not ten), but it is worth stating that a future edit to `forceMount` the content would break two shipped occupancy cases for a reason that has nothing to do with occupancy.

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 0 Rule 2, 1 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no package installed, no migration, no registry block fetched, no payout file opened, no save-state work (14-11's), no edit to `brand-recipe.test.ts`, `wizard-occupancy.test.tsx` or `wizard-rail.test.tsx`.

## Issues Encountered

**A test helper that says `open` has to ask whether it is already open.**
Case 3 walks every step reading the persistent placement's rows, and the first version clicked the disclosure trigger unconditionally at each one. It went red with an **empty** row set at step 2, which reads exactly like a placement that renders no rows. The cause is a property of the design rather than of the test: the `<aside>` holding the persistent placement stays **mounted** across a step change, so its open state survives the advance — and the second click closed what the first had opened. The helper now returns early when `aria-expanded` is already `"true"`, and the reason is in its docblock. Reported because the failure looked like a product defect and was not.

**The checklist has TEN rows, not nine, and the plan's copy example says nine.**
14-UI-SPEC's trigger example is `{6} of {9} ready to publish` and the component's own argument talks about "a nine-row panel". The real whole-space checklist is ten rows: title, description, space type, address, capacity, hourly rate, day rate, three photos, a cancellation tier and a verified email. Case 4 asserts **10** and composes the figure through the component's own label function rather than retyping a sentence, so the number cannot drift out of the test. Nothing is wrong in the product; the spec's illustrative figure is illustrative.

**A pre-existing hydration mismatch surfaced in the dev-server log during the M5 drive.**
`HostLayout → AmbientHostNav → SiteNav → NavDrawer → ResponsiveDialog → DialogTrigger`, on a Radix-generated `aria-controls` id. It is in `patterns/site-chrome.tsx` and `patterns/ambient-notifications.tsx` — neither touched by this plan, neither in this plan's component tree — and it is a `next dev` warning. Named here so a reader of that log does not attribute it to the checklist's media query, which cannot produce it: the hook returns the same value on the server and on the first client render, and only updates inside `useEffect`.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-10-GATEPATH | **mitigated** | All four inventories amended in `0e4a543`, the same commit as the extraction, each with its reason. Every one was watched red first (probes 1–4), including the one whose amendment is a non-edit. `status-vocab`, `empty-state-adoption` and `contrast` all green; the full design suite is at its 827-passed baseline |
| T-14-10-FALSEREADY | **mitigated** | The row array, its occupancy fork and every `stepIndex` call stayed in `wizard.tsx` and are passed to whichever placement renders. Case 3 asserts SET equality across placements in both modes AND ties the fork to `publishSchema` itself — each of the four money/capacity fields is removed in turn from a payload the real gate accepts, and the fields it then refuses over must be exactly the ones the checklist names in that mode |
| T-14-10-DOUBLETRUTH | **mitigated** | Exactly one container at every step of both flows (cases 1 and 2), observed failing against a two-container regression in BOTH modes (probe A), and measured at 320 / 768 / 1280 in Chromium |
| T-14-10-SUCCESSCREEP | **mitigated** | `grep -c 'bg-success'` on the component returns **1**; `status-vocab`'s comment-stripped repo-wide scan reports `retiredPairingSites` as exactly one file; case 6 asserts every marker in every placement holds an `aria-hidden` glyph and an EMPTY text content |
| T-14-10-STICKY | **mitigated** | The panel placement uses `PanelCard`'s own `sticky` prop; `sticky-offset` passes with its file **unedited** and its pinned site count still one. No offset is spelled anywhere in the new component, including in its prose |
| T-14-10-REGISTRY | **mitigated** | `git diff components.json` **empty**; `leak` and `sheet-absent` green; `VENDORED_PRIMITIVES` still 31. The collapsible was already vendored in plan 12-11 and this is a new call site, not a new block |
| T-14-10-SC | **mitigated** | **No package was installed.** `package.json` and `package-lock.json` are untouched. `npx shadcn add` was never run |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. The checklist still only NAMES what is missing; `publishListing` re-runs `publishSchema` server-side and remains the authority. No `## Threat Flags` section is owed.

## Known Stubs

None. Every element the three placements render is wired to real form state: the rows come from the wizard's live array, the trigger's figure is computed from that array, and the fix control calls the wizard's own step mover.

## User Setup Required

None — no external service configuration, no environment variable, no package install. The M5 drive used the existing local Docker Postgres and seeded and tore down its own host and listing.

## Next Phase Readiness

**Ready.**

- **14-11 (the save state)** inherits a wizard whose nav row and save path are **completely untouched**, and a form column that is now a grid item (`<form>` itself, carrying `min-w-0 space-y-8`). The save-state region belongs in the nav row inside that form, which needs no structural change. It also inherits `tests/listing/publish-checklist.test.tsx`, which its own verify block already names.
- **14-16 (the visual baselines)** inherits the width-dependent half of D-149 as the thing it owns: that the PANEL is what paints at 1024 and the COLLAPSIBLE at 320. Both are distinguishable in the DOM — a heading versus a disclosure trigger — and `publish-checklist` is a declared hook.

**Three standing cautions for the plans that follow:**
1. **Do not `forceMount` the collapsible's content, and do not draw the two persistent placements as a variant pair.** Either one puts ten checklist row labels on the same document as the form's own field labels, and two of `wizard-occupancy.test.tsx`'s ten cases go red on a `getByText` collision that says nothing about checklists. The one-instance count goes to two at the same time.
2. **The review step's fix links can now jump FORWARD.** Any plan that adds a rail affordance should re-run the `[14-09]` index-keyed-visited-set probe against it — the forward jump that entry was waiting for now exists.
3. **`grep -c 'bg-success'` on `publish-checklist.tsx` must stay at 1**, comments included: two gates count that spelling per file and a comment is indistinguishable from a call site to one of them. The file's header says so at length; keep the naming descriptive when editing it.

**`HFLOW-02` remains PARTIAL, deliberately.** 14-09 shipped the truthful step count and the clickable rail and set the row to Partial rather than Complete; this plan ships the third of the requirement's four deliverables. **The save state is 14-11's**, and 14-11 is the plan that should flip the row to Complete. `requirements mark-complete` was NOT run for the reason 14-09 recorded: it sets the row to Complete unconditionally, which would be a false claim for one more plan.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

Both created files exist on disk, the modified files all appear in `git diff --stat HEAD~3 HEAD`, and
all three claimed commits (`0e4a543`, `6f849bd`, `525f2fe`) resolve in `git log`. No missing items.
