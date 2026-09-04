---
phase: 13-confirmation-bookings-trust
plan: 11
subsystem: ui
tags: [confirmation, bflow-08, history-api, decay, geometry, motion, reduced-motion, e2e, playwright-clock, rtl]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "CONFIRMATION_MOMENT_MIN_H (declared before its call site existed, which is why the moment's box is a derivation rather than a literal), BOOKING_SHELL, and e2e/helpers/seed-payment-states.ts — the confirmed and pendingLiveHold shapes are what make BOTH halves of this plan assertable"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "BookingReference, and specifically its `size=\"moment\"` arm — built for this surface two plans before it existed, so the reference renders at text-heading here and text-body on the detail with no second component"
  - phase: 13-confirmation-bookings-trust
    plan: 04
    provides: "D-87's reversed branch reached from DB state plus the probe — the precondition that made consuming the parameter safe at all"
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "PendingPaymentState's frozen poll mechanics (8 × 2500ms) and its manual control — the poller this plan proves cannot reach the consumer, and the control that proves the poller ran"
  - phase: 13-confirmation-bookings-trust
    plan: 09
    provides: "TrustBlock's `condensed` variant and bookedListingAddress() — both COMPOSED here, neither re-rolled"
  - phase: 13-confirmation-bookings-trust
    plan: 10
    provides: "the complete ordinary detail and detail-completeness.test.tsx — the decay's entire safety argument, re-run as an acceptance criterion here"
  - phase: 07-cancellation-refunds
    provides: "CancellationPolicyDisclosure — passed down as the SAME element the detail renders, never a second construction"
  - phase: 10-design-system
    provides: "DS-04's ONE global reduced-motion reset, whose `!important` universal rule is what reaches tw-animate-css's keyframes"
provides:
  - "ConsumePaidParam — the mount-effect history rewrite, mounted in exactly ONE place in the product"
  - "ConfirmationMoment — BFLOW-08's full-screen first paint: mark, h1, mode-branched lede, reference, Paid, the full email, the condensed trust block, the policy. No CTA, no money statement, one beat of motion"
  - "The confirmed branch's `?paid=1` trigger, and the props composed for it in the RSC"
  - "e2e/confirmation-decay.spec.ts — four cases: the geometry in both themes at three widths, the in-place rewrite + reload + Back, the D-89 zero-off-url-navigation proof over a DRIVEN clock, and reduced motion in both directions"
  - "tests/booking/confirmation-moment.test.tsx (15)"
  - "One declared selector row (confirmation-moment), shipped in the same commit as its literal"
  - "A second, separately-named success-hue inventory in status-vocab.test.ts: a bare success MARK is not a status chip"
