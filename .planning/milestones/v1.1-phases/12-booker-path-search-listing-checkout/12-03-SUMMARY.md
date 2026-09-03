---
phase: 12-booker-path-search-listing-checkout
plan: 03
subsystem: booking
tags: [react-context, app-router, a11y, aria-live, playwright, page-clock, gate-03, gate-04, shell-03, d-49, d-59]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 01
    provides: "HOLD_COUNTDOWN_BOX (the 32 × 96px header reservation), consumed here at its first and only call site"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "SiteChrome's `actions` slot left empty with Phase 12 named as its owner, AUTH_SLOT_BOX / HEADER_HEIGHT, SELECTOR_CONTRACT + its bidirectional gate, e2e/helpers/theme.ts, shell.spec.ts's box-stability idiom"
  - phase: 4
    provides: "book/page.tsx's owner-gated hold read + path-id cross-check, HoldCountdown, HoldExpiredState, ReserveView's D-44 expiry swap"
provides:
  - "HoldProvider / useHold — the bidirectional checkout context: expiresAt published DOWN by the page, expired published UP by the countdown"
  - "PublishExpiresAt — the page's one client leaf, renders nothing, writes one already-authorised ISO string"
  - "A checkout header that provably does not reflow: four countdown states, one box, three widths, two themes"
  - "GATE-03's announce-once property as a measured text-change count (toBe(1)) in BOTH jsdom and a real browser"
  - "The one labelled way back — `/listings/{id}?date=&start=&end=`, no resume param, asserted from the DOM"
  - "e2e/helpers/booker-seed.ts — the shared per-run seed, ordered teardown, and the verbatim venue-tz day math every later Phase-12 spec imports"
  - "The repository's first page.clock user, with the install-before-navigate caveat recorded and the pauseAt-alone failure measured"
