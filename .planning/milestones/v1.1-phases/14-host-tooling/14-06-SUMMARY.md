---
phase: 14-host-tooling
plan: 06
subsystem: ui
tags: [nextjs-rsc, playwright, text-measurement, design-system, host-surfaces, responsive]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "`HOST_LIST_SHELL` (14-01) — the declared host-list container a page and its own `loading.tsx` both read — and `RequestCountdown`'s `emphasis=\"lead\"` prop plus the terminal, deadline-led request row (14-03)"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`patterns/page-header.tsx` (exactly one `<h1>`, a title that wraps and never truncates) and `patterns/empty-state.tsx`, whose `tone=\"positive\"` inbox-zero this plan preserves byte-for-byte"
  - phase: 13-confirmation-bookings-trust
    provides: "`e2e/tabular-figures.spec.ts` — the repo's first TEXT-measurement spec, whose Range-over-the-text-node technique and \"(b) is the assertion, the rest makes it falsifiable\" structure this file copies"
provides:
  - "A deadline-first requests inbox: `Expires · Guest · Space · When · Guest pays · Actions`, six headers, no string renamed"
  - "One shell constant and one `PageHeader` shared by `/host/requests` and its loading plate"
  - "`e2e/host-inbox-hierarchy.spec.ts` — D-146 as a computed-`font-size` comparison over EVERY visible text node in a real row, at 320 / 768 / 1280"
  - "`REQUEST_STATUS_CAP` — the declared ceiling that discharges deferred item `[14-03]`, with the 320px measurement behind it"
