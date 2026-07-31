---
phase: 09-open-capacity-bookings
plan: 25
subsystem: bookings-cancellation
tags: [postgres, drizzle, server-action, occupancy-mode, cancellation, refunds, disclosure, audit, rsc]

requires:
  - phase: 09-open-capacity-bookings
    provides: "the persisted booking.open_capacity snapshot (OC-03) the window fork keys on"
  - phase: 09-open-capacity-bookings
    provides: "09-17's confirmBooking fork — without it a same-day pass could not be BOUGHT, which masked this defect"
  - phase: 09-open-capacity-bookings
    provides: "createOpenCapacityHold — the REAL claim that mints the drop-in-shaped row case 6 is proven against"
  - phase: 07-cancellation-refunds
    provides: "cancelBookingAsBooker, quoteRefund, the D-68 LADDER, the D-72 refund rails and the cancel review RSC"
  - phase: 09-open-capacity-bookings
    provides: "09-09's CancellationPolicyDisclosure openCapacity prop and its copy test file"
provides:
  - "the occupancy-mode-forked booker cancellation window (ends_at for an open row, starts_at for an exclusive one)"
  - "PASSES_ENDED — the drop-in refusal sentence, closing the cancel-booking.ts half of NT-01"
  - "isPastWindow — the predicate that replaced two identity comparisons, keeping the past_start audit reason at both sites"
  - "CancellationPolicyDisclosure.windowAlreadyOpen — a REQUIRED prop and its exported PASS_NON_REFUNDABLE_MESSAGE"
affects: [09-21, phase-verification]

tech-stack:
  added: []
  patterns:
    - "A mode fork evaluated in SQL from the row's own column — `(CASE WHEN open_capacity THEN ends_at ELSE starts_at END) > now()` — keeps every guard inside the atomic WHERE, so a 0-row result stays the single calm failure path and no guard can be raced apart from the others"
    - "When two paths compare DIFFERENT instants, the shared explainer takes the CALLING path's window as an argument rather than guessing — an explanation must never describe a guard other than the one that actually refused"
    - "A second refusal constant turns every `=== CONSTANT` identity comparison into a repudiation bug; replacing them with one predicate is part of adding the constant, not a follow-up"
    - "An O3 disclosure sentence is an exported TS string constant rendered through an expression container, so the source bytes and the rendered bytes are identical and a copy audit can grep the sentence a booker actually reads"

key-files:
  created: []
  modified:
    - src/app/actions/cancel-booking.ts
    - src/app/(app)/bookings/[id]/cancel/page.tsx
    - src/components/booking/cancellation-policy-disclosure.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/app/listings/[id]/page.tsx
    - tests/booking/open-capacity-cancel.test.ts
    - tests/booking/cancellation-copy.test.tsx

key-decisions:
  - "`explainNoRows` takes the CALLING path's window (`\"booker\" | \"host\"`) rather than a single mode fork — a deviation from the plan's literal instruction (c) ('compute future from the same instant the UPDATE compares'), which presumes ONE update instant. After this plan there are two: the booker's open-row window ends at `ends_at`, the host's at `starts_at` in both modes. A single fork would have told a HOST refused on a still-live pass that the booking 'is no longer active' — a false sentence, and a behaviour change on a path the plan's own scope note says is unchanged. The mutation run made this visible before any human did: with the flip reverted and the explainer still forked, the audit line printed `\"reason\":\"not_active\"` for a live pass."
  - "WHICH refusal is chosen by WHAT ran out — the very instant the path just compared — not by the mode alone. On the booker path an open row's window ended when the venue CLOSED, so the day's passes are over; everywhere else the instant is the session's own start and the shipped sentence is already true of it. This is why the host path keeps PAST_START unchanged for a live drop-in pass."
  - "The HOST flip is byte-untouched (T-09-91) and its comment now RECORDS the asymmetry as a choice: it previously claimed to be 'the same guard the booker path carries', which this plan made false. A comment that lies about a security-relevant asymmetry is worse than no comment."
  - "The cancel review page forks the same window AND the same two sentences. Forking only the gate would have left the page refusing to render a cancellation the action would happily perform — a dead end one click earlier, which is the worse half of the same bug. Its own comment already required the page and the action to match word for word."
  - "The disclosure SUPPRESSES the rung list when the window has opened rather than restating it beside the non-refundable statement: printing '24 hours or more — full refund' next to 'this pass can't be refunded' would contradict itself on a money surface. The tier name and the mandatory service-fee paragraph stay, so the policy is still disclosed."
  - "The non-refundable statement lives in the COLLAPSED `<summary>`, not the expanded body — a disclosure a booker must expand to find is not one they demonstrably saw (D-81)."
  - "The 'fully ended day' fixture is YESTERDAY, not an earlier window today: a window that both opened and closed earlier today does not exist at every hour (a run between venue-local 00:00 and 00:0N would find it still open and assert the wrong branch). Same deviation 09-17 recorded for the identical shape."

