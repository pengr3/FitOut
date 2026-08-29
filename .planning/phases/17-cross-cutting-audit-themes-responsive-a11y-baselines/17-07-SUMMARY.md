---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 07
subsystem: testing
tags: [playwright, axe-core, accessibility, wcag, e2e, aria, heading-order]

requires:
  - phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
    provides: "17-01's e2e/helpers/axe.ts (AXE_TAGS, makeAxe, expectAxeClean, MIN_SCANNED_NODES = 8), its declared baseline red set, and its measured correction that a 404 on this app is NOT a vacuity probe"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "src/lib/design/visual-baselines.ts — the SurfaceRow hook/hookWhy inventory this sweep derives its tells from, and THEME_SWAP_EXCLUSIONS' single-entry idiom"
  - phase: 12-booker-path-search-listing-checkout
    provides: "e2e/overflow-320.spec.ts's AC#29 block — the RouteRow shape, expectReachable, the named-skip idiom and the served-document interceptor"
  - phase: 15-auth-profile-transactional-email
    provides: "the UI-driven sign-up idiom (mode-switch/shell/host-headings) that lets this sweep reach 24 surfaces with no postgres client"
provides:
  - "e2e/axe-sweep.spec.ts — GATE-02's automated half: 43 rows, one per declared surface, court only at 320 and 1280"
  - "AC#2 made mechanical: the table's row set is ASSERTED equal to the surface set derived from src/app on disk, so a new route with no row is a failing test"
  - "A measured verdict for GATE-02's axe half: 52 passed, 0 failed, 36 named skips, zero violations"
  - "Measured replacements for 17-RESEARCH assumptions A1, A4 and A5"
  - "Two product fixes: the wizard progress bar's accessible name, and /host/listings' heading outline"
  - "AC#24 — six amended sentences across four files, court-only with the grove cost named"
affects: [17-08, 17-09, 17-10, 17-11, 17-12, 17-13, 17-14]

tech-stack:
  added: []
  patterns:
    - "Row-set equality against a disk-derived surface set — a table gate whose completeness is a test rather than a promise"
    - "A route table that reaches nine host surfaces with no postgres client, by driving /host/listings/new's mint-and-redirect"
    - "titleAs on a shared card: which heading rung a fragment sits on is a property of the page, not of the card"
    - "Comment amendment with the superseded wording QUOTED and marked, never deleted"

key-files:
  created:
    - e2e/axe-sweep.spec.ts
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/components/listing/listing-card.tsx
    - src/app/(host)/host/listings/page.tsx
    - src/lib/design/contrast-pairs.ts
    - tests/design/pair-drift.test.ts
    - e2e/helpers/theme.ts
    - src/components/theme/theme-provider.tsx
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md

key-decisions:
  - "The sweep opens NO postgres client. deferred-items.md warns by name against a seventh DB-seeding spec, and /host/listings/new mints a real draft and redirects into the wizard — which turns out to be enough for nine host surfaces from a bare sign-up."
  - "The row's identity is its route FILE path, not a URL, because that is what makes the set-equality assertion derivable from disk and non-fakeable."
  - "global-error's exclusion reason is corrected rather than copied: the UI-SPEC's landmark-rule justification cannot fire under the declared tags."
  - "The wizard progress bar is named with aria-labelledby pointing at the existing 'Step N of M' sentence, not with an invented aria-label — zero new product copy."
  - "ListingCard gains titleAs rather than changing its default: h3 is CORRECT on / and wrong on /host/listings, and baking either answer in makes the other page wrong."
  - "The vacuity red-watch used about:blank, not the 404 the plan named — 17-01 measured a 404 on this app rendering 57 nodes and zero violations."

patterns-established:
  - "AC#2 mechanics: derive the declared set from the filesystem inside the spec, assert {missing, extra, duplicated} all empty, and fail any skip shorter than 80 characters"
  - "A measured correction that cannot be written in the file it corrects (17-01's own grep forbids the identifier) goes to the reading file plus deferred-items.md"

requirements-completed: []

duration: 2h 12m
completed: 2026-08-29
---

