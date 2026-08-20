---
phase: 13-confirmation-bookings-trust
plan: 13
subsystem: testing
tags: [e2e, playwright, print-media, typography, glyph-metrics, money, parity, fixtures, open-capacity, probes]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "e2e/helpers/seed-payment-states.ts — the five-shape payment fixture this plan extends twice (a sixth shape, and an occupancy option), and the hoursOffset/teardown discipline both extensions had to obey"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "BookingReference and its `font-mono tabular-nums` decision — the thing tabular-figures.spec.ts measures, and whose own docblock already named the spec by filename"
  - phase: 13-confirmation-bookings-trust
    plan: 12
    provides: "/bookings/[id]/receipt, ReceiptLines and the FOURTH money hook (`receipt-total`), the print contract as Tailwind `print:` utilities, and the two handoffs this plan discharges — the per-head fixture gap and the 'scope the colour-adjust query to the article' correction"
  - phase: 12-booker-path-search-listing-checkout
    provides: "e2e/price-parity.spec.ts:212-334 — the bounded-poll hook guard, the centavo normaliser and the failure-message shape all three specs inherit; and booker-seed.ts's `occupancy: \"open_capacity\"` listing, which is what made the per-head gap closeable here"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "e2e/helpers/theme.ts (the pre-paint theme seam and its silent-no-op warning), e2e/reduced-motion.spec.ts (assert-emulation-applied + both-directions), selector-contract.ts's declared hooks"
provides:
  - "e2e/receipt-parity.spec.ts — DB-vs-DOM equality with the exactly-one-hook guard asserted BEFORE the read, D-76's refund proved to be its own row, and D-86's per-head unit proved by arithmetic against the frozen column"
  - "e2e/receipt-print.spec.ts — the repo's FIRST print-media spec: five falsifiable items in both themes, a screen-media twin for every suppression, and the browser's own accessibility tree as the rendering oracle"
  - "e2e/tabular-figures.spec.ts — the repo's first GLYPH-ADVANCE measurement, closing 13-RESEARCH Open Question 1 and Assumption A1 with pixel values in both themes"
  - "seed-payment-states.ts: a sixth shape (`cancelledRefunded` — the first row in e2e/ carrying a refund_cents) and an `openCapacity` option (the first seeded booking anywhere carrying open_capacity + declared_pax)"
  - "A MEASURED correction to a suppression idiom: computed `display` is an element's OWN value, so print-suppression must be measured with checkVisibility() + a null box, not with getComputedStyle"