patterns-established:
  - "The DATABASE assertion goes FIRST in a case whose defect is a write that did not happen — case 6's failure message under mutation is `expected 'confirmed' to be 'cancelled'`, which names the harm; a `res.ok` assertion would only say the action said no"
  - "A partial revert is observable in the AUDIT TRAIL before it is observable anywhere else — the mutation's unplanned `not_active` line is recorded in the test header as evidence that the two halves of the fork are one change"

requirements-completed: [OPEN-02]

duration: ~35min
completed: 2026-08-01
---

# Phase 09 Plan 25: A Live Drop-in Pass Is Cancellable, and Says So Before You Pay (WR-05 · NT-01) Summary

**A drop-in pass is no longer final from the moment the venue opens: the booker's cancellation window is forked on the persisted `open_capacity` column to close at `ends_at`, so a pass can be cancelled for the whole day it covers — retaining the full space price and returning the head to the pool — and a booker buying a pass for a day that has already opened is told, before they pay, that cancelling returns nothing.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 of 2, each committed atomically

## What Was Broken

`cancelBookingAsBooker`'s flip was scoped `AND starts_at > now()`. For a drop-in pass that instant is the venue's **opening** time (OC-03), so the entire day a pass was valid for was a day on which it could be neither cancelled nor refunded — even though the pass was still fully usable and the spot it held was still sellable to someone else.

Until 09-17 this was masked: CR-01 meant a same-day pass could not be bought at all. **09-17 removed the mask and exposed it directly** — a pass bought at 15:00 for today became instantly non-cancellable and non-refundable, and nothing on the reserve page said so. Shipping that is "you bought it, it's final, and nothing told you", which was the worst of the reviewer's two options.

Both refusals also read *"This session has already started"* — the exact framing 09-08 forked `when-label.ts` to eliminate for passes and 09-17 forked the checkout copy to eliminate (NT-01).

## Task 1 — The Window Fork and the Forked Refusals (`ed3eb1c`)

**The guard, forked in SQL from the row's own column:**

```
AND (CASE WHEN open_capacity THEN ends_at ELSE starts_at END) > now()
```

Every other predicate (`id`, `booker_id`, `status = 'confirmed'`) and the whole `SET` clause are byte-identical. The mode is read from the **persisted** column and from nothing else — never inferred from a null rate, a null `declared_pax` or `full_day`, because a drop-in listing may legally still carry `hourly_rate_cents` / `day_rate_cents` (OC-17).

**Why this is safe, restated in the code at the fork itself:**

- **The D-94 clawback property is preserved, not weakened.** Payout is not eligible until `ends_at + 24h` (D-55), and while a pass window is live that instant is by construction still in the future — so a live-window cancel remains a platform-wallet reversal with the host never yet paid. That is the same reason the guard was safe before it moved.
- **No money math moves with it.** `quoteRefund` handles a negative `hoursToStart` by design (`cancellation.ts:92-96` — nothing satisfied falls through to 0), so a live-window cancel refunds nothing and retains the **full** space price. `retained_space_cents` is what the 07-04 payout sweep reads (`COALESCE(retained_space_cents, space_price_cents)`), so the host is paid in full for a pass cancelled after opening. The 0% rung is existing behaviour, not a new rule.
- **The spot returns to the pool with no release code.** `remaining` is a live SUM, so the cancelled row leaves the occupying set by itself — a booker who cannot come frees a head that would otherwise be a paid no-show.

