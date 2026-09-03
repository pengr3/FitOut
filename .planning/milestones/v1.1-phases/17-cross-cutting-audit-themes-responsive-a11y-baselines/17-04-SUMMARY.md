---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 04
subsystem: testing
tags: [playwright, e2e, responsive, resp-03, sticky-bar, typography, no-wrap, a11y]

requires:
  - phase: 17-01
    provides: the declared e2e baseline red set (`e2e-baseline-reds.md`) — the denominator every verdict below is read against
  - phase: 12-10 / 12-11
    provides: `e2e/mobile-booker-path.spec.ts`, both sticky bars, and the only fixture in the tree that reaches a RESOLVED checkout with a real hold
provides:
  - "`e2e/helpers/nowrap.ts` — `expectNoWrap`/`readWrap`, the one definition of \"this text did not wrap\", with three guards"
  - "RESP-03 clause B measured on both sticky bars: present, 64px, pinned, non-occluding at 320px; zero laid-out boxes at 1280px"
  - "RESP-03 clause C's declared no-wrap set as a 9-row table — 6 measured, 3 named skips that throw their owner into the run output"
  - "Two escalate-class findings for 17-13: the listing page's last control is a footer link UNDER the bar, and `STICKY_BAR_CLEARANCE` is inert on that route"
affects: [17-11, 17-13, 17-06, 17-09]

tech-stack:
  added: []
  patterns:
    - "A no-wrap clause measures `clientHeight` against the element's OWN resolved line-height, never a literal, with three guards ahead of it"
    - "A declared set is a TABLE whose unreachable rows carry a paragraph `skip` that throws its owner into the run output (RouteRow's discipline, applied to typography)"
    - "A geometry clause names the declared constant in the MESSAGE and asserts the rendered box"

key-files:
  created:
    - e2e/helpers/nowrap.ts
  modified:
    - e2e/mobile-booker-path.spec.ts

key-decisions:
  - "The sticky-bar clause lives in `e2e/mobile-booker-path.spec.ts`, superseding 17-PATTERNS § Decision Point's two options — that file already declares all nine constants/helpers both bars need and is the only spec reaching a resolved checkout"
  - "`expectNoWrap` carries a THIRD guard beyond the two mandated ones: a `display: inline` subject reports `clientHeight` 0 and passes every bound (watched red at 189px of real wrap)"
  - "The occlusion clause excludes `[data-testid=\"site-footer\"]` as a MEASURED, named exception and adds a set-form clause (nothing anywhere else may be occluded) that is strictly stronger than AC#7's wording"
  - "The no-wrap subject is always the element that renders the characters, never the declared reservation around it (`hold-countdown`'s `h-8` box reads 32 against a 20px line-height)"

patterns-established:
  - "Pattern: a red-watch that comes back GREEN is a measurement, not a failed probe — record what it proves about the route"
  - "Pattern: a declared set asserts its own integrity (every row a reason, every skip an owner, every class represented)"

requirements-completed: []  # RESP-03 stays Pending — clause A's coverage half is 17-11's, and three set rows are owned by 17-11/17-13

duration: 32 min
completed: 2026-08-29
---

# Phase 17 Plan 04: RESP-03 Clauses B and C — the sticky bar, measured Summary

