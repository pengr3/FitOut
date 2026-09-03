---
phase: 13-confirmation-bookings-trust
plan: 12
subsystem: ui
tags: [receipt, print, money, idor, information-disclosure, design-system, closed-set, probe, e2e, pinned-counts]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "BOOKING_SHELL (the route's screen measure, mechanical rather than copied) and e2e/helpers/seed-payment-states.ts — whose `confirmed` shape its own header already calls *the receipt and booking-detail fixture*"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "BookingReference (mounted, never re-derived) and the rule that a selector row ships in the SAME commit as its literal — obeyed twice here, and proved by a watched red the second time"
  - phase: 13-confirmation-bookings-trust
    plan: 03
    provides: "probeCheckoutSession + readPaymentState (D-85's real paid_at and the reversal discriminator, from ONE call) and RAIL_DISPLAY_NAME, whose docblock was written for this surface"
  - phase: 13-confirmation-bookings-trust
    plan: 09
    provides: "bookedListingAddress() — the ONE route to a booked listing's street; the receipt adds no eleventh rule to its ten renders"
  - phase: 13-confirmation-bookings-trust
    plan: 10
    provides: "the T-13-10-NFORACLE idiom (compare the two answers to EACH OTHER, not to 404) and the positive-match itemisation this route repeats"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "PanelCard, PanelSkeleton, and selector-contract.ts's bidirectional inventory"
provides:
  - "/bookings/[id]/receipt — the phase's ONE net-new route, screen and print, with the browser's own dialog as the entire PDF pipeline (D-74)"
  - "ReceiptLines — the fourth money hook (`receipt-total`), zero arithmetic, a refund that never nets into the Total"
  - "D-76's availability predicate, in two steps, with step 2 FAILING CLOSED — a narrowing this plan chose over the detail page's behaviour, and recorded"
  - "tests/design/receipt-formality.test.ts — six banned tokens in the two-piece idiom plus the positive half that makes the ban mean something"
  - "e2e/receipt-access.spec.ts — DB-vs-DOM parity, the unpaid-hold 404, and the IDOR sameness proof on the phase's highest-value payload"
  - "The print contract as Tailwind `print:` utilities only; globals.css, drizzle/, package.json and src/components/ui/ all byte-unchanged"
  - "loading-coverage.test.ts re-measured 28/20/8 → 29/21/8, one constant at a time, in the same commit as the route"
