# Phase 08 — Deferred Items

Out-of-scope discoveries logged during execution. **Items 5, 6 and 7 — including the BLOCKER-class
double-charge — are now CLOSED** by the gap-closure plans 08-18 → 08-22 (executed 2026-07-29), each
mutation-proven and, for the money-path items, **proven against the real PayMongo `sk_test_` API** (the
blocking constraint that a mock cannot falsify the assumption it was written from). See each item's closure
note below. Items 1, 3 and 4 were already closed; item 2 remains open and out of scope by operator decision.

> Residual review nits from the gap-closure code review (`08-REVIEW-gaps.md`, non-blocking, 0 blocking / 0
> high / 0 medium): **LW-01** — `expireCheckoutSession`'s already-expired tolerance matches on unstructured
> provider error text (fails SAFE — a future PayMongo reword would re-open the recovery livelock, a denial
> not a double-charge); **NT-01** — a pre-existing test title is now stale; **NT-02** — the wizard's autosave
> does not surface the specific surcharge field-error, so a host tripping the edit guard sees the generic
> "check the form" toast (the edit is still correctly rejected — UX polish only).

---

## 5. ~~`confirmBooking` double-charges on a plain double-submit — PayMongo does NOT honor `Idempotency-Key` on `/v1/checkout_sessions`~~ — **CLOSED (`d33c7a3`+`0e28968` 08-18, `efb7c19`+`54ffc6f` 08-19, `3ddb96d`+`73a18f3` 08-21)**

> **Closed 2026-07-29 by 08-18 → 08-21.** `confirmBooking` now **expires any persisted `checkout_session_id`
> before creating a new one** (expire-before-create, `src/app/actions/booking.ts`), mirroring
> `updateDeclaredPax`, fail-closed on a genuine expire failure (`needs_attention` audit + refuse), for flat
> AND per-head bookings alike — so a SEQUENTIAL double-submit (tab-switch / Back-then-reconfirm) leaves at
> most one payable session. The three false idempotency comments are corrected to the probed truth. **08-19
> proved it against the REAL `sk_test_` API** (opt-in `RUN_LIVE_PAYMONGO_PROBE=1`): two byte-identical POSTs
> mint two DIFFERENT payable session ids (the belief that shipped the bug, falsified — not mocked), and
> `expire` retires a session at the provider. 08-19 case 4 then FOUND a follow-on defect — a repeat expire
> returns HTTP 400 "already expired" (not the assumed 200-replay), a recovery-path livelock — which **08-21
> closed** by making `expireCheckoutSession` idempotent (tolerate exactly that 400; genuine failures still
> throw and still fail-closed), corrected two more false comments, and re-proved it live (case 4 now resolves).
> A truly concurrent double-click (T-08-79) and the already-captured `qrph` overcharge (T-08-74) remain
> accepted residuals. The original entry is kept below for the record.

**Found during:** 08-17 Task 2, step 4 — the first human exercise of the per-head money path.

**What happened.** The human clicked **Confirm & pay**, did not pay, opened a second tab, clicked
**Confirm & pay** again and paid there — then returned to the first, orphaned tab and paid that too.
**Both succeeded. The booker was charged twice for one booking.**

`GET /v1/payments` — both `status: paid`, both `metadata.booking_id = aff63acb-b6a5-45f7-8b47-6a01d589f765`,
both `Booking FIT-JSHBVKFP`:

| Payment id | Amount | `paid_at` | Payment intent |
|---|---|---|---|
| `pay_YFn1jgMWyau46ECydfPR2LdN` | ₱735.00 | 2026-07-28T10:00:35Z | `pi_qkDvR7HpTin8kGQSbkrzhHqy` |
| `pay_iw2zsj3ehcRzgRYzgn7hkoUP` | ₱735.00 | 2026-07-28T10:08:29Z | `pi_pUSRd6pLXNNvyVHat5pTTE35` |

**₱1,470.00 collected against a ₱735.00 booking.** The recorded session `cs_beffe381eb4694b42d4f3662` lists
only the FIRST payment — the second was paid on a session whose id the database never held, because
`confirmBooking`'s write had already overwritten `checkout_session_id`.

**ROOT CAUSE — a documented invariant the provider does not actually provide.** Two
`POST /v1/checkout_sessions` with a byte-identical `Idempotency-Key` and an identical body, against
`sk_test_`:

```
POST #1: HTTP 200  id=cs_ed60840548c9ccadc27ba6c3
POST #2 (same Idempotency-Key): HTTP 200  id=cs_6c4e54d253178994b94934b8
-> DIFFERENT ids
```

**Every POST mints a new payable session.** (Both probes were expired afterwards;
`POST /v1/checkout_sessions/{id}/expire` returned HTTP 200 both times — 08-12's `expireCheckoutSession`
works correctly against the real API. The defect is never calling it.)

