---
phase: 14-host-tooling
plan: 08
subsystem: ui
tags: [react, rsc, nextjs, playwright, e2e, design-system, host-surfaces, timezone, owner-scoping]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "14-01's `HOST_PANEL_SHELL` and the optional-height `RowListSkeleton`; 14-02's `queryHostAgenda` / `readDbNow` and the guarantee that `next` is null whenever `today` is non-empty; 14-05's `HostAgenda`, `HostSignals`, `WITHHELD_BOOKER_LABEL` and the five declared hooks"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`PageHeader` (one `<h1>`, wraps never truncates), `EmptyState`'s discriminated union, and the committed loading/card/selector gates this plan had to land inside"
  - phase: 07-booking-management
    provides: "`composeWhenLabelShort` — the ONE venue-local window formatter — and the display-map shape `/host/requests` established"
provides:
  - "`/host` as a TODAY view: today's real sessions first, then the three signals, from one database-clock read"
  - "`composeStartTokens` — the start of a window as two venue-local tokens, so a surface can build its own sentence without a second formatter"
  - "a `/host` loading plate shaped like the page: the real header plus the agenda's row list, inside the declared shell"
  - "`e2e/host-dashboard.spec.ts` — the three-consumer count and the who-is-coming claim, both executable and both observed failing"
affects: [14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A page reads the database clock ONCE and threads it into the query, the rows and every badge — a second read is unobservable drift"
    - "Two accent call sites that are arms of one runtime conditional are TWO source sites and ONE rendered element; folding them is a design-gate regression wearing a cleanup costume"
    - "A count with three consumers is asserted as a RELATION in a browser, not as a value in three unit tests — each consumer is correct alone and the defect is between them"
    - "A 'without a second click' claim counts main-frame navigations rather than assuming them"
    - "An e2e suite captures the session created by its signup drive and replays the cookies, instead of re-driving a rate-limited login form once per case"
    - "A card-surface inventory row moves WITH the component it declares, exactly as the invite-card row did"

key-files:
  created:
    - e2e/host-dashboard.spec.ts
  modified:
    - src/app/(host)/host/page.tsx
    - src/app/(host)/host/loading.tsx
    - src/lib/booking/when-label.ts
    - tests/design/card-pattern-coverage.test.ts

key-decisions:
  - "The loading plate composes ONE skeleton, not the two the UI-SPEC sketched: two patterns in one fallback is two named live regions announcing one wait, which AC#18's committed gate forbids by name and which this phase requires to pass unedited"
  - "The signals block is deliberately undrawn in the plate — its top edge depends on a row count a fallback cannot know, so a box there claims height at an address nothing will occupy, and it is the last region in both page states so its absence moves nothing"
  - "`composeStartTokens` was added to `when-label.ts` rather than formatting the quiet-day tokens on the page: the alternative was a bare `format()` call on the dashboard, which is exactly the fourth copy that module's header forbids"
  - "The header actions cluster renders only in the has-listings branch, so the two accent call sites stay mutually exclusive and 'exactly one accent-filled element' is true in BOTH states rather than only in one"
  - "The agenda row carries no money, following 14-05's design contract over the plan's props sentence — the frozen quote is on the inbox row where a host is deciding"
  - "The e2e suite replays the signup session instead of logging in per case, after seven form logins in one minute hit `auth.ts`'s 5-per-60s sign-in limiter and surfaced as a `waitForURL` timeout that read like a product bug"

patterns-established:
  - "Session replay over repeated login drives in a serial e2e suite, with the limiter named at the helper"
  - "Accent-fill detection resolves the rendered `--brand` token through a probe node and reports the full offending list, so a red names which second element became coral"
  - "A serial e2e suite walks ONE host through the three states of a multi-state region by adding rows, which is both cheaper than three sign-up drives and closer to how a host reaches them"

requirements-completed: []   # HFLOW-03 is shared across five plans — see the note below
requirements-advanced: [HFLOW-03]   # the dashboard itself; 14-15 and 14-16 still touch it

# Metrics
duration: 35min
completed: 2026-08-23
---

# Phase 14 Plan 08: The Dashboard Becomes a Today View Summary

**`/host` now opens with today's real sessions — who is coming, to which space, in that venue's own local
time from one database-clock read — and the two claims that were previously adjectives (one pending-request
predicate in three places, and "who is coming without a second click") are commands that have been watched
failing.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-23T19:08Z (baseline `tsc` 19:09, baseline design suite 19:11)
- **Completed:** 2026-08-23T19:41Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified) — 1,092 insertions, 167 deletions

