---
phase: 14-host-tooling
plan: 05
subsystem: ui
tags: [react, rsc, jsdom, vitest, testing-library, design-system, host-surfaces, copy-ownership]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`patterns/row-card.tsx` (the slot contract and its optional `href`), `patterns/panel-card.tsx` (`tone=\"muted\"`, the declared advisory surface), `patterns/empty-state.tsx` (the discriminated union whose `actions` is REQUIRED so a caller with nothing to offer says so), and `selector-contract.ts`'s bidirectional hook contract"
  - phase: 14-host-tooling
    provides: "14-02's `queryHostAgenda` — the `{today, next}` shape this renders, and the guarantee that `next` is null whenever `today` is non-empty, which is why no page-level double-count guard exists here"
provides:
  - "`HostAgenda` — D-140/D-142's three states inside ONE always-present container, with four declared hooks"
  - "`HostSignals` — D-140's three signal rows in D-140's order, with `PayoutBanner` passed through untouched"
  - "`src/lib/host/requests-signal.ts` — signal 1's state, reason and way out as shared constants beside the count's authority, with `APPROVAL_SLA_HOURS` interpolated and no digit typed"
  - "`WITHHELD_BOOKER_LABEL` — the withheld-booker fallback as a named export, so the page that composes the agenda imports it instead of typing a seventh literal"
  - "five `selector-contract.ts` rows, each declared in the SAME commit as its literal"
  - "`tests/host/agenda-states.test.tsx` — 29 cases that walk all three agenda states, observed red against a deliberate regression"