**Three shipped comments assert the opposite and are now known false:**

| File:line | The false claim |
|---|---|
| `src/app/actions/booking.ts:582` | "Within ONE frozen amount the stable Idempotency-Key collapses a double-click / retry onto the SAME session." |
| `src/app/actions/booking.ts:592` | "…while a double-click (same booking, same amount) still resolves to the same key and the same session." |
| `src/lib/paymongo.ts:172` | "Idempotency-Key is set by the caller (e.g. `checkout:<bookingId>`) so a double-click / retry can't create a second charge." |

**Scope — NOT a CR-02 regression, and WIDER than CR-02.** No re-price occurred: both charges were ₱735 at
`declared_pax = 3`, so both calls built the same key `checkout:<holdId>:73500`. CR-02's expire gate lives in
`updateDeclaredPax` and fires only on a re-price; **`confirmBooking` expires nothing before creating.** So:

1. Plain double-submission of **Confirm & pay** is an unguarded double-charge path — no re-price needed.
2. **Flat-priced bookings are equally exposed.** Their `checkout:<bookingId>` key was believed to be a
   double-charge guard (08-12 contract 1 reasoned from that belief); it is not one. **This predates Phase 8.**

**Downstream effects were CONTAINED.** Both `checkout_session.payment.paid` events were processed and the
handler deduped correctly: exactly ONE `booking_confirmed` notification, and no duplicated
`host_payout_ledger` row (0 rows — the ledger is written at payout time, not at confirm). But
`booking.payment_id` ended up naming `pay_iw2zsj…`, the later event having overwritten the earlier — a
lesser but real **recording** defect: the row names one of two real payments with nothing pointing at the
other. The overcharge is **unrefundable through the API** because both payments are `qrph`
(`src/lib/paymongo.ts:257`). Test-mode money, so no real loss — on a live rail this needs an out-of-band
operator refund.

**Why not fixed here:** 08-17 declares `files_modified: []` and is a human-verification plan; a money-path
fix is Rule-4 territory and was routed to `/gsd-plan-phase 8 --gaps` by operator decision.

**When to close — the suggested shape.** `confirmBooking` should **expire the persisted
`checkout_session_id` before creating a new one**, mirroring what `updateDeclaredPax` already does. The fix
**needs a test that drives the real PayMongo API rather than a mock** — a mock that echoes the idempotency
key back is exactly what let this belief survive four plans of test coverage. Fold in the still-unproven
half of CR-02 while that harness exists (see item 6).

---

## 6. ~~CR-02's live re-price assertion was never exercised by a human~~ — **CLOSED (`54ffc6f`, 08-19 case 3)**

> **Closed 2026-07-29 by 08-19.** The re-price supersession is now proven **against the real `sk_test_`
> API**, not a mock: `tests/paymongo/checkout-idempotency-real.test.ts` case 3 models `updateDeclaredPax`'s
> expire-then-replace — the superseded session is `expired` at the provider while its replacement is
> `active`, so at most one payable session survives a re-price. This is the live assertion the 08-17 UAT
> never exercised (it submitted the SAME headcount twice). Opt-in via `RUN_LIVE_PAYMONGO_PROBE=1`; both the
> executor and the verifier ran it live with distinct fresh session ids. The original entry is kept below.

**Found during:** 08-17 Task 2, step 4.

**What:** the plan's step 4 script was *set pax 3 → Confirm & pay → cancel back → step to pax 4 → Confirm &
pay → reload the FIRST tab and confirm it is no longer payable.* That is not the sequence that ran. Two
submissions were made at the **same** headcount, so `updateDeclaredPax` was never entered and the
expire-before-refreeze gate was never exercised. Recorded as **NOT VERIFIED**, per the plan's own criterion
that an unrun step is never passed by assumption.

**Impact:** CR-02's only evidence remains 08-13's automated mutation proofs (A/B/C). Those are strong, but
they are **mock-backed** — and item 5 above is a demonstration of what a mock-backed proof of a provider
guarantee is worth.

**When to close:** alongside item 5, on the same real-API test harness.

---

## 7. ~~`included >= max_occupancy` silently yields ZERO surcharge — an intuitive host config collects nothing~~ — **CLOSED (`7d6d4e8`+`03aefd7`+`9ef5e15` 08-20 publish path; `a3e3cfa`+`a066c5d` 08-22 edit path / HG-01)**

