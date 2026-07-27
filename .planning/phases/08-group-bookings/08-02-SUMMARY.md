---
phase: 08-group-bookings
plan: 02
subsystem: database
tags: [postgres, drizzle, for-update, row-lock, concurrency, crypto, crockford, rsvp, seat-claim]

# Dependency graph
requires:
  - phase: 08-01
    provides: booking_group + rsvp tables, capacity_snapshot, access_token, rsvp de-dup partial-unique indexes, occupancy_mode/rsvp_status enums (drizzle/0017)
  - phase: 03
    provides: the makeRacingClients two-connection race-test discipline (exclusion-race.test.ts) + the db.transaction / 40P01-retry idioms (units.ts)
provides:
  - claimSeat(db, {groupId, answer, userId, guestEmailNorm, name}) — the pessimistic SELECT capacity_snapshot FOR UPDATE seat-claim, the D-112 atomic no-overflow authority (GROUP-05/SC#4)
  - makeInviteToken() / makeManageToken() — ~100-bit crypto-random Crockford bearer credentials (D-118)
  - the two-connection makeRacingClients seat-claim race gate (mutation-verified) + the functional toggle/free/re-claim/snapshot-not-live and identity-de-dup regression suites
affects: [08-03, 08-04, 08-05, 08-06, group-booking, rsvp, invite-route, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pessimistic per-parent row lock (SELECT ... FOR UPDATE) as the atomic no-overflow authority — the RSVP analog of the GiST EXCLUDE double-booking guarantee; the app never adjudicates the cap"
    - "Two-connection makeRacingClients race test with client.begin per racer (FULL transaction, not autocommit) — the transaction-atomic seat-claim analog of the statement-atomic exclusion-race gate"
    - "Bearer-credential token minting: reuse the reference.ts bias-free Crockford byte%32 encoder over randomBytes(20) = 100 bits, no FIT- prefix"

key-files:
  created:
    - src/lib/group/seat-claim.ts
    - src/lib/group/token.ts
    - tests/group/seat-claim-race.test.ts
    - tests/group/seat-claim.test.ts
    - tests/group/rsvp-identity.test.ts
  modified: []

key-decisions:
  - "The D-112 seat-claim is a SELECT capacity_snapshot ... FOR UPDATE row lock + count('yes') under the lock + conditional write — never an app-level count-then-insert (the CLAUDE.md anti-pattern)"
  - "The cap reads capacity_snapshot ONLY, never live listing.maxOccupancy (D-111) — proven by the snapshot-not-live test"
  - "Identity de-dup is single-path: account by user_id, guest-with-email by normalized email, name-only guest never de-duped (D-116/D-117)"
  - "Invite/manage tokens are ~100-bit crypto Crockford bearer credentials over randomBytes(20), no FIT- prefix (D-118)"

patterns-established:
  - "Pattern: per-group RSVP seat-claim — one row lock is the sole no-overflow authority (D-112)"
  - "Pattern: transaction-atomic race test via client.begin per independent connection (RESEARCH Pitfall 1 divergence from the autocommit exclusion-race template)"

requirements-completed: [GROUP-05, GROUP-03]

# Metrics
duration: 12min
completed: 2026-07-27
---

# Phase 8 Plan 02: Seat-Claim & Invite Token Summary

**The D-112 pessimistic RSVP seat-claim (`SELECT capacity_snapshot ... FOR UPDATE` + count under the lock in `claimSeat`) is the atomic no-overflow authority — mutation-verified under a genuine two-connection race — plus ~100-bit crypto Crockford invite/manage tokens (D-118).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-27T17:26Z
- **Completed:** 2026-07-27T17:33Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 5 (2 src + 3 tests)

## Accomplishments
- Built the ONE genuinely new correctness surface of Phase 8 red-first: `claimSeat` serializes every seat-affecting mutation on the single `booking_group` row via `FOR UPDATE`, counts confirmed `'yes'` under the lock, and writes only if `count < capacity_snapshot` — the row lock is the atomic authority, mirroring the GiST EXCLUDE philosophy (no app-level cap adjudication).
- **Mutation-verified the phase acceptance gate (GROUP-05/SC#4):** deleting `FOR UPDATE` from the race test's inlined lock turned `seat-claim-race.test.ts` RED (4/4 racers committed `'yes'` at snapshot=2, and >1 at snapshot=1 — genuine overflow); restoring it turned it GREEN. This is the Phase-3 exclusion-race discipline applied to the transaction-atomic seat-claim.
- Proved the functional contract through `claimSeat` directly: yes→no frees a seat, a freed seat is re-claimable by a different identity, an already-`yes`→`yes` is a one-row no-op (D-120), a partial RSVP leaves the `booking_group` row valid and unvoided (D-113), and the cap reads `capacity_snapshot` even after the host slashes live `maxOccupancy` (D-111).
- Proved single-path identity de-dup (D-116/D-117): account by `user_id`, guest-with-email by normalized email (both UPDATE the existing row), name-only guests never de-duped.
- Minted `makeInviteToken()`/`makeManageToken()` reusing the `reference.ts` bias-free Crockford `byte % 32` encoder over `randomBytes(20)` = 100 bits, with no `FIT-` prefix (a bearer credential, not a display label; never logged).

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Wave-0 seat-claim tests RED** - `d2ea876` (test)
2. **Task 2: implement claimSeat + tokens to GREEN; mutation-verify** - `e5f5a08` (feat)

**Plan metadata:** this commit (docs: complete plan)

_Note: the race gate (`seat-claim-race.test.ts`) inlines the seat-claim SQL and so was GREEN from the outset — exactly like `exclusion-race.test.ts` is green against the shipped constraint. Its non-vacuousness is established by the Task-2 mutation, not by an initial RED. The two functional files (`seat-claim.test.ts`, `rsvp-identity.test.ts`) were genuinely RED at Task 1 (claimSeat not yet implemented) and GREEN after Task 2._

## Files Created/Modified
- `src/lib/group/seat-claim.ts` - `claimSeat` — the `db.transaction` with `SELECT capacity_snapshot ... FOR UPDATE`, count-under-lock, single-path de-dup, snapshot-only cap, bounded 40P01 retry; emits NO notification inside the tx.
- `src/lib/group/token.ts` - `makeInviteToken`/`makeManageToken` — ~100-bit crypto Crockford bearer credentials over `randomBytes(20)`.
- `tests/group/seat-claim-race.test.ts` - the D-112 acceptance gate: two-connection `makeRacingClients` + `client.begin` per racer, snapshot=1/3-racers and snapshot=2/4-racers.
- `tests/group/seat-claim.test.ts` - toggle/free/re-claim (D-113), already-yes no-op (D-120), partial-RSVP-valid, snapshot-not-live (D-111).
- `tests/group/rsvp-identity.test.ts` - name-only guest, account/email single-path de-dup, name-only NOT de-duped (D-116/D-117).

## FOR UPDATE Mutation-Verification (the phase acceptance gate)

| Step | State of `seat-claim-race.test.ts` |
|------|------------------------------------|
| Baseline (with `FOR UPDATE`) | GREEN — snapshot=1 → exactly 1 `'yes'`; snapshot=2 → exactly 2 |
| Mutation (delete `FOR UPDATE` from the inlined lock) | RED — 4/4 racers committed `'yes'` at snapshot=2 (`expected 2, got 4`); overflow at snapshot=1 too |
| Restore (`FOR UPDATE` back) | GREEN — 11/11 group tests pass |

This proves the row lock — not app code — is the sole no-overflow authority (D-112). `grep -c "FOR UPDATE" src/lib/group/seat-claim.ts` = 3 (present in the production claim).

## Decisions Made
- Followed the plan and RESEARCH §Pattern 1 as specified. The seat-claim `FOR UPDATE` SELECT also filters `voided_at IS NULL`, so a missing OR voided group fails closed (courtesy `{ok:false, reason:"full"}`) rather than over-capping — the plan's "missing/voided" fail-closed requirement.
- The `UPDATE rsvp` in the toggle path sets `updated_at = now()` explicitly (raw `sql` bypasses Drizzle's `$onUpdate`), keeping the column meaningful for the toggle lifecycle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Simplified race-test result filters to clear the tsc gate**
- **Found during:** Task 2 (the `npx tsc --noEmit` acceptance gate)
- **Issue:** The race test's `filter` used an explicit type-predicate `r is PromiseFulfilledResult<{ claimed: true; id: string }>`, but `randomUUID()` gives `id` the template-literal type `` `${string}-${string}-...` ``, so `string` was not assignable — TS2677 at two sites.
- **Fix:** Replaced the predicate filters with `results.filter((r) => r.status === "fulfilled" && r.value.claimed === true).length` and `expect(...).toBe(1|2)` (discriminated-union narrowing, no predicate). Assertion strength is unchanged.
- **Files modified:** tests/group/seat-claim-race.test.ts
- **Verification:** `npx tsc --noEmit` clean; `npx eslint src/lib/group/ tests/group/` clean; 11/11 group tests GREEN; mutation still turns the gate RED.
- **Committed in:** `e5f5a08` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — a test-only type fix on code authored this plan)
**Impact on plan:** Cosmetic type-predicate change on a test I wrote; no behavior change, no scope creep. All money/booking/payment code untouched (D-107).

## Issues Encountered
- `gsd-sdk` (v1.42.3) rejected positional args for `state.record-metric` and `state.add-decision` (the known string-arg quirk); both succeeded with `--flag` form. No impact on artifacts.

## Threat Flags
None — no new security surface beyond the plan's `<threat_model>`. T-08-03 (cap overflow) is mitigated and mutation-verified; T-08-04 (token disclosure) is mitigated by the ~100-bit crypto token; T-08-05 (host lowers capacity) is mitigated by the snapshot-only cap. No packages added (T-08-SC accept).

## Known Stubs
None — both modules are fully wired. (No UI or notification emission is in scope for this plan; the post-commit emit is the caller's job in 08-06, and the invite route consumes the tokens in 08-05 — these are documented sequencing, not stubs.)

## User Setup Required
None - no external service configuration required (D-107 adds no payment mechanism; Postgres is already up).

## Next Phase Readiness
- `claimSeat` and the token minters are ready for 08-05 (invite/RSVP route) and 08-06 (post-commit notifications). The caller must emit any organizer/attendee notification AFTER `claimSeat` returns (post-commit, never inside the tx) — enforced by the `emitNotify` contract.
- The seat-claim reads `capacity_snapshot`; 08-03 (group creation) must snapshot `listing.maxOccupancy` onto the group inside its creation tx (D-111).
- No blockers.

## Self-Check: PASSED
- Files: FOUND src/lib/group/seat-claim.ts, src/lib/group/token.ts, tests/group/{seat-claim-race,seat-claim,rsvp-identity}.test.ts
- Commits: FOUND d2ea876 (test), e5f5a08 (feat)
- Gates: 11/11 group tests GREEN; `tsc --noEmit` clean; `eslint` clean; FOR UPDATE mutation RED→restore→GREEN confirmed

---
*Phase: 08-group-bookings*
*Completed: 2026-07-27*
