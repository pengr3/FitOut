---
phase: 13-confirmation-bookings-trust
plan: 04
subsystem: ui
tags: [copy, money, payments, paymongo-probe, design-gate, grep-tripwire, selector-contract, e2e]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "BOOKING_SHELL, the nested-`main` fix on this very file, and e2e/helpers/seed-payment-states.ts — the reversed fixture is what makes the D-87 assertion possible at all"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "MoneyStatement (STATE-06's single owner), SupportPath (D-64's guarded affordance), BookingReference — all three composed here, none re-rolled"
  - phase: 13-confirmation-bookings-trust
    plan: 03
    provides: "probeCheckoutSession + readPaymentState (the D-84 discriminator, never-raising, 3s deadline) and refund-window.ts (the three verified windows + the rail-free fallback)"
  - phase: 07-cancellation-refunds
    provides: "isApiRefundable — reused as the branch predicate rather than restated, so the copy branch and the refund dispatch fail closed in the same direction"
provides:
  - "payment-reversed-state.tsx — two opposite money truths from one layout, taking finished server-composed strings and no `number` prop; data-testid=payment-state-reversed"
  - "tests/design/reversed-copy.test.ts — two grep tripwires in the two-piece idiom, with an apostrophe-normalisation pass without which the gate would be green against the live defect"
  - "tests/booking/reversed-state.test.tsx — 8 RTL cases, the branch discriminator watched failing"
  - "The D-87 discriminator on the cancelled branch: DB status + two row-level preconditions + the D-84 probe, and no query string anywhere in it"
  - "The unsourced `within a few days` window removed from the booking detail page (one of its three call sites; 13-12 owns the other two)"
  - "A committed e2e proof that a reversed booking renders its money statement at a bare /bookings/{id}"
