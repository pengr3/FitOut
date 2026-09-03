---
phase: 12-booker-path-search-listing-checkout
plan: 14
subsystem: testing
tags: [playwright, visual-regression, github-actions, postgres, opengraph, satori, leaflet, page-clock]

requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "GATE-01 — the declared baseline inventory, the `visual` Playwright project, `updateSnapshots: none`, the `baselines.yml` dispatch job, and the `og-listing` row left BLOCKED for want of a published listing"
  - phase: 12-booker-path-search-listing-checkout
    provides: "plans 12-01…12-13 — the booker path itself: search grid, relaxation band, listing page, photo lightbox, booking sheet, checkout, hold countdown and the in-place collision notice, plus the `data-testid` hooks all seven new surfaces are addressed by"
provides:
  - "A committed, deterministic, idempotent seed fixture (`scripts/seed-baseline-fixtures.ts`) — the first this project has needed"
  - "A parse-based workflow checker (`scripts/verify-baselines-workflow.mjs`) — 11 invariants, each printing the value it read"
  - "A database inside the one CI job that can write baselines, with the old DB-free invariant preserved in a new form"
  - "26 new declared baselines across 7 product surfaces, plus `og-listing` unblocked — 53 rows total, 52 committable PNGs"
  - "`e2e/helpers/visual-drive.ts` — the per-surface drive both visual specs share: the first frozen clock, the OSM tile stub, and the booking-window slot allocation"
  - "The two D-58 assertions that make the listing OG baseline provably a picture of the seeded card"
affects: [13, 14, 15, gate-vrt, any phase whose exit criteria include GATE-01]

tech-stack:
  added: []
  patterns:
    - "Per-surface DRIVE registry in a helper module, so a baselined surface may be a STATE rather than a URL and both visual specs reach it identically"
    - "Committed seed fixture with FIXED ids for baseline sources (deliberately not the per-run `randomUUID()` shape e2e fixtures use)"
    - "Booking-window slot allocation as a table, because `fullyParallel` turns two drives claiming one window into a REFUSAL rather than a flake"
    - "Deterministic-by-construction captures: frozen clock, pinned `?date=`, locally-fulfilled map tiles"

key-files:
  created:
    - scripts/seed-baseline-fixtures.ts
    - scripts/verify-baselines-workflow.mjs
    - e2e/helpers/visual-drive.ts
  modified:
    - .github/workflows/baselines.yml
    - src/lib/design/visual-baselines.ts
    - e2e/visual/surfaces.spec.ts
    - e2e/visual/theme-swap.spec.ts

key-decisions:
  - "The old DB-free baseline rule is preserved in a NEW form rather than deleted: a baselined surface may read a seeded EPHEMERAL database and must need nothing else; a surface needing a REAL secret has left GATE-01's scope and the fix is the inventory"
  - "D-58's `alt` assertion is re-aimed at `og:title`, because `alt` is a static module export on that route by a decision the route's own header argues — and a substring assertion over a constant is a check that cannot fail"
  - "The 25,844 byte literal is pinned AND compared against the live root card in the same run, so the literal cannot go vacuous in the green direction"
  - "The four state-surfaces' drives live in `e2e/helpers/`, not in a spec, because both visual specs need them and a spec cannot import a spec"
  - "Every Phase-12 listing URL pins `?date=` to the fixture's own day: a wall-clock calendar is a baseline that goes red tomorrow, and the fix people reach for is a widened threshold"
  - "The theme-swap smoke's compared set moved 5 → 12 rather than excluding the new surfaces, because excluding them would be claiming seven surfaces cannot be themed"

patterns-established:
  - "Verify a security-relevant workflow by PARSING it, never by grepping it — the substring check is falsely green for six of six real mutations of `baselines.yml`, including an ADDED `push:` trigger"
  - "A reachability hook must fail on the state ONE STEP BEFORE the one being captured, not merely on a blank page"
  - "Freeze with `pauseAt`, then jump by a MEASURED delta with `fastForward` — `pauseAt(<absolute instant>)` alone does not move a running page's digits (measured 12-03)"

requirements-completed: [BFLOW-01, BFLOW-02, BFLOW-03, BFLOW-06, RESP-02, STATE-03, STATE-07]

duration: 2h 25m (two sessions)
completed: 2026-08-19
---

# Phase 12 Plan 14: Visual Baselines for the Booker Path — Summary

