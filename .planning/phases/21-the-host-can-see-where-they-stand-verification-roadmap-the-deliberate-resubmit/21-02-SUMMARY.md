---
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
plan: 02
subsystem: listing-review-history
tags: [nextjs, react, postgres, drizzle, radix-ui, tdd]
requires:
  - phase: 18-host-listing-review
    provides: persisted listing review lifecycle rows and host-readable rejection reasons
  - phase: 19-host-listing-surfaces-gates-that-actually-run
    provides: owner-scoped current listing grid and canonical listing-card surface
provides:
  - Owner-scoped ranked review-history read bounded to five visible cycles plus one sentinel
  - Narrow server-finished history DTO with no staff or internal identifiers
  - Conditional no-fetch dialog with total lifecycle copy, internal scrolling, and focus restoration
  - Real-database, component, and browser proof for LVER-07 edges
affects: [21-03, 21-04, 21-05, host-listings, listing-review]
tech-stack:
  added: []
  patterns:
    - PostgreSQL row_number partition for per-parent five-plus-one bounds
    - Server-formatted display DTOs passed into controlled client dialogs
    - RED evidence committed before each GREEN implementation
key-files:
  created:
    - src/lib/listing/review-history.ts
    - tests/listing/review-history.test.ts
  modified:
    - src/app/(host)/host/listings/page.tsx
    - src/components/listing/listing-card.tsx
    - tests/listing/listing-card.test.tsx
    - e2e/host-listing-grid.spec.ts
    - e2e/helpers/booker-seed.ts
key-decisions:
  - "Owner scope, deleted-parent exclusion, deterministic ranking, and the six-row bound all belong in the single SQL read."
  - "The browser receives only finished labels and absolute Asia/Manila times; review state codes and every identifier stay server-side."
  - "A zero-cycle listing is represented by an absent history DTO so no trigger, dialog shell, fetch, or loading state can exist."
requirements-completed: [LVER-07]
metrics:
  duration: 72m
  completed: 2026-09-09
status: complete
actuals:
  tokens: 11629
  tasks: 2
  commits: 4
plan_head_before: bec02545a0f1cd89f8f3d79f38fe8d02c6a758dc
---

# Phase 21 Plan 02: Bounded Host Review History Summary

**Each current owner-owned listing now exposes a truthful, server-bounded review lifecycle in an accessible no-fetch dialog without serializing staff or internal identifiers.**

## Performance

- **Duration:** 72 minutes
- **Started:** 2026-09-09T06:07:36Z
- **Completed:** 2026-09-09T07:19:36Z
- **Tasks:** 2
- **Files modified:** 9 implementation, test, and RED-evidence files

## Accomplishments

- Replaced the host listings page's former latest-rejection query with one owner-scoped joined read whose SQL excludes deleted parents, ranks cycles newest-first with a deterministic id tie-breaker, and returns at most six rows per listing.
- Added a server-only display mapper that exposes five visible cycles and an older-data sentinel while formatting absolute `en-PH`/`Asia/Manila` times and omitting every review, listing, host, and staff identifier from the client DTO.
- Implemented total lifecycle presentation for pending, approved, rejected, withdrawn, and grandfathered rows, including failure on impossible required state/time combinations instead of inferred facts.
- Added a conditional controlled dialog with semantic nested ordered events, selectable stored reasons, safe initial focus and trigger restoration, dynamic viewport insets, and internal long-content scrolling.
- Proved zero, one, five, and six-cycle behavior, tied ordering, owner/deleted boundaries, partial legacy data, serialized-key allowlisting, both themes, and 320px/1280px layouts.

## Task Commits

Each behavior-adding task followed RED → GREEN and was committed atomically:

1. **Task 1: Deliver one real pending-to-decided history path from ranked SQL to the listing-card dialog**
   - `41b0443` — RED: failing real-database and listing-card tracer with validated evidence
   - `50ddf17` — GREEN: ranked loader, host-safe DTO, page integration, and resolved dialog
2. **Task 2: Expand history to deterministic five-cycle bounds, partial legacy data, and accessible responsive behavior**
   - `4f3b92f` — RED: failing boundary, state, accessibility, and browser matrix with validated evidence
   - `b2d729b` — GREEN: total mapping, focus/scroll behavior, and complete browser fixture coverage

## Files Created/Modified

- `src/lib/listing/review-history.ts` — One owner/deleted-scoped ranked SQL read and exhaustive host-safe display mapping.
- `src/app/(host)/host/listings/page.tsx` — Replaces the previous grouped rejection read and supplies one resolved history DTO per card.
- `src/components/listing/listing-card.tsx` — Conditional controlled review-history dialog with semantic cycles, selectable reason text, and bounded scrolling.
- `tests/listing/review-history.test.ts` — Real-DB scope, projection, ordering, bounds, lifecycle, partial-row, and malformed-row coverage.
- `tests/listing/listing-card.test.tsx` — Zero-shell, no-fetch, semantic record, reason, focus, and responsive contract coverage.
- `e2e/host-listing-grid.spec.ts` — Court/grove and 320px/1280px browser journey for zero/one/many, focus, wrapping, and overflow.
- `e2e/helpers/booker-seed.ts` — Deterministic review-cycle fixtures and FK-safe cleanup for the host listing grid journey.
- `21-02-TASK-1-RED-EVIDENCE.json`, `21-02-TASK-2-RED-EVIDENCE.json` — Validated intentional RED snapshots.

