---
phase: 18-host-verification-listing-review-fitout-ops
plan: 12
subsystem: ops-console-route
tags: [ops, next-app-router, route-group, soft-404, suspense, design-gates, measured-constants, e2e-audit, d-216, d-219, d-246, d-247]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 01
    provides: "`assertStaff()` (layer 1, cache()'d, explicitly NOT the boundary) and `requireStaff()` (layers 2/3, the boundary, `notFound()` on refusal)"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 05
    provides: "`loadReviewQueue(dbConn)` — one interleaved oldest-first array over both kinds — and the five self-gating decision actions"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 08
    provides: "`loadOpsCancelImpact(db, listingId)` — the pre-formatted figures and `cancellableBookingIds`"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 10
    provides: "`OpsQueueRow` and its REQUIRED finished labels + `impact`, which made this plan's obligations compile errors rather than notes"
  - phase: 11-design-system-patterns
    provides: "`SiteChrome`, `PageHeader`, `EmptyState`, `ErrorState`, `RowListSkeleton`, and the four design gates this plan moves"
provides:
  - "`/ops` — the FitOut Ops review queue, behind three guard layers with three different jobs (OPS-02 route half, OPS-04 surface half)"
  - "`src/app/(ops)/ops/layout.tsx` — the sixth `SiteChrome` composition and the layer-1 `assertStaff()` that wins the 404 status line"
  - "`OPS_QUEUE_SHELL` and `OPS_QUEUE_ROW_HEIGHT` — the second MEASURED off the rendered route at ten widths in both themes; `RowSkeletonHeight` 4 → 5 members"
  - "`tests/design/ops-guard-coverage.test.ts` — the structural three-layer gate, with three watched REDs and a header that says what it cannot prove"
  - "`revalidatePath(\"/ops\")` in all five ops actions and in `cancelBookingAsOps` — the line 18-05 and 18-10 both dated to this plan"
  - "three e2e rows measuring the a11y, overflow and skeleton-geometry claims — recorded as a ONE-TIME AUDIT, never as gates"
