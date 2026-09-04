---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 11
subsystem: testing
tags: [playwright, e2e, responsive, resp-03, d-201, coverage, no-wrap, inventory, host-surfaces]

# Dependency graph
requires:
  - phase: 17-04
    provides: "`e2e/helpers/nowrap.ts` — `expectNoWrap` with its three guards, and the two declared-set rows whose paragraph skips name this plan's Task 3 as their owner"
  - phase: 17-06
    provides: "a harness that measures what it claims to — the scoped sheet row, the polled target-size guard, and the site header inside the 24px scan"
provides:
  - "All 27 production-reachable page routes are measured at 320px in both themes, or carry a named reason — the seven that had ZERO measurement are rows in existing tables (six host, one booker)"
  - "The D-201 inventory assertion: `src/app/**` enumerated at run time across five document-rendering families and compared against the union of this file's three route tables, in BOTH directions, behind a 25-page vacuity floor"
  - "`SURFACE_INVENTORY` — all four D-201 exclusions recorded as rows with paragraph reasons rather than as absences"
  - "RESP-03 clause C's remaining reachable entries measured through the ONE shared `expectNoWrap`, plus `expectChipNotClipped` for the one subject class whose box is a declared height"
  - "`Phase14Row.noOwnControls` — a declaration that INVERTS the target-size vacuity guard for the one surface in the app that ships no action of its own"
  - "Four escalate-class findings for 17-13, each with its measurement"