affects: [12-04, 12-05, 12-06, 12-09, 12-10, 12-11, 12-12, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A bidirectional client context as the App-Router seam for a value a layout must display and only its page may read"
    - "A keyed inner component so a lazy useState initializer can run at the moment a late-arriving prop lands (react-hooks/purity forbids Date.now() during render)"
    - "A live region that keeps its text and DROPS its aria-live rather than unmounting — silent to AT, and measurable by a text-change counter"
    - "page.clock: freeze first with pauseAt, then jump by a MEASURED delta with fastForward; pauseAt to an absolute instant does not move a running page's digits"
    - "A reachability guard must name something only the RESOLVED body renders — loading.tsx can carry the same <h1>"

key-files:
  created:
    - "src/components/booking/hold-provider.tsx"
    - "src/components/booking/hold-publisher.tsx"
    - "tests/booking/hold-countdown.test.tsx"
    - "e2e/helpers/booker-seed.ts"
    - "e2e/hold-countdown.spec.ts"
  modified:
    - "src/app/listings/[id]/book/layout.tsx"
    - "src/app/listings/[id]/book/page.tsx"
    - "src/components/booking/hold-countdown.tsx"
    - "src/components/booking/reserve-view.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/booking/partial-grant-notice.test.tsx"
    - "e2e/shell.spec.ts"
    - "e2e/search-and-book.spec.ts"
    - "e2e/open-capacity.spec.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "On expiry the sr-only region KEEPS its text and loses its `aria-live` instead of unmounting. Unmounting is equally silent but makes the region's text 'change' to nothing at exactly the instant the gate counts changes — a node that disappears is indistinguishable, to a text-change counter, from one that was rewritten"
  - "The threshold message LATCHES. The shipped one-second window ('' -> msg -> '') was TWO changes, and the second is a live-region update to empty"
  - "`page.clock.pauseAt(<absolute instant>)` did NOT move the digits — measured, then replaced by pauseAt-to-freeze + fastForward-by-delta, the mechanism case (b) proves exact"
  - "The e2e reads TWO boxes, not the one the plan names: site-header is full-bleed and fixed-height, so it cannot move whatever the slot does. Same lesson shell.spec.ts recorded for AUTH_SLOT_BOX"
  - "SHELL-03's PRESENCE half is a new describe rather than three more lines in AC#5, because AC#5's served-document measurement cannot make a presence claim and must keep running without a seed"
  - "The publisher is its own module, not a third export of hold-provider.tsx — the context module's export surface is what 12-10/12-11/12-13 import"
  - "The way-back window is recomposed from the hold's OWN frozen instants, not forwarded from a search param this page never receives"

patterns-established:
  - "Watch the red from BOTH layers: the same mutation is required to fail the jsdom gate and the browser gate, and a mutation only one catches means the other is decorative"
  - "A reachability guard names a RESOLVED-ONLY artifact (`price-total`), because book/loading.tsx renders the same <h1> as the page"
  - "Absence gates stay seed-free and separate from the presence gate that needs a seed"

requirements-completed: [SHELL-03]

# Metrics
duration: 2h05m
completed: 2026-08-18
---

# Phase 12 Plan 03: The Hold Context, the Header Countdown, and the One Way Back — Summary

**The live hold countdown now renders in the checkout header from a bidirectional context the layout owns — the page publishes `expiresAt` down, the countdown publishes `expired` back up — announcing exactly once across a fifteen-minute hold (measured as a text-change count of `1`, in jsdom and in Chromium) inside a box that is byte-identical in all four of its states at three widths in both themes, with exactly one labelled way back that cannot mint a second hold.**

## Performance

- **Duration:** ~2h05m
- **Started:** 2026-08-18T11:40Z
- **Completed:** 2026-08-18T13:45Z
- **Tasks:** 3
- **Files:** 10 modified, 5 created (+1,732 / −72)

## Task Commits

1. **Task 1: HoldProvider and the layout/page composition** — `91718a1` (feat)
2. **Task 2: The header countdown slot, its two GATE-03 changes, and the one way back** — `95ecec7` (feat)
3. **Task 3: The shared booker fixture, and the clock-driven header gate** — `84fd6b2` (test)

## Accomplishments

- **The seam exists, and the layout is still a Server Component.** `grep -c '"use client"' "src/app/listings/[id]/book/layout.tsx"` returns **0** — and getting there took one deliberate correction, see the findings. `HoldProvider` wraps both `SiteChrome` and `{children}`; `{children}` is an already-rendered server node passed through as a prop, so the page's owner gate, its db reads and every money computation on the route stay server-side (GATE-05).
- **The owner gate is byte-unchanged.** `git diff` on `book/page.tsx` across the whole plan touches the hold read, the path-id cross-check and neither `notFound()` call. The publisher receives an already-authorised value; the layout fetches nothing; the context carries one ISO string and one boolean and has nowhere to put anything else (T-12-03-HOLDIDOR).
- **The wiring inverted cleanly.** `grep -n "onExpire" src/components/booking/reserve-view.tsx` returns nothing. `ReserveView` reads `expired` from the context and keeps the two routes into the expiry state separate — `timedOut` (a display cue) and `confirmFailed` (the server, the only authority) — because merging them would give the client cue and the server verdict one write path.
- **GATE-03's two changes landed, and each is measured from two sides.** The expiry arm is deleted (rule 6 — `HoldExpiredState` owns that announcement) and the threshold message latches. The property is asserted as `toBe(1)` in `tests/booking/hold-countdown.test.tsx` and again in `e2e/hold-countdown.spec.ts`, and the same mutation turns both red.
- **The header cannot reflow.** Four states — empty slot, `14:52`, `0:09`, `Hold expired` — read at 375 / 768 / 1280 in both themes, comparing the `site-header` box AND the `hold-countdown` box. Twelve captures per theme, all equal.
- **The booker is not trapped.** Exactly one `<a href>` inside `<main>`, reading `Back to the listing`, pointing at `/listings/{id}` with the window recomposed from the hold's own frozen instants, carrying no resume discriminator, with `We'll keep your hold — the timer keeps running.` beneath it. Asserted from the DOM, on a live hold.
- **`page.clock` has a first user, with its caveats written down rather than discovered again.** Install before the first `goto`; jump with `fastForward` from a frozen clock, never with `pauseAt` to an absolute instant; and `fastForward` fires due timers *at most once*, which is what makes a 15-step minute-by-minute drive 15 samples instead of 900.
- **Every later Phase-12 spec has a fixture to import.** `e2e/helpers/booker-seed.ts` carries the per-run-UUID seed, the ordered teardown and BYTE-IDENTICAL copies of the venue-tz day math, `selectTargetDay` and `pickWindow`. `e2e/price-parity.spec.ts` is **byte-unmodified** (`git diff --stat` empty) and still green, with `DATABASE_URL` still its only env input.

## The measured findings

### 1. My own comment would have failed the acceptance criterion, and this file predicted it

Task 1's criterion is a **zero-count grep** for the client-boundary directive over `book/layout.tsx`. The first draft of the new header paragraph said *"THIS FILE HAS NO `"use client"` DIRECTIVE AND MUST NOT ACQUIRE ONE"* — and `grep -c` returned **1**, on a tree that was exactly correct.

`layout.tsx`'s own header already records this collision, calling it *"the eleventh instance of one recurring collision in this phase"* and naming the rule: **name the thing you are refusing, do not spell it**. The paragraph is rewritten descriptively and now records itself as the twelfth. `grep -c` returns 0.

### 2. `react-hooks/purity` forbids the obvious shape, and the fix is a `key`

`expiresAt` is `null` on the server render and arrives after mount, so the ticking half cannot seed its state at the outer component's first render. The obvious spelling — deriving `remaining` during render — fails the build:

```
src/components/booking/hold-countdown.tsx
  82:63  error  Error: Cannot call impure function during render
  `Date.now` is an impure function. …
> 82 |   const remaining = target === null ? null : target - (now ?? Date.now());
```

The shape that works splits the ticking half into `LiveCountdown` with `key={expiresAt}`: it MOUNTS the moment the deadline lands, so its lazy `useState` initializer runs then, with the real target in hand. One deadline, one timer instance, no impure render.

### 3. `page.clock.pauseAt(<absolute instant>)` does not move a running page's digits

The plan prescribes reaching each state with `pauseAt`. Run verbatim, the countdown did not move:

```
Error: court: the countdown did not reach 14:52 after pausing the clock there.
Observed: "Time left to confirm30:00"
```

`pauseAt` fires due timers *at most once*, and from a **running** clock that one tick landed at its own scheduled instant rather than at the jumped-to one. The shape that works is **freeze first, then jump by a measured delta**: `pauseAt(now + 1s)` to stop the clock, then `fastForward(expiresAt - remainingTarget - now)`. Case (b) proves that mechanism exact — fifteen one-minute jumps decrement the remainder by exactly sixty seconds each and put the threshold announcement on the fourteenth step to the millisecond. Freezing first is also what makes the deltas exact: while the clock runs, real time passes between reading `Date.now()` and issuing the jump, and a few hundred milliseconds is the difference between rendering `14:52` and `14:51`.

### 4. The `<h1>` is not a reachability signal on this route — `book/loading.tsx` renders the same one

The first green-looking run of the new spec reported *"the document holds 0 role=timer elements"* and looked like a component defect. It was not. `main`'s entire text content read:

```
[probe] mainTail: Review and bookLoading your booking
```

`app/listings/[id]/book/loading.tsx` renders the **same** `<h1>Review and book</h1>` as the resolved page. A guard built on the h1 — the obvious spelling, and the one `shell.spec.ts` legitimately uses on a route where it is sufficient — passes against the SKELETON, and every assertion under it runs against a body that has not arrived. Both the helper (`placeHold`) and the spec's own guard now wait for `price-total`, which exists only in the resolved body, and the expired-body mode waits for `HoldExpiredState` instead — because `book/page.tsx` returns that state **directly**, with no `<main>` and no `<h1>` at all.

### 5. `/` streams two `SearchBar`s, and every spec addressing one by id is racing it

```
Error: locator.click: strict mode violation: locator('#search-category') resolved to 2 elements
```

Measured on the served document: `id="search-category"` at byte **11,713** (the `(public)/loading.tsx` fallback's own `SearchBar`) and again at **84,158** (the resolved page), with React's first completion segment at **26,879** between them. Fixed inside the new helper with a `toHaveCount(1)` wait that states the reason. The shipped specs use the same bare locator and get away with it only because they happen to arrive late — logged.

### 6. A stale dev server cost thirty minutes, and `shell.spec.ts` had already written the warning

Three separate probes said the publisher's effect never ran while `ReserveView` and `HoldCountdown` both hydrated fine. The actual cause: the dev server on :3000 had been running since before the plan started and was serving a **stale compilation of `book/page.tsx`** — a probe for the new back link returned `NONE`. `e2e/shell.spec.ts:56-63` records exactly this trap for CSS (*"IF THIS FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING THE COMPONENT"*). It applies to route modules too. Killing :3000 and letting Playwright boot a fresh one was the fix.

## Watched reds (all run, all reverted, tree clean after each)

| # | Probe | Mutation | Observed |
|---|---|---|---|
| A | `SELECTOR_CONTRACT` compile gate | the `hold-countdown` row deleted, `SELECTOR_IDS` untouched | `npx tsc --noEmit` → exit 2, one error (verbatim below) |
| B | `tests/booking/hold-countdown.test.tsx` | the expiry arm restored + unconditional `aria-live="polite"` | **3 failed / 2 passed** — case (3) at a change count of 2, case (4) on the surviving live region, case (5) on the laptop-lid announcement |
| C | `e2e/hold-countdown.spec.ts` case (b) | same mutation | change count **2**, with the whole sampled sequence printed |
| D | `e2e/hold-countdown.spec.ts` case (a) | `HOLD_COUNTDOWN_BOX` → `min-w-0` at the slot | the **countdown** box fails naming both states and both widths; the **header** box stayed green |

**A, verbatim and unwrapped:**

```
src/lib/design/selector-contract.ts(175,14): error TS2741: Property '"hold-countdown"' is missing in type
'{ "price-total": { why: string; owner: string; }; "skeleton-card-grid": { why: string; owner: string; };
"skeleton-row-list": { why: string; owner: string; }; "skeleton-panel": { why: string; owner: string; };
"result-card": { ...; }; ... 11 more ...; "legal-placeholder-notice": { ...; }; }' but required in type
'Record<"price-total" | "skeleton-card-grid" | "skeleton-row-list" | "skeleton-panel" | "result-card" |
"row-card" | "panel-card" | "page-header" | "empty-state" | "error-state" | ... 7 more ... |
"hold-countdown", SelectorRow>'.
```

Row restored → `npx tsc --noEmit` exit 0. This is the same shape `selector-contract.ts`'s header records for `"panel-card"` in August, now with the id it was written to catch.

**C, verbatim:**

```
Error: the region's text changed 2 times. GATE-03 requires EXACTLY ONE — this is an upper bound, which is
why it is toBe(1) and not toBeGreaterThan(0): every extra change is an extra sentence spoken over the booker,
and a >= assertion is green for the defect. Samples: [{"minuteMark":14,"text":""},…,
{"minuteMark":1,"text":"One minute left to confirm your booking."},
{"minuteMark":0,"text":"Your hold has expired."}]
```

**D, verbatim — and the finding is which box fired:**

```
Error: court · 375px: the hold-countdown box CHANGED SIZE between "14:52" and "0:09".
{"x":299.23,"y":17.5,"width":59.77,"height":20} vs {"x":307.64,"y":17.5,"width":51.36,"height":20}.
HOLD_COUNTDOWN_BOX is the reservation that makes all four states occupy one box; without it the slot
shrink-wraps to whichever string is currently in it and the header's contents shuffle as the hold runs down.
```

The `site-header` assertion runs FIRST in that loop and **passed**. `site-header` is `HEADER_HEIGHT` tall and full-bleed, so its box is a function of the viewport and cannot move whatever the slot inside it does — the plan's prescribed box would have been green for the defect. `e2e/shell.spec.ts:92-112` records the identical finding for `AUTH_SLOT_BOX` ("the probe as prescribed is VACUOUS"). Same lesson, second time; the spec now reads both boxes and says why.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The publisher needed its own module, and Task 1 had to touch `hold-countdown.tsx`**

- **Found during:** Task 1.
- **Issue:** Task 1's acceptance criterion is that `hold-provider.tsx` exports *exactly* `HoldProvider` and `useHold`, so the page's client publisher cannot live there. And Task 1 must fill the header's `actions` slot with "the component Task 2 builds", which does not compile while `HoldCountdown` still takes a required `expiresAt` prop.
- **Fix:** `src/components/booking/hold-publisher.tsx` (new) exports `PublishExpiresAt` — a `"use client"` leaf that renders nothing and writes one already-authorised ISO string. `hold-countdown.tsx` was made prop-less and context-driven in Task 1 (its markup, geometry and GATE-03 semantics all landed in Task 2 as planned).
- **Files:** `src/components/booking/hold-publisher.tsx` (created), `src/components/booking/hold-countdown.tsx`
- **Committed in:** `91718a1`
- **Naming note for the reader/verifier:** the plan's `key_links` names the pattern `publishExpiresAt`. React components are PascalCase, so `book/page.tsx` renders `<PublishExpiresAt …/>` and the lowercase `publishExpiresAt` — the context member it writes through — appears in `hold-provider.tsx` and `hold-publisher.tsx`. A case-sensitive grep of `page.tsx` for the lowercase spelling finds nothing; the link is real and the component is its only caller.

**2. [Rule 3 - Blocking] `tests/booking/partial-grant-notice.test.tsx` renders the page tree with no provider**

- **Found during:** Task 1 (`npx vitest run tests/booking` → 8 failed, `Error: useHold must be used within a HoldProvider`).
- **Issue:** the file awaits `ReservePage(...)` and renders the result directly. In production that tree's layout IS `HoldProvider`.
- **Fix:** `renderPage` wraps in `<HoldProvider>`, with a docblock saying that this reproduces the real composition rather than weakening the hook — `useHold` refuses a null-ish default on purpose.
- **Verification:** 13 passed; `npx vitest run tests/booking` 33 files / 328 passed.
- **Committed in:** `91718a1`

**3. [Rule 1 - Bug] Three shipped e2e assertions pinned the rail copy the countdown took with it**

- **Found during:** Task 3 (full-suite run).
- **Issue:** `e2e/search-and-book.spec.ts:282` and `:346` and `e2e/open-capacity.spec.ts:692` assert `getByText(/Held for/i)` — the rail sentence D-49 replaces. All three went red on a correct tree.
- **Fix:** each now asserts both halves **where they now live**: `We're holding this for you while you review.` in the rail, and `page.getByTestId("site-header").getByRole("timer")` for the digits. The `role="timer"` queries are preserved (D-32's floor is about accessible queries, and none was converted). `search-and-book.spec.ts`'s file header prose was corrected too.
- **Files:** `e2e/search-and-book.spec.ts`, `e2e/open-capacity.spec.ts`
- **Verification:** `search-and-book` 3 passed (see the note under Issues), `open-capacity` 6 passed.
- **Committed in:** `84fd6b2`

