---
quick_id: 260824-ght
slug: wrap-the-space-column
status: complete
completed: 2026-08-24
commits:
  - cbedf46 (fix — the Space cell wraps, the When cell beside it never does)
  - 98851a3 (test — pin the split, not the geometry it happens to produce today)
  - 656a437 (docs — F-2 closed in the UAT log and deferred-items)
key_files:
  modified:
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(host)/host/requests/page.tsx
    - e2e/skeleton-geometry.spec.ts
    - src/lib/design/measurements.ts
---

# Quick 260824-ght — wrap the Space column · SUMMARY

> ⚠ Execution note: the executing agent was killed TWICE by server-side API errors (529) — once
> mid-verification and once immediately after its final gate run, before it could commit. All of its
> work survived on disk and in its transcript. The coordinator verified the gates independently on the
> exact tree the agent left (tsc 0 · design 50 files / 837 passed · `skeleton-geometry` 16/16 run
> alone on a fresh DB), then committed the work and wrote these docs from the transcript's own measured
> numbers. Nothing below is the coordinator's estimate; every number is the agent's measurement or the
> coordinator's re-run.

## What shipped

**The PM's second and final F-2 ruling — "wrap the space column" — implemented on both host list
routes, and pinned as a SPLIT rather than as a pixel.**

- The Space cell on `/host/bookings` and `/host/requests` may wrap. **Every other cell on both routes
  still may not**, and the When cell's non-wrapping is a committed assertion
  (`skeleton-geometry.spec.ts` case *(title)*), because a venue-local window label is a different
  string every day — wrapping it re-couples row height to the calendar, which is what `260824-dbc`
  reverted and `[14-16]` closed. A space title has no such property: it is a stable string the host
  chose, so its wrap count is measurable and seedable. That asymmetry is written once, at the
  `/host/bookings` cell, and referenced (not restated) at the `/host/requests` one.

## Measured result (1280px, seeded catalogue's real titles and cities)

| Route | | `clientWidth` | `scrollWidth` | overflow | Approve | Decline |
|---|---|---|---|---|---|---|
| `/host/bookings` | before | 864 | 910 | 46px | inside | 38 of 85px past the edge |
| `/host/bookings` | **after** | 864 | **864** | **0** | **whole at rest** | **whole at rest** |
| `/host/requests` | before | 864 | 1091 | 227px | past the edge | — |
| `/host/requests` | **after** | 864 | 958 | 94px | inside, 6px clear | — |

The filed route meets the plan's bar exactly: zero overflow, both actions whole, nothing to scroll.
`/host/requests` was in scope only because it measured WORSE than the filed finding; the same
single-cell wrap brings its primary action inside but not to zero — the remaining width is the
countdown-led triage structure HFLOW-01 mandates. Recorded as better-not-perfect, deliberately.

## The decision the docblocks carry

**Neither declared row-height constant moved**, and each carries the argument:

- `HOST_BOOKING_ROW_HEIGHT` desktop: with the wrap, the Space column becomes the RESIDUAL of five
  fixed columns, so the desktop row is two-valued (36.52px one line / 57px two) as a property of the
  host's OWN titles. 36 stays declared because it is exact whenever no Actions column renders (the
  Past tab; an Upcoming tab with nothing pending — the residual grows to 271.6px and none of the
  catalogue's titles wrap) and it never over-claims. Pinning min-content geometry would pin where a
  browser breaks a title between two words; the committed cases pin the SPLIT and the measured
  20px-per-wrapped-line step instead.
- `HOST_REQUEST_ROW_HEIGHT`: absorbed the change without moving (second time); the one condition under
  which it can move — a four-line min-content title exceeding the countdown's height, measured at 97px
  vs the 84px bar for the catalogue's 30-character title — is recorded rather than asserted.

## New committed coverage

`e2e/skeleton-geometry.spec.ts` 15 → **16 cases**, run alone, twice, both 16/16:
- *(step)* one wrapped meta line costs 20px — measured, not assumed
- *(title)* the Space cell wraps and the When cell does not — both heights, both seeded
- *(deviation)* a still-pending booking over-runs the bookings plate's bar by a measured amount

## Verification (agent's run, coordinator re-verified the starred ones)

| Check | Result |
|---|---|
| `npx tsc --noEmit` * | 0 |
| `npm run test:design` * | 50 files / 837 passed / 3 skipped / 0 failed — baseline unmoved |
| `npx vitest run` (full) | 1892 passed / 5 skipped / 0 failed |
| `npm run build` | exit 0 |
| `e2e/skeleton-geometry.spec.ts` alone * | **16 passed** |
| `e2e/host-dashboard.spec.ts` alone | 7 passed |
| `e2e/host-headings.spec.ts` alone | 14 passed |
| `e2e/host-inbox-hierarchy.spec.ts` alone | 3 passed |
| `e2e/overflow-320.spec.ts` alone | 46 passed / 15 skipped |
| `git diff --stat drizzle/` | empty |
| Throwaway fixture teardown | verified: 0 listings / 0 bookings / 0 users / 0 notifications |

Gates untouched: `elevation-z.test.ts:306` (one raised element), `brand-recipe.test.ts` (host accent 5),
`earnings-freeze` (no earnings/payout file opened), `when-label.ts` (not modified). Playwright never
invoked bare; DB-seeding specs run alone; `--project=visual` not used (win32). The dev-server
Postgres-leak gotcha fired during the agent's gate runs and was worked around with a DB restart + route
warm before each gate — the leak itself remains logged in `deferred-items.md` under `[260824-ej2]`.

## Self-Check: PASSED

All three commits resolve; both routes' diffs contain the wrap and nothing else structural; the two
pinned test files changed only by addition; `git status` is clean of everything but the pre-existing
untracked `.claude/` and `.gitkeep`.
