---
phase: 09-open-capacity-bookings
plan: 16
subsystem: testing
tags: [uat, human-verification, paymongo, sk_test, webhook, inngest, ngrok, drop-in, open-capacity, oc-11, playwright]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    provides: "the whole shipped drop-in stack this walkthrough drives by hand — the occupancy_mode DDL + admissions claim (09-01/09-02/09-03), the forked read model and search (09-04/09-05), the publish gate + mode lock (09-06), placeOpenHold (09-07), the drop-in when-label fork (09-08), cancellation reuse with the anti-resell block SKIPPED (09-09), the wizard fork (09-10), SpotsLeftChip (09-11), DatePassPicker (09-12), the drop-in money surface (09-13), the search-card fork (09-14), and the browser proof + repository gate (09-15)"
  - phase: 08-group-bookings
    provides: "the 08-17 lesson this plan exists to apply — a mock that faithfully implements your assumption can only ever validate your assumption; a human walkthrough against the REAL sk_test_ rail is the only thing that falsifies it"
  - phase: 06-payments-payouts
    provides: "the PayMongo hosted-checkout rail, the checkout_session.payment.paid webhook and its Paymongo-Signature verification, unchanged by Phase 9"
provides:
  - "the phase's ONLY manual-only verification, DISCHARGED: three REAL PayMongo sk_test_ checkouts confirmed three drop-in bookings by webhook, each followed within ONE SECOND by a booking_confirmed notification row — the whole PayMongo → tunnel → webhook route → status flip → inngest.send → notify → row chain proven live rather than mocked (T-09-49)"
  - "the Pitfall-5 / T-09-31 guarantee proven in the DATABASE as well as on screen: after a host-cancel of a drop-in booking, availability_block for that listing returns 0 rows and the date stays bookable for everyone else"
  - "a nine-step, individually recorded PASS/FAIL walkthrough record with verbatim on-screen strings and live DB read-backs — no blanket sign-off (the 08-17 rule)"
  - "the OC-11 expectation gap, root-caused from live data and converted into an ASSERTED contract: e2e/open-capacity.spec.ts case 2 now buys passes ONE AT A TIME and pins the invisible 3 → 2 transition as intentional (mutation-measured)"
  - "corrected truth-claim wording in 09-15-SUMMARY.md and 09-VALIDATION.md — 'the spots-left figure decrements between them' now names the cap at which a decrement is VISIBLE"
  - ".planning/phases/09-open-capacity-bookings/deferred-items.md — two product items logged and cross-referenced (the unexplained 'Drop-in' word; small-cap scarcity invisibility as accepted design with the declined option on the record)"
