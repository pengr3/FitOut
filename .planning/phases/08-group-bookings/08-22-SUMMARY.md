---
phase: 08-group-bookings
plan: 22
subsystem: api
tags: [zod, drizzle, listing, pricing, group-bookings, validation, vitest]

# Dependency graph
requires:
  - phase: 08-group-bookings (plan 08-20)
    provides: "publishSchema.superRefine surcharge-reachability gate (included < maxOccupancy when extraHeadFee > 0) enforced at publish time"
provides:
  - "saveListingStep now re-enforces surcharge reachability on the EDIT path for already-published listings (effective-value, sparse-aware, published-only)"
  - "SURCHARGE_UNREACHABLE_MESSAGE — single shared reject-copy constant used by both the publish gate and the edit gate so they cannot drift"
  - "6 DB-backed, mutation-proven test cases pinning both reject vectors + sparse evaluation, plus draft-permissive and flat-exempt accepts"
affects: [group-bookings, listing-edit, pricing, host-revenue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Publish-time invariant re-enforced on the edit path for PUBLISHED rows only, evaluating EFFECTIVE post-save values (incoming ?? persisted-row ?? default) — mirrors paxSurcharge's `included ?? 1` / `extraHeadFee ?? 0` coalescing"
    - "User-facing reject copy shared between two enforcement points via one exported constant to prevent wording/logic drift"

key-files:
  created: []
  modified:
    - src/lib/validation/listing.ts
    - src/app/actions/listing.ts
    - tests/listing/crud.test.ts

key-decisions:
  - "Guard is gated on `owned.status === \"published\"` only — drafts stay fully permissive (publishSchema catches a bad draft at publish); pinned by test case 4"
  - "Evaluate EFFECTIVE post-save values so a sparse autosave carrying only one field is still caught against the persisted row; pinned by test case 6"
  - "Reject copy extracted to SURCHARGE_UNREACHABLE_MESSAGE and referenced by both gates rather than duplicating the literal, preserving 08-20's single-literal grep gate"

patterns-established:
  - "Edit-path re-validation of a publish-time money/capacity invariant against the persisted row, published-only"

requirements-completed: [GROUP-01, GROUP-05]

# Metrics
duration: 6min
completed: 2026-07-29
---

# Phase 8 Plan 22: Edit-Path Surcharge-Reachability Guard (HG-01) Summary

**saveListingStep now rejects an edit that would make an already-published listing's per-head surcharge unreachable — both vectors (raise `included`, lower `maxOccupancy`), sparse-aware, published-only — closing HG-01 / deferred item 7's edit-path half via one shared reject constant.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-29T03:51:36Z
- **Completed:** 2026-07-29T03:57:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Closed HG-01: a host can no longer silently zero out their per-head surcharge by editing a live listing's pricing (the exact revenue-loss 08-20 closes at publish, previously reproducible one step later on the routine "edit my price" workflow).
- Extracted `SURCHARGE_UNREACHABLE_MESSAGE` as the single source of truth for the reject copy — the publishSchema superRefine (08-20) and the new edit gate now reference the same constant, so they cannot drift.
- Added 6 DB-backed, mutation-proven test cases against live Docker Postgres covering both reject vectors, the sparse-effective-value proof, draft-permissive accept, and flat-exempt accept.

## Task Commits

Each task was committed atomically:

1. **Task 1: Guard saveListingStep + share the message constant** - `a3e3cfa` (feat)
2. **Task 2: DB-backed mutation-proven cases for the edit-path guard** - `a066c5d` (test)

_Note: this plan's Task 1 is the implementation (verified by `tsc`) and Task 2 is the mutation-proving test — the RED/GREEN proof lives in the Task 2 mutation check below._

## Files Created/Modified
- `src/lib/validation/listing.ts` - Added exported `SURCHARGE_UNREACHABLE_MESSAGE` constant; publishSchema superRefine now references it (literal still appears exactly once).
- `src/app/actions/listing.ts` - Imported the constant; inserted the published-only, effective-value edit guard in `saveListingStep` immediately after `const d = parsed.data;` and before the patch is built.
- `tests/listing/crud.test.ts` - New `describe("saveListingStep — surcharge reachability on edit (HG-01 / 08-22)")` block with a MUTATION-VERIFY header and 6 cases + a `publishedListingWith` helper (seed draft → autosave pricing → flip status to published in the DB).

## Mutation Verification (Task 2 acceptance)

Per the plan's MUTATION CHECK, the `if (owned.status === "published") { … }` guard was deleted from `saveListingStep` and `npx vitest run tests/listing/crud.test.ts` was run. Exactly the three published-reject cases went RED and the other three (plus the 5 pre-existing CRUD cases) stayed GREEN, then the guard was restored (`git checkout -- src/app/actions/listing.ts`) and all 11 pass again.

Recorded RED lines on guard removal (`Tests 3 failed | 8 passed`):

```
× (1) published + fee>0 + included raised to == maxOccupancy → REJECT, no write
× (2) published + fee>0 + maxOccupancy lowered below included → REJECT (second vector)
× (6) SPARSE save proves EFFECTIVE-value evaluation → REJECT (incoming max vs persisted included)
```

Cases (3) published-accept, (4) draft-permissive, and (5) flat-exempt stayed GREEN — confirming the guard is the sole cause of the three rejects and that it is correctly scoped to published rows with a live per-head fee. After restore: `Test Files 1 passed (1) · Tests 11 passed (11)`.

## Decisions Made
- **Published-only scope.** The guard applies solely when `owned.status === "published"`; drafts remain permissive because publishSchema still gates them at publish. This keeps autosave frictionless mid-edit (case 4).
- **Effective-value coalescing.** `effFee = d.extraHeadFee ?? owned.extraHeadFee ?? 0`, `effIncluded = d.included ?? owned.included ?? 1`, `effMax = d.maxOccupancy ?? owned.maxOccupancy ?? 0` — mirrors `paxSurcharge`'s coalescing so the guard and the pricing engine cannot disagree, and a sparse save is evaluated against the persisted row (case 6).
- **One shared reject constant** rather than duplicating the literal across the two files, preserving 08-20's `grep -c "or the extra guest fee never applies." === 1` gate.

## Deviations from Plan

None - plan executed exactly as written. (One self-inflicted note: an initial doc comment in `listing.ts` quoted the reject literal, momentarily making the single-literal grep return 2; the comment was reworded to reference the gate abstractly before the Task 1 commit, so the literal appears exactly once.)

## Issues Encountered
None.

## Known Stubs
None — the change is a server-side guard on an existing action; no placeholder data, empty returns, or unwired components introduced.

## Threat Model Compliance
- **T-08-87 (Denial — host revenue):** mitigated — the published-only effective-value cross-field guard rejects the edit server-side for both the raise-`included` and lower-`maxOccupancy` vectors (cases 1, 2).
- **T-08-88 (Tampering):** mitigated — the guard runs after `draftSchema.safeParse` against the OWNER's persisted row, so a smuggled/stale client value is evaluated the same way (case 6 proves persisted-row evaluation).
- **T-08-89 (usability — draft blocked):** mitigated — gated on `owned.status === "published"`; drafts stay permissive (case 4).
- **T-08-90 (drift):** mitigated — one shared `SURCHARGE_UNREACHABLE_MESSAGE` constant + identical coalescing logic in both gates.

No new security surface introduced (no new endpoints, auth paths, file access, or schema changes) — no threat flags.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Deferred item 7 is now fully closed for BOTH the publish surface (08-20) and the edit surface (this plan). HG-01 from `08-REVIEW-gaps.md` is resolved.
- Phase-closure state is unchanged: `completed_phases` remains **7** (this plan is a gap-closure within Phase 8; STATE.md and ROADMAP.md are orchestrator-owned and were not modified).
- The broader WR-09 pattern (publish-time invariants not re-enforced on every edit field) remains a general architectural note; this plan closes only the surcharge field's edit path, consistent with its declared scope boundary.

## Self-Check: PASSED
- FOUND: `.planning/phases/08-group-bookings/08-22-SUMMARY.md`
- FOUND: `src/lib/validation/listing.ts`, `src/app/actions/listing.ts`, `tests/listing/crud.test.ts`
- FOUND commits: `a3e3cfa` (Task 1, feat), `a066c5d` (Task 2, test)

---
*Phase: 08-group-bookings*
*Completed: 2026-07-29*
