---
phase: 08-group-bookings
plan: 13
subsystem: payments
tags: [paymongo, checkout-session, expire, idempotency, group-bookings, cr-02, gap-closure]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-12)
    provides: booking.checkout_session_id (migration 0019, applied) + expireCheckoutSession(id) + mockPayMongo.expireCheckoutSession — the column and the call this plan finally wires in
  - phase: 08-group-bookings (08-05)
    provides: D-108's amount-scoped checkout key and updateDeclaredPax — the re-price this plan gates
  - phase: 05-payments
    provides: confirmBooking's checkout creation, the calm-refusal discipline (T-05-15) and recordAudit's needs_attention vocabulary
provides:
  - "confirmBooking persists checkout.id to booking.checkout_session_id before redirecting off-site — for per-head AND flat bookings"
  - "updateDeclaredPax expires the superseded session BEFORE re-freezing, clears the column in the same write, and REFUSES the re-price on failure"
  - "checkout_expire_failed / needs_attention audit naming the session an operator must retire by hand"
  - "tests/booking/checkout-session-expire.test.ts — 6 real-Postgres cases, mutation-proven A/B/C"
affects: [08-17, phase-09, any-future-checkout-session-or-reprice-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When two writes must agree (a frozen amount and an external payable resource), do the IRREVERSIBLE-if-wrong one FIRST and refuse on its failure — the failure then lands on the state that is still internally consistent"
    - "Assert an ORDER as an order: the stub reads the database at call time, so a reordering mutation fails with the value it observed, not with a proxy"

key-files:
  created:
    - tests/booking/checkout-session-expire.test.ts
  modified:
    - src/app/actions/booking.ts
    - tests/booking/pax-reprice.test.ts
    - tests/payments/checkout-create.test.ts
    - .planning/phases/08-group-bookings/deferred-items.md

key-decisions:
  - "Expire → re-freeze, and a failed expire REFUSES the re-price. Refusing leaves the booking at its previous amount, which is exactly the amount the still-live session charges; proceeding would leave a booking quoted at ₱Y with a session payable at ₱X (the CR-02 defect)"
  - "Zero rows from confirmBooking's persisting UPDATE is deliberately NOT a failure — the booker is already en route to a real payable session, and refusing would strand them mid-payment. Stated in a comment so a later reader cannot 'harden' it"
  - "checkout_session_id is cleared in the SAME write that moves the D-74 triple, not in a later statement — a separate clear would leave a window where a retry expires an already-dead id"
  - "The audit meta carries the session id BECAUSE an operator needs it to retire the session by hand; it is an API resource identifier, not a bearer credential (unlike the invite token, which is never audited)"
  - "The needs_attention assertion reads recordAudit's console.info line, not a table — audit.ts's v1 sink is deliberately a structured log line (the plan's read_first said 'read audit rows back'; there are no rows to read)"

patterns-established:
  - "A comment that makes a factual claim about an invariant is load-bearing: the 'never a second charge' line was TRUE when written and became FALSE the moment D-108 made the key amount-scoped. It was rewritten, not annotated"

requirements-completed: [GROUP-01]

# Metrics
duration: 25min
completed: 2026-07-28
---

# Phase 8 Plan 13: CR-02 Part 2 — Wire the Expire Gate into the Actions Summary

**CR-02 is CLOSED: a booking now always names the checkout session it is sending a booker to pay at, and a re-price retires that session before the amount moves — or does not move the amount at all.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-28T15:05Z (local)
- **Completed:** 2026-07-28T15:24Z (local)
- **Tasks:** 3 of 3
- **Files modified:** 4 modified, 1 created

## Accomplishments

### Task 1 — `confirmBooking` names every session it creates (`18c9047`)

`src/app/actions/booking.ts:600-610` — after `createCheckoutSession` resolves and **before**
`redirect(checkout.checkoutUrl)` (which throws by design, so nothing after it ever runs):

```ts
await db
  .update(booking)
  .set({ checkoutSessionId: checkout.id })
  .where(
    and(
      eq(booking.id, holdId),
      eq(booking.bookerId, userId),
      inArray(booking.status, ["pending", "approved"]),
    ),
  );
```

Scoped exactly like the hold extension above it — owner + a still-live hold — so it can never touch a
confirmed or terminal row (T-06-10). It sits beside the `confirm_pay` / `outcome: "ok"` audit, so the two
side effects of a successful checkout creation are adjacent.

**Zero rows is deliberately not a failure**, and the comment says so at length: if the hold lapsed between
the extension and this write, the booker is *already* on their way to a real, payable session. Refusing here
would strand them mid-payment with money about to move and no page to move it on; the existing expiry /
`handleGoneSlot` machinery (D-58) is what resolves that case. The comment exists specifically so a later
reader does not "harden" it into a refusal.

**The false claim was rewritten, not annotated.** The comment at `:536` read *"the stable Idempotency-Key
checkout:&lt;bookingId&gt; makes a double-click / retry reuse the SAME session — never a second charge."* That was
true when written and stopped being true the moment D-108 made the key amount-scoped. It now reads: within
ONE frozen amount the key collapses a double-click onto the same session — and the one-live-session invariant
is held by `updateDeclaredPax`'s expire-before-refreeze, **not by the key**, with this action's half of the
contract being the write above. `grep -v '^\s*//' src/app/actions/booking.ts | grep -c "never a second charge"`
prints **0**; the phrase survives nowhere in the file. The flat-booking half of the comment is untouched, as
are the key expression, the hold extension, the start-time guard, the rate limit and the charge-integrity
guard.

### Task 2 — `updateDeclaredPax` expires first, and refuses on failure (`0eefcbd`)

Four changes, all inside the existing action:

1. `checkoutSessionId: booking.checkoutSessionId` joins the owner-gated select (`:357-359`).
2. The expire gate at `:401-435`, **after** the quote is computed and **before** the re-freeze:

```ts
if (row.checkoutSessionId != null) {
  try {
    await expireCheckoutSession(row.checkoutSessionId);
  } catch {
    await recordAudit({
      actorId: userId,
      action: "checkout_expire_failed",
      outcome: "needs_attention",
      meta: { holdId, checkoutSessionId: row.checkoutSessionId },
    });
    return { ok: false, error: "We couldn't update your booking. Please try again." };
  }
}
```

3. `checkoutSessionId: null` inside the re-freeze `.set({...})` (`:451`), so the row stops claiming a live
   session at the same instant the amount moves. The old id is already in hand from the pre-read, so nothing
   is lost — and clearing it in a later statement would leave a window where a retry expires a dead id.
4. The ordering comment, written to be un-reorderable by accident: expire-then-refreeze means a failure
   leaves the booking at its **previous, still-payable** amount (row and session agree); refreeze-then-expire
   would leave a booking quoted at ₱Y with a session payable at ₱X — money captured against a total the row
   no longer claims, no refund, no alert. `⚠️ DO NOT REORDER THIS` names the defect explicitly.

`expireCheckoutSession` **throws** (08-12 contract 4) — there is no failure sentinel — so the `try/catch` is
mandatory; an uncaught throw in a server action is a raw 500 on the money path. PayMongo's error text reaches
neither the audit nor the browser (T-05-15 / T-08-44): the booker gets the same calm retryable sentence the
quote-misconfiguration branch already returns.

**A NULL session id makes zero PayMongo calls** (08-12 contract 2 — pre-0019 rows and holds that never reached
checkout), and the flat-listing no-op at `:373` is byte-identical: it returns before the gate is reached, so a
flat booking still makes no PayMongo call of any kind. The clamp, the quote, the D-74 triple composition and
the re-freeze's WHERE scope are untouched.

### Task 3 — both branches pinned by test (`ca9d3cb`, lint tidy `fb947cd`)

`tests/booking/checkout-session-expire.test.ts` — 6 cases against real Postgres (isolated schema), driving the
**real** actions with `@/lib/paymongo` swapped for `mockPayMongo`. Every assertion reads the **persisted row
back out of the database**, never the action's return value alone.

| # | Case | What it pins |
|---|---|---|
| 1 | per-head `confirmBooking` | the row holds the id PayMongo *returned* (`cs_perhead_A`), not a constant |
| 2 | flat `confirmBooking` | key is still `checkout:<id>` (byte-identical) **and** the column is filled — persistence is not conditional on `declared_pax` |
| 3 | successful re-price | `expireCheckoutSession` called **once**, with **that** id, and the row still showed the OLD total at the moment it was called; afterwards the triple is the new headcount and the column is NULL |
| 4 | **failed expire** | `{ ok: false }`, the **entire** frozen tuple unchanged, the column still holds the old id, and a `checkout_expire_failed` / `needs_attention` audit names it — plus the returned error contains neither `sk_test` nor `PayMongo` |
| 5 | NULL session id | zero expire calls, normal re-price |
| 6 | flat listing | zero PayMongo calls of any kind, nothing written |

**The order is asserted as an order.** Case 3's expire stub reads `quoted_total_cents` out of the database at
the instant it is called, so a reordering mutation fails with the value it *observed* rather than with a
downstream proxy. Case 4 asserts the **full** tuple (`declared_pax`, `space_price_cents`, `service_fee_cents`,
`quoted_total_cents`, `checkout_session_id`) because a partial write is the shape of this bug — one column
would not catch it.

Also added: `tests/payments/checkout-create.test.ts` now asserts the flat happy path persists `cs_test_123`
(it already drove `confirmBooking` end-to-end, so the assertion belongs there per the plan), and
`tests/booking/pax-reprice.test.ts` gained case **(10)** — with `expireCheckoutSession` rejecting, the
re-price is refused and every column is unchanged. That case is what makes the other nine *ordering*
evidence rather than incidental: they are green only because the expire succeeds.

## Task 3 mutation testing (required by the plan) — verbatim

**MUTATION A — delete the `expireCheckoutSession` call from `updateDeclaredPax`.**

```
 ❯ tests/booking/checkout-session-expire.test.ts (6 tests | 2 failed) 3655ms
     × (3) a re-price EXPIRES the recorded session BEFORE the amount moves, then clears the column 54ms
     × (4) a FAILED expire REFUSES the re-price — the whole frozen tuple is untouched and an operator is told 51ms

AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
 ❯ tests/booking/checkout-session-expire.test.ts:280:48
AssertionError: expected { ok: true } to deeply equal { ok: false, …(1) }
 ❯ tests/booking/checkout-session-expire.test.ts:315:17

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

**MUTATION B — move the expire gate to AFTER the re-freeze (a failed expire still commits the new amount).**

```
 ❯ tests/booking/checkout-session-expire.test.ts (6 tests | 2 failed) 3373ms
     × (3) a re-price EXPIRES the recorded session BEFORE the amount moves, then clears the column 64ms
     × (4) a FAILED expire REFUSES the re-price — the whole frozen tuple is untouched and an operator is told 54ms

AssertionError: expected 109725 to be 105000 // Object.is equality
 ❯ tests/booking/checkout-session-expire.test.ts:282:32
AssertionError: expected 7 to be 2 // Object.is equality
 ❯ tests/booking/checkout-session-expire.test.ts:323:31

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

Both failure messages name the database truth: **109725** is the total the expire stub observed in the row
when it should have observed the pre-re-price **105000**, and **declared_pax = 7** is the headcount that was
committed despite the refusal. The same mutation also turns `pax-reprice` red:

```
 ❯ tests/booking/pax-reprice.test.ts (10 tests | 1 failed) 4819ms
     × (10) a re-price whose EXPIRE fails is refused — every case above passes only because the expire succeeds (CR-02) 153ms

AssertionError: expected 6 to be 1 // Object.is equality
 ❯ tests/booking/pax-reprice.test.ts:395:31
```

**MUTATION C — delete the `checkoutSessionId` write from `confirmBooking`.**

```
 ❯ tests/payments/checkout-create.test.ts (4 tests | 1 failed) 3617ms
     × creates ONE checkout for the frozen quote, extends the hold, and redirects off-site WITHOUT flipping to confirmed 61ms
 ❯ tests/booking/checkout-session-expire.test.ts (6 tests | 4 failed) 3739ms
     × (1) confirmBooking NAMES the session it just created on the booking row (per-head pricing) 106ms
     × (2) a FLAT-priced booking keeps its stable key AND still records the session (not conditional on declared_pax) 37ms
     × (3) a re-price EXPIRES the recorded session BEFORE the amount moves, then clears the column 35ms
     × (4) a FAILED expire REFUSES the re-price — the whole frozen tuple is untouched and an operator is told 31ms

AssertionError: expected null to be 'cs_perhead_A' // Object.is equality
AssertionError: expected null to be 'cs_flat_B' // Object.is equality
AssertionError: expected null to be 'cs_reprice_C' // Object.is equality
AssertionError: expected null to be 'cs_fail_D' // Object.is equality
AssertionError: expected null to be 'cs_test_123' // Object.is equality

 Test Files  2 failed (2)
      Tests  5 failed | 5 passed (10)
```

**Restored after each mutation** with `git checkout -- src/app/actions/booking.ts` followed by
`git diff --exit-code src/app/actions/booking.ts` (clean each time) → all three files GREEN again (20/20).

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run lint` | **0 errors**, **7 warnings** — the exact pre-existing set (2 wizard/RHF + 5 unused-var in `tests/helpers/mocks.ts`); no new warning |
| `npx vitest run tests/booking/checkout-session-expire.test.ts tests/booking/pax-reprice.test.ts tests/payments/checkout-create.test.ts` | **3 files / 20 tests, exit 0** |
| `npx vitest run` (full suite, `DATABASE_URL` confirmed `[<unset>]` in the shell) | **95 files / 824 tests, exit 0** |
| `npm run build` (bare, no env workaround) | **exit 0**, route list unchanged |
| Mutations A / B / C | red → restored → green (verbatim above) |

Full-suite delta over the wave-6 baseline (94 files / 817 tests): **+1 file, +7 tests** — 6 in the new file
plus `pax-reprice` case 10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The plan assumed a queryable audit table; `recordAudit` has none**
- **Found during:** Task 3 authoring
- **Issue:** The plan's `read_first` said "src/lib/audit.ts (how to read audit rows back for the
  `needs_attention` assertion)". There are no rows: `recordAudit`'s v1 sink is deliberately a single
  structured `console.info("[audit]", <json>)` line (audit.ts:35-44, "deliberately NOT a durable DB table"),
  so no read-back is possible.
- **Fix:** the case asserts against the emitted line — `vi.spyOn(console, "info")` in `beforeEach`, restored
  in `afterEach`, with an `auditLines()` helper that filters on the `"[audit]"` prefix and parses the JSON.
  It asserts `action`, `outcome` **and** `meta` (both `holdId` and `checkoutSessionId`), so it is no weaker
  than a row read would have been.
- **Files modified:** `tests/booking/checkout-session-expire.test.ts`
- **Commit:** `ca9d3cb`

**2. [Rule 3 — Blocking] `tests/payments/checkout-create.test.ts`'s PayMongo mock was missing the new export**
- **Found during:** Task 3
- **Issue:** `booking.ts` now imports `expireCheckoutSession` from `@/lib/paymongo`, and that file's
  `vi.doMock` factory listed only four functions. It happens to pass today because no case there re-prices,
  but an incomplete module namespace is a trap for the next person who adds one.
- **Fix:** added `expireCheckoutSession: mockPayMongo.expireCheckoutSession` with a comment saying it is
  never called in that file. The same mock was added to `tests/booking/pax-reprice.test.ts`, where case 10
  genuinely needs it (that file previously imported the REAL client — safe only because cases 1-9 hold
  `checkout_session_id = NULL` and never reach the gate).
- **Files modified:** `tests/payments/checkout-create.test.ts`, `tests/booking/pax-reprice.test.ts`
- **Commit:** `ca9d3cb`

**3. [Rule 1 — Bug] Two `tsc`-only failures in the new test file (the 08-12 trap, again)**
- **Found during:** plan-level verification, after the file was already 6/6 green in vitest
- **Issue:** (a) `let infoSpy: ReturnType<typeof vi.spyOn>` erases the call-signature generics, so the
  `filter`/`map` callbacks over `infoSpy.mock.calls` were `TS7006: Parameter 'c' implicitly has an 'any'
  type`; (b) `mockImplementationOnce(async (sessionId: string) => …)` is not assignable to the stub's
  `(id?: string)` signature (`TS2345`). Both passed vitest, which transpiles without typechecking — exactly
  the 08-12 lesson ("a green test run is not a green `tsc`").
- **Fix:** re-type `mock.calls` once inside `auditLines()` with a comment naming the reason, and give the
  stub parameter a default (`async (sessionId = "")`) so it matches the optional-parameter signature.
- **Files modified:** `tests/booking/checkout-session-expire.test.ts`
- **Commit:** `ca9d3cb`

**4. [Rule 2 — Hygiene] The rate-limit stub added two new lint warnings**
- **Found during:** plan-level `npm run lint` (0 errors, **9** warnings — 7 pre-existing + 2 new)
- **Issue:** `const fakeRateLimit = (_key: string, _opts: RateLimitOptions) => …` tripped
  `@typescript-eslint/no-unused-vars` twice. The verification bar is "no NEW errors", but a plan that leaves
  new warnings behind erodes the 7-warning baseline every later plan measures against.
- **Fix:** the stub takes no parameters (a zero-arg function satisfies every `rateLimit(key, opts)` call
  site) and the now-unused `RateLimitOptions` type import was dropped, with a comment pointing at
  `pax-reprice` case 9 as the file that *does* assert on the budget. Back to **7 warnings**.
- **Files modified:** `tests/booking/checkout-session-expire.test.ts`
- **Commit:** `fb947cd`

### Planning decisions honoured, not revisited

The ordering (**expire → refreeze**) and the refuse-on-failure behaviour were planning decisions
(STATE.md "not the executor's to revisit"). Both are implemented as specified and are now mutation-pinned,
so a later reorder goes red rather than silently shipping.

## TDD Gate Compliance

Task 3 carries `tdd="true"`, but its behaviour was implemented by Tasks 1 and 2 (the plan sequences it that
way), so the commit order is `feat` → `feat` → `test` rather than RED → GREEN. **The RED gate was satisfied by
mutation instead of by ordering**, which is the stronger form here: each of A, B and C was applied to the
shipped code and measured red against the new tests *before* the tests were committed, and each was restored
to green with a clean `git diff --exit-code`. Verbatim output is above.

## Authentication Gates

None. No PayMongo credential was needed — the client is stubbed in every test and no live PayMongo call was
made at any point in this plan.

## Known Stubs

None. This plan adds two writes and one guarded outbound call inside existing actions; there is no UI, no
placeholder copy and no hardcoded empty value.

## What This Closes

- **CR-02 (BLOCKER) — CLOSED.** 08-12 shipped the column and the call; this plan wired both in. At most one
  PayMongo checkout session is payable for a booking at any instant.
- **`deferred-items.md` item 1 — CLOSED** and marked so in that file, with the residual edge it described
  ("a booker holding that older PayMongo tab open could still pay the previous amount") explicitly retired.

## Contracts for Downstream Plans

1. *The order is `expire → refreeze`, and a failed expire REFUSES the re-price.* Mutation B is what stops a
   later "optimisation" from reordering it — moving the gate below the re-freeze turns two cases red with
   `expected 109725 to be 105000` and `expected 7 to be 2`. If you ever need to change this, change the
   decision first (it is a planning decision, recorded in STATE.md), not the code.
2. *Every checkout session must be NAMED on its booking row before the booker leaves the app.* Any new code
   path that calls `createCheckoutSession` owes the same write; a session nobody recorded can never be
   retired, and the re-price gate will silently do nothing for it.
3. *`checkout_session_id` is NULL after a successful re-price, and that is correct* — the session it named
   was just expired. The next "Confirm & pay" names its replacement. Do not treat NULL as "never been to
   checkout" anywhere that matters.
4. *A `needs_attention` audit is the ONLY signal that a live session was left un-retired.* There is no
   reconcile poller for it. If phase 9 builds an operator surface, `action = "checkout_expire_failed"` +
   `meta.checkoutSessionId` is the row to render.
5. *`recordAudit` still writes a console line, not a table.* Any test asserting on an audit must spy on
   `console.info` and filter the `"[audit]"` prefix (see `auditLines()` in the new file). Adding a durable
   sink later needs no call-site changes, but it does need those spies revisited.
6. *T-08-45 is an accepted residual:* an expire failure blocks a legitimate booker from stepping their
   headcount. They retry or place a new hold — recoverable, no money at risk. Stated in the code comment so
   the trade stays visible.

## Threat Flags

None. Both surfaces this plan touches — the outbound expire call and the two writes to
`booking.checkout_session_id` — are dispositioned in this plan's own register (T-08-41 … T-08-45). No new
endpoint, auth path, file access pattern or trust-boundary schema change was introduced.

## Self-Check: PASSED

**Files claimed created — present:**
- `tests/booking/checkout-session-expire.test.ts` — FOUND

**Files claimed modified — all carry the claimed content:**
- `src/app/actions/booking.ts` — `checkoutSessionId` at `:359`, `:451`, `:603`; `expireCheckoutSession` at
  `:41` and `:420`; `checkout_expire_failed` at `:429`; `never a second charge` **0 matches**
- `tests/booking/pax-reprice.test.ts` — case `(10)` present, `expireCheckoutSession` mock wired
- `tests/payments/checkout-create.test.ts` — `checkoutSessionId` asserted as `cs_test_123`
- `.planning/phases/08-group-bookings/deferred-items.md` — item 1 marked CLOSED

**Commits claimed — all present in `git log`:**
- `18c9047` — FOUND (Task 1)
- `0eefcbd` — FOUND (Task 2)
- `ca9d3cb` — FOUND (Task 3 tests)
- `fb947cd` — FOUND (lint tidy)

Working tree clean after the last task commit; `git diff --exit-code src/app/actions/booking.ts` clean after
every mutation was reverted.
