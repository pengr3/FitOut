---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 12
subsystem: testing
tags: [playwright, e2e, responsive, resp-03, error-boundaries, route-groups, d-201, next-app-router]

# Dependency graph
requires:
  - phase: 17-11
    provides: "the D-201 `SURFACE_INVENTORY` assertion that fails BY PATH on any new `src/app/**` surface — which is exactly what four new routes triggered, and extending it was the work"
  - phase: 11-18
    provides: "`src/app/dev/throw/page.tsx` — the original throw route, its production guard, and the `SENTINEL_LEAK_PROBE` export these four import"
provides:
  - "Four group-local dev throw routes — `(app)/dev-throw-app`, `(host)/host/dev-throw`, `(auth)/dev-throw-auth`, `(legal)/dev-throw-legal` — each reaching its OWN group's error boundary"
  - "All FIVE error boundaries measured at 320px in both themes; the four `[11-21]` named skips are closed"
  - "The corrected fix shape recorded in the tree: `src/app/dev/throw-in/[group]/` would have reached the ROOT boundary and closed nothing"
  - "`loading-coverage.test.ts` at 33 / 21 / 12 with the decision naming all four paths, and a pinned-counts test title now DERIVED from the constants"
  - "`legal-copy.test.ts`'s `LEGAL_NON_PROSE` — the group's first declared non-prose exclusion, asserted in both directions and against an 80-character reason floor"
  - "A measured soft-404 finding: `/host/dev-throw` answers 200 in production because `(host)/host/loading.tsx` flushes the shell before the guard's `notFound()`"
