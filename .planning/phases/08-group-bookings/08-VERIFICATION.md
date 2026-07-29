---
phase: 08-group-bookings
verified: 2026-07-29T11:40:00Z
status: passed
score: 5/5 must-haves verified (0 partial, 0 failed)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "2/5 truths fully clean (3/5 partial with BLOCKER defects) — 2026-07-28 verification, covering only plans 08-01…08-09"
  gaps_closed:
    - "CR-02 (stale checkout session leaks a second payable session on re-price) — closed 08-12/08-13, hardened further by 08-18/08-19/08-21"
    - "CR-03 (declaredPax unclamped, could overflow pricing/int4) — closed 08-10"
    - "CR-04 (unbounded rate-limit Map, token-keyed DoS) — closed 08-11"
    - "WR-03/WR-04 (organizer seat not reserved in capacity_snapshot, off-by-one over-occupancy) — closed 08-14"
    - "CR-01 (full_day not persisted, mislabeled time surfaces) — closed 08-15"
    - "deferred-items.md item 5 — confirmBooking double-charge BLOCKER (found live in 08-17 human UAT, PayMongo does not honor Idempotency-Key on POST /v1/checkout_sessions) — closed 08-18 (expire-before-create, fail-closed) + proven against the REAL PayMongo API by 08-19 (independently re-run during this verification, 4/4 passed live)"
    - "deferred-items.md item 6 — CR-02's live re-price assertion never human-exercised — proven end-to-end against the real API by 08-19 case 3 (independently re-run, PASS)"
    - "deferred-items.md item 7 — included >= maxOccupancy silently yields zero surcharge (revenue-loss) — closed 08-20 (publishSchema.superRefine + wizard copy)"
    - "Three false idempotency comments (booking.ts x2, paymongo.ts x1) asserting PayMongo collapses duplicate checkout POSTs — corrected 08-18, verified absent from src/ and tests/"
    - "08-19's own NEW finding — a repeat expireCheckoutSession call returns HTTP 400 'already expired' (not the assumed 200-replay), creating a recovery-path livelock and two more false comments — closed 08-21 (idempotent expireCheckoutSession, fail-closed preserved for genuine failures), independently re-run live and confirmed"
  gaps_remaining: []
  regressions: []
---

# Phase 8: Group Bookings Verification Report

**Phase Goal:** The differentiator — an organizer who has paid for a booking can invite people via a shareable link or email, attendees confirm attendance without needing a full account, and the organizer sees a live headcount validated against the listing's capacity. RSVP is informational coordination layered on a normal paid booking; it never touches the occupancy constraint and never becomes per-attendee payment.

**Verified:** 2026-07-29
**Status:** passed
**Re-verification:** Yes — after gap closure (08-18, 08-19, 08-20, 08-21), following the 2026-07-28 `gaps_found` verification and the 08-17 human-UAT double-charge discovery

## Scope of This Verification

This re-verification is scoped, per the orchestrator's request, to whether the phase is now **closeable**: whether the 08-17 UAT's live double-charge BLOCKER and `deferred-items.md` items 5/6/7 are genuinely closed in the codebase, whether the money-path fix is fail-closed, and whether the mandatory real-API evidence (not a mock) actually exists and actually ran. It also spot-checks (not fully re-litigates) that the earlier-wave closures (CR-01…CR-04, WR-03/WR-04) that the first `gaps_found` verification blocked on are still standing, since "closeable" means the whole phase, not just the last four plans, holds together.