## Accomplishments

- **The page's subject changed, and it is a rendered fact rather than a claim.** `/host` leads with the
  agenda; the greeting is the header pattern's title; the four-button cluster is two buttons; the payout
  notice and the hours advisory moved into the signals block below today's sessions. A seeded host with
  three sessions today reads three first names and three venue-local windows on `/host` with **zero**
  navigations, counted by a listener.
- **One clock, threaded.** `grep -c 'new Date(' src/app/(host)/host/page.tsx` is **0** and there is exactly
  one database-clock call, whose instant drives the venue-local day predicate inside the statement and every
  status badge on the rows it returns.
- **The three-consumer count is now a relation, and the relation has been broken on purpose.** The nav badge
  predicate was widened, the spec was run alone, and case 5 reported `nav badge 4, signal row 2, inbox 2` —
  the exact disagreement no unit test can see, because each consumer is correct in isolation.
- **Landmine 3 held.** `brand-recipe.test.ts` is byte-unedited and the host accent total is still **5**,
  distributed **2 / 2 / 1** across the three files that carry it. Both dashboard call sites survive as
  source sites and remain mutually exclusive at runtime.
- **A committed gate caught the UI-SPEC's own sketch, and the plate is better for it.** The prescribed
  row-skeleton-plus-panel-skeleton plate is two live regions announcing one wait; the gate that forbids it
  is right, so the plate announces once and says why in writing.
- **Zero migrations, zero packages, zero design-gate movement.** `npm run test:design` is still exactly
  **49 files / 827 passed / 3 skipped / 0 failed**; `drizzle/`, `src/lib/db/schema.ts`, `package.json` and
  `package-lock.json` are byte-untouched across all three commits; no commit deletes a tracked file.

## Task Commits

1. **Task 1: The page reads one clock, one agenda, and composes the two new blocks** — `9afece3` (refactor)
2. **Task 2: A plate shaped like the page it stands in for** — `119c4d5` (refactor)
3. **Task 3: The three-consumer count, and the agenda answered without a second click** — `5035bfb` (test)

## Files Created/Modified

- `src/app/(host)/host/page.tsx` — `+215/-140`, now 277 lines. Gate 2 unchanged; one clock read; the agenda
  read and its display map; `PageHeader`; `HostAgenda` / `HostSignals`; the no-listings `EmptyState`.
- `src/app/(host)/host/loading.tsx` — `+68/-16`, now 79 lines. The declared shell, the real `PageHeader`,
  one announced `RowListSkeleton`, and the corrected route arithmetic.
- `src/lib/booking/when-label.ts` — `+80/-9`. Adds `StartTokens` and `composeStartTokens`; extracts
  `resolveWholeDay`, `OPEN_ENTRY_TOKEN` and `WHOLE_DAY_TOKEN` from code that already existed.