affects: [phase-verification, future-phases-touching-drop-in-copy, future-phases-touching-spots-left-thresholds, future-uat-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A test that takes the shortcut a user cannot take will confirm a claim the user will not experience — 09-15 moved two heads in ONE insert (3 → 1) and so never crossed the invisible 3 → 2 step a human buying one pass at a time hits FIRST"
    - "When a human reports a defect that turns out to be a display rule, do not close the report — ASSERT the rule. An accepted design with no test is indistinguishable from an accidental blind spot six months later"
    - "Correct a truth claim IN PLACE with the reason stated and the original left standing, rather than rewriting it — the reader needs to know both what was believed and why it was wrong"
    - "Read the walkthrough's own bookings back out of Postgres afterwards: the row set explains the human's experience more precisely than the human can (here it showed the `low` chip state was UNREACHABLE given the 1-then-2 purchase pattern)"

key-files:
  created:
    - .planning/phases/09-open-capacity-bookings/deferred-items.md
  modified:
    - e2e/open-capacity.spec.ts
    - .planning/phases/09-open-capacity-bookings/09-15-SUMMARY.md
    - .planning/phases/09-open-capacity-bookings/09-VALIDATION.md

key-decisions:
  - "Step 4's reported FAIL is recorded as PASS-with-note by OPERATOR DECISION (2026-07-31, 'accepted design — record and move on'): the counter was correct throughout and the OC-11 half-capacity clamp is deliberate anti-dark-pattern design verified 6/6 by the UI checker. src/ is untouched"
  - "The remedy is a TEST and a CORRECTION, not a code change: the invisible 3 → 2 transition becomes an asserted contract, and the two documents that claimed a visible decrement without naming the threshold are corrected in place"
  - "Step 6 (partial grant) is recorded PASS / NOT REACHABLE THROUGH THE UI — the plan predicted exactly this: the pass stepper is bounded by remaining, and the OC-07 alert is reserved for a genuine race"
  - "Step 7's copy finding ('users don't know what a drop-in is') is DEFERRED, not fixed — it is a product/copy decision with four mutually exclusive candidate fixes and no room on the card, and 09-16 declares files_modified: []"
  - "The walkthrough ran mostly on the SAME-DAY date 2026-07-31 rather than the prepared 2026-08-03, and that is recorded plainly rather than papered over — same-day drop-in is the HARDER path and exercises 09-02's expires_at caps-at-ends_at correction"
  - "The e2e change ships under 09-16 despite the plan declaring files_modified: [] — it is the direct, operator-chosen remedy for the walkthrough's one finding, and the alternative (leaving the blind spot unasserted) is the thing this phase has spent sixteen plans refusing to do"

patterns-established:
  - "Pattern: a UAT finding that resolves to 'working as designed' still owes the repository an assertion — otherwise the design is only a memory"
  - "Pattern: re-derive the walkthrough's evidence from the database after the human leaves (bookings, notifications, availability_block), so the record carries facts the screenshots cannot"
  - "Pattern: when logging an accepted-design deferral, record the option that was DECLINED and why, so a later reader can tell a choice from an oversight"

requirements-completed: [OPEN-01, OPEN-02, OPEN-03, OPEN-04]

# Metrics
duration: 41min
completed: 2026-07-31
---

# Phase 9 Plan 16: The Drop-In Human Walkthrough Summary

**A human published a drop-in listing through the wizard and paid for real passes on the live PayMongo `sk_test_` rail three times — three `checkout_session.payment.paid` webhooks, three confirmed bookings, three `booking_confirmed` notification rows within one second each — and the one thing that looked broken (a spots chip that never moved) turned out to be the OC-11 half-capacity clamp working exactly as designed, which is now an asserted e2e contract instead of an accidental blind spot.**

## Performance

- **Duration:** ~41 min (continuation agent; the human-run checkpoint itself spanned 01:15 → 01:41 Makati time)
- **Started:** 2026-07-31 (Task 1 environment prep committed `a21f058`)
- **Completed:** 2026-07-31
- **Tasks:** 2 (Task 1 auto, Task 2 `checkpoint:human-verify` — human-run, nine steps)
- **Files modified:** 4 (1 created, 3 modified — **zero under `src/`**)

## The Fixture, Read Back From Postgres

| Field | Value |
|---|---|
| Listing | `a3f00968-dcc1-4d41-a053-9710408ca713` — **Poblacion Drop-In Fitness Floor** |
| `occupancy_mode` | `open_capacity` |
| `per_head_price_cents` | `35000` (₱350.00/person) |
| `max_occupancy` / `unit_count` | `3` / `1` |
| `booking_mode` / `cancellation_policy` | `instant` / `standard` |
| `status` / `timezone` | `published` / `Asia/Manila` |

Published **through the wizard**, not patched into the database — the wizard is half of what the walkthrough
tests.

---

# The Nine Steps — Recorded Individually

**No blanket sign-off (the 08-17 rule).** Each step below carries its own result and its own evidence. Steps
4, 6 and 7 carry notes; nothing is marked PASS by assumption.

## Step 1 — Host comprehension (OPEN-01) · **PASS**

Screenshot-confirmed on the wizard's occupancy step:

- Heading: **"How do people use your space?"**
- **Two equal-weight cards**, `Drop-in passes` selected, **neither coral** — the mode choice is not
  pre-editorialised by colour.
- Footer line, verbatim: **"This changes how you're paid and how people book. You can change it later, as
  long as you have no bookings still to come."**

*The plan's real question — "does the mode choice read clearly to you as a host, without any product
knowledge?" — was answered YES.* This is the T-09-36 mitigation (a host mis-selling their space), and it is
the only test that can answer it.

## Step 2 — The public page is day-shaped (OC-02) · **PASS**

Confirmed on `/listings/a3f00968-…`: the `Drop-in` badge beside `Availability`, the day framing, **no hour
chips anywhere**, the spots chip, the `Open …` hours line, and the rail's `₱…/person` ·
`Service fee included` · `Up to 3 people a day` with the `How many passes?` stepper bounded at 3.

This is one of three surfaces carrying the T-09-28 mitigation (a drop-in pass must never be presented as a
16-hour reservation); steps 3 and 7 carry the other two.

## Step 3 — Book and PAY for real (OPEN-02) · **PASS** — *the T-09-49 mitigation, actually exercised*

**Three REAL PayMongo `checkout_session.payment.paid` deliveries**, Makati time, verified in the logs and
re-derived from the database by this agent:

| Event id | Delivered | Booking confirmed |
|---|---|---|
| `evt_oGtPa9Vd7ZqWFiPRntuSjacm` | 2026-07-31 01:31:16 | `215d2739-cca3-441b-a9d7-c9d5a339bcea` |
| `evt_zBVdHpjZL1N6hmVtasiZ5K6X` | 2026-07-31 01:34:56 | `340b5323-b619-469a-81ae-dd79173e6e37` |
| `evt_BRQR1Xx9FQcJhy2Dgvmti6m4` | 2026-07-31 01:36:14 | `5b992c46-abaf-4f16-b680-23c6b9296f81` |

**A `booking_confirmed` notification row landed within ONE SECOND of each.** Read back from
`notification` (Makati time), independently of the logs:

```
booking_confirmed | 215d2739-cca3-441b-a9d7-c9d5a339bcea | 2026-07-31 01:31:16.926487   (event @ :16)
booking_confirmed | 340b5323-b619-469a-81ae-dd79173e6e37 | 2026-07-31 01:34:57.128856   (event @ :56)
booking_confirmed | 5b992c46-abaf-4f16-b680-23c6b9296f81 | 2026-07-31 01:36:15.126080   (event @ :14)
```

**That one second is the proof the Inngest half ran.** The chain it exercises end to end:
**PayMongo → ngrok tunnel → `/api/paymongo/webhook` → booking status flip → `inngest.send` → the notify
function → the notification row.** None of it is mocked. This is the phase's single manual-only verification
and it is now **discharged** (`09-VALIDATION.md` § Manual-Only Verifications updated in place).

The frozen price triple survived the round trip unchanged — read back from `booking`:
`space_price_cents 35000 · service_fee_cents 1750 · quoted_total_cents 36750` at `declared_pax 1`, and
`70000 · 3500 · 73500` at `declared_pax 2`. Every row carries `open_capacity = t`, `unit = 1`,
`full_day = f`, and `starts_at`/`ends_at` at the venue's `06:00`/`22:00` Makati instants — exactly the OC-03
shape, with **no 16-hour range presented to the booker anywhere**.

## Step 4 — Spots decrement across bookers (OPEN-04) · **PASS-with-note**

> **Reported by the human as FAIL — *"i dont see chip auto deducting or what."*
> RECLASSIFIED BY THE HUMAN to "accepted design" after root-cause analysis. Recorded here as
> PASS-with-note, carrying the full analysis, per the operator's decision on 2026-07-31.**

### The counter was never wrong

Live arithmetic at the time of the walkthrough:

| Date | cap | taken | remaining | state |
|---|---|---|---|---|
| 2026-07-31 | 3 | 3 | 0 | `full` |
| 2026-08-03 | 3 | 0 | 3 | `open` |

**Every claim decremented correctly.** There is no defect in `openTakenSql`, in the read model, or in the
claim.

### The display rule is what hid it

```
lowStockThreshold(cap) = clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX)   src/lib/availability/open-capacity.ts:32
lowStockThreshold(3)   = clamp(1, 1, 5) = 1
```

`SpotsLeftChip` discloses an exact figure **only** in the `low` state (`remaining <= threshold`). At cap 3
that means:

| remaining | state | chip |
|---|---|---|
| 3 | `open` | `Spots available` |
| 2 | `open` | `Spots available` ← **identical to 3 — no visible change at all** |
| 1 | `low` | `Only 1 left` |
| 0 | `full` | `Fully booked` |

**On a cap-3 listing the first booking produces no visible change whatsoever.**

### And on THIS listing, the `low` state was never reachable at all

Read back from `booking` (Makati time), the Jul-31 purchase pattern was **1 pass, then 2 passes**:

```
340b5323  dropin.booker2  declared_pax 1  created 01:34:48   → remaining 3 → 2   chip: "Spots available"  (unchanged)
5b992c46  dropin.booker1  declared_pax 2  created 01:36:08   → remaining 2 → 0   chip: "Fully booked"
```

So the human's sequence was `Spots available` → `Spots available` → `Fully booked`. **`Only N left` never
rendered once**, which is precisely, and completely, the experience they reported. The data explains the
report exactly.

*(A fourth row, `824cb7ee`, from the pre-existing `test@gmail.com` account at 01:15:57, is `cancelled` and
**unpaid** — an abandoned hold. It correctly occupies nothing: `openTakenSql` counts `confirmed ∪ pending
not-yet-expired` only, which is why the Jul-31 total is 3 heads and not 4.)*

### Why the automated proof missed it

`e2e/open-capacity.spec.ts:77` used the **same `CAP = 3`** — but its decrement case moved **TWO heads in one
`INSERT`** (3 → 1), so the chip visibly changed and the invisible 3 → 2 step was never crossed. **A human
buying one pass at a time crosses 3 → 2 FIRST and sees nothing.** 09-15's truth claim — *"the spots-left
figure decrements between them"* — is **literally satisfied** while the human experience is *"nothing
happened."*

> **The general lesson, worth carrying forward: a test that takes a shortcut the user cannot take will
> confirm a claim the user will not experience.**

### Why it is deliberate, and what was done instead

OC-11 / 09-UI-SPEC § Spots-left / T-09-39: a flat "always show the number" marks a 6-person studio urgent
from its FIRST booking; the half-capacity clamp guarantees urgency can never fire while more than half the
day's admissions are open, and `OPEN_LOW_STOCK_MAX` stops a 40-cap gym crying "18 left". **Invented urgency
is a dark pattern.** The behaviour was verified 6/6 by the UI checker.

The human was offered three dispositions and chose **"accepted design — record and move on"**. **Nothing in
`src/` changed.** What changed instead:

1. **The invisible transition is now an ASSERTED CONTRACT.** `e2e/open-capacity.spec.ts` case 2 buys the two
   heads **one at a time** and asserts the chip still reads `Spots available` — and still carries **no digit**
   — at 2 of 3 remaining, before the second head crosses to `Only 1 left`. **Mutation-measured:** forcing
   `lowStockThreshold` to `cap - 1` turns that assertion RED with
   `Expected: "Spots available" / Received: "Only 2 left"`; restored, `git diff --exit-code src/` = 0.
2. **The misleading wording is corrected in place** in `09-15-SUMMARY.md` and `09-VALIDATION.md` (see
   *Corrections Landed* below).
3. **The threshold question is logged** as an accepted-design deferred item with the declined option on the
   record (`deferred-items.md` item 2).

## Step 5 — Sell out (OPEN-03) · **PASS**

The date rendered `Fully booked`, the day panel said all passes for the day are taken, the month cell was not
clickable, and **nothing was red**. Another date remained selectable. Selling out is a normal marketplace
outcome, and it reads like one.

## Step 6 — Partial grant (OC-07) · **PASS — NOT REACHABLE THROUGH THE UI, by design**

With 1 spot left, the human could not ask for 3 passes: **the stepper's max is bounded by `remaining`.** The
plan predicted exactly this and pre-authorised the outcome — the OC-07 alert (`Only 1 left for {date}`, both
money figures, `Nothing has been charged yet.`, `Pick another date`) is **reserved for a genuine race**, i.e.
a booker who was granted fewer heads than they asked for because somebody else claimed in between. Its
component-level proof is 09-13's (`tests/booking/partial-grant-notice.test.tsx`, green).

**Recorded as by-design, not as an untested path.**

## Step 7 — Search (OC-12) · **PASS**, with a copy finding

The drop-in card showed the `Drop-in` badge, `₱…/person`, `Service fee included`, and **no time range at
all** — the third T-09-28 surface. The card left results once the date was fully booked.

> **Copy finding, DEFERRED by operator decision: "users don't know what a 'drop-in' is."**
>
> The word carries the entire mental model on a surface with no room to explain it. The explanation exists —
> `Pick a day — your pass is good any time they're open.` — but only on the listing page, which a booker
> reaches **after** deciding the card is worth a click. Logged as `deferred-items.md` **item 1**, with four
> candidate fixes and their trade-offs. Not fixed here: 09-16 declares `files_modified: []` and this is a
> product/copy decision, not a bug.

## Step 8 — Cancellation (OC-15/OC-16) · **8a PASS · 8b PASS · 8c PASS** — *the most important step*

- **8a — booker cancel · PASS.** The review page used the drop-in framing (`before the space opens`, not
  "before the session"), showed the refund breakdown, and did not refund the service fee.
- **8b — host cancel · PASS.** The dialog listed **exactly TWO** consequences (refund + host fee) and
  **no "Block … on this space" bullet**. This is 09-09's fork: the D-70 anti-resell auto-block is deliberately
  SKIPPED for drop-in bookings, because blocking a shared date to punish one host-cancel would evict every
  other pass-holder on it.
- **8c — the date stays bookable for everyone else · PASS, and independently confirmed in DATA:**

```sql
SELECT count(*) FROM availability_block WHERE listing_id='a3f00968-dcc1-4d41-a053-9710408ca713';
--  blocks
-- --------
--       0
-- (1 row)
```

**Zero rows**, after the host cancelled `215d2739-cca3-441b-a9d7-c9d5a339bcea` at **01:39:55** (with
`cancelled_by = 'host'`, and `booking_cancelled_by_host` notification rows to both parties at
`01:39:55.929` and `01:39:55.959`). **The Pitfall-5 / T-09-31 guarantee holds in the database as well as on
screen** — the human-observable form of an assertion that until now existed only in an integration test.

## Step 9 — Mode lock (OC-17) · **PASS**

Screenshot-confirmed, verbatim:

> **You can't change this while bookings are still to come**
> **2 bookings on this space are still ahead. You can switch after the last one finishes on Fri, Jul 31,
> 10:00 PM (Makati time). To switch sooner, cancel those bookings first — that refunds your guests in full.**

with `View your bookings` offered and `Whole space` rendered **`Locked`**. The alert names **how many**
bookings are ahead, **when** it unlocks (a real date and time **with the city named**), and **what to do
about it**. That is the whole OC-17 contract.

---

## Fixture Note — recorded plainly

The human ran **most** of the walkthrough on the **same-day date 2026-07-31** rather than the prepared
**2026-08-03**. (The first paid booking, `215d2739`, *was* on the prepared Aug-3 date; the other three rows
are Jul 31.) A fourth, pre-existing account — `test@gmail.com` — placed one of the Jul-31 bookings
(`824cb7ee`, abandoned unpaid at 01:15:57).

**This does not weaken any result, and is in fact the harder path.** A same-day drop-in booking exercises
09-02's `expires_at` **caps-at-`ends_at`** correction directly: the listing's `starts_at` of 06:00 Makati was
**already in the past** when the holds were minted, so a naive "expire N minutes from now" would have minted a
hold outliving the day it sells. It did not. Noted here rather than papered over.

---

## Corrections Landed (the misleading truth claim)

09-15's SUMMARY and `09-VALIDATION.md` both asserted *"the spots-left figure decrements between them"* without
naming the cap at which a decrement is **visible**. Both are corrected **in place, with the original left
standing and the reason stated** — the way this phase has handled every other correction.

| File | Change |
|---|---|
| `09-15-SUMMARY.md` | A `⚠️ Correction (2026-07-31, entered by 09-16)` block added directly under the one-liner: it states the display rule in full, gives the cap-3 table, names the operator decision, explains why the e2e missed it, and instructs the reader to read every "decrement" claim in the document as *"decrements in the database on every head, disclosed on screen from `lowStockThreshold(cap)` downward."* The frontmatter `provides` line and the "The decrement is observable" bullet each carry an inline pointer to it. **Nothing was deleted.** |
| `09-VALIDATION.md` | The 09-15 T1 row is re-labelled `09-15 T1 (amended 09-16)` and its description now states the threshold formula, the cap-3 consequence, and that both steps are asserted. The Wave-0 checklist item carries a dated wording correction. § Manual-Only Verifications is marked **✅ DISCHARGED** with the three event ids, timestamps and the one-second notification evidence. |

## Task Commits

1. **Task 1: prepare the walkthrough environment and the drop-in fixture** — `a21f058` (docs — STATE.md note
   only; no `src/`, `e2e/` or `tests/` file was touched, as the plan requires)
2. **Task 2: the drop-in walkthrough** — human-run, nine steps, recorded above. No commit of its own (the
   plan declares `files_modified: []`).
3. **Follow-up (the operator-chosen remedy): pin the invisible 3 → 2 transition as intentional** — `70c392a`
   (test)

## Files Created/Modified

- `e2e/open-capacity.spec.ts` *(modified, +41/−8)* — case 2 renamed and restructured to buy the two heads
  **one at a time**, asserting the digit-free `Spots available` at 2 of 3 remaining before `Only 1 left` at 1.
  The `CAP = 3` comment now states the consequence of the threshold rather than only the threshold. Total
  heads taken on the shared date is unchanged (2), so the serial fixture's downstream cases are untouched.
- `.planning/phases/09-open-capacity-bookings/deferred-items.md` *(created)* — the two product items, logged
  and cross-referenced.
- `.planning/phases/09-open-capacity-bookings/09-15-SUMMARY.md` *(modified)* — the Correction block and two
  inline pointers.
- `.planning/phases/09-open-capacity-bookings/09-VALIDATION.md` *(modified)* — amended row, corrected
  checklist item, manual-only verification discharged.

**`git status --short -- src/` is EMPTY.** No production file was modified by this plan.

## Deferred Items Logged

`.planning/phases/09-open-capacity-bookings/deferred-items.md` (per-phase convention, as in phases 04, 07 and
08 — there is no repo-root `.planning/deferred-items.md`):

1. **"Drop-in" is unexplained on the search card** — step 7's finding. Four candidate fixes with their
   trade-offs (rename the badge / micro-line under the price / one explainer above results / hover-tap), each
   with a real cost. Changing the badge text touches asserted literals in `e2e/open-capacity.spec.ts` case 3
   and `tests/search/search-card-open.test.tsx`.
2. **Small-cap scarcity is invisible until the last spot** — the OC-11 threshold question, logged as
   **ACCEPTED DESIGN** with the **declined option** on the record (`clamp(ceil(cap/2), 1, MAX)` or a
   `cap <= 3` special case — declined because it re-introduces always-on urgency on exactly the smallest,
   most intimate spaces).

**Cross-referenced:** both are cases where the drop-in surface tells a booker *less* than they need — item 1
withholds what a drop-in **is**, item 2 withholds how many are **left**. Each is individually defensible;
whether they are jointly defensible is the product question, and the first person to touch drop-in
comprehension copy should hold both in view.

## Decisions Made

- **Step 4 is PASS-with-note, by operator decision.** The counter was correct; the display rule is deliberate
  and checker-verified. Reclassifying a reported FAIL requires a decision, and the decision is recorded with
  its author and date rather than absorbed silently.
- **The remedy is a test and a correction, never a code change.** `src/` is byte-untouched. An accepted design
  with no test is indistinguishable from an accidental blind spot six months later, so the design got a test.
- **The e2e change ships under 09-16 despite the plan declaring `files_modified: []`.** The plan's constraint
  exists so a *walkthrough* cannot quietly become a *development* plan; it is not a reason to leave a measured
  blind spot unasserted. Recorded as a deviation below rather than smuggled in.
- **The mutation was executed against `src/` and restored.** The 09-15 idiom: a test is measured, not assumed.
  `git diff --exit-code src/` = 0 afterwards, verified.
- **Step 6 is recorded as by-design rather than as coverage debt.** The stepper's bound is the reason the
  alert is unreachable, and that bound is itself the desirable behaviour.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] The suite could not distinguish the OC-11 design from a broken counter**

