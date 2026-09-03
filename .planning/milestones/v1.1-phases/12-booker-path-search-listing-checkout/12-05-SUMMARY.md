---
phase: 12-booker-path-search-listing-checkout
plan: 05
subsystem: booking
tags: [bflow-04, d-38, d-39, d-40, d-41, gate-05, popover, a11y, computed-style, e2e, ast-gate]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 04
    provides: "AllInParts {space, fee, total}; PriceBreakdown as a Client Component with `surface`; TOTAL_VALUE_CLASS; the two string-literal total hooks; tests/design/price-surface.test.ts"
  - phase: 12-booker-path-search-listing-checkout
    plan: 03
    provides: "e2e/helpers/booker-seed.ts — the shared fixture, the signup, and the VERBATIM venue-tz day math this spec's walk is built on"
  - phase: 12-booker-path-search-listing-checkout
    plan: 02
    provides: "the hoisted day/selection provider whose `selection` / `openSelection` the D-41 headline reads"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "SELECTOR_CONTRACT + the bidirectional gate; the vendored ui/popover.tsx; PanelCard; focus-recipe / elevation-z source gates"
provides:
  - "The listing rail renders the REAL `<PriceBreakdown surface=\"rail\">` on BOTH branches (hourly/full-day and drop-in passes), fed from the widened table"
  - "`src/components/booking/rail-rate-headline.tsx` — the D-41 client leaf that renders the all-in headline only while there is NO selection of either kind"
  - "`src/components/booking/service-fee-popover.tsx` — one propless fee explainer, 44x44 hit area, click-only, no rate in its body"
  - "`e2e/price-one-fact.spec.ts` — computed-style identity between the two totals in both themes, the per-surface hook counts, the rendered-DOM hedge ban, and the popover's four behaviours"
  - "The AST zero-arithmetic scan extended to a SECOND price surface, with its own seed set and its own positive controls"
