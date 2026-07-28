---
phase: 08-group-bookings
verified: 2026-07-28T00:00:00Z
status: gaps_found
score: 3/5 must-haves fully verified (2 partially verified with confirmed BLOCKER defects)
overrides_applied: 0
gaps:
  - truth: "SC1 — organizer pays the full booking (money correctness on the pax-priced path)"
    status: partial
    reason: "The flat-rate (no per-head fee) group-booking path is fully correct and human-verified. The per-head-priced (extraHeadFee>0) path — which 08-03/08-05 built specifically to make GROUP-01's 'organizer pays the full booking' hold for group-sized bookings — has two independently code-confirmed BLOCKER defects from 08-REVIEW.md that remain unresolved (no gap-closure plan exists): CR-03 (declaredPax is never clamped at the placeHold entry point, so an attacker-shaped headcount multiplies straight into the frozen spacePriceCents/serviceFee/payout basis and can overflow an int4 column into a raw 500) and CR-02 (a re-priced hold mints a SECOND live, payable PayMongo checkout session that is never expired, so two payments can be captured for one booking with no refund/alert). Step 6 of the 08-09 human-verify checkpoint (the only place this path would have been exercised) was explicitly NOT run — the UAT fixture had no extra_head_fee set."
    artifacts:
      - path: "src/lib/validation/booking.ts:101"
        issue: "declaredPax: z.coerce.number().int().min(1).optional() has no .max() — confirmed in code, unbounded"
      - path: "src/lib/availability/units.ts:438-450"
        issue: "createPendingHold never selects listing.maxOccupancy and never clamps declaredPax before it enters quoteWindow — confirmed in code"
      - path: "src/app/actions/booking.ts:553-566"
        issue: "checkout.id from createCheckoutSession is discarded; no session is ever expired when a pax re-price mints a new amount-scoped idempotency key — confirmed in code"
    missing:
      - "Clamp declaredPax against listing.maxOccupancy inside createPendingHold's own transaction (mirrors the clamp updateDeclaredPax already has)"
      - "Add a .max() bound to bookingCreateSchema.declaredPax"
      - "Persist checkoutSessionId on booking and expire the superseded session before minting a new one on re-price, or revert to the stable per-booking idempotency key until that lands"
  - truth: "SC4 — Confirmed RSVPs are hard-capped at the listing's capacity (atomic, no overflow)"
    status: partial
    reason: "The atomic no-overflow mechanism itself (SELECT capacity_snapshot FOR UPDATE + count-under-lock) is genuinely race-free — confirmed by direct code read of src/lib/group/seat-claim.ts and by the 08-09 mutation-verification evidence. However capacity_snapshot is set to the listing's raw max_occupancy (src/app/actions/group.ts:242), and that number is then admitted entirely to RSVP rows, which structurally EXCLUDE the organizer (attendee-roster.tsx:33-35, 'THE ORGANIZER ROW IS NOT COUNTED HERE'). So on a maxOccupancy=12 listing, 12 attendees can RSVP yes AND the organizer attends, seating 13 people in a space rated for 12 — a real overflow of the room's physical capacity, even though the RSVP-row count never exceeds the snapshot. This is WR-03 in 08-REVIEW.md, confirmed by direct code read (group.ts:242, seat-claim.ts:80, attendee-roster.tsx:33-35, pax-stepper.tsx:125 which tells the organizer 'up to {maxOccupancy}, this includes you' — an inconsistent convention with the RSVP cap). WR-04 (the companion off-by-one in the over-RSVP nudge, top-up-nudge.tsx:60-62 vs rsvp.ts:408) means the nudge that would have surfaced this to the organizer stays silent on exactly the first over-subscription case."
    artifacts:
      - path: "src/app/actions/group.ts:242"
        issue: "capacity_snapshot = listing.max_occupancy (not max_occupancy - 1), so the organizer's own seat is not reserved out of the cap"
      - path: "src/components/group/attendee-roster.tsx:33-35"
        issue: "organizer row is a display fixture excluded from both the roster count and the seat-claim's admitted count, by explicit design comment"
      - path: "src/components/group/top-up-nudge.tsx:60-62"
        issue: "compares confirmedYes (excludes organizer) against declaredPax (includes organizer, per pax-stepper.tsx:125's own copy) — the nudge is silent on the exact case it exists to catch"
    missing:
      - "Pick one convention (D-113 says organizer is attendee #1) and apply it consistently: reserve the organizer's seat in capacity_snapshot (GREATEST(max_occupancy - 1, 0)) and pass the organizer-inclusive total to TopUpNudge"