- `e2e/host-dashboard.spec.ts` **(created, 720 lines)** — 6 serial chromium cases.
- `tests/design/card-pattern-coverage.test.ts` — `+9/-2`. One `CARD_SURFACES` row re-pointed at the
  component the notice moved into; counts unchanged at 13 surfaces / 11 adopted / 2 refused.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npx tsc --noEmit` (final) | exit **0** |
| `npm run test:design` (baseline) | **49 files / 827 passed / 3 skipped / 0 failed** |
| `npm run test:design` (final) | **49 files / 827 passed / 3 skipped / 0 failed** — unmoved |
| `npx vitest run tests/booking/when-label.test.ts` (test file UNEDITED, after the extraction) | 1 file / **20 passed** — the formatter's output is provably byte-identical |
| `npx vitest run tests/host tests/booking tests/security` | 68 files / **770 passed / 0 failed** |
| `npx vitest run tests/listing tests/host tests/booking tests/availability tests/security` | **103 files / 1149 passed / 0 failed** — the stated baseline, unmoved |
| `npx playwright test e2e/host-dashboard.spec.ts --project=chromium` (ALONE) | **6 passed** (27.8s) |
| `npx playwright test e2e/host-dashboard.spec.ts e2e/mode-switch.spec.ts --project=chromium` | **8 passed** (33.2s) — two named files, never bare |
| `npx eslint` on all four changed source/spec files | exit **0**, zero warnings |
| `git diff --stat drizzle/` over all three commits | **empty** — zero migrations (PROJECT D-136) |
| `git diff --stat src/lib/db/schema.ts` over all three commits | **empty** |
| `git diff --stat package.json package-lock.json` over all three commits | **empty** — no package installed |
| `git diff --diff-filter=D` per commit | **no deletions in any of the three commits** |
| `git diff --stat tests/design/brand-recipe.test.ts` | **empty** — landmine 3 held |
| `git diff --stat tests/design/loading-coverage.test.ts` | **empty** — still pins 29 / 21 / 8 |
| `git diff --stat tests/design/skeleton-measurements.test.ts` | **empty** |
| `git diff --stat tests/design/selector-contract.test.ts src/lib/design/selector-contract.ts` | **empty** — no undeclared hook introduced |

**`e2e/availability.spec.ts:261` — the pre-existing standing red — was neither run, touched nor claimed.**
No spec outside this plan's own two named files was invoked, so no untouched-spec failure is reported.

### The acceptance greps, measured

Run against `src/app/(host)/host/page.tsx`:

| Token | Count | Note |
|---|---|---|
| `variant="brand"` | **2** | exactly the two real call sites; the shipped comment that quoted the token was renamed descriptively, which is what took the raw count from 3 to 2 |
| `new Date(` | **0** | GATE-NOREG 9 |
| `date-fns` | **0** | GATE-NOREG 10 — no date-formatting library is imported by this file |
| `data-host-dashboard` | **1** | |
| `readDbNow` | **2** | ⚠ see below |
| `HOST_PANEL_SHELL` | **2** | ⚠ see below |
| `composeWhenLabelShort` | **2** | criterion is "at least 1" |

⚠ **Two of the plan's acceptance greps are unsatisfiable as literally written, and the numbers above are
the honest ones.** `grep -c` counts LINES, and a file that *imports* a symbol necessarily contains it on
the import line as well as at its use — so `readDbNow` and `HOST_PANEL_SHELL` can never read 1 in a file
that uses them, and `/host/requests/page.tsx` (the plan's own cited analog) reads 2 for `readDbNow` today.
The substantive claims the criteria are proxies for are both true and separately checkable:
`grep -c 'readDbNow('` is **1** (one clock read, one call site) and there is exactly one
`HOST_PANEL_SHELL` usage with the hand-typed container string gone.

### The host accent inventory, per file

Comment-stripped, which is how `brand-recipe.test.ts` scans:

| File | Accent call sites |
|---|---|
| `src/app/(host)/host/page.tsx` | **2** |
| `src/app/(host)/host/listings/page.tsx` | **2** |
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` | **1** |
| **Host total** | **5** — unchanged, and `brand-recipe.test.ts` is unedited |

### The route arithmetic, measured

```
find 'src/app/(host)' -name loading.tsx | wc -l   →  11
find 'src/app/(host)' -name page.tsx    | wc -l   →  11
```

Eleven pages, eleven plates — every host route ships its own. The old header comment said *"all nine host
routes"*, which had drifted by two; the corrected figure is written into the file.

### Mutation — the three-consumer count has been observed catching a disagreement

Task 3's acceptance criterion. `ambient-notifications.tsx`'s nav-badge predicate was changed from
`eq(booking.status, "requested")` to `eq(booking.status, "confirmed")` — a one-token edit, the shape a
careless refactor actually takes — and the spec was run ALONE. Observed:

```
  1) [chromium] › e2e\host-dashboard.spec.ts:626:7 › HFLOW-03 — the host dashboard is a today view ›
     (5) the nav badge, the signal row and the inbox all report the SAME N — and move together

    Error: the three consumers of ONE pending-request predicate disagree: nav badge 4, signal row 2,
    inbox 2. A host who sees one number in the shell and another in the inbox has no way to know which
    is lying, and neither looks broken on its own.

    - Expected  - 1
    + Received  + 1

      Array [
    -   2,
    +   4,
        2,
        2,
      ]

  1 failed · 1 did not run · 4 passed (21.2s)
```

**The message names the defect rather than reporting a number**, which is the whole reason the three counts
are asserted as one array. Reverted → `git diff --exit-code src/components/patterns/ambient-notifications.tsx`
printed nothing → **6 passed**.

## Decisions Made

**1. The loading plate composes ONE skeleton, and the UI-SPEC's sketch was not followed.**
14-UI-SPEC § Loading draws this plate as a row skeleton followed by a panel skeleton. That is two named
`role="status"` live regions announcing one wait, and `tests/design/loading-coverage.test.ts` forbids it by
name — *"two skeletons in one fallback announce the same wait twice"* — which is GATE-03 rule 6 from the
other side. The gate is committed, this plan's own critical rules require it to pass **unedited**, and it is
right: one page, one sentence. The plate therefore announces once, with the new copy-contract sentence, on
the block the page is actually about.

**2. The signals block is not drawn in the plate at all — not even as inert decoration.**
The obvious repair for (1) is a hand-rolled `aria-hidden` block at `PANEL_MIN_HEIGHT`. It was rejected on a
stronger argument than the gate: **a placeholder only prevents a shift if it lands where the real content
lands**, and the signals block's top edge depends on how many sessions the host has today — a number a
fallback cannot know. A box under a variable-length list claims page height at an address nothing will
occupy. It is also the LAST region in both of the page's states, so nothing renders below it that its
absence could move. Drawing it would additionally have made this the first `loading.tsx` in the tree to
re-author a pattern's body. All three reasons are recorded in the file.

**3. `composeStartTokens` was added to `when-label.ts`, which is not in the plan's `files_modified`.**
D-142's quiet-day sentence is *"Nothing today — next: {date} · {time} · {space}"*, and `HostAgendaNextData`
(14-05, shipped and pinned by 29 jsdom cases) takes `dateLabel` and `timeLabel` as **separate** tokens. No
export produced them: `composeWhenLabelShort` returns one finished string with a comma and a city suffix,
and splitting that string would be parsing a format. The two alternatives were a bare `format()` call on the
dashboard page — the fourth copy that module's header explicitly forbids, and the one that would have made
`/host` the only host surface whose window text was not produced by the shared module — or a re-implemented
mode fork inside the page. Adding the tokens to the module that owns venue-local rendering is what its own
header instructs (*"every new time surface imports from here"*). See Deviations.

**4. The header actions cluster renders only when the host has listings.**
The UI-SPEC's shell sketch shows `actions` unconditionally. Rendered that way, a host with no listings sees
the header's accent create action AND the empty state's, which makes AC#5 ("exactly one accent-filled
element in the `/host` viewport") false in one of the two states — measured, not predicted. Gating the
cluster on `hasListings` keeps the two accent call sites **mutually exclusive at runtime** while both survive
in **source**, which is exactly the shape `brand-recipe.test.ts`'s own header describes for
`not-completed-state.tsx`'s pair. Case 2 and case 6 of the new spec assert one accent in each state.

**5. The agenda row carries no money, and the plan's props sentence was not followed.**
Task 1's action says to put "the frozen quote through the shared money formatter". `HostAgendaRowData`
(14-05) has no money field, and 14-05 recorded the reason as a decision: 14-UI-SPEC § The agenda row
enumerates the slots as title / meta / status / href and D-140 names four fields, none of them a total. The
design contract wins over the plan's prose — which is also what this plan's own briefing note said. The
consequence is that `formatMoney` is not imported here at all and `price-surface.test.ts` has nothing to
scan on this surface.

**6. The e2e suite replays the signup session rather than logging in per case.**
Written the obvious way — a `logInAs` at the top of each of six serial cases, copying
`host-inbox-hierarchy.spec.ts` — the file drove `POST /api/auth/sign-in/email` **seven times inside one
minute**, and `src/lib/auth.ts:167` rate-limits that route to **5 per 60 seconds**. Case 6 timed out in
`waitForURL` with nothing in the failure naming a limiter; it read exactly like a bug on the page under
test. The host now signs in once, implicitly, by signing up, and every later case replays those cookies.
The limiter is correct and stays; the spec stops leaning on it, and the whole file dropped from 1.1 min to
27s. The measurement is written at the helper so the next serial suite does not rediscover it.

**7. The six cases are serial and build on each other.**
The agenda's three states are three states of ONE host — nothing booked, then a quiet day, then a busy one —
so the suite walks a single host through them by adding rows. Cheaper than three sign-up drives, and a
stronger claim: each state is reached the way a real host reaches it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `when-label.ts` gained `composeStartTokens`, and two internal extractions with it**
- **Found during:** Task 1, composing D-142's quiet-day row
- **Issue:** `HostAgendaNextData` requires `dateLabel` and `timeLabel` as separate venue-local tokens and no
  export produced them. The page could not render the quiet-day state at all without either a
  date-formatting call on the page (banned by this plan's own GATE-NOREG 10 acceptance grep, and the fourth
  copy `when-label.ts`'s header forbids) or a second implementation of the drop-in / whole-day mode fork.
- **Fix:** Added `StartTokens` + `composeStartTokens` to the module that owns venue-local rendering, built
  on the same `SHORT_DATE` token, the same `h:mm a` format and the same mode fork the range form uses. To
  reuse rather than copy that fork, `resolveWholeDay` was extracted from `compose` and the two mode words
  became the named constants `OPEN_ENTRY_TOKEN` / `WHOLE_DAY_TOKEN` — which additionally keeps this file's
  occurrence count of each literal at one, the property its own grep-tripwire header depends on.
- **Proof it changed no rendered byte:** `tests/booking/when-label.test.ts` was re-run **unedited** —
  20 passed — and `git diff --stat` on that test file is empty.
- **Files modified:** `src/lib/booking/when-label.ts`
- **Commit:** `9afece3`

**2. [Rule 3 — Blocking] `card-pattern-coverage.test.ts`'s `panel-card` row moved with the notice**
- **Found during:** Task 1, first design-suite run after the page rewrite
- **Issue:** The inventory declares `src/app/(host)/host/page.tsx` as a `panel-card` adopter, and the
  forward half of that gate requires a declared surface to actually import its pattern. Moving the
  hours-missing advisory into `HostSignals` (which is what composing 14-05's component means) left the row
  pointing at a file that no longer imports `PanelCard`. Two failures, verbatim:
  `expected [ …(10) ] to deeply equal [ …(11) ]` with `- "src/app/(host)/host/page.tsx"` in the diff.
- **Fix:** Re-pointed the row at `src/components/host/host-signals.tsx` with a `why` recording the move —
  the precedent is in the same file, four rows above: `invite-card.tsx`'s row moved with its component in
  plan 11-19 for the identical reason. **No count changed**: still 13 declared surfaces, 11 adopted,
  2 refused, and `EXPECTED_SURFACES` was not touched. The second `PanelCard` in `HostSignals` (the requests
  advisory) adds no row — this inventory declares files, not sites.
- **Files modified:** `tests/design/card-pattern-coverage.test.ts`
- **Commit:** `9afece3`

**3. [Rule 3 — Blocking] The loading plate announces once, not twice**
- **Found during:** Task 2, first design-suite run after the plate rewrite
- **Issue:** The plan's action and 14-UI-SPEC § Loading both prescribe a row skeleton **and** a panel
  skeleton. `loading-coverage.test.ts` reported
  `"src/app/(host)/host/loading.tsx (patterns: 2, own role=status: 0, named: false)"` — AC#18 allows exactly
  one announcement per fallback, and this plan's critical rules require that gate to pass with its file
  unedited.
- **Fix:** The plate composes the row skeleton only, and the file records the gate, why it is right, and the
  independent reason the trailing signals placeholder was not worth hand-rolling either (Decision 2).
- **Files modified:** `src/app/(host)/host/loading.tsx`
- **Commit:** `119c4d5`

**4. [Rule 3 — Blocking] The e2e suite hit the sign-in rate limiter**
- **Found during:** Task 3, first full run of the new spec
- **Issue:** Case 6 failed with `TimeoutError: page.waitForURL: Timeout 30000ms exceeded` at the login
  drive. Cause: six serial cases each logging in, plus two signups, is seven `POST /sign-in/email` calls
  inside one minute against a documented **5 per 60s** limit (`src/lib/auth.ts:167`). Nothing in the failure
  named a limiter — it presented as the page under test refusing to load.
- **Fix:** The suite captures the cookies the signup drive already produced and replays them
  (`resumeSession`), removing the login form from five cases entirely. The helper's docblock records the
  measurement so the next serial suite does not rediscover it. **The limiter itself was not touched** —
  weakening a real endpoint protection to make a test pass would have been the wrong repair.
- **Files modified:** `e2e/host-dashboard.spec.ts`
- **Commit:** `5035bfb`

### Disclosures that are not deviations

**(a) The plan's read-list for Task 1 mentions rendering the frozen quote; the surface renders none.**
See Decision 5. Reported rather than absorbed silently, because a reader comparing the plan's action text to
the diff will notice `formatMoney` is absent.

**(b) Two acceptance greps are unsatisfiable as written.** See § The acceptance greps, measured. The
measured numbers are reported rather than the criteria being declared met.

**(c) The header actions cluster is conditional, where the spec's sketch is not.** See Decision 4.

**Total deviations:** 4 auto-fixed (0 Rule 1, 0 Rule 2, 4 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no migration, no index, no package, no schema change, no
change to any payout or earnings file, and no edit to `brand-recipe.test.ts`, `loading-coverage.test.ts`,
`skeleton-measurements.test.ts` or `selector-contract.ts`.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-08-AUTHZ | **mitigated** | Gate 2 is byte-unchanged (session, then `canHost`, both re-checked on the page). The agenda read is in the PAGE; `tests/design/blocking-session-gate.test.ts` passes with zero edits, which is the assertion that no read moved into the `(host)` layout |
| T-14-08-IDOR | **mitigated** | Ownership is a bound `WHERE l.host_id = $1` inside `queryHostAgenda`'s statement (14-02), re-proved by `tests/security/bookings-owner-scope.test.ts` — 103 files / 1149 passed includes it. No page branch filters rows |
| T-14-08-CLOCK | **mitigated** | One clock call; `grep -c 'new Date(' ` on the page is **0** and `grep -c 'date-fns'` is **0**. The same instant is passed to the query, to `HostAgenda` and through it to every badge |
| T-14-08-COUNTDRIFT | **mitigated** | No fourth query added — the signal row is consumer #2 reshaped. `e2e/host-dashboard.spec.ts` case 5 asserts all three consumers as ONE array, twice, at two different N, and was **observed red** against a one-token predicate change (message recorded above) |
| T-14-08-PII | **mitigated** | The row projection carries `bookerFirstName` only, with the shared withheld fallback imported rather than retyped. No email, surname or phone reaches this surface; the seeded bookers' emails appear nowhere in the rendered dashboard |
| T-14-08-FALSEALARM | **mitigated** | Case 1 asserts **zero** retry affordances and **zero** `role="alert"` elements, scoped INSIDE the nothing-booked branch's own hook — scoped to the document those would pass on a render that produced nothing, and would also wrongly indict the payout banner, which is an alerting composition on purpose |
| T-14-08-ACCENT | **mitigated** | Both call sites survive; `brand-recipe.test.ts` passes with `git diff --stat` empty; host total still 5 (2/2/1). Case 2 and case 6 additionally assert exactly ONE accent-filled element rendered, at 320 / 768 / 1280, in both states |
| T-14-08-SC | **mitigated** | **No package was installed.** `package.json` / `package-lock.json` diff empty across all three commits |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. The one
new export (`composeStartTokens`) is a pure formatter over data the caller already holds. **No
`## Threat Flags` section is owed.**

## Known Stubs

None. Every value on the surface is selected from a column or composed from one: the agenda rows come from
`queryHostAgenda`, the three signal numbers from the three authorities that already owned them, and the
greeting from the session. Nothing is hardcoded empty, and the only placeholder-shaped strings in the
diff — `"Your space"` and the withheld-booker label — are the shipped fallbacks `/host/bookings` and
`/host/requests` already use for the same columns.

## Issues Encountered

**The UI-SPEC's plate sketch and a committed gate disagreed, and the gate was right.** Resolved as
Decisions 1 and 2. Worth recording as an issue rather than only as a decision: this is the second time in
the phase that a spec sketch has been checked by an executable gate rather than by review, and both times
the gate carried the argument the sketch had not made.

**A `grep -c` acceptance criterion cannot distinguish an import from a use.** Two of Task 1's criteria are
unsatisfiable for that reason, and the plan's own cited analog (`/host/requests/page.tsx`) already violates
one of them. Reported with the measured numbers and the call-site-only counts beside them, rather than
silently reinterpreted.

**Playwright's `framenavigated` fires for same-document route changes too**, which is what makes the
zero-navigation assertion answer "without a second click" rather than "without a full page load". Confirmed
by the counter reading 0 across a page that mounts client components and a streamed nav boundary.

## Requirements

`requirements-completed` is deliberately **empty**, even though this plan's frontmatter carries
`requirements: [HFLOW-03]`. HFLOW-03 is claimed by **five** plans in this phase (14-02, 14-05, 14-08, 14-15,
14-16) and two of them still touch this surface — 14-15 measures the agenda row's resting height and writes
it into the plate, and 14-16 is the phase's closing pass. Checking the requirement off here would make
`REQUIREMENTS.md` claim work that two later plans still owe. `requirements mark-complete` was therefore not
run; the last plan that touches HFLOW-03 owns it. This follows 14-02 and 14-05, which took the same position
in writing.

## User Setup Required

None — no external service configuration, no environment variable, no package install. The DB-backed tests
and the Playwright specs need the local `postgis/postgis:18` container running, which is the existing
convention.

## Next Phase Readiness

**Ready.** Three things the plans that follow must carry forward:

1. **`RowListSkeleton` in `host/loading.tsx` still has no height, on purpose.** 14-15 owns M1/M2 — measure
   the agenda row (status badge, no actions) at 320 and 1280, declare the value in `measurements.ts`, and
   pass it **by name**. The file records this at the call site; a literal there fails the loading gate.
2. **The plate announces exactly once and must keep doing so.** If a later plan wants the signals block
   drawn, the answer is not a second skeleton pattern — AC#18 forbids it — and the argument against inert
   decoration is written in the file.
3. **The dashboard's two accent call sites are the arms of one conditional.** A plan that "simplifies" them
   into one branch drops the pinned host total from five to four. `brand-recipe.test.ts` will say so, but
   the fix is to restore the branch, never to amend the gate.

**One standing caution:** `e2e/host-dashboard.spec.ts` is the **seventh** DB-seeding spec in `e2e/`. Name it
explicitly, cap any invocation at three seeding files, and treat a failure in an untouched spec as a flake
until it fails alone. `e2e/availability.spec.ts:261` remains a pre-existing standing red owned by nobody in
this phase.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All three claimed commits resolve in `git log` (`9afece3`, `119c4d5`, `5035bfb`), and all five claimed
source/spec files plus this summary exist on disk. The per-file diff figures above were re-measured with
`git diff --numstat HEAD~3 HEAD` and corrected against the first draft. No missing items.
