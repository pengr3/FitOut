---
status: awaiting_human_verify
trigger: "e2e/search-and-book.spec.ts test 2 (`directly-seeded confirmed booking → the durable confirmation, unchanged across a refresh (D-43)`) fails at line 341 with `strict mode violation: getByText('FIT-XXXXXXXX', { exact: true }) resolved to 2 elements` — but ONLY when test 1 (`live instant hold`) runs first. Alone it passes 3/3."
created: 2026-08-20T00:00:00Z
updated: 2026-08-20T04:30:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: |
    The second `<p>` is React's out-of-order STREAMING BUFFER copy, parked inside `<div hidden="" id="S:1">`
    — the staging container for the Suspense boundary that `(app)/bookings/[id]/loading.tsx` creates. When
    the client is warm, React client-renders the boundary from the flight payload BEFORE `$RC` reclaims the
    buffer, so the live copy and the staged copy coexist for ~100 ms. The assertion fails because a Playwright
    locator matches HIDDEN elements and strict mode counts them BEFORE `toBeVisible()` filters. Nothing about
    the page is wrong.
  confirming_evidence:
    - "MutationObserver installed via addInitScript, ancestor chains captured: t=121 ms ONE match, inside `<div hidden id=\"S:1\">`; t=218 ms TWO matches, one live under `<main>` and one still inside `<div hidden id=\"S:1\">`; t=316 ms ONE match, live only."
    - "Over 16 fresh contexts, 15 hit the overlap. In EVERY one: total=2, `filter({ visible: true }).count()`=1."
    - "In every overlapping iteration the browser console was EMPTY — no hydration error, no recovered error, no page error. This is not a mismatch-recovery path."
    - "`getByRole(\"heading\", { name: /booking confirmed/i })` counted exactly 1 on all 16 iterations, including the 15 where `getByText` counted 2 — the staged subtree is under `hidden`, hence out of the accessibility tree."
    - "`npx playwright test … -g \"durable confirmation\" --list` selects ALL THREE tests: the describe title contains the phrase. The reporter's 'fails' and 'passes' commands were the same run."
  falsification_test: |
    If the duplicate were a real double render, `filter({ visible: true }).count()` would have been 2 on at
    least one of the 15 overlapping iterations, and the second copy's ancestor chain would not have contained
    a `hidden` element. It was 1 on all 15, and the chain contained `<div hidden id="S:1">` every time.
  fix_rationale: |
    The bare `expect(getByText(ref, { exact: true })).toBeVisible()` was asserting React's streaming schedule,
    not the product. `.filter({ visible: true })` + `.toHaveCount(1)` asserts the claim the surface actually
    makes — exactly ONE booking reference on screen after a refresh — and is STRICTLY STRONGER than what it
    replaced: the old line required one TOTAL match, the new one requires one VISIBLE match, so a genuine
    double render that a booker could read still fails.
  blind_spots: |
    - Verified against `next dev` (Turbopack) only, which is what `playwright.config.ts`'s webServer boots.
      A production build streams through the same `<div hidden id="S:N">` + `$RC` machinery, so the fix is
      not dev-specific, but the OVERLAP RATE under `next start` was not measured.
    - The regime is warmth-dependent: 0/20 duplicates on a cool dev server, then 10/20, then 15/16, then 8/8.
      The exact warm-up variable (cached chunks making hydration outrun `$RC`) was inferred from the timeline,
      not isolated with a dedicated experiment.
    - TWO BLIND SPOTS FROM THE FIRST PASS WERE REAL MISSES, both caught in review, both now closed. They are
      left in the record rather than edited away because the second one is a method error, not a detail:
        (i)  SCOPE. The first pass fixed only the reference in test 2 and reasoned about the rest of the file
             instead of measuring it. `:263` (`km away`, bare, straight after a `goto`) was live the whole
             time and is in fact the second-worst site in the file at 5/10. "One site failed, so one site is
             affected" was never a supported inference — the mechanism is per-navigation, and every route in
             this flow has a `loading.tsx`.
        (ii) SAMPLE SIZE. The first pass claimed verification off THREE consecutive green full-file runs. The
             per-site rate at the worst site is ~1 in 3, so three greens has ~30% odds of proving nothing.
             The claim "the cold first load is clean" rested on 16 iterations of a DIFFERENT harness that
             never ran those assertions — and at 10 iterations that did run them, `:333` and `:334` each
             produced a violation. For this defect class the sample must be >= 6 full-file runs on a server
             demonstrated warm at the time of the run, and the session must state the number.