**4. [Rule 3 - Blocking] `openSeededListing` raced `/`'s streamed duplicate `SearchBar`**

- **Found during:** Task 3. Finding 5 above.
- **Fix:** a `toHaveCount(1)` wait inside the helper carrying the measured byte offsets as its reason.
- **Committed in:** `84fd6b2`

### Scope adjustments recorded rather than absorbed

- **The e2e reads TWO boxes where the plan names one.** Recorded as watched red D: the header box alone would have been green for the mutation the plan itself prescribes.
- **SHELL-03's presence half is its own describe in `shell.spec.ts`, not three more lines in AC#5.** AC#5 measures the SERVED document precisely so it needs no seed; a presence claim cannot be made against a not-found boundary. Merging them would have put a seed dependency on the cheap absence gate. Both halves now exist and the file header says which is which.
- **The e2e re-freezes the hold's TTL before the GEOMETRY run only.** A fake clock moves only forward, and reaching the checkout burns ~5s of a 15-minute hold, so "pause at 14:52 remaining" is a target seconds away on a fast machine and already past on a slow one. What the countdown renders is the REMAINDER, so the box measured at 14:52 is the box a real hold shows at 14:52. **Case (b) does not do this** — the announce-once property is driven against the deadline the server actually froze.
- **The empty-slot state is reached as a REAL product state**, by cancelling the hold so `book/page.tsx` never mounts its publisher — not by racing hydration or truncating a document. That is exactly the context state a booker sees on the server's first paint of this route.
- **SHELL-03 is marked complete; GATE-03 is not, and the split was CHECKED rather than assumed.** `grep -ln "SHELL-03\|GATE-03" 12-*-PLAN.md` over the phase returns this plan for SHELL-03 **alone**, and this plan plus **12-06** for GATE-03. SHELL-03's text — *"checkout carries its own minimal header holding the wordmark and the live hold countdown, with no navigation that can silently lose an active hold"* — is fully delivered here and asserted in a browser from both sides (zero header anchors, zero footers, exactly one labelled `<a href>` in `<main>` that cannot mint a hold). GATE-03's text is *"the countdown timer **and every live status region**…"*, and 12-06 owns declaring what "every" means for this phase plus fixing the four other regions; this plan lands only the countdown's half, so marking it here would make `REQUIREMENTS.md` claim a phase-wide sweep that has not happened.
- **`DECLARED_ID_FLOOR` in `tests/design/selector-contract.test.ts` is still 17 with 18 ids declared.** It is a FLOOR and 18 ≥ 17 passes; raising it was not needed to make anything green and the file is outside this plan's declared surface. Noted so the next plan that adds a row can tighten it deliberately rather than reflexively.