**The refusals.** A new `PASSES_ENDED` constant sits beside `PAST_START`; the exclusive sentence is byte-identical because it is *true* of an exclusive booking and is asserted verbatim by shipped Phase-7 tests.

**The cancel review page** forks the same window and the same two sentences, so it can never refuse to render a cancellation the action would perform.

**The HOST flip is deliberately unchanged** (T-09-91), and its comment now records the asymmetry as a choice rather than continuing to claim it is "the same guard the booker path carries".

## Task 2 — The Pre-Payment Disclosure (`3efada0`)

`CancellationPolicyDisclosure` gains a **REQUIRED** `windowAlreadyOpen: boolean` — required for the same reason `openCapacity` is (09-08 / 09-09): an optional flag lets one surface silently keep rendering the future-date refund promise for a pass that is already non-refundable, and still typecheck. There are exactly two call sites, so it is a two-file compiler census.

When `openCapacity && windowAlreadyOpen`, the rung ladder is **suppressed** and the collapsed `<summary>` states:

> The space is already open, so this pass can't be refunded if you cancel.

Declared as `export const PASS_NON_REFUNDABLE_MESSAGE` and rendered through an expression container — so the source bytes and the rendered bytes are the same (no `&apos;` in a TS string literal), there is one copy of the sentence, and the jsdom cases import it rather than retyping it. The tier name and the mandatory service-fee paragraph are untouched.

Computed **server-side** at both sites: the reserve page from the booking's own `openCapacity` / `startsAt` against the page's existing server clock (never a client one — D-105); the public listing page passes `false`, with the reason recorded in a comment — it has no booking and no picked date, so there is no specific pass whose day could have opened.

## The Mutation — Executed, Recorded Verbatim

Reverted the fork in the **production** file (restored the bare `AND starts_at > now()` in the booker flip, everything else left in place) and ran the gate:

```
 ❯ tests/booking/open-capacity-cancel.test.ts (9 tests | 1 failed) 3461ms
     × (6) a drop-in pass can be cancelled while the venue is open 129ms

 FAIL  tests/booking/open-capacity-cancel.test.ts > cancelBookingAsBooker — WR-05: a live drop-in pass
 is still cancellable > (6) a drop-in pass can be cancelled while the venue is open
AssertionError: expected 'confirmed' to be 'cancelled' // Object.is equality

Expected: "cancelled"
Received: "confirmed"

 ❯ tests/booking/open-capacity-cancel.test.ts:891:24
    889|     // spot, which names the defect exactly. A `res.ok` assertion woul…
    890|     const row = await readRow(claim.id);
    891|     expect(row.status).toBe("cancelled");
       |                        ^
    892|     expect(row.cancelledBy).toBe("booker");

 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
```

That is the defect in one line: a pass the booker **asked** to cancel is still `confirmed`, still occupying a spot, still unrefunded — with no error the booker could act on.

**Cases 7, 8 and 9 stayed GREEN under the mutation, each for a stated reason.** (7) drives the EXCLUSIVE path, which the mutation restores to its shipped form — which is exactly what makes it the guard against "fixing" WR-05 by widening the cutoff for everyone. (8) and (9) drive a day that has already closed, so both cutoffs refuse it and only the wording is at stake.

**One unplanned artifact, recorded rather than discarded.** Under the mutation the audit line printed `"reason":"not_active"` for case 6's refusal, because `explainNoRows` was still forked while the flip was not: the two halves disagreed about which instant closes the window, so the trail described a live pass as a booking that no longer existed. **A partial revert is observable in the audit trail before it is observable anywhere else** — which is also the empirical argument for the `CancelWindow` parameter (below).

Restored; `git diff --exit-code src/app/actions/cancel-booking.ts` prints nothing against the shipped commit.

## Deviations from Plan

### 1. [Design deviation, documented not absorbed] `explainNoRows` takes the CALLING path's window

**Plan instruction (c):** "compute `future` from the same instant the UPDATE compares".

