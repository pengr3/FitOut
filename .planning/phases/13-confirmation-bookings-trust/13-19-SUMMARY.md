---
phase: 13-confirmation-bookings-trust
plan: 19
subsystem: ui
tags: [trust, confirmation, payment-states, copy-contract, closed-set, affordance, visual-contract, uat]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 09
    provides: "TrustBlock and its exact-row COUNT — the gate this plan deletes the component of and RETARGETS the assertion from; also 13-09's measured finding that a token ban stays green on a signal nobody listed"
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "the pending poller's frozen mechanics (ref-held router, interval-only setState, cleared on unmount, bounded attempts) — preserved byte-for-byte while its indicator is re-gated"
  - phase: 13-confirmation-bookings-trust
    plan: 10
    provides: "the one-shell eight-render booking detail, the slot idiom for elements shared between the moment and the detail, and detail-completeness.test.tsx's ten-render table"
  - phase: 13-confirmation-bookings-trust
    plan: 11
    provides: "the confirmation moment, its measured min-height box and its ConsumePaidParam mount point — all untouched here except for what the moment SAYS"
  - phase: 12-booker-path-search-listing-checkout
    provides: "D-59 §2's requirement that the checkout carry one explicit, safe way back that states the hold is kept — the clause this plan finally implements as an affordance"
provides:
  - "The removal of TRUST-04's four-row trust panel from every booking surface (D-98), with TRUST-04's forbidden-signal scan byte-unchanged and green"
  - "The closed-set gate RETARGETED from the deleted component onto the page: the ordered `<dt>` TERM SET per status across all ten renders"
  - "PaidStatement — D-99's two-phase paid sentence, whose `settled` arm drops the hold clause because it becomes false the moment a session ends"
  - "A confirmation moment compacted to four items (D-100): the mark, the h1, the paid outcome, and the one fact that lives nowhere else"
  - "The pending indicator gated on `slow` (D-101.1) — a rendering change with the poller's mechanics provably unmoved"
  - "WayBackLink — 12-CONTEXT D-59 §2's escape hatch as a real `outline` control with its own cases, asserting PAINT off the rendered element"
  - "The finding that the repo's only infinite-iteration ban was pointed at the one surface that never had a spinner"
affects: [13-verification, 14-host-side-bookings, 15-transactional-email, 17-milestone-close]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A closed-set claim survives the deletion of the thing it was scoped to by being RETARGETED onto the page, as an ordered TERM SET rather than a count — strictly stronger, since a rename fails it too"
    - "A copy constant that is true on one branch and false on another takes a PHASE prop and DROPS the false clause rather than rewording it into a second unverified claim"
    - "Where a VISUAL contract matters, assert the class token off real elements with `class~=` — never off serialised markup, which the shipped Button recipe alone is long enough to satisfy"
    - "A CVA-derived discriminator (variant A's tokens minus variant B's), guarded by asserting the discriminator is non-empty first, so the assertion cannot go vacuous when the recipe moves"

key-files:
  created:
    - src/components/booking/paid-statement.tsx
    - src/components/booking/way-back-link.tsx
    - tests/booking/paid-statement.test.tsx
    - tests/booking/way-back-link.test.tsx
  modified:
    - src/app/(app)/bookings/[id]/page.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/components/booking/confirmation-moment.tsx
    - src/components/booking/pending-payment-state.tsx
    - src/components/booking/booking-reference.tsx
    - src/lib/design/selector-contract.ts
    - tests/booking/detail-completeness.test.tsx
    - tests/booking/confirmation-moment.test.tsx
    - tests/booking/payment-states.test.tsx
    - .planning/phases/13-confirmation-bookings-trust/13-CONTEXT.md
  deleted:
    - src/components/booking/trust-block.tsx
    - tests/booking/trust-block.test.tsx

key-decisions:
  - "D-98 — the four-row trust panel is removed from every booking surface; it supersedes D-67 and D-68"
  - "D-98 — 13-09's exact-row COUNT is RETARGETED onto the page as an ordered `<dt>` term set per status, not retired with the component"
  - "D-99 — the confirmed `<h1>` becomes `Booking confirmed & paid`, and a named PaidStatement carries the figure"
  - "D-99 — the hold clause is FALSE on a completed session, so `settled` drops it rather than replacing it"
  - "D-100 — the header carries the moment and the outcome; the facts card carries the detail. Four items survive"
  - "D-100 — the closing `it stays here if you refresh` sentence is deleted, both arms"
  - "D-101.1 — the pending indicator is gated on `slow`; replaced by a still clock, not removed"
  - "D-101.2 — the checkout's way back becomes `variant=\"outline\"` and moves into a named component with its own cases"