**A committed seed fixture, a database inside the one job that can write baselines, 26 new declared surfaces driven to their actual states behind hooks that reject the state one step earlier, the project's first frozen clock, and the D-58 OG trap closed with two assertions instead of a paragraph — awaiting the human dispatch that is the only thing in the repository able to mint a PNG.**

## Performance

- **Duration:** ~2h 25m across two sessions (Task 1: 2026-08-18 evening; Task 2: 2026-08-19 01:30–03:00 +08:00)
- **Started:** 2026-08-18T16:00:00Z (approx., Task 1 session)
- **Task 2 committed:** 2026-08-18T18:57:35Z
- **Tasks:** 3 of 3 complete. Task 3's blocking human-action checkpoint was discharged 2026-08-19
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- **The first committed fixture this project has needed.** `scripts/seed-baseline-fixtures.ts` — fixed ids, coordinates, rates, photo urls and a fixed collision window, idempotent, secret-free. Verified idempotent by measurement, not assertion: two consecutive runs gave identical `listings=5 photos=21 bookings=2 hours=35 tags=11`.
- **The one job with `contents: write` can now reach a database**, and every property that makes it safe is asserted by a parser rather than by a grep. `scripts/verify-baselines-workflow.mjs` prints the value it read for each of 11 invariants.
- **26 new baseline rows across 7 surfaces, and `og-listing` unblocked** — 27 → 53 rows, blocked 2 → 1, so a complete run commits **52** PNGs and not 25.
- **Four of the seven surfaces are STATES, not URLs**, and are driven to them: the lightbox is opened, the sheet is opened, a real hold is placed through the shipped POST path, and a collision is fired from a conflict inserted between the load and the click.
- **The project's first frozen clock in a baseline.** `freeze.css`'s header named this phase's countdown in advance; the checkout drive re-freezes the hold's deadline to the fixture's own instant and drives the page clock to exactly 14:52 remaining — asserted before any pixel is compared.
- **The D-58 trap is now two assertions and a live comparison** rather than a paragraph in a `blocked` string.

## Task Commits

1. **Task 1: The committed fixture, and a workflow that can reach a database** — `18e13f7` (feat)
2. **Task 2: Eight surfaces, one frozen clock, and the OG trap closed** — `f84d64a` (feat)
3. **Task 3: Dispatch, verify, and walk the path** — ◑ **PART A COMPLETE (2026-08-19), PART B AWAITING THE OPERATOR.** See § Task 3 Part A below for the run ids and measured values. Originally recorded as NOT RUN: `type="checkpoint:human-action" gate="blocking"`. No automation beyond Parts A and B is permitted, and neither part is automatable: the dispatch is the only human-gated write path in the repository, and the seven Part-B walks are the things automation cannot settle. Awaiting the operator.

**Plan metadata:** this file.

_Task 1 was executed inline by the orchestrator (subagent dispatch returned `API Error: 529 Overloaded` six consecutive times) and handed off via `.continue-here.md`. Task 2 was deliberately NOT started in that session: the inventory and the spec must land in one commit, and they did._

## Files Created/Modified

| File | What it does |
|---|---|
| `scripts/seed-baseline-fixtures.ts` (new, Task 1) | The committed fixture the dispatch job seeds. Five published listings, a payout-activated host, a rival booker, 21 photos, 35 operating-hours rows, and a conflict on both units of the exclusive listing. Exports the constants the spec imports rather than re-declares; `main()` sits behind a direct-execution guard so importing it does not seed. |
| `scripts/verify-baselines-workflow.mjs` (new, Task 1) | 11 parse-based invariants over `baselines.yml`, each printing the value it read, exiting non-zero naming the invariant that broke. |
| `.github/workflows/baselines.yml` (Task 1) | A `postgis/postgis:18-3.6` service, `DATABASE_URL` addressed by service LABEL (this job runs IN a container), migrate + seed steps before the visual run, and the header's unreachable-port paragraph rewritten to state the new invariant instead of contradicting itself. |
| `src/lib/design/visual-baselines.ts` (Task 2) | 7 new surfaces with hooks and stated reasons; `og-listing` unblocked with a real URL; 26 new rows; `BaselineCountIsTwentySeven` → `BaselineCountIsFiftyThree`; every statement of the 27/25 arithmetic updated to 53/52. |
| `e2e/helpers/visual-drive.ts` (new, Task 2) | The per-surface drive both visual specs share. Holds the clock freeze, the OSM tile stub, the booking-window slot-allocation table, and the two DB-mutating drives (checkout, collision). |
| `e2e/visual/surfaces.spec.ts` (Task 2) | Drives each row through its surface's drive; installs the clock BEFORE the first navigation; cleanup in a `finally`; the collision rows registered in a `serial` describe; the two D-58 assertions before any pixel comparison; the fixture-id drift guard. |
| `e2e/visual/theme-swap.spec.ts` (Task 2) | Compared set 5 → 12, driven through the same helper with its OWN booking windows, per-surface width (the sheet does not exist above `lg:`). |

