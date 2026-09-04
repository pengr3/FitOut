---
phase: 13-confirmation-bookings-trust
plan: 07
subsystem: ui
tags: [payments, paymongo-probe, copy, money, live-regions, accent-budget, selector-contract, e2e, rtl]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "BOOKING_SHELL (both states' container), the nested-`main` fix on `pending-payment-state.tsx`, and `e2e/helpers/seed-payment-states.ts` — the pendingLiveHold / pendingExpiredHold pair is what makes D-70's boundary assertable at all"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "MoneyStatement, SupportPath (guarded), BookingReference — all three composed by both states, none re-rolled"
  - phase: 13-confirmation-bookings-trust
    plan: 03
    provides: "probeCheckoutSession + readPaymentState — the deadline-bounded, never-raising discriminator this plan's pending branch routes through"
  - phase: 13-confirmation-bookings-trust
    plan: 04
    provides: "the reversed state's shape (no outer card, no live region, finished server-composed strings), the row-preconditions-before-probe ordering, and `reversed-copy.test.ts`'s permanent ban on the sentence this plan finally has a home for"
provides:
  - "not-completed-state.tsx — STATE-05's third state, net-new: data-testid=payment-state-incomplete, the coral retry as a LINK into the shipped expire-before-create path, the inline rails line, and the in-place countdown expiry"
  - "pending-payment-state.tsx — D-71's promise (safe, held, and we will email you) over provably frozen poll mechanics, D-95's labelled control, and the ONE live region this phase keeps, now with a non-empty accessible name"
  - "The probe-driven pending discriminator on `(app)/bookings/[id]/page.tsx`: row first (hold liveness against the DB clock), provider second, and the shipped redirect as the failure direction"
  - "tests/booking/payment-states.test.tsx — 18 RTL cases: both states' copy and behaviour, plus the STATE-05 distinctness proof across three hooks, headings, glyphs and action sets"
  - "Three committed e2e cases against 13-01's fixture, including the D-70 boundary (watched failing) and a real test-mode PayMongo session for the ACTIVE branch"
  - "Two declared selector rows (payment-state-incomplete, payment-state-pending), each shipped in the same commit as its literal"