affects: [14-07, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A hierarchy claim is enforced by COLLECTING every text node's computed size and taking the maximum, never by naming two elements — so an element that competes in a future edit is caught rather than ignored"
    - "The failure message prints the full sorted size list, so a red NAMES the element that competed instead of reporting a number"
    - "A responsive surface that renders two trees is measured in the tree that is VISIBLE at each width; the row under test is asserted visible before anything is measured, because `getBoundingClientRect` on a `display:none` subtree makes every comparison 0-vs-0"
    - "A box ceiling is derived from what the column EXISTS to hold (measured), not from what happens to be in it, and is pinned in both directions so tightening it past that content is also red"

key-files:
  created:
    - e2e/host-inbox-hierarchy.spec.ts
  modified:
    - src/app/(host)/host/requests/page.tsx
    - src/app/(host)/host/requests/loading.tsx
    - src/lib/design/measurements.ts
    - src/components/host/request-row.tsx
    - .planning/phases/14-host-tooling/deferred-items.md

key-decisions:
  - "The DESKTOP TABLE adopts `emphasis=\"lead\"` too. 14-03 gave the mobile card the lead layout and the table kept the inline one, so above `md:` the deadline rendered at the same 14px as everything beside it and D-146 was FALSE at two of the three widths the phase measures — with every committed gate green. The hierarchy is a property of the request ROW, not of the viewport"
  - "The guest name and the money figure both carry `text-label` and nothing else on the table, mirroring `ROW_VALUE_CLASS` on the card. D-146's third falsifiable is an EQUALITY between them, and it is what stops \"the countdown is the largest\" being kept true by an arms race"
  - "`[14-03]` is discharged with option (a), not option (b). The measurement — space title **8.66px** of a 244px line — is not a title truncating, it is a title erased, and the deadline being the thing under triage does not make WHICH SPACE optional"
  - "`REQUEST_STATUS_CAP` is applied to the status CONTENT in `request-row.tsx`, not to `row-card.tsx`'s `shrink-0` column: a definite max-width on the child is what caps the flex item's intrinsic size, and relaxing `shrink-0` would change all four adopters to fix one"
  - "The reason line's SENTENCE is three DOM text nodes, not one (JSX splits it at the interpolation). The walker deliberately does not glue them back together — the node-level split is correct for every size comparison — so the join happens only in the one assertion that asks a question about the sentence"
  - "Inbox-zero was not opened. D-147 asks for an `EmptyState` that reads as DONE and plan 11-16 already shipped exactly that; `empty-state-adoption.test.ts` passing with ZERO edits is the proof that nothing was re-decided"

patterns-established:
  - "Collect-then-maximise: a 'loudest/largest/first' claim is asserted over the whole set, with the set printed on failure"
  - "Measure the visible tree: a responsive surface is measured where it renders, and the row under test is asserted visible first"
  - "A declared ceiling is pinned in both directions — too wide is red, and so is too narrow"

requirements-completed: [HFLOW-01]
requirements-advanced: []

# Metrics
duration: 30min
completed: 2026-08-23
---

# Phase 14 Plan 06: The Requests Inbox Reads Deadline-First Summary

**The host request inbox became a triage queue — the deadline is the first column, the page and its loading
plate draw one box and one heading, and "the SLA countdown is the loudest element" stopped being an
adjective and became a Chromium comparison over every text node in a real row at three widths, which
immediately caught two defects nobody had noticed: the desktop table had never taken the lead layout, and
a capped row at 320px was rendering its space title at 8.66px.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-23T18:07Z (baseline `tsc` + design suite)
- **Completed:** 2026-08-23T18:37Z
- **Tasks:** 2 (3 commits — one auto-fix)
- **Files:** 5 (4 modified, 1 created) + one phase doc

## Accomplishments

- **The deadline is the first column.** `Expires · Guest · Space · When · Guest pays · Actions` — when,
  then who, then what, then when it is, then how much. The cells moved WITH their headers: no string was
  renamed, none added, none removed, `Guest pays` kept its right alignment and tabular figures, and
  `Actions` stayed a real, visible `<th scope="col">`.
- **The page and its plate can no longer disagree about their own box.** Both read `HOST_LIST_SHELL` and
  both render `PageHeader` with the same title and the same `APPROVAL_SLA_HOURS`-interpolating lede.
  `grep -c 'max-w-4xl'` is **0** in both files; the page's hand-rolled `<h1>` is gone.
- **D-146 is now a command that fails.** `e2e/host-inbox-hierarchy.spec.ts` walks every visible text node
  inside a real request row, measures each with a `Range` over the text node rather than the parent's box,
  and asserts the countdown digits are strictly the largest — at 320, 768 and 1280.
- **Writing that measurement found a live defect the plan had not budgeted for.** 14-03 gave the MOBILE
  CARD `emphasis="lead"`; the desktop table was never opened, so above `md:` the deadline rendered at 14px
  — the same size as the money, the guest and the window — and HFLOW-01's central claim was false on two
  of the three measured widths with the whole design suite green. Fixed in Task 1 and **observed failing**
  (regression B below).
- **The `[14-03]` deferred item is discharged with numbers, not an opinion.** Measured at 320px: the status
  column 235.34px, the countdown inside it 84.20px, the space title **8.66px**. Option (a) taken —
  `REQUEST_STATUS_CAP` declared with its derivation and applied. After: status column 112px, space title
  **132px**, fitting entirely.
- **Zero query change, zero schema change, zero server change, zero test-file edit, zero package.** The
  read block is byte-identical, `git diff drizzle/` is empty, `src/app/actions/` is untouched, and no file
  under `tests/` was opened.

## Task Commits

1. **Task 1: the inbox reads deadline-first and shares one shell with its plate** — `6723d80` (feat)
2. **Auto-fix (Rule 1): cap the request row's status column so the space title survives 320px** — `758ef15` (fix)
3. **Task 2: "loudest" becomes a browser measurement at three widths** — `c5ca69f` (test)

## Files Created/Modified

- `src/app/(host)/host/requests/page.tsx` — `+104/-18` with `loading.tsx`. Adopts `HOST_LIST_SHELL` and
  `PageHeader`, re-orders the six table columns, gives the table's countdown `emphasis="lead"`, and puts
  the guest and money cells on the label role. A new header section records all four changes plus the two
  things it deliberately did not touch.
- `src/app/(host)/host/requests/loading.tsx` — the shell string only. Its lede was already the shared
  expression and is unchanged character for character.
- `src/lib/design/measurements.ts` — `+64`. `REQUEST_STATUS_CAP` with its full derivation, the three
  measured numbers that forced it, and what it deliberately does not do.
- `src/components/host/request-row.tsx` — `+21/-1`. `ROW_STATUS_CLASS` = the row rhythm plus the declared
  ceiling, applied to the status slot's content div.
- `e2e/host-inbox-hierarchy.spec.ts` **(created, 707 lines)** — three cases, a `measureRow` walker, a
  `maxContentWidth` clone probe, and a header stating the silent failure it catches and how to invoke it.
- `.planning/phases/14-host-tooling/deferred-items.md` — the `[14-03]` entry gains its discharge section
  with the before/after numbers.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npm run test:design` (baseline) | 49 files / 827 passed / 3 skipped / **0 failed** |
| `npm run test:design -- empty-state-adoption status-vocab loading-coverage` (all three files UNEDITED) | 3 files / **83 passed** |
| `npx vitest run tests/booking/host-requests.test.ts tests/booking/request-lifecycle.test.ts` (UNEDITED) | 2 files / **27 passed** |
| `npm run test:design -- selector-contract` | 1 file / **7 passed** — the new spec adds no undeclared hook |
| `npm run test:design` (final) | **49 files / 827 passed / 3 skipped / 0 failed** — baseline exactly unmoved |
| `npx vitest run tests/booking tests/host tests/security` (final) | 68 files / **767 passed**, zero failures |
| `npx tsc --noEmit` (final) | exit **0** |
| `npx eslint` on all touched source + the new spec | exit **0** |
| `npx playwright test e2e/host-inbox-hierarchy.spec.ts --project=chromium` — run **ALONE** | **3 passed** (22.9s) |
| the READ block, old `:60-89` vs new `:107-136` | `diff` reports **IDENTICAL** — first line `const rows = await db`, last line `.orderBy(asc(booking.expiresAt));` |
| `grep -c 'HOST_LIST_SHELL'` page / plate | **2 / 2** — one import and one render in each, and no third mention |
| `grep -c 'max-w-4xl'` page / plate | **0 / 0** |
| `grep -c 'PageHeader'` page | **3** (import, render, header note); `grep -n '<h1'` → **nothing** |
| `git diff --stat drizzle/` | **empty** — zero migrations (PROJECT D-136) |
| `git diff HEAD~3 HEAD -- src/app/actions/` | **empty** — server semantics untouched (D-130) |
| `git diff HEAD~3 HEAD -- tests/` | **empty** — no gate was edited to make this work pass |
| `git diff HEAD~3 HEAD -- package.json package-lock.json` | **empty** — no package installed |
| `git diff --diff-filter=D` across all three commits | **no deletions** |
| seeded rows after the run (`booking` / `listing` / `user` with the `e2e_inbox` prefix) | **0 / 0 / 0** — teardown clean |

**No `--project=visual` invocation** — the project is not collected off Linux and `playwright.config.ts`
says so on stderr on every run. `e2e/availability.spec.ts:261`, the pre-existing standing red, was neither
run, touched nor claimed: every Playwright invocation in this plan named **one** spec file.

### The measured hierarchy — what a green looks like

```
[MEASUREMENT 320px]  digits 20px/600 · next largest "Inbox Gym 9ab6e5" 14px · guest 14px/400 ·
                     money 14px/400 · countdown y=260 title y=261 money y=407.03
[MEASUREMENT 768px]  digits 20px/600 · next largest "Expires in" 14px · guest 14px/400 ·
                     money 14px/400 · countdown y=260.5 title y=284.5 money y=284.5
[MEASUREMENT 1280px] digits 20px/600 · next largest "Expires in" 14px · guest 14px/400 ·
                     money 14px/400 · countdown y=260.5 title y=284.5 money y=284.5
```

Nothing in the row is above 14px except the digits at 20px, at every width. On the card the countdown and
the title share the row's first line (`y=260` vs `261`, the 1px being the title's half-leading); on the
table the countdown's two-line block is the tallest cell content, so the `align-middle` siblings centre
24px beneath it.

### The size comparison has been observed FAILING — twice, against two different regressions

Task 2's acceptance criterion asks for one. Two were performed, because the second is the defect this
plan's own Task 1 fixed and watching the spec catch it is what proves the fix was not decorative. Both
were applied, run **alone**, recorded, and reverted; `git diff` was checked after each revert.

**(a) THE MONEY FIGURE RAISED TO THE HEADING ROLE** (`ROW_MONEY_CLASS` → `text-heading tabular-nums`).
Red at 320px, naming the money element:

```
Error: 320px: THE COUNTDOWN IS NOT THE LOUDEST ELEMENT ON THE ROW. The digits ("2h 0m") compute 20px,
and "₱1,050.00" computes 20px in <dd class="text-heading tabular-nums">. …
Every text node in the row, largest first:
        20px / 600 — "2h 0m"  <span class="text-heading tabular-nums">
        20px / 600 — "₱1,050.00"  <dd class="text-heading tabular-nums">
        14px / 600 — "Inbox Gym 65c9a4"  <p class="truncate text-sm font-semibold">
        …
expect(received).toBeGreaterThan(expected)
Expected: > 20
Received:   20
```

The message prints the offending node's class and the whole sorted list, so the reader sees WHICH element
competed without opening the component.

**(b) THE DESKTOP TABLE'S `emphasis="lead"` REMOVED** — i.e. the tree exactly as 14-03 left it. Red at
768px, and the failure is a good description of the defect:

```
Error: 768px: THE COUNTDOWN IS NOT THE LOUDEST ELEMENT ON THE ROW. The digits ("2h 0m") compute 14px,
and "Expires in" computes 14px in <span class="">. …
        14px / 400 — "Expires in"  <span class="">
        14px / 400 — "2h 0m"  <span class="tabular-nums">
        14px / 400 — "Marisol"  <td class="… text-label">
        14px / 600 — "Inbox Gym 27b391"  <td class="… font-medium">
        14px / 400 — "₱1,050.00"  <td class="… text-label text-right tabular-nums">
```

Every text node on the row at one size: the deadline was competing with its own prefix. That state shipped
and passed the entire design suite.

## Decisions Made

**1. The desktop table takes the lead layout, and the plan's Task 1 did not say so.**
Task 1's action describes a column reorder and the label role; Task 2's acceptance criterion requires the
digits to be strictly the largest text in the row **at 768 and 1280**. Those two cannot both be satisfied by
a reorder: `md:` is 768px, so at the two upper widths the visible row is the TABLE row, and the table's
countdown was still `emphasis="inline"` at 14px. Either the plan's own measurement was unsatisfiable or the
table had to take the lead layout. The UI-SPEC settles it — its hierarchy table gives *"SLA countdown —
digits"* the heading role with no per-viewport qualifier, and its falsifiable is stated at all three widths.
Recorded as a deviation below rather than quietly absorbed, because it is a rendering change on a shipped
surface that the plan's `<action>` does not describe.

**2. `[14-03]` gets option (a), and the deciding fact is that option (b) describes something else.**
The deferred item offers *"(b) record that a capped row truncating its title at 320px is acceptable because
the deadline is the thing being triaged."* That sentence is about a title that truncates. What was measured
is a title given **8.66px of a 244px line** — an ellipsis, with the venue-local window beneath it wrapping
in the same 8.66px roughly one word per line, and the card 112px taller for it (the money figure sat at
`y=519` before the cap and `y=407` after). A host cannot triage a request whose space has no name, and no
reading of D-146 makes the deadline outrank *which space is being asked for*.

**3. The cap is derived from what the column exists to HOLD, and the derivation is a measurement.**
At the 320px floor: 320 − 32 (the list shell's horizontal padding) − 32 (`CardContent`'s) = 256px of card
content, − 12 (the header row's gutter) = **244px** shared by the two columns. The countdown's own
max-content width was measured with an off-screen `width: max-content` clone at **84.20px** — the technique
`tabular-figures.spec.ts` uses for its money probe, and necessary here because the countdown's outer element
is a BLOCK and therefore reports its column's width whatever its glyphs need. `max-w-28` (112px) is the
smallest ladder step that clears 84.20px with headroom for the grove theme, whose heading step is 24/700
against court's 20/600; 244 − 112 = 132px leaves the title the larger share.

**4. The cap is pinned in BOTH directions.** Case 3 asserts the title keeps a real width AND that the status
column is at least the countdown's max-content width. Without the second half, "make the status column
narrower" would be the answer to every future complaint, and the first thing to break would be the deadline
wrapping across two lines — which is worse than the money it is supposed to outrank.

**5. The cap goes on the CONTENT, not on the pattern.** A definite `max-width` on the child is what caps the
flex item's intrinsic contribution, so it works; relaxing `shrink-0` on `row-card.tsx` would change all four
adopters to fix one, and the other three put a badge or an amount in that slot — content that should keep
its max-content width and would start truncating for no reason. This is what `[14-03]`'s own note asks for.

**6. The reason sentence is three text nodes, and the walker leaves it that way.**
`request-countdown-reason.tsx` renders `Session starts in {startsIn} — respond soon.`, so JSX splits it at
the interpolation and the DOM holds three sibling text nodes. The first draft matched the whole sentence
against a single node and went red on a row rendering it perfectly. The split is CORRECT for every size
comparison — each fragment is a separately laid-out run — so the fix was to join only inside the one
assertion that asks a question about the sentence, and the file records why.

**7. Inbox-zero was never opened.** No edit, no re-decision, no new component.
`tests/design/empty-state-adoption.test.ts` — including its `AC#24` describe, which pins `tone="positive"`
to exactly one product surface and asserts the title string verbatim — passes with **zero edits**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] A capped request row rendered its space title at 8.66px at the 320px floor**
- **Found during:** Task 2, the `[14-03]` measurement the plan explicitly asks this plan to perform
- **Issue:** `row-card.tsx` renders the status column `shrink-0`, so it keeps its max-content width at
  every viewport. 14-03 moved the D-99 cap-shortened reason SENTENCE into that slot, making a full
  sentence the column's sizing authority. Measured at 320px: status column **235.34px**, the countdown it
  exists to hold **84.20px**, the space title **8.66px** against the 129px it wanted — with the venue-local
  window wrapping in the same 8.66px beneath it.