> **Closed 2026-07-29 by 08-20 + 08-22.** `publishSchema.superRefine` (`src/lib/validation/listing.ts`)
> rejects `included >= maxOccupancy` at publish whenever `extraHeadFee > 0` (flat listings exempt; drafts
> stay permissive), and the wizard's Group-pricing block states the rule. The gap-closure **code review then
> found HG-01**: the guard fired only at PUBLISH, so a host could edit an already-published listing's pricing
> via `saveListingStep` and silently re-create the unreachable surcharge. **08-22 closed that edit path** —
> `saveListingStep` re-enforces the rule on already-published rows against the EFFECTIVE post-save values
> (sparse-aware, both vectors: raising `included` or lowering `maxOccupancy`), sharing one
> `SURCHARGE_UNREACHABLE_MESSAGE` constant with the publish gate so the two cannot drift. Mutation-proven;
> the reviewer independently re-verified `saveListingStep` is the only edit path that writes these columns.
> The original entry is kept below.

**Found during:** operator review after the 08-17 walkthrough. Surfaced verbally at pause ("i just want it
be known"); logged here on resume 2026-07-29 by operator decision, and routed as a secondary input to
`/gsd-plan-phase 8 --gaps` alongside items 5 and 6.

**What.** `included` ("Base price covers") and `max_occupancy` are independent fields with **no enforced
relationship**, and `declaredPax` is clamped to `max_occupancy` **before** the surcharge is computed
(`src/lib/availability/units.ts:455`). So on any listing where `included >= max_occupancy` the surcharge is
**mathematically unreachable**: `extraHeads = max(0, pax − included)` is always 0, the host collects nothing
extra forever, and nothing warns them.

**Why it matters — this is the shape a host is MOST likely to configure**, because it is the intuitive
reading of the feature. Operator's own example: a pickleball court rated for 8 where the surcharge should
apply *above* 8 — setting `included = 8`, `max_occupancy = 8` silently yields zero surcharge. For it to fire,
`max_occupancy` must be **strictly greater** than `included` (e.g. holds 12, base covers 8, heads 9–12
surcharged). The two fields also sit in **different steps of the wizard** with no cross-reference. This is a
revenue-loss path, not polish.

**Suggested close.** Cross-field validation (`included < maxOccupancy`) plus a line of copy in the Group
pricing block so the relationship is visible at configuration time.

---

## 1. ~~A stale hosted-checkout session can still be paid after a re-price~~ — **CLOSED (`18c9047` + `0eefcbd` + `ca9d3cb`, plans 08-12 → 08-13)**

> **Closed 2026-07-28 by 08-13** — both halves of the option this entry named ("persist
> `checkout_session_id` on the booking and expire the old session on re-price") are now shipped.
> `confirmBooking` writes `checkout.id` to `booking.checkout_session_id` after `createCheckoutSession`
> resolves and BEFORE the redirect, for per-head AND flat bookings alike. `updateDeclaredPax` expires
> that session **before** it freezes the new amount, clears the column in the same write, and **refuses**
> the re-price if the expire throws — recording `action: "checkout_expire_failed"`,
> `outcome: "needs_attention"` with the session id in the meta so an operator can retire it by hand.
> Order and persistence are mutation-proven (A/B/C in `08-13-SUMMARY.md`). The residual edge below —
> "a booker holding that older PayMongo tab open could still pay the previous amount" — no longer
> exists: the older session is expired, or the amount never moved. The original entry is kept for the
> record.

<details><summary>Original entry (08-05)</summary>

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

</details>

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

## 4. ~~The SHIPPED `claimSeat` `FOR UPDATE` has NO mutation coverage~~ — **CLOSED (`4d263aa`, plan 08-16)**

> **Closed 2026-07-28 by `4d263aa`** — `tests/group/seat-claim-race.test.ts` now has TWO layers.
> Cases 3-4 drive the **real** `claimSeat` imported from `@/lib/group/seat-claim`, with one
> `drizzle(client)` over one INDEPENDENT `makeRacingClients` connection per racer and a name-only
> guest identity (so the de-dup predicate is `false` and every racer genuinely attempts a fresh
> insert). Deleting `FOR UPDATE` from `src/lib/group/seat-claim.ts:54` now turns this file **RED** —
> measured, not asserted: `expected 3 to be 1` committed `yes` at `capacity_snapshot = 1` and
> `expected 4 to be 2` at `= 2` — and restoring it returns it to GREEN (4/4) with
> `git diff --exit-code src/lib/group/seat-claim.ts` clean. The two inlined-SQL cases are kept
> byte-identical as the **pattern** proof, and their own mutation still holds independently
> (deleting the test's inlined `FOR UPDATE` fails cases 1-2 with the same 3/4 over-cap counts while
> cases 3-4 stay green). The file header now names **both** mutation targets, each against its own
> file and its own line — the single instruction it carried before was the thing 08-09 found was not
> executable as written. No production file was modified. The original entry is kept below for the
> record.

<details><summary>Original entry (08-09)</summary>

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

</details>