## The arithmetic, re-derived

The handoff's numbers were treated as a starting point and re-derived. **They were correct in every particular** — 26 new rows, 27 → 53, blocked 2 → 1, 52 PNGs — and the type-level assertion confirmed 53 independently (it compiles green only at the true length).

```
/ with results               320 / 768 / 1280   both themes   =  6
/ zero-result WITH the band  320 / 1280         both themes   =  4
/listings/[id]               320 / 768 / 1280   both themes   =  6
/listings/[id] lightbox      1280               both themes   =  2
/listings/[id] sheet         375               both themes   =  2
/listings/[id]/book          320 / 1280         both themes   =  4   ← the frozen clock
collision notice             1280               both themes   =  2
                                                              ----
new rows                                                        26
                                                    27 + 26  =  53
blocked                              global-error only       =   1
committable PNGs                              53 - 1        =  52
```

`og-listing` is NOT in the 26: it is the row Phase 11 deferred, unblocked rather than added. Counting it twice is the one arithmetic mistake the table in the module exists to prevent.

## Evidence

### Task 1 (carried forward from the handoff, measured in that session)

- `node scripts/verify-baselines-workflow.mjs` → exit 0. After the edit: `services=["postgres"]`, run commands 6 → 8, still **exactly 1** with `--update-snapshots`, triggers `[workflow_dispatch]`, workflow `permissions.contents=read`, job `permissions.contents=write`, `github.event_name` present in the concurrency group, image tag equal to the installed `@playwright/test` version, zero `secrets.` in any `env`/`run`/`with` VALUE.
- **Watched red (Task 1):** with a `push:` trigger added beside `workflow_dispatch`, the parser exits 1 reporting `triggers=[workflow_dispatch, push]` while **all seven substring tokens remain PRESENT** — the seventh independent reproduction of the header's six-of-six vacuity measurement. Reverted; `git diff --exit-code` byte-identical.
- **Idempotency, measured:** two consecutive runs → identical `listings=5 photos=21 bookings=2 hours=35 tags=11`.
- `vrt_listing_exclusive`: 8 photos, `unit_count: 2`, exclusive, 0.53 km from origin, host payout-activated (so `/listings/[id]/book` is reachable, not a redirect).
- The seeded conflict covers **both units** — the GiST `EXCLUDE` arbitrates per *(listing, unit)*, so a single confirmed row would leave unit 2 free and the window bookable.
- `vrt_listing_far_tennis` is the **only** tennis supply in the catalogue, at **20.03 km** → `within10=false, within25=true`.
- Seeded rows were cleaned back out of the local dev DB.

### Task 2 (measured this session)

**Watched red — the count assertion, recorded verbatim.** Reverted `extends 53` → `extends 27`, nothing else changed:

```
$ npx tsc --noEmit
src/lib/design/visual-baselines.ts(1088,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
EXIT=2
```

Line 1088 is `export type BaselineCountIsFiftyThree = Assert<`. One error, naming the alias's line rather than the row — the same honest weakness the 11-22 OBSERVED RED block records for probes (a) and (b), which is why the arithmetic is spelled out in prose beside it. Restored:

```
$ npx tsc --noEmit
EXIT=0
```

**The local write path does not exist — recorded verbatim as the plan asks:**

```
$ npx playwright test --project=visual
[playwright] project "visual" is NOT collected on win32: baselines are generated and compared ONLY in mcr.microsoft.com/playwright:v1.60.0-noble (D-27/D-29); a non-Linux run would compare against, or be tempted to mint, a platform baseline that can never be committed.
Error: Project(s) "visual" not found. Available projects: "chromium"
    at Object.filterProjects (C:\Users\Admin\Roaming\FitOut\node_modules\playwright\lib\runner\index.js:2084:11)
EXIT=1
```

Two things in that output are the evidence, not one. The warning proves `playwright.config.ts` reached the guard and chose not to construct the project; the error proves there is no project to select. No `updateSnapshots` ternary and no CI condition was added, and none was needed.