# Phase 17 Plan 07: The GATE-02 Axe Sweep Summary

**A 43-row table-driven axe pass over every declared production surface in court at 320 and 1280 — whose row set is asserted equal to the set derived from `src/app` on disk, which reaches 24 of them with no database fixture at all, and whose first run found and closed two real WCAG violations while turning three of the phase's assumptions into measurements.**

## Performance

- **Duration:** 2h 12m
- **Started:** 2026-08-29T09:29:54Z
- **Completed:** 2026-08-29T11:42:00Z
- **Tasks:** 3
- **Files created/modified:** 8 (1 created, 7 modified)

## Accomplishments

- **GATE-02's *"an automated axe pass"* now has a route table and a verdict.** `e2e/axe-sweep.spec.ts`, 940 lines, 43 rows, 88 cases: **52 passed · 0 failed · 36 named skips**, zero violations at the five conformance tags.
- **AC#2 is mechanical rather than a promise.** The spec walks `src/app/` at load time over the five filenames that render a top-level response (29 `page.tsx` + 4 `not-found.tsx` + 5 `error.tsx` + 1 `global-error.tsx` + 3 `opengraph-image.tsx` = 42), adds the one declared non-route class, and asserts `{missing, extra, duplicated}` are all empty. **A new route with no row is a failing test.** A second assertion fails any skip reason shorter than 80 characters.
- **Nine host surfaces are audited with no `postgres()` client.** `/host/listings/new` mints a real draft and redirects into the wizard, so two UI sign-ups in `beforeAll` reach `/host`, `/host/requests`, `/host/bookings`, `/host/listings`, the wizard, the availability editor, `/host/earnings` and both payout landings — plus `/profile`, `/bookings` and the booking not-found. `deferred-items.md` warns by name against a seventh DB-seeding spec; this is not one.
- **Two real WCAG violations found and closed** (both may-fix-in-place under the UI-SPEC's remediation table), and neither was on A5's predicted list.
- **A1, A4 and A5 are readings now.** Two were confirmed, one was falsified.
- **The vacuity guard was watched red** — and the plan's own prescribed mutation had to be replaced, for a reason 17-01 had already measured.
- **AC#24: six sentences across four files** now say court-only and name what that costs, with the superseded wording quoted rather than deleted.

## Task Commits

1. **Task 1: the table-driven court sweep at 320 and 1280** — `c8b7d79` (test)
2. **Task 2: first run — A1/A4/A5 measured, red-watch, and every violation triaged** — `9989531` (fix)
3. **Task 3: AC#24 — six stale two-theme sentences amended** — `84e4270` (docs)

**Plan metadata:** the final `docs(17-07)` commit.

## The first run, and what it actually said

`npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1 --reporter=list`
→ **48 passed · 4 failed · 36 skipped**, 4.9 minutes. After the fixes: **52 passed · 0 failed · 36 skipped**, 2.7 minutes.

Four reds: **two real defects and two of my own tells.** Both classes are worth separating, because only one of them is a finding about the product.

### The two defects

| Rule | Surface | Widths | Disposition | Fix |
|---|---|---|---|---|
| `aria-progressbar-name` (serious) | `/host/listings/[id]/edit` — the wizard's progress bar | 320 and 1280 | **May fix in place** ("a control with no accessible name fails SC 4.1.2 outright; the name is not a design decision") | `aria-labelledby` on `<Progress>` pointing at the `Step N of M` paragraph already above it |
| `heading-order` (moderate) | `/host/listings` — `ListingCard`'s `h3` under the page `h1` | 320 and 1280 | **May fix in place** ("fixing a heading level to close a skipped step") | `titleAs` prop on `ListingCard`, defaulting to `h3`; the host grid passes `h2` |

**On the progress bar.** A `role="progressbar"` with no accessible name at all — a screen-reader user heard a percentage with nothing saying what it measured. The fix is `aria-labelledby` rather than an invented `aria-label` because the sentence is already there, already maintained, and already moves with the step: an assistive-technology user now gets exactly what a sighted user gets and the phase authors **zero new product copy**. It is at the CALL SITE rather than inside `ui/progress.tsx`, because a default baked into the vendored primitive would be a generic invented name, wrong on every other bar.

**On the heading.** `/host/listings` is its `<h1>` and then the grid, with nothing between, so the card's `h3` skipped a rung. The same card is CORRECT on `/`, where the outline is `h1` → the results `h2` (`search-results.tsx:187`) → the cards. So the level is a prop: which rung a fragment sits on is a property of the page, and baking either answer into the card makes the other page wrong. Changing the default to `h2` would have flattened the search grid's titles into siblings of the heading they belong under — legal to `heading-order` and a worse outline. Tailwind's preflight resets heading size and weight to `inherit`, so **the outline moves and not one pixel does.**

### The two tells (defects in this plan's own table, not in the product)

- `/host/listings` was hooked on `row-card`, which is the MOBILE row primitive `/host/requests` and `/host/bookings` render; this grid renders `ListingCard`, which carries no declared id. Red at the tell: `33 x locator resolved to 0 elements`.
- The obvious replacement — an `h1` hook — **would have been worse than red.** `host/listings/loading.tsx` composes `<PageHeader title="Your listings" />` byte-identically to the resolved page, so an `h1` hook passes against the skeleton and the row would have reported a plate of grey bars as a clean surface. Shipped tell: `a[href^="/host/listings/"][href$="/edit"]`, which only a populated card renders. Both candidates and both reasons are recorded at the row.

## The three assumptions, replaced by measurements

**A1 — does excluding the `nextjs-portal` HOST take its OPEN shadow subtree out of scope? YES.**
Zero violation targets and zero incomplete targets began `nextjs-portal` across all 48 measured scans. Confirmed a second way by a throwaway probe (written, run, deleted) that read every violation *and* incomplete target on `/terms`, `/` and the root not-found: `portal-targets=0` on all three. **The fallback `helpers/axe.ts` names — a shadow-piercing selector, or a production-build run — is not needed, and nothing was added.** Recorded in the spec's header, in `helpers/focus.ts`'s "the partition is ASSERTED, not trusted" spirit: this is a reading against Next's current dev-overlay shape, not a guarantee about its next one.

**A4 — does `heading-order` survive being enabled alongside the tag filter? YES, and the proof is stronger than the one that was asked for.**
It is in `results.passes` on every surface probed — `/terms` (22 passing rules), `/` (26), root not-found (13) — **and it fired as a real violation on `/host/listings`.** A rule that both passes and fails on this app under the declared tags is not merely present in the result object; it is doing work. So heading coverage is **not** host-only, and plan 17-10's bespoke outline walk lands on top of it rather than instead of it.

**A5 — the predicted "most likely to fire" rule list is replaced, and it was wrong in both directions.**
Predicted, ranked: `color-contrast`, `scrollable-region-focusable`, `nested-interactive`, `aria-prohibited-attr`, `label` / `form-field-multiple-labels`, `aria-required-children`. Measured: **not one of the six fired.** `color-contrast`, `aria-prohibited-attr` and `nested-interactive` are all in `results.passes` on the surfaces that exercise them. The two rules that DID fire were not on the list at all. The useful correction is not the ranking but the shape: **the defects on this app are missing accessible names and outline rungs, not colour.**

Because `color-contrast` never fired, § Color's arbitration procedure was **not exercised**: no pairing was flagged, no row was added to `contrast-pairs.ts`, and no token value was proposed. That is the honest state — the procedure is still untested against a real disagreement.

## The vacuity guard, watched red

⚠ **The plan's prescribed mutation could not work, and that is itself a measurement.** The plan says *"point one row temporarily at a URL that 404s"*. 17-01 measured a 404 route on this app rendering a full not-found document — **57 nodes, 22 passing rules, zero violations** — so a watch pointed at one cannot go red. `about:blank` is the subject that works.

- **MUTATION:** the `/terms` row's `tell` set to `html` (so the reachability guard passes and cannot be what fires) and its navigation redirected to `about:blank`.
- **COMMAND:** `npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1 --grep terms`
- **OBSERVED — 2 failed**, and the assertion that fired is the **NODE FLOOR** at `helpers/axe.ts:173`, not the violation list at `:181` and not the tell:

```
Error: /terms · court · 1280px: axe examined 3 nodes across its passes, violations and incomplete
results, against a floor of 8. An empty document violates nothing, so a scan this small is an
instrument failure and not a verdict …
expect(received).toBeGreaterThanOrEqual(expected)   Expected: >= 8   Received: 3
```

That distinction is the whole point: an empty page reports zero violations, which is byte-for-byte what a clean surface reports. **RESTORED** — `git diff` on the file after the restore was empty.

## The table, and what it does not cover

**43 rows = 42 route files on disk + 1 declared non-route class.** 24 measured, 19 named skips. Every skip throws its reason into the run's own output, and none is shorter than 80 characters (asserted).

**The four D-201 exclusions appear IN the table with their reasons, never as absences:** the two dev instruments, the three OG image routes, the email templates, and `global-error`.

**`global-error`'s reason is CORRECTED, not copied.** 17-UI-SPEC justifies excluding it by axe's page-structure landmark rule — but that rule is `best-practice`-tagged, carries no `wcag*` tag, and is therefore excluded by the declared conformance tag filter, so it can never fire on any surface in this sweep and cannot justify anything. The shipped reason is that it renders its **own document**, receives no global styles, cannot be themed, and is already `THEME_SWAP_EXCLUSIONS`' only entry. The row says it supersedes the UI-SPEC's sentence.

**Stated gaps, all recorded in the file's own header rather than implied away by a green:**

- **The 21 `loading.tsx` files are not their own rows** — a loading state is a transient state of its route's document with no URL that serves it. Exactly one is deterministically reachable (the checkout's, through `installTruncator`) and **that one is a measured row**. The other twenty are covered as a class by `skeleton-a11y.test.tsx` and `loading-coverage.test.ts`, which are source gates and not rendered ones.
- **The resolved checkout is not scanned** — its row measures the served shell + skeleton; the confirm bar, the price disclosure and the breakdown need a minted hold.
- **Nine booking/host/invite surfaces are named skips**, each naming the fixture it wants. What goes unscanned is the money statements, the payment-state panels, the RSVP controls and the host accept/decline — which is the sharpest class of surface in the product and the honest headline of this table's coverage.