**`e2e/helpers/nowrap.ts` (`expectNoWrap`, three guards, measured against each element's own resolved line-height) plus both sticky bars proved present/64px/pinned/non-occluding at 320px and absent at 1280px — and two escalate-class occlusion findings the clause surfaced on shipped markup.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-08-29T07:35:23Z
- **Completed:** 2026-08-29T08:07:15Z
- **Tasks:** 3
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **One definition of "this text did not wrap".** `expectNoWrap` moved out of `mobile-booker-path.spec.ts` case (b) with both mandatory guards, proved behaviour-neutral by identical before/after run counts (8 passed / 0 skipped, both), and is now imported by two call sites with a third (17-11) already pointed at it.
- **Clause B is instrumented on both bars.** Present, `boundingBox().height` within 1px of 64, bottom edge pinned to the viewport, nothing occluded at the document bottom, and zero laid-out boxes at 1280px — every clause on pixels, with `STICKY_BAR_HEIGHT`/`STICKY_BAR_CLEARANCE` named only in the failure messages.
- **Clause C is a declared table, not a loop.** Nine rows across the UI-SPEC's three classes; six measured in both themes at 320px; three unreachable rows carry paragraph skips that throw their reason and their owning plan into the run's output. An integrity case asserts the table cannot quietly lose a reason, an owner or a whole class.
- **The audit found two real defects** without changing a line of `src/` — see § Findings.

## Task Commits

1. **Task 1: extract the no-wrap measurement into `e2e/helpers/nowrap.ts`** — `40ad853` (test)
2. **Task 2: the sticky-bar clause — present, 64px, pinned, non-occluding; absent at 1280px** — `2b8a40b` (test)
3. **Task 3: declare the no-wrap set and measure its bar and checkout entries** — `ad1d6e1` (test)

**Plan metadata:** this commit (docs)

## Files Created/Modified

- `e2e/helpers/nowrap.ts` — **created.** `readWrap` (one `locator.evaluate`, one typed record) and `expectNoWrap(locator, where, tolerancePx = 1)`. Header carries the extraction's before/after run counts, the per-theme line-height measurements that make a literal wrong, and the guard-(c) red-watch.
- `e2e/mobile-booker-path.spec.ts` — **modified.** Case (b) rewired to the helper; a new RESP-03 clause-B section (`boxesIntersect`, `fmtBox`, `probeOcclusion`, `expectBarDoesNotOcclude`, `expectStickyBar`, `expectBarAbsentAtDesktop`); a new per-theme listing case; new checkout cases (m) and (n); the `NO_WRAP_SET` table with its named-skip and integrity describe.

## Verification

| Check | Result |
|---|---|
| `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1` | **11 passed, 3 skipped** (the declared named skips). Was 8 passed before this plan. |
| `npx tsc --noEmit` | exit 0 |
| `npm run test:design` | 66 files, **1247 passed / 3 skipped** |
| `npx eslint` on both touched files | clean |
| `git status --porcelain src/` | empty — **no product source was reshaped** (T-17-16) |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32 — zero schema migrations proposed or absorbed) |
| Failures against `e2e-baseline-reds.md` | none; this file is in the "green alone" column and still is |

## Watched Reds

**1. Guard (c) — an inline subject (Task 1).** A `<span>` carrying `"₱1,234.00 a very long money string that will wrap twice"` was injected into `<main>` inside a 60px-wide `<p>` on `/listings/[id]` at 320px — genuinely wrapped, eight line boxes deep — and read back `{ display: "inline", clientHeight: 0, rectHeight: 189, lineHeight: 24 }`. Without the guard the clause compares `0 <= 25` and reports a 165px wrap as green. With it, the failure names the display, both heights and the text. Probe deleted.

**2. The occlusion clause, drive 1 — `STICKY_BAR_CLEARANCE` deleted from `listings/[id]/(detail)/page.tsx:480`: STILL GREEN.** Recorded rather than retried, because the green is the interesting result — see § Findings.

**3. The occlusion clause, drive 2 — the same deletion in `book/page.tsx:521` (the route with no footer): RED,** verbatim:

```
Error: court · checkout · 320px: the sticky bar OCCLUDES the last interactive control on the page.
a("Back to the listing") occupies {x: 16, y: 472, width: 156, height: 44, bottom: 516} and the bar
occupies {x: 0, y: 504, width: 320, height: 64, bottom: 568}. `STICKY_BAR_CLEARANCE` (pb-20 = 80px =
64 + 16) on this route's `<main>` is the knob that is supposed to make this impossible …
  Expected: false
  Received: true

1 failed, 1 did not run (mode: "serial"). Restored; 10 passed.
```

## Findings (escalate-class — recorded, NOT fixed; for plan 17-13's ledger)

**F1 — the listing page's last interactive control is a footer link UNDER the sticky bar.** Measured 2026-08-29 at 320×568, scrolled to the document bottom, identically in both themes:

| | box |
|---|---|
| last focusable candidate `a("Privacy")` | `{y: 515, height: 18, bottom: 533}` |
| `[data-testid="booking-sticky-bar"]` | `{y: 504, height: 64, bottom: 568}` |