- **Fix:** `REQUEST_STATUS_CAP` (`max-w-28`, 112px) declared in `measurements.ts` with its derivation, and
  applied to the status slot's content div in `request-row.tsx`. Measured after: status column **112px**,
  space title **132px** (fits entirely), card 112px shorter.
- **Files modified:** `src/lib/design/measurements.ts`, `src/components/host/request-row.tsx` — **neither is
  in this plan's `files_modified`**, which is stated plainly rather than glossed. `[14-03]` addresses 14-06
  by name and asks for exactly this decision; making it and not shipping it would have left a measured
  defect on a shipped surface with a summary explaining that it had been noticed.
- **Commit:** `758ef15`
- **Result:** design suite still 49 / 827 / 3 / 0; `tests/booking` + `tests/host` + `tests/security` 767
  passed; `tests/host/request-row.test.tsx` passes **unedited**.

### Scope the plan's action text did not describe, required by its own acceptance criteria

**2. The desktop table's countdown takes `emphasis="lead"`**
- **Plan text:** Task 1 describes a column reorder plus "the four named type roles where a bare small-text
  utility stands in for the label role". Task 2 requires the digits to be strictly the largest text in the
  row at **768 and 1280**.
- **Why the two cannot both hold as written:** `md:` is 768px, so at those widths the visible row is the
  desktop table row, whose countdown was `emphasis="inline"` — 14px, tied with its own prefix, the guest
  name, the money and the window. Applying only "the label role" leaves it at 14px.