## Symptoms

expected: after `page.reload()` on `/bookings/{id}`, exactly ONE element carries the `FIT-XXXXXXXX` booking reference
actual: `getByText(reference, { exact: true })` resolves to TWO elements, identical tag, identical class list, identical text
errors: |
  Error: strict mode violation: getByText('FIT-P4CZS0MA', { exact: true }) resolved to 2 elements:
    1) <p class="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">FIT-P4CZS0MA</p>
    2) <p class="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">FIT-P4CZS0MA</p>
reproduction: |
  FAILS (test 2 of 3):  npx playwright test e2e/search-and-book.spec.ts --project=chromium --workers=1
  PASSES (3/3):         npx playwright test e2e/search-and-book.spec.ts --project=chromium -g "durable confirmation" --workers=1
started: pre-existing; NOT introduced by Phase 12 (order-dependent, surfaced during Phase 12 verification)

## Eliminated

- hypothesis: two distinct bookings whose SHA-256-derived references collided
  evidence: `bookingReference(id)` is 8 Crockford symbols of a SHA-256 over the booking id (~1 in 10^12); also the seeded booking id is unique per run
  timestamp: pre-session (handed over in the brief)
- hypothesis: two JSX sites render the reference
  evidence: `src/app/(app)/bookings/[id]/page.tsx` has exactly one `{reference}` (line 585); `grep -rn "tabular-nums sm:text-display" src/` and `grep -rn bookingReference src/` find no other display site
  timestamp: pre-session (handed over in the brief)
- hypothesis: parallel/intercepting route segments or a `template.tsx` duplicate the subtree
  evidence: no `@slot` or `(.)` segments anywhere under `src/app`; no `template.tsx`; the route has only `loading.tsx` + `page.tsx`
  timestamp: pre-session (handed over in the brief)
- hypothesis: DB pollution (leftover `vrt_*` or `E2E %` rows)
  evidence: `vrt_*` rows cleaned and verified at 0; `E2E %` listings are 0 at rest
  timestamp: pre-session (handed over in the brief)

## Evidence

- timestamp: 2026-08-20T00:00:00Z
  checked: environment preconditions
  found: dev server up on :3000 (HTTP 200), `fitout-db-1` container up 26h, HEAD `bcdc7ec`, working tree clean except the pre-existing `.planning/config.json` modification
  implication: the reproduction can be run as-is without a rebuild

- timestamp: 2026-08-20T00:10:00Z
  checked: |
    Instrumented copy of the spec; polled `getByText(ref, { exact: true }).count()` every 250 ms for
    10 s starting the instant `expect(heading).toBeVisible()` resolved after `page.reload()`.
  found: |
    samples = [{t:0, n:2}, {t:250, n:1}, {t:500, n:1}, … {t:9750, n:1}]  — 2 at the first sample, 1 for
    every sample thereafter.
  implication: |
    THE DUPLICATE IS TRANSIENT, not persistent. It survives well under 250 ms. Playwright throws a
    strict-mode violation the instant a locator resolves to two, so the report cannot distinguish this
    from a permanent duplicate — which is exactly why nobody had established it.