affects: [18-13 (host-facing review signals), 18-14 (the production-build status-line audit this plan explicitly does NOT claim)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A layout-level assert whose ONLY job is the HTTP status line, with a header stating in the middleware's own words that it is not the security boundary — the `/listings/[id]` fix, reused on a route group where the leak is the route's own existence"
    - "A declared design constant whose docblock records the PROBE that rejected a second constant, not just the derivation of the one that shipped"
    - "A structural gate paired with a manual audit, where the gate's header names the plan that owes the manual half"
    - "`withClient` — open, write, end — so a helper can seed for a spec whose own rule is that it holds no database client"

key-files:
  created:
    - src/app/(ops)/ops/layout.tsx
    - src/app/(ops)/ops/page.tsx
    - src/app/(ops)/ops/loading.tsx
    - src/app/(ops)/ops/error.tsx
    - tests/design/ops-guard-coverage.test.ts
  modified:
    - src/lib/design/measurements.ts
    - src/app/actions/ops-review.ts
    - src/app/actions/cancel-booking.ts
    - tests/design/loading-coverage.test.ts
    - tests/design/empty-state-adoption.test.ts
    - tests/design/error-boundaries.test.ts
    - tests/ops/ops-audit.test.ts
    - tests/ops/reject-reason.test.ts
    - tests/notifications/ops-decision-notify.test.ts
    - e2e/helpers/booker-seed.ts
    - e2e/axe-sweep.spec.ts
    - e2e/overflow-320.spec.ts
    - e2e/skeleton-geometry.spec.ts

key-decisions:
  - "`OPS_QUEUE_ROW_HEIGHT` = `h-132 lg:h-211` (528 / 844) from ten measured widths in two themes; the two themes agree to the hundredth of a pixel at every width"
  - "NO `OPS_QUEUE_STATUS_CAP`, and the reason is a PROBE rather than an argument: `max-w-28` costs +12px at every width including 1280 because it wraps the lead, and no cap value both narrows the column and leaves the lead on one line"
  - "The plan's and the UI-SPEC's empty-state constants were WRONG — the adopter pins moved (14/17 → 15/18), the dashed-exclusion pins did not, and all three were asserted unchanged"
  - "AC#24's product claim widened from ONE work queue to TWO, in words, and the count assertion became a SET so a MOVED positive panel is still red"
  - "The error-boundary copy contract gained a per-row override requiring its own argument, because `(ops)` covers exactly one page and can name what failed"
  - "`revalidatePath(\"/ops\")` was added (Rule 2) — without it every decision is a control that appears to do nothing, and three test harnesses needed a `next/cache` stub as the consequence"
  - "The axe `/ops` row guarantees a HOST row only; the LISTING row is measured by overflow-320 and skeleton-geometry, which already hold seeds. Stated at the row rather than implied away"
  - "`(ops)/ops/error.tsx` is a NAMED SKIP in both e2e inventories: reaching it needs a second `(ops)` page, which D-246 forbids and `ops-guard-coverage.test.ts` asserts against"

patterns-established:
  - "Pattern 1: when a plan hands you a choice between two constants, PROBE the one you are about to refuse and record the transcript — `max-w-28` looked obviously right and is measurably wrong"
  - "Pattern 2: a gate's own NAME is a claim; when the rule widens, rewrite the describe title and the docblock rather than adding a carve-out beneath a title that has become false"
  - "Pattern 3: a count assertion with one member cannot see a MOVE. `toBe(1)` + `startsWith` became a sorted set equality the moment there were two"

requirements-completed: []
requirements-advanced: [OPS-02, OPS-04]

# Metrics
duration: 1h 50min
completed: 2026-09-01
---

# Phase 18 Plan 12: The `/ops` Route — Three Guard Layers, One Queue Summary

**FitOut Ops is now a route: one page, hosts and listings interleaved oldest-first, everything needed to decide on the same screen — behind an assert in the layout that wins the 404 status line, a `requireStaff()` in the page that is the actual gate, and a `requireStaff()` first-statement in all six ops actions; with a skeleton height measured off the rendered route at ten widths rather than predicted, and three pinned design inventories moved in the same commit as the route that moved them.**

## Performance

- **Duration:** ~1h 50min
- **Started:** 2026-09-01T02:50Z
- **Completed:** 2026-09-01T04:41Z
- **Tasks:** 3 (plus one follow-on harness fix found by `npm test`)
- **Files created/modified:** 18 (5 created, 13 modified)

---

## ⚠ THE FINDING THAT MATTERS: A CAP THAT LOOKED OBVIOUSLY RIGHT IS MEASURABLY WRONG

18-UI-SPEC named the 320px status-column squeeze as a hazard to **measure**, and the plan licensed declaring `OPS_QUEUE_STATUS_CAP` if the measurement demanded it. It looked like it would. Measured at the floor, `RowCard`'s 244px header line splits:

```
status 137.08 / title 106.92     ("Waiting 6 days")
status 145.77 / title  98.23     (the longer wait figure)
```

The status column takes the **larger** share — the exact opposite of the split `REQUEST_STATUS_CAP` encodes (*"the deadline … does not outrank knowing WHICH space is being asked for"*). Every instinct says: declare the cap.

**So the cap was applied and re-measured rather than reasoned about.** With `max-w-28` (112px, the shipped value) on the status content, court:

| width | title column | rows |
|---|---|---|
| 320 | 132px (from 98–107) | 506.13 / 258.06 / 526.13 |
| 375 | 187px | host row **250.06** (uncapped: 238.06) |
| 1280 | 836px | **854.09 / 250.06** (uncapped: 842.09 / 238.06) |

The cap buys 25–34px of title at the floor and costs **+12px at every width, including 1280** — where the title column already has 810px and there is nothing to relieve — because it wraps `Waiting {N} days` onto two lines. That is precisely the trade `REQUEST_STATUS_CAP`'s own docblock forbids: *"the countdown itself must therefore always fit."*

**And the decisive part is that no cap value avoids it.** The uncapped status is 137–146px wide, so any cap narrow enough to change the split is narrow enough to wrap the lead. The cap is structurally the wrong instrument on this surface, and declaring one at a value that changes nothing would have been a constant bought to look thorough.

What is left is a **real, recorded observation** rather than a fix: a long listing title truncates to ~98px at the floor. It is materially milder than the **8.66px** that earned the original cap, and this row identifies its subject three other ways the host inbox's row does not — the meta line, the full `Address` term, and the photographs. The honest fixes (shorter lead copy, or a deliberately two-line lead) are changes to 18-10's component and product decisions rather than measurements. Logged in `deferred-items.md` as **D3**.

---

## `OPS_QUEUE_ROW_HEIGHT` — measured, at ten widths, in both themes

`h-132 lg:h-211` — **528px** below `lg:`, **844px** at and above it. Both classes verified to really compile (`h-132` → 528px, `lg:h-211` → 844px, read off `getComputedStyle` in the running app, because a dynamic Tailwind step that the source scan never saw would silently be `0px`).

| viewport | 320 | 375 | 414 | 639 | 640 | 768 | 1024 | 1056 | 1280 | 1440 |
|---|---|---|---|---|---|---|---|---|---|---|
| listing row | **526.13** | 517.05 | 538.98 | 625.53 | 626.09 | 698.09 | **842.09** | 842.09 | 842.09 | 842.09 |
| host row | 258.06 | 238.06 | 238.06 | 238.06 | 238.06 | 238.06 | 238.06 | 238.06 | 238.06 | 238.06 |

- **court and grove are byte-identical at every width**, which is worth stating because grove's heading step is materially wider than court's and this row's lead sits at the heading role.
- The declared values are the two nearest ladder steps: 528 (**1.87px** over-claim) and 844 (**1.91px** over-claim). Both inside the 4px 14-UI-SPEC makes falsifiable, and both over-claims — the direction every sibling constant in `measurements.ts` already chose.
- **The breakpoint is `lg:` because that is where `OPS_QUEUE_SHELL` stops growing.** `max-w-5xl` is 1024px, which is why 1024, 1056, 1280 and 1440 all read 842.09.

### Three things the constant cannot say, all recorded rather than smoothed over

1. **The queue has TWO row shapes.** A host row is 238.06px — barely a quarter of the desktop bar. The plate declares the **listing** shape deliberately (listings are the higher-volume kind, and the photo-bearing row is the one whose arrival moves the page); a plate promising the host row would under-draw the common case by 288px. Logged as **D4**.
2. **The band between `sm:` and `lg:` is under-drawn, structurally.** The height is a *continuous* function of container width because the mosaic is aspect-ratio driven — 528 against 626.09 at 640 and against 698.09 at 768. A third step was considered and rejected (exact at one width inside the band, wrong at every other). Same class as `HOST_BOOKING_ROW_HEIGHT`'s recorded 768–928px band; logged as **D5**.
3. **Zero horizontal overflow at every measured width**, including 320 in both themes — `scrollWidth === clientWidth` at all ten. Confirmed independently by `e2e/overflow-320.spec.ts`.

---

## The inventories: what moved, what did not, and the red watched before each number

### MOVED — every red observed one constant at a time

| Inventory | Before → After | The red, verbatim |
|---|---|---|
| `loading-coverage.test.ts` · `EXPECTED_PAGES` | **33 → 34** | `AssertionError: the number of page.tsx files under src/app changed. …: expected 34 to be 33` |
| …· `EXPECTED_QUALIFYING` | **21 → 22** | `AssertionError: the routes that qualify changed. …: expected 22 to be 21` |
| …· `EXPECTED_NON_QUALIFYING` | **12 → 12, UNCHANGED** | `Tests  15 passed (15)` — the suite went green with the constant untouched, which is the only way to establish that a count did NOT move (the file's own precedent) |
| `empty-state-adoption.test.ts` · `EXPECTED_EMPTY_STATE_SITES` | **17 → 18** | `AssertionError: the tree's total <EmptyState> call-site count moved. Expected 17 across 14 surfaces.: expected 18 to be 17` |
| …· `EXPECTED_ADOPTER_FILES` | **14 → 15** | (moves with the row; both move together or neither moves) |
| …· AC#24's positive-tone set | **1 product surface → 2** | `AssertionError: a PRODUCT surface other than the host request inbox renders a positive empty state: …/requests/page.tsx:237, …/(ops)/ops/page.tsx:190: expected 2 to be 1` |
| `error-boundaries.test.ts` · `BOUNDARIES` | **5 → 6** | `expected 6 to be 5` **and**, in the same run, `the set of error.tsx files on disk is not the declared inventory …: expected [ … ] to deeply equal [ …(4) ]` |
| `measurements.ts` · `RowSkeletonHeight` | **4 → 5 members** | compile-time |

The `error-boundaries` pair is worth one line on its own: that file **split its count and its set into two `it` blocks** after a 2026-08 probe found the count failing first and the set never running, so a sixth boundary reported only *"expected 6 to be 5"* naming no file. When the sixth boundary really landed, the run reported **both**, and the remedy was legible without a second invocation. The split paid for itself.

### ⚠ THE PLAN AND THE UI-SPEC NAMED THE WRONG THREE CONSTANTS

Both said `empty-state-adoption.test.ts` moves `EXPECTED_DECLARED_FILES` 5 → 6, `EXPECTED_DECLARED_SITES` 10 → 11 and `EXPECTED_DASHED_TOTAL` 11 → 12. **Those three pin the non-`EmptyState` dashed-border exclusions** — surfaces that draw a dashed panel *without* adopting the shell — and an adopter moves none of them: the ops page composes `EmptyState`, whose own `border-dashed` is the ONE shell already counted. All three were **asserted unchanged** across this commit, and the correction is written into the file's own docblock rather than applied silently.

### DID NOT MOVE — asserted, not assumed

`git diff --exit-code` succeeded on **all five**, plus `ALLOWED_RAW_CARD`:

| Inventory | Stays at | Because |
|---|---|---|
| `accent-uses.ts` | **10** | No coral anywhere on `/ops`. `AccentUseCountIsTen` is a compile constraint and was never approached. |
| `selector-contract.ts` | **unchanged** | **Zero `data-testid` added.** The e2e specs address `/ops`'s gallery by its ACCESSIBLE NAME (`section[aria-label^="Photos of "]`), which is exactly the scope rule that file states: an id is added only where a role or label query cannot express the target. |
| `contrast-pairs.ts` | **unchanged** | Every colour on the route is an already-declared pair. |
| `status-tones.ts` | **4 tones** | `neutral` and `positive` only. |
| `visual-baselines.ts` | **78** | **Recorded as a decision, not an oversight** (PROJECT D-138): court is the single product theme, `/ops` is internal, and it owes no screenshot pair. |
| `ALLOWED_RAW_CARD` | **unchanged** | `card-pattern-coverage.test.ts` is byte-unchanged by this plan — 18-10 already moved it. |

---

## The three guard layers, and what each clause actually proves

`tests/design/ops-guard-coverage.test.ts` — **15 cases**, design config, DB-free, AST over CALL EXPRESSIONS.

| Layer | Clause | What it pins |
|---|---|---|
| 1 | the layout awaits `assertStaff()` | resolved through `@/lib/ops/staff`, **awaited**, inside the default export's body, with **no JSX and no `<Suspense>` ancestor**. Position, not presence. |
| 2 | every `(ops)` page calls `requireStaff()` | resolved through the same module; a locally-declared function of the same name does not count |
| — | `(ops)/**/page.tsx` | **exactly 1** (D-246) |
| 3 | every ops action gates FIRST | **six** actions — `ops-*.ts` by glob, plus `cancelBookingAsOps` **declared by name**, because a filename-only census misses the one ops action that moves money |
| D-219 | `(ops)/**/not-found.tsx` | **zero files** |
| D-219 | no `(ops)` file calls `forbidden()` or `redirect()` | refusal is `notFound()` only |

### The three mutation REDs — watched, observed, reverted

```
(1) requireStaff() removed from (ops)/ops/page.tsx
    × gives every (ops) page its own resolved requireStaff() call
    AssertionError: these (ops) pages do not call requireStaff() from @/lib/ops/staff themselves.
    …: expected [ 'src/app/(ops)/ops/page.tsx' ] to deeply equal []          1 failed | 14 passed

(2) an empty src/app/(ops)/ops/not-found.tsx created
    × resolves src/app/(ops)/**/not-found.tsx to ZERO files
    AssertionError: an (ops)-scoped not-found.tsx exists. …: expected
    [ 'src/app/(ops)/ops/not-found.tsx' ] to deeply equal []                 1 failed | 14 passed

(3) assertStaff() moved below the layout's first returned JSX
    × src/app/(ops)/ops/layout.tsx awaits assertStaff() above any JSX
    AssertionError: src/app/(ops)/ops/layout.tsx:71 has a JSX ancestor. …:
    expected true to be false                                               1 failed | 14 passed
```

All three reverted; `git status` clean afterwards; **15 passed**.

### ⚠ WHAT THE GATE SAYS IT CANNOT PROVE

Its header opens with the limitation rather than burying it: **it cannot see an HTTP status line**, quoting `soft-404-status.test.ts:31-39` — *"The e2e spec is the ONLY instrument in this repo that can see an HTTP status line"* — and D-24 keeps e2e out of CI. **OPS-02's status-line half is explicitly still OWED and is plan 18-14's first task.**

A dev-server `curl` reading was taken while measuring and is recorded here as an **indication, not evidence**: signed-out → `404`, staff → `200`, `/ops-nope` → `404`. It is a `next dev` reading; the audit that counts is a production build (`next build` + `next start`), four requests, and no automated instrument in this repository can substitute for it.

---

## The e2e rows — measured once, by hand, and NOT gates

**D-24 keeps every e2e spec but `price-parity.spec.ts` out of CI.** What follows is a **one-time audit result**, not ongoing enforcement, and nothing in the code describes these rows as enforcing OPS-04 or the a11y claim.

```
npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium --workers=1
  ok 17 › 18-12 — the /ops plate draws the row that is actually coming ›
          the plate's bar and the arriving row are the same box at 320 and 1280 (3.5s)
  17 passed (1.1m)

npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1
  ok  98 › OPS-04 — the /ops review queue at 320px, in both themes › /ops · court (1.7s)
  ok  99 › OPS-04 — the /ops review queue at 320px, in both themes › /ops · grove (1.1s)
  ok 102-109 › D-201 / AC#2 — every surface on disk is in this file's tables, or excluded by name
  102 passed | 7 skipped (2.7m)

npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1
  ok 73 › /ops · the review queue · court · 320px  (2.0s)
  ok 74 › /ops · the review queue · court · 1280px (1.7s)
  -  75 › error boundary · (ops) · court · 320px   (named skip)
  -  76 › error boundary · (ops) · court · 1280px  (named skip)
  ok  1-2 › AC#2 — no surface can be silently absent from the axe table
  60 passed | 38 skipped (2.2m)
```

**The route-inventory instruments were re-run deliberately**, because this plan ADDS A ROUTE and this project's worst review escape was a route-inventory self-check sitting RED through four passes. Both are green: `axe-sweep`'s `AC#2` row-set equality (derived from disk over five surface filenames) and `overflow-320`'s eight-clause `D-201` block.

**One flake, diagnosed and not mine.** The first `axe-sweep` invocation failed in `mintDraftListing` — `page.waitForURL: Timeout 60000ms exceeded` on `/host/listings/new`, a **pre-existing fixture step** whose own 60s budget is shorter than a cold Turbopack compile of that route. The warm re-run and the subsequent full sweep both passed it.

### What the axe row does NOT cover, stated at the row

- **The listing row.** The axe fixture guarantees a **host** row (one `host_verification` flip). A listing row additionally carries the photo mosaic and the reject overlay, and seeding one needs a full listing fixture that file deliberately refuses to open. It **is** measured — at 320px, in both themes, by `overflow-320`'s Phase-18 block, which already holds a seed.
- **The empty panel inside the ops shell.** The panel itself is the same component and tone `/host/requests` renders at zero and `/dev/theme` renders in both themes; what is unaudited is that panel *inside this shell*, which differs from the host shell only in the wordmark and the absent nav.
- **The `(ops)` boundary**, in both e2e inventories — a NAMED SKIP with its reason, because reaching it needs a second `(ops)` page and D-246 forbids one.

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run build` (lint + FULL design suite + `next build`) | **exit 0**, `ƒ /ops` in the route table |
| `npm run test:design` (run **alone**) | **73 files / 1329 passed / 3 skipped** — baseline 72 / 1313 / 3, i.e. **+1 file and +16 cases**: this plan's 15 guard cases and the sixth error-boundary row |
| `npm test` (run **alone**) | **206 files / 2465 passed / 5 skipped** — identical to baseline, zero regressions |
| `npx eslint` on every new and modified file | **exit 0** |
| Playwright, by hand | skeleton-geometry **17 passed** · overflow-320 **102 passed / 7 skipped** · axe-sweep **60 passed / 38 skipped** |

Pre-existing and not this plan's: the `[test-db] LEAKED WRITES` block naming `notify` and `guest-email`; the three red e2e specs already in `deferred-items.md`; the 25 ESLint warnings; the `(host)` hydration-mismatch noise in the dev-server log.

### The acceptance greps

| Check | Result |
|---|---|
| `src/app/(ops)/**/page.tsx` | **1** (D-246) |
| `src/app/(ops)/**/not-found.tsx` | **0** |
| `find src/app/(ops) -name error.tsx` | only `src/app/(ops)/ops/error.tsx` |
| `requireStaff()` in `page.tsx`, **comment-stripped** | **1** |
| `NOT the security boundary` in `layout.tsx` | present |
| `git diff --exit-code` on the five DOES-NOT-MOVE inventories | **clean** |
| `card-pattern-coverage.test.ts` (`ALLOWED_RAW_CARD`) | **byte-unchanged** |
| `auth.api.updateUser` in `e2e/helpers/booker-seed.ts` | **0** |

### ⚠ THE ACCEPTANCE-GREP LANDMINE, TWICE MORE (instances eight and nine)

- **`grep -c "requireStaff()" src/app/(ops)/ops/page.tsx` returns 2, not the 1 the plan asks for** — against a *correct* file, because that page's header carries the doctrine paragraph explaining why the page re-gates, and the paragraph names the function. Comment-stripped it is **1**, and `ops-guard-coverage.test.ts` counts CALL EXPRESSIONS for exactly this reason. The measurement is recorded in that file's header so the next reader meets it as a known shape rather than as a defect.
- **`grep -c "auth.api.updateUser" e2e/helpers/booker-seed.ts` returned 1** on the first draft, because the paragraph explaining *why that endpoint is forbidden* spelled it. Rewritten to name the endpoint descriptively, with the rule and the instance count recorded at the site. This is the shape `price-breakdown.tsx`'s GREP TRIPWIRE rule exists for, and it has now caught this repository nine times.

---

## Deviations from Plan

### 1. [Rule 2 — Missing critical functionality] `revalidatePath("/ops")` in all six ops actions

- **Found during:** Task 1, wiring the page.
- **Issue:** 18-05 and 18-10 both **dated this line to this plan by name**, and 18-10 refused to paper over it with a client-side `router.refresh()` on the grounds that a refresh in the island would be a component taking a decision that belongs to the route. This plan's own action text does not mention it. Left out, an operator approves a listing, the row stays exactly where it was, and the only feedback is a toast — a second press is then refused calmly by the guards in the `WHERE`, which is correct and is *indistinguishable from a control that did nothing*.
- **Fix:** one line after each of the five successful flips in `ops-review.ts`, and one in `cancelBookingAsOps` — deliberately **not** folded into `revalidateCancelSurfaces`, which is shared with the booker and host paths and has no business invalidating a staff-only console.
- **Files:** `src/app/actions/ops-review.ts`, `src/app/actions/cancel-booking.ts` (both outside the plan's `files_modified`) · **Commit:** `04c523f`

### 2. [Rule 3 — Blocking] Three test harnesses needed a `next/cache` stub

- **Found during:** deviation 1's consequence — two harnesses in Task 1, the third by running `npm test` **alone** afterwards.
- **Issue:** `revalidatePath` throws `Invariant: static generation store missing` outside a Next request. `tests/ops/ops-audit.test.ts`, `tests/ops/reject-reason.test.ts` and `tests/notifications/ops-decision-notify.test.ts` all drive the real actions and none stubbed it. The third one failed **10 of 12 cases** on the cache rather than on the notification row it measures.
- **Fix:** the shipped idiom (`tests/payments/ops-cancel.test.ts:331`) — `vi.doMock("next/cache", () => ({ revalidatePath: () => {} }))` plus its `doUnmock`, with the reason at each site.
- **Commits:** `04c523f` (two), `82cd427` (the third)
- **⚠ Worth carrying forward:** the third file was invisible until `npm test` ran ALONE. Two of the three harnesses live under `tests/ops/`; the one that broke does not.

### 3. [Rule 1 — Wrong instruction corrected] The empty-state constants

- **Issue:** the plan AND 18-UI-SPEC's Gate Ledger both name `EXPECTED_DECLARED_FILES` / `EXPECTED_DECLARED_SITES` / `EXPECTED_DASHED_TOTAL`. Those pin the dashed-border **exclusions**, not the adopters, and an adopter moves none of them.
- **Fix:** measured first. The run named `EXPECTED_EMPTY_STATE_SITES` (17 → 18) and `EXPECTED_ADOPTER_FILES` (14 → 15); the three the plan named were asserted **unchanged**. The correction is written into the file's own docblock beside the numbers.
- **Commit:** `04c523f`

### 4. [Rule 1 — A gate's own name became false] AC#24 widened from one work queue to two

- **Issue:** `empty-state-adoption.test.ts` asserted *"exactly ONE product surface renders a positive empty state, and it is the host request inbox"*, and its describe was titled *"host inbox-zero is a POSITIVE state"*. 18-UI-SPEC requires `tone="positive"` for the ops empty state, on the same inbox-zero argument. Left as-is the gate would be red against correct, specified code.
- **Fix:** the RULE did not change — *an emptied WORK QUEUE is an achievement, an absence anywhere else is not* — so the title and the docblock were **rewritten to the rule they always stood for** rather than a carve-out added beneath a sentence that had become false (`venue-clock-scope.ts`'s discipline, applied to a gate's own name). `host-agenda.tsx`'s and the bell's neutral rows are UNCHANGED and state the boundary from the other side.
- **And the clause got STRONGER while widening:** `toBe(1)` plus a `startsWith` on the first element became a **sorted set equality**. A bare count is satisfied by a tree where the positive panel MOVED to some other surface — the one failure the clause exists to catch, and no longer theoretical with two members.
- **Commit:** `04c523f`

### 5. [Rule 1 — A shipped contract needed an argued exception] The boundary copy override

- **Issue:** `error-boundaries.test.ts` asserted both copy sentences *"identical on all five"*. 18-UI-SPEC specifies different copy for the ops boundary (**"The queue didn't load"**).
- **Fix:** `BoundaryRow` gained optional `title`/`body` plus a **required `copyWhy` over 40 characters**, and the per-row clause asserts a partial override is illegal — a row overrides BOTH sentences with an argument, or neither. The argument itself is real rather than a formality: the other five each cover a route group with several pages, so *"this page"* is the most they can honestly say; D-246 gives `(ops)` exactly one page, so this boundary knows which surface failed, and a boundary that CAN be specific and chooses the generic sentence is worse copy, not safer copy.
- **Commit:** `04c523f`

### 6. [Rule 3 — Blocking] The axe sweep needed two database writes, in a file whose rule is that it opens no client

- **Issue:** staff standing is **CLI-only by D-217** — no sign-up intent, no server action, no route handler can produce it — so a `/ops` axe row without a grant would scan the ROOT not-found body: a real, clean, non-overflowing document that reports a **PASS**.
- **Fix:** `withClient` in the shared helper opens a connection, writes, and **ends it** before returning. The rule's stated reason is that another spec *holding* a `postgres({max:1})` client is a contention hazard `deferred-items.md` names; this file's steady state is still zero clients. The argument is written at the call site so the next reader can check it rather than take it.
- **Commit:** `5da8d73`

### 7. [Rule 1 — Plan instruction impossible as written] `/ops · queue` and `/ops · empty` are ONE axe row, not two

- **Issue:** the plan asks for two axe rows. `axe-sweep.spec.ts`'s AC#2 equality asserts `duplicated: []` over the rows' `file` field, so two rows naming one file is a **red**.
- **Fix:** one row per file — `(ops)/ops/page.tsx` measured, `(ops)/ops/error.tsx` a named skip — with the empty-panel gap stated at the row rather than implied away.
- **Commit:** `5da8d73`

**Total deviations:** 7 auto-fixed (4 × Rule 1, 1 × Rule 2, 2 × Rule 3). No architectural change; no package installed; `components.json` still declares `"registries": {}`.

---

## Known Stubs

**None.** Every control on the route acts, every value rendered is a value the page computed, and the two things that were absent when 18-10 finished are now wired: `loadOpsCancelImpact` runs per listing row (in parallel), and `revalidatePath("/ops")` fires on every successful decision.

One deliberate absence, which is a decision rather than a stub: **`nav` is omitted from `SiteChrome`** on this shell, because D-246 holds the console at one page and inventing an `OPS_NAV_LINKS` inventory to hold a single destination that is also the wordmark's would be scope. **`ModeSwitch` and the notification bell are omitted** for stated reasons — ops is a role, not a mode, and mounting a bell would imply ops notifications exist when nothing in this phase writes one to a staff account.

---

## Threat Flags

None. This plan adds no network endpoint, no auth path, no schema change and no new trust boundary. The `/ops` route is *inside* the boundary the threat model already describes, and the plan's own register (T-18-1201 … T-18-1206) is discharged as follows:

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-18-1201 | mitigated **structurally**; the status-line PROOF is owed | layer 1 in the layout, asserted by position in `ops-guard-coverage.test.ts`. **18-14 measures the number.** |
| T-18-1202 | mitigated | the assert runs before any JSX is returned; a mutation moving it below the first element was watched RED |
| T-18-1203 | mitigated | zero `(ops)` `not-found.tsx`, asserted and mutation-proved RED by creating one |
| T-18-1204 | mitigated | the page calls `requireStaff()` itself; all SIX ops actions gate first; the layout's header disclaims being the boundary |
| T-18-1205 | mitigated | `error.tsx` sits beside the layout; asserted by the boundary inventory, by a `find`, and by the group's own file walk |
| T-18-1206 | mitigated | the constant is measured at ten widths in two themes and pinned by `e2e/skeleton-geometry.spec.ts`; the tolerance is 4px and the file says in as many words that the constant is re-measured rather than the tolerance widened |
| T-18-SC | mitigated | **zero packages installed**; `package.json` byte-unchanged |

---

## Carried forward

- **⚠ OPS-02's STATUS-LINE HALF IS STILL OWED, AND IT IS 18-14's FIRST TASK.** Under a **production build** (`npm run build` then `next start`), four requests must return the same number for every non-staff case: staff → 200, non-staff → 404, signed-out → 404, `/ops/xyz` → 404. The dev-server reading in this summary is an indication and nothing more. Note the local production-run prerequisite recorded in the project memory: `next start` refuses to boot without `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME`, so pass throwaway values inline for that process.
- **The 320px title-column squeeze (D3) is a live product question**, not a closed one. If the PM wants it fixed, the instrument is 18-10's copy, not a `measurements.ts` constant.
- **`(ops)` has no throw affordance and cannot get one** while D-246 holds. Its boundary's *composition* is gated per commit; its *document* is unmeasured, and both e2e inventories say so at their rows.
- **A local staff grant exists on this machine.** `host@fitout.test` was granted staff via `npm run ops:grant` to take the measurements, and the grant plus its `audit` row were left in place — 18-01's "User Setup Required" says somebody must be staff before the console is reachable, so this IS the operator setup rather than test residue. The dev-DB measurement fixture (two listings flipped to `pending`, one `host_verification` flipped) was **reverted and the counts re-verified**: 5 approved / 14 grandfathered listings, 1 approved / 12 grandfathered verifications, exactly as found.
- **The e2e staff fixture writes an `audit` row per run** and tears it down by `actor_id`. `audit` carries no foreign key by design, so nothing cascades to it — the same trap the Phase-14 teardown records.

## Commits

| Hash | Message |
|---|---|
| `04c523f` | `feat(18-12): the /ops console — three guard layers, one queue, three pinned counts` |
| `39477ca` | `test(18-12): the structural OPS-02 gate — three layers, three watched reds` |
| `5da8d73` | `test(18-12): the three e2e rows — the only instruments that can see a picture` |
| `82cd427` | `test(18-12): stub next/cache in the third harness that drives the ops actions` |

## Self-Check: PASSED

All six created files verified present on disk; all four commits (`04c523f`, `39477ca`, `5da8d73`, `82cd427`) verified in `git log`.
