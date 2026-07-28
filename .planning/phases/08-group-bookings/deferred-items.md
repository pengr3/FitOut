# Phase 08 — Deferred Items

Out-of-scope discoveries logged during execution. Nothing here blocks the phase.

---

## 1. A stale hosted-checkout session can still be paid after a re-price (D-108, 08-05)

**Found during:** 08-05 Task 2 (`updateDeclaredPax`).

**What is closed:** `confirmBooking` now scopes the PayMongo `Idempotency-Key` to the frozen amount
**for per-head bookings only** (`checkout:<bookingId>:<quotedTotalCents>`; flat bookings keep the
byte-identical `checkout:<bookingId>`). So the common path is safe: a booker who leaves the hosted
checkout, returns via `cancelUrl`, steps the headcount and pays again now gets a session for the amount
they were actually shown — instead of a replay of the first session at the old amount.

**Residual edge (accepted, v1):** the FIRST checkout session is not cancelled when the quote moves. A
booker holding that older PayMongo tab open could still pay the previous amount, and the
`checkout_session.payment.paid` webhook confirms on `status='pending'` alone (D-57), so the booking would
confirm at a total that no longer matches `quoted_total_cents`.

**Why not fixed here:** cancelling/expiring a PayMongo checkout session requires a new API call plus a
place to persist the session id (a schema column) — a Phase-5 money-rail change that D-107 explicitly
holds out of Phase 8's scope, and an architectural call (Rule 4) rather than an in-plan fix.

**When to close:** alongside the D-114 in-app top-up fast-follow, which needs the same
"reconcile charged-vs-quoted" seam. Options: persist `checkout_session_id` on the booking and expire the
old session on re-price, or have the webhook compare the paid amount against `quoted_total_cents` and
route a mismatch to the existing operator-alert path.

---

## 2. `request`-mode group listings cannot declare a headcount before the host approves (D-108, 08-05)

**Found during:** 08-05 Task 2.

**What:** the `PaxStepper` lives on the reserve/checkout page, which a request-to-book booker only reaches
*after* the host approves. Nothing on the listing page sends `declaredPax` at `placeHold` time (08-03
threaded the parameter end-to-end, but no UI populates it), so a request-mode group booking is created at
`declaredPax = 1` and can only be stepped up on the pay-on-approval screen. `updateDeclaredPax` does allow
that (`approved` is in its live-hold set), so the flow works — but the host approves a request whose price
can subsequently move.

**Why not fixed here:** adding a headcount control to the listing-page CTA is a different surface than the
one 08-05 scopes, and the "what exactly did the host approve" question is a product call.

**When to close:** whenever the group entry point on the listing page is revisited — either surface the
stepper pre-`placeHold`, or freeze `declaredPax` at approval for request mode.

---

## 3. ~~No `<Toaster />` is mounted on any booker-side page, so booker toasts are silent~~ — **CLOSED (`dea2cd4`, during the 08-09 UAT setup)**

> **Closed 2026-07-28 by `dea2cd4`** — `<Toaster />` is now mounted exactly once at the shared
> ancestor, `src/app/(app)/layout.tsx` (the WR-04 idiom), so every booker-side `toast.*` is audible:
> 08-07's `ShareLinkBox` / `CreateGroupButton` / `RemoveAttendeeButton` and the Phase-07 cancel/refund
> surfaces. **Do NOT also mount one per-page underneath it** — two Toasters render each toast twice.
> This landed outside any plan and is attributed in `08-09-SUMMARY.md`. The original entry is kept
> below for the record; it correctly predicted this would be the first thing the 08-09 organizer
> walkthrough hit.

<details><summary>Original entry (08-08)</summary>


**Found during:** 08-08 Task 2, while deciding whether the public invite page should report failures via
`sonner` or inline.

**What:** `grep -rn "Toaster" src/app src/components` finds it mounted in exactly three places, all under
`(host)`: `host/listings/page.tsx`, `host/listings/[id]/availability/page.tsx` and
`host/listings/[id]/edit/wizard.tsx`. Neither the root layout nor `(app)/layout.tsx` mounts one. Every
`toast.*` call on a booker surface therefore renders nothing at all — including `ShareLinkBox`'s
`Link copied` / `Couldn't copy — select the link and copy it manually.` and `CreateGroupButton`'s error
toast (both 08-07), and the shipped `cancel-confirm.tsx` / `refund-destination-form.tsx` toasts from
Phase 07.

**Impact:** silent failure reporting, not incorrect behaviour. The worst case is `Copy link` on a browser
with no clipboard API: the field is still selected for a manual copy, but the sentence explaining why is
never shown.

**Why not fixed here:** it is out of 08-08's scope boundary — the fix belongs in `(app)/layout.tsx` (a
shipped, UAT-adjacent shell touched by neither task of this plan), and choosing between "mount once in the
root layout" and "mount once per shell" is a decision about app chrome, not about this plan's surface.
The invite page sidesteps it entirely: it mounts no Toaster and raises no toast, reporting every failure
in an inline neutral alert instead.

**When to close:** before the 08-09 UAT walkthrough of the ORGANIZER flow, or as a one-line addition to
`(app)/layout.tsx` whenever the booker shell is next touched.

</details>

---

## 4. The SHIPPED `claimSeat` `FOR UPDATE` has NO mutation coverage (found 08-09 Task 1)

**Found during:** 08-09 Task 1, executing the phase's acceptance-gate mutation.

**What:** `tests/group/seat-claim-race.test.ts` deliberately INLINES the seat-claim SQL inside each racer's
transaction (its header says so, and the reason is sound — it makes the `FOR UPDATE` lock itself the thing
under test, mirroring `exclusion-race.test.ts` testing the EXCLUDE constraint directly). The consequence,
which the header does not state, is that the race file **never imports `claimSeat`**. Measured this plan:
deleting `FOR UPDATE` from `src/lib/group/seat-claim.ts:54` leaves `tests/group/seat-claim-race.test.ts`
**GREEN (2/2)** and the whole of `tests/group/` **GREEN (6 files / 60 tests)**.

So the gate proves the *pattern* is race-free; it does **not** prove the *shipped* claim still contains the
lock. Someone deleting that line in production code ships an over-cap bug with a fully green 792-test suite.
(The 08-09 PLAN's Task-1 text — "remove `FOR UPDATE` from `src/lib/group/seat-claim.ts` … confirm it goes
RED" — is therefore not executable as written; the mutation that genuinely goes RED is the test file's own
inlined `FOR UPDATE`, which is what its header and 08-VALIDATION.md's gate actually point at.)

**Impact:** a coverage gap in the regression net, not a defect in shipped behaviour. `claimSeat` **does**
carry the lock today (verified byte-identical at `seat-claim.ts:54` after the mutation was reverted), and
`tests/group/seat-claim.test.ts` covers its functional contract.

**Why not fixed here:** 08-09's Task 1 declares `<files></files>` and the plan states "no code changes in
this plan" — adding a racing test that drives `claimSeat` is new test authorship outside this plan's scope
boundary, and the honest reading is that it needs its own task.

**When to close:** add one racing case to `tests/group/seat-claim-race.test.ts` that routes through the real
`claimSeat` (bind each racer's own connection as its `DbConn`) so the production lock is mutation-covered
too, keeping the existing inlined cases as the pattern proof. Good `/gsd:plan-phase 8 --gaps` input.