patterns-established:
  - "Retarget-don't-retire: when a gate's subject is deleted, move the assertion to where the threat moved rather than deleting both"
  - "Truth-by-branch for money copy: a sentence gets a phase discriminator when it is true on one render and false on another"
  - "Paint assertions: a rendered-tree class-token match is the only thing that can see an affordance defect"

requirements-completed: []

# Metrics
duration: 41 min
completed: 2026-08-21
---

# Phase 13 Plan 19: Four PM Corrections from Live UAT Summary

**The booking surfaces stop saying things that are not information and start saying the one thing a booker most needed — that the money is already gone — and two live defects the whole test suite was structurally unable to see are closed with gates that can see them.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-21T20:20:51+08:00 (first production commit)
- **Completed:** 2026-08-21T21:01:25+08:00 (last production commit)
- **Corrections:** 4 (D-98, D-99, D-100, D-101 — the last in two commits, one per defect)
- **Commits:** 6 (5 production + 1 decision-record)
- **Files:** 22 changed · 4 created · 2 deleted · +1548 / −1100

## Accomplishments

### D-98 — the four-row trust panel is gone from every booking surface (`6f9c039`)

The PM used it and judged it filler. The evidence is on their side, and it is worth keeping written
down rather than re-derived:

1. **At launch every host and every listing reads the same month.** *Host since* and *Listing
   published* were therefore the same two strings on every booking in the product. D-66's own argument
   for the plain date concedes it — *"it strengthens on its own as the marketplace ages"* is a promise
   about later, and there is no later yet.
2. **On a cancelled or reversed booking the payment row was worse than useless.** *"FitOut holds your
   payment until after your session"* is a promise about a session that is not happening. D-67 put the
   panel on the states that look wrong on the argument that trust matters most there. It was right
   about the NEED and wrong about the answer: those states need the money truth, and `MoneyStatement`
   and `ManualReturnNotice` already own it.