**The rest:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` (with `.next/dev/types` cleared first) | exit 0 |
| `npx vitest run --config vitest.design.config.ts tests/design/gitignore-baselines.test.ts` | 1 file, **4 passed** — no `*-win32.png` / `*-darwin.png` is committable |
| `npm run lint` | **0 errors**, 12 warnings — all pre-existing, none in the four touched files |
| `npm run build` (= `lint && test:design && next build`) | **exit 0** — so the whole design suite passed too, including `selector-contract.test.ts` and the D-32 accessible-query floors |
| Post-commit deletion check | no deletions in `f84d64a` |

## Decisions Made

1. **The D-58 `alt` assertion is re-aimed, and this is the deviation that matters most.** See "Deviations" below.
2. **The 25,844 literal is pinned AND backed by a live comparison.** A pinned byte count goes vacuous — silently, in the green direction — the day the `GenericCard`'s rendering changes by a byte. So the root card is fetched in the same run and the listing card must not equal it either. The literal is the record; the live comparison is the durable half.
3. **`?date=` is pinned on every listing URL.** Without it `(detail)/page.tsx` renders `todayLocal`, so the month grid, the highlighted day and the disabled past days change with the wall clock. That is a baseline that goes red tomorrow on a correct tree, and the fix people reach for is a widened threshold, which is a gate quietly reduced.
4. **OSM tiles are stubbed locally rather than blocked.** `listing-map.tsx` fetches real tiles at runtime and they are IN the frame. `route.abort()` leaves browser-dependent broken-image chrome and nothing deterministic to wait for; fulfilling every tile with one flat SVG makes the region offline, instant and identical. Stated cost: these baselines pin the map PANEL, not cartography.
5. **The theme-swap smoke's compared set moved 5 → 12 rather than excluding the new surfaces.** Excluding them would have meant claiming seven surfaces cannot be themed, in a file whose entire argument is that such a claim has to be made in prose. They can be themed.
6. **Booking windows are allocated in a table, in one place.** `fullyParallel: true` means two drives claiming the same hours produce a REFUSAL, and a refused checkout drive photographs the collision surface instead — the wrong baseline, minted green. The checkout pairs are one window per WIDTH, which fits the two-unit budget exactly, so a drive whose cleanup never ran still cannot break its partner.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan premise false] The D-58 `alt` assertion cannot be written as specified, and is re-aimed**

- **Found during:** Task 2, reading `src/app/listings/[id]/opengraph-image.tsx`
- **Issue:** 12-UI-SPEC and the plan both state the falsifiable pair as "the captured listing OG image's byte length is **not** 25,844, and its `alt` export contains the seeded listing's title." **`alt` is a static module export** — `"FitOut — a space, the city it is in, and what it costs by the hour"` — and the route's own header records the decision and both rejected alternatives: `generateImageMetadata` makes Next append an image id, so `/listings/<id>/opengraph-image` stops resolving; hand-writing `openGraph.images` replaces the file convention and with it the automatic `og:image:width`/`height`/`type` tags. Asserting a substring of a constant is a check that cannot fail — precisely the vacuity this phase keeps recording.
- **Fix:** The first half is implemented **verbatim**. The second is re-aimed at the thing that actually carries the seeded title into the unfurl and is **stronger** rather than weaker: `og:title` on `/listings/<id>` is composed from `listingCardFacts(id)` — the *same* cached projection the image route calls, and the same null check that decides `ListingCard` versus `GenericCard`. A non-null `og:title` carrying the seeded title is therefore direct evidence that this deployment's image route took the real-card branch. `og:image` is asserted too, so the page's head provably points at the very route being captured.
- **Files modified:** `e2e/visual/surfaces.spec.ts` (the substitution and its full argument are in the code, not only here)
- **Verification:** `npx tsc --noEmit` exit 0; the assertions run BEFORE `toHaveScreenshot`, which is the ordering the plan requires. They can only be watched failing on a dispatch.
- **Committed in:** `f84d64a`
- **Not silently closed:** making `alt` dynamic would be a Rule 4 architectural change to a shipped route against its own recorded decision, and it is not scoped by this plan.

**2. [Rule 3 — Blocking] `e2e/visual/theme-swap.spec.ts` had to change in the same commit**

- **Found during:** Task 2
- **Issue:** `THEME_SWAP_SURFACES` is DERIVED (documents minus exclusions), so adding seven document surfaces adds them to the D-135 smoke automatically. Its pinned set (`EXPECTED_COMPARED_SURFACES = 5`) would have gone red, and — worse — its per-surface loop does a plain `goto` at a fixed 1280, which would have driven `/listings/[id]/book` to a 404 and captured the page behind a sheet that cannot exist at that width.
- **Fix:** The compared set moved to 12 with its members restated; `capture()` now runs the same shared drive; the width is per-surface (`swapWidthFor`); `cleanup` runs in a `finally` between the two theme passes.
- **Files modified:** `e2e/visual/theme-swap.spec.ts`
- **Verification:** `npx tsc --noEmit` exit 0; `npm run build` exit 0.
- **Committed in:** `f84d64a`

**3. [Rule 2 — Missing critical] A fourth file, `e2e/helpers/visual-drive.ts`, outside the plan's declared set**

- **Found during:** Task 2
- **Issue:** Both visual specs need the same drives, and **a spec cannot import a spec** — the `visual` project's `testMatch` is `e2e/visual/**/*.spec.ts`, so importing one into the other executes its `test()` calls a second time under the importing file's scope (the argument `visual-freeze.ts`'s header already makes). Duplicating ~300 lines of drive logic across two specs would have guaranteed they drift, and a drift between them means one spec baselines a state the other never reaches.
- **Fix:** One helper module in `e2e/helpers/`, which neither project collects — the directory this repository already uses for exactly this (`theme.ts`, `visual-freeze.ts`, `booker-seed.ts`).
- **Files modified:** `e2e/helpers/visual-drive.ts` (created)
- **Verification:** `npx tsc --noEmit` exit 0; `npm run lint` 0 errors.
- **Committed in:** `f84d64a`

**4. [Rule 2 — Missing critical] The committed fixture's own conflict cannot drive the collision surface**

- **Found during:** Task 2, working out the collision drive
- **Issue:** The plan and the handoff both read as though the seeded 09:00–11:00 conflict IS what fires the collision baseline. It cannot be. A collision is a **lost race**: it needs hours that are free when the page loads and taken when the button is pressed. With both units pre-booked those hours render as already taken, the picker refuses the selection, the CTA stays disabled and there is no hold to refuse — the capture would have been a normal listing page filed under the collision's name. (The fixture's both-units property is still exactly right, and it is what the drive copies.)
- **Fix:** The collision drive borrows the fixture's SHAPE (same columns, same `unit`, same cast, **both** units, `confirmed`) over its OWN window, inserted BETWEEN the load and the click — the mechanism `e2e/collision-in-place.spec.ts` already ships. Its rows are `vrt_`-prefixed so a re-dispatch's `reset()` sweeps them, deleted before insert as well as after capture, and registered `serial` because the two themes share one window.
- **Files modified:** `e2e/helpers/visual-drive.ts`, `e2e/visual/surfaces.spec.ts`
- **Verification:** Reasoned from the shipped spec it copies; cannot be executed off Linux. This is the single highest-risk claim in the plan and Task 3's dispatch is what tests it.
- **Committed in:** `f84d64a`

**5. [Rule 2 — Missing critical] The fixture-id drift `tsc` cannot see, closed**

- **Found during:** Task 2
- **Issue:** Every Phase-12 row's `url` embeds `vrt_listing_exclusive` as a string literal, because `visual-baselines.ts` is inside `next build`'s graph and cannot import a `postgres`-importing script. The fixture's own header names the consequence — "renaming one orphans a declared surface, and `tsc` will not catch it" — and an orphaned row does not fail loudly either: `/listings/<renamed>` 404s and its not-found boundary photographs perfectly well.
- **Fix:** A runtime assertion in the inventory describe, against the constants the seed script exports, including a guard against the assertion itself scanning nothing.
- **Files modified:** `e2e/visual/surfaces.spec.ts`, `e2e/helpers/visual-drive.ts` (`FIXTURE_URL_CONTRACT`)
- **Committed in:** `f84d64a`

**6. [Rule 2 — Missing critical] Three determinism holes the plan does not name**

- **Found during:** Task 2
- **Issue:** (a) the listing calendar renders `todayLocal`, so six `listing-detail` baselines would change with the wall clock; (b) `listing-map.tsx` fetches live OpenStreetMap tiles into the frame; (c) the checkout's deadline label is composed server-side from a `now() + 15 minutes` column, so it reads a different time on every dispatch. Any one of them makes a baseline red tomorrow on a correct tree, and a flaky gate is retried until green.
- **Fix:** `?date=` pinned to the fixture's day; every tile request fulfilled locally with one flat SVG; the hold's `expires_at` re-frozen to the fixture's own `VRT_CLOCK_ISO` so the label AND the driven remainder are both fixed and mutually consistent.
- **Files modified:** `e2e/helpers/visual-drive.ts`
- **Committed in:** `f84d64a`

---

**Total deviations:** 6 auto-fixed (1 false plan premise re-aimed with its argument recorded, 5 missing-critical/blocking). **Zero Rule 4 escalations.**
**Impact on plan:** No scope creep. Four of the six exist because a baseline of the wrong state is the exact failure this plan was written to prevent, and the plan's own text did not reach them. The one that changes a stated acceptance criterion (#1) is stated in full above and in the code, rather than quietly satisfied.

## Issues Encountered

- **`.planning/STATE.md` had been REGRESSED in the working tree before this session started** — `current_plan: 14` → `current_plan: 1`, `Plan: 14 of 14` → `Plan: 1 of 14`, stamped "Phase 12 execution started". Thirteen plans in this phase are complete, so that is wrong in the direction that loses work. Repaired as part of this plan's state update, not committed as part of the task commit.
- **`.planning/config.json` carries a pre-existing uncommitted modification.** Left untouched, as instructed.

## Known Stubs

None. Every declared surface has a real URL, a real hook and a real drive.

## Shelf life — the one thing to know before the next dispatch

`scripts/seed-baseline-fixtures.ts` chose FIXED dates over relative ones deliberately: a relative date shows up as a pixel diff on every dispatch and trains people to re-mint the reference instead of reading the diff. The cost is that **once real time passes 2026-09-16 the fixture's day is in the past**, `openOnSearchedDay` goes false, no selection is seeded, and seven surfaces stop being reachable.

**The failure is LOUD** — `expectSelectionSeeded` names it in one sentence and points at the fixture's constants — which is why the trade was taken; a relative date would have been silently wrong instead. When it fires, the fix is the fixture's constants plus a re-dispatch. Never a widened threshold, never a skip.

## Standing reds — NOT introduced by this plan

1. **`notFound()` on `/listings/[id]` answers HTTP 200.** Plan 12-08 proved with the `npm run build && npm start` discriminator that this survives a production build, so it is a real rendering-strategy defect and not a dev artefact. The body IS correctly the not-found boundary, so it is a status-code issue and not a content leak. Awaiting a Rule 4 decision.
2. **Cross-file DB-contention flakes.** Clear after `docker restart fitout-db-1`; the targeted trio is 28 passed, matching 12-06 through 12-12 exactly.
3. **Three stale `dev-theme-*` baselines** from 12-01's gutter change. They need the same CI dispatch as Task 3 and will be regenerated by it.

## User Setup Required

None — no external service configuration. The dispatch job holds no credential; its one environment input is a service container's own fixed pair.

## Next Phase Readiness

**Everything up to the point where a human must press a button is done. The plan is NOT complete.**

The new rows are RED in CI until Task 3's dispatch runs, **and that is the correct intermediate state**: under `updateSnapshots: "none"` a missing baseline writes zero files and stays red across every retry, instead of minting itself green on the second press of the button.

Two things must not be confused when Task 3 is run:

- **Writing is not comparing.** A `GITHUB_TOKEN` push triggers no workflow run, so the generation run has never compared against the files it wrote. **The deliverable is the id of the FOLLOW-UP comparison run**, not of the generation run. Without it, D-27 produces baselines nobody has ever seen pass — strictly worse than having none, because the gate now looks armed.
- **The collision drive is the highest-risk claim in this plan** and cannot be executed on any machine here. If the first dispatch fails, look there first, and read `e2e/helpers/visual-drive.ts`'s slot-allocation table before assuming a product defect.

---
*Phase: 12-booker-path-search-listing-checkout*
## Task 3 Part A — dispatch, verified (2026-08-19)

Part A is discharged in full. Part B, the seven manual walks, remains with the operator.

| Step | Result |
|------|--------|
| **A1** dispatch | `baselines` run **32240742591**, `workflow_dispatch` against `dev` @ `4bce622` — **success**. Committed `f2f08f3`, pushed to `refs/heads/dev` by the job. |
| **A2** only Linux baselines | **PASS.** 30 files, every one `*-visual-linux.png`. `added=27 modified=3 deleted=0` — the 27 new references plus the three stale `dev-theme-*` regenerated. Nothing rode along. |
| **A3** both-theme byte divergence (D-135) | **PASS.** 23 of 23 two-theme surfaces differ byte-wise. 6 court-only, all expected: `dev-theme-{320,768,1280}` (both panes in one shot), `og-root-1200`, `og-invite-1200`, `og-listing-1200`. |
| **A4** ⭐ **comparison run** | **`32242065058` — GREEN.** All four jobs pass, `gate-visual` included. This is the deliverable, not A1's id. |

**Totals measured after the mint:** 52 baseline PNGs tracked — exactly 53 declared rows minus the one
blocked surface (`global-error`). 23 two-theme pairs, 6 court-only.

**Why A4 is the deliverable and A1 is not.** The dispatch job pushes with `GITHUB_TOKEN`, and a
`GITHUB_TOKEN` push fires no workflow run — so at the end of A1 nothing had ever compared against the
52 new references. `ci.yml` carries no `workflow_dispatch` trigger (only `push` and `pull_request`), so
the comparison could not be raised from the Actions UI either; re-running the previous `ci` run would
have re-run it at `4bce622`, before the baselines existed. An empty commit (`880aa57`) was the only
route to a real comparison. Until that run went green the gate merely looked armed.

**What A4 green does and does not prove.** It proves the 52 references are stable and that the machine
that compares is the machine that shot (D-27). It does NOT prove the pixels are correct — that a
countdown really reads a frozen 14:52, that the collision notice actually fired, that the OG card shows
the seeded listing rather than the generic one. Part B item 6 is the only thing that settles that, and
it is outstanding.

**Two prerequisites that had to land first, discovered by this dispatch attempt and fixed before it:**
plan **12-15** (the comparison job could not reach a database — `ECONNREFUSED 127.0.0.1:59999`), and
commit `cfcb658` (the checkout clock's int32-truncated `fastForward` jump, and `collisionDrive` never
signing a booker in). CI run 32216145319 is where the first surfaced; 32228371235 the second.

## Task 3 Part B — the seven walks

Operator verdicts, recorded verbatim as given on 2026-08-19. Six of seven settled; item 6 open.

| # | Walk | Verdict |
|---|------|---------|
| 1 | One product, or a seam? (phone + desktop) | **okay** — reads as one designed product |
| 2 | Reduced motion: any perceptible month-change transition? | **okay** — no perceptible motion |
| 3 | Collision announcement: notice before grid (3a), focus not double-read (3b) | **okay** — both |
| 4 | Lightbox: 44px reachable one-handed (4a), controls page (4b), absent swipe reads as designed (4c) | **okay** — all three |
| 5 | At-rest PayMongo line matches where you land | **okay** — matches |
| 6 | Are the new pixels right? | **okay** — after a fixture fix and a second mint; see below |
| 7 | Collision reads as normal outcome, not failure | **okay** — normal outcome |

Item 2 and item 4 were pre-checked in code before the walk and the walk confirmed both:
`src/app/globals.css:544` zeroes `animation-duration`, `transition-duration`,
`animation-iteration-count` and `scroll-behavior` under `prefers-reduced-motion` across `*`,
`*::before` and `*::after`; `size="touch"` resolves to `h-11` = 44px on four lightbox controls.

Item 5's destination claim was additionally confirmed in code: `src/app/actions/booking.ts:1021`
does `redirect(checkout.checkoutUrl)` to PayMongo's hosted checkout, which is what the at-rest line
on the checkout surface promises.

### Item 6 — what was verified, and the one open question

Four of the five surface-specific claims were verified by inspecting the minted PNGs directly:

| Surface | Claim | Result |
|---------|-------|--------|
| `checkout` | countdown reads exactly 14:52 | ✅ confirmed |
| `og-listing` | seeded card, not the generic root card | ✅ **D-58 trap closed** — "Poblacion Boxing Room · Martial arts / boxing gym · Makati · ₱472.50/hr" |
| `listing-lightbox` | lightbox OPEN | ✅ scrim, `1 / 8` counter, prev/next/close chrome |
| `collision-notice` | notice present and in-place (D-55) | ✅ and the copy keeps its promise — it says the closest free windows are outlined, and 11:00 AM / 1:00 PM visibly are |

`listing-sheet`, `search-results` and `search-relax-band` were not individually inspected.

**RESOLVED (2026-08-19) — every photo in every baseline was a broken image.**
`scripts/seed-baseline-fixtures.ts:197` seeds `https://example.invalid/vrt-${i}.jpg`. `.invalid` is an
RFC 2606 reserved TLD, guaranteed never to resolve, so a photo can never load. The baselines therefore
encode broken-image placeholders wherever a photo belongs: all eight `listing-detail` mosaic tiles, the
`listing-lightbox`'s entire subject, the `checkout` thumbnail, and the `search-results` cards.