## Decisions Made

1. **A new spec, not a fourth table in `overflow-320.spec.ts`.** That file is 2,092 lines and its AC#29 half is deliberately seed-free; mixing an axe pass in would couple the cheapest gate in the suite to the flakiest fixtures, and a red in one half would stop the other reporting.
2. **The row's identity is its route FILE path, not a URL.** That is what makes the declared set derivable from disk and the equality assertion non-fakeable.
3. **No `postgres()` client.** The reachable set is exactly what the shipped UI can produce from a fresh account — which is more than expected, because `/host/listings/new` mints a real draft.
4. **`mode: "default"`, not `serial`.** `default` keeps the block in one worker (two sign-ups per worker against a five-per-sixty-seconds limit on `/sign-up/email`) while letting every row report — a serial block stops after its first red, and enumerating every violation in one run is this file's job.
5. **`aria-labelledby`, not `aria-label`.** Zero new product copy; the existing sentence is already the right answer.
6. **`titleAs`, not a changed default.** See above.
7. **`about:blank`, not a 404.** See above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `/host/listings`' declared tell named the wrong primitive, and its obvious replacement was worse**

- **Found during:** Task 2 (first run)
- **Issue:** The row was hooked on `[data-testid="row-card"]`, which `/host/requests` and `/host/bookings` render; `/host/listings` renders `ListingCard`, which carries no declared id. The row went red at its tell with `33 x locator resolved to 0 elements` and never scanned. The obvious fix — an `h1` — would have passed against `host/listings/loading.tsx`'s byte-identical `PageHeader`, reporting a skeleton as a clean surface.
- **Fix:** `a[href^="/host/listings/"][href$="/edit"]`, rendered only by a populated card on only this route. Both rejected candidates and both reasons are recorded at the row, because both are the mistake a reader would make next.
- **Files modified:** `e2e/axe-sweep.spec.ts`
- **Verification:** the row now reaches the surface and reported the real `heading-order` violation underneath it
- **Committed in:** `c8b7d79` (the corrected tell shipped with Task 1) / the finding is recorded in `9989531`