affects: [13-08, 13-09, 13-10, 13-11, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An opt-out prop on a shipped component whose DEFAULT preserves every existing call site byte-for-byte — the smallest change that lets a new horizon reject an emphasis built for a different one"
    - "A rendered-tree alarm-colour assertion scoped to UNCONDITIONAL paint utilities, because the vendored button recipe carries `aria-invalid:`-prefixed spellings of the same token on every button in the app"
    - "A second threshold as a one-shot `setTimeout` beside (never inside) a frozen `setInterval` block — the only shape that adds a state without editing the mechanics a decision froze"
    - "A distinctness suite that renders each state into its OWN document and compares the results, because 'no two co-render' cannot be asserted by a harness that puts two in one tree"
    - "An e2e case that mints a REAL third-party object to reach a branch no synthetic fixture can, guarded by the same secret boundary CI runs inside"

key-files:
  created:
    - "src/components/booking/not-completed-state.tsx"
    - "tests/booking/payment-states.test.tsx"
  modified:
    - "src/components/booking/pending-payment-state.tsx"
    - "src/components/booking/request-countdown.tsx"
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/brand-recipe.test.ts"
    - "e2e/shell.spec.ts"
    - ".planning/phases/13-confirmation-bookings-trust/deferred-items.md"

key-decisions:
  - "The countdown 13-UI-SPEC names for this slot paints its digits with the alarm token whenever under an hour remains — which on a fifteen-minute hold is ALWAYS. Reusing it verbatim would have shipped a permanently red countdown on the calmest surface in a phase whose contract is that the token renders nowhere. It gained an opt-out prop defaulting to today's behaviour; both shipped call sites are unchanged"
  - "The hold-liveness check runs BEFORE the probe, not after: it is D-70's hard boundary rather than an optimisation, and putting it first also means the common visit pays no third-party round trip"
  - "The pending state renders NO status-meaning sentence under its `<h1>`: 13-UI-SPEC's status table gives it the money statement's two lines verbatim, and one sentence twice on one page is not emphasis. 13-04 recorded the same reading on the reversed state"
  - "The not-completed state's status-meaning sentence is the HALF that nothing else says (`This checkout didn't finish.`); the specified second half is the money statement's line 2, one line later"
  - "`SupportPath` renders in the trust-block row presentation on the not-completed state and in the panel presentation on the pending state — 13-UI-SPEC's guard-state table gives the in-panel control to the reversed state and to the pending state past its escalation, and every other status the row"
  - "The escalation sentence is one wording that is true in BOTH guard states, because a caller cannot test `SUPPORT_EMAIL` without becoming the unguarded-literal shape the gate exists to catch. It names the reference (a real mechanism, guard closed) and never a channel"
  - "The pending state's outer card was removed, mirroring 13-04: a PanelCard nested inside a card pays the block padding twice"
  - "Both selector rows shipped in the commit that introduced their literal, not in the plan's nominated task — the contract is bidirectional and an intervening commit would be red in one direction or the other"

patterns-established:
  - "The grep-versus-prose collision reached its SEVENTH and EIGHTH instances in this phase, and the second of them is a new direction: an acceptance criterion of the form 'exactly ONE line carries this string' is tripped by DOCUMENTING the string, not only by forbidding it"
  - "A positive control in the SAME RUN is stronger evidence than a contrived red for an absence assertion — `payment-state-incomplete` is asserted 0 on the expired row and 1 on the live row in one Playwright run, so the locator is proved able to resolve"

requirements-completed: []  # NEITHER STATE-05 nor STATE-06 is closed here — see the section below.

# Metrics
duration: 95min
completed: 2026-08-20
---

# Phase 13 Plan 07: The Third Payment State, and the Promise the Second Lacked Summary

**The state STATE-05 counted and the app never rendered now exists, reachable only while the hold is alive and proved never to steal the expired hold's landing; the settling state finally says the booking is safe and that somebody will write, over poll mechanics whose diff touches not one of the five lines a decision froze; and the alarm colour that the specified countdown would have painted permanently on a fifteen-minute horizon was caught by a rendered-tree assertion before it shipped.**

## Performance

- **Duration:** ~1h 35m
- **Started:** 2026-08-20T08:20Z (16:20 +0800)
- **Completed:** 2026-08-20T09:55Z (17:55 +0800)
- **Tasks:** 3 / 3
- **Files:** 2 created, 7 modified

## Accomplishments

- **STATE-05's third state exists.** Before this plan a `pending` booking visited without the
  checkout-return parameter was redirected unconditionally — the booker was bounced back to a checkout
  page with no statement at all about the payment they thought they had made. It now lands on a state
  that says plainly that they have **not** been charged, that the slot is still theirs, names GCash,
  Maya, card and QR Ph inline so a failed rail does not read as a lost slot, and offers one coral
  `Try paying again`.
- **The retry is a `<Link>`, and the file says why without naming either identifier.** The reserve
  page's confirm action claims a compare-and-swap checkout lease and expires the persisted session
  before minting a new one; PayMongo does not honour an idempotency key on checkout-session creation
  (probed live on this project — it cost a real double charge on an unrefundable rail). A second
  minting path is the one thing this surface must not grow, and `grep -c 'createCheckoutSession\|confirmBooking'`
  over the component returns **0**.
- **D-70's boundary is proved, not asserted.** Two fixture rows differing in one column — the sign of
  `expires_at` — land on two different surfaces: the live one on the new state, the lapsed one on the
  reserve page where `hold-expired-state.tsx` already renders. The boundary was **watched failing**:
  with the liveness check removed, the expired row rendered `payment-state-incomplete` and the spec
  named the seeded row by id.
- **The pending poller's mechanics are provably untouched.** `git diff` on that file contains **zero**
  changed lines matching `POLL_INTERVAL_MS`, `MAX_ATTEMPTS`, `setInterval`, `clearInterval` or
  `routerRef`. The third threshold is a one-shot `setTimeout` beside the frozen block, not a second
  count inside it.
- **The pending state gained a promise and no way to act on a failure.** Three thresholds, one live
  region, one control, and an RTL case that walks all three thresholds asserting the banned phrasings
  are absent, the alarm colour is absent, and no second control ever appears beside the refresh.
- **The alarm colour was caught before it shipped, by a test rather than by review.** 13-UI-SPEC names
  `RequestCountdown` for the hold display; that component reddens its digits whenever under an hour
  remains, which on a fifteen-minute hold is every second of it. A source scan over
  `src/components/booking/**` — the form 13-15 will write — could never have seen it, because the token
  arrives from one import away. See *The Watched Reds* and *Deviations*.
- **Zero packages. Zero migrations.** `drizzle/` still ends at `0025_audit_resolved_by.sql`;
  `package.json`, `package-lock.json`, `refund-rail.ts`, `site.ts` and `site-contacts.test.ts` are
  byte-unchanged.

## Task Commits

1. **Task 1 (RED): the not-completed state's cases, before the state exists** — `8184796` (test)
2. **Task 1 (GREEN): NotCompletedState — the net-new sibling, not a duplicate (D-70)** — `09495ab` (feat)
3. **Task 2: the pending state's promise, over frozen mechanics (D-71, D-95)** — `fadbfec` (feat)
4. **Task 3: route the pending branch through the probe, and prove the three states distinct** — `e196cdd` (feat)

## Files Created/Modified

- `src/components/booking/not-completed-state.tsx` — **new.** Client component (the in-place expiry swap
  is state). No box of its own; the one panel is `MoneyStatement`'s. Muted `RotateCcwIcon`, one coral at
  a time, the rails line, `RequestCountdown` with the emphasis opted out, `BookingReference`, and
  `SupportPath` in the trust-block row.
- `src/components/booking/pending-payment-state.tsx` — the two shipped strings become `MoneyStatement`
  across three thresholds; `SUPPORT_ESCALATION_MS = 120_000` with its floor-and-ceiling argument; the
  bare politeness attribute becomes one named `role="status"` wrapper; the control gains its object;
  the outer card goes; `data-testid="payment-state-pending"`. **The poll block is byte-identical.**
- `src/components/booking/request-countdown.tsx` — **+1 optional prop**, `finalHourEmphasis`, defaulting
  to `true`. Two lines of behaviour, ~15 of reason.
- `src/app/(app)/bookings/[id]/page.tsx` — the pending branch's unconditional redirect replaced by
  row-then-probe; the DB clock read inside the branch (it returns before the page's own read); the
  ordering argument, the failure direction and the D-89 no-consumer rule recorded at the branch.
- `src/lib/design/selector-contract.ts` — **+2 rows** under a `13-07` banner, each in its literal's commit.
- `tests/booking/payment-states.test.tsx` — **new, 18 cases** across three describes.
- `tests/design/brand-recipe.test.ts` — three pins re-measured (17→19, 22→24, +1 map row) with the
  runtime-conditional argument recorded in both comment blocks.
- `e2e/shell.spec.ts` — **+3 tests** in the existing serial describe (sharing 13-01's fixture, per the
  collision reason that describe already records).
- `.planning/.../deferred-items.md` — **+2 rows** (the alarm token still in `request-countdown.tsx`'s
  source for 13-15's scan; the per-minute tick on a fifteen-minute display).

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run
concurrently, and neither was run alongside `npm run build`** (13-01's operational finding).

**Task 1**

| Criterion | Result |
|---|---|
| `grep -c 'from "@/components/ui/card"'` | **`0`** — it composes `PanelCard` through `MoneyStatement` |
| `card-pattern-coverage.test.ts`, zero new `ALLOWED_RAW_CARD` rows | **passes; that file is byte-unchanged** |
| `grep -ci 'destructive'` | **`0`** (after the collision recorded in *Deviations*) |
| `grep -c 'createCheckoutSession\|confirmBooking'` | **`0`** — the retry is a link |
| `grep -c 'book?hold='` | **`1`** |
| `grep -c 'TimerOffIcon'` | **`0`** |
| `grep -c '<main'` / `grep -c 'aria-live'` | **`0`** / **`0`** |
| `npx vitest run tests/booking/payment-states.test.tsx` | **7 passed** at this task (18 at plan end) |
| `npx tsc --noEmit` / `npx eslint` | exit 0 / 0 errors |

**Task 2**

| Criterion | Result |
|---|---|
| `git diff` matches no `POLL_INTERVAL_MS`/`MAX_ATTEMPTS`/`setInterval`/`clearInterval`/`routerRef` changed line | **zero matches** (grep over the +/- lines exits 1) |
| `grep -c 'Refresh status'` | **`1`** (after the collision recorded in *Deviations*) |
| `grep -cE '>Refresh<'` | **`0`** — and see the honesty note: this criterion was ALREADY satisfied before the change |
| `grep -ciE 'destructive\|went wrong\|try again\|error'` | **`0`**, comments included |
| `grep -c 'role="status"'` / `grep -c 'aria-live="assertive"'` | **`1`** / **`0`** |
| `npx vitest run tests/booking/payment-states.test.tsx` | **13 passed**, including all three thresholds |
| `npx tsc --noEmit` / `npx eslint` | exit 0 / 0 errors |

**Task 3**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/payment-states.test.tsx` | **18 passed** — every distinctness assertion |
| `grep -c 'replaceState\|ConsumePaidParam'` on the page | **`0`** — no consumer is mounted in this plan |
| `grep -c 'paid === "1"'` on the page | **`1`** — still the pending branch's only use (13-04's pin, 13-05's to move) |
| `selector-contract.test.ts` | **7 passed.** Both directions are one set comparison each, so a green run IS `Declared-but-absent: [none]` / `Rendered-but-undeclared: [none]` — the phrase prints only on failure (13-04 recorded the same) |
| behavioural proof (a), (b), (c) | **observed — see below** |
| `npm run build` | **exit 0** |

**The behavioural proof, run against the local dev server and 13-01's fixture** (`npx playwright test
e2e/shell.spec.ts --project=chromium --workers=1 -g "AC#4's sibling"`):

```
  ok 1 … /bookings/[id], its cancel and its group render exactly one `main` at 320px and 1280px (13.8s)
  ok 2 … a reversed booking renders its money statement with NO query string on the URL (3.8s)
  ok 3 … a pending booking with an EXPIRED hold never renders the not-completed state (D-70) (4.6s)
  ok 4 … a pending booking whose probe answers NOTHING degrades to the redirect, not to a money claim (3.9s)
  ok 5 … a pending booking whose checkout session is ACTIVE renders the not-completed state (4.0s)

  5 passed (34.6s)
```

- **(a) the pending-with-live-hold row renders `payment-state-incomplete`** — case 5, and it is the one
  case that needed a **real** PayMongo test-mode checkout session: the fixture writes a synthetic
  `cs_e2e_…` id, so no seeded row can ever make the provider answer `active`. The case mints one, points
  the row at it, and then asserts the hook, the `<h1>`, the money sentence and the retry's `href`, plus
  zero of the other two state hooks. It **skips** where `PAYMONGO_SECRET_KEY` is absent (D-35's CI secret
  boundary) — confirmed by a second, un-exported run reporting `1 skipped, 23 passed`.
- **(b) the pending-with-EXPIRED-hold row does NOT render it and lands on the reserve page's
  `HoldExpiredState`** — case 3, asserting the hook's count is 0, the URL is the reserve page's, and
  `Your hold expired` is on it. **Watched failing** — verbatim below.
- **(c) an unanswered probe degrades to the redirect rather than throwing** — case 4, which is the
  committed coverage on **every** machine: the fixture's synthetic session id can never resolve, with a
  key (a 404) or without one (no request at all), so `probeCheckoutSession` returns `null` on both paths
  and `readPaymentState` reads `indeterminate`. The case asserts the response status is < 400, the hook
  count is 0, and the URL is the redirect's.

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **148 files passed / 1 skipped; 1383 passed / 4 skipped** — exit 0. (13-06 closed at 147/1369 per its SUMMARY's count of +1 file; this plan adds one file and 18 tests.) |
| `npm run test:design` | **44 files, 776 passed / 3 skipped** — after the brand pins moved (see *Deviations*) |
| `npm run build` | **exit 0** |
| `npx playwright test e2e/shell.spec.ts --project=chromium --workers=1` | **23 passed, 1 skipped** — the skip is this plan's key-gated case |
| `git diff --stat HEAD -- drizzle/ src/lib/payments/refund-rail.ts package.json package-lock.json` | **empty — zero changes to all four** |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| fixture teardown | `SELECT count(*) FROM booking WHERE id LIKE 'e2e_landmark%'` → **0**, including after the deliberately failed run |
| stub scan on the three changed `src/` files | no `TODO`/`FIXME`/placeholder/"coming soon"/"not available" |

## The Watched Reds — verbatim

Four reds were observed. Two were deliberate probes of an assertion; one is the plan's headline proof;
one was **real** and is the most useful thing in this plan.

### 1. The real one — the alarm colour, reached through a child component

Case (7) of the RTL suite, against the component as 13-UI-SPEC literally specifies it (the shipped
`RequestCountdown`, no opt-out):

```
 FAIL  tests/booking/payment-states.test.tsx > D-70 — the not-completed state … > (7) paints NO alarm
       colour in the rendered tree, at either threshold
AssertionError: the alarm colour reached the calmest surface in the phase: expected [ 'text-destructive' ]
to deeply equal []

- Expected
+ Received

- []
+ [
+   "text-destructive",
+ ]
```

**Read what that says.** The countdown reddens its digits when `remaining <= HOUR_MS`. On a fifteen-minute
hold that condition is true from the first paint to the last, so the emphasis is not a threshold — it is
the whole display, permanently, on the one payment state where nothing has gone wrong at all. 13-UI-SPEC
§ Color states the contract in those terms ("a reversed payment, a failed checkout, a settling webhook
and a cancelled booking are **not errors the booker caused**"), and this plan's own threat register
carries `T-13-07-ALARMCOLOUR` as *zero destructive tokens … on both states*.

**And no source scan could have caught it.** 13-15's gate scans the FILES under
`src/components/booking/**` for the token; `not-completed-state.tsx` contains it zero times and always
would have. The token arrives from one import away, so the only instrument that can see it is one that
renders. That is why case (7) reads the rendered tree.

**The first draft of that case was itself wrong, and the correction is worth as much as the case.** It
was a substring match over `container.innerHTML`, and it reported the defect — plus every other surface
in the repository, because the vendored button recipe carries `aria-invalid:border-destructive` and
`dark:aria-invalid:border-destructive/50` on **every** button in the app. Those are state-scoped rules
that paint nothing until a control is invalid. The case now matches only bare paint utilities
(`^(text|bg|border|ring)-destr…`), and the distinction is recorded at the assertion because it was
measured rather than guessed.

### 2. The headline — D-70's boundary, removed

The page's liveness check dropped (`holdExpiresAt !== null`) and the probe condition short-circuited, so
any `pending` row rendered the new state. Case 3 of the e2e:

```
  x  3 [chromium] › e2e\shell.spec.ts:807:7 › AC#4's sibling — one `main` landmark on the booking routes
     › a pending booking with an EXPIRED hold never renders the not-completed state (D-70) (8.2s)

    Error: /bookings/e2e_landmark_pay_pendingExpiredHold_38e5ee41-6700-468f-a42a-57c6a7c8c3d5: the
    not-completed state rendered for a hold that has already lapsed. D-70 forbids it in those words:
    `hold-expired-state.tsx` owns that landing, and two surfaces telling a booker their hold is gone is
    two surfaces to keep true about one fact.

    expect(locator).toHaveCount(expected) failed

    Locator:  getByTestId('payment-state-incomplete')
    Expected: 0
    Received: 1
    Timeout:  5000ms

    Call log:
      - waiting for getByTestId('payment-state-incomplete')
        - locator resolved to 2 elements
        - unexpected value "2"
        13 × locator resolved to 1 element
           - unexpected value "1"

  1 failed
  2 did not run
  2 passed (32.8s)
```

Three things this proves beyond "it went red". The failure **names the seeded expired-hold row by id**,
so the assertion genuinely reached that row rather than a stale page. The two tests before it stayed
**green in the same run**, so the red is about this branch and not about the fixture or the login.
And the transient `resolved to 2 elements` at the first poll is the staged-copy overlap this spec file
already documents at ~100ms — it settles to 1 for the remaining 13 polls, which is the live document.

Restored via the saved copy; re-run: `5 passed (34.6s)`.

### 3. D-95's label, reverted

`Refresh status` → `Refresh`, nothing else changed. **Three** cases moved, which is what shows the label
is asserted from more than one direction:

```
 FAIL  … > (2) past the poll cap: the payment is safe, the booking is held, and an email is coming
AssertionError: expected [ 'Refresh' ] to deeply equal [ 'Refresh status' ]

 FAIL  … > (5) offers NO failure-shaped affordance and NO alarm colour at ANY of the three thresholds
AssertionError: past the poll cap: a second control appeared beside the refresh: expected [ 'Refresh' ]
to deeply equal []

 FAIL  … > (6) the manual control runs the same refresh the poller ran — it retries nothing
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name
"Refresh status"
```

The third failure is the one that matters: the control is found **by its accessible name**, which is the
property D-95 is actually about. The `>Refresh<` grep in the acceptance criteria is a weaker instrument
than it looks — see the honesty note below.

### 4. The distinctness suite, proved able to fail

`RotateCcwIcon` → `Undo2Icon` in the not-completed state, so two of the three states share a glyph:

```
 FAIL  … > STATE-05 — the three payment states are three visibly different things > (3) three distinct icons
AssertionError: two payment states share a glyph: ["lucide-undo2 lucide-undo-2","lucide-loader-circle",
"lucide-undo2 lucide-undo-2"]. 13-UI-SPEC gives each of the three its own precisely so the difference
survives being skimmed.: expected 2 to be 3
```

The failure message prints all three resolved glyphs, so a future reader sees WHICH two collided rather
than that a number moved. The other four cases in that describe stayed green.

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 — Missing critical functionality] `RequestCountdown` gained an opt-out for its final-hour emphasis**

- **Found during:** Task 1, by the RTL case rather than by reading.
- **Issue:** 13-UI-SPEC names this component for the hold display. It paints its digits with the alarm
  token whenever under an hour remains — always true on a fifteen-minute hold — so the specified reuse
  ships a permanently red countdown on a surface whose contract is that the token renders nowhere
  (13-UI-SPEC § Color; this plan's `T-13-07-ALARMCOLOUR`, whose mitigation is *zero destructive tokens
  … on both states*).
- **Fix:** one optional prop, `finalHourEmphasis`, **defaulting to `true`**. Both shipped call sites (the
  host inbox SLA and the booker payment window) are unchanged in every respect — verified by grep: no
  other call site passes the prop. `not-completed-state.tsx` opts out and says why at the line.
- **Why a prop rather than a rule.** Deriving the emphasis from the horizon (suppressing it when the
  window was already under an hour at mount) would have changed behaviour on a shipped surface: a booker
  arriving late in their payment window would silently lose the emphasis that surface intends. An
  explicit opt-in keeps the change confined to the one caller that wants it.
- **What this does NOT do:** the token still exists in `request-countdown.tsx`'s source, so 13-15's scan
  over `src/components/booking/**` will report that file. It would have reported it before this plan too.
  Recorded in `deferred-items.md` so nobody reads it as a regression this plan introduced, and
  `tests/booking/payment-states.test.tsx` asserts the rendered trees of both 13-07 states are free of it.
- **Commit:** `09495ab`.

**2. [Rule 3 — Blocking] Both selector rows shipped in their literal's commit, not in Task 3**

- **Issue:** the plan's file list assigns `selector-contract.ts` to Task 3, but the contract is
  bidirectional — a declared id with no call site is as red as a call site with no declaration
  (`selector-contract.test.ts` assertions 1 and 2). Declaring both rows in Task 3 would have made Tasks 1
  and 2 red in one direction; declaring them early would have made Task 1 red in the other.
- **Fix:** `payment-state-incomplete` shipped in `09495ab` with its literal, `payment-state-pending` in
  `fadbfec` with its literal. 13-04 recorded the same rule for the same reason one plan earlier.

**3. [Rule 3 — Blocking] `page.tsx`'s pending call site was updated in Task 2, not Task 3**

- **Issue:** Task 2 gives `PendingPaymentState` two required props. Leaving the single call site
  un-updated would have left the tree failing `tsc` and `next build` at that commit.
- **Fix:** the two props are passed in the same commit, from the session and the reference deriver the
  page already imports. Everything else in Task 3's page work is in `e196cdd`.

**4. [Rule 3 — Blocking] The pending state's outer card was removed**

- **Issue:** the plan says to change nothing but the copy and the escalation. But `MoneyStatement`
  composes `PanelCard`, and mounting it inside the existing `<Card>` reproduces exactly the
  double-block-padding trap plan 13-04 removed from the reversed state (measured at 112px against 80px
  for the row card's twin).
- **Fix:** the container is now the `BOOKING_SHELL` div and a `space-y-6` stack, which is the shape
  13-UI-SPEC § The Booking Detail Page specifies for all three payment states and which the reversed
  state already carries. The poll mechanics are untouched; the criterion that measures that is the diff,
  and it is clean.
- **Note:** `pending-payment-state.tsx` and `payment-reversed-state.tsx` are both still listed in
  `card-pattern-coverage.test.ts`'s `ALLOWED_RAW_CARD` although neither opens a raw card any more. Stale
  rows on that list are tolerated by the gate (13-04 left the same one), and pruning them is a
  measurement of `EXPECTED_SURFACES` that belongs to whichever plan re-measures that pin.

**5. [Rule 3 — Blocking] Three brand-recipe pins moved**

- **Found during:** Task 3's `npm run test:design`.
- **Issue:** `brand-recipe.test.ts` pins the accent call sites per file and in total. The new state adds
  two `variant="brand"` sites in one file, so `17 → 19`, `22 → 24`, and one map row.
- **Fix:** all three re-measured **in the same commit as the surface**, each with the reason recorded
  where the number lives. The reason is a new one for that file: unlike the checkout bar's two (both real
  elements in one document, `hidden`-swapped), these two are the arms of a **runtime conditional** — the
  retry is unmounted and replaced in place when the countdown reaches zero — so the rendered document
  holds exactly one coral at every instant. `ACCENT_USES` is untouched at 10, which is the pin
  13-UI-SPEC actually cares about (no new KIND of accent use), and the rendered count is asserted
  directly in the RTL suite rather than inferred from the map.
- **Commit:** `e196cdd`.

**6. [Rule 3 — Blocking] Two more grep-versus-prose collisions**

- **Issue A (the seventh instance in this phase).** Task 1's criteria include
  `grep -c 'createCheckoutSession\|confirmBooking'` returning **0** and `grep -ci 'destructive'`
  returning **0**, while Task 1's action instructs the file to carry a comment *naming* the server action
  and the double-charge reason. Writing the instruction as worded fails the criterion.
- **Issue B, and it is a NEW DIRECTION.** Task 2's criterion is `grep -c 'Refresh status'` returning
  **exactly 1**. Every previous instance of this collision has been a **ban** tripped by its own
  documentation; this one is a **count**, tripped by documenting the label in the header as well as
  writing it at the control. The first draft made it read 2 against a correct file.
- **Fix:** both files name the identifiers and the label descriptively, per `booking-row.tsx:112`, and
  each records that the omission is deliberate and must not be "helpfully" corrected. Every word of the
  reasoning survives in both.

### Recorded judgements (where two documents differ, or a plan clause needed a reading)

**A. The pending state renders no status-meaning sentence, and the not-completed state renders half of
one.** 13-UI-SPEC's status table gives `pending (settling)` *"Your payment reached us. We're waiting on
the final confirmation."* — which is the money statement's two lines verbatim, and the money statement is
three lines below the `<h1>`. One sentence twice on one page is not emphasis. For
`pending (not completed)` the table gives *"This checkout didn't finish. Your slot is still held."*, and
its second half is the money statement's line 2 word for word; the heading block carries the first half
only. 13-04 recorded the same class of reading on the reversed state.

**B. `SupportPath`'s presentation differs between the two states, and 13-UI-SPEC is why.** The plan says
"render `<SupportPath/>` in its trust-block slot" for the not-completed state and "inside the panel" for
the pending state past its escalation. That matches the guard-state table exactly: the in-panel control
belongs to the reversed state and to the pending state past escalation; every other status gets the
trust-block row. The row sits in a `<dl>` that is **empty today**, because the guard is closed — and that
is deliberate rather than sloppy: the alternative is this file testing `SUPPORT_EMAIL` itself, which is
precisely the unguarded-parent shape `site-contacts.test.ts` exists to catch. The trust block proper
belongs to a later plan; this is the slot it will occupy.

**C. The escalation sentence is ONE wording, true in both guard states.** 13-UI-SPEC's table gives the
pending state a guard-closed line and a longer guard-open one. A component cannot select between them
without testing the constant, which no caller may do. The line therefore names the **reference** — a real
mechanism with the guard closed, and the exact string the guarded control's subject line carries when it
opens — and never a channel. It reuses the reversed state's closed-guard half-sentence verbatim, because
it is the same fact about the same string.

**D. The escalation threshold is 120_000 ms.** 13-UI-SPEC § Open Questions 4 recommends ~2 minutes and
leaves it to the executor. The value carries a floor and a ceiling in the constant's own docblock: the
healthy webhook round trip is measured in **seconds** (`payments/config.ts` records two PayMongo round
trips plus two local UPDATEs at ~2s), so two minutes is ~60× a healthy settlement and cannot fire on one;
and a booker two minutes into a spinner has already decided something is wrong, so anything longer offers
help after it stopped being help.

## Honesty notes — two criteria that are weaker than they look

**1. `grep -cE '>Refresh<'` returning 0 was ALREADY TRUE before this plan.** The shipped JSX wrapped the
label on its own line, so the pattern never matched. It is reported as satisfied because it is, but it is
not evidence: the assertion doing the work is the RTL case that queries the control **by accessible
name** and fails when the label is reverted (Watched Red 3).

**2. Case 3 of the e2e is an ABSENCE, and its non-vacuity comes from its neighbour rather than from a
contrived red.** `getByTestId('payment-state-incomplete')` is asserted `toHaveCount(0)` on the expired row
and `toHaveCount(1)` on the live row **in the same run, at the same URL shape, under the same login**. A
locator that resolved to nothing for a mechanical reason (a wrong id, a bad login, a 404) would fail the
second assertion. The deliberate red in Watched Red 2 confirms it from the other direction.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no schema change and no new trust boundary
beyond the three its own register names.

- **T-13-07-DOUBLECHARGE** (Tampering) — mitigated **and asserted**. The retry is a `<Link>` into the
  reserve page; `grep -c 'createCheckoutSession\|confirmBooking'` over the component returns 0, and the
  RTL case pins the `href` to the shipped `?hold=` path.
- **T-13-07-FALSENOTCHARGED** (Repudiation) — mitigated **and proved**. A null probe lands on the
  redirect, asserted by e2e case 4 on every machine, and the failure direction is argued in the branch
  itself rather than in a planning document.
- **T-13-07-POLLNAV** (DoS) — mitigated. `grep -c 'replaceState\|ConsumePaidParam'` over the page returns
  0; no consumer is mounted at or above the pending branch, and the branch's comment states the rule and
  names 13-11 as its owner.
- **T-13-07-FAKECONFIRM** (Spoofing) — mitigated. The poller still only calls `router.refresh()`; the
  mechanics diff is clean, and an RTL case asserts the state never renders a confirmed claim after the
  manual control is pressed.
- **T-13-07-ALARMCOLOUR** (Repudiation) — mitigated, **and it was the one threat that had actually
  materialised**. See Watched Red 1 and Deviation 1.
- **T-13-07-PROBEDOS** (DoS) — mitigated by 13-03's deadline, and this plan adds a second layer: the
  probe runs only for a row whose hold is still alive, so the common pending visit pays no round trip.
  e2e case 4 asserts the page still renders (< 400) when the provider answers nothing.
- **T-13-07-SC** (supply chain) — discharged trivially. **Zero packages installed**; `package.json` and
  `package-lock.json` byte-unchanged.

## Known Stubs

None. Two deliberate absences, neither of which is a stub:

- **`SupportPath` renders nothing at runtime on both states.** That is D-64 — the one line that changes
  is `src/lib/site.ts:70`, and it is an operator action, not an executor's.
- **The `<dl>` on the not-completed state is empty while that guard is closed.** Explained at the call
  site; the alternative would have put an unguarded literal in an unguarded file.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [STATE-05, STATE-06]`, and **neither was marked complete.**

- **STATE-05** is also carried by `13-01`, `13-02`, `13-03`, `13-04`, `13-15` and `13-16`, and
  13-UI-SPEC § The Support Path states it **closes as PARTIAL at phase end** — code-complete,
  address-pending, carried as a named `human_needed` item — because `SUPPORT_EMAIL` is `null` (D-64).
  This plan makes the "three visibly distinct states" half true and proves it; it is not the plan that
  closes the ID.
- **STATE-06** is also carried by `13-02`, `13-04`, `13-10` and `13-15`. Its falsifiable form is
  **geometric** (the money statement's box inside a 320×568 viewport, both themes, all three states) and
  that measurement belongs to 13-15. What this plan contributes is the third and second surfaces for it
  to measure, plus the per-document count of exactly one, asserted in RTL.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `src/components/booking/not-completed-state.tsx` — FOUND
- `tests/booking/payment-states.test.tsx` — FOUND
- `src/components/booking/pending-payment-state.tsx` — FOUND (modified)
- `src/components/booking/request-countdown.tsx` — FOUND (modified, +1 prop)
- `src/app/(app)/bookings/[id]/page.tsx` — FOUND (modified)
- `src/lib/design/selector-contract.ts` — FOUND (modified, +2 rows)
- `tests/design/brand-recipe.test.ts` — FOUND (modified, 3 pins)
- `e2e/shell.spec.ts` — FOUND (modified, +3 tests)

Commits claimed, verified in `git log`:

- `8184796` — FOUND
- `09495ab` — FOUND
- `fadbfec` — FOUND
- `e196cdd` — FOUND
