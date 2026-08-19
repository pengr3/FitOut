---
status: awaiting_human_verify
trigger: "e2e/search-and-book.spec.ts test 2 (`directly-seeded confirmed booking → the durable confirmation, unchanged across a refresh (D-43)`) fails at line 341 with `strict mode violation: getByText('FIT-XXXXXXXX', { exact: true }) resolved to 2 elements` — but ONLY when test 1 (`live instant hold`) runs first. Alone it passes 3/3."
created: 2026-08-20T00:00:00Z
updated: 2026-08-20T02:10:00Z
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
    - The three assertions above the reload (`/booking reference/i`, `"Confirmed"` exact) are the same shape
      and were left alone: they run against the COLD first load, which was clean on all 16 iterations. They
      are latent, and the comment added to the spec says so and says what fixes them.
    - The regime is warmth-dependent: 0/20 duplicates on a cool dev server, then 10/20, then 15/16, then 8/8.
      The exact warm-up variable (cached chunks making hydration outrun `$RC`) was inferred from the timeline,
      not isolated with a dedicated experiment.

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
  `e2e/search-and-book.spec.ts` — the durable-confirmation test now asserts on the VISIBLE reference:

      const referenceOnScreen = page.getByText(/FIT-[0-9A-Z]{8}/).filter({ visible: true });
      const reference = await referenceOnScreen.textContent();
      …
      await expect(
        page.getByText(reference!.trim(), { exact: true }).filter({ visible: true }),
        "the durable confirmation must show exactly ONE on-screen booking reference after a refresh",
      ).toHaveCount(1);

  A STRENGTHENING, not a `.first()` shrug: the old line required one TOTAL match, the new one requires exactly
  one VISIBLE match, so a genuine double render a booker could read still fails. An in-file comment block
  records the DOM timeline, the measured counts, why `.first()` / a longer timeout / a CSS scope were each
  rejected, and the general `getByRole`-is-immune / `getByText`-is-not rule.

verification: |
  - Failing regime confirmed hot immediately before the fix (8/8 duplicates) and after (7/8).
  - `npx playwright test e2e/search-and-book.spec.ts --project=chromium --workers=1` — 3 passed × 3 consecutive runs.
  - `npx playwright test … -g "directly-seeded confirmed booking" --workers=1` — 1 passed × 2.
  - Full-file re-run after `npm run build` — 3 passed.
  - `npx tsc --noEmit` — 0 errors.
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
    LATENT SAME-CLASS HAZARD elsewhere: `e2e/hold-countdown.spec.ts:255,345` and
    `e2e/open-capacity.spec.ts:477,497,587` also assert straight after a `reload()`. Any `getByText` there is
    exposed to the identical streaming overlap on any route with a `loading.tsx`. Not touched (they are green);
    the rule and its fix are written out in the comment added to `search-and-book.spec.ts`.

files_changed:
  - "e2e/search-and-book.spec.ts — visible-filtered reference read + `toHaveCount(1)` on the post-reload assertion, with the evidence recorded in-file"
