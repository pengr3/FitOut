---
phase: 12-booker-path-search-listing-checkout
plan: 13
subsystem: booking
tags: [state-07, d-55, collision-in-place, same-paint, gate-03, aria-live, exclusion-constraint, playwright]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 02
    provides: "Seam A — the day, its availability and its loading/error flags hoisted out of `useState(initialDay)`, plus `refreshDay()` which returns its promise and deliberately does NOT clear the selection. This plan is the reason Seam A exists; `router.refresh()` provably cannot do this job, and watched red R1 measured that claim rather than repeating it."
  - phase: 12-booker-path-search-listing-checkout
    plan: 06
    provides: "GATE-03's compile-pinned declared set (BOOKER_PATH_LIVE_REGION_FILES, LIVE_REGIONS, DeclaredFileCountIs*) — widened by one here, in one commit, in three places"
  - phase: 12-booker-path-search-listing-checkout
    plan: 09
    provides: "The calendar's four measured overrides and SLOT_CHIP_BOX — the struck-through lost hours render in that grid"
  - phase: 12-booker-path-search-listing-checkout
    plan: 03
    provides: "e2e/helpers/booker-seed.ts — the shared per-run fixture this spec seeds its rival against"
provides:
  - "src/components/booking/collision-notice.tsx — role=status (implicitly polite), tabIndex={-1}, focus moves here on mount, no aria-label (status is nameFrom:author), no --destructive, no role=alert"
  - "The same-paint flip: refreshed availability and the lost hours' aria-disabled + line-through land in the SAME paint as the notice"
  - "data-testid=collision-notice — carried because the assertion is a same-paint one inside a single page.evaluate, and because the role query is the assertion's own subject and so cannot also be its handle"
  - "e2e/collision-in-place.spec.ts — the seeded mid-test conflict, 480 lines, both themes"
  - "The step-3 retry poll that fixes a real lost-click race on a server-rendered control"