deferred:
  - truth: "The shipped claimSeat FOR UPDATE lock has no mutation coverage — deleting it leaves the full 792-test suite green"
    addressed_in: "deferred-items.md item 4 (explicit /gsd:plan-phase 8 --gaps input, no later phase claims it)"
    evidence: "Measured directly in 08-09-SUMMARY.md Mutation A: production FOR UPDATE removed → tests/group/ stays GREEN 6/6, full suite stays GREEN. Functionality is correct today (byte-verified restored); this is a coverage gap, not a functional defect, already logged and not silently dropped. Not re-litigated here per the orchestrator's carry-forward instruction, but retained as WARNING context for the overall score."
human_verification:
  - test: "Pax-pricing surcharge UI end-to-end: set extraHeadFee>0 on a listing in the host wizard, book it, confirm the PaxStepper re-quotes server-side, the 'Extra guests' breakdown line appears, and the organizer's top-up nudge fires correctly"
    expected: "PaxStepper renders and re-quotes without client-side arithmetic; breakdown line matches server total; nudge behaves per the corrected WR-04 convention once fixed"
    why_human: "08-09's own optional Step 6 was explicitly NOT exercised (uat_listing_bookable.extra_head_fee was NULL) and is recorded in 08-09-SUMMARY.md as 'NOT human-verified' — do not read the phase's existing sign-off as covering this surface"
---

# Phase 8: Group Bookings Verification Report

**Phase Goal:** The differentiator — an organizer who has paid for a booking can invite people via a shareable link or email, attendees confirm attendance without needing a full account, and the organizer sees a live headcount validated against the listing's capacity. RSVP is informational coordination layered on a normal paid booking; it never touches the occupancy constraint and never becomes per-attendee payment.

**Verified:** 2026-07-28
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (from ROADMAP success criteria) | Status | Evidence |
|---|---|---|---|
| 1 | SC1 — Organizer can create a group booking on a paid booking and invite via link/email | ⚠️ PARTIAL | `createGroup` (src/app/actions/group.ts:193-291) is owner/status-gated, snapshots capacity atomically, mints a real ~100-bit token, and is idempotent by construction. `ShareLinkBox` + guest-email path human-verified in 08-09 (steps 1–3). BUT the pax-priced variant of "pays the full booking" has two confirmed BLOCKER defects (CR-02, CR-03) that are unresolved in the codebase today — see gaps. The flat-rate (no per-head fee) path, which is what was human-verified, is genuinely correct. |
| 2 | SC2 — Invited attendees can RSVP yes/no via a scoped invite token without an account | ✓ VERIFIED | `/invite/[token]/page.tsx` lives at the app root outside `(app)`/`(host)`, reads but never requires a session, and `submitRsvp` (group.ts:307-437) is the public token-credentialed action. Human-verified end-to-end in 08-09 Task 2 step 2 ("was NOT bounced to /login... RSVP'd as a NAME-ONLY guest") and step 3 (guest-with-email, real Resend delivery confirmed). |
| 3 | SC3 — Organizer can see confirmed headcount and who is coming | ⚠️ PARTIAL | `/bookings/[id]/group/page.tsx` is owner-gated (booking.bookerId re-check, same bare 404 for missing/foreign — mutation-verified per `tests/group/group-owner-scope.test.ts`), renders `HeadcountMeter` + `AttendeeRoster` from real owner-scoped reads, and was human-verified in 08-09 step 4 ("headcount and roster reflected both RSVPs"). The organizer CAN see a headcount and a roster — the surface itself is real and works. But the specific number shown has the WR-03/WR-04 accounting inconsistency described under SC4 below (organizer excluded from the count the cap enforces, included in the count the pricing/nudge compares against). |
| 4 | SC4 — Confirmed RSVPs hard-capped at the listing's capacity (atomic, no overflow); partial RSVP leaves booking valid | ⚠️ PARTIAL | The atomic mechanism is real and correct: `claimSeat` (src/lib/group/seat-claim.ts) takes `SELECT capacity_snapshot ... FOR UPDATE`, counts confirmed yes under the lock, and rejects an over-cap `→yes` — verified by direct code read and independently proven via the 08-09 mutation-verification (test's own inlined FOR UPDATE went RED with 3/4 committed over-cap rows, then GREEN on restore). Toggle/free/re-claim and partial-RSVP-leaves-booking-valid all hold (tests/group/seat-claim.test.ts). HOWEVER: `capacity_snapshot` is set to the listing's raw `max_occupancy` with no seat reserved for the organizer (group.ts:242), while the organizer structurally does not occupy an RSVP row (attendee-roster.tsx:33-35) — so the room's real capacity can be exceeded by exactly one person (the organizer) even though the RSVP-row cap itself never overflows. Confirmed by direct code read, matches 08-REVIEW.md WR-03/WR-04. |
| 5 | GROUP-05 seat-claim has a durable regression guard on the shipped lock | ⚠️ WARNING (carried forward, not newly litigated) | `tests/group/seat-claim-race.test.ts` inlines its own copy of the lock rather than calling `claimSeat`; measured in 08-09-SUMMARY.md that deleting `FOR UPDATE` from the shipped `seat-claim.ts` leaves the entire 792-test suite green. The lock IS present and correct today (byte-verified), but has no regression guard. Logged as deferred-items.md item 4 and treated here as a deferred item, not a blocking gap, per the orchestrator's existing classification. |