affects: [13-13, 13-14, 13-15, 13-16, 15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Print suppression written as a CLOSED SET on the container (`print:[&_button]:hidden print:[&_a]:hidden`) rather than as a class per control — the phase's own lesson that a ban list cannot catch the item nobody thought of, and verified in the EMITTED CSS rather than assumed"
    - "A design-system property expressed in the file that OWNS the box (PanelCard's print flattening) rather than at the call site, because the component deliberately takes no className and DS-11 forbids a call site re-deciding its appearance"
    - "A gating predicate that FAILS CLOSED on a money surface where a sibling surface fails open — because the sibling has conditional copy and a table of amounts has no such register"
    - "A paired prop typed as a UNION (`refundLabel` + `refundKind`) so an amount can never arrive without the word that says what happened to it; the compiler refused the first draft's spread, which is the refusal being live"
    - "A closed-set walk over ten renders PLUS a bespoke row that the walk structurally cannot reach — because the walk alone stayed green against a predicate replaced by `true`"

key-files:
  created:
    - "src/app/(app)/bookings/[id]/receipt/page.tsx"
    - "src/app/(app)/bookings/[id]/receipt/loading.tsx"
    - "src/components/booking/receipt-lines.tsx"
    - "tests/booking/receipt-lines.test.tsx"
    - "tests/design/receipt-formality.test.ts"
    - "e2e/receipt-access.spec.ts"
  modified:
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/components/patterns/site-chrome.tsx"
    - "src/components/patterns/site-footer.tsx"
    - "src/components/patterns/panel-card.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/loading-coverage.test.ts"
    - "tests/booking/detail-completeness.test.tsx"

decisions:
  - "D-76's step 2 FAILS CLOSED on the receipt where `bookings/[id]/page.tsx` fails open: a silent probe means no receipt, not a receipt carrying an unverified figure"
  - "The receipt's `<h1>` is `text-heading`, not Display — 13-UI-SPEC assigns the focal point to the Total, and `type-scale.test.ts` caught the first draft"
  - "`print:shadow-none` was REMOVED from the print contract's application to PanelCard: the component is flat at rest by its own rule, so the utility was inert and `elevation-z.test.ts`'s pin was right to fire"
  - "The receipt's cancelled/reversed renders take the PUBLIC address projection, because D-91 grants the exact street to booked statuses only and this document is printable"
  - "The reversed branch of the detail page gets NO `View receipt` entry: the route admits that shape only on a confirmed probe, and an entry from the row signature alone would be offered where the receipt may not exist"

metrics:
  duration: "47 minutes"
  completed: 2026-08-21
  tasks: 3
  commits: 3
  files_changed: 13
  lines: "+1872 / -14"
---

# Phase 13 Plan 12: The Booking Receipt Summary

`/bookings/[id]/receipt` — an itemised, owner-gated booking record designed for a screen and for paper, with the browser's own print dialog as the entire PDF pipeline, refusing to exist for any booking whose money never moved.

## What Shipped

**The phase's one net-new route, and it is the only surface in the product designed for two media.** No PDF library, no headless render service, no font pipeline — D-74 makes "Save as PDF" the deliverable, and zero packages were installed. The screen half and the print half are the same tree; the difference is Tailwind `print:` utilities, which compile to `@media print` and nothing else.

**The money is the database's, proved rather than inspected.** `e2e/receipt-access.spec.ts` reads `receipt-total`'s DOM text, normalises it back to integer centavos and compares it with `booking.quoted_total_cents` **read back from Postgres** — the `price-parity.spec.ts` idiom, for its stated reason (formatting the DB value and string-comparing would turn a locale change into a red on a money gate). The receipt is the fourth money hook, a sibling literal beside `price-total` / `rail-price-total` / `sheet-price-total`, because `price-breakdown.tsx:363-380` records what a shared id costs: *"with two matches it would silently parse whichever came first in the DOM."*

**D-76's predicate is two steps, and the second one fails closed — which is a narrowing this plan chose.** The row's own columns are free and settle every unpaid hold with no I/O at all; only the reversal shape pays for the probe. `bookings/[id]/page.tsx` renders its reversed branch even when the probe learns nothing, and it is right to: D-96 gave it copy whose every sentence is conditional on a charge. A receipt has no such register — it is a table of amounts, and every figure on it asserts that money moved. So when the probe is silent the document does not exist. The cost is named in the file: a reversed booking has no receipt on a machine with no PayMongo key.

**Nothing on the page implies an official receipt, and that is now a test rather than a review comment.** `receipt-formality.test.ts` bans six tokens in the two-piece idiom, case-sensitively — and the case-sensitivity is load-bearing, because the receipt's whole promise is the sentence *"It isn't an official receipt"*. You cannot deny a thing without naming it, so a case-insensitive rule would be unsatisfiable by any working receipt. The positive half requires that sentence to be present, and a third assertion requires that it is not inside an element hidden from either medium.

## Task-by-Task

| Task | Commit | What |
|---|---|---|
| 1 | `79d5b5d` | `ReceiptLines` + 8 cases + the `receipt-total` selector row |
| 2 | `57cf306` | the route, its gate, its skeleton, the formality gate, the re-measured pins, the e2e proof |
| 3 | `b702882` | the print contract, and `View receipt` on the detail page |

## The Verification, As Run

| Check | Result |
|---|---|
| `npm test` | **1507 passed / 4 skipped / 0 failed** (156 files) |
| `npm run build` (lint + `test:design` + `next build`) | **exit 0**; design suite **789 passed / 3 skipped** |
| `npx tsc --noEmit` | exit 0 |
| `npx playwright test e2e/receipt-access.spec.ts e2e/shell.spec.ts` | **27 passed / 1 skipped** |
| `git diff --stat src/app/globals.css package.json package-lock.json drizzle/ src/components/ui/` | **empty — all five byte-unchanged** |
| `drizzle/` | still ends at `0025_audit_resolved_by.sql` (D-80 / GATE-06) |
| Deletion audit, all three commits | **zero files deleted** |
| Stub scan over the touched `src/` files | clean — every hit is pre-existing prose in `site-footer.tsx` and `panel-card.tsx` regions this plan did not edit |

### A3 settled by a real build, not by reasoning

13-RESEARCH flagged placing `/bookings/[id]/receipt` inside the `(app)` group as *"a `next build` question, not a reasoning question"*. The observed route table row, verbatim:

```
├ ƒ /bookings/[id]/receipt
```

One row, `ƒ Dynamic`, no ambiguity warning, and `/bookings` still declared in exactly one route group. **A3 is CLOSED.**

### The behavioural proof, as run

`e2e/receipt-access.spec.ts`, three cases, all passing, against 13-01's seed helper:

- **(a) the owner sees it** — `receipt` resolves to 1 element; `receipt-total` resolves to exactly 1; its text normalises to the same integer the database holds. The same case asserts D-85 (`Booked`, never `Date paid`) and D-75 (the disclosure sentence rendered in screen media).
- **(b) a foreign booking and a missing one are one answer** — a **different** signed-in booker requests the owner's `confirmed` id and a well-formed UUID that names nothing. The two status codes are asserted equal **to each other** (both 200 — the layout streams a Suspense shell before the gate raises, exactly as 13-10 measured), the `empty-state` panel's `innerHTML` is byte-identical, and neither response carries the venue, the amount or a `FIT-` reference. Guard-the-guard: the compared markup is asserted non-trivial and asserted to be the not-found copy.
- **(c) an unpaid hold 404s** — the owner, signed in, requesting their own live `pending` hold's receipt URL: zero `receipt` elements, one `empty-state`.

### Acceptance greps

| Grep | Result |
|---|---|
| `grep -c 'receipt-total' src/components/booking/receipt-lines.tsx` | **1** |
| `grep -rl 'data-testid="receipt-total"' src/` | **1 file** |
| `grep -ciE 'attendee\|roster' src/components/booking/receipt-lines.tsx` | **0** |
| `grep -c 'from "@/components/ui/card"' src/components/booking/receipt-lines.tsx` | **0** |
| `grep -c '<main' …/receipt/loading.tsx` | **0** |
| `grep -rl 'print-color-adjust' src/` | **0 files** |
| `grep -c 'print:hidden'` on `site-chrome.tsx` / `site-footer.tsx` | **1 / 2** |
| `grep -c 'print:break-inside-avoid'` across the route + `receipt-lines.tsx` | **4** (all in the itemisation) |
| `grep -c 'View receipt' …/bookings/[id]/page.tsx` | **1** (one literal, two render sites) |

## The Watched Reds — verbatim

Eleven reds were observed. Every deliberate probe was restored from a **saved copy**, never with `git checkout` (13-08's finding), and each restore was confirmed by re-running the suite green.

### 1. THE MOST IMPORTANT ONE — a test that could not fail

Case (16) walks all ten declared detail renders and asserts `View receipt` appears on exactly the three money-moved ones. With the page's predicate replaced by a bare `const moneyMoved = true;`:

```
 Test Files  1 passed (1)
      Tests  44 passed (44)
```

**Green.** The reason is structural rather than accidental: of the ten declared renders, only two reach a site that renders the entry at all — the confirmed branch and the *generic* cancelled landing — and the one declared cancelled row that reaches the generic landing carries `refundCents: 100_000`, so it qualifies under the real predicate and the broken one alike. Case (16) measures **branch placement** and nothing else.

The phase's own warning applied to it exactly: *a test can enforce the bug — check which fixture a money assertion actually runs against.* Case **(17)** was added: the same generic cancelled branch, driven with `refundCents: null, paymentId: null` — the swept, never-paid hold `page.tsx`'s own comment names. With the predicate still `true`:

```
 FAIL  tests/booking/detail-completeness.test.tsx > TRUST-05 — the receipt entry appears on the
       money-moved renders and on no other > (17) withholds it from a cancelled row nobody ever paid
       for — the branch's OTHER reading
AssertionError: a swept, never-paid hold was offered a receipt. The route 404s it (D-76) with the same
bare answer a stranger's booking gets, so this link sends a booker who was never charged to the
not-found copy about their OWN booking. This is the assertion case (16) cannot make: with the predicate
replaced by `true`, that case stays green and this one does not.: expected 'CancelledThis booking was
cancelledTh…' not to contain 'View receipt'

      Tests  1 failed | 44 passed (45)
```

Restored → **45 passed**. Both cases are kept: (16) is the closed-set walk, (17) is the one that can fail.

### 2. The design gates that fired on genuinely wrong code

**`type-scale.test.ts` — the receipt's `<h1>` was Display and should not have been.**

```
AssertionError: expected { …(12) } to deeply equal { …(11) }
+   "src/app/(app)/bookings/[id]/receipt/page.tsx": 1,
```

13-UI-SPEC assigns Display to the confirmation moment's heading and to the detail page's; § Visual Hierarchy puts the receipt's one focal point on **the itemisation and its Total**. The heading became `text-heading` and the Display inventory is **unchanged at 14/11**. `TOTAL_VALUE_CLASS` lost its `font-semibold` in the same pass — the named role already carries a weight per theme (600 court / 700 grove) and a weight utility beside it pins both to 600.

**`elevation-z.test.ts` — `print:shadow-none` was inert.**

```
AssertionError: expected { …(4) } to deeply equal { …(3) }
+   "src/components/patterns/panel-card.tsx": 1,
```

The five existing `shadow-none` sites all live in vendored `ui/` files. `panel-card.tsx`'s own header states, at length, that a panel is flat at rest and that there is no `shadow-` utility in the file and must not be one — so removing a shadow that cannot exist documents nothing. **The class was deleted rather than the number moved.** The print contract's other two utilities stayed.

**`selector-contract.test.ts` — the bidirectional gate, exactly as 13-09 and 13-11 recorded:**

```
AssertionError: the ids declared and the ids rendered are not the same set. Declared-but-absent: [none].
Rendered-but-undeclared: [receipt].
```

Closed by adding the row in the same commit as the literal. `receipt-total`'s row had already been moved a task earlier for the same reason, which is why no red was needed there.

### 3. The pinned counts, measured one constant at a time

Not written down from the plan — the run was made to say so:

```
AssertionError: the number of page.tsx files under src/app changed. … expected 29 to be 28
AssertionError: the routes that qualify changed. … expected 21 to be 20
Tests  15 passed (15)
```

The third line is the measurement of `EXPECTED_NON_QUALIFYING`: the suite went green with that constant untouched, which is the only way to establish that a count did **not** move. **29 / 21 / 8**, moved in the same commit as the route (D-88.3).

### 4. `receipt-formality.test.ts`, both probes

**(a) The ban.** The taxpayer-identification field added to the route as a `<dt>`:

```
AssertionError: the receipt spells a token that implies official status (D-75). It must not appear in
this file AT ALL, comments included: a scan that matches its own prohibition is not a guard, and the
token would then live in the repository as a copy-pasteable literal.: expected [ Array(1) ] to deeply
equal []
+   "src/app/(app)/bookings/[id]/receipt/page.tsx — a taxpayer-identification field belongs to a
+    registered document. Printing one — even blank, even as a placeholder — asserts that this record
+    participates in a tax filing, which is exactly the business decision that has not been taken.",
```

The failure names the file and the reason **without printing the token** — the same discipline the scanned files keep, and why `why` is a mandatory field.

**(b) Vacuity.** The route's declared path re-pointed at `src/app/nowhere-at-all/page.tsx` — **5 failed / 2 passed**:

```
AssertionError: the scanner opened 1 of 2 declared receipt files (missing:
src/app/nowhere-at-all/page.tsx). Every absence asserted above is green against a scan that read nothing.
```

### 5. `receipt-lines.test.tsx` — the RED, and the D-83 probe

The TDD red was the module's absence (`Failed to resolve import "@/components/booking/receipt-lines"`, *no tests* collected). The behavioural probe is the one worth keeping: `refundKind === "manual" ? "Returned by hand" : "Refunded"` replaced with a bare `"Refunded"` —

```
 FAIL  tests/booking/receipt-lines.test.tsx > (4) the by-hand branch says `Returned by hand` and no
       form of the automatic word (D-83)
TestingLibraryElementError: Unable to find an element with the text: Returned by hand.
      Tests  1 failed | 7 passed (8)
```

Restored → 8 passed.

### 6. The e2e trap — the session does not cross a test boundary

The first run of `receipt-access.spec.ts` failed case (2) with `getByTestId('empty-state')` resolving to **0 elements**. The cause is not the code: Playwright's `page` fixture is **per-test** — a fresh context, a fresh cookie jar — so the case ran signed out and `(app)/layout.tsx` redirected it to `/login`.

**That failure reads exactly like the regression the case exists to catch** (a receipt rendered for an unpaid hold would also produce no not-found panel), which is what made it worth a named `logInAs` helper with the mechanism written into its docblock rather than an inline block. `shell.spec.ts:733-742` records the same trap from its own first draft.

## Deviations from Plan

### Auto-fixed / auto-added

**1. [Rule 3 - Blocking] `receipt-total`'s selector row shipped one task early**
- **Found during:** Task 1
- **Issue:** `selector-contract.test.ts` is bidirectional. A literal shipped without its row goes red on `Rendered-but-undeclared` immediately, so scheduling the row in Task 2 would have left the tree red between two commits.
- **Fix:** the row landed in Task 1's commit, alongside its literal. `receipt` followed in Task 2's — and that one WAS watched red first, which is what proves the rule is live rather than restated.
- **Precedent:** 13-09's `trust-block` and 13-11's `confirmation-moment` rows both record the identical move for the identical reason.
- **Commit:** `79d5b5d`

**2. [Rule 1 - Bug] The receipt's `<h1>` used the Display role**
- **Found during:** Task 2, by `type-scale.test.ts`
- **Fix:** `text-heading`, per 13-UI-SPEC § Typography. `TOTAL_VALUE_CLASS` also dropped `font-semibold`.
- **Files:** `receipt/page.tsx`, `receipt-lines.tsx` · **Commit:** `57cf306`

**3. [Rule 1 - Bug] `print:shadow-none` on a component that cannot have a shadow**
- **Found during:** Task 3, by `elevation-z.test.ts`
- **Fix:** the class deleted; the pin left at 5/3.
- **Files:** `panel-card.tsx` · **Commit:** `b702882`

**4. [Rule 2 - Missing] `panel-card.tsx` was modified, and it is not in `files_modified`**
- **Issue:** the plan asks for `print:bg-transparent print:ring-0 print:shadow-none` *"on every `PanelCard` on the route"*. `PanelCard` accepts no `className` — deliberately, because DS-11 exists to stop a call site re-deciding the panel's box. The instruction is therefore not expressible where the plan scoped it.
- **Fix:** the print treatment lives in the file that OWNS the box, unconditionally. It is universally correct: print starts with backgrounds dropped, so a panel that kept its fill on screen and lost it on paper would print a hairline ring around nothing.
- **Verified unaffected:** `card-pattern-coverage`, `sticky-offset`, `leak`, `token-drift`, `elevation-z` — all green.
- **Commit:** `b702882`

**5. [Rule 2 - Missing] `e2e/receipt-access.spec.ts` and the two new `detail-completeness` cases**
- **Issue:** Task 2's acceptance criteria demand a behavioural proof using 13-01's seed helper, and Task 3's demand that the entry's predicate be *"asserted by rendering a `requested` booking and finding no entry"*. Neither file is in `files_modified`, and a one-off manual run would not survive the next commit.
- **Fix:** both committed as real specs. The e2e spec is its OWN file rather than a describe inside `shell.spec.ts`, because that file's serial booking describe warns at length that a case calling `signUpBooker` changes which booker every later case is signed in as — and this spec signs up a second booker by design.
- **Commits:** `57cf306`, `b702882`

**6. [Rule 2 - Missing] Print suppression written as a closed set**
- **Issue:** the plan asks for `print:hidden` on *"every `<Button>` and link on the receipt route"*. An enumeration catches only the controls somebody remembered.
- **Fix:** `print:[&_button]:hidden print:[&_a]:hidden` on the `<article>`. **Verified in the emitted CSS**, not assumed: `@media print{.print\:\[\&_a\]\:hidden a,.print\:\[\&_button\]\:hidden button{display:none}}`.
- **Commit:** `b702882`

### Decisions taken inside the plan's intent

**7. D-76 step 2 fails closed.** The plan says the receipt exists for *"`cancelled` with a refund, and reversed"*. The reversed shape is admitted **only** when the probe confirms the session was paid — a silent probe means no receipt. Reasoning is written at the predicate: the detail page can render that shape on a silent probe because D-96 gave it conditional copy; a table of amounts has no conditional register.

**8. The `refundLabel` / `refundKind` pair is a TypeScript union.** The first draft typed the absent case `null` and spread `refund ?? {}`; `tsc --noEmit` refused it — *"Types of property 'refundLabel' are incompatible … 'undefined' is not assignable to 'string'"* — which is the union refusing exactly the case it exists to refuse. Annotating the constant is what keeps that refusal live.

**9. The cancelled/reversed receipt shows the PUBLIC address projection.** `bookedListingAddress()` grants the exact street to `confirmed` and derived-`completed` only. The receipt hands the whole listing row to that boundary and adds no eleventh rule, so a cancelled booking's printable record carries neighbourhood + city. 13-UI-SPEC's Contents row says "full address"; the boundary is the stronger authority and this document is printable and shareable.

**10. `loading.tsx` renders no `<h1>`, though the heading is fixed.** The sibling rule permits one when the resolved heading is a fixed string, and the receipt's is. It is still omitted: the heading is not what is in doubt — the **document** is. D-76's predicate can refuse, so painting `Receipt` while the server decides whether there is one would title a document the page may be about to say does not exist.

## Grep / prose collisions — four more, all closed the same way

This phase has now hit sixteen-plus. Four appeared here, each caught by running the acceptance grep rather than by reading:

| Grep | Read | Cause | Closed by |
|---|---|---|---|
| `grep -ciE 'attendee\|roster' receipt-lines.tsx` | 1, expected 0 | the header bullet explaining the ban named one of them | describing the list rather than naming it, with the collision recorded in the file |
| `grep -c '<main' receipt/loading.tsx` | 1, expected 0 | the header said "never a `<main>`" | naming the landmark's opening tag descriptively |
| `grep -rc 'print-color-adjust' src/` | 1, expected 0 | the badge comment explained the property's initial value | naming the property descriptively |
| `grep -cE '/ *\(' receipt/page.tsx` | 3, expected "no division" | **the measurement is unsatisfiable by any documented file** — the pattern matches `// (` , i.e. a comment opener followed by a parenthesis | recorded here; the satisfiable form is the money-anchored scan `grep -nE '(Cents\|quoted\|refund\|Price)[A-Za-z]* *[/]'`, which returns **0** |

The fourth is the one worth carrying forward: *a plan's stated measurement can be wrong* (13-11's finding). `/ *\(` cannot return 0 against any file that carries a comment with a parenthetical, so it measures documentation rather than division. The property it was reaching for — **no division applied to a money value** — is genuinely true and is asserted by the money-anchored scan above and by `price-surface.test.ts` staying green.

## Threat Model Disposition

| Threat | Disposition | Evidence |
|---|---|---|
| **T-13-12-RECEIPTIDOR** (Elevation of Privilege) | **mitigated and PROVED** | the owner gate repeated verbatim; `e2e/receipt-access.spec.ts` case (3) compares the two answers' status codes to each other and the panel markup byte-for-byte, with guard-the-guard on both, plus three negative assertions that nothing off the row leaked |
| **T-13-12-UNPAIDRECEIPT** (Repudiation) | **mitigated and PROVED** | D-76's two-step predicate; e2e case (2) drives a live `pending` hold as its OWNER and finds zero `receipt` elements and one `empty-state` |
| **T-13-12-FALSEDATE** (Repudiation) | **mitigated and PROVED** | `dateKind` is a closed union, so the page cannot compose the word; e2e case (1) runs against a synthetic session id — the probe answers null on both the no-key and the non-2xx path — and asserts the body does NOT contain `Date paid` and DOES contain `Booked` |
| **T-13-12-FAKEOFFICIAL** (Spoofing) | **mitigated and PROVED** | `receipt-formality.test.ts`, 7 assertions, both probes watched; plus the rendered-in-screen-media assertion in e2e case (1) |
| **T-13-12-UNITINVENT** (Tampering) | **mitigated** | the per-head line is a positive match on `perHeadPriceCents × declaredPax === spacePriceCents`, computed in the RSC, gated on `openCapacity === true`; no division anywhere on the route (money-anchored scan returns 0). ⚠ **Not yet exercised by a fixture** — see Deferred |
| **T-13-12-PIINPRINT** (Information Disclosure) | **mitigated** | the component has no prop that can carry a person's name; `grep -ciE` over the source returns 0; case (8) of the component suite restates it over the rendered tree so a prop added later fails there rather than only in review |
| **T-13-12-MONEYCROSS** (Tampering) | **mitigated and PROVED** | every figure is a finished server-computed string; `price-surface.test.ts` green; `receipt-total` is a unique fourth literal, asserted `toHaveCount(1)` in the browser and `=== 1` in jsdom; DB-vs-DOM parity asserted in centavos |
| **T-13-12-SC** (Tampering / supply chain) | **discharged trivially** | zero packages installed; `package.json` and `package-lock.json` byte-unchanged |

## Threat Flags

None. This route adds no new network endpoint, no auth path, no file access and no schema change. It is a read-only RSC behind the same owner gate two sibling routes already use, and it makes one outbound call — to a module (`probeCheckoutSession`) that is `server-only`, bounded, and cannot raise.

## Known Stubs

None.

## Deferred / For Later Plans

1. **The per-head line has no fixture.** D-86's positive match is implemented and reasoned, but no seeded open-capacity booking exercises it — `seed-payment-states.ts` seeds exclusive rows only, and `booker-seed.ts` carries a `PER_HEAD_PRICE_CENTS` constant that this plan did not wire up. The branch is currently proved only by the component suite's `perHeadUnitLabel` cases (which prove the component renders what it is handed, not that the RSC hands it correctly). **Recommend a seeded open-capacity receipt case in 13-15.**
2. **13-RESEARCH A4 needs one baseline run, not one sentence.** `print:` compiles only inside `@media print`, so all 52 GATE-VRT screen baselines should be byte-identical after the `site-chrome.tsx` / `site-footer.tsx` / `panel-card.tsx` edits. Verified indirectly — `shell.spec.ts`'s 27 geometry cases and the whole design suite are green — but the baselines themselves are Linux-container-only (D-27/D-29) and were not run. **13-15 owns the run.**
3. **Vendored Leaflet CSS ships `print-color-adjust: exact`** on `.leaflet-control`, in `node_modules`, not `src/`. It is outside the receipt's subtree so 13-UI-SPEC's assertion 4 (*zero elements inside `receipt` compute `print-color-adjust: exact`*) is unaffected — but the spec author should scope that query to the article rather than to the document.
4. **The receipt carries no YEAR on its dates.** `when-label.ts` owns the product's four date formats and neither `LONG_DATE` nor `SHORT_DATE` includes one, so `composeWhenLabel` and `composeDateLabel` render "Friday, Aug 8". Adding a year is a product-wide copy change that would move the cancel review's rationale sentence and the OC-07 alert; inventing a fifth format on this route is what that module's header forbids. **A question for the PM, not a fix to slip in.**
5. **A reversed booking's receipt entry.** The detail page offers none, deliberately (decision 5 above). When one is wanted it belongs inside `PaymentReversedState`, under the probe result that component already holds.
6. **The manual print check stands.** 13-VALIDATION keeps it: `emulateMedia` proves the stylesheet applies, not that a printed page is legible. Print to PDF in both themes and confirm no solid flood and that the reference and the total are readable. **Deferred to 13-16.**

## Self-Check: PASSED

Files (all `FOUND`):
- `src/app/(app)/bookings/[id]/receipt/page.tsx`
- `src/app/(app)/bookings/[id]/receipt/loading.tsx`
- `src/components/booking/receipt-lines.tsx`
- `tests/booking/receipt-lines.test.tsx`
- `tests/design/receipt-formality.test.ts`
- `e2e/receipt-access.spec.ts`

Commits (all `FOUND` in `git log`): `79d5b5d`, `57cf306`, `b702882`
