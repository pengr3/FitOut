---
phase: 08-group-bookings
plan: 17
subsystem: testing
tags: [uat, human-verification, group-bookings, pax-pricing, paymongo, checkout-session, idempotency, double-charge, ngrok, inngest]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-10)
    provides: the declaredPax clamp to listing.maxOccupancy (CR-03) — the stepper's ceiling this walkthrough drove by hand
  - phase: 08-group-bookings (08-13)
    provides: checkout_session_id persistence + expire-before-refreeze (CR-02) — the invariant this walkthrough was meant to confirm live
  - phase: 08-group-bookings (08-14)
    provides: capacity_snapshot = GREATEST(max_occupancy - 1, 0) and the organizer-inclusive display convention (WR-03/WR-04)
  - phase: 08-group-bookings (08-15)
    provides: composeWhenLabel reading the persisted booking.full_day (CR-01) — the "not Full day" assertion on four surfaces
  - phase: 08-group-bookings (08-09)
    provides: the skipped optional step 6 (extra_head_fee was NULL) that made this plan necessary
provides:
  - "the first genuine human exercise of the PER-HEAD priced booking path, on a fixture that actually charges per head"
  - "per-step human outcomes for steps 2-8 with the literal rendered strings, replacing 08-09's blanket sign-off over a skipped step"
  - "a NEW BLOCKER-class finding: PayMongo does NOT honor Idempotency-Key on /v1/checkout_sessions, so a plain double-submit of Confirm & pay double-charges the booker (deferred item 5)"
  - "a controlled two-POST probe proving the non-idempotency against sk_test_, plus the three shipped comments that assert the opposite"
  - "confirmation that CR-01, CR-03, WR-03, WR-04 and the SC4 cap are all correct on screen"