- **Found during:** Task 2, step 4 (post-checkpoint, on the operator's chosen disposition).
- **Issue:** `e2e/open-capacity.spec.ts` case 2 took 2 heads in ONE insert (3 → 1) at `CAP = 3`, so the chip
  visibly changed and the 3 → 2 transition — the first one a real booker crosses — was never exercised. The
  invisible step was therefore an **accidental blind spot**, not an asserted decision: a future change to
  `lowStockThreshold` that made small caps count down from the first booking would have kept the whole suite
  green while silently re-introducing the invented-urgency dark pattern OC-11 exists to prevent.
- **Fix:** Case 2 now buys the heads one at a time and asserts the digit-free `Spots available` at 2 of 3
  remaining, before `Only 1 left` at 1. The `CAP` comment states the consequence. Total occupancy on the
  shared date is unchanged, so the serial fixture's downstream cases are unaffected.
- **Files modified:** `e2e/open-capacity.spec.ts`
- **Verification:** `npx playwright test e2e/open-capacity.spec.ts` → **5 passed (17.1s)**. Mutation-measured:
  `lowStockThreshold` → `cap - 1` turns the new assertion RED at exactly the right line
  (`Expected: "Spots available" / Received: "Only 2 left"`), restored, `git diff --exit-code src/` = 0,
  re-run green. `npx tsc --noEmit` exit 0.
- **Committed in:** `70c392a`

**2. [Rule 2 - Missing Critical] Two shipped documents asserted a visible decrement without naming the threshold**

- **Found during:** Task 2, step 4.
- **Issue:** 09-15's SUMMARY (`provides`, and the "The decrement is observable" bullet) and
  `09-VALIDATION.md` (the 09-15 T1 row, the Wave-0 checklist item) each claimed the spots-left figure
  "decrements between them" without stating that the figure is disclosed only from `lowStockThreshold(cap)`
  downward. Both claims are literally true and were read as something stronger — which is exactly what
  produced the step-4 report. A truth claim that misleads is a defect in the record.
- **Fix:** Corrected in place, original text left standing, reason stated and dated — see *Corrections
  Landed*.
- **Files modified:** `.planning/phases/09-open-capacity-bookings/09-15-SUMMARY.md`,
  `.planning/phases/09-open-capacity-bookings/09-VALIDATION.md`
- **Verification:** Both files re-read; the correction names the formula, the cap at which disclosure occurs,
  and the plan that amended it.
- **Committed in:** the plan-metadata commit

**3. [Deviation from plan constraint] `e2e/` was modified, though the plan declares `files_modified: []`**

- **Found during:** Task 2, post-checkpoint.
- **Issue:** The plan's success criterion reads `git status --short -- src/ e2e/ tests/` is empty. The
  operator's chosen disposition explicitly directs `e2e/` test 2 to gain the one-pass-at-a-time case.
- **Fix:** The `src/` half of the constraint is honoured **absolutely** (`git status --short -- src/` is
  empty, verified; the mutation was restored and `git diff --exit-code src/` returns 0). The `e2e/` half is
  knowingly and explicitly relaxed by the operator's decision, and the change is confined to the case the
  decision names.
- **Files modified:** `e2e/open-capacity.spec.ts`
- **Verification:** `git status --short -- src/` → empty. `git status --short -- tests/` → empty.
- **Committed in:** `70c392a`

---

**Total deviations:** 3 (2 missing-critical, 1 knowingly-relaxed plan constraint under operator direction).
**Impact on plan:** No scope creep and no production change. All nine walkthrough steps ran; the single
finding was root-caused, dispositioned by the operator, converted into an assertion, and its two misleading
truth claims corrected.

## Issues Encountered

### The expectation gap was in the RECORD, not in the code

The only "failure" this walkthrough produced was a **mismatch between what the documents claimed and what the
product does** — and the product was right. That is worth stating plainly, because the reflex on a UAT FAIL is
to look for a bug. The bug was in a sentence. Three things came out of that:

1. A design decision that existed only as prose (OC-11's clamp) now has an executable assertion.
2. Two documents that could mislead a future reader no longer do.
3. The general shape is recorded: **a test that takes a shortcut a user cannot take will confirm a claim the
   user will not experience** — the automated analogue of Phase 8's *"a mock that faithfully implements your
   assumption can only ever validate your assumption."* 09-15's case was not mocked; it simply moved faster
   than a human can.

### Two dispositions the walkthrough deliberately did NOT treat as failures

- **Step 6** could not be reached through the UI because the stepper is bounded by `remaining`. That bound is
  the feature. The plan pre-authorised recording it as NOT REACHABLE.
- **Step 7's** copy finding is real and is deferred, not dismissed — with candidates and trade-offs written
  down so the next person does not restart the analysis.

### Environment

No process was started or killed by this agent. The dev server (`:3000`), Inngest (`:8288`) and the ngrok
tunnel were the user's own, running throughout — the Phase-8 lesson (a long-lived process started inside a
subagent dies with that agent) held.

## User Setup Required

None. The PayMongo `sk_test_` key, the registered webhook endpoint on the full `/api/paymongo/webhook` path,
Inngest and the tunnel were all configured during Task 1 and are the operator's own.

## Next Phase Readiness

- **The phase's last gate is closed.** The only manual-only verification in `09-VALIDATION.md` — a real
  PayMongo hosted-checkout charge for a drop-in booking — is **discharged**, with three event ids, three
  confirmed bookings and three sub-second notification rows as evidence. The T-09-49, T-09-31, T-09-36 and
  T-09-28 mitigations were each exercised by the step the threat register assigns to them.
- **Phase verification is the orchestrator's to run.** This plan does **not** mark the phase complete.
- **Two product items are open and logged**, neither blocking: the unexplained "Drop-in" word, and the
  accepted-design small-cap scarcity threshold. Both should be revisited together.
- **A carried-forward note for anyone touching `lowStockThreshold` or `OPEN_LOW_STOCK_MAX`:** the cap-3
  invisibility is now an **asserted contract** in `e2e/open-capacity.spec.ts` case 2, deliberately. Changing
  the threshold will turn it RED — that is the assertion doing its job, and the deferred item explains what
  decision has to be re-made before the expectation is updated.

## Known Stubs

None. No production file was created or modified by this plan.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced — the plan
modified no `src/` file, and the `e2e/` change adds test assertions only.

## Self-Check: PASSED

- `.planning/phases/09-open-capacity-bookings/09-16-SUMMARY.md` — FOUND
- `.planning/phases/09-open-capacity-bookings/deferred-items.md` — FOUND
- `e2e/open-capacity.spec.ts` — FOUND (one-pass-at-a-time case present; spec **5 passed**)
- `.planning/phases/09-open-capacity-bookings/09-15-SUMMARY.md` — FOUND (Correction block present)
- `.planning/phases/09-open-capacity-bookings/09-VALIDATION.md` — FOUND (row amended, manual-only discharged)
- commit `a21f058` (Task 1) — FOUND
- commit `70c392a` (the e2e case) — FOUND
- `git status --short -- src/` — EMPTY
- `docker compose exec db psql … availability_block WHERE listing_id='a3f00968-…'` — **0 rows**, re-verified
  by this agent

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-31*