This may well be deliberate — a real remote URL would make the reference depend on an external host,
and determinism is the whole point of a committed fixture. Geometry, aspect ratios and the
"Show all 8 photos" control are all still exercised.

But the consequence has the same shape as D-58: **the gate now defends broken images.** If anyone later
makes photos render, the visual gate goes red and reads as a regression rather than as an improvement.
The available fix is a committed local placeholder asset served from `public/`, which is deterministic
*and* representative. Awaiting an operator decision.

### How item 6 was resolved — the fixture fix and the second mint

Operator verdict on the broken-photo finding was **fix**, executed as quick task
`260819-vrt-local-photo-placeholders` (`cb34581`, `1bd6678`).

`scripts/seed-baseline-fixtures.ts` now seeds `/vrt/photo-${i}.svg` against eight committed assets in
`public/vrt/`. They are pure geometry with no text, so glyph rasterisation never enters a byte
comparison, and every colour is a literal rather than a token, so a placeholder cannot silently start
tracking a design token that later moves. The index is encoded three ways — hue, sun position and
counter pips — because eight identical placeholders would make the lightbox's 1/8 → 8/8 paging
invisible in the baseline and would hide a wrong-photo bug behind a green diff.

A `VRT_PHOTO_ASSETS = 8` guard now refuses a listing declaring more photos than there are assets.
Without it a future `photos: 9` would be handed a 404 and would silently re-mint the exact defect
just removed, with every automated signal still green.