- **What was implemented:** `emphasis="lead"` on the table's `RequestCountdown`. 14-UI-SPEC's hierarchy
  table gives the digits the heading role with no per-viewport qualifier and states its falsifiable at all
  three widths, so this is the approved contract rather than an extension of it.
- **What it is worth:** regression (b) above is this exact state, and it is red at 768px. The defect had
  shipped and passed all 827 design assertions.
- **Files modified:** `src/app/(host)/host/requests/page.tsx` (already in `files_modified`).

**Total deviations:** 1 auto-fixed (1 Rule 1) + 1 scope clarification resolved in favour of the plan's own
acceptance criteria and the approved UI-SPEC.
**Impact on plan:** none to its objective. No new component, no package, no migration, no server-side edit,
no test file edited, no third surface opened.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-06-IDOR | **mitigated** | The read block is byte-identical — `diff` of old `:60-89` against new `:107-136` reports no difference, and no diff hunk falls between them. `tests/security` (13 files) and `host-requests` + `request-lifecycle` pass **unedited** |
| T-14-06-AUTHZ | **mitigated** | The two page gates (session, then `canHost`) were not opened; they sit above the first changed line. `git diff` shows the first content hunk at the render, not at the gate |
| T-14-06-HIERARCHY | **mitigated** | The computed-size comparison runs at 320 / 768 / 1280 over EVERY visible text node, prints the full sorted list on failure, and has been watched failing against two different promotions — one of which was live in the tree |
| T-14-06-FALSEALARM | **mitigated** | Inbox-zero not opened. `empty-state-adoption.test.ts` passes with **zero edits**, including its one-product-surface pin and its verbatim title assertion |
| T-14-06-CLOCK | **mitigated** | The single `readDbNow` call and its threading into every row's `RequestCountdownReason` are inside the untouched block. Zero clock reads added anywhere |
| T-14-06-FLAKE | **mitigated** | Every Playwright invocation named **one** spec file and ran it alone. `e2e/availability.spec.ts` was never run. The new spec is a SIXTH DB-seeding file and its own header says so, with the connection-ceiling mechanism and the "name it, run it alone" rule written into it |
| T-14-06-SC | **mitigated** | **No package installed.** `package.json` and `package-lock.json` untouched across all three commits. The spec imports `postgres`, `node:crypto` and `@playwright/test` — all already direct dependencies used by the shipped e2e fixtures |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. No
`## Threat Flags` section is owed.