affects: [12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A same-paint assertion must read BOTH facts inside ONE `page.evaluate`. Two awaited Playwright assertions each retry until true, so both go green against a notice that arrived a paint before the corrected grid — the exact defect D-55 exists to prevent."
    - "A hook addressed by `data-testid` rather than by role when the role query is the assertion's own subject: counting live regions by `getByRole(\"status\")` while also addressing the element under test by it is green whenever the count is 1 for the wrong reason."
    - "Focus movement (`tabIndex={-1}` + focus on mount) as the substitute for `aria-live=\"assertive\"` — urgency without interruption."
    - "The conflicting row is INSERTed between window selection and the Book click. A conflict seeded before page load is not the scenario, because nothing races."

# Provenance of this document
authored-by: orchestrator
authored-reason: >
  The executor agent for this plan was terminated three consecutive times by transient
  server-side API errors (500, "Server error mid-response", 529 Overloaded) AFTER committing
  all three tasks but BEFORE writing this SUMMARY. This document was therefore assembled by
  the plan-phase/execute-phase orchestrator from three sources, each independently checkable:
  (1) the three task commits and their diffs; (2) the verbatim watched-red records the executor
  wrote into `e2e/collision-in-place.spec.ts`'s own header BEFORE it died; (3) fresh
  re-verification run by the orchestrator after the final failure. Nothing here is inferred
  from executor narration that was lost. Claims the orchestrator could NOT verify are marked
  UNVERIFIED rather than assumed green.
---

# Plan 12-13 — Turn a lost race into a calm result the booker can act on, in place

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| T1 | `61cd2f6` | feat(12-13): the in-place collision recovery — one commit, one notice, no stale price |
| T2 | `4c8f926` | feat(12-13): the flip, and the two windows that are the alternative |
| T3 | `5626a37` | test(12-13): the seeded collision — one paint, one region, no constraint code |
| — | _(this file)_ | docs(12-13): plan summary — authored by orchestrator, see frontmatter |

Files touched across T1–T3: `collision-notice.tsx` (new, 170 lines), `availability-calendar.tsx`
(+215), `book-cta.tsx` (+151), `slot-picker.tsx` (+97), `live-regions.ts` (+114/-…),
`selector-contract.ts` (+27), `(detail)/page.tsx` (+4), `globals.css` (+36),
`availability-calendar.test.tsx` (+234), `date-pass-picker.test.tsx` (+33),
`live-regions.test.tsx` (+14), `e2e/collision-in-place.spec.ts` (new, 480).

## Accomplishments

- **The same-paint flip.** A seeded collision lands the notice, moves focus to it, and in the *same
  paint* the two lost hours carry `aria-disabled` + `disabled` + line-through. Built on Seam A's
  `refreshDay()`, not `router.refresh()`.
- **Calm, not failure.** `role="status"` (implicitly polite), never `assertive`. No `--destructive`
  class, no `role="alert"`, a coral edge rather than a red one. `23P01` appears nowhere in the DOM.
- **Exactly one live region** about the collision. `book-cta`'s plain notice unmounts when the
  collision notice mounts.
- **GATE-03's compile pin bumped correctly** — `DeclaredFileCountIsNine` → `…IsTen` (12-12) →
  `…IsEleven` (12-13), with the path in `BOOKER_PATH_LIVE_REGION_FILES` and the row in
  `LIVE_REGIONS` landing in the same commit.
- **The money-path copy was not touched.** The named window line is composed client-side from the
  booker's own selection.

## Watched reds — both run by the executor, recorded verbatim in the spec header

These are quoted from `e2e/collision-in-place.spec.ts`'s header, which the executor wrote before it
was cut off. They are the strongest evidence in this plan and they are first-hand.

**R1 — the proof for Pitfall 3, and the reason this file exists at all.** `await refreshDay()`
removed from the taken/sold-out branch, leaving the shipped `router.refresh()` alone.
*Predicted:* case (a) red. *Observed:* exactly that, 1 failed / 1 did not run. The received side
showed all six chip fields flipped — `ariaDisabled: null`, `disabled: false`,
`lineThrough: "none"` — **while the `notice` half read `present: true, visible: true, focused: true`.**
The notice was perfect and the grid under it was a lie.

> **Why this is the design argument, not just a passing test.** Blast radius was *measured*:
> under R1, `collision-in-place + availability + price-parity` gave **5 passed / 1 failed / 1 did
> not run** — the only failure was this file. All four `availability.spec.ts` cases and the
> CI-gated `price-parity.spec.ts` stayed **green** under the mutation. Nothing else in the suite
> can tell `refreshDay()` from `router.refresh()`. That is the whole justification for both this
> spec and Seam A.

**R2 — rule 6.** `book-cta`'s plain notice rendered alongside the collision notice.
*Predicted:* case (c) red with a total of 2. *Observed:* `Expected: 1 / Received: 2`.

Both reverted with `git diff --exit-code src/` clean → 2 passed.

### R2's first invocation found a real defect in the spec itself

The first R2 run failed *somewhere else*: timed out at step 3 with the notice at 0 elements after
36.6s, on a run otherwise identical to one that had just taken 6.2s. **The `Book` click had been
lost** — the listing page is server-rendered, so that control is clickable before React attaches
its handler. The retry poll now wrapped around step 3 is the fix. Without it this spec would be an
intermittent red in the full suite **whose failure would read as a product defect**. This is a
finding about the spec, not about the mutation, and it is the kind that costs a day when it surfaces
later.

## Verification (re-run fresh by the orchestrator after the final API failure)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` (`lint && test:design && next build`) | exit 0 |
| `npx playwright test e2e/collision-in-place.spec.ts --project=chromium` | **2 passed** (court 13.3s, grove 9.2s) |
| GATE-06 — `drizzle/` | `0025_audit_resolved_by.sql`, 26 files — unchanged |
| `package.json` diff across `819af26..HEAD` | empty — zero new dependencies |
| `src/lib/availability/units.ts` | byte-unchanged |
| `src/lib/availability/open-capacity.ts` | byte-unchanged |
| `src/lib/validation/booking.ts` | byte-unchanged |
| `role="alert"` / `--destructive` in `collision-notice.tsx` | neither present |
| `data-testid="collision-notice"` | one string literal in `src/` |
| GATE-03 pin | `DeclaredFileCountIsEleven` — bumped with its row and path |
| Seed teardown | **0 leftover rival users, 0 leftover rival bookings** (direct DB query) |
| Port 3000 | clear |

Note on `23P01`: it appears in `src/lib/availability/units.ts` **comments only** (server-side
module). The requirement is that it never reaches the **DOM**, which the spec asserts directly;
server-side comments cannot.

Note on stale generated types: `npx tsc --noEmit` initially reported parse errors in
`.next/dev/types/routes.d.ts` and `validator.ts`. These are Next-generated artifacts left
half-written when the dev server died during the API cutoff — not source. `rm -rf .next/dev/types`
cleared them and `tsc` returned exit 0.

## UNVERIFIED — what the lost executor narration would have covered

Marked honestly rather than assumed green:

- Whether the executor ran watched reds **beyond** R1 and R2. Only those two are recorded in the
  spec header; there may have been more whose results are lost.
- The full-suite Playwright figure at this commit. The orchestrator ran the targeted spec (2 passed)
  and the build gate, not the whole browser suite. Prior plans recorded the standing draft-404 red
  and a cross-file DB-contention family whose targeted trio is 28 passed; those are expected to
  persist here.
- Whether the executor intended any additional deviation note.

## Not covered — read before trusting a green run

Quoted from the spec's own "NOT COVERED" block; all four are routed to UAT rather than faked:

1. **Whether the notice reads as *calm* rather than as a telling-off.** The spec asserts the
   mechanical half; every one of those assertions is satisfiable by markup that still feels like a
   reprimand. Calibration artefact is `.planning/sketches/006-collision-in-place/`'s "What it must
   never become". Comparing is a human act.
2. **Whether a screen reader speaks the notice once, and before the moved focus.** Announcement is
   browser + AT behaviour, not a DOM property. Region count and focus target are what is checkable.
3. **The drop-in twin (`sold-out`) is not driven in a browser here** — asserted in jsdom by
   `date-pass-picker.test.tsx` case (7).
4. **One viewport.** Both cases run at default width where the rail holds the price. At 375px that
   surface is the sticky bar and the sheet — `e2e/mobile-booker-path.spec.ts`'s question.

## Next Phase Readiness

STATE-07's mechanism is in and gated. **STATE-07 is not marked complete in REQUIREMENTS.md** — 12-14
also claims it, and the mobile-viewport half of the collision surface belongs to
`e2e/mobile-booker-path.spec.ts`. 12-14 is `autonomous: false` and carries the phase's blocking
human checkpoint.

## Self-Check: PASSED (with documented provenance caveat)

All three tasks committed, all invariants re-verified independently, seed teardown confirmed clean
by direct query. This SUMMARY was authored by the orchestrator rather than the executor for the
reason recorded in the frontmatter; the UNVERIFIED section states exactly what that cost.