The link sits **entirely inside** the bar's band and cannot be tapped or scrolled to; `a("Terms")` clears it by 3px. Cause: `STICKY_BAR_CLEARANCE` is applied to `<main>` and `SiteFooter` renders *after* `<main>`, so the bottom 64px of the **document** is footer, which no clearance covers. AC#7's literal subject on this route therefore fails on shipped markup. Escalate-class: the cheapest correct repair moves a clearance onto a component shared by every route (a layout change inside an audit — D-199/D-200, 17-UI-SPEC § Remediation).

**F2 — `STICKY_BAR_CLEARANCE` is inert on `/listings/[id]` today.** Deleting it changed nothing measurable: both cases stayed green, because `<main>` is followed by a footer far taller than 64px and the last control *inside* `<main>` is `a("OpenStreetMap")` (the map attribution) at `{y: 243}` with the document at its bottom — ~1,700px above the fold. What protects that route's content is the footer's height; what the clearance was declared to protect is a footer link it does not cover. On `/listings/[id]/book` (no footer) the same knob **is** load-bearing — that is where watched red 3 fires.

**F3 — one member of the declared no-wrap set has no instrument.** "Every named 44px action's label": a `size="touch"` button renders its label as a direct text child, so the only element carrying the text *is* the 44px control, and `expectNoWrap` would compare a declared reservation against a line box and be red on a correct tree. Measuring it honestly needs a wrapper element around the label — a product-source change this audit may not make. `whitespace-nowrap` on both bars' columns is the shipped mitigation. Declared as a skip row with this reason in the table.

**F4 (observation, not a defect) — one intermittent in the SHIPPED case (f).** In one of eight runs of this file during the plan, `court · 320px · no wrap …` failed at `:839` with the sheet's pinned action at `595.5` against a `<= 569` bound — the sheet measured mid-open-animation on a freshly recompiled route. Re-run alone: green, and 6/6 green under `--repeat-each=3`. Not one of this plan's assertions and not touched here; recorded so the next reader does not re-derive it.

## Decisions Made