**Method:** every claim below was checked against the current codebase by direct file read, `grep`, and by independently re-running the test suite, `tsc`, `npm run build`, and — critically — **the gated real-PayMongo-API probe itself**, live, during this verification session (not just trusting the executors' recorded transcripts).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | SC1 — Organizer can create a group booking on a paid booking, invite via link/email, and **the organizer pays the full booking exactly once** (money correctness, including the per-head-priced path) | ✓ VERIFIED | `createGroup`/invite path unchanged and previously verified (08-07/08-08/08-09). The money-correctness half — the open BLOCKER from the prior verification — is now closed: `confirmBooking` (`src/app/actions/booking.ts:485-714`) reads `booking.checkoutSessionId` and, if non-null, calls `expireCheckoutSession` BEFORE `createCheckoutSession` (line 613-625 precedes line 661), for flat AND per-head bookings alike. A thrown expire REFUSES (fail-closed) with a `checkout_expire_failed`/`needs_attention` audit, never leaking a second payable session. Verified by direct code read, by an independently re-run `tests/booking/confirm-double-submit.test.ts` (5/5 pass), and by an independently re-run REAL PayMongo API test (see Behavioral Spot-Checks) that falsifies the exact belief that shipped the bug. |
| 2 | SC2 — Invited attendees can RSVP yes/no via a scoped invite token without an account | ✓ VERIFIED (unchanged since 08-09, not touched by the gap plans) | `/invite/[token]/page.tsx` + `submitRsvp` — no gap plan modified this surface; regression-checked via the full suite staying green. |
| 3 | SC3 — Organizer can see confirmed headcount and who is coming | ✓ VERIFIED (unchanged since prior closure) | `HeadcountMeter`/`AttendeeRoster` — not touched by the gap plans; regression-checked via the full suite. |
| 4 | SC4 — Confirmed RSVPs hard-capped at the listing's capacity (atomic, no overflow); organizer's own seat is reserved | ✓ VERIFIED (closed by 08-14, confirmed still standing) | `src/app/actions/group.ts:281` sets `capacity_snapshot = GREATEST(l.max_occupancy - 1, 0)` — the organizer's seat is now reserved out of the RSVP cap (the WR-03 off-by-one from the prior verification). Confirmed by direct code read. |
| 5 | A per-head surcharge configuration can never silently collect nothing (deferred item 7 — revenue-loss path) | ✓ VERIFIED | `src/lib/validation/listing.ts:107-124` — `publishSchema.superRefine` rejects `extraHeadFee > 0 && (included ?? 1) >= maxOccupancy` with an issue on `included`; flat listings (fee 0/absent) and `draftSchema` are explicitly exempt. Wizard copy at `wizard.tsx:808` states the rule with the interpolated cap. `tests/validation/listing-schema.test.ts` (24 tests) independently re-run, all pass. |

**Score:** 5/5 truths verified. No partial, no failed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/actions/booking.ts` — `confirmBooking` expire-before-create gate | Retires any session the booking row already names before minting a new one; fail-closed on throw | ✓ VERIFIED | Read in full (lines 485-714). `checkoutSessionId` added to the owner-gated SELECT (:506); gate at :613-625, strictly before `createCheckoutSession` at :661; catch records `checkout_expire_failed`/`needs_attention` and refuses with no leaked PayMongo text. Not conditional on `declared_pax` — flat and per-head both pass through it. |
| `src/lib/paymongo.ts` — three false comments corrected | State the probed truth, not the falsified belief | ✓ VERIFIED | `grep` for all three original false phrases (`collapses a double-click`, `still resolves to the same key and the same session`, `can't create a second charge`) across the ENTIRE `src/` and `tests/` trees returns zero matches. The truth (`does NOT honor`, `not honored on checkout-session creation`) is present in both files. |
| `src/lib/paymongo.ts` — `expireCheckoutSession` idempotent on repeat expire | Tolerates PayMongo's `400 "already expired"` as success; genuine failures (500, network, other 4xx) still throw | ✓ VERIFIED | Read in full (lines 248-277). The catch matches `/\(400\)/` AND `/already\b.*\bexpired/i` — both conditions required — then returns `{ id }`; any other error `throw err`s unchanged. This is a narrow, correctly-scoped tolerance, not a blanket swallow. |
| `src/lib/paymongo.ts` — `getCheckoutSession(id)` | GET read primitive so the harness can prove a session's provider-side status | ✓ VERIFIED | Present (lines 279-291+), thin GET, throws through `paymongoFetch` on non-2xx as documented. Not added to `tests/helpers/mocks.ts` (confirmed no production caller uses it) — correct per plan. |
| `src/lib/validation/listing.ts` — `publishSchema.superRefine` (surcharge reachability) | Rejects `included >= maxOccupancy` when `extraHeadFee > 0`; exempts flat listings and `draftSchema` | ✓ VERIFIED | Read in full. `superRefine` count = 1, positioned after `publishSchema`, none between `draftSchema` and `publishSchema`. Coalescing (`included ?? 1`, `extraHeadFee ?? 0`) matches `paxSurcharge` in `pricing.ts` exactly. |
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — Group-pricing copy | States the `included < maxOccupancy` rule at configuration time | ✓ VERIFIED | Line 808: "...exceeds capacity, the extra guest fee can never apply." present inside the fee>0-gated block. |
| `tests/booking/confirm-double-submit.test.ts` | Mutation-proven DB regression (5 cases): expire-before-create, flat+per-head, fail-closed refuse, fresh-hold no-op, not-trapped recovery | ✓ VERIFIED, WIRED | 329 lines. Independently re-run: 5/5 pass. Mutation-verify narrative in 08-18-SUMMARY.md matches the code structure read directly (case (4) is the only one structurally immune to the gate's removal, exactly as claimed). |
| `tests/paymongo/checkout-idempotency-real.test.ts` | The mandatory REAL-API proof (deferred item 5's blocking constraint) — gated `RUN_LIVE_PAYMONGO_PROBE=1` | ✓ VERIFIED, WIRED, **INDEPENDENTLY RE-RUN LIVE** | 137 lines, 4 cases. Default run (opt-in unset, even with `.env.local`'s real `sk_test_` key present): SKIPPED, 0 failures — confirmed by this verifier directly. Opted-in run (`RUN_LIVE_PAYMONGO_PROBE=1`), run by THIS VERIFIER independently (not just trusting the SUMMARY): **4/4 PASSED against `https://api.paymongo.com`**, producing fresh distinct session ids on every run (different from both 08-19's and 08-21's recorded transcripts, as expected from genuine live API calls). See Behavioral Spot-Checks below. |
| `tests/payments/paymongo-calls.test.ts` — idempotent-expire fetch-stub unit proof | 4 cases (already-expired resolves, other-400 throws, 500 throws, 200 resolves), mutation-pinned | ✓ VERIFIED, WIRED | Independently re-run as part of a combined run: all pass (48 tests total across the 4 files run together). |
| `tests/validation/listing-schema.test.ts` — surcharge-reachability cases | Reject/accept/flat-exemption/draft-permissive, mutation-pinned at the `>=` boundary | ✓ VERIFIED, WIRED | Independently re-run, passes. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `confirmBooking` | `expireCheckoutSession` | owner-gated read of `checkoutSessionId`, expired BEFORE `createCheckoutSession` | ✓ WIRED | Confirmed by line-number ordering in the actual file (613 before 661), not just the plan's claim. |
| `confirmBooking` (expire failure) | `recordAudit checkout_expire_failed / needs_attention` | try/catch around `expireCheckoutSession` → refuse + audit | ✓ WIRED | Confirmed at :616-624; response contains no PayMongo text. |
| `expireCheckoutSession` catch | idempotent tolerate-on-already-expired | regex match on `(400)` AND `already...expired` | ✓ WIRED | Confirmed at paymongo.ts:259-276; the `throw err` fallback for every other error is present and unconditional. |
| `confirmBooking` / `updateDeclaredPax` NOT-TRAPPED RECOVERY | the now-idempotent `expireCheckoutSession` | a repeat expire on the retry resolves instead of throwing | ✓ WIRED | `updateDeclaredPax`'s own expire block (booking.ts:421-438) was NOT modified by 08-21 and needed no changes — it transparently inherits the primitive's new tolerance, exactly as the plan intended. Confirmed by direct read: no stale/false claims remain in this block either. |
| `publishSchema` | `publishListing` server action | `publishSchema.safeParse(persisted row)` | ✓ WIRED | Pre-existing wiring (src/app/actions/listing.ts:227), unmodified — the new `superRefine` issue surfaces automatically as `fieldErrors.included`. |

### Data-Flow Trace (Level 4)

Not applicable in the traditional sense (no dynamic-data-rendering component was added by these gap plans). The equivalent trace here is the money-path data flow through `confirmBooking`: `booking.checkoutSessionId` (DB) → expire-before-create gate → `createCheckoutSession` → `booking.checkoutSessionId` re-written. Traced by direct read, confirmed non-hollow: the SELECT genuinely reads the persisted column, the gate genuinely branches on it, and the final `UPDATE` genuinely re-persists the new session id before the redirect throws.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `tsc` type-checks the whole project | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Full test suite is green at the claimed baseline | `npx vitest run` | **97 files / 855 tests passed, 1 file / 4 tests skipped, exit 0** | ✓ PASS — matches 08-21-SUMMARY.md's claimed baseline exactly |
| Production build succeeds | `npm run build` | exit 0, all routes compile including `/bookings/[id]/group`, `/invite/[token]`, `/api/paymongo/webhook` | ✓ PASS |
| No schema drift | `npx drizzle-kit generate` | "No schema changes, nothing to migrate" | ✓ PASS |
| Lint at claimed baseline | `npm run lint` | 0 errors / 7 pre-existing warnings (React Compiler `watch()` + unused mock params, unrelated to this phase) | ✓ PASS |
| **Real-API test skips by DEFAULT even with a live `sk_test_` key present** | `npx vitest run tests/paymongo/checkout-idempotency-real.test.ts` | 1 file / 4 tests SKIPPED, exit 0 | ✓ PASS — the load-bearing offline-by-default proof, confirmed directly by this verifier |
| **THE mandatory real-API proof — independently re-run LIVE by this verifier, not merely trusted from the SUMMARY** | `RUN_LIVE_PAYMONGO_PROBE=1 npx vitest run tests/paymongo/checkout-idempotency-real.test.ts --reporter=verbose` | **4/4 PASSED against `https://api.paymongo.com`.** Case 1: `s1=cs_04277bdf60c40dfda6c23947 s2=cs_053fd4976fe72b1f815e64e2` (different ids from a byte-identical key+body — falsifies the belief that shipped the bug). Case 2: `pre-expire status=active` → `post-expire status=expired`. Case 3: `superseded=cs_67f141f8…:expired replacement=cs_6d1a4f05…:active` (re-price supersession, CR-02's live assertion). Case 4: repeat expire of `cs_27855fcc…` RESOLVED (the 08-21 fix tolerating the live 400). | ✓ PASS — **this is fresh, independently-obtained provider evidence**, distinct from both 08-19's and 08-21's own recorded session ids, obtained during this verification session |
| Isolated re-run of the 5 gap-closure test files together | `npx vitest run tests/booking/confirm-double-submit.test.ts tests/payments/paymongo-calls.test.ts tests/validation/listing-schema.test.ts tests/booking/checkout-session-expire.test.ts` | 4 files / 48 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| GROUP-01 | 08-01, 08-03, 08-06, 08-07, 08-18, 08-19, 08-20, 08-21 | Organizer creates group on a paid booking, pays full amount exactly once | ✓ SATISFIED | The money-correctness BLOCKER (CR-02's residual + the 08-17 double-charge) is now closed and proven live against the real API. REQUIREMENTS.md already marks this row "Complete" (Phase 8) — that claim is now fully supported, not just aspirational. |
| GROUP-02 | 08-06, 08-07, 08-08 | Invite via shareable link and/or email | ✓ SATISFIED (unchanged, not in gap-plan scope) | |
| GROUP-03 | 08-02, 08-06, 08-08 | Attendees RSVP without a full account | ✓ SATISFIED (unchanged, not in gap-plan scope) | |
| GROUP-04 | 08-06, 08-07 | Organizer sees confirmed headcount and who is coming | ✓ SATISFIED (WR-03/WR-04 closed by 08-14, confirmed still standing) | |
| GROUP-05 | 08-01, 08-02, 08-06, 08-20 | Confirmed headcount validated against listing capacity | ✓ SATISFIED | Core seat-claim mechanism unchanged and previously verified; 08-20's requirements-frontmatter inclusion of GROUP-05 is a loose association (its actual subject is surcharge *pricing* reachability, not RSVP-capacity validation) — noted as a minor scope-labeling imprecision in the plan's frontmatter, not a functional gap, since GROUP-05's underlying mechanism (seat-claim) was untouched by 08-20 and remains independently correct. |

REQUIREMENTS.md marks all five GROUP-0X rows "Complete" — this verification now finds that claim **fully supported**, including the money-correctness half of GROUP-01 that the 2026-07-28 verification and the 08-17 UAT found broken.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | A targeted `grep` for the historically-false claims, TODO/FIXME/placeholder markers in the touched files, and empty-implementation patterns in the four gap plans' modified files returned nothing live in the shipped code. |

Two informational (non-blocking) documentation-sync notes, not code anti-patterns:

- `ℹ️ INFO` — `.planning/phases/08-group-bookings/deferred-items.md`'s own top-of-file preamble and item 5/6/7 headers still read "OPEN" / "the inputs to the next gaps plan" — this file is explicitly orchestrator-owned and every one of 08-18/19/20/21 deliberately did not edit it (documented in each SUMMARY's key-decisions). The code-level closure is real; this tracking doc needs a follow-up edit to mark items 5, 6, 7 CLOSED with commit references, mirroring how items 1, 3, 4 are already annotated.
- `ℹ️ INFO` — `.planning/ROADMAP.md`'s Phase 8 plan list still shows `08-18`/`08-19`/`08-20` as unchecked `[ ]` and does not yet list `08-21` at all (it was created after the plan-checker pass that produced the current Wave 10/11 listing). `.planning/STATE.md`'s `stopped_at` narrative and `completed_phases: 7` are still the pre-gap-closure snapshot. Both files are explicitly orchestrator-owned per this verification's instructions and were correctly left untouched by every gap plan and by this verifier.

### Human Verification Required

None required to close this phase. The specific constraint that gated closure — ".continue-here.md: any fix for item 5 must include a test that drives the REAL API — a mock is not evidence" — asks for a real-API test, not a browser click-through re-enactment of the 08-17 UAT. That test exists, was run by the executors (verbatim transcripts in 08-19-SUMMARY.md and 08-21-SUMMARY.md), and was **independently re-run live by this verifier** during this session with a fresh, distinct set of session ids — the strongest form of evidence available for a third-party API behavioral claim.

One **optional, non-blocking** recommendation for extra confidence before a production launch (not required to close Phase 8): a human re-walkthrough of the exact 08-17 double-submit choreography (Confirm & pay → new tab → Confirm & pay again → return to the first tab and attempt to pay) against the running app, to visually confirm PayMongo's *hosted checkout page* itself refuses payment on the now-expired first session (the API-level proof that the session's `status` flips to `expired` is conclusive at the API layer; the hosted-page UX reaction to that was not independently re-observed in a browser this session).

### Gaps Summary

None. Every truth, artifact, and key link the phase's own blocking constraint named is verified present, substantive, and wired — and, for the one claim that mattered most (does the real PayMongo API actually behave as the fix assumes), this verifier did not rely on the executors' recorded transcript alone: the exact same gated, self-cleaning, DB-free real-API test was re-run live during this verification and reproduced the same class of result with entirely fresh, independently-obtained evidence (four brand-new session ids never seen in any prior SUMMARY).

The chain of discovery-and-fix is unusually well-documented and self-correcting: 08-18 shipped the production fix with a mock-backed regression (explicitly scoped as *not* proof); 08-19 proved the fix against the real API and, in doing so, discovered a NEW defect the fix itself introduced (the repeat-expire livelock); 08-21 closed that NEW defect at the shared primitive with zero caller-code changes, re-proved it live, and corrected the two new false comments that would otherwise have shipped. No shipped comment anywhere in `src/` or `tests/` asserts a provider behavior that has been disproven by direct probe. The fail-closed guarantee (a genuine expire failure still refuses and audits) is intact and was not weakened by the idempotency fix — verified by reading the exact regex match condition, not inferred from the SUMMARY's narrative.

Earlier-wave closures that the original `gaps_found` verification blocked on (CR-01 persisted `full_day`, CR-02 stale-session, CR-03 unclamped `declaredPax`, CR-04 unbounded rate-limit map, WR-03/WR-04 organizer-seat off-by-one) were spot-checked directly in the current codebase during this session and are still standing — this is a genuinely closeable phase, not just four isolated plans layered on top of an otherwise-unverified base.

**Recommendation: Phase 8 is closeable.** The orchestrator should update `deferred-items.md` (mark items 5, 6, 7 CLOSED with the closing commits: `d33c7a3`/`0e28968` for item 5's fix, `efb7c19`/`54ffc6f` for item 5's real-API proof and item 6, `03aefd7`/`9ef5e15` for item 7, `3ddb96d`/`73a18f3` for the 08-19-discovered livelock hardening), `ROADMAP.md` (check off 08-18/08-19/08-20, add 08-21 to the plan list), and `STATE.md` (`completed_phases: 8`, refresh `stopped_at`) — none of which this verifier modified, per instructions.

---

_Verified: 2026-07-29_
_Verifier: Claude (gsd-verifier)_