**2. [Rule 2 - Missing Critical] The wizard's progress bar had no accessible name (SC 4.1.2)**

- **Found during:** Task 2
- **Issue:** `aria-progressbar-name` (serious), `.h-1`, at both widths. A `role="progressbar"` with no name — the Name clause of SC 4.1.2 failing outright.
- **Fix:** `aria-labelledby="wizard-step-progress-label"` on `<Progress>`, with the id on the `Step N of M` paragraph already above it.
- **Files modified:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
- **Verification:** both wizard rows pass; `npm run build` exit 0
- **Committed in:** `9989531`

**3. [Rule 2 - Missing Critical] `/host/listings` skipped a heading level (`heading-order`)**

- **Found during:** Task 2
- **Issue:** `heading-order` (moderate), `h3`, at both widths — the page is its `h1` and then the grid.
- **Fix:** `titleAs` on `ListingCard` (default `h3`, correct on `/`), with `/host/listings` passing `h2`.
- **Files modified:** `src/components/listing/listing-card.tsx`, `src/app/(host)/host/listings/page.tsx`
- **Verification:** both rows pass; `npm run build` exit 0 (66 files, 1247 passed, 3 skipped) — no design gate pins the card's level
- **Committed in:** `9989531`

**4. [Rule 1 - Bug] The plan's red-watch subject cannot go red on this app**

