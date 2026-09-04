---
phase: 13-confirmation-bookings-trust
plan: 10
subsystem: ui
tags: [trust, copy, money, idor, information-disclosure, design-system, closed-set, ladder, rtl, e2e]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "BOOKING_SHELL — the container all nine renders now share, and the nested-`main` fix this plan preserved on four more files"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "MoneyStatement, BookingReference and SupportPath — all three composed here, none re-rolled; and the rule that a selector row ships in the same commit as its literal"
  - phase: 13-confirmation-bookings-trust
    plan: 03
    provides: "probeCheckoutSession + readPaymentState (the never-raising, null-on-every-unanswered-path probe D-96 turns on) and refund-window.ts"
  - phase: 13-confirmation-bookings-trust
    plan: 04
    provides: "the reversed branch, its two row-level preconditions, and — the load-bearing one — the RESIDUAL written AT the branch rather than in a document, which is what made D-96 findable instead of re-derivable"
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "NotCompletedState + the rewritten PendingPaymentState, and the explicit TRUST-BLOCK SLOT comment left in the first of them for this plan to fill"
  - phase: 13-confirmation-bookings-trust
    plan: 09
    provides: "TrustBlock (mounted on five inline branches) and bookedListingAddress() — this plan carries both to the four component-owned renders"
  - phase: 07-cancellation-refunds
    provides: "LADDER / quoteRefund / rungBoundaries / bestFutureRungIndex and CancellationPolicyDisclosure — composed, never restated"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "PanelCard, EmptyState, and selector-contract.ts's bidirectional inventory"
provides:
  - "One shell rendered eight ways on `/bookings/[id]`, with `data-testid=\"booking-detail\"` — the sibling every BFLOW-08 decay assertion has to name"
  - "The ten status-meaning sentences (TRUST-01's first clause), shipped verbatim from 13-UI-SPEC's table"
  - "The outer `<Card>` gone from every branch: the page moves OFF ALLOWED_RAW_CARD and ONTO CARD_SURFACES as a declared panel-card adopter"
  - "TRUST-02 on every status — including the two renders that had no reference at all (pending settlement, lapsed approval)"
  - "TRUST-04's block on all NINE renders, as a ReactNode slot so one server-rendered element serves five inline branches and four client components"
  - "D-96 DISCHARGED: PaymentReversedState's third branch, whose every sentence is conditional on a charge and true under both readings of one row signature"
  - "composePolicyDisclosure() — TRUST-03's on-screen half in one named pure function, so no surface types a percentage or an hour"
  - "bookings/[id]/not-found.tsx — the owner gate's one answer for a missing row AND a foreign one, proved by a byte comparison"
  - "tests/booking/detail-completeness.test.tsx (42) and tests/booking/reference-surface.test.tsx (24)"