**Score:** 2/5 truths (SC2 only) fully clean; 3/5 (SC1, SC3, SC4) verified as substantively real and working for their primary path but carrying confirmed, code-level BLOCKER or WARNING defects that are unresolved and directly bear on the literal wording of the success criterion.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` (bookingGroup, rsvp, occupancyMode, rsvpStatus, listing.included/extraHeadFee/occupancyMode, booking.declaredPax) | Phase-8 data foundation | ✓ VERIFIED | All present, confirmed via grep: `pgTable("booking_group")`, `pgTable("rsvp")` (via bookingGroup ref), `occupancyMode`/`rsvpStatus` pgEnums, `declaredPax`/`included`/`extraHeadFee` columns all present at the documented line numbers |
| `src/lib/group/seat-claim.ts` — `claimSeat` | Pessimistic FOR UPDATE seat-claim | ✓ VERIFIED | Read in full; genuinely locks the single group row, counts under the lock, rejects over-cap, no notification inside the tx. Substantive (101 lines), not a stub. |
| `src/lib/group/token.ts` | Crypto-random invite/manage token | ✓ VERIFIED (exists, 40 lines) | Referenced correctly from group.ts (`makeInviteToken`) |
| `src/app/actions/group.ts` | createGroup/submitRsvp/removeAttendee/regenerateLink | ✓ VERIFIED | Read in full (582 lines); all four actions are owner/token-gated, defence-in-depth WHERE clauses present, calm denials, rate-limited, audited |
| `src/lib/group/rsvp.ts` | Owner-scoped roster/headcount/token reads | ✓ VERIFIED (exists, 466 lines) | Consumed correctly by both the invite page and the management page |
| `src/app/invite/[token]/page.tsx` | Public RSVP RSC at root | ✓ VERIFIED | Read in full; genuinely at the root (no `(app)`/`(host)` segment), session read-not-required, unknown/voided/malformed collapse to one calm state, `noindex` + `no-referrer` metadata present |
| `src/app/(app)/bookings/[id]/group/page.tsx` | Owner-gated management RSC | ✓ VERIFIED | Read in full; repeats the `bookerId === userId` gate, same bare 404, real `HeadcountMeter`/`ShareLinkBox`/`AttendeeRoster`/`TopUpNudge`/`RegenerateLinkButton` composition |
| `src/components/group/remove-attendee-button.tsx` | Organizer remove-attendee control | ✓ VERIFIED | Wired into `attendee-roster.tsx` (imported + rendered on `yes` rows); committed to git (the initial session snapshot showing it untracked was stale — confirmed clean `git status` and present in commit `59b5d9b`) |
| `src/components/booking/pax-stepper.tsx` / `price-breakdown.tsx` (Extra guests line) | Pax-pricing UI | ✓ VERIFIED as EXISTING/WIRED, ⚠️ NOT human-verified | Both files substantive (128/163 lines) and the conditional "Extra guests" line is present at price-breakdown.tsx:123. 08-09 recorded this surface as explicitly not exercised in the human walkthrough. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `submitRsvp` | `claimSeat` | direct call, post-resolution notify | ✓ WIRED | Confirmed in group.ts:344-351; notifications emitted only after `claim.ok` |
| `cancelBookingAsBooker`/`cancelBookingAsHost` | `booking_group.voided_at` | D-121 auto-void | ✓ WIRED (per 08-06-SUMMARY claims, consistent with PLAN's mandatory test) — not independently re-read in full here, but the 08-09 human UAT step 5 exercised this exact path live ("Cancelling the parent booking voided the invite link... guest-with-email received a cancellation notice") |
| `createPendingHold` | `booking.space_price_cents` (payout/fee basis) | quote.totalCents fold (A1) | ⚠️ WIRED BUT UNCLAMPED | The fold itself works (confirmed in units.ts:438-513), but the upstream `declaredPax` input is not bounded before it reaches this fold (CR-03) |
| `booking.ts confirmBooking` | PayMongo checkout session | amount-scoped idempotency key | ⚠️ WIRED BUT LEAKS A STALE SESSION | Confirmed in booking.ts:553-566: `checkout.id` from `createCheckoutSession` is discarded, no expire call exists anywhere in the codebase (CR-02) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/validation/booking.ts` | 101 | Unbounded `declaredPax` (no `.max()`) | 🛑 BLOCKER | Confirmed live in code — CR-03 |
| `src/lib/availability/units.ts` | 438-450 | No `maxOccupancy` clamp on `declaredPax` before pricing | 🛑 BLOCKER | Confirmed live in code — CR-03 |
| `src/app/actions/booking.ts` | 553-566 | Discarded `checkout.id`, no session-expire call anywhere in the repo | 🛑 BLOCKER | Confirmed live in code — CR-02 |
| `src/lib/rate-limit.ts` | 29 | Module-level `Map`, never evicted, unbounded | 🛑 BLOCKER (in combination with group.ts:326's pre-resolution token-keyed budget) | Confirmed live in code — CR-04 |
| `src/app/actions/group.ts` | 242 | `capacity_snapshot` does not reserve the organizer's own seat | ⚠️ WARNING | Confirmed live in code — WR-03, directly bears on SC4 |
| `src/components/group/top-up-nudge.tsx` | 60-62 | `confirmedYes <= declaredPax` compares different bases (organizer excluded vs. included) | ⚠️ WARNING | Confirmed live in code — WR-04 |
| `tests/group/seat-claim-race.test.ts` | — | Inlines its own copy of the lock, never imports `claimSeat` | ⚠️ WARNING (deferred) | Confirmed by 08-09's own mutation evidence — deferred-items.md item 4 |

Note: WR-01, WR-02, WR-05 through WR-10 from 08-REVIEW.md were not independently re-verified line-by-line here (10 WARNING findings total in the review; time was spent confirming the 4 BLOCKERs and the two WARNINGs that bear directly on the roadmap's stated success criteria). They should be treated as credible per the code reviewer's report and are appropriate `/gsd:plan-phase 8 --gaps` input alongside the items above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| GROUP-01 | 08-01, 08-03, 08-06, 08-07 | Organizer creates group on a paid booking, pays full amount | ⚠️ PARTIAL | createGroup real and correct; the "pays the full booking" money-correctness guarantee has confirmed unresolved BLOCKER defects (CR-02/CR-03) on the pax-priced path |
| GROUP-02 | 08-06, 08-07, 08-08 | Invite via shareable link and/or email | ✓ SATISFIED | ShareLinkBox + guest-email path human-verified live |
| GROUP-03 | 08-02, 08-06, 08-08 | Attendees RSVP without a full account | ✓ SATISFIED | Human-verified live, cross-session, no-login-bounce confirmed |
| GROUP-04 | 08-06, 08-07 | Organizer sees confirmed headcount and who is coming | ⚠️ PARTIAL | Surface is real and owner-gated (mutation-verified IDOR test); the specific headcount figure has the WR-03/WR-04 organizer-exclusion inconsistency |
| GROUP-05 | 08-01, 08-02, 08-06 | Confirmed headcount validated against listing capacity | ⚠️ PARTIAL | The RSVP-row cap is genuinely atomic and race-free (mutation-verified pattern); the cap itself does not reserve the organizer's seat, so real occupancy can exceed the listing's rated capacity by one person (WR-03); additionally the shipped lock has no regression-test coverage (deferred) |

REQUIREMENTS.md marks all five GROUP-0X rows "Complete" — this verification finds that claim **not fully supported**: the underlying mechanisms exist and are substantively real (this is not a stub-detection failure), but confirmed, unresolved BLOCKER-severity defects from the phase's own code review directly undermine the literal wording of SC1 and SC4 for a portion of the feature's scope (per-head pricing) that the phase itself built to make GROUP-01 hold for the group use case.

### Gaps Summary

The phase delivered a genuinely substantial, mostly-correct implementation — this is not a stub-and-summary phase. The core RSVP mechanism (the phase's hardest problem, D-112's atomic seat-claim) is real, race-free by direct code inspection, and independently confirmed by the 08-09 mutation-verification evidence. The public invite flow, the guest-or-login fork, the owner-gated organizer surface, and the notification plumbing are all substantively implemented and — for their primary paths — human-verified end-to-end (08-09 steps 1–5, all approved).

What blocks a clean PASS:

1. **Two unresolved BLOCKER money-correctness defects (CR-02, CR-03)** on the pax-pricing path that 08-03/08-05 built specifically so GROUP-01's "organizer pays the full booking" holds for group-sized bookings. Both are confirmed live in the current codebase by direct read, not inferred from the review report. Neither has a follow-up plan or commit closing it. The one human-verify checkpoint that could have caught this in practice (08-09 step 6) was explicitly skipped because the UAT fixture had no per-head fee configured — so this path has never been exercised by a human either.
2. **A confirmed unbounded-memory DoS (CR-04)** on the app's one unauthenticated, publicly-reachable write path (`submitRsvp`), keyed on an attacker-chosen 20-character token before the token is even resolved against the database.
3. **A real, code-confirmed off-by-one in the capacity math (WR-03)** that lets a group seat one more person than the listing's rated `max_occupancy`, directly touching the literal wording of SC4 ("hard-capped at the listing's capacity"). The companion nudge that would have surfaced this to the organizer (WR-04) is silent on exactly the first case it exists to catch.
4. The seat-claim's own shipped lock has no mutation-test coverage (deferred, carried forward per the orchestrator's existing classification — not re-litigated as a new gap here, but it remains true that a one-line regression in `src/lib/group/seat-claim.ts` would ship silently).

None of these are "SUMMARY claimed it but nothing exists" failures — every artifact named in every PLAN's must_haves is present, substantive, and wired. The gap is that the phase's own code review (08-REVIEW.md, dated after all execution work) surfaced 4 BLOCKER + 10 WARNING findings that remain open in the codebase with no subsequent gap-closure plan, and two of those BLOCKERs plus one WARNING land squarely on the roadmap's own success-criteria wording.

**This looks like it needs `/gsd:plan-phase 8 --gaps`, not an override.** The fixes are narrow and already drafted in 08-REVIEW.md (clamp `declaredPax`, persist+expire the superseded checkout session, bound the rate-limit map / resolve-before-budget, reserve the organizer's seat in `capacity_snapshot`).

---

_Verified: 2026-07-28_
_Verifier: Claude (gsd-verifier)_
