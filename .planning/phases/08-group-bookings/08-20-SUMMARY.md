---
phase: 08-group-bookings
plan: 20
subsystem: api
tags: [zod, validation, pricing, group-booking, superRefine, revenue-guard]

# Dependency graph
requires:
  - phase: 08-group-bookings
    provides: "paxSurcharge (included ?? 1, extraHeadFee ?? 0) and its declaredPax-clamp-to-maxOccupancy pricing path; publishSchema publish gate run server-side by publishListing"
provides:
  - "publishSchema cross-field guard: a per-head surcharge listing (extraHeadFee > 0) must have included STRICTLY below maxOccupancy, else publish is rejected with an included-field error"
  - "Wizard Group-pricing copy stating the included < maxOccupancy relationship (with the actual cap interpolated) at configuration time"
affects: [group-bookings, listing-publish, host-wizard, pricing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-field surcharge-reachability guard via z.object(...).superRefine on the PUBLISH schema only; draftSchema stays all-optional so autosave is never blocked"
    - "Validation coalescing mirrors the pricing engine exactly (included ?? 1, extraHeadFee ?? 0) so the gate and paxSurcharge can never disagree"

key-files:
  created: []
  modified:
    - "src/lib/validation/listing.ts — publishSchema.superRefine rejecting included >= maxOccupancy when extraHeadFee > 0"
    - "src/app/(host)/host/listings/[id]/edit/wizard.tsx — Base price covers FormDescription now names the below-capacity rule"
    - "tests/validation/listing-schema.test.ts — surcharge-reachability describe block (reject/accept/flat-exemption/draft-permissive)"

key-decisions:
  - "Guard fires ONLY when extraHeadFee > 0 — flat listings (fee 0/absent) are exempt so every pre-Phase-8 listing still publishes unchanged"
  - "Rule lives on publishSchema ONLY; draftSchema stays permissive so a half-filled draft with included >= maxOccupancy still autosaves"
  - "Error targets path ['included'] so publishListing surfaces it as fieldErrors.included on the right wizard input"
  - "Boundary is strict-greater: included == maxOccupancy is caught (>=), mutation-proven"

patterns-established:
  - "Surcharge-reachability guard: any pricing lever that clamps its input before applying a fee must have a publish-time guard proving the fee is reachable, coalesced identically to the pricing engine"

requirements-completed: [GROUP-01, GROUP-05]

# Metrics
duration: 4min
completed: 2026-07-29
---

# Phase 8 Plan 20: Surcharge-Reachability Publish Guard Summary

**publishSchema now rejects a per-head listing whose `included` headcount is not strictly below `maxOccupancy` (the surcharge could never fire), and the wizard states the `included < maxOccupancy` rule at configuration time — closing deferred-items.md item 7, a silent revenue-loss path.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-29T02:48:11Z
- **Completed:** 2026-07-29T02:52:16Z
- **Tasks:** 2 (Task 1 was TDD: test → feat)
- **Files modified:** 3

## Accomplishments
- `publishSchema.superRefine` rejects `(included ?? 1) >= maxOccupancy` whenever `extraHeadFee > 0`, with the issue targeted at the `included` field — so a host can no longer publish a per-head listing whose surcharge is mathematically unreachable (`declaredPax` is clamped to `maxOccupancy` before `extraHeads = max(0, pax − included)` is computed, so `included >= maxOccupancy` collects nothing extra forever).
- Coalescing (`included ?? 1`, `extraHeadFee ?? 0`) mirrors `paxSurcharge` exactly, so the publish gate and the pricing engine can never disagree.
- Flat listings (fee 0/absent) are explicitly exempt — every pre-Phase-8 listing still publishes; `draftSchema` is untouched so mid-edit autosave stays permissive.
- Wizard's "Base price covers" `FormDescription` now tells the host to keep it below maximum capacity (interpolating the actual cap when known) or the extra guest fee never applies — no new controls, no mode picker.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing surcharge-reachability cases** - `7d6d4e8` (test)
2. **Task 1 (TDD GREEN): publishSchema surcharge-reachability guard** - `03aefd7` (feat)
3. **Task 2: wizard Group-pricing clarifying copy** - `9ef5e15` (feat)

**Plan metadata:** committed separately with this SUMMARY (docs).

_Task 1 was `tdd="true"`: RED (test) → GREEN (feat). No refactor commit was needed._

## Mutation Check (>= → >)

Per the plan's mandatory boundary proof, after GREEN the operator was mutated from `>=` to `>` and `npx vitest run tests/validation/listing-schema.test.ts` was re-run:

- **RED under `>`:** 3 boundary cases failed — `REJECTS included == maxOccupancy` (the operator's court-of-8 example, `included: 8, maxOccupancy: 8`), the `included`-field-target assertion (same fixture), and `REJECTS the default included (1) when maxOccupancy is also 1` (`1 == 1`). This proves the boundary is strict-greater: `included == maxOccupancy` is only caught by `>=`, not `>`.
- **GREEN restored:** `>=` reinstated → 24/24 pass; `git diff --exit-code src/lib/validation/listing.ts` is clean, confirming the mutated code was NEVER committed (only `03aefd7`'s `>=` is on disk and in history).

## Files Created/Modified
- `src/lib/validation/listing.ts` - Chained a `.superRefine` onto `publishSchema`'s `z.object({...})` rejecting `included >= maxOccupancy` when `extraHeadFee > 0`, issue on path `["included"]`; `draftSchema` untouched. `PublishListingInput = z.infer<typeof publishSchema>` still type-checks (a ZodEffects retains the inferred shape).
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` - Extended the `included` field's `FormDescription` to state the below-capacity rule, interpolating `values.maxOccupancy` when set; no new field/mode control.
- `tests/validation/listing-schema.test.ts` - Added `describe("publishSchema — surcharge reachability (Gap C / deferred item 7)")` with reject (== / > / default-1-vs-max-1), accept (< max / default-1), flat-exemption (no fee / fee 0), field-target, and draft-permissive cases.

## Verification
- `npx vitest run tests/validation/listing-schema.test.ts` → 24/24 pass.
- `npx tsc --noEmit` → exit 0 (the ZodEffects change does not break `PublishListingInput` or `publishSchema.safeParse` in `src/app/actions/listing.ts`).
- `npm run build` → exit 0 (wizard client component compiles in the route bundle).
- Full suite `npx vitest run` → 97 files / 851 tests pass, exit 0.
- Grep gates: `superRefine` count 1 (chained AFTER `publishSchema`, none between `draftSchema` and `publishSchema`); exact message `"or the extra guest fee never applies."` count 1 in listing.ts; wizard `"the extra guest fee can never apply"` count 1, sitting after the `(values.extraHeadFee ?? 0) > 0` guard; `occupancyMode|occupancy_mode` count 0 in the wizard (no new control).

## Decisions Made
None beyond the plan — executed exactly as written. The strict-greater boundary, the `extraHeadFee > 0` gate, the publishSchema-only placement, and the exact message/copy strings all followed the plan and its critical constraints.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
None — both changes are fully wired: the guard runs server-side inside `publishListing` (it re-validates the persisted row, so a stale/tampered client cannot bypass it), and the wizard copy is live copy in a shipped component.

## Threat Flags
None — no new network endpoint, auth path, file-access pattern, or schema change was introduced. This plan tightens an existing publish gate (T-08-80/81/82/83 in the plan's threat register are all `mitigate` and are covered by the shipped guard + the flat-exemption and draft-permissive tests).

## Issues Encountered
None.

## Phase-closure note
`completed_phases` remains **7** — this plan does NOT close Phase 8. The phase's BLOCKER (deferred item 5, the `confirmBooking` double-charge) is addressed by 08-18 (executed) and must be proven by 08-19's real-API test (`RUN_LIVE_PAYMONGO_PROBE=1`, opt-in) before the phase closes. STATE.md and ROADMAP.md were intentionally NOT modified (orchestrator owns them).

## Next Phase Readiness
- Item 7 (revenue-loss: unreachable surcharge) is closed at both the server gate and the wizard.
- Phase 8 remains open pending 08-19's real-API proof of the item-5 fix.

## Self-Check: PASSED

- Files exist: `src/lib/validation/listing.ts`, `src/app/(host)/host/listings/[id]/edit/wizard.tsx`, `tests/validation/listing-schema.test.ts`, `.planning/phases/08-group-bookings/08-20-SUMMARY.md` — all FOUND.
- Commits in history: `7d6d4e8` (test), `03aefd7` (feat), `9ef5e15` (feat) — all FOUND.

---
*Phase: 08-group-bookings*
*Completed: 2026-07-29*