affects: [12-06, 12-09, 12-10, 12-11, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A client leaf extracted upward for a VISIBILITY condition the RSC cannot know — the smallest possible boundary crossing, moving no logic and formatting nothing"
    - "A per-file seed set for a taint-based AST scan, so a second surface can be policed with the names that are money ON THAT surface without weakening the first"
    - "Computed-style identity as the proof of a visual-recognisability requirement: equality AND the absolute per-theme values, asserted separately"
    - "A negative behavioural assertion (hover does NOT open it) beside the positive one, because the rejected pattern is a superset of the accepted one"
    - "A 44px hit area retro-fitted into a 20px text row with a measured negative margin, so the border box the pointer reads and the line box the layout reads differ on purpose"
    - "Copy kept OUT of a grep-tripwired file by living in the component it belongs to — the call site gains a component, not a paragraph"

key-files:
  created:
    - "src/components/booking/rail-rate-headline.tsx"
    - "src/components/booking/service-fee-popover.tsx"
    - "e2e/price-one-fact.spec.ts"
  modified:
    - "src/components/availability/availability-calendar.tsx"
    - "src/components/booking/price-breakdown.tsx"
    - "src/app/listings/[id]/(detail)/page.tsx"
    - "tests/design/price-surface.test.ts"
    - "tests/availability/availability-calendar.test.tsx"

key-decisions:
  - "The rail HAD to receive the host's RAW rates (`hourlyRateCents` / `dayRateCents` / `perHeadPriceCents`). They are required props of PriceBreakdown and the run LABEL is built from them; without them the rail reads `₱0.00/hr × 2 hours`. Not a D-130 breach and the distinction is now enforced rather than argued: the AST scan covers this file, so formatting a rate is legal and multiplying one fails the build"
  - "`shadow-overlay` is deliberately NOT written in service-fee-popover.tsx even though the plan names it. `tests/design/elevation-z.test.ts` pins the step's call sites PER FILE with `toEqual`; the vendored PopoverContent already carries it, so restating it would have added a surface to that inventory for a shadow this component does not own"
  - "The 44px trigger carries `-my-3`, MEASURED rather than nudged: it returns the margin box to the row's 20px line box while the border box a pointer and `boundingBox()` read stays 44x44. Without it the fee row would be 24px taller than the run line directly above it, on a UAT-passed checkout surface, for a reason the booker cannot see"
  - "The watched-red header was CORRECTED after the run rather than written from the prediction: the file is `mode: \"serial\"`, so probe (a) reports `1 failed, 2 did not run` and not `2 failed` — the grove arm is exercised by every green run, not by the probe"
  - "Both surfaces assert they emit NEITHER of the other's hooks (`price-total` count 0 on the listing, `rail-price-total` count 0 on checkout). `sheet-price-total` is deliberately not mentioned — 12-10 renders it"

patterns-established:
  - "An equality between two DOM reads is always paired with the ABSOLUTE expectation, because two surfaces agreeing at the wrong value satisfy the equality perfectly — proved here by probe (b)"
  - "A `%`-absence or phrase-absence assertion over a popover body runs AFTER a positive control on that body's length and content, since an empty bubble satisfies every ban"
  - "When a plan's letter would trip a gate the plan does not mention, the intent wins and the divergence is recorded in the file AND the summary"

requirements-completed: [BFLOW-04]

# Metrics
duration: 49min
completed: 2026-08-18
---

# Phase 12 Plan 05: One Price Fact, Two Surfaces — Summary

**The listing rail now renders the same `PriceBreakdown` checkout renders — itemised, from the widened table, computing nothing — the fee line explains itself through a 44px click-opened popover that names no rate, the second `/hr` figure disappears the moment a window is picked, and "the same fact" is settled by comparing the two totals' computed type in a real browser in both themes rather than by observing that two files import the same module.**

## Performance

- **Duration:** ~49 min
- **Started:** 2026-08-18T05:52:19Z
- **Completed:** 2026-08-18T06:41:30Z
- **Tasks:** 3
- **Files:** 3 created, 5 modified (+1104 / −64)

## Task Commits

1. **Task 1: The rail renders the real breakdown, and the second rate disappears** — `eec63d3` (feat)
2. **Task 2: The fee explains itself** — `d57e90f` (feat)
3. **Task 3: The gate that proves it is the same fact** — `cf8793f` (test)

## Accomplishments

- **BFLOW-04 is a measurement now.** `e2e/price-one-fact.spec.ts` reads `getComputedStyle` on `rail-price-total` and `price-total` and asserts they agree on `font-size`, `font-weight` and `font-variant-numeric` — **and** that they agree at the value 12-UI-SPEC rule 2 pins, per theme: **court 20px/600, grove 22px/700**, both `tabular-nums`. The grove row is the one that earns the assertion: a hardcoded 20px would pass court and fail grove, which is exactly how a per-theme token stops travelling without anyone noticing.
- **Both rail branches render the real component, and neither forked.** `RailSelectionSummary` feeds `PriceBreakdown` from `allIn.fullDay` / `allIn.hourly[hours]`; `RailPassSummary` feeds it from `allIn.perPass[N]` through the shipped optional `perHeadPriceCents` / `passes` props. **No fork was needed**, which is what sketch 004's bottom section was built to check. A missing key still means *no breakdown at all* — the shipped behaviour when a rate is null — and never a client-side computation.
- **The rail is a policed price surface for the first time.** `tests/design/price-surface.test.ts`'s AST walk was extended to `availability-calendar.tsx` with its **own seed set** (`allIn` plus the nine money props) rather than by widening the component's, so neither assertion got weaker in the other's direction. Two guard-the-guard positive controls came with it (the walk SAW `allIn`; it visited binary expressions), and two "has not simply stopped rendering money" controls, because a rail that dropped the breakdown would satisfy the ban perfectly and delete the requirement.
- **The fee explains itself, and the explanation is reachable by thumb.** One propless component, three call sites by construction (it is mounted inside `PriceBreakdown`). 44×44 trigger, `aria-label="What is the service fee?"`, **no `title` attribute**, opens on click, **does not open on hover** (asserted negatively — a popover that also opens on hover has become the tooltip that was rejected), `Escape` closes it and focus returns to the trigger. Click-outside, `Escape` and focus return are Radix's; none is re-implemented.
- **The body names no percentage, and that is asserted against the live DOM** rather than trusted from a code review. `SERVICE_FEE_BPS` is server-only and a non-public env override never reaches the browser bundle, so a hardcoded "5%" is a number that can go stale while checkout charges something else.
- **The second rate is gone the moment there is a selection (D-41).** `rail-rate-headline.tsx` reads **both** selection channels, so the drop-in path is covered too — and case (4b) proves it, because a component consulting only `selection` passes (4) and leaves two `/person` rates on screen.
- **`price-breakdown.tsx` gained a component and not a paragraph.** All the popover's copy lives in `service-fee-popover.tsx`, so the two whole-source greps that have guarded the breakdown's wording since Phase 7 scan exactly what they scanned before. Both still pass.

## The measured findings

### 1. The rail could not render the breakdown without the host's raw rates, and the plan's interfaces did not mention them

`PriceBreakdown`'s `hourlyRateCents` / `dayRateCents` are **required** props, and `runLabel` is built from them:

```
₱473.33/hr × 2 hours
```

Passing `null` renders `₱0.00/hr × 2 hours`. So the RSC now threads `pub.hourlyRateCents` / `pub.dayRateCents` into `RailSelectionSummary` and `row.listing.perHeadPriceCents` into `RailPassSummary`.

**This is the D-130 line, and it is worth stating precisely rather than waving at.** D-130 forbids handing a client the *ingredients of a price* — a rate plus the fee rate, from which the browser computes what to charge. What crosses here is a rate that is only ever **formatted into a label**; the value beside it is `allIn[…].space` and the bottom line is `allIn[…].total`, both finished on the server, and the fee rate crosses nothing. Checkout has passed exactly these two props since Phase 7 for exactly this reason.

The important part is that the distinction is no longer a paragraph: **the AST scan now covers this file**, so formatting a rate is legal and multiplying one fails the build. Watched red below.

### 2. `shadow-overlay` would have reddened a gate the plan does not mention

The plan says the popover content renders "on `bg-popover text-popover-foreground` with `shadow-overlay`". Writing that class into `service-fee-popover.tsx` fails `tests/design/elevation-z.test.ts`, which pins `OVERLAY_INVENTORY` **per file** with `toEqual` — a five-row map, and a sixth row is a failure by design.

The vendored `PopoverContent` **already** carries `bg-popover text-popover-foreground shadow-overlay ring-1 ring-foreground/10`. Composing it delivers every property the spec asks for and adds nothing to the inventory. The only class the component overrides is `w-66` (264px), narrowing the vendored 288px default to the spec's bound. Recorded in the file, beside the class, so the omission does not read as one.

### 3. The row height, decided by measurement rather than by preference

A `size-11` control dropped into a `text-sm` row makes that row **44px** where its neighbours are **20px** — the middle line of a three-line breakdown twice the height of the lines above and below it, on a UAT-passed checkout surface. `-my-3` returns the **margin** box to 20px while the **border** box — which is what a pointer hit-tests and what `boundingBox()` reports — stays 44×44. Verified in the browser: the spec asserts `{width: 44, height: 44}` exactly, not `≥ 44`.

The 12px that overflows each way sits over plain text on both sides, so no other target is covered.

### 4. Compiled-CSS check on three utilities that did not previously exist in this tree

Tailwind v4's dynamic spacing was confirmed from the emitted stylesheet rather than assumed:

```
.w-66{width:calc(var(--spacing) * 66)}
.-my-3{margin-block:calc(var(--spacing) * -3)}
.size-11{width:calc(var(--spacing) * 11);height:calc(var(--spacing) * 11)}
```

At `--spacing: 0.25rem` that is 264px / −12px / 44px. `min-w-44` already shipped in `src/`, so the dynamic form was already load-bearing here.

### 5. The first run of the e2e spec failed for three minutes on a STALE DEV SERVER

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`. A `next dev` left running across the commits that created `service-fee-popover.tsx` served a **500** whose only page-side symptom was:

```
PAGEERROR: Jest worker encountered 2 child process exceptions, exceeding retry limit
```

…which surfaced in the spec as `waiting for getByRole('button', { name: '8:00 AM' })` and reads exactly like a slot-picker defect. Killing the process on :3000 and letting Playwright boot a fresh server produced **3 passed (23.6s)** with no code change. The trap is recorded in `reduced-motion.spec.ts` and `skeleton-geometry.spec.ts`; it is now restated in this spec's header because the symptom it produces here points at the wrong file.

## Watched reds (all run, all reverted, `git diff` clean on `src/` after each)

| # | Probe | Mutation | Observed |
|---|---|---|---|
| A | the rail's zero-arithmetic scan | `const probe = (parts?.space ?? 0) + (parts?.fee ?? 0);` in `RailSelectionSummary` | 1 failed / 18 passed — `` availability-calendar.tsx:518 — `(parts?.space ?? 0) + (parts?.fee ?? 0)` (operator +, touches parts) ``. The taint set carried `allIn` → `parts`, which is the whole point of a walk over a grep |
| B | `next build`'s `server-only` check, over the RAIL's own import | `import type { AllInTable }` joined by a VALUE import of `buildAllInTable` | exit **1**, 4 Turbopack errors, client trace naming the file: `./src/lib/payments/fees.ts → service-fee.ts → all-in-table.ts → availability-calendar.tsx [Client Component Browser] → listings/[id]/(detail)/page.tsx` |
| C | D-41, the naive implementation | `RailRateHeadline` reads only `selection`, not `openSelection` | 1 failed / 5 passed — case (4b): `` the rate headline survived a drop-in selection — `openSelection` is not being consulted ``, printing the surviving `<p>₱497.00/hr</p>`. Case (4) stayed GREEN, which is the correct blast radius |
| D | computed-style identity | rail branch taken off `TOTAL_VALUE_CLASS` → `text-lg font-semibold tabular-nums` | 1 failed, 2 did not run — `rail {"fontSize":"18px",…} vs checkout {"fontSize":"20px",…}`, naming **both** computed sizes |
| E | the absolute half | the SAME mutation on **both** branches | the equality passes (they agree, at the wrong size) and the ABSOLUTE assertion fires instead: `court · rail: the Total does not render at the type 12-UI-SPEC rule 2 pins — "fontSize": "20px" vs "18px"` |

**D and E together are the argument for asserting both halves separately.** D alone would be satisfied by a codebase that restyled both surfaces in one edit.

⚠️ **"2 did not run" in D and E is `mode: "serial"`, not a blind spot.** The header originally predicted "2 failed / BOTH THEMES" and was **corrected to what actually happened** after the run: a failure stops the rest of a serial file, so the grove arm is exercised by every green run rather than by the probe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The rail summaries had to gain the host's raw rate props**

- **Found during:** Task 1, writing the `<PriceBreakdown>` call.
- **Issue:** `hourlyRateCents` / `dayRateCents` are required props and the run LABEL is built from them. The plan's `<interfaces>` block describes only the `{space, fee, total}` lookup, and passing `null` renders `₱0.00/hr × 2 hours` — a false rate on the money surface.
- **Fix:** `RailSelectionSummary` gained `hourlyRateCents` / `dayRateCents`; `RailPassSummary` gained `perHeadPriceCents`. Both are threaded from the RSC, which already reads them for `allInRateParts`. Each prop carries a docblock stating why a formatted rate is not a D-130 ingredient and naming the gate that now enforces the difference.
- **Files:** `src/components/availability/availability-calendar.tsx`, `src/app/listings/[id]/(detail)/page.tsx` (both in `files_modified`).
- **Verification:** watched red A; `npm run build` exit 0; `e2e/price-one-fact.spec.ts` reads the real run line on both surfaces.
- **Committed in:** `eec63d3`

**2. [Rule 3 - Blocking] `shadow-overlay` omitted from the popover, against the plan's letter**

- **Found during:** Task 2, before writing it — `elevation-z.test.ts`'s `OVERLAY_INVENTORY` was read first.
- **Issue:** the inventory is a per-file `Readonly<Record<string, number>>` asserted with `toEqual`. A sixth file carrying the class fails `npm run build`.
- **Fix:** compose `PopoverContent`, which already carries the class. Every property the spec names is present in the rendered DOM; the inventory is unchanged.
- **Files:** `src/components/booking/service-fee-popover.tsx`
- **Verification:** `npx vitest run --config vitest.design.config.ts tests/design/elevation-z.test.ts` green; the rendered bubble carries `shadow-overlay` from the primitive.
- **Committed in:** `d57e90f`

### Scope adjustments recorded rather than absorbed

- **Two files outside `files_modified` were edited, and Task 1's own acceptance criteria require both.** `tests/design/price-surface.test.ts` ("verified by the same AST scan shape … extended to cover `availability-calendar.tsx`") and `tests/availability/availability-calendar.test.tsx` ("asserted in `tests/availability/availability-calendar.test.tsx` from both states"). Neither is in the frontmatter's file list; without them two acceptance criteria are unsatisfiable except by weakening them.
- **`npx playwright test --project=chromium` (full suite) does NOT exit 0, and could not.** The failure is `e2e/public-listing.spec.ts` → *"a draft listing 404s to the public"*, `Expected: 404 / Received: 200` — **pre-existing at `6272c8f`**, measured and logged in `deferred-items.md` by plan 12-02 before this phase touched the route, and untouched here. Best observed full-suite run: **79 passed / 1 failed / 8 skipped / 4 did not run** (the 4 are `public-listing.spec.ts`'s serial-mode successors, and all three D-59 cases pass under `--grep "D-59"`). This criterion was unsatisfiable when it was written; it is reported rather than claimed.
- **BFLOW-04 IS marked complete.** 12-04 and 12-05 are the only two plans that claim it, 12-04 left it open, and both halves of the requirement text are now true and measured: one component on both surfaces (computed-style identical), and a fee line that explains itself on demand. 12-10's `sheet-price-total` extends the *spec*; it belongs to RESP-02, not to this requirement.

**Total deviations:** 2 auto-fixed (both Rule 3). **Impact on scope:** two prop additions on files already in scope; two test files edited that the acceptance criteria name. No new dependency, no migration, no change to booking/payment/capacity/availability logic.

## Issues Encountered

- **The stale-dev-server 500** (finding 5). Cost three minutes of test timeout and produced a symptom that pointed at the slot picker. Fixed by killing :3000; recorded in the spec header.
- **`e2e/availability.spec.ts` case (4) flaked once in a full-suite run** (`selectTargetDay` timeout) and passed **4/4 in isolation (10.8s)** immediately afterwards. Same cold-Turbopack-compile-vs-5s-locator-timeout flake 12-04 recorded for the same file.
- **`e2e/price-parity.spec.ts` failed once in a full-suite run** and passed in every targeted run — including `price-parity + availability + price-one-fact` together (**8 passed, 35.7s**) and the final full-suite run. This is the cross-file contention flake 12-02 logged to `deferred-items.md`. The spec is byte-unmodified (`git diff --stat` empty) and its env surface is still `DATABASE_URL` alone (one `process.env` reference, line 65).
- **The pre-existing draft-404 red** is still red and still logged. Untouched.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-05-RAILCOMPUTE | mitigated | Both summaries render `PriceBreakdown` from a keyed lookup; the AST zero-arithmetic scan now covers `availability-calendar.tsx` with its own seed set (**watched red A**), and `next build`'s `server-only` check was re-proved live over the rail's own import chain (**watched red B**) |
| T-12-05-RATELEAK | mitigated | The popover body contains no `%` and no rate, asserted against the live DOM after a positive control on the body's content and length. Comment-stripped scan for `SERVICE_FEE_BPS` / `computeServiceFee` over **119 files** under `src/components/`: **0 code hits** |
| T-12-05-FOCUSFORK | mitigated | Composes the vendored Radix popover. `Escape` dismissal and focus return to the trigger are ASSERTED in a real browser (`el === document.activeElement`), not re-implemented. `tests/design/focus-recipe.test.ts` green over the new component, which inherits the one app-wide recipe through `Button` |
| T-12-05-TOOLTIP | mitigated | Explicit NEGATIVE assertion that a 1s hover leaves `[data-slot="popover-content"]` at count 0, plus an assertion that the trigger carries no `title` attribute — a `title` is a native tooltip smuggled in through the platform |
| T-12-05-STALEPRICE | mitigated | `RailRateHeadline` returns null when EITHER selection channel is set; cases (4) and (4b) pin both directions and **watched red C** proves the drop-in half is not decorative |
| T-12-05-SC | mitigated | `git diff --stat package.json` empty; nothing installed |

## Known Stubs

None. Every figure either surface renders is read from the server — the rail's three from `buildAllInTable` inside the RSC, checkout's three from the frozen booking row — and the rate strings in the D-41 headline are composed by the `server-only` `allInRateParts`. The `surface="rail"` branch committed by 12-04 now has its call site, so the one item 12-04 listed under this heading is closed.

## Threat Flags

None. No new network endpoint, no new auth path, no file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files) — **GATE-06 held**.

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — `✓ Compiled successfully in 20.3s`, 40 design files, **720 passed / 3 skipped**, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run --config vitest.design.config.ts tests/design/price-surface.test.ts` | **19 passed** (was 16 — raised by exactly 3) |
| `npx vitest run … price-surface + focus-recipe + elevation-z` | **96 passed / 3 files** |
| `npx vitest run tests/availability/availability-calendar.test.tsx` | **6 passed** (3 shipped + cases 4, 4b, 4c) |
| `npx vitest run tests/availability tests/booking` | **508 passed / 53 files** |
| `npx playwright test e2e/price-one-fact.spec.ts --project=chromium` | **3 passed (23.6s)** — court, grove, popover |
| `npx playwright test e2e/price-one-fact.spec.ts e2e/price-parity.spec.ts --project=chromium` | **4 passed (27.0s)** |
| `npx playwright test --project=chromium` (full) | **79 passed / 1 failed / 8 skipped / 4 did not run** — the one failure is the PRE-EXISTING draft-404 (see Deviations) |
| `npx playwright test e2e/public-listing.spec.ts --grep "D-59"` | **3 passed** |
| `npx playwright test e2e/availability.spec.ts --project=chromium` | **4 passed (10.8s)** |
| `git diff --stat e2e/price-parity.spec.ts` | empty; `process.env` appears once (line 65, `DATABASE_URL`) |
| comment-stripped `SERVICE_FEE_BPS`/`computeServiceFee` scan over `src/components/**` | **0 code hits** across **119** files (raw grep returns 13 lines, every one prose) |
| `grep -c 'surface="rail"' src/components/availability/availability-calendar.tsx` | **2** (both rail branches) |
| `grep -n "CancellationPolicyDisclosure" "src/app/listings/[id]/(detail)/page.tsx"` | resolves (import + the rail's compact line at `:619`) |
| `data-testid="rail-price-total"` / `"price-total"` literals in `src/` | **exactly one each**, both in `price-breakdown.tsx` |
| `sheet-price-total` declared in `SELECTOR_IDS` | **no** — 12-10 renders it |
| `grep -c "Est\."` over the four price-surface components | **0, 0, 0, 0** |
| `vitest.design.config.ts` has `globalSetup` / `setupFiles` | **neither** — the 4 grep hits are prose in the header explaining their absence |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| `git diff --stat package.json` | empty |
| compiled CSS for `w-66` / `-my-3` / `size-11` | all three emitted (finding 4) |

## Next Phase Readiness

- **12-10 (the mobile booking sheet)** — declare `sheet-price-total` **in the plan that renders it**, with a string literal in the same commit, and extend `e2e/price-one-fact.spec.ts` rather than forking it: the per-surface hook assertions are already written as "this surface emits exactly one of its own and zero of the others", so the sheet is one more row in the same shape. `ServiceFeePopover` mounts with it automatically — it is inside `PriceBreakdown` — so the sheet will hold a **third** trigger, and the `count === 1` assertion on the listing route WILL need to become a scoped one at 375px. That is a real, predicted edit, not a surprise.
- **12-11 / 12-06** — `surface` still selects exactly two things. The moment the two surfaces differ in a row, an order, a weight or a figure, BFLOW-04 stops being a property of the code, and `e2e/price-one-fact.spec.ts` is what will say so.
- **Anyone editing the rail** — `availability-calendar.tsx` is a POLICED price surface now. The AST scan seeds from `allIn` and taints anything derived from it; a `.total * hours` fails the build with the node text and the line number.
- **Anyone widening the popover** — it takes no props on purpose. A `surface` or `rate` prop would make the one explanation on the money path capable of differing between the two places a booker reads it.

**No blockers.** Two pre-existing reds remain logged in `deferred-items.md` (the draft-404 status code, and the full-suite contention flake); neither was introduced or aggravated here.

## Self-Check: PASSED

- Files: `12-05-SUMMARY.md`, `src/components/booking/rail-rate-headline.tsx`, `src/components/booking/service-fee-popover.tsx`, `e2e/price-one-fact.spec.ts`, `src/components/availability/availability-calendar.tsx`, `src/components/booking/price-breakdown.tsx`, `src/app/listings/[id]/(detail)/page.tsx`, `tests/design/price-surface.test.ts`, `tests/availability/availability-calendar.test.tsx` — **9/9 FOUND**
- Commits: `eec63d3`, `d57e90f`, `cf8793f` — **3/3 FOUND**
- Artifact `contains` checks: `surface="rail"` ×2 in `availability-calendar.tsx` ✓ · `"use client"` on line 1 of both new components ✓ · `ServiceFeePopover` imported by `price-breakdown.tsx` ✓ · `RailRateHeadline` imported by `(detail)/page.tsx` ✓ · `rail-price-total` + `price-total` both read by `e2e/price-one-fact.spec.ts` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