Removed from all nine call sites: the five inline branches of `bookings/[id]/page.tsx`, all four state
components (each also losing the trailing `<Separator/>` it left behind — a rule with nothing after it
divides content from the bottom of the page; the reversed state KEEPS its separator, which is D-72's,
not the panel's), and the condensed variant inside the confirmation moment. With it went
`listingBookingMode`, `hostSinceLabel` and `listingPublishedLabel` from the moment's props, and three
now-readerless columns from the page's listing select (`published_at`, the listing's current
`booking_mode`, the host's `created_at`) — a selected column with no reader is a row the page pays for
on every render and states nowhere. The `trust-block` selector-contract row was deleted in the same
commit as its literal, which is that contract's own rule in both directions.

### D-99 — the confirmed page says, in words, that it is PAID (`df2ba0d`)

The PM: *"the ticket shows booking confirmed and not paid… there's no obvious key wherein it stated
that it is already paid for."* Correct. The page rendered a status badge, an `<h1>` reading `Booking
confirmed`, and a facts row labelled `Total` beside a figure. None of those three answers whether the
figure has been paid or is DUE — and on a screenshotted ticket `Total ₱1,050.00` reads at least as
naturally as an amount outstanding.

Two changes, each stating a different thing once: the `<h1>` becomes **`Booking confirmed & paid`**
(confirmed is about the SLOT, paid is about the MONEY, and only the first was on the page), and a new
`PaidStatement` names the figure. It carries D-98's one surviving sentence — the hold-until-session
payout model, which is the answer to *where is my money* and earns a place in a PAYMENT statement even
though the panel it used to sit in did not.

### D-100 — the header stops restating the facts card (`a9376ea`)

The moment carried the venue, the venue-local window, the named timezone, the full address, the
reference, the amount AND the cancellation policy. Every one renders again in the detail directly
beneath it. The rule is now written onto the component: **the header carries the moment and the
outcome; the facts card carries the detail.** Four items survive — the success mark, the `<h1>`, the
paid statement (passed as a SLOT, so the moment and the detail cannot state two different paid
sentences), and D-63's email line.

The closing sentence is deleted, both arms. A page that persists does not need to announce that it
persists, and a booker who has navigated back to a booking has already demonstrated the fact it was
explaining.

### D-101 — two live defects (`5380b7a`, `2b404bf`)

The spinner and the invisible way out. Both are written up under Findings below, because in both cases
the interesting part is not the fix — one is a ternary, the other is one word — but why nothing in a
1,570-test suite could see them.

## Findings

### ⚠ THE MOST TRANSFERABLE FINDING — THE REPO ALREADY HAD AN INFINITE-ITERATION BAN, POINTED AT THE ONE SURFACE THAT NEVER HAD A SPINNER

`e2e/confirmation-decay.spec.ts:430` reads, in the repository's own words:

> ZERO INFINITE ITERATIONS, IN *EITHER* MOTION MODE. Confetti, a pulsing mark and **a spinner that
> never stops** are all one property away from each other […] a looping animation on a terminal
> success screen is wrong for every reader.

It filters `animationIterationCount === "infinite"` over `[data-testid="confirmation-moment"]` — the
confirmation moment, which has exactly one animation (a single-beat fade+scale on the success mark) and
has never rendered a spinner in its life. The surface that DID render one forever, and that the PM
reported as *"an infinite looping payment received"*, is `payment-state-pending`, and nothing anywhere
scanned it. Measured, not assumed: `grep -rn "iterationCount|animation-iteration|infinite"` over
`e2e/ tests/ src/` returns that spec, `reduced-motion.spec.ts` (which asserts the property of a
`/dev/theme` skeleton), `visual/freeze.css`, `motion-budget.test.ts` (which asserts the CSS RULE exists
in `globals.css`, not that any surface obeys it) and `globals.css` itself. **The right gate existed,
was correctly reasoned, named the exact defect class in its own comment — and was scoped to the wrong
element.** A gate's scope is part of the gate; "we have a rule about this" is not the same claim as
"the rule reaches the surface where it can break".

### ⚠ A TEST ASSERTING TEXT AND ROLES CANNOT SEE A VISUAL DEFECT — TWICE, INDEPENDENTLY, IN ONE PLAN

D-101 is two defects and they share a mechanism, which is why the PM found both and the suite found
neither.

**The spinner.** All twenty cases in `payment-states.test.tsx` were green over it. They assert text,
roles, control sets, live-region counts, and the class tokens that paint an *alarm* colour. A spinning
element and a still one share every one: same text (none), same role (none), same accessible name
(none — it is `aria-hidden`), same colour. The only difference in the entire DOM is one class token.

**The way back.** `e2e/shell.spec.ts` asserts that `<main>` holds exactly one `<a href>`, that it
points at `/listings/`, that its href carries no `resume` discriminator, that its label reads
`Back to the listing`, and that the hold promise is visible beside it — five assertions, all green,
for the entire life of a control that rendered as plain body text. 12-CONTEXT D-59 §2's word is
*explicit*, and explicit is a claim about what a booker can SEE.

**The rule this plan followed:** assert the class token off REAL ELEMENTS with `class~=`, never off
serialised markup — the shipped `Button` recipe alone is 37 tokens, long enough that substring matching
over `innerHTML` flags surfaces that render nothing of the kind. And derive the token from the CVA
rather than typing it, so the assertion cannot silently stop meaning anything when the recipe moves.

### ⚠ THE COMPLETED BRANCH MAKES D-98's ONE SURVIVING SENTENCE FALSE, AND NOTHING WOULD HAVE CAUGHT IT

D-99 says to carry *"FitOut holds your payment until after your session"* into the paid statement. Read
literally that is one unconditional sentence on the confirmed and completed branches. **It is false on
the second.** The payout sweep runs at `endsAt + PAYOUT_DELAY_HOURS`, so on a booking whose session has
happened the hold has arrived at its end or already released — the same booking would carry a true
sentence on Monday and a lie on Wednesday, on the page whose entire job is that a booker can trust what
it says about their money.

`PaidStatement` therefore takes a `phase`, and the `settled` arm **drops** the clause rather than
rewording it. The honest replacement would be a second claim about where the money is NOW, and this
page has read neither `host_payout_ledger` nor the sweep — which is D-96's rule (*state what is
verified; say nothing where nothing was read*) arriving one correction later on a different branch.
The paid FACT — the amount, in full — is stated on both, because that half is true regardless.

### ⚠ THE RETARGET WAS THE POINT OF D-98, AND A COUNT WAS NOT THE STRONGEST FORM AVAILABLE

13-09 measured that `tests/design/trust-signals.test.ts` reported **6 passed** with a real `Trusted
host` row spliced into the component, and that only the exact row COUNT caught it. Deleting the
component would have deleted the one gate that worked.

**Retargeted, and named explicitly as such in the SUMMARY as D-98 required.** The assertion moved from
`tests/booking/trust-block.test.tsx` (deleted with its subject) onto the PAGE, in
`detail-completeness.test.tsx`, where it now asserts the **ordered `<dt>` TERM SET** of each of the ten
renders. That is strictly stronger than 13-09's count: a fifth row fails it, and so does a renamed or a
reordered one. With the panel gone the facts panel is the only definition list a booking render still
opens, which makes it the only place a fifth signal could now land — and the four state components
declare `[]`, which is a CLAIM (they open no definition list at all) rather than an absence, so a row
appearing on one of them is exactly as red as a row appearing on the facts panel. The six non-empty
rows are what keep the walk from being vacuously green.

`tests/design/trust-signals.test.ts` is **byte-unchanged** across all six commits (`git diff --stat`
over the range returns empty) and green: twelve forbidden tokens, two-piece encoding, four-part
positive control, same three roots. TRUST-04 is a CONSTRAINT — only real signals may be shown — not a
mandate to show four, and that distinction is the whole content of D-98.

### D-60's decay-safety condition had to be checked, not assumed

The compaction removes five facts from the moment. Every one renders below: the arrival line → the
facts panel's `Space` + `When` + the timezone note; the address lines → `Where`; the amount → the paid
statement and the `Total` row; the reference → the reference panel, with the copy control that surface
needs; the policy → the disclosure on the renders where cancelling is still possible. **Exactly two
facts live only in the moment** — the email destination and the request `<h1>`'s approval fact — and
both stayed. That condition is now written on the component as the thing to re-check before compacting
further, and `detail-completeness.test.tsx` case (1) asserts the other side of it on a bare
`/bookings/{id}` with no query parameter at all.

### The policy disclosure was the starkest duplication, and it was duplication by construction

The moment was handed the **identical** `CancellationPolicyDisclosure` element the detail renders —
13-10's slot idiom, applied so the two could never disclose different windows. It worked: they never
disagreed, because they were the same element rendered twice on one screen. Same `<summary>`, same
concrete dates, same refund figure. A mechanism that guarantees two things agree is not a reason to
render both.

### Grep/prose collisions this plan met

Two, both resolved the way 13-PATTERNS § H prescribes rather than by loosening anything:

- `pending-payment-state.tsx`'s header already forbids spelling four tokens its acceptance criteria
  grep for. The new D-101.1 paragraph talks *around* the alarm colour and the three failure-shaped
  phrasings for that reason, and describes the fixed indicator by what it is rather than by what it is
  not.
- `way-back-link.tsx` sits under `src/components/booking/**`, which is one of
  `trust-signals.test.ts`'s three scan roots. Its copy (`Back to the listing`, the hold promise) is
  clean under all twelve tokens; checked by running the gate rather than by reading the list.

### An environment gotcha that cost two false red runs

Two full-suite runs came back with 16–18 FAILED test FILES and only 3–4 failed tests — the signature of
file-level setup failures, not assertion failures. Cause: **Postgres connection exhaustion**.
`select count(*) from pg_stat_activity` reported **101 against a `max_connections` of 100**, from
connections leaked by earlier interrupted subset runs plus the running dev server. Terminating idle
backends older than 60s (91 of them) restored a clean `158 passed | 1 skipped`. **A file-level FAIL
with a near-zero failed-test count is an infrastructure signal, not a code signal** — read
`pg_stat_activity` before reading the diff.

## Task Commits

| # | Correction | Commit | What moved |
|---|-----------|--------|-----------|
| 1 | D-98 | `6f9c039` | Panel deleted from 9 call sites + component + its test; count retargeted onto the ten-render table |
| 2 | D-99 | `df2ba0d` | `PaidStatement` + the `& paid` heading + per-status proof in both directions |
| 3 | D-100 | `a9376ea` | Moment compacted to four items; closing sentence deleted; `BookingReference`'s orphaned `size` arm removed |
| 4 | D-101.1 | `5380b7a` | Indicator gated on `slow`; poller mechanics provably unmoved |
| 5 | D-101.2 | `2b404bf` | `WayBackLink` at `variant="outline"`, with paint asserted off the rendered element |
| 6 | record | `f5295aa` | D-98…D-101 into 13-CONTEXT (D-67/D-68 struck through in place); baseline debt into deferred-items |

## Watched Reds — observed, verbatim

**1 · D-98** — the retargeted gate, run against the shipped tree:

```
Tests  20 failed | 47 passed (67)

(9·confirmed) opens exactly the declared <dt> terms — a fifth is a defect whatever it says
AssertionError: expected [ 'Space', 'Where', 'When', …(8) ] to deeply equal
                         [ 'Space', 'Where', 'When', …(4) ]
+   "Your payment", +   "Host since", +   "Listing published", +   "Booking",

(10·cancelled (reversed)) renders no trust panel at all
AssertionError: expected …(1) to have a length of +0 but got 1
```

The diff is the proof the retarget is exact: the ONLY delta on the confirmed render is the four trust
rows, so the declared facts-panel set was right before a line of it was written.

**2 · D-99**:

```
Tests  5 failed | 9 passed | 67 skipped (81)

(11·confirmed)          expected [] to have a length of 1 but got +0
(11·completed (derived)) expected [] to have a length of 1 but got +0
(13) AssertionError: expected 'ConfirmedBooking confirmedThis time i…'
                     to contain 'Booking confirmed & paid'
```

**3 · D-100** — the compacted fixture against the un-compacted component:

```
Tests  15 failed (15)
TypeError: Cannot read properties of undefined (reading 'length')

tsc: TS2740: Type '{ paidStatement: Element; email: …; bookingMode: "instant"; }' is
missing the following properties from type 'ConfirmationMomentProps': arrivalLine,
addressLines, paidInFullSentence, reference, and 2 more.
```

**4 · D-101.1**:

```
(7) spins while the poller is running, and STOPS once it has given up
AssertionError: the spinner is still turning after the poller stopped. […]:
expected <svg …(11)><path …(1)></path></svg> to have a length of +0 but got 1
```

A positive control sits in front of it: case (7) asserts the indicator IS animating on arrival before
asserting it is not after the cap. *"Nothing spins after the cap"* is perfectly satisfied by a
component that never spins at all, or by a selector that stopped matching.

**5 · D-101.2** — component staged with the shipped `ghost` first, then flipped:

```
(1) paints as the neutral SECONDARY control, not as ghost prose
AssertionError: the checkout's way back is missing "border-border". […]:
expected [ Array(37) ] to include 'border-border'
```

## Deviations from Plan

### [Rule 1 — Bug in a test written this plan] The brand-token check produced a false positive on its first run

- **Found during:** D-101.2, on the first execution of `way-back-link.test.tsx`.
- **Issue:** case (2) asserted the way back carries none of `buttonVariants({ variant: "brand" })`'s
  tokens. That call returns the SHARED BASE plus the brand row, so it failed on `group/button` — a base
  utility every button in the product carries. The case was red for a reason that had nothing to do
  with the accent.
- **Fix:** the shared base is now derived as the intersection of two variants and subtracted, and
  `variantOnly("brand")` is asserted non-empty first so the loop cannot go vacuous.
- **Verification:** case (1)'s watched red re-observed in isolation afterwards — `1 failed | 5 passed`,
  and the one failure is the affordance itself.
- **Commit:** `2b404bf`

### [Rule 3 — Blocking] Four unused imports left by the removals

- `ReactNode` and `Separator` in three state components and the pending state; `Link` and `Button` in
  `listings/[id]/book/page.tsx` once the way back moved into its component. Lint warnings, removed in
  the commit that orphaned them. The reversed state KEEPS its `Separator` import: that separator is
  D-72's rule above the recovery block, not the panel's.
- **Commits:** `6f9c039`, `2b404bf`

### [Rule 2 — Missing critical] `BookingReference`'s `size` prop was orphaned by D-100

- **Found during:** D-100. `"moment"` had exactly one non-default caller — the confirmation moment —
  and D-100 removed the reference from that surface.
- **Why it is not "leave it alone":** a size variant NAMED AFTER a surface that no longer uses it is
  worse than no variant. The next author reads the name, believes there is a second presentation to
  keep in step, and has nothing to check it against.
- **Fix:** the prop is removed and the component fixed at `text-body`. Its test case (2) now asserts
  the property the prop existed to protect and which outlives it — the size is a NAMED role from the
  type scale, never an arbitrary step — with an added negative for `text-[…]` that a bare
  `toContain("text-body")` could not see.
- **Commit:** `a9376ea`

### Recorded, not fixed: `SupportPath`'s `trust-row` arm has no caller

`SupportPath`'s discriminated union keeps a `trust-row` arm whose only call site was inside the deleted
panel. It is left in place **deliberately**: `support-path.tsx` is the file that holds D-64's guarded
literal, `tests/design/site-contacts.test.ts` is the gate that must never be weakened, skipped,
inverted or edited, and editing that file to delete an unreachable union member is not a trade worth
making inside a UX correction. The `panel` arm is still live on the reversed state and on the pending
state past its escalation. Noted here so it is known rather than unnoticed; the natural time to remove
it is whenever `SUPPORT_EMAIL` is finally set and that file is opened for a real reason.

**Total deviations:** 3 auto-fixed (1 test bug, 1 blocking lint, 1 orphaned API) + 1 recorded and
deliberately not fixed. **Impact:** none on the four corrections; all four shipped as directed.

## Deferred Issues

### Four `checkout` visual baselines need regeneration on CI

D-101.2 is a deliberate visual change to a baselined surface. `checkout` is `kind: "document"`, so all
four PNGs move (`checkout-{320,1280}-{court,grove}-visual-linux.png`).

**Nothing else moves, and that was checked rather than assumed.** The snapshot directory holds sixteen
surface ids; every Phase-13 booking surface this plan touched (`booking-moment`, `booking-confirmed`,
`payment-pending`, `payment-reversed-*`, `booking-group`) is BLOCKED in
`src/lib/design/visual-baselines.ts` and has no baseline to break. `checkout` is the only baselined
surface this plan's diff can reach.

It is not done here because baselines are Linux-container artefacts minted by the `baselines.yml`
`workflow_dispatch` job, the phase's standing invariant is that no baseline is ever minted locally on
this machine, and this executor was instructed not to push. ⚠ **The comparison run is the deliverable,
never the generation run** (13-16's finding — `baselines.yml` emits `::warning::These baselines have
NOT been verified` about its own output). Full write-up in `deferred-items.md`.

### The e2e suite was not run

`npm test`, `npm run test:design` and `npm run build` are the gates this plan was given and all three
are green. The Playwright suites were not executed: they need a built server and a browser session this
executor did not have, and the visual project would report the four expected `checkout` diffs above in
any case. The specs most coupled to this plan's surfaces were read rather than run, and the coupling
checked by hand:

- `e2e/confirmation-decay.spec.ts` — asserts the moment's BOX (`min-h`, unchanged), the parameter
  consumption (untouched), and that **exactly one** element inside the moment animates. The compaction
  removed the reference and the policy; neither animated, so the count is still 1.
- `e2e/shell.spec.ts` — asserts the way back's label, target, uniqueness and hold promise. All four are
  preserved verbatim by `WayBackLink` and re-asserted in unit time by its cases (4) and (5). Its
  confirmed-branch `getByRole("heading", { level: 1, name: "Booking confirmed" })` still matches:
  Playwright's `name` option is substring-and-case-insensitive by default, and the heading is now
  `Booking confirmed & paid`.
- `e2e/search-and-book.spec.ts` — `getByText("Confirmed", { exact: true })` counts the status badge and
  is unaffected by the longer heading; `getByRole("heading", { name: /booking confirmed/i })` still
  matches.

## Verification

Run one at a time, per the phase's standing rule that `tests/global-setup.ts` TRUNCATEs every `public`
table in `fitout_test` on every run.

| Gate | Result |
|------|--------|
| `npm test` | **158 passed / 1 skipped (159 files) · 1570 passed / 4 skipped (1574)** |
| `npm run test:design` | **47 passed (47 files) · 808 passed / 3 skipped (811)** |
| `npm run build` | **exit 0** (runs `lint` → `test:design` → `next build`; full route table emitted) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` over every changed file | clean, 0 warnings |

### Invariants, each re-measured rather than carried forward

| Invariant | Evidence |
|-----------|----------|
| ZERO schema migrations (D-80 / GATE-06) | `drizzle/` still ends at `0025_audit_resolved_by.sql` |
| `tests/design/site-contacts.test.ts` never weakened (D-64) | `git diff --stat` over the whole plan range: **empty** |
| `tests/design/trust-signals.test.ts` intact and green | `git diff --stat` over the whole plan range: **empty**; runs green in the design suite |
| Zero packages added | `package.json` **and** `package-lock.json` byte-unchanged over the range |
| Zero `src/components/ui/**` edits | `git diff --name-only` over the range: **empty** |
| `src/inngest/` untouched — no send trigger moved (D-78) | `git diff --name-only` over the range: **empty** |
| `MoneyStatement` undisturbed (D-73 / D-94) | mounts on exactly the same four statuses; `detail-completeness` cases (6·…), (7) and (8) unchanged and green |
| No copy claims a charge while a request is pending (D-90) | `PaidStatement` mounts on `confirmed` + derived `completed` only, asserted as ZERO on the other eight |
| Only three refund windows (D-83) | no refund copy touched by this plan |
| `--destructive` renders nowhere | `paid-statement` case (6) and `way-back-link` case (2) both assert it; design suite green |
| Poller mechanics frozen (13-07) | filtered diff of `pending-payment-state.tsx` for `setInterval`/`clearInterval`/`useRef`/`routerRef`/`MAX_ATTEMPTS`/`POLL_INTERVAL_MS`/`setSlow`/`count +=`/`refresh()`/`useEffect`/`setTimeout`/`clearTimeout`/`setEscalated` → **zero lines** |

## Known Stubs

None. `PaidStatement` and `WayBackLink` are both fully wired to real server-computed values
(`totalLabel` through `formatMoney` in the RSC, `backHref` from the hold's own frozen instants); no
component created or modified by this plan receives hardcoded, empty or placeholder data, and no
"coming soon" / TODO / FIXME string was introduced.

## Threat Flags

None. This plan creates no network endpoint, no auth path, no file-access pattern and no schema change.
Both new components are pure presentational Server Components taking finished strings; the one
security-adjacent surface it touches — D-91's post-payment address boundary — is unchanged, and
`bookedListingAddress()` remains the single route to a booked listing's exact street.

## Next Phase Readiness

**Phase 13 remains EXECUTED, AWAITING HUMAN VERIFICATION.** This plan does not change that status: the
four manual-only walks (A–D) recorded in `13-16-SUMMARY.md` are still outstanding by operator decision,
and `SUPPORT_EMAIL` is still `null` at `src/lib/site.ts:70` — the phase's one `human_needed` item, one
line, untouched here.

**Two items this plan hands forward:**

1. **The `checkout` baseline regeneration** (above and in `deferred-items.md`). One `baselines.yml`
   dispatch after the branch is pushed, then read the next `ci` run's `gate-visual`.
2. **Walk A gains a second subject.** The manual-only hosted-checkout return walk now also verifies
   D-99 and D-100 on a real screen: does *Booking confirmed & paid* read as intended beside the badge,
   and does the compacted moment feel like a confirmation rather than a sparse page? Neither is
   answerable by an assertion, and both are exactly what the PM's UAT session found in the first place.

**One re-verification worth naming:** the pending state's new still-clock indicator has been asserted
in jsdom but never seen. Its walk is cheap — drive a checkout to `?paid=1` on a pending row and wait
twenty seconds — and it is the direct visual counterpart of the defect the PM reported.

## Self-Check: PASSED

**Files claimed created — all present on disk:**

- `src/components/booking/paid-statement.tsx` — FOUND
- `src/components/booking/way-back-link.tsx` — FOUND
- `tests/booking/paid-statement.test.tsx` — FOUND
- `tests/booking/way-back-link.test.tsx` — FOUND

**Files claimed deleted — absent from disk and recorded as deletions in `6f9c039`:**

- `src/components/booking/trust-block.tsx` — GONE
- `tests/booking/trust-block.test.tsx` — GONE

Both deletions are intentional and are the subject of D-98; `git diff --diff-filter=D` over the plan
range returns exactly these two and nothing else.

**Commits claimed — all present in `git log`:**

`6f9c039` · `df2ba0d` · `a9376ea` · `5380b7a` · `2b404bf` · `f5295aa` — FOUND

**Gates claimed — all re-run at the end of the plan, one at a time:** `npm test` 1570/4 · `npm run
test:design` 808/3 · `npm run build` exit 0.