affects: [phase-09, 08-VERIFICATION.md, gsd-plan-phase-8-gaps, src/app/actions/booking.ts confirmBooking, src/lib/paymongo.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A payment provider's idempotency guarantee must be PROBED against the real API, never assumed from its docs or from a mock that echoes the key back"
    - "A mock that faithfully implements the behaviour you BELIEVE the provider has will keep a false invariant alive through every plan that tests against it"
    - "A tunnel (ngrok) started inside a subagent dies with that subagent — start long-lived UAT processes in your own terminal"

key-files:
  created:
    - .planning/phases/08-group-bookings/08-17-SUMMARY.md
  modified:
    - .planning/phases/08-group-bookings/deferred-items.md

key-decisions:
  - "The double-charge found in step 4 is recorded and routed to /gsd-plan-phase 8 --gaps, NOT fixed here — this plan declares files_modified: [] and a money-path fix needs its own plan with a real-API test"
  - "Step 4 is recorded as FAILED and, separately, CR-02's own scripted assertion (superseded session unpayable after a RE-PRICE) is recorded as NOT VERIFIED — the human ran two submissions at the SAME headcount, so no re-price ever occurred and the CR-02 gate was never entered"
  - "The booking froze at declared_pax = 3 rather than the plan's assumed 4, so steps 6-7 were verified at the SHIFTED thresholds and the shift is stated rather than papered over"
  - "The three shipped comments asserting Idempotency-Key protects against a double-click are left in place (out of scope) but named by file and line so the gaps plan cannot miss them"

patterns-established:
  - "Provider-invariant probing: before documenting a third-party guarantee in a comment, drive two identical POSTs against the real sandbox and record both ids"

requirements-completed: [GROUP-01, GROUP-04, GROUP-05]

# Metrics
duration: ~2h
completed: 2026-07-28
---

# Phase 8 Plan 17: Pax-Surcharge Human Walkthrough Summary

**The per-head booking path was driven end to end by a human for the first time — CR-01, CR-03, WR-03, WR-04 and the SC4 cap all confirmed on screen — and the run surfaced a NEW BLOCKER-class defect the automated suite could never have caught: PayMongo does not honor `Idempotency-Key` on `/v1/checkout_sessions`, so a plain double-submit of Confirm & pay charged the booker ₱735.00 twice for one ₱735.00 booking.**

## Performance

- **Duration:** ~2h (including the human walkthrough and a mid-run environment interruption)
- **Started:** 2026-07-28T08:35Z
- **Completed:** 2026-07-28T10:36Z
- **Tasks:** 2 of 2 (Task 1 auto, Task 2 human-verify checkpoint — returned)
- **Files modified:** 0 source files. `git diff --stat` against the pre-plan tree touches nothing under `src/`.

## Accomplishments

- The suite + build gate ran clean before a human was asked to look at anything.
- `uat_listing_bookable` was patched into a listing that **actually charges per head** — the single omission that caused 08-09's step 6 to be skipped and this whole gap to exist.
- Seven walkthrough steps were driven in a real browser with a **per-step** outcome recorded, including one FAILURE recorded in full.
- A controlled probe against the live PayMongo sandbox falsified a documented invariant that three shipped comments assert.

---

## Task 1 — Full-suite + build gate, then configure the per-head UAT fixture

**No commit** — this task makes no repository change by design (`<files></files>`, "Make no repository changes in this task"). `git status --porcelain` was empty at the end of it and is empty now.

### Gate results

**`npx vitest run`** (no `DATABASE_URL` override in the shell, so `tests/setup.ts`'s non-overriding `.env.local` load wins):

```
 RUN  v4.1.8 C:/Users/Admin/Roaming/FitOut

 Test Files  96 passed (96)
      Tests  838 passed (838)
   Start at  16:42:40
   Duration  104.80s (transform 10.23s, setup 9.47s, import 266.89s, tests 329.10s, environment 34.17s)
```

Exit code **0**. Against the plan's **792 baseline** at phase-8 close, that is **+46 tests** — the exact net of the gap-closure run, and it reconciles plan by plan against the per-plan totals each SUMMARY recorded: 792 → **797** (08-10) → **810** (08-11) → **815** (08-12) → **817** (08-16) → **824** (08-13) → **835** (08-14) → **838** (08-15). No file was skipped, no test was skipped, and nothing regressed between 08-15's close and this gate.

**`npm run build`** — bare, with **no dummy-env workaround** (the 07-era fail-closed boot guards correctly exempt the production-build phase):

```
▲ Next.js 16.2.7 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 19.5s
  Running TypeScript ...
  Finished TypeScript in 38.5s ...
✓ Generating static pages using 7 workers (21/21) in 1651ms
```

Exit code **0**. Full route table printed (29 entries, including `/bookings/[id]/group` and `/invite/[token]`). The only warnings were the standing `middleware` → `proxy` deprecation notice and the nine `[Better Auth]: Social provider google is missing clientId or clientSecret` lines — both pre-existing and unrelated.

### The fixture, read back

Patched in one statement through the containerised database (`docker compose exec -T db psql -U fitout -d fitout`), so no throwaway script landed in the repo. **Read back verbatim:**

```
          id          |  status   | booking_mode | max_occupancy | included | extra_head_fee | cancellation_policy
----------------------+-----------+--------------+---------------+----------+----------------+---------------------
 uat_listing_bookable | published | instant      |            12 |        1 |          10000 | standard
(1 row)
```

All five plan-mandated values confirmed: `extra_head_fee = 10000` (₱100.00 per extra head — the NULL that skipped 08-09 step 6), `included = 1` (D-108: the organizer's own seat folded into the base rate), `max_occupancy = 12` (so `capacity_snapshot` comes out `11` and the organizer page reads `of 12` — the 08-14 arithmetic made legible), `booking_mode = instant` (the `PaxStepper` lives on the reserve page, which a request-mode booker only reaches after host approval — deferred item 2, still open), `cancellation_policy = standard` (the seed predates the D-77 tier gate; a NULL tier blocks checkout). Status `published`, host payable.

`RESEND_API_KEY` **was set** (`re_…` present in `.env.local`), so real email delivery was available for step 8 and no `[email:dev]`-only caveat applied. `INNGEST_DEV=1` present.

---

## Task 2 — Human walkthrough (checkpoint returned)

Per-step outcomes below. **One blanket sign-off was explicitly not accepted** (T-08-62): each step carries its own verdict, and the one step that was not run as scripted says so rather than being assumed.

### Step 1 — Stack. RUN (prerequisite, not an assertion)

`npm run dev` (:3000) and `npm run dev:inngest` (:8288) both up, dashboard showing the app's functions. `INNGEST_DEV=1` confirmed in `.env.local`. `RESEND_API_KEY` set. See "Environment interruption" below — the tunnel half of this did not survive the walkthrough.

### Step 2 — The stepper and the surcharge line (D-108, CR-03). ✅ APPROVED

`PaxStepper` present. Stepping it up re-renders a **NEW server total** — the page refreshes rather than doing arithmetic in the browser, which is the whole point of the control.

Breakdown at pax 4, as rendered:

```
₱500.00/hr × 1 hour   →   ₱500.00
Extra guests (3 × ₱100.00)   →   ₱300.00
Service fee   →   ₱40.00
Total   ₱840.00
```

At the clamp:

```
Extra guests (11 × ₱100.00)   →   ₱1,100.00
Service fee   ₱80.00
Total   ₱1,680.00
```

The stepper **stopped at 12 and refused to go higher**; helper text read `This includes you. Up to 12.`

This is CR-03's clamp and D-108's surcharge line, both confirmed on screen. Note the arithmetic is coherent at both ends: `included = 1` means pax 4 charges 3 extra heads and pax 12 charges 11, and the total is space + service fee with no double-counted centavos.

### Step 3 — The time label on the reserve page (CR-01). ✅ APPROVED

Literal rendered strings:

```
Tuesday, Jul 28
7:00 PM – 8:00 PM · 1 hour
```

**NOT "Full day".** This is CR-01 confirmed on exactly the case that broke it: a **surcharged HOURLY** booking, where `quoteWindow` folds the per-head surcharge into `totalCents` and `createPendingHold` freezes that into `spacePriceCents`, so the deleted price-inequality would have concluded "Full day" here with certainty. 08-15's persisted-`booking.full_day` read holds in production.

### Step 4 — One payable session (CR-02). ❌ **FAILED — the headline finding**

**This is the plan's one failed step. It is recorded in full because it is the input for the next gap-closure run.**

#### What happened

The human clicked **Confirm & pay**, did not pay, opened a **second tab**, clicked **Confirm & pay** again and paid there — then returned to the first, now-orphaned tab and paid that one too. **Both succeeded. The booker was charged twice for one booking.**

#### Evidence

`GET /v1/payments`, both `status: paid`, both `metadata.booking_id = aff63acb-b6a5-45f7-8b47-6a01d589f765`, both `Booking FIT-JSHBVKFP`:

| Payment id | Amount | `paid_at` | Payment intent |
|---|---|---|---|
| `pay_YFn1jgMWyau46ECydfPR2LdN` | ₱735.00 | 2026-07-28T10:00:35Z | `pi_qkDvR7HpTin8kGQSbkrzhHqy` |
| `pay_iw2zsj3ehcRzgRYzgn7hkoUP` | ₱735.00 | 2026-07-28T10:08:29Z | `pi_pUSRd6pLXNNvyVHat5pTTE35` |

**Total collected ₱1,470.00 against a ₱735.00 booking.**

The recorded session `cs_beffe381eb4694b42d4f3662` lists only the **FIRST** of those payments — so the second was paid on a session whose id **the database never held**. `confirmBooking`'s write had already overwritten `checkout_session_id` with the newer session by the time the older tab was used.

#### ROOT CAUSE — a documented invariant that the payment provider does not actually provide

A controlled probe: two `POST /v1/checkout_sessions` with a **byte-identical `Idempotency-Key`** and an identical body, against `sk_test_`:

```
POST #1: HTTP 200  id=cs_ed60840548c9ccadc27ba6c3
POST #2 (same Idempotency-Key): HTTP 200  id=cs_6c4e54d253178994b94934b8
-> DIFFERENT ids
```

**PayMongo does NOT honor `Idempotency-Key` on `/v1/checkout_sessions`. Every POST mints a new payable session.**

(Both probe sessions were expired afterwards; `POST /v1/checkout_sessions/{id}/expire` returned **HTTP 200 both times** — so 08-12's `expireCheckoutSession` itself works correctly against the real API. The defect is not in the expire call; it is in never making one.)

#### Three shipped comments assert the opposite and are now KNOWN FALSE

| File:line | The false claim |
|---|---|
| `src/app/actions/booking.ts:582` | "Within ONE frozen amount the stable Idempotency-Key collapses a double-click / retry onto the SAME session." |
| `src/app/actions/booking.ts:592` | "…while a double-click (same booking, same amount) still resolves to the same key and the same session." |
| `src/lib/paymongo.ts:172` | "Idempotency-Key is set by the caller (e.g. `checkout:<bookingId>`) so a double-click / retry can't create a second charge." |

They are **deliberately left in place by this plan** (`files_modified: []`, and the operator routed the fix to `/gsd-plan-phase 8 --gaps`). They are named here by file and line so the gaps plan cannot miss them. Note the exact shape of the trap: `booking.ts` already carries a long, correct CR-02 block a few lines below (":⚠️ THE ONE-LIVE-SESSION INVARIANT IS **NOT** HELD BY THIS KEY") — the false sentences sit **above** it and were never revisited when CR-02 was closed.

#### Scope — this is NOT a CR-02 regression, and it is WIDER than CR-02

No re-price occurred. Both charges were ₱735 at `declared_pax = 3`, so both calls built the **same** key `checkout:<holdId>:73500`. CR-02's expire gate lives in `updateDeclaredPax` and fires **only on a re-price**; `confirmBooking` expires nothing before creating. Two consequences, stated plainly:

1. **Plain double-submission of Confirm & pay is an unguarded double-charge path.** No re-price is needed to reach it.
2. **Flat-priced bookings are equally exposed.** Their `checkout:<bookingId>` key was believed to be a double-charge guard — 08-12 contract 1 reasoned from that belief — and it is not one. **This predates Phase 8.**

#### Downstream effects were CONTAINED

Worth saying explicitly, because the blast radius is smaller than the charge count suggests:

- Both `checkout_session.payment.paid` events were processed and **the handler deduped correctly**: exactly **ONE** `booking_confirmed` notification.
- **No duplicated `host_payout_ledger` row** (0 rows for this booking — the payout ledger is written at payout time, not at confirm).
- `booking.payment_id` ended up naming `pay_iw2zsj…` — the later event overwrote the earlier. A **lesser but real recording defect**: the row now names one of two real payments, with nothing pointing at the other.
- The overcharge is **unrefundable through the API** because both payments are `qrph` (`src/lib/paymongo.ts:257`: "FAILS for QRPh / UBP payments"). Test-mode money, so no real loss here — but on a live rail this would need an out-of-band operator refund.

#### The suggested close (for the gaps plan — NOT implemented here)

`confirmBooking` should **expire the persisted `checkout_session_id` before creating a new one**, mirroring what `updateDeclaredPax` already does. And the fix **needs a test that drives the real PayMongo API rather than a mock** — a mock that echoes the idempotency key back is exactly what let this belief survive four plans of test coverage (`mockPayMongo` was built to model the guarantee we thought we had).

#### Separately: CR-02's OWN scripted assertion is NOT VERIFIED

The plan's step 4 script was: set pax 3 → Confirm & pay → **cancel back** → step to pax 4 → Confirm & pay → **reload the FIRST tab and confirm it is no longer payable**. That is **not the sequence that was run.** Two submissions were made at the **same** headcount, so `updateDeclaredPax` was never entered and the expire-before-refreeze gate was never exercised.

Recording this honestly, per the plan's own acceptance criterion that a step which cannot be run is **NOT VERIFIED, never passed by assumption**: **the CR-02 re-price gate has no live human evidence from this run.** Its only evidence remains 08-13's automated mutation proofs (A/B/C), which are strong but are mock-backed — and this step just demonstrated what a mock-backed proof of a provider guarantee is worth. The acceptance criterion "Step 4's first-tab reload result is recorded verbatim" therefore has no verbatim string to record: **no reload of a superseded session was performed.**

### Step 5 — The organizer numbers before any RSVP (WR-03 / D-113). ✅ APPROVED

Before any RSVP the organizer page read **`1 of 12`**, with a single roster row: **`You · Organizer`** / "You booked this space". The organizer is counted **exactly once**, against the room's rating. WR-03 / D-113 confirmed on screen.

### Step 6 — The nudge fires at the first over-subscription (WR-04 / D-114). ✅ APPROVED (at shifted thresholds)

**The booking froze at `declared_pax = 3`, not the plan's assumed 4** — a consequence of how step 4 actually ran. The thresholds therefore shifted by one and were verified **at the shifted values**, which is the same assertion one seat lower:

- **Silent at 3-attending vs 3-declared.** No nudge. (The plan's expected silence, at 3 rather than 4.)
- **At the FIRST over-subscription (4 attending vs 3 declared) the nudge fired**, reading verbatim:
  - title: **`More people are coming than you booked for`**
  - body: **`4 people are coming, but you booked for 3. You may owe a bit more for the extra 1 person at check-in.`**
- **Neutral alert. No payment button. No amount.** G5 / 08-UI-SPEC honoured.

Roster showed `You · Organizer` plus three `Guest` rows (`Titeng Galit`, `Titang Galit`, `Paepal`), each `Coming`, each with `Remove attendee`.

WR-04 / D-114 confirmed — including the specific expected number, **"1 extra person"**, and the specific expected silence one step below it.

### Step 7 — The cap holds (SC4 / GROUP-05). ✅ APPROVED

The group filled and then refused further attendees. The invite page rendered:

```
This group is full
All 11 spots are taken. You can still let the organizer know you can't make it
```

with **"Yes, I'm coming" disabled**.

The human asked whether the **11** was because one place is the organizer's. It is — confirmed against the live row: **`capacity_snapshot = 11`, `yes_rows = 11`, `listing.max_occupancy = 12`.**

Recording this explicitly as the **WR-03 convention working end to end**: the public invite page is **organizer-EXCLUSIVE** by design (`src/components/group/rsvp-form.tsx:98` reads `capacity_snapshot` for that sentence) while the organizer page is **organizer-INCLUSIVE** (`12 of 12`). 11 invitees + the organizer = the listing's rating of 12. **SC4's "hard-capped at the listing's capacity" is literally true**, live, not merely unit-tested — and the two numbers a human sees differing by one is the intended design, not an inconsistency.

### Step 8 — The invite page and email time (CR-01, second half). ✅ APPROVED

Public invite page, literal string:

```
Tuesday, Jul 28, 7:00 PM – 8:00 PM (Makati time)
```

**Not "Full day".** The address line rendered `Approximate area — Makati. The organizer has the exact address.` (Q-16 / `showExactAddress`). **Email confirmed** — `RESEND_API_KEY` was set, so this was real delivery and not a `[email:dev]` log line.

CR-01 is therefore confirmed on **four** surfaces by a human: the reserve page, the booking detail, the public invite page and the RSVP email.

### Step for CR-04

None expected. CR-04 (the rate-limit bound and resolve-before-budget) is server-side and fully covered by 08-11's automated tests; the plan states there is no human step for it. Not a gap.

---

## Environment interruption (a UAT lesson, not a product defect)

The run was interrupted mid-walkthrough. The **ngrok tunnel started during Task 1 died when that agent exited**, so no webhook reached the app and the booking sat `pending` — **steps 5-8 were BLOCKED, not failing.**

The human restarted `ngrok http 3000`, which reclaimed the same static domain `eloquent-pounce-entangled.ngrok-free.dev`, and **PayMongo retried both deliveries automatically**:

| Event | Delivered | Result |
|---|---|---|
| `evt_RVZMkSu3S6y15ThmG2BKA1yJ` | 2026-07-28T10:17:28Z | HTTP 200 |
| `evt_rY8iwHDct3aiHfXhx9Xs3Eeq` | 2026-07-28T10:18:13Z | HTTP 200 |

The booking confirmed on retry and the walkthrough resumed.

**The lesson, for the next UAT: a tunnel started inside a subagent does not outlive it — start it in your own terminal.** (This is the same class of trap as the standing two-process Inngest requirement already recorded in the local-env memory file.) The silver lining worth keeping: PayMongo's own webhook retry recovered the missed deliveries with no manual replay, which is independent evidence that the D-57 webhook-as-confirm-authority design tolerates a dead tunnel.

---

## Deviations from Plan

**None of the deviation rules 1-4 were applied — this plan modifies no source file and none was modified.**

Two things departed from the plan's script, both recorded above rather than smoothed over:

1. **Step 4's sequence was not the scripted one** (two submissions at the same headcount instead of a re-price then a reload). It produced a more serious finding than the one it was looking for, and it left the scripted CR-02 assertion NOT VERIFIED. Both facts are stated.
2. **The booking froze at `declared_pax = 3` rather than 4**, shifting steps 6-7's thresholds by one. The assertions were verified at the shifted values, which test the same properties.

## Issues Encountered

1. **The double-charge (step 4)** — see above. Routed to `/gsd-plan-phase 8 --gaps` by operator decision; logged as **deferred item 5**.
2. **The dead ngrok tunnel** — see above. Resolved by restarting the tunnel; PayMongo's automatic retry recovered both deliveries.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: financial-integrity | `src/app/actions/booking.ts` (`confirmBooking`) | A new, previously-unregistered surface: `confirmBooking` creates a checkout session without retiring the one already named on the booking row. T-08-59 registered the *re-price* path (mitigated by 08-13); the **plain double-submit** path was not in any Phase-8 threat register and is exploitable without a re-price, on flat bookings too. |
| threat_flag: provider-assumption | `src/lib/paymongo.ts` (`createCheckoutSession`) | The `Idempotency-Key` guarantee documented at `:172` is not provided by PayMongo for `/v1/checkout_sessions`. Any other call site reasoning from that comment needs re-auditing. |

## Known Stubs

None. This plan wrote no code.

## Requirements

`GROUP-01`, `GROUP-04`, `GROUP-05` were already `Complete` in `REQUIREMENTS.md` before this plan ran (checked off in Phase 8's main run); this walkthrough is confirmatory evidence for them, not their first completion. **GROUP-04 and GROUP-05 are now human-confirmed on the per-head path** (steps 5-7). **GROUP-01's per-head money path carries the open step-4 defect** — the booking is real and confirms correctly, but a double-submit overcharges.

## Next Phase Readiness

**The plan's own success criterion is met:** the open `human_verification` item in `08-VERIFICATION.md` has been genuinely exercised on a listing that actually charges per head, with a per-step record — and every gap-closure fix from this run that has a visible surface has been seen working by a human (CR-01 on four surfaces, CR-03's clamp, WR-03's two conventions, WR-04's nudge and its silence, SC4's live cap), **or its failure has been logged** (CR-02's live re-price assertion: not exercised; the new double-charge: logged in full).

**Phase 8's 17 plans are now all executed.** What blocks a clean phase close is **one new finding, not a stale one**:

- 🔴 **Deferred item 5 — the `confirmBooking` double-charge.** BLOCKER-class on the money path, wider than Phase 8 (flat bookings included), and the fix must ship with a **real-API** test. This is the next `/gsd-plan-phase 8 --gaps` input.
- 🟡 **CR-02's live re-price assertion is still unproven by a human.** Fold it into the same gaps plan — the same real-API test harness that closes item 5 can drive it.
- 🟡 **Deferred item 2** (request-mode listings can't declare a headcount pre-approval) remains open and out of scope, as it has been since 08-05.

---
*Phase: 08-group-bookings*
*Completed: 2026-07-28*
