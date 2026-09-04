---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 03
subsystem: testing
tags: [typescript-ast, vitest, design-gate, responsive, resp-04, selector-contract, data-testid]

# Dependency graph
requires:
  - phase: 11-design-system-foundations
    provides: "tests/design/sheet-absent.test.ts (AC#14's owner), src/lib/design/selector-contract.ts (the total-Record compile gate), the guard-the-guard idiom"
  - phase: 14-host-flows
    provides: "usePublishChecklistPlacement — the one sanctioned matchMedia call site, and the wizard call site that passes its result down as a prop"
provides:
  - "tests/design/one-tree.test.ts — the RESP-04 source gate: AC#10 (zero viewport-conditional JSX branches) and AC#11 (exactly one matchMedia CALL SITE, zero useMediaQuery imports), blocking inside `npm run build`"
  - "A viewport-conditional JSX classifier over the TypeScript AST, with a named vocabulary and both-directions synthetic self-tests"
  - "data-testid=\"search-results-region\" on the search results container — makes AC#12's one-instance-in-document count askable for the search surface"
  - "data-testid=\"availability-calendar\" on the RESOLVED calendar container (not the skeleton fallback) — same, for the calendar surface"
  - "Two SELECTOR_CONTRACT rows with compile-enforced `why` + `owner`"