affects: [13-05, 13-07, 13-10, 13-11, 13-12, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A grep tripwire that NORMALISES HTML entities before scanning — the defect it exists for was written as `&apos;`, so the plain-apostrophe needle matched nothing and the gate would have shipped permanently green"
    - "A banned-phrase scope expressed as a SENTINEL-DELIMITED REGION of the source, with the region's presence and a minimum length asserted FIRST — because one branch is required to use the word the other may not"
    - "A third-party read on a render path gated by row-level preconditions, so the common render pays no round trip and the uncommon one cannot be reported for the wrong row"
    - "A fallback whose DIRECTION is the design: an unanswered probe lands on the branch that claims less, and the code says why in the branch itself"

key-files:
  created:
    - "tests/design/reversed-copy.test.ts"
    - "tests/booking/reversed-state.test.tsx"
  modified:
    - "src/components/booking/payment-reversed-state.tsx"
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/lib/design/selector-contract.ts"
    - "e2e/shell.spec.ts"

key-decisions:
  - "The selector row shipped in TASK 2's commit, not Task 3's, because selector-contract.test.ts's assertion 2 is the undeclared-id ban: the literal and its declaration must land together or the intervening commit is red. 13-02 established the rule; the plan's file list did not carry it"
  - "The probe is gated on `cancelledBy === null && paymentId === null && checkoutSessionId !== null` BEFORE it runs. Without the first condition every booker-cancelled booking on the site probes `paid` and renders as a reversal — the plan's action text did not name it, and it is the single most damaging reading of the D-84 discriminator"
  - "The prop is `rail` (PayMongo's `source.type` token) and not the plan's `railLabel`: `refundWindowFor` keys on the token, the brand name is already interpolated inside the sentence it returns, and a display string could not select anything"
  - "The status-meaning sentence is 13-UI-SPEC § The Reversed State's layout sketch (`This time was taken before your payment landed.`) rather than the status table's near-restatement of the `<h1>`. Recorded because the two documents differ"
  - "The generic cancelled branch takes the RAIL-FREE window sentence: that branch holds no probed rail, a party cancellation is not a reversal and buys no round trip, and naming every rail is the honest form of not knowing"

patterns-established:
  - "The grep-vs-prose collision now has a measured cadence: FOUR instances in four consecutive Phase-13 plans (13-01 the landmark, 13-02 the politeness attribute, 13-03 the raising keyword, 13-04 the alarm token AND the removed gate). It is no longer a surprise; it is a cost of the idiom and should be planned for"
  - "`mode: \"serial\"` shares module state between tests but NOT the browser context — a second test against an owner-gated route must log the same user back in, and its 404 is indistinguishable from the regression under test"

requirements-completed: []  # NONE — see "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 33min
completed: 2026-08-20
---

# Phase 13 Plan 04: The Reversed State — Two Money Truths, No Query String Summary

**The sentence that told a booker no money had left their account — on the one surface reached only because money HAD left their account — is gone, replaced by two opposite branches whose windows are read from one module and never typed; and the state is now reached from DB status plus a live probe, so it survives the removal of the query parameter that was its only door.**

## Performance

- **Duration:** ~33m
- **Started:** 2026-08-20T06:19Z (14:19 +0800)
- **Completed:** 2026-08-20T06:53Z (14:53 +0800)
- **Tasks:** 3 / 3
- **Files:** 2 created, 4 modified

## Accomplishments

- **The false sentence is gone, and the gate that removes it was watched failing against the shipped file** — naming it at line 5 (the header) *and* line 35 (the rendered prose), which is the property the ban exists for: a comment is exactly where a banned phrase survives a copy fix.
- **The tripwire nearly shipped green, and the reason is worth more than the tripwire.** The shipped sentence is JSX prose, so `react/no-unescaped-entities` means the apostrophe in the file is `&apos;` — a contiguity scan for the plain spelling matches **nothing** and reports a clean file. The scanner therefore normalises five apostrophe spellings before it looks for anything, and the entity form is one of the guard-the-guard fixtures so the normalisation cannot rot. Without that pass this plan would have committed a gate that could never fire.
- **Two branches that say opposite things, because they ARE opposite facts.** The automatic branch names the amount, says it went back, and states the verified window **for its rail** — every number read from `refund-window.ts`, none typed here (`grep -oiE '[0-9]+ *(day|hour)'` over the component returns nothing). The by-hand branch never uses the word the automatic one is required to use, never claims an impossibility, and carries the reference the operator alert was recorded against.
- **The manual branch's ban is scoped to a sentinel-delimited region**, and the sentinels' presence and minimum length are asserted **before** the ban — because "the region is gone" and "the region is clean" are indistinguishable to a scan, and one of them is a dead gate.
- **The `?paid=1` gate is gone from the cancelled branch entirely.** `grep -c 'paid === "1"'` over the page returns exactly **1** — the pending branch's remaining use, which plan 13-05 owns. D-60's safety argument ("everything the moment states is repeated on the ordinary detail page") is now TRUE for this state, which is the precondition 13-11 needed.
- **A party cancellation can no longer be reported as a reversal.** The plan's discriminator, applied literally, would have probed every `cancelled` row: a booker-cancelled booking's session genuinely reads `paid`, so every one of them would have rendered *"We couldn't complete this booking — we've refunded ₱X in full"* over a booking the booker themselves cancelled. Two row-level preconditions run first, and they also mean the common cancelled render pays **no round trip at all**.
- **The unanswered-probe fallback lands on the branch that claims less**, and the code says why at the branch rather than in a plan document. The residual it cannot exclude is written down in the same place (see *Findings*).
- **The page's unsourced refund window is superseded.** `grep -c 'within a few days'` returns 0 on this file; the other two call sites belong to 13-12 and are untouched.
- **Zero packages. Zero migrations. `drizzle/` still ends at `0025_audit_resolved_by.sql`. `REFUNDABLE_RAILS`, `site.ts` and `site-contacts.test.ts` byte-unchanged.**

## Task Commits

1. **Task 1: The two grep tripwires, written first and watched failing** — `87ce31c` (test)
2. **Task 2: The reversed state's copy, across two opposite money truths** — `5945edb` (fix)
3. **Task 3: Reach the reversed state from DB state plus the probe** — `6e3d794` (fix)

## Files Created/Modified

- `tests/design/reversed-copy.test.ts` — **new, 8 cases.** The `price-surface.test.ts` idiom: mandatory `why`, raw + whitespace-collapsed passes, comments deliberately NOT stripped, fixtures built from the two-piece encoding, a vacuity probe, a byte floor, and a positive half. Plus the apostrophe pass and the sentinel-region scope, both of which are net-new to the idiom and both documented in the header.
- `tests/booking/reversed-state.test.tsx` — **new, 8 RTL cases.** Both branches; the window tracked per rail; the manual branch's absence of any window; one container, one money statement, one `<h1>`; `Back to availability` on both; no live region; and the runtime complement of ban 1.
- `src/components/booking/payment-reversed-state.tsx` — **rewritten.** Server Component; props `listingId`, `reference`, `amountLabel`, `branch`, `rail`. No `number` prop. The outer `<Card>` removed (a `PanelCard` nested inside it pays the block padding twice), the live region removed, no focus move, no alarm token, one coral. `MoneyStatement` is the first element after the heading block; `SupportPath` sits inside the panel; `BookingReference` renders below it.
- `src/app/(app)/bookings/[id]/page.tsx` — `checkoutSessionId` added to the select; the query-string gate deleted; branch **(f)** added inside `cancelled`, before the D-97 lapse check; the lapse branch's KNOWN EDGE comment replaced by the mechanism that closes it; the unsourced window replaced by `ALL_RAILS_REFUND_WINDOW`.
- `src/lib/design/selector-contract.ts` — **+1 row** (`payment-state-reversed`, `owner: "13-04"`), shipped in the same commit as its literal.
- `e2e/shell.spec.ts` — the reversed route in the landmark table loses its query string (that is D-87, expressed as a fixture); **+1 test** proving the state renders with its money statement and its reference at a bare `/bookings/{id}`.

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run concurrently, and neither was run alongside `npm run build`** (13-01's operational finding, restated in the execution brief).

**Task 1**

| Criterion | Result |
|---|---|
| the tripwire FAILS against the shipped file, naming it with a line number and the `why` | **observed — verbatim below.** `3 failed / 5 passed`, hits at `:5` and `:35` |
| `grep -ci "haven't been charged" tests/design/reversed-copy.test.ts` | **`0`** — the test does not spell its own prohibition |
| `grep -cF 'replace(/\s+/g' tests/design/reversed-copy.test.ts` | **`1`** (≥ 1). ⚠ `-F` is load-bearing — see *Deviations* |
| the same command passes after Task 2 | **`8 passed`** |
| `npx eslint` / `npx tsc --noEmit` | 0 errors / exit 0 |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run --config vitest.design.config.ts tests/design/reversed-copy.test.ts` | **8 passed** — both halves |
| `npx vitest run tests/booking/reversed-state.test.tsx` | **8 passed**, both branches |
| `grep -ciE 'destructive' …payment-reversed-state.tsx` | **`0`** — after the collision recorded in *Deviations* |
| `grep -c 'aria-live' …` | **`0`** |
| `grep -oiE '[0-9]+ *(day\|hour)' …` | **no output** — every number comes from `refund-window.ts` |
| `grep -c 'variant="brand"' …` | **`1`** |
| `grep -c '<main' …` | **`0`** — 13-01's fix intact |
| `npx vitest run --config vitest.design.config.ts` overall | **43 files, 762 passed / 3 skipped** — including `card-pattern-coverage.test.ts` with **ZERO** new `ALLOWED_RAW_CARD` rows (that file is byte-unchanged) |

**Task 3**

| Criterion | Result |
|---|---|
| `grep -c 'paid === "1"' '…/page.tsx'` | **`1`** — the pending branch only. After the collision recorded in *Deviations* |
| `grep -c 'within a few days' '…/page.tsx'` | **`0`** |
| behavioural proof, no query string | **observed.** `npx playwright test e2e/shell.spec.ts -g "one \`main\` landmark"` → **2 passed (18.5s)**, the new case at `shell.spec.ts:719` |
| `selector-contract.test.ts` | **7 passed.** Both directions are `toEqual`-style set comparisons in ONE assertion, so a green run IS `Declared-but-absent: [none]` / `Rendered-but-undeclared: [none]` — the phrase only prints on failure |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | **exit 0** |
| the page renders when the probe is unavailable | **observed, by the stronger path** — see *Deviations* item 5 |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **146 files passed / 1 skipped; 1357 passed / 4 skipped** — exit 0. (13-03 closed at 145/1349; +1 file and +8 tests is exactly this plan's RTL suite.) |
| `npm run test:design` | **43 files, 762 passed / 3 skipped** |
| `npm run build` | exit 0 |
| `git diff --stat` on `drizzle/`, `refund-rail.ts`, `site-contacts.test.ts`, `site.ts`, `package.json`, `package-lock.json` | **empty — zero changes to all six** |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| stub scan on both changed `src/` files | no `TODO`/`FIXME`/placeholder/"coming soon"/"not available" |

## The Watched Reds — verbatim

### 1. Task 1's required red — the shipped defect, caught in prose AND in the header

```
 FAIL  tests/design/reversed-copy.test.ts > (1) D-69 — the reversed state never borrows the
       not-completed state's money sentence > spells it nowhere in the file, comments included
AssertionError: the reversed state spells the not-completed state's money sentence:
["src/components/booking/payment-reversed-state.tsx:5 — is STATE-05's sentence for the NOT-COMPLETED
state, and 13-UI-SPEC assigns it to `payment-incomplete-state.tsx` and to nowhere else. On a reversal
money DID leave the booker's account — the charge can sit visible on their statement for days, and on
the manual rails it has not come back at all — so this sentence contradicts the one document the booker
will check it against. D-69 replaces it with the amount, which of the two money truths applies, and the
verified window.","src/components/booking/payment-reversed-state.tsx:35 — …"].
A reversal means money LEFT the booker's account, and on the manual rails it has not come back — so this
sentence is the inverse of the truth in two directions and contradicts the booker's own bank app. It must
not appear in the file AT ALL, comments included, because a grep that matches its own prohibition stops
being a guard. Encode it in two pieces if you must refer to it.: expected [ …(2) ] to deeply equal []

 FAIL  … > (2) D-82 / D-83 … > carries a marked manual-return region that is long enough to be the copy
AssertionError: src/components/booking/payment-reversed-state.tsx has no `MANUAL-RETURN-COPY:BEGIN` /
`MANUAL-RETURN-COPY:END` pair. … expected null not to be null

 FAIL  … > (3) the file still states the money truth it was corrected in order to state
AssertionError: src/components/booking/payment-reversed-state.tsx no longer composes MoneyStatement. …
expected false to be true

 Test Files  1 failed (1)
      Tests  3 failed | 5 passed (8)
```

**Two hits, not one, and that is the interesting half.** Line 35 is the rendered prose; **line 5 is the file's own header comment**, which described the state by quoting the sentence. A comment-stripped scan would have passed the file the moment the prose was fixed and left the phrase sitting in the repository as a copy-pasteable string — which is the failure mode the "comments included" rule exists for, observed here rather than argued.

**Five of the eight cases stayed green in the same run** — the vacuity probe, both fixture batteries, the byte floor — which is what shows the red is about the file's content and not about the scanner being broken.

### 2. Task 2's probe — the branch discriminator inverted (unplanned, and it earns the suite)

`const isAuto = branch === "auto"` was changed to `branch !== "auto"` and nothing else:

```
 × (1) the AUTOMATIC branch names the amount, says it was sent back, and gives the CARD window
 × (2) the AUTOMATIC branch tracks the rail — GCash and Maya each get their own sentence
 × (3) with the rail UNKNOWN, the automatic branch falls to the rail-free sentence (D-84)
 × (4) the MANUAL branch states the charge, carries the reference, and offers NO window

TestingLibraryElementError: Unable to find an element with the text: You were charged ₱1,428.00, and
it's coming back to you. …

      Tests  4 failed | 4 passed (8)
```

**Why this probe was worth running.** A component that ignored `branch` and always rendered the automatic copy satisfies **every assertion in the source scan perfectly**: the automatic sentences are permitted, and the marked region stays clean precisely because nothing in it ever reaches the DOM. The whole design gate would have been green over a surface telling every by-hand booker their money had been sent back. Exactly four cases moved, and the four that held (container count, recovery CTAs, live region, `<h1>`) are the branch-independent ones — so the red is demonstrably about the branch and not about the file.

### 3. Task 3's unplanned red — the e2e session does not cross a test boundary

```
  ✘ … › a reversed booking renders its money statement with NO query string on the URL
    Error: /bookings/e2e_landmark_pay_reversed_f8aa54e7-…: the reversed heading is absent, so this page
    is still its skeleton (or fell through to the generic cancelled branch — which is exactly the D-87
    regression …)
    Locator:  getByRole('heading', { name: 'We couldn\'t complete this booking', level: 1 })
    Expected: 1 / Received: 0 · 13 × locator resolved to 0 elements
  1 failed · 1 passed
```

**Read what that says, because it is the most useful thing in this plan after the entity finding.** The test *above it in the same serial describe* had just visited the same URL and passed. The difference is that Playwright hands every test a **fresh browser context**: `mode: "serial"` shares module state, not cookies. `/bookings/[id]` is owner-gated and answers a signed-out visitor with the same bare 404 it gives a foreign row (T-04-CONFIRMIDOR) — so **a missing session is indistinguishable from the exact regression this case exists to catch**, and the failure message it produced was a confident and completely wrong diagnosis of the code under test. The case now logs the same booker back in (a fresh signup would 404 for a different and equally correct reason), and the trap is recorded at the line.

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Bug] The discriminator as written would have reported every party cancellation as a reversal**

- **Found during:** Task 3, before writing the branch.
- **Issue:** The plan's action is *"inside the `cancelled` branch and BEFORE the lapsed-approval check … call `probeCheckoutSession`; when it reports the session `paid`, this is a reversal."* Applied literally that probes **every** cancelled row. A booking the booker cancelled themselves was `confirmed` first, so its checkout session genuinely reads `paid` — and every booker-cancelled and host-cancelled booking on the site would have rendered *"We couldn't complete this booking"* with the reversal's money copy, replacing D-79's `{₱X} refund on its way` (which is refund **intent**, PROJECT D-57) with a claim of a completed action. That is the single most damaging misreading available on this surface.
- **Fix:** Two row-level preconditions run before the probe. `cancelledBy === null` — a party cancellation was a decision, not a system retirement — and `checkoutSessionId !== null` — a booking that never reached checkout cannot have had a payment reversed, which is also what keeps the D-97 lapse branch (whose rows have no session id) intact. Both are documented at the branch with the reason. They also mean the common cancelled render pays no round trip.
- **Commit:** `6e3d794`.

**2. [Rule 3 — Blocking] The selector row had to ship in Task 2's commit, not Task 3's**

- **Found during:** Task 2.
- **Issue:** The plan lists `selector-contract.ts` under Task 3's `<files>`, but `tests/design/selector-contract.test.ts`'s assertion 2 is the **undeclared-id ban** and its complement compares the declared set against the rendered set. Adding `data-testid="payment-state-reversed"` in Task 2 and declaring it in Task 3 makes the intervening commit red, and Task 2's own criterion is that the whole design suite is green.
- **Fix:** The row shipped in `5945edb`, in the same commit as the literal — 13-02's established discipline ("the declared set and the rendered set are the same set at every commit"). Task 3 touched the file not at all.
- **Commit:** `5945edb`.

**3. [Rule 3 — Blocking] Two acceptance greps counted this plan's own prose — the fourth and fifth instances in four plans**

- **Found during:** Tasks 2 and 3.
- **Issue (a):** `grep -ciE 'destructive'` over the component must return `0`. The plan also requires the file to state that it uses zero such tokens. Writing that sentence made the criterion read **1** against a correct file.
- **Issue (b):** `grep -c 'paid === "1"'` over the page must return exactly `1`. The comment explaining what was removed quoted the removed gate, making it read **2** against a correct file.
- **Fix:** Both are named descriptively rather than quoted (`booking-row.tsx:112`'s precedent), and both files record that the omission is deliberate and must not be "helpfully" fixed. Every word of both reasons survives; only the quoted token does not.
- **Commits:** `5945edb`, `6e3d794`.
- **Note for the phase:** this is now **four consecutive plans** hitting the same collision (13-01 the landmark, 13-02 the politeness attribute, 13-03 the raising keyword, 13-04 twice). It is not bad luck; it is the cost of pairing a documentation-heavy house style with raw-grep criteria. Plans after this one should either write the criterion as a scoped scan (code lines only) or expect to pay this every time.

**4. [Rule 2 — Missing critical functionality] The tripwire needed an apostrophe-normalisation pass or it could never fire**

- **Found during:** Task 1, on the first run.
- **Issue:** The shipped sentence is JSX prose. `react/no-unescaped-entities` means what is actually in the file is `haven&apos;t been charged`, so a contiguity scan for the plain-apostrophe spelling matches nothing and reports a **clean file**. The gate would have been committed permanently green against the one defect it was written for.
- **Fix:** The scanner folds `&apos;`, `&#39;`, `&#x27;`, `&rsquo;` and the curly `’` onto a plain `'` on **both** passes before searching, and the entity spelling is one of the guard-the-guard fixtures so the normalisation cannot silently rot. Recorded at length in the file header, because the next author writing a copy tripwire over JSX will hit it too.
- **Commit:** `87ce31c`.

**5. [Rule 3 — Blocking] A caller update in Task 2 that the plan assigns to Task 3**

- **Found during:** Task 2.
- **Issue:** Task 2 changes the component's props; Task 3 changes the caller. Between them the repository does not compile.
- **Fix:** Task 2's commit updates the existing call site to the new props (with `branch="manual"` — the fail-closed direction, which never claims a return that did not happen) and leaves the gate alone; Task 3 replaces the gate. The interim shape is labelled as interim in the file. Every commit in this plan compiles and builds.
- **Commit:** `5945edb`.

### Recorded judgements

**A. The prop is `rail`, not the plan's `railLabel`.** The plan names an *"optional `railLabel`"* while its own `key_links` require the component to select the window sentence through `refund-window.ts`. `refundWindowFor` keys on PayMongo's `source.type` **token**, and the brand name a booker recognises (*"your GCash"*) is already interpolated inside the sentence the module returns — so a display string could not select anything, and there is no other use for one in this state's specified copy. The prop is therefore the token, and its doc comment says so.

**B. The status-meaning sentence is the one from § The Reversed State, not the one from § The Booking Detail Page.** 13-UI-SPEC gives two: the status table's *"We couldn't confirm this booking, so it was cancelled."* and the reversed state's own layout sketch, *"This time was taken before your payment landed."* The first is a near-restatement of the `<h1>` directly above it; the second adds the fact the booker does not have. The sketch is in the section that governs this exact component and is what the plan's `read_first` points at. **Flagged for 13-15** in case a later gate pins the table's wording.

**C. The generic cancelled branch takes the rail-free window sentence.** The plan says only *"replaced by the verified window from `refund-window.ts`. Do not hand-type a number."* Per-rail selection there would need `booking.paymentMethod` in the select (it IS populated on a confirmed-then-cancelled row) — real scope this plan was not given, on a branch it does not own. The rail-free sentence names every rail rather than claiming to know which, which is the honest form of not knowing, and it costs no round trip on the most common cancelled render.

**D. `LIVE_REGION_EXCLUSIONS` was NOT touched**, and that is measured rather than assumed. 13-UI-SPEC's inventory section moves that list 10 → 0 across the phase. `tests/design/live-regions.test.tsx` asserts only that each exclusion has a reason and does not overlap the declared set — there is no "declared-but-absent" check on it — so removing this file's region does not require removing its row, and removing the row would move a type-level count assertion in a plan that owns one of ten files. The row now over-states the case by one file; the plan that closes the list is the one that should shrink it.

## Findings

**A residual the probe cannot exclude, recorded in the code and repeated here for 13-15.**

When `probeCheckoutSession` learns nothing (no key, a network error, a non-2xx, the 3s deadline), the branch falls back to the row signature and renders the by-hand copy. That signature — `cancelled` + no `cancelled_by` + no `payment_id` + a real `checkout_session_id` — is shared with one other shape: an **abandoned hold** that a later booker's in-transaction stale-hold sweep flipped to `cancelled` (`src/lib/availability/units.ts:487` for the exclusive path, `:922` for open capacity). Such a booker was never charged, and would read *"You were charged ₱X, and it's coming back to you."*

Three things bound it, and none of them makes it disappear:

1. It requires a provider outage (or a missing key) **and** an abandoned checkout **and** a revisit to that booking, simultaneously. With the probe up, the session reads `active` or `expired` and the row correctly falls through.
2. 13-RESEARCH's finding is that there is **no row-level signal** separating a reversed payment from a swept unpaid hold. This is that finding, met in the one place the probe cannot answer.
3. The honest fix is a persisted signal on the reversal path, and **D-80 puts zero migrations in scope for this phase**.

The plan's own threat register (`T-13-04-FALSEREFUND`) chooses the fallback direction deliberately, and this executor kept that choice rather than overriding it — but the register argues the *branch* (auto vs by-hand), not the *state*, and the residual above is about the state. It is written at the branch in `page.tsx` so the next author finds it rather than re-derives it.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no schema change and no new trust boundary. The probe is a call to an existing client on an existing route.

- **T-13-04-PARAMTRUST** (Spoofing) — **mitigated, and stronger than specified.** The branch reads DB status plus the probe; `grep -c 'paid === "1"'` over the page returns 1 and that use is the pending branch's. No branch moved off DB status; the webhook remains the sole confirm authority.
- **T-13-04-FALSEREFUND** (Repudiation) — **mitigated, and the direction is now unbypassable by construction:** `branch={isApiRefundable(rail) ? "auto" : "manual"}` with `rail = session?.sourceType ?? null`, and `isApiRefundable(null)` is `false` by its own fail-closed contract. See *Findings* for the residual that mitigation does not reach.
- **T-13-04-MONEYCROSS** (Tampering) — **mitigated structurally.** The component has no `number` prop; `formatMoney` runs in the RSC. Restated in both files.
- **T-13-04-PROBEFAIL** (Denial of Service) — **mitigated and exercised.** The e2e case renders against a synthetic session id, so the probe fails on every run and the page still explains itself. `probeCheckoutSession` never raises (13-03, proved).
- **T-13-04-COPYDRIFT** (Repudiation) — **mitigated and both halves watched failing.** No hand-typed duration on either file; the two tripwires are committed and were red.
- **T-13-04-IDOR** (Elevation of Privilege) — **accepted, unchanged.** The owner gate is not modified. It did, however, produce watched red 3 — the gate working exactly as designed, from an unexpected direction.
- **T-13-04-SC** (supply chain) — **discharged trivially.** Zero packages; `package.json` and `package-lock.json` byte-unchanged.

## Known Stubs

None. The scan for hardcoded empties, placeholder text and unwired data over both changed `src/` files is clean.

One deliberate absence that is **not** a stub: `SupportPath` renders nothing at runtime, because `SUPPORT_EMAIL` is `null`. That is D-64, the one line that changes is `src/lib/site.ts:70`, and it is an operator action. The copy on both branches is written so that the closed guard removes a **control** and never a **sentence** — and neither branch promises an email, because `handleGoneSlot` sends none.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [STATE-05, STATE-06, TRUST-02]`, and **none was marked complete**, following 13-01's and 13-02's precedent and 13-UI-SPEC's own instruction:

- **STATE-05** — 13-UI-SPEC § The Support Path states it **closes as PARTIAL at phase end**, code-complete and address-pending, as a named `human_needed` item. It is also carried by `13-01`, `13-02`, `13-03`, `13-05`, `13-07`, `13-15`, `13-16`. Two of its three payment states (`pending`'s rewrite, `not-completed`) do not exist yet.
- **STATE-06** — the money statement exists on **one** of the states it is required on. Also carried by `13-07`, `13-10`, `13-15`.
- **TRUST-02** — the reference renders on this status; the requirement is *every* status, the receipt, the moment and the group page. Also carried by `13-08`, `13-10`, `13-12`, `13-13`.

Checking a box now would put `Complete` in `REQUIREMENTS.md`'s traceability table for surfaces that do not exist. The last plan that touches each ID is the one that should mark it.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `tests/design/reversed-copy.test.ts` — FOUND
- `tests/booking/reversed-state.test.tsx` — FOUND
- `src/components/booking/payment-reversed-state.tsx` — FOUND
- `src/app/(app)/bookings/[id]/page.tsx` — FOUND
- `src/lib/design/selector-contract.ts` — FOUND
- `e2e/shell.spec.ts` — FOUND

Commits claimed, verified in `git log`:

- `87ce31c` — FOUND
- `5945edb` — FOUND
- `6e3d794` — FOUND