affects: [13-14, 13-15, 13-16, 15, 17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Media emulation ASSERTED on the page (`matchMedia(\"print\").matches`) and the theme read back off `data-theme` — the two silent no-ops that make a both-directions spec green about nothing"
    - "`locator.ariaSnapshot()` as a print-media oracle: the record's PRESENCE and a control's ABSENCE read from one accessibility tree, so the two cannot be satisfied by two mechanisms agreeing"
    - "Text width measured with `Range.getBoundingClientRect()` rather than `boundingBox()`, with the element box asserted to AGREE — which turns 'the box hugs its text' from an assumption into a checked fact"
    - "A three-way discriminator instead of a pass/fail: the money pair measured WITH and WITHOUT `tabular-nums`, so an equal-width green cannot be mistaken for evidence about the OT table"
    - "A fixture OPTION rather than a seventh shape, when the varying thing is a property of the LISTING and not of the payment state"
    - "A positive-match branch is guarded from the DB side FIRST, because its failure mode is silence: a broken fixture and a broken route look identical on the page"
    - "A coverage claim asserted against the module that DECLARES the set (`THEMES` imported from theme-provider), never against a literal spelled in the same file — which would be a tautology"

key-files:
  created:
    - "e2e/receipt-parity.spec.ts"
    - "e2e/receipt-print.spec.ts"
    - "e2e/tabular-figures.spec.ts"
  modified:
    - "e2e/helpers/seed-payment-states.ts"
    - ".planning/phases/13-confirmation-bookings-trust/deferred-items.md"

key-decisions:
  - "A1 IS SETTLED AND ITS GOOD BRANCH IS LIVE: the money pair is 0px apart WITH tabular-nums and 42.7px (court) / 49.0px (grove) apart WITHOUT it. The Google-Fonts build of Geist ships a working tnum table, the utility is LOAD-BEARING across every money surface, and there is no Phase-17 finding to hand forward"
  - "13-12's per-head fixture gap is CLOSED here rather than handed to 13-15 — the ingredients already existed (booker-seed's open-capacity listing, PER_HEAD_PRICE_CENTS at ₱250.00 against a ₱1,000.00 frozen space cost, so declaredPax=4 is the one integer that matches), and 13-15-PLAN never picked the recommendation up"
  - "Print suppression is measured with `checkVisibility()` + a null box, NOT computed display — a first draft asserted display:none on the status pill and went RED on correct code, because computed display is an element's own value and the rule lives on the wrapper"
  - "The refund fixture is PARTIAL (₱787.50 against ₱1,050.00), because with a full refund 'the Total is the quote' and 'the Total is the refund' are the same assertion and a receipt printing one in the other's place would pass"
  - "The per-head assertion parses the rendered unit and pass count back out and MULTIPLIES them against booking.space_price_cents — matching an expected label string would encode the answer and would pass against a figure the route had divided its way to"
  - "The plan's `grep -ci 'PAYMONGO|sk_test|SECRET' → 0` criterion is UNSATISFIABLE on receipt-parity.spec.ts, because the same plan instructs the header to record the D-35 boundary. The satisfiable form measures the real property and returns 0 on all three specs"

patterns-established:
  - "Probe a suppression spec by removing ONE rule and watching which assertion names it — and probe the a11y-tree half separately by relaxing the computed-style half, or the first red masks the second assertion forever"
  - "When a probe makes a spec green that should be red, look at WHICH FIXTURE the assertion ran against: the netting bug is invisible on a confirmed receipt (refund 0) and only case (2) can see it"

requirements-completed: []  # See "Requirements" below — both IDs are ALREADY marked Complete in
# REQUIREMENTS.md by earlier plans, and TRUST-05 is still carried by 13-15 and 13-16. Nothing to mark.

# Metrics
duration: 53min
completed: 2026-08-21
---

# Phase 13 Plan 13: Three Proofs of the Receipt Summary

**The receipt's number proved equal to the database's on three different shapes, the print contract proved as a rendering fact in both themes with a screen-media control, and Open Question 1 closed with measured pixels — `tabular-nums` is doing 42–49px of real work on every money figure in the app.**

## Performance

- **Duration:** ~53 min
- **Started:** 2026-08-21T01:52Z
- **Completed:** 2026-08-21T02:45Z
- **Tasks:** 4 (3 planned + 1 Rule-2 addition)
- **Files:** 3 created, 2 modified

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 | `9179468` | `receipt-parity.spec.ts` + the sixth fixture shape (`cancelledRefunded`) |
| 2 | `2c48ad9` | `receipt-print.spec.ts` — the repo's first print-media spec |
| 3 | `593d971` | `tabular-figures.spec.ts` — the glyph-advance measurement |
| 4 | `746fa22` | D-86's per-head gap closed: an `openCapacity` fixture option + parity case (3) |

## What Shipped

### 1. `e2e/receipt-parity.spec.ts` — three money shapes, one hook, no secret

The exactly-one-hook guard runs **before** anything is read off the element, as a bounded poll returning a **count** with its own message — `price-parity.spec.ts`'s shape, for its stated reason: a locator auto-wait cannot distinguish "the hook is absent" from "the page is slow", and the receipt is the **fourth** money literal in a codebase that already had three.

Three cases, each proving something no existing spec could:

- **(1) confirmed** — `receipt-total`'s DOM text normalised back to integer centavos equals `booking.quoted_total_cents` read from Postgres. Overlaps `receipt-access.spec.ts` case (1) deliberately, and the header says so.
- **(2) refunded — entirely new.** No row anywhere in `e2e/` carried a `refund_cents` before this plan, so *"the refund is its own row, never netted into the Total"* (D-76) had never been rendered by a real request.
- **(3) open capacity — entirely new.** See § The gap that was closed.

**The environment boundary is honoured mechanically, not by intention.** All three fixtures are admitted by D-76's predicate on the row's **own columns**, above and independent of `probeCheckoutSession`. The consequence is asserted rather than assumed: the payment line degrades to `Booked` and never claims `Date paid`. If a future edit made this file's green depend on a provider answering, that assertion is where it breaks.

### 2. `e2e/receipt-print.spec.ts` — the repo's first print-media spec

13-PATTERNS § No Analog Found was right: nothing in `e2e/` had emulated print. All five falsifiable items from 13-UI-SPEC § The Print Contract, in **court and grove**, each with a screen-media twin in the same run.

Two silent-no-op guards make the both-directions structure mean something:

- `matchMedia("print").matches` is asserted on the page (`reduced-motion.spec.ts` trap 1 — emulation that did not apply produces a GREEN result against a page where nothing is under test);
- `data-theme` is read back off the document (`helpers/theme.ts`'s own warning — a seam that seeds a key the provider does not read would audit `court` twice and report full two-theme coverage, with **no other symptom**).

Assertion 2's accessibility half is `locator.ariaSnapshot()` — the browser's own tree for the receipt subtree. The reference and the total must be **in** it and the copy control must be **absent** from it, which is what makes it a measurement rather than a restatement of the computed style asserted three lines above. The tree was observed directly during a probe, and it is genuinely the printed rendering: with the button suppression removed, `Copy booking reference` appears in it; with the contract intact, it does not, while `text: Confirmed` (the print-only status word) does.

Assertion 4 is scoped to the article, taking 13-12's handoff (vendored Leaflet CSS ships the forcing declaration on `.leaflet-control` in `node_modules`, outside the subtree), and carries a **vacuity guard**: at least one element must report a value for the property before "zero exact" means anything.

The file also asserts its own coverage claim against `theme-provider.tsx`'s exported `THEMES`, not against a literal spelled in the same file — because the latter is a tautology and two-of-three coverage has no symptom.

### 3. `e2e/tabular-figures.spec.ts` — Open Question 1, closed with numbers

The repo measures box geometry; it had never measured the width of **text**. Width comes from a `Range` over the element's contents rather than from `boundingBox()`, because the reference is a `<p>` and **comparing two block boxes compares container widths and passes for any font on earth**. The element box is measured too and asserted to agree — which is how "the box hugs its text" became a checked fact instead of an assumption.

### 4. The gap that was closed rather than handed on

13-12 recorded that D-86's per-head line was *"implemented and reasoned"* but had **no seeded fixture**, and recommended a case in 13-15. **13-15-PLAN.md contains no mention of open capacity, per-head pricing, or a fixture for either** — the recommendation had landed nowhere.

It is closed here instead, because the ingredients already existed: `booker-seed.ts` has carried an `occupancy: "open_capacity"` listing since Phase 9, and its `PER_HEAD_PRICE_CENTS` (₱250.00) against this fixture's `SPACE_PRICE_CENTS` (₱1,000.00) makes **4** the one pass count that satisfies the positive match. What was missing was a booking fixture carrying `open_capacity` and `declared_pax`.

That arrived as an **option**, not a seventh shape — occupancy is a property of the **listing**, and a `pending` open-capacity hold reaches the same branch as an exclusive one. A shape would have put an open-capacity booking on whatever listing the caller passed, which for an exclusive listing means a per-head line that silently does not render.

**The assertion is parity, not a string match.** The rendered unit and pass count are parsed back out of the label and multiplied, and the product compared with `booking.space_price_cents` from Postgres — so a route that divided its way to a unit is caught rather than matched. And because a positive match's failure mode is **silence**, both halves are read from the database *before* the page is loaded: otherwise a broken fixture and a broken route are indistinguishable on screen.

## THE MEASUREMENT — Open Question 1 and Assumption A1, settled

Chromium (Playwright 1.60), 21 Aug 2026, both themes, on the live receipt route:

| theme | two equal-length references | money pair WITH `tabular-nums` | money pair WITHOUT |
|---|---|---|---|
| **court** | 115.203 / 115.203 → **0px** | 108.922 / 108.922 → **0px** | 75.266 / 117.984 → **42.719px** |
| **grove** | 122.406 / 122.406 → **0px** | 136.234 / 136.234 → **0px** | 97.719 / 146.766 → **49.047px** |

**A1's GOOD branch is live, in both themes.** The `next/font/google` build of Geist ships a **working `tnum` table**, and the utility is **load-bearing rather than decorative**: Geist Sans's default figures are strongly proportional — `1` is roughly half the advance of `0` — so a ten-character money string swings 42–49px between its narrowest and widest digits with `tabular-nums` off. Every money column in the app would be ragged without it, and a `tabular-nums` deleted "because it does nothing" would be a visible regression on the reserve page, the listing rail, the booking sheet and the receipt at once.

**There is no Phase-17 finding to hand forward from A1.** The assertion nevertheless stays, and its failure message still names Phase 17: what was measured once on one Chromium build is not a permanent property of a font pipeline.

**Why the pair is measured twice, and why a single green would have been the vacuity this phase keeps finding.** If Geist's default figures had already been tabular at the OS/2 level — which one of 13-RESEARCH's own sources claims — the pair would render equal *whether or not* `tnum` exists, and an equal-width green would have proved nothing about the table while reading as though it had. The `WITHOUT` column is what turns the result from "it passes" into a fact.

**And rule 1 is now measured, not argued.** With `font-mono` removed from the reference and **`tabular-nums` left in place**, two equal-length references laid out at **116.156px and 104.469px — an 11.69px spread**. Tabular figures normalised the digits and did nothing for the letters. That is exactly the argument 13-UI-SPEC § Typography rule 1 makes, now with a number attached.

## The Watched Reds — verbatim

Every proof written here was probed by breaking what it claims to catch. **Nine reds observed.** Every probe was restored from a **saved copy** (13-08's finding — never `git checkout --`), and every restore was confirmed by re-running green.

### A. The netting bug — and the trap it revealed

`receipt/page.tsx`'s `totalLabel={formatMoney(quoted, currency)}` → `formatMoney(quoted - refundCents, currency)`:

```
Error: THE REFUND WAS NETTED INTO THE TOTAL. The receipt for
e2e_parity_cancelledRefunded_5ea6de7b-… states 26250 centavos; booking.quoted_total_cents is 105000
and booking.refund_cents is 78750 — and 26250 is what subtracting one from the other gives. The Total
states what was CHARGED (it is the figure on the card statement); what came back is a separate
movement and D-76 gives it its own row below.

Expected: 105000
Received: 26250
```

**Case (1) stayed GREEN on that same run**, and that is the important half. On a `confirmed` receipt `refundCents` is `0`, so `quoted - 0 === quoted` and the netting bug is **invisible**. This phase's own warning — *a test can enforce the bug; check which fixture a money assertion actually runs against* — applied exactly: the parity assertion that existed before this plan could not have caught it, because no fixture in `e2e/` had a refund to net.

### B. The exactly-one-hook guard, and its position

A second `<dd data-testid="receipt-total">` added to `receipt-lines.tsx`:

```
Error: the confirmed receipt: the receipt rendered 2 elements carrying the receipt-total hook;
expected exactly 1. 0 means the hook was renamed or moved off the total — the GATE-05 regression this
spec exists for, and the equality below would then never run, leaving this gate green for no reason.
More than 1 means "the rendered total" is ambiguous and the parity read would silently parse whichever
came first in the DOM …

Expected: 1
Received: 2
    at expectExactlyOneHook (e2e\receipt-parity.spec.ts:125:7)
    at e2e\receipt-parity.spec.ts:174:5
```

The stack frame is the evidence that the guard runs **before** the equality: line 174 is the guard call, and the equality at line 209 never executed.

### C. A one-centavo drift between the row and the document

An `UPDATE booking SET quoted_total_cents = quoted_total_cents + 1` after the page had rendered:

```
Error: RECEIPT PARITY BROKEN. The receipt for booking e2e_parity_confirmed_3428c2eb-… states 105000
centavos; booking.quoted_total_cents is 105001. The rendered figure is what a booker holds beside a
bank statement and the frozen column is what PayMongo charged — a difference here is a wrong number on
a real card, not a display bug. …

Expected: 105001
Received: 105000
```

### D. `print:hidden` removed from `site-footer.tsx`

```
Error: court: the site footer in print media — it carries the legal and support links, and a page of
them prints after every receipt is still RENDERED in print media. Whatever computed style says, the
browser's own visibility answer is what lands on paper.

Expected: false
Received: true
```

### E. The closed set narrowed — and the a11y tree probed separately

`print:[&_button]:hidden print:[&_a]:hidden` → `print:[&_a]:hidden`:

```
Error: court: 1 of 1 controls inside the receipt still render in print media. The suppression is
written as a CLOSED SET on the article (print:[&_button]:hidden print:[&_a]:hidden) precisely so a
control added later is caught by it — a non-zero count here means something escaped that set, or the
set was narrowed. A button on paper is a rectangle of ink that does nothing.

Expected: 0
Received: 1
```

That red **masks** the accessibility-tree assertion, which never runs. So the count assertion was relaxed for one further run, with the suppression still removed:

```
Error: court: the copy control is still in the accessibility tree under print media, even though its
computed display is none. …
Expected substring: not "Copy booking reference"
Received string:    "- article:
  - heading \"Receipt\" [level=1]
  - paragraph: This is a booking record for your own reference. It isn't an official receipt.
  - text: Confirmed
  - term: Space
  - definition: E2E Receipt Print Gym 9aa7f541 Martial arts / boxing gym
  - term: Address
  - definition: 2 Real Street Poblacion, Makati, Metro Manila 1210
  - term: When
  - definition: Friday, Aug 21, 12:09 PM – 1:09 PM (Makati time)
  …
```

Worth keeping for two reasons beyond the red: it shows `ariaSnapshot()` **is** the print rendering (the status **word** is in the tree and the badge is not), and it is the direct evidence that the tree assertion discriminates rather than matching a long string.

### F. Forced colour reproduction

Injected at runtime with `addStyleTag` — no source change, so the query is probed without touching a file the design gates scan:

```
Error: court: 12 elements inside the receipt force exact colour reproduction. The contract's "Never"
row: forcing it costs the booker ink and buys nothing on a document whose job is to be legible as ink
on white.
Expected: 0
Received: 12
```

### G/H. `font-mono` removed from `BookingReference` — both (a) and (b)

```
Error: court: the reference renders in Geist, "Geist Fallback"; --font-mono declares "Geist Mono",
"Geist Mono Fallback". …
- Expected  - 2      + Received  + 2
-   "geist mono",     +   "geist",
-   "geist mono fallback",  +   "geist fallback",
```

and, with (a) relaxed so (b) could be reached — **the measurement that turns rule 1 from a preference into a decision**:

```
Error: court: TWO EQUAL-LENGTH REFERENCES DO NOT LINE UP. "FIT-QNHSMAZK" laid out at 116.15625px and
"FIT-3FF6AF69" at 104.46875px — a spread of 11.6875px. …
Expected: <= 0.05
Received:    11.6875
```

### I. (c) pointed at non-tabular figures

```
Error: court: A1's BAD BRANCH IS LIVE — AND THIS IS A FINDING FOR PHASE 17, NOT A DEFECT IN THIS
PHASE'S WORK. "₱11,111.11" rendered at 75.265625px and "₱00,000.00" at 117.984375px in the money
surfaces' own treatment — a spread of 42.71875px, where equal width is what tabular figures mean. The
same pair with font-variant-numeric forced to normal spread 42.71875px, so the utility is changing
NOTHING. …
```

### J/K. D-86, both failure modes

The **rejected division** (`Math.round(quoted / declaredPax)` as the unit — what D-86's positive match exists to prevent):

```
Error: PER-HEAD PARITY BROKEN. The receipt states "₱262.50/person × 4 passes" — 26250 centavos × 4
passes = 105000 — while booking.space_price_cents is 100000. The unit line's whole justification is
that it is a TRUE decomposition of the frozen charge (D-86); a product that does not equal it is a
per-person figure nobody was charged, printed on a document a booker may hold beside a bank statement.

Expected: 100000
Received: 105000
```

`₱262.50/person` is entirely plausible on the page. Nothing about it looks wrong.

And the **silence** mode (`bk.openCapacity === true` → `=== false`):

```
Error: no per-head line on the receipt for open-capacity booking e2e_parity_oc_confirmed_084b7dbe-…,
whose listing prices per head at 25000 and whose 4 passes multiply exactly to the frozen space cost
100000. D-86's positive match should therefore be TRUE. Its failure mode is silence: the line simply
does not render, and every other figure on the document stays correct — which is why this assertion
exists rather than a review.

Expected: 1   Received: 0
```

## A measured correction to this plan's own first draft

**The print spec's first draft asserted `getComputedStyle(pill).display === "none"` and went RED on correct code**, reporting `inline-flex`.

The cause is not the contract: **computed `display` is an element's OWN value.** An element inside a `display: none` ancestor is not rendered at all and still computes whatever its own rules say. `receipt/page.tsx` puts `print:hidden` on the `<span>` **wrapping** the badge (the badge is a shared component, and DS-11 keeps its box out of a call site's hands), so the pill genuinely does not print while reporting `inline-flex` forever.

This is 13-11's finding — *a plan's stated measurement can be wrong; if a measurement is red on correct code, the measurement is the defect* — and the fix was to the measurement. Suppression is now `checkVisibility()` (the browser's own answer, which accounts for ancestors) **plus** a null bounding box (Playwright's independent answer), with the reason written at the helper.

**The dangerous direction is the mirror image**, and it is recorded in the file: had the contract put the rule on a wrapper for the header too, the computed-display assertion would have gone **green for the wrong reason** on any element whose own rule happened to say `none` — and the spec would have been measuring *where a class is written* rather than *whether anything prints*. Computed display is still asserted on the header and the footer, where the contract names those two elements by name; it now sits beside the rendering assertion rather than standing in for it.

## Deviations from Plan

### Auto-added

**1. [Rule 3 — Blocking] `seed-payment-states.ts` gained a sixth shape, `cancelledRefunded`**

- **Found during:** Task 1. The plan asks for *"seed a cancelled-with-refund booking"*; no such shape existed and no row anywhere in `e2e/` carried a `refund_cents`.
- **Fix:** a sixth shape through the module's **one INSERT column list**, rather than a bespoke INSERT in the spec — which is the property that module's header argues for at length. `payment_id`/`payment_method` populated and `cancelled_by='booker'`, i.e. the mirror image of the reversed shape, with the difference written into the header. `REFUND_CENTS` is exported with the reason its value was chosen.
- **Sanctioned by** the plan's own `files_modified`, which lists the helper.
- **Commit:** `9179468`

**2. [Rule 2 — Missing critical functionality] D-86's per-head line had no request-level proof**

- **Found during:** Task 4 (added). The plan's brief asked for this gap to be *closed if within the tasks, or handed on explicitly in writing*. It turned out to be closeable in ~30 lines because `booker-seed.ts` already seeds open-capacity listings, so closing it was strictly better than a handoff.
- **Fix:** an `openCapacity` option on the fixture and `receipt-parity.spec.ts` case (3). Both failure modes watched red.
- **Commit:** `746fa22`

**3. [Rule 2 — Missing] Vacuity guards the plan did not name**

Added because each assertion is otherwise satisfied by nothing existing:

| Guard | Without it |
|---|---|
| the two references must be **different** and the **same length** | comparing one string's width to itself is equal in every font ever made |
| `--font-mono` must differ from `--font-sans` | "the reference is mono" is satisfied by the body font |
| at least one element must report a colour-adjust value | the ban is green against a property the engine did not understand |
| the receipt must render **> 0** controls | "every button is hidden" is vacuously true of a receipt with no buttons |
| the reference's box must **agree with** its text width | a block box comparison passes for any font |
| the money probe must lay out at **> 0** width | both spreads are zero and every conclusion is drawn from a measurement that did not happen |
| the refund figure must differ from the total, and must not carry the money hook | "its own row" is indistinguishable from "the total repeated" |
| the fixture's positive match is checked from the **DB** before the page loads | a broken fixture and a broken route look identical |

**4. [Rule 3] The theme-coverage assertion was a tautology in its first draft**

Written as `expect(THEMES).toEqual(["court","grove"])` with `THEMES` declared in the same file — a literal compared to itself. Rewritten to import `THEMES` from `theme-provider.tsx`, so the assertion is live: a third theme makes it red.

## Grep / prose collisions — the eighteenth

| Plan's grep | Read | Cause | Closed by |
|---|---|---|---|
| `grep -ci 'PAYMONGO\|sk_test\|SECRET' e2e/receipt-parity.spec.ts` → 0 | **5** | The same task instructs the header to *"Record that boundary in the spec header, citing D-35"*. **You cannot document that a spec needs no PayMongo secret without writing the words.** The criterion is unsatisfiable by any file that obeys the instruction beside it | Recorded here with the **satisfiable form**, which measures the property the criterion was reaching for — *does this spec read a secret or reach the provider* — rather than whether it says so in English |

**The satisfiable form, and what it returns on all three specs:**

```
grep -cE 'process\.env|PAYMONGO_|sk_(test|live)_|api\.paymongo\.com' <spec>
```

| Spec | plan's literal grep | satisfiable form |
|---|---|---|
| `receipt-parity.spec.ts` | 5 (all prose: 4 comments + 1 failure message) | **0** |
| `receipt-print.spec.ts` | **0** | **0** |
| `tabular-figures.spec.ts` | **0** | **0** |

It matches an env read, an env var name, a key literal and the API host — every way a spec could actually leave D-35's boundary — and does not collide with prose that says "PayMongo" or "secret" in English. The five prose hits in `receipt-parity.spec.ts` are named individually above so a reader can check them rather than trust this table.

## Verification, as run

| Gate | Result |
|---|---|
| `npx playwright test` (the three new specs) | **8 passed** |
| `npx playwright test --list` | **155 tests in 28 files**; the three new specs listed; `git diff HEAD~4 HEAD` changes **no** `test(` or `test.describe(` title line in any existing file |
| regression on the changed helper's other consumers (`shell.spec.ts`, `receipt-access.spec.ts`, `open-capacity.spec.ts`) | **33 passed / 1 skipped** |
| `npm test` | **1507 passed / 4 skipped** (156 files) — identical to 13-12's baseline |
| `npm run test:design` | **790 passed / 3 skipped** (46 files) |
| `npm run build` (lint + design + `next build`) | **exit 0**; 14 lint warnings, **0 errors**, none in any file this plan created or modified |
| `npx tsc --noEmit` | exit 0 |
| `git diff --stat HEAD~4 HEAD -- drizzle/ package.json package-lock.json src/ tests/` | **empty — all five byte-unchanged** |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| Deletion audit, all four commits | **zero files deleted** |
| Fixture teardown after every run, including the nine failed ones | `SELECT count(*)` over `e2e_parity%` / `e2e_print%` / `e2e_tabular%` bookings and the three seeded listings → **0 / 0** |

### Task acceptance criteria

| Criterion | Result |
|---|---|
| T1 · both parity cases pass | ✅ (three, with case 3 added) |
| T1 · watched red on a 1-centavo drift naming both numbers | ✅ — red **C** above |
| T1 · the hook guard runs before the equality, with its own message | ✅ — proved by red **B**'s stack frame |
| T2 · five assertions in both themes + the screen control | ✅ |
| T2 · watched red on `site-footer.tsx`'s `print:hidden` naming the footer | ✅ — red **D** |
| T2 · `grep -c 'emulateMedia'` ≥ 2 | **4** |
| T3 · (a) and (b) pass in both themes | ✅ |
| T3 · (c)'s outcome recorded with two measured widths in px | ✅ — the table above, four pairs across two themes |
| T3 · `grep -c 'Phase 17'` ≥ 1 | **1** |
| All three · `grep -ci 'PAYMONGO…'` → 0 | **collision on one file** — see above; satisfiable form returns 0 on all three |

## Threat Model Disposition

| Threat | Disposition | Evidence |
|---|---|---|
| **T-13-13-SECRETLEAK** (Information Disclosure) | **mitigated** | Zero `process.env`, zero env-var names, zero key literals, zero provider hosts across all three specs. Every fixture is admitted by the row's own columns, so no case depends on a probe answering — and the `Booked`/`Date paid` assertion is the tripwire if that ever changes |
| **T-13-13-HOOKAMBIGUITY** (Tampering) | **mitigated and PROVED** | The guard runs first, with its own message naming the count; red **B**'s stack frame is the proof that the equality never executed |
| **T-13-13-VACUOUSSPEC** (Repudiation) | **mitigated and PROVED** | Nine watched reds. Parity failed by a 1-centavo drift, by a netting bug and by a duplicated hook; print failed by removing one rule, with a screen-media twin for every suppression and `matchMedia` asserted on the page; the per-head line failed both ways it can fail |
| **T-13-13-A1SILENT** (Repudiation) | **mitigated and CLOSED** | Measured in both themes, with and without the utility, and recorded with pixel values. The good branch is live; nothing is handed forward |
| **T-13-13-SC** (supply chain) | **discharged trivially** | Zero packages installed; `package.json` and `package-lock.json` byte-unchanged |

## Threat Flags

None. This plan adds no network endpoint, no auth path, no schema change and no `src/` code at all. Every file it created is a Playwright spec; the one non-spec file it modified is an `e2e/` fixture whose every value goes through postgres.js's tagged template.

## Known Stubs

None.

## Requirements

**Neither ID was marked, and neither needs to be.** `requirements.mark-complete` was **not** run:

- `REQUIREMENTS.md` already carries **TRUST-02** and **TRUST-05** as `[x]` / `Complete`, marked by an earlier plan. Re-running the command would be a no-op.
- **TRUST-05** is still carried by `13-15` and `13-16`, so it is not this plan's to close in any case.

⚠ **One observation for the phase verifier, not acted on here.** TRUST-02 reads *"…and carried in the email subject line"*, and no email module exists — D-78 puts that half in **Phase 15**. It is nevertheless already ticked. That is an overstatement made before this plan and un-ticking a box another plan checked is not a unilateral call this executor should take; it is recorded so the phase close-out can decide.

## Deferred / For Later Plans

1. **The manual print check still stands** (13-VALIDATION, deferred by 13-12 to **13-16**). `emulateMedia` proves the stylesheet applies; it does not paginate, rasterise, know the printer's margins, or see contrast. Print to PDF in **both themes** and confirm no solid flood and that the reference and the total are readable. This plan makes that check cheap by guaranteeing everything mechanical about it first — what is left is genuinely a human looking at paper.
2. **13-RESEARCH A4 still needs one baseline run** (13-12's item 2, **13-15**'s). All 52 GATE-VRT screen baselines should be byte-identical after 13-12's `print:` edits. Linux-container-only (D-27/D-29) and not runnable on this machine.
3. **The per-head line's PRINT behaviour is not asserted.** `receipt-print.spec.ts` drives the exclusive `confirmed` fixture, so the extra `<dd>` the open-capacity itemisation adds is not among the rows measured for a non-zero box under print media. It is inside the `print:break-inside-avoid` block with its siblings and carries no rule of its own, so there is no mechanism by which it could behave differently — recorded because "no mechanism" is a reason, not a measurement.
4. **13-12's open-capacity recommendation to 13-15 is CLOSED**, and `deferred-items.md` now says so under a `## Resolved` heading — written there because a reader who finds the recommendation in `13-12-SUMMARY.md` would otherwise go looking for work that is already done.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `e2e/receipt-parity.spec.ts` — FOUND
- `e2e/receipt-print.spec.ts` — FOUND
- `e2e/tabular-figures.spec.ts` — FOUND
- `e2e/helpers/seed-payment-states.ts` — FOUND
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — FOUND

Commits claimed, verified in `git log`:

- `9179468` — FOUND
- `2c48ad9` — FOUND
- `593d971` — FOUND
- `746fa22` — FOUND