- **Found during:** Task 2
- **Issue:** The plan prescribes a URL that 404s as the vacuity probe. 17-01's SUMMARY records the measurement that makes that impossible here (57 nodes, 22 passing rules, zero violations on a 404 route) and names this plan as the one that needs to change.
- **Fix:** `about:blank`, with the substitution and 17-01's reading recorded in the spec's header alongside the observed message.
- **Files modified:** `e2e/axe-sweep.spec.ts`
- **Verification:** the node floor fired at `helpers/axe.ts:173`; mutation restored, `git diff` empty
- **Committed in:** `9989531`

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 missing critical)
**Impact on plan:** No scope creep. Two are corrections to this plan's own table; two are the product findings the plan exists to produce, and both fall inside the UI-SPEC's may-fix-in-place list. Nothing in the escalate column was touched: no token value moved, no accent entry added, no copy changed, no booking/payment/capacity/availability logic touched, and `git status --porcelain drizzle/` is empty.

## Escalate-class findings — none absorbed

**Zero.** No finding in this run required a token value to move, an eleventh `ACCENT_USES` entry, a new card pattern, a copy change, a logic change, or a schema migration. `git status --porcelain drizzle/` prints nothing (AC#32 / GATE-06).

Two **out-of-scope** discoveries were batched to `deferred-items.md` per D-199 rather than fixed:

1. **`e2e/helpers/axe.ts` states that axe's SC 2.5.8 target rule cannot run, and at axe-core 4.13.0 it does.** Measured: the rule id is in `results.passes` on all three probed surfaces, and a disabled rule does not appear in `passes` at all. **The correction cannot be written in the file that needs it** — 17-01's acceptance criterion requires zero occurrences of that identifier in that file — so it lives in `axe-sweep.spec.ts`'s header and in the ledger. **No policy changes:** `expectTargets` (`TARGET_FLOOR_PX = 24`) remains the authority, because axe's rule honours SC 2.5.8's spacing and inline exceptions and reports no named offenders. What changes is what a green here *means*: slightly more than the helper claims, not less.
2. **A dev-only hydration mismatch on the mobile nav drawer trigger**, on every route rendering the signed-in shell. Radix mints `aria-controls` client-side and the server render carries none. Pre-existing, in no file this plan touches, and **not an accessibility finding by measurement** — axe reported nothing, because the regenerated tree is correct by the time a scan reads it.

## Issues Encountered

- **A throwaway probe spec** (`e2e/tmp-a4-probe.spec.ts`) was written to read `results.passes` and every violation *and* incomplete target, which `expectAxeClean` deliberately does not expose. Run once, **deleted before the Task 2 commit** — it is not in git history. Recorded here because the A1, A4, A5 and `target-size` readings came from it and would otherwise have no provenance. This is 17-01's precedent, deliberately repeated.
- **Pre-existing untracked `.claude/`** — not this plan's, not committed, same as 17-01 recorded.

## Requirements

`requirements: [GATE-02]` in the plan frontmatter. **Not marked complete — requirements-advanced only.** GATE-02 reads *"every surface is operable by keyboard alone, with a visible focus indicator throughout — including the calendar, the slot picker, the wizard, dialogs and sheets."* This plan ships the **axe** half of that gate and asserts nothing about keyboard operability or focus indicators; that is plan 17-08's five-property walk. `REQUIREMENTS.md` is unchanged on purpose.

## Verification

| Check | Result |
|---|---|
| `npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1` | **52 passed · 0 failed · 36 skipped** — zero violations |
| `npm run build` | exit 0 — lint 0 errors / 25 pre-existing warnings; `test:design` 66 files, 1247 passed, 3 skipped; `next build` compiled |
| `npx tsc --noEmit` | exit 0 |
| `grep -rc 'disableRules' e2e/` | 0 in every file |
| `grep -c 'disableRules\|withTags\|\.options(' e2e/axe-sweep.spec.ts` | `0` |
| `grep -c '"grove"' e2e/axe-sweep.spec.ts` | `0` (court only) |
| `grep -c '\.exclude(' e2e/axe-sweep.spec.ts` | `0` — the only exclusion in the phase is `helpers/axe.ts`'s component-level one |
| non-comment `skip:` count vs null-path rows | `18` vs `18` |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32) |
| AC#24 — `D-138` and `court` present in all four amended files | yes; each surviving two-theme quote is marked `SUPERSEDED` |
| AC#24 — comments only | `git diff -U0` over the four files has **zero** non-comment changed lines |
| `git diff --diff-filter=D --name-only bfb75ab..HEAD` | empty — this plan deleted nothing |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 17-08.** Four things later plans should read off this one rather than re-deriving:

1. **`heading-order` is live on every surface, not just the host routes** (A4). Plan **17-10**'s bespoke outline walk adds depth to a rule that is already running and already firing — it is not the only heading coverage in the tree, and the plan's framing should say so.
2. **The seven unmeasured routes 17-11 owns are already rows here, as named skips** — and four of them (`/host/earnings`, `/host/listings`, `/host/listings/new`, both payout landings) turned out to need **no fixture at all**. 17-11's coverage-delta work is smaller than RESP-03's table implies; read the skip paragraphs before building a fixture.
3. **17-12's four `[11-21]` throw routes have four waiting rows.** Each error-boundary skip names exactly what the group-local route would unblock, so unskipping is a one-line change per row once the routes exist.
4. **17-13 inherits two ledger rows** — the `target-size` docblock correction (which must also amend 17-01's grep in the same change) and the nav-drawer hydration mismatch.

**One caution for the verifier.** `STATE.md`'s body *"Current Position"* block still reads `Plan: 2 of 14` and has since 17-02. It was left byte-identical rather than corrected here: six consecutive plans have left it, and a lone edit now to the file this phase keeps recording as sdk-damaged would read as tampering. **The frontmatter is the accurate position** (`current_plan: 8`).

## Self-Check: PASSED

- `e2e/axe-sweep.spec.ts` exists on disk (940 lines); all seven modified files exist
- All three task commits resolve in `git log --all`: `c8b7d79`, `9989531`, `84e4270`
- `git diff --diff-filter=D --name-only bfb75ab..HEAD` is empty — nothing was deleted
- Every task's `<acceptance_criteria>` was executed and logged; all pass
- The plan-level `<verification>` block was re-run at close: sweep 52/0/36, `npm run build` exit 0, `tsc --noEmit` exit 0, `disableRules` 0 across `e2e/`, `drizzle/` untouched

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