## Decisions Made

- The SQL CTE owns authorization and bounding, so neither the page nor the dialog filters an unbounded or cross-owner collection after serialization.
- Row six is evidence only: it sets `hasOlder` and never enters the five visible cycles.
- Stored operator reasons render as ordinary React text with wrapping and selection; no canned replacement, markup path, or internal reason code exists.
- The terminal mapping is deliberately exhaustive: pending stops at Waiting, approved/rejected/withdrawn append exactly one terminal event, and grandfathered emits only its capability sentence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended the shared browser fixture with persisted review cycles**
- **Found during:** Task 2
- **Issue:** The existing three-card host fixture had no historical rows, so the planned zero/one/five-plus browser proof could not exercise the real server loader.
- **Fix:** Seeded deterministic one-cycle and six-cycle histories, including long stored text, and deleted child history rows before parent cleanup to respect the existing FK restriction.
- **Files modified:** `e2e/helpers/booker-seed.ts`
- **Commit:** `b2d729b`

**2. [Rule 1 - Bug] Measured the dialog's actual scrolling element**
- **Found during:** Task 2 browser verification
- **Issue:** The first browser assertion inspected the Radix ScrollArea root, while overflow lives on its generated viewport, producing a false negative despite correct internal scrolling.
- **Fix:** Scoped the assertion to the ScrollArea viewport and retained independent dialog-inset and document-overflow checks.
- **Files modified:** `e2e/host-listing-grid.spec.ts`
- **Commit:** `b2d729b`

**3. [Rule 3 - Blocking] Removed a stale generated Next.js validator before the production build**
- **Found during:** Overall build verification
- **Issue:** `.next/dev` retained an encoded `/%5Fops-auth` validator that conflicted with the production `/_ops-auth` route manifest.
- **Fix:** Removed only the generated `.next/dev` directory and reran the production build successfully; no tracked source file was changed.
- **Files modified:** None (generated output only)

## TDD Gate Compliance

| Task | RED evidence | RED commit | GREEN commit | Result |
|------|--------------|------------|--------------|--------|
| 1 | `21-02-TASK-1-RED-EVIDENCE.json` — loader absent and history control unresolved | `41b0443` | `50ddf17` | PASS |
| 2 | `21-02-TASK-2-RED-EVIDENCE.json` — bounds, state, focus, and browser edges incomplete | `4f3b92f` | `b2d729b` | PASS |

Both evidence files returned `RED_EVIDENCE_OK` from `gsd-tools check tdd-red-evidence` before their production edits.

## Verification

- `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` — **26 passed**.
- `npx.cmd playwright test e2e/host-listing-grid.spec.ts --config=playwright.manual-server.config.ts --project=chromium --reporter=list` against a manually managed Next server — **4 passed**. The temporary server-lifecycle config was removed afterward.
- Plan-local ESLint over every changed source, test, browser, and fixture file — **passed with no findings**.
- `npm.cmd run test:design -- tests/design/card-pattern-coverage.test.ts tests/design/host-tone-census.test.ts tests/design/listing-card-merge-order.test.ts tests/design/server-only-guards.test.ts` — **30 passed**.
- `OPS_APP_URL=http://ops.localhost:3000 npm.cmd exec next build` — **passed**, including production compilation, TypeScript validation, page-data collection, and 35 static pages.
- SQL/DTO inspection confirmed that staff identity, review/host/listing ids, and raw persisted state codes never enter the client DTO; owner scope and deleted-parent exclusion remain inside the SQL join.

## Deferred Issues

- The plan's literal `npm.cmd run typecheck` command cannot run because `package.json` defines no `typecheck` script. The production Next build completed its TypeScript phase successfully.
- The full design run completed 1,460 passing assertions but retains four unrelated failures already present after 21-01: the Phase 20 ops-action origin/census delta, the 21-01 roadmap success-hue census, and the Phase 20 suspense-trigger census. The four design suites that cover this plan's surface are green. Details are recorded in `deferred-items.md`.

## Known Stubs

None. No placeholder data, empty UI source, skipped test, TODO, or FIXME was introduced.

## Issues Encountered

- The pinned Playwright Chromium binary was absent and was installed through Playwright's checked-in versioned tooling before browser verification.
- Playwright's Windows-managed Next child did not exit after reporting results, so the same spec/project was run against a manually managed local server to obtain a clean exit; the temporary config and server were removed afterward.
- A stale prior Next process on port 3000 did not answer requests and was stopped before the isolated browser run.

## User Setup Required

None. No dependency, environment variable, schema, migration, or external-service configuration changed.

## Next Phase Readiness

- Plan 21-03 can add deliberate resubmission while consuming the completed history DTO and leaving the read path bounded and read-only.
- Phase-wide UI and verification closure can rely on browser-proven zero/one/many histories at both acceptance widths and themes.

## Self-Check: PASSED

All nine claimed implementation/test/evidence files, the summary, and all four task commit hashes were found on disk/history. Documentation diffs also pass `git diff --check`.

---
*Phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit*
*Completed: 2026-09-09*