affects: [17-13, 17-14, e2e-harness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Which boundary catches a throw is a property of the throwing FILE'S PATH — not of its URL, not of a dynamic segment, not of anything decidable at request time"
    - "A `tell` for a boundary row names the ROUTE OUT, because every boundary in this app renders the same title and body and the panel hook proves only that A boundary rendered"
    - "An exclusion is a ROW WITH A REASON in whatever gate the new file trips, never a narrowed walk and never a fabricated row in the checked inventory"
    - "A production-guard claim is settled by an `npm start` probe, and the probe is worth running because it can disagree with the source"

key-files:
  created:
    - src/app/(app)/dev-throw-app/page.tsx
    - src/app/(host)/host/dev-throw/page.tsx
    - src/app/(auth)/dev-throw-auth/page.tsx
    - src/app/(legal)/dev-throw-legal/page.tsx
  modified:
    - tests/design/loading-coverage.test.ts
    - tests/design/legal-copy.test.ts
    - e2e/overflow-320.spec.ts

key-decisions:
  - "FOUR files, not one `src/app/dev/throw-in/[group]/page.tsx` — the UI-SPEC's suggested shape sits under NO route group, so every value of `[group]` reaches the ROOT boundary and closes nothing; the correction is recorded in the tree at the four rows and in each route file"
  - "Every row's `tell` is the boundary's own ROUTE OUT, not `[data-testid=\"error-state\"]` — all five boundaries render the same `ErrorState` title and body, so the panel hook proves that A boundary rendered and not WHICH one"
  - "`EXPECTED_QUALIFYING` stays 21 and that IS the decision: all four default exports are sync and throw immediately, so a `loading.tsx` beside any of them could never render"
  - "The `(host)` row drives the shipped signup form with the host intent rather than `seedHostSurfaces` — a `RouteRow` resolver has nowhere to close a `postgres()` client or delete five rows no cascade reaches"
  - "`/host/dev-throw`'s production SOFT 404 is RECORDED, not repaired: the cause is `(host)/host/loading.tsx`, and deleting a shipped STATE-01 fallback to fix a status line is a product change made from inside an audit"
  - "The four routes are `coveredBy` in `SURFACE_INVENTORY`, not `excluded` — unlike `/dev/throw`, the vehicle and the subject coincide here, so there is no unmeasured 320px behaviour for an exclusion to be about"
  - "RESP-03 is LEFT PENDING even though 17-11 named these four surfaces as its only outstanding debt — see § Requirements"

patterns-established:
  - "Pattern: when a new source file trips an unrelated inventory gate, extend the inventory with a declared exclusion carrying its argument — never narrow the walk, never invent a row in the checked list"
  - "Pattern: a gate's own test TITLE is a claim, and a stale one is worse than a stale comment because it is what a reader trusts without checking — derive it from the constants"
  - "Pattern: probe the production guard with a session where a gate would otherwise answer first, or the reading proves nothing about the file under test"

requirements-completed: []  # RESP-03 stays Pending — requirements-advanced; see § Requirements

# Metrics
duration: 43 min
completed: 2026-08-30
---

# Phase 17 Plan 12: The Four Group-Local Throw Routes and the Closed [11-21] Skips Summary

**All five error boundaries are now measured at 320px in both themes, reached by four new throw routes placed one per route group — because which boundary catches a throw is a property of the throwing file's path, which is why the UI-SPEC's one-parameterised-route fix would have reached the root boundary and closed nothing.**

## Performance

- **Duration:** 43 min
- **Started:** 2026-08-29T17:12Z (2026-08-30 01:12 +08)
- **Completed:** 2026-08-29T17:55Z (2026-08-30 01:55 +08)
- **Tasks:** 3
- **Files:** 4 created, 3 modified

## Task Commits

1. **Task 1: four group-local throw routes behind the production guard** — `b0f0df2` (feat)
2. **Task 2: move `loading-coverage`'s pins, with the decision recorded** — `6251c40` (test)
3. **Task 3: unskip the four `[11-21]` rows and measure them at 320px** — `26266ab` (test)

**Plan metadata:** this commit (docs)

## Accomplishments

- **The four `[11-21]` skips are closed and the AC#29 table has ONE unreachable row left** — 17-11's listing not-found, which is escalate-class and 17-13's. Suite **92 → 100 passed / 9 skipped**; of the 9, two are that row and seven are the pre-existing PayMongo payment-state cases D-35 forbids this suite from minting.
- **Four routes, one per group, with distinct URL segments** — `(app)` and `(auth)` both sit at the root URL namespace, so two pages named `dev-throw` would be parallel pages resolving to one path and Next would fail the build. The segments are `/dev-throw-app`, `/host/dev-throw`, `/dev-throw-auth`, `/dev-throw-legal`.
- **Each imports the sentinel rather than retyping it.** `grep -r 'export const SENTINEL_LEAK_PROBE' src/app/` returns exactly **1**, and each of the four contains one `import { SENTINEL_LEAK_PROBE }`. `e2e/error-leak.spec.ts` asserts a string appears ZERO times, so a typo on either side would make that assertion pass against a leaking page.
- **The production guard is build-time and has exactly one `process.env` line per file** — no env flag, no config value, no operator-settable path.
- **`npm run build` exit 0** — lint 0 errors (25 pre-existing warnings), design suite **66 files / 1248 passed / 3 skipped**, `next build` compiled, 33 `page.tsx` on disk.
- **`git status --porcelain drizzle/` is empty** (GATE-06, AC#32). Zero schema migrations proposed or absorbed.

## Measurements

### The boundary each route reaches — driven, not inferred (30 Aug 2026, 320px, dev)

| route | session | `error-state` | route out rendered | root's `Back to search` | sentinel in `innerText` |
|---|---|---|---|---|---|
| `/dev-throw-auth` | none | 1 | **Back to log in** | absent | 0 |
| `/dev-throw-legal` | none | 1 | **Back to FitOut** | absent | 0 |
| `/dev-throw-app` | booker | 1 | **Your bookings** | absent | 0 |
| `/host/dev-throw` | host | 1 | **Host dashboard** | absent | 0 |
| `/dev-throw-app` | *anonymous* | 0 | — (landed on `/login`) | — | 0 |
| `/host/dev-throw` | *anonymous* | 0 | — (landed on `/login`) | — | 0 |

The two anonymous rows are the session gates answering first, which is why the two gated rows resolve their path through a signup rather than a literal string.

### The production probe — `npx next build && npx next start -p 3100`

| path | anonymous | with the session its group demands |
|---|---|---|
| `/dev-throw-app` | 307 → `/login` | **404** |
| `/host/dev-throw` | 307 → `/login` | **200 — a SOFT 404** (see Findings F1) |
| `/dev-throw-auth` | **404** | n/a (gates nothing) |
| `/dev-throw-legal` | **404** | n/a (gates nothing) |
| `/dev/throw` (control) | **404** | — |
| `/dev/theme` (control) | **404** | — |

Confirmed twice for the surprising one: through Chromium and through a bare `curl` carrying the session cookie. The served bytes for `/host/dev-throw` contain `SENTINEL_LEAK_PROBE` **0 times**, zero `error-state` elements, and the copy `We couldn't find that page` — the throw never happens and the guard pruned it. **T-17-61's claim is reachability, and reachability holds on all four.**

### The build's route table

`/dev-throw-auth` and `/dev-throw-legal` are `○ Static` (prerendered as the 404); `/dev-throw-app` and `/host/dev-throw` are `ƒ Dynamic` because their layouts read the session. `/terms` and `/privacy` stayed `○ Static`, so the `(legal)` group's `T-11-STATICLEAK` property is intact.

### `loading-coverage.test.ts`, re-measured

| constant | was | is | why |
|---|---|---|---|
| `EXPECTED_PAGES` | 29 | **33** | four new `page.tsx` |
| `EXPECTED_QUALIFYING` | 21 | **21** | all four default exports are sync and throw immediately |
| `EXPECTED_NON_QUALIFYING` | 8 | **12** | the same four, on the side the decision puts them |

The classifier agreed with the decision on all four without adjustment — the pin test passed on the first run after the constants moved.

## Watched Reds

Three mechanisms were watched failing before they were trusted, and every mutation was reverted.

1. **The `tell` really does discriminate the boundary.** The `(legal)` row pointed at `/dev/throw` — i.e. driving the ROOT boundary while claiming the `(legal)` one, which is precisely 17-RESEARCH Pitfall 6's warning sign. **2 failed**, verbatim: *"the route rendered no `[data-testid="error-state"]:has-text("Back to FitOut")`, so it is not the surface this row names."* Reverted → 10 passed.
2. **The D-201 inventory fails BY PATH**, exactly as 17-11 predicted it would. `SURFACE_INVENTORY`'s `/dev-throw-app` entry removed: *"1 surface(s) exist in `src/app` and appear NOWHERE in this file's route tables and nowhere in its declared exclusions: `/dev-throw-app`"*, followed by the full `THE REMEDY IS TO ADD A ROW … AND NEVER TO NARROW THE ENUMERATION` paragraph. Reverted → 8 passed.
3. **The new `LEGAL_NON_PROSE` mechanism, three ways.** (a) list emptied → *"a page under `src/app/(legal)/` has no row in LEGAL_PAGES"* plus the chunk-floor clause at 5 against 10; (b) the row's `file` pointed at a path that does not exist → *"LEGAL_NON_PROSE names a file the walk never found. An exclusion that outlives its file is a standing licence for the next page to take that path"*; (c) a `why` of `"n/a"` → *"1 exclusion reason(s) are shorter than 80 characters."* All reverted → 22 passed.

## Findings (escalate-class — recorded, NOT fixed; for plan 17-13's ledger)

**F1 — `/host/dev-throw` answers a SOFT 404 in production while the other three answer a hard one, and the cause is `src/app/(host)/host/loading.tsx`.** Measured 30 August 2026 against `npx next start`, twice (Chromium and `curl` with the session cookie): status **200**, final URL unchanged, and the document is the ROOT not-found. A `loading.tsx` at the `host` segment wraps every descendant in a Suspense boundary ABOVE the page, so the shell flushes — and the 200 commits — before the page body runs and calls `notFound()`. That is the same mechanism `listings/[id]/(detail)/layout.tsx` records for the listing route (and which 17-11's F1 traced to the root boundary winning a `notFound()` raised in a layout), arriving on a different segment. `(app)`, `(auth)` and `(legal)` have no group-level `loading.tsx`, which is the whole of why their three probes read 404. **Nothing about the security control is affected** — the guard fires, the throw never happens, `SENTINEL_LEAK_PROBE` appears 0 times in the served bytes and no boundary renders — so this is a status-line finding, not a reachability one. **Not fixed** because the only repair is to delete or relocate a shipped STATE-01 fallback that has nothing to do with this plan, which is a product change made from inside an audit. Cheapest correct fix if it is ever wanted: nothing, unless a caller depends on the status of a route that 404s in production anyway. Recorded in `(host)/host/dev-throw/page.tsx`'s own header with the eight readings.

**F2 — the AC#29 block calls no target-size or focus assertion on any row, and this plan's own text assumed it did.** 17-12's Task 3 instructs measuring the new rows "through the block's existing chain unchanged: `seedTheme` … `expectReachable`, `expectNoOverflow`, `expectTargets` at `TARGET_FLOOR_PX`". Measured: the AC#29 loop runs `seedTheme` → viewport → `goto` → `document.fonts.ready` → optional `open` → `expectReachable` → `expectNoOverflow` → optional `expectNoOverflowWithin`, and **calls `expectTargets` on no row at all** — that helper is called only from the AC#30 and AC#36 blocks. The instruction was followed literally (*"unchanged"*) rather than by adding a call the other twenty-one rows in the same table do not make, which would have made this table's guarantee inconsistent across its own rows. **The consequence, stated plainly:** the four boundary surfaces are proved not to scroll sideways at 320px, and they are NOT proved to clear the 24px target floor or to paint a visible focus ring. Each renders two controls (the retry button and the route out), both `min-h-11`, and `e2e/error-leak.spec.ts` asserts both are keyboard-reachable on the root boundary. Cheapest correct fix: add `expectTargets`/`expectVisibleFocus` to the AC#29 loop for the whole table and read the diff — an instrument change across 42 cases, which is 17-13's size of change, not this plan's. Owner: **17-13**.

## Decisions Made

1. **Four files rather than one parameterised route.** The UI-SPEC's `[11-21]` row proposes `src/app/dev/throw-in/[group]/page.tsx`. That path sits under no route group, so every value of `[group]` is caught by `src/app/error.tsx` — the root boundary, which the table already covers. It would have produced four rows reporting success while measuring the same document four more times, which is strictly worse than four honest skips. The correction is written into the four rows AND into `(app)/dev-throw-app/page.tsx`'s header, because it is the kind of thing a future reader re-proposes.
2. **The `tell` is the route out, not the panel hook.** `tests/design/error-boundaries.test.ts` pins the same title and body across all five boundaries, so `[data-testid="error-state"]` proves "a boundary rendered" and not "THIS boundary rendered". The route out is the one thing the five compose differently, so it is the discriminator — Pitfall 6's warning sign made mechanical, and watched red.
3. **`coveredBy`, not `excluded`, in `SURFACE_INVENTORY`.** `/dev/throw` is excluded as a SUBJECT while being load-bearing as a MECHANISM, because its own document is the root boundary and a different row measures that. For these four the vehicle and the subject coincide: the only document any of them can produce IS its group's boundary inside that group's real layout stack, which is what the four rows measure. An exclusion would have been a false account.
4. **The four skip strings are quoted in full rather than deleted.** Every sentence in them is still true; what changed is that this plan paid the price they named. Deleting them would remove the reason four boundaries went unmeasured for two phases.
5. **The pinned-counts test title is derived from the constants.** It read `28 pages, 20 qualifying, 8 not, 20 loading files` against constants that said 29 / 21 / 8 — a stale claim in a gate's own NAME, which is the one place a reader trusts without checking, and the same defect class this phase exists to repair.
6. **The `(host)` row signs up rather than seeding.** See Deviation 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tests/design/legal-copy.test.ts` went red by path on the new `(legal)` page**

- **Found during:** Task 2, on `npm run test:design` — 2 failed / 1245 passed.
- **Issue:** That gate walks `src/app/(legal)/**` and requires every `page.tsx` it finds to have a row in `LEGAL_PAGES`, plus more than 10 readable text chunks. `dev-throw-legal` is the group's first page with no copy at all: it renders no document, so it has no headline, no placeholder notice and 5 chunks (four import specifiers and a metadata title). **That red is the gate working** — a new page under `(legal)` is exactly what it watches for.
- **Fix:** A declared `LEGAL_NON_PROSE` exclusion carrying a paragraph reason. Both obvious remedies were refused and the refusal is written into the file's header: narrowing the walk defeats the clause permanently for every future page, and a `LEGAL_PAGES` row would make the gate assert a sentinel sentence, a notice hook and a `PanelCard` against a page that renders none of them — i.e. invent the copy it is meant to be checking. The excluded page stays inside the walk, inside the banned-term scan, and inside a smaller **declared** chunk floor (`> 0` rather than `> 10`) so a parser that read nothing is still a named failure. The exclusion is asserted in both directions and against an 80-character reason floor, the `overflow-320.spec.ts` D-201 idiom.
- **Verification:** watched red three ways (see § Watched Reds 3); `npm run build` exit 0 afterwards.
- **Commit:** `6251c40`

**2. [Rule 1 - Instrument correctness] The `(host)` row cannot use `seedHostSurfaces`, and the plan says it should**

- **Found during:** Task 3, reading the fixture before wiring it.
- **Issue:** The plan's Task 3 says *"Give the `(host)` row the host fixture (`seedHostSurfaces`)"*. Measured: that function returns a fixture containing an **open `postgres()` client** plus a seeded host, listing, booker, booking, notification and payout-ledger row, and the AC#36 block that owns it closes all of it in a `describe`-scoped `afterAll` with five explicit `DELETE`s and an `sql.end()`. A `RouteRow` resolver is handed nothing but a `Page` and has nowhere to put teardown, so calling it from the AC#29 table would leak one connection and one whole fixture into the dev database per theme, per run — and three of those rows are ones no cascade reaches, by that block's own teardown comment.
- **Fix:** `signUpAndReachHostThrow`, which drives the shipped signup form with the host intent. That is what the row actually needs — the capability, not a catalogue — and it is the shape this table declares for itself (*"NO SEED AND NO DATABASE FIXTURE … no `postgres()` client, no seeded rows"*). The capability flag is `input: false`, so the signup intent is the only honest way a browser obtains it. `signUpAndReachProfile`'s body was extracted verbatim into `signUpThroughTheForm(page, intent)` with the one radio and the one submit pattern parameterised; its paragraphs stayed attached to the `/profile` resolver, which is where a reader arrives from.
- **Verification:** both `(host)` cases green; `/host/dev-throw` renders `Host dashboard`, which only that boundary composes.
- **Commit:** `26266ab`

**3. [Rule 1 - Bug] The plan's stated measurement chain names a helper the AC#29 block does not call**

- **Found during:** Task 3.
- **Issue:** See § Findings F2. The plan says to run these rows through `expectTargets at TARGET_FLOOR_PX`; the block calls it on no row.
- **Fix:** The instruction's own word — *"unchanged"* — was followed. Adding the call to four rows and not the other twenty-one would make one table's guarantee inconsistent within itself, and adding it to all twenty-five is an instrument change across 42 cases.
- **Verification:** the chain each new row runs is byte-identical to the chain `/terms`, `/login` and the root boundary row run.
- **Commit:** `26266ab`

**4. [Rule 1 - Bug] A stale claim in `loading-coverage.test.ts`'s own test title**

- **Found during:** Task 2.
- **Issue:** `it("pins the counts: 28 pages, 20 qualifying, 8 not, 20 loading files")` against constants reading 29 / 21 / 8. Three of the four numbers were already wrong before this plan touched anything.
- **Fix:** The title is now interpolated from the three constants, so there is one place the numbers live.
- **Commit:** `6251c40`

**Total deviations:** 4 auto-fixed (1 blocking-gate extension, 3 instrument corrections). **Impact:** one gate gained a mechanism it did not have (declared non-prose exclusions), one plan instruction was corrected by measurement, one pre-existing false claim was repaired, and one blind spot was recorded rather than silently papered over.

## Requirements

**`requirements-advanced`. RESP-03 is left Pending.**

17-11's summary hands this plan RESP-03's only named debt — *"RESP-03 stays Pending — 17-12 still owes it the four error-boundary surfaces"* — and that debt is discharged: all four are measured at 320px in both themes, each proved to reach its own boundary by copy the root boundary does not render.

It is **not** marked Complete, and the reason is that RESP-03's text is broader than the debt: *"Every surface is verified from 320px up, **with the sticky bar present**, and no price, countdown or label wraps or overflows."* Standing against it right now:

- **17-04 recorded two escalate-class occlusion findings on shipped markup**, surfaced by the sticky-bar clause that is RESP-03's own clause B. Neither is resolved.
- **17-13, the batched findings ledger (D-199/D-200) with "blocked-row currency (AC#29)" in its own scope, has not run.**
- Nine cases in the AC#29/AC#30 sweep remain named skips: 17-11's unreachable listing not-found (2) and the seven PayMongo payment-state cases D-35 forbids this suite from minting, covered instead by `tests/booking/payment-states.test.tsx`.

Checking that box now would be recording a verification over known open findings, which is the defect class this phase exists to repair. Whoever closes it has the exact remaining list above.

**GATE-02** is untouched by this plan — no focus or keyboard assertion was added — and stays Pending.

## Verification

| check | result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — 0 errors, 25 pre-existing warnings |
| `npm run test:design` (via `npm run build`) | 66 files / **1248 passed** / 3 skipped |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1` | **100 passed / 9 skipped** (was 92 / 17) |
| `npx playwright test e2e/error-leak.spec.ts --project=chromium --workers=1` | 3 passed |
| `npm run build` | exit 0 |
| `npx next build && npx next start -p 3100` + 4 path probe | 404 / 404 / 404 / soft-404 — see § Measurements |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32) |
| `grep -r 'export const SENTINEL_LEAK_PROBE' src/app/` | 1 |
| `grep -c 'process.env'` per new route file | 1, 1, 1, 1 |

## Known Stubs

None. The four new files are complete routes; each is a guard plus a throw, which is the whole of what a throw affordance is.

## Threat Flags

None beyond the plan's own `<threat_model>`. T-17-61 is mitigated and **probed**; the one deviation from the expected reading is F1's soft 404, which is a status line rather than a reachability change and is recorded in the route file it belongs to.

## Next

Ready for **17-13** — the batched findings ledger. It inherits two new findings from this plan (F1 the soft 404, F2 the AC#29 block's absent target-size and focus clauses) on top of 17-11's four, and it owns the decision on RESP-03's remaining named skips.

## Self-Check: PASSED

- All four created files present on disk (`[ -f ]` verified).
- All three task commits present in `git log --oneline --all`: `b0f0df2`, `6251c40`, `26266ab`.
- Every acceptance criterion re-run at close-out; all pass except the two corrected by measurement and recorded above (Task 1's uniform-404 criterion → F1's soft 404 on one of four; Task 3's `seedHostSurfaces` and `expectTargets` clauses → Deviations 2 and 3).
- Plan-level `<verification>` block re-run in full; results in the table above.