## Requirement Status — HFLOW-01 is COMPLETE

*"The host requests inbox is scannable with the SLA countdown as the loudest element, approve/decline as the
only actions, and a designed inbox-zero."*

| Clause | Owner | Status |
|---|---|---|
| SLA countdown as the loudest element | 14-03 (the row) + **14-06** (the table's column order and its lead layout, and the 320/768/1280 computed-`font-size` measurement) | **done** — and observed failing against two regressions |
| Approve/decline as the only actions | 14-03 | **done** — and re-asserted here in a real browser: zero anchors, zero link roles, in the card and in the table body |
| A designed inbox-zero (D-147) | **14-06** | **done** — `EmptyState tone="positive"`, preserved byte-for-byte, gate unedited |

14-03 left the checkbox unticked and named 14-06 as the closer. `requirements.mark-complete HFLOW-01`
returned `marked_complete: [HFLOW-01]`, `not_found: []`. 14-14, 14-15 and 14-16 also list HFLOW-01 in their
frontmatter, but they are cross-cutting infrastructure and gate plans (the live-region inventory, the row
heights, the five hard gates) — they keep the requirement true across the phase rather than making it true.

## Known Stubs

None. Every element measured is wired to real data: the countdown to `booking.expires_at`, the reason line
to `created_at`/`starts_at`/the DB clock, the money to the server-frozen `quotedTotalCents`, the guest name
to the joined booker row. The new spec seeds real rows through real SQL and reads the real page.

## Issues Encountered

**A gate suite of 827 assertions was green over a rendering that made the requirement false.** The desktop
table's countdown had been at 14px since 14-03 — the same size as the money it is required to outrank —
and nothing in the repository could see it, because every committed gate reads SOURCE or renders in jsdom,
and both answer "which classes are present", not "what size did the browser draw". `tests/host/request-row.test.tsx`
says so in its own header. This is the second time in the phase that source and render turned out to be
different questions (14-03's `live-regions` finding was the first, in the other direction).

**The first draft of the measurement was wrong about the DOM in a way that reads as a product defect.**
Matching `Session starts in .* — respond soon.` against a single text node went red on a row that was
rendering the sentence correctly, because JSX splits it at the interpolation. Recorded in the spec at the
line, with the general rule: a walker over text nodes is measuring RUNS, and a question about a SENTENCE
has to join them itself.

**One tooling mistake, made and repaired.** A `sed -i` intended for three new decision lines in `STATE.md`
was written without a line range and relabelled **164 pre-existing `[Phase ?]` decision entries** as
`[Phase 14]`. Caught by comparing `grep -c` against `git show HEAD:` — `165 → 1`. `STATE.md` was restored
from `HEAD`, every SDK verb re-run, and the tag applied to lines 1073-1075 only. Final diff: **12
insertions, 8 deletions**, with exactly three `+- [Phase 14]` decision lines and no pre-existing decision
line touched. Recorded because a silent 164-line rewrite of project history is worse than the plan it was
serving.

**gsd-sdk v1.42.3, as the phase keeps recording.** `state.record-metric` and `state.add-decision` reject
POSITIONAL argv and need named flags (`--phase/--plan/--duration`, `--summary`); `add-decision` stamps
`[Phase ?]`, which is what the repair above was for. `state.update-progress` returned *"Progress field not
found in STATE.md"* and was a no-op, so `completed_plans` (85 → 86) was hand-maintained; `percent` tracks
PHASES (5/12 = 42) and correctly did not move. `state.advance-plan` did **not** over-reach this run —
`completed_phases`, `total_plans` and `percent` were left alone, unlike the 13.1-05 episode.
`roadmap.update-plan-progress 14` and `requirements.mark-complete HFLOW-01` both worked.

## User Setup Required

None — no external service configuration, no environment variable, no package install. Running the new spec
needs only the local Postgres (`npm run db:up`; the container was already up) and `DATABASE_URL`, which is
the D-35 environment boundary the shipped e2e fixtures already assume.

## Next Phase Readiness

**Ready.** What the downstream plans inherit:

- **14-15 (the row heights)** depends on 14-06 and now inherits a request card whose geometry has changed:
  the status column is capped at 112px and a capped row is ~112px shorter than it was. Any row-height
  constant derived from a measurement taken before `758ef15` is stale.
- **14-16 (the five hard gates)** inherits a `/host/requests` with exactly one `<h1>` (supplied by
  `PageHeader`, on both the page and its plate) and a 320px floor that is asserted rather than assumed —
  `e2e/host-inbox-hierarchy.spec.ts` case 3 already checks `scrollWidth <= clientWidth` on this route.
- **Any plan that opens `request-row.tsx` or the inbox page** should know that a promotion of the money or
  the guest name, or a countdown that loses its `lead` layout on EITHER surface, now fails in Chromium with
  the offending element named. The spec must be run alone and by name.
- **Any plan that adds a Playwright spec** should note this file makes SIX DB-seeding specs against one
  Postgres under `fullyParallel: true`. 14-RESEARCH's rule stands and the file states it in its own header.

**Two standing cautions, re-confirmed here and unchanged:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings. Not
   touched, not to be "fixed".
2. `e2e/availability.spec.ts:261` is still the pre-existing standing red. Not caused here, not claimed here,
   and never run by this plan.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All three claimed commits resolve in `git log` (`6723d80`, `758ef15`, `c5ca69f`), and all five claimed
source files plus the created spec exist on disk. `git diff --stat` is empty for `drizzle/`,
`src/app/actions/`, `tests/` and `package.json`/`package-lock.json` across the three commits, and no commit
deleted a tracked file. No missing items.