affects: [13-12, 13-13, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A `framenavigated` listener that records each event's URL and asserts the OFF-URL set is empty — measured necessary, because `router.refresh()` itself emits the event and a raw count goes red at 8 against correct code"
    - "Playwright's `page.clock` driving a 20-second poller in 3 seconds, on a SECOND page from the same context — the cookie is context-level, so the fake clock never touches the shared page"
    - "A vacuity guard placed AFTER the assertion it protects, because position decides which sentence a reader sees first and the guard's protection is position-independent"
    - "A component that deliberately does NOT carry the shared page container: it lives inside the shell's measure as a sibling, so the padding is paid once"
    - "Two booking-mode columns threaded into one component under two prop names, because the booking's snapshot and the listing's current mode answer different questions on the same screen"

key-files:
  created:
    - "src/components/booking/consume-paid-param.tsx"
    - "src/components/booking/confirmation-moment.tsx"
    - "tests/booking/confirmation-moment.test.tsx"
    - "e2e/confirmation-decay.spec.ts"
  modified:
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/type-scale.test.ts"
    - "tests/design/status-vocab.test.ts"

key-decisions:
  - "The D-89 assertion counts navigations to a DIFFERENT url, not navigations. Measured: `router.refresh()` emits a `framenavigated` event, so the first draft — a raw count of zero — went red at 8 against an implementation doing exactly the right thing. That the eight are in-place refreshes is proved rather than assumed: the client component's own state survives all of them"
  - "The threat assertion runs BEFORE its two vacuity guards, and the order was chosen by watching the red. With the guards first, the defect reports *\"the poller did not reach its cap\"* — because the booker is bounced off the page and the poller unmounts with it — which reads as a flaky harness rather than as a paid booker being sent to a checkout page"
  - "The trigger carries `!isCompleted` beside the parameter and the status. `completed` is DERIVED off the same `confirmed` row (D-102), so without it a stale link would paint *\"You're booked\"* over a session whose own detail heading three lines below reads *\"This session is done\"*. D-90's rule applied to a tense rather than to a charge"
  - "`ConfirmationMoment` does NOT carry `BOOKING_SHELL`. 13-UI-SPEC puts it inside the shell's measure as `booking-detail`'s sibling; restating the container would nest a second `max-w-2xl px-4 py-8` inside the first and pay the padding twice"
  - "The policy disclosure arrives as a ReactNode SLOT while the trust block arrives as PROPS, and the split is principled: the policy is the IDENTICAL element the detail renders (so passing the element makes agreement structural), the trust block is a DIFFERENT variant (so it is composed from props)"
  - "Two booking-mode props. `bookingMode` is the booking's creation-time snapshot and selects the `<h1>` — *\"your host approved this\"* is only true of a booking that went through an approval. `listingBookingMode` is the space's mode today and feeds TRUST-04 signal 4. A booking taken under request-to-book on a listing that has since switched to instant must say both true things at once"
  - "A bare success MARK got its own inventory in status-vocab.test.ts rather than a fifth row in POSITIVE_CALL_SITES. That list's assertions require the recipe's surface AND ink on ONE element; a mark has no chip, so adding it would have forced either relaxing the same-element rule (WR-09's whole subject) or painting a `bg-muted` box around a success mark to satisfy a test — a design change made by a gate"
  - "The RTL suite asserts the absence of a CTA as a CLOSED SET of controls (`[\"Copy booking reference\"]`) rather than as a ban list of labels — 13-09's finding, that a word list cannot catch the item nobody thought of"

patterns-established:
  - "The grep-vs-prose collision reached instances THIRTEEN through SIXTEEN in this phase, and the sixteenth is a new direction: an acceptance criterion of the form `grep -c '<Component>' returns 1` is UNSATISFIABLE for a component that must also be imported. 13-10's advice — write such criteria as scoped scans — is now overdue"
  - "A watched red can fire on the WRONG assertion and still be a correct red. The finding is that assertion ORDER inside a case is part of its diagnostic contract, not just its logic"

requirements-completed: []  # NEITHER BFLOW-08 nor TRUST-03 is closed here — see the section below.

# Metrics
duration: 47min
completed: 2026-08-21
---

# Phase 13 Plan 11: Build the Confirmation Moment, and Make It Decay Summary

**BFLOW-08's post-payment screen now fills the first viewport inside the same route and then removes its own query string, so a reload renders the ordinary detail page — and the one bug that would only have appeared under a slow webhook, a paying booker silently bounced to checkout mid-confirm, is now a committed test that was watched printing the exact checkout URL it sends them to.**

## Performance

- **Duration:** ~47m
- **Completed:** 2026-08-21
- **Tasks:** 3 / 3
- **Files:** 4 created, 4 modified

## Accomplishments

- **The decay is measured, not described.** `e2e/confirmation-decay.spec.ts` walks 320×568, 375×667 and 1280×800 in **both themes** — the list crosses the `sm:` breakpoint deliberately, because both sides of it are in `CONFIRMATION_MOMENT_MIN_H` and a viewport list that stayed on one side would leave half the constant unmeasured. At each: the moment's box is at least the viewport minus 64, and `booking-detail`'s top edge is at or past the viewport height. Then the URL is asserted to read `/bookings/{id}` with no query, a reload renders `booking-detail` with **zero** `confirmation-moment`, and Back lands on the previous entry rather than back inside the moment.
- **D-89 is proved, and the proof was watched failing with the defect deliberately reproduced.** The red printed the finding rather than an assertion number:

  > `the pending page was navigated to 1 other url(s) … Array [ "http://localhost:3000/listings/e2e_bk_listing_…/book?hold=e2e_decay_pay_pendingLiveHold_…" ]`

  That is a booker whose payment has reached FitOut, sitting on a **checkout page for the booking they just paid for**, with a live hold and a *Confirm & pay* button in front of them. This project has already measured what pressing it costs: PayMongo does **not** honour an idempotency key on checkout-session creation — probed live, and it cost a real double charge on an unrefundable rail.
- **The first draft of that assertion was wrong in the instructive direction, and the correction is the finding.** A raw `framenavigated` count went red at **8** against correct code: `router.refresh()` emits the event, because Next keeps the history entry in sync as it re-fetches the RSC payload. The assertion now records each event's URL and requires the off-URL set to be empty — which is D-89's actual threat and is strictly stronger than comparing the final URL, since a bounce that returned by another route would satisfy that and be caught by this. That the eight events are in-place refreshes is **proved rather than assumed**: `PendingPaymentState`'s manual control appears only in the eighth callback of an interval that was never remounted, and a real navigation would have thrown that client state away.
- **The poller is driven, not waited out.** `page.clock.install()` plus eight `runFor(2500)` ticks completes a 20-second cap in **3.0s**, on a **second page from the same context** — the session cookie is context-level, so the fake clock never touches the shared page every other case runs on.
- **The moment says what is true for the state it is in.** `instant` leads with arrival; `request` leads with *"You've paid {₱X} in full. FitOut holds it until after your session."* under *"Your host approved this — you're booked"* (D-62 **as corrected by D-90**). Case (10) asserts the negative across eight phrasings in both modes: no copy anywhere in the moment describes a charge that is pending, at risk or conditional on an approval. There is no such state to reassure anybody about — request-to-book is pay-on-approval, so a booker reaching this surface has already been approved *and* paid.
- **Reduced motion is honoured through the one global mechanism, and the assertion is not vacuous.** Both directions run, in both themes: with `no-preference` exactly **one** element inside the moment animates, at **0.32s** (`--motion-slow`, which is also the budget's cap, so it is inside the budget by construction); with `reduce` the same one element is still there and reports a suppressed duration. Zero elements report an infinite iteration count in **either** mode — a looping animation on a terminal success screen is wrong for every reader, not only for one who asked for less motion. `grep -ci 'prefers-reduced-motion'` on the component returns **0**: there is no second, per-component mechanism to drift from the global one.
- **Nothing important lives only in the moment**, and that link is asserted rather than assumed: `detail-completeness.test.tsx`'s 42 cases were re-run green as an acceptance criterion of this plan, which is what makes consuming the parameter safe at all.
- **Zero packages. Zero migrations.** `drizzle/` still ends at `0025_audit_resolved_by.sql`. `package.json`, `package-lock.json`, `site.ts`, `site-contacts.test.ts` and `refund-rail.ts` are byte-unchanged. Zero files deleted across all four commits.

## Task Commits

1. **Task 1: ConsumePaidParam — one effect, one call, one mount point** — `bb1d011` (feat)
2. **Task 2 (TDD RED): the confirmation moment's fifteen cases, before the moment exists** — `6fd93d2` (test)
3. **Task 2 (TDD GREEN): ConfirmationMoment — the full-screen first paint** — `f800254` (feat)
4. **Task 3: mount the moment on the confirmed branch, and measure the decay** — `7135b48` (feat)

Task 2 needed no REFACTOR commit: the GREEN implementation is the shape the tests were written against.

## Files Created/Modified

- `src/components/booking/consume-paid-param.tsx` — **new, 101 lines**, of which 9 are code. A `"use client"` component rendering `null`, with one mount effect keyed on `usePathname()`. The header quotes the shipped pending branch's shape, states the consequence of reaching it, and records PROJECT D-57.
- `src/components/booking/confirmation-moment.tsx` — **new.** A Server Component taking finished, server-composed values only — no numeric money prop, no date math, no state, every prop required. `<section data-testid="confirmation-moment">` sized by `CONFIRMATION_MOMENT_MIN_H`, the eight specified items in order, one `CheckCircle2Icon` beat, no CTA, no `MoneyStatement`.
- `src/app/(app)/bookings/[id]/page.tsx` — **+86/−1.** One trigger, one mount, and the props composed in the RSC: `composeWhenLabelShort` for the arrival line, `bookedListingAddress()`'s lines, `formatMoney` for both money strings, the session email, and the detail's own `policyDisclosure` element as a slot.
- `src/lib/design/selector-contract.ts` — **+1 row** (`confirmation-moment`, `owner: "13-11"`), shipped in the same commit as its literal.
- `tests/design/type-scale.test.ts` — `DISPLAY_INVENTORY` **13 → 14**, with the reason (and the reason there is deliberately no paired `loading.tsx` row).
- `tests/design/status-vocab.test.ts` — a second success-hue inventory, `SUCCESS_GLYPH_SITES`, and one new case pinning it at exactly one file that carries no chip surface.
- `tests/booking/confirmation-moment.test.tsx` — **new, 15 cases.**
- `e2e/confirmation-decay.spec.ts` — **new, 4 cases** in one serial describe on one shared browser context.

## Verification

Every command below was **run and its output observed in this session**. `npm test`, `npm run test:design` and `npm run build` were never run concurrently, and no `DATABASE_URL` override was passed. The local Postgres container was already up (`npm run db:up` → *Container fitout-db-1 Running*).

**Task 1**

| Criterion | Result |
|---|---|
| `grep -c 'replaceState'` | **`1`** — line 97, the call. After the collision recorded in *Deviations* |
| `grep -c 'pushState\|router.replace'` | **`0`** — same collision |
| `grep -c '"use client"'` | **`1`** |
| `grep -c 'useEffect'` | **`1`**, and the history call is inside it |
| `npx tsc --noEmit` / `npx eslint` | exit 0 / 0 errors |
| `npx vitest run --config vitest.design.config.ts` | **45 files, 782 passed / 3 skipped** — exit 0 |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/confirmation-moment.test.tsx` | **15 passed**, both mode variants |
| RED first | **observed** — the run before the component existed failed to resolve the import, `Tests  no tests` |
| `grep -c '<main'` | **`0`** — after the collision recorded in *Deviations* |
| `grep -c 'data-testid="confirmation-moment"'` | **`1`** |
| `grep -ci 'prefers-reduced-motion'` | **`0`** — same collision |
| `grep -c 'variant="brand"'` | **`0`** — there is no CTA in the moment |
| `tests/design/motion-budget.test.ts` | **passed** |
| `tests/design/trust-signals.test.ts` | **passed** |
| `tests/design/type-scale.test.ts` | **39 passed** after the inventory moved in the same commit |
| `tests/design/status-vocab.test.ts` | **32 passed** (31 + the new bare-mark case) |
| `tests/design/selector-contract.test.ts` | passes; the row shipped with its literal after the gate went red on it |

**Task 3**

| Criterion | Result |
|---|---|
| `npx playwright test e2e/confirmation-decay.spec.ts` | **4 passed (27.2s)** — geometry at three widths × two themes, the decay, Back, D-89, reduced motion × two themes |
| Watched red: the consumer hoisted into the pending branch | **observed, verbatim below** — assertion 5 failed naming the checkout URL. Restored from a saved copy, `cmp` byte-identical, re-run **4 passed** |
| `grep -c 'ConsumePaidParam'` | **`2`** — one import, one mount. `grep -c '<ConsumePaidParam'` is **`1`**; see *Deviations* |
| `grep -c 'paid === "1"'` | **`2`** — the pending gate and the confirmed trigger, and no other branch |
| `grep -c 'replaceState'` on the page | **`0`** — the page mounts the consumer and never calls the API itself |
| `npx vitest run tests/booking/detail-completeness.test.tsx` | **42 passed** (81 with the two sibling suites) |
| `npm run build` | **exit 0** (14 warnings, 0 errors — unchanged from 13-10) |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **154 files / 1496 passed, 4 skipped — exit 0.** (13-10 closed at 153 / 1481; **+1 file and +15 tests is exactly this plan's one suite**) |
| `npm run test:design` | **45 files, 783 passed / 3 skipped — exit 0.** (13-10 closed at 782; **+1 is exactly the new bare-mark case**; this plan adds no design FILE, it re-measures two inventories and extends one) |
| `npm run build` | **exit 0** |
| `npx playwright test e2e/confirmation-decay.spec.ts` | **4 passed** |
| `npx playwright test e2e/shell.spec.ts` | **24 passed, 1 skipped** (the skip is D-35's PayMongo-key gate, pre-existing) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on every touched file | 0 errors |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git diff --stat drizzle/` | **empty** |
| `git diff --stat` on `package.json`, `package-lock.json`, `site-contacts.test.ts`, `site.ts`, `refund-rail.ts` | **empty — zero changes to all five** |
| Deletion audit (`git diff --diff-filter=D` across all four commits) | **zero files deleted** |
| Stub scan over every `src/` file this plan touched | clean — zero hits for TODO / FIXME / placeholder / coming soon / not available |

## The Watched Reds — verbatim

Three reds were observed. The probe was restored from a **saved copy** (`cmp` byte-identical), never with `git checkout` (13-08's finding).

### 1. THE PLAN'S REQUIRED RED — `<ConsumePaidParam/>` hoisted into the pending branch (D-89)

The probe reproduced the defect faithfully: the consumer mounted beside `PendingPaymentState`, inside the `paid === "1"` return.

```
Error: the pending page was navigated to 1 other url(s) while the webhook was still in flight
(3 main-frame navigation events in total). THIS IS D-89: `<ConsumePaidParam/>` may be mounted on the
CONFIRMED branch only. `router.refresh()` re-renders the RSC for the CURRENT url, so a parameter
stripped anywhere the poller can reach drops the next poll into the no-parameter path — a probe and
then `redirect(…/book?hold=…)` — and bounces a booker who has already paid back to checkout.

expect(received).toEqual(expected) // deep equality

- Array []
+ Array [
+   "http://localhost:3000/listings/e2e_bk_listing_2c1f7eaa-a29f-4c66-93d8-99ccff72bc08/book?hold=e2e_decay_pay_pendingLiveHold_4c4d2ce1-ff41-4f93-9132-bb85b5d8cc81",
+ ]
```

**The `Array` is the finding, not the assertion.** Three navigation events instead of the correct eight — the poller never got to its cap, because after the strip the second poll redirected the booker off the page entirely. The URL is a **checkout page for the booking they had just paid for**, with a live hold and a *Confirm & pay* button on it.

### 2. THE SAME RED, ON THE WRONG ASSERTION — and it is why the case is ordered as it is

The **first** run of the probe went red like this instead:

```
Error: the pending state never backed off, so the poller did not reach its cap — the navigation
assertions below would be measuring a page that never polled

Locator:  getByRole('button', { name: 'Refresh status' })
Expected: 1
Received: 0
```

Correct, and useless. The vacuity guard was ordered first (the instinct: prove the page polled before asserting an absence), so on the real defect the FIRST thing to fail was the guard — because the booker is bounced off the page and `PendingPaymentState` unmounts with them, so its manual control can never appear. A reader seeing that sentence would go looking for a flaky harness. The threat assertion now runs first and the two vacuity guards run after it; a guard against vacuity works from any position, because a green run must satisfy every assertion in the block. **Assertion order is part of a case's diagnostic contract, not only its logic.**

### 3. THE FIRST DRAFT OF THE MEASUREMENT — a raw navigation count, red at 8 against CORRECT code

```
Error: the pending page navigated 8 time(s) while the webhook was still in flight. THIS IS D-89 …
Expected: 0
Received: 8
```

`router.refresh()` emits a `framenavigated` event — Next keeps the history entry in sync as it
re-fetches the RSC payload, and Playwright reports that as a same-document navigation. One event per
poll attempt, eight attempts, on an implementation doing exactly the right thing. The measurement was
re-scoped to navigations to a **different URL**, which is D-89's actual threat.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] Instances THIRTEEN through SIXTEEN of the grep-vs-prose collision**

- **Found during:** Tasks 1, 2 and 3.
- **Issue, four times over:**
  - **13.** Task 1's `<read_first>` asks for the Next.js docs quote *verbatim* in the file header, and the same task's acceptance criteria require `grep -c 'replaceState'` = 1 and `grep -c 'pushState\|router.replace'` = 0. The upstream sentence names both methods twice, so a correct file read **3 and 2** — the plan's own two halves in direct collision.
  - **14.** `grep -c '<main'` = 0, against a header sentence reading *"IT IS A `<section>`, NEVER A `<main>`"* → **1**.
  - **15.** `grep -ci 'prefers-reduced-motion'` = 0, against a header sentence explaining that the e2e drives that exact media feature → **1**.
  - **16.** A **new direction**: `grep -c 'ConsumePaidParam'` on `page.tsx` = 1 is **unsatisfiable by any working code** — a component that is mounted must also be imported, so the minimum is 2.
- **Fix:** 13 — the quote is paraphrased with its content intact and cited to `13-RESEARCH.md § Pattern 1`, where it lives in full; the two rejected calls are described rather than spelled. 14 — the element is named without its opening angle bracket. 15 — the media feature is named descriptively. Each carries an explicit note that the omission is deliberate and must not be "helpfully" fixed. For 16 the criterion's *intent* is one MOUNT site, so the satisfied form is `grep -c '<ConsumePaidParam'` = **1**, recorded beside the raw count of 2 rather than silently substituted.
- **Commits:** `bb1d011`, `f800254`, `7135b48`.
- **Note for the phase:** this is now instances 13–16, i.e. **sixteen in one phase**. 13-10 recommended writing such criteria as scoped scans; #16 shows the other failure mode — a criterion that no correct implementation can satisfy. Both are cheaper to fix in the planner than in every executor.

**2. [Rule 3 — Blocking] Three pinned design inventories moved and had to move in the same commit**

- **Found during:** Task 2's acceptance run.
- **Issue:** (a) `type-scale.test.ts`'s `DISPLAY_INVENTORY` — the moment's `<h1>` is `sm:text-display`, which is the Display role's own headline call site, so the map went 13 → 14. (b) `status-vocab.test.ts` — the success mark uses `text-success`, and that gate's icon-site set equality is over every file naming the hue. (c) `selector-contract.ts` — the gate went red on `Rendered-but-undeclared: [confirmation-moment]` the moment the literal shipped.
- **Fix:** All three moved in the commit that moved them, each with the reason written into the inventory rather than into a plan document. The selector row shipped in **Task 2's** commit rather than Task 3's as scheduled, which is 13-09's bidirectional rule being obeyed rather than restated. The success-hue change is a **new, separately named inventory** rather than a fifth row in `POSITIVE_CALL_SITES` — see *Recorded judgements*.
- **Commit:** `f800254`.

**3. [Rule 1 — Bug] The moment carried `BOOKING_SHELL` and would have nested a second container**

- **Found during:** Task 3, working out the geometry before writing the spec.
- **Issue:** The component was first written with `BOOKING_SHELL` on its own section. 13-UI-SPEC § Geometry puts the moment **inside** the shell's measure, as `booking-detail`'s sibling — so mounting it inside the page's existing `<div className={BOOKING_SHELL}>` would have nested a second `mx-auto max-w-2xl px-4 py-8` inside the first: the block padding paid twice and the measure halved. The same double-box trap `card-pattern-coverage.test.ts` records for a panel nested in a card.
- **Fix:** The constant removed from the component with the reason at the class site; the page opens the one shell and the moment, the separator and the detail are its three children.
- **Commit:** `7135b48`.

**4. [Rule 1 — Bug] The e2e's cases could not share a session, and the first shape of the file measured the wrong document**

- **Found during:** Task 3's first run.
- **Issue:** Playwright's `page` fixture builds a fresh context per test and the booker's session lives in a cookie, so case 2 reported *"the pending payment state did not render"* — the second context had no session at all and the owner gate 404s a booking that is not yours. Every box measured after that point would have been the not-found boundary's, which is the exact failure `shell.spec.ts`'s own header warns about for landmarks.
- **Fix:** One `browser.newContext()` in `beforeAll`, shared across the describe. `shell.spec.ts` answers the same problem by putting everything in ONE test; this file does not, because the D-89 case installs a fake clock — a document-level change that would then apply to every later navigation on the same page. It opens a **second page from the same context** instead, which inherits the cookie and leaves the shared page untouched.
- **Commit:** `7135b48`.

**5. [Rule 2 — Missing critical functionality] The trigger gained `!isCompleted`**

- **Found during:** Task 3.
- **Issue:** 13-UI-SPEC's trigger is the parameter AND `status === 'confirmed'`. `completed` is **derived** off that same `confirmed` row (D-102), so a stale link carrying the parameter would paint *"You're booked"* over a session that finished last week — while the detail's own heading three lines below reads *"This session is done"*. Two contradictory statements on one screen.
- **Fix:** One boolean, with the reasoning at the predicate. It narrows the trigger and never widens it, so the security half of *"both, always"* (PROJECT D-57) is untouched: the parameter still moves no branch on its own. The combination is unreachable through the shipped flow — nothing appends the parameter except the checkout return, and D-94 refuses checkout for a session that has started — which is exactly why it is worth one boolean rather than an argument.
- **Commit:** `7135b48`.

### Recorded judgements

**A. The policy is a SLOT and the trust block is PROPS, and the split is principled rather than convenient.** The plan's action text says *"the trust-block props and the policy props"*. The policy disclosure is the **identical** element the detail below renders, so passing the element itself makes *"the moment and the detail disclose the same window"* true by construction rather than by two call sites agreeing about five arguments. The trust block is a **different** element (condensed against full), so it cannot be shared and is composed from props. 13-10 established the slot idiom on this segment for exactly the first reason.

**B. A bare success mark is a third category in `status-vocab.test.ts`, not a fifth status chip.** `POSITIVE_CALL_SITES`'s assertions require the recipe's `surface` and `text` on **one element** — a chip has a `bg-muted` fill and a `text-foreground` label with the hue on its glyph. The confirmation moment's mark has neither: it is a `size-10` icon on the page ground, which is what DS-10 means by *"green retreats to the icon"*. Adding it to that list would have forced either relaxing the same-element requirement (WR-09's whole subject) or painting a chip surface around a success mark purely to satisfy a test — a design change made by a gate. `SUCCESS_GLYPH_SITES` records it separately, the set equality is over the union so an undeclared file still fails, and a second case pins the mark inventory at exactly one file **and** asserts it carries no chip surface.

**C. The arrival line uses `composeWhenLabelShort`, not the page's own `dateLabel`/`timeLabel` pair.** 13-UI-SPEC's lede is `{venue} · {Fri, Aug 21} · {9:00–11:00 AM} ({Makati} time)` — a short date, which is the module's `SHORT_DATE` token. Composing it from the page's long-form parts would have produced a fifth arrangement of the same instant; calling the module's own export means the moment cannot disagree with any other surface, and it resolves the open-capacity fork for free, so a drop-in pass reads as an entry window rather than as a reservation.

**D. The RTL suite asserts "no CTA" as a closed SET of controls.** The whole set of buttons inside the section is asserted equal to `["Copy booking reference"]`, and the anchor count to 0. A ban list of CTA labels cannot catch the control nobody thought of, and the realistic unwanted control on a success screen is exactly that one (13-09's measured finding, where a token ban stayed green on a real fifth trust signal that only a count caught).

**E. `MoneyStatement` is deliberately absent (D-94).** The Copywriting Contract specifies a money sentence for four statuses and this surface is none of them. The request lede's money answer is contract copy in its **own** row of the table (*"Lede — request"*), not a fifth money statement, and the component's header says so in both directions so a later author does not "consolidate" it.

## Findings

**1. `router.refresh()` emits `framenavigated`, and any future spec counting navigations on this app must know it.** Measured here: eight poll attempts produce eight main-frame navigation events on entirely correct code. Next keeps the history entry in sync while it re-fetches the RSC payload, and Playwright reports that as a same-document navigation. A spec that counts raw events to prove "nothing navigated" will go red against a page that is behaving perfectly. The usable form is to record each event's URL and assert the off-URL set.

**2. Assertion order inside a case is part of its diagnostic contract.** The guard-against-vacuity instinct says "prove the mechanism ran before asserting an absence", and that ordering produced a red that named the guard instead of the defect — because on the real defect the page under test is *gone*, so the guard is the first thing to notice. A vacuity guard protects a PASS and does so from any position; what position decides is which sentence the next reader sees. Worth checking wherever a case pairs a threat assertion with a liveness one.

**3. `page.clock` works cleanly against a Next 16 / React 19 client poller.** Installed before navigation, eight `runFor(2500)` ticks with a 250ms real pause between them drove a 20-second cap in 3.0s, with hydration, `router.refresh()` round trips and React state updates all intact. Recorded because the phase has two more surfaces with timers on them (13-15's geometry pass, and any future spec touching `RequestCountdown`), and the alternative — sleeping through the cap — is both slow and indistinguishable from timers that never fired.

**4. The moment's `min-height` and the page's own top padding compose correctly, but only because the header is `sticky` rather than `fixed`.** A sticky header occupies flow space, so the shell's content starts at y=56/64 and the moment's `100svh − header` floor lands its bottom edge past the fold at all three widths. Were the header ever made `fixed`, `booking-detail`'s top edge would move above the fold by the height of the header and assertion 2 would go red — correctly, and for a reason that has nothing to do with this file.

## Threat Flags

None. This plan introduces no network endpoint, no schema change, no new auth path and no new trust boundary.

- **T-13-11-PARAMSPOOF** (Spoofing) — **mitigated and asserted.** The trigger is the parameter AND `status === 'confirmed'`, both, and the e2e loads a seeded **pending** row with `?paid=1` and asserts `confirmation-moment` count **0**. No branch moved off DB status; the webhook remains the sole confirm authority.
- **T-13-11-POLLBOUNCE** (Denial of Service) — **mitigated and PROVED, not argued.** One mount, on the confirmed branch only; the e2e drives a seeded pending row through all eight poll attempts and asserts zero navigations to any other URL, with two vacuity guards. Watched failing with the defect reproduced, and the red printed the checkout URL.
- **T-13-11-BACKINTO** (Tampering) — **mitigated and asserted.** The history entry is replaced, never pushed: `grep -c 'pushState'` on the consumer is 0, and the e2e's Back case lands on the previous entry with no `paid=1` on it.
- **T-13-11-EMAILEXPOSE** (Information Disclosure) — **accepted, as the register says.** The address is the session user's own, on their own owner-gated booking behind auth. Case (7) asserts it renders unmasked and that no masked form appears; case (8) asserts the line is absent entirely when the session carries no address.
- **T-13-11-ADDRSCOPE** (Information Disclosure) — **mitigated.** Sourced exclusively through `bookedListingAddress()` (13-09) on a `confirmed` booking, which is precisely the case D-91 grants. This file names no address column.
- **T-13-11-DECAYLOSS** (Repudiation) — **mitigated.** `detail-completeness.test.tsx`'s 42 cases were re-run green as an acceptance criterion of this plan, and the component's header states the rule for the next author: the moment adds prominence, never information.
- **T-13-11-SC** (Tampering) — **discharged trivially.** Zero packages; `package.json` and `package-lock.json` byte-unchanged.

## Known Stubs

None. The scan for hardcoded empties, placeholder text and unwired data over every `src/` file this plan touched is clean — zero hits for TODO, FIXME, placeholder, coming soon or not available.

One deliberate absence that is **not** a stub: the condensed `TrustBlock` still receives `hostSinceLabel` and `listingPublishedLabel`, which it does not render. That is `trust-block.tsx`'s own contract — its props are required on both variants so a surface switching from condensed to full is a one-word edit rather than a prop hunt — and both values are already on hand in the RSC.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [BFLOW-08, TRUST-03]`, and **neither was marked complete**, following 13-01/13-02/13-04/13-09/13-10's precedent:

- **BFLOW-08** — the moment and its decay are done and measured. The requirement's own falsifiable set includes one item no `emulateMedia` and no seeded row can reach, and 13-VALIDATION § Manual-Only names it: a **real hosted PayMongo `sk_test_` checkout**, paid on the hosted page, returning to `/bookings/{id}?paid=1`. That is `13-16`'s, by the plan's own `<human-check>`. Everything a seeded row can prove is proved here; the last mile is a human with a test card.
- **TRUST-03** — the disclosure is now on the moment as well as the detail (13-UI-SPEC AC#12's other half), but the requirement's remaining half is the **email** one, which D-78 assigns to Phase 15.

Checking either box now would put `Complete` in `REQUIREMENTS.md`'s traceability table ahead of a verification that has not happened. The last plan that touches each ID is the one that should mark it.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `src/components/booking/consume-paid-param.tsx` — FOUND
- `src/components/booking/confirmation-moment.tsx` — FOUND
- `tests/booking/confirmation-moment.test.tsx` — FOUND
- `e2e/confirmation-decay.spec.ts` — FOUND
- `src/app/(app)/bookings/[id]/page.tsx` — FOUND
- `src/lib/design/selector-contract.ts` — FOUND
- `tests/design/type-scale.test.ts` — FOUND
- `tests/design/status-vocab.test.ts` — FOUND

Commits claimed, verified in `git log`:

- `bb1d011` — FOUND
- `6fd93d2` — FOUND
- `f800254` — FOUND
- `7135b48` — FOUND