- timestamp: 2026-08-20T00:20:00Z
  checked: |
    `page.addInitScript` installs a MutationObserver BEFORE any page script runs on the reload, and
    records the full ancestor chain of every `<p>` whose trimmed text equals the reference whenever the
    count changes.
  found: |
    t=121 ms  n=1  the ONLY copy is inside  <div hidden="" id="S:1">  (live slot still holds loading.tsx's skeleton)
    t=218 ms  n=2  match 1 is LIVE  (…<main class="mx-auto w-full max-w-2xl …"> → <main class="flex flex-1 flex-col"> → <div class="flex min-h-full flex-col"> → <body>)
                   match 2 is STILL the staged copy inside  <div hidden="" id="S:1">
    t=316 ms  n=1  the staged  <div hidden id="S:1">  is gone; only the live copy remains
    `document.querySelectorAll("main").length === 2` — the (app) layout's `<main class="flex flex-1 flex-col">` wrapping the page's own `<main class="mx-auto …">`. Pre-existing nested-landmark nit, NOT this bug.
  implication: |
    ROOT CAUSE CONFIRMED and it is NOT a duplicate render. `<div hidden id="S:N">` is React's
    out-of-order-streaming staging container for a Suspense boundary — here the boundary that
    `(app)/bookings/[id]/loading.tsx` creates. For ~100 ms the live copy and the not-yet-reclaimed
    staged copy coexist in the document. The staged copy is inside `hidden` (display:none), so it is
    unreachable to a user, to assistive tech, and to a screenshot — but a Playwright LOCATOR matches
    hidden elements, and strict mode counts before `toBeVisible()` filters.

- timestamp: 2026-08-20T00:30:00Z
  checked: |
    `npx playwright test e2e/search-and-book.spec.ts --project=chromium -g "durable confirmation" --list`
  found: |
    Total: 3 tests in 1 file — ALL THREE tests, in the same order as the bare full-file run. The
    describe block is titled "search → book → live hold + durable confirmation + expiry UX (SC#1–SC#4)",
    and Playwright's `-g` matches the FULL title including describe segments.
  implication: |
    THE BRIEF'S CENTRAL PREMISE IS FALSIFIED. The "fails" command and the "passes" command select the
    identical test set in the identical order. Test 1 running first is NOT the trigger, because test 1
    runs first in BOTH. The failure is not order-dependent — it is a timing race, and the two commands
    differed only in which side of it they happened to land on.

- timestamp: 2026-08-20T00:40:00Z
  checked: |
    The UNMODIFIED spec, five consecutive full-file runs:
    `npx playwright test e2e/search-and-book.spec.ts --project=chromium --workers=1`
  found: 3 passed, 3 passed, 3 passed, 3 passed, 3 passed — 0 strict-mode violations
  implication: |
    Confirms it is a race and not a fixed ordering effect, and establishes that "run it again" is NOT a
    verification strategy here. A forcing function was required before any fix could be proven.

- timestamp: 2026-08-20T01:00:00Z
  checked: |
    Forcing attempt #1 — CDP `Emulation.setCPUThrottlingRate` at 8x, 25 reloads of one long-lived page.
  found: 0 duplicates in 25 iterations (8.4 min).
  implication: |
    HYPOTHESIS ELIMINATED: the window is not simply "slow main thread". Throttling delays hydration so much
    that `$RC` always wins and reclaims the buffer atomically. Reusing ONE page across reloads was also the
    wrong shape — the shipped test uses a FRESH context.

- timestamp: 2026-08-20T01:20:00Z
  checked: |
    Forcing attempt #2 — a harness mirroring the shipped test exactly: NEW browser context per iteration,
    booker cookies applied, `goto` → the four load assertions → `reload` → count. Unthrottled.
  found: |
    20 iterations: duplicates=10, and NOT randomly distributed — iterations 0–9 clean, 10–19 ALL duplicated.
    Every duplicate: total=2  visible=1  console=[]
    Re-run, 16 iterations: 15 duplicates.  Re-run, 8 iterations: 8.  Re-run after the fix landed: 7/8.
  implication: |
    THE FORCING FUNCTION IS FRESH-CONTEXT + A WARM DEV SERVER, and there is a REGIME CHANGE rather than a
    coin flip: once the server has been exercised, the overlap happens on essentially every load. That is
    exactly why the reporter experienced it as deterministic while five clean runs on a cooler server said
    the opposite.

- timestamp: 2026-08-20T01:30:00Z
  checked: |
    Same harness, additionally counting `getByRole("heading", { name: /booking confirmed/i })`,
    `getByText("Confirmed", { exact: true })`, and a CSS-scoped `main.max-w-2xl` variant.
  found: |
    getByRoleHeading                 = 1 on ALL 16 iterations (including the 15 duplicating ones)
    getByText("Confirmed", exact)    = 2 on every duplicating iteration
    scopedToPageMain                 = 2 on 13, 1 on 2 — the staged copy carries its own `<main class="mx-auto w-full max-w-2xl …">`
  implication: |
    - `getByRole` is IMMUNE (staged subtree is under `hidden`, hence out of the a11y tree). This explains every
      asymmetry in the original report, including why the heading assertion one line above never failed.
    - A CSS SCOPE IS NOT A FIX — it races the buffer's removal (2 sometimes, 1 sometimes).
    - `filter({ visible: true })` is the only stable discriminator, and it is stable because it is the same
      property the user experiences.

- timestamp: 2026-08-20T01:50:00Z
  checked: |
    Fix applied to `e2e/search-and-book.spec.ts`. Regime confirmed HOT immediately before (8/8 duplicates) and
    immediately after (7/8), so verification ran against the condition that produces the failure.
  found: |
    full file `--workers=1`: 3 passed, 3 passed, 3 passed (0 strict-mode violations)
    targeted `-g "directly-seeded confirmed booking"`: 1 passed, 1 passed
    post-`npm run build` re-run of the full file: 3 passed
  implication: The fix holds under the exact condition that reproduces the failure 8/8 without it.

- timestamp: 2026-08-20T03:10:00Z
  checked: |
    REVIEW FINDING (coordinator): the same defect was still live at `e2e/search-and-book.spec.ts:263`,
    `await expect(page.getByText(/\\d+(\\.\\d+)?\\s*km away/i)).toBeVisible()`, immediately after
    `page.goto(/?lat=…&category=tennis_court&radius=25)`. Independently, 6 full-file runs on a warm server
    gave 5 passes and 1 failure — roughly 1 in 3 — against the 3 consecutive greens the first pass called
    verification.
  found: Confirmed on both counts. The first pass fixed one site and under-sampled its own verification.
  implication: |
    The fix was correct but the SCOPE was wrong, and the verification protocol could not have detected that.
    Every `getByText` that follows a navigation in this file is exposed, because every route in the flow has
    a `loading.tsx` and therefore a streaming buffer.

- timestamp: 2026-08-20T03:30:00Z
  checked: |
    FILE-WIDE SWEEP, measured rather than reasoned. A temporary harness ran the SHIPPED assertions verbatim,
    each wrapped in try/catch for per-site attribution, 10 fresh contexts on a warm server; plus a settled
    total/visible count per site via one atomic `locator.evaluateAll` (checkVisibility + bounding box).
  found: |
    SITE                              SHIPPED ASSERTION       STRICT-MODE VIOLATIONS   SETTLED total/visible
    :263  km away              (bare)                          5/10                    1 / 1
    :341  reference, reload    (bare, pre-fix)                 8/10                    2 / 1
    :341  reference, reload    (treated)                       0/10                    -
    :333  booking reference    (bare, cold load)               1/10                    1 / 1
    :334  Confirmed exact      (bare, cold load)               1/10                    1-2 / 1
    :230  Times shown in       (bare)                          0/10                    1 / 1
    :280  5:00-7:00 PM         (bare)                          0/10                    1 / 1
    :292  We're holding this   (bare)                          0/10                    1 / 1
    :311  PayMongo line        (bare)                          0/10                    1 / 1
    :257  price/hr             (.first())                      0/10                    1 / 1
    :279  (GMT+8)              (.first())                      0/10                    2 / 2
    :284  Total exact          (.first())                      0/10                    2 / 1
    :285  peso                 (.first())                      0/10                    3 / 2
    A separate single-shot measurement at :263 caught a THIRD phase: 3/8 iterations had total=1 where that
    ONE match was HIDDEN — the staged-only window, before the live copy is inserted.
  implication: |
    - The overlap has THREE phases, not two: staged-only (hidden) -> staged + live (the strict-mode window)
      -> live-only. A bare `toBeVisible()` retries THROUGH all three, which is how its retry loop lands in
      the middle one. This also means `.first()` is unsafe on its own terms: the staging div PRECEDES the
      live tree in DOM order, so `.first()` can resolve to the hidden copy and then fail `toBeVisible()`
      with a misleading "element is not visible" rather than a strict-mode violation.
    - 0/10 is NOT evidence of safety when the worst site only fires half the time. The bare sites at 0/10
      are structurally identical to the ones at 5/10 and were treated on that basis, not on their score.
    - The four `.first()` sites split cleanly on their SETTLED VISIBLE count, which is the only number that
      decides whether cardinality is assertable.

- timestamp: 2026-08-20T03:45:00Z
  checked: |
    PER-SITE DECISIONS on the four pre-existing `.first()` sites — `.first()` silences the strict-mode
    violation but drops the singularity claim entirely, which is the same objection raised against using
    `.first()` for the reference. Each was decided on its measured visible count, not converted silently.
  found: |
    :257  price/hr        visible=1  -> CONVERTED to a visible-filtered toHaveCount(1). The `.first()` was
                                        silencing the line's own stated claim: the comment above it says
                                        "only the tennis listing matches the filter, SEARCH-05", and with
                                        `.first()` a second result card carrying a second price would pass.
    :284  Total exact     visible=1  -> CONVERTED to a visible-filtered toHaveCount(1). The existing comment
                                        already documents total=2 / one reachable per width (the sticky bar
                                        is `lg:hidden` at 1280px). Measurement confirms it exactly. That is
                                        a real invariant, so the line now asserts it instead of stepping
                                        around it; `.first()` made the documented claim untestable.
    :279  (GMT+8)         visible=2  -> KEPT as at-least-one. Two genuinely visible occurrences (the window
                                        line's tz suffix and the standalone tz note). `toHaveCount(2)` would
                                        copy-pin an incidental number. `.filter({ visible: true })` inserted
                                        BEFORE `.first()` so `.first()` can never pick the buffer's copy.
    :285  peso            visible=2  -> KEPT as at-least-one. The breakdown is several money figures and the
                                        count is incidental to what the line checks (that money renders).
                                        Same `.filter({ visible: true })` before `.first()`.
  implication: |
    Two of the four `.first()` sites were hiding assertable invariants and are now stronger than before this
    bug was found. The other two are honest at-least-one checks and say so at the call site. No site was
    weakened, and no second pattern was invented — every site uses the same
    `.filter({ visible: true })` treatment already argued for the reference.

- timestamp: 2026-08-20T04:20:00Z
  checked: |
    VERIFICATION AT THE CORRECTED SAMPLE SIZE. Server demonstrated warm immediately BEFORE the runs and
    again immediately AFTER, using the untreated assertion as the probe.
  found: |
    warmth probe, before:  bare reload assertion 1/6 pass (5 strict-mode violations); treated 6/6 pass
    full file, --workers=1: 8/8 runs passed (3 tests each, 24/24 tests), 0 strict-mode violations
    warmth probe, after:   bare reload assertion 2/6 pass (4 violations); bare `:263` 5/6 (1 violation);
                           treated 6/6 pass
    targeted `-g "directly-seeded confirmed booking"`: 3/3 passed
  implication: |
    The server was still producing the failure on the untreated assertions on either side of the 8 green
    runs, so the greens are attributable to the treatment rather than to a cooled server. 8 runs at an
    observed per-run failure rate of ~1/3 puts the probability of 8 false greens at roughly 0.04%.

## Resolution

root_cause: |
  NOT a duplicate render. Nothing in `src/` is wrong.

  `(app)/bookings/[id]/loading.tsx` creates a Suspense boundary around the confirmation page. React streams
  that boundary's HTML out of order: the payload lands in a staging container, `<div hidden="" id="S:1">`, and
  `$RC` later swaps it into the live slot. When the client is warm — cached chunks, so hydration outruns the
  reveal — React client-renders the boundary from the flight payload instead, and the server's staged copy is
  not reclaimed until ~100 ms later. For that window the document contains the booking reference TWICE: once
  live under `<main>`, once inside the `hidden` staging div.

  A Playwright LOCATOR matches hidden elements, and strict mode counts matches BEFORE `toBeVisible()` applies
  its filter — so `expect(getByText(ref, { exact: true })).toBeVisible()` throws on the count and never reaches
  the visibility check. `getByRole` was immune throughout because `hidden` removes the subtree from the
  accessibility tree, which is why the heading assertion one line above never failed.

  The reported trigger ("only when test 1 runs first") was an artefact: `-g "durable confirmation"` matches the
  DESCRIBE title, so both of the reporter's commands ran all three tests in the same order. The real variable is
  dev-server warmth, which flips the overlap from ~0% to ~95%.

fix: |
  `e2e/search-and-book.spec.ts` — a FILE-WIDE sweep of all 11 `getByText` sites, one pattern throughout:
  `.filter({ visible: true })`, plus `toHaveCount(n)` wherever the visible count is deterministic.

    9 sites -> visible-filtered `toHaveCount(1)`   :230 :257 :263 :280 :284 :292 :311 :333 :334 :341
    2 sites -> visible-filtered `.first()`         :279 (visible=2)  :285 (visible=2)

  Every conversion is a strengthening: the bare `toBeVisible()` required one TOTAL match, these require an
  exact VISIBLE count, so a genuine double render a person could read still fails. The two `.first()` sites
  keep at-least-one semantics because their visible count is genuinely >1 and incidental — but the visibility
  filter goes IN FRONT of `.first()`, because the staging buffer precedes the live tree in DOM order and an
  unfiltered `.first()` can resolve to the hidden copy.

  The long explanation is hoisted ONCE to a file-level block, THE STREAMING-BUFFER RULE, above `pickWindow`:
  the DOM timeline, the measured per-site exposure table, the rejected alternatives (`.first()`, a longer
  timeout, a CSS scope — each with the measurement that rejected it) and the `getByRole`-is-immune /
  `getByText`-is-not rule. Each call site carries only its own one-line reason.

verification: |
  SAMPLE SIZE IS STATED DELIBERATELY. The observed per-run failure rate is ~1 in 3, so a small number of
  greens proves nothing; the first pass reported 3 consecutive greens and was wrong to call that verified.

  - Warmth probe BEFORE the runs (untreated assertion as the control): bare reload assertion 1/6 pass,
    5 strict-mode violations; treated assertion 6/6 pass.
  - `npx playwright test e2e/search-and-book.spec.ts --project=chromium --workers=1`
    — 8/8 consecutive full-file runs passed (24/24 tests), 0 strict-mode violations.
  - Warmth probe AFTER the runs: bare reload assertion 2/6 pass (4 violations), bare `:263` 5/6 (1
    violation), treated 6/6 pass — i.e. the server was still producing the failure on either side of the
    8 greens, so they are attributable to the treatment and not to a cooled server.
  - `npx playwright test … -g "directly-seeded confirmed booking" --workers=1` — 3/3 passed.
  - Per-site, treated vs untreated under identical conditions: `:341` 0/10 violations treated against
    8/10 bare; `:263` 5/10 bare.
  - `npx tsc --noEmit` — 0 errors.  `npx eslint e2e/search-and-book.spec.ts` — clean.
  - `npx vitest run` — 141 files / 1307 tests passed (1 file / 4 tests skipped) — baseline unchanged.
  - `npm run build` — lint 0 errors / 12 known warnings, design suite 41 files passed, compiled successfully.

user_visible_severity: |
  NONE. The extra copy is inside `<div hidden>` — display:none, out of the accessibility tree, absent from every
  screenshot. `filter({ visible: true }).count()` was 1 on all 15 overlapping iterations. A real booker never
  sees the reference twice, so this was never a defect on the confirmation surface; it was a test asserting on
  React's streaming schedule.

adjacent_findings_not_fixed:
  - |
    NESTED `<main>` LANDMARKS on `/bookings/[id]`. `document.querySelectorAll("main").length === 2`:
    `(app)/layout.tsx` renders `<main className="flex flex-1 flex-col">{children}</main>` and every branch of
    `(app)/bookings/[id]/page.tsx` returns its own `<main className="mx-auto w-full max-w-2xl …">`. The route's
    own `loading.tsx` header states the rule and obeys it ("a second `<main>` inside the first is a landmark this
    file has no reason to add") — the page does not. A real assistive-tech defect, unrelated to this bug, touching
    five return branches, deliberately left for its own change rather than folded into a debug fix.
  - |
    LATENT SAME-CLASS HAZARD IN OTHER SPECS: `e2e/hold-countdown.spec.ts:255,345` and
    `e2e/open-capacity.spec.ts:477,497,587` also assert straight after a `reload()`, and any `getByText`
    after any navigation in any spec is exposed on any route with a `loading.tsx`. NOT swept here — that is
    a suite-wide change and this session's remit was one file — but the evidence now says plainly that
    "those specs are green" is not evidence they are safe, because the worst site in THIS file was green
    5 times in 10. THE STREAMING-BUFFER RULE at the top of `search-and-book.spec.ts` is written to be the
    reference for that sweep when it is done.

files_changed:
  - "e2e/search-and-book.spec.ts — all 11 `getByText` sites visibility-filtered (9 as exact `toHaveCount(1)`, 2 as argued at-least-one), with THE STREAMING-BUFFER RULE hoisted once to file level"
