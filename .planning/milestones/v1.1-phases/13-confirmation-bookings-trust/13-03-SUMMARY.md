---
phase: 13-confirmation-bookings-trust
plan: 03
subsystem: payments
tags: [paymongo, abortsignal, timeout, refunds, copy, server-only, design-gate, money-path]

# Dependency graph
requires:
  - phase: 07-cancellation-refunds
    provides: "src/lib/payments/refund-rail.ts — REFUNDABLE_RAILS + isApiRefundable, the ONLY branch point for refund dispatch, reused here rather than restated"
  - phase: 08-group-bookings
    provides: "src/lib/paymongo.ts's LW-01 postcondition-verified expire + its getCheckoutSession re-probe — the money-path call site whose behaviour this plan had to leave byte-identical"
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "13-01's operational finding (never run the two vitest configs concurrently) — APPLIED throughout"
provides:
  - "getCheckoutSession widened to { id, status, sourceType, paidAt } with an OPT-IN AbortSignal deadline — the first timeout of any kind on a PayMongo call in this repository"
  - "probeCheckoutSession — the ONE owner of the D-84 booker-facing call: server-only, bounded by a declared constant, resolves to null for every failure"
  - "readPaymentState — 13-RESEARCH Example 3's four (booking status, session status) pairs named once, as an allow-list with an indeterminate fall-through"
  - "src/lib/booking/refund-window.ts — the ONLY permitted refund-window sentences (card 30 days, GCash 24 hours, Maya 24 hours) plus D-84's rail-free fallback, with the manual branch carrying NO sentence at all"
  - "tests/design/money-path-invariants.test.ts — GATE-06/D-80's zero-migration pin and D-81's qrph pin, both watched failing"