affects: [13-11, 13-12, 13-13, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A shared element passed DOWN as a `ReactNode` slot rather than imported by each client leaf — one server-rendered instance across nine renders, and no Server Component dragged into a client bundle"
    - "An itemisation rendered only on a POSITIVE MATCH against the frozen total, never by subtracting one part from it: subtraction cannot fail, so it manufactures a figure nobody was charged"
    - "A money branch chosen by WHAT IS KNOWN rather than by which claim is smaller — an unanswered third-party probe lands on copy that is conditional, not on the lesser of two assertions"
    - "A page composition extracted into a named pure function BECAUSE a Next page module exports nothing a test can import, so the alternative was restating the composition in the test"
    - "A response-parity claim asserted as a byte comparison of two rendered panels plus an equality of status codes — and the status asserted EQUAL to its twin rather than to a literal"

key-files:
  created:
    - "src/app/(app)/bookings/[id]/not-found.tsx"
    - "src/lib/booking/policy-disclosure.ts"
    - "tests/booking/detail-completeness.test.tsx"
    - "tests/booking/reference-surface.test.tsx"
  modified:
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/components/booking/payment-reversed-state.tsx"
    - "src/components/booking/pending-payment-state.tsx"
    - "src/components/booking/not-completed-state.tsx"
    - "src/components/booking/expired-approval-state.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/card-pattern-coverage.test.ts"
    - "tests/design/type-scale.test.ts"
    - "tests/design/empty-state-adoption.test.ts"
    - "tests/booking/cancellation-policy.test.ts"
    - "tests/booking/payment-states.test.tsx"
    - "tests/booking/reversed-state.test.tsx"
    - "e2e/shell.spec.ts"

key-decisions:
  - "D-96 is discharged as a THIRD BRANCH, not as a reworded second one. 13-04's fallback chose between two refund truths and both presuppose a charge; the question an unanswered probe cannot answer is whether a charge happened at all. The new branch's every sentence is conditional and it names no amount"
  - "The branch is called `indeterminate` — `readPaymentState`'s own word for that answer — and NOT `unverified`, because `trust-signals.test.ts` bans `verified` in authored copy under `src/components/booking/**` and a string-literal branch name is authored copy to an AST walk"
  - "The listing read and every shared derivation moved ABOVE the `pending` branch. D-67 puts the trust block on every status including the two that branch returns, and neither the listing nor the host existed at the point it used to return from. It also removed the branch's second Postgres clock read"
  - "The trust block reaches the four component-owned renders as a `ReactNode` SLOT rather than as an import: three of the four are client components, and a slot keeps one server-rendered element across all nine renders instead of nine that can drift"
  - "The disclosure is rendered where the CANCEL ENTRY is offered (`sessionAhead` on the confirmed branch) and nowhere else. A policy on a booking that cannot be cancelled is a window that closed; a cancel entry with no policy beside it is the irreversible money action D-81 exists to put terms in front of"
  - "`composePolicyDisclosure` passes a NULL snapshot tier through as null and never through `tierOrDefault`. That fallback exists so the refund ENGINE has a safe answer for legacy rows; presenting it as 'this host's cancellation policy' would put a promise in a host's mouth they never made"
  - "Two never-charged endings read `Quoted total`, not `Total`. It is new copy rather than shipped copy, and it is D-90's rule applied one status along: a row labelled Total over a hold nobody paid for is a money statement FitOut cannot stand behind"
  - "The not-found page composes `EmptyState`, not `ErrorState`, on two independent grounds: `ErrorState` paints the alarm token (banned phase-wide) and requires an `onRetry` for a page where there is nothing to retry"
  - "The IDOR case asserts the two status codes EQUAL TO EACH OTHER, not equal to 404. Measured: both are 200, because the layout streams a Suspense shell before the gate raises. The threat is a DIFFERENCE, and pinning the literal would go red on a framework change that altered nothing about the oracle"

patterns-established:
  - "The grep-vs-prose collision reached its TWELFTH instance in this phase (this plan's own `refund on its way` comment). It is now cheaper to write the criterion as a scoped scan than to keep paying it"
  - "A committed e2e assertion can itself be the defect: 13-04's `toContainText(\"You were charged\")` ran against the one fixture whose probe is deterministically unanswerable, so the proof that the page explains itself offline was also the proof that it asserted an unverified charge"

requirements-completed: []  # NONE — see "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 71min
completed: 2026-08-21
---

# Phase 13 Plan 10: One Shell, Eight Renders, Ten Status Meanings Summary

**Every booking status now renders the same skeleton with the same facts — so the confirmation moment is safe to decay into it — and the last surface on `/bookings/**` that could state a money fact FitOut had not verified now says only what an unanswered payment probe actually permits: the booking is cancelled, and *if* anything was charged it is coming back.**

## Performance

- **Duration:** ~71m of execution across two sessions (the first process exited between Task 2 and Task 3; nothing was lost and nothing on `dev` had moved)
- **Completed:** 2026-08-21
- **Tasks:** 3 / 3
- **Files:** 4 created, 13 modified

## Accomplishments

- **D-96 is discharged, and the fix is a third branch rather than better wording.** 13-04 wrote its residual *at the branch* so the next author would find it instead of re-deriving it — and that is exactly what happened. The residual: with no probe information, the fallback row signature (`cancelled` + no `cancelled_by` + no `payment_id` + a real session id) is **shared with an abandoned hold** that a later booker's stale-hold sweep flipped to `cancelled` (`availability/units.ts:487` / `:922`). That booker was never charged one centavo. 13-04's fallback chose between *automatic* and *by-hand* — two answers to *which refund*, and both presuppose a charge. The new `indeterminate` branch answers the other question: it states the booking was cancelled, that **if** anything was charged it is being returned, carries the reference and the support path, and **names no amount at all**.
- **It is proven on BOTH readings of the one row, because that is the whole point.** `detail-completeness.test.tsx` drives the identical `cancelled` row three ways and only the probe differs: silent → no amount anywhere and the conditional sentence; `paid` on a by-hand rail → *"You were charged ₱1,050.00"*; `paid` on a card → the automatic branch. A fourth case renders the same row as the **abandoned-hold reading** and asserts end to end that nothing on the page tells a booker who was never charged that they were. Watched failing by reverting the branch — the output printed the false sentence verbatim.
- **The committed e2e proof was itself the defect.** `e2e/shell.spec.ts`'s reversed case asserted `toContainText("You were charged")` — against the one fixture whose `checkout_session_id` is synthetic and whose probe is therefore *deterministically unanswerable on every machine*. So the committed proof that the page still explains itself when the provider is down was simultaneously the committed proof that it asserted a charge it had no way to know had happened. Corrected in the same commit; it now asserts the conditional form and that the amount is nowhere in the document.
- **A missing booking and a foreign booking are one answer, proved by a byte comparison and not by inspection.** A second booker is signed up, requests the first booker's real `confirmed` booking and a well-formed UUID that names nothing, and the two responses are compared: the status codes must be **equal to each other**, the `empty-state` panel's `innerHTML` must be **identical**, and — the half parity alone does not cover — neither answer may carry the venue or the amount off the row. Guard-the-guard: the compared markup is asserted non-trivial, because an equality between two empty strings is satisfied perfectly by a panel that rendered nothing.
- **`MoneyStatement` renders on exactly four statuses, asserted in both directions and as a named set.** Present on the cancelled branch and the three payment states; absent on the other six. Watched failing by splicing a fifth sentence onto the confirmed branch — 2 red. The plus-a-named-set case exists because ten passing booleans and a fifth status quietly gaining a sentence look identical from inside a loop.
- **TRUST-02 closed the two renders that had no reference at all.** The pending state *named* the reference in prose past its escalation threshold but never rendered it — a person cannot take a string out of a sentence without transcribing it, and a transcription error on the one token support would ask for is the reason the copy control exists. The lapsed-approval state had none in any form. The confirmed branch's hand-rolled Display-sized reference is gone, replaced by the component TRUST-02 gives one owner.
- **TRUST-03 is on screen with concrete dates and today's peso figure, and the page types neither.** `grep -oE '[0-9]+%'` over `page.tsx` returns **nothing**. Every rung, its order and its instant come from `LADDER` through one named pure function, and `cancellation-policy.test.ts` feeds each boundary the composer discloses straight back into `quoteRefund` — they must agree on the dot and one millisecond later. Two probes watched failing.
- **The outer `<Card>` is gone from every branch, and the page changed sides in the card inventory.** `grep -c 'from "@/components/ui/card"'` returns **0**. `bookings/[id]/page.tsx` moved OFF `ALLOWED_RAW_CARD` and ONTO `CARD_SURFACES` as a declared `panel-card` adopter in the same commit, so the gate's inverse half now polices it — a raw card reappearing there is a failure rather than a permanent exemption (13-08's finding).
- **Zero packages. Zero migrations.** `drizzle/` still ends at `0025_audit_resolved_by.sql`. `site.ts`, `site-contacts.test.ts`, `refund-rail.ts`, `package.json` and `package-lock.json` are byte-unchanged since 13-09.