**Total deviations:** 4 auto-fixed (one Rule 1, three Rule 3). **Impact on scope:** two files outside `files_modified` (`e2e/search-and-book.spec.ts`, `e2e/open-capacity.spec.ts`) plus one new module and one test-harness wrap. No new dependency, no migration, no change to booking/payment/capacity/availability logic.

## Issues Encountered

- **`e2e/public-listing.spec.ts`'s draft-404 case is RED and was red before this plan** — measured and fully documented in `deferred-items.md` at 12-02. Unchanged here.
- **The DB-seeding e2e specs flake under a single Playwright invocation, and the flake moves.** The plan's own verify command went **23 passed → 1 failed** (hold-countdown's court geometry case, timed out at 3m) **→ 1 failed** (`shell.spec.ts`'s SHIPPED `AC#3 host/court` case, *"the auth slot is STILL holding 1 placeholder(s) in the resolved document"*) **→ 23 passed**, across four consecutive invocations with no code change, the last immediately after `docker restart fitout-db-1` (9 connections after restart). Three different tests, two of them shipped and untouched. Logged with the measurement.
- **`e2e/search-and-book.spec.ts:306` (the durable confirmation) intermittently fails on `getByText(reference, { exact: true })` resolving to 2 elements** after its `page.reload()` — the same streamed-duplicate shape as finding 5, on `/bookings/[id]`, a route this plan does not touch. Observed failing twice and passing once with no code change. Logged; not fixed, because it is a shipped spec outside this plan's surface. Note it sits in a `serial` describe, so its failure SKIPS the two tests after it.
- **The `Hydration failed` lines in the WebServer log during `shell.spec.ts` are expected**: `installTruncator` serves a document PREFIX, and `served-document.ts:29-31` states that a truncated document does not hydrate. Pre-existing.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-03-GETDUP | mitigated | The href is `/listings/{id}` + the window recomposed from the hold's own frozen instants, explicitly without the resume discriminator; `e2e/shell.spec.ts` asserts `<a href>` inside `<main>` === 1, `startsWith("/listings/")`, `includes("resume") === false`, and the label |
| T-12-03-HOLDIDOR | mitigated | The owner gate, the path-id cross-check and both `notFound()` calls in `book/page.tsx` are byte-unchanged; the layout fetches no hold data; the context carries one ISO string and one boolean and has no member to widen |
| T-12-03-CLIENTAUTH | accepted | Unchanged by this plan. The countdown is a display cue; `confirmBooking` re-checks `expires_at > now()` server-side and the checkout lease is the real guard. `ReserveView` keeps `timedOut` and `confirmFailed` as separate state so the cue and the verdict never share a write path |
| T-12-03-A11YDOUBLE | mitigated | The expiry arm deleted, the threshold message latched, one region per document; watched reds B and C both observe a change count of 2 when restored |
| T-12-03-HOOKGHOST | mitigated | The `hold-countdown` row and its string-literal render landed in commit `95ecec7`; the TS2741 compile red is watched verbatim above and `tests/design/selector-contract.test.ts` passes all 7 assertions |
| T-12-03-SC | mitigated | `git diff --stat package.json` is empty; nothing installed |

## Known Stubs

None. Every value rendered is server-supplied: the deadline is the row's frozen `expires_at`, the way-back window is recomposed from the row's own `starts_at`/`ends_at` in the venue timezone, and the countdown computes only a remainder from a published instant.

## Threat Flags

None. No new network endpoint, no new auth path, no file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire in `tests/design/infra.test.ts` green inside `npm run build`).

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 39 design test files, 701 passed / 3 skipped, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` (whole suite) | **1231 passed / 4 skipped, 136 files** |
| `npx vitest run tests/booking` | **328 passed / 33 files** (incl. the 5 new GATE-03 cases) |
| `npx vitest run --config vitest.design.config.ts tests/design/selector-contract.test.ts` | **7 passed** |
| `npx playwright test e2e/hold-countdown.spec.ts e2e/shell.spec.ts --project=chromium` | **23 passed** (the plan's Task-3 command) |
| `npx playwright test e2e/hold-countdown.spec.ts --project=chromium` | **4 passed** |
| `npx playwright test e2e/price-parity.spec.ts --project=chromium` | **1 passed**, `git diff --stat` on it **empty** |
| `npx playwright test e2e/open-capacity.spec.ts --project=chromium` | **6 passed** |
| `npx playwright test --project=chromium` (full) | 75 passed / 2 failed / 8 skipped — the two are the **pre-existing** draft-404 and one load-shaped flake, both logged |
| `grep -c '"use client"' "src/app/listings/[id]/book/layout.tsx"` | **0** |
| `grep -rn 'data-testid="hold-countdown"' src/` | **1** occurrence, a string literal in a JSX attribute |
| `grep -n "onExpire" src/components/booking/reserve-view.tsx` | no matches |
| `grep -n 'resume=1\|resume: "1"' "src/app/listings/[id]/book/page.tsx"` | no matches |
| `git diff --stat package.json` | empty |
| `ls drizzle/*.sql \| sort \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |

**Route rendering mode.** `next build` lists `ƒ /listings/[id]/book` after this plan. It was `ƒ` before and could not have been anything else: `book/page.tsx` calls `headers()` and reads `searchParams`, both of which force dynamic rendering, and neither was touched. What changed in the layout is a client provider wrapping an already-rendered server node, which is not an input to the page's rendering mode.

## Next Phase Readiness

- **12-10 (RESP-02 sheet)** — the countdown is a context consumer with no props, so a second booking view mounts beside it without a second timer. `[data-testid="hold-countdown"] === 1` is asserted per document, and a sheet that mounted its own would fail that plus the `role="timer"` count.
- **12-11 (the sticky bar)** — the way back is pinned to the LAST position in the main column with a spec asserting `<main>` holds exactly ONE anchor. A sticky bar that adds a link to `<main>` will go red, by design; put its actions in the bar as buttons.
- **12-13 (STATE-07 collision)** — `markExpired()` and `refreshDay()` (12-02) are the two upward seams now. `ReserveView` keeps the client cue and the server verdict on separate state, so a collision notice can land without touching the timer's path.
- **Every later Phase-12 spec** — import `e2e/helpers/booker-seed.ts` instead of re-deriving the day math. `price-parity.spec.ts` is the one file that must NOT be migrated onto it (D-35's env contract), and the helper's header says so.
- **Anyone writing a checkout spec** — `book/loading.tsx` renders the same `<h1>` as the page. Wait for `price-total`, never for the heading.

**No blockers.**

## Self-Check: PASSED

- Files: `12-03-SUMMARY.md`, `hold-provider.tsx`, `hold-publisher.tsx`, `hold-countdown.test.tsx`, `booker-seed.ts`, `hold-countdown.spec.ts` — **6/6 FOUND**
- Commits: `91718a1`, `95ecec7`, `84fd6b2` — **3/3 FOUND**
- Artifact `contains` checks: `"use client"` in `hold-provider.tsx` ✓ · `HoldProvider` in `book/layout.tsx` ✓ · `pickWindow` / `selectTargetDay` / ordered teardown in `booker-seed.ts` ✓ · `page.clock.install` before the first `goto` in `hold-countdown.spec.ts` ✓
- Key links: `book/page.tsx` → `hold-provider.tsx` via `<PublishExpiresAt>` (see the naming note under deviation 1) ✓ · `reserve-view.tsx` → `hold-provider.tsx` via `useHold` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