affects: [13-04, 13-06, 13-07, 13-09, 13-10, 13-12, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An OPT-IN request deadline on a shared money-path client: the parameter defaults to undefined and two NEGATIVE assertions pin that no signal reaches the pre-existing call sites"
    - "A never-raising third-party wrapper whose absence-property is proved by handing it a rejecting stub and asserting the promise RESOLVES"
    - "A failure MESSAGE built by a function so a self-test can drive the same code path with a synthetic fixture — the message is demonstrably reachable rather than never-read"
    - "A discriminated-union copy result whose manual branch is a bare kind with no string field, so a banned word is structurally unrenderable rather than merely scanned-for"

key-files:
  created:
    - "src/lib/payments/checkout-probe.ts"
    - "src/lib/booking/refund-window.ts"
    - "tests/booking/checkout-probe.test.ts"
    - "tests/booking/refund-window.test.ts"
    - "tests/design/money-path-invariants.test.ts"
  modified:
    - "src/lib/paymongo.ts"
    - "src/lib/payments/config.ts"
    - "tests/payments/paymongo-calls.test.ts"

key-decisions:
  - "The deadline is threaded as `signal?: AbortSignal` on FetchInit and passed as `signal: init.signal` — undefined, which WebIDL treats as ABSENT, so `fetch(url, {…, signal: undefined})` and `fetch(url, {…})` are the same request. Two negative assertions pin it rather than the WebIDL argument alone"
  - "CHECKOUT_PROBE_TIMEOUT_MS = 3000, argued from the repo's own measured number: config.ts records ~2s for TWO round trips plus two local UPDATEs, so one GET is ~1s and 3s is ~3x it. The CEILING is set by an asymmetry — giving up early costs the rail-free sentence, which is DESIGNED copy, while waiting costs a booker staring at nothing"
  - "`refundWindowFor(null)` routes to the rail-free sentence BEFORE the isApiRefundable check, deliberately: isApiRefundable's fail-closed reading answers 'should we CALL the refund API', which is a different question from 'what copy describes a refund that already happened'. Collapsing them would tell every fallback render that the booker's money needs a human"
  - "A refundable rail with no verified sentence (grab_pay) falls back to the ALL-RAILS sentence, not to the manual marker — a refund WAS issued on such a rail, so the manual copy would be false in the other direction"
  - "Task 1 is tdd=\"true\" and names no test file; its coverage went into tests/payments/paymongo-calls.test.ts, the file that already mocks global fetch and imports the REAL client. A behaviour claim with no test is not verifiable, and the acceptance criteria alone (greps + an untouched suite) cannot see the widening"

patterns-established:
  - "The `throw` grep-tripwire family gained a third instance: `grep -c 'throw' … === 0` counts PROSE, so the header describing a never-raising wrapper cannot use the word at all. The file says 'never raises' throughout and records why"
  - "Line-number citations into a file the SAME plan edits must be re-measured after the edit: paymongo.ts:288-296 became :299-307 the moment FetchInit grew"

requirements-completed: []  # NOT marked — see "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 28min
completed: 2026-08-20
---

# Phase 13 Plan 03: The Rail, the Window, and the Two Pins Summary

**The first `AbortSignal` on any PayMongo call in this repository, added so that it changes nothing — the deadline is opt-in per call site and two negative assertions prove no signal reaches the double-charge guard — plus a never-raising probe whose error-leak was watched escaping verbatim, one owner for the three verified refund windows, and the zero-migration and `qrph` invariants pinned by assertions that were both watched failing.**

## Performance

- **Duration:** ~28m
- **Started:** 2026-08-20T05:37:53Z (13:37 +0800)
- **Completed:** 2026-08-20T06:05Z (14:05 +0800)
- **Tasks:** 3 / 3
- **Files:** 5 created, 3 modified

## Accomplishments

- **`getCheckoutSession` now returns the rail and the paid-at instant**, read from `data.attributes.payments[0].attributes.source.type` and `data.attributes.paid_at`. The nesting depth was not assumed: `attributes.payments` is an array of FULL Payment resources, so the rail sits **two `attributes` deep**, and the function's doc comment records the shape the fixtures encode — including that it is PayMongo's *documented* contract rather than a live-observed body, which is now a named UAT item rather than an unmarked assumption.
- **`paid_at` is Unix SECONDS**, so the parse multiplies by 1000 and rejects anything non-finite. That branch has its own case: an Invalid Date is truthy and formats as `Invalid Date` on a receipt, which is worse than a null on a surface D-85 already forbids labelling "Date paid" without a real instant.
- **The deadline is opt-in, and the two assertions that matter are the NEGATIVE ones.** `initAt(0).signal` must be `undefined` when no options are passed, and **both** fetch calls of `expireCheckoutSession`'s recovery path must carry no signal. Those two lines are T-13-03-EXPIREREG; a default deadline would redden them both, which is exactly what they are for.
- **`probeCheckoutSession` cannot make the page worse.** It resolves to `null` for a null id, an absent secret, a network error, a non-2xx, the deadline firing, and an unrecognised body — and the property was proved by removing the `try`/`catch` and watching four cases go red, one of them showing PayMongo's 404 prose escaping verbatim into the caller.
- **The probe never costs a round trip it cannot use.** No id ⇒ no request. No secret ⇒ no request. The second one is what keeps every later spec over these surfaces inside D-35's CI secret boundary: the fallback branch is exercisable with no `sk_test_` at all.
- **`readPaymentState` names the four pairs once**, as an allow-list with an `indeterminate` fall-through — the `expireCheckoutSession` fall-through discipline applied to a read. A session status PayMongo adds later lands on `indeterminate` (which has its own honest copy) instead of being absorbed into one of the four readings.
- **The three verified refund windows have one owner that reuses `isApiRefundable`**, and the manual branch returns a bare `{ kind: "no-automatic-window" }` — **no sentence field at all**. D-83's ban on the word *refunded* on that branch is therefore structural: there is nothing for a template to interpolate.
- **Both invariants were watched failing.** A temporary `drizzle/0026_probe.sql` reddened the GATE-06 pin naming the file; a locally widened rails fixture reddened the D-81 pin and printed the verbatim 2026-08-20 rejection.
- **Zero packages. Zero migrations. `REFUNDABLE_RAILS`, `drizzle/`, `site.ts` and `site-contacts.test.ts` all byte-unchanged.**

## Task Commits

1. **Task 1: Widen `getCheckoutSession` and make the timeout opt-in (D-84)** — `4fb3fc0` (feat)
2. **Task 2: The never-raising booker-facing probe wrapper (D-84, D-85)** — `6bfabd5` (feat)
3. **Task 3: The refund-window module and the two pinned invariants (D-83, D-80, D-81)** — `8fee97c` (feat)

## Files Created/Modified

- `src/lib/paymongo.ts` — **modified.** `FetchInit` gains `signal?: AbortSignal`; the one `fetch` call threads it; `CheckoutSessionState` widens to four fields; `getCheckoutSession` gains `opts?: { timeoutMs?: number }` and the doc comment recording the observed shape and the opt-in argument. **`expireCheckoutSession`'s body is untouched** — every diff hunk falls outside its line range.
- `src/lib/payments/config.ts` — **modified, 2 edits.** The FLOOR bullet's claim ("`paymongoFetch` sets NO timeout — plain fetch, no AbortSignal") is now true only of the money-path calls, so it says that; and the T-KV2-04 residual is **narrowed, not deleted**, stating precisely what changed (a signal is accepted, a deadline is available per call) and what did not (every money-path caller still passes none, so the 90s floor argument stands).
- `src/lib/payments/checkout-probe.ts` — **new.** The server-only guard, `CHECKOUT_PROBE_TIMEOUT_MS` with both bounds argued, `probeCheckoutSession`, and the `PaymentStateReading` union + `readPaymentState`. Header records the no-row-level-signal finding, D-35's boundary, and why the caught error is discarded whole.
- `src/lib/booking/refund-window.ts` — **new.** Isomorphic. `RAIL_DISPLAY_NAME`, `REFUND_WINDOW_BY_RAIL` (three entries), `ALL_RAILS_REFUND_WINDOW`, `RefundWindowStatement`, `refundWindowFor`. Grep-tripwire header naming the three permitted numbers and spelling **neither** banned phrase contiguously.
- `tests/payments/paymongo-calls.test.ts` — **modified, +1 describe (7 cases).** See Deviation 1 for why this file.
- `tests/booking/checkout-probe.test.ts` — **new**, 13 cases.
- `tests/booking/refund-window.test.ts` — **new**, 10 cases.
- `tests/design/money-path-invariants.test.ts` — **new**, 5 cases (2 of them guard-the-guard / anti-vacuity).

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run concurrently, and neither was run alongside `npm run build`** (13-01's operational finding, restated in the execution brief).

**Task 1**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/checkout-session-expire.test.ts` | **6 passed**, unchanged |
| `git diff src/lib/paymongo.ts` — zero changes inside `expireCheckoutSession`'s body | **verified mechanically, not by eye.** The function spans HEAD lines **271–317**; `git diff -U0` reports hunks at old lines **67, 89, 318, 322, 326, 328, 330**. None is inside the range |
| `grep -c 'AbortSignal.timeout' src/lib/paymongo.ts` | **`1`**, inside the `timeoutMs`-present branch |
| `grep -n 'REFUNDABLE_RAILS' src/lib/payments/refund-rail.ts` | lines 42 + 53, array unchanged |
| `git diff --stat src/lib/payments/refund-rail.ts` | **empty — zero lines** |
| `npx tsc --noEmit` / `npm run build` | exit 0 / exit 0 |
| `npx vitest run tests/payments/paymongo-calls.test.ts` | **24 passed** (17 pre-existing + 7 new) |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/checkout-probe.test.ts` | **13 passed**, including the rejects-underneath/resolves-to-null case (3) and the abort case (7) |
| `grep -c 'import "server-only"' src/lib/payments/checkout-probe.ts` | **`1`** |
| `grep -c 'throw' src/lib/payments/checkout-probe.ts` | **`0`** — see Deviation 2 |
| `npx vitest run --config vitest.design.config.ts tests/design/server-only-guards.test.ts` | **7 passed** |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on both files | 0 errors |

**Task 3**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/refund-window.test.ts` | **10 passed**, including the fails-closed case for six unrecognised rails |
| `npx vitest run --config vitest.design.config.ts tests/design/money-path-invariants.test.ts` | **5 passed** |
| Watched red 1 — temporary `drizzle/0026_probe.sql` | **observed, verbatim below.** Deleted; re-run green; `git status --short drizzle/` clean |
| Watched red 2 — `qrph` added to a local rails fixture | **observed, verbatim below.** Restored; re-run green |
| `grep -c 'isApiRefundable' src/lib/booking/refund-window.ts` | **`5`** (≥ 1) — the import, the call, and three sentences of reasoning about it |
| `grep -oiE '[0-9]+ *(day\|hour)' src/lib/booking/refund-window.ts \| sort -u` | **`24 hour` / `30 day` — and nothing else** |
| `grep -ci 'within a few days'` / `grep -ci 'cannot be reversed'` on that file | **`0` / `0`** |
| `git diff --stat src/lib/payments/refund-rail.ts drizzle/` | **empty — zero changes to both** |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **145 files passed / 1 skipped; 1349 passed / 4 skipped** — exit 0. (13-02 closed at 143/1319; +2 files and +30 tests is exactly this plan's 13 + 10 + 7.) |
| `npm run test:design` | **42 files, 754 passed / 3 skipped** — exit 0. (13-02 closed at 41/749; +1 file and +5 tests is exactly `money-path-invariants.test.ts`.) |
| `npm run build` (lint + design gate + next build) | **exit 0** |
| `git diff --stat` since plan start — `refund-rail.ts`, `drizzle/`, `package.json`, `package-lock.json` | **empty — zero changes to all four** (T-13-03-SC and T-13-03-RAILWIDEN and T-13-03-MIGRATION discharged) |
| `git diff --stat` — `tests/design/site-contacts.test.ts`, `src/lib/site.ts` | **empty — zero changes** (D-64 intact) |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git status --short` | clean |

## The Watched Reds — verbatim

Four reds were observed. The first two are the plan's required probes; the third is the strongest evidence in this plan; the fourth is a bug in my own test.

### 1. Task 1's RED, before the widening existed

The new describe was written and run against the unwidened `getCheckoutSession`:

```
 ❯ tests/payments/paymongo-calls.test.ts (24 tests | 5 failed) 20068ms
     × (1) reads the rail out of payments[0].attributes.source.type and paid_at as a Date 6ms
     × (2) defaults DEFENSIVELY when the provider omits payments, source or paid_at 4ms
     × (3) ignores a paid_at that is not a finite number rather than minting an Invalid Date 1ms
     × (5) with { timeoutMs }, an AbortSignal DOES reach fetch 1ms
     × (6) the abort SURFACES as a rejection — never as a silently-empty result 20011ms

 FAIL … > (1) reads the rail out of payments[0].attributes.source.type and paid_at as a Date
AssertionError: expected undefined to be 'gcash' // Object.is equality

- Expected:
"gcash"

+ Received:
undefined
```

**What the SHAPE of this red proves, beyond "it went red".** Five failed and **nineteen passed** — and cases **(4)** and **(7)**, the two negative signal assertions, were among the nineteen. They were green *before* the change and green *after* it, which is the only evidence that matters for T-13-03-EXPIREREG: they are pinning an absence that was already true, not recording one the change created. Case (6)'s 20s entry is the harness timing out against a stub that hangs when no signal arrives — i.e. the deadline genuinely did not exist.

Post-widening: **24 passed**.

### 2. Task 3's REQUIRED probe (a) — a migration appears

`drizzle/0026_probe.sql` was created with one comment line and nothing else changed:

```
 ❯ tests/design/money-path-invariants.test.ts (5 tests | 1 failed) 20ms
     × ends at 0025_audit_resolved_by.sql 10ms

 FAIL  … > GATE-06 / D-80 — drizzle/ ships no new migration > ends at 0025_audit_resolved_by.sql
AssertionError: drizzle/ now ends at "0026_probe.sql", not "0025_audit_resolved_by.sql".

D-80: the v1.1 milestone ships ZERO schema migrations, and Phase 17 SC#4 (GATE-06) makes that a
milestone-closing proof. Every Phase 13 decision is deliverable without a column — so a migration
proposed inside a v1.1 phase plan is a SCOPE ALARM to raise explicitly with the operator, never a
thing to absorb quietly because the feature seemed to need it. If a column genuinely is required,
that is a finding about the decision that asked for it, and it changes the milestone, not this line.

Do NOT "fix" this by updating LAST_MIGRATION.: expected '0026_probe.sql' to be '0025_audit_resolved_by.sql'
```

The message **names the offending file**, so the failure is actionable without opening the test. The other four cases stayed green in the same run, including the guard-the-guard count — so the red is about the directory's contents and not about the scan having moved. File deleted → `5 passed`, `git status --short drizzle/` clean.

### 3. Task 3's REQUIRED probe (b) — the rails set is widened

`REFUNDABLE_RAILS` itself was **not** touched (D-81 forbids it); the test's own assertion was pointed at a local widened copy, `new Set([...REFUNDABLE_RAILS, "qrph"])`:

```
 FAIL  … > D-81 — REFUNDABLE_RAILS excludes qrph > the SHIPPED set does not contain it
AssertionError: expected 'REFUNDABLE_RAILS now contains "qrph".…' to be '' // Object.is equality

+ REFUNDABLE_RAILS now contains "qrph". It must not.
+
+ PROBED 2026-07-23 and RE-PROBED 2026-08-20 against PayMongo TEST mode, the second time with a
+ FRESH Idempotency-Key (qrph-refund-reprobe-260820) against the same captured payment so a cached
+ response could not be replayed. Both returned, verbatim:
+
+     HTTP 400
+     {"errors":[{"code":"parameter_invalid","detail":"Refunds are not allowed for payments with source type qrph.","source":{"pointer":"payment_id","attribute":"payment_id"}}]}
+
+ The rejection is RAIL-LEVEL — not "payment too old", not "already refunded" — so it is a clean
+ signal. PayMongo's published docs list QR Ph as refundable and CONTRADICT this; observed behaviour
+ is authoritative over the docs row (D-81), and the docs row is a UAT re-verification item.
+
+ ⚠ If a fresh probe ever returns 2xx, that is a FINDING, not a fix. It makes refund-rail.ts and the
+ D-72 destination form stale and it changes D-82's policy split by cause — raise it, do not apply it
+ by widening this array. Widening it silently turns the manual-return branch into a refund call that
+ 4xxs, while the copy tells the booker their money is on its way.
```

The message reads as specified: the re-probe date, the verbatim rejection, and the instruction that a 2xx is a finding rather than a licence to widen. Restored → `5 passed`.

⚠ Note the third case in that describe, which is why this pin is not satisfiable by cheating: **emptying** `REFUNDABLE_RAILS` would also make it contain no `qrph`. The anti-vacuity case asserts `card`, `gcash` and `paymaya` are still in it.

### 4. Task 2's UNREQUIRED probe — the strongest evidence here (T-13-03-PROBELEAK)

The `try`/`catch` was deleted from `probeCheckoutSession` and nothing else changed. **Four** cases went red, and the second one is worth reading rather than counting:

```
 ❯ tests/booking/checkout-probe.test.ts (13 tests | 4 failed) 3067ms
     × (3) NEVER RAISES: a rejecting fetch underneath RESOLVES to null 8ms
     × (4) a NON-2xx from the provider also resolves to null, and its prose does not escape 3ms
     × (5) an UNRECOGNISED response shape resolves to null rather than a half-built state 2ms
     × (7) applies a DECLARED deadline — an AbortSignal reaches fetch, and a hung provider yields null 3014ms

 FAIL … > (3) NEVER RAISES: a rejecting fetch underneath RESOLVES to null
AssertionError: promise rejected "Error: ECONNRESET talking to the provider" instead of resolving

 FAIL … > (4) a NON-2xx from the provider also resolves to null, and its prose does not escape
AssertionError: promise rejected "Error: PayMongo GET /v1/checkout_sessions…" instead of resolving

Caused by: Error: PayMongo GET /v1/checkout_sessions/cs_gone failed (404): No such checkout session cs_gone
 ❯ paymongoFetch src/lib/paymongo.ts:109:11
 ❯ getCheckoutSession src/lib/paymongo.ts:373:16
 ❯ probeCheckoutSession src/lib/payments/checkout-probe.ts:75:17

 FAIL … > (5) an UNRECOGNISED response shape resolves to null rather than a half-built state
Caused by: TypeError: Cannot read properties of undefined (reading 'attributes')

 FAIL … > (7) applies a DECLARED deadline …
AssertionError: promise rejected "DOMException{ stack: 'TimeoutError: …' }" instead of resolving
Caused by: TimeoutError: The operation was aborted due to timeout
```

**Case (4) is T-13-03-PROBELEAK, demonstrated rather than asserted.** The provider's own sentence — *"No such checkout session cs_gone"* — is right there in the caller's stack, one frame below the page that would have rendered it. That is the exact route into a booker response the catch exists to close, and the stack trace names all three frames it travels through.

**Case (7) is T-13-03-PROBEDOS, demonstrated too**, and it also proves the deadline is real rather than a value nobody reads: `TimeoutError: The operation was aborted due to timeout` at ~3014ms against a stub that never resolves on its own. The green run asserts the elapsed time lands within 250ms below and 5s above `CHECKOUT_PROBE_TIMEOUT_MS`, so a constant changed to `0` or to an hour would redden it.

Restored → **13 passed**.

### 5. A real bug of my own, found on the first green attempt

`tests/booking/refund-window.test.ts`'s closed-world assertion used `/\d+\s*(?:day|days|hour|hours|…)/gi`:

```
- Expected
+ Received

  [
-   "24 hours",
-   "30 days",
+   "24 hour",
+   "30 day",
  ]
```

Regex alternation is **ordered**, so `day|days` matches `day` out of `days` and the assertion was comparing against a truncated set. Left alone it would have kept working, and would have kept working for a *fourth* window too — it just would not have named it correctly. The plurals now come first in every alternation and the reason is recorded at the line.

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 — Missing critical functionality] Task 1 is `tdd="true"` and names no test file**

- **Found during:** Task 1, before writing any source.
- **Issue:** The task carries `tdd="true"` and a `<behavior>` block with four claims, but its `<files>` are `src/lib/paymongo.ts, src/lib/payments/config.ts` and its `<verify>` runs an **existing** suite. Its acceptance criteria are greps, an untouched suite, `tsc` and `build` — **none of which can see the widening**. `checkout-session-expire.test.ts` passes identically whether `sourceType` is parsed correctly, parsed from the wrong nesting depth, or not parsed at all. A behaviour claim with no test is not verifiable, and this one is on the money path.
- **Fix:** A `getCheckoutSession` describe (7 cases) was added to `tests/payments/paymongo-calls.test.ts` — the file whose own header defines it as the suite that "mocks the GLOBAL `fetch` (NOT the paymongo module) and imports the REAL client, so it proves the actual wire behavior". Purely additive: no existing case, helper or title was modified. The two negative signal assertions live there, which is also the only place they *can* live, since `signal` is observable only on the recorded `RequestInit`.
- **Commit:** `4fb3fc0`.

**2. [Rule 3 — Blocking] The probe's own header failed the plan's `grep -c 'throw'` criterion**

- **Found during:** Task 2.
- **Issue:** The criterion is `grep -c 'throw' src/lib/payments/checkout-probe.ts` returning `0`, and the plan simultaneously asks the file to explain that it *never throws* and that the error is *swallowed rather than chained*. Every natural phrasing of that guarantee contains the token. This is 13-01 Deviation 1 and 13-02 Deviation 2's exact shape, a third time, on a third token.
- **Fix:** The file says **"never raises"**, **"resolves, always"**, **"the error is discarded whole"** and **"comes back as `null`"**. Every word of the reasoning survives; only the token does not. `grep -c 'throw'` returns `0`.
- **Commit:** `6bfabd5`.

**3. [Rule 2 — Missing critical functionality] A pre-emptive tripwire on a fourth token**

- **Found during:** Task 2, immediately after Deviation 2.
- **Issue:** The header's first draft said *"Resist the reflex to add a `console.error` just for debugging"* — a sentence forbidding a token, which itself spells the token. `grep -c 'console\.'` returned `1` on a file whose whole point is that it logs nothing. **No gate greps for this today** (the ESLint leak rule is scoped to `src/app/**` + `src/components/**`, and there is no `no-console` rule), so this was not blocking — but the repository has now tripped this family three times in three plans, and leaving a disarmed tripwire in place for a future gate to inherit is the cheapest kind of debt to avoid.
- **Fix:** Reworded to "a logging call", with an explicit note that the token is deliberately unspelled so a future whole-source grep cannot be tripped by the sentence forbidding it. `grep -c 'console\.'` returns `0`.
- **Commit:** `6bfabd5`.

**4. [Rule 1 — Bug] Line-number citations went stale inside the same plan that wrote them**

- **Found during:** Task 2, before the commit.
- **Issue:** `checkout-probe.ts` cites `paymongo.ts:288-296` (the inner catch whose argument it reuses) and `paymongo.ts:308-316` (the fall-through rule it copies). Both were correct when read — and **wrong by the time they were written**, because Task 1 had already added 11 lines above them in the same file. A citation that points at the wrong lines is worse than none: the next reader concludes the reasoning moved.
- **Fix:** Re-measured against the post-Task-1 file: `:299-307` and `:318-324`. Verified by grep, not by arithmetic.
- **Commit:** `6bfabd5`.

**5. [Rule 1 — Bug] Ordered regex alternation truncated my own closed-world assertion**

- **Found during:** Task 3, first run of `refund-window.test.ts` (1 failed / 9 passed). Full output in Watched Red 5. Plurals now lead every alternation; the reason is at the line.
- **Commit:** `8fee97c`.

### Recorded judgements

**A. `REFUND_WINDOW_BY_RAIL` omits `grab_pay`, which IS in `REFUNDABLE_RAILS`.**
The plan's behaviour list covers `card`, `gcash`, `paymaya`, unknown, and the unrefundable set — it does not mention `grab_pay`, which sits in the refundable set with a published 24-hour window. It is **deliberately absent**, because `createCheckoutSession` hardcodes `payment_method_types: ["card", "gcash", "paymaya", "qrph"]`, so no FitOut payment can be on that rail; adding a row would be a fourth number nobody has ever observed FitOut state. The function still handles it: a refundable rail with no verified sentence takes the **all-rails** sentence, not the manual marker — a refund genuinely was issued on such a rail, so the manual copy would be false in the other direction. Both the omission and the fallback direction are recorded on the map and on the function.

**B. `checkout-probe.ts` was NOT added to `GUARDED_MODULES` in `tests/design/server-only-guards.test.ts`.**
The plan asks only that that gate **pass**, and it does (7 passed, file untouched — its deny-list is a curated allow-list with no inverse scan, so a ninth guarded module neither breaks it nor is noticed by it). Adding a row would have moved the pinned `expect(GUARDED_MODULES.length).toBe(8)` to record a module that is not what D-34's deny-list is about: that list is *money computations and availability authorities* whose values must not be re-derivable in a browser. This module computes nothing — it makes a network call and reads a secret, which is why it carries the guard, and the guard is enforced by Turbopack at build time regardless of the row. That file's own "NOT COVERED" block already names this exact gap ("A NINTH money or availability module added tomorrow is unguarded and unnoticed here"). Flagging it here rather than moving a pin silently.

**C. One commit per task, not a RED/GREEN commit pair.**
The three tasks carry `tdd="true"`, and the generic executor flow suggests committing the failing test and the implementation separately. This phase's two shipped plans (13-01, 13-02) each used **one commit per task**, and a deliberately-red `HEAD` on `dev` is a worse artifact than a recorded red. Every red was observed and is transcribed verbatim above, which is the substance the discipline exists for.

## Threat Flags

None. This plan introduces no network **endpoint**, no auth path, no schema change and no new trust boundary beyond the three its own register names. The one net-new *outbound* call is `probeCheckoutSession`, and it is the mitigation rather than the surface.

- **T-13-03-PROBEDOS** (Denial of Service) — mitigated **and proved** (Watched Red 4, case 7). Every booker-facing probe carries `AbortSignal.timeout(CHECKOUT_PROBE_TIMEOUT_MS)`; the green run additionally asserts the elapsed time brackets the constant, so a deadline changed to `0` or to an hour reddens.
- **T-13-03-PROBELEAK** (Information Disclosure) — mitigated **and proved** (Watched Red 4, case 4). The caught error is discarded whole: not chained, not `cause`-attached, not logged, not rendered. `grep -c 'console\.'` on the module returns `0`.
- **T-13-03-EXPIREREG** (Tampering) — mitigated. The widening is additive, the deadline is opt-in, `expireCheckoutSession`'s body has a **mechanically verified** zero-line diff, and `checkout-session-expire.test.ts` passes unchanged. Two negative assertions pin that no signal reaches the expire POST or its LW-01 re-probe, and both were green **before and after** the change.
- **T-13-03-RAILWIDEN** (Tampering) — mitigated. `git diff --stat src/lib/payments/refund-rail.ts` is empty; the pin carries the verbatim rejection and was watched failing; an anti-vacuity case blocks the empty-set cheat.
- **T-13-03-MIGRATION** (Tampering) — mitigated. `drizzle/` ends at `0025_audit_resolved_by.sql`, pinned by an assertion watched failing, with a guard-the-guard floor so a wrong path cannot make it pass over an empty list.
- **T-13-03-SC** (supply chain) — discharged trivially. **Zero packages installed**; `package.json` and `package-lock.json` byte-unchanged. `AbortSignal.timeout` is a platform API on Node v24.13.0.

## Known Stubs

None — but one deliberate absence, which is not a stub:

**Nothing in `src/` calls `probeCheckoutSession`, `readPaymentState` or `refundWindowFor` yet.** That is this plan's scope: it builds the two facts every payment-state surface in the phase needs, and plans **13-04, 13-07, 13-09, 13-10, 13-12 and 13-15** own the call sites. The modules are nonetheless fully exercised — 23 unit cases across the two — rather than merely typechecked, so the contracts the surface plans inherit are demonstrated rather than promised.

Two things are recorded here as **UAT items, not stubs**:

1. **The Checkout Session response shape is PayMongo's documented contract, pinned by fixtures — not a live-observed body.** No live probe of a *paid* session's `payments[0].attributes.source.type` / `attributes.paid_at` was run (this plan installs nothing and the live-probe suite is gated behind `RUN_LIVE_PAYMONGO_PROBE=1`). Recorded in the function's own doc comment rather than only here.
2. **The `paid_at` unit is asserted as Unix seconds** on the same basis. The parse rejects non-finite values, so a units surprise degrades to `null` (and D-85's "Booked" fallback) rather than to a wrong date — but it would still be a finding.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [STATE-05]`, and it was **not** marked complete — the same call 13-01 and 13-02 made, for the same reason.

STATE-05 (the three distinct payment states) is carried by `13-01`, `13-02`, **`13-03`**, `13-04`, `13-07`, `13-15` and `13-16`. No surface renders anything from this plan yet, so nothing about STATE-05 is *observable*; checking the box would put `Complete` in `REQUIREMENTS.md`'s traceability table for states that are not yet distinguishable on screen. 13-UI-SPEC § The Support Path additionally records that **STATE-05 closes PARTIAL at phase end** (code-complete, address-pending, `SUPPORT_EMAIL` null — D-64), carried as a named `human_needed` item. The last plan that touches the ID is the one that should mark it.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `src/lib/payments/checkout-probe.ts` — FOUND
- `src/lib/booking/refund-window.ts` — FOUND
- `tests/booking/checkout-probe.test.ts` — FOUND
- `tests/booking/refund-window.test.ts` — FOUND
- `tests/design/money-path-invariants.test.ts` — FOUND
- `src/lib/paymongo.ts` — FOUND (modified)
- `src/lib/payments/config.ts` — FOUND (modified)
- `tests/payments/paymongo-calls.test.ts` — FOUND (modified)

Commits claimed, verified in `git log`:

- `4fb3fc0` — FOUND
- `6bfabd5` — FOUND
- `8fee97c` — FOUND