## Task Commits

1. **Task 1: One shell, eight renders, ten status meanings** — `2880c4a` (feat)
2. **Task 2: The cancelled money statement, TRUST-03's dates, and D-96** — `f34cac2` (fix)
3. **Task 3: The completeness and reference proofs, per status** — `090c6eb` (test)

## Files Created/Modified

- `src/app/(app)/bookings/[id]/page.tsx` — **restructured, +885/−427.** Five inline branches converge on `<div BOOKING_SHELL><section data-testid="booking-detail">`; the outer `<Card>` and the two static live regions are gone; the ten meaning sentences shipped; `factsPanel()` and `referencePanel` built once; the listing read and every shared derivation moved above the `pending` branch; the D-96 discriminator; the cancelled branch's `MoneyStatement`; `CancellationPolicyDisclosure` + today's figure.
- `src/app/(app)/bookings/[id]/not-found.tsx` — **new.** Three strings verbatim, `EmptyState`, a `div` (the layout owns the one `main`), and a header recording that the copy is a **security property**: this page is what the owner gate returns for a missing row AND a foreign one.
- `src/lib/booking/policy-disclosure.ts` — **new, pure.** `composePolicyDisclosure()`: boundary labels, `bestRungIndex`, `windowAlreadyOpen`, and `todayRefundCents` from `quoteRefund`. No DB import, no clock of its own.
- `src/components/booking/payment-reversed-state.tsx` — the `indeterminate` branch, its copy inside the existing `MANUAL-RETURN-COPY` sentinel region (so the same two prohibitions apply to it), a forked meaning sentence, and the `trustBlock` slot.
- `src/components/booking/pending-payment-state.tsx` — `<BookingReference/>` from the first paint + the `trustBlock` slot.
- `src/components/booking/not-completed-state.tsx` — the ad-hoc `<dl>` around the guarded support row replaced by the real trust block, which is what 13-07's own "THE TRUST-BLOCK SLOT" comment left for this plan.
- `src/components/booking/expired-approval-state.tsx` — the last outer `<Card>` in the family removed, the static live region removed, `reference` + `trustBlock` added.
- `src/lib/design/selector-contract.ts` — **+1 row** (`booking-detail`, `owner: "13-10"`), shipped in the same commit as its literal.
- `tests/design/card-pattern-coverage.test.ts` — **+1 `CARD_SURFACES` row, −4 `ALLOWED_RAW_CARD` rows**, `EXPECTED_SURFACES` 12 → 13, adopted 10 → 11.
- `tests/design/type-scale.test.ts` — `DISPLAY_INVENTORY` re-measured, 14 → 13 (the page's hand-rolled Display-sized reference paragraph is gone).
- `tests/design/empty-state-adoption.test.ts` — **+1 `ADOPTERS` row**, 12 → 13 files, 15 → 16 sites.
- `tests/booking/cancellation-policy.test.ts` — **+5 cases** driving the composer against `quoteRefund` at every boundary.
- `tests/booking/payment-states.test.tsx` / `reversed-state.test.tsx` — the real `TrustBlock` passed to every mount, and 13-07's pending assertions corrected (see *Deviations*).
- `e2e/shell.spec.ts` — the D-87 case's money assertion corrected by D-96; **+1 test**, the IDOR parity comparison.
- `tests/booking/detail-completeness.test.tsx` — **new, 42 cases.**
- `tests/booking/reference-surface.test.tsx` — **new, 24 cases.**

## Verification

Every command below was **run and its output observed in this session**, after the process restart. The two vitest configs and `next build` were never run concurrently, and no `DATABASE_URL` override was passed.

⚠ The local Postgres container was **down** when the session resumed (`npm run db:up` → ready in 1s). Recorded because the first `npm test` attempt failed at `tests/global-setup.ts` with a connection error and nothing else, which is the shape a reader should recognise rather than debug.

**Task 1**

| Criterion | Result |
|---|---|
| `grep -c 'from "@/components/ui/card"'` on `page.tsx` | **`0`** |
| `grep -c 'data-testid="booking-detail"'` | **`6`** — 5 rendered branches + 1 in the header's skeleton sketch. A comment is invisible to `selector-contract.test.ts`'s AST walk (13-02's finding), and the gate is green |
| `grep -i 'charged'` — no branch claims a charge on an unpaid hold | **one rendered occurrence**, `page.tsx:746`, and it is D-90's form: *"nothing is charged until they approve"*. The other hits are comment lines |
| `card-pattern-coverage.test.ts` | **11 passed**, ZERO added `ALLOWED_RAW_CARD` rows (four removed), `EXPECTED_SURFACES` re-measured in the same commit |
| `selector-contract.test.ts` | **7 passed.** Both directions are one set-equality assertion, so a green run IS `Declared-but-absent: [none]` / `Rendered-but-undeclared: [none]` |
| `npm run build` | **exit 0** |
| `grep -c 'variant="brand"'` | **`3`** — unchanged, and `brand-recipe.test.ts` pins exactly 3 for this file |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/cancellation-policy.test.ts` | **19 passed** (14 existing + 5 new, covering the detail page's call site) |
| `grep -oE '[0-9]+%'` on `page.tsx` | **no output** — no hand-typed percentage |
| `grep -c 'refund on its way'` | **`1`** — after the collision recorded in *Deviations* |
| `grep -ci 'refunded'` | **`3`, all three inside the pre-existing D-57 comment block** (`page.tsx:1013-1017`), which is 07-12's prose explaining why the word is not used. Zero in the cancelled branch's rendered copy |
| `not-found.tsx` exists, three strings verbatim, `grep -c '<main'` | **`1` / `1` / `1`** and **`0`** |
| Behavioural IDOR proof | **observed** — see below |
| `MoneyStatement` on exactly four branches | **asserted in Task 3**, both directions + a named set, and watched failing |

**Task 3**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/detail-completeness.test.tsx` | **42 passed**; its confirmed case renders with `searchParams: {}` — no query parameter |
| Watched red: the address line removed | **observed, verbatim below.** 3 red, naming the missing fact. Restored from a saved copy → 42 passed |
| `npx vitest run tests/booking/reference-surface.test.tsx` | **24 passed**, including the exact-string clipboard assertion |
| the exactly-one-`<h1>` assertion covers all ten renders as a COUNT | **yes** — `RENDERS` has its length asserted first, and each case is `toHaveLength(1)` on `getAllByRole("heading", { level: 1 })` |
| `npm test` | **153 files / 1481 passed, 4 skipped — exit 0.** (13-09 closed at 151 / 1415; **+2 files and +66 tests is exactly this plan's two suites**, 42 + 24) |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **153 passed / 1 skipped; 1481 passed / 4 skipped** |
| `npm run test:design` | **45 files, 782 passed / 3 skipped** — exit 0, unchanged from 13-09's close (this plan adds no design file; it re-measures three inventories) |
| `npm run build` | **exit 0** |
| `npx playwright test e2e/shell.spec.ts -g "one \`main\` landmark"` | **5 passed, 1 skipped** (the skip is D-35's PayMongo-key gate, pre-existing) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on every touched file | 0 errors |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git diff c5cad2b..HEAD` on `drizzle/`, `package.json`, `package-lock.json`, `site-contacts.test.ts`, `site.ts`, `refund-rail.ts` | **empty — zero changes to all six** |
| Deletion audit | **zero files deleted** across all three commits |
| Owner gate | `page.tsx:272` byte-unchanged; the only `notFound()` line in the diff is the `RENDERABLE` check moving as a whole line |
| Stub scan over the touched `src/` files | clean (one `placeholder` hit is this plan's own prose describing the slot 13-07 left and this plan filled) |

### The behavioural IDOR proof, as run

`e2e/shell.spec.ts` → *"a missing booking and a foreign booking answer identically (T-13-10-NFORACLE)"*, **passed**. It signs up a SECOND booker, then requests:

- `/bookings/{the first booker's real confirmed booking}`
- `/bookings/{a well-formed UUID that names nothing}`

and asserts **`notMine.status === notThere.status`**, **`notMine.html === notThere.html`** over the `empty-state` panel's `innerHTML`, that the compared markup is non-trivial, and that neither response carries the venue title or the amount.

**Measured, and the first draft got it wrong usefully:** both answers are **HTTP 200**, not 404. `(app)/layout.tsx` streams a `<Suspense>` shell for the header's auth slot, so by the time `page.tsx` reaches its owner gate the response headers are long gone and Next renders the boundary into the open stream. It is the same measurement `listings/[id]/(detail)/not-found.tsx` records for its own route. The assertion was therefore rewritten to compare the two statuses **to each other** — which is the actual threat (a *difference* is the oracle; 200/200 tells a script nothing) and which does not go red on a framework change that alters nothing about it. The 2xx costs nothing here: `/bookings/**` is behind the session gate and in no index, so the crawler argument that makes a 2xx wrong on a public page does not apply.

## The Watched Reds — verbatim

Six reds were observed. All six were deliberate probes; every one was restored from a **saved copy**, never with `git checkout` (13-08's finding), and `git diff --stat` confirmed a byte-for-byte restore each time.

### 1. Task 3's REQUIRED red — the address line removed from the confirmed branch

```
     × (1) states every fact the confirmation moment states, on a bare /bookings/{id} 104ms
     × (2) renders the SAME facts inside the detail section, not merely somewhere on the page 37ms
     × (9) reveals it on confirmed and derived-completed, and withholds it on the other eight 43ms

AssertionError: the exact street is absent on a CONFIRMED booking. D-91 grants exactly this exception
to the D-09 privacy toggle — the host-facing control already promises 'guests see an approximate area
until they book' — and the fixture's toggle is deliberately OFF, so a pass here cannot come from the
listing being public.: expected 'ConfirmedBooking confirmedThis time i…' to contain '88 Kalayaan Avenue'

AssertionError: confirmed: a booked render lost the exact street. D-91 grants this exception precisely
for the renders where the host's own promise — 'an approximate area until they book' — has been met.:
expected false to be true // Object.is equality

      Tests  3 failed | 39 passed (42)
```

**Three cases, not one, and the third is the interesting one.** Case (9) walks all ten renders and asserts the street is present on exactly the two booked ones — so it fired from the *other* direction, as a booked render that lost the address rather than as a missing string. **39 of 42 stayed green**, which is what shows the red is about the fact and not about the harness. Restored → 42 passed.

### 2. Task 2/3's most important red — D-96's third branch reverted to 13-04's fallback

One line changed back (`const branch = isApiRefundable(rail) ? "auto" : "manual"`):

```
 FAIL  … > D-96 — the unanswered probe claims nothing about a charge > (10) with the probe SILENT,
       no amount appears and every money sentence is conditional
AssertionError: THE DEFECT D-96 NAMES. With no probe information this row is indistinguishable from an
abandoned hold that was swept to cancelled, and that booker was never charged. An amount on this render
is a money fact FitOut has not verified.: expected 'We couldn\'t complete this bookingThi…' not to
contain '₱1,050.00'

Received: "We couldn't complete this bookingThis time was taken before your payment landed.You were
charged ₱1,050.00, and it's coming back to you.This payment can't be sent back automatically, so we've
flagged it to be returned by hand. Your reference is FIT-31SAF5HY — we've recorded it against this
booking.…"

 FAIL  … > (13) the ABANDONED-HOLD reading of the same row reads truthfully end to end
AssertionError: expected 'We couldn\'t complete this bookingThi…' not to contain 'You were charged'

      Tests  2 failed | 40 passed (42)
```

**The `Received` string is the finding, not the assertion.** That is the page a booker who abandoned a checkout would have read: a confident amount, a promise about returning it, and a cause (*"This time was taken before your payment landed"*) that is false for them in both halves. **Cases (11) and (12) stayed GREEN** through the probe — with the provider answering `paid`, the reverted code behaves identically — which is what shows the red is about the *unanswered* probe specifically and not about the branch generally. Restored → 42 passed.

### 3. The D-94 boundary — a fifth money sentence spliced onto the confirmed branch

```
     × (6·confirmed) does NOT mount money-statement 46ms
     × (6·completed (derived)) does NOT mount money-statement 21ms

AssertionError: confirmed: a money statement rendered on a status that has NO specified sentence. D-94
says the component mounts only where a sentence is defined, and that an executor must not invent a
fifth — an invented one is an un-reviewed claim about somebody's money.: expected
[ <div …(1)>…(1)</div> ] to have a length of +0 but got 1

      Tests  2 failed | 40 passed (42)
```

Two renders fired from one edit, because `confirmed` and derived-`completed` are one branch. Restored → 42 passed.

### 4. TRUST-02 — the reference stripped off the pending state

```
     × (2·pending (settling)) renders EXACTLY one reference, and it is this booking's 56ms
     × (3·pending (settling)) exposes the copy control by its accessible name 227ms
      Tests  2 failed | 22 passed (24)
```

The presence case and the control case fired together, which is the pair TRUST-02 actually asks for: a rendered string nobody can copy is half the requirement. Restored → 24 passed.

### 5 and 6. The policy composer — `bestRungIndex` pinned, then the peso figure detached

```
 FAIL  … > (13-10 b) every boundary it discloses is the exact instant quoteRefund changes its answer
AssertionError: expected +0 to be -1 // Object.is equality
 ❯ tests/booking/cancellation-policy.test.ts:518:36
    517|       expect(lapsed.todayRefundCents).toBe(0);
    518|       expect(lapsed.bestRungIndex).toBe(-1);
      Tests  2 failed | 17 passed (19)
```

```
 FAIL  … > (13-10 b) every boundary it discloses is the exact instant quoteRefund changes its answer
AssertionError: expected 100000 to be +0 // Object.is equality
 ❯ tests/booking/cancellation-policy.test.ts:509:44
    509|         expect(justAfter.todayRefundCents).toBe((MONEY.spacePriceCents…
      Tests  1 failed | 18 passed (19)
```

The second probe is the one that matters: `todayRefundCents: input.spacePriceCents` — a composer that returns the full space price whatever the rung — is exactly what a hand-typed figure would do, and it is caught one millisecond past every boundary on every tier. Restored → 19 passed.

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 — Missing critical functionality] The trust block and the reference had to reach four components the plan's file list does not name**

- **Found during:** Task 1.
- **Issue:** D-67 requires the block on EVERY status, and the execution brief assigns the four component-owned renders to this plan by name — but `<files>` lists only `page.tsx`, `card-pattern-coverage.test.ts` and `selector-contract.ts`. Two of those renders (pending settlement, lapsed approval) also carried **no reference at all**, which is a plain TRUST-02 miss the plan's own Task 3 test would have had to carve an exception for.
- **Fix:** A required `trustBlock: ReactNode` **slot** on all four (not an import — three are client components, and a slot keeps one server-rendered element across nine renders), plus `<BookingReference/>` on the two that lacked it and a `reference` prop on `ExpiredApprovalState`. `not-completed-state.tsx`'s ad-hoc `<dl>` around the guarded support row was replaced by the real block, which is what its own "THE TRUST-BLOCK SLOT" comment left for this plan.
- **Commit:** `2880c4a`.

**2. [Rule 3 — Blocking] The listing read had to move above the `pending` branch**

- **Found during:** Task 1, wiring the two states above.
- **Issue:** The `pending` branch returns *before* the listing is selected, so neither the trust block nor the address nor the host existed at the point it returned from.
- **Fix:** The listing read and every shared derivation moved above it; the `RENDERABLE` gate stayed below, unchanged, because `pending` was never in it. It also removed that branch's **second** `readDbNow` call — the page has one hydrated clock again.
- **Commit:** `2880c4a`.

**3. [Rule 1 — Bug] 13-07's pending assertions pinned the absence of the reference**

- **Found during:** Task 1, after adding `<BookingReference/>` to the pending state.
- **Issue:** Four cases in `payment-states.test.tsx` went red. Case (1) asserted the control set was `[]` ("NOTHING to press"), case (2) that it was exactly `["Refresh status"]`, case (4) that the reference string was absent from the **whole document** before the escalation threshold, and case (5) that no control existed beside the refresh.
- **Fix:** The property those cases defend is *"no way to ACT ON A FAILURE while the webhook is still the outstanding authority"* — and copying a reference retries nothing and cannot cost a second charge. The copy control is named as a `COPY_CONTROL` constant and included in the **whole-set** assertions rather than excused by a looser matcher, so an unlisted control still fails immediately. Case (4)'s absence check was **narrowed to the money panel**, which is what it is actually about (the escalation adds a sentence to ONE region and does not open a second) — and a positive assertion was added that the reference itself is on the page throughout.
- **Commit:** `2880c4a`.

**4. [Rule 2 — Missing critical functionality] The policy composition needed a testable seam**

- **Found during:** Task 2.
- **Issue:** The plan requires `cancellation-policy.test.ts` to be *"EXTENDED to the new call site"*. A Next page module exports nothing a test can import — `default`, `metadata` and a fixed set of route-segment keys, and nothing else — so an inline composition inside the RSC is unreachable, and the only alternative was to **restate** the composition in the test, which proves that the test can do arithmetic.
- **Fix:** `src/lib/booking/policy-disclosure.ts`, one named pure function, driven directly by five new cases that feed each disclosed boundary back into `quoteRefund`. Recorded in its header: `listings/[id]/book/page.tsx` still composes its own inline, so "one owner" is a claim about the detail page only until that surface adopts it.
- **Commit:** `f34cac2`.

**5. [Rule 1 — Bug] The committed e2e assertion was itself the D-96 defect**

- **Found during:** Task 2.
- **Issue:** `e2e/shell.spec.ts`'s reversed case asserted `toContainText("You were charged")`. That fixture's `checkout_session_id` is a synthetic `cs_e2e_…`, so its probe is **deterministically unanswerable on every machine** — which is precisely the D-96 case. The committed proof that the page explains itself when the provider is unavailable was also the committed proof that it asserted an unverified charge.
- **Fix:** It now asserts D-96's conditional form and that the amount is nowhere in the document, with the whole reasoning at the line.
- **Commit:** `f34cac2`.

**6. [Rule 3 — Blocking] Three pinned inventories moved and had to move in the same commit**

- **Found during:** Tasks 1 and 2.
- **Issue:** `type-scale.test.ts`'s `DISPLAY_INVENTORY` (removing the hand-rolled Display-sized reference took `page.tsx` 4 → 3 and the total 14 → 13); `card-pattern-coverage.test.ts`'s `EXPECTED_SURFACES` and adopted count; `empty-state-adoption.test.ts`'s adopter files and sites (the new not-found page).
- **Fix:** All three re-measured in the commit that moved them, each with the reason written into the inventory rather than into a plan document. **Zero `ALLOWED_RAW_CARD` rows added; four removed.**
- **Commits:** `2880c4a`, `f34cac2`.

**7. [Rule 3 — Blocking] The twelfth grep-vs-prose collision in this phase**

- **Found during:** Task 2's acceptance run.
- **Issue:** `grep -c 'refund on its way'` must return exactly `1`. The comment explaining that PROJECT D-79's wording is preserved verbatim **quoted** it, making the criterion read `2` against a correct file.
- **Fix:** Named descriptively (*"the IN-TRANSIT phrasing composed a few lines above"*), with an explicit note that the omission is deliberate and must not be "helpfully" fixed. Every word of the reasoning survives.
- **Commit:** `f34cac2`.
- **Note for the phase:** this is instance **twelve**. Plans after this one should write such criteria as scoped scans (code lines only) or budget for it.

### Recorded judgements

**A. The branch is named `indeterminate`, and the alternative would have turned a gate red.** The obvious name for "the probe told us nothing" is `unverified` — and `tests/design/trust-signals.test.ts` bans `verified` in **authored copy** under `src/components/booking/**` via an AST walk over string literals. A branch name in a discriminated union IS a string literal. `indeterminate` is `readPaymentState`'s own word for that answer, so the reader and the copy that renders its consequence share one vocabulary.

**B. The disclosure gates on `sessionAhead`, not on "a policy exists".** The plan says *"wherever a policy applies"*. Tying it to the same predicate the cancel entry uses is the reading that makes both true at once: a policy disclosed on a booking that can no longer be cancelled is a window that closed, and a cancel entry with no policy beside it is the irreversible money action D-81 exists to put terms in front of. Case (15) pins the negative on a completed session.

**C. The composer passes a NULL tier through, and does not call `tierOrDefault`.** The plan's action text names `tierOrDefault` (the `cancel/page.tsx` idiom). That page calls it because it must **quote money**; the component's own NULL-TIER note forbids it for a **disclosure**, because the Flexible fallback is an internal safety net for legacy rows and is not a policy any host chose. `book/page.tsx` already makes the same call for the same reason. Case (13-10 d) pins it.

**D. Two never-charged endings read `Quoted total` rather than the shipped `Total`.** New copy, and it is D-90's rule applied one status along: a declined request and a swept unpaid hold were never paid, and a row labelled *Total* over one of them is a money statement FitOut cannot stand behind. The three statuses where money genuinely moved keep the shipped word, and `requested` keeps its shipped *"You'll pay if approved"*.

**E. `LIVE_REGION_EXCLUSIONS` was NOT touched, and the regions themselves WERE.** 13-UI-SPEC's table says the `declined`, `cancelled` and `expired-approval` regions are **removed** — *a live region announces a CHANGE, and a freshly navigated page is not a change.* All three are gone. The **rows** stay, following 13-04's judgement D: `live-regions.test.tsx` has no declared-but-absent check, so a stale exclusion is not red, and the list's type-level count assertion belongs to the plan that closes all ten.

**F. Three stale `ALLOWED_RAW_CARD` rows were deliberately left.** `cancel/page.tsx`, `group/page.tsx` and `attendee-roster.tsx` render no raw card today either, but this plan touches none of those files and deleting an exemption for a surface you have not read is how a gate acquires a hole nobody meant. Recorded in the inventory for 13-12 / 13-13 / 13-14.

## Findings

**1. A committed assertion can be the defect it was written to prevent, and the fixture is where to look.** 13-04's e2e case is the instance: its assertion was correct *about the branch it named* and wrong *about the row it ran against*, because that fixture's synthetic session id makes the probe unanswerable by construction. The general shape — a test whose fixture silently selects the one branch the assertion should not be making — is worth checking for wherever a spec asserts copy against a seeded row.

**2. `bookings/[id]/**` answers 404s with HTTP 200, and this is now measured rather than assumed.** The layout's streamed `<Suspense>` shell means the gate raises after headers are sent. Harmless here (auth-gated, unindexed) and identical on both answers, so the oracle is closed — but a future plan that adds a **public** route under a streaming layout and relies on a 404 status should know this first. Same finding as `listings/[id]/(detail)/not-found.tsx`, now confirmed on a second route.

**3. `listings/[id]/book/page.tsx` still composes the policy disclosure inline.** Adopting `composePolicyDisclosure` there is a small, correct change and would make "one owner" literally true. Left for the plan that owns checkout; recorded in the module's header so it is found rather than re-derived — the discipline 13-04 used for the residual this plan just closed.

## Threat Flags

None. This plan introduces no network endpoint, no schema change, no new auth path and no new trust boundary.

- **T-13-10-IDOR** (Elevation of Privilege) — **mitigated, and the gate is byte-unchanged** through a restructure that moved almost every line around it. `page.tsx:272` is untouched; the diff's only other `notFound()` line is the `RENDERABLE` check moving as a whole line. The page now renders a host's name, an exact street and paid amounts, which raises the cost of a leak rather than its likelihood.
- **T-13-10-NFORACLE** (Information Disclosure) — **mitigated and PROVED, not argued.** One page, three strings; a committed e2e byte-comparison of the two answers plus an equality of status codes, with a guard-the-guard on the compared markup and an assertion that neither response carries a fact off the row.
- **T-13-10-FALSECHARGE** (Repudiation) — **mitigated.** D-90's copy on `requested`/`approved`, verified against the pay-on-approval CTA and both no-money cancel dialogs; one rendered occurrence of the word on the whole page and it is the negative form. **And extended past what the register asked for:** D-96 closes the same class on the reversed branch, where the register had not looked.
- **T-13-10-POLICYDRIFT** (Repudiation) — **mitigated.** Zero hand-typed percentages (grep returns nothing); every rung from `LADDER` through one function; `cancellation-policy.test.ts` extended to the new call site and watched failing twice.
- **T-13-10-ADDRSCOPE** (Information Disclosure) — **mitigated and asserted per render.** Routed exclusively through `bookedListingAddress()`; case (9) walks all ten renders and asserts the street on exactly the two booked ones, with the fixture's `showExactAddress` deliberately **false** so a pass cannot come from the listing being public.
- **T-13-10-SC** (Tampering) — **discharged trivially.** Zero packages; `package.json` and `package-lock.json` byte-unchanged.

## Known Stubs

None. The scan for hardcoded empties, placeholder text and unwired data over every `src/` file this plan touched is clean. (The one `placeholder` match is this plan's own prose describing the slot 13-07 left and this plan filled.)

Two deliberate absences that are **not** stubs:

- **`SupportPath` renders nothing at runtime**, because `SUPPORT_EMAIL` is `null` (D-64). The one line that changes is `src/lib/site.ts:70` and it is an operator action. Every surface here is written so the closed guard removes a **control** and never a **sentence**.
- **The receipt route and the confirmation moment are not asserted** by `reference-surface.test.tsx`, and its header says so: neither exists in the tree yet (13-12/13-13 and 13-11 own them). A case asserting them would be a case that cannot pass; one that skipped them silently would be the unfalsifiable list this phase has already been bitten by.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [TRUST-01, TRUST-02, TRUST-03, STATE-06]`, and **none was marked complete**, following 13-01/13-02/13-04/13-09's precedent:

- **TRUST-01** — closes as **PARTIAL at phase end** by 13-UI-SPEC's own instruction: the support path is code-complete and address-pending behind D-64's guard, carried as a named `human_needed` item. Also carried by `13-11` (the moment) and `13-12`/`13-13` (the receipt).
- **TRUST-02** — the reference now renders on all ten statuses and the group page. Two of the four surfaces D-78 names — the receipt and the confirmation moment — **do not exist yet**.
- **TRUST-03** — the on-screen disclosure with concrete dates is done here; 13-UI-SPEC AC#12 also requires it **on the moment**, which is `13-11`'s. The email half is Phase 15's by D-78.
- **STATE-06** — the money statement is now on all four specified statuses, but the requirement's falsifiable form is **geometric** (`money-statement` fully inside the initial viewport at 320×568 and 1280×800, both themes, all three payment states), and that is `13-15`'s Playwright pass.

Checking a box now would put `Complete` in `REQUIREMENTS.md`'s traceability table for surfaces that do not exist. The last plan that touches each ID is the one that should mark it.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `src/app/(app)/bookings/[id]/not-found.tsx` — FOUND
- `src/lib/booking/policy-disclosure.ts` — FOUND
- `tests/booking/detail-completeness.test.tsx` — FOUND
- `tests/booking/reference-surface.test.tsx` — FOUND
- `src/app/(app)/bookings/[id]/page.tsx` — FOUND
- `src/components/booking/payment-reversed-state.tsx` — FOUND
- `src/components/booking/pending-payment-state.tsx` — FOUND
- `src/components/booking/not-completed-state.tsx` — FOUND
- `src/components/booking/expired-approval-state.tsx` — FOUND
- `src/lib/design/selector-contract.ts` — FOUND
- `tests/design/card-pattern-coverage.test.ts` — FOUND
- `tests/design/type-scale.test.ts` — FOUND
- `tests/design/empty-state-adoption.test.ts` — FOUND
- `tests/booking/cancellation-policy.test.ts` — FOUND
- `tests/booking/payment-states.test.tsx` — FOUND
- `tests/booking/reversed-state.test.tsx` — FOUND
- `e2e/shell.spec.ts` — FOUND

Commits claimed, verified in `git log`:

- `2880c4a` — FOUND
- `f34cac2` — FOUND
- `090c6eb` — FOUND