affects: [17-09, 17-verification, resp-04, playwright-one-instance-counts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Count CALL EXPRESSIONS, never strings, when an AC names a `call site` (RESEARCH Pitfall 7)"
    - "Assert a sanctioned exception as a POSITIVE fact (the hook returns a placement NAME) rather than carrying it in an allowlist"
    - "Delegate a claim to its owning gate and assert the DELEGATION (the owner file still exists and still names both halves)"

key-files:
  created:
    - tests/design/one-tree.test.ts
  modified:
    - src/lib/design/selector-contract.ts
    - src/components/search/search-results.tsx
    - src/components/availability/availability-calendar.tsx

key-decisions:
  - "AC#11 counts `ts.isCallExpression` nodes whose callee resolves to `matchMedia`; the string counter is kept as a NAMED function used only by the self-test and the failure message, so the Pitfall-7 trap is runnable rather than argued"
  - "The sanctioned exception is asserted positively — `usePublishChecklistPlacement`'s return type must be a union of ≥2 string literals — because an allowlist survives the file becoming non-compliant and a positive fact does not"
  - "AC#14 is delegated to `tests/design/sheet-absent.test.ts` and NOT duplicated; the delegation itself is asserted (the owner exists and still names both files)"
  - "`data-testid=\"availability-calendar\"` goes on the resolved container, never on `skeleton-calendar` — counting the fallback answers \"is it loading\", not \"is there one calendar\""
  - "The classifier's vocabulary is deliberately narrow (mobile/desktop/tablet/viewport/breakpoint as WORDS, plus matchMedia-derived bindings and the innerWidth family) and its blind spots are listed, because a ban that can miss a violation is safe and one that invents them is not kept"

patterns-established:
  - "Pattern: guard-the-guard before every empty-list clause — file-count floors, non-zero parsed statements per file, a discriminating positive control, and a scan-of-a-missing-tree probe"
  - "Pattern: failure messages built by a named function (`offenderReport` / `callSiteReport`) that the self-tests drive, so the message is asserted rather than assumed"

requirements-completed: []  # RESP-04 ADVANCED, not closed — see "Requirements" below

# Metrics
duration: 16 min
completed: 2026-08-29
---

# Phase 17 Plan 03: RESP-04 One Component Tree Summary

**A TypeScript-AST design gate that proves no page or component forks its tree on the viewport and that `src/` holds exactly one `matchMedia` call site — counted as call expressions, never as the string that returns 2 on correct code — plus the two structural container ids that make RESP-04's rendered half askable at all.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-29T07:18:11Z
- **Completed:** 2026-08-29T07:34:30Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- **`tests/design/one-tree.test.ts` (951 lines, 21 tests, green on the current tree).** Walks `src/**` with the TypeScript compiler API. AC#10 asserts zero viewport-conditional JSX branches under `src/app/**` and `src/components/**`; AC#11 asserts exactly one `matchMedia` **call site** and zero `useMediaQuery` imports across all of `src/`. It runs inside `npm run build` via the design config, so both are blocking by construction.
- **Pitfall 7 closed by construction, and demonstrated.** The clause counts `ts.isCallExpression` nodes. The string counter survives as a named function used by the self-test and by the failure message only — the self-test runs both counters over one fixture carrying `publish-checklist.tsx`'s `typeof` guard and its real call, and pins string = 2 against call-site = 1. A `toBe(1)` over the string count would have been red against a compliant tree, and its obvious "fix" is deleting a guard the wizard's jsdom tests need.
- **The sanctioned exception is asserted as a positive fact.** `usePublishChecklistPlacement` is compliant because it returns a placement NAME which the wizard passes down as a prop — one node is mounted, so the one-instance count holds at 320/768/1280. The gate checks the return type is a union of ≥2 string literals and that neither the component nor its one consumer contains a viewport-conditional branch. No allowlist, no exemption.
- **Four watched reds, all real, recorded verbatim in the file header** — the fork arrives, a second `matchMedia` call site arrives, a `useMediaQuery` import arrives, and the scan is pointed at a directory that does not exist. Probe (d) is the one worth reading: over an empty scan, **AC#10's empty-list clause and AC#11's zero-import clause both passed**, which is the entire argument for the two file-count floors.
- **Two structural container ids shipped with compile-enforced rows.** `search-results-region` and `availability-calendar` were the two named RESP-04 surfaces with no identifying container; without them AC#12's "exactly one in the document at three widths" could not be *asked*, let alone answered. Plan 17-09 does the counting in Playwright.
- **No accessible-name selector traded away.** Measured this run: `e2e/` carries 304 `getByRole` and 83 `getByLabel` lines against D-32 floors of 92 and 30. Both ids sit on structural containers with no role and no accessible name.

## Task Commits

Each task was committed atomically:

1. **Task 1: `tests/design/one-tree.test.ts` — the viewport-conditional JSX scan and the matchMedia call-site count** — `54beefe` (test)
2. **Task 2: Declare and ship the two structural container test ids** — `b0c2245` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `tests/design/one-tree.test.ts` — **created.** The RESP-04 source gate. Scans `src/` once at module level; classifies viewport-conditional JSX branches in three forms (ternary, logical, `if`-that-returns-JSX) over `src/app/**` + `src/components/**`; counts `matchMedia` call expressions and `useMediaQuery` import specifiers over all of `src/`. Carries the header's watched-red record, its NOT-COVERED blind spots, four guard-the-guard clauses, and twelve self-tests over synthetic sources never written to disk.
- `src/lib/design/selector-contract.ts` — **modified.** Two names added to `SELECTOR_IDS` and two rows to the total `SELECTOR_CONTRACT` Record under a new `// ─── 17-03 ───` divider, both `owner: "17-03"`, `why` lengths 1511 and 1263 characters.
- `src/components/search/search-results.tsx` — **modified.** `data-testid="search-results-region"` on the outermost `<section>`, which is present in all six states the component renders (fetch error, searching, results, relaxation band, zero-result, cold start). One attribute, nothing else.
- `src/components/availability/availability-calendar.tsx` — **modified.** `data-testid="availability-calendar"` on the resolved calendar container at the component's root, deliberately NOT on `skeleton-calendar` (~:869), which is the loading fallback. One attribute, nothing else.

## Decisions Made

- **The `matchMedia` clause asserts the FILE LIST, not a line list.** `expect(callSites.map(s => s.file)).toEqual([SANCTIONED_MATCHMEDIA_FILE])` pins both the count (exactly one element) and the location without pinning a line number that any edit above shifts. The lines still travel in the failure message.
- **The Pitfall-7 trap is demonstrated on a fixture, not asserted against the real tree.** An assertion like `expect(realTreeStringCount).toBe(2)` would go red the day someone writes a comment mentioning `matchMedia`. The synthetic fixture is stable forever, and the real tree's string count is *reported* inside the AC#11 failure message instead (probe (b) shows it: 2 call sites, 3 string occurrences).
- **The classifier also catches `if (viewportTest) return <JSX/>`,** which the plan did not require. It is the same defect in a different syntax, the tree has zero instances of it, and it is self-tested — so including it costs nothing and closes a hole a reader would otherwise have to be warned about.
- **A viewport read that chooses a CLASS is explicitly NOT flagged, and that direction is pinned by a self-test.** One tree styled two ways is sanctioned technique #1; a classifier that flagged it would ban the remedy along with the defect.
- **AC#14 got a delegation assertion rather than a second copy.** Nothing here looks at whether `sheet.tsx` exists; the gate asserts that `tests/design/sheet-absent.test.ts` still exists and still names both files, because a hand-off to a deleted file is a hole with no symptom.

## Deviations from Plan

None - plan executed exactly as written.

Two measured corrections to figures the plan and 17-RESEARCH quote, recorded because they are facts about the tree rather than changes to it:

- **The declared-id count was 50, not 49.** `17-RESEARCH.md § RESP-04` and the plan's `<interfaces>` block both state "49 test ids declared". Counted mechanically by transpiling and evaluating `selector-contract.ts`: 50 before this plan, **52** after. Nothing depends on the number (`DECLARED_ID_FLOOR` is 17 and is a floor), so this is a note, not a defect.
- **The D-32 companion counts read 304 / 83, not 303 / 84.** `grep -rc` counts matching LINES, and 17-01 added `e2e/helpers/axe.ts`. Both are far above the 92 / 30 floors, and `selector-contract.test.ts`'s own floor assertion passes.

## Issues Encountered

None. The gate was green on its first run and stayed green through all four revert-and-rerun probe cycles.

## Requirements

**RESP-04 is ADVANCED, not closed — `requirements-completed` is deliberately empty.**

| AC | Claim | Status after this plan |
|----|-------|------------------------|
| 10 | Zero viewport-conditional JSX branches | ✅ **closed here** — blocking gate, green |
| 11 | Exactly one `matchMedia` call site, zero `useMediaQuery` | ✅ **closed here** — blocking gate, green |
| 12 | Identifying container resolves to 1 **in the document** at 320/768/1280 | ⏳ **unblocked here** (the two missing ids now exist); the count is plan **17-09**'s, in Playwright |
| 13 | `getByRole("navigation")` resolves to exactly 1 at 320 and 1280 | ⏳ plan 17-09 |
| 14 | `sheet.tsx` absent / `responsive-dialog.tsx` present | ✅ owned by `tests/design/sheet-absent.test.ts`; the delegation is now asserted |

`.planning/REQUIREMENTS.md` is therefore untouched: RESP-04's bullet and its traceability row stay `Pending` until 17-09 lands the rendered half.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change. `T-17-12` (the new `data-testid` values shipping in production markup) is dispositioned `accept` in the plan and remains accurate: both values are non-secret structural names on containers, exposing no user data, no session state and no server-side value. `T-17-13`: `git status --porcelain drizzle/` prints nothing.

## Verification

All plan-level `<verification>` commands re-run at close-out:

| Command | Result |
|---|---|
| `npx vitest run --config vitest.design.config.ts tests/design/one-tree.test.ts tests/design/sheet-absent.test.ts` | 2 files, **39 passed** |
| `npm run test:design` | **66 files, 1247 passed / 3 skipped** (was 65 / 1226 after 17-02) |
| `npx tsc --noEmit` | exit **0** (proves both `SELECTOR_CONTRACT` rows exist — a missing row is TS2741) |
| `npm run lint` | exit **0** — 25 warnings, all pre-existing, none in the touched files |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32) |
| `git diff --name-only` | exactly the four declared files |
| `grep -c 'data-testid="search-results-region"' src/components/search/search-results.tsx` | `1` |
| `grep -c 'data-testid="availability-calendar"' src/components/availability/availability-calendar.tsx` | `1` |
| `grep -c 'owner: "17-03"' src/lib/design/selector-contract.ts` | `2` |
| `why` lengths of the two new rows | 1511 / 1263 (floor: 100) |
| D-32 floors in `e2e/` | `getByRole` 304 ≥ 92, `getByLabel` 83 ≥ 30 — unmoved |
| Guards before the empty-list clause | floors at :590–:602, AC#10 empty-list at :665 |

## Known Stubs

None. Both test ids are wired to real, always-rendered containers; the gate asserts against the real tree, not a fixture.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 17-04.** Wave 1 is order-independent and this plan's four files do not overlap any sibling's `files_modified`.
- **Handed to 17-09:** the two ids AC#12 needs. Its spec must count `[data-testid="search-results-region"]` and `[data-testid="availability-calendar"]` **in the document** at 320/768/1280 — never `toBeVisible()`, which is the exact assertion a forked-variant defect passes.
- **Standing instruction encoded in the gate:** a second component reaching for `matchMedia` is a finding, not a precedent. The AC#11 failure message points at escalation rather than at widening the allowlist.

## Self-Check: PASSED

- `tests/design/one-tree.test.ts` — FOUND (951 lines, > 150 floor)
- `src/lib/design/selector-contract.ts` — FOUND (contains `17-03` ×4)
- `src/components/search/search-results.tsx` — FOUND
- `src/components/availability/availability-calendar.tsx` — FOUND
- Commit `54beefe` — FOUND
- Commit `b0c2245` — FOUND
- All Task-1 and Task-2 `<acceptance_criteria>` re-run and passing (table above)

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