**One measurement worth keeping.** The first draft placed the index encodings at x≈96 and x≈260. Both
would have been cropped away in every mosaic tile: `object-cover` keeps the centre, and the tightest
band any consumer leaves visible is x ∈ [400, 1200]. This was found by rendering the four real crops
side by side rather than by reasoning about the CSS, and both encodings were moved mid-frame. Had it
not been caught, all eight placeholders would have been indistinguishable in the mosaic — the precise
failure the distinctness exists to prevent.

**Second dispatch cycle, after the fix:**

| Step | Result |
|------|--------|
| Predicted red | `ci` **32259490587** failed on `1bd6678` exactly as forecast — the 24 photo-bearing references had been minted against broken images |
| Re-mint | `baselines` run **32269238524** → commit `4078bc0` |
| A2 | **24 modified, 0 added, 0 deleted.** The inventory did not shift; only pixels inside existing references moved |
| A3 | 23 of 23 two-theme pairs still differ byte-wise |
| **A4 comparison** | **32271124959 — GREEN**, all four jobs |

Totals unchanged at 52 PNGs / 23 pairs / 6 court-only. The `listing-lightbox` baseline, previously a
picture of the browser's broken-image glyph, now shows a rendered placeholder with its index pip
visible mid-frame — confirming the crop correction held.