**Why it could not be taken literally:** the instruction presumes ONE update instant. After this plan there are two — the booker's open-row window ends at `ends_at`, the host's at `starts_at` in **both** modes (the plan's own scope note requires that). A single mode fork inside `explainNoRows` would have told a HOST refused on a **still-live** pass that the booking "is no longer active" — a false sentence, a behaviour change on a path the plan says is unchanged, and a loss of the `past_start` audit reason at that site.

**What shipped:** `explainNoRows(bookingId, cancelWindow)` where `cancelWindow` is `"booker" | "host"`, projecting `open_capacity` and comparing the instant that path's UPDATE actually compared. Which refusal is returned is decided by **what ran out**, not by the mode alone.

**Evidence this was right rather than defensive:** the mutation run surfaced exactly this failure mode (the `not_active` audit line above) with the two halves out of step.

**Acceptance impact:** none — all seven of Task 1's greps hold as written.

### 2. [Genuine gate honoured, not waived] The `destructive` tripwire

`grep -c "destructive" cancellation-policy-disclosure.tsx` must print `0`. The first draft of `PASS_NON_REFUNDABLE_MESSAGE`'s doc comment spelled the token while explaining the O3 colour rule, taking the count to `1`.

This gate is **genuine and satisfiable** (unlike the unsatisfiable class the wave has been hitting), so it was honoured rather than waived: the comment was re-flowed to keep the warning and drop the token — "never rendered in the red error variant this design system reserves for failures" — with an explicit note that the class name is deliberately not spelled, mirroring the client-directive tripwire this file's own header already uses. Same call 09-22 made.

### 3. [Fixture determinism] The "fully ended day" is YESTERDAY, not an earlier window today

The plan asks cases 8/9 to use "hours that both opened and closed earlier today". That shape is **not deterministic at every hour** — a run between venue-local 00:00 and 00:0N would find such a window still open and assert the wrong branch. Yesterday's full 00:00–23:59 window has closed at every instant of today, which is the property the cases actually need. Identical deviation to the one 09-17 recorded for the identical shape; recorded in the test file at the fixture itself.

### 4. [Rule 2 — missing critical consistency] The cancel review page's refusal COPY was forked too

The plan's instruction (d) forks only the page's window **gate**. But the page's own shipped comment states the refusal is "matched word for word to the action's own `PAST_START` result, so the page and the server never contradict each other" — a contract the new constant would have broken silently for every drop-in booking. The heading and paragraph were forked alongside the gate. The rung labels and 09-09's drop-in rationale sentence are untouched, as instructed.

### 5. [Additive test-helper extensions]

`readRow` gained `endsAt` and `readSpots` gained an optional `listingId` (defaulting to `L_DROPIN`). Both are additive: the five existing cases are byte-untouched and call them exactly as before. Two new helpers (`seedDropInAt`, `confirmClaimedRow`) were added rather than reshaping `seedDropIn`.

## Acceptance Criteria — Measured

**Task 1** (`src/app/actions/cancel-booking.ts`)

| Criterion | Required | Measured |
|---|---|---|
| `grep -c "open_capacity"` | ≥ 3 | **5** |
| `grep -c "This session has already started"` | 1 | **1** |
| `grep -c "This day's passes have already ended"` | 1 | **1** |
| `grep -cE '(reason\|calm) === PAST_START'` | 0 | **0** |
| `grep -c '"past_start"'` | 2 | **2** |
| diff `-` lines matching `quoteRefund\|LADDER\|retained_space_cents\|refund_cents` | 0 | **0** |
| diff matching `availabilityBlock` | 0 | **0** |
| `grep -v '^\s*//' \| grep -c "AND starts_at > now()"` | 1 | **1** |
| mutation substring `to be 'cancelled'` in the test file | present | **present** |

**Task 2** (`src/components/booking/cancellation-policy-disclosure.tsx`)

| Criterion | Required | Measured |
|---|---|---|
| `grep -c "windowAlreadyOpen: boolean"` | 1 | **1** |
| `grep -c "windowAlreadyOpen?:"` | 0 | **0** |
| `grep -rho "windowAlreadyOpen=" src/app/listings \| wc -l` | 2 | **2** |
| `grep -c "before the space opens"` | 2 | **2** |
| `grep -c "Free cancellation until"` | unchanged | **3 → 3** |
| `grep -c "isn&apos;t refunded"` | 1 | **1** |
| `grep -c "destructive"` | 0 | **0** (after the re-flow — deviation 2) |
| `grep -c "export const PASS_NON_REFUNDABLE_MESSAGE"` | 1 | **1** |
| `grep -c "can't be refunded if you cancel"` | 1 | **1** |
| `grep -c "{PASS_NON_REFUNDABLE_MESSAGE}"` | 1 | **1** |
| `grep -c "PASS_NON_REFUNDABLE_MESSAGE"` in the test | ≥ 1 | **5** |

## Gates

| Gate | Result |
|---|---|
| `npx vitest run tests/booking/open-capacity-cancel.test.ts` | **9/9 passed** (5 shipped + 4 new) |
| `npx vitest run tests/booking/cancellation-copy.test.tsx` | **9/9 passed** (5 shipped + 4 new) |
| `npx vitest run tests/booking tests/payments` | **431 passed / 39 files**, 0 failures — the Phase-7 cancellation stack green |
| `npx vitest run` (full suite) | **1066 passed / 4 skipped** (1058 baseline + exactly these 8), ONE failure |
| `npx tsc --noEmit` | **0** |
| `npm run lint` | **0 errors / 7 baseline warnings** |
| `git diff --exit-code src/app/actions/cancel-booking.ts` after restore | **clean** |

**The one full-suite failure is the known baseline flake:** `tests/availability/date-pass-picker.test.tsx` case 4 times out at 5000 ms under the full parallel suite (`deferred-items.md` item 3). Re-confirmed **9/9 in isolation** this run. It touches nothing this plan changed.

## No Schema Change, No Migration

The fork reads `booking.open_capacity`, which is already `NOT NULL DEFAULT false` (drizzle 0021) — so the SQL `CASE` is never NULL and there is no three-valued-logic hole. **Next migration number is still 0023.**

## What This Does NOT Change

- `quoteRefund`, `LADDER`, `rungBoundaries` — byte-untouched, asserted by the diff gate.
- The host cancel path's window (T-09-91) and 09-09's Consequence-3 auto-block fork.
- `cancelUnpaidHold` — no window guard, unchanged.
- The concrete-instant disclosure strings 09-09 deliberately left alone, and the generic strings it forked.
- The PayMongo webhook route (D-57 — payment remains the sole confirm authority).

## Threat Register Outcomes

| Threat | Disposition | How it landed |
|---|---|---|
| T-09-87 (DoS against the booker) | mitigated | The booker flip closes at `ends_at` for an open row; case 6 asserts the persisted status, the zero refund AND the returned spot |
| T-09-88 (undisclosed non-refundable charge) | mitigated | `windowAlreadyOpen` is a REQUIRED prop computed server-side at both call sites; the statement renders in the collapsed summary |
| T-09-89 (refund path changing) | mitigated | `quoteRefund` and the ladder untouched; the diff gate prints 0 |
| T-09-90 (host paid for a cancelled pass) | accepted (structurally safe) | `ends_at + 24h` still future while the window is live; `retained_space_cents` carries the full price |
| T-09-91 (EoP — widening the host window) | mitigated | Host flip byte-unchanged; filtered grep prints 1; the asymmetry is now recorded in its comment |
| T-09-92 (audit reclassification) | mitigated | `isPastWindow` replaced both identity comparisons; case 9 asserts `meta.reason === "past_start"` |
| T-09-SC (package installs) | mitigated | **No package was installed by this plan** |

## Commits

| Commit | What |
|---|---|
| `ed3eb1c` | `fix(09-25)`: the forked booker window, `PASSES_ENDED`, `isPastWindow`, the forked review page, cases 6-9 + the recorded mutation |
| `3efada0` | `feat(09-25)`: the REQUIRED `windowAlreadyOpen` prop, `PASS_NON_REFUNDABLE_MESSAGE`, both call sites, four jsdom cases |

## Self-Check: PASSED

- `src/app/actions/cancel-booking.ts` — FOUND
- `src/app/(app)/bookings/[id]/cancel/page.tsx` — FOUND
- `src/components/booking/cancellation-policy-disclosure.tsx` — FOUND
- `src/app/listings/[id]/book/page.tsx` — FOUND
- `src/app/listings/[id]/page.tsx` — FOUND
- `tests/booking/open-capacity-cancel.test.ts` — FOUND
- `tests/booking/cancellation-copy.test.tsx` — FOUND
- commit `ed3eb1c` — FOUND
- commit `3efada0` — FOUND