affects: [14-06, 14-07, 14-08, 14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A multi-state region renders its CONTAINER unconditionally and is distinguished by which child it holds — so 'the region renders' stops being a claim an absent region satisfies"
    - "The container-presence case is asserted FIRST, on its own, and reports which states DID mount as a list, so a failure names the state that lost its section"
    - "A signal's copy lives beside the authority that produces its number, never inline in a page file — the shape `hours-signal.ts` established, now applied to the second of the three signals"
    - "A policy figure a signal quotes is interpolated from the config constant; the module containing the sentence contains no digit at all, which is grep-checkable"
    - "A selector-contract row lands in the same commit as the literal it declares — the contract is bidirectional, so a row a commit later leaves the tree red in between"

key-files:
  created:
    - src/components/host/host-agenda.tsx
    - src/components/host/host-signals.tsx
    - src/lib/host/requests-signal.ts
    - tests/host/agenda-states.test.tsx
  modified:
    - src/lib/design/selector-contract.ts
    - tests/design/empty-state-adoption.test.ts

key-decisions:
  - "The agenda row renders NO money, because 14-UI-SPEC § The agenda row enumerates its slots as title / meta / status / href and D-140 names four fields, none of them a total — the plan's props-contract sentence mentions the frozen quote and the approved design contract does not, and the design contract wins"
  - "The withheld-booker fallback is EXPORTED from the component and also normalised inside it: the prop stays pre-resolved as the sibling analog requires, and the component still guarantees a non-empty title, which is what makes the withheld case a real assertion rather than a restatement of its own fixture"
  - "Signal 1's one-versus-several fork lives in the MODULE, unlike `hours-signal.ts`'s, because signal 1's fork is nothing but the count — every surface that re-derived it would be a surface that could get the plural wrong on its own"
  - "The five selector rows were declared in the two COMPONENT commits rather than in the test commit the plan scheduled them for, because the plan's own read_first states the rule they violate"
  - "`empty-state-adoption.test.ts`'s ADOPTERS inventory was extended 13→14 files / 16→17 sites — the extension that file's own NOT COVERED note predicted for this phase in writing"
  - "State C is `tone=\"neutral\"`: the positive tone is STATE-04's inbox-zero clause and is pinned to a declared set of exactly one product surface — an emptied work queue is an achievement, a host who has not been booked yet has achieved nothing"

patterns-established:
  - "Container-first state testing: presence in every state, then exactly-one-branch, then contents"
  - "A negative assertion (zero retries, zero alerting roles, zero alarm tokens) is scoped INSIDE the branch's own hook, because scoped to the document it passes on a render that produced nothing at all"
  - "A copy claim the surface must NOT make gets its own case with a positive control beside it"

requirements-completed: []   # HFLOW-03 is shared across five plans — see the note below
requirements-advanced: [HFLOW-03]   # the agenda and signals COMPONENTS; the page that mounts them is downstream

# Metrics
duration: 20min
completed: 2026-08-23
---

# Phase 14 Plan 05: The Agenda's Three States and the Signals Block Summary

**The dashboard's two new blocks exist as components with five declared hooks, and the claim that broke a
dozen times in this repository — "the agenda renders" — has been rewritten as a container that mounts in
all three states and been watched failing when it stopped.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T17:44Z (baseline `tsc` exit 0 at 17:46, baseline design suite 49/827 at 17:50)
- **Completed:** 2026-08-23T18:03Z
- **Tasks:** 3
- **Files modified:** 6 (4 created, 2 modified) — 1,074 insertions, 2 deletions

## Accomplishments

- **The vacuity shape is closed by construction, not by care.** The agenda's `<section>`, its `<h2>` and its
  route-out are rendered unconditionally; the three states are the three children. `tests/host/agenda-states.test.tsx`
  asserts that first, alone, and reports the states that mounted as a **list** — so a regression names the
  state that lost its section instead of reporting `expected false to be true`.
- **D-140's actual argument is now a rendered fact.** The row title resolves **by role** to the booker's
  first name, with the space title present as text and explicitly *not* resolvable as the title. A dashboard
  that quietly reverted to space-first goes red on a query that is about what a host reads first.
- **State C says nothing it cannot stand behind.** Its body describes the mechanism, and the case that
  asserts it carries a positive control beside it — because `not.toMatch(/bookable/)` passes beautifully on
  a panel that rendered nothing at all.
- **Signal 1's words have an owner.** `src/lib/host/requests-signal.ts` is `hours-signal.ts`'s shape for the
  second of the three signals: state, reason and way out beside the count's authority, with the SLA figure
  interpolated. **The module contains no digit at all** except the `1` that is the singular arm's own copy.
- **`PayoutBanner` was never opened.** `git diff` on it is empty across all three commits; it is passed
  through with its own props and rendered in all four states, and the file records — in the component that
  renders it — why two containers in one block is the decision rather than the drift.
- **The five hooks and their five literals landed together**, which is the rule the contract's own tail rows
  record three separate times and which the plan's task order would have broken.
- **Zero migrations, zero packages, zero design-gate movement.** `npm run test:design` is still exactly
  **49 files / 827 passed / 3 skipped / 0 failed**; `drizzle/`, `schema.ts`, `package.json` and
  `package-lock.json` are byte-untouched across all three commits.

## Task Commits

1. **Task 1: The agenda component and its three states** — `7533b18` (feat)
2. **Task 2: The three signal rows and the shared requests-signal copy** — `f7ef80a` (feat)
3. **Task 3: The three states walked in jsdom** — `321dfe2` (test)

The five selector-contract rows are split across commits 1 (four agenda hooks) and 2 (`host-signals`)
rather than sitting in commit 3 — see Deviations.

## Files Created/Modified

- `src/components/host/host-agenda.tsx` **(created, 269 lines)** — the three states, four hooks, and the
  `AgendaRow` composition. Exports `WITHHELD_BOOKER_LABEL`, `AGENDA_HEADING`, `AGENDA_ROUTE_OUT_LABEL`,
  `AGENDA_NONE_TITLE`, `AGENDA_NONE_BODY`, `HostAgendaRowData`, `HostAgendaNextData`, `HostAgendaProps`.
- `src/components/host/host-signals.tsx` **(created, 147 lines)** — the three rows in D-140's order, the
  shipped hours assembly preserved, `PayoutBanner` passed through.
- `src/lib/host/requests-signal.ts` **(created, 77 lines)** — `requestsWaitingState`,
  `REQUESTS_WAITING_REASON`, `REQUESTS_WAITING_CTA`, `composeRequestsWaitingSentence`.
- `tests/host/agenda-states.test.tsx` **(created, 465 lines)** — 29 cases.
- `src/lib/design/selector-contract.ts` — `+100/-0`. Five ids, five rows.
- `tests/design/empty-state-adoption.test.ts` — `+16/-2`. One `ADOPTERS` row and two pinned constants.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npx tsc --noEmit` (after each task, and final) | exit **0** |
| `npm run test:design` (baseline) | 49 files / **827 passed / 3 skipped / 0 failed** |
| `npm run test:design` (after Task 1, Task 2 and final) | 49 files / **827 passed / 3 skipped / 0 failed** — unmoved |
| `npm run test:design -- selector-contract card-pattern-coverage empty-state-adoption price-surface` | 4 files / **70 passed** |
| `npx vitest run tests/host/agenda-states.test.tsx` | 1 file / **29 passed** |
| `npx vitest run tests/host tests/booking` | 59 files / **698 passed / 0 failed** |
| `npx eslint` on all six touched files | exit **0** |
| `git diff --stat drizzle/` | **empty** — zero migrations (PROJECT D-136) |
| `git diff --stat HEAD~3 HEAD -- src/lib/db/schema.ts drizzle/` | **empty** |
| `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` | **empty** — no package installed (T-14-05-SC) |
| `git diff src/components/host/payout-banner.tsx` | **empty** — the file was never opened |
| `git diff --stat tests/design/card-pattern-coverage.test.ts` | **empty** — unedited, as the criterion requires |
| `git diff --stat tests/design/brand-recipe.test.ts` `type-scale.test.ts` | **empty** — the two landmines untouched |
| `git diff --diff-filter=D` per commit | **no deletions in any of the three commits** |

### Task 1's acceptance greps, on `src/components/host/host-agenda.tsx`

| Grep | Required | Actual |
|---|---|---|
| `grep -c 'new Date('` | 0 | **0** |
| `grep -c 'format(\|toDateString\|date-fns'` | 0 | **0** |
| `grep -cE '[-+*/] *[a-zA-Z_]*[Cc]ents'` | 0 | **0** |
| `grep -c 'bg-card\|ring-1'` | 0 | **0** |

### Task 2's acceptance greps, on `src/lib/host/requests-signal.ts`

| Grep | Required | Actual |
|---|---|---|
| `grep -rnE '\b24\b'` | nothing | **nothing** |
| every digit in the file | — | `03 14 140 96 1 1 1 7 75` — plan/decision citations and the singular arm's own `1`. No hour count |
| `grep -c 'APPROVAL_SLA_HOURS'` | ≥ 1 | **3** |
| the three hours-signal sentences present as literals in `host-signals.tsx` | 0 | **0** — the three identifiers are imported and referenced instead |

### Task 3's contract-row arithmetic

| | before (`HEAD~3`) | after | delta |
|---|---|---|---|
| `grep -c 'why:'` | 44 | 49 | **+5** |
| `grep -c 'owner:'` | 45 | 50 | **+5** |

### The three-state case has been observed FAILING

Task 3's acceptance criterion. `HostAgenda` was given `if (rows.length === 0) return null;` — the section
rendered only in state A — and `npx vitest run tests/host/agenda-states.test.tsx` was run. Observed:

```
 ❯ tests/host/agenda-states.test.tsx (29 tests | 13 failed) 353ms
     × mounts the section in A, B and C — the claim an absent section would otherwise satisfy 91ms
     × and each state renders exactly ONE of the three branches, never two and never none 11ms
     × state B heads the agenda with the single word and NO date beside it
     × state C heads the agenda with the single word and NO date beside it
     × state B reaches /host/bookings by accessible name
     × state C reaches /host/bookings by accessible name
     … 7 more

 FAIL  … > mounts the section in A, B and C — the claim an absent section would otherwise satisfy
AssertionError: the agenda section did not mount in every booking state. The three states are told
apart by WHICH CHILD the container holds, never by whether the container exists — a state that drops
the section takes its heading and its route-out with it, and every 'the agenda renders' assertion in
the suite stays green while it does.: expected [ 'A · sessions today' ] to deeply equal
[ 'A · sessions today', …(2) ]

- Expected
+ Received

  [
    "A · sessions today",
-   "B · quiet day",
-   "C · nothing booked",
  ]

 FAIL  … > and each state renders exactly ONE of the three branches, never two and never none
AssertionError: expected { A: [ 'agenda-rows' ], B: [], C: [] } to deeply equal
{ A: [ 'agenda-rows' ], …(2) }
```

**Thirteen of twenty-nine cases went red, and the first two named the defect precisely** — one by listing the
states that survived, the other by showing the two branch maps side by side. That is the whole design of
case 1: `expected false to be true` would have told a future reader nothing about which state broke.

Reverted → `git diff --exit-code src/components/host/host-agenda.tsx` printed nothing → 29/29 green.

**No Playwright invocation was needed or made** (the plan's verification says so explicitly).
`e2e/availability.spec.ts:261` — the pre-existing standing red — was neither touched nor claimed.

## Decisions Made

**1. The agenda row renders NO money, and the design contract is why.**
The plan's Task-1 prose describes the props contract as *"pre-composed window labels, a pre-resolved booker
label, the frozen quote already through the money formatter, and the database clock threaded in"* — the
third clause implies a money figure on the row. **14-UI-SPEC § The agenda row** enumerates the row's slots
as `title` / `meta` / `status` / `href` with `actions` deliberately absent, **§ Copywriting → The dashboard**
lists no money string for the agenda row, and **D-140** names four fields: booker first name, space title,
venue-local window, status. Three sources against one sentence, and the three are the approved contract. The
row carries no total; the frozen quote is on the inbox row, where a host is *deciding*, and on the booking
detail this row links to. The plan's two money acceptance criteria (`grep -cE '[-+*/] *[Cc]ents'` = 0 and
`price-surface` green) are satisfied trivially rather than narrowly, and a prop that nothing renders was not
added just to make the sentence literally true.

**2. The booker label is pre-resolved AND normalised.**
`host-booking-row.tsx`, the sibling analog the plan names, takes `bookerLabel: string` already resolved, and
that is what this component takes. But the plan's own test case is *"a booker whose name is withheld renders
the shared fallback and not an empty title"* — and against a pre-resolved prop that case degenerates into
asserting that the string the fixture supplied is the string on screen. So the component ALSO normalises:
`row.bookerLabel.trim() || WITHHELD_BOOKER_LABEL`. The prop contract is unchanged, the case is now
falsifiable on three input shapes (`"A guest"`, `""`, `"   "`), and a page that one day forgets its own
`?? "A guest"` produces a named row rather than a blank one on the surface whose entire point is naming who
is arriving. The fallback is EXPORTED so the composing page imports it — the literal is already typed at six
shipped call sites and a seventh would have been the wrong direction.

**3. Signal 1's one-versus-several fork lives in the module; signal 3's stays at the call site.**
`hours-signal.ts` exports three flat constants and lets the surface assemble the fork, because its singular
arm NAMES the affected listing and the module has no listing to name. Signal 1's fork is nothing but the
count, so there is no argument for making a surface re-derive it — and every surface that did would be a
surface that could get the plural wrong on its own. `requestsWaitingState(n)` is therefore a function in the
module, and `composeRequestsWaitingSentence(n)` joins it to the reason so the two clauses cannot be rendered
in the wrong order or with the wrong separator by a second consumer.

**4. State C is the neutral tone, and that is AC#24's boundary rather than a taste call.**
`empty-state-adoption.test.ts` pins `tone="positive"` to a declared set — one product surface (the request
inbox) and one design-review preview — and asserts the set as a SET, so a second positive panel goes red by
name. The argument behind the pin transfers exactly: an emptied work queue is an achievement, and a host who
has not been booked yet has achieved nothing. `actions={null}` for a related reason — the pattern requires
the prop precisely so a caller with nothing to offer says so, and there is no next step this panel can
honestly name when the host's spaces may already be live and every genuinely-outstanding setup step is named
by the signal rows below.

**5. The block's heading is screen-reader-only rather than absent.**
14-UI-SPEC's shell sketch says `sr-only`, and the reason is worth stating: the rows below are three unrelated
advisories, and a document outline that jumps from today's sessions straight into them gives a keyboard or
screen-reader user no way to skip the block. Nothing is announced twice — there is no visible title to
duplicate. The test asserts the class rather than merely the heading's existence.

**6. The `agenda-next` and `agenda-none` hooks sit on a wrapper, not on the pattern's root.**
`PanelCard` and `EmptyState` both take no `className` and no passthrough props — that is the DS-11 contract,
and adding one for a test hook would have been re-deciding a pattern for a gate's convenience. A one-element
wrapper carries the hook instead. It draws nothing: the wrapper is a bare `<div>` with no class at all.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The five selector rows moved into the component commits**

- **Found during:** Task 1, immediately after the four `data-testid` literals shipped.
- **Issue:** The plan schedules `selector-contract.ts` in **Task 3**, while Tasks 1 and 2 ship the literals.
  `selector-contract.test.ts:442-462` asserts the declared set and the rendered set are the SAME SET, in
  both directions — so the tree would have been red on `Rendered-but-undeclared: [agenda-next, agenda-none,
  agenda-rows, host-agenda]` from commit 1 until commit 3. `npm run test:design` runs inside `npm run build`,
  so that is a broken build across two commits, not a red test.
- **Why it is Rule 3 and not a judgement call:** the plan's own Task-3 `read_first` states the rule it
  breaks — *"Both directions fail. **This is why the rows and the components land in one commit.**"* — and
  `selector-contract.ts`'s `receipt-total` row records the same lesson from the last phase that learned it:
  *"A row lands in the same commit as its literal or the tree is red between two commits."*
- **Fix:** the four agenda rows landed in Task 1's commit and `host-signals` in Task 2's. Task 3 shipped the
  test alone. The plan's arithmetic criterion is unaffected and was measured across the whole plan: `why:`
  44 → 49 and `owner:` 45 → 50, **+5 each**.
- **Files modified:** `src/lib/design/selector-contract.ts`
- **Commits:** `7533b18` (four rows), `f7ef80a` (one row)

**2. [Rule 3 — Blocking] `empty-state-adoption.test.ts`'s ADOPTERS inventory extended 13 → 14**

- **Found during:** Task 1, running the plan's own verify command.
- **Issue:** the gate pins the tree's total `<EmptyState>` call-site count. State C's panel is the
  seventeenth, so the file went red: `the tree's total <EmptyState> call-site count moved. Expected 16
  across 13 surfaces.: expected 17 to be 16`.
- **Why it is not a scope absorption:** the file's own **NOT COVERED** section predicted this commit in
  writing — *"a Phase-14 host-tooling surface is expected to EXTEND `ADOPTERS` in its own commit. That is
  the gate working, not the gate being wrong."* The plan's Task-1 verify runs `empty-state-adoption` and
  requires it green; only `card-pattern-coverage` is required to be *unedited*, and it is.
- **Fix:** one `ADOPTERS` row with its reason (including why the tone is neutral and the actions null), plus
  `EXPECTED_ADOPTER_FILES` 13 → 14 and `EXPECTED_EMPTY_STATE_SITES` 16 → 17, with the observed failure
  message recorded in the constants' docblock. **The count was watched moving before the row was written** —
  the row answers a measurement, it does not pre-empt one.
- **Files modified:** `tests/design/empty-state-adoption.test.ts` (`+16/-2`)
- **Commit:** `7533b18`

### Disclosures that are not deviations

**(a) This is the first COMPONENT row in the `ADOPTERS` inventory.** Every previous row is a route. The
agenda's three states are one component the dashboard composes, so the surface is where the shell is
rendered rather than where the URL is. The row says so, because a directory rule would have been the wrong
lesson to leave.

**(b) `data-requests-waiting` was added to signal 1's paragraph.** It is the mirror of the shipped
`data-hours-missing` on signal 3, it is not a `data-testid` (so the undeclared-hook ban does not reach it),
and it is what lets the ordering case assert **siblings in a tree** rather than substring positions in a
concatenated `textContent`. Disclosed because the plan enumerated the hooks and this is not one of them.

**(c) The signal sentences render at the Body type role** (`text-body`), where the shipped hours nudge on
`(host)/host/page.tsx` renders at the built-in small step. 14-UI-SPEC § Typography assigns *"the signal
rows' state clause"* to Body by name. The COPY is byte-identical and imported; only the token moved, which
is what a token pass is.

**(d) `src/lib/host/` is a new directory.** 14-PATTERNS puts the module's placement under planning's call
and the plan's `files_modified` names the path.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-05-PII | **mitigated** | The row prints `bookerLabel` and nothing else — no surname, no email, no phone appears in the prop type or the render. The withheld fallback is asserted on three input shapes as its own case, and the meta line's contents are asserted positively (space + window) so a widened projection would have nowhere silent to land |
| T-14-05-CLOCK | **mitigated** | `grep -c 'new Date('` returns **0** in both new components; the clock is `props.now`, documented as "read ONCE per request via `readDbNow(db)`", and it reaches the badge from there. `grep -c 'format(\|toDateString\|date-fns'` is 0 — no second window formatter was minted |
| T-14-05-MONEY | **mitigated** | No money is rendered on either surface (decision 1). `grep -cE '[-+*/] *[a-zA-Z_]*[Cc]ents'` returns 0 and `price-surface` passes |
| T-14-05-VACUITY | **mitigated** | The container is rendered unconditionally and asserted FIRST, alone. Observed red against the section-only-in-state-A regression, with the failure naming the two states that lost it (message recorded above) |
| T-14-05-FALSECLAIM | **mitigated** | State C's body is a mechanism sentence; the case asserts it matches no bookability claim AND carries a positive control that the mechanism sentence is genuinely on screen — so the negative cannot pass on an empty render |
| T-14-05-FALSEALARM | **mitigated** | States B and C each assert zero alerting roles, zero `aria-live`, zero alarm-token classes (checked on the subtree AND on the whole rendered markup), zero retry affordances and — for C — zero buttons and zero links. `EmptyState` is at the neutral tone with `actions={null}` |
| T-14-05-UNDECLARED | **mitigated** | All five ids carry `why` and `owner` and landed in the same commit as their literals. `selector-contract` passes, which proves both directions: no undeclared hook in `src/`, and no declared id rendered nowhere |
| T-14-05-SC | **mitigated** | **No package was installed.** `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` is empty |

No new threat surface was introduced: no network endpoint, no auth path, no file access pattern, no schema
change. Both components are presentational and unreachable from any route until the page composes them. No
`## Threat Flags` section is owed.

## Known Stubs

None. Every value both components render arrives as a prop or is an imported constant; nothing is hardcoded
empty, and no placeholder copy exists in any changed file. The one deliberate `null` — `EmptyState`'s
`actions` on state C — is the pattern's own documented affordance for a caller with nothing to offer, not an
unwired slot, and its reason is recorded at the call site and in the `ADOPTERS` row.

## Declared but not yet consumed

Not a stub — this plan is deliberately the component half, and the page that mounts them is downstream (the
objective says so in its first sentence). Recorded so a dead-code scan is not a surprise:

| Export | First expected consumer |
|---|---|
| `HostAgenda`, `HostAgendaRowData`, `HostAgendaNextData`, `WITHHELD_BOOKER_LABEL`, the four copy constants | the `/host` dashboard page (D-140/D-142/D-143) |
| `HostSignals` | the same page |
| `requestsWaitingState`, `REQUESTS_WAITING_REASON`, `REQUESTS_WAITING_CTA`, `composeRequestsWaitingSentence` | `HostSignals` (already), and the `(host)` nav badge / inbox lede if a later plan consolidates their wording |

The five selector hooks are all rendered in `src/`, which is what `selector-contract`'s forward direction
asserts and why it is green.

## Issues Encountered

**A negative assertion scoped to the document is not an assertion.** The first draft of state C's
false-alarm cases queried the whole render for alerting roles and alarm tokens. That passes on a component
that renders nothing at all — the identical vacuity shape the container-presence case exists to close, one
level down. Every negative case is now scoped inside `agenda-none`'s own hook, which is precisely the reason
that row's `why` in the selector contract argues for the hook existing.

**The ordering claim needed siblings, not substrings.** Asserting D-140's order by comparing
`indexOf` positions in the section's `textContent` would have been green for a component that rendered the
three rows in the right order *inside one another*, and would have broken on any copy edit. The case reads
the section's element children instead and checks each carries its own marker — which is why signal 1 got
`data-requests-waiting` (disclosure b) and why the payout row's check accepts the marker on the child OR on
the element itself, since `PayoutBanner` renders its own root.

## Requirements

`requirements-completed` is deliberately **empty**, even though the plan's frontmatter carries
`requirements: [HFLOW-03]`. HFLOW-03 is claimed by five plans in this phase (14-02, 14-05, 14-08, 14-15,
14-16). 14-02 delivered the read; this one delivers the components; **neither is a page a host can open.**
Ticking the requirement here would make `REQUIREMENTS.md` claim a host can see today's sessions on a surface
that does not exist yet. `requirements mark-complete` was therefore not run — the last plan that touches
HFLOW-03 owns that, exactly as 14-02 recorded.

## User Setup Required

None — no external service configuration, no environment variable, no package install. The jsdom test runs
under the main Vitest config, which preflights the local `fitout_test` database; that is the existing
convention and the container was already up.

## Next Phase Readiness

**Ready.** Both components are on disk, green, hooked and mutation-proved. Five things the page that mounts
them must carry forward:

1. **Read the clock ONCE and thread it.** `readDbNow(db)` → `queryHostAgenda(db, {hostId, now})` → `now` on
   `<HostAgenda>` → the badge. A second read reintroduces exactly the drift D-141 forbids and nothing goes
   red when it happens.
2. **Compose, do not re-derive.** `whenLabel` comes from `composeWhenLabelShort` on the row as-is (14-02
   § Next Phase Readiness: `fullDay` and `openCapacity` are present and required). State B's three tokens
   are venue-local and belong to the same composer family — `composeDateLabel` and a venue-local time,
   never a fresh formatter on the page.
3. **Import `WITHHELD_BOOKER_LABEL`.** Do not type a seventh `"A guest"`.
4. **`next` is already null on a busy day.** Render the agenda with both props and let the component branch;
   the query made "both at once" unrepresentable, so no page-level guard is needed and none should be added.
5. **The header cluster still owes its subtraction.** 14-UI-SPEC § The header cluster drops `Earnings` and
   `Requests` from `/host`'s button row (both are permanent nav slots) and the agenda's `View all bookings`
   is what replaces the second. That change is the page's, not this plan's, and
   `brand-recipe.test.ts:824`'s host total of **5** must survive it — the dashboard owns two of those five
   and both are `Create listing` / `Create your first listing`, neither of which this subtraction touches.

**One standing caution:** the agenda row's real resting height has NOT been measured. 14-UI-SPEC
§ Loading records that `RowListSkeleton` draws 80px rows and that `[11-08]` measured shipped rows at 112px;
the agenda row has a status badge and no actions, which is a configuration neither number describes. The
plate that stands in for this list owes that measurement — do not invent a number.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All four claimed files plus this summary exist on disk, and all three claimed commits resolve in
`git log` (`7533b18`, `f7ef80a`, `321dfe2`). No missing items.