**Final run ids for this plan: re-mint 32269238524, comparison 32271124959.** The earlier pair
(32240742591 / 32242065058) is superseded and recorded above for history.

### Two secondary observations, recorded not resolved

1. **The calendar and the slot panel disagree about the month.** On both `listing-detail` and
   `collision-notice` the calendar reads **August 2026** (19 highlighted) while the slot panel is headed
   **Wednesday, Sep 16**. Possibly a consequence of the drive seeding a selection without navigating the
   calendar, but it is in the committed pixels.
2. **The sticky header renders mid-page** in the full-page captures, visible partway down
   `collision-notice`. Almost certainly the known `position: sticky` full-page-screenshot artifact, which
   Phase 11's baselines would share.

---

*Completed: Tasks 1–2 on 2026-08-19. Task 3 Part A verified 2026-08-19 (comparison run 32242065058). Task 3 complete 2026-08-19: Part A verified across two dispatch cycles (final comparison run 32271124959), all seven Part B walks verified by the operator.*

## Self-Check: PASSED

Files claimed, verified present on disk: `scripts/seed-baseline-fixtures.ts`,
`scripts/verify-baselines-workflow.mjs`, `e2e/helpers/visual-drive.ts`,
`.planning/phases/12-booker-path-search-listing-checkout/12-14-SUMMARY.md`.

Commits claimed, verified in `git log`: `18e13f7` (Task 1), `f84d64a` (Task 2),
`e7662c7` (this summary), `a2c6d10` (STATE + ROADMAP).

Working tree clean apart from the pre-existing `.planning/config.json` modification,
which was left untouched as instructed.