1. **The clause lives in `mobile-booker-path.spec.ts`** (supersedes 17-PATTERNS § Decision Point). That file already declares `BAR`, `CHECKOUT_BAR`, `BAR_HEIGHT_PX`, `TOUCH_TARGET_PX`, `TOLERANCE_PX`, `FLOOR`, `DESKTOP`, `boxOf`, `reachableBar` and the seeded listing, and it is the only spec reaching a resolved checkout with a real hold. Either alternative retypes at least four constants; `overflow-320.spec.ts` is 2,092 lines and is this phase's serialisation bottleneck across three other plans. The argument is written into the file's own section header.
2. **A third guard on `expectNoWrap`** (Rule 2 — vacuity is a correctness requirement). `clientHeight` is 0 on every non-replaced inline element. The source does not tell you which subjects those are: `price-total` is written as a `<span>` and measures `display: block` because it is a flex item, so a reader auditing from JSX would guess wrong in both directions.
3. **The occlusion clause is two assertions, with the footer as a named exception.** AC#7's literal shape runs against the last laid-out control outside the footer; a second, stronger clause asserts that **no** control anywhere may lie under the bar except a footer one. The exclusion is measured, argued in place, and routed to 17-13 — the day the clearance moves to cover the footer, nothing here needs relaxing. Suppressing F1 by narrowing the subject silently was rejected explicitly; leaving the suite red was rejected too, because `e2e-baseline-reds.md` forbids adding a row to make a run read green.
4. **The desktop-absence clause reads `getClientRects().length`, not `boundingBox()`.** A `display: none` element and an absent element both return a null box; a zero-length rect list is a positive statement about an element the probe found. Measured: `rects: 0, display: "none", offsetParent: null` on both bars, both themes, at 1280×900.
5. **Two skip rows name 17-11 and one names 17-13** rather than being left out of the table. A set that measured five members and said nothing about the sixth would report "clause C: covered" while a status chip clips its label on a surface nobody looked at.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 2 - Missing critical] A third guard on `expectNoWrap`**
- **Found during:** Task 1 (designing the helper against Task 3's declared subjects)
- **Issue:** The plan mandates two guards. Neither catches a `display: inline` subject, whose `clientHeight` is 0 — the clause then compares `0 <= lineHeight + tolerance` and can never fail. Task 3's own row list includes subjects whose source spelling (`<span>`) gives no way to tell.
- **Fix:** Guard (c), asserted after the two mandatory guards and before the height clause, naming the computed `display` and both heights.
- **Verification:** Watched red against an injected inline span (see § Watched Reds 1).
- **Committed in:** `40ad853`

**2. [Rule 1 - Instrument correctness] The occlusion clause's subject and the footer exclusion**
- **Found during:** Task 2
- **Issue:** AC#7's literal subject — the document's last focusable element — IS occluded on `/listings/[id]` as shipped (F1). Writing the assertion literally leaves the suite red with a failure that may not be added to `e2e-baseline-reds.md`; fixing the product is escalate-class and forbidden by this task.
- **Fix:** Two clauses (last-control-outside-the-footer, plus the set form that permits occlusion only inside the footer), with the measurement, the cause and the owner written at the assertion site.
- **Verification:** Watched red 3; the full file green afterwards.
- **Committed in:** `2b8a40b`

**3. [Rule 3 - Blocking] The prescribed red-watch mutation does not go red on the route the plan named**
- **Found during:** Task 2 (17-RESEARCH Pattern 3 prescribes dropping `pb-20` on "the page that carries it")
- **Issue:** Dropping it on the listing route left both cases green (F2).
- **Fix:** Recorded the green as a finding, then ran the same sanctioned mutation on `book/page.tsx` — the route where the clearance is load-bearing — and captured the red verbatim. Both drives are in the file's header.
- **Committed in:** `2b8a40b`

**4. [Scope, declared] Three skip rows rather than the one the plan named**
- **Found during:** Task 3
- **Issue:** The plan names the status-chip rows as the skip case. The UI-SPEC's declared set also contains "every `tabular-nums` money figure in a fixed-height box" and "every named 44px action's label", and leaving either out is exactly the silent absence AC#2's discipline forbids.
- **Fix:** Three skip rows, each with a paragraph naming its owner (17-11 ×2, 17-13 ×1).
- **Committed in:** `ad1d6e1`

---

**Total deviations:** 4 (1 missing-critical guard, 1 instrument-correctness scoping, 1 blocking red-watch substitution, 1 declared-scope extension)
**Impact on plan:** No product source changed; every deviation makes an assertion harder to pass, not easier. No scope creep.

## Issues Encountered

- The plan's Task-3 subject list includes the hold countdown "whose box is `HOLD_COUNTDOWN_BOX`". Pointing the instrument at that box is red on a correct tree (`clientHeight 32` against a 20px line-height) — it is a *reservation*, not a line box. The row measures its `p[role="timer"]` child (`clientHeight 20` against 20). The same trap applies to the bar itself (63 against 24); both measurements are recorded in the table's header so the next author does not re-discover them.
- One intermittent in the pre-existing case (f) — F4 above.

## Requirements

**requirements-advanced only.** RESP-03 stays **Pending**: clause A's "every surface" coverage half is 17-11's, and three rows of the declared no-wrap set are owned by 17-11 (status chips, off-path money figures) and 17-13 (44px action labels). Clauses B and C's booker-path half — AC#4, #5, #6, #7, #8 — are closed by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **17-11 can import `expectNoWrap` today.** Its Task 3 reads this file's skip rows for its subject list; both name it by plan and task number.
- **17-13 has three ledger entries waiting** (F1, F2, F3) with their measurements, causes and remediation classes already written.
- **17-06 should know** that this file now measures the checkout bar at 320px on a resolved body — the same route its `[16-D9]` fix touches from the pre-hydration side.
- No blockers.

## Self-Check: PASSED

- `e2e/helpers/nowrap.ts` — FOUND on disk
- `40ad853`, `2b8a40b`, `ad1d6e1` — all FOUND in `git log`
- Plan `<verification>` block re-run in full; results in § Verification above

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
