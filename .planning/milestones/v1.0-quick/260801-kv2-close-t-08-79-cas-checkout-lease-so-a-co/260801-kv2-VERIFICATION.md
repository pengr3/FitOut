---
phase: quick-260801-kv2
verified: 2026-08-01T09:10:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Quick Task 260801-kv2: Close T-08-79 — Verification Report

**Task Goal:** Close T-08-79 — two concurrent `confirmBooking` calls for one booking could each mint a
payable PayMongo checkout session, so a booker could be charged twice. A compare-and-swap "checkout in
flight" lease must make that impossible, WITHOUT holding any DB lock across the external PayMongo HTTP
round-trips.

**Verified:** 2026-08-01
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from PLAN.md `must_haves.truths`)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Two genuinely concurrent claim attempts for one holdId can never both reach PayMongo; proven over independent Postgres connections, mutation-measured at pattern + shipped layers | VERIFIED | `tests/booking/checkout-lease-race.test.ts` Layer 1 (`raceInlinedClaim`, cases 1-2, inlined CAS, autocommit tagged template) and Layer 2 (`realClaim` → `claimCheckoutLease` via `drizzle(client)`, cases 3-8) each fire over `makeRacingClients(schema, 3)` — 3 independent postgres.js connections (`max:1` each, own backend). Read `tests/helpers/db.ts:59-67` confirms genuine independent connections, not a shared max:1 client. MUTATION 1 (inlined predicate) and MUTATION 2a/2b/2c (production predicate, TTL half, owner term) were each applied; verbatim RED output recorded in the file header (lines 51-72) and independently sound: predicted vs observed match for all four (M1→{1,2}, M2a→{3,4,5}, M2b→{4}, M2c→{7}). The call-site half (does the loser actually get refused before PayMongo) is separately proven in `tests/booking/confirm-double-submit.test.ts` case (6) + MUTATION A. |
| 2 | No DB lock held across any PayMongo HTTP round-trip; claim is one autocommit UPDATE, `confirmBooking` opens no transaction | VERIFIED | Grep gate (re-run independently): `grep -vE '^[[:space:]]*(//\|/\*\|\*)' src/app/actions/booking.ts \| grep -qEi '\.transaction\(\|for update\|pg_(try_)?advisory_[a-z_]*lock[a-z_]*\('` → clean; same gate on `checkout-lease.ts` → clean. `claimCheckoutLease`/`releaseCheckoutLease` (`checkout-lease.ts:83-118, 130-143`) use `dbConn.update(...).set(...).where(...).returning(...)` — a single Drizzle statement, no `.transaction(`, no `FOR UPDATE`. Behaviourally proven by confirm-double-submit case (10): an independent `FOR UPDATE NOWAIT` probe resolves immediately after a successful `confirmBooking` flow, with an in-test instrument check proving the probe genuinely detects a held lock (`55P03`) when one exists. |
| 3 | A crashed/abandoned attempt self-heals past `CHECKOUT_LEASE_TTL_SECONDS` with no operator action | VERIFIED | Race case (4) (SHIPPED claim, stale lease, 3 racers, exactly one re-claims) and confirm case (7) (stale lease → `confirmBooking` proceeds and clears it). `CHECKOUT_LEASE_TTL_SECONDS = 90` exported from `src/lib/payments/config.ts:120-122`, bound into `make_interval(secs => ...::int)` at `checkout-lease.ts:110`. |
| 4 | Every exit path of `confirmBooking` leaves a defined lease state | VERIFIED | Read `src/app/actions/booking.ts:687-996` in full. Enumerated every `return`/`redirect` after the claim at line 825: loser refusal (836, never released — structurally can't be, no `lockedAt`), expire-failure catch (897, `releaseCheckoutLease` at 896), create-failure catch (959, `releaseCheckoutLease` at 958), success (995, lease cleared in the *same* `.set()` at 983 that names `checkout_session_id`). No other `return`/`redirect` exists between line 825 and 996 (confirmed via full-file grep for `return {`/`redirect(`). The already-confirmed short-circuit (line 725) sits *before* the claim, so it is unreachable after it. Process-death is the only path relying on the TTL, matching the contract. |
| 5 | A racer that loses the claim cannot release the winner's lease | VERIFIED | `releaseCheckoutLease(dbConn, holdId, lockedAt)` requires `lockedAt: Date` as a mandatory parameter (`checkout-lease.ts:130-134`); `CheckoutLeaseClaim = {claimed:true, lockedAt} \| {claimed:false}` (line 72) gives a loser no timestamp to pass. Confirmed structurally in `booking.ts:826-837` — the refusal branch returns immediately without calling `releaseCheckoutLease`. Race case (6) additionally proves an overtake guard: releasing with a stale/different timestamp leaves a fresh lease untouched. |
| 6 | The refused booker sees one calm sentence, defined exactly once, rendered inline, page does NOT flip to hold-expired | VERIFIED | `grep -rn "We're already starting checkout" src/` → exactly 1 hit (`checkout-lease.ts:65`). `reserve-actions.tsx` renders `result.error` inline as `role="status"` (lines 90-94) — does not import `CHECKOUT_IN_FLIGHT_MESSAGE` (grep-confirmed clean on executable lines). `reserve-view.tsx:46` `handleResult` condition lists only `"expired" \| "denied" \| "checkout"` — `"in-flight"` is absent, confirmed by direct read. `tests/booking/reserve-actions.test.tsx` (3 jsdom cases) proves the sentence renders, the CTA re-enables, `checkout` reason does NOT render a notice, and a second attempt clears the prior notice. |
| 7 | The sequential expire-before-create guard is byte-unchanged in behaviour, its five existing cases still pass | VERIFIED | `tests/booking/confirm-double-submit.test.ts` cases (1)-(5) read unedited except the `readRow` helper gaining the `checkoutLockAt` column (line 136) — no assertion logic changed. Already-established baseline: `npx vitest run` → 1112 passed / 4 skipped / 0 failures (was 1096/4 before this task), consistent with all pre-existing cases plus the ~16 new ones passing. |
| 8 | No comment in `booking.ts` or `paymongo.ts` still claims the concurrent double-click is an accepted residual | VERIFIED | `grep -iE 'accepted residual\|CONCURRENCY RESIDUAL' src/app/actions/booking.ts src/lib/paymongo.ts` → no matches (re-run independently). Both files instead state the closure positively: `booking.ts:816-882` (lease claim comment + corrected D-108 comment at 917-918) and `paymongo.ts:173-181` (corrected docblock naming the CAS lease). |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/payments/checkout-lease.ts` | CAS lease authority: claim, scoped release, refusal copy; ≥70 lines | VERIFIED | 144 lines. Exports `claimCheckoutLease`, `releaseCheckoutLease`, `CHECKOUT_IN_FLIGHT_MESSAGE`, `CheckoutLeaseClaim` exactly as specified. Header documents the design decision (column vs advisory lock) and the READ COMMITTED/EvalPlanQual fact. |
| `src/lib/payments/config.ts` | `CHECKOUT_LEASE_TTL_SECONDS` | VERIFIED | Present at line 120-122, `Math.round(Number(process.env.CHECKOUT_LEASE_TTL_SECONDS ?? 90))`, with two-directional (floor/ceiling) justification docblock. |
| `drizzle/0023_booking_checkout_lease.sql` | Additive `ADD COLUMN booking.checkout_lock_at timestamptz` | VERIFIED | Exactly one `ALTER TABLE "booking" ADD COLUMN "checkout_lock_at" timestamp with time zone;` anchored at line start (line 16), preceded by a header comment only. |
| `src/lib/db/schema.ts` | `booking.checkoutLockAt` column + docblock | VERIFIED | Column at line 753, immediately after `checkoutSessionId` (line 718), with a full docblock covering the advisory-lock disqualification, TTL self-heal, and occupancy-inertness claims. |
| `tests/booking/checkout-lease-race.test.ts` | 8-case two-connection race proof, ≥200 lines | VERIFIED | 415 lines. Layer 1 (cases 1-2, inlined CAS) + Layer 2 (cases 3-8, shipped module) over `makeRacingClients`. Every case reads the committed column via an independent connection first. |
| `tests/booking/confirm-double-submit.test.ts` | Call-site proof, contains `checkout_lock_at` | VERIFIED | Second `describe` block (cases 6-10) added; `checkout_lock_at` referenced in `setLease` helper and `readRow`. Cases (1)-(5) unedited beyond the `readRow` column addition. |
| `src/app/actions/booking.ts` | Lease claim + 2 releases + corrected comments, contains `claimCheckoutLease` | VERIFIED | Claim at line 825 (immediately before the `EXPIRE-BEFORE-CREATE` block at 839), releases at 896 and 958, success-path clear folded into the `.set()` at 983. |
| `src/components/booking/reserve-actions.tsx` | Inline notice from `result.error`, never a re-typed literal | VERIFIED | `notice` state set from `result.error` on `reason === "in-flight"` (line 63), rendered as `role="status"` (lines 90-94). No import of `checkout-lease` module (grep-confirmed). |
| `tests/booking/reserve-actions.test.tsx` | Component proof: inline render, not an expiry | VERIFIED | 3 jsdom cases (in-flight renders + CTA re-enables; `checkout` reason renders nothing; a second attempt clears the prior notice). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `booking.ts` | `checkout-lease.ts` | `claimCheckoutLease(db, {holdId, bookerId: userId})` immediately before expire-before-create | WIRED | Confirmed at `booking.ts:825`, directly above the `EXPIRE-BEFORE-CREATE` comment block at 839. |
| `booking.ts` | `checkout-lease.ts` | `releaseCheckoutLease(db, holdId, lockedAt)` on both refusal paths | WIRED | Confirmed at `booking.ts:896` (expire-failure) and `:958` (create-failure). Independent grep count: `claimCheckoutLease` = 2 executable-line refs, `releaseCheckoutLease` = 3 (import + 2 calls) — matches the plan's own gate expectation. |
| `checkout-lease.ts` | `config.ts` | `CHECKOUT_LEASE_TTL_SECONDS` bound into `make_interval` | WIRED | Confirmed at `checkout-lease.ts:110`, `::int` cast on the interval bind per the `units.ts` idiom. |
| `checkout-lease-race.test.ts` | `checkout-lease.ts` | `makeRacingClients` → `drizzle(client)` → `claimCheckoutLease`, one connection per racer | WIRED | Confirmed in `realClaim` (test file lines 164-169); `makeRacingClients` (`tests/helpers/db.ts:59-67`) genuinely opens `n` independent `max:1` postgres.js connections. |
| `reserve-actions.tsx` | `ConfirmResult` | `reason === "in-flight"` renders `result.error` inline, re-enables CTA | WIRED | Confirmed at `reserve-actions.tsx:63-66`; `reserve-view.tsx:46` confirmed to exclude `"in-flight"` from the whole-page-flip condition. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `reserve-actions.tsx` `notice` | `result.error` from `confirmBooking()` | `CHECKOUT_IN_FLIGHT_MESSAGE` constant, returned server-side from `checkout-lease.ts` via `booking.ts:836` | Yes — server-computed literal, never client-hardcoded | FLOWING |

### Behavioral Spot-Checks

Not run as separate ad-hoc commands — this task's verification is dominated by the mutation-measured
test suites themselves, which are stronger evidence than a spot-check. Re-ran the documented grep/gate
commands independently (anti-pattern gates, wiring counts, literal-count gate, migration anchor, journal
entry count, byte-unchanged file diffs) — all reproduced the SUMMARY's claimed results exactly. See
Requirements Coverage / Key Link sections above for each.

### Probe Execution

Not applicable — this is not a migration/tooling phase with `scripts/*/tests/probe-*.sh` conventions;
the equivalent role is filled by the mutation-measured vitest suites, independently re-inspected above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| T-08-79 | 260801-kv2-PLAN.md | Concurrent double-click mints two payable PayMongo sessions | SATISFIED | Compare-and-swap lease shipped, race-proven, call-site-proven, exit-path-complete (see truths 1-5, 7 above). |
| v1.0-AUDIT-5 | 260801-kv2-PLAN.md | Milestone-audit finding #5 (Phase-8 accepted residuals) | SATISFIED | `.planning/v1.0-MILESTONE-AUDIT.md:266-269` updated to record T-08-79 closed 2026-08-01, T-08-74 and LW-01 left accurately open. |

No orphaned requirements — `.planning/REQUIREMENTS.md` has no entries for either ID, consistent with this
being a threat-register/audit-finding closure rather than a roadmap requirement.

### Anti-Patterns Found

None. Debt-marker scan (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`) on all created/modified files
in this task's `key-files` list came back clean; the only `XXX` hits were pre-existing occurrences of the
literal BIC code `PAEYPHM2XXX` in `src/lib/paymongo.ts`, unrelated to this task and not a debt marker.

### Human Verification Required

None. Every must-have truth is verifiable via code reading, grep gates, and the automated (already-passing)
test suites; the booker-facing UI behavior (inline notice, CTA re-enable, page not flipping to
hold-expired) is covered by `tests/booking/reserve-actions.test.tsx`'s jsdom-rendered assertions rather
than requiring a live browser check.

### Gaps Summary

No gaps. All 8 must-have truths, all 9 required artifacts (existence + substance + wiring), and all 5 key
links verified directly against the shipped code — not inferred from the SUMMARY. The two documented
"broader than predicted" mutation divergences (MUTATION B and D) were independently checked for internal
consistency: `tests/setup.ts:41-42` confirms a global `afterEach(() => resetMocks())`, and
`tests/helpers/mocks.ts:234-243` confirms `mockPayMongo.reset()` calls `.mockClear()` (which does NOT
flush a queued `mockResolvedValueOnce` — only `.mockReset()` would), which is exactly the mechanism the
SUMMARY cites for why a refused call's un-consumed queued session id leaked into later cases. The
divergences are genuine and honestly reported, not fabricated or reconciled away. MUTATION A's "disabled
guard rather than deleted call" choice was also checked: deleting the `claimCheckoutLease` call outright
would leave `lease.lockedAt` referenced-but-undefined at the two release call sites (`booking.ts:896`,
`:958`), which — given TypeScript's strict typing on `lease` — would not compile as a bare deletion; the
executor's chosen isolation (disable only the refusal effect) is the technically sound way to isolate case
(6) without collateral failures in cases (8)/(9), matching the reasoning given in the SUMMARY.

---

_Verified: 2026-08-01T09:10:00Z_
_Verifier: Claude (gsd-verifier)_