affects: [17-12, 17-13, e2e-harness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A coverage claim is a SET comparison against the filesystem, asserted in both directions, behind a vacuity floor asserted first"
    - "A declared exclusion is a ROW with a reason, never an absence — the two are indistinguishable in a table that only lists what it measures"
    - "When a shared measurement is structurally wrong for a subject, assert its CAUSE and write the readings that rule the shared one out"
    - "A vacuity guard whose own sentence is false of the shipped app is DECLARED and inverted, never exempted"

key-files:
  created: []
  modified:
    - e2e/overflow-320.spec.ts

key-decisions:
  - "The seven unmeasured routes are rows in the EXISTING tables — six host rows in the AC#36 block, `/bookings` in the AC#30 block — because a fourth table is a fourth place a surface can be silently absent, which is what the D-201 assertion exists to forbid"
  - "`expectTargets`'s vacuity guard is INVERTED by declaration for `/host/earnings` rather than skipped: the guard's own sentence (`every Phase-13 and Phase-14 surface ships at least one action of its own`) is FALSE of the shipped app, measured"
  - "The status chip is measured by `expectChipNotClipped` (the `white-space` declaration plus the horizontal clip) and NOT by `expectNoWrap`, because `h-5` pins `clientHeight` at 18 in every state — the helper would be red on a correct tree AND unfalsifiable at once"
  - "`expectChipNotClipped` carries NO vertical bound: every shipped chip overhangs its own box by 1–2px, by a different amount per surface, so any tight vertical clause is red on clean code"
  - "`MONEY_FIGURE` narrows the price class by CURRENCY SYMBOL, because `tabular-nums` is on dates too — the literal reading of 17-UI-SPEC's price class went red on a when-label"
  - "`src/app/listings/[id]/(detail)/not-found.tsx` is recorded as a paragraph SKIP after being written as a measurement and going red: a layout wins the 404 above it, so nothing can render it"
  - "`MIN_APP_PAGES = 25` is a vacuity floor, deliberately NOT a second copy of `loading-coverage.test.ts`'s `EXPECTED_PAGES = 29` pin — the remedy here is never 'bump the number'"

patterns-established:
  - "Pattern: write the row as a measurement first; if it goes red, the probe that follows is the finding"
  - "Pattern: a `count()` floor is POLLED — `locator.count()` is the one locator form in this suite with no auto-wait"
  - "Pattern: `.filter({ visible: true })` on every geometric subject, because a driven clock and a `hidden md:block` twin both leave measurable-looking trees nobody can read"

requirements-completed: []  # RESP-03 stays Pending — 17-12 still owes it the four error-boundary surfaces

# Metrics
duration: 1h 41m
completed: 2026-08-30
---

# Phase 17 Plan 11: RESP-03 Coverage Delta and the D-201 Inventory Summary

**The seven production routes with zero 320px measurement are now measured in both themes, the completeness itself is machine-checked against `src/app/**` in both directions behind a 25-page vacuity floor, and clause C's remaining reachable subjects go through the one shared `expectNoWrap` — with four measured corrections to the plan's own inputs, each found by going red rather than by reasoning.**

## Performance

- **Duration:** 1h 41m
- **Started:** 2026-08-29T15:25Z (2026-08-30 00:25 +08)
- **Completed:** 2026-08-29T17:06Z (2026-08-30 01:06 +08)
- **Tasks:** 3
- **Files modified:** 1 (`e2e/overflow-320.spec.ts`, +1,577 lines)

## Accomplishments

- **AC#1 closed on the coverage half.** `src/app/**/page.tsx` is 29 files; less the two `src/app/dev/**` instruments that is **27 production-reachable page routes**. Twenty were measured before this plan; the other **seven are now rows in existing tables** — `/host/bookings/[id]`, `/host/earnings`, `/host/listings`, `/host/listings/new`, `/host/payouts/return`, `/host/payouts/refresh` in the AC#36 host block, and `/bookings` in the AC#30 booker block. Suite count **66 → 92 passed**.
- **Four of the seven needed a tell that is not the obvious one**, and the reason is a source fact in each case: `/bookings`, `/host/earnings`, `/host/listings` and `/host/payouts/return` each have a `loading.tsx` that composes the resolved page's `h1` **byte-identically** (deliberately, so the sentence does not move when data lands). A heading hook on any of them would have reported the SKELETON as the surface.
- **AC#2 is mechanical.** A fifth describe enumerates `src/app/**` across the five families that render a document and asserts the set equality three ways — disk→map, map→disk, map→tables — with the wrong remedy said out loud (`NEVER AUDITED`, "never narrow the enumeration"). Both new mechanisms watched red.
- **All four D-201 exclusions are rows with paragraph reasons**, including the note that `/dev/throw` is excluded as a *subject* while being the only *mechanism* that reaches the root error boundary.
- **AC#8's reachable entries are measured through the one shared helper** — the booking reference on five surfaces, the receipt's Total, and every money figure on the facts list, the booker's list and the cancellation quote — in both themes at 320×568, after each row's tell.
- **`npm run build` exit 0**: lint 0 errors (25 pre-existing warnings), design suite 66 files / 1247 passed / 3 skipped, `next build` compiled.
- **Zero product source changed.** `git status --porcelain src/` and `drizzle/` both empty at every commit.

## Task Commits

1. **Task 1: measure the seven routes with zero 320px coverage** — `1904bf6` (test)
2. **Task 2: D-201 — assert the tables' route set equals the disk inventory** — `9cd797f` (test)
3. **Task 3: measure the no-wrap set on the Phase-13 surfaces** — `e275527` (test)

**Plan metadata:** this commit (docs)

## Measurements

**The coverage delta, closed:**

| Route | Table | `tell` | Why not the obvious hook |
|---|---|---|---|
| `/bookings` | AC#30 (Phase 13) | `row-card` | `bookings/loading.tsx` composes `PageHeader title="Your bookings"` AND the real `BookingsTabs` |
| `/host/bookings/[id]` | AC#36 | `dt:text-is("Guest paid")` | the plate composes the same container and the same back button; only the resolved page has a `<dl>` |
| `/host/earnings` | AC#36 | `panel-card:has-text("Upcoming payouts")` | `earnings/loading.tsx:28` renders the identical `PageHeader title="Earnings"` |
| `/host/listings` | AC#36 | `a[href^="/host/listings/"][href$="/availability"]` | `listings/loading.tsx:39` renders the identical `PageHeader title="Your listings"` |
| `/host/payouts/return` | AC#36 | `[data-payout-banner]` | the plate renders `<h1>Thanks — that's submitted</h1>` **byte-identically** |
| `/host/payouts/refresh` | AC#36 | `h1:has-text("pick up where you left off")` | the plate has no heading at all — the one row where the obvious hook is fine |
| `/host/listings/new` | AC#36 (last) | `wizard-step-rail` | also proves the draft was created rather than the `/host/listings` fallback taken |

**`/host/listings` control boxes at 320px** (from the `noOwnControls` red-watch, court): `a[Create listing] 111.9x32` · `a[Edit] 63.9x28` · `a[Availability] 107.7x28` · `button[Unlist] 57.7x28` · `button[Delete] 62.4x28` — all clear the 24px AA floor, none is 44.

**The status chip, four readings** (`/dev/theme`, 320px, both themes, 44 badges):

| state | clientHeight | scrollHeight | clientWidth | scrollWidth |
|---|---|---|---|---|
| shipped | 18 | 19 | 135 | 135 |
| `whitespace-nowrap` deleted, roomy | 18 | 19 | 135 | 135 |
| `nowrap` deleted AND squeezed to 58px | 18 | **27** | 58 | 64 |
| `nowrap` restored, still squeezed | 18 | 19 | 58 | **90** |

`clientHeight` is 18 in all four — `h-5` less 1px of border top and bottom. Plus, on `/bookings · grove`, a shipped chip reads `scrollHeight 20` against the same 18.

**No-wrap subjects, court, 320×568, on the Phase-13 fixture:**

| subject | clientHeight | lineHeight | verdict |
|---|---|---|---|
| `booking-reference` | 24 | 24 | one line, **zero slack** |
| `receipt-total` | 26 | 26 | one line, zero slack |
| `paid-statement` | **72** | 24 | three lines, **by design** — not a no-wrap subject |
| `dd.tabular-nums` (a when-label on the receipt) | **48** | 24 | two lines — `tabular-nums` is on dates too |

**Money-figure counts after the `MONEY_FIGURE` filter** (the `atLeast` floors are taken from these): `/bookings` 3/3 · confirmation moment 3/3 · confirmed detail 3/3 · the receipt **3 of 5** (both when-labels dropped) · cancel 6/6.

## Watched Reds

Every new mechanism in this plan was watched red before it was trusted, and each mutation was reverted.

1. **The `noOwnControls` declaration** — declared `/host/listings` control-less: *"this row DECLARES that the surface renders no interactive control of its own … and the scan found 5"*, with all five named and measured. Reverted.
2. **The D-201 absence clause** — a throwaway `src/app/(legal)/a-17-11-red-watch/page.tsx`: *"1 surface(s) exist in `src/app` and appear NOWHERE in this file's route tables and nowhere in its declared exclusions: `/a-17-11-red-watch`"*, followed by the full remedy paragraph. Deleted; `git status --porcelain src/` verified empty afterwards.
3. **The D-201 guard-the-guard** — `APP_DIR` repointed at a directory that does not exist: *"found 0 `page.tsx` file(s), under the floor of 25 … an empty or truncated scan makes ALL of them pass having compared nothing"*. Reverted.
4. **`expectChipNotClipped` clause (1)** — `whitespace-nowrap` deleted from `src/components/ui/badge.tsx`: *"this chip computes `white-space: normal`, not `nowrap`"*. Reverted.
5. **`expectChipNotClipped` clause (2)** — `max-w-12` added to the same recipe: *"this chip's label is CLIPPED HORIZONTALLY — 63px of content inside a 46px box"*. Reverted.
6. **`expectNoWrap` on a real subject, unintentionally** — the facts-list entry, before the money filter, on the receipt: *"this text WRAPS — it renders 48px against a one-line box of 24px. Text: `Sunday, Aug 30, 10:51 AM – 11:51 AM (Makati time)`"*. That red is the reason `MONEY_FIGURE` exists, and it is the proof the shared helper is live in this file.

## Findings (escalate-class — recorded, NOT fixed; for plan 17-13's ledger)

**F1 — `src/app/listings/[id]/(detail)/not-found.tsx` is UNREACHABLE in every state.** Measured 2026-08-30 against `/listings/a-listing-that-must-never-exist-17-11`: status **404**, and the document rendered is the **root** not-found (`We couldn't find that page`, one `empty-state`, the public header and the site footer). This boundary's own copy — `This space isn't available` — is nowhere. Cause: `(detail)/layout.tsx` awaits `assertPublicListing`, which calls `notFound()` at `public-listing.ts:104`; a `notFound()` raised in a **layout** is handled by the **parent** segment's boundary, and `src/app/listings/[id]/` has none. The assert cannot move into the page — it is there because `loading.tsx`'s Suspense boundary flushes the shell before the page body runs, which is what made the route answer a soft 200 — and layout and page share one predicate, so the page's own `notFound()` can never fire on a listing the layout admitted. ⚠ The file's own header (plan 11-19) still says the opposite; it predates the layout's assert and is left byte-identical rather than edited.

**F2 — `/host/earnings` ships no interactive control of its own, and `expectTargets`'s vacuity guard said that was impossible.** The guard's sentence is *"Every Phase-13 and Phase-14 surface ships at least one action of its own"*; the route polled **zero** non-shell controls for the full 15s on a correct tree. Cause is three deliberate product decisions: `payouts_enabled` suppresses `PayoutBanner` (its `Set up payouts` button is the only control the route can render), `payout-row.tsx` takes no `href` and says in as many words that a payout row is terminal, and the zero-ledger branch passes `actions={null}` with its own written argument. Declared rather than exempted (see § Deviations 1). No product change owed unless the surface is meant to have an action.

**F3 — `expectVisibleFocus` can land in the FOOTER on a control-less surface.** It walks Tab until `inHeader` is false, and `inHeader` is `site-header` alone — so on `/host/earnings` the "first in-surface control" it measures is a footer link. The ring assertion is still made and still true; what it is not is a statement about that route. Fixing it means teaching the walk what "the surface" is, which changes what every row in two blocks measures. Recorded, not fixed.

**F4 — `/host/payouts/refresh` issues a REAL PayMongo request per case, contradicting this plan's own threat model.** T-17-59 asserts these rows *"read the shipped pages only and issue no PayMongo call"*. Measured: the page calls `refreshOnboardingLink()` → `startPayoutOnboarding()` → `createOnboardingLink()`, a live `POST https://api.paymongo.com/v1/linked_accounts/onboarding_links` with the local `PAYMONGO_SECRET_KEY`. Platforms / Linked Accounts is beta / sales-gated, so it fails and the retry document renders — which is the only document this route can produce locally. Cost: two outbound POSTs per run (one per theme), each writing one `audit` row with `outcome: "error"`, and 2 of `startPayoutOnboarding`'s 5-per-60s per-identity budget. No PayMongo resource is created (the endpoint refuses before one exists), and `afterAll` deletes the audit rows — verified, zero rows left after two full runs.

## Decisions Made

1. **Seven rows in existing tables, not a fourth table.** The plan's own instruction, and its reason is the assertion added in Task 2: a fourth table is a fourth place a surface can be silently absent.
2. **`/host/listings/new` is measured and placed LAST.** Every visit creates a draft listing owned by the fixture host, so two visits add two cards to the grid `/host/listings` measures three rows above. Last in the table, it cannot change what an earlier row measured. What it renders is the wizard's first step — measured, `h1 "What kind of space is it?"` with one `wizard-step-rail` — i.e. the same composition `/host/listings/[id]/edit` measures with strictly less in it. Recorded in the row so a later reader counting distinct compositions counts this one as zero.
3. **One `host_payout_ledger` row in the fixture**, so `/host/earnings` measures its mobile `PayoutRow` stack rather than its empty state. Both its FKs are `ON DELETE RESTRICT`, so `afterAll` deletes it first — otherwise it blocks both the booking delete and the host delete and leaks the whole fixture.
4. **`MIN_APP_PAGES = 25`, not 29.** A vacuity floor, not a second copy of `loading-coverage.test.ts`'s pin. Pinning 29 here would make every route addition fail in two places with two different remedies, and the remedy here is never "bump the number".
5. **The `loading.tsx` family is covered as a CLASS**, with the per-file claim that makes the class argument sound: every one sits beside a `page.tsx` whose route is in the inventory. Twenty-one individual rows for transient fallbacks nobody can navigate to would be twenty-one rows of noise around the thirty-nine that matter.
6. **`expectChipNotClipped` asserts the CAUSE.** Measured: deleting `whitespace-nowrap` changes nothing visible while the chip has room, and only produces a clipped line once a parent squeezes it. A symptom-side gate would have reported green on the very commit that removed the protection.
7. **The four `[11-21]` error-boundary skips are untouched** — `git diff` shows no change to those four `skip` strings. Plan 17-12 owns them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `expectTargets`'s vacuity guard is false of the shipped app**

- **Found during:** Task 1, on the first full run — `/host/earnings · court` failed with *"found ZERO interactive controls in the surface's OWN content, and kept finding zero for fifteen seconds"*.
- **Issue:** The guard asserts *"every Phase-13 and Phase-14 surface ships at least one action of its own"*. `/host/earnings` is a read-only status view and ships none. Skipping `expectTargets` on that row would have removed the 24px floor from the route entirely.
- **Fix:** `Phase14Row.noOwnControls` — a declared reason that **inverts** the guard to "exactly zero, and here is why". Strictly stronger on this surface: it now also fails when the declaration goes stale. The 24px floor still runs over every control the scan found, shell included. `expectTargets` gained an optional third parameter and its polled branch was extracted verbatim into `expectOwnControlsPresent` (not one character of [15-12]'s closure changed).
- **Verification:** watched red by declaring `/host/listings` control-less — five named controls with their boxes.
- **Committed in:** `1904bf6`

**2. [Rule 1 - Instrument correctness] The listing not-found row was written as a measurement and had to be demoted**

- **Found during:** Task 2, at `expectReachable`, in both themes.
- **Issue:** The plan lists this boundary as `✗` and asks for a named reason; the file's own header claims it IS reachable. Both could not be right, so the row shipped with a real path. It went red. See F1 for the cause.
- **Fix:** `path: null` with a paragraph `skip` carrying the measurement, the cause and the owner. The `ROUTES` docblock's counts amended with the file's quoted-history idiom (17 routes + **five** states now, and the "all four are error boundaries" asymmetry sentence marked as history).
- **Committed in:** `9cd797f`

**3. [Rule 1 - Bug] `tabular-nums` is not the same thing as "a money figure"**

- **Found during:** Task 3 — the facts-list entry failed on the receipt with 48px against a 24px line box, on a when-label.
- **Issue:** 17-UI-SPEC's price class read literally is *every `tabular-nums` money figure*; the utility is deliberately on DATES too (`payout-row.tsx` says so). A when-label is prose and wraps by design, so the literal reading is red on a correct tree and names the wrong defect.
- **Fix:** `MONEY_FIGURE` — the currency symbol, optionally behind D-59's minus sign — with the measured false positives and all five per-surface counts written above the constant. The `atLeast` floors keep it honest: if the display currency changes, the filter matches nothing and every entry fails by name.
- **Committed in:** `e275527`

**4. [Rule 1 - Bug] My own vacuity floor raced the surface it measured**

- **Found during:** Task 3, during the `whitespace-nowrap` red-watch — `the receipt` reported *"the booking reference matched 0 element(s) … under its floor of 1"* on a surface that renders one, because the dev server was recompiling.
- **Issue:** `locator.count()` is an immediate snapshot with no auto-wait — unlike every `expect(locator)` form in this file. That is [15-12] arriving in a new clause, in a guard added by this plan.
- **Fix:** `expect.poll` around the floor, same 15s allowance `expectReachable` carries, same claim. 17-06's closure, copied.
- **Committed in:** `e275527`

**5. [Rule 2 - Missing Critical] Two invisible trees would have been measured**

- **Found during:** Task 3 — `expectNoWrap`'s guard (c) fired on `the confirmation moment` naming a second `booking-reference` with `clientHeight 0 · rectHeight 0`.
- **Issue:** Two different invisible trees are addressable on these surfaces: the retained `router.refresh()` tree a frozen clock leaves inside a `hidden` container on the `ticks: true` rows (the same artifact `expectMoneyStatementAboveFold` already records), and the `hidden md:block` desktop table on every list surface. A `display: none` element reports 0 for every box, so it satisfies a width clause trivially.
- **Fix:** `.filter({ visible: true })` on every subject — this file's own precedent, with both measurements written at the call site. The floor counts visible matches, so a subject that stopped painting still fails.
- **Committed in:** `e275527`

**6. [Rule 2 - Missing Critical] Three teardown statements no cascade reaches**

- **Found during:** Task 1, while designing the fixture extension.
- **Issue:** `host_payout_ledger` has `ON DELETE RESTRICT` on **both** `booking_id` and `host_id`, so the seeded ledger row would have failed the booking delete AND the host delete and leaked the entire fixture into the dev database. `audit` carries no foreign key by design, so `/host/payouts/refresh`'s rows are invisible to every cascade and would accumulate one pair per run forever.
- **Fix:** two explicit deletes at the head of `afterAll`, ordered by the FK, with the draft-listing cascade named beside them so the next reader does not go looking for a missing statement.
- **Verification:** after two full runs, `host_payout_ledger`, `listing` and `user` rows matching the fixture prefixes all read **0**, and zero `startPayoutOnboarding` audit rows carry a fixture actor id.
- **Committed in:** `1904bf6`

---

**Total deviations:** 6 auto-fixed (3 × Rule 1 bug, 3 × Rule 2 missing-critical).
**Impact on plan:** No scope creep — every change is inside the one file the plan names, plus two reverted red-watch mutations to `src/components/ui/badge.tsx` and one reverted throwaway route. Every deviation makes an assertion harder to pass or removes a way for one to pass vacuously; none relaxes a claim. Three of the six exist because the plan's stated subject (a status chip, a `tabular-nums` money figure, a surface with an action) is not what the shipped tree actually contains.

## Verification

| Check | Result |
|---|---|
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1` | **92 passed / 17 skipped**, exit 0 (was 66/15 before this plan) |
| The run's skip output prints a named reason for every skipped row | yes — 8 skipped rows × 2 themes, plus the D-83 case: the four `[11-21]` boundaries, the three payment states, and F1's listing not-found |
| `npm run build` | exit 0 — lint **0 errors** (25 pre-existing warnings), `test:design` **66 files / 1247 passed / 3 skipped**, `next build` compiled |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint e2e/overflow-320.spec.ts` | clean |
| `git status --porcelain src/` | empty — no product source reshaped (T-17-58) |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32 — zero schema migrations proposed or absorbed) |
| Seven routes present by path (`grep -c`) | **41** (≥ 7) |
| `test.describe(` count | 4 after Task 1 (unchanged, as its criterion requires); 6 after Tasks 2 and 3 added the two browserless blocks |
| `grep -c 'TOUCH_FLOOR_PX'` | **4**, unchanged — every 44px assertion still goes through `expectTouchTargets` with a named `TouchTarget` |
| `grep -c 'og-routes\|email-shell\|global-error\|src/app/dev'` | **23** (≥ 4) |
| `grep -ci 'NEVER AUDITED'` | **2** (kept on one source line so a grep finds it, not only a rendered failure) |
| `grep -c 'expectNoWrap'` | **16** (≥ 3) |
| `grep -c 'getComputedStyle(el).lineHeight\|lineHeight)'` | **0** — no second no-wrap definition |
| The four `[11-21]` skip strings | untouched — `git diff` shows no deletion of any of them |
| Fixture teardown | verified in Postgres after two full runs: 0 leaked ledger rows, 0 leaked listings, 0 leaked users, 0 leaked audit rows |
| Failures against `e2e-baseline-reds.md` | none; nothing added to the denominator |

**One intermittent, diagnosed and not a defect:** the full run taken immediately after reverting the `badge.tsx` red-watch mutation reported `bookings/[id]/not-found · grove` red. The same case passed in isolation and the next full run was green (92/17). It is the dev server recompiling under a suite that had just edited a shared component — the trap this file's own header names ("IF THIS FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON :3000 AND RE-RUN"), and the project rule about not trusting the first red after a build.

## Issues Encountered

None that blocked. Two things a reader should know:

1. **The plan's Task-1 acceptance criterion about `path: null` finally applies — to a row the plan did not anticipate.** No host route needed a skip; the row that did is F1's listing not-found, discovered in Task 2.
2. **The `/host/payouts/refresh` row leaves the machine.** It is the only assertion in this suite that does. See F4.

## Known Stubs

None.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema surface. The one new outbound request (F4) is the shipped behaviour of a route the audit is measuring, not something this plan introduced.

## User Setup Required

None — no external service configuration required.

## Requirements

**requirements-advanced only.** `RESP-03` stays **Pending** in `REQUIREMENTS.md`. This plan closes AC#1's coverage half (all 27 production page routes measured or named), AC#2 (mechanically), and AC#8's remaining reachable entries. What it does not close: **plan 17-12 owes RESP-03 the four error-boundary surfaces**, and 17-13 owes it the four findings above plus 17-04's three.

**Closure recorded for 17-04, not applied:** the two skip rows in `e2e/mobile-booker-path.spec.ts` that name `overflow-320.spec.ts` as the owner of the status-chip and off-path money-figure entries **are now satisfied** — with one amendment they must carry. The status-chip row says the call sites *"belong in `e2e/overflow-320.spec.ts`'s Phase-13 block … importing this same `expectNoWrap`"*; measured, the chip cannot go through `expectNoWrap` at all, and this file measures it through `expectChipNotClipped` with the readings that rule the helper out. This plan does not own that file, so the amendment is left to the phase's findings pass, per the plan's instruction.

## Next Phase Readiness

- **17-12 inherits a table that will fail if it adds a route and forgets a row.** Its four group-local throw routes are four new `page.tsx` files, so the D-201 assertion will go red by path on all four until `SURFACE_INVENTORY` gains their entries — which is the assertion working, and the four entries are the same edit as the four `coveredBy` names it will also need when it unskips those rows. It should also expect `loading-coverage.test.ts`'s pins to move (29→33), which `MIN_APP_PAGES = 25` deliberately does not duplicate.
- **17-13 has four ledger entries waiting** (F1–F4) with their measurements, causes and remediation classes written, plus 17-04's three and 17-06's visual-baseline row.
- **The visual-baseline comparison run 17-06 recorded is still owed** and is unaffected by this plan (no product source changed).
- No blockers.

## Self-Check: PASSED

- `e2e/overflow-320.spec.ts` — FOUND on disk (3,912 lines)
- `1904bf6`, `9cd797f`, `e275527` — all FOUND in `git log`
- `git status --porcelain src/ drizzle/` — empty
- No probe or scratch spec left in `e2e/` (`ls e2e/ | grep -i probe` → nothing)
- Plan `<verification>` block re-run in full; results in § Verification above

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-30*
